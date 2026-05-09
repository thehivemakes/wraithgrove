// WG.Onboarding — first-launch sequence: welcome cinematic, character pick, Stage 1 bridge
// Concern A: firstLaunch / firstLaunchStep gating (in WG.State); overlay fires before menu
// Concern B: 3-screen overlay — welcome (auto) → lore (tap) → character pick (3 starters)
// Concern C: pulsing hint-arrow to Stage 1 + BATTLE button after pick completes
// Concern D: cold-load resume from WG.State.firstLaunchStep (persisted via WG.Cache)
(function () { 'use strict';

  // First 3 characters in the catalog — spec: "3 starter characters only; don't reveal the other 6"
  var STARTERS = ['lantern_acolyte', 'sigil_student', 'horned_oni'];

  var STARTER_GLYPHS = {
    lantern_acolyte: 'L',
    sigil_student:   'S',
    horned_oni:      'H',
  };
  var STARTER_HINTS = {
    lantern_acolyte: 'Balanced starter · Wood XP +5%',
    sigil_student:   'Crit chance +3%',
    horned_oni:      'Melee damage +8%',
  };

  var _overlay    = null;
  var _bridgeEl   = null;
  var _bridgeTimer = 0;
  var _bridgeStageHandler = null;

  // ── Styles ─────────────────────────────────────────────────────────────────
  function ensureStyles() {
    if (document.getElementById('wg-ob-styles')) return;
    var s = document.createElement('style');
    s.id = 'wg-ob-styles';
    s.textContent = [
      '@keyframes ob-fadein{from{opacity:0}to{opacity:1}}',
      '@keyframes ob-slideup{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}',
      '@keyframes ob-textdrop{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}',
      '@keyframes ob-pulse{0%,100%{transform:translateY(0);opacity:0.65}50%{transform:translateY(-8px);opacity:1}}',
      // Full-screen overlay base
      '.wg-ob{position:absolute;inset:0;z-index:500;display:flex;flex-direction:column;align-items:center;' +
        'justify-content:center;background:rgba(4,2,8,0.97);animation:ob-fadein 420ms ease-out both;}',
      // Title + tagline
      '.wg-ob-title{font-family:Georgia,serif;font-size:34px;letter-spacing:0.16em;color:#f0d890;text-align:center;' +
        'text-shadow:0 0 28px rgba(240,216,144,0.45);animation:ob-fadein 2000ms ease-out both;}',
      '.wg-ob-tagline{font-size:11px;letter-spacing:4px;color:#9a8040;text-align:center;margin-top:14px;' +
        'text-transform:uppercase;animation:ob-fadein 2000ms 700ms ease-out both;}',
      // Lore lines
      '.wg-ob-lore-line{font-size:14px;letter-spacing:1.5px;color:#d8c898;text-align:center;' +
        'margin-bottom:10px;opacity:0;line-height:1.6;}',
      '.wg-ob-lore-line.show{animation:ob-textdrop 500ms ease-out both;opacity:1;}',
      // "TAP TO CONTINUE"
      '.wg-ob-tap{font-size:10px;letter-spacing:3px;color:#806840;text-transform:uppercase;' +
        'position:absolute;bottom:58px;text-align:center;animation:ob-pulse 2.2s infinite ease-in-out;}',
      // Skip intro button
      '.wg-ob-skip{position:absolute;top:54px;right:14px;background:none;border:none;color:#5a3820;' +
        'font-size:9px;letter-spacing:2px;text-transform:uppercase;cursor:pointer;padding:6px 10px;}',
      '.wg-ob-skip:active{opacity:0.5;}',
      // Character pick label
      '.wg-ob-pick-label{font-size:11px;letter-spacing:3px;color:#906848;text-transform:uppercase;' +
        'margin-bottom:24px;animation:ob-fadein 400ms ease-out both;}',
      // Character card grid
      '.wg-ob-chars{display:flex;gap:10px;justify-content:center;width:100%;padding:0 14px;box-sizing:border-box;}',
      '.wg-ob-char{flex:1;max-width:116px;background:linear-gradient(to bottom,#1a0c18,#0e0810);' +
        'border:1px solid #4a3028;border-radius:10px;padding:18px 10px 14px;text-align:center;' +
        'cursor:pointer;transition:transform 100ms ease,border-color 120ms ease,box-shadow 120ms ease;}',
      '.wg-ob-char:hover{border-color:#a08848;box-shadow:0 0 14px rgba(160,136,72,0.25);}',
      '.wg-ob-char:active{transform:scale(0.94);}',
      '.wg-ob-char-glyph{width:52px;height:52px;line-height:52px;font-size:22px;font-family:Georgia,serif;' +
        'letter-spacing:2px;color:#f0d890;margin:0 auto 10px;' +
        'background:radial-gradient(ellipse at center,#2a1820 0%,#0e0810 70%);' +
        'border:1px solid #6a4828;border-radius:50%;text-align:center;}',
      '.wg-ob-char-name{font-size:10px;letter-spacing:1.5px;color:#d0c090;text-transform:uppercase;' +
        'margin-bottom:6px;line-height:1.3;}',
      '.wg-ob-char-hint{font-size:9px;color:#806040;letter-spacing:0.5px;line-height:1.4;}',
      // "WELCOME, [NAME]" flash
      '.wg-ob-welcome{font-family:Georgia,serif;font-size:22px;letter-spacing:0.12em;color:#f0d890;' +
        'text-align:center;animation:ob-slideup 600ms ease-out both;' +
        'text-shadow:0 0 20px rgba(240,216,144,0.5);}',
      // Bridge callout arrow+label (pointing DOWN at BATTLE button)
      '.wg-ob-bridge{position:absolute;z-index:510;pointer-events:none;' +
        'display:flex;flex-direction:column;align-items:center;gap:4px;' +
        'animation:ob-fadein 300ms ease-out both;left:0;right:0;}',
      '.wg-ob-bridge .hint-body{background:rgba(8,4,2,0.90);border:1px solid #b08840;' +
        'border-radius:8px;padding:5px 14px;font-size:11px;letter-spacing:1px;color:#f0d890;' +
        'white-space:nowrap;box-shadow:0 2px 10px rgba(0,0,0,0.7);}',
      '.wg-ob-bridge-arrow{animation:ob-pulse 1.4s infinite ease-in-out;}',
    ].join('');
    document.head.appendChild(s);
  }

  function arrowDownSvg() {
    // Points downward (toward BATTLE button below)
    return '<svg class="wg-ob-bridge-arrow" viewBox="0 0 48 48" width="28" height="28">' +
      '<polygon points="24,44 44,20 32,20 32,4 16,4 16,20 4,20" fill="#ffd870" stroke="#604020" stroke-width="2"/>' +
      '</svg>';
  }

  // ── Overlay helpers ────────────────────────────────────────────────────────
  function _appEl() {
    return document.getElementById('app') || document.body;
  }

  function _removeOverlay() {
    if (_overlay && _overlay.parentNode) _overlay.parentNode.removeChild(_overlay);
    _overlay = null;
  }

  function _makeOverlay() {
    _removeOverlay();
    ensureStyles();
    var el = document.createElement('div');
    el.className = 'wg-ob';
    _appEl().appendChild(el);
    _overlay = el;
    return el;
  }

  // ── Skip intro button ──────────────────────────────────────────────────────
  function _addSkipBtn(el) {
    var btn = document.createElement('button');
    btn.className = 'wg-ob-skip';
    btn.textContent = 'SKIP INTRO';
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      WG.Events.track('onboarding:skip', { fromStep: WG.State.get().firstLaunchStep });
      _showCharPick();
    });
    el.appendChild(btn);
  }

  // ── Step 1 — Welcome (auto-advance after fade) ─────────────────────────────
  function _showWelcome() {
    WG.State.get().firstLaunchStep = 1;
    var el = _makeOverlay();

    var title = document.createElement('div');
    title.className = 'wg-ob-title';
    title.textContent = 'UNLIMITED CHAOS';
    el.appendChild(title);

    var tagline = document.createElement('div');
    tagline.className = 'wg-ob-tagline';
    tagline.textContent = 'Where the boundary tears.';
    el.appendChild(tagline);

    _addSkipBtn(el);

    // Auto-advance after 3.2s (2s animation + 1.2s hold)
    var timer = setTimeout(function () {
      if (_overlay === el) _showLore();
    }, 3200);

    // Tap also advances (impatient players)
    el.addEventListener('click', function () {
      clearTimeout(timer);
      if (_overlay === el) _showLore();
    });
  }

  // ── Step 2 — Lore (tap-to-continue) ───────────────────────────────────────
  function _showLore() {
    WG.State.get().firstLaunchStep = 2;
    var LINES = [
      'Folk-horror walks again.',
      'The wraith father stirs.',
      'Pick your acolyte.',
      'Hunt before it hunts you.',
    ];

    var el = _makeOverlay();

    var wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;padding:0 32px;';
    el.appendChild(wrap);

    var lineEls = LINES.map(function (text) {
      var d = document.createElement('div');
      d.className = 'wg-ob-lore-line';
      d.textContent = text;
      wrap.appendChild(d);
      return d;
    });

    // Stagger drop-ins
    lineEls.forEach(function (le, i) {
      setTimeout(function () { le.classList.add('show'); }, 200 + i * 480);
    });

    var tapLabel = document.createElement('div');
    tapLabel.className = 'wg-ob-tap';
    tapLabel.textContent = '— TAP TO CONTINUE —';
    el.appendChild(tapLabel);

    _addSkipBtn(el);

    // Allow tap after last line has appeared
    var tapReady = false;
    var readyDelay = 200 + LINES.length * 480 + 400;
    setTimeout(function () { tapReady = true; }, readyDelay);

    el.addEventListener('click', function () {
      if (!tapReady || _overlay !== el) return;
      _showCharPick();
    });
  }

  // ── Step 3 — Character pick ────────────────────────────────────────────────
  function _showCharPick() {
    WG.State.get().firstLaunchStep = 3;
    var el = _makeOverlay();

    var label = document.createElement('div');
    label.className = 'wg-ob-pick-label';
    label.textContent = 'Choose Your Acolyte';
    el.appendChild(label);

    var grid = document.createElement('div');
    grid.className = 'wg-ob-chars';
    el.appendChild(grid);

    STARTERS.forEach(function (id) {
      var c = WG.AscendSkins.get(id);
      if (!c) return;
      var card = document.createElement('div');
      card.className = 'wg-ob-char';

      var glyph = document.createElement('div');
      glyph.className = 'wg-ob-char-glyph';
      glyph.textContent = STARTER_GLYPHS[id] || id[0].toUpperCase();
      card.appendChild(glyph);

      var nameEl = document.createElement('div');
      nameEl.className = 'wg-ob-char-name';
      nameEl.textContent = c.name;
      card.appendChild(nameEl);

      var hintEl = document.createElement('div');
      hintEl.className = 'wg-ob-char-hint';
      hintEl.textContent = STARTER_HINTS[id] || '';
      card.appendChild(hintEl);

      card.addEventListener('click', function () {
        _pickCharacter(id, c.name, el);
      });

      grid.appendChild(card);
    });
  }

  // ── Character selection ────────────────────────────────────────────────────
  function _pickCharacter(id, name, pickEl) {
    WG.Events.track('onboarding:char-pick', { characterId: id });

    // Grant free unlock (no currency check — starter gift)
    var ps = WG.State.get().player;
    ps.ownedCharacters = ps.ownedCharacters || ['lantern_acolyte'];
    if (!ps.ownedCharacters.includes(id)) {
      ps.ownedCharacters.push(id);
      ps.characterTiers = ps.characterTiers || {};
      ps.characterTiers[id] = 1;
      WG.Engine.emit('character:unlocked', { character: WG.AscendSkins.get(id) });
    }
    WG.AscendSkins.setActive(id);

    // "WELCOME, [NAME]" flash — replace pick screen content
    pickEl.innerHTML = '';
    var msg = document.createElement('div');
    msg.className = 'wg-ob-welcome';
    msg.textContent = 'WELCOME, ' + name.toUpperCase();
    pickEl.appendChild(msg);

    setTimeout(_complete, 1500);
  }

  // ── Complete onboarding ────────────────────────────────────────────────────
  function _complete() {
    WG.State.get().firstLaunch = false;
    WG.State.get().firstLaunchStep = 4;
    if (WG.Cache && WG.Cache.save) WG.Cache.save(); // immediate persist
    _removeOverlay();
    _showBridgeCallout();
  }

  // ── Bridge callout — Concern C ─────────────────────────────────────────────
  // Pulsing arrow callout pointing down at the BATTLE button below.
  // Dismisses on hunt:stage-start or after 8s.
  function _showBridgeCallout() {
    // Brief delay so the DOM finishes re-rendering the stage select panel
    setTimeout(function () {
      ensureStyles();
      var appEl = _appEl();
      var h = appEl.offsetHeight || window.innerHeight;

      var el = document.createElement('div');
      el.className = 'wg-ob-bridge';
      // Position above the BATTLE button area (~24% from bottom)
      el.style.bottom = Math.round(h * 0.24) + 'px';
      el.innerHTML = '<div class="hint-body">Tap BATTLE to begin Stage 1</div>' + arrowDownSvg();

      appEl.appendChild(el);
      _bridgeEl = el;

      _bridgeStageHandler = function () { _removeBridgeCallout(); };
      WG.Engine.on('hunt:stage-start', _bridgeStageHandler);

      _bridgeTimer = setTimeout(_removeBridgeCallout, 8000);
    }, 200);
  }

  function _removeBridgeCallout() {
    if (_bridgeTimer) { clearTimeout(_bridgeTimer); _bridgeTimer = 0; }
    if (_bridgeStageHandler) {
      WG.Engine.off('hunt:stage-start', _bridgeStageHandler);
      _bridgeStageHandler = null;
    }
    if (_bridgeEl && _bridgeEl.parentNode) _bridgeEl.parentNode.removeChild(_bridgeEl);
    _bridgeEl = null;
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  function init() {
    // No-op: firstLaunch + firstLaunchStep defaults live in wg-state.js;
    // wg-cache.js load() restores them (or sets false for existing saves).
  }

  // Called from wg-game.js after showHuntStageList() — the lobby is ready
  // underneath; onboarding overlay sits on top if needed.
  function maybeShow() {
    var st = WG.State.get();
    if (!st.firstLaunch) return;
    var step = st.firstLaunchStep || 1;
    if      (step <= 1) _showWelcome();
    else if (step === 2) _showLore();
    else if (step === 3) _showCharPick();
    // step 4 = complete; firstLaunch is false, this path won't execute
  }

  window.WG.Onboarding = { init: init, maybeShow: maybeShow };
})();
