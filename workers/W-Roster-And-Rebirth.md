# Worker — W-Roster-And-Rebirth

You are Worker RR — character roster + Rebirth-tier visual progression.

Per SPEC §0: skin = Rebirth-tier appearance per character (NOT separate skins). Active-character bonus only when actively played. 9-character roster.

## Birth + design source

Standard birth + project files. Especially:
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/SPEC.md` §0 (character model) + §12 (roster archetypes)
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/observation/HD_SOURCE_OBSERVATIONS_2026-04-28.md` §J.2 (6 confirmed archetypes from HD source)
- `js/ascend/ascend-skins.js`, `js/ascend/ascend-render.js`, `js/ascend/ascend-character.js`

## Concerns (one commit each)

### A — Replace skin catalog with 9-character roster

Rewrite `js/ascend/ascend-skins.js` (`SKINS` becomes `CHARACTERS`):

9 character archetypes per HD source:
1. **schoolgirl** (default) — pigtails, white blouse, dark skirt, black tights — has 4 Rebirth tiers
2. **white_haired_student** — letterman shirt with "S" — 3 tiers
3. **samurai** — red armor + horned helmet — 3 tiers
4. **jiangshi_priest** — conical straw hat, paper amulet vest — 3 tiers
5. **seated_grim** — wheelchair-bound mystic — 2 tiers (premium)
6. **scythe_hood** — hooded reaper figure — 3 tiers
7. **afro_brawler** — tall afro, intense scowl — 2 tiers
8. **fox_mask** — kabuki/oni mask figure — 3 tiers
9. **cap_boy** — child-archetype with cap — 2 tiers

Each character: `{ id, name, archetype, tiers: [{tierIndex, name, power, unlocked, requiresStageClear, color, accent}], unlocked }`. Default schoolgirl unlocked + tier 1; others gated by IAP or progression (per SPEC §0 monetization).

`activeCharacter` field on `WG.State.get().player` — only the active character grants its bonus.

API:
- `WG.AscendChars.list()` — all 9
- `WG.AscendChars.setActive(id)` — switches; emits `character:active-change`
- `WG.AscendChars.tryRebirth(charId)` — advances tier if unlock conditions met (stage cleared, gold cost paid)

### B — Roster picker UI + Rebirth event flow

Edit `js/ascend/ascend-render.js` (or wherever the Skin button modal lives):

- Skin button → opens a 3-col grid of character archetype cards (9 cards). Each shows portrait + name + active checkmark + "TAP TO PLAY".
- Tapping an unlocked character sets it active.
- Locked characters show unlock cost (diamonds or stage-clear requirement).

Rebirth event in-stage: when `runtime.bossDefeated === true` AND the character has a next-tier available, on stage clear show **REBIRTH** modal (full-screen overlay, dark backdrop with golden border):
- Heading: "REBIRTH — TIER X UNLOCKED"
- Character portrait morphs from current tier → next tier (use a 1.2s scale+fade dissolve via canvas crossfade)
- Reward chips: tier-N skin × 1, diamonds × 100, hammer × 10
- "Cultivate (cost: ~2880 coins)" button + "Continue" button

`runtime.rebirthPending = true` on stage clear if character qualifies. Modal handler in JS.

### C — Stat-cost ladder + marker

For each character + tier, compute Power per SPEC §0 model. Update Power readout in HUD. Update Cultivate cost ladder in `ascend-character.js` if needed.

Marker at `workers/done/W-Roster-And-Rebirth.done` with characters + tier counts + commit hashes.

## Constraints

- All 9 character names IP-clean originals — no Wood Siege names
- Don't break existing player rendering (`drawAnimeGirl` is the schoolgirl tier-1 — keep it as the default render until per-character draws ship in a follow-up worker)
- Per-character sprite draws can be a stub for now (gray-out unimplemented characters' icons); core focus is the catalog + UI + Rebirth flow
- One concern per commit. Three commits.
