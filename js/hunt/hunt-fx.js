// WG.HuntFX — pooled particle bursts on key events.
// DOPAMINE_DESIGN.md §1 (per-second feedback density: visual channel) and §9
// (visual juice catalog: particle bursts). Pool-cap 200 to avoid GC stutter
// (§9 explicit). Layered on top of legacy WG.Render.spawnParticles — additive,
// not a replacement. World-space spawn; world→screen at draw time.
(function(){'use strict';

  const POOL_CAP = 200;
  const pool = new Array(POOL_CAP);
  for (let i = 0; i < POOL_CAP; i++) {
    pool[i] = { active: false, x: 0, y: 0, vx: 0, vy: 0,
                life: 0, maxLife: 0, color: '#fff', size: 2,
                gravity: 0, shape: 'square' };
  }

  // Per-type burst signatures — DOPAMINE_DESIGN.md §1 floating-number table
  // and §9 particle bursts catalog. Counts/lives/speeds match worker brief.
  const TYPES = {
    chopChip:       { count: 5,  life: 0.45, sMin:  80, sMax: 140, gravity: 220, size: 2,
                      colors: ['#c89058', '#a06028', '#5a3010'], shape: 'square' },
    enemyHit:       { count: 3,  life: 0.30, sMin:  50, sMax:  80, gravity:  40, size: 2,
                      colors: ['#ff4040'], shape: 'square' },
    enemyKill:      { count: 12, life: 0.70, sMin: 100, sMax: 200, gravity:  90, size: 2,
                      colors: ['#ff4040', '#ffcc40'], shape: 'square' },
    pickupCoin:     { count: 4,  life: 0.40, sMin:  60, sMax: 100, gravity:   0, size: 2,
                      colors: ['#ffe888'], shape: 'sparkle' },
    pickupOrb:      { count: 6,  life: 0.50, sMin:  60, sMax: 110, gravity:   0, size: 2,
                      colors: ['#80d0ff'], shape: 'sparkle' },
    pickupFragment: { count: 8,  life: 0.60, sMin:  70, sMax: 130, gravity:   0, size: 2,
                      colors: ['#e0a8ff'], shape: 'sparkle' },
    levelUp:        { count: 24, life: 0.80, sMin:  80, sMax:  80, gravity:   0, size: 3,
                      colors: ['#fff0c0'], shape: 'square', ring: true },
    bossKill:       { count: 30, life: 1.20, sMin: 200, sMax: 200, gravity:  60, size: 3,
                      colors: ['#ffd870', '#ff8040', '#ffffff'], shape: 'square', ring: true },

    // W-Turret-And-Campfire-Combat — additive particle types.
    // Muzzle flash: short bright burst at projectile origin on each turret shot.
    muzzleFlash:    { count: 5,  life: 0.18, sMin:  90, sMax: 160, gravity:   0, size: 2,
                      colors: ['#fff4c8', '#ffd070', '#ff8040'], shape: 'square' },
    // Turret destruction: small radial explosion when a turret's HP hits 0.
    turretExplode:  { count: 18, life: 0.65, sMin: 120, sMax: 220, gravity:  60, size: 2,
                      colors: ['#ff8040', '#ffd870', '#7a4a28', '#3a1c08'], shape: 'square', ring: true },
    // Campfire sparkle: faint green bits drifting up off the player while regenerating.
    // Negative gravity so they rise. Small count per emission — the regen tick fires
    // these continuously so cumulative density gives the "healing aura" read.
    campfireSparkle:{ count: 1,  life: 0.85, sMin:  20, sMax:  40, gravity: -30, size: 2,
                      colors: ['#a8f0a0', '#80e088', '#c8ffc8'], shape: 'sparkle' },
    // W-FX-Polish-Pass — gap 3: pickup:torch was silent. Warm orange-yellow
    // sparkle, slight upward bias (negative gravity) — Night-Mode tension resolution.
    pickupTorch:    { count: 8,  life: 0.55, sMin:  60, sMax: 120, gravity: -20, size: 2,
                      colors: ['#f8b850', '#ffe888', '#ffc848'], shape: 'sparkle' },
    // W-FX-Polish-Pass — gap 1: player:revived was silent. Cyan + gold ring,
    // most dramatic moment in the run. Larger speed + ring shape.
    playerRevive:   { count: 32, life: 0.90, sMin: 200, sMax: 200, gravity: -20, size: 3,
                      colors: ['#80f0ff', '#fff0c0', '#ffd070'], shape: 'square', ring: true },
    // W-Building-Repair — per-tick green sparkle drifting up from a damaged
    // turret while wood is being consumed. 2 particles per emit; cumulative
    // density across ticks gives the "active repair" read.
    repairSparkle:  { count: 2,  life: 0.55, sMin:  30, sMax:  60, gravity: -40, size: 2,
                      colors: ['#a8f0a0', '#80e088', '#c8ffc8'], shape: 'sparkle' },
    // W-Building-Repair — repair:complete radial burst. 12 particles, ring,
    // green tones — louder than enemyHit, smaller than levelUp.
    repairBurst:    { count: 12, life: 0.70, sMin: 100, sMax: 180, gravity:  40, size: 2,
                      colors: ['#a8f0a0', '#80e088', '#fff0c0'], shape: 'square', ring: true },
  };

  function _alloc() {
    for (let i = 0; i < POOL_CAP; i++) {
      if (!pool[i].active) return pool[i];
    }
    return null; // pool exhausted — silently drop (DOPAMINE_DESIGN §9 cap)
  }

  function burst(worldX, worldY, type, opts) {
    const def = TYPES[type];
    if (!def) return;
    opts = opts || {};
    const count = (opts.count != null) ? opts.count : def.count;
    const life  = (opts.life  != null) ? opts.life  : def.life;
    const sMin  = (opts.sMin  != null) ? opts.sMin  : def.sMin;
    const sMax  = (opts.sMax  != null) ? opts.sMax  : def.sMax;
    const grav  = (opts.gravity != null) ? opts.gravity : def.gravity;
    const size  = (opts.size  != null) ? opts.size  : def.size;
    const colors = def.colors;

    for (let i = 0; i < count; i++) {
      const p = _alloc();
      if (!p) return;
      const ang = def.ring ? (Math.PI * 2 * i / count)
                           : (Math.random() * Math.PI * 2);
      const sp  = sMin + Math.random() * Math.max(0, sMax - sMin);
      p.active  = true;
      p.x       = worldX;
      p.y       = worldY;
      p.vx      = Math.cos(ang) * sp;
      p.vy      = Math.sin(ang) * sp;
      p.life    = life;
      p.maxLife = life;
      p.gravity = grav;
      p.size    = size;
      p.shape   = def.shape;
      p.color   = colors[(Math.random() * colors.length) | 0];
    }
  }

  function tick(dt) {
    for (let i = 0; i < POOL_CAP; i++) {
      const p = pool[i];
      if (!p.active) continue;
      p.x  += p.vx * dt;
      p.y  += p.vy * dt;
      p.vy += p.gravity * dt;
      p.life -= dt;
      if (p.life <= 0) p.active = false;
    }
  }

  function draw(ctx, w2s) {
    for (let i = 0; i < POOL_CAP; i++) {
      const p = pool[i];
      if (!p.active) continue;
      const a = Math.max(0, Math.min(1, p.life / p.maxLife));
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      const s = w2s ? w2s(p.x, p.y) : { x: p.x, y: p.y };
      if (p.shape === 'sparkle') {
        const sz = p.size + 1;
        ctx.fillRect(s.x - sz / 2, s.y - 0.5, sz, 1);
        ctx.fillRect(s.x - 0.5, s.y - sz / 2, 1, sz);
      } else {
        ctx.fillRect(s.x - p.size / 2, s.y - p.size / 2, p.size, p.size);
      }
    }
    ctx.globalAlpha = 1;
  }

  function _runtimePlayer() {
    const rt = (window.WG.Game && WG.Game.getHuntRuntime) ? WG.Game.getHuntRuntime() : null;
    return rt && rt.player;
  }

  function init() {
    WG.Engine.on('stump:hit', ({ stump }) => {
      if (stump) burst(stump.x, stump.y, 'chopChip');
    });
    WG.Engine.on('stump:chopped', ({ stump }) => {
      if (stump) burst(stump.x, stump.y, 'chopChip', { count: 14, life: 0.7, sMin: 100, sMax: 180 });
    });
    WG.Engine.on('enemy:killed', ({ creature }) => {
      if (creature) burst(creature.x, creature.y, 'enemyKill');
    });
    WG.Engine.on('enemy:damaged', ({ creature }) => {
      if (creature) burst(creature.x, creature.y, 'enemyHit');
    });
    WG.Engine.on('boss:defeated', ({ boss }) => {
      if (boss) burst(boss.x, boss.y, 'bossKill');
    });
    WG.Engine.on('pickup:coin', ({ x, y }) => {
      if (x != null && y != null) burst(x, y, 'pickupCoin');
    });
    WG.Engine.on('pickup:orb', ({ x, y }) => {
      if (x != null && y != null) burst(x, y, 'pickupOrb');
    });
    WG.Engine.on('pickup:fragment', ({ x, y }) => {
      const player = _runtimePlayer();
      const wx = (x != null) ? x : (player ? player.x : 0);
      const wy = (y != null) ? y : (player ? player.y : 0);
      burst(wx, wy, 'pickupFragment');
    });
    WG.Engine.on('player:level', () => {
      const player = _runtimePlayer();
      if (player) burst(player.x, player.y, 'levelUp');
    });
    // W-Turret-And-Campfire-Combat — muzzle flash + destruction explosion.
    // (campfireSparkle is emitted directly from hunt-turret.campfireRegenTick
    //  on a per-tick rate-limited cadence, no event needed.)
    WG.Engine.on('turret:fire', ({ x, y }) => {
      if (x != null && y != null) burst(x, y, 'muzzleFlash');
    });
    WG.Engine.on('turret:destroyed', ({ turret }) => {
      if (turret) burst(turret.x, turret.y, 'turretExplode');
    });
    // W-FX-Polish-Pass — gap 3: pickup:torch (Night-Mode torch refill).
    WG.Engine.on('pickup:torch', ({ x, y }) => {
      if (x == null || y == null) return;
      burst(x, y, 'pickupTorch');
      if (window.WG.HuntFXNumbers && WG.HuntFXNumbers.spawn) {
        WG.HuntFXNumbers.spawn(x, y - 6, '+TORCH', { color: '#ffc848', size: 14, duration: 900 });
      }
    });
    // W-FX-Polish-Pass — gap 1: player:revived (most dramatic moment in run).
    // Cyan/gold ring + camera kick + screen flash + REVIVED float-text.
    WG.Engine.on('player:revived', ({ x, y }) => {
      const player = _runtimePlayer();
      const px = (x != null) ? x : (player ? player.x : 0);
      const py = (y != null) ? y : (player ? player.y : 0);
      burst(px, py, 'playerRevive');
      if (window.WG.HuntRender && WG.HuntRender.addTrauma) WG.HuntRender.addTrauma(0.5);
      if (window.WG.Game && WG.Game.flashScreen) WG.Game.flashScreen('#80f0ff', 0.5, 400);
      if (window.WG.HuntFXNumbers && WG.HuntFXNumbers.spawn) {
        WG.HuntFXNumbers.spawn(px, py - 22, 'REVIVED', { color: '#80f0ff', size: 22, duration: 1400 });
      }
    });
    // W-Building-Repair — per-wood green sparkle while a turret is being
    // hover-repaired. Continuous density confirms the wood drain is active.
    WG.Engine.on('repair:tick', ({ x, y }) => {
      if (x != null && y != null) burst(x, y, 'repairSparkle');
    });
    // W-Building-Repair — completion punctuation: ring burst, mild trauma,
    // and an audio:repair_complete event routed to the existing craft sample
    // via wg-audio EVENT_MAP.
    WG.Engine.on('repair:complete', ({ x, y }) => {
      if (x == null || y == null) return;
      burst(x, y, 'repairBurst');
      if (window.WG.HuntRender && WG.HuntRender.addTrauma) WG.HuntRender.addTrauma(0.15);
      WG.Engine.emit('audio:repair_complete', { x, y });
    });
    // W-Polish-Gaps-1-5 §C — symmetric event-listener for banshee shriek FX.
    // Mirrors the repair:complete pattern (subscriber owns burst + flash);
    // hunt-enemies.js AI now only emits the event + addTrauma. Tunables read
    // through creature._typeData so designer edits to TYPES.banshee.shriek*
    // propagate to FX without touching this file.
    WG.Engine.on('enemy:shriek', ({ creature }) => {
      if (!creature) return;
      const td = creature._typeData || {};
      const count = (td.shriekParticleCount != null) ? td.shriekParticleCount : 16;
      burst(creature.x, creature.y, 'pickupFragment', { count, life: 0.7 });
      if (window.WG.Game && WG.Game.flashScreen) {
        const color = td.accent || '#a060ff';
        const alpha = (td.shriekFlashAlpha != null) ? td.shriekFlashAlpha : 0.3;
        const durMs = (td.shriekFlashDurationMs != null) ? td.shriekFlashDurationMs : 200;
        WG.Game.flashScreen(color, alpha, durMs);
      }
    });
    // W-FX-Polish-Pass — gap 2 (consume side): instant_turret/revive consumed.
    // Gold confirm-burst at the player + small "USED" float-text. HUD pill
    // desaturation for both consumed AND expired is handled in hunt-render.js.
    WG.Engine.on('buff:consumed', () => {
      const player = _runtimePlayer();
      if (!player) return;
      burst(player.x, player.y, 'pickupCoin', { count: 10 });
      if (window.WG.HuntFXNumbers && WG.HuntFXNumbers.spawn) {
        WG.HuntFXNumbers.spawn(player.x, player.y - 18, 'USED', { color: '#fff0c0', size: 13, duration: 800 });
      }
    });
  }

  window.WG = window.WG || {};
  window.WG.HuntFX = { init, burst, tick, draw };
})();
