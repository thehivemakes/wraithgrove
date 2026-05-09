# Perplexity Tasks — 2026-05-04

Six research tasks Perplexity AI is well-suited for. Each compounds into a Sonnet-ready input for tomorrow.

**For each task:**
1. (Optional) Paste the briefing from `PERPLEXITY_BRIEFING.md` first
2. Paste the task's PROMPT verbatim into Perplexity
3. Wait for response (Perplexity will research + cite)
4. Save the response to the OUTPUT path (just create the file and paste)

When all 6 saved, the orchestrator (next session) reads the `research/` directory and writes implementation specs grounded in real data.

---

## TASK 1 — Energy Economy Benchmarks

**Why:** The W-Monetization-V2-Energy spec has placeholder tunables. Real benchmarks from top games will tighten them.

**Output path:** `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/research/01_energy_benchmarks.md`

**PROMPT to paste:**

```
Research the energy/stamina economy in the following top-grossing mobile games as of 2024-2026: Royal Match, Match Factory, Survivor.io, Genshin Impact, Honkai Star Rail, Clash Royale, Marvel Snap, Pokemon Sleep.

For each game, find:
- Energy cap (max energy)
- Regeneration rate (1 energy per how many minutes)
- Cost per "run" / level / battle
- Refill cost in premium currency (gem-equivalent and USD-equivalent)
- Daily login energy bonus (if any)
- Streak rewards
- Any rewarded-ad refill (and daily cap on those)
- Cross-system rewards (does winning give energy back?)

Present as a markdown table. Then write a 200-word recommendation for Wraithgrove (a mobile arena ARPG with 18 stages of 1.5-7 min length, gem economy, ad-cadence). Specifically suggest:
- Cap (current placeholder: 30)
- Regen interval (current: 15 min per energy)
- Stage cost (current: 5)
- Win refund (current: +3)
- Refill SKU prices for 5/15/30/60/150 energy

Cite each game's data source with URL.
```

---

## TASK 2 — Gacha Rate Disclosure Compliance

**Why:** Wraithgrove has a gacha pool. JP/CN/KR/EU have legal disclosure requirements. We need a checklist before App Store submit.

**Output path:** `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/research/02_gacha_compliance.md`

**PROMPT to paste:**

```
I'm shipping a mobile RPG with gacha mechanics on iOS App Store and Google Play, distributed globally. Research the legal requirements for in-game gacha rate disclosure as of 2024-2026 in:
- United States (FTC + state laws)
- European Union (Digital Services Act + per-country gambling laws)
- Japan (CESA Guidelines + tan-Vega regulations)
- South Korea (Game Industry Promotion Act)
- China (NPPA / national press regulations)
- Mainland EU member states with stricter rules: Belgium, Netherlands

For each jurisdiction, list:
- Whether rate disclosure is legally required
- What specifically must be disclosed (rates, pity, bundle contents)
- Where the disclosure must appear (in-game, in store listing)
- Penalties for non-compliance
- App Store / Play Store policy (whether they enforce this even where law doesn't)

Then output a master compliance checklist for a single global gacha game — what every jurisdiction requires we must do unconditionally, and the strictest jurisdiction's optional add-ons we should follow as a single global standard.

Then output 5 example real-world gacha games and how they comply (Genshin, Honkai, Marvel Snap, Diablo Immortal, Pokemon Masters). Cite all sources with URLs.
```

---

## TASK 3 — Battle Pass Catalog Research

**Why:** W-Monetization-V2-Missions-Pass has a 60-level battle pass scaffolded but free + premium track rewards are placeholder. Real-world reference compounds into a curated catalog.

**Output path:** `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/research/03_battle_pass_catalog.md`

**PROMPT to paste:**

```
Research what top mobile battle passes contain at each level in 2024-2026. Focus games: Genshin Impact, Honkai Star Rail, Fortnite Mobile, Marvel Snap, Clash Royale, Brawl Stars, Pokemon Unite, Diablo Immortal.

For 3 of these (your pick of the most data-rich), document:
- Total levels in the season
- XP per level + total XP for full clear
- Free track reward at every 5th level (or all levels if granular data exists)
- Premium track reward at every 5th level
- Premium-only exclusive rewards (legendary skin, character, etc.)
- Real-money price of premium pass
- Estimated player time-to-complete (hours of gameplay assumed)
- Daily/weekly XP cap if any

Then design a 60-level battle pass catalog for Wraithgrove (eastern folk-horror, ukiyo-e visual style, Path A faithful clone of Wood Siege). Premium pass = $9.99. Currencies: gold, gems, energy, relic fragments, rare materials.

Output should be a 60-row table with columns: Level, Free reward, Premium reward, Notes.

Mark "milestone" levels (every 5th + final) where rewards spike. Premium track should be ~2.5× the value of free track. Final premium reward should be a unique cosmetic (suggest 3 ideas appropriate to the folk-horror register — paper-charm spirit pet? lantern aura particle? scythe trail effect?).

Cite all source data with URLs.
```

---

## TASK 4 — Tower Gauntlet Scaling Math

**Why:** W-Tower-Gauntlet has placeholder formulas (HP × 1.18 per floor, etc). Need real-world reference for what scaling keeps an infinite roguelike fun.

**Output path:** `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/research/04_tower_scaling.md`

**PROMPT to paste:**

```
Research how the following infinite-floor / endless-mode roguelikes scale enemy difficulty as the player progresses, as of 2024-2026:

- Slay the Spire (ascensions + heart phase)
- Vampire Survivors (30-min endless escalation)
- Brotato (waves 1-20 then endless)
- Hades (heat system)
- Backpack Battles (round scaling)
- Death Must Die (endless mode if applicable)
- Halls of Torment (endless waves)
- Survivor.io (endless mode)

For each, document:
- HP scaling formula per floor/wave (multiplicative? additive? plateaus?)
- Damage scaling per floor/wave
- Speed scaling per floor/wave
- New enemy type introductions (do they swap or add?)
- Boss / mini-boss cadence (every N floors?)
- Reward scaling per floor (does loot value scale up too?)
- Caps or breakpoints (does scaling slow at floor 50? 100?)
- Player-side scaling (do permanent buffs also compound?)

Then derive a recommended scaling formula for Wraithgrove's Tower Gauntlet:
- Floor cost: 5 energy (one-time per run, free continues until death)
- Each floor: 60-90 sec wave + mini-boss at 70% mark
- Buff card pick between floors (per-run buffs, reset on death)
- Mini-boss every floor; full-stage boss every 5 floors
- Player goal: reach floor 30+ feels like an achievement, floor 100+ is leaderboard territory
- Whale conversion: continue costs 1 gem (floor 1-4), 3 gems (5-9), 5 gems (10+)

Output: HP formula, damage formula, speed formula (with safety caps), recommended floor-time scaling (do floors get shorter as enemies get tankier?), reward scaling, mini-boss vs major-boss cadence. Cite all source games with URLs.
```

---

## TASK 5 — CC0 Audio Sourcing

**Why:** Several events still play placeholder audio. Need real CC0 / CC-BY tracks. Perplexity can search freesound.org and pixabay.

**Output path:** `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/research/05_audio_sourcing.md`

**PROMPT to paste:**

```
I need free-license (CC0 or CC-BY) audio assets for a mobile arena ARPG with eastern folk-horror atmosphere. Search freesound.org, pixabay.com/sound-effects, and OpenGameArt.org for the following:

SFX (short, 0.3-2 sec, mono, mp3 ~30KB each):
1. banshee_screech — ghostly female screech / wail, 1-2 sec
2. orb_pickup — soft chime, magical pickup, 0.3-0.5 sec
3. coin_pickup — coin clink, 0.2-0.4 sec
4. fragment_pickup — crystalline shatter / gather, 0.3-0.6 sec
5. torch_flicker — fire flicker loop, 1-2 sec, loopable
6. dialog_pop — UI bell / mallet hit, 0.2 sec
7. boss_intro_drone — low menacing horn / drone, 1.5-2 sec
8. levelup_chime — triumphant rise, 0.5-1 sec
9. death_sting — dramatic sting, 1-1.5 sec
10. reveal_woosh — sci-fi/magical woosh, 0.5 sec

AMBIENT (loop, 30-60 sec, mp3 ~200KB each):
11. forest_summer_ambient — distant insects, gentle wind, paper lanterns swaying
12. forest_autumn_ambient — wind through dry leaves, distant crow
13. cold_stone_ambient — wind howl through rocks, distant ice cracks
14. temple_ambient — wind chimes, distant temple bell, soft drone
15. cave_ambient — water drips, low echo, faint bat squeaks
16. eldritch_ambient — atonal drone, distant whispers, reality-tear shimmer

UI (very short, ~0.1-0.3 sec):
17. tab_change — soft swipe
18. button_tap — click / wood-tap
19. modal_open — paper-rustle open
20. modal_close — paper-rustle close

For each item, provide:
- Search keywords used
- Direct URL to the asset
- License (CC0 / CC-BY 4.0 / etc.)
- Author / attribution required (yes/no, if yes, name)
- File format + duration
- Why it fits the eastern folk-horror register

Format as a markdown table per category. Where multiple options exist, pick the best 1-2 per slot. If no good match exists for a specific slot, say so honestly.
```

---

## TASK 6 — App Store Metadata + Screenshot Brief

**Why:** Pre-launch ASO (App Store Optimization) drafts now save us scrambling at submit time.

**Output path:** `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/research/06_aso_metadata.md`

**PROMPT to paste:**

```
Research what top-grossing mobile horror / ARPG / survival-arena games use for their App Store / Google Play metadata in 2024-2026. Focus titles: Onmyoji, Identity V, Blood Mansion, Punishing: Gray Raven, Honkai: Star Rail, Diablo Immortal, Survivor.io, Vampire Survivors Mobile, Soul Knight Prequel.

For 5 of these, document:
- App title + subtitle
- Short description (App Store: 30 chars; Play Store: 80 chars)
- Long description (first 500 chars - what's above the fold)
- Keywords list (App Store: 100 chars)
- Screenshot count + general subjects (combat shot, hero menu, gacha screen, etc.)
- Promo video subject (if any)
- Featured-graphic subject (Play Store)

Then draft equivalents for Wraithgrove:
- App title (under 30 chars): suggest 3 options
- Subtitle (under 30 chars): suggest 3 options
- Short description (80 chars)
- Long description (full ~4000 chars, structured: hook → core gameplay → progression → social → call to action)
- Keywords (100 chars exact)
- 8 screenshot subjects (in order, each describing what's on screen + caption text)
- Promo video brief (15 sec storyboard)
- Feature graphic brief

Wraithgrove specifics: eastern folk-horror, ukiyo-e visual style, 18 stages across 6 biomes (forest summer/autumn, cold stone, temple, cave, eldritch), 9 unlockable characters, 6 bosses culminating in Wraith Father, infinite Tower Gauntlet, gacha relics, battle pass, async PvP duels. Path A monetization. ESRB target T (Teen) — supernatural horror, no graphic gore.

Include genre tags + age rating recommendation. Cite source apps with URLs.
```

---

## After all 6 saved

The next orchestrator session reads `research/01_*.md` through `research/06_*.md` and writes the next batch of Sonnet specs grounded in real data instead of placeholders. Specifically:

- Task 1 → tightens W-Monetization-V2-Energy.md tunables
- Task 2 → adds compliance checklist as Concern G in W-Monetization-V2-Whale-Ladder.md
- Task 3 → fills the 60-level battle pass catalog in W-Monetization-V2-Missions-Pass.md
- Task 4 → fixes the scaling formulas in W-Tower-Gauntlet.md Concern B
- Task 5 → audio worker can wire real samples (replaces placeholders)
- Task 6 → goes into a new W-ASO-Submission.md spec for App Store launch prep

This compounds: 6 hours of Perplexity research saves 6 Sonnet runs full of placeholder values.
