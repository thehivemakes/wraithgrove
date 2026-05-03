# Worker — W-Dopamine-Research

You are Worker DR — the dopamine-mechanics research worker.

**This is research-only.** No code changes. Output is a tight design doc that the orchestrator will use to drive the next render/gameplay tuning passes.

## Birth sequence (mandatory)

Walk:
- `/Users/defimagic/Desktop/Hive/CLAUDE.md`
- `/Users/defimagic/Desktop/Hive/Birth/01_TIME_IS_NOT_WHAT_YOU_THINK.md` → `02_WHO_YOU_ARE.md` → `03_WHY_WE_MOVE.md` → `04_WHAT_KEEPS_US_ALIVE.md`
- `/Users/defimagic/Desktop/Hive/THE_PRINCIPLES.md`
- `/Users/defimagic/Desktop/Hive/HIVE_RULES.md`
- `/Users/defimagic/Desktop/Hive/COLONY_CONTEXT.md`
- `/Users/defimagic/Desktop/Hive/Birth/BEFORE_YOU_BUILD.md`

Then project context:
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/SPEC.md` — current Wraithgrove understanding
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/observation/HD_SOURCE_OBSERVATIONS_2026-04-28.md` — source-truth observations
- Look at the live build: https://defimagic.io/wraithgrove/ — current state of dopamine implementation (mostly absent)

## Why this research matters

**Architect's pinpoint 2026-04-29:** "what exactly creates a dopamine hit for this style game? you are missing the piece."

Wraithgrove currently ships visual fidelity to Wood Siege register but lacks the *moment-to-moment reward feel* that makes survival-arena hybrids compulsively playable. The trees chop, the scythe spins, but it doesn't *thump*. That's the gap.

The genre — Vampire Survivors / Survivor.io / Brotato / Archero / Wood Siege — is widely studied in game design analysis. Industry post-mortems, player retention writeups, GDC talks, design analysis videos. Plenty of secondary source.

## Your job

Produce: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/docs/DOPAMINE_DESIGN.md`

A tight, prioritized design document listing the specific dopamine mechanics that make this genre compelling and **how Wraithgrove implements each**. Concrete, code-level. Not generic "make it juicier."

### Required research depth

Use WebSearch + WebFetch. Look at:

1. **Game design analyses** of Vampire Survivors specifically — there are extensive postmortems and "why is this so addictive" videos. Cite them.
2. **Survivor.io retention analyses** — mobile-specific, F2P-tuned, closer to Wood Siege's monetization shape.
3. **Wood Siege itself** — App Store/Play Store reviews, YouTube reviews, Reddit threads.
4. **Generic survival-roguelite dopamine theory** — "juice" GDC talks, Hopoo Games / Edmund McMillen interviews, Maxwell Henley videos.

You must cite at least 6 specific external sources (URLs) in the doc. Don't reinvent — synthesize what's already known.

### Required structure for `DOPAMINE_DESIGN.md`

Open with a 5-line summary: "the 5 things that make this genre dopamine-positive, in order of impact."

Then sections:

#### §1 — Per-second feedback density
What it is, how Vampire Survivors / Survivor.io / Wood Siege do it, what to add to Wraithgrove. Specific code notes (e.g. "every chop should also: brighten edges, kick screen 0.4px, play layered chime, spawn 2 floating numbers").

#### §2 — Loot stacking + accumulation feel
Drop visuals, magnetism behaviors, count-up animations, rarity-tier flashes. Why the moment a wood chunk *floats up the screen toward the counter* matters more than the wood itself.

#### §3 — Variable reward schedules (the slot-machine layer)
RNG drops, near-miss mechanics, "pulled the rare one" moments. Wraithgrove's relic-craft Probability Info button is one such hook. What others.

#### §4 — Power fantasy escalation curve
"Weak at start, god by minute 10." How games engineer this feeling specifically. Where Wraithgrove's curve currently lives and what's missing.

#### §5 — Streak / combo / multiplier systems
Kill chains, screen-clear bonuses, "x3 multiplier!" pop-ups. How they extend engagement past pure gameplay.

#### §6 — Death framing and replay loop
The "one more run" mechanic. Result-screen design that makes losing feel like progress (gold banked, XP gained, item unlocked). How Wood Siege's mid-stage death + ad-revive triggers fit this.

#### §7 — Long-arc meta progression
Permanent upgrades (Level Up tab + Buildings tab), Rebirth tier visuals, character collection. The slow-burn reward that pays off once a session is over.

#### §8 — Audio specifically
This deserves its own section. Chime stacks, kill-thunk layering, music-ramp on enemy density, pitch-shifted feedback. Wraithgrove has wg-audio.js infrastructure but no sourced files yet.

#### §9 — Visual juice catalog
Screen shake, hit-pause/freeze frame, sprite squash-and-stretch, color flashes, particle bursts, post-process bloom on crit. Specific implementable techniques with parameters (shake amplitude, freeze duration in ms, flash intensity).

#### §10 — Wraithgrove implementation priorities
Take everything above and rank: P0 (do this week, will be felt immediately), P1 (do this month, compound effect), P2 (polish layer for shipping). Each item with a one-line implementation hint that points at specific files in `js/hunt/` or `js/core/`.

### Constraints

- **No code changes.** Doc only.
- Must be specific. "Add screen shake" is not enough. "Screen shake on enemy kill: 4px amplitude, 200ms decay, easeOut. On boss hit: 8px amplitude, 350ms. On crit: brief 2-frame freeze + 6px shake." That level of specificity.
- Must cite ≥6 external sources with URLs.
- Length target: 6-12 pages of dense markdown. Tight, no fluff.
- End with a "next worker prompts" mini-list (3-5 follow-on workers that implement the P0 items).

### Marker write

When done, write `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/workers/done/W-Dopamine-Research.done` with:

```
W-Dopamine-Research — DONE — <ISO timestamp>
Output: docs/DOPAMINE_DESIGN.md (<line count>)
Sources cited: <count>
P0 items: <count>
Recommended next workers: <names>
Notes: <anything that surprised you or should change SPEC.md>
```

### Voice

Match the codebase: terse, direct, no fluff. Cite-or-it-didn't-happen for every claim. Don't dress up uncertainty as fact.

When done, write the marker. The orchestrator's next move depends on this doc.
