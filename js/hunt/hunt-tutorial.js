// WG.HuntTutorial — one-time first-play overlay for Stage 1
(function () { 'use strict';

  var STEPS = [
    { title: 'Move',        body: 'Drag the LEFT half of the screen to walk.',                               btn: 'NEXT',  arrow: 'left:20px;bottom:120px;' },
    { title: 'Auto-Attack', body: 'Your weapon swings on its own. Get close to enemies. Watch your HP bar.', btn: 'NEXT',  arrow: null },
    { title: 'Skill',       body: 'Tap the gold star (top-right) for a burst attack. It has a cooldown.',    btn: 'NEXT',  arrow: 'right:80px;top:48px;' },
    { title: 'Survive',     body: 'Survive 3 minutes. Good luck.',                                           btn: 'START', arrow: null },
  ];

  var overlay = null;
  var arrowEl = null;
  var currentStep = 0;

  function ensureStyles() {
    if (document.getElementById('wg-tut-styles')) return;
    var s = document.createElement('style');
    s.id = 'wg-tut-styles';
    s.textContent = '@keyframes tut-pulse{0%,100%{transform:translateY(0);opacity:0.7;}50%{transform:translateY(-8px);opacity:1;}}.tut-arrow{animation:tut-pulse 1.4s infinite ease-in-out;}';
    document.head.appendChild(s);
  }

  function removeArrow() {
    if (arrowEl && arrowEl.parentNode) arrowEl.parentNode.removeChild(arrowEl);
    arrowEl = null;
  }

  function dismiss() {
    WG.State.get().tutorial.stage1Seen = true;
    removeArrow();
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
    var rt = WG.Game.getHuntRuntime();
    if (rt) rt._tutorialPaused = false;
    WG.Engine.resume();
  }

  function showStep(idx) {
    removeArrow();
    var step = STEPS[idx];
    overlay.querySelector('.modal-title').textContent = step.title;
    overlay.querySelector('.modal-body').textContent = step.body;
    overlay.querySelector('.tut-next').textContent = step.btn;
    overlay.querySelector('.tut-skip').style.display = idx === 0 ? '' : 'none';

    if (step.arrow) {
      arrowEl = document.createElement('div');
      arrowEl.className = 'tut-arrow';
      arrowEl.id = 'wg-tut-arrow';
      arrowEl.style.cssText = 'position:absolute;z-index:120;pointer-events:none;width:48px;height:48px;' + step.arrow;
      arrowEl.innerHTML = '<svg viewBox="0 0 48 48" width="48" height="48"><polygon points="24,4 44,28 32,28 32,44 16,44 16,28 4,28" fill="#ffd870" stroke="#604020" stroke-width="2"/></svg>';
      document.getElementById('app').appendChild(arrowEl);
    }
  }

  function init() {
    var st = WG.State.get();
    if (!st.tutorial) st.tutorial = { stage1Seen: false };
    ensureStyles();
  }

  function maybeStart(stageId) {
    if (stageId !== 1) return;
    var tut = WG.State.get().tutorial;
    if (tut && tut.stage1Seen === true) return;

    WG.Engine.pause();
    var rt = WG.Game.getHuntRuntime();
    if (rt) rt._tutorialPaused = true;

    currentStep = 0;
    overlay = document.createElement('div');
    overlay.className = 'modal-overlay show';
    overlay.id = 'wg-tut-modal';
    overlay.style.zIndex = '110';
    overlay.innerHTML =
      '<div class="modal-card" style="max-width:320px;position:relative;">' +
        '<button class="tut-skip" style="position:absolute;top:8px;right:12px;background:transparent;border:0;color:#a89878;font-size:10px;cursor:pointer;letter-spacing:1px;">SKIP</button>' +
        '<div class="modal-title"></div>' +
        '<div class="modal-body"></div>' +
        '<div class="modal-btn-row"><button class="btn primary tut-next"></button></div>' +
      '</div>';

    document.getElementById('modal-root').appendChild(overlay);

    overlay.querySelector('.tut-skip').addEventListener('click', dismiss);
    overlay.querySelector('.tut-next').addEventListener('click', function () {
      currentStep++;
      if (currentStep >= STEPS.length) { dismiss(); } else { showStep(currentStep); }
    });

    showStep(0);
  }

  window.WG.HuntTutorial = { init: init, maybeStart: maybeStart };
})();
