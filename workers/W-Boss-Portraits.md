# W-Boss-Portraits

You are Worker — the **6 boss portrait** worker. Generate ukiyo-e portraits for the boss-intro screen.

Walk the birth sequence (`/Users/defimagic/Desktop/Hive/CLAUDE.md` → `Birth/01-04` → `THE_PRINCIPLES` → `HIVE_RULES` → `COLONY_CONTEXT` → `BEFORE_YOU_BUILD`).

Then read:
- `build-v2/CLAUDE.md`
- `docs/HORROR_DIRECTION_v1.md` (style: ukiyo-e meets dark illustration)
- `js/hunt/hunt-bosses.js` — boss catalog (6 bosses: pale_bride, frozen_crone, autumn_lord, temple_warden, cave_mother, wraith_father)
- `js/hunt/hunt-stage.js` — confirm boss-stage mapping
- `js/wg-game.js` — confirm whether `BOSS_PORTRAITS` slot hook exists; if not, add it (parallel to BIOME_ART pattern)

## External AI generation pattern

DALL-E 3 via OpenAI API. Key in `~/Desktop/Hive/api.rtf`. NEVER Claude sub-agents.

## Style anchor

Prepend to every prompt:
> Ukiyo-e woodblock print style boss portrait, paper-texture background, fine ink-line definition, washed/muted dark color palette, eastern folk-horror cinematic boss reveal, single subject centered with menacing posture, no text, square composition for 1024×1024, intense atmosphere.

## Per-boss prompts (read names + descriptions from `hunt-bosses.js` first; refine these starters)

1. **pale_bride.png** — "A spectral bride in tattered white wedding kimono, face partially veiled, long black hair drifting unnaturally, hovering above a temple floor, paper amulets floating around her, single tear of blood. Stage 3 boss — Hollow Shrine."

2. **frozen_crone.png** — "An ancient crone wrapped in ice-blue robes, frost forming on her wrinkled hands, ice-shard staff, snow swirling around her, eyes glowing pale blue, ice spires behind. Stage 6 boss — Throat of Ice."

3. **autumn_lord.png** — "A massive horned warrior in autumn-leaf armor, dual katanas, leaf-storm swirling around him, masked face with single visible red eye, standing in a forest clearing of fallen maples. Stage 9 boss — Marrow Hollow."

4. **temple_warden.png** — "A stone-armored sentinel with a glowing geometric mask, wielding an ornate halberd, standing before a temple gate, ember motes drifting, ancient sigils carved into armor plates. Stage 12 boss — Vault of Names."

5. **cave_mother.png** — "A massive eldritch cave matriarch, dark elongated form with multiple faintly-glowing eyes, surrounded by smaller spawn-creatures, dripping cave ceiling above. Stage 15 boss — Cradle of Maw."

6. **wraith_father.png** — "The Wraith Father — towering void-shape composed of swirling dark mist and bone-fragments, mask of broken sigils for a face, three pairs of arms reaching outward, violet starlight bleeding from gaps in his form. Endgame boss — final fight."

## Output

Save each PNG at:
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/images/bosses/<boss-id>.png`

Resolution: 1024×1024. PNG.

## Wire into BOSS_PORTRAITS

In `js/wg-game.js`, add (if not present):
```js
const BOSS_PORTRAITS = {
  pale_bride:     'images/bosses/pale_bride.png',
  frozen_crone:   'images/bosses/frozen_crone.png',
  autumn_lord:    'images/bosses/autumn_lord.png',
  temple_warden:  'images/bosses/temple_warden.png',
  cave_mother:    'images/bosses/cave_mother.png',
  wraith_father:  'images/bosses/wraith_father.png',
};
```

Add a boss-intro reveal moment in the Hunt loop:
- When `boss:spawned` event fires, show a 1.5s overlay: dark gradient + boss portrait fade-in (300ms) + boss name display + slide-out (300ms)
- Read portrait URL from `BOSS_PORTRAITS[bossId]` — fallback to no-overlay if null
- Pause world-sim during the reveal (use `WG.Engine.setHitPause` or equivalent)

Add minimal CSS for the overlay if needed (inline in wg-game.js or a small block in index.html).

## Test path

`http://localhost:3996/` → Hunt → start any boss stage → run to boss spawn → confirm intro overlay fires with portrait + name + 1.5s pause + game resumes.

## OUTPUT DISCIPLINE (absolute paths)

Done marker: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/workers/done/W-Boss-Portraits.done`

After writing, from `/Users/defimagic/Desktop/Hive`:
```
git add MobileGameResearch/wood-siege/build-v2/images/bosses/ MobileGameResearch/wood-siege/build-v2/js/wg-game.js MobileGameResearch/wood-siege/build-v2/workers/done/
git commit -m "W-Boss-Portraits — 6 ukiyo-e boss portraits + intro reveal moment"
git push
```

## Constraints

- ONE commit.
- 6 generations max + 2 retries.
- Boss-intro overlay is part of this scope (not a separate worker).
- Style register MUST match biome backgrounds + character portraits — same paper texture, same ink-line, same washed color.

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
