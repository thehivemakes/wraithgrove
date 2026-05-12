// WG.Walkthrough — one-time opt-in walkthrough offer + 5-step tooltip tour
(function () { 'use strict';

  var STEPS = [
    { id: 'joystick',    text: 'Drag the joystick to move.\nYour character faces where you walk.',      pos: 'bottom:220px;left:50%;transform:translateX(-50%);' },
    { id: 'autoattack', text: 'You auto-attack nearby enemies.\nNo button needed — just stay close.', pos: 'bottom:260px;left:50%;transform:translateX(-50%);' },
    { id: 'orbs',       text: 'Pick up orbs to earn XP.\nLevel up to power your skill.',                pos: 'bottom:260px;left:50%;transform:translateX(-50%);' },
    { id: 'hp',         text: 'The bar at the top is your HP.\nDon’t let it reach zero.',           pos: 'top:82px;left:50%;transform:translateX(-50%);' },
    { id: 'skill',      text: 'The skill button charges up.\nTap it when it glows.',                    pos: 'top:112px;left:50%;transform:translateX(-50%);' },
    // Architect 2026-05-09 — dopamine cascade discoverability
    { id: 'surge',      text: 'PANIC BUTTON: Double-tap the screen\n(or press Q) to unleash\nSpirit Surge — slowmo + nuke.\nCharges every 60s.', pos: 'bottom:240px;left:50%;transform:translateX(-50%);' },
    { id: 'phoenix',    text: 'If you fall, Phoenix Revive\ncatches you once per stage.\n3s godmode + 2× damage.', pos: 'top:150px;left:50%;transform:translateX(-50%);' },
    { id: 'wraith',     text: 'Build a kill chain.\nCombo 30 / 60 / 100 triggers\nWRAITH UNLEASH cascades.', pos: 'top:60px;left:50%;transform:translateX(-50%);' },
  ];

  function _tut() {
    var st = WG.State.get();
    if (!st.tutorial) st.tutorial = {};
    return st.tutorial;
  }

  function _injectStyles() {
    if (document.getElementById('wg-wt-styles')) return;
    var s = document.createElement('style');
    s.id = 'wg-wt-styles';
    s.textContent = [
      '@keyframes wt-fadein{from{opacity:0}to{opacity:1}}',
      '.wg-wt-overlay{position:fixed;inset:0;z-index:300;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.72);animation:wt-fadein 250ms ease-out both;}',
      '.wg-wt-card{background:rgba(10,6,2,0.97);border:1.5px solid #b08840;border-radius:12px;padding:24px 20px;max-width:280px;width:88%;text-align:center;box-shadow:0 4px 32px rgba(0,0,0,0.8);}',
      '.wg-wt-title{font-size:17px;color:#f0d890;letter-spacing:2px;font-weight:700;margin-bottom:10px;}',
      '.wg-wt-body{font-size:12px;color:#c8a868;line-height:1.7;margin-bottom:20px;white-space:pre-line;}',
      '.wg-wt-btnrow{display:flex;gap:10px;}',
      '.wg-wt-btn{flex:1;padding:11px 0;border-radius:8px;font-size:11px;font-weight:700;letter-spacing:1.5px;cursor:pointer;border:none;}',
      '.wg-wt-btn.primary{background:linear-gradient(to bottom,#806020,#5a3c0a);color:#fff0c8;}',
      '.wg-wt-btn.secondary{background:rgba(255,255,255,0.06);border:1.5px solid #3a2818;color:#a08858;}',
      '.wg-wt-tip{position:fixed;z-index:310;background:rgba(8,4,2,0.95);border:1px solid #d8a838;border-radius:10px;padding:12px 16px 32px 16px;max-width:230px;font-size:12px;color:#f0d890;line-height:1.6;white-space:pre-line;box-shadow:0 4px 18px rgba(0,0,0,0.85);animation:wt-fadein 220ms ease-out both;}',
      '.wg-wt-tip .wt-nav{position:absolute;bottom:6px;right:8px;left:8px;display:flex;gap:6px;align-items:center;justify-content:flex-end;}',
      '.wg-wt-tip .wt-dots{font-size:10px;color:#806040;letter-spacing:2px;flex:1;}',
      '.wg-wt-tip .wt-next{padding:4px 12px;border-radius:6px;background:linear-gradient(to bottom,#806020,#5a3c0a);border:none;color:#fff0c8;font-size:10px;font-weight:700;cursor:pointer;letter-spacing:1px;}',
      '.wg-wt-tip .wt-skip{padding:4px 9px;border-radius:6px;background:rgba(255,255,255,0.05);border:1px solid #3a2818;color:#907858;font-size:9px;cursor:pointer;letter-spacing:0.5px;}',
    ].join('');
    document.head.appendChild(s);
  }

  function _dismissEl(id) {
    var el = document.getElementById(id);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function _endTour() {
    for (var i = 0; i < STEPS.length; i++) _dismissEl('wg-wt-tip-' + STEPS[i].id);
  }

  function _showStep(idx) {
    if (idx > 0) _dismissEl('wg-wt-tip-' + STEPS[idx - 1].id);
    if (idx >= STEPS.length) { _endTour(); return; }

    var def  = STEPS[idx];
    var wrap = document.createElement('div');
    wrap.id = 'wg-wt-tip-' + def.id;
    wrap.className = 'wg-wt-tip';
    wrap.style.cssText = def.pos;
    wrap.appendChild(document.createTextNode(def.text));

    var nav = document.createElement('div');
    nav.className = 'wt-nav';

    var dots = document.createElement('span');
    dots.className = 'wt-dots';
    dots.textContent = STEPS.map(function (_, i) { return i === idx ? '●' : '○'; }).join('');
    nav.appendChild(dots);

    var skipBtn = document.createElement('button');
    skipBtn.className = 'wt-skip';
    skipBtn.textContent = 'SKIP';
    skipBtn.addEventListener('click', function () { _endTour(); });
    nav.appendChild(skipBtn);

    var nextBtn = document.createElement('button');
    nextBtn.className = 'wt-next';
    nextBtn.textContent = idx < STEPS.length - 1 ? 'NEXT' : 'DONE';
    (function (i) {
      nextBtn.addEventListener('click', function () { _showStep(i + 1); });
    }(idx));
    nav.appendChild(nextBtn);

    wrap.appendChild(nav);
    document.body.appendChild(wrap);
  }

  function _showOffer() {
    _injectStyles();
    if (document.getElementById('wg-wt-offer')) return;

    var overlay = document.createElement('div');
    overlay.id = 'wg-wt-offer';
    overlay.className = 'wg-wt-overlay';

    var card = document.createElement('div');
    card.className = 'wg-wt-card';

    var title = document.createElement('div');
    title.className = 'wg-wt-title';
    title.textContent = 'Quick walkthrough?';
    card.appendChild(title);

    var body = document.createElement('div');
    body.className = 'wg-wt-body';
    body.textContent = '30 seconds. Learn the 5 game systems.\nOr skip — Settings has it later.';
    card.appendChild(body);

    var btnRow = document.createElement('div');
    btnRow.className = 'wg-wt-btnrow';

    var noBtn = document.createElement('button');
    noBtn.className = 'wg-wt-btn secondary';
    noBtn.textContent = 'No thanks';
    noBtn.addEventListener('click', function () {
      _tut().walkthroughOffered   = true;
      _tut().dismissedWalkthrough = true;
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    });
    btnRow.appendChild(noBtn);

    var yesBtn = document.createElement('button');
    yesBtn.className = 'wg-wt-btn primary';
    yesBtn.textContent = 'Show me';
    yesBtn.addEventListener('click', function () {
      _tut().walkthroughOffered = true;
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      _showStep(0);
    });
    btnRow.appendChild(yesBtn);

    card.appendChild(btnRow);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  // Called from Settings "REPLAY WALKTHROUGH" regardless of dismissed state.
  function show() {
    _injectStyles();
    _dismissEl('wg-wt-offer');
    for (var i = 0; i < STEPS.length; i++) _dismissEl('wg-wt-tip-' + STEPS[i].id);
    _showStep(0);
  }

  function init() {
    var st = WG.State.get();
    if (!st.tutorial) st.tutorial = {};
    if (st.tutorial.walkthroughOffered   === undefined) st.tutorial.walkthroughOffered   = false;
    if (st.tutorial.dismissedWalkthrough === undefined) st.tutorial.dismissedWalkthrough = false;

    // Offer fires once after Stage 0 clears (the tutorial pre-stage).
    WG.Engine.on('hunt:stage-cleared', function (e) {
      if (e.stageId !== 0) return;
      if (_tut().walkthroughOffered) return;
      setTimeout(_showOffer, 800);
    });
  }

  window.WG.Walkthrough = { init: init, show: show };
})();
