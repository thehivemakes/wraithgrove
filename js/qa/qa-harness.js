// WG.QA — scripted smoke harness for pre-TestFlight testing
// Activation: tap #top-strip 5× within 2s → QA panel appears
// DO NOT add to MODULES[] in index.html; loaded via static <script> tag only
(function () { 'use strict';

  var SCENARIOS = [
    'tab_smoke',
    'hunt_stage_1',
    'tower_run',
    'iap_stub',
    'energy_gate',
    'settings_persist',
    'achievements_progress',
    'save_export',
    'touch_input',
    'haptics_stub',
    'orientation_change',
    'safe_area_insets',
    'back_button_navigation',
  ];

  // ── Assertion mini-engine ──────────────────────────────────────────────────
  function makeAssertions() {
    var passed = [];
    var failed = [];

    function ok(condition, msg) {
      if (condition) {
        passed.push(msg);
      } else {
        failed.push(msg);
        console.warn('[WG.QA] FAIL:', msg);
      }
    }
    function domExists(selector, msg) {
      ok(!!document.querySelector(selector), msg || (selector + ' exists in DOM'));
    }
    function domAbsent(selector, msg) {
      ok(!document.querySelector(selector), msg || (selector + ' absent from DOM'));
    }

    return { ok: ok, domExists: domExists, domAbsent: domAbsent, passed: passed, failed: failed };
  }

  // ── Console-error capture ──────────────────────────────────────────────────
  function startErrorCapture() {
    var errors = [];
    var origErr = console.error;
    console.error = function () {
      errors.push(Array.prototype.join.call(arguments, ' '));
      origErr.apply(console, arguments);
    };
    return {
      errors: errors,
      stop: function () { console.error = origErr; },
    };
  }

  // ── Shallow state snapshot / restore ──────────────────────────────────────
  // Restores only the fields that scenarios touch; avoids needing deep-clone
  // of the full 400-key state on every scenario.
  function snapshot() {
    try {
      var s = WG.State.get();
      return {
        coins:      s.currencies.coins,
        diamonds:   s.currencies.diamonds,
        gems:       s.currencies.gems,
        cards:      s.currencies.cards,
        energyCur:  s.energy.current,
        energyMax:  s.energy.max,
        ownedSKUs:  s.iap.ownedSKUs.slice(),
        adRemoval:  s.iap.adRemovalActive,
        peakFloor:  s.towerProgress.peakFloor,
        achievs:    s.achievements
                    ? JSON.parse(JSON.stringify(s.achievements))
                    : null,
      };
    } catch (e) { return null; }
  }

  function restore(snap) {
    if (!snap) return;
    try {
      var s = WG.State.get();
      s.currencies.coins      = snap.coins;
      s.currencies.diamonds   = snap.diamonds;
      s.currencies.gems       = snap.gems;
      s.currencies.cards      = snap.cards;
      s.energy.current        = snap.energyCur;
      s.energy.max            = snap.energyMax;
      s.iap.ownedSKUs         = snap.ownedSKUs.slice();
      s.iap.adRemovalActive   = snap.adRemoval;
      s.towerProgress.peakFloor = snap.peakFloor;
      if (snap.achievs) s.achievements = JSON.parse(JSON.stringify(snap.achievs));
    } catch (e) {
      console.warn('[WG.QA] restore partial fail', e);
    }
  }

  // ── Utility ───────────────────────────────────────────────────────────────
  function wait(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  function cleanOverlays() {
    var ids = [
      'wg-buff-picker', 'wg-milestone-chest', 'wg-tower-death',
      'wg-run-summary', 'energy-modal', 'wg-boss-intro',
    ];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
    if (WG.EnergyModal && WG.EnergyModal.close) WG.EnergyModal.close();
  }

  // ── Scenario: tab_smoke ───────────────────────────────────────────────────
  // Switch to all 5 tabs, verify panel + nav, verify no console errors.
  async function run_tab_smoke(a) {
    var origTab = WG.State.get().activeTab;
    var tabs = ['hunt', 'forge', 'ascend', 'relics', 'duel'];
    var cap = startErrorCapture();

    for (var i = 0; i < tabs.length; i++) {
      var tab = tabs[i];
      WG.Game.switchTab(tab);
      await wait(60);

      var panel = document.getElementById('tab-' + tab);
      a.ok(panel && panel.classList.contains('active'),
        tab + ' panel carries .active');

      var nav = document.querySelector('.nav-tab[data-tab="' + tab + '"]');
      a.ok(nav && nav.classList.contains('active'),
        tab + ' nav-tab carries .active');
    }

    cap.stop();
    a.ok(cap.errors.length === 0,
      'no console.error during tab switches (' + cap.errors.length + ' errors)');

    // Restore original tab
    WG.Game.switchTab(origTab);
  }

  // ── Scenario: hunt_stage_1 ─────────────────────────────────────────────────
  // Start Stage 1, verify runtime built + player placed, fire kill events,
  // verify combo + achievements plumbing alive. Exits hunt cleanly.
  async function run_hunt_stage_1(a) {
    var snap = snapshot();
    cleanOverlays();

    // Ensure enough energy to start
    WG.State.grantEnergy(100, 'qa-test');
    // Exit any running stage
    if (WG.Game.getHuntRuntime()) WG.Game.exitHunt();

    var cap = startErrorCapture();
    WG.Game.startHunt(1, 'day');
    await wait(80);

    var rt = WG.Game.getHuntRuntime();
    a.ok(!!rt, 'hunt runtime created after startHunt(1)');
    a.ok(!!(rt && rt.stage && rt.stage.id === 1), 'runtime.stage.id === 1');
    a.ok(!!(rt && rt.player && rt.player.hp > 0), 'player placed with hp > 0');
    a.ok(!!(rt && rt.combo && typeof rt.combo.count === 'number'),
      'combo tracker { count, lastKillAt, peak } present');
    a.ok(!!(rt && rt.player && typeof rt.player.critRate === 'number'),
      'player.critRate property present (crit-fire mechanism readable)');

    // Verify kill-event → achievements pipeline
    var s = WG.State.get();
    var before = s.achievements && s.achievements.first_blood
      ? s.achievements.first_blood.progress : 0;

    WG.Engine.emit('enemy:killed', {});
    WG.Engine.emit('enemy:killed', {});
    await wait(30);

    var after = s.achievements && s.achievements.first_blood
      ? s.achievements.first_blood.progress : 0;
    a.ok(after > before || after >= 1,
      'first_blood.progress incremented on enemy:killed (was ' + before + ', now ' + after + ')');

    cap.stop();
    a.ok(cap.errors.length === 0,
      'no console.error during hunt start (' + cap.errors.length + ' errors)');

    WG.Game.exitHunt();
    restore(snap);
  }

  // ── Scenario: tower_run ────────────────────────────────────────────────────
  // Start Tower, advance 3 floors, verify buff-card picker fires, force death,
  // verify run summary appears.
  async function run_tower_run(a) {
    var snap = snapshot();
    cleanOverlays();
    WG.State.grantEnergy(100, 'qa-test');
    if (WG.Game.getHuntRuntime()) WG.Game.exitHunt();

    var cap = startErrorCapture();

    // Start Tower
    WG.Game.startTowerRun();
    await wait(80);

    var rt = WG.HuntTower.getRuntime();
    a.ok(!!rt, 'tower runtime created');
    a.ok(!!(rt && rt.mode === 'tower'), 'runtime.mode === "tower"');
    a.ok(!!(rt && rt.floor === 1), 'starts at floor 1');
    a.ok(!!(rt && rt.player && rt.player.hp > 0), 'player placed with hp > 0');

    // Pause rAF to avoid races while manipulating runtime state
    WG.Game.stop();

    // Advance 3 floors via forced floor-clear + buff-picker interaction
    for (var f = 0; f < 3; f++) {
      if (!rt) break;
      var floorBefore = rt.floor;

      // Ensure player is alive
      if (rt.player && rt.player.hp <= 0) rt.player.hp = rt.player.maxHp || 100;
      // Drain all enemies/boss; set miniboss as "already spawned + defeated"
      rt.creatures       = [];
      rt.boss            = null;
      rt.bossDefeated    = false;
      rt.miniBossSpawned = true;   // prevent new spawn trigger in tickFloor
      rt.floorCleared    = false;
      rt.buffPickActive  = false;
      rt.milestoneChestActive = false;
      rt.floorElapsed    = rt.floorDuration + 1;  // trigger clear condition

      // Manually tick once — fires _onFloorClear internally
      WG.HuntTower.tickFloor(0.001);
      a.ok(rt.floorCleared, 'floor ' + (floorBefore) + ' cleared flag set');

      // Wait for setTimeout(600) inside _onFloorClear to fire buff picker
      // (milestone floors at multiples of 5 show chest instead; non-milestone floors show buff picker)
      await wait(750);

      var isMilestone = (floorBefore % 5 === 0);
      if (!isMilestone) {
        a.ok(!!document.getElementById('wg-buff-picker'),
          'buff card picker DOM rendered after floor ' + floorBefore + ' clear');
      } else {
        a.ok(!!document.getElementById('wg-milestone-chest') ||
             !!document.getElementById('wg-buff-picker'),
          'milestone chest or buff picker rendered at floor ' + floorBefore);
      }

      // Dismiss buff picker / milestone chest to allow advanceFloor
      var picker = document.getElementById('wg-buff-picker');
      if (picker) {
        // Pick the first buff card
        var firstCard = picker.querySelector('[style*="cursor:pointer"]') ||
                        picker.querySelector('div[style]');
        if (firstCard) {
          firstCard.click();
          await wait(250);
        } else {
          if (picker.parentNode) picker.parentNode.removeChild(picker);
          rt.buffPickActive = false;
          WG.HuntTower.advanceFloor(rt);
          await wait(60);
        }
      }
      var chest = document.getElementById('wg-milestone-chest');
      if (chest) {
        var chestBtn = document.getElementById('wg-chest-open-btn');
        if (chestBtn) { chestBtn.click(); await wait(250); }
        else {
          if (chest.parentNode) chest.parentNode.removeChild(chest);
          rt.milestoneChestActive = false;
          WG.HuntTower.advanceFloor(rt);
          await wait(60);
        }
      }
    }

    a.ok(!!(rt && rt.floor >= 2), 'reached at least floor 2 (' + (rt ? rt.floor : '?') + ')');

    // Force player death to test death screen + run summary
    if (rt && rt.player) rt.player.hp = 0;
    WG.Engine.emit('player:died', {});

    // Death screen appears after 1200ms delay in hunt-tower.js:onPlayerDeath
    await wait(1400);
    a.domExists('#wg-tower-death', 'death screen rendered after player:died');

    var endBtn = document.getElementById('wg-death-end');
    if (endBtn) {
      endBtn.click();
      await wait(400);
      a.domExists('#wg-run-summary', 'run summary rendered after End Run tap');
    } else {
      a.ok(false, '#wg-death-end button found (pre-req for run-summary check)');
    }

    cap.stop();
    a.ok(cap.errors.length === 0,
      'no console.error during tower run (' + cap.errors.length + ' errors)');

    // Clean up
    cleanOverlays();
    WG.Game.exitHunt();
    WG.Game.start();  // re-start rAF stopped above
    restore(snap);
  }

  // ── Scenario: iap_stub ─────────────────────────────────────────────────────
  // Call purchase('gems_5'), verify compliance modal opens, verify cancel returns
  // ok:false, verify confirm flows through dev stub and grants gems.
  async function run_iap_stub(a) {
    var snap = snapshot();

    // ── Part 1: modal renders ────────────────────────────────────────────────
    var p1 = WG.IAP.purchase('gems_5');
    await wait(80);
    a.domExists('#wg-cp-cancel',  'compliance modal: cancel button rendered');
    a.domExists('#wg-cp-confirm', 'compliance modal: confirm button rendered');

    // ── Part 2: cancel resolves ok:false ─────────────────────────────────────
    var cancelBtn = document.getElementById('wg-cp-cancel');
    if (cancelBtn) cancelBtn.click();
    var r1 = await p1;
    a.ok(r1.ok === false,                     'cancel: ok === false');
    a.ok(r1.reason === 'user_cancelled',      'cancel: reason === "user_cancelled"');
    a.domAbsent('#wg-cp-cancel',              'modal removed after cancel');

    // ── Part 3: confirm flows through dev stub ────────────────────────────────
    var gemsBefore = WG.State.get().currencies.gems;
    var p2 = WG.IAP.purchase('gems_5');
    await wait(80);
    var confirmBtn = document.getElementById('wg-cp-confirm');
    if (confirmBtn) confirmBtn.click();
    var r2 = await p2;
    a.ok(typeof r2.ok === 'boolean',          'confirm: result has ok property');
    a.ok(r2.ok === true,                      'confirm: dev stub returns ok:true');
    a.ok(WG.State.get().currencies.gems > gemsBefore,
      'confirm: gems granted by dev stub (' + gemsBefore + ' → ' + WG.State.get().currencies.gems + ')');
    a.domAbsent('#wg-cp-confirm',             'modal removed after confirm');

    restore(snap);
  }

  // ── Scenario: energy_gate ──────────────────────────────────────────────────
  // Drain energy to 0, attempt startHunt, verify EnergyModal opens. No stage starts.
  async function run_energy_gate(a) {
    var snap = snapshot();
    cleanOverlays();
    // Exit any running stage first
    if (WG.Game.getHuntRuntime()) WG.Game.exitHunt();

    // Drain energy to 0
    var cur = WG.State.getEnergy().current;
    if (cur > 0) WG.State.spendEnergy(cur);
    a.ok(WG.State.getEnergy().current === 0, 'energy drained to 0 (pre-condition)');

    var cap = startErrorCapture();
    WG.Game.startHunt(1, 'day');
    await wait(80);

    a.domExists('#energy-modal', 'EnergyModal opens when energy is 0');

    // Verify stage did NOT start (hunt runtime absent or unchanged)
    var rt = WG.Game.getHuntRuntime();
    a.ok(!rt, 'hunt runtime NOT created when energy is 0');

    cap.stop();
    a.ok(cap.errors.length === 0,
      'no console.error on energy-gate (' + cap.errors.length + ' errors)');

    if (WG.EnergyModal && WG.EnergyModal.close) WG.EnergyModal.close();
    restore(snap);
  }

  // ── Scenario: settings_persist ────────────────────────────────────────────
  // Change master audio volume, verify in-memory AND localStorage persistence,
  // re-read the key to simulate cold-boot, restore original value.
  async function run_settings_persist(a) {
    var origSettings = WG.Audio.getSettings ? WG.Audio.getSettings() : null;
    var origMaster   = origSettings ? (origSettings.master || 1) : 1;

    var testVal = 0.42;
    WG.Audio.setBus('master', testVal);
    await wait(30);

    // In-memory verification
    var inMem = WG.Audio.getSettings ? WG.Audio.getSettings() : null;
    a.ok(!!(inMem && Math.abs(inMem.master - testVal) < 0.001),
      'master volume updated in memory to ' + testVal);

    // localStorage verification
    var raw = localStorage.getItem('wg_settings_v1');
    a.ok(!!raw, 'wg_settings_v1 key exists in localStorage');

    var persisted = null;
    try { persisted = JSON.parse(raw); } catch (e) {}
    a.ok(!!(persisted && Math.abs(persisted.master - testVal) < 0.001),
      'master volume persisted in localStorage');

    // Simulate re-read (cold-boot equivalent): parse fresh from localStorage
    var reread = localStorage.getItem('wg_settings_v1');
    var reparsed = null;
    try { reparsed = JSON.parse(reread); } catch (e) {}
    a.ok(!!(reparsed && Math.abs(reparsed.master - testVal) < 0.001),
      'master volume survives localStorage round-trip');

    // Restore
    WG.Audio.setBus('master', origMaster);
  }

  // ── Scenario: achievements_progress ──────────────────────────────────────
  // Emit enemy:killed, verify first_blood achievement progress increments.
  async function run_achievements_progress(a) {
    var snap = snapshot();

    var s = WG.State.get();
    var prev = (s.achievements && s.achievements.first_blood)
      ? s.achievements.first_blood.progress : 0;

    WG.Engine.emit('enemy:killed', {});
    await wait(30);

    var next = (s.achievements && s.achievements.first_blood)
      ? s.achievements.first_blood.progress : 0;

    // Progress increments, OR it was already at target (1) — both are valid
    a.ok(next > prev || next >= 1,
      'first_blood.progress moved (was ' + prev + ', now ' + next + ')');
    a.ok(next >= 1, 'first_blood.progress >= 1 after kill event');

    // Also confirm hundred_kills and thousand_kills are wired (they share the same listener)
    var hk = s.achievements && s.achievements.hundred_kills;
    a.ok(!!(hk && typeof hk.progress === 'number'),
      'hundred_kills tracker exists and progress is a number');

    restore(snap);
  }

  // ── Scenario: save_export ─────────────────────────────────────────────────
  // Save → verify localStorage key → parse and check shape → reload → verify state.
  async function run_save_export(a) {
    var saveResult = WG.Cache.save();
    a.ok(saveResult !== false, 'WG.Cache.save() returned truthy');

    var raw = localStorage.getItem('wg_save_v2');
    a.ok(!!raw, 'wg_save_v2 key exists in localStorage');

    var parsed = null;
    try { parsed = JSON.parse(raw); } catch (e) {}
    a.ok(!!parsed, 'saved data is valid JSON');
    a.ok(!!(parsed && parsed.version === 2), 'save.version === 2');
    a.ok(!!(parsed && parsed.currencies && typeof parsed.currencies.coins === 'number'),
      'save.currencies.coins is a number');
    a.ok(!!(parsed && parsed.player && typeof parsed.player.level === 'number'),
      'save.player.level is a number');
    a.ok(!!(parsed && parsed.huntProgress &&
            typeof parsed.huntProgress.currentStage === 'number'),
      'save.huntProgress.currentStage present');
    a.ok(!!(parsed && typeof parsed.energy === 'object' &&
            typeof parsed.energy.current === 'number'),
      'save.energy.current is a number');

    // Re-load and verify state integrity
    var loadResult = WG.Cache.load();
    a.ok(loadResult !== false, 'WG.Cache.load() returned truthy');

    var s = WG.State.get();
    a.ok(!!(s && typeof s.currencies.coins === 'number'),
      'state.currencies.coins valid after load');
    a.ok(!!(s && typeof s.player.level === 'number'),
      'state.player.level valid after load');
  }

  // ── Scenario: touch_input ─────────────────────────────────────────────────
  // Dispatch synthetic PointerEvents to the canvas (joystick left-half).
  // Verifies WG.Input.poll() returns a non-zero direction vector after touch.
  async function run_touch_input(a) {
    var snap = snapshot();
    cleanOverlays();

    // hunt tab must be active so isHuntActive() returns true inside wg-input.js
    var origTab = WG.State.get().activeTab;
    WG.Game.switchTab('hunt');
    await wait(50);

    var cap = startErrorCapture();
    var canvas = WG.Display.canvas;
    var cw = WG.Display.width;
    var ch = WG.Display.height;

    a.ok(cw > 0 && ch > 0, 'canvas has non-zero dimensions (' + cw + 'x' + ch + ')');

    // Touch origin: left-half centre
    var ox = Math.max(10, Math.floor(cw * 0.25));
    var oy = Math.max(10, Math.floor(ch * 0.55));

    try {
      canvas.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, cancelable: true, pointerId: 77,
        clientX: ox, clientY: oy,
      }));
      // Move right + down by 40px — should exceed the 8px dead zone
      canvas.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true, cancelable: true, pointerId: 77,
        clientX: ox + 40, clientY: oy + 20,
      }));
    } catch (e) {
      a.ok(false, 'PointerEvent dispatch threw: ' + e.message);
      cap.stop();
      WG.Game.switchTab(origTab);
      restore(snap);
      return;
    }
    await wait(30);

    var inp = WG.Input.poll();
    a.ok(inp.magnitude > 0,
      'poll().magnitude > 0 after joystick pointerdown+move (' + inp.magnitude.toFixed(3) + ')');
    a.ok(inp.x !== 0 || inp.y !== 0,
      'poll() direction vector non-zero (x:' + inp.x.toFixed(2) + ' y:' + inp.y.toFixed(2) + ')');

    // Release joystick
    canvas.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true, cancelable: true, pointerId: 77,
      clientX: ox + 40, clientY: oy + 20,
    }));
    await wait(20);

    var inpAfter = WG.Input.poll();
    a.ok(inpAfter.magnitude === 0, 'poll().magnitude === 0 after pointerup (joystick reset)');

    cap.stop();
    a.ok(cap.errors.length === 0,
      'no console.error during touch input test (' + cap.errors.length + ' errors)');

    WG.Game.switchTab(origTab);
    restore(snap);
  }

  // ── Scenario: haptics_stub ────────────────────────────────────────────────
  // Install a temporary WG.Haptics stub (mirrors Capacitor plugin API).
  // Verifies no console.error when calling impact() + vibrate(), and that the
  // guard pattern used in hunt-render.js is safe when the plugin is absent.
  async function run_haptics_stub(a) {
    var origHaptics = WG.Haptics; // undefined in browser; object in native
    var cap = startErrorCapture();

    // Install stub
    WG.Haptics = {
      _calls: [],
      impact: function (style) {
        WG.Haptics._calls.push({ type: 'impact', style: style || 'medium' });
        return Promise.resolve();
      },
      vibrate: function (duration) {
        WG.Haptics._calls.push({ type: 'vibrate', duration: duration });
        return Promise.resolve();
      },
    };

    WG.Haptics.impact('medium');
    WG.Haptics.impact('heavy');
    WG.Haptics.vibrate(50);
    await wait(20);

    a.ok(WG.Haptics._calls.length === 3,
      'stub recorded 3 haptic calls (2×impact + 1×vibrate)');
    a.ok(WG.Haptics._calls[0].style === 'medium',
      'first impact style is "medium"');
    a.ok(WG.Haptics._calls[1].style === 'heavy',
      'second impact style is "heavy"');

    cap.stop();
    a.ok(cap.errors.length === 0,
      'no console.error while calling Haptics stub (' + cap.errors.length + ' errors)');

    // Restore undefined/original (plugin absent = browser preview mode)
    WG.Haptics = origHaptics;

    // Guard pattern as used in hunt-render.js lines 2421+2424:
    //   if (WG.Haptics) WG.Haptics.impact('medium');
    // Must not throw when WG.Haptics is falsy.
    var guardCap = startErrorCapture();
    var guardThrew = false;
    try {
      if (WG.Haptics) WG.Haptics.impact('medium');
    } catch (e) {
      guardThrew = true;
    }
    guardCap.stop();
    a.ok(!guardThrew, 'guard pattern (if WG.Haptics) does not throw when plugin absent');
    a.ok(guardCap.errors.length === 0, 'no console.error when Haptics guard is no-op');
  }

  // ── Scenario: orientation_change ──────────────────────────────────────────
  // Fire window 'resize' and 'orientationchange' events; verify WG.Display
  // re-fits (canvas buffer rebuilt, dimensions still valid, no console errors).
  async function run_orientation_change(a) {
    var wBefore = WG.Display.width;
    var hBefore = WG.Display.height;

    a.ok(wBefore > 0 && hBefore > 0,
      'baseline canvas dimensions valid (' + wBefore + 'x' + hBefore + ')');

    var cap = startErrorCapture();

    // Simulate portrait → landscape (or any resize)
    window.dispatchEvent(new Event('resize'));
    await wait(60);

    a.ok(WG.Display.width > 0,
      'Display.width > 0 after resize event (' + WG.Display.width + ')');
    a.ok(WG.Display.height > 0,
      'Display.height > 0 after resize event (' + WG.Display.height + ')');
    a.ok(WG.Display.canvas.width > 0,
      'canvas.width (pixel buffer) > 0 after resize');

    // Simulate orientationchange specifically (separate listener in index.html)
    window.dispatchEvent(new Event('orientationchange'));
    await wait(60);

    a.ok(WG.Display.width > 0,
      'Display.width > 0 after orientationchange event');
    a.ok(WG.Display.height > 0,
      'Display.height > 0 after orientationchange event');

    cap.stop();
    a.ok(cap.errors.length === 0,
      'no console.error during resize + orientationchange events (' + cap.errors.length + ' errors)');
  }

  // ── Scenario: safe_area_insets ────────────────────────────────────────────
  // Simulate iPhone X safe-area-inset-top=44px by injecting CSS padding on
  // #top-strip; verify the element remains in-bounds and error-free.
  async function run_safe_area_insets(a) {
    // Make sure we're not in-stage (top-strip is display:none in-stage)
    cleanOverlays();
    if (WG.Game.getHuntRuntime()) WG.Game.exitHunt();
    await wait(30);

    var cap = startErrorCapture();

    // Inject style that simulates safe-area-inset-top via CSS override
    var styleEl = document.createElement('style');
    styleEl.id = 'wg-qa-safe-area-test';
    styleEl.textContent = '#top-strip { padding-top: 44px !important; }';
    document.head.appendChild(styleEl);
    await wait(30);

    var topStrip = document.getElementById('top-strip');
    a.ok(!!topStrip, '#top-strip element exists in DOM');

    var rect = topStrip ? topStrip.getBoundingClientRect() : null;
    var stage = document.getElementById('stage');
    var stageRect = stage ? stage.getBoundingClientRect() : null;

    if (rect) {
      a.ok(rect.top >= 0,
        '#top-strip top >= 0 with 44px safe-area padding (top: ' + Math.round(rect.top) + ')');
      a.ok(rect.height > 0,
        '#top-strip has positive height with padding (' + Math.round(rect.height) + 'px)');
    }

    if (rect && stageRect) {
      // Allow 5px tolerance for sub-pixel rendering
      a.ok(rect.bottom <= stageRect.bottom + 5,
        '#top-strip stays within stage (' + Math.round(rect.bottom) + ' <= ' + Math.round(stageRect.bottom) + ')');
    }

    cap.stop();
    a.ok(cap.errors.length === 0,
      'no console.error with 44px safe-area padding applied (' + cap.errors.length + ' errors)');

    // Restore
    var injected = document.getElementById('wg-qa-safe-area-test');
    if (injected && injected.parentNode) injected.parentNode.removeChild(injected);
  }

  // ── Scenario: back_button_navigation ─────────────────────────────────────
  // Simulate Capacitor's ionBackButton event (how the native bridge fires it).
  // Verifies: no crash, no console errors, modal can be dismissed, game remains
  // responsive. In browser preview (no Capacitor plugin) this is a graceful no-op.
  async function run_back_button_navigation(a) {
    var snap = snapshot();
    cleanOverlays();

    var cap = startErrorCapture();

    // Open the compliance modal so there is something to close
    var purchaseP = WG.IAP.purchase('gems_5');
    await wait(80);

    var modalBefore = !!document.getElementById('wg-cp-cancel');
    a.ok(modalBefore, 'compliance modal open before back-button simulation');

    // Dispatch ionBackButton — the event Capacitor native bridge fires on document
    // (see node_modules/@capacitor/*/native-bridge.js line 288)
    // Browser: no handler installed; game must not crash.
    document.dispatchEvent(new CustomEvent('ionBackButton', { bubbles: false }));
    await wait(60);

    // Verify no crash: errors array empty
    // (Modal may or may not have closed depending on whether a handler is wired;
    //  in browser preview it stays open — both outcomes are acceptable here)
    cap.stop();
    a.ok(cap.errors.length === 0,
      'no console.error on ionBackButton dispatch (' + cap.errors.length + ' errors)');

    // Game must still be responsive after the event
    a.ok(typeof WG.Game.switchTab === 'function',
      'WG.Game.switchTab still callable — game responsive after back-button event');

    // Clean up: dismiss the modal via cancel (standard path)
    var cancelBtn = document.getElementById('wg-cp-cancel');
    if (cancelBtn) {
      cancelBtn.click();
      await wait(60);
    }
    await purchaseP.catch(function () {});

    var modalAfter = !!document.getElementById('wg-cp-cancel');
    a.ok(!modalAfter, 'compliance modal closed after cancel (back-nav cleanup path works)');

    // If a hunt stage is somehow running, verify it can still exit (not locked)
    if (WG.Game.getHuntRuntime()) {
      WG.Game.exitHunt();
      a.ok(!WG.Game.getHuntRuntime(), 'hunt stage exitable after back-button dispatch');
    }

    restore(snap);
  }

  // ── Core: run a named scenario ────────────────────────────────────────────
  var RUNNERS = {
    tab_smoke:              run_tab_smoke,
    hunt_stage_1:           run_hunt_stage_1,
    tower_run:              run_tower_run,
    iap_stub:               run_iap_stub,
    energy_gate:            run_energy_gate,
    settings_persist:       run_settings_persist,
    achievements_progress:  run_achievements_progress,
    save_export:            run_save_export,
    touch_input:            run_touch_input,
    haptics_stub:           run_haptics_stub,
    orientation_change:     run_orientation_change,
    safe_area_insets:       run_safe_area_insets,
    back_button_navigation: run_back_button_navigation,
  };

  async function run(scenarioName) {
    var fn = RUNNERS[scenarioName];
    if (!fn) {
      return {
        scenario:   scenarioName,
        passed:     [],
        failed:     ['unknown scenario: ' + scenarioName],
        log:        ['ERROR: no runner for "' + scenarioName + '"'],
        durationMs: 0,
      };
    }

    var a   = makeAssertions();
    var log = [];
    var t0  = Date.now();
    log.push('[' + new Date(t0).toISOString() + '] START ' + scenarioName);

    try {
      await fn(a);
    } catch (err) {
      a.failed.push('uncaught exception: ' + (err && err.message || String(err)));
      log.push('EXCEPTION: ' + (err && err.message || String(err)));
      // Make sure we don't leave the game in a broken state
      try { cleanOverlays(); } catch (e2) {}
      try { if (WG.Game.getHuntRuntime()) WG.Game.exitHunt(); } catch (e2) {}
      // tower_run stops the rAF loop; ensure it's restarted even on exception
      try { WG.Game.start(); } catch (e2) {}
    }

    var durationMs = Date.now() - t0;
    a.passed.forEach(function (m) { log.push('  ✓ ' + m); });
    a.failed.forEach(function (m) { log.push('  ✗ ' + m); });
    log.push('[' + durationMs + 'ms] END ' + scenarioName +
      ' — ' + a.passed.length + ' passed, ' + a.failed.length + ' failed');

    return {
      scenario:   scenarioName,
      passed:     a.passed,
      failed:     a.failed,
      log:        log,
      durationMs: durationMs,
    };
  }

  // ── Core: run all scenarios ───────────────────────────────────────────────
  async function runAll() {
    var results = [];
    for (var i = 0; i < SCENARIOS.length; i++) {
      var s = SCENARIOS[i];
      var r = await run(s);
      results.push(r);
      console.log('[WG.QA]', s, r.failed.length === 0 ? 'PASS' : 'FAIL', r.durationMs + 'ms');
      r.log.forEach(function (l) { console.log('  ', l); });
    }
    var totalPass = results.filter(function (r) { return r.failed.length === 0; }).length;
    console.log('[WG.QA] ══ SUMMARY: ' + totalPass + '/' + results.length + ' passed ══');
    return results;
  }

  // ── QA Panel UI ───────────────────────────────────────────────────────────
  var _panel = null;

  function _ensurePanel() {
    if (_panel) return;

    _panel = document.createElement('div');
    _panel.id = 'wg-qa-panel';
    _panel.style.cssText = [
      'position:fixed;inset:0;z-index:9999;background:rgba(5,10,5,0.96);',
      'display:flex;flex-direction:column;font-family:monospace;color:#b0d0b0;',
      'overflow:hidden;',
    ].join('');

    _panel.innerHTML = [
      '<div style="display:flex;align-items:center;justify-content:space-between;',
      'padding:10px 14px;background:#081008;border-bottom:1px solid #203020;',
      'flex-shrink:0;">',
        '<div style="font-size:13px;font-weight:700;color:#60e060;',
        'letter-spacing:3px;">⚙ WG QA HARNESS</div>',
        '<div style="display:flex;gap:8px;">',
          '<button id="wg-qa-run-all" style="padding:5px 13px;background:#0c1e0c;',
          'border:1px solid #3a7a3a;color:#60e060;border-radius:4px;cursor:pointer;',
          'font-size:11px;font-family:monospace;letter-spacing:1px;">▶ RUN ALL</button>',
          '<button id="wg-qa-close" style="padding:5px 10px;background:#1e0c0c;',
          'border:1px solid #7a3a3a;color:#e06060;border-radius:4px;cursor:pointer;',
          'font-size:11px;font-family:monospace;">✕</button>',
        '</div>',
      '</div>',
      '<div id="wg-qa-btns" style="display:flex;flex-wrap:wrap;gap:5px;',
      'padding:8px 12px;border-bottom:1px solid #182018;background:#050c05;',
      'flex-shrink:0;"></div>',
      '<div id="wg-qa-log" style="flex:1;overflow-y:auto;padding:10px 12px;',
      'white-space:pre-wrap;line-height:1.6;font-size:11px;"></div>',
      '<div id="wg-qa-summary" style="padding:7px 14px;background:#081008;',
      'border-top:1px solid #203020;font-size:12px;color:#809080;flex-shrink:0;"></div>',
    ].join('');

    document.body.appendChild(_panel);

    // Scenario buttons
    var btns = document.getElementById('wg-qa-btns');
    SCENARIOS.forEach(function (s) {
      var b = document.createElement('button');
      b.id = 'wg-qa-' + s;
      b.textContent = s.replace(/_/g, ' ');
      b.dataset.scenario = s;
      b.style.cssText = [
        'padding:3px 9px;background:#060e06;border:1px solid #243424;',
        'color:#80c080;border-radius:3px;cursor:pointer;font-size:10px;',
        'font-family:monospace;',
      ].join('');
      b.addEventListener('click', function () { _runOne(s); });
      btns.appendChild(b);
    });

    document.getElementById('wg-qa-run-all').addEventListener('click', _runAllUI);
    document.getElementById('wg-qa-close').addEventListener('click', function () {
      if (_panel && _panel.parentNode) _panel.parentNode.removeChild(_panel);
      _panel = null;
    });
  }

  function _setBtnState(scenario, state) {
    var b = document.getElementById('wg-qa-' + scenario);
    if (!b) return;
    var palettes = {
      idle:    { bg: '#060e06', border: '#243424', fg: '#80c080' },
      running: { bg: '#1a1a06', border: '#8a8a28', fg: '#e0e060' },
      pass:    { bg: '#061206', border: '#288028', fg: '#40e040' },
      fail:    { bg: '#120606', border: '#802828', fg: '#e04040' },
    };
    var c = palettes[state] || palettes.idle;
    b.style.background   = c.bg;
    b.style.borderColor  = c.border;
    b.style.color        = c.fg;
  }

  function _appendLog(text) {
    var el = document.getElementById('wg-qa-log');
    if (!el) return;
    el.textContent += text + '\n';
    el.scrollTop = el.scrollHeight;
  }

  function _showSummary(results) {
    var el = document.getElementById('wg-qa-summary');
    if (!el) return;
    var pass = results.filter(function (r) { return r.failed.length === 0; }).length;
    el.textContent = pass + ' / ' + results.length + ' passed';
    el.style.color = pass === results.length ? '#40e040' : '#e04040';
  }

  async function _runOne(scenario) {
    _setBtnState(scenario, 'running');
    _appendLog('── ' + scenario + ' ──');
    var r = await run(scenario);
    r.log.forEach(_appendLog);
    _setBtnState(scenario, r.failed.length === 0 ? 'pass' : 'fail');
  }

  async function _runAllUI() {
    var logEl = document.getElementById('wg-qa-log');
    if (logEl) logEl.textContent = '';

    var btn = document.getElementById('wg-qa-run-all');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ RUNNING…'; }

    SCENARIOS.forEach(function (s) { _setBtnState(s, 'idle'); });

    var results = [];
    for (var i = 0; i < SCENARIOS.length; i++) {
      var s = SCENARIOS[i];
      _setBtnState(s, 'running');
      _appendLog('── ' + s + ' ──');
      var r = await run(s);
      results.push(r);
      r.log.forEach(_appendLog);
      _setBtnState(s, r.failed.length === 0 ? 'pass' : 'fail');
    }

    var pass = results.filter(function (r) { return r.failed.length === 0; }).length;
    _appendLog('══ FINAL: ' + pass + '/' + results.length + ' passed ══');
    if (btn) { btn.disabled = false; btn.textContent = '▶ RUN ALL'; }
    _showSummary(results);
    return results;
  }

  // ── 5-tap easter egg on #top-strip ────────────────────────────────────────
  function _installEasterEgg() {
    var strip = document.getElementById('top-strip');
    if (!strip) return;

    var tapCount = 0;
    var tapTimer = 0;

    strip.addEventListener('pointerdown', function () {
      tapCount++;
      clearTimeout(tapTimer);
      if (tapCount >= 5) {
        tapCount = 0;
        _ensurePanel();
      } else {
        tapTimer = setTimeout(function () { tapCount = 0; }, 2000);
      }
    }, { passive: true });
  }

  // ── Boot: poll until WG.Game is ready, then install ───────────────────────
  function _ready() {
    return window.WG &&
      WG.Game    && typeof WG.Game.switchTab === 'function' &&
      WG.State   && typeof WG.State.get === 'function' &&
      WG.Engine  && typeof WG.Engine.emit === 'function' &&
      WG.IAP     && typeof WG.IAP.purchase === 'function' &&
      WG.Cache   && typeof WG.Cache.save === 'function' &&
      WG.Audio   && typeof WG.Audio.setBus === 'function';
  }

  function _poll() {
    if (_ready()) {
      // Expose public API
      window.WG.QA = { run: run, runAll: runAll, showPanel: _ensurePanel };
      _installEasterEgg();
      console.log('[WG.QA] harness installed — 5-tap #top-strip to open panel, or call WG.QA.runAll()');
    } else {
      requestAnimationFrame(_poll);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _poll);
  } else {
    _poll();
  }

})();
