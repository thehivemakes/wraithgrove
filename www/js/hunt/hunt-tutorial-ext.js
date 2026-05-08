// WG.HuntTutorialExt — tutorial reset helper for Settings modal (hint auto-triggers removed per W-Tutorial-Strip)
(function () { 'use strict';

  // ── State helpers ─────────────────────────────────────────────────────────
  function tut() {
    const st = WG.State.get();
    if (!st.tutorial) st.tutorial = {};
    return st.tutorial;
  }
  const isDone   = (key) => !!tut()[key];
  const markDone = (key) => { tut()[key] = true; };

  // ── Styles ────────────────────────────────────────────────────────────────
  function ensureStyles() {
    if (document.getElementById('wg-tut-ext-styles')) return;
    // Reuse keyframe animations from hunt-tutorial.js if already injected.
    const keyframes = document.getElementById('wg-tut-styles') ? '' : [
      '@keyframes tut-fadein{from{opacity:0}to{opacity:1}}',
      '@keyframes tut-fadeout{from{opacity:1}to{opacity:0}}',
    ].join('');
    const s = document.createElement('style');
    s.id = 'wg-tut-ext-styles';
    s.textContent = keyframes + [
      '.wg-ext-dot{position:absolute;top:2px;right:2px;width:8px;height:8px;border-radius:50%;background:#e04040;pointer-events:none;animation:tut-fadein 400ms ease-out both;}',
    ].join('');
    document.head.appendChild(s);
  }

  // ── Shared helpers (used by resetAll) ─────────────────────────────────────
  function dismissHint(id) {
    const el = document.getElementById('wg-ext-hint-' + id);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function setNavDot(tab, on) {
    const navTab = document.querySelector('.nav-tab[data-tab="' + tab + '"]');
    if (!navTab) return;
    const existing = navTab.querySelector('.wg-ext-dot');
    if (on && !existing) {
      navTab.style.position = 'relative';
      const dot = document.createElement('span');
      dot.className = 'wg-ext-dot';
      navTab.appendChild(dot);
    } else if (!on && existing) {
      existing.parentNode.removeChild(existing);
    }
  }

  function gachaEligible() {
    const s = WG.State.get();
    const gems     = (s.currencies && s.currencies.gems) || 0;
    const unlocked = (s.huntProgress && s.huntProgress.highestUnlocked) || 1;
    const freePull = WG.RelicsCollection && WG.RelicsCollection.freeSummonAvailable && WG.RelicsCollection.freeSummonAvailable();
    return !!(freePull || gems >= 30 || unlocked >= 3);
  }

  function checkGachaDot() {
    if (!isDone('gachaTutorial') && gachaEligible()) setNavDot('relics', true);
  }

  // ── Reset all tutorial flags — called by Settings "RESET TUTORIAL" button ─
  function resetAll() {
    const t = tut();
    // Re-arm Stage 1 flags (owned by hunt-tutorial.js but resettable here too)
    t.stage1Seen          = false;
    t.completedFirstStage = false;
    // Re-arm extension flags
    t.towerTutorial  = false;
    t.forgeTutorial  = false;
    t.gachaTutorial  = false;
    t.stage0MoveSeen = false;
    // Dismiss any hint elements that may still be in the DOM
    ['stage0-move','tower-intro','tower-buffhint','tower-death','forge-intro','gacha-intro','gacha-equip'].forEach(id => dismissHint(id));
    setNavDot('relics', false);
    checkGachaDot();
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    const st = WG.State.get();
    if (!st.tutorial) st.tutorial = {};
    if (st.tutorial.towerTutorial  === undefined) st.tutorial.towerTutorial  = false;
    if (st.tutorial.forgeTutorial  === undefined) st.tutorial.forgeTutorial  = false;
    if (st.tutorial.gachaTutorial  === undefined) st.tutorial.gachaTutorial  = false;
    if (st.tutorial.stage0MoveSeen === undefined) st.tutorial.stage0MoveSeen = false;
    ensureStyles();
  }

  window.WG.HuntTutorialExt = { init, resetAll };
})();
