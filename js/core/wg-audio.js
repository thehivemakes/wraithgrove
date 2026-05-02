// WG.Audio — Web Audio engine + event-bus subscriptions.
//
// Design contract:
//   - Silent if files are missing. Never throws. Console-warns once per missing id.
//   - Lazy-init on first user gesture (browser autoplay policy). Until then, calls are queued.
//   - SFX pooled via per-id rate limiting (no machine-gun firing on player:swing).
//   - Ambient cross-fades on stage:enter / stage:exit. One ambient at a time.
//   - Volume + mute persisted to localStorage under 'wg_audio_v1'.
//   - Subscribes to engine event bus on init(). Adding new events = add a row to EVENT_MAP.
//
// File layout expected on disk (see audio/MANIFEST.md):
//   audio/sfx/<id>.mp3
//   audio/ambient/<biome>.mp3
//   audio/ui/<id>.mp3
//
// Browser format: mp3 (universal). All buffers fetched lazily on first play.

(function () {
  'use strict';

  const STORAGE_KEY = 'wg_audio_v1';
  const DEFAULT_SETTINGS = { master: 0.8, sfx: 1.0, ambient: 0.6, ui: 0.7, muted: false };

  // Event → SFX id mapping. Add rows here to wire new sounds; no engine edits needed.
  // throttleMs is min spacing between plays of the same id (prevents per-frame stutter).
  const EVENT_MAP = [
    // Hunt combat
    { event: 'player:swing',          id: 'swing',         bus: 'sfx', throttleMs: 60,  vol: 0.6 },
    { event: 'player:fire',           id: 'fire_arrow',    bus: 'sfx', throttleMs: 80,  vol: 0.7 },
    { event: 'player:skill',          id: 'skill_burst',   bus: 'sfx', throttleMs: 0,   vol: 1.0 },
    { event: 'player:damaged',        id: 'player_hurt',   bus: 'sfx', throttleMs: 200, vol: 0.8 },
    { event: 'player:died',           id: 'player_die',    bus: 'sfx', throttleMs: 0,   vol: 1.0 },
    { event: 'player:level',          id: 'level_up',      bus: 'sfx', throttleMs: 0,   vol: 0.9 },
    { event: 'pet:attack',            id: 'pet_attack',    bus: 'sfx', throttleMs: 100, vol: 0.5 },
    { event: 'boss:damaged',          id: 'boss_hit',      bus: 'sfx', throttleMs: 120, vol: 0.6 },
    { event: 'boss:defeated',         id: 'boss_die',      bus: 'sfx', throttleMs: 0,   vol: 1.0 },
    // Pickups (require Concern B emits — fail-silent until then)
    { event: 'pickup:orb',            id: 'orb',           bus: 'sfx', throttleMs: 40,  vol: 0.4 },
    { event: 'pickup:coin',           id: 'coin',          bus: 'sfx', throttleMs: 60,  vol: 0.5 },
    { event: 'relic:fragment-pickup', id: 'fragment',      bus: 'sfx', throttleMs: 80,  vol: 0.7 },
    // UI
    { event: 'tab:change',            id: 'ui_tab',        bus: 'ui',  throttleMs: 100, vol: 0.5 },
    { event: 'ui:button',             id: 'ui_button',     bus: 'ui',  throttleMs: 50,  vol: 0.6 },
    { event: 'ui:modal',              id: 'ui_modal',      bus: 'ui',  throttleMs: 100, vol: 0.5 },
    // Meta
    { event: 'iap:purchase',          id: 'cha_ching',     bus: 'ui',  throttleMs: 0,   vol: 1.0 },
    { event: 'forge:craft',           id: 'craft',         bus: 'sfx', throttleMs: 0,   vol: 0.8 },
    { event: 'duel:victory',          id: 'duel_win',      bus: 'ui',  throttleMs: 0,   vol: 1.0 },
    { event: 'duel:defeat',           id: 'duel_lose',     bus: 'ui',  throttleMs: 0,   vol: 0.8 },
    // W-FX-Polish-Pass — gaps 1, 2, 3: closing the audio side of silent events.
    // pickup:torch reuses orb sample (no torch sample shipped); player:revived
    // reuses level_up (triumphal); buff:expired reuses ui_modal close; consumed
    // reuses cha_ching for the small confirm payoff.
    { event: 'pickup:torch',          id: 'orb',           bus: 'sfx', throttleMs: 60,  vol: 0.6 },
    { event: 'player:revived',        id: 'level_up',      bus: 'sfx', throttleMs: 0,   vol: 1.0 },
    { event: 'buff:expired',          id: 'ui_modal',      bus: 'ui',  throttleMs: 0,   vol: 0.5 },
    { event: 'buff:consumed',         id: 'cha_ching',     bus: 'ui',  throttleMs: 0,   vol: 0.7 },
  ];

  // Biome → ambient track. Played on stage:enter, faded out on stage:exit.
  const BIOME_AMBIENT = {
    forest_summer: 'forest_day',
    forest_autumn: 'forest_dusk',
    cold_stone:    'wind_stone',
    temple:        'temple_drone',
    cave:          'cave_drips',
    eldritch:      'wraith_choir',
  };

  let ctx = null;            // AudioContext (lazy)
  let masterGain = null;
  let busGains = {};         // sfx, ambient, ui
  const buffers = {};        // id → AudioBuffer
  const fetching = {};       // id → Promise (dedupe in-flight fetches)
  const missing = {};        // id → true (warn-once flag)
  const lastPlayedAt = {};   // id → ms timestamp (throttle)
  let ambientSource = null;  // currently-playing ambient BufferSourceNode
  let ambientGainNode = null;
  let ambientId = null;
  let pendingQueue = [];     // calls made before audio context exists
  let settings = loadSettings();
  let initialized = false;

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return Object.assign({}, DEFAULT_SETTINGS);
      const s = JSON.parse(raw);
      return Object.assign({}, DEFAULT_SETTINGS, s);
    } catch (e) {
      return Object.assign({}, DEFAULT_SETTINGS);
    }
  }
  function saveSettings() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch (e) {}
  }

  // Lazy AudioContext creation. Must run inside a user-gesture handler.
  function ensureContext() {
    if (ctx) return ctx;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
      masterGain = ctx.createGain();
      masterGain.gain.value = settings.muted ? 0 : settings.master;
      masterGain.connect(ctx.destination);
      ['sfx', 'ambient', 'ui'].forEach(bus => {
        const g = ctx.createGain();
        g.gain.value = settings[bus];
        g.connect(masterGain);
        busGains[bus] = g;
      });
      // Drain queued calls.
      const q = pendingQueue; pendingQueue = [];
      q.forEach(fn => { try { fn(); } catch (e) { console.warn('[audio] queued', e); } });
      return ctx;
    } catch (e) {
      console.warn('[audio] context failed', e);
      return null;
    }
  }

  // Resume context (Safari can suspend on inactivity).
  function resumeContext() {
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function urlFor(bus, id) {
    if (bus === 'ambient') return 'audio/ambient/' + id + '.mp3';
    if (bus === 'ui') return 'audio/ui/' + id + '.mp3';
    return 'audio/sfx/' + id + '.mp3';
  }

  async function loadBuffer(bus, id) {
    if (buffers[id]) return buffers[id];
    if (missing[id]) return null;
    if (fetching[id]) return fetching[id];
    if (!ctx) return null;
    const url = urlFor(bus, id);
    fetching[id] = (async () => {
      try {
        const res = await fetch(url, { cache: 'force-cache' });
        if (!res.ok) throw new Error('http ' + res.status);
        const ab = await res.arrayBuffer();
        const buf = await new Promise((resolve, reject) => {
          // Older Safari uses callback form
          ctx.decodeAudioData(ab, resolve, reject);
        });
        buffers[id] = buf;
        return buf;
      } catch (e) {
        if (!missing[id]) {
          missing[id] = true;
          console.info('[audio] missing or undecodable: ' + url + ' (' + (e && e.message || e) + ')');
        }
        return null;
      } finally {
        delete fetching[id];
      }
    })();
    return fetching[id];
  }

  // Public: play a one-shot SFX by event-map id (or arbitrary id with bus override).
  function play(id, opts) {
    opts = opts || {};
    const bus = opts.bus || 'sfx';
    const vol = (typeof opts.vol === 'number') ? opts.vol : 1.0;
    const throttleMs = opts.throttleMs || 0;
    if (settings.muted) return;
    if (!ctx) { pendingQueue.push(() => play(id, opts)); return; }
    if (throttleMs > 0) {
      const now = performance.now();
      const last = lastPlayedAt[id] || 0;
      if (now - last < throttleMs) return;
      lastPlayedAt[id] = now;
    }
    resumeContext();
    loadBuffer(bus, id).then(buf => {
      if (!buf || !ctx) return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = vol;
      src.connect(g);
      g.connect(busGains[bus] || busGains.sfx);
      src.start(0);
    });
  }

  // Public: cross-fade to a new ambient track. id = null stops ambient.
  function ambient(id, fadeMs) {
    fadeMs = (typeof fadeMs === 'number') ? fadeMs : 1200;
    if (!ctx) { pendingQueue.push(() => ambient(id, fadeMs)); return; }
    if (id === ambientId) return;
    resumeContext();
    // Fade out current
    if (ambientSource && ambientGainNode) {
      const oldSrc = ambientSource, oldGain = ambientGainNode;
      const t = ctx.currentTime;
      oldGain.gain.cancelScheduledValues(t);
      oldGain.gain.setValueAtTime(oldGain.gain.value, t);
      oldGain.gain.linearRampToValueAtTime(0, t + fadeMs / 1000);
      setTimeout(() => { try { oldSrc.stop(); } catch (e) {} try { oldSrc.disconnect(); oldGain.disconnect(); } catch (e) {} }, fadeMs + 50);
    }
    ambientSource = null; ambientGainNode = null; ambientId = id;
    if (!id) return;
    loadBuffer('ambient', id).then(buf => {
      if (!buf || !ctx || ambientId !== id) return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const g = ctx.createGain();
      g.gain.value = 0;
      src.connect(g);
      g.connect(busGains.ambient);
      src.start(0);
      const t = ctx.currentTime;
      g.gain.linearRampToValueAtTime(1.0, t + fadeMs / 1000);
      ambientSource = src; ambientGainNode = g;
    });
  }

  // Public: settings.
  function setVolume(bus, v) {
    v = Math.max(0, Math.min(1, v));
    settings[bus] = v;
    saveSettings();
    if (busGains[bus]) busGains[bus].gain.value = v;
    if (bus === 'master' && masterGain) masterGain.gain.value = settings.muted ? 0 : v;
  }
  function setMuted(m) {
    settings.muted = !!m;
    saveSettings();
    if (masterGain) masterGain.gain.value = settings.muted ? 0 : settings.master;
  }
  function getSettings() { return Object.assign({}, settings); }

  // Subscribe to engine bus.
  function wireEvents() {
    if (!window.WG || !WG.Engine) return;
    EVENT_MAP.forEach(row => {
      WG.Engine.on(row.event, () => {
        play(row.id, { bus: row.bus, vol: row.vol, throttleMs: row.throttleMs });
      });
    });
    // Ambient: stage:enter passes { biome }, stage:exit clears.
    WG.Engine.on('stage:enter', payload => {
      const biome = payload && payload.biome;
      const trackId = BIOME_AMBIENT[biome];
      if (trackId) ambient(trackId);
    });
    WG.Engine.on('stage:exit', () => ambient(null));
    WG.Engine.on('boss:defeated', () => {
      // Drop ambient briefly so the boss-die stinger lands cleanly.
      if (ambientGainNode && ctx) {
        const t = ctx.currentTime;
        ambientGainNode.gain.cancelScheduledValues(t);
        ambientGainNode.gain.setValueAtTime(ambientGainNode.gain.value, t);
        ambientGainNode.gain.linearRampToValueAtTime(0.2, t + 0.15);
        ambientGainNode.gain.linearRampToValueAtTime(1.0, t + 2.5);
      }
    });
    WG.Engine.on('engine:pause', () => { if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {}); });
    WG.Engine.on('engine:resume', resumeContext);
  }

  function init() {
    if (initialized) return;
    initialized = true;
    wireEvents();
    // First-gesture hook to satisfy browser autoplay policy.
    const armOnce = () => {
      window.removeEventListener('pointerdown', armOnce, true);
      window.removeEventListener('keydown', armOnce, true);
      window.removeEventListener('touchstart', armOnce, true);
      ensureContext();
    };
    window.addEventListener('pointerdown', armOnce, true);
    window.addEventListener('keydown', armOnce, true);
    window.addEventListener('touchstart', armOnce, true);
  }

  window.WG = window.WG || {};
  window.WG.Audio = {
    init,
    play,
    ambient,
    setVolume,
    setMuted,
    getSettings,
    // For debugging in console:
    _state: () => ({ ctx: !!ctx, ambientId, settings, missing: Object.keys(missing) }),
  };
})();
