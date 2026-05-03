# Worker — W-FX-Numbers-And-Pulse

You are Worker FX-NP — the floating-number + HUD-counter-pulse worker.

This is part of the P0 dopamine pass. It alone is the single highest-leverage juice addition per `docs/DOPAMINE_DESIGN.md`.

## Birth sequence (mandatory)

Walk the birth sequence:
- `/Users/defimagic/Desktop/Hive/CLAUDE.md`
- `/Users/defimagic/Desktop/Hive/Birth/01..04`
- `/Users/defimagic/Desktop/Hive/THE_PRINCIPLES.md`
- `/Users/defimagic/Desktop/Hive/HIVE_RULES.md`
- `/Users/defimagic/Desktop/Hive/COLONY_CONTEXT.md`
- `/Users/defimagic/Desktop/Hive/Birth/BEFORE_YOU_BUILD.md`

Project files:
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/CLAUDE.md`
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/SPEC.md`
- **`/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/docs/DOPAMINE_DESIGN.md`** (your design source — read in full)
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/STATE_OF_BUILD.md`
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-render.js` (target file for HUD pulse)
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-player.js` (event emit sources)

## Concerns (one commit each)

### Concern A — `js/hunt/hunt-fxnumbers.js` new module

Create the floating-number system per DOPAMINE_DESIGN §1 (per-second feedback density).

**Requirements:**
- IIFE `'use strict'` pattern, exposed as `window.WG.HuntFXNumbers`
- API: `WG.HuntFXNumbers.spawn(worldX, worldY, text, opts)` where opts = `{ color, size, duration, velocity }`
- Default duration: 700ms. Default velocity: -32 px/s (drift up). Default color: `#fff8d8`
- Easing: opacity easeOutQuad over duration, scale 1→1.15 in first 80ms then 1.15→0.95 over rest
- Particle list lives in module-local array; per-frame tick + draw functions exposed
- `WG.HuntFXNumbers.tick(dt)` and `WG.HuntFXNumbers.draw(ctx, w2sFn)` — called from hunt-render's drawFrame
- Subscribe to engine events on init():
  - `stump:hit` → spawn `+1` (color `#c89058` wood-tint) at the stump position
  - `stump:chopped` → spawn `+2` (color `#ffd870` coin-tint) at the stump
  - `enemy:killed` → spawn damage value (creature.lastDamage if present, else `+10`) (color `#ffe888`)
  - `boss:damaged` → spawn damage value with size 1.4× (color `#ffaa44`)
  - `player:level` → spawn `LEVEL UP!` at player (color `#80f0ff`, size 1.5×, duration 1500ms)
  - `pickup:coin` (if exists) and `relic:fragment-pickup` → spawn small `+N` per pickup type
- Wire into `hunt-render.js` drawFrame so `tick(dt)` and `draw(ctx, w2s)` are called inside the world-scale block (after sprites, before HUD)
- Add `<script src="js/hunt/hunt-fxnumbers.js?v=...">` to `index.html` MODULES list, between `hunt-render.js` and `hunt-tutorial.js`
- Update `STATE_OF_BUILD.md` with the new file

Verification: `node --check js/hunt/hunt-fxnumbers.js && grep "HuntFXNumbers" js/hunt/hunt-render.js index.html`

### Concern B — HUD counter pulse on increment

DOPAMINE_DESIGN §1 + §2: "Counter pulse — HUD counters (wood/gold/XP) scale-bounce + tint on increment."

In `hunt-render.js drawHud()`, the wood + gold + XP counters need to remember their last-rendered value and pulse when it increases.

**Implementation:**
- Module-local cache: `_hudPulse = { wood: { val:0, ts:0 }, gold: { val:0, ts:0 }, xp: { val:0, ts:0 } }` (use `performance.now()` for ts)
- Each frame in drawHud, compare `runtime.runWood || 0`, the in-stage gold (whatever the source is), and `p.xp` to cache
- If new > cached: update cache.val, set cache.ts = `performance.now()`
- When drawing each counter, compute pulse phase from `(performance.now() - cache.ts) / 280`:
  - phase < 1: scale = 1 + 0.35 * Math.sin(phase * Math.PI), tint = mix base color toward `#ffe888` by (1 - phase)
  - phase ≥ 1: normal scale + color
- Apply scale via `ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy); …draw text…; ctx.restore();`

Add a `WG.Engine.emit('hud:pulse', {key})` for any module that wants to manually trigger a pulse without a value change.

Verification: `node --check js/hunt/hunt-render.js && grep "_hudPulse" js/hunt/hunt-render.js`

### Concern C — Marker

Write `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/workers/done/W-FX-Numbers-And-Pulse.done`:

```
W-FX-Numbers-And-Pulse — DONE — <ISO timestamp>
Files: js/hunt/hunt-fxnumbers.js (new), js/hunt/hunt-render.js (HUD pulse), index.html (script load), STATE_OF_BUILD.md
Commits: <A>, <B>
Notes: <surprises, deviations>
```

## Constraints / scope-don't-touch

- Do NOT touch hunt-player.js, hunt-stage.js, hunt-enemies.js, hunt-bosses.js
- Do NOT change game balance — this is pure visual feedback
- Do NOT add screen shake, hit-pause, particles, or any non-numerical FX (those are other workers' scope)
- One concern per commit
- All numerical tunables (durations, scales, colors) inline at top of hunt-fxnumbers.js as named constants

## Voice

Terse. Match codebase style. No fluff comments — just cite DOPAMINE_DESIGN section per inline comment where the parameter came from.
