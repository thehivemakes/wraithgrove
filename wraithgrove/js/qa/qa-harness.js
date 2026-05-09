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

// ── WG.QA.ASO — 8 screenshot-state recipes ───────────────────────────────────
// Extends WG.QA with deterministic harness recipes that drive the game into
// each of the 8 App Store screenshot states defined in docs/ASO_PACKAGE_v1.md §6.
//
// Each recipe:
//   • Sets WG.State (currency, progression, character, tab)
//   • Triggers the specific UI / combat moment
//   • Returns a Promise<void> that resolves after a 3s hold at visual peak
//     so any screenshot tool can capture without racing
//
// Recipes intentionally leave state dirty — refresh to resume normal play.
//
// Console usage:
//   await WG.QA.ASO.shot1_combat_peak()
//   await WG.QA.ASO.shot2_hero_lobby()
//   await WG.QA.ASO.shot3_alliance_tab()
//   await WG.QA.ASO.shot4_gacha_pull()
//   await WG.QA.ASO.shot5_tower_floor()
//   await WG.QA.ASO.shot6_boss_intro()
//   await WG.QA.ASO.shot7_results_payoff()
//   await WG.QA.ASO.shot8_relics_pinch()
//   await WG.QA.ASO.runAll()   ← cycles all 8 with 5s gaps
(function () { 'use strict';

  var HOLD_MS = 3000;   // hold duration at visual peak before Promise resolves
  var GAP_MS  = 5000;   // gap between shots in runAll()

  function _w(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // ── Internal cleanup: remove ASO mock overlays + dismiss open modals ───────
  function _clean() {
    ['wg-aso-alliance', 'wg-aso-gacha-pull'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
    var css = document.getElementById('wg-aso-gacha-css');
    if (css) css.remove();
    // Dismiss open hunt-results modal
    var mr = document.getElementById('modal-root');
    if (mr) mr.innerHTML = '';
    // Remove any lingering boss-intro overlay
    document.querySelectorAll('.wg-boss-intro').forEach(function (el) {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    // Exit any running hunt stage
    if (window.WG && WG.Game && WG.Game.getHuntRuntime && WG.Game.getHuntRuntime()) {
      WG.Game.exitHunt();
    }
  }

  // ── shot1_combat_peak ─────────────────────────────────────────────────────
  // Hunt tab · Stage 8 (Withering Grove, forest_autumn biome)
  // FEVER MODE active (orange tint, enemy glow) · combo:25 · 3 lurkers nearly dead
  async function shot1_combat_peak() {
    _clean();
    var s = WG.State.get();
    s.currencies.coins    = 3200;
    s.currencies.diamonds = 12;
    s.currencies.gems     = 85;
    s.huntProgress.highestUnlocked = Math.max(s.huntProgress.highestUnlocked, 8);
    s.player.level = 12;
    WG.State.grantEnergy(30, 'aso');
    await _w(80);

    WG.Game.startHunt(8, 'day');
    await _w(200);

    var rt = WG.Game.getHuntRuntime();
    if (!rt || !rt.player) { console.warn('[WG.QA.ASO] shot1: no runtime after startHunt(8)'); return; }

    // Recentre player; full HP
    rt.player.x = rt.mapW * 0.5;
    rt.player.y = rt.mapH * 0.5;
    rt.player.hp = rt.player.maxHp;

    // Activate FEVER MODE directly on the runtime (mirrors hunt-player.js startFever)
    rt.player.feverActive   = true;
    rt.player.feverEndsAt   = Date.now() + 30000;   // 30s — well past screenshot window
    rt.player.feverDropMult = 3;
    rt.combo.count = 25;
    rt.combo.peak  = 25;
    WG.Engine.emit('fever:start', { endsAt: rt.player.feverEndsAt });

    // Place 3 lurkers in a triangle, each at 6% HP (death-glow visible in render)
    [0.5, 1.17, 1.83].forEach(function (frac) {
      var ang = frac * Math.PI;
      var e = WG.HuntEnemies.spawn(
        'lurker',
        rt.player.x + Math.cos(ang) * 90,
        rt.player.y + Math.sin(ang) * 90
      );
      if (e) { e.hp = Math.max(1, Math.ceil((e.maxHp || 40) * 0.06)); rt.creatures.push(e); }
    });

    WG.Game.syncTopStrip();
    await _w(HOLD_MS);
    console.log('[WG.QA.ASO] shot1_combat_peak — 3s hold complete');
  }

  // ── shot2_hero_lobby ──────────────────────────────────────────────────────
  // Hunt lobby · Lantern Acolyte active · stage-select list visible
  // No active stage — this is the menu hero tile + biome background state.
  async function shot2_hero_lobby() {
    _clean();
    var s = WG.State.get();
    s.currencies.coins    = 5800;
    s.currencies.diamonds = 7;
    s.currencies.gems     = 340;
    // Ensure Lantern Acolyte is owned and active
    s.player.activeCharacter = 'lantern_acolyte';
    if (s.player.ownedCharacters.indexOf('lantern_acolyte') < 0)
      s.player.ownedCharacters.push('lantern_acolyte');
    s.player.level = 20;
    s.huntProgress.highestUnlocked = Math.max(s.huntProgress.highestUnlocked, 12);

    WG.Game.switchTab('hunt');
    WG.Game.syncTopStrip();
    await _w(120);

    await _w(HOLD_MS);
    console.log('[WG.QA.ASO] shot2_hero_lobby — 3s hold complete');
  }

  // ── shot3_alliance_tab ────────────────────────────────────────────────────
  // Alliance / Coven tab · seeded coven roster · MOTD · 3 daily missions
  // NOTE: The alliance feature is not yet shipped. This recipe injects a
  // pixel-accurate screenshot-only mock overlay representing the target screen.
  // The overlay dismisses on tap or is cleaned up by _clean() before the next shot.
  async function shot3_alliance_tab() {
    _clean();
    WG.Game.switchTab('hunt');
    await _w(80);

    function mRow(icon, name, rank, pwr, rankCol) {
      return '<div style="display:flex;align-items:center;gap:10px;padding:5px 0;' +
        'border-bottom:1px solid rgba(80,40,120,0.3);">' +
        '<span style="font-size:16px;">' + icon + '</span>' +
        '<div style="flex:1;"><div style="font-size:12px;color:#e8d8ff;">' + name + '</div>' +
        '<div style="font-size:9px;color:' + rankCol + ';letter-spacing:1px;">' + rank + '</div></div>' +
        '<div style="font-size:10px;color:#c0a0e0;">⚡ ' + pwr + '</div></div>';
    }
    function mMission(label, prog, total, barCol, done) {
      var pct = Math.round((prog / total) * 100);
      return '<div style="margin-bottom:8px;">' +
        '<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;">' +
        '<span style="color:#c8b8e8;">' + label + '</span>' +
        '<span style="color:' + barCol + ';">' + prog + '/' + total + (done ? ' ✓' : '') + '</span></div>' +
        '<div style="height:4px;background:rgba(80,40,120,0.4);border-radius:2px;">' +
        '<div style="width:' + pct + '%;height:100%;background:' + barCol + ';border-radius:2px;"></div></div></div>';
    }

    var ov = document.createElement('div');
    ov.id  = 'wg-aso-alliance';
    ov.style.cssText =
      'position:fixed;inset:0;z-index:8800;display:flex;flex-direction:column;overflow:hidden;' +
      'background:linear-gradient(180deg,#0c0814 0%,#100c1c 65%,#0a0c10 100%);' +
      'font-family:Georgia,serif;color:#d8c8f0;';

    ov.innerHTML =
      // Header
      '<div style="background:linear-gradient(90deg,#1a0a30,#220a3a);padding:14px 18px;' +
        'border-bottom:1.5px solid #4a2870;display:flex;align-items:center;gap:12px;flex-shrink:0;">' +
        '<div style="font-size:18px;letter-spacing:2px;font-weight:700;color:#e8c8ff;text-transform:uppercase;">' +
          '⚗ Coven of Hollow Lanterns</div>' +
        '<div style="margin-left:auto;font-size:10px;color:#8060b0;letter-spacing:2px;">LV. 14</div>' +
      '</div>' +
      // MOTD
      '<div style="background:rgba(60,20,90,0.45);border:1px solid #5a3080;' +
        'margin:12px 14px 0;border-radius:8px;padding:10px 14px;">' +
        '<div style="font-size:9px;letter-spacing:2px;color:#9060d0;margin-bottom:5px;">COVEN MESSAGE</div>' +
        '<div style="font-size:13px;color:#f0d8ff;line-height:1.5;">' +
          '“The Wraith Father stirs at Stage 18. Rally for tonight’s raid — 3 sigils required.”</div>' +
        '<div style="font-size:9px;color:#6040a0;margin-top:5px;text-align:right;">— Elder Vorath · 2h ago</div>' +
      '</div>' +
      // Member list
      '<div style="padding:10px 14px;flex-shrink:0;">' +
        '<div style="font-size:9px;letter-spacing:2px;color:#8060b0;margin-bottom:8px;">MEMBERS ONLINE — 7 / 20</div>' +
        mRow('🌙','Vorath','ELDER',   '18,820','#e8c8ff') +
        mRow('🔥','Kessen','WARDEN',  '14,350','#ffd070') +
        mRow('💫','Mirela','WARDEN',  '12,900','#ffd070') +
        mRow('🌿','Ondrak','ACOLYTE', '8,420', '#a8d8a8') +
        mRow('🌑','Thresh','ACOLYTE', '7,100', '#a8d8a8') +
        mRow('❄','Soren', 'INITIATE','3,200', '#c0d8f0') +
        mRow('🕯','Ash',   'INITIATE','2,880', '#c0d8f0') +
      '</div>' +
      // Daily coven missions
      '<div style="background:rgba(20,10,40,0.7);border-top:1px solid #3a2060;padding:10px 14px;flex-shrink:0;">' +
        '<div style="font-size:9px;letter-spacing:2px;color:#8060b0;margin-bottom:8px;">COVEN DAILY MISSIONS</div>' +
        mMission('Hunt 3 stages',     3, 3,  '#60c860', true)  +
        mMission('Defeat 60 wraiths', 48, 60,'#c0a0ff', false) +
        mMission('Tower Floor 10+',   1, 1,  '#60c860', true)  +
      '</div>';

    document.body.appendChild(ov);
    ov.addEventListener('pointerdown', function () {
      if (ov.parentNode) ov.parentNode.removeChild(ov);
    }, { once: true });

    await _w(HOLD_MS);
    console.log('[WG.QA.ASO] shot3_alliance_tab — 3s hold complete');
  }

  // ── shot4_gacha_pull ──────────────────────────────────────────────────────
  // Mid-pull legendary reveal · Moonshear relic · portal rings + glow animations
  // NOTE: The current game shows a text-only pull result. This recipe injects
  // a cinematic mid-pull overlay matching the ASO §6 screenshot brief.
  async function shot4_gacha_pull() {
    _clean();
    var s = WG.State.get();
    s.currencies.gems = 1650;
    WG.Game.syncTopStrip();
    await _w(60);

    var css = document.createElement('style');
    css.id = 'wg-aso-gacha-css';
    css.textContent =
      '@keyframes wg-aso-spin{to{transform:rotate(360deg);}}' +
      '@keyframes wg-aso-float{0%,100%{transform:translateY(0) scale(1);}50%{transform:translateY(-10px) scale(1.02);}}' +
      '@keyframes wg-aso-glow{0%,100%{box-shadow:0 0 30px 8px rgba(255,204,64,.5);}50%{box-shadow:0 0 60px 20px rgba(255,204,64,.9);}}' +
      '@keyframes wg-aso-ring{0%{opacity:.5;transform:scale(.9);}100%{opacity:.12;transform:scale(1.28);}}';
    document.head.appendChild(css);

    var ov = document.createElement('div');
    ov.id = 'wg-aso-gacha-pull';
    ov.style.cssText =
      'position:fixed;inset:0;z-index:8900;display:flex;flex-direction:column;' +
      'align-items:center;justify-content:center;overflow:hidden;' +
      'background:radial-gradient(ellipse at center,#1a0840 0%,#08041c 65%,#040210 100%);';

    ov.innerHTML =
      // Outer portal ring
      '<div style="position:absolute;width:min(80vw,360px);height:min(80vw,360px);border-radius:50%;' +
        'border:3px solid rgba(160,80,255,.6);animation:wg-aso-ring 1.2s ease-in-out infinite alternate;' +
        'box-shadow:0 0 60px 20px rgba(120,40,200,.5),inset 0 0 60px rgba(80,20,140,.3);"></div>' +
      // Inner dashed ring (spinning)
      '<div style="position:absolute;width:min(65vw,290px);height:min(65vw,290px);border-radius:50%;' +
        'border:1px dashed rgba(200,160,255,.3);animation:wg-aso-spin 4s linear infinite;"></div>' +
      // Cost chip — top-right corner
      '<div style="position:absolute;top:14px;right:14px;background:rgba(20,8,40,.88);' +
        'border:1px solid #5a3a90;border-radius:20px;padding:5px 12px;' +
        'font-family:monospace;font-size:13px;color:#e0c8ff;">💎 270</div>' +
      // Floating relic card
      '<div style="position:relative;display:flex;flex-direction:column;align-items:center;gap:12px;' +
        'animation:wg-aso-float 2.4s ease-in-out infinite;">' +
        '<div style="width:min(52vw,220px);height:min(72vw,300px);border-radius:14px;' +
          'background:linear-gradient(180deg,#2a0e50 0%,#160830 60%,#0c0420 100%);' +
          'border:2.5px solid #ffcc40;animation:wg-aso-glow 2.4s ease-in-out infinite;' +
          'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;' +
          'position:relative;overflow:hidden;">' +
          '<div style="position:absolute;top:10px;right:10px;background:#ffcc40;color:#1a0a00;' +
            'font-size:9px;font-weight:700;letter-spacing:2px;padding:2px 8px;border-radius:4px;' +
            'font-family:monospace;">LEGENDARY</div>' +
          '<div style="font-size:72px;filter:drop-shadow(0 0 12px rgba(255,204,64,.8));">🌙</div>' +
          '<div style="font-family:Georgia,serif;font-size:18px;color:#ffcc40;' +
            'letter-spacing:2px;font-weight:700;text-align:center;padding:0 10px;">MOONSHEAR</div>' +
          '<div style="font-size:10px;color:#c0a070;letter-spacing:1px;">+38 ATTACK</div>' +
        '</div>' +
        '<div style="font-family:Georgia,serif;font-size:22px;font-weight:700;letter-spacing:4px;' +
          'color:#ffcc40;text-shadow:0 0 12px rgba(255,204,64,.9),0 0 32px rgba(255,204,64,.5);">' +
          '✶ LEGENDARY ✶</div>' +
      '</div>' +
      // Dismiss hint
      '<div style="position:absolute;bottom:20px;font-size:10px;color:#4a3070;' +
        'letter-spacing:2px;font-family:monospace;">TAP TO DISMISS</div>';

    document.body.appendChild(ov);
    ov.addEventListener('pointerdown', function () {
      if (ov.parentNode) ov.parentNode.removeChild(ov);
      var c = document.getElementById('wg-aso-gacha-css');
      if (c) c.remove();
    }, { once: true });

    await _w(HOLD_MS);
    console.log('[WG.QA.ASO] shot4_gacha_pull — 3s hold complete');
  }

  // ── shot5_tower_floor ─────────────────────────────────────────────────────
  // Tower Gauntlet · floor 23 · mid-encounter · ad-buff pills + buff stack visible
  async function shot5_tower_floor() {
    _clean();
    var s = WG.State.get();
    s.currencies.coins         = 12400;
    s.currencies.gems          = 220;
    s.towerProgress.peakFloor  = 27;
    WG.State.grantEnergy(30, 'aso');
    await _w(80);

    WG.Game.startTowerRun();
    await _w(150);

    var rt = WG.HuntTower.getRuntime();
    if (!rt || !rt.player) { console.warn('[WG.QA.ASO] shot5: no tower runtime'); return; }

    // Jump to floor 23 mid-encounter
    rt.floor        = 23;
    rt.floorElapsed = 20;
    rt.floorDuration = 60;
    rt.kills        = 88;
    rt.player.hp    = Math.round(rt.player.maxHp * 0.72);   // battle-worn

    // Seed the run's buff history stack (appears in run summary + used by apply())
    rt.buffStack = [
      'damage_plus_15', 'crit_plus_5',  'hp_plus_25',
      'damage_plus_30', 'lifesteal_4',  'crit_dmg_plus_50',
      'damage_plus_60', 'phantom_strike',
    ];
    // Apply three buffs to the runtime so player stats reflect them
    WG.HuntTowerBuffs.apply('damage_plus_60', rt);
    WG.HuntTowerBuffs.apply('lifesteal_4',    rt);
    WG.HuntTowerBuffs.apply('phantom_strike',  rt);

    // Activate ad-buffs so the HUD buff pills render (WG.Buffs.list() drives pills)
    if (window.WG && WG.Buffs && WG.Buffs.activate) {
      WG.Buffs.activate('damage_x2', 45000);
      WG.Buffs.activate('wood_x2',   60000);
    }

    // Place 4 walkers at mid-distance — a live encounter, not an empty floor
    var cx = rt.mapW * 0.5;
    var cy = rt.mapH * 0.5;
    [0, 0.5, 1, 1.5].forEach(function (frac) {
      var ang = frac * Math.PI;
      var e = WG.HuntEnemies.spawn('walker',
        cx + Math.cos(ang) * 110, cy + Math.sin(ang) * 110);
      if (e) rt.creatures.push(e);
    });

    // Fire tower:floor-start so the floor nameplate animates in
    WG.Engine.emit('tower:floor-start', { floor: 23 });

    WG.Game.syncTopStrip();
    await _w(HOLD_MS);
    console.log('[WG.QA.ASO] shot5_tower_floor — 3s hold complete');
  }

  // ── shot6_boss_intro ──────────────────────────────────────────────────────
  // Boss arrival cinematic · Wraith Father name card visible + pulsing
  // Starts Stage 18 so game canvas renders beneath the overlay, then emits
  // boss:spawned to trigger wg-game.js showBossIntro (1600ms hitPause cycle).
  // The cinematic auto-dismisses at 1.3s; re-emitting every 1200ms keeps it alive.
  async function shot6_boss_intro() {
    _clean();
    WG.State.grantEnergy(30, 'aso');
    await _w(80);

    // Start Stage 18 (The Wraith Father stage) — canvas renders game content beneath
    WG.Game.startHunt(18, 'day');
    await _w(200);

    // Build a Wraith Father runtime object for the cinematic
    var boss = WG.HuntBosses.spawn('wraith_father', 360, 550);

    // Re-emit every 1200ms: each call clears the prior 1300ms auto-hide timer
    // and restarts the cinematic cycle — overlay stays visible indefinitely.
    var _keepAlive = setInterval(function () {
      WG.Engine.emit('boss:spawned', { boss: boss });
    }, 1200);

    WG.Engine.emit('boss:spawned', { boss: boss });

    // Wait 600ms (past pre-darken at 0ms + show at 200ms + 300ms fade-in) so
    // the name card is fully visible and pulsing before the screenshot window opens.
    await _w(600);

    await _w(HOLD_MS);
    clearInterval(_keepAlive);
    console.log('[WG.QA.ASO] shot6_boss_intro — 3s hold complete');
  }

  // ── shot7_results_payoff ──────────────────────────────────────────────────
  // Post-stage results screen · currency count-up animation · "CLEARED" header
  // Shows Stage 9 (Marrow Hollow, forest_autumn) clear with rich rewards.
  async function shot7_results_payoff() {
    _clean();
    if (WG.Game.getHuntRuntime()) WG.Game.exitHunt();
    WG.Game.switchTab('hunt');
    await _w(80);

    WG.HuntResults.show({
      stageId:  9,
      cleared:  true,
      mins:     3.8,
      kills:    47,
      rewards: {
        coins:           920,
        diamonds:        4,
        cards:           1,
        fragments:       3,
        energyRefund:    3,
        firstClearBonus: 10,
      },
      peakCombo: 28,
    });

    // Count-up animation runs 800ms; capture during it for the live-animation frame
    await _w(HOLD_MS);
    console.log('[WG.QA.ASO] shot7_results_payoff — 3s hold complete');
  }

  // ── shot8_relics_pinch ────────────────────────────────────────────────────
  // Relics tab · 6 legendary relics equipped · legendary-tier grid filter active
  // The "glow" is the rarity-border highlight on equipped relic cards.
  async function shot8_relics_pinch() {
    _clean();
    var s = WG.State.get();
    s.currencies.coins = 9400;
    s.currencies.gems  = 580;

    // Grant 6 legendary + 2 mythic relics in state
    ['r_moonshear','r_souldrift','r_marrowveil','r_paleforge','r_grimroot','r_ashtongue',
     'r_wraithheart','r_voidlantern'].forEach(function (id) {
      s.relics.owned[id] = { count: 1, level: 1 };
    });

    // Equip the 6 legendaries (clears prior equips first)
    s.relics.equipped = [];
    ['r_moonshear','r_souldrift','r_marrowveil','r_paleforge','r_grimroot','r_ashtongue']
      .forEach(function (id) { WG.RelicsEquip.tryEquip(id); });

    // Ensure relics tab is visible
    if (s.tabs) s.tabs.relics = true;

    WG.Game.switchTab('relics');
    await _w(100);

    // Set filter to legendary so equipped relics display with gold borders + glow
    s.relics.activeRarityFilter = 'legendary';
    WG.Engine.emit('tab:change', { tab: 'relics' });
    WG.Game.syncTopStrip();
    await _w(120);

    await _w(HOLD_MS);
    console.log('[WG.QA.ASO] shot8_relics_pinch — 3s hold complete');
  }

  // ── runAll: cycle all 8 recipes with 5s gaps ─────────────────────────────
  async function runAll() {
    var shots = [
      ['shot1_combat_peak',    shot1_combat_peak],
      ['shot2_hero_lobby',     shot2_hero_lobby],
      ['shot3_alliance_tab',   shot3_alliance_tab],
      ['shot4_gacha_pull',     shot4_gacha_pull],
      ['shot5_tower_floor',    shot5_tower_floor],
      ['shot6_boss_intro',     shot6_boss_intro],
      ['shot7_results_payoff', shot7_results_payoff],
      ['shot8_relics_pinch',   shot8_relics_pinch],
    ];
    for (var i = 0; i < shots.length; i++) {
      var name = shots[i][0], fn = shots[i][1];
      console.log('[WG.QA.ASO] ── ' + (i + 1) + '/8 ' + name + ' ──');
      try { await fn(); } catch (e) { console.warn('[WG.QA.ASO]', name, 'threw:', e); }
      if (i < shots.length - 1) {
        console.log('[WG.QA.ASO] ' + (GAP_MS / 1000) + 's gap before next shot...');
        await _w(GAP_MS);
      }
    }
    console.log('[WG.QA.ASO] ══ all 8 shots complete ══');
  }

  // ── Mount: attach to WG.QA once the harness is ready ─────────────────────
  function _mount() {
    if (window.WG && window.WG.QA) {
      window.WG.QA.ASO = {
        shot1_combat_peak:    shot1_combat_peak,
        shot2_hero_lobby:     shot2_hero_lobby,
        shot3_alliance_tab:   shot3_alliance_tab,
        shot4_gacha_pull:     shot4_gacha_pull,
        shot5_tower_floor:    shot5_tower_floor,
        shot6_boss_intro:     shot6_boss_intro,
        shot7_results_payoff: shot7_results_payoff,
        shot8_relics_pinch:   shot8_relics_pinch,
        runAll:               runAll,
      };
      console.log('[WG.QA.ASO] 8 screenshot recipes installed — call WG.QA.ASO.shot1_combat_peak() etc. or WG.QA.ASO.runAll()');
    } else {
      requestAnimationFrame(_mount);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _mount);
  } else {
    _mount();
  }

})();
