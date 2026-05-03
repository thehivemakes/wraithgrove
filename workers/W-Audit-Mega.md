# Worker — W-Audit-Mega

You are Worker AM — the audit Sonnet for the Day/Night + Enemy Catalog + Turret Combat + Hard Tuning batch.

**Audit-only.** No code changes. Verify functionality of the four predecessor workers and write `audits/AUDIT_BatchBCDE_<timestamp>.md` with PASS/FAIL per item.

## Birth + design source

Birth sequence + read SPEC.md §0 + DOPAMINE_DESIGN.md.

Predecessor markers:
- `workers/done/W-DayNight-And-Torch.done`
- `workers/done/W-Enemy-Catalog.done`
- `workers/done/W-Turret-And-Campfire-Combat.done`
- `workers/done/W-Hard-Tuning-And-Monetization.done`

If any marker missing, fail audit with "PREDECESSOR NOT LANDED" and exit. Don't gate on missing predecessors — write that to the audit file.

## Concerns (one commit each)

### A — Static checks (no runtime needed)

For every modified file in the four batches:
- `node --check js/hunt/hunt-render.js` and every `.js` file in build-v2/js/
- Grep for required artifacts:
  - `runtime.mode` referenced in hunt-stage.js, hunt-waves.js
  - `torchAmount`, `torchDecay` in hunt-player.js
  - 4 new enemy type ids (pumpkin_lantern, jiangshi, samurai_grunt, red_zombie) in hunt-enemies.js
  - `WG.HuntTurret`, TURRET_FIRE_RATE, TURRET_RANGE, TURRET_DAMAGE in hunt-turret.js
  - `WG.Buffs.activate`, damage_x2/wood_x2/instant_turret/revive ids in meta-buffs.js
  - Wave-count scaling 5/10/15 in hunt-stage.js
- index.html MODULES list contains hunt-turret.js + meta-buffs.js (new files must load)

### B — Runtime smoke checks (live build)

- `curl -sS https://defimagic.io/wraithgrove/index.html | grep version:` — verify cache-bust changed
- `curl -sS https://defimagic.io/wraithgrove/js/hunt/hunt-turret.js` — should return file content not 404
- Same for any other new files

### C — Write audit doc + marker

Write `audits/AUDIT_BatchBCDE_<ISO timestamp>.md` with:
- PASS/FAIL per item from §A
- PASS/FAIL per smoke check
- "Manual test items" — bullet list of in-browser verifications the Architect should run (Day mode plays, Night mode darkens, torch dims, pumpkin spawns at night, turret shoots, campfire regens, ad-revive button on death modal)
- Any deviations or warnings flagged

Marker at `workers/done/W-Audit-Mega.done`. If any FAIL, also write a `workers/AUDIT_FAIL.flag` empty file to signal the orchestrator to halt next batch.

## Constraints

- DO NOT modify any js/ or audio/ files. Read-only audit.
- Audit doc must be specific — quote the failed grep + line, name the file + line.
- Three commits: A static checks doc, B runtime smoke results, C final audit doc + marker.
