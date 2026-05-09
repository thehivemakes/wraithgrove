# QA Harness — WG.QA

Scripted smoke-test suite for pre-TestFlight verification. Exercises all 5 tabs, Hunt, Tower, IAP confirmation, energy gating, settings persistence, achievement tracking, save lifecycle, and mobile-specific signals (touch input, haptics, orientation, safe-area, back navigation) — without human interaction.

---

## How to activate

**In-game (5-tap easter egg):**
Tap the top-strip area (currency/icon bar at the top of the game) 5 times within 2 seconds. A QA panel appears over the game.

**From DevTools console:**
```js
WG.QA.runAll()        // runs all 8 scenarios, logs results
WG.QA.run('tab_smoke') // runs a single scenario by name
WG.QA.showPanel()     // manually open the panel
```

The harness is loaded from `js/qa/qa-harness.js` via a static `<script>` tag in `index.html` (outside the `MODULES[]` production loader). It polls via `requestAnimationFrame` until all required WG modules are ready, then installs.

---

## Scenarios

| Name | What it tests |
|------|--------------|
| `tab_smoke` | Switches to all 5 tabs (Hunt / Forge / Ascend / Relics / Duel), verifies each panel has `.active` class and nav tab highlights, checks zero `console.error` calls during switches |
| `hunt_stage_1` | Starts Stage 1 (Hunt mode), verifies runtime shape (stage.id=1, player placed, combo tracker, critRate property), emits `enemy:killed` events, verifies `first_blood` achievement progress increments |
| `tower_run` | Starts Tower Gauntlet, verifies runtime has mode=tower at floor 1, forces 3 floor-clears by manipulating `floorElapsed`, verifies buff card picker renders after each clear, forces player death, verifies death screen appears, clicks End Run, verifies run summary appears |
| `iap_stub` | Calls `WG.IAP.purchase('gems_5')`, verifies compliance modal renders, verifies cancel returns `ok:false` with `reason:'user_cancelled'`, verifies confirm flows through dev stub and grants gems |
| `energy_gate` | Drains energy to 0 via `spendEnergy`, calls `startHunt`, verifies `EnergyModal` opens and hunt runtime is NOT created |
| `settings_persist` | Sets master audio volume to 0.42 via `WG.Audio.setBus`, verifies in-memory value, verifies `wg_settings_v1` in localStorage persists the value, re-parses from localStorage to confirm round-trip |
| `achievements_progress` | Emits `enemy:killed` event, verifies `first_blood.progress` increments in `WG.State.get().achievements` |
| `save_export` | Calls `WG.Cache.save()`, verifies `wg_save_v2` key exists in localStorage, parses and checks shape (version, currencies, player, huntProgress, energy), calls `WG.Cache.load()`, verifies state remains valid |
| `touch_input` | Dispatches synthetic `PointerEvent` pointerdown + pointermove to the canvas in the left-half joystick zone; verifies `WG.Input.poll()` returns magnitude > 0 and a non-zero direction vector; dispatches pointerup and verifies magnitude resets to 0 |
| `haptics_stub` | Installs a temporary `WG.Haptics` stub mirroring the Capacitor Haptics plugin API; calls `impact('medium')`, `impact('heavy')`, `vibrate(50)`; verifies stub records all 3 calls with no console errors; restores original (undefined in browser); verifies the `if (WG.Haptics)` guard pattern used in hunt-render.js is safe when plugin is absent |
| `orientation_change` | Dispatches `window` `resize` and `orientationchange` events; verifies `WG.Display.width/height` remain > 0 and canvas pixel buffer stays valid; verifies no console errors during either event |
| `safe_area_insets` | Injects a `<style>` rule setting `#top-strip { padding-top: 44px !important }` (simulating iPhone X notch safe-area-inset-top=44px); verifies top-strip exists, has positive height, and stays within `#stage` bounds; removes injected style after test |
| `back_button_navigation` | Opens the compliance modal, dispatches `new CustomEvent('ionBackButton')` on document (the event Capacitor's native bridge fires), verifies no console errors and game remains responsive; dismisses modal via cancel button and verifies it closes cleanly |

---

## Mobile-specific notes

### Browser preview vs. native device

All 5 mobile scenarios are designed to run in a **browser without a Capacitor plugin** installed. This makes them safe for the standard dev preview at `http://localhost:3996/` and for TestFlight smoke testing before the native shell is wired.

Behaviour differences by environment:

| Scenario | Browser | Native (Capacitor) |
|----------|---------|-------------------|
| `touch_input` | Synthetic PointerEvents dispatched to canvas; `WG.Input.poll()` reflects them | Real finger touch; same poll path |
| `haptics_stub` | Test installs a JS stub; no vibration | `WG.Haptics` set to real Capacitor Haptics plugin in index.html Capacitor block |
| `orientation_change` | `resize` listener re-reads `#stage` clientWidth/Height | Same listener; device rotation triggers real layout change |
| `safe_area_insets` | CSS `padding-top:44px` injected via `<style>` test element | Real `env(safe-area-inset-top)` from WKWebView viewport-fit=cover |
| `back_button_navigation` | `ionBackButton` fires as a no-op; game stays responsive | Native bridge fires the event; a real handler should close modals / exit stages |

### Extending `back_button_navigation` for native

When a back-button handler is wired in the game (e.g., via `App.addListener('backButton', ...)`), extend the scenario to assert the modal is gone _before_ manually clicking cancel:

```js
// After dispatching ionBackButton, await wait(200) for handler to fire:
a.ok(!document.getElementById('wg-cp-cancel'), 'modal closed by back-button handler');
```

### CSS env() safe-area simulation

`env(safe-area-inset-top)` cannot be set from JavaScript. The `safe_area_insets` scenario uses a `<style>` injection as a browser-compatible proxy. If the layout ever uses `env(safe-area-inset-top)` directly in production CSS (via `padding-top: env(safe-area-inset-top, 0)`), update the scenario to patch a CSS custom property instead:

```css
:root { --wg-safe-top: 44px; }
#top-strip { padding-top: var(--wg-safe-top, 0); }
```

---

## Return shape

Each `run()` call resolves to:
```js
{
  scenario:   'tab_smoke',    // string name
  passed:     ['msg', ...],   // assertion labels that passed
  failed:     ['msg', ...],   // assertion labels that failed
  log:        ['line', ...],  // timestamped log for display
  durationMs: 480,            // wall time
}
```

`runAll()` resolves to an array of these objects, one per scenario.

**PASS** = `failed.length === 0`. Any uncaught exception inside a scenario is caught and appended to `failed`.

---

## Idempotency

Each scenario snapshots the portions of `WG.State` it touches (currencies, energy, IAP ownedSKUs, achievements, towerProgress) before running and restores them after. Running the same scenario twice in a row should produce the same result.

Minor side effects that are intentional and not restored:
- `save_export` writes to `localStorage['wg_save_v2']` — this is the normal save file and is correct.
- `settings_persist` transiently changes `wg_settings_v1` but restores the original master volume at the end.

---

## Adding a new scenario

1. Write `async function run_my_scenario(a)` in `qa-harness.js`. The `a` object provides:
   - `a.ok(condition, 'label')` — pass/fail assertion
   - `a.domExists('#element-id', 'label')` — DOM presence check
   - `a.domAbsent('#element-id', 'label')` — DOM absence check
2. Add the name string to the `SCENARIOS` array at the top.
3. Add a `my_scenario: run_my_scenario` entry to the `RUNNERS` map.
4. Add a row to the table in this doc.

**Rules for new scenarios:**
- Must be idempotent: snapshot → test → restore
- Must not modify game code: only call public APIs on `WG.*` namespaces and observe results
- Must clean up DOM overlays on success and failure
- Must capture and assert on `console.error` if the scenario exercises code paths that should not error

---

## Headless / Puppeteer use

`WG.QA.runAll()` returns a `Promise<Array>` and logs all results to the console. A Puppeteer harness can:
1. Load the game page, wait for `WG.QA` to be defined
2. Call `await page.evaluate(() => WG.QA.runAll())`
3. Inspect the returned array for `failed.length > 0`

No additional browser UI interaction is needed.
