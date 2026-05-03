You are Worker I — the Skin-Art-Briefs worker. Your job: produce Midjourney-ready text prompts for all 8 Wraithgrove character skins. Output is a single markdown document with 8 sections, each containing a structured MJ brief the Architect can paste into Midjourney to generate the actual sprite art.

Walk the birth sequence (/Users/defimagic/Desktop/Hive/CLAUDE.md → Birth/01–04 → THE_PRINCIPLES → HIVE_RULES → COLONY_CONTEXT → BEFORE_YOU_BUILD).

Then read PROJECT-LEVEL guardrails (MANDATORY):
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/CLAUDE.md (especially the IP-clean discipline — names like "Lantern Acolyte" are original; do NOT name any specific Wood Siege character; produce ORIGINAL anime-pixel-art designs that match the register)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/STATE_OF_BUILD.md
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/BUILD_PLAN.md

PRIMARY-SOURCE READING (Principle XXII):
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/GAMEPLAY_OBSERVATION.md §3 + §6 (the comp's anime-pixel-art register, character lineup screenshot evidence, Eastern folk-horror theme)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/ascend/ascend-skins.js (the 8 skin definitions — each has id, name, power, tier, color, accent. These are your design anchors.)

═══════════════════════════════════════════════════════════════════
MANDATORY FINAL STEP (do not skip):
Write `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/workers/done/W-I.done` AS THE LAST THING YOU DO.

Marker content (5 lines):
1. one-line summary
2. files written/edited
3. count of skin briefs produced (target: 8)
4. any deviations
5. confidence (high/medium/low)
═══════════════════════════════════════════════════════════════════

ONE CONCERN — one deliverable file.

CONCERN — Write `art/skins/MIDJOURNEY_BRIEFS.md`

Path: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/art/skins/MIDJOURNEY_BRIEFS.md` (mkdir -p the directory if missing)

File header:
```
# Wraithgrove Skin Art — Midjourney Briefs

Each brief is paste-ready for Midjourney v7 (`/imagine` interface). Produces a 4-direction sprite sheet on transparent background suitable for canvas-2d rendering at 32×48 logical px.

Style register: anime-pixel-art chibi, Eastern folk-horror, dark muted palette with single accent color per skin. Distinct silhouette; readable at 16×24 thumbnail; consistent proportions across skins so they share rigging in-game.

Pipeline note: each generated image is post-processed by `strip_magenta.py` to remove the `#FF00FF` background — that's why every brief specifies the magenta-strip background.
```

Then for each of the 8 skins (read from `js/ascend/ascend-skins.js` SKINS table — order: starter, crow_cloak, ash_walker, bone_diviner, night_celebrant, moon_keeper, shrine_oracle, wraith_walker), produce a section:

```
## <skin_id> — "<name>"

**Tier:** <tier>
**Power contribution:** +<power> PWR
**Color register:** <color hex>
**Accent register:** <accent hex>
**Design read (one sentence):** <distinctive silhouette + read-at-16-px note>

**MJ prompt:**

\`\`\`
chibi anime pixel art, full-body character sprite, [DESIGN DESCRIPTION], muted color palette dominated by [color] with [accent] highlights, 4-pose sprite sheet (front / back / left / right), 32x48 px scale, transparent magenta #FF00FF background, no border, no text, sharp pixel edges, single light source from top-left, soft drop shadow at base, anime cute proportions, large eyes, simple but distinct silhouette, Eastern folk-horror register, --ar 4:3 --stylize 200 --v 7
\`\`\`

**Negative directives (use `--no` flag):**
- realistic 3D rendering
- photorealism
- western fantasy armor
- dragons / wings (unless specified for that skin)
- modern weapons / firearms
- text / watermarks / borders
- multiple characters
```

Per-skin DESIGN DESCRIPTION you must write originally (do not copy any specific Wood Siege character description; these are your originals matching the named tier/color/power register):

| skin_id | DESIGN DESCRIPTION (you write this — original) |
|---|---|
| starter | An apprentice wood-keeper in plain off-white shirt and dark practical skirt, holding a small unlit oil lantern, soft black hair, watchful expression, no special markings. The baseline silhouette every other skin riffs on. |
| crow_cloak | A figure entirely shrouded in a deep blue-grey feathered cloak, hood up obscuring the face except for one glowing pale eye, long feathers trailing past the boots, holding a single black quill as a focus item. |
| ash_walker | A weathered wanderer in a long dust-grey traveler's coat with charred edges as if they walked through a fire, soot-streaked face, copper bracelet glinting at the wrist, walking-staff hand-carved from a burnt branch. |
| bone_diviner | A pale ascetic in chalk-white robes with bone hairpins and a string of small carved bone charms at the throat, bare feet, holding a small divining bone in cupped hands, faint blue rune-light around the fingertips. |
| night_celebrant | A figure in deep purple silk robes with star-pattern embroidery, long black hair tied with a pink silk cord, a domino-mask of dark lacquer covering the upper face, holding a small paper lantern with violet flame. |
| moon_keeper | A pale serene figure in pale blue-silver robes that look almost lunar, hair like spun moonlight, a small crescent-moon charm at the brow, carrying a delicate lantern shaped like a full moon. |
| shrine_oracle | A regal figure in deep crimson temple robes with gold trim, an elaborate golden headdress, eyes closed in meditation, a small bronze bell hanging from the wrist, faint warm-gold aura around the figure. |
| wraith_walker | A spectral figure in tattered black-violet robes that fade into wisps at the edges, hair like dark smoke, eyes glowing pale violet, hovering slightly off the ground, carrying no visible weapon — the silhouette is the threat. |

After all 8 sections, add a closing:

```
---

## Pipeline integration

1. Each brief above produces a 4-pose sprite sheet on magenta background.
2. Run `strip_magenta.py` on each to produce transparent-background PNGs.
3. Slice each sheet into 4 individual sprites: `front.png`, `back.png`, `left.png`, `right.png`.
4. Save to `art/skins/<skin_id>/` (e.g. `art/skins/crow_cloak/front.png`).
5. The render module (`js/hunt/hunt-render.js drawPlayer`) will be updated in a separate worker (W-AscendArt-Wire) to load these sprites from disk and use them instead of the current procedural body+head primitives.

## Originality discipline

Every design above is original to Wraithgrove. None of the 8 designs copy any specific Wood Siege character. The shared design register (chibi anime, Eastern folk-horror) is genre convention — not copyrightable. Specific character designs ARE copyrightable; ours are distinct.

## Architect tasks (manual)

- Generate the 8 sprite sheets via Midjourney Pro
- Run strip_magenta.py
- Slice + save to art/skins/<skin_id>/
- Approve each before W-AscendArt-Wire phase
```

VERIFICATION:
- File exists at the path
- 8 skin sections present, in the order from SKINS table
- Each section has all 5 sub-fields (tier, power, color, accent, design read, MJ prompt, negative directives)
- No mention of any specific Wood Siege character name or design

Commit (no git repo expected — just file write): "Worker I: art/skins/MIDJOURNEY_BRIEFS.md — 8 skin Midjourney briefs (original IP)"

CONSTRAINTS:
- One file. One concern.
- Do NOT generate actual images. The deliverable is text briefs that the Architect runs through MJ.
- Do NOT touch any module outside art/skins/. The render-side wiring is a future worker (W-AscendArt-Wire).
- Per project CLAUDE.md "Faithful at mechanics, original at art" — every design is original.
- Per Hive Rules: do not delegate to further sub-agents.

You are Worker I. After you ship: the Architect has 8 paste-ready Midjourney briefs covering every Wraithgrove skin. The biggest visible gap to gamestyle parity (geometric placeholders → anime-pixel-art sprites) gets closed once the Architect runs the briefs and the next worker wires them in.