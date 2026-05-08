# Relics Design — Naming Register

## The eclectic-mix pattern

Common-tier relics in Wood Siege (ground truth: `observation/HD_SOURCE_OBSERVATIONS_2026-04-28.md §F`) follow a deliberate **eclectic** naming register, not a pure folk-horror one. The 11 confirmed Wood Siege Common names — Dagger, Potato, Roller skates, Rebar, Iron block, Spike, Saw, Torch, Wooden Fish, Bell, Coffin Nail — span four categories:

| Category | Count | Wood Siege examples |
|----------|-------|---------|
| Tools / weapons | 4–5 | Dagger, Rebar, Spike, Saw |
| Mundane everyday objects | 2–3 | Torch, Iron block |
| Folk-horror ceremonial | 2–3 | Wooden Fish, Bell, Coffin Nail |
| Wildcards (mundane-absurd) | 2 | Potato, Roller skates |

The Rare tier (HD_SOURCE §J.3) continues the pattern with more **baroque** flavor: Bandage, Hammer, Gunpowder, Iron bucket (practical Western) alongside Cinnabar, Oil Lamp, Embroidered Shoes, Spirit Money (Eastern ceremonial). Mundane-absurd wildcards drop off; ceremonial gets richer.

## Why this matters

The earliest Wraithgrove Common tier was uniformly folk-horror (Hempcord, Birch Strip, Clay Rod). That register is tonally coherent but mechanically wrong — it misses the mundane-absurd humor that makes Wood Siege Common relics feel discoverable and slightly absurd. **Potato and Roller skates are not accidents; they are the register.** A Common tier without a Potato-equivalent is too earnest.

## Wraithgrove's current catalog (post-Refresh)

**Common (12)** — 4 tools + 3 mundane + 3 ceremonial + 2 wildcards:

- Tools: Twine Lash, River Cobble, Whetted Sliver, Rusted Hatchet
- Mundane: Tin Bowl, Boiled Rag, Garlic Stalk
- Ceremonial: Burnt Petition, Funeral Urn, Joss Leaf
- Wildcards (mundane-absurd): Reed Pipe, **Pickled Radish** ← the Potato slot

**Rare (12)** — practical Western + Eastern baroque ceremonial + folk-horror:

- Practical Western: Iron Cog, Carpenter Maul, Knotted Cord
- Eastern baroque: Paper Moth, Brass Lantern, Embroidered Sash, Cypress Resin, Vermilion Brush
- Folk-horror: Carved Tibia, Bone Charm, Crow Plume
- Dual-coded mundane: Salt Sack (food + spirit ward)

## Naming guideline for future tier additions

**Common:** 4 tools/weapons + 3 mundane + 3 folk-horror ceremonial + 2 wildcards. The wildcards are mandatory — they are the tonal pressure-release. Without them the register collapses into "earnest folk-horror."

**Rare:** Lean practical Western tools + Eastern ceremonial. The mundane-absurd wildcards drop off; ceremonial gets richer (cinnabar, lantern, silk, joss-paper). One dual-coded mundane is allowed (e.g. salt — food and ward).

**Epic and above:** Full folk-horror. No mundane interruptions. Names should feel earned — compound, resonant, slightly ominous (Mournlock, Lichen Sigil, Raven Knot). Already shipped — do not modify without separate worker.

## How Wraithgrove diverges from Wood Siege specifics

All Wraithgrove relic names are original IP. The **register** (eclectic mix, Eastern folk-horror tone) is clone-faithful. The **specific names** are not:

- Wood Siege Potato → Wraithgrove **Pickled Radish** (mundane-absurd food, Eastern preserve)
- Wood Siege Roller skates → Wraithgrove **Reed Pipe** (folk wildcard, different domain)
- Wood Siege Wooden Fish → Wraithgrove ceremonial slot (Burnt Petition / Joss Leaf)
- Wood Siege Coffin Nail → Wraithgrove **Funeral Urn** (folk-horror, distinct item)
- Wood Siege Cinnabar → Wraithgrove **Vermilion Brush** (cinnabar pigment, ink-brush form)
- Wood Siege Embroidered Shoes → Wraithgrove **Embroidered Sash** (silk garment, distinct article)
- Wood Siege Spirit Money → Wraithgrove **Joss Leaf** (paper offering, leaf form)

Per `build-v2/CLAUDE.md` original-IP discipline: mechanics + structure + register are clone-faithful; specific creative expression (names, art, copy) is original.

## Stat-to-tier mapping

Stat curve lives in the `STAT-CURVE TABLE` comment block at the top of `relics-catalog.js`. Tier-curve numbers are the balance contract — refresh worker preserves stat type, value, and icon glyph; only names change. Do not rebalance distributions without a separate worker pass.
