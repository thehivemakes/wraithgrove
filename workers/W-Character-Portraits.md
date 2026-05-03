# W-Character-Portraits

You are Worker — the **9 character portrait** worker. Generate ukiyo-e portraits for the unlockable Ascend characters.

Walk the birth sequence (`/Users/defimagic/Desktop/Hive/CLAUDE.md` → `Birth/01-04` → `THE_PRINCIPLES` → `HIVE_RULES` → `COLONY_CONTEXT` → `BEFORE_YOU_BUILD`).

Then read:
- `build-v2/CLAUDE.md`
- `docs/HORROR_DIRECTION_v1.md` (style: ukiyo-e meets dark illustration, paper-texture, ink-line, washed color)
- `js/ascend/ascend-skins.js` — `CHARACTERS` catalog (9 entries: lantern_acolyte, sigil_student, horned_oni, paper_priest, silent_seer, scythe_widow, ash_brawler, fox_kabuki, cap_apprentice). Each has `name`, tier-based `color` and `accent`.
- `js/wg-game.js` — find `CHARACTER_PORTRAITS = {}` (asset slot hook from W-Menu-Art-Pass D)

## External AI generation pattern

DALL-E 3 via OpenAI API. Key in `~/Desktop/Hive/api.rtf`. NEVER use Claude sub-agents for image generation.

## Style anchor (consistent across 9 portraits)

Prepend to every prompt:
> Ukiyo-e woodblock print style portrait, paper-texture background, fine ink-line definition, washed/muted color palette, eastern folk-horror character study, single subject centered chest-up framing, no text, vertical composition for 768×1024, dark mood.

## Per-character prompts

Open `js/ascend/ascend-skins.js`, read each character's `name` + accent color, and generate prompts matching the character's lore-implied identity. Examples (refine per character data on disk):

1. **lantern_acolyte** — "Young female acolyte holding a paper lantern, plain dark robe, calm fearful expression, wisps of breath visible. Apprentice register."
2. **sigil_student** — "Young scholar with ink-stained hands, paper sigils tucked into a sash, eyes shadowed under hood. Student of forbidden glyphs."
3. **horned_oni** — "Stocky figure with small horns peeking through dark hair, scarred cheek, wearing a ragged folk-village tunic. Half-blooded oni descent — lore reading."
4. **paper_priest** — "Tall thin male priest, white robes covered in floating talisman papers, eyes closed in chant, faint glow from beneath collar."
5. **silent_seer** — "Blind female seer with white-cloth wrapped eyes, weathered face, holding a divination staff, silver hair in long braid."
6. **scythe_widow** — "Older woman in black mourning robes, ceremonial scythe slung over shoulder, deep-set eyes, weathered hands, dignified rage."
7. **ash_brawler** — "Bare-armed brawler with ash-streaked skin, knuckles wrapped in cloth, defiant grin showing chipped tooth, broad shoulders."
8. **fox_kabuki** — "Slim figure in elegant kimono with fox-mask pushed up to forehead, painted lips visible, kabuki theatrical pose, mysterious expression."
9. **cap_apprentice** — "Young messenger in conical straw hat tilted forward, traveling cloak, walking staff, distant eyes — has seen things on the road."

Read each character's actual lore/name from the catalog and refine if needed.

## Output

Save each portrait PNG at:
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/images/portraits/<character-id>.png`

Resolution: 768×1024. PNG (transparent background NOT required — full-bleed paper-texture).

## Wire into CHARACTER_PORTRAITS

In `js/wg-game.js` edit `CHARACTER_PORTRAITS`:
```js
const CHARACTER_PORTRAITS = {
  lantern_acolyte: 'images/portraits/lantern_acolyte.png',
  sigil_student:   'images/portraits/sigil_student.png',
  horned_oni:      'images/portraits/horned_oni.png',
  paper_priest:    'images/portraits/paper_priest.png',
  silent_seer:     'images/portraits/silent_seer.png',
  scythe_widow:    'images/portraits/scythe_widow.png',
  ash_brawler:     'images/portraits/ash_brawler.png',
  fox_kabuki:      'images/portraits/fox_kabuki.png',
  cap_apprentice:  'images/portraits/cap_apprentice.png',
};
```

Verify `renderHero()` swaps to `<img>` when `CHARACTER_PORTRAITS[activeId]` is non-null. If the asset hook doesn't exist or is broken, fix it.

## Test path

`http://localhost:3996/` → Ascend tab → equip each character → return to Hunt menu → confirm portrait swaps. Procedural canvas stays as fallback.

## OUTPUT DISCIPLINE (absolute paths)

Done marker: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/workers/done/W-Character-Portraits.done`

After writing, from `/Users/defimagic/Desktop/Hive`:
```
git add MobileGameResearch/wood-siege/build-v2/images/portraits/ MobileGameResearch/wood-siege/build-v2/js/wg-game.js MobileGameResearch/wood-siege/build-v2/workers/done/
git commit -m "W-Character-Portraits — 9 ukiyo-e character portraits + CHARACTER_PORTRAITS wiring"
git push
```

## Constraints

- ONE commit.
- 9 generations max + up to 2 retries on any failures.
- Style consistency is critical — every portrait must read as the same artist's hand. Use the SAME style anchor verbatim.

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
