# Wraithgrove — Midjourney Tile Art Briefs

24 tile prompts across 6 biomes × 4 tile types.  
Color anchors sourced directly from `js/hunt/hunt-stage.js` BIOMES table.  
All designs original to Wraithgrove — genre register only, no Wood Siege pixel patterns.

---

## Tile type reference

| Type | Role | Notes |
|---|---|---|
| `ground` | Primary floor fill | Most-seen tile; base readability |
| `groundAlt` | Checker-pattern variant | Alternates with ground in a 2×2 checker; must be visually distinct but harmonious |
| `tree` | Perimeter / obstacle block | Rendered at arena edge and as obstacle tiles; acts as a wall |
| `decoration` | Small accent overlay | Sparse scatter on top of ground tiles; adds life without noise |

All tiles: 32×32 px, seamless on all four edges, anime-pixel-art register, top-down camera.

---

## Biome 1 — `forest_summer`

Color anchors: ground `#1a3018` · groundAlt `#15281a` · tree `#0a1a0a` · treeBark `#06120a`  
Register: mossy mid-green grass, grass tufts, dark pine perimeter

### ground

```
seamless tileable game floor texture, mossy mid-green grass tile, base color #1a3018 dark forest green, micro-variation of lighter and darker green patches suggesting living turf, three to four tiny sparse grass-blade pixel clusters scattered randomly, flat top-down view with no perspective distortion, anime pixel art register, 32x32 px, top-down camera view, no diagonal seams, edges match for 4-directional tiling, single light source from top-left, no shadow, no text, no characters, no objects, --ar 1:1 --tile --stylize 100 --v 7
```

### groundAlt

```
seamless tileable game floor texture, mossy mid-green grass tile darker checker variant, base color #15281a deep shadow green, denser shadow micro-patches suggesting shaded turf between tufts, minimal grass-blade details compared to primary variant, flat top-down view, anime pixel art register, 32x32 px, top-down camera view, no diagonal seams, edges match for 4-directional tiling, single light source from top-left, no shadow, no text, no characters, no objects, --ar 1:1 --tile --stylize 100 --v 7
```

### tree

```
seamless tileable game floor texture, dark pine tree canopy obstacle tile, base color #0a1a0a near-black forest green, dense pine needle silhouette mass from above, short section of dark bark #06120a visible at trunk base, no visible ground beneath, reads clearly as a solid impassable block, anime pixel art register, 32x32 px, top-down camera view, no diagonal seams, edges match for 4-directional tiling, single light source from top-left, no shadow, no text, no characters, no objects, --ar 1:1 --tile --stylize 100 --v 7
```

### decoration

```
seamless tileable game floor texture, tiny grass tuft accent overlay, three to five upright pixel grass blades in bright mid-green #2a5028, slim blade shapes on fully transparent ground layer, small footprint leaving most tile empty, anime pixel art register, 32x32 px, top-down camera view, no diagonal seams, edges match for 4-directional tiling, single light source from top-left, no shadow, no text, no characters, no objects, --ar 1:1 --tile --stylize 100 --v 7
```

---

## Biome 2 — `cold_stone`

Color anchors: ground `#3a4258` · groundAlt `#2a324a` · tree `#1a2030` · treeBark `#0a1018` · ambient `#10182a` · lightFog 0.15  
Register: pale blue-grey stone slab, frost cracks, ice-blue bark

### ground

```
seamless tileable game floor texture, pale blue-grey stone slab floor tile, base color #3a4258 cool slate blue, faint hairline frost-crack lines in lighter blue-white tracing irregular veins across the surface, slight icy sheen pixel highlight at crack edges, flat top-down view, anime pixel art register, 32x32 px, top-down camera view, no diagonal seams, edges match for 4-directional tiling, single light source from top-left, no shadow, no text, no characters, no objects, --ar 1:1 --tile --stylize 100 --v 7
```

### groundAlt

```
seamless tileable game floor texture, deeper blue-grey stone slab floor tile darker checker variant, base color #2a324a dark slate blue, wider frost crack lines in pale blue-grey, more shadow pooling in crevices suggesting cold depth, flatter surface sheen than primary variant, flat top-down view, anime pixel art register, 32x32 px, top-down camera view, no diagonal seams, edges match for 4-directional tiling, single light source from top-left, no shadow, no text, no characters, no objects, --ar 1:1 --tile --stylize 100 --v 7
```

### tree

```
seamless tileable game floor texture, frozen bare tree obstacle tile, base color #1a2030 deep navy stone, bare branch silhouette splayed from trunk viewed from above, ice-blue bark #0a1018 visible on trunk section, frost-coated bare twig tips in pale white-blue, reads as a solid impassable block, anime pixel art register, 32x32 px, top-down camera view, no diagonal seams, edges match for 4-directional tiling, single light source from top-left, no shadow, no text, no characters, no objects, --ar 1:1 --tile --stylize 100 --v 7
```

### decoration

```
seamless tileable game floor texture, snow fleck scatter accent overlay, five to eight tiny pixel dots in white and pale blue-grey #c8d4e8 arranged in loose irregular cluster, small footprint leaving most tile transparent, suggests light snowfall dusting on stone, anime pixel art register, 32x32 px, top-down camera view, no diagonal seams, edges match for 4-directional tiling, single light source from top-left, no shadow, no text, no characters, no objects, --ar 1:1 --tile --stylize 100 --v 7
```

---

## Biome 3 — `forest_autumn`

Color anchors: ground `#5a3018` · groundAlt `#3a2010` · tree `#a04018` · treeBark `#5a1c08` · lightFog 0.08  
Register: rust-orange leaf-littered earth, crimson patches, red-brown bark

### ground

```
seamless tileable game floor texture, rust-orange autumn leaf-littered ground tile, base color #5a3018 warm amber-brown earth, scattered fallen leaf pixel shapes in rust orange and deep amber overlapping the dirt, irregular warm micro-patches suggest densely covered forest floor, flat top-down view, anime pixel art register, 32x32 px, top-down camera view, no diagonal seams, edges match for 4-directional tiling, single light source from top-left, no shadow, no text, no characters, no objects, --ar 1:1 --tile --stylize 100 --v 7
```

### groundAlt

```
seamless tileable game floor texture, deep crimson-brown autumn earth darker checker variant, base color #3a2010 dark forest-floor brown, denser leaf pile pixel clusters in crimson and deep rust, heavier shadow between leaves suggesting wet decomposing litter, flat top-down view, anime pixel art register, 32x32 px, top-down camera view, no diagonal seams, edges match for 4-directional tiling, single light source from top-left, no shadow, no text, no characters, no objects, --ar 1:1 --tile --stylize 100 --v 7
```

### tree

```
seamless tileable game floor texture, autumn pine tree canopy obstacle tile, base color #a04018 burnt sienna red-orange, dense autumn foliage mass with red-orange pixel clusters from above, thick red-brown bark #5a1c08 trunk section visible at base, reads as solid impassable block, anime pixel art register, 32x32 px, top-down camera view, no diagonal seams, edges match for 4-directional tiling, single light source from top-left, no shadow, no text, no characters, no objects, --ar 1:1 --tile --stylize 100 --v 7
```

### decoration

```
seamless tileable game floor texture, fallen leaf pile accent overlay, two to four individual leaf pixel shapes in rust #b84820 amber #c87030 and crimson #8a2010, flat simplified leaf silhouettes with no stems, small footprint leaving most tile transparent, anime pixel art register, 32x32 px, top-down camera view, no diagonal seams, edges match for 4-directional tiling, single light source from top-left, no shadow, no text, no characters, no objects, --ar 1:1 --tile --stylize 100 --v 7
```

---

## Biome 4 — `temple`

Color anchors: ground `#3a302a` · groundAlt `#2a2218` · tree `#1a1410` · treeBark `#0c0a08` · ambient `#100808` · lightFog 0.12  
Register: dark bronze-and-stone floor, gold-trace seams, deep crimson ambient, ornate pillar obstacle

### ground

```
seamless tileable game floor texture, dark bronze and worn stone temple floor tile, base color #3a302a dark warm grey-brown, subtle rectangular tile seam grid in faint gold-trace #6a5030 lines barely visible beneath grime, worn surface with slight pixel sheen along seam edges, flat top-down view, anime pixel art register, 32x32 px, top-down camera view, no diagonal seams, edges match for 4-directional tiling, single light source from top-left, no shadow, no text, no characters, no objects, --ar 1:1 --tile --stylize 100 --v 7
```

### groundAlt

```
seamless tileable game floor texture, deeper charcoal stone temple floor darker checker variant, base color #2a2218 near-black warm grey, faint amber-gold tracery seam lines #504028 at corners only, more aged and shadow-pooled surface than primary variant, reads as same floor but deeper inset panel, flat top-down view, anime pixel art register, 32x32 px, top-down camera view, no diagonal seams, edges match for 4-directional tiling, single light source from top-left, no shadow, no text, no characters, no objects, --ar 1:1 --tile --stylize 100 --v 7
```

### tree

```
seamless tileable game floor texture, ornate temple pillar obstacle tile, base color #1a1410 near-black warm stone, carved column capital visible from above with octagonal cross-section, faint decorative ring detail in treeBark tone #0c0a08, reads as a solid stone pillar impassable block, anime pixel art register, 32x32 px, top-down camera view, no diagonal seams, edges match for 4-directional tiling, single light source from top-left, no shadow, no text, no characters, no objects, --ar 1:1 --tile --stylize 100 --v 7
```

### decoration

```
seamless tileable game floor texture, cracked gold temple tile fragment accent overlay, single small rectangular tile shard with gold inlay line #6a5030 along one edge, worn corner chip detail, rests flat on floor, small footprint leaving most tile transparent, anime pixel art register, 32x32 px, top-down camera view, no diagonal seams, edges match for 4-directional tiling, single light source from top-left, no shadow, no text, no characters, no objects, --ar 1:1 --tile --stylize 100 --v 7
```

---

## Biome 5 — `cave`

Color anchors: ground `#1c1a18` · groundAlt `#100e0c` · tree `#0a0806` · treeBark `#000000` · lightFog 0.45  
Register: charcoal cracked stone floor, phosphor-green moss, jagged dark rock walls

### ground

```
seamless tileable game floor texture, charcoal black-grey cracked cave stone floor tile, base color #1c1a18 dark warm grey, irregular crack lines fractured across the surface, faint phosphor-green #1a5020 moss growth inside crack crevices, flat top-down view, anime pixel art register, 32x32 px, top-down camera view, no diagonal seams, edges match for 4-directional tiling, single light source from top-left, no shadow, no text, no characters, no objects, --ar 1:1 --tile --stylize 100 --v 7
```

### groundAlt

```
seamless tileable game floor texture, near-black cave stone floor darker checker variant, base color #100e0c very dark grey, deeper crack fractures with minimal phosphor-green moss trace, more featureless and lightless than primary variant suggesting unlit cave floor, flat top-down view, anime pixel art register, 32x32 px, top-down camera view, no diagonal seams, edges match for 4-directional tiling, single light source from top-left, no shadow, no text, no characters, no objects, --ar 1:1 --tile --stylize 100 --v 7
```

### tree

```
seamless tileable game floor texture, jagged cave rock wall obstacle tile, base color #0a0806 near-black, irregular rocky mass silhouette with sharp angular edges viewed from above, stalactite cross-section nub visible at one corner, no bark—solid rock formation, reads as impassable cave wall, anime pixel art register, 32x32 px, top-down camera view, no diagonal seams, edges match for 4-directional tiling, single light source from top-left, no shadow, no text, no characters, no objects, --ar 1:1 --tile --stylize 100 --v 7
```

### decoration

```
seamless tileable game floor texture, phosphorescent moss cluster accent overlay, small patch of three to five pixel dots and smear shapes in bright phosphor-green #1a6024 and pale bioluminescent green-white #50c060, glowing color accent on transparent ground layer, small footprint leaving most tile empty, anime pixel art register, 32x32 px, top-down camera view, no diagonal seams, edges match for 4-directional tiling, single light source from top-left, no shadow, no text, no characters, no objects, --ar 1:1 --tile --stylize 100 --v 7
```

---

## Biome 6 — `eldritch`

Color anchors: ground `#1a0820` · groundAlt `#10041a` · tree `#3a1844` · treeBark `#1a0a20` · ambient `#10042a` · lightFog 0.22  
Register: violet-black porous ground, purple sigils, twisted dark-purple tree perimeter

### ground

```
seamless tileable game floor texture, deep violet-black porous eldritch ground tile, base color #1a0820 dark purple-black, subtle porous pit texture suggesting corrupted earth, faint purple sigil rune fragment #3a1048 barely visible etched into surface as if branded, flat top-down view, anime pixel art register, 32x32 px, top-down camera view, no diagonal seams, edges match for 4-directional tiling, single light source from top-left, no shadow, no text, no characters, no objects, --ar 1:1 --tile --stylize 100 --v 7
```

### groundAlt

```
seamless tileable game floor texture, near-black dark purple eldritch ground darker checker variant, base color #10041a deepest void purple, deeper pore texture with almost imperceptible sigil trace #200830, more lightless and oppressive than primary variant, flat top-down view, anime pixel art register, 32x32 px, top-down camera view, no diagonal seams, edges match for 4-directional tiling, single light source from top-left, no shadow, no text, no characters, no objects, --ar 1:1 --tile --stylize 100 --v 7
```

### tree

```
seamless tileable game floor texture, twisted eldritch tree obstacle tile, base color #3a1844 deep violet-purple, gnarled contorted canopy mass viewed from above with warped branch silhouettes, treeBark #1a0a20 dark shadow-purple visible at trunk center, reads as a solid impassable corrupted tree, anime pixel art register, 32x32 px, top-down camera view, no diagonal seams, edges match for 4-directional tiling, single light source from top-left, no shadow, no text, no characters, no objects, --ar 1:1 --tile --stylize 100 --v 7
```

### decoration

```
seamless tileable game floor texture, eldritch sigil glyph accent overlay, one to two small rune-mark glyphs in glowing faint violet #6030a0 with subtle inner light, abstract angular symbol shapes not based on any real script, small footprint leaving most tile transparent, anime pixel art register, 32x32 px, top-down camera view, no diagonal seams, edges match for 4-directional tiling, single light source from top-left, no shadow, no text, no characters, no objects, --ar 1:1 --tile --stylize 100 --v 7
```

---

## Pipeline integration

1. Generate each tile via Midjourney with `--tile` flag.
2. Verify seamless tiling: paste 2×2 grid; edges should match without visible seams.
3. Save to `art/tiles/<biome>/<tile_type>.png` (e.g. `art/tiles/forest_summer/ground.png`).
4. Render module wiring (`hunt-render.js drawTiles`) will be updated in a separate worker (W-TileArt-Wire) to load these as `Image()` and use `ctx.drawImage` instead of solid `fillRect`. Decoration sprites (W-B's procedural primitives) become an OPTIONAL overlay layer, not the primary visual.

## Originality discipline

Tile patterns are not generally copyrightable as creative expression at this scale. The biome thematic register (forest/cold/autumn/temple/cave/eldritch) is genre convention. Specific tile-art compositions (the exact pixel-pattern of a tile) ARE creative expression — ours are originals.
