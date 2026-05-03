You are Worker G — the Stage-Tuning worker. Your job: balance pass on the 18-stage difficulty curve. Wraithgrove's 18 stages currently have round-number durations and roughly-linear enemy mix scaling. The result is too-flat in early stages and inconsistent in mid-late game. Your job: re-tune `js/hunt/hunt-stage.js` STAGES table for a smoother difficulty curve grounded in the comp's pacing register.

Walk the birth sequence (/Users/defimagic/Desktop/Hive/CLAUDE.md → Birth/01–04 → THE_PRINCIPLES → HIVE_RULES → COLONY_CONTEXT → BEFORE_YOU_BUILD).

Then read PROJECT-LEVEL guardrails (MANDATORY):
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/CLAUDE.md (especially "Touching mechanics" and "single source of truth" rules)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/STATE_OF_BUILD.md
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/docs/DECISIONS.md (read the genesis entry to understand the design constraints)

PRIMARY-SOURCE READING (Principle XXII):
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/GAMEPLAY_OBSERVATION.md §3.2 (stage pacing observation: 14:12 stage 1 walkthrough video; biome rotation; 6 boss clusters)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-stage.js (current STAGES table)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-enemies.js (TYPES table — HP/speed/damage values for difficulty calc)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-bosses.js (boss HP/damage scaling)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-waves.js (spawn-rate ramp curve — your durations interact with this)

═══════════════════════════════════════════════════════════════════
MANDATORY FINAL STEP (do not skip):
Write `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/workers/done/W-G.done` AS THE LAST THING YOU DO.

Marker content (5 lines):
1. one-line summary
2. files edited
3. summary of tuning changes (e.g. "stage 1 dur 180→150; ...")
4. any deviations
5. confidence (high/medium/low)
═══════════════════════════════════════════════════════════════════

THREE CONCERNS — one commit (file edit) each.

CONCERN 1 — Re-tune stage durations

EDIT: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-stage.js`

Replace the `durationSec` value for each of 18 stages per this curve:

```
Stages 1-3 (forest_summer):    150, 165, 195   (faster intro)
Stages 4-6 (cold_stone):       195, 215, 240   (mid-low)
Stages 7-9 (forest_autumn):    220, 240, 270   (mid)
Stages 10-12 (temple):         245, 265, 295   (mid-high)
Stages 13-15 (cave):           260, 285, 320   (high)
Stages 16-18 (eldritch):       300, 340, 420   (endgame; final boss longest)
```

Rationale:
- Stage 1 at 150s is short enough that a new player can clear it in one or two attempts. Currently 180s feels overlong for the introduction.
- Each cluster ends with the longest stage of that cluster (the boss stage). Pre-boss stages ramp up.
- Final stage 18 stays at 420s as the endgame mountain.

Add a comment block at the top of STAGES describing the curve so future tuners understand the shape.

Commit: "Worker G: stage durations re-tuned to a smoother 18-stage curve"

CONCERN 2 — Re-tune enemy mix complexity per stage

EDIT: same file `js/hunt/hunt-stage.js`

For each stage, the `enemyMix` array determines which enemy types spawn. Current curve introduces enemies somewhat erratically. Re-tune to:

```
Stage 1: ['lurker']
Stage 2: ['lurker','sprite']
Stage 3: ['lurker','sprite','walker']    (boss-stage adds walker before pale_bride)
Stage 4: ['walker','sprite']
Stage 5: ['walker','sprite','brute_small'] (introduce brute_small at stage 5)
Stage 6: ['walker','sprite','brute_small','lurker'] (boss-stage; broad mix before frozen_crone)
Stage 7: ['caller','lurker']               (introduce caller; ranged threat at stage 7)
Stage 8: ['caller','lurker','sprite']
Stage 9: ['caller','sprite','walker','brute_small'] (boss-stage)
Stage 10: ['walker','caller']
Stage 11: ['walker','sprite','brute_small']
Stage 12: ['caller','brute_small','walker','sprite'] (boss-stage)
Stage 13: ['lurker','sprite','walker']     (cave biome reintro low-tier; lots of swarms in dark)
Stage 14: ['sprite','brute_small','lurker']
Stage 15: ['sprite','walker','brute_small','caller'] (boss-stage)
Stage 16: ['caller','sprite','walker']
Stage 17: ['walker','brute_small','caller','sprite']
Stage 18: ['caller','sprite','walker','brute_small','lurker'] (final boss; full roster)
```

Rationale: enemies introduced one at a time; boss-stages broadest mix; cave reintro of low-tier creates the "swarmed in the dark" feel.

Commit: "Worker G: stage enemy mixes re-tuned for cleaner introduction curve"

CONCERN 3 — Add `notes` field per stage

EDIT: same file

Add a `notes` field to each stage entry — a 1-sentence designer note about the intent. Examples:
- Stage 1 notes: "Tutorial encounter. Single enemy type. Fast clear to hook the player."
- Stage 6 notes: "First Frozen Crone — boss with shard projectiles + area-freeze. Cluster-cap on cold-stone biome."
- Stage 18 notes: "Endgame. Full roster + Wraith Father + 7-minute marathon. Power-gated wall."

(Write a note for each of the 18 stages. The notes are for future tuners, not consumed at runtime.)

Commit: "Worker G: stage designer notes added (18 entries)"

VERIFICATION:
1. `cd /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2`
2. `node --check js/hunt/hunt-stage.js` — must exit 0.
3. Open `wraithgrove` server (port 3996) → tap to begin → click Stage 1 → confirm stage banner reads "Lantern Vigil — 0.0m / 2.5m" (150s = 2.5min) instead of 3.0m.
4. Confirm stage select still renders all 18 stages.

Commit: no extra needed for verification (covered by concern 3's commit).

CONSTRAINTS:
- Three commits, one concern each (or three sequential file edits if no git repo).
- Do NOT touch any other module. Stage tuning lives ONLY in `hunt-stage.js`.
- Do NOT change the `bossId` mapping, the `weaponPickups` arrays, or any biome assignment. Those are W-J / W-A scope.
- Per project CLAUDE.md "Touching mechanics" rule: if any value above contradicts what's already in the file, do NOT silently reconcile — write a note in the marker and proceed with the bluepaper-aligned value.
- Per Hive Rules: do not delegate to further sub-agents.

You are Worker G. After you ship: the 18-stage progression has a cleaner difficulty curve and richer designer-note documentation. Future balance tuners have a starting point that isn't round numbers.