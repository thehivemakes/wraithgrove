# W-Tutorial-Polish-V2 — Retroactive spec

**Status:** DONE — 5 commits shipped (8f40f51, bfac860, 1acb26c, 85e95f4, 501c37a)
**File:** `js/hunt/hunt-tutorial.js` (modified)
**Note:** This spec was not written before execution. It is a retroactive record created by worker Shim (W-Polish-Gaps-MonV2) on 2026-05-05 to close audit gap #5. The primary-source spec for the original tutorial module is `workers/W-C_Tutorial.md`.

---

## What this worker built

A polish pass on the existing `WG.HuntTutorial` module from W-C_Tutorial. Five concerns, one commit each.

### Concern A — First-time detection migration (commit 8f40f51)
- Added `completedFirstStage` flag to state schema alongside legacy `stage1Seen`.
- `init()` migrates `stage1Seen → completedFirstStage` so returning players who completed under the old system are not re-shown the tutorial.
- `maybeStart()` gates on `completedFirstStage` OR `stage1Seen` for backwards compatibility.

### Concern B — Inline hint callouts replace blocking modal (commit bfac860)
- Removed the 4-step blocking modal from W-C_Tutorial.
- Added 5 floating arrow callouts (no engine pause, no modal-overlay):
  - `MOVE` hint: bottom-left, dismisses after 3s cumulative joystick use.
  - `AUTO-ATTACK` hint: on first creature spawn, dismisses on first swing hit.
  - `ORB` hint: on first orb drop in field, dismisses on `pickup:orb`.
  - `SKILL` hint: after 10s in stage, dismisses on skill use.
  - `ENERGY` hint: shown post-stage if energy < 10, dismisses on modal open.

### Concern C — Stage 1 victory cinematic on first clear (commit 1acb26c)
- Subscribes to `hunt:stage-cleared` for `stageId === 1`.
- 4.2s cinematic: dark overlay fade (500ms) → "STAGE CLEARED" letter-spacing expand (300ms delay) → "WRAITH FATHER AWAITS..." fade-up (900ms delay) → auto-dismiss.
- Fires only once (guarded by `completedFirstStage`).

### Concern D — Persistent SKIP TUTORIAL button (commit 85e95f4)
- Persistent button at `position:absolute; top:106px; right:12px; z-index:116` (below skill button).
- Sets `completedFirstStage = true`, suppresses all active hints immediately.
- Doubles as "suppress" for returning players who cleared their save.

### Concern E — Hint queue + 800ms gap (commit 501c37a)
- `hintQueue[]` + `queueHint()` + `processQueue(dtMs)` replace direct `showHint()` calls.
- Only one hint active at a time; new hints queue, never overlap.
- 800ms gap enforced between hints (set on `dismissActiveHint`).

---

## Files touched
- `js/hunt/hunt-tutorial.js` (sole file)

## Verification
```
node --check js/hunt/hunt-tutorial.js
```

## Constraints (respected)
- No modifications to hunt-player.js, hunt-enemies.js, hunt-stage.js, hunt-waves.js, hunt-bosses.js.
- No mechanics numbers changed.
- Tutorial is non-blocking: hints use overlaid floating callouts, not modal-overlay pattern.
