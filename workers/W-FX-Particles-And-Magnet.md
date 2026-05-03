# Worker — W-FX-Particles-And-Magnet

You are Worker FX-PM — particle-pool + pickup-magnet-tune worker.

P0 closure per `docs/DOPAMINE_DESIGN.md`. The pickup-flow + particle layer.

## Birth sequence (mandatory)

- `/Users/defimagic/Desktop/Hive/CLAUDE.md`
- Birth/01..04, THE_PRINCIPLES, HIVE_RULES, COLONY_CONTEXT, BEFORE_YOU_BUILD

Project files:
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/CLAUDE.md`
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/SPEC.md`
- **`/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/docs/DOPAMINE_DESIGN.md`** §1 (per-second density), §2 (loot stacking + magnet table)
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-render.js` (existing particle system at `WG.Render.spawnParticles`)
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-pickups.js` (target — magnet tune)
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-player.js` (existing pickupTick + magnet logic)

## Concerns (one commit each)

### Concern A — `js/hunt/hunt-fx.js` new dedicated FX module

Per DOPAMINE_DESIGN §1+§9: pooled particle bursts on key events with type-specific signatures.

**Module structure:**
- IIFE `'use strict'`, exposed as `window.WG.HuntFX`
- Pool of ~200 reusable particle objects (avoid GC stutter — per design doc)
- API:
  - `WG.HuntFX.burst(worldX, worldY, type, opts)` — type ∈ `{chopChip, enemyHit, enemyKill, pickupCoin, pickupOrb, pickupFragment, levelUp, bossKill}`
  - `WG.HuntFX.tick(dt)` and `WG.HuntFX.draw(ctx, w2sFn)` — called from hunt-render drawFrame inside world-scale block
- Per-type defaults (read DOPAMINE_DESIGN §1 + §9 for params):
  - **chopChip**: 5 particles, brown `#c89058 / #5a3010`, life 0.45s, speed 80-140
  - **enemyHit**: 3 particles, red `#ff4040`, life 0.3s, speed 50-80, low gravity
  - **enemyKill**: 12 particles, red+yellow split, life 0.7s, speed 100-200, mild gravity
  - **pickupCoin**: 4 sparkles `#ffe888`, life 0.4s, radial outward → magnet snap to player after 80ms
  - **pickupOrb**: 6 cyan particles `#80d0ff`, life 0.5s
  - **pickupFragment**: 8 violet particles `#e0a8ff`, life 0.6s
  - **levelUp**: 24-particle ring around player, gold `#fff0c0`, life 0.8s, speed 80
  - **bossKill**: 30 particles, mixed boss-color, life 1.2s, speed 200, big radial blast
- Subscribe to engine in init():
  - `stump:hit` → burst(s.x, s.y, 'chopChip')
  - `stump:chopped` → burst(s.x, s.y, 'chopChip', {count: 14})
  - `enemy:killed` → burst(creature.x, creature.y, 'enemyKill')
  - `boss:defeated` → burst(boss.x, boss.y, 'bossKill')
  - `pickup:coin/orb/fragment` → respective burst at pickup origin
  - `player:level` → burst(player.x, player.y, 'levelUp')
- Wire into hunt-render drawFrame (tick + draw inside world-scale)
- Add to index.html MODULES list

**Important:** The existing `WG.Render.spawnParticles` calls in hunt-render.js stay for now — don't rip out. New WG.HuntFX layers on top. (Cleanup pass is a separate worker if needed.)

Verification: `node --check js/hunt/hunt-fx.js && grep "HuntFX\." js/hunt/hunt-render.js index.html`

### Concern B — Magnet tuning per DOPAMINE_DESIGN §2

Per design doc §2 ("Loot stacking + accumulation feel"):

| Pickup type | Initial behavior | Magnet behavior |
|---|---|---|
| Wood chunk (stump:chopped → drops) | Pop outward 30-40 px arc, 200ms | Linger 100ms then magnet to player at lerp 0.18 |
| Coin | Pop outward 20px | Magnet immediately, ease-in fast (0.22) |
| Orb | Subtle bobble | Magnet at base radius (existing behavior) |
| Fragment | Slight float | Magnet at base radius |

In `js/hunt/hunt-player.js pickupTick()`, per drop type:
- Add `d._lifetime` accumulator and `d._initVx, d._initVy` for the initial pop velocity
- Adjust the `0.18` lerp constant to per-type values matching the table above
- For wood (new drop type if not exists yet — the stump-chop spawns coin drops currently per existing code, but consider adding a 'wood' drop type variant)

If `hunt-pickups.js` is the right file (separate from hunt-player), modify there instead. Use whichever owns pickup-render + pickup-pickup-logic.

**Critical:** the existing per-pickup ID test in pickupTick (`d.type === 'orb'`, `d.type === 'coin'`, etc.) is the routing point. Do NOT break existing types; ADD a 'wood' type if useful and route to it from stump:chopped event handler.

Verification: chopping a stump should produce a wood-chunk drop that pops outward, hangs briefly, then snaps to player. Player walks over, pickup increments wood counter (with the pulse from W-FX-Numbers-And-Pulse worker — they compose).

### Concern C — Marker

Write `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/workers/done/W-FX-Particles-And-Magnet.done`:

```
W-FX-Particles-And-Magnet — DONE — <ISO timestamp>
Files: js/hunt/hunt-fx.js (new), js/hunt/hunt-player.js (or hunt-pickups.js), index.html, STATE_OF_BUILD.md
Commits: <A>, <B>
Particle types implemented: <count>
Magnet types tuned: <count>
Notes: <deviations>
```

## Constraints

- Do NOT modify hunt-stage, hunt-enemies, hunt-bosses, wg-engine
- Do NOT add screen shake, hit-pause, floating numbers (other workers' scope)
- Do NOT delete `WG.Render.spawnParticles` calls — additive
- Pool size cap 200 — DOPAMINE_DESIGN explicit
- One concern per commit. Three commits.

## Voice

Terse, citing DOPAMINE_DESIGN inline.
