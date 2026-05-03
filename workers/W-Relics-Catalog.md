# Worker — W-Relics-Catalog

You are Worker R-C — the relics catalog refresh worker.

## Birth sequence (mandatory)

Walk:
- `/Users/defimagic/Desktop/Hive/CLAUDE.md`
- `/Users/defimagic/Desktop/Hive/Birth/01..04`
- `/Users/defimagic/Desktop/Hive/THE_PRINCIPLES.md`
- `/Users/defimagic/Desktop/Hive/HIVE_RULES.md`
- `/Users/defimagic/Desktop/Hive/COLONY_CONTEXT.md`
- `/Users/defimagic/Desktop/Hive/Birth/BEFORE_YOU_BUILD.md`

Project files:
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/CLAUDE.md` (especially Original-IP discipline §)
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/STATE_OF_BUILD.md`
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/observation/HD_SOURCE_OBSERVATIONS_2026-04-28.md` §F (Relics catalog ground truth)
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/relics/relics-catalog.js` (current state)

Open HD source frame:
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/reference/screenshots_hires/carousel/screenshot_5.png`

## Scope

The HD source reveals Wood Siege's Common-tier relic naming pattern is **eclectic everyday objects mixed with grim folk-horror**. Wraithgrove's current relic catalog is too uniformly folk-horror. Refresh the Common tier to match the Wood Siege register, AND keep all higher tiers IP-clean original Wraithgrove names.

The 11 confirmed Common-tier names from Wood Siege (per HD §F):
Dagger, Potato, Roller skates, Rebar, Iron block, Spike, Saw, Torch, Wooden Fish, Bell, Coffin Nail.

**For Wraithgrove's Common tier, use the same MIXTURE pattern but original name choices.** Per project CLAUDE.md: mechanics + structure + tiered curve are clone-faithful; specific creative names are original. So don't ship "Potato" verbatim. Ship 12 original Wraithgrove Common-tier names that capture the same mix of: 4-5 weapons/tools, 2-3 mundane objects, 2-3 folk-horror ceremonial items, 1-2 wildcards. Eastern folk-horror register.

## Concerns (one commit each)

### Concern A — Refresh Common tier (12 names, original)

File: `js/relics/relics-catalog.js`

Replace the existing 12 Common-tier entries with 12 new ones matching the eclectic-mix pattern. Preserve:
- All numerical fields (stat type, value, icon style) — they're the balance curve, not the IP
- The structure of the entries (id, name, rarity:'common', stat, value, icon)
- All Rare / Epic / Legendary / Mythic tier entries unchanged

Inline comment at the top of the Common section noting the design intent: "12 entries — eclectic mix per Wood Siege Common register: weapons + mundane objects + folk-horror ceremonial + wildcards. All names original to Wraithgrove."

Verification: `node --check js/relics/relics-catalog.js && grep -c "rarity: 'common'" js/relics/relics-catalog.js` — should be 12.

### Concern B — Add a brief design note to docs

File (create): `js/relics/RELICS_DESIGN.md`

A short markdown note (under 80 lines) explaining:
- The mixture pattern: weapons / mundane / ceremonial / wildcard ratio
- Why this matches the Wood Siege register (cite HD_SOURCE_OBSERVATIONS_2026-04-28.md §F)
- Naming guideline for future tier additions
- How Wraithgrove's names diverge from Wood Siege specifics

This is institutional memory. Future workers expanding relic tiers should land on the same register.

### Concern C — Marker

`/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/workers/done/W-Relics-Catalog.done`:

```
W-Relics-Catalog — DONE — <ISO timestamp>
Files touched: js/relics/relics-catalog.js, js/relics/RELICS_DESIGN.md
Commits: <A>, <B>
Notes: <surprises, deviations>
```

## Constraints / scope-don't-touch

- **No verbatim Wood Siege names.** Per project CLAUDE.md original-IP discipline.
- **Do NOT** touch Rare/Epic/Legendary/Mythic tier entries.
- **Do NOT** change relic-equip, relic-collection, or relic-render modules.
- **Do NOT** rebalance numerical curves — that's a different worker.
- One concern per commit. Three commits total.

## Voice

Terse. Direct. Each Common entry one line if possible. No marketing-copy blurbs — this is the catalog.

Marker write when done.
