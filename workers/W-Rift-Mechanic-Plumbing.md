# W-Rift-Mechanic-Plumbing

You are Worker — the **rift mechanic plumbing** worker.

Walk the birth sequence + read `build-v2/CLAUDE.md`, `docs/HORROR_DIRECTION_v1.md` (LOCKED design doc — read it carefully, especially §3 Cross-IP Framework), `js/relics/relics-catalog.js`, `js/hunt/hunt-stage.js`, `js/hunt/hunt-pickups.js`.

## Architect 2026-05-02

Per `HORROR_DIRECTION_v1.md`, cross-IP unlocks happen via "rift intrusions" — the eldritch tier (stages 16-18) is where the boundary tears and characters from other Hive products bleed through. Ship the mechanic plumbed but with NO announced guest yet — Ysabel reveal gates on KingshotPro real-user launch.

## Concerns

### Concern A — Rift Sigil item

Add to `js/relics/relics-catalog.js`:
- Id: `rift_sigil`
- Tier: legendary (rarest tier we have)
- Drop only from eldritch boss (stage 18) and rarely from eldritch stage clears (1% per clear).
- Effect: collecting 3 unlocks the next available rift-guest slot in the Ascend tab.
- Icon: violet sigil with crackling tech-pixel edge (canvas draw — small, 24×24, deferred to render worker).

### Concern B — Drop table

In `js/hunt/hunt-pickups.js` (or wherever drops resolve), add the `rift_sigil` to the eldritch-tier drop pool. Tunables:
- `RIFT_SIGIL_DROP_RATE_BOSS = 1.0` (Wraith Father always drops 1)
- `RIFT_SIGIL_DROP_RATE_STAGE_CLEAR = 0.01` (1% per eldritch stage clear)
- Frozen on `WG.HuntPickups.RIFT_TUNABLES`.

### Concern C — Rift slot UI (placeholder)

In Ascend tab, add a "Rift Guests" section (collapsible, default-collapsed).
- Empty state: "The boundary is intact. Collect Rift Sigils from eldritch stages."
- One slot visible (greyed): "??? — locked. Reveal pending."
- Show sigil count progress: "0/3 Sigils".
- DO NOT name Ysabel anywhere. The slot stays "???" until Architect ratifies the reveal.

## Constraints

- No mechanic balance change to existing relics or stages.
- No commitment to a specific guest character.
- The system must be inert if the player never collects a sigil — zero performance impact.

## Done marker

`workers/done/W-Rift-Mechanic-Plumbing.done` with the tunable values + drop rates + the "??? slot" UI screenshot description.
