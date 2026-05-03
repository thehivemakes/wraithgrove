# W-Audit-Menu-Banshee-Repair-Spawn

You are Worker — the **multi-batch audit** worker. Read-only — no code changes.

Walk the birth sequence + read `build-v2/CLAUDE.md`, recent done markers in `workers/done/`: W-Banshee-Enemy, W-Building-Repair, W-Spawn-Tuning, W-Hunt-Menu-Hero-Redesign (look for it; menu was rewritten inline by orchestrator), W-Menu-Art-Pass.

## Audit scope

Verify these landed batches are clean:
1. Banshee enemy (catalog entry, AI branch, render, shriek event)
2. Building Repair (hover detection, wood drain, HP regen, FX, audio)
3. Spawn Tuning (rate ×1.4, wraith_fast + skull_swarmer added to all 18 stages)
4. Hero menu redesign (single-tile carousel, lock progression, side icons, BATTLE button, Day/Night pills)
5. Painterly menu art (6 biome painters, character canvas, vignette, BATTLE pulse, rAF lifecycle)

## Audit checklist (per batch)

- §A Static checks: `node --check` all touched .js files
- §B Marker integrity: done marker exists + content matches actual code
- §C Catalog consistency: tunables not hardcoded in render/UI
- §D Performance: no rAF leaks, no event-listener leaks, particle pool bounded
- §E Balance: spawn ramp + Banshee HP pinned to spec
- §F Failure modes: locked stage handling, HP-zero turret repair guard, menu-while-in-stage guard

## Deliverable

Write `audits/AUDIT_Menu_Banshee_Repair_Spawn_<timestamp>.md` with PASS / FAIL per item + any polish gaps surfaced.

If audit FAILS any §A-§F: write `workers/AUDIT_FAIL.flag` with brief reason.

## Done marker

`workers/done/W-Audit-Menu-Banshee-Repair-Spawn.done` summarizing verdict + link to audit doc.

NO CODE CHANGES.
