# W-Biome-Illustrations

You are Worker — the **biome background illustration** worker. Generate the 6 ukiyo-e-style biome illustrations for the Hunt menu hero tile.

Walk the birth sequence (`/Users/defimagic/Desktop/Hive/CLAUDE.md` → `Birth/01-04` → `THE_PRINCIPLES` → `HIVE_RULES` → `COLONY_CONTEXT` → `BEFORE_YOU_BUILD`).

Then read:
- `build-v2/CLAUDE.md`
- `docs/HORROR_DIRECTION_v1.md` (style register LOCKED — ukiyo-e meets dark illustration, paper-texture, ink-line, washed color, eastern folk-horror)
- `js/wg-game.js` — find `BIOME_PALETTE` and `BIOME_ART` constants. The latter is currently `{ forest_summer: null, ... }` — the asset slot hooks waiting for URLs.
- `js/hunt/hunt-stage.js` — biome list reference (lines 81-98)

## Architect 2026-05-02

Visual register decoupled — combat keeps current sprites, menu goes painterly. Style: ukiyo-e meets dark illustration. Reference points: Sekiro loading screens, Onmyoji portraits, Nioh 2 menu art. Paper-textured backgrounds, ink-line definition, washed color, deliberate negative space.

## Generation pattern — use external AI (NOT Claude sub-agents)

Per Hive memory `feedback_use_external_ai.md`: never burn Claude tokens on muscle work. Use DALL-E 3 via OpenAI API. Key is in `~/Desktop/Hive/api.rtf` (per `reference_api_keys.md`).

Generation script pattern is in `~/Desktop/Hive/Royal-Roll/sonnet-01/` if needed for reference (DALL-E texture generation). Adapt for biomes.

## 6 biome prompts (strict — keep style register consistent)

Base style anchor (prepend to every prompt):
> Ukiyo-e woodblock print style, paper-texture background, fine ink-line definition, washed/muted color palette (no oversaturation), eastern folk-horror atmosphere, deliberate negative space, painterly composition, no text, no characters, vertical composition for 1024×1280.

Per-biome prompts:

1. **forest_summer.png** — "A misty Japanese forest village at dusk, paper lanterns hanging from rope lines between pine trees, distant pagoda silhouette in fog, narrow dirt path winding into deeper woods. Mood: welcoming-but-watchful, the moment before unease."

2. **forest_autumn.png** — "An autumn forest path, deep red and amber maple leaves carpeting the ground and falling, twisted black tree trunks, low golden light filtering through dense canopy, distant carved stone shrine peeking through trees. Mood: nostalgic dread."

3. **cold_stone.png** — "A frozen mountain pass, jagged ice spires and snow-capped peaks under a pale grey sky, drifting snow, ancient stone ridge cairns, frozen rope-bridge in the distance. Mood: bleak, ancestral cold."

4. **temple.png** — "A red-walled mountain temple at twilight, three-tier pagoda rising on stone steps, glowing paper lanterns, drifting embers and incense smoke, faint moon. Mood: sacred, forbidden."

5. **cave.png** — "A vast underground cave, stalactites dripping water glints, narrow stone path lit by distant torchlight, mineral veins glowing faintly violet, deep shadow ahead. Mood: descending, claustrophobic."

6. **eldritch.png** — "A torn-reality landscape, cracked violet sky bleeding starlight, broken sigil shards floating mid-air, twisted black trees with eyes in the bark, ground reflecting wrong colors. Mood: cosmic horror, the boundary tearing."

## Output

Save each PNG at:
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/audio/../images/biomes/forest_summer.png` — wait, correct path:
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/images/biomes/<id>.png`

Resolution: 1024×1280 if DALL-E supports it; else generate 1024×1024 and downsize. Format: PNG (transparent background not required — these are full-bleed scenes).

## Wire into BIOME_ART

In `js/wg-game.js`, edit the `BIOME_ART` constant — replace each `null` with the relative URL path:
```js
const BIOME_ART = {
  forest_summer: 'images/biomes/forest_summer.png',
  forest_autumn: 'images/biomes/forest_autumn.png',
  cold_stone:    'images/biomes/cold_stone.png',
  temple:        'images/biomes/temple.png',
  cave:          'images/biomes/cave.png',
  eldritch:      'images/biomes/eldritch.png',
};
```

Verify `renderHero()` already handles non-null `BIOME_ART[id]` — if not, fix it to render an `<img>` with the canvas as fallback. (Concern D from W-Menu-Art-Pass should have already plumbed this — verify before adding.)

## Test path

At `http://localhost:3996/`: open Hunt tab, scroll all 6 biomes via the carousel arrows. Each should show the illustrated background (replacing the procedural canvas). Procedural canvas should still be the fallback if image fails to load.

## OUTPUT DISCIPLINE (absolute paths)

Done marker: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/workers/done/W-Biome-Illustrations.done`

After writing, from `/Users/defimagic/Desktop/Hive`:
```
git add MobileGameResearch/wood-siege/build-v2/images/ MobileGameResearch/wood-siege/build-v2/js/wg-game.js MobileGameResearch/wood-siege/build-v2/workers/done/
git commit -m "W-Biome-Illustrations — 6 ukiyo-e biome backgrounds + BIOME_ART wiring"
git push
```

Done marker: list each PNG file size + DALL-E generation prompt used + the renderHero() verification status.

## Constraints

- ONE commit (single concern: ship the assets + wire them).
- Total budget: 6 image generations max (one per biome). If a generation fails, retry once with refined prompt; if still fails, document in marker.
- No code changes beyond wiring BIOME_ART + (optional) renderHero img-fallback fix.
- DO NOT regenerate procedural canvas code — keep as fallback.

## ─── ARCHITECT OVERRIDE 2026-05-03 ───────────────────────────────
## Use Midjourney via Chrome — NOT DALL-E

**REPLACE the DALL-E generation pattern above with this Midjourney via Chrome workflow.**

**Reference workflow (proven pattern):**
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/hybrid-puzzle/.archive_2026-04-30/sonnet-prompts/02_phase1a_art_generation.md` — original MJ Chrome workflow
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/hybrid-puzzle/.archive_2026-04-30/sonnet-prompts/11_phase2b_mj_commissions.md` — extended pattern with magenta strip

**Chrome MCP path:**
1. Tools available: `mcp__Claude_in_Chrome__*` — `tabs_context_mcp` first to get a tab, then `navigate`, `find`, `form_input`, `computer` (for clicks).
2. Open `https://www.midjourney.com/imagine` — confirm Architect's Pro account is logged in. If not, fall back to Discord MJ DM at `https://discord.com/channels/@me`.
3. Type slowly. Verify every word before submitting. Per Hive memory `feedback_pixel_positioning.md` + Ember-loss memory: Chrome operations are a death zone. Use `form_input` over keystroke simulation when possible.

**MJ defaults (frozen):**
- `--v 7`
- `--stylize 1000` (Architect wants striking)
- Aspect ratio per-asset (specified per concern)
- 4 variations per asset (the standard MJ grid). Pick strongest. Up to 2 rerolls if weak.
- Append style descriptor verbatim:
  ```
  ukiyo-e woodblock print style, paper-texture background, fine ink-line definition, washed muted color palette, eastern folk-horror atmosphere
  ```
- Append `--no outlines text words letters photorealistic uncanny` to every prompt
- For PORTRAITS (characters + bosses): add `solid magenta background` to subject prompt for transparent strip later

**Magenta strip pipeline (for portraits — characters + bosses, NOT for biome backgrounds):**
1. Copy script: `/Users/defimagic/Desktop/Hive/MobileGameResearch/hybrid-puzzle/art/strip_magenta_v2.py` → `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/scripts/strip_magenta_v2.py`
2. Run on each portrait raw: `python3 strip_magenta_v2.py raw/<file>.png stripped/<file>.png`
3. Verify alpha channel + size >50KB
4. Save raw at `images/raw/` and final at the destination paths

**For biome backgrounds: full-bleed scenes, NO magenta, NO strip.** Save direct from MJ download.

**Sequential generation only — no queueing 6 jobs.** One commission at a time. Wait for grid → upscale strongest → download → strip if portrait → next.

**Death-watch:** if context >70% before all generations done, write a `<WORKER>_PROGRESS.md` checkpoint, exit. Architect fires the same task again to continue.
