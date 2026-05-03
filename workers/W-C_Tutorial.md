You are Worker C — the Tutorial worker. Your job: add a one-time first-play tutorial overlay shown when the player enters Stage 1 for the first time. Critical for D1 retention — without it, new players can't tell that left-half drag is movement and the gold star is a special skill.

Walk the birth sequence (/Users/defimagic/Desktop/Hive/CLAUDE.md → Birth/01–04 → THE_PRINCIPLES → HIVE_RULES → COLONY_CONTEXT → BEFORE_YOU_BUILD).

Then read PROJECT-LEVEL guardrails (MANDATORY):
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/CLAUDE.md
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/STATE_OF_BUILD.md
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/BUILD_PLAN.md

PRIMARY-SOURCE READING (Principle XXII):
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/index.html (the existing modal pattern: `.modal-overlay.show` + `.modal-card` + `.btn` / `.btn.primary` classes; the existing `#hunt-hud` div containing the joystick zone and skill button — your tutorial highlights point at these)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/wg-game.js (the `startHunt(stageId)` function — your `maybeStart` hooks in here; the rAF `frame()` to understand pause integration)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/core/wg-state.js (the state schema — extend with a `tutorial` field on first read if missing)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/meta/meta-ads.js for the modal styling reference (the placeholder ad modal pattern)

THREE CONCERNS — one commit each.

CONCERN 1 — `js/hunt/hunt-tutorial.js` (NEW FILE)

Path: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-tutorial.js`

Module exposes one global: `window.WG.HuntTutorial`. IIFE wrapper. `'use strict'`.

Public API:
```js
WG.HuntTutorial = {
  init(),
  maybeStart(stageId),     // gate logic: only first-time on stage 1
};
```

State integration:
- Inside `init()`, ensure `WG.State.get().tutorial` exists; create with default `{ stage1Seen: false }` if missing.

`maybeStart(stageId)` behavior:
- If `stageId !== 1`, return.
- If `WG.State.get().tutorial.stage1Seen === true`, return.
- Pause the engine: call `WG.Engine.pause()`. Note: this sets `WG.Engine.paused = true`, but the rAF loop in wg-game.js continues — see `frame()` for the actual pause check; verify your pause prevents `WG.HuntPlayer.move/tick` from running. (As of writing: rAF runs unconditionally; the pause flag exists but isn't checked. Coordinate with W-D Hunt-NavFix worker if needed; for this worker, AT MINIMUM emit a custom flag `runtime._tutorialPaused = true` on the active hunt runtime via `WG.Game.huntRuntime` or by reaching into the orchestrator's runtime accessor — if no accessor exists, add `WG.Game.getHuntRuntime()` to wg-game.js as part of CONCERN 2.)
- Show 4-step modal sequence:
  - Step 1: title `Move`, body `Drag the LEFT half of the screen to walk.`, button `NEXT`. Show a small CSS-positioned arrow pointing at the lower-left area of the screen (a div at `position:absolute; left:20px; bottom:120px; width:48px; height:48px;` with an SVG arrow + a CSS `pulse` animation).
  - Step 2: title `Auto-Attack`, body `Your weapon swings on its own. Get close to enemies. Watch your HP bar.`, button `NEXT`.
  - Step 3: title `Skill`, body `Tap the gold star (top-right) for a burst attack. It has a cooldown.`, button `NEXT`. Show an arrow pointing at the skill button: div at `position:absolute; right:80px; top:48px;` with same arrow + pulse.
  - Step 4: title `Survive`, body `Survive 3 minutes. Good luck.`, button `START`.
- Each step replaces the previous modal. The arrow div is added on enter, removed on exit.
- First step has a SKIP button in the top-right of the modal card (small 9px font, opacity 0.6).
- On START or SKIP: dismiss modal, set `WG.State.get().tutorial.stage1Seen = true`, resume the engine via `WG.Engine.resume()` and clear `runtime._tutorialPaused`.

Modal markup pattern (matching existing modals):
```html
<div class="modal-overlay show" id="wg-tut-modal">
  <div class="modal-card" style="max-width: 320px; position: relative;">
    <button class="tut-skip" style="position:absolute;top:8px;right:12px;background:transparent;border:0;color:#a89878;font-size:10px;cursor:pointer;letter-spacing:1px;">SKIP</button>
    <div class="modal-title">Move</div>
    <div class="modal-body">Drag the LEFT half of the screen to walk.</div>
    <div class="modal-btn-row">
      <button class="btn primary tut-next">NEXT</button>
    </div>
  </div>
</div>
```

Arrow indicator markup:
```html
<div class="tut-arrow" id="wg-tut-arrow" style="position:absolute;...;z-index:120;pointer-events:none;">
  <svg viewBox="0 0 48 48" width="48" height="48">
    <polygon points="24,4 44,28 32,28 32,44 16,44 16,28 4,28" fill="#ffd870" stroke="#604020" stroke-width="2"/>
  </svg>
</div>
```

Add a small inline style block via DOM creation OR append a `<style>` tag in `init()` for the pulse animation:
```css
@keyframes tut-pulse { 0%,100%{transform:translateY(0);opacity:0.7;} 50%{transform:translateY(-8px);opacity:1;} }
.tut-arrow { animation: tut-pulse 1.4s infinite ease-in-out; }
```

Commit: "Worker C: hunt-tutorial.js — first-play 4-step tutorial overlay"

CONCERN 2 — Wire tutorial into orchestrator

EDIT: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/index.html`
- Add `'js/hunt/hunt-tutorial.js'` to the `WG.Loader.MODULES` array, AFTER `'js/hunt/hunt-render.js'` and BEFORE `'js/ascend/ascend-character.js'`.

EDIT: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/wg-game.js`
- In `init()` (the async one at the bottom), after `WG.HuntRender.init();` add `WG.HuntTutorial.init();`.
- Inside `startHunt(stageId)`, AFTER the call to `switchTab('hunt')` and the `WG.Engine.emit('hunt:stage-start', { stageId })`, add `WG.HuntTutorial.maybeStart(stageId);`.
- If `WG.Game.getHuntRuntime()` doesn't exist, ADD it to the public API: `function getHuntRuntime(){ return huntRuntime; }` and include `getHuntRuntime` in the exposed `window.WG.Game = {...}` object at the bottom of wg-game.js.

EDIT (if needed for pause integration): `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/wg-game.js`
- Inside `frame()`, in the Hunt-active branch (where movement and tick happen), add an early-bail: `if (huntRuntime && huntRuntime._tutorialPaused) { /* skip movement + creature tick + spawn but still draw */ }`. Render still runs so the player sees the static frame behind the modal. Drop into the post-pause render block (the existing `if (WG.State.get().activeTab === 'hunt' && huntRuntime && huntRuntime.player)` already runs render).

Commit: "Worker C: integrate tutorial into orchestrator startHunt + pause"

CONCERN 3 — Verify in browser

1. `cd /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2`
2. `node --check js/hunt/hunt-tutorial.js`
3. `node --check js/wg-game.js`
4. Open `wraithgrove` server (port 3996) → tap to begin → click Stage 1.
5. Verify Step 1 modal appears with Move title + body + lower-left arrow visible + SKIP button + NEXT.
6. Click NEXT 3 times → Step 4 has START button.
7. Click START → modal dismisses → game resumes.
8. Click HUNT tab → click Stage 1 again → confirm tutorial does NOT re-show (state.tutorial.stage1Seen === true).
9. Eval `WG.State.get().tutorial.stage1Seen = false; WG.Game.startHunt(1);` — confirm tutorial re-shows.
10. Confirm first SKIP click also marks seen and dismisses.

Commit: "Worker C: tutorial verified in browser — close + ship"

CONSTRAINTS:
- One concern per commit. Three commits.
- Do NOT modify any module outside the listed touch-points.
- Do NOT change `wg-state.js` directly — extend the state via mutation in `WG.HuntTutorial.init()`. The schema is documented in CLAUDE.md as a single source; transient extensions are permitted as long as the autosave picks them up (it will, since `wg-cache.js` JSON-stringifies the whole state).
- Tutorial copy is terse — never use marketing voice, never use the comp game's specific text strings.
- Per Hive Rules: do not delegate to further sub-agents.

You are Worker C. After you ship: a fresh install opens, the player taps to begin, picks Stage 1, and gets exactly enough information to play without confusion. The retention bleed for new players who can't figure out the controls is closed.
