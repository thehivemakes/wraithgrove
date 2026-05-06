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

---

## red_zombie

**HP / speed / damage:** 22 HP / speed 65 / damage 6
**Color register:** #a82820
**Accent register:** #ffe0b0

**Read-at-glance silhouette:** Cloaked robed figure with a pointed hood and pale face — reads as the default threatening presence, the foot-soldier archetype.

**MJ prompt:**

```
chibi anime pixel art enemy, cloaked humanoid in dark crimson-brown hooded robe, pale sallow face visible under hood, dark hollow eye sockets, robe widening to ground like a trapezoid, arms hidden inside sleeves, dominant color #a82820, glowing accent #ffe0b0, 32×32 px sprite, hostile predatory body language, no weapon visible (claws/fangs only unless specified), 3-frame walk cycle (left foot, neutral, right foot), transparent magenta #FF00FF background, sharp pixel edges, single overhead light source, soft black drop shadow under feet, no text or watermark, --ar 1:1 --stylize 200 --v 7
```

**Negative directives:** `--no realistic, photorealism, western horror demons, weapons, text, multiple characters, gore`

---

## pumpkin_lantern

**HP / speed / damage:** 32 HP / speed 70 / damage 8
**Color register:** #e07820
**Accent register:** #ffc848

**Read-at-glance silhouette:** A huge glowing orange pumpkin-head on a thin dark stick body — reads as volatile, flickering, night-mode folk-horror.

**MJ prompt:**

```
chibi anime pixel art enemy, thin dark stick-figure body with an oversized glowing orange pumpkin for a head, triangular glowing eyes and jagged mouth carved into the pumpkin, small dark arm stubs extending sideways, bare stick-legs ending in black shoes, green-brown stem on pumpkin crown, dominant color #e07820, glowing accent #ffc848, 32×32 px sprite, hostile predatory body language, no weapon visible (claws/fangs only unless specified), 3-frame walk cycle (left foot, neutral, right foot), transparent magenta #FF00FF background, sharp pixel edges, single overhead light source, soft black drop shadow under feet, no text or watermark, eastern folk-horror register, --ar 1:1 --stylize 200 --v 7
```

**Negative directives:** `--no realistic, photorealism, western horror demons, weapons, text, multiple characters, gore`

---

## jiangshi

**HP / speed / damage:** 50 HP / speed 85 / damage 12
**Color register:** #3a2018
**Accent register:** #f8e8c8

**Read-at-glance silhouette:** Stiff-armed hopping figure under a wide conical straw hat, paper amulet hanging from the brim — reads as an ancient folk monster, arms forward, shuffling advance.

**MJ prompt:**

```
chibi anime pixel art enemy, Chinese hopping vampire jiangshi, dark green-brown funeral robe, arms stretched stiffly horizontal at shoulder height, pale green-tinged face with two tiny red dot eyes, wide conical straw hat with vertical paper amulet strip hanging from brim, gold waist sash, dominant color #3a2018, accent #f8e8c8, 32×32 px sprite, hostile predatory body language, no weapon visible (claws/fangs only unless specified), 3-frame hop cycle (hop up, mid-air, land), transparent magenta #FF00FF background, sharp pixel edges, single overhead light source, soft black drop shadow under feet, no text or watermark, eastern folk-horror register, --ar 1:1 --stylize 200 --v 7
```

**Negative directives:** `--no realistic, photorealism, western horror demons, weapons, text, multiple characters, gore`

---

## samurai_grunt

**HP / speed / damage:** 70 HP / speed 80 / damage 15
**Color register:** #a82828
**Accent register:** #ffc850

**Read-at-glance silhouette:** Armored warrior with horned kabuto helmet and crimson battle armor — reads as a heavy threatening threat that demands immediate attention.

**MJ prompt:**

```
chibi anime pixel art enemy, compact armored samurai warrior in dark crimson lacquer chest plate with gold trim, horned kabuto helmet with full face guard, red haori battle coat over dark armor, katana scabbard at hip (sheathed, no weapon drawn), dominant color #a82828, gold accent #ffc850, 32×32 px sprite, hostile predatory body language, 3-frame walk cycle (left foot, neutral, right foot), transparent magenta #FF00FF background, sharp pixel edges, single overhead light source, soft black drop shadow under feet, no text or watermark, eastern folk-horror register, --ar 1:1 --stylize 200 --v 7
```

**Negative directives:** `--no realistic, photorealism, western fantasy demons, weapons drawn or attacking, text, multiple characters, gore`

---

## banshee

**HP / speed / damage:** 220 HP / speed 130 / damage 22 (rare — max 1 alive)
**Color register:** #e8e0f0
**Accent register:** #a060ff

**Read-at-glance silhouette:** Large drifting pale-violet wraith-woman with flowing hair and hollow glowing eyes — reads as "run or prepare to be charged." Largest of the regular enemy types.

**MJ prompt:**

```
chibi anime pixel art enemy, large rare night banshee, tall ethereal spirit woman in pale violet-white tattered robe drifting around her feet, long black hair flowing in all directions, hollow wide eyes glowing deep violet, mouth open in a silent shriek, 3-layer violet aura halo surrounding her, dominant color #e8e0f0, glowing accent #a060ff, 64×64 px sprite (large), hostile predatory body language, no weapon (spirit energy only), 3-frame drift cycle (lean left, center, lean right), transparent magenta #FF00FF background, sharp pixel edges, single overhead light source, soft black drop shadow, no text or watermark, eastern folk-horror register, --ar 1:1 --stylize 200 --v 7
```

**Negative directives:** `--no realistic, photorealism, western horror demons, weapons, text, multiple characters, gore`

---

## wraith_fast

**HP / speed / damage:** 18 HP / speed 140 / damage 7
**Color register:** #404858
**Accent register:** #a8c0e8

**Read-at-glance silhouette:** Small pale-blue oval ghost wisp with a fading tail and hollow dot eyes — reads as a darting threat that materializes from behind, fast and hard to track.

**MJ prompt:**

```
chibi anime pixel art enemy, small fast ghost wisp creature, blue-grey oval body with a fading transparent tail trailing below it, no legs, hollow dark dot eyes, faint blue-white glow at the edges, dominant color #404858, glowing accent #a8c0e8, 32×32 px sprite, fast darting body language, 3-frame drift cycle (drift left, centered, drift right), transparent magenta #FF00FF background, sharp pixel edges, single overhead light source, no drop shadow (hovering), no text or watermark, eastern folk-horror register, --ar 1:1 --stylize 200 --v 7
```

**Negative directives:** `--no realistic, photorealism, western horror demons, weapons, text, multiple characters, gore, legs`

---

## skull_swarmer

**HP / speed / damage:** 9 HP / speed 95 / damage 3 (spawns in clusters of 4)
**Color register:** #e8e0d0
**Accent register:** #3a2010

**Read-at-glance silhouette:** Bone-white oversized skull on a tiny dark stick skeleton body — reads as small, fragile, and terrifying in numbers. The skull is comically large relative to the body.

**MJ prompt:**

```
chibi anime pixel art enemy, small skeletal imp, enormous bone-white skull head oversized compared to a tiny dark stick-skeleton body, hollow dark eye sockets, row of jagged teeth, thin stick arms and stick legs in dark brown, dominant color #e8e0d0, accent #3a2010, 32×32 px sprite, aggressive darting body language, 3-frame run cycle (arms flailing, left foot, right foot), transparent magenta #FF00FF background, sharp pixel edges, single overhead light source, soft black drop shadow under feet, no text or watermark, eastern folk-horror register, --ar 1:1 --stylize 200 --v 7
```

**Negative directives:** `--no realistic, photorealism, western horror demons, weapons, text, multiple characters, gore`

---

## sigil_drone

**HP / speed / damage:** 25 HP / speed 50 / damage 7 (ranged — fires sigil projectiles at range 280)
**Color register:** #3a1058
**Accent register:** #c060ff

**Read-at-glance silhouette:** Small floating dark-violet entity radiating glowing sigil runes — reads as a ranged threat that should be prioritized, a caster that hangs back.

**MJ prompt:**

```
chibi anime pixel art enemy, small hovering dark-violet sigil drone creature, compact rounded body with glowing purple runic sigils etched across the surface, two small glowing violet eyes, no legs, faint purple rune-glyph aura orbiting the body, dominant color #3a1058, glowing accent #c060ff, 32×32 px sprite, floating threatening body language, 3-frame hover cycle (tilt left, level, tilt right), transparent magenta #FF00FF background, sharp pixel edges, single overhead light source, soft black drop shadow, no text or watermark, eastern folk-horror register, --ar 1:1 --stylize 200 --v 7
```

**Negative directives:** `--no realistic, photorealism, western horror demons, modern weapons, text, multiple characters, gore`

---

## memory_husk

**HP / speed / damage:** 80 HP / speed 16 / damage 14 (on death: splits into 2 lurkers)
**Color register:** #5a3870
**Accent register:** #a880c8

**Read-at-glance silhouette:** Slow wide-shouldered shambling figure in purple-grey burial wrappings, like a mummy half-dissolved into shadow — reads as "slow but take it seriously, it splits when it dies."

**MJ prompt:**

```
chibi anime pixel art enemy, wide slow-moving shambler wrapped in tattered purple-grey burial shroud bandages, large rounded shoulders hunched forward, face hidden under wrappings except for two faint glowing violet pinpoint eyes, heavy plodding stance, some bandage strips trailing loosely, dominant color #5a3870, glowing accent #a880c8, 32×32 px sprite, slow heavy threatening body language, 3-frame shamble cycle (left foot drag, neutral, right foot drag), transparent magenta #FF00FF background, sharp pixel edges, single overhead light source, soft black drop shadow under feet, no text or watermark, eastern folk-horror register, --ar 1:1 --stylize 200 --v 7
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
