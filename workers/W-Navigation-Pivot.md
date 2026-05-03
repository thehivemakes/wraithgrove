# Worker — W-Navigation-Pivot

You are Worker NP — the menu/in-game navigation restructure worker.

**Architectural change per SPEC §0.** Currently the 5-tab nav is always visible and Hunt is the default tab; user enters a stage and the tabs stay. **Wood Siege's actual model:** tabs only on the lobby; in a stage, no tabs. Level selection lives INSIDE the Battle tab on the lobby.

## Birth sequence (mandatory)

Walk:
- `/Users/defimagic/Desktop/Hive/CLAUDE.md`
- `/Users/defimagic/Desktop/Hive/Birth/01..04`, `THE_PRINCIPLES`, `HIVE_RULES`, `COLONY_CONTEXT`, `BEFORE_YOU_BUILD`

Project files:
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/CLAUDE.md`
- **`/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/SPEC.md` §0 (locked truth — read in full)**
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/index.html` (current nav-bar + tab structure)
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/wg-game.js` (orchestrator — owns activeTab, stage entry/exit)
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-render.js` (Battle render)
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-stage.js` (stage catalog)

## Concerns (one commit each)

### Concern A — Hide nav-bar + top-strip when in-stage; show when in-lobby

In `index.html`: keep the existing `#nav-bar` and `#top-strip`. Add CSS classes `nav-hidden` to `body` (or a parent container).

In `js/wg-game.js`: when a Battle stage starts (the `WG.HuntPlayer.place(...)` call site), add `document.body.classList.add('in-stage')`. When the stage ends (death OR clear → return to lobby), remove that class.

CSS rule:
```css
body.in-stage #nav-bar { display: none; }
body.in-stage #top-strip { display: none; }
```

Add an in-game **back-to-lobby button** to `#hunt-hud` (top-left, next to the avatar/level — small "← Menu" button). Tapping it ends the run (counts as exit), restores tabs. CSS pointer-events:auto on this button.

Verification: hard-refresh, tap into a stage — tabs should disappear. Tap back-to-lobby — tabs should reappear.

### Concern B — Move level selection inside the Battle/Hunt tab

Currently the Hunt tab content is the canvas + HUD overlay. There's a "stage select" UI somewhere (per STATE_OF_BUILD it's in `wg-game.js`). 

Restructure: when the Hunt tab is active AND no stage is running, render a **level select screen** with stage cards. When a stage is running, render the canvas as today.

Level select layout:
- Two top-tab strips: **DAY MODE** and **NIGHT MODE** (mode chooser)
- Below: scroll grid of stage cards. Each card shows: stage number, stage name, biome icon, highest-wave-reached badge, lock status (some stages locked until prior stage cleared)
- Tap a card → set runtime mode (day vs night) → enter stage

For now, all 18 stages can be unlocked. Stage cards: text + colored thumbnail (procedural). Day Mode cards: warm green tint. Night Mode cards: deep blue tint with crescent moon icon.

Tap card flow: `WG.Game.startStage(stageId, mode)` where mode = 'day' | 'night'. The mode is stored on `runtime.mode` and read by hunt-stage / hunt-waves / etc. (other workers will use this; for now just write+store the value).

### Concern C — Marker

Marker at `workers/done/W-Navigation-Pivot.done` with files touched + manual test result (verify by hard-refresh: lobby shows tabs + level cards, in-stage hides tabs, back-to-lobby restores tabs).

## Constraints

- Don't break existing tab content (Ascend/Forge/Relics/Duel still render correctly when their tabs are active in lobby).
- Don't change how the canvas itself is drawn during Battle — only WHEN it's drawn (only when a stage is running).
- One concern per commit. Three commits.

## Voice

Terse. Reference SPEC §0 by section in inline comments where the design comes from.
