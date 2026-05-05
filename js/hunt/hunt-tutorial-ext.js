// WG.HuntTutorialExt — tutorial coverage for Tower, Forge, and Gacha first experiences
// Concern A: first Tower run — 3-step inline hint sequence (intro, buff-pick, death)
// Concern B: first Forge visit + first craft completion
// Concern C: first Gacha/summon eligibility + post-pull equip prompt
// Concern D: × close on every hint; flags resettable via resetAll() + Settings button
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
      '@keyframes tut-pulse{0%,100%{transform:translateY(0);opacity:.7}50%{transform:translateY(-8px);opacity:1}}',
    ].join('');
    const s = document.createElement('style');
    s.id = 'wg-tut-ext-styles';
    s.textContent = keyframes + [
      '.wg-ext-hint{position:fixed;pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:4px;animation:tut-fadein 220ms ease-out both;}',
      '.wg-ext-hint.arrow-below{flex-direction:column-reverse;}',
      '.wg-ext-hint .ext-body{position:relative;background:rgba(8,4,2,.92);border:1px solid #b08840;border-radius:8px;padding:6px 22px 6px 13px;font-size:11px;letter-spacing:.8px;color:#f0d890;white-space:pre-line;line-height:1.5;box-shadow:0 2px 10px rgba(0,0,0,.7);}',
      '.wg-ext-hint .ext-close{position:absolute;top:0;right:4px;background:none;border:none;color:#a08060;font-size:15px;line-height:1.3;cursor:pointer;pointer-events:auto;padding:1px 2px;}',
      '.wg-ext-hint .ext-close:active{color:#f0d890;}',
      '.wg-ext-arrow{animation:tut-pulse 1.4s infinite ease-in-out;}',
      '.wg-ext-toast{position:fixed;left:50%;transform:translateX(-50%);background:rgba(8,4,2,.92);border:1px solid #b08840;border-radius:8px;padding:7px 16px;font-size:11px;letter-spacing:.8px;color:#f0d890;text-align:center;white-space:pre-line;line-height:1.5;box-shadow:0 2px 10px rgba(0,0,0,.7);animation:tut-fadein 220ms ease-out both;}',
      '.wg-ext-dot{position:absolute;top:2px;right:2px;width:8px;height:8px;border-radius:50%;background:#e04040;pointer-events:none;animation:tut-fadein 400ms ease-out both;}',
    ].join('');
    document.head.appendChild(s);
  }

  function arrowSvg() {
    return '<svg class="wg-ext-arrow" viewBox="0 0 48 48" width="26" height="26">' +
      '<polygon points="24,4 44,28 32,28 32,44 16,44 16,28 4,28" fill="#ffd870" stroke="#604020" stroke-width="2"/>' +
      '</svg>';
  }

  // ── Hint factory ──────────────────────────────────────────────────────────
  // cssStr    : position style for the fixed-position wrapper (e.g. 'top:148px;left:50%;...')
  // arrowAbove: true → arrow above text (hint sits below target, arrow points up at target)
  //             false → arrow-below (hint sits above target, arrow tip points down-ish)
  // autoDismissMs: 0 = manual dismiss only
  // onClose   : called when × is tapped (or hint removed for any reason)
  function showHint(id, text, cssStr, arrowAbove, autoDismissMs, onClose) {
    if (document.getElementById('wg-ext-hint-' + id)) return;

    const wrap = document.createElement('div');
    wrap.id = 'wg-ext-hint-' + id;
    wrap.className = 'wg-ext-hint' + (arrowAbove ? '' : ' arrow-below');
    wrap.style.cssText = cssStr;

    const body = document.createElement('div');
    body.className = 'ext-body';
    body.textContent = text;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'ext-close';
    closeBtn.setAttribute('aria-label', 'Dismiss hint');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => dismissHint(id, onClose));
    body.appendChild(closeBtn);

    if (arrowAbove) {
      const arrowWrap = document.createElement('span');
      arrowWrap.innerHTML = arrowSvg();
      wrap.appendChild(arrowWrap.firstChild);
      wrap.appendChild(body);
    } else {
      wrap.appendChild(body);
      const arrowWrap = document.createElement('span');
      arrowWrap.innerHTML = arrowSvg();
      wrap.appendChild(arrowWrap.firstChild);
    }

    document.body.appendChild(wrap);

    if (autoDismissMs > 0) {
      setTimeout(() => dismissHint(id), autoDismissMs);
    }
  }

  function dismissHint(id, onClose) {
    const el = document.getElementById('wg-ext-hint-' + id);
    if (!el) { if (onClose) onClose(); return; }
    el.style.animation = 'tut-fadeout 280ms ease-in both';
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 280);
    if (onClose) onClose();
  }

  function showToast(text, topPx, durationMs) {
    const el = document.createElement('div');
    el.className = 'wg-ext-toast';
    el.style.top = (topPx || 140) + 'px';
    el.style.zIndex = '220';
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity 400ms';
      el.style.opacity = '0';
      setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 420);
    }, durationMs || 3500);
  }

  // ── Nav badge dot ─────────────────────────────────────────────────────────
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

  // ── Concern A: Tower tutorial ─────────────────────────────────────────────
  let _towerSessionActive = false;

  function onTowerRunStart() {
    if (isDone('towerTutorial')) return;
    _towerSessionActive = true;
    // Hint appears over the combat arena; arrow-below points toward the action below.
    showHint(
      'tower-intro',
      'Climb floors.\nPick a buff each floor.\nRun ends when you die.',
      'top:148px;left:50%;transform:translateX(-50%);z-index:220;',
      false,  // arrow-below: arrow under text, tip pointing toward arena
      7000,
      () => { markDone('towerTutorial'); _towerSessionActive = false; }
    );
  }

  // MutationObserver watches for buff picker overlay (#wg-buff-picker) appearing.
  // This fires when floor 1 clears and the 3-card overlay renders.
  let _buffObs = null;
  function startBuffPickerWatch() {
    if (_buffObs) return;
    _buffObs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1) continue;
          if (n.id !== 'wg-buff-picker') continue;
          if (!_towerSessionActive || isDone('towerTutorial')) continue;
          dismissHint('tower-intro');
          // Wait for buff picker cards to render before showing hint above them.
          setTimeout(() => {
            if (!document.getElementById('wg-buff-picker')) return;
            showHint(
              'tower-buffhint',
              'Pick wisely —\nbuffs reset every run.',
              'top:72px;left:50%;transform:translateX(-50%);z-index:2210;',
              false,
              7000,
              () => { markDone('towerTutorial'); _towerSessionActive = false; }
            );
          }, 300);
        }
      }
    });
    _buffObs.observe(document.body, { childList: true });
  }

  function onTowerRunEnd(e) {
    if (!_towerSessionActive) return;
    _towerSessionActive = false;
    dismissHint('tower-intro');
    dismissHint('tower-buffhint');
    markDone('towerTutorial');
    if (e.reason !== 'death') return;
    // Run summary (#wg-run-summary) renders ~200ms after tower:run-end.
    // Hint must sit above the summary overlay (z-index:2400).
    setTimeout(() => {
      showHint(
        'tower-death',
        'You earned everything from your run.\nTry again.',
        'top:56%;left:50%;transform:translate(-50%,-50%);z-index:2410;',
        false,
        7000,
        null
      );
    }, 450);
  }

  // ── Concern B: Forge tutorial ─────────────────────────────────────────────
  function onForgeTabVisit() {
    if (isDone('forgeTutorial')) return;
    // Wait one frame for ForgeRender to refresh the tab content.
    setTimeout(() => {
      if (isDone('forgeTutorial')) return;
      // Position hint above the first building tile in the 4×2 grid.
      let css = 'top:210px;left:50%;transform:translateX(-50%);z-index:220;';
      const tile = document.querySelector('#tab-forge .card-tile');
      if (tile) {
        const r = tile.getBoundingClientRect();
        const tipX = Math.max(70, Math.min(window.innerWidth - 70, r.left + r.width * 0.5));
        css = 'top:' + Math.max(72, r.top - 92) + 'px;left:' + tipX + 'px;transform:translateX(-50%);z-index:220;';
      }
      showHint(
        'forge-intro',
        'Craft buildings to boost your Power',
        css,
        false,
        0,
        () => markDone('forgeTutorial')
      );
    }, 100);
  }

  function onForgeCraft() {
    if (isDone('forgeTutorial')) return;
    markDone('forgeTutorial');
    dismissHint('forge-intro');
    showToast(
      'Your Power just rose.\nStronger characters survive longer in Hunt.',
      140,
      4000
    );
  }

  // ── Concern C: Gacha / Relics tutorial ───────────────────────────────────
  function gachaEligible() {
    const s = WG.State.get();
    const gems     = (s.currencies && s.currencies.gems) || 0;
    const unlocked = (s.huntProgress && s.huntProgress.highestUnlocked) || 1;
    const freePull = WG.RelicsCollection && WG.RelicsCollection.freeSummonAvailable && WG.RelicsCollection.freeSummonAvailable();
    return !!(freePull || gems >= 30 || unlocked >= 3);
  }

  function onRelicsTabVisit() {
    if (isDone('gachaTutorial')) return;
    setNavDot('relics', false); // we're on the tab now; remove dot
    if (!gachaEligible()) return;
    setTimeout(() => {
      if (isDone('gachaTutorial')) return;
      showHint(
        'gacha-intro',
        'Free pull available!\nTry summoning a relic.',
        'top:56%;left:50%;transform:translate(-50%,-50%);z-index:220;',
        false,
        0,
        () => { markDone('gachaTutorial'); setNavDot('relics', false); }
      );
    }, 100);
  }

  function onFirstPull() {
    if (isDone('gachaTutorial')) return;
    markDone('gachaTutorial');
    dismissHint('gacha-intro');
    setNavDot('relics', false);
    // Arrow pointing at the equipped-relics row near the top of the Relics tab.
    setTimeout(() => {
      showHint(
        'gacha-equip',
        'Equip relics in your loadout\nfor permanent stat boosts.',
        'top:148px;left:50%;transform:translateX(-50%);z-index:220;',
        false,
        7000,
        null
      );
    }, 300);
  }

  function checkGachaDot() {
    if (!isDone('gachaTutorial') && gachaEligible()) setNavDot('relics', true);
  }

  // ── Concern D: Reset all tutorial flags ───────────────────────────────────
  function resetAll() {
    const t = tut();
    // Re-arm Stage 1 flags (owned by hunt-tutorial.js but resettable here too)
    t.stage1Seen          = false;
    t.completedFirstStage = false;
    // Re-arm extension flags
    t.towerTutorial = false;
    t.forgeTutorial = false;
    t.gachaTutorial = false;
    _towerSessionActive = false;
    // Dismiss any currently-showing extension hints
    ['tower-intro','tower-buffhint','tower-death','forge-intro','gacha-intro','gacha-equip'].forEach(id => dismissHint(id));
    setNavDot('relics', false);
    checkGachaDot();
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    const st = WG.State.get();
    if (!st.tutorial) st.tutorial = {};
    if (st.tutorial.towerTutorial === undefined) st.tutorial.towerTutorial = false;
    if (st.tutorial.forgeTutorial === undefined) st.tutorial.forgeTutorial = false;
    if (st.tutorial.gachaTutorial === undefined) st.tutorial.gachaTutorial = false;

    ensureStyles();
    startBuffPickerWatch();

    WG.Engine.on('tower:run-start',    ()  => onTowerRunStart());
    WG.Engine.on('tower:run-end',      (e) => onTowerRunEnd(e));
    WG.Engine.on('tab:change',         (e) => {
      if (e.tab === 'forge')  onForgeTabVisit();
      if (e.tab === 'relics') onRelicsTabVisit();
    });
    WG.Engine.on('forge:craft-batch',  ()  => onForgeCraft());
    WG.Engine.on('gacha:pull',         ()  => onFirstPull());
    WG.Engine.on('relics:free-summon', ()  => onFirstPull());

    checkGachaDot();
  }

  window.WG.HuntTutorialExt = { init, resetAll };
})();
