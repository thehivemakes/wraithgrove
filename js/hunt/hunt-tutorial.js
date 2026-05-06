// WG.HuntTutorial — first-play inline hint system for Stage 1
// Concern A: first-time player detection (completedFirstStage flag)
// Concern B: inline floating arrow callouts (no blocking modals)
// Concern C: Stage 1 victory cinematic
// Concern D: persistent [SKIP TUTORIAL] button, top-right
// Concern E: hint queue with 800ms gap — never overlap or stack
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
      '@keyframes tut-pulse{0%,100%{transform:translateY(0);opacity:0.7;}50%{transform:translateY(-8px);opacity:1;}}',
      '@keyframes tut-cin-title{from{opacity:0;letter-spacing:4px;}to{opacity:1;letter-spacing:10px;}}',
      '@keyframes tut-cin-sub{from{opacity:0;}to{opacity:1;}}',
      '.wg-hint{position:absolute;z-index:115;pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:4px;animation:tut-fadein 220ms ease-out both;}',
      '.wg-hint .hint-body{background:rgba(8,4,2,0.90);border:1px solid #b08840;border-radius:8px;padding:5px 12px;font-size:11px;letter-spacing:1px;color:#f0d890;white-space:nowrap;box-shadow:0 2px 10px rgba(0,0,0,0.7);}',
      '.wg-hint .tut-arrow-svg{animation:tut-pulse 1.4s infinite ease-in-out;}',
      '.wg-hint.arrow-below{flex-direction:column-reverse;}',
      '.wg-victory{position:absolute;inset:0;z-index:125;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;background:rgba(0,0,0,0);transition:background 500ms;}',
      '.wg-victory.show{background:rgba(0,0,0,0.88);}',
      '.wg-victory .vc-line1{font-size:26px;color:#f0d890;opacity:0;text-align:center;text-shadow:0 0 24px rgba(240,216,144,0.5);}',
      '.wg-victory .vc-line1.show{animation:tut-cin-title 900ms ease-out both;opacity:1;}',
      '.wg-victory .vc-line2{font-size:11px;letter-spacing:6px;color:#b08840;opacity:0;margin-top:10px;text-transform:uppercase;text-align:center;}',
      '.wg-victory .vc-line2.show{animation:tut-cin-sub 700ms ease-out both;opacity:1;}',
      '.wg-skip-btn{position:absolute;pointer-events:auto;background:rgba(8,4,2,0.78);border:1px solid #5a3a18;border-radius:6px;color:#907858;font-size:9px;letter-spacing:1.5px;padding:5px 10px;cursor:pointer;text-transform:uppercase;z-index:116;top:106px;right:12px;}',
      '.wg-skip-btn:active{opacity:0.55;}',
    ].join('');
    document.head.appendChild(s);
  }

  function arrowSvg() {
    return '<svg class="tut-arrow-svg" viewBox="0 0 48 48" width="28" height="28">' +
      '<polygon points="24,4 44,28 32,28 32,44 16,44 16,28 4,28" fill="#ffd870" stroke="#604020" stroke-width="2"/>' +
      '</svg>';
  }

  // ── Hint definitions ───────────────────────────────────────────────────────
  // arrowAbove:true = arrow above text (pointing DOWN toward content below)
  // autoDismissMs:0 = no auto-dismiss (trigger-only)
  var HINTS = {
    move:       { text:'Move with joystick',       css:'left:24px;bottom:200px;',  arrowAbove:false, autoDismissMs:0     },
    autoAttack: { text:'Auto-attack hits enemies', css:'left:24px;bottom:240px;',  arrowAbove:false, autoDismissMs:8000  },
    orb:        { text:'Pick up orbs for XP',      css:'left:24px;bottom:260px;',  arrowAbove:false, autoDismissMs:9000  },
    hp:         { text:'Watch HP — top bar',       css:'left:16px;top:82px;',      arrowAbove:true,  autoDismissMs:6000  },
    skill:      { text:'Skill ready!',             css:'right:12px;top:112px;',    arrowAbove:true,  autoDismissMs:10000 },
  };

  // ── Hint rendering ─────────────────────────────────────────────────────────
  var activeHint = null; // { el, id, elapsed, autoDismissMs }
  var fired      = {};   // 'queued' | 'showing' | 'dismissed' per hint id

  // ── Hint queue (Concern E) ─────────────────────────────────────────────────
  var hintQueue = [];   // ordered list of hint ids waiting to show
  var queueGap  = 0;    // ms remaining before next queued hint can show

  // Queue a hint for display. If nothing is active the first item shows
  // at the next processQueue call (queueGap=0). Subsequent items wait 800ms
  // after the previous hint is dismissed to prevent overlap.
  function queueHint(id) {
    if (fired[id]) return; // already in flight or done
    fired[id] = 'queued';
    hintQueue.push(id);
    if (!activeHint) queueGap = 0; // nothing blocking — show immediately
  }

  function processQueue(dtMs) {
    if (!isActive || activeHint || hintQueue.length === 0) return;
    queueGap -= dtMs;
    if (queueGap > 0) return;
    var next = hintQueue.shift();
    fired[next] = 'showing';
    showHint(next);
  }

  function showHint(id) {
    if (!isActive || fired[id] === 'dismissed') return;
    var def = HINTS[id];
    if (!def) return;
    var el = document.createElement('div');
    el.className = 'wg-hint' + (def.arrowAbove ? '' : ' arrow-below');
    el.id = 'wg-hint-' + id;
    el.style.cssText = def.css;
    el.innerHTML = def.arrowAbove
      ? arrowSvg() + '<div class="hint-body">' + def.text + '</div>'
      : '<div class="hint-body">' + def.text + '</div>' + arrowSvg();
    document.getElementById('app').appendChild(el);
    fired[id] = 'showing';
    activeHint = { el: el, id: id, elapsed: 0, autoDismissMs: def.autoDismissMs };
  }

  function dismissActiveHint(id) {
    if (!activeHint) return;
    if (id !== undefined && activeHint.id !== id) return;
    var el  = activeHint.el;
    var hid = activeHint.id;
    activeHint = null;
    fired[hid] = 'dismissed';
    queueGap = 800; // 800ms gap before next queued hint shows (Concern E)
    el.style.animation = 'tut-fadeout 280ms ease-in both';
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 280);
  }

  function dismissAllHints() {
    if (activeHint) {
      var el = activeHint.el;
      activeHint = null;
      if (el.parentNode) el.parentNode.removeChild(el);
    }
    document.querySelectorAll('.wg-hint').forEach(function (n) {
      if (n.parentNode) n.parentNode.removeChild(n);
    });
  }

  // ── Skip button (Concern D) ────────────────────────────────────────────────
  var skipBtn = null;

  function removeSkipBtn() {
    if (skipBtn && skipBtn.parentNode) skipBtn.parentNode.removeChild(skipBtn);
    skipBtn = null;
  }

  function skipAll() {
    isActive   = false;
    hintQueue  = [];
    queueGap   = 0;
    WG.State.get().tutorial.completedFirstStage = true;
    WG.State.get().tutorial.stage1Seen          = true;
    dismissAllHints();
    removeSkipBtn();
    removeEventListeners();
  }

  // ── Movement + skill tracking ──────────────────────────────────────────────
  var moveAccum      = 0;
  var skillUsedOnce  = false;
  var lastSkillReady = true;

  // ── Event handles ─────────────────────────────────────────────────────────
  var _onTick = null, _onSwing = null, _onDamaged = null,
      _onOrbPickup = null, _onSkillUse = null, _onStageCleared = null,
      _onStageFailed = null;

  function removeEventListeners() {
    if (_onTick)         { WG.Engine.off('tick', _onTick); _onTick = null; }
    if (_onSwing)        { WG.Engine.off('player:swing', _onSwing); _onSwing = null; }
    if (_onDamaged)      { WG.Engine.off('player:damaged', _onDamaged); _onDamaged = null; }
    if (_onOrbPickup)    { WG.Engine.off('pickup:orb', _onOrbPickup); _onOrbPickup = null; }
    if (_onSkillUse)     { WG.Engine.off('player:skill', _onSkillUse); _onSkillUse = null; }
    if (_onStageCleared) { WG.Engine.off('hunt:stage-cleared', _onStageCleared); _onStageCleared = null; }
    if (_onStageFailed)  { WG.Engine.off('hunt:stage-failed',  _onStageFailed);  _onStageFailed  = null; }
    removeSkipBtn();
    dismissAllHints();
  }

  function wireEvents() {
    _onTick = function (e) {
      if (!isActive) return;
      var dt   = e.dt;
      var dtMs = dt * 1000;

      // Drain hint queue (Concern E) — only one hint active; 800ms gap after dismiss
      processQueue(dtMs);

      // Auto-dismiss active hint by elapsed wall time
      if (activeHint && activeHint.autoDismissMs > 0) {
        activeHint.elapsed += dtMs;
        if (activeHint.elapsed >= activeHint.autoDismissMs) dismissActiveHint();
      }

      var rt = WG.Game.getHuntRuntime && WG.Game.getHuntRuntime();
      if (!rt || !rt.player) return;
      var p = rt.player;

      // MOVE dismiss: 3s cumulative movement above threshold
      if (activeHint && activeHint.id === 'move') {
        if (Math.abs(p.vx) > 8 || Math.abs(p.vy) > 8) {
          moveAccum += dt;
          if (moveAccum >= 3) dismissActiveHint('move');
        }
      }

      // AUTO-ATTACK: queue once creatures spawn (queued — won't override MOVE)
      if (!fired.autoAttack && rt.creatures && rt.creatures.length > 0) {
        queueHint('autoAttack');
      }

      // ORB: queue once first orb appears in drops
      if (!fired.orb) {
        for (var i = 0; i < rt.drops.length; i++) {
          if (rt.drops[i].type === 'orb') { queueHint('orb'); break; }
        }
      }

      // SKILL: queue when skillReady flips false→true (after first skill use)
      if (skillUsedOnce && !fired.skill) {
        if (!lastSkillReady && p.skillReady) queueHint('skill');
        lastSkillReady = p.skillReady;
      } else if (!skillUsedOnce) {
        lastSkillReady = p.skillReady;
      }
    };

    _onSwing = function (e) {
      if (!isActive) return;
      if (e.hits > 0 && activeHint && activeHint.id === 'autoAttack') {
        dismissActiveHint('autoAttack');
      }
    };

    _onDamaged = function (e) {
      if (!isActive || fired.hp) return;
      var rt = WG.Game.getHuntRuntime && WG.Game.getHuntRuntime();
      if (!rt || !rt.player) return;
      if (e.hp <= rt.player.maxHp * 0.7) queueHint('hp');
    };

    _onOrbPickup = function () {
      if (!isActive) return;
      if (activeHint && activeHint.id === 'orb') {
        dismissActiveHint('orb');
      } else if (fired.orb === 'queued') {
        // Orb picked up before its hint showed — drop from queue silently
        var idx = hintQueue.indexOf('orb');
        if (idx >= 0) hintQueue.splice(idx, 1);
        fired.orb = 'dismissed';
      }
    };

    _onSkillUse = function () {
      if (!isActive) return;
      skillUsedOnce  = true;
      lastSkillReady = false;
      if (activeHint && activeHint.id === 'skill') dismissActiveHint('skill');
    };

    _onStageCleared = function (e) {
      if (!isActive || e.stageId !== 1) return;
      showVictoryCinematic();
    };

    // Clean up on death without setting completedFirstStage — player can retry
    _onStageFailed = function (e) {
      if (!isActive || e.stageId !== 1) return;
      isActive = false;
      removeEventListeners();
    };

    WG.Engine.on('tick', _onTick);
    WG.Engine.on('player:swing', _onSwing);
    WG.Engine.on('player:damaged', _onDamaged);
    WG.Engine.on('pickup:orb', _onOrbPickup);
    WG.Engine.on('player:skill', _onSkillUse);
    WG.Engine.on('hunt:stage-cleared', _onStageCleared);
    WG.Engine.on('hunt:stage-failed',  _onStageFailed);
  }

  // ── Victory cinematic (Concern C) ─────────────────────────────────────────
  function showVictoryCinematic() {
    // Clear hints + skip button before cinematic
    dismissAllHints();
    removeSkipBtn();

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
    // W-Stage-Zero-Tutorial: suppress Stage 1 hints until Stage 0 is cleared
    if (tut.stage0Cleared === false) return;
    if (tut.completedFirstStage || tut.stage1Seen) return;

    isActive       = true;
    fired          = {};
    hintQueue      = [];
    queueGap       = 0;
    activeHint     = null;
    moveAccum      = 0;
    skillUsedOnce  = false;
    lastSkillReady = true;

    // Skip button: top-right, below the skill button (~56px tall at top:44px)
    skipBtn = document.createElement('button');
    skipBtn.className = 'wg-skip-btn';
    skipBtn.textContent = 'SKIP TUTORIAL';
    skipBtn.addEventListener('click', skipAll);
    document.getElementById('app').appendChild(skipBtn);

    wireEvents();
    queueHint('move'); // first hint; processQueue fires it on first tick
  }

  window.WG.HuntTutorial = { init: init, maybeStart: maybeStart };
})();
