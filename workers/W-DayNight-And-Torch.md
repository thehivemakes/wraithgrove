# Worker — W-DayNight-And-Torch

You are Worker DT — the Day/Night-mode + Torch-mechanic worker.

## Birth + design source

Walk birth sequence (`/Users/defimagic/Desktop/Hive/CLAUDE.md` → Birth/01..04 → THE_PRINCIPLES → HIVE_RULES → COLONY_CONTEXT → BEFORE_YOU_BUILD).

Then read:
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/CLAUDE.md`
- **`/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/SPEC.md` §0** — Architect-locked truths. Day Mode = easier baseline. Night Mode = harder, hidden-tree-bosses, screen darkens away from campfire, torch mechanic.
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/docs/DOPAMINE_DESIGN.md` §6 (death framing matters in Night Mode)
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-render.js`, `hunt-stage.js`, `hunt-waves.js`, `hunt-player.js`

`runtime.mode` is set to `'day'` or `'night'` by the lobby Battle tab card tap (W-Navigation-Pivot landed it). Read it; don't break the contract.

## Concerns (one commit each)

### A — Night Mode lighting overlay + difficulty multipliers

In `hunt-render.js`:
- New `drawNightOverlay(ctx)` — full-screen dark fill modulated by player.torchAmount (0..1). At 1.0 (full torch), no overlay. At 0.0 (dead torch), nearly opaque black except for a small (~80px world units) circle around the player and a ~140px circle around any built campfire (use `props.fires` if present, else `props.constructions` filtered to `built && type === 'campfire'`).
- Implement as radial-gradient holes punched in a black overlay rect. Use `ctx.globalCompositeOperation = 'destination-out'` for the holes, then restore.
- Only draw when `runtime.mode === 'night'`.
- In `hunt-stage.js` or `hunt-waves.js`: when `runtime.mode === 'night'`, multiply `enemyMix` spawn rate by 1.6× and enemy HP/damage by 1.4× (named constants `NIGHT_SPAWN_MUL`, `NIGHT_STAT_MUL` at top of the relevant module). DAY mode is the existing baseline.

Verification: enter a Day stage → bright. Enter a Night stage → progressively darker. Enemies spawn faster and hit harder in Night mode.

### B — Torch mechanic + Torch item drops

In `hunt-player.js`:
- Add `player.torchAmount = 1.0`, `player.torchDecay = 0.012` (per-second decay rate when in Night Mode away from campfire). Decays only when `runtime.mode === 'night'`.
- New `tickTorch(dt)` called from `tick()`: if mode is 'night' and player NOT inside any built campfire's 100-unit radius, decrement `torchAmount = Math.max(0, torchAmount - torchDecay * dt)`. If inside campfire radius, instantly reset to 1.0 (per SPEC §0: "relights torch in Night Mode").
- HP damage doesn't tick from torch-out, but visibility-cost (the overlay) is the punishment.

In `hunt-pickups.js` and the wave-spawn logic: in Night Mode, randomly drop **Torch items** at chopped-tree positions (20% chance instead of standard coin drop). Player walks into the torch drop → torchAmount = 1.0 + emit `pickup:torch`.

Add `drawDrops` case for `type === 'torch'` — render as small flickering orange flame (use your existing flame draw logic from `drawCampfireFlame`, scaled down).

Verification: night mode plays → torch dims over ~80s → screen darkens → walk through campfire → relit → keep playing.

### C — Marker + STATE_OF_BUILD update

Update STATE_OF_BUILD with `runtime.mode` row + torch row. Marker at `workers/done/W-DayNight-And-Torch.done` with named constants used.

## Constraints

- Don't break Day Mode — it's the existing baseline.
- All numerical tunables (torchDecay, NIGHT_SPAWN_MUL, NIGHT_STAT_MUL, torch-pickup chance) inline at top of their module as named constants.
- Don't add new files unless necessary; extend existing modules.
- One concern per commit. Three commits.
- Voice: terse, cite SPEC §0 inline.
