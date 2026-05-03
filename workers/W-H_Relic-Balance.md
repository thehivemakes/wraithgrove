You are Worker H — the Relic-Balance worker. Your job: balance pass on the 48-relic catalog. Wraithgrove's relic stat values were drafted at speed during Phase 1 and don't follow a consistent power curve across rarity tiers. Your job: rewrite the stat values in `js/relics/relics-catalog.js` to enforce a clean inter-tier scaling, with each tier's contribution roughly doubling the previous.

Walk the birth sequence (/Users/defimagic/Desktop/Hive/CLAUDE.md → Birth/01–04 → THE_PRINCIPLES → HIVE_RULES → COLONY_CONTEXT → BEFORE_YOU_BUILD).

Then read PROJECT-LEVEL guardrails (MANDATORY):
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/CLAUDE.md
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/STATE_OF_BUILD.md

PRIMARY-SOURCE READING (Principle XXII):
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/relics/relics-catalog.js (the 48 relics in the RELICS array)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/relics/relics-equip.js (relic equip max = 6; aggregate-bonus computation)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/forge/forge-craft.js (drop-rate distribution per Forge level)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/core/wg-state.js (Power recompute — relic count×2 + level×5 contribution)

═══════════════════════════════════════════════════════════════════
MANDATORY FINAL STEP (do not skip):
Write `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/workers/done/W-H.done` AS THE LAST THING YOU DO.

Marker content (5 lines):
1. one-line summary
2. files edited
3. summary of stat-curve changes (e.g. "common-tier attack 2-5 → 1-3; rare-tier attack 8-12 → 5-9; ...")
4. any deviations
5. confidence (high/medium/low)
═══════════════════════════════════════════════════════════════════

ONE CONCERN — one commit.

CONCERN — Rewrite RELICS stat values per the curve

EDIT: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/relics/relics-catalog.js`

Apply these stat-value caps per (tier × stat) cell. Each tier roughly doubles the previous:

| stat | common | rare | epic | legendary | mythic |
|---|---|---|---|---|---|
| attack | 1-3 | 5-9 | 14-22 | 38-55 | 110-160 |
| hpMax | 8-15 | 22-32 | 65-95 | 200-260 | 600-800 |
| defense | 1-2 | 4-6 | 11-15 | 28-38 | 90-115 |
| critRate | 0.005-0.015 | 0.018-0.028 | 0.04-0.06 | 0.10-0.14 | 0.25-0.32 |
| gatherRate | 0.015-0.030 | 0.045-0.065 | 0.10-0.14 | 0.25-0.35 | 0.60-0.80 |

Process:
1. For each relic, look at its tier and stat.
2. If its current `value` is OUTSIDE the cell range, replace with a value within the range — pick a value at roughly the relic's relative position within its tier (e.g., the first-listed common-attack relic gets the low end; the last-listed gets the high end).
3. If its current `value` is INSIDE the cell range, leave it alone.
4. Preserve all `id`, `name`, `tier`, `icon`, `stat` fields. Only `value` changes.

Add a comment block above the RELICS array that documents the stat-curve table — so future balance tuners can read the rationale at a glance.

Commit: "Worker H: relic stat values rebalanced — clean tier-doubling curve"

VERIFICATION:
1. `cd /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2`
2. `node --check js/relics/relics-catalog.js`
3. Open `wraithgrove` server → relic tab → confirm 48 relics still display, none missing, rarity counts (Common 12, Rare 12, Epic 12, Legendary 8, Mythic 4) unchanged.
4. Equip a Common relic + an Epic relic → confirm bonus stat shown is consistent with the new curve.

CONSTRAINTS:
- One file edit. One commit.
- Do NOT add or remove relics. Do NOT change tier assignments. Do NOT rename relics. Do NOT change stat-types (attack/hpMax/defense/critRate/gatherRate).
- Per project CLAUDE.md "Single source of truth" — `relics-catalog.js` is the canonical relic table; the rebalance lives ONLY here.
- Per Hive Rules: do not delegate to further sub-agents.

You are Worker H. After you ship: the 48-relic catalog has a clean tier-doubling power curve. Future workers (W-RelicSet-Bonuses) can layer thematic set bonuses on top without contending with chaotic baseline values.