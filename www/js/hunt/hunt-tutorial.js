// WG.HuntTutorial — Stage 1 victory cinematic only (persistent hint nags removed — see WG.Walkthrough)
(function () { 'use strict';

  var isActive = false;

  // ── Styles ─────────────────────────────────────────────────────────────────
  function ensureStyles() {
    if (document.getElementById('wg-tut-styles')) return;
    var s = document.createElement('style');
    s.id = 'wg-tut-styles';
    s.textContent = [
      '@keyframes tut-fadein{from{opacity:0;}to{opacity:1;}}',
      '@keyframes tut-fadeout{from{opacity:1;}to{opacity:0;}}',
      '@keyframes tut-cin-title{from{opacity:0;letter-spacing:4px;}to{opacity:1;letter-spacing:10px;}}',
      '@keyframes tut-cin-sub{from{opacity:0;}to{opacity:1;}}',
      '.wg-victory{position:absolute;inset:0;z-index:125;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;background:rgba(0,0,0,0);transition:background 500ms;}',
      '.wg-victory.show{background:rgba(0,0,0,0.88);}',
      '.wg-victory .vc-line1{font-size:26px;color:#f0d890;opacity:0;text-align:center;text-shadow:0 0 24px rgba(240,216,144,0.5);}',
      '.wg-victory .vc-line1.show{animation:tut-cin-title 900ms ease-out both;opacity:1;}',
      '.wg-victory .vc-line2{font-size:11px;letter-spacing:6px;color:#b08840;opacity:0;margin-top:10px;text-transform:uppercase;text-align:center;}',
      '.wg-victory .vc-line2.show{animation:tut-cin-sub 700ms ease-out both;opacity:1;}',
    ].join('');
    document.head.appendChild(s);
  }

  // ── Event handles ─────────────────────────────────────────────────────────
  var _onStageCleared = null, _onStageFailed = null;

  function removeEventListeners() {
    if (_onStageCleared) { WG.Engine.off('hunt:stage-cleared', _onStageCleared); _onStageCleared = null; }
    if (_onStageFailed)  { WG.Engine.off('hunt:stage-failed',  _onStageFailed);  _onStageFailed  = null; }
  }

  function wireEvents() {
    _onStageCleared = function (e) {
      if (!isActive || e.stageId !== 1) return;
      showVictoryCinematic();
    };
    _onStageFailed = function (e) {
      if (!isActive || e.stageId !== 1) return;
      isActive = false;
      removeEventListeners();
    };
    WG.Engine.on('hunt:stage-cleared', _onStageCleared);
    WG.Engine.on('hunt:stage-failed',  _onStageFailed);
  }

  // ── Victory cinematic ─────────────────────────────────────────────────────
  function showVictoryCinematic() {
    var cel = document.createElement('div');
    cel.className = 'wg-victory';
    cel.innerHTML =
      '<div class="vc-line1">STAGE CLEARED</div>' +
      '<div class="vc-line2">WRAITH FATHER AWAITS...</div>';
    document.getElementById('app').appendChild(cel);

    requestAnimationFrame(function () {
      cel.classList.add('show');
      setTimeout(function () { cel.querySelector('.vc-line1').classList.add('show'); }, 300);
      setTimeout(function () { cel.querySelector('.vc-line2').classList.add('show'); }, 900);
      // Fade out after 3.6s to let results modal show underneath
      setTimeout(function () {
        cel.style.transition = 'opacity 600ms';
        cel.style.opacity    = '0';
        setTimeout(function () {
          if (cel.parentNode) cel.parentNode.removeChild(cel);
          WG.State.get().tutorial.completedFirstStage = true;
          WG.State.get().tutorial.stage1Seen          = true;
          isActive = false;
          removeEventListeners();
        }, 600);
      }, 3600);
    });
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  function init() {
    var st = WG.State.get();
    if (!st.tutorial) st.tutorial = { stage1Seen: false, completedFirstStage: false };
    if (st.tutorial.completedFirstStage === undefined) {
      st.tutorial.completedFirstStage = !!st.tutorial.stage1Seen;
    }
    // W-Stage-Zero-Tutorial: existing saves (firstLaunch=false) get stage0Cleared=true
    // so they don't re-enter Stage 0 on next session.
    if (st.tutorial.stage0Cleared === undefined) {
      st.tutorial.stage0Cleared = !st.firstLaunch;
    }
    ensureStyles();
  }

  function maybeStart(stageId) {
    if (stageId !== 1) return;
    var tut = WG.State.get().tutorial;
    // W-Stage-Zero-Tutorial: suppress Stage 1 cinematic until Stage 0 is cleared
    if (tut.stage0Cleared === false) return;
    if (tut.completedFirstStage || tut.stage1Seen) return;

    isActive = true;
    wireEvents();
  }

  window.WG.HuntTutorial = { init: init, maybeStart: maybeStart };
})();
