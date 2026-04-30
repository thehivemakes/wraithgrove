# Wraithgrove SPEC — Wood Siege clone, current truth

**Last updated:** 2026-04-29
**Live build:** https://defimagic.io/wraithgrove/ (cache-bust `0.8.0-grid-forest`)
**Mirror:** https://thehivemakes.github.io/wraithgrove/
**Source target:** Wood Siege (`com.dream.sfgame`, SF Group / Shifeng Shenzhen, English-localized)

This is the **living spec** — replaces my evolving understanding as truth lands. Curated for someone reading once. Long-form chronological observations live in `observation/HD_SOURCE_OBSERVATIONS_2026-04-28.md`.

**Status legend:** ✅ GROUNDED (confirmed from HD source / Architect) · 🟡 PARTIAL (mostly clear, some gaps) · ❓ UNCONFIRMED (assumed, needs verification)

---

## §1 — What this game is

Wood Siege is a **gather-build-defend hybrid** mobile survival ARPG with character-RPG meta progression. Eastern folk-horror register. 18 stages, narrative arc: rescue your sister through descending forests, only to find she's been transformed.

**Wraithgrove** is a faithful mechanics clone with original IP — own art, names, sprite designs, audio. Mechanics + structure + monetization tier are clone-faithful. Specific creative expression is original.

**Anchor person:** Klovur (App Store reviewer Dec 2025) — "more time watching ads for OTHER games than playing THIS game." Path A faithful clone replicates structural ad-cadence with two named non-replications: cross-device-transferable ad-removal + secured ad SDK.

---

## §2 — Core gameplay loop ✅ GROUNDED

Each Battle stage is a **gather-build-defend survival** session:

1. **Day phase:** chop trees for wood, level up via XP from chops, build defensive structures on pre-marked Turret/Campfire slots around your base.
2. **Night phase:** "MONSTERS ATTACK" — pumpkin-headed creatures swarm. Defensive structures (Turrets, Campfires for light) help fend them off.
3. **Wave structure:** waves cycle day→night→intermission. Each wave is a discrete encounter with its own timer.
4. **Stage-level reset:** in-stage character SP (level + skills) resets on death OR success. Permanent progression comes from **gold-spend in Level Up tab outside stages**.
5. **Stage-end → Rebirth:** beating a stage triggers a Rebirth event — character visually upgrades to next tier (Level 1-1 → 1-2 → 1-3 ...), unlocks new appearance.
6. **Game is intentionally HARD** — design dial cranked toward forcing ad-watch and IAP.

---

## §3 — Stage structure ✅ GROUNDED

- **18 total stages** ("18 layers of a deadly forest")
- **Wave count scales by stage tier:**
  - Early stages (1-6): **5 waves**
  - Mid stages (7-12): **10 waves**
  - Late stages (13-18): **15 waves**
- **HUD top:** "Highest Wave Reached: X/N Waves" persistent record per stage
- **Wave indicators:** hexagonal dots, purple-dark pending, red-glow active (with timer), lavender-cleared
- **Per-wave timer:** shown inside the active wave hex (e.g. "03:24" countdown)
- **Each stage has a themed name** (Stage 1 "Ghost Marriage", Stage 2 "Shadow Ghost") and biome (forest_summer, cold_stone, forest_autumn, temple, cave, eldritch — 6 biomes rotated across 18 stages)

---

## §4 — Map structure ✅ GROUNDED (per Architect screenshot 2026-04-29)

- **The map IS a uniform dense forest.** Trees cover everything on a tight grid.
- **The player STARTS in a small clearing** (~80 unit radius) at map center
- **Buildings + construction sites occupy small pre-cleared spots** within the forest
- **Player carves out additional clearing by chopping trees** — every tree choppable, drops wood + XP + coins
- **Construction sites are FIXED positions** around the base (4 Turret slots + 1 Campfire spot in current implementation; real game has 4-6 slots arrayed around base center)
- **Construction sites have wood-cost progress bars** (e.g. "Turret 0/4", "Campfire 0/30") — chop wood, fill the bar, structure builds and activates

---

## §5 — Resources & currencies ✅ GROUNDED

| Currency | Where shown | Function |
|---|---|---|
| **Gold coin** (yellow) | Top-left HUD always | Soft currency. Buy upgrades in Level Up tab. |
| **Diamond** (blue) | Top HUD always | Premium currency from IAP. Cultivate, gachas, ad-skip. |
| **ADS voucher** (orange ticket) | Top HUD always | Tickets that substitute for watching real ads. |
| **In-stage gold** | HUD center-left during Battle | Run-local; banked to permanent gold on stage end. |
| **In-stage wood** | HUD center-left during Battle | Run-local; spent at construction sites during Battle. |

The **third currency is literally labeled "ADS"** in HD source — Wraithgrove's prior naming ("cards") is wrong and needs renaming.

---

## §6 — Tabs (5) ✅ GROUNDED labels

Bottom nav, left-to-right (canonical English):

1. **PK** (crossed swords + crown) — async PvP, Power-based matchmaking
2. **Level Up** (red book) — character progression, equipment, stats, Rebirth, Cultivate
3. **Battle** (crossed swords) — the action stage (the survival arena)
4. **Buildings** (shop awning) — idle-base 8-slot grid, Daily Chest, Forge crafting
5. **Relics** (parchment) — gear gacha-adjacent, 5 rarity tiers

Wraithgrove's prior naming (Duel/Ascend/Hunt/Forge/Relics) is acceptable for IP-clean originality but the canonical Wood Siege labels are above.

---

## §7 — Battle (in-stage) mechanics

### Player ✅ GROUNDED
- **Anime schoolgirl** (default): black pigtails, white blouse, dark short skirt, black tights
- **Default weapon: white scythe** (curved bone-colored blade) — auto-attacks on cooldown ring (no visible reach indicator in source)
- **Attack range** is implicit — sword/scythe swings in arc, hits anything in radius
- **Movement:** virtual joystick bottom-half, top-down camera follow

### Tree-chopping ✅ GROUNDED
- Trees fill the map on a ~30-pixel grid; player chops INTO the forest
- Each tree: ~5 HP, takes 5 swings to fell
- On chop: drops wood (1) + coins (~2) + grants XP (~2) + visual wood-chip burst + audio reward
- **XP from chopping trees** is the primary level-up source in Battle
- Stage SP/level resets on stage end (death or clear)

### Skill perks (mid-stage Level Up draft) ✅ GROUNDED
On player level-up during Battle, modal "Level Up — Select a Skill" appears with 3 perk cards. Confirmed perk types from HD source:
- **Turret upgrades** (e.g. "Turret gains +1 split projectile on hit")
- **Movement Speed +X%**
- **Movement Speed +X% outside base range** (implies a "base range" radius mechanic)
- ADS-watch button to **Refresh** (reroll) the 3 cards
- These perks are TEMPORARY — cleared on stage end

### Construction (Turret + Campfire + others) 🟡 PARTIAL
- **Fixed pre-marked dashed-circle slots** arrayed around the base (4-6 slots typical)
- **Wood-cost progress bars** per slot — tap or stand on it while holding wood, builds incrementally
- **Multiple turret types** can occupy a slot (catapult, archer turret, etc.) at varying costs (450 / 800 / 1000+ wood)
- **Campfire** is a separate building type — likely provides light radius / safety zone
- ❓ Exact placement-flow UX (drag from menu? auto-build on stand?) unconfirmed

### Day/Night cycle 🟡 PARTIAL
- "Night Mode — Monsters Attack" confirmed from App Store carousel
- **Pumpkin-head monsters** swarm at night (orange glowing jack-o-lantern heads, stick-figure bodies)
- ❓ Exact day-night transition trigger (timer? wave-bound? player-action?) unconfirmed

### End of stage
- Stage clear → reward chest + Rebirth event for character (next tier appearance)
- Death → result screen, Watch Ad to Continue OR Restart options

---

## §8 — Level Up tab (character meta) ✅ GROUNDED

Visible elements (from HD screenshot 2026-04-29):
- **Active character** displayed against backdrop
- **"Skin" button** (golden-hat icon) — opens character roster modal
- **3 equipment slots** always visible:
  - **Melee** (twig/leaf icon) — Ascend cost 1624 coins
  - **Ranged** (small stone) — Ascend cost 4060 coins
  - **Pet** (wolf/fox face) — Ascend cost 10.1k coins
- **2 base stats** at base Ascension tier (more may unlock at higher tiers):
  - **Attack** (numerical) — upgrade cost ~514 coins per tick
  - **Lumber Efficiency** (% — wood-chop yield rate) — upgrade cost ~355 coins per tick
- **Action buttons:** Level Up (primary, yellow) + Cultivate (secondary, gray)
- **Rebirth banner** — appears when ready (post-stage); shows current → next character tier with rewards (next-tier skin × 1, diamonds × N, hammer × N) and a Cultivate cost (~2880 coins)

**Stat name:** "Lumber Efficiency" (NOT "Logging Speed" — Wraithgrove's prior naming was wrong).

---

## §9 — Buildings tab (idle base) ✅ GROUNDED

- **Top:** 3 currencies + "GS: NNNN" gold-stat readout
- **Diorama view:** clearing with placed buildings — Pagoda (Asian temple/shrine, NOT a cave/cabin), Catapult (Lv.X, wagon-mounted axes), Campfire (Lv.X, stone ring + flame). Power-stat readout below.
- **8-slot building grid (4×2):**
  - Row 1: Pagoda, Catapult/Forge, Campfire, [LOCKED — fence]
  - Row 2: [LOCKED] cannon, sword/smithy, bow/archery, saw/lumbermill
- **Daily Chest** (top-left of grid) — 24h streak rewards
- **Forge anvil** (center) with **"Craft x10"** button + **"Probability Info"** (RNG odds disclosure for crafting)
- Crafting is gacha-adjacent: pay materials, get RNG-rolled outputs

---

## §10 — Relics tab ✅ GROUNDED partial catalog

- **5 rarity tiers:** Common (12), Rare (12), Epic (12), Legendary (8), Mythic (4) — total 48 relics
- **Naming pattern: eclectic everyday objects + grim folk-horror ceremonial items**

### Common-tier (HD-source-confirmed names)
Dagger, Potato, Roller skates, Rebar, Iron block, Spike, Saw, Torch, Wooden Fish, Bell, Coffin Nail, [+1 unread]

### Rare-tier (HD-source-confirmed names)
Bandage, Hammer, Gunpowder, Iron bucket, Cinnabar, Blade, Iron basin, Oil Lamp, Embroidered Shoes, Spirit Money, [+1 unread]

### Wraithgrove's relic catalog
Currently uses original folk-horror names but is too uniform — needs eclectic-mix rebalance per `RELICS_DESIGN.md` worker (queued).

---

## §11 — PK tab (PvP) 🟡 PARTIAL

- **Power-based async PvP** — your aggregate Power stat (sum across Skin/Equipment/Buildings/Relics) determines matchmaking
- **Daily quota** (~5 duels)
- **Ranked tiers** with point thresholds + RP delta on win/loss
- ❓ Exact UI flow + matchmaking ranges unconfirmed (no HD source frame yet)

---

## §12 — Character roster ✅ GROUNDED

**9+ characters total**, character-SWAP system (NOT team passive — confirmed by Architect):
- You can OWN multiple characters
- **Only the actively-equipped character grants their bonus** (Team ATK%, Team HP%, Special Effect)
- The "Bonus Activated" header refers to the ACTIVE character's bonus

### Confirmed roster archetypes (HD source roster screenshot)
1. Schoolgirl (default — pigtails, white blouse, dark skirt)
2. White-haired student with "S" letterman shirt
3. Samurai with horned helmet + ornate red armor
4. Jiangshi (Chinese hopping vampire — conical hat with paper amulets)
5. Seated grim man on chair/wheelchair
6. Hooded scythe-wielder
7. Afro angry man
8. Masked figure with white teeth/skull mouth
9. Boy with cap

### Rebirth tiers per character
Each character has **staged appearances unlocked through Rebirth events** at stage clears:
- Schoolgirl Level 1-1 → Level 1-2 (straw-hat traveler) → Level 1-3 (...) → ...
- LV.99 fully-skinned variant: gold imperial dual-sword armor with crown headpiece
- Skin progression is **gameplay-relevant** ("UNLOCK SKIN BOOST POWER" — App Store carousel)

---

## §13 — Monetization (Path A faithful) ✅ GROUNDED

12 IAP SKUs ranging $0.99 to $99.99. Klovur references:
- **$20 permanent ad-removal SKU** (doesn't transfer between devices in source — Wraithgrove fixes this; account-bound)
- **$100 mega-bundle** ("win the game / instant PvP win")
- **Daily 50 rewarded-video cap** — 50 RV/day = significant progression OR grind for months
- **3-4 minute pre-game ad chain** (Klovur)
- **Ad-gated weapon pickups** in Battle (visible padlocked Turret signs on stumps in App Store carousel)
- **Resource Shop** (added v1.5) — direct-purchase resources

### Wraithgrove deviations from Wood Siege monetization
1. **Cross-device-transferable ad-removal** (account-upgrade fix vs. Wood Siege bug)
2. **Secured ad SDK** — no auto-launch other apps, no malicious URLs (per BLUEPAPER §0 Rule 5)

---

## §14 — Visual register ✅ GROUNDED

- **Anime pixel-art** characters; bobblehead-large heads, simple proportions
- **Eastern folk-horror** atmosphere — pagodas, lanterns, scrolls, jiangshi, samurai, ghost-marriage, spirit money
- **Stage palettes:**
  - forest_summer: deep dark forest green grass, dense pine perimeter (most of viewport)
  - forest_autumn: orange ground, orange-foliage trees
  - cold_stone: deep blue night, stone formations, orange lanterns scattered
  - temple: stone stairs, pillars, ceremonial decoration
  - cave: dark interior, drips, cramped feel
  - eldritch: distorted purple, wraith-style aura
- **HUD framing:** sand-yellow text on dark, red banner highlights, parchment-style modal panels
- **Damage numbers:** yellow-white floating, larger for crits
- **Hit feedback:** red blood-splatter particles on enemy hit, gold-yellow sparks on player swing, brown wood chips on tree chop

---

## §15 — Open questions (resolve via more phone capture or play data)

1. **Day-night transition trigger** — fixed time? wave-bounded? player-action? (deferred to Architect's screen recording)
2. **Construction-build UX** — how does player select WHICH structure to build at a slot? Drag from menu? Auto-build on stand?
3. **What does the Campfire light radius DO mechanically** — HP regen? safety zone? buff?
4. **Hidden Relic skill effect** — visible button, behavior unknown (active ability or passive trigger?)
5. **Stat unlocks at higher Ascension tiers** — does HP / Defense / Crit appear above tier N?
6. **Battery resource** (visible "Battery 0/4" in Night Mode) — what does it power? Lanterns? Turret recharge?
7. **Stage 3-18 names + biome rotation** — only Stage 1 (Ghost Marriage) + Stage 2 (Shadow Ghost) named so far
8. **Receipt validation** for IAP — Apple/Google/Stripe specifics in worker.js still stubbed
9. **Exact wave-cadence math** — escalation curve per wave, boss spawn position in 5/10/15-wave structure
10. **Tutorial / onboarding flow** — first-launch sequence, locked feature reveal cadence

---

## §16 — Wraithgrove implementation status (2026-04-29)

### ✅ Coded + visually matched
- 5-tab nav structure (current naming Duel/Ascend/Hunt/Forge/Relics — IP-clean variant)
- Hexagonal wave indicator dots in HUD (5 dots, color-state per active/cleared/pending)
- "Highest Wave Reached: X/5 Waves" persistent banner with localStorage
- 2× camera zoom (matches HD source tightness)
- Anime-girl player sprite with **scythe swing animation** (rotates on attack with motion-trail)
- **Pagoda landmark** at map center (red walls + dark tile roof + glowing orange windows + upturned eaves)
- **Choppable trees on dense grid** (~600+ per stage, jittered 30-px spacing, 80-unit spawn clearing)
- Tree chop mechanic: 5 HP per tree, hit flash + wobble, HP bar overlay, drops wood + coins + XP, particle bursts
- 4 fixed Turret slots + 1 Campfire slot arrayed around base (dashed circles with name + cost)
- Pine-band perimeter forest (decorative wall outside the map)
- Yellow-white damage numbers
- "Hidden Relic" skill button label

### 🟡 Coded but needs correction
- **Tab labels** — should align to PK/Level Up/Battle/Buildings/Relics or stay original IP-clean (Architect call)
- **Third currency name** — currently "cards", should be "ADS" voucher
- **Stat name** — "Gather" should be "Lumber Efficiency"; "Logging Speed" similarly incorrect
- **Stat count** — Wraithgrove has 5 stats (Attack/HP/Defense/Crit/Gather); HD source shows only 2 visible at base (Attack + Lumber Efficiency). Reduce to 2 for base, unlock more at higher Ascension
- **Skin model** — currently 8 separate skins; should be 9-character roster + Rebirth-tier visual progression per character
- **Boss visuals** — current procedural draws are ellipses; need cloaked humanoid silhouettes (samurai, jiangshi, etc.)
- **Skill perks (Level Up draft)** — currently generic dmg/cd/maxhp/pickup/speed; should be Turret-related + Movement + Base-Range perks per HD source

### ❌ Not yet coded
- **Day/night cycle state machine** — design doc queued (W-DayNight-Architecture worker)
- **Real construction-site activation** — slots are visual only; need wood-spend → structure-build flow
- **Pumpkin-head night enemies** — sprite design queued (W-Pumpkin-Sprite worker)
- **Catapult building variant** + 5 other locked Buildings tab structures
- **Wave timer** in HUD active-wave hex
- **Wave count scaling by stage tier** (5/10/15)
- **Rebirth-event flow** — character visually upgrades on stage clear
- **Ad-gated Turret weapon pickups** in Battle (separate from construction sites)
- **Audio system** — engine wired, files not sourced yet (manifest in `audio/MANIFEST.md`)
- **Real receipt validation** in `worker/worker.js` (Apple StoreKit + Google Play Billing + Stripe)
- **Cross-device save sync** via Cloudflare Worker
- **iOS / Android native wrap publishing** (Capacitor scaffolds shipped, but App Store / Play Store submission gated on accounts + final art)

### ❌ Wrong model entirely (acknowledged, fix queued)
- **Skin = separate character** vs. Wood Siege model (skin = Rebirth-tier appearance for same character)
- **Team-bonus mechanic** — initially read as "passive team-wide"; corrected to "active-character only"

---

## §17 — Update protocol

**This document is updated whenever new source-truth lands.** When updating:
1. Find the relevant section
2. Replace or extend with the new fact
3. Update the section's status (✅ / 🟡 / ❓) if confidence shifts
4. Bump "Last updated" date at top
5. Add a short entry in §18 Changelog

**The chronological observation log** lives in `observation/HD_SOURCE_OBSERVATIONS_2026-04-28.md` and continues to accumulate findings as appendices (§A through §L). This SPEC.md is the curated current truth derived from those.

---

## §18 — Changelog

- **2026-04-29 v0.8** — Initial spec written. Map-as-uniform-forest model grounded from Architect in-game screenshot. Tree count target ~600/stage on jittered grid. Construction sites moved to fixed 4-Turret + 1-Campfire array around base.
- **2026-04-29 v0.7** — Trees rendered as standing pines (was stumps), 40-55 scattered (was 10-14). Architect later flagged this as still wrong (trees should be uniform across map).
- **2026-04-29 v0.6** — Choppable mechanic added: HP, hit flash, particle bursts, wood/coin/XP drops.
- **2026-04-29 v0.5** — 2× camera zoom + scythe swing animation. Hosting moved to defimagic.io/wraithgrove/ (DeFi-Magic/dark_magic_frontend repo).
- **2026-04-29 v0.4** — Pagoda landmark replaces cave; hex wave dots replace circles. From Architect's HD phone screenshots.
- **2026-04-28 v0.3** — Initial HD-source observations from re-fetched App Store carousel (12 screenshots). Major prior assumptions corrected (chopable stumps, in-stage resources, gather-build-defend loop, day/night cycle).
- **2026-04-27** — Phase 4 build-out: 16/16 worker prompts shipped (W-A through W-P) covering Hunt mode, art briefs, Capacitor wrap, IAP, AdMob lockdown, Cloudflare Worker, privacy/legal. Build at v0.2.0-mvp prior to HD-source corrections.
