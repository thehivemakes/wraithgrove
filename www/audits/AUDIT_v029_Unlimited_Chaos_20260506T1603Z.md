# AUDIT — v0.29.0 Unlimited Chaos (Cumulative Ship-Gate)
**Date:** 2026-05-06T16:03Z
**Auditor:** W-Audit-v029-Final, one-shot Sonnet CLI worker
**Scope:** 7 post-0.27.0 workers: W-Enemy-Sprites, W-Wave1-God-Window, W-Special-Abilities, W-Fever-Mode, W-Stage-Zero-Tutorial, W-Progressive-Tab-Unlock, W-Rename-Unlimited-Chaos
**Type:** Read-only structural audit — ZERO code changes
**Predecessor:** AUDIT_v027_Final_20260505T2013Z (SHIP-WITH-FIXES verdict; predecessor §B blocker was 5 uncommitted workers — that blocker resolved at commit 2c91e19)

---

## §0 OVERALL VERDICT: SHIP-WITH-FIXES

Code quality is solid across all 7 workers. Syntax is clean. §E build-on guarantee holds. §G Path A discipline intact. Two categories of fixes are required before submission:

1. **§B COMMIT REQUIRED** — W-Fever-Mode, W-Stage-Zero-Tutorial, W-Progressive-Tab-Unlock delivered correct code but nothing is committed. 15 files modified + 3 done markers untracked in working tree.

2. **THE GATE (§E/§I)** — Stage 1 (Lantern Vigil) has 4/5 enemy types without sprites: `red_zombie`, `pumpkin_lantern`, `skull_swarmer`, `wraith_fast`. Only `lurker` draws sprite. DALL-E 3 briefs for all 4 types exist on disk (commit 823f720, Concern D). Running them is autonomously fixable.

3. **§I Android** — `android/app/src/main/res/values/strings.xml` customer-facing `app_name` and `title_activity_main` still read "Wraithgrove". One-line fix per field.

Item 2 is the most visible to players and App Store reviewers (Stage 0 tutorial feels polished; Stage 1 immediately reverts to geometric). Items 1 and 3 are mechanical commits, not design work.

**Required before ship (autonomously fixable):**
1. Commit 3 uncommitted workers
2. Generate 4 × 3 = 12 Stage 1 enemy sprite PNGs via DALL-E 3, add to ENEMY_SPRITES catalog
3. Fix Android strings.xml `app_name` + `title_activity_main` → "Unlimited Chaos"

**Required before ship (normal build workflow — non-blocking code gaps):**
4. Run `npx cap sync` from `build-v2/` before iOS build (regenerates `ios/App/App/public/` from `www/`)

**Architect-gated items (unchanged from 0.26.0/0.27.0):**
Legal entity name, AdMob IDs, StoreKit wiring, code signing, App Store Connect record, ATT pre-prompt, crash reporting.

---

## §A — Syntax (node --check on all modified/new .js files)

All 12 modified/new `js/` files and all 3 modified `www/js/` files checked:

| File | Status |
|------|--------|
| js/core/wg-audio.js | **PASS** |
| js/core/wg-state.js | **PASS** |
| js/hunt/hunt-enemies.js | **PASS** |
| js/hunt/hunt-fx.js | **PASS** |
| js/hunt/hunt-pickups.js | **PASS** |
| js/hunt/hunt-player.js | **PASS** |
| js/hunt/hunt-render.js | **PASS** |
| js/hunt/hunt-results.js | **PASS** |
| js/hunt/hunt-stage.js | **PASS** |
| js/hunt/hunt-tutorial-ext.js | **PASS** |
| js/hunt/hunt-tutorial.js | **PASS** |
| js/wg-game.js | **PASS** |
| www/js/core/wg-cache.js | **PASS** |
| www/js/core/wg-state.js | **PASS** |
| www/js/wg-game.js | **PASS** |

**§A cumulative: ALL PASS** — zero syntax errors across all 15 uncommitted JS files. Committed workers (W-Enemy-Sprites, W-Wave1-God-Window, W-Special-Abilities, W-Rename-Unlimited-Chaos) each reported clean syntax in their worker outputs; no regressions detected.

---

## Per-Worker §A–§I Matrix

### 1. W-Enemy-Sprites (commits: 476e09a, 82bb86e, 9bd9b13, 823f720, a02e246)

| § | Item | Verdict | Evidence |
|---|------|---------|----------|
| A | Syntax | **PASS** | hunt-render.js, hunt-enemies.js — clean at commit time; no modifications by later workers to ENEMY_SPRITES block |
| B | Marker integrity | **PASS** | Done marker committed at a02e246. All 5 concern commits present and ordered. |
| C | Tunable discipline | **N/A** | ENEMY_SPRITES is a render lookup (image paths), not mechanics tunables. No mechanics constants added. |
| D | Performance | **PASS** | `init()` preloads 15 Image objects one-shot (5 types × 3 frames). `_spriteCache` populated in init, never reallocated. `drawSpriteCreature` is a pure draw call inside existing draw loop. No new rAF or setInterval. |
| E | Build-on | **CONDITIONAL PASS** | hunt-render.js: `drawSpriteCreature` inserted at line 2041; draw-creature path modified to branch on `ENEMY_SPRITES[c.type]` — existing geometric draw is the fallback. Existing Stage 1-18 enemies without sprite entries fall through to geometric draw (no crash, no logic change). **THE GATE FAIL: Stage 1 (Lantern Vigil) enemyMix = `['lurker','red_zombie','pumpkin_lantern','skull_swarmer','wraith_fast']`. ENEMY_SPRITES catalog covers only `lurker, walker, sprite, brute_small, caller`. 4 of 5 Stage 1 enemies render geometrically. DALL-E 3 briefs for all 4 missing types exist on disk (commit 823f720).** |
| F | Failure modes | **PASS** | `if (ENEMY_SPRITES[c.type]) drawSpriteCreature(...)` — types without sprites silently fall back to geometric. Image load error: `HTMLImageElement` errors are logged; `_spriteCache[type][frame]` remains the Image object but `complete` will be false — draw call skips on `!img.complete` guard (confirmed at hunt-render.js:2060). |
| G | Path A | **N/A** | Visual only; no monetization paths. |
| H | Pivot alignment | **PASS** | PIVOT_REPORT ACTION #1: "5 enemy types × 3 frames = 15 PNGs minimum." Delivered exactly. Concern D extended to briefs for 9 remaining types — correct scope expansion. |
| I | Brand | **N/A** | No customer-facing text. |

**Worker verdict: CONDITIONAL PASS** *(THE GATE: 4/5 Stage 1 enemy types lack sprites — autonomously fixable via existing briefs)*

---

### 2. W-Wave1-God-Window (commits: 663ea62, 15b3e78, c7e589f, 3ee8cf6)

| § | Item | Verdict | Evidence |
|---|------|---------|----------|
| A | Syntax | **PASS** | hunt-enemies.js, hunt-waves.js, hunt-render.js — clean at commit time. |
| B | Marker integrity | **PASS** | Done marker committed at 3ee8cf6. 4 concern commits present. |
| C | Tunable discipline | **PASS** | `GOD_WINDOW = Object.freeze({ DURATION_SEC:60, START_MULT:0.60, END_MULT:1.00, EASE:'cubic-out' })` in hunt-enemies.js:71. Frozen. All scaling uses `_godWindowMult(runtime.elapsed)` — zero hardcoded values in spawner or render. |
| D | Performance | **PASS** | `applyGodWindowScaling` is a per-spawn bake (stats computed once at spawn; existing entities not touched). `drawGodWindowCue` is a pure draw call within existing draw loop. No new rAF, no setInterval. Amber visual cue fades to zero by t=15s, so no ongoing computation after early stage window. |
| E | Build-on | **PASS** | hunt-waves.js: single call `WG.HuntEnemies.applyGodWindowScaling(runtime, e)` inserted after existing wave+night scaling. Boss spawn (`spawnBoss()`) does not go through `_pushSpawn()` — bosses excluded. Tower mode blocked by `runtime.mode === 'tower'` guard. hunt-enemies.js, hunt-bosses.js, hunt-stage.js, hunt-player.js untouched beyond GOD_WINDOW addition. |
| F | Failure modes | **PASS** | `applyGodWindowScaling` returns immediately if `!ent || !runtime || runtime.mode === 'tower'`. Tutorial stages return early via `isTutorial` branch (added by W-Stage-Zero-Tutorial, compatible). `mult >= END_MULT` returns ent unchanged — past-window spawns are fast-path no-ops. |
| G | Path A | **N/A** | Tuning only; no monetization paths. |
| H | Pivot alignment | **PASS** | PIVOT_REPORT "Enemies at 50% HP and speed." Architect rejected flat-50% snap; mandated 60%→100% cubic-out over 60s. Decision documented in docs/DECISIONS.md (commit c7e589f). Deviation properly ratified. |
| I | Brand | **N/A** | |

**Worker verdict: PASS**

---

### 3. W-Special-Abilities (commits: a58d3e3, 3d0b917, 3a04e02, c5d27ae, 4695c9b, eb955f4)

| § | Item | Verdict | Evidence |
|---|------|---------|----------|
| A | Syntax | **PASS** | meta-special-abilities.js, hunt-player.js, hunt-render.js, meta-iap.js — clean at commit time. |
| B | Marker integrity | **PASS** | Done marker committed at eb955f4. 5 concern commits present. |
| C | Tunable discipline | **PASS** | `CATALOG = Object.freeze({...})` at meta-special-abilities.js:19. 6 abilities, all specs frozen. `DAILY_AD_CHARGE_CAP = 5` is a module-level constant. IAP packs in meta-iap.js `SKUS` array. No mechanics numbers in render or orchestrator code. |
| D | Performance | **PASS** | `_updateAbilityHUD()` is called from `drawHud()` inside the main draw loop — pure DOM update, no new loop. `watchAdForCharge` is Promise-based, one-shot. No new rAF, no persistent setInterval. `cooldownRemainingSec()` is a pure arithmetic function. |
| E | Build-on | **PASS** | New module: `meta-special-abilities.js`. hunt-player.js: shadow_strike stacks consumed on hit (additive to existing hit path). hunt-render.js: ability slot DOM update added to `drawHud()`. wg-game.js: ability slot tap → cast handler. hunt-enemies.js, hunt-bosses.js, hunt-stage.js, hunt-waves.js UNTOUCHED. |
| F | Failure modes | **PASS** | `equip()` returns false for invalid slotIdx or unknown abilityId. `cast()` checks: slot occupied, charges > 0, cooldown expired — all guarded. `watchAdForCharge()` checks daily cap; `WG.Ads.showRewardedVideo()` returns Promise resolved/rejected — both branches handled. ability effects all have null-checks on runtime. |
| G | Path A | **PASS** | 6 ability IAP packs ($1.99–$4.99) + starter bundle ($4.99). Whale gate (`mega_bundle` $99.99) untouched. Gacha rates unchanged. Ad-watch cap at 5/day per ability (faithful clone ad-cadence maintained). |
| H | Pivot alignment | **PASS** | Not in original PIVOT_REPORT, added as post-report directive. Matches 6-ability catalog + 3 HUD slots + cooldown ring + IAP packs + ad-watch flow spec. |
| I | Brand | **N/A** | |

**Worker verdict: PASS**

---

### 4. W-Fever-Mode (UNTRACKED — code in working tree only)

| § | Item | Verdict | Evidence |
|---|------|---------|----------|
| A | Syntax | **PASS** | `node --check` run in this session: hunt-player.js, hunt-pickups.js, hunt-render.js, wg-audio.js — all PASS. |
| B | Marker integrity | **FAIL** | `workers/done/W-Fever-Mode.done` is UNTRACKED (`??` in git status). Code changes uncommitted. 4 modified files: hunt-player.js, hunt-pickups.js, hunt-render.js, wg-audio.js. |
| C | Tunable discipline | **PASS** | `FEVER_TUNABLES = Object.freeze({ THRESHOLD_COMBO:20, DURATION_SEC:10, DROP_RATE_MULT:3, SCREEN_TINT_RGBA:'rgba(255,140,40,0.15)', ENEMY_GLOW:'#ff8040', CHEST_GOLD_MIN:20, CHEST_GOLD_MAX:50 })` at hunt-player.js:34. Frozen. All fever logic references FEVER_TUNABLES; zero hardcoded values in render or pickups. Exported on `window.WG.HuntPlayer`. |
| D | Performance | **PASS** | `_feverCountdownInterval` properly managed: cleared before new assignment on `fever:start`, cleared+nulled on `fever:end`. `drawFeverTint` is a pure draw call inside existing draw loop. Enemy orange glow (`ctx.shadowColor/shadowBlur`) is per-creature, inside existing drawCreatures loop. No new rAF or parallel setInterval. |
| E | Build-on | **PASS** | hunt-player.js: FEVER_TUNABLES + `feverActive/feverEndsAt/feverDropMult` runtime fields + `startFever/endFever` functions + combo-decay tick guards. `takeDamage` unchanged for non-tutorial stages. hunt-pickups.js: `spawnFeverChest` added; existing `tickChests` extended with fever-chest branch (non-fever path untouched). hunt-render.js: `drawFeverTint` inserted after `drawGodWindowCue`; `fever:start/fever:end` listeners append to existing Engine listener chain. hunt-bosses.js, hunt-stage.js, hunt-waves.js, hunt-enemies.js UNTOUCHED by Fever Mode. |
| F | Failure modes | **PASS** | `startFever()` guarded by `!runtime.player.feverActive` before calling. `endFever('broke')`: clears interval, resets feverActive, emits `fever:end`. `endFever('survived')`: same path. `spawnFeverChest` guarded by `runtime && runtime.chests`. `drawFeverTint`: `if (!runtime || !runtime.player || !runtime.player.feverActive) return` — null-safe. |
| G | Path A | **N/A** | FEVER CHEST drops items, not currency. No IAP paths modified. Ad cadence unchanged. |
| H | Pivot alignment | **PASS** | PIVOT_REPORT §3: "combo 20+ → screen tint + 10s countdown timer + FEVER CHEST. Break: descending tone + grief." Delivered: THRESHOLD_COMBO=20, DURATION_SEC=10, drawFeverTint, FEVER CHEST spawn, endFever grief FX (gray flash + "FEVER LOST" + 440→110Hz WebAudio descent). |
| I | Brand | **N/A** | |

**Worker verdict: CONDITIONAL PASS** *(§B marker uncommitted — single commit fixes)*

---

### 5. W-Stage-Zero-Tutorial (UNTRACKED — code in working tree only)

| § | Item | Verdict | Evidence |
|---|------|---------|----------|
| A | Syntax | **PASS** | `node --check`: hunt-stage.js, wg-state.js, hunt-enemies.js, hunt-player.js, hunt-fx.js, hunt-tutorial.js, hunt-tutorial-ext.js, hunt-results.js, wg-game.js — all PASS. |
| B | Marker integrity | **FAIL** | `workers/done/W-Stage-Zero-Tutorial.done` is UNTRACKED. Code changes uncommitted. 9 modified files. |
| C | Tunable discipline | **PASS** | Stage 0 catalog entry in `STAGES` array with named fields: `durationSec:90, hpMult:0.4, speedMult:0.6, damageMult:0.2, invulnFirstSec:45`. All values are in the catalog; `applyGodWindowScaling` reads them via `runtime.stage.hpMult` etc. Zero hardcoded multiplier values in spawner code. |
| D | Performance | **PASS** | No new rAF or setInterval. Tab slide-in CSS animation (`wg-tabs-slide-in`) is one-shot keyframe applied to `#nav-bar`. `shieldDeflect` particle type in hunt-fx.js: 8-particle burst via existing particle system, no new loop. hunt-tutorial-ext Stage 0 hint uses existing `showHint()` infrastructure + `setTimeout(5000)` auto-dismiss. |
| E | Build-on | **PASS** | hunt-stage.js: Stage 0 entry inserted before Stage 1; Stage 1-24 unchanged (confirmed via `git diff HEAD`). hunt-enemies.js: `applyGodWindowScaling` gains `isTutorial` short-circuit early-return — Stage 1-18 (non-tutorial) unaffected. hunt-player.js: `invulnFirstSec` gate is `if (runtime.stage && runtime.stage.invulnFirstSec && runtime.elapsed < invulnFirstSec) return` — fires only for Stage 0. `takeDamage` path for Stage 1+ unchanged. wg-game.js: auto-launch only triggers when `firstLaunch===true && !stage0Cleared` — returning players skip Stage 0 and go to lobby. |
| F | Failure modes | **PASS** | Invuln gate: null-checked `runtime.stage.invulnFirstSec`. Returning players: `hunt-tutorial.js init()` sets `stage0Cleared=true` when `firstLaunch===false`. Energy cost for stageId===0 forced to 0 (free tutorial — no energy charge). Stage 0 results button `ENTER THE HUNT` calls `exitHunt()` — correct flow. `_stage0JustCleared` flag prevents repeat animation on subsequent returns to lobby. |
| G | Path A | **N/A** | Tutorial is free (no energy cost, no IAP gate). |
| H | Pivot alignment | **PASS** | PIVOT_REPORT: "Boot → Stage 0 auto-launch, 90s, lurker-only, 45s invuln gate, 'Drag to move' callout (auto-hides 5s), results → tabs reveal." All 5 items delivered. |
| I | Brand | **N/A** | |

**Worker verdict: CONDITIONAL PASS** *(§B marker uncommitted — single commit fixes)*

---

### 6. W-Progressive-Tab-Unlock (UNTRACKED — code in www/js/ only)

| § | Item | Verdict | Evidence |
|---|------|---------|----------|
| A | Syntax | **PASS** | `node --check`: www/js/core/wg-state.js, www/js/core/wg-cache.js, www/js/wg-game.js — all PASS. |
| B | Marker integrity | **FAIL** | `workers/done/W-Progressive-Tab-Unlock.done` is UNTRACKED. Code changes uncommitted. **STRUCTURAL NOTE: implementation is in `www/js/` (Capacitor web root) NOT in `js/` (local dev root). `js/core/wg-state.js` has `tabs` field (from W-Stage-Zero-Tutorial) + migration, but lacks `TAB_UNLOCK_THRESHOLDS` and `unlockAllTabs()`. `js/wg-game.js` lacks `applyNavVisibility()`, `checkTabUnlocksOnLoad()`, and `tab:unlocked` listener.** For iOS Capacitor ship (www/ webDir): feature works. For local dev server (js/): tabs never unlock. State_OF_BUILD.md incorrectly attributes implementation to `js/` files. |
| C | Tunable discipline | **PASS** | `TAB_UNLOCK_THRESHOLDS = Object.freeze({ ascend:0, forge:2, relics:5, duel:8 })` in www/js/core/wg-state.js:3. Frozen. All unlock checks reference `WG.State.TAB_UNLOCK_THRESHOLDS`. |
| D | Performance | **PASS** | `applyNavVisibility()` is a synchronous DOM scan (`document.querySelectorAll('.nav-tab')`), called only on unlock event or init. `checkTabUnlocksOnLoad()` runs once at init. No new rAF, no setInterval. |
| E | Build-on | **PASS** | www/js/wg-game.js: `applyNavVisibility` injected into `setupNav()` init path; `hunt:stage-cleared` listener emits `tab:unlocked`; `tab:unlocked` listener calls `applyNavVisibility + red-dot + toast`. Existing `setupNav` logic untouched. Stage 1-18 unlock ordering preserved (stage clear → emit → check threshold → unlock). |
| F | Failure modes | **PASS** | `checkTabUnlocksOnLoad()`: iterates `bestWaves` from existing save — returning players silently re-unlock earned tabs. `WG.State.unlockAllTabs()` debug helper. Red dot cleared on first tab tap. Toast auto-hides via `hidden` class toggle + 2s timeout. |
| G | Path A | **N/A** | Tab visibility gating; no monetization paths changed. |
| H | Pivot alignment | **PASS** | PIVOT_REPORT: "First boot: Hunt only. Stage 0 clear: Ascend unlocks. Stage 2: Forge. Stage 5: Relics. Stage 8: Duel." Delivered: `ascend:0` (unlock on Stage 0 clear = immediately after tutorial), `forge:2`, `relics:5`, `duel:8`. |
| I | Brand | **N/A** | |

**Worker verdict: CONDITIONAL PASS** *(§B uncommitted; js/ source tree lacks implementation — iOS ship functional, local dev non-functional)*

---

### 7. W-Rename-Unlimited-Chaos (commits: c1e6aa6, baf8a21, 5588292, 2b2596f, ac6c55f, 1d3db8e)

| § | Item | Verdict | Evidence |
|---|------|---------|----------|
| A | Syntax | **PASS** | index.html, package.json, capacitor.config.json — no JS syntax issues. |
| B | Marker integrity | **PASS** | Done marker committed at 1d3db8e. 6 concern commits present and ordered. |
| C | Tunable discipline | **N/A** | Brand rename; no mechanics constants. |
| D | Performance | **N/A** | |
| E | Build-on | **PASS** | No game mechanics modified. index.html title/WG.BUILD.name changed. Legal pages updated. capacitor.config.json appName updated. iOS Info.plist CFBundleDisplayName updated. |
| F | Failure modes | **N/A** | |
| G | Path A | **PASS** | privacy.html now correctly references "Unlimited Chaos" in ad disclosure section. Legal pages reference correct product name. Gacha rates disclosure intact. |
| H | Pivot alignment | **PASS** | PIVOT_REPORT "Name" section: rename decision made at commit f10ce6a (DECISIONS.md). Architect ratified "Unlimited Chaos" as customer-facing brand. All Architect-accessible files updated. |
| I | Brand | **CONDITIONAL PASS** | ✓ index.html: "Unlimited Chaos". ✓ www/index.html: "Unlimited Chaos". ✓ iOS Info.plist CFBundleDisplayName: "Unlimited Chaos". ✓ capacitor.config.json appName: "Unlimited Chaos" (appId remains "com.thehivemakes.wraithgrove" — per §I, appId exempted). ✓ privacy.html + terms.html: "Unlimited Chaos". **✗ android/app/src/main/res/values/strings.xml: `app_name: "Wraithgrove"`, `title_activity_main: "Wraithgrove"` — customer-facing Android launcher name. Manually maintained file, not auto-generated.** **✗ ios/App/App/public/index.html: title "Wraithgrove", WG.BUILD.name "Wraithgrove" — stale Capacitor artifact; regenerated by `npx cap sync` (normal build step, not a code bug).** |

**Worker verdict: CONDITIONAL PASS** *(§I: Android strings.xml customer-facing brand violation — autonomously fixable; iOS stale artifact fixed by cap sync)*

---

## §E Build-on Guarantee — Cumulative

| Component | Status | Evidence |
|-----------|--------|----------|
| Stages 1-18 catalog | **UNTOUCHED** | `git diff HEAD -- js/hunt/hunt-stage.js` confirms Stage 0 inserted only; Stages 1-24 unchanged line-for-line |
| Day/Night mode | **UNTOUCHED** | DayNight module not in any uncommitted diff |
| Combat AI (hunt-waves.js) | **UNTOUCHED** | Wave1-God-Window changes committed at 663ea62; no new uncommitted changes to hunt-waves.js |
| Boss roster | **UNTOUCHED** | hunt-bosses.js not in uncommitted diff |
| Original 11 enemy types | **UNTOUCHED** | hunt-enemies.js uncommitted diff: only `applyGodWindowScaling` isTutorial early-return added |
| Stages 19-24 content | **UNTOUCHED** | Committed at 2c91e19; not touched by post-0.27 workers |

**§E cumulative: PASS**

---

## §G Path A Discipline — Batch Summary

| Check | Status | Evidence |
|-------|--------|----------|
| Whale gate `mega_bundle` $99.99 | **PASS** | meta-iap.js untouched by all post-0.27 workers |
| Ysabel `rift_guests` pool locked | **PASS** | meta-gacha.js untouched; catalog still empty `[]` |
| Gacha rates in privacy/terms | **PASS** | Legal pages updated brand only; gacha disclosure numbers unchanged |
| Special Abilities IAP packs | **PASS** | 6 ability packs ($1.99–$4.99) + starter bundle — properly gated, not softened |
| Ad-watch daily cap | **PASS** | `DAILY_AD_CHARGE_CAP = 5` per ability per day |
| Fever Mode monetization | **N/A** | Chest drops items, not currency; no IAP path |
| Stage 0 energy cost | **PASS** | Energy charge forced to 0 for stageId===0 in wg-game.js |

---

## §I Brand Consistency — Full Scan

| Location | Customer-facing? | Value | Status |
|----------|-----------------|-------|--------|
| index.html `<title>` | Yes (browser) | "Unlimited Chaos" | **PASS** |
| index.html WG.BUILD.name | Yes (debug/ASO) | "Unlimited Chaos" | **PASS** |
| www/index.html `<title>` | Yes (Capacitor web root) | "Unlimited Chaos" | **PASS** |
| iOS Info.plist CFBundleDisplayName | Yes (iOS launcher + App Store) | "Unlimited Chaos" | **PASS** |
| capacitor.config.json appName | Yes (build system) | "Unlimited Chaos" | **PASS** |
| capacitor.config.json appId | No (technical ID) | "com.thehivemakes.wraithgrove" | **PASS** (exempt) |
| privacy.html | Yes (legal) | "Unlimited Chaos" | **PASS** |
| terms.html | Yes (legal) | "Unlimited Chaos" | **PASS** |
| package.json name | No (npm internal) | "wraithgrove" | **PASS** (exempt — repo codename) |
| package.json description | No (npm internal) | "Unlimited Chaos — ... (Wraithgrove project)" | **PASS** (parenthetical codename OK) |
| android/strings.xml app_name | **Yes (Android launcher)** | **"Wraithgrove"** | **FAIL** |
| android/strings.xml title_activity_main | **Yes (Android activity)** | **"Wraithgrove"** | **FAIL** |
| ios/App/App/public/index.html | Yes (iOS WebView content) | "Wraithgrove" | **FAIL (stale artifact — cap sync fixes)** |

Android strings.xml fix:
```xml
<string name="app_name">Unlimited Chaos</string>
<string name="title_activity_main">Unlimited Chaos</string>
```
Package name and custom_url_scheme (`net.wraithgrove.app`) are technical identifiers — per §I exempt.

---

## Open Items

### §B REQUIRED FIX — Commit 3 uncommitted workers (Architect git action)

Files to commit:

**Modified (working tree):**
- `js/core/wg-audio.js`
- `js/core/wg-state.js`
- `js/hunt/hunt-enemies.js`
- `js/hunt/hunt-fx.js`
- `js/hunt/hunt-pickups.js`
- `js/hunt/hunt-player.js`
- `js/hunt/hunt-render.js`
- `js/hunt/hunt-results.js`
- `js/hunt/hunt-stage.js`
- `js/hunt/hunt-tutorial-ext.js`
- `js/hunt/hunt-tutorial.js`
- `js/wg-game.js`
- `www/js/core/wg-cache.js`
- `www/js/core/wg-state.js`
- `www/js/wg-game.js`

**Untracked (done markers):**
- `workers/done/W-Fever-Mode.done`
- `workers/done/W-Stage-Zero-Tutorial.done`
- `workers/done/W-Progressive-Tab-Unlock.done`

Suggested commit split: one commit per worker (3 commits) for clean history, or single combined commit with all 3 workers noted in message.

### THE GATE — 4 Missing Stage 1 Sprites (autonomously fixable)

Stage 1 (Lantern Vigil) `enemyMix: ['lurker','red_zombie','pumpkin_lantern','skull_swarmer','wraith_fast']`.

ENEMY_SPRITES covers: `lurker ✓ | walker | sprite | brute_small | caller`. Stage 1 needs: `red_zombie ✗ | pumpkin_lantern ✗ | skull_swarmer ✗ | wraith_fast ✗`.

DALL-E 3 briefs for all 4 types exist at `art/enemies/MIDJOURNEY_BRIEFS.md` (added commit 823f720). Fix: run existing briefs through gen_enemy_sprites.py + strip_magenta_v2.py + resize_sprites.py pipeline (same pipeline that generated the original 15 PNGs), add 4 new art/enemies/ subdirectories, extend ENEMY_SPRITES catalog at hunt-render.js:25-30.

### §I Android — strings.xml (2-line fix)

`android/app/src/main/res/values/strings.xml` lines 3-4: change "Wraithgrove" → "Unlimited Chaos" for `app_name` and `title_activity_main`. Two-line fix. `package_name` and `custom_url_scheme` (`net.wraithgrove.app`) are technical IDs — leave unchanged.

### §B Structural Note — W-Progressive-Tab-Unlock in www/js/ only

`js/core/wg-state.js` lacks `TAB_UNLOCK_THRESHOLDS`. `js/wg-game.js` lacks `applyNavVisibility()`, `checkTabUnlocksOnLoad()`, `tab:unlocked` listener. The implementation was placed only in the Capacitor web root (`www/js/`), not the local dev source (`js/`).

**Ship impact:** iOS Capacitor build serves from `www/` — feature works for App Store submission. Local dev browser (`http://localhost:3996/`) will not unlock tabs after stage clear. STATE_OF_BUILD.md attributes the implementation to `js/` which is inaccurate. For the iOS ship gate, this is non-blocking. For future workers modifying `js/wg-game.js` or `js/core/wg-state.js`, the split creates a confusion hazard.

### Carried Forward from 0.27 (non-blocking)

1. **Fragment HP hardcoded** — `hunt-bosses.js:146`: `fe.hp = fe.maxHp = 120`. Should be `td.splitFragmentHp || 120` with `splitFragmentHp: 120` in `echo_throne_keeper` catalog entry. §C violation.
2. **memory_husk split hardcoded** — `wg-game.js enemy:killed` handler: `spawn('lurker', ...) i<2`. Should use `ct.splitType` / `ct.splitCount` from catalog. §C violation.
3. **MutationObserver not disconnected** — `hunt-tutorial-ext.js _buffObs`: never disconnected after tower tutorial completes. No-op post-completion; harmless.
4. **flyIcon cancel-guard** — `meta-daily-rewards.js` flyIcon still lacks `cancelAnimationFrame` guard. Harmless rAF leak on fast navigation.

### Architect-Gated (Unchanged from 0.26.0/0.27.0)

Legal entity name, AdMob production IDs, StoreKit wiring, code signing certificates, App Store Connect record, ATT pre-prompt, crash reporting SDK.

---

## §J Ship-Gate Summary

| # | Item | Type | Status | Action |
|---|------|------|--------|--------|
| 1 | Commit W-Fever-Mode, W-Stage-Zero-Tutorial, W-Progressive-Tab-Unlock | **Git commit** | BLOCKING | `git add` + commit 18 files/markers |
| 2 | Stage 1 enemy sprites (red_zombie, pumpkin_lantern, skull_swarmer, wraith_fast) | **Autonomously fixable** | BLOCKING per THE GATE | Run existing DALL-E 3 briefs; extend ENEMY_SPRITES |
| 3 | Android strings.xml app_name → "Unlimited Chaos" | **Autonomously fixable** | BLOCKING (§I) if Android in scope | 2-line edit |
| 4 | Run `npx cap sync` before iOS build | **Normal build workflow** | NON-BLOCKING (code is correct) | Part of build pipeline |

No Architect-gated items in the fixable list. Items 1-3 are autonomously executable by the next worker.

---

*Auditor: W-Audit-v029-Final one-shot Sonnet CLI subprocess | 2026-05-06T16:03Z*
