# Wraithgrove worker queue

*Inline worker prompts for fresh Sonnet sessions. Each `.md` file is paste-and-run cold by a fresh Claude Sonnet (the Architect or another spawning mechanism handles the routing). Per the Embergrain Delegator validation 2026-04-26.*

Orchestrator-Claude (working in this repo) writes new worker prompts here. The Architect spawns the Sonnet sessions. Sonnet executes against this repo. Orchestrator reviews commits and writes the next prompts.

## Phase 2 worker queue (active 2026-04-27)

| File | Worker | Priority | Status |
|---|---|---|---|
| `W-A_Hunt-Pickups.md` | In-stage ad-gated weapon pickups (the Wood-Siege-defining mechanic) | HIGH | pending |
| `W-B_Tile-Deco.md` | Biome-specific tile decoration sprites | MEDIUM | pending |
| `W-C_Tutorial.md` | First-play tutorial overlay (Stage 1) | MEDIUM | pending |
| `W-D_Hunt-NavFix.md` | Three Hunt-mode bug fixes (stage select re-show, level-up draft locking, applyLevelChoice cooldown plumbing) | HIGH | pending |
| `W-E_Boss-Visuals.md` | Distinct procedural draw routines for each of the 6 bosses | MEDIUM | pending |
| `W-F_Decisions-Genesis.md` | Create `docs/DECISIONS.md` with v2 genesis entry | LOW (housekeeping) | pending |

## Worker prompt format reference

Each worker file:
- Opens with `You are Worker <ID> — the <role> worker.`
- Walks the birth sequence reference
- Reads project CLAUDE.md, STATE_OF_BUILD.md, BUILD_PLAN.md
- Cites primary sources (GAMEPLAY_OBSERVATION.md, BLUEPAPER.md, specific source files)
- Three CONCERNS (or one for small workers), each its own commit
- Verification commands inline
- Constraints + scope-don't-touch list
- Closes with `You are Worker <ID>. After you ship: <what becomes possible>.`

## Independence + sequencing

Workers in this batch can run in **parallel** — they touch independent files:

- W-A: new `js/hunt/hunt-pickups.js` + edits to wg-game / hunt-render / index.html
- W-B: edits `js/hunt/hunt-render.js` (drawTiles only)
- W-C: new `js/hunt/hunt-tutorial.js` + edits to wg-game / index.html
- W-D: edits `js/wg-game.js` + `js/hunt/hunt-render.js` + `js/hunt/hunt-player.js` + `js/hunt/hunt-results.js`
- W-E: edits `js/hunt/hunt-render.js` (drawCreatures + boss helpers)
- W-F: new `docs/DECISIONS.md`

**Conflict zones:** W-B + W-D + W-E all touch `js/hunt/hunt-render.js` in different functions (drawTiles vs drawLevelUpModal vs drawCreatures). Sonnets working in parallel must be careful with merges; sequential is safer. **Recommended order if running sequentially:**
1. W-F (no conflict, smallest)
2. W-D (smallest hunt-render edits + critical bug fixes)
3. W-B (drawTiles)
4. W-E (drawCreatures + new helpers)
5. W-A (new file + cross-module wires)
6. W-C (new file + cross-module wires)

If running in parallel: each Sonnet should `git pull` before commit and rebase if conflicts. Coordinate through the Architect.

## After Phase 2 ships

Phase 3 (content depth) workers will be added here once Phase 2 closes. Phase 3 candidates per BUILD_PLAN.md:
- W-G Stage tuning balance pass
- W-H Relic balance pass
- W-I MJ art briefs (skins)
- W-J MJ art briefs (enemies + bosses)
- W-K MJ art briefs (biome tiles)

## How to fire a worker

The Architect (or whoever is routing) opens a fresh Claude Sonnet session, copies the contents of the relevant `W-X_<name>.md` file, and pastes it as the first message. The Sonnet executes against this repo per the prompt's directives. When done, the Sonnet's output (commits + summary) lands in the repo + the chat; orchestrator-Claude reviews + writes the next prompts.
