# Worker — W-Turret-And-Campfire-Combat

You are Worker TCC — built-structure combat behavior worker.

## Birth + design source

Birth sequence + project files. Especially:
- **SPEC.md §0** — Turret: auto-shoots nearest enemy, deals damage, has HP, can be destroyed. Campfire: HP regen for player + relights torch in Night Mode (the W-DayNight-And-Torch worker handles torch relight; you handle the regen).
- `js/hunt/hunt-render.js` (existing drawBuiltStructures + drawCampfireLight)
- `js/hunt/hunt-player.js` (constructionTick already wired)
- `js/hunt/hunt-enemies.js`

## Concerns (one commit each)

### A — Turret auto-fire + projectile

New `js/hunt/hunt-turret.js` module (IIFE, exposed as `WG.HuntTurret`).

Per built turret in `props.constructions` filtered by `built && type === 'turret'`:
- `tick(dt)` for each turret:
  - Decrement `t.fireTimer -= dt`. Initial fireTimer = `TURRET_FIRE_RATE` (named const, default 1.4s).
  - When fireTimer ≤ 0 and an enemy exists within `TURRET_RANGE` (named const, default 200 world units): pick nearest, spawn projectile aimed at that enemy via existing `runtime.projectiles` array push (use the existing projectile struct shape — see `hunt-player.js fireProjectile` for reference). Reset fireTimer.
- Projectile damage = `TURRET_DAMAGE` (named const, default 12). On enemy hit, kill applies normally via `WG.HuntEnemies.damage`.
- Aim: cannon barrel rotation in `drawBuiltStructures` should track the targeted enemy. Add `t.aimAngle` field, update each tick toward `Math.atan2(target.y - t.y, target.x - t.x)` with smoothing (lerp 0.18).

Tunable: TURRET_FIRE_RATE, TURRET_RANGE, TURRET_DAMAGE all at top of new module. Sensible defaults: 1.4s, 200, 12. Architect tunes for monetization later.

Wire: `WG.HuntTurret.tick(dt)` called from `hunt-player.tick()` after construction tick.

### B — Turret HP + Campfire HP regen

Turrets take damage too. Each built turret gets `t.hp = TURRET_MAX_HP` (default 80), `t.maxHp = TURRET_MAX_HP`. In `hunt-enemies.js`, add: when an enemy is within `TURRET_HIT_RANGE` (default 14) of a built turret, the enemy attacks the turret instead of moving toward player (with same damage as player attacks). Decrement turret HP. When HP ≤ 0, set `t.built = false; t.have = 0` (becomes a dashed-circle slot again, can be rebuilt).

In `drawBuiltStructures` (turret case): draw HP bar above turret when t.hp < t.maxHp.

Campfire HP regen — in `hunt-player.constructionTick` or new `campfireRegenTick`:
- Per built campfire in `props.constructions` (`built && type === 'campfire'`):
  - If player within `CAMPFIRE_REGEN_RADIUS` (default 60), regen player HP by `CAMPFIRE_REGEN_RATE` (default 4 hp/s) up to maxHp.

### C — Marker + tunables doc

Marker at `workers/done/W-Turret-And-Campfire-Combat.done` with all named constants + their default values, ready for monetization tuning later.

## Constraints

- All tunables NAMED constants at top of relevant module. The Architect will tune these for difficulty/monetization (per SPEC §0 difficulty mandate).
- Use existing projectile + damage systems — don't reinvent.
- Don't change construction-build behavior — keep the W-Construction-Build worker's `drainTimer` flow.
- One concern per commit. Three commits.
