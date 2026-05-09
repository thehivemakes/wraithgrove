# PERFORMANCE_AUDIT.md — Wraithgrove Frame Budget + Memory Survey
**Date:** 2026-05-08  
**Worker:** W-Performance-Audit (one-shot Sonnet, read-only)  
**Scope:** Hunt loop only. No code edits. Pre-launch baseline.

---

## §1 — Hot Spots (per-frame ms estimates, file:line)

### 1A. drawStumps — per-frame sort allocation  ⚠️ CRITICAL
**File:** `js/hunt/hunt-render.js:491–493`
```js
const sorted = props.stumps.slice().sort((a, b) => a.y - b.y);
```
**What happens:** Every frame, ~1400 stump objects are sliced into a new array and Y-sorted. With TREE_SPACING=22 over the 720×1100 map, the initial stump count is approximately `(720/22) × (1100/22) ≈ 1450`, minus the 80px spawn clearing and building footprints ≈ **~1380 stumps**.

- 1380-element Array allocation + O(n log n) sort = ~11k comparisons, per frame
- At 60fps: 60 allocations/sec of a 1380-element array + 660k comparisons/sec
- **Estimated cost:** 1–3ms on iPhone X (A11), 0.4–0.8ms on iPhone 14 (A15)
- **GC impact:** ~170KB of short-lived Array allocation per second → minor-GC pauses visible as 1–2ms hitches every 2–3 seconds on low-RAM Android

**Fix (static-analysable, don't need profiler):** Cache the sorted array inside `_stagePropsCache[stage.id].stumpsSorted`. Populate once on stage build. When a stump is chopped (`s.dropped = true`), remove it from the sorted array via splice (the drop event fires in autoAttack already — hunt-player.js:234). No per-frame allocation needed.

---

### 1B. resolveTreeCollisions — O(1380) × 3 per move frame  ⚠️ CRITICAL
**File:** `js/hunt/hunt-player.js:101–138`

```js
for (let iter = 0; iter < 3; iter++) {
  for (let i = 0; i < props.stumps.length; i++) {
    const t = props.stumps[i];
    if (t.dropped) continue;
    const dx = p.x - t.x, dy = p.y - t.y;
    const d2 = dx*dx + dy*dy;
    if (d2 < minD2) { ... Math.sqrt(d2) ... }
```

No spatial partition exists. Every frame the player moves, all 1380 stumps are scanned up to 3 times for collision — **4140 distance checks plus up to 3 `Math.sqrt` calls** (worst case: player pinched between trees). The `if (t.dropped) continue` guard is a cheap branch but doesn't reduce iteration count.

- **Estimated cost:** 0.8–2.5ms on iPhone X (sqrt is expensive on A11)
- As the player chops trees and `dropped` count rises, this cost decreases over the run — but early-game (max tree density) is worst case

**Fix:** Build a spatial grid on stage props init: `stumpsGrid[cellX][cellY] = [...]` with 64px cells. In resolveTreeCollisions, only check the 3×3 neighborhood of cells around the player (9 cells × ~3 stumps/cell = ~27 checks instead of 1380). Grid rebuild cost on chop: O(1).

---

### 1C. Night overlay — 4+ gradient objects created per frame  ⚠️ HIGH
**File:** `js/hunt/hunt-render.js:876–942` (`drawNightOverlay`)

Every frame in Night mode, `drawNightOverlay` creates:
1. `ctx.createLinearGradient(0, 0, 0, H)` — sky gradient (line ~877)
2. `ctx.createRadialGradient(W/2, H/2, ...)` — vignette (line ~885)
3. `ctx.createRadialGradient(sx, sy, ...)` — player torch hole (line ~903)
4. `ctx.createRadialGradient(fx, fy, ...)` × N campfires (line ~931)

**These are not pooled.** Canvas gradient objects have internal allocation overhead. 4 new gradient objects × 60fps = 240 gradient objects/second allocated and GC'd.

Also `drawCampfireLight` (`js/hunt/hunt-render.js:801`) creates another RadialGradient per fire per frame.

- **Estimated cost:** 0.3–1.0ms per frame on mobile (gradient construction does path-setup internally)

**Fix:** Cache gradient objects; recreate only on `resize` event or when screen dimensions change. The flicker factor is an input to `globalAlpha` and `radius`, not to the gradient stop structure — so the gradient shape is stable per-frame and can be computed once. Pattern: `if (!_nightGradients || _nightW !== W || _nightH !== H) { _nightGradients = buildNightGradients(W, H); }`

---

### 1D. ctx.shadowBlur during Fever mode  ⚠️ HIGH
**File:** `js/hunt/hunt-render.js:2142–2143, 2172`

```js
if (_feverGlow) { ctx.shadowColor = _feverGlow; ctx.shadowBlur = 9; }
// ... draw creature ...
if (_feverGlow) ctx.shadowBlur = 0;
```

Setting `ctx.shadowBlur` to a non-zero value forces the browser to run a full blur compositing pass for every subsequent draw call until it is reset. With 30–50 enemies alive in late game, this is **30–50 shadow compositor passes per frame** during fever.

- Shadow blur in Canvas 2D is computed on the CPU on most mobile browsers (not GPU-accelerated) — it is disproportionately expensive
- **Estimated cost:** 2–6ms for 40 creatures with shadowBlur=9 on iPhone X

**Fix:** Offscreen canvas approach — during fever, render all creatures to an `OffscreenCanvas` (or a secondary `<canvas>`), then apply a single CSS `filter: drop-shadow(...)` on the composite, or draw the offscreen canvas with `globalCompositeOperation: 'lighter'`. Eliminates N shadow passes → 1 composite. Alternatively, use a radial gradient overlay on each creature instead of shadowBlur.

---

### 1E. HuntFX pool — full-size tick + linear alloc scan  ⚑ MEDIUM
**File:** `js/hunt/hunt-fx.js:77–81` (`_alloc`) and `js/hunt/hunt-fx.js:116–127` (`tick`)

```js
function _alloc() {
  for (let i = 0; i < POOL_CAP; i++) {   // always scans 200 slots
    if (!pool[i].active) return pool[i];
  }
  return null;
}

function tick(dt) {
  for (let i = 0; i < POOL_CAP; i++) {   // always iterates 200 slots
    const p = pool[i];
    if (!p.active) continue;
```

Both `_alloc()` and `tick()` always iterate the full POOL_CAP=200, regardless of active count. In quiet periods (5 active particles) this scans 195 empty slots unnecessarily. Under `bossDeathExplosion` (count=60) + `bossDeathRing` (count=24) = 84 particles emitted simultaneously, the pool fills to 84% and subsequent `_alloc()` calls must scan many active slots before finding a free one.

`draw()` has the same O(200) scan pattern (`js/hunt/hunt-fx.js:128–145`).

- **Estimated cost:** Individually trivial (~0.05ms). Cumulative with WG.Render.tickParticles (cap=120) adds another O(120) scan. Combined: ~0.1ms. Not critical but easy to fix.

**Fix:** Track `_firstFree` index (bump when active, reset to 0 on deactivate). Track `_activeCount`; early-exit tick loop when all active particles processed.

---

### 1F. w2s object allocation per entity  ⚑ MEDIUM
**File:** `js/hunt/hunt-render.js:239`

```js
function w2s(wx, wy) { return { x: wx - camera.x, y: wy - camera.y }; }
```

Called on every enemy, stump, drop, particle, projectile, pickup, boss per frame. Rough count: 40 enemies + 1380 stumps visible check (only 50–100 on screen) + 10 projectiles + 100 particles + 20 drops = ~200 calls/frame minimum. Each creates a new `{x, y}` object.

- **Estimated cost:** Allocation itself is fast; GC pressure accumulates: ~200 short-lived objects/frame × 60fps = 12k objects/sec
- Not a major bottleneck individually, but compounds with the drawStumps allocation above

**Fix:** Pool a single reusable `const _s2w = {x:0, y:0}` object; write `w2s` as `function w2sInto(wx, wy) { _s2w.x = wx - camera.x; _s2w.y = wy - camera.y; return _s2w; }`. Callers that store the result must copy it; callers that use it inline (most) are fine. Alternatively, inline `(wx - camera.x)` / `(wy - camera.y)` at the 5–6 call sites that account for most calls.

---

### 1G. Projectile AOE scan — O(creatures) per projectile hit  ⚑ LOW-MEDIUM
**File:** `js/wg-game.js:202–210`

```js
if (p.areaR > 0) {
  for (const c of huntRuntime.creatures) {
    if (c.hp <= 0 || c === hit) continue;
    const dx = c.x - p.x, dy = c.y - p.y;
    if (dx*dx + dy*dy < p.areaR * p.areaR) {
      WG.HuntEnemies.damage(c, ...);
```

This scan fires only on AOE projectile impact (not every frame). With 10 turrets firing and an AOE weapon, worst case is maybe 5–10 AOE hits per second × 40 creatures = 200–400 extra distance checks per second. Manageable at current creature caps, but worth watching at late-game density (stage 18: 10 enemy types all in mix).

---

### 1H. autoAttack stump scan every attack cycle  ⚑ LOW
**File:** `js/hunt/hunt-player.js:222–294`

On every melee swing (cooldown-limited), the code iterates `props.stumps` for stump-chop collision. Same O(1380) scan as resolveTreeCollisions, but only fires at the weapon cooldown rate (not every frame). At max attack speed: maybe 3–4/sec × 1380 = ~5500 stump checks/sec. Low priority but benefits from the same spatial-grid fix as §1B.

---

## §2 — Memory Growth Risks

### 2A. runtime.drops — no cap, accumulates over long runs  ⚠️ HIGH
**File:** `js/hunt/hunt-player.js:540–598` (`pickupTick`), drops pushed in `autoAttack` and `onEnemyKill`

Drops are removed from `runtime.drops` only when the player's magnet pulls them within 14px. Items outside `pickupRadius` that the player never approaches persist for the entire run.

**Worst-case scenario:** Stage 18 (7-minute marathon) with dense tree chopping + many enemy kills. Each tree chop drops 2–3 items (coin, coin/torch, wood) + wood_x2 buff doubles it = 4–6 per chop. At ~100 trees chopped over 7 minutes + ~200 enemy drops = 600–800 uncollected drops possible if player ignores edges.

- Each drop object: `{x, y, type, vx, vy, _lifetime, _flickerSeed?}` ≈ 7 fields × ~40 bytes = ~280 bytes
- 800 drops × 280 bytes = ~220KB — not catastrophic but notable on 2GB Android
- **Real risk:** Iteration cost in pickupTick (line 546: `for (let i = runtime.drops.length - 1; i >= 0; i--)`) grows with accumulation — 800 iterations/frame adding ~0.1ms

**Fix:** Add a `MAX_DROPS = 500` cap in the drop-spawn path; when exceeded, silently discard the new drop (or the oldest inactive one). Alternatively, age-expire drops after 30 seconds if not collected.

---

### 2B. Audio buffers cached indefinitely, never evicted  ⚑ MEDIUM
**File:** `js/core/wg-audio.js:92` (`const buffers = {}`)

```js
const buffers = {};   // id → AudioBuffer
```

All decoded AudioBuffers are stored here permanently for the session lifetime. `loadBuffer` checks `if (buffers[id]) return buffers[id]` — no LRU, no size limit.

**Loaded buffer set for a full session (all stages visited):**
- 25+ SFX IDs × ~20–50KB each (mono 44.1kHz mp3 decoded to PCM) ≈ 0.5–1.2MB
- 6 ambient tracks × ~1–2MB decoded each ≈ 6–12MB
- **Peak total: ~12–13MB** held indefinitely in WebAudio buffers

On a device with 2GB RAM running a Capacitor WebView + game canvas + system overhead, 12–13MB for audio is acceptable. **Risk materializes on 1GB-RAM Android** (budget devices running Android 12 Go) where WebView headroom is tight.

No cleanup path exists. `ambient(null)` stops the source node but does not evict the buffer from `buffers`.

**Fix:** Add an LRU cap (e.g., keep last 20 SFX + current ambient; evict least recently played). Ambient track is 10× the size — evict on stage exit.

---

### 2C. _feverCountdownInterval — potential orphan on stage end during fever  ⚠️ MEDIUM
**File:** `js/hunt/hunt-render.js:3411` (set), `js/hunt/hunt-render.js:3419` (cleared on fever:end only)

```js
_feverCountdownInterval = setInterval(() => {
  if (!_comboLabel) return;
  const rem = Math.ceil((_feverEndsAt - Date.now()) / 1000);
  _comboLabel.textContent = 'FEVER ' + rem + 's';
}, 250);
```

`clearInterval` is called ONLY in the `fever:end` listener. If a stage ends (win or fail) while fever is still active, `fever:end` may or may not fire before runtime teardown. Inspection of `wg-game.js:finishHunt` shows no explicit `fever:end` emission — the interval continues firing every 250ms indefinitely. The `if (!_comboLabel) return;` guard prevents crashes, but the interval loop keeps running.

In a session with many runs, this creates an orphaned interval per run that ended during fever.

**Fix:** Add `WG.Engine.on('hunt:stage-cleared', clearFeverInterval)` and `WG.Engine.on('hunt:stage-failed', clearFeverInterval)` where `clearFeverInterval = () => { if (_feverCountdownInterval) { clearInterval(_feverCountdownInterval); _feverCountdownInterval = null; } }`.

---

### 2D. Gradient objects — per-frame allocation  ⚑ MEDIUM
See §1C. Each gradient object is ~200–400 bytes of canvas internal state. 240 gradient objects/second × 300 bytes = ~72KB/s of short-lived allocation. Browser's minor-GC handles this in practice, but it is a steady pressure source during Night mode.

---

### 2E. _stagePropsCache — single stage, cleaned on exit  ✅ CLEAN
**File:** `js/hunt/hunt-render.js:15, 220`

`_stagePropsCache = {}` is reset on every `setRuntime()` call (stage start AND exit). Only one stage is ever cached simultaneously. The stump array (~1380 objects × ~8 fields = ~200KB) is properly freed on exit. **No accumulation risk.**

---

### 2F. Tab DOM panels — never fully torn down  ⚑ LOW
**File:** `js/wg-game.js:333–366` (`switchTab`)

Tab panels (Forge, Ascend, Relics, Duel, Alliance) are shown/hidden via CSS class toggle. Their DOM is never removed. Each `refresh()` call re-renders via innerHTML or DOM mutation, which browsers handle via incremental GC. No infinite accumulation — panel size is bounded by the number of items in each catalog (relics, buildings, etc.), which is finite.

**Risk:** Alliance render (`meta-alliance-render.js:720, 729`) creates two setIntervals (`_bossCountdownTimer`, `_breakCountdownTimer`) that tick every 1s. These are never explicitly cleared when switching away from the Alliance tab. They run continuously in the background. Check for `clearInterval` on tab departure.

---

### 2G. localStorage size — bounded, not a concern  ✅ CLEAN
**File:** `js/core/wg-cache.js:52–58`, schema in `js/core/wg-state.js`

Save schema: currencies (4 fields) + energy (2 fields) + player (level, stats, equipment, skins, abilitySlots, bestWaves) + forge (8 buildings × 5 fields) + relics.owned (up to 40 relics × 3 fields) + duel + alliance + iap + settings + achievements.

**Estimated serialized size:**
- Minimal (new player): ~1.5KB
- After 24h F2P play (all stages cleared, many relics): ~6–8KB
- Absolute max (all relics, max buildings, long bestWaves map): ~12KB

localStorage limit is 5–10MB across all keys. **No risk.**

---

## §3 — Mobile-Specific Concerns

### iPhone 14 (A15 Bionic, 6GB RAM) — 60fps achievable with fixes
Primary concern is the per-frame allocations causing minor-GC hitches rather than raw compute time. The A15 Canvas 2D pipeline is fast enough for the draw calls at current entity counts.

- **drawStumps sort:** ~0.4–0.8ms — measurable, not budget-busting alone
- **Night overlay gradients:** ~0.3–0.5ms — manageable
- **resolveTreeCollisions:** ~0.4–0.8ms — within budget
- **Fever shadowBlur with 40 enemies:** ~1–2ms — cuts into the 16.6ms target
- **Combined worst case (fever + Night + full tree density):** ~5–7ms above baseline render. Still likely achievable at 60fps on A15, but leaves thin margin

**Key risk:** Cumulative allocation GC hitches. Each individually small; together they fire GC every 100–150ms, causing ~2–3ms pauses visible as micro-stutters.

---

### iPhone X (A11 Bionic, 3GB RAM) — 30fps target, concern medium
- **drawStumps sort:** ~1.5–3ms — may cause single-frame spikes
- **resolveTreeCollisions (3 iters):** ~1.5–2.5ms — sqrt is expensive on A11
- **Night overlay gradients:** ~0.6–1.0ms
- **Fever shadowBlur 40 enemies:** ~3–6ms — most dangerous single hotspot
- **Combined worst case:** ~8–13ms of pure CPU overhead above draw calls → 33ms budget for 30fps is achievable but tight; fever + Night simultaneously may drop frames

**Primary fix needed before soft launch:** resolveTreeCollisions spatial grid + drawStumps sort cache.

---

### Low-RAM Android (e.g., 2GB Samsung A-series) — 30fps target, high risk
- GC is more aggressive. The drawStumps allocation + w2s allocation rate generates GC pauses of 5–10ms every 2–4 seconds on Android's ART GC
- Audio buffer accumulation (~13MB) competes directly with WebView working set
- WebView on older Android Chrome (v96–100) has slower Canvas 2D shadow rendering — fever shadowBlur could be 8–12ms for 40 enemies
- **runtime.drops unbounded accumulation** on long sessions (stage 18: 7 minutes) can push the drops iteration overhead visibly

**Recommended pre-launch test:** Run stage 18 on a Samsung Galaxy A13 (2GB) with fever active in Night mode and 100+ uncollected drops. Measure frame time via `performance.now()` at top/bottom of `frame()`.

---

## §4 — Top 5 Priority Fixes (ranked by frame-impact)

| Rank | Issue | File:Line | Estimated Frame Savings | Complexity |
|------|-------|-----------|------------------------|------------|
| 1 | Cache sorted stumps array; only re-sort on chop | `hunt-render.js:491` | **1–3ms/frame** (eliminates allocation + sort) | Low — add dirty flag to stump drop path |
| 2 | Spatial grid for resolveTreeCollisions | `hunt-player.js:101` | **0.8–2.5ms/frame** (eliminates O(1380) scan) | Medium — build grid in getStageProps |
| 3 | Cache Night overlay gradients per resize | `hunt-render.js:876` | **0.3–1.0ms/frame** (eliminates 4+ gradient allocations) | Low — module-level cache object |
| 4 | Fix shadowBlur fever rendering | `hunt-render.js:2142` | **2–6ms/frame** during fever on old devices | Medium — offscreen canvas or drop-shadow filter |
| 5 | Cap runtime.drops at MAX_DROPS + clear fever interval on exit | `hunt-player.js:pickupTick`, `hunt-render.js:3411` | Memory stability + no orphan interval | Low — 2-line cap + clearInterval listener |

---

## §5 — What Needs Profiling vs What Is Static-Analysable

### Static-analysable (confirmed by code reading, no profiler needed)

| Finding | Certainty |
|---------|-----------|
| drawStumps per-frame sort allocation (hunt-render.js:491) | Definite — code clearly shows `.slice().sort()` in drawFrame path |
| Night overlay gradient creation per frame (hunt-render.js:876–942) | Definite — `ctx.createLinearGradient` / `ctx.createRadialGradient` inside drawNightOverlay, called from drawFrame |
| _feverCountdownInterval not cleared on stage end (hunt-render.js:3411) | Definite — `clearInterval` only in `fever:end` listener; no `hunt:stage-*` cleanup |
| runtime.drops has no cap (hunt-player.js autoAttack, pickupTick) | Definite — `runtime.drops.push(...)` has no length guard |
| Audio buffers never evicted (wg-audio.js:92) | Definite — `buffers` object has no eviction |
| rAF caller count: 1 during Hunt (main frame loop), 0 menu loop | Definite — cancelMenuLoop() called at startHunt |
| HuntFX pool: O(POOL_CAP) tick always (hunt-fx.js:116) | Definite |
| w2s object allocation per call (hunt-render.js:239) | Definite |
| Stump count ~1380 on fresh stage (calculated from TREE_SPACING=22, mapW=720, mapH=1100) | Estimate — needs runtime verification |

### Needs profiling to quantify

| Question | Profiling tool |
|----------|---------------|
| Actual ms cost of resolveTreeCollisions per frame | Chrome Devtools Performance tab → Function Self Time for `resolveTreeCollisions` |
| GPU cost of ctx.shadowBlur per creature draw | Canvas GPU profiler (Chrome `chrome://tracing` with `cc` categories) |
| GC pause frequency from allocations | Chrome Heap Profiler → minor GC events on Timeline |
| Actual stump count at runtime (verify ~1380 estimate) | `WG.HuntRender.getStageProps(WG.HuntStage.get(1)).stumps.length` in console |
| Peak runtime.drops count during stage 18 | `WG.Game.getHuntRuntime().drops.length` logged every 30s during run |
| iPhone X vs iPhone 14 frame time delta | `performance.now()` wrapper around `frame()` call in wg-game.js |
| Audio buffer memory footprint | `WG.Audio._state()` + `buffers` key count in console; Chrome Memory tab |

---

*Audit complete. 9 hot spots identified, 7 memory risks surveyed. Top 5 fixes are rank-ordered by frame-impact. None require architecture changes — all are targeted patches in existing functions.*
