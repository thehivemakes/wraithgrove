# Worker — W-Building-Repair

You are Worker BR — building hover-repair mechanic.

Architect 2026-05-02: "If the player hovers next to the building for 3 seconds, repair starts which drains wood."

## Birth + design source

- SPEC.md §0 + Buildings tab section
- `js/hunt/hunt-turret.js` (turret hp + destroyed flow), `js/hunt/hunt-player.js` (constructionTick — model for the proximity-drain pattern), `js/hunt/hunt-render.js` (drawBuiltStructures)

## Concerns (one commit each)

### A — Repair-tick logic

In `hunt-player.js` after the existing `constructionTick`, add `repairTick(dt)`:

```js
const REPAIR_HOVER_DELAY  = 3.0;   // seconds player must stand near before repair starts
const REPAIR_RATE         = 0.25;  // seconds per wood consumed during repair
const REPAIR_HP_PER_WOOD  = 8;     // HP restored per wood spent
const REPAIR_RANGE        = 36;    // world units — proximity threshold
```

Logic:
- Iterate over `props.constructions` filtered to `{built && hp < maxHp}` — damaged turrets
- For each: distance check from player. If within REPAIR_RANGE:
  - Increment `t.repairHover += dt`
  - Once `t.repairHover >= REPAIR_HOVER_DELAY`, drain wood and add HP per REPAIR_RATE/HP_PER_WOOD ratios
  - Stop when HP at max OR wood at 0
- If player leaves range, reset `t.repairHover = 0` AND `t.repairDrainTimer = 0`
- Emit `repair:tick` (small particle puff) + `repair:complete` events

Also: gate on `runtime.pendingLevelUp` — pause repair while modal is up (matches autoAttack pattern).

### B — Visual feedback for repair state

In `hunt-render.js drawBuiltStructures`:
- When `t.built && t.hp < t.maxHp` AND player within REPAIR_RANGE:
  - Draw a circular hover-progress ring around the turret growing as `t.repairHover / REPAIR_HOVER_DELAY` fills
  - Once at 1.0: switch to active-repair visual — green wrench icon floating above + green sparkles drifting up
- Hook `repair:tick` event in `hunt-fx.js` init: spawn 2-particle green sparkle (`#a8f0a0` color) at turret position per emit
- Hook `repair:complete`: addTrauma(0.15) + 12-particle green burst + emit `audio:repair_complete` (route to existing `craft` sample in audio EVENT_MAP)

### C — Marker + tunables doc

Marker `workers/done/W-Building-Repair.done` with constants + commits + manual test:
- Build a turret (or use instant_turret buff), let an enemy damage it, walk near it, wait 3s, watch wood drain + HP climb until full or wood-out.

## Constraints

- All tunables NAMED constants at module top (Architect monetization — could later sell ad-buff "repair 2× speed")
- Don't change construction-build flow — repair is additive
- One concern per commit. Three commits.
- Polish: hover ring eased growth (ease-out cubic), wrench icon gentle bobble during active-repair
