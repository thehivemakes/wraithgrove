# Worker — W-Spawn-Tuning

You are Worker ST — increase enemy spawn density + add 2 new enemy types.

Architect 2026-05-02: "we need to have more enemies spawn and different types."

## Birth + design source

- SPEC.md §0 (difficulty mandate, Night Mode register)
- `hunt-enemies.js` (TYPES catalog), `hunt-waves.js` (spawn logic + per-wave rate), `hunt-stage.js` (per-stage enemyMix)

## Concerns (one commit each)

### A — 2 new enemy types + sprites

Add to `hunt-enemies.js TYPES`:

```js
wraith_fast: {
  name: 'Wraith Stalker', hp: 18, damage: 7, speed: 140, size: 14, xp: 4,
  color: '#404858', accent: '#a8c0e8', ai: 'walker', mode: 'night',
},
skull_swarmer: {
  name: 'Skull Imp', hp: 9, damage: 3, speed: 95, size: 12, xp: 2,
  color: '#e8e0d0', accent: '#3a2010', ai: 'walker', mode: 'both',
  swarmSize: 4,  // wave-spawner releases this many at once when it picks skull_swarmer
},
```

In `hunt-render.js` add sprite draws:
- **Wraith Stalker**: small ghost — pale-blue trailing wisp (no legs, just a fading-tail shape), hollow eyes, drift animation. Faster than walker; harder to land hits on at scale 14.
- **Skull Imp**: small skeletal figure — exposed bone-white skull on dark stick body, jagged teeth. When swarmer spawns it spawns 4 in a tight cluster.

### B — Spawn rate + variety boost

In `hunt-waves.js`:
- Bump `BASE_SPAWN_RATE` (or equivalent) by 1.4× across both modes
- Add wave-tier ramp: `spawnRate *= 1 + (waveIndex * 0.15)` — late waves spawn very fast
- When picking enemy type for spawn: add `wraith_fast` and `skull_swarmer` to night and both pools respectively. `skull_swarmer` should spawn its `swarmSize` in a tight 30-unit cluster.
- Pumpkin-lantern + jiangshi +samurai stay as-is (already in catalog).

In `hunt-stage.js`: update each stage's `enemyMix` array to include the new types. Day stages: add red_zombie + samurai_grunt + skull_swarmer. Night stages: add pumpkin_lantern + jiangshi + wraith_fast + skull_swarmer + (rare) banshee.

### C — Marker

`workers/done/W-Spawn-Tuning.done` with new type IDs + spawn rate multiplier + per-stage mix updates + commits.

## Constraints

- POLISH MANDATE: skull_swarmer cluster-spawn should feel like a CHARGE — small enemies pouring in. Make sure they don't all overlap (jitter spawn positions within 30-unit radius).
- Don't break existing 4 enemy types' tuning.
- One concern per commit. Three commits.
