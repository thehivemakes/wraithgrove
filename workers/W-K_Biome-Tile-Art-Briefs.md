You are Worker K — the Biome-Tile-Art-Briefs worker. Your job: produce Midjourney-ready text prompts for all 6 biome tile sets. Output: a single markdown document with structured MJ briefs.

Walk the birth sequence (/Users/defimagic/Desktop/Hive/CLAUDE.md → Birth/01–04 → THE_PRINCIPLES → HIVE_RULES → COLONY_CONTEXT → BEFORE_YOU_BUILD).

Then read PROJECT-LEVEL guardrails (MANDATORY):
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/CLAUDE.md
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/STATE_OF_BUILD.md

PRIMARY-SOURCE READING (Principle XXII):
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/GAMEPLAY_OBSERVATION.md §3.3 (the comp's biome rotation register: green forest, autumn-orange, cold-stone-blue, etc.)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-stage.js (the BIOMES table — each has ground/groundAlt/tree/treeBark/ambient/lightFog/decoration fields)

═══════════════════════════════════════════════════════════════════
MANDATORY FINAL STEP (do not skip):
Write `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/workers/done/W-K.done` AS THE LAST THING YOU DO.

Marker content (5 lines):
1. one-line summary
2. files written
3. count of biome briefs (target: 6) × 4 tile types each = 24 tile prompts total
4. any deviations
5. confidence (high/medium/low)
═══════════════════════════════════════════════════════════════════

ONE CONCERN — one deliverable file.

CONCERN — Write `art/tiles/MIDJOURNEY_BRIEFS.md`

Path: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/art/tiles/MIDJOURNEY_BRIEFS.md` (mkdir -p the directory if missing)

For each of 6 biomes (forest_summer, cold_stone, forest_autumn, temple, cave, eldritch), produce 4 tile briefs:
- ground (the primary tile)
- groundAlt (the checker-pattern variant)
- tree (the perimeter / obstacle tile)
- decoration (the small accent overlay)

24 tile prompts total. Each tile is 32×32 px, seamless tileable on all four edges, anime-pixel-art register matching the existing color anchors in `BIOMES` table.

Pipeline closing section: explains how the render module reads these (post-wiring worker) and the integration discipline.

Per-biome DESIGN DESCRIPTIONS (write originals; do NOT copy any specific Wood Siege tile design — match the genre register only):

| biome | thematic register |
|---|---|
| forest_summer | mossy mid-green grass with tiny grass tufts, slightly darker patches, pine-tree perimeter dark green-black bark visible |
| cold_stone | pale blue-grey stone slab, faint frost cracks in lighter blue, frozen tree perimeter with ice-blue bark |
| forest_autumn | rust-orange leaf-littered ground with deeper crimson patches, autumn pine trees with red-brown bark |
| temple | dark-bronze-and-stone tile with subtle gold-trace seams, deep crimson ambient, ornate temple-pillar perimeter |
| cave | charcoal black-grey cracked stone floor, faint phosphor-green moss patches, perimeter walls of jagged darker rock |
| eldritch | deep violet-black porous ground with subtle purple sigils faintly etched, twisted dark-purple tree perimeter |

Each tile prompt template:

```
\`\`\`
seamless tileable game floor texture, [DESIGN DESCRIPTION], anime pixel art register, 32x32 px, top-down camera view, no diagonal seams, edges match for 4-directional tiling, single light source from top-left, no shadow, no text, no characters, no objects, --ar 1:1 --tile --stylize 100 --v 7
\`\`\`
```

Closing pipeline section:

```
## Pipeline integration

1. Generate each tile via Midjourney with `--tile` flag.
2. Verify seamless tiling: paste 2×2 grid; edges should match without visible seams.
3. Save to `art/tiles/<biome>/<tile_type>.png` (e.g. `art/tiles/forest_summer/ground.png`).
4. Render module wiring (`hunt-render.js drawTiles`) will be updated in a separate worker (W-TileArt-Wire) to load these as `Image()` and use `ctx.drawImage` instead of solid `fillRect`. Decoration sprites (W-B's procedural primitives) become an OPTIONAL overlay layer, not the primary visual.

## Originality discipline

Tile patterns are not generally copyrightable as creative expression at this scale. The biome thematic register (forest/cold/autumn/temple/cave/eldritch) is genre convention. Specific tile-art compositions (the exact pixel-pattern of a tile) ARE creative expression — ours are originals.
```

VERIFICATION:
- File exists at path
- 6 biomes × 4 tile types = 24 prompt blocks
- Each prompt block uses the template above with the biome's thematic register substituted in

Commit: "Worker K: art/tiles/MIDJOURNEY_BRIEFS.md — 24 biome tile briefs (6 biomes × 4 types)"

CONSTRAINTS:
- One file. One concern.
- Do NOT generate actual images.
- Do NOT touch any non-art/ file.
- Per Hive Rules: do not delegate to further sub-agents.

You are Worker K. After you ship: the visual layer of every biome can be replaced with real anime-pixel-art tile sets, closing the geometric-primitive gap to gamestyle parity.