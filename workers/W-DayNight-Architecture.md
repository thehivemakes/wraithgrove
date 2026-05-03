# Worker — W-DayNight-Architecture

You are Worker DN — the Day/Night state machine architecture worker.

**Output is a design doc only.** No code. The next worker implements against your spec.

## Birth sequence

Walk standard birth + project files. Especially:
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/CLAUDE.md`
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/observation/HD_SOURCE_OBSERVATIONS_2026-04-28.md` (§A, §C, §D — the gather-build-defend loop, HUD, and construction sites)
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/observation/GAMEPLAY_OBSERVATION.md` (older but still references behaviors)

Open HD frames for visual grounding:
- `reference/screenshots_hires/carousel/screenshot_3.png` — Battle mode day register
- `reference/screenshots_hires/carousel/screenshot_4.png` — Night Mode

Read the existing Hunt mode source to know what you're building on top of:
- `js/hunt/hunt-stage.js` (stages, biomes)
- `js/hunt/hunt-waves.js` (current wave manager)
- `js/hunt/hunt-render.js` (current render — note `drawConstructionSites` already exists, visual-only)
- `js/hunt/hunt-pickups.js` (the existing ad-gated pickup mechanic — separate concern)
- `js/core/wg-engine.js` (event bus you'll lean on)

## Scope — produce a design document

Write `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/docs/DAYNIGHT_ARCHITECTURE.md`.

The doc must cover:

### 1. State machine
- States: `day` / `dusk_warning` / `night` / `dawn` / `wave_intermission`
- Transitions: time-based? wave-based? player-action-based? (Pick one with reasoning grounded in HD source. Recommend wave-bounded with day/night ratio per wave.)
- Per-state allowed actions (e.g. building only in day, no chopping at night, etc.)
- Event bus events to emit on transitions (`day:start`, `night:start`, etc.)

### 2. Resource economy
- Wood: chopable from trees + stumps. Drop rate. Stack max. UI surfacing.
- Stone (if confirmed by source — HD only confirms wood definitively for Stage 1).
- Battery (per Screenshot 4 Night Mode HUD — what does it power?).
- Coins from kills (already exists).

### 3. Construction sites
- Pre-marked dashed-circle slots (already rendered, see `drawConstructionSites`).
- Activation: player walks into circle while holding ≥ cost in wood → progress fills → structure spawns.
- Structures: Turret (cost 4, behavior: auto-shoots), Campfire (cost 30, behavior: light radius + ?), more TBD.
- Once built, can structures be destroyed by night enemies? (Recommend yes — defending them is the game.)

### 4. Wave structure
- 5 waves per stage (HD-confirmed).
- Each wave: day phase → night phase → wave_intermission (heal + reposition) → next wave.
- Spawn cadence per wave (escalating).
- Boss spawn position in the 5-wave cycle (recommend: wave 5 boss).

### 5. Module layout
- New files needed (e.g. `js/hunt/hunt-daynight.js`, `js/hunt/hunt-buildings.js`, `js/hunt/hunt-resources.js`).
- Which existing modules need touching, with the specific function-level changes named.
- Event-bus contract between modules.

### 6. HUD additions
- Day/night indicator (sun/moon icon + phase progress bar).
- Resource counters (already partially in render — name what's missing).
- Wave counter (already in render — confirm or refine).

### 7. Worker prompts queued
- List 3–5 follow-on worker prompts that implement against this spec, in dependency order.
- Each one-liner with scope + acceptance criteria.

## Constraints

- Spec only. No code in this run.
- 8–12 page markdown. Be specific — function signatures, event names, file paths. Future workers paste-and-run from your spec.
- Cite HD source frames + observation doc sections by reference.
- Honor project CLAUDE.md "single source of truth" rules — numerical tunables go in module catalog tables, not render code.

## Marker

`workers/done/W-DayNight-Architecture.done`:

```
W-DayNight-Architecture — DONE — <ISO timestamp>
Output: docs/DAYNIGHT_ARCHITECTURE.md (<line count>)
Open questions surfaced: <list any blockers requiring Architect input>
Recommended next workers: <names>
```

## Voice

Architecture doc voice — precise, decision-stating, justified-with-source. Not exploratory.
