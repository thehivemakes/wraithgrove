# AUDIT — Menu / Banshee / Repair / Spawn / Painterly-Art

**Worker:** W-Audit-Menu-Banshee-Repair-Spawn (read-only)
**Date:** 2026-05-03 10:00 UTC
**Verdict:** **PASS** (with minor polish gaps surfaced — non-blocking)

Scope: verify the five batches landed cleanly:
1. Banshee enemy
2. Building Repair
3. Spawn Tuning
4. Hero menu redesign (single-tile carousel)
5. Painterly menu art (W-Menu-Art-Pass A–D)

---

## §A Static checks — `node --check`

| File | Result |
|------|--------|
| `js/hunt/hunt-enemies.js` | OK |
| `js/hunt/hunt-render.js`  | OK |
| `js/hunt/hunt-waves.js`   | OK |
| `js/hunt/hunt-stage.js`   | OK |
| `js/hunt/hunt-player.js`  | OK |
| `js/hunt/hunt-fx.js`      | OK |
| `js/core/wg-audio.js`     | OK |
| `js/wg-game.js`           | OK |

All 8 touched modules parse cleanly. **PASS**.

---

## §B Marker integrity

### W-Banshee-Enemy.done

Claims | Code Evidence | Verdict
---|---|---
hp:220 damage:22 speed:130 size:36 color:#e8e0f0 accent:#a060ff xp:30 mode:'night' ai:'banshee_charge' rare:true shriekCooldown:4.0 cooldown:1.0 | `js/hunt/hunt-enemies.js:32` exact match | PASS
banshee_charge AI branch (sin-wave lateral, 0.8s charge at 1.8× speed) | `js/hunt/hunt-enemies.js:126-158` matches | PASS
Shriek FX polish (trauma 0.3 + 16-particle violet burst + flash #a060ff @ 0.3 alpha 200ms) | `js/hunt/hunt-enemies.js:135-137` matches | PASS
drawBanshee sprite (3-layer aura, 5 hair strands, hollow eyes, charge ring) | `js/hunt/hunt-render.js:1680-1747` matches | PASS
`enemy:shriek` → `boss_die` placeholder (sfx, throttle 600, vol 0.85) | `js/core/wg-audio.js:64` exact | PASS
5% Night-only rare-roll, capped 1 alive | `js/hunt/hunt-waves.js:116-126` matches | PASS

### W-Building-Repair.done

Tunable | Code Evidence | Verdict
---|---|---
REPAIR_HOVER_DELAY=3.0 | `js/hunt/hunt-player.js:562` | PASS
REPAIR_RATE=0.25 | `js/hunt/hunt-player.js:563` | PASS
REPAIR_HP_PER_WOOD=8 | `js/hunt/hunt-player.js:564` | PASS
REPAIR_RANGE=36 | `js/hunt/hunt-player.js:565` | PASS
REPAIR_TUNABLES exported frozen | `js/hunt/hunt-player.js:685-687` | PASS
repairTick wired after constructionTick | `js/hunt/hunt-player.js:672-673` | PASS
hover ring + wrench bobble in render | `js/hunt/hunt-render.js:598-642` | PASS
repairSparkle/repairBurst types | `js/hunt/hunt-fx.js:59-64` | PASS
repair:tick / repair:complete listeners | `js/hunt/hunt-fx.js:206-217` | PASS
audio:repair_complete → craft sample | `js/core/wg-audio.js:60` | PASS

### W-Spawn-Tuning.done

Claim | Code Evidence | Verdict
---|---|---
wraith_fast hp:18 speed:140 size:14 mode:'night' ai:'walker' | `js/hunt/hunt-enemies.js:37` exact | PASS
skull_swarmer hp:9 speed:95 size:12 mode:'both' swarmSize:4 | `js/hunt/hunt-enemies.js:41` exact | PASS
WAVE_BASE_RATE_MIN: 0.5→0.7 (+40%) | `js/hunt/hunt-waves.js:29` = 0.7 | PASS
WAVE_BASE_RATE_MAX: 1.5→2.1 (+40%) | `js/hunt/hunt-waves.js:30` = 2.1 | PASS
All 18 stages include both new types | awk scan: 18/18 stages contain both `wraith_fast` AND `skull_swarmer` | PASS
Cluster jitter spawn for swarmSize>1 | `js/hunt/hunt-waves.js:131,170-183` (CLUSTER_JITTER_RADIUS=30) | PASS
drawWraithFast / drawSkullImp sprites + dispatch | `js/hunt/hunt-render.js:1751-1793, 1804-1805` | PASS

### Hero menu redesign (no own done marker — orchestrator-inline)

Claim | Code Evidence | Verdict
---|---|---
Single-tile carousel with `selectedStageIdx` | `js/wg-game.js:350, 829-832` | PASS
Carousel ◀ ▶ arrows clamp to range | `js/wg-game.js:821-836` | PASS
Lock progression (`isStageUnlocked`: stage 1 free, then prev `bestWaves > 0`) | `js/wg-game.js:767-773` | PASS
Side icons: TASKS, OFFERS, SETTINGS, DAILY, 7-DAYS | `js/wg-game.js:809-817` (left+right cols, z-index:3) | PASS
BATTLE button (locked branch flashes red, unlocked starts hunt) | `js/wg-game.js:873-889` | PASS
Day/Night pills (`☀ NORMAL` / `☾ NIGHTMARE`) | `js/wg-game.js:848-866` | PASS
Locked stage: BATTLE shows 🔒 LOCKED, no animation, lock overlay | `js/wg-game.js:1023-1041` | PASS

### W-Menu-Art-Pass.done (Concerns A–D)

Claim | Code Evidence | Verdict
---|---|---
6 biome painters (forest_summer, forest_autumn, cold_stone, temple, cave, eldritch) | `js/wg-game.js:395-691` + dispatch table 693-700 | PASS
DPR-aware canvas + rAF loop, `_menuRaf` module-scope | `js/wg-game.js:386-387, 911-914, 966-992` | PASS
cancelMenuLoop on: renderHero re-entry / switchTab(non-hunt) / startHunt / visibilitychange | lines 893, 246, 49, 1104 | PASS
drawMenuCharacter (96×140 canvas, tier-tinted, idle bob, soft shadow) | `js/wg-game.js:707-765, 939-942, 989` | PASS
Vignette (radial, multiply, opacity 0.4, z:2) | `js/wg-game.js:996-998` | PASS
Glyphic divider under stage name | `js/wg-game.js:1001-1013` | PASS
Carousel dots gap 5px, z-index 3 | `js/wg-game.js:1043-1052` | PASS
@keyframes battlePulse + applied when unlocked | `index.html:70-73`, `js/wg-game.js:1040` | PASS
BIOME_ART / CHARACTER_PORTRAITS / RIFT_BIOMES asset hooks | `js/wg-game.js:367-379, 921-934, 948-962` | PASS
.wg-rift-intrude rule + @keyframes wgRiftGlitch | `index.html:81-91` | PASS
Portrait centering via `left:calc(50% - 48px)` (avoids transform stomp) | `js/wg-game.js:957` | PASS

**§B verdict: PASS.**

---

## §C Catalog consistency — tunables not hardcoded in render/UI

- Banshee/Wraith/Skull render functions read `c._typeData.color`, `c.size`, `c._chargeTimer`, `c._shriekTimer` from the catalog object. **PASS.**
- Repair render (`js/hunt/hunt-render.js:602-642`) reads through `WG.HuntPlayer.REPAIR_TUNABLES` rather than re-declaring constants. **PASS.**
- Spawn rate constants live in `WAVE_BASE_RATE_MIN/MAX` at module top of `hunt-waves.js`. **PASS.**
- Banshee shriekCooldown referenced via `c._typeData.shriekCooldown` (not hardcoded). **PASS.**

**Polish gap (minor — not a fail):** the banshee charge duration `0.8` and charge speed multiplier `1.8` are hardcoded inline in `js/hunt/hunt-enemies.js:131,142-143`. They live in the AI/engine layer (not render/UI), so do not violate the bluepaper's "no magic numbers in render/UI" rule. Consider promoting to `chargeDurationS` / `chargeSpeedMul` on the catalog entry next pass for clean parity with `shriekCooldown`. Same applies to the polish-FX magic numbers (trauma 0.3, particle count 16, flash 0.3@200) in lines 135-137 — acceptable as named-comment-documented inline values.

**§C verdict: PASS.**

---

## §D Performance — rAF leaks / listener leaks / pool bound

- **rAF lifecycle (menu canvas):** `_menuRaf` is single module-scope handle; cancelled on every transition (renderHero re-entry, leaving Hunt tab, starting a stage, page hidden). Loop self-exits if `canvas.isConnected === false`. **No leak.**
- **DOM listener churn:** `showHuntStageList` removes prior `#hunt-stage-select` before appending a new one, so leftCol/rightCol/arrows/battleBtn are recreated cleanly. `renderHero()` only wipes `heroContent` — the persistent listeners on side icons / arrows / mode pills / BATTLE button are retained across re-renders. **No leak.**
- **Particle pool:** `POOL_CAP=200` fixed; `_alloc()` returns null on exhaustion (silently drops per DOPAMINE_DESIGN §9). `repairBurst` adds 12, `pickupFragment` shriek burst adds 16 — well under cap. **Bounded.**

**§D verdict: PASS.**

---

## §E Balance — spawn ramp + Banshee HP pinned to spec

- Banshee: hp 220, damage 22, speed 130, size 36 — **matches spec.**
- Spawn rate +40%: 0.5→0.7 / 1.5→2.1 — **matches spec.**
- 5% Night-only banshee roll, cap 1 alive — **matches spec.**
- Wraith/Skull stats per Spawn-Tuning brief — **matches spec.**
- All 18 stage `enemyMix` arrays contain both `wraith_fast` AND `skull_swarmer` (verified by awk: 18/18). **matches spec.**

**§E verdict: PASS.**

---

## §F Failure modes

| Concern | Code Path | Verdict |
|---|---|---|
| Locked stage cannot enter hunt | `js/wg-game.js:882-885` — red screen flash, early return | PASS |
| Locked stage BATTLE animation stripped | `js/wg-game.js:1035` `battleBtn.style.animation = ''` | PASS |
| Repair-on-destroyed-turret guard | `js/hunt/hunt-player.js:632` `if (!c.built ...) continue;` + turret destruction sets `t.built = false` (`js/hunt/hunt-turret.js:161`) — destroyed turrets are skipped, slot reverts to build-from-scratch | PASS |
| Repair-when-HP-already-full | `js/hunt/hunt-player.js:634-637` clears hover/drain timers and continues; fresh damage event re-arms hover delay | PASS |
| Repair gated on `runtime.pendingLevelUp` (matches autoAttack/constructionTick) | `js/hunt/hunt-player.js:626` | PASS |
| Banshee one-alive cap | `js/hunt/hunt-waves.js:121-123` linear scan — defensive even though boss_die throttle (600ms) covers stacking | PASS |
| Day-mode banshee suppression | `js/hunt/hunt-waves.js:117` `if (runtime.mode !== 'night') return null;` | PASS |
| Page-hidden CPU save (cancelMenuLoop) | `js/wg-game.js:1103-1104` | PASS |
| Menu-while-in-stage guard | `showHuntStageList` early-returns if `huntRuntime.player.hp > 0` (`js/wg-game.js:776`); `startHunt` removes `#hunt-stage-select` overlay (`js/wg-game.js:50-51`) | PASS |
| Banshee `_chargeTimer` first-tick safety | `undefined > 0` evaluates to false — no NaN; first tick takes erratic-motion branch | PASS |
| `_shriekTimer` first-tick init | `js/hunt/hunt-enemies.js:128` null-coalesce sets `shriekCooldown` on first tick | PASS |

**§F verdict: PASS.**

---

## Polish gaps surfaced (non-blocking — log for next pass)

1. **Banshee inline tunables:** `0.8` (charge duration), `1.8` (charge speed mul), `0.3` (trauma), `16` (particle count), `200` (flash ms) live as inline numbers in `hunt-enemies.js`. Consider promoting to catalog fields (`chargeDurationS`, `chargeSpeedMul`, `shriekFx: {...}`) for parity with `shriekCooldown` and to enable difficulty-scaling without code edits.
2. **Banshee placeholder audio:** `enemy:shriek` reuses `boss_die` sample. Marker explicitly notes this is placeholder until `banshee_screech.mp3` is sourced. Track in audio queue.
3. **`enemy:shriek` event observers:** only audio listens. No FX hook fires *from the event itself* — the FX (trauma/burst/flash) are inlined in the AI tick rather than emitted via the event bus. Acceptable but means an external FX module cannot easily react to a shriek without re-instrumenting the enemy. Consider moving FX into a `WG.Engine.on('enemy:shriek')` listener in `hunt-fx.js` next pass for symmetry with `repair:complete`.
4. **Procedural canvas + rift glitch:** when an asset slot is null but the biome is in RIFT_BIOMES, the procedural canvas does NOT carry the `wg-rift-intrude` class. So rift biomes get the violet-glitch only after illustrated assets ship. Documented behavior; flag as design-intent confirm rather than bug.
5. **`runtime.runWood` Math.max safety repeat:** `js/hunt/hunt-player.js:653-654` checks `runWood <= 0` inside the while-loop to break safely if wood is exhausted mid-batch. Defensive; intentional.

---

## Verdict

**PASS — all five batches verified clean.**

- Static checks: 8/8 PASS
- Marker fidelity: every claim traceable to code
- Catalog consistency: render/UI free of magic numbers (banshee polish-FX numbers in AI layer noted as polish gap, not §C violation)
- Performance: rAF + listeners + particle pool all bounded
- Balance: pinned to spec
- Failure modes: all guarded

No `AUDIT_FAIL.flag` written. Polish gaps logged above for next iteration.
