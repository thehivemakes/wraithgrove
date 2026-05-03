# W-Menu-Art-Pass

You are Worker — the **menu art polish** worker.

Walk the birth sequence (`/Users/defimagic/Desktop/Hive/CLAUDE.md` → `Birth/01-04` → `THE_PRINCIPLES` → `HIVE_RULES` → `COLONY_CONTEXT` → `BEFORE_YOU_BUILD`).

Then read this file (`build-v2/CLAUDE.md`), `STATE_OF_BUILD.md`, `js/wg-game.js` (the hero menu was just rewritten — see `showHuntStageList`, `BIOME_PALETTE`, `renderHero`), `js/hunt/hunt-render.js` (`drawCharacter` family — sprite reference for character preview), `js/ascend/ascend-skins.js` (character catalog — 9 unlockable characters, each with `name` and tier-based `power`).

## Architect 2026-05-02

> "Spin up a sonnet to fix the graphics on the menu to look beautiful in terms of what's in the picture. For stage selection, we need it to look beautiful. And the character there, too."

The reference is Wood Siege "Ghost Marriage" home — character standing on a meadow with paper-lantern tent in the back, painterly biome art, atmospheric mood. Our current hero tile uses CSS gradient blobs + triangle trees — functional, ugly.

## Concerns (ONE COMMIT EACH)

### Concern A — Biome backgrounds (replace gradient + triangle trees)

In `js/wg-game.js` `renderHero()`, the current background is two `<div>` gradients + 6 triangle trees. Replace with **canvas-rendered biome scenes** — one canvas per hero tile, drawn fresh on stage change.

For each of the 6 biomes (`forest_summer`, `forest_autumn`, `cold_stone`, `temple`, `cave`, `eldritch`):
- Layered parallax background: distant fog/sky band, mid-ground silhouette layer (mountains/temple/trees), foreground floor with grass/snow/sand texture using `ctx.fillRect` micro-stipple.
- 3-5 atmospheric props per biome (paper lanterns for forest_summer, autumn maples for forest_autumn, ice spires for cold_stone, pagoda silhouette for temple, stalactites for cave, broken sigils for eldritch).
- Subtle animation: lantern bob (forest_summer), falling leaves (forest_autumn), drifting snow (cold_stone), ember motes (temple), water drip glints (cave), violet sigil pulse (eldritch). 30 fps `requestAnimationFrame` loop while menu open; cancel on tab switch.

### Concern B — Character preview (replace gradient blob)

The current character is `<div>` with `radial-gradient`. Replace with **canvas-rendered sprite** matching the actual in-Hunt character render.

Use `WG.HuntRender.drawCharacter` if exposed, or open `js/hunt/hunt-render.js` `drawCharacter` and reuse the same path. Render the sprite at 2× scale, idle facing-S, on its own canvas overlaid on the biome canvas. Read active character via `WG.State.get().player.activeCharacter` → `WG.AscendSkins.get(id)`.

Add subtle idle animation: 2px vertical bob @ 1.5s period, faint ground shadow (radial gradient ellipse below feet, 60% opacity).

### Concern C — Polish (depth + readability)

- Vignette: radial gradient overlay, 0% center / 70% edges, blend-mode `multiply`, opacity 0.4. Drops focus on the character.
- Title block: replace plain `text-shadow` with a faint glyphic divider underline (1px gradient line + 6px gold dot center), bumps the "place" feel.
- Carousel position dots → biome accent dots already done; tighten spacing to 5px gap.
- BATTLE button: add subtle ember-orange box-shadow pulse on idle (animation: `pulse 2s infinite`).

## Constraints

- ONLY touch `js/wg-game.js` (hero render path) + optionally tiny CSS additions in `index.html` for the BATTLE pulse keyframes.
- Do NOT change menu logic — carousel, lock progression, modals all stay.
- Do NOT change mechanics. No edits to hunt-stage / hunt-enemies / catalogs.
- Animation loop must `cancelAnimationFrame` when menu is removed (avoid leak when entering Hunt).
- Test happy path at `http://localhost:3996/` — open menu, scroll all 18 stages with arrows, confirm each biome looks distinct + character renders + locked stages still show overlay.

## Verification

```bash
node --check build-v2/js/wg-game.js
grep -n "renderHero\|cancelAnimationFrame\|drawCharacter" build-v2/js/wg-game.js
```

Browser smoke test: open Hunt tab, scroll all 18 stages, confirm 6 distinct biomes + 9 character names render correctly. Confirm canvas frees when navigating to Forge tab.

## Done marker

Write `workers/done/W-Menu-Art-Pass.done` with concern summaries + the 6 biome treatments + the character-render approach.

### Concern D — Asset slot hooks (added by Architect 2026-05-02)

Architect locked the visual direction: ukiyo-e meets dark illustration for menus
(painterly, paper-textured, ink-line, washed color). Combat keeps current sprites.

The procedural canvas art from Concerns A-C is the IMMEDIATE shipping path while
illustration commissions (or AI-generated + cleaned art) are sourced. Add hooks
so swap-in is zero-rewrite.

In `js/wg-game.js`:

1. **Biome art hook** — define `const BIOME_ART = { forest_summer: null, forest_autumn: null, ... };` near `BIOME_PALETTE`. Each value is `null` (use procedural) or a string URL to an illustrated background image.

2. In `renderHero()`: if `BIOME_ART[stage.biome]` is a non-null URL, render an `<img>` element absolute-positioned over the canvas at z-index 0, with the canvas as fallback. Image loads lazy with `decoding="async"`.

3. **Character portrait hook** — define `const CHARACTER_PORTRAITS = {};` keyed by character id. Same null/URL pattern. Replace the canvas sprite render when an illustration URL exists.

4. **Cross-IP intrusion overlay** — when `BIOME_ART` resolves to a "rift" biome (future eldritch tier with cross-IP characters), apply a CSS filter: `filter: drop-shadow(0 0 8px rgba(192,96,255,0.6)) hue-rotate(15deg);` + a subtle `glitch` keyframe (pixel offset every 3-4s, 80ms duration). Marks "this character/place doesn't fully belong."

5. Document the hook in a header comment: `// ART SLOTS: Set BIOME_ART[id] / CHARACTER_PORTRAITS[id] to a URL when illustrated assets ship. Cross-IP intrusions trigger violet drop-shadow + glitch keyframe.`

Concern D is the LAST commit. Procedural art ships first; illustrated art swaps in later via these hooks without touching render logic.
