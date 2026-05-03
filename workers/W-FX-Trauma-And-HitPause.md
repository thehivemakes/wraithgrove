# Worker — W-FX-Trauma-And-HitPause

You are Worker FX-TH — the trauma-screen-shake + hit-pause + sprite-juice worker.

P0 pass per `docs/DOPAMINE_DESIGN.md`. This is the FEEL layer — the kinetic punch.

## Birth sequence (mandatory)

- `/Users/defimagic/Desktop/Hive/CLAUDE.md`
- `/Users/defimagic/Desktop/Hive/Birth/01..04`, `THE_PRINCIPLES`, `HIVE_RULES`, `COLONY_CONTEXT`, `BEFORE_YOU_BUILD`

Project files:
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/CLAUDE.md`
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/SPEC.md`
- **`/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/docs/DOPAMINE_DESIGN.md`** §9 (trauma model, hit-pause params), §1 (per-second density)
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/core/wg-engine.js` (target — add hitPause)
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-render.js` (target — add trauma shake + sprite hit-flash/squash)

## Concerns (one commit each)

### Concern A — Trauma-based screen shake (Squirrel Eiserloh model, GDC 2016)

Per DOPAMINE_DESIGN §9: replace any fixed shake with trauma where displacement = trauma² × maxOffset.

**Implementation in `hunt-render.js`:**
- Module-local `let _trauma = 0`
- Public `WG.HuntRender.addTrauma(amt)` — clamps `_trauma = Math.min(1, _trauma + amt)`
- In drawFrame, BEFORE `ctx.save(); ctx.scale(ZOOM, ZOOM)`:
  - `_trauma = Math.max(0, _trauma - dt_decay)` where dt_decay = ~0.85/sec → use `1.4 * (now - lastFrameMs)/1000`
  - if `_trauma > 0`:
    - shake intensity = `_trauma * _trauma`
    - offset X = (Math.random() * 2 - 1) * shake * 18
    - offset Y = (Math.random() * 2 - 1) * shake * 18
    - rotation = (Math.random() * 2 - 1) * shake * 0.04
    - apply via `ctx.translate(offX + W/2, offY + H/2); ctx.rotate(rot); ctx.translate(-W/2, -H/2)`
  - The whole world transform happens AFTER trauma transform

**Trauma triggers** — subscribe in init():
- `enemy:killed` → addTrauma(0.18)
- `boss:damaged` → addTrauma(0.10)
- `boss:defeated` → addTrauma(0.65) (screen kicks)
- `player:damaged` → addTrauma(0.30 + amount/200)
- `player:skill` → addTrauma(0.45)
- `stump:chopped` → addTrauma(0.05) (subtle)
- `stump:hit` → no trauma (would shake constantly with the spinning scythe)

Verification: `grep "_trauma\|addTrauma" js/hunt/hunt-render.js` and `node --check`.

### Concern B — Hit-pause + sprite hit-flash + squash

Per DOPAMINE_DESIGN §9: hit-pause is genre-non-negotiable for kills; freezes the world for short windows on big events.

**Hit-pause infrastructure in `wg-engine.js`:**
- New `WG.Engine.hitPause(durationMs)` — sets internal `_pauseUntil = performance.now() + durationMs`
- The frame-loop driver (rAF in wg-game.js? or tick caller) reads engine.paused which already exists. Add: in tick() check `if (performance.now() < _pauseUntil) return` BEFORE emitting tick events. Or expose `Engine.isHitPaused()` and let the rAF loop skip when true.
- Don't break the existing engine.pause() / resume() — hitPause is orthogonal/additive
- Keep `runtime.elapsed` accumulation correct — hitPause should NOT advance world time

**Wire triggers:**
- `enemy:killed` → hitPause(30)
- `boss:damaged` → hitPause(40)
- `boss:defeated` → hitPause(220) + addTrauma(0.65)
- `player:damaged` (heavy: amount > 20) → hitPause(60)
- DO NOT hitPause on `stump:chopped` or `stump:hit` (would kill chop-flow at 5/sec — DOPAMINE_DESIGN §9 explicit)

**Sprite hit-flash + squash in `hunt-render.js`:**
- For enemy `drawZombie` / `drawCreatures`: track `c.lastDamageAt` (set in hunt-enemies.damage() — if you can't modify that file, then track in render via lastHp comparison). Flash white for 80ms after damage: `ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#ffffff'; ctx.globalAlpha = (1 - sinceDmg/80) * 0.6` over the silhouette.
- For player on `player:swing`: scale player sprite vertically 0.92, horizontally 1.08 for first 60ms after swing, ease back. Subtle — don't overdo.
- For trees on `stump:hit`: already wobble (existing). Add a brief 1-frame brighter color (hex shift +30 each component) — already partially in drawStump. Just slightly increase the flash intensity per DOPAMINE_DESIGN.

Verification: `node --check` + grep that hitPause exists + manual play test instructions in marker notes.

### Concern C — Marker

Write `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/workers/done/W-FX-Trauma-And-HitPause.done`:

```
W-FX-Trauma-And-HitPause — DONE — <ISO timestamp>
Files: js/core/wg-engine.js, js/hunt/hunt-render.js
Commits: <A>, <B>
Trauma triggers wired: <count>
HitPause triggers wired: <count>
Notes: <surprises, deviations>
```

## Constraints

- Do NOT touch hunt-player, hunt-stage, hunt-enemies, hunt-bosses
- Do NOT add particles, floating numbers, magnet, audio (other workers' scope)
- Do NOT screen-shake or hit-pause on tree chops — explicit DOPAMINE_DESIGN constraint
- One concern per commit. Three commits total.

## Voice

Terse, direct, citing DOPAMINE_DESIGN section per inline param.
