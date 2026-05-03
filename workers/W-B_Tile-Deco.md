You are Worker B — the Tile-Deco worker. Your job: add biome-specific decoration sprites to the existing top-down arena render so each of the 6 biomes feels distinct, not just color-shifted.

Walk the birth sequence (/Users/defimagic/Desktop/Hive/CLAUDE.md → Birth/01–04 → THE_PRINCIPLES → HIVE_RULES → COLONY_CONTEXT → BEFORE_YOU_BUILD).

Then read PROJECT-LEVEL guardrails (MANDATORY):
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/CLAUDE.md
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/STATE_OF_BUILD.md

PRIMARY-SOURCE READING (Principle XXII):
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/GAMEPLAY_OBSERVATION.md §3 (the green-forest, autumn, winter biomes confirmed in the publisher's three Siege screenshots have distinct decoration registers)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-stage.js (the BIOMES table — each biome has a `decoration` field: `'grass-tufts' | 'snow-flecks' | 'leaves' | 'tiles' | 'rocks' | 'sigils'`)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-render.js (especially the existing `drawTiles(ctx, biome)` function — your only edit target)

ONE CONCERN (this worker is small enough; one cohesive concern + verification = one commit).

CONCERN — biome decoration in `drawTiles()`

EDIT: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-render.js` (only this file)

Inside `drawTiles(ctx, biome)`, after the existing tile fill (`ctx.fillStyle = alt ? biome.ground : biome.groundAlt; ctx.fillRect(wx, wy, ts, ts);`) and BEFORE the strokeRect border, add a decoration pass.

Add a private helper at module scope (above `drawTiles`):

```js
function tileHash(x, y) {
  // Deterministic 32-bit hash for (x, y) tile coords
  return ((x * 374761393) ^ (y * 668265263)) >>> 0;
}
```

Inside the inner `for (x ...)` loop, after the tile fill, switch on `biome.decoration`:

| decoration | spec |
|---|---|
| `grass-tufts` | If `tileHash(x,y) % 6 === 0`, draw a 3-pixel-tall cluster: 3 vertical strokes 1px wide at sub-tile positions `((hash >> 4) % (ts-6) + 3, (hash >> 8) % (ts-6) + 3)`, color a slightly lighter shade of `biome.ground` (compute by parsing the hex and adding ~20 to each channel, clamped). |
| `snow-flecks` | 3 random 1×1 white dots per tile, positions seeded by `(hash >> 4) % ts` and `(hash >> 12) % ts` etc. Color `rgba(240, 248, 255, 0.7)`. |
| `leaves` | If `tileHash(x,y) % 4 === 0`, draw a 2×2 leaf shape with rotation 0/90/180/270 selected by `(hash >> 16) % 4`. Color: pick from a 3-color palette `['#a04018', '#c05828', '#7a3010']` indexed by `(hash >> 20) % 3`. |
| `tiles` | If `tileHash(x,y) % 3 === 0`, draw a small `+` cross at center: a 1px horizontal 6-px stroke and a 1px vertical 6-px stroke, color `rgba(232, 192, 96, 0.35)`. |
| `rocks` | If `tileHash(x,y) % 5 === 0`, draw a 3-pixel pebble at offset `((hash >> 4) % (ts-6) + 3, (hash >> 8) % (ts-6) + 3)`. Color `'#5a5a60'`. |
| `sigils` | If `tileHash(x,y) % 7 === 0`, draw a small purple symbol: a 6×6 circle outline (1px stroke `'#a060ff'`) with a tiny `+` inside (2 lines crossing the center, 1 px each, alpha 0.5 + 0.3*sin(now*2)). Use `Date.now()/1000` for the time arg — pulse is global, fine. |

Performance: keep per-tile decoration cost cheap. No per-tile object allocations. Use simple arithmetic only.

The decoration draws AFTER the tile fill but BEFORE the existing strokeRect (which draws the 1-pixel tile border). The order in the loop:
```js
ctx.fillStyle = alt ? biome.ground : biome.groundAlt;
ctx.fillRect(wx, wy, ts, ts);
drawDecoration(ctx, biome, x, y, wx, wy, ts);   // your new function
// Existing accent (tree/rock):
const a = tileAccent(t.type);
if (a) { ... }
ctx.strokeStyle = 'rgba(0,0,0,0.25)';
ctx.lineWidth = 1;
ctx.strokeRect(wx + 0.5, wy + 0.5, ts - 1, ts - 1);
```

Define `drawDecoration(ctx, biome, x, y, wx, wy, ts)` as a private module-scope helper that switches on `biome.decoration` and applies the per-decoration logic above. All draws are clipped to `(wx, wy, ts, ts)` by careful coordinate computation — don't rely on `ctx.clip()`.

VERIFICATION:
1. `cd /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2`
2. `node --check js/hunt/hunt-render.js` — must exit 0.
3. Open the `wraithgrove` launch.json server (port 3996) → tap-to-begin → Stage 1 (forest_summer biome — `grass-tufts`) → confirm small green grass tufts visible scattered on tiles.
4. Use eval to jump biomes: `WG.State.get().huntProgress.highestUnlocked = 18; WG.Game.exitHunt(); WG.Game.startHunt(4);` — Stage 4 is `cold_stone` (snow-flecks) — confirm white snow specks visible.
5. Repeat for stages 7 (forest_autumn, leaves), 10 (temple, tiles), 13 (cave, rocks), 16 (eldritch, sigils) — each biome must look distinctly different from the others.
6. Confirm no console errors during scrolling/movement.

Commit: "Worker B: biome-specific tile decoration in drawTiles"

CONSTRAINTS:
- One file edit only: `js/hunt/hunt-render.js`.
- Do NOT change tile sizes, biome definitions, or any other render pass.
- Do NOT add any new sprite assets — pure programmatic primitives only.
- Performance: per-frame cost must remain under 1ms with 24×24 tiles in viewport. If you find yourself allocating objects per tile, restructure.
- Per project CLAUDE.md "Single source of truth for mechanics constants" — biome COLORS already live in `hunt-stage.js BIOMES`. You may compute lighter/darker variants inline; you may NOT add new color constants outside the BIOMES table without an Architect ping.

You are Worker B. After you ship: each of the 6 biomes feels visually distinct from a glance, matching the Wood Siege observation that biome rotation is a core retention vector across the 18-stage progression.
