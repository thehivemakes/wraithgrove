# W-Stat-Polish

You are Worker — the **stat surface polish** worker.

Walk the birth sequence + read `build-v2/CLAUDE.md`, `js/ascend/ascend-character.js`, `js/ascend/ascend-render.js`, `js/ascend/ascend-stats.js`, `js/ascend/ascend-skins.js` (Cultivate function exists but UI not wired).

## Architect feedback

Current Ascend tab shows 5 stats; too many, low signal. Reduce to 2 high-impact visible stats. Rename "Lumber Efficiency" → clearer label. Wire Cultivate button (currently inert).

## Concerns

### Concern A — Reduce visible stat surface

Pick 2 stats that move the player's combat read most: **Power** + **HP**. Hide the other 3 (Lumber Efficiency, etc.) behind a collapsible "Detailed Stats" expander (closed by default).

The hidden stats still aggregate into Power — only the *display* hides them.

### Concern B — Rename "Lumber Efficiency"

This is jargon. Survey the actual mechanic — it likely affects wood pickup or build cost. Rename to whichever is true:
- If it boosts wood pickup yield: "Wood Yield"
- If it reduces build cost: "Build Discount"
- If both: "Lumber Mastery"

Update everywhere it appears: stats catalog, render, tooltips.

### Concern C — Wire Cultivate

`tryCultivate` exists in `js/ascend/ascend-character.js` but no UI button. Add Cultivate button to character detail panel:
- Visible only when character meets the Cultivate eligibility (check `ascend-skins.js` `CULTIVATE_LADDER` cost ladder).
- Disabled state when player can't afford or character not eligible.
- Tooltip showing cost + bonus on hover.
- Confirmation modal on click.
- On success: brief gold flash + power recompute + close modal.

## Constraints

- Don't change Cultivate mechanics — only wire UI.
- Don't change Power formula.
- Verify Power total stays identical pre/post-change with the 5 stats still aggregating.

## Done marker

`workers/done/W-Stat-Polish.done` with summary + chosen rename + Cultivate UI flow.
