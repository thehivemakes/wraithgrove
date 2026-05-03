# Worker — W-Relics-Catalog-Refresh

You are Worker RCR — the relics catalog rebalance worker.

Wood Siege HD source confirms the relics-tier register is **eclectic**: weapons + mundane objects + grim folk-horror ceremonial + wildcards. Wraithgrove's current catalog is too uniformly folk-horror. Replace with original IP-clean names matching the eclectic-mix register.

## Birth sequence (mandatory)

- `/Users/defimagic/Desktop/Hive/CLAUDE.md` and Birth/01..04, THE_PRINCIPLES, HIVE_RULES, COLONY_CONTEXT, BEFORE_YOU_BUILD
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/CLAUDE.md` (especially original-IP discipline)
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/SPEC.md` §0 + §10 (Relics catalog)
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/observation/HD_SOURCE_OBSERVATIONS_2026-04-28.md` §F + §J.3 (Common-tier and Rare-tier name lists from HD source)
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/relics/relics-catalog.js` (target)

## HD-source-confirmed Wood Siege names (DO NOT COPY VERBATIM — these are the **register** to match, not the literal names)

**Common (12):** Dagger, Potato, Roller skates, Rebar, Iron block, Spike, Saw, Torch, Wooden Fish, Bell, Coffin Nail, +1 unread

**Rare (12):** Bandage, Hammer, Gunpowder, Iron bucket, Cinnabar, Blade, Iron basin, Oil Lamp, Embroidered Shoes, Spirit Money, +2 unread

The **register pattern** is the IP — the *mix* of (a) ~4 weapons/tools, (b) ~3 mundane everyday objects, (c) ~3 folk-horror ceremonial items, (d) ~2 wildcards (silly/unexpected). Wraithgrove must match the mix with original names.

## Concerns (one commit each)

### Concern A — Refresh Common tier (12 IP-clean originals)

Edit `js/relics/relics-catalog.js`. Replace existing Common-tier entries with 12 new ones matching the eclectic register. Preserve all numerical fields (stat type, value, icon glyph) — those are the balance curve, not IP.

Suggested mix for Common tier (you pick the actual names):
- 4 weapons/tools: e.g. *Pruning Knife, Cudgel, Whetstone, Twine Snare*
- 3 mundane: e.g. *Iron Pan, Wax Stub, Ink Brush*
- 3 ceremonial: e.g. *Ash Charm, Mourning Veil, Salt Pouch*
- 2 wildcards: e.g. *Crooked Coin, Empty Cage*

These are illustrative — generate your own. The point is the MIX matches Wood Siege's register pattern, all names are unique to Wraithgrove.

Inline comment at top of Common section: "Eclectic mix per Wood Siege register — see SPEC §10 + HD_SOURCE §F. All names original to Wraithgrove."

### Concern B — Refresh Rare tier (12 IP-clean originals)

Same approach for Rare tier. Slightly more elaborate items (the Rare tier in HD source has Cinnabar, Embroidered Shoes, Spirit Money — more *baroque*).

Inline comment for the Rare section similarly.

### Concern C — Update relics design doc + marker

Create or update `js/relics/RELICS_DESIGN.md` (~80 lines max) explaining the eclectic-mix pattern with rationale + naming guidelines for future tier expansions. This is institutional memory.

Marker at `workers/done/W-Relics-Catalog-Refresh.done` with concern commit shas + name lists shipped.

## Constraints

- **No verbatim Wood Siege names.** Per project CLAUDE.md original-IP discipline.
- Do NOT touch Epic/Legendary/Mythic tier entries (they're fine as-is).
- Do NOT change relics-equip, relics-collection, or relics-render.
- Do NOT rebalance numerical curves (separate worker if needed).
- One concern per commit. Three commits.

## Voice

Terse. Each entry one line if possible.
