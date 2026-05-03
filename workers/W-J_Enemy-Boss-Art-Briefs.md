You are Worker J — the Enemy-and-Boss-Art-Briefs worker. Your job: produce Midjourney-ready text prompts for all 5 enemy types and all 6 bosses. Output: a single markdown document with structured MJ briefs the Architect can paste into Midjourney.

Walk the birth sequence (/Users/defimagic/Desktop/Hive/CLAUDE.md → Birth/01–04 → THE_PRINCIPLES → HIVE_RULES → COLONY_CONTEXT → BEFORE_YOU_BUILD).

Then read PROJECT-LEVEL guardrails (MANDATORY):
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/CLAUDE.md (especially the IP-clean discipline)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/STATE_OF_BUILD.md
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/BUILD_PLAN.md

PRIMARY-SOURCE READING (Principle XXII):
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/GAMEPLAY_OBSERVATION.md §3 (the comp's enemy register: red zombie/ghost humanoids, scaled boss versions, Eastern folk-horror trope theming)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-enemies.js (the 5 enemy types with their TYPES table — name, hp, speed, color, accent)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-bosses.js (the 6 boss definitions with names, color, accent, attack patterns)

═══════════════════════════════════════════════════════════════════
MANDATORY FINAL STEP (do not skip):
Write `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/workers/done/W-J.done` AS THE LAST THING YOU DO.

Marker content (5 lines):
1. one-line summary
2. files written/edited
3. count of enemy briefs (target: 5) + boss briefs (target: 6) = 11
4. any deviations
5. confidence (high/medium/low)
═══════════════════════════════════════════════════════════════════

ONE CONCERN — one deliverable file.

CONCERN — Write `art/enemies/MIDJOURNEY_BRIEFS.md`

Path: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/art/enemies/MIDJOURNEY_BRIEFS.md` (mkdir -p the directory if missing)

File header:
```
# Wraithgrove Enemy + Boss Art — Midjourney Briefs

5 enemy types + 6 bosses. Each brief produces a sprite (or sprite sheet for multi-frame enemies) on transparent magenta background, anime-pixel-art chibi register, Eastern folk-horror theme. Distinct silhouette + readable hostile-recognition cues at 16-32 px scale.

Pipeline: paste each prompt into Midjourney v7 → run `strip_magenta.py` → slice frames if multi-pose → save to `art/enemies/<id>/<frame>.png` (enemies) or `art/bosses/<id>/<frame>.png` (bosses).
```

## Enemy section — for each of 5 types

Order from `hunt-enemies.js TYPES`: lurker, walker, sprite, brute_small, caller.

For each enemy, write:

```
## <enemy_id>

**HP / speed / damage:** read from TYPES table
**Color register:** <color hex>
**Accent register:** <accent hex>
**Read-at-glance silhouette:** [one sentence]

**MJ prompt:**

\`\`\`
chibi anime pixel art enemy, [DESIGN DESCRIPTION], dominant color [color], glowing accent [accent], 32×32 px sprite, hostile predatory body language, no weapon visible (claws/fangs only unless specified), 3-frame walk cycle (left foot, neutral, right foot), transparent magenta #FF00FF background, sharp pixel edges, single overhead light source, soft black drop shadow under feet, no text or watermark, --ar 1:1 --stylize 200 --v 7
\`\`\`

**Negative directives:** `--no realistic, photorealism, western horror demons, weapons, text, multiple characters, gore`
```

Per-enemy DESIGN DESCRIPTION (originals — do NOT copy any specific Wood Siege enemy):

| enemy_id | DESIGN DESCRIPTION |
|---|---|
| lurker | Small slumped humanoid silhouette in tattered black rags, faceless except for two small reddish glowing pinpoint eyes, long stringy black hair hanging past the eyes, hunched gait |
| walker | Stocky upright corpse-figure in faded dark-red funeral robes, sallow grey skin, vacant white pupils, walks straight without flinching, hands at sides |
| sprite | Tiny floating violet wisp-creature, vaguely humanoid head with three small glowing eyes and a wisp-tail instead of legs, hovering slightly off the ground |
| brute_small | Heavy-set hunched ogre-figure in stained crimson rags, massive arms hanging past knees, tiny eyes, single broken horn on the side of head, bandaged feet |
| caller | Tall thin gaunt figure in deep purple ceremonial robes with painted prayer-script on the front, holds a small ceremonial bell in one hand, mouth permanently open in a silent shout |

## Boss section — for each of 6 bosses

Order from `hunt-bosses.js BOSSES`: pale_bride, frozen_crone, autumn_lord, temple_warden, cave_mother, wraith_father.

For each boss, write:

```
## <boss_id> — "<name>"

**HP / size / patterns:** read from BOSSES catalog
**Color register:** <color hex>
**Accent register:** <accent hex>
**Phase visibility note:** [one sentence on aura behavior — MJ won't render this; it's wired in code]

**MJ prompt:**

\`\`\`
chibi anime pixel art boss enemy, [DESIGN DESCRIPTION], dominant color [color], menacing accent [accent], 64×64 px sprite, central front-facing pose, distinctive boss silhouette readable at 32 px, ominous body language, transparent magenta #FF00FF background, single overhead light source, soft black drop shadow, glowing colored ambient indication, no text or watermark, Eastern folk-horror register, --ar 1:1 --stylize 250 --v 7
\`\`\`

**Negative directives:** `--no realistic, western fantasy demons, modern weapons, text, multiple characters, gore`
```

Per-boss DESIGN DESCRIPTION (originals; the names "Pale Bride / Frozen Crone / Autumn Lord / Temple Warden / Cave Mother / The Wraith Father" are Wraithgrove originals; the designs below are also originals):

| boss_id | DESIGN DESCRIPTION |
|---|---|
| pale_bride | Tall slender figure in tattered white funeral wedding robe and torn veil, hollow black eye-sockets, pale grey skin, long dark hair flowing down past the waist, holding a single black flower, slight floating posture |
| frozen_crone | Hunched elderly figure wrapped in heavy frost-blue shawls, ice-crystal hair, glowing pale-blue irises, gnarled hands tipped with ice-shards, ice spikes growing through the back of the shawl |
| autumn_lord | Imposing tall figure in red-brown leaf-pattern robes that trail leaves behind, four small antlers branching from the head, glowing amber eyes, faint embers floating around the silhouette |
| temple_warden | Massive stone-and-gold warrior figure shaped like a temple guardian statue come alive, square heavy proportions, glowing seam down the chest, ornate gold bracers, deep crimson eye glow |
| cave_mother | Dark mass of overlapping shadows vaguely shaped like a hunched maternal silhouette, six glowing red pinpoint eyes arranged in a 2x3 pattern, tendril-arms ending in long claws |
| wraith_father | Final boss — towering robed figure in shadow-purple robes that fade to dark mist at the edges, three crown-horns rising from the head, four small floating spectral eyes orbiting the head, hovering above ground, no visible feet |

After all 11 sections, add a closing:

```
---

## Pipeline integration

1. Each brief above produces a transparent-background sprite (after strip_magenta.py).
2. Save enemies to `art/enemies/<id>/<frame>.png`, bosses to `art/bosses/<id>/main.png`.
3. The render module wiring (`hunt-render.js drawCreatures` + the 6 boss helpers W-E added) will be updated in a separate worker (W-EnemyArt-Wire / W-BossArt-Wire) to swap the procedural primitives for these sprites.

## Originality discipline

All 11 designs are original to Wraithgrove. The Eastern folk-horror genre register is convention. Specific character designs are copyrightable; ours are distinct.

## Architect tasks (manual)

- Generate the 11 sprites via Midjourney Pro
- Run strip_magenta.py on each
- Slice multi-frame enemies into walk-cycle frames
- Save to disk paths above
- Approve each before art-wiring workers fire
```

VERIFICATION:
- File exists at path
- 5 enemy sections + 6 boss sections = 11 total briefs
- No mention of any specific Wood Siege enemy/boss design

Commit: "Worker J: art/enemies/MIDJOURNEY_BRIEFS.md — 5 enemies + 6 bosses (original IP)"

CONSTRAINTS:
- One file. One concern.
- Do NOT generate actual images.
- Do NOT touch any non-art/ file.
- Per Hive Rules: do not delegate to further sub-agents.

You are Worker J. After you ship: the Architect has 11 paste-ready Midjourney briefs covering every enemy + boss. Combat-feel polish is unlocked.