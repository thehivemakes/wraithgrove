# Wraithgrove Enemy + Boss Art — Midjourney Briefs

5 enemy types + 6 bosses. Each brief produces a sprite (or sprite sheet for multi-frame enemies) on transparent magenta background, anime-pixel-art chibi register, Eastern folk-horror theme. Distinct silhouette + readable hostile-recognition cues at 16-32 px scale.

Pipeline: paste each prompt into Midjourney v7 → run `strip_magenta.py` → slice frames if multi-pose → save to `art/enemies/<id>/<frame>.png` (enemies) or `art/bosses/<id>/<frame>.png` (bosses).

---

## Enemies

---

## lurker

**HP / speed / damage:** 10 HP / speed 35 / damage 5
**Color register:** #1a0a08
**Accent register:** #a82828

**Read-at-glance silhouette:** Small hunched shadow-shape with two red pinpoints for eyes — reads as "weak but creeping" from a full screen away.

**MJ prompt:**

```
chibi anime pixel art enemy, small slumped humanoid silhouette in tattered black rags, faceless except for two small reddish glowing pinpoint eyes, long stringy black hair hanging past the eyes, hunched gait, dominant color #1a0a08, glowing accent #a82828, 32×32 px sprite, hostile predatory body language, no weapon visible (claws/fangs only unless specified), 3-frame walk cycle (left foot, neutral, right foot), transparent magenta #FF00FF background, sharp pixel edges, single overhead light source, soft black drop shadow under feet, no text or watermark, --ar 1:1 --stylize 200 --v 7
```

**Negative directives:** `--no realistic, photorealism, western horror demons, weapons, text, multiple characters, gore`

---

## walker

**HP / speed / damage:** 22 HP / speed 25 / damage 9
**Color register:** #7a2818
**Accent register:** #3a1408

**Read-at-glance silhouette:** Upright stocky corpse with arms at its sides — reads as relentless, unflinching advance.

**MJ prompt:**

```
chibi anime pixel art enemy, stocky upright corpse-figure in faded dark-red funeral robes, sallow grey skin, vacant white pupils, walks straight without flinching, hands at sides, dominant color #7a2818, glowing accent #3a1408, 32×32 px sprite, hostile predatory body language, no weapon visible (claws/fangs only unless specified), 3-frame walk cycle (left foot, neutral, right foot), transparent magenta #FF00FF background, sharp pixel edges, single overhead light source, soft black drop shadow under feet, no text or watermark, --ar 1:1 --stylize 200 --v 7
```

**Negative directives:** `--no realistic, photorealism, western horror demons, weapons, text, multiple characters, gore`

---

## sprite

**HP / speed / damage:** 6 HP / speed 60 / damage 3
**Color register:** #5a2878
**Accent register:** #2a1438

**Read-at-glance silhouette:** Tiny floating wisp with a faint humanoid head and a trailing tail instead of legs — reads as fast, darting, hard to pin down.

**MJ prompt:**

```
chibi anime pixel art enemy, tiny floating violet wisp-creature, vaguely humanoid head with three small glowing eyes and a wisp-tail instead of legs, hovering slightly off the ground, dominant color #5a2878, glowing accent #2a1438, 32×32 px sprite, hostile predatory body language, no weapon visible (claws/fangs only unless specified), 3-frame walk cycle (left foot, neutral, right foot), transparent magenta #FF00FF background, sharp pixel edges, single overhead light source, soft black drop shadow under feet, no text or watermark, --ar 1:1 --stylize 200 --v 7
```

**Negative directives:** `--no realistic, photorealism, western horror demons, weapons, text, multiple characters, gore`

---

## brute_small

**HP / speed / damage:** 55 HP / speed 18 / damage 18
**Color register:** #9a2018
**Accent register:** #4a1008

**Read-at-glance silhouette:** Wide-shouldered hunched mass with arms past its knees and a single broken horn — reads as slow but punishing.

**MJ prompt:**

```
chibi anime pixel art enemy, heavy-set hunched ogre-figure in stained crimson rags, massive arms hanging past knees, tiny eyes, single broken horn on the side of head, bandaged feet, dominant color #9a2018, glowing accent #4a1008, 32×32 px sprite, hostile predatory body language, no weapon visible (claws/fangs only unless specified), 3-frame walk cycle (left foot, neutral, right foot), transparent magenta #FF00FF background, sharp pixel edges, single overhead light source, soft black drop shadow under feet, no text or watermark, --ar 1:1 --stylize 200 --v 7
```

**Negative directives:** `--no realistic, photorealism, western horror demons, weapons, text, multiple characters, gore`

---

## caller

**HP / speed / damage:** 14 HP / speed 22 / damage 8 (ranged — fires projectiles at range 260)
**Color register:** #3a2858
**Accent register:** #1a1228

**Read-at-glance silhouette:** Tall thin robed figure with mouth open in a silent shout and a small bell in one hand — reads as "do not let it hang back."

**MJ prompt:**

```
chibi anime pixel art enemy, tall thin gaunt figure in deep purple ceremonial robes with painted prayer-script on the front, holds a small ceremonial bell in one hand, mouth permanently open in a silent shout, dominant color #3a2858, glowing accent #1a1228, 32×32 px sprite, hostile predatory body language, no weapon visible (claws/fangs only unless specified), 3-frame walk cycle (left foot, neutral, right foot), transparent magenta #FF00FF background, sharp pixel edges, single overhead light source, soft black drop shadow under feet, no text or watermark, --ar 1:1 --stylize 200 --v 7
```

**Negative directives:** `--no realistic, photorealism, western horror demons, weapons, text, multiple characters, gore`

---

## Bosses

---

## pale_bride — "Pale Bride"

**HP / size / patterns:** 380 HP / size 36 / summon_minions (3 sprites every 7s) + triple_dash
**Color register:** #d8c0d0
**Accent register:** #5a3050

**Phase visibility note:** No coded phase transitions — the summon burst of 3 sprites is the readable "second wind" cue; aura glow intensity is wired in code to HP percentage, not visible in the MJ render.

**MJ prompt:**

```
chibi anime pixel art boss enemy, tall slender figure in tattered white funeral wedding robe and torn veil, hollow black eye-sockets, pale grey skin, long dark hair flowing down past the waist, holding a single black flower, slight floating posture, dominant color #d8c0d0, menacing accent #5a3050, 64×64 px sprite, central front-facing pose, distinctive boss silhouette readable at 32 px, ominous body language, transparent magenta #FF00FF background, single overhead light source, soft black drop shadow, glowing colored ambient indication, no text or watermark, Eastern folk-horror register, --ar 1:1 --stylize 250 --v 7
```

**Negative directives:** `--no realistic, western fantasy demons, modern weapons, text, multiple characters, gore`

---

## frozen_crone — "Frozen Crone"

**HP / size / patterns:** 520 HP / size 40 / ice_shards (5 shards radial every 3.5s) + area_freeze (r80 every 9s)
**Color register:** #c8d8e8
**Accent register:** #3a4a6a

**Phase visibility note:** The area_freeze radius pulse is coded as a damage zone — MJ won't render the pulse; the ice-shard spines growing through the shawl hint at the pattern visually.

**MJ prompt:**

```
chibi anime pixel art boss enemy, hunched elderly figure wrapped in heavy frost-blue shawls, ice-crystal hair, glowing pale-blue irises, gnarled hands tipped with ice-shards, ice spikes growing through the back of the shawl, dominant color #c8d8e8, menacing accent #3a4a6a, 64×64 px sprite, central front-facing pose, distinctive boss silhouette readable at 32 px, ominous body language, transparent magenta #FF00FF background, single overhead light source, soft black drop shadow, glowing colored ambient indication, no text or watermark, Eastern folk-horror register, --ar 1:1 --stylize 250 --v 7
```

**Negative directives:** `--no realistic, western fantasy demons, modern weapons, text, multiple characters, gore`

---

## autumn_lord — "Autumn Lord"

**HP / size / patterns:** 720 HP / size 44 / leaf_storm (8 leaves radial every ~3s) + charge (speed 200, cd 6s)
**Color register:** #c08038
**Accent register:** #5a3a18

**Phase visibility note:** Floating embers in the design hint at the leaf-storm pattern; the charge pattern has no persistent visual indicator — it's a sudden lunge coded in tickBoss.

**MJ prompt:**

```
chibi anime pixel art boss enemy, imposing tall figure in red-brown leaf-pattern robes that trail leaves behind, four small antlers branching from the head, glowing amber eyes, faint embers floating around the silhouette, dominant color #c08038, menacing accent #5a3a18, 64×64 px sprite, central front-facing pose, distinctive boss silhouette readable at 32 px, ominous body language, transparent magenta #FF00FF background, single overhead light source, soft black drop shadow, glowing colored ambient indication, no text or watermark, Eastern folk-horror register, --ar 1:1 --stylize 250 --v 7
```

**Negative directives:** `--no realistic, western fantasy demons, modern weapons, text, multiple characters, gore`

---

## temple_warden — "Temple Warden"

**HP / size / patterns:** 980 HP / size 48 / shockwave (r120 every 5s) + minion_squads (2 walkers every 8s)
**Color register:** #e8c060
**Accent register:** #5a3818

**Phase visibility note:** The glowing chest seam is the visual proxy for the shockwave origin point — in code the shockwave is an area-damage zone, not a render event; the seam makes the telegraph legible.

**MJ prompt:**

```
chibi anime pixel art boss enemy, massive stone-and-gold warrior figure shaped like a temple guardian statue come alive, square heavy proportions, glowing seam down the chest, ornate gold bracers, deep crimson eye glow, dominant color #e8c060, menacing accent #5a3818, 64×64 px sprite, central front-facing pose, distinctive boss silhouette readable at 32 px, ominous body language, transparent magenta #FF00FF background, single overhead light source, soft black drop shadow, glowing colored ambient indication, no text or watermark, Eastern folk-horror register, --ar 1:1 --stylize 250 --v 7
```

**Negative directives:** `--no realistic, western fantasy demons, modern weapons, text, multiple characters, gore`

---

## cave_mother — "Cave Mother"

**HP / size / patterns:** 1300 HP / size 56 / darkness_pulse (r140 every 7s) + spawn_brood (5 lurkers every 10s)
**Color register:** #3a2a3a
**Accent register:** #1a1018

**Phase visibility note:** The six pinpoint eyes arranged in a 2×3 grid are the primary recognition cue — the darkness_pulse and brood-spawn are both coded events with no persistent sprite state; the tendril silhouette implies the radius threat area.

**MJ prompt:**

```
chibi anime pixel art boss enemy, dark mass of overlapping shadows vaguely shaped like a hunched maternal silhouette, six glowing red pinpoint eyes arranged in a 2x3 pattern, tendril-arms ending in long claws, dominant color #3a2a3a, menacing accent #1a1018, 64×64 px sprite, central front-facing pose, distinctive boss silhouette readable at 32 px, ominous body language, transparent magenta #FF00FF background, single overhead light source, soft black drop shadow, glowing colored ambient indication, no text or watermark, Eastern folk-horror register, --ar 1:1 --stylize 250 --v 7
```

**Negative directives:** `--no realistic, western fantasy demons, modern weapons, text, multiple characters, gore`

---

## wraith_father — "The Wraith Father"

**HP / size / patterns:** 2400 HP / size 64 / triple_phase + soul_volley (12 shards radial every 4.5s) + area_drain (r160 every 10s) + summon_callers (3 callers every 12s)
**Color register:** #1a0a30
**Accent register:** #6020a0

**Phase visibility note:** The four orbiting spectral eyes are the visual design anchor for triple_phase — in code the phase counter advances at HP thresholds (no sprite swap yet); the hovering posture reinforces that the Wraith Father never lands.

**MJ prompt:**

```
chibi anime pixel art boss enemy, final boss, towering robed figure in shadow-purple robes that fade to dark mist at the edges, three crown-horns rising from the head, four small floating spectral eyes orbiting the head, hovering above ground with no visible feet, dominant color #1a0a30, menacing accent #6020a0, 64×64 px sprite, central front-facing pose, distinctive boss silhouette readable at 32 px, ominous body language, transparent magenta #FF00FF background, single overhead light source, soft black drop shadow, glowing colored ambient indication, no text or watermark, Eastern folk-horror register, --ar 1:1 --stylize 250 --v 7
```

**Negative directives:** `--no realistic, western fantasy demons, modern weapons, text, multiple characters, gore`

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
