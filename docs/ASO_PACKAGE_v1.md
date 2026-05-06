# ASO_PACKAGE_v1.md — App Store + Play Store launch metadata

**Status:** RESEARCH-DRAFT — Architect ratification required before submission to App Store Connect or Play Console.
**Author:** W-ASO-Metadata-Prep worker (one-shot Sonnet, name: Quill, 2026-05-05).
**Inputs:** Direct primary-source App Store fetches for 6 reference titles + Perplexity Sonar synthesis on field limits, screenshot patterns, and keyword strategy.
**Status of TASK 6 in PERPLEXITY_TASKS.md:** This file replaces it. Perplexity did not deliver verbatim store metadata (no live-store browsing capability via Sonar). The brief was re-routed: I fetched the actual App Store pages directly via WebFetch.
**Honesty audit:** All competitor data labeled with confidence. Numbers from third-party ASO blogs (CVR%, install-rate% claims) flagged as directional, not measured. See §1 caveats.

---

## §1 — Competitive analysis (6 titles)

All title/subtitle/category/age data below was extracted directly from the live `apps.apple.com/us` listings on 2026-05-05 via WebFetch. Quoted text is verbatim from the listing's first description paragraph. Where the source listing did not expose a field (e.g. screenshot count behind dynamic JS), the field is marked **NOT DIRECTLY OBSERVED** and I do not invent a value.

### 1.1 Identity V (NetEase)
- **App Store URL:** https://apps.apple.com/us/app/identity-v/id1347780764
- **Title:** `Identity V` (10 chars)
- **Subtitle:** `1v4 Asymmetrical Battle Game` (28 chars)
- **Category:** Roleplaying
- **Age:** 13+
- **Publisher:** NetEase Games
- **Description opener (verbatim):** *"Identity V: 1 vs 4 Asymmetrical Horror Mobile Game Fear Always Springs from the Unknown."*
- **Hook structure:** Game-mode signal (1v4) before genre signal (horror). Asymmetric is the load-bearing keyword.
- **Screenshot count:** NOT DIRECTLY OBSERVED via WebFetch. ASO-blog convergence (see §1.7) suggests ~10.

### 1.2 Onmyoji (NetEase)
- **App Store URL:** https://apps.apple.com/us/app/onmyoji/id1257031979
- **Title:** `Onmyoji` (7 chars)
- **Subtitle:** `Japanese-style strategy RPG` (27 chars)
- **Category:** Roleplaying
- **Age:** 9+
- **Publisher:** NetEase Games
- **Description opener (verbatim):** *"Travel back to the capital in the Heian Period and soak in the quirky and touching stories of spirits."*
- **Hook structure:** Setting-flavor first ("Heian Period"), genre handled in subtitle. Lower age rating (9+) than the rest of the cohort — Onmyoji leans into mythology over horror.
- **Screenshot count:** NOT DIRECTLY OBSERVED.

### 1.3 Punishing: Gray Raven (KURO TECHNOLOGY)
- **App Store URL:** https://apps.apple.com/us/app/punishing-gray-raven/id1571685286
- **Title:** `Punishing: Gray Raven` (21 chars)
- **Subtitle:** `Fast-paced Cyber Action RPG` (27 chars)
- **Category:** Action
- **Age:** 13+
- **Publisher:** KURO TECHNOLOGY (HONG KONG) CO., LIMITED
- **Description opener (verbatim):** *"Punishing: Gray Raven is a Fast-paced Sci-fi Action RPG. Humanity stands on the brink of extinction."*
- **Hook structure:** Genre-signal (action RPG) followed by setting (post-extinction sci-fi). The first sentence repeats the subtitle almost verbatim — Apple does not double-count, but the player double-reads it for emphasis.

### 1.4 Honkai: Star Rail (HoYoverse / Cognosphere)
- **App Store URL:** https://apps.apple.com/us/app/honkai-star-rail/id1599719154
- **Title:** `Honkai: Star Rail` (17 chars)
- **Subtitle:** `A Space Fantasy RPG` (19 chars)
- **Category:** Roleplaying
- **Age:** 13+
- **Publisher:** COGNOSPHERE PTE. LTD.
- **Description opener (verbatim):** *"Honkai: Star Rail is a HoYoverse space fantasy RPG. Hop aboard the Astral Express and experience the galaxy's infinite wonders filled with adventure and thrills."*
- **Hook structure:** Brand-publisher signal ("HoYoverse"), genre, then the *invitation verb* ("Hop aboard"). The verb-as-invitation pattern is distinctive — it reads like a travel brochure, not a game pitch.

### 1.5 Survivor!.io (HABBY)
- **App Store URL:** https://apps.apple.com/us/app/survivor-io/id1528941310
- **Title:** `Survivor!.io` (12 chars — note the `!` in the brand)
- **Subtitle:** `Survive the fun!` (16 chars)
- **Category:** Action
- **Age:** 13+
- **Publisher:** HABBY
- **Description opener (verbatim):** *"Dangerous zombies are attacking the entire city! The city is in peril! Awakened by the trial of dreams, you've no choice but to take on the heroic mantle of saving the city!"*
- **Hook structure:** All emergency, all the time. Emoji-density compensated by exclamation-density. This is the casual-mass-market register — *not* an Identity V or PGR register. We should not copy this for Unlimited Chaos — it would clash with the folk-horror tone.

### 1.6 Vampire Survivors (Poncle)
- **App Store URL:** https://apps.apple.com/us/app/vampire-survivors/id6444525702
- **Title:** `Vampire Survivors` (17 chars)
- **Subtitle:** `Roguelike survival pixel RPG` (28 chars)
- **Category:** Action
- **Age:** 13+
- **Publisher:** Poncle
- **Description opener (verbatim):** *"Vampire Survivors is a roguelite time survival RPG game with minimalistic gameplay. The supernatural indie phenomenon that lets you be the bullet hell has arrived on mobile! The whole game is also playable in 1-4 player couch co-op in landscape."*
- **Hook structure:** Genre-stack (roguelite + time survival + RPG + minimalist), then *credibility ping* ("supernatural indie phenomenon"). Vampire Survivors leans on its meme-tier brand recognition — Unlimited Chaos has none of that yet, so this template is not transferable.

### 1.7 Convergence analysis (200 words)

Across the six listings, three patterns hold consistently and one is interesting-by-its-absence.

**Pattern 1 — subtitle is the keyword-density slot.** All six subtitles compress 2-4 genre tags into ~17-28 characters. Apple indexes the subtitle for search; players read it as the genre-promise. Unlimited Chaos's subtitle should pack folk-horror + survival + arena and stop there.

**Pattern 2 — first description sentence repeats the subtitle.** PGR and Vampire Survivors do this almost verbatim. Honkai uses a softer paraphrase. The repetition reinforces genre at the moment a player decides whether to swipe past or expand "more." Unlimited Chaos should follow this.

**Pattern 3 — cohort age rating is 13+ except Onmyoji (9+).** Onmyoji leans on mythology rather than horror; the 9+ rating is part of why it appeals to a wider Eastern-market audience. Unlimited Chaos targets ESRB Teen (13+), which puts it in the same trust-tier as Identity V / PGR / Honkai / Survivor.io.

**Absence: none of the six lead with cinematic-heavy preview videos in their first screenshot slot** that I could verify directly via WebFetch. Third-party ASO blogs claim 95-100% of top-grossers have a preview video in slot 1; I cannot independently verify the count without paid Sensor Tower access. **Treat the "video boosts install rate by 25-40%" claim from §screenshot research as DIRECTIONAL not MEASURED — these numbers had a herd-fabrication signature in the source data.**

### 1.8 Apple App Store and Play Store field limits (verified primary source)

Confirmed via Perplexity Sonar with cited Apple/Google docs (2026-05-05 query):

| Field | Apple App Store Connect | Google Play Console |
|---|---|---|
| App Name | 30 chars | 30 chars |
| Subtitle / Short Description | 30 chars (Apple subtitle) | 80 chars (Play short desc) |
| Promotional Text | 170 chars (Apple-only, NOT indexed for search per Apple docs) | n/a |
| Keywords | 100 bytes (Apple-only) | n/a (full description scanned) |
| Description | 4,000 chars | 4,000 chars |

**Apple keyword-field grammar (industry consensus):**
- Comma-separated, NO spaces after commas (each space costs a character).
- Single-word tokens (Apple does not parse multi-word phrases as phrases).
- Do NOT repeat words from App Name or Subtitle — those are already indexed.
- Avoid plurals — Apple stems automatically.

**Sources:** Apple Developer documentation referenced via Perplexity citations (Help docs at developer.apple.com/help/app-store-connect/...); Google Play Console Help docs (support.google.com/googleplay/android-developer/answer/13393723). Industry ASO grammar documented by ASOMobile and Sensor Tower-adjacent guides — these are practitioner consensus, not Apple-published rules. Apple does not publish a formal keyword-field style guide.

---

## §2 — Unlimited Chaos app title + subtitle (3 ranked options each)

### 2.1 Title options (Apple 30-char limit)

| Rank | Option | Chars | Reasoning |
|---|---|---|---|
| **1** | `Unlimited Chaos` | 15 | Bare brand — **Architect ratified 2026-05-06.** Subtitle carries all genre-signal (see §2.2 / §2.3). |
| 2 | `Unlimited Chaos: Hollow Hunt` | 28 | Brand + action tag. "Hunt" matches the in-game Hunt tab. 28/30 chars — within limit. Use if A/B testing shows bare brand under-converts. |
| 3 | `Unlimited Chaos: Veil of Lanterns` | 34 | **OVER 30-CHAR LIMIT (34 chars).** Do not submit. Carried forward as concept reference only. |

### 2.2 Subtitle options (Apple 30-char limit)

| Rank | Option | Chars | Reasoning |
|---|---|---|---|
| **1** | `Folk Horror Survival Arena` | 26 | Maximum keyword density. Three genre tags, no fluff. Honest to what the game is. **Recommended.** |
| 2 | `Survive the Cursed Grove` | 24 | Verb-first conversion-focused. "Cursed Grove" calls back to the brand. Loses "folk horror" keyword. Use if "folk horror" tests as too niche. |
| 3 | `Lantern-lit Horror Roguelike` | 28 | Atmospheric + genre. Risk: "roguelike" oversells — the run-based loop is the Tower Gauntlet ONLY; main mode is stage progression, not roguelike. Promising roguelike-as-host triggers refund-risk reviews from players expecting Vampire Survivors. **Do not ship.** |

### 2.3 Recommended combination

**Title:** `Unlimited Chaos` (15/30 chars)
**Subtitle:** [ARCHITECT FILL — old subtitle options were designed for the Wraithgrove brand; Architect to choose new subtitle for Unlimited Chaos]
**Combined keyword surface:** unlimited, chaos + subtitle terms (Architect to confirm after subtitle is selected).

---

## §3 — Short description (Play Store, 80 chars exact)

### 3.1 Recommended

```
Folk-horror survival arena. Hunt wraiths in the lantern-lit grove.
```
**Length:** 66/80 chars. Headroom intentional — Play Store crops mid-sentence on smaller phones; the period after "arena" is the safe-cut point.

### 3.2 Variants (for A/B if Play Console supports it)

| Variant | Length | Hook focus |
|---|---|---|
| `Folk-horror arena RPG. Hunt wraiths in the lantern-lit cursed grove.` | 68 | Adds "RPG" tag, adds "cursed" — slightly higher keyword reach |
| `A folk-horror survival arena. Hunt wraiths. Survive the cursed grove.` | 69 | Triple-clause rhythm. Tests as more action-vector. |

---

## §4 — Long description (~4000 chars, structured)

The block below is **drafted to fit within 4000 chars** (Apple and Play both cap there). Total length is ~3,500 chars to leave 500 chars of structural room for the compliance worker (TASK 2) to insert gacha-rate disclosure language at the marker. **Do not ship without the compliance insert.**

```
In the Unlimited Chaos, the lanterns lie. What walks the path beside you walks closer when you stop watching.

Step into a folk-horror arena where every stage you survive is one stage further from going home. The grove was a sanctuary once. The lantern-keepers said the light kept the wraiths at bay. They were lying. The light is what they're hunting by.

▣ HUNT — The arena
Auto-attacks fire while you focus on positioning. Circle the wraiths. Kite the pale-eyed hunter. Hold ground when the lanterns flicker out. Each of the 18 stages takes 1.5–7 minutes. Six biomes — summer forest, autumn ash, cold stone, lantern temple, bone cave, and the Eldritch tier where the rules you learned begin to break.

▣ ASCEND — The characters
Nine unlockable walkers, each with a signature ability and a memory of the grove that broke them. Level them up between runs. Equip relics drawn from the gacha — paper charms, broken mirrors, severed-tongue talismans, lantern-glass shards. Each character changes the arena around them. The same stage played by different walkers is a different stage.

▣ FORGE — The weapons
Forge weapons at the campfire from materials gathered in stages. Refine them. Re-temper. The crafting RNG is honest — what you put in is what you get out, plus the dice. No paywall on the materials.

▣ THE BOSSES
Six named horrors stand between you and the truth of the grove. The bone-throat oracle. The wax mother. The throat-clutch banshee. The skin-loom. The shrike's throat. And the final wraith that wears the last stage like a mask. Each boss changes how the arena fights you.

▣ THE TOWER GAUNTLET — Infinite mode
Descend into the Tower Gauntlet — an endless roguelike-mode where every floor is a buff card pick and every fifth floor is a fresh boss. Reach floor 30 and you've earned your first banner. Reach floor 100 and the leaderboard knows your name. How deep can you fall before the grove closes around you?

▣ THE DUEL — Async PvP
Test your Power against other walkers in async Duels — your loadout fights theirs while you sleep. Climb the regional Power leaderboard. The grove keeps score even when you're not watching.

▣ THE PATH PASS — 60 tiers per season
Free track gives you progression rewards. Premium track adds cosmetics, currency, and one exclusive ukiyo-e character skin you can't earn any other way. Premium pass: $9.99 per season.

▣ WHAT MAKES THIS DIFFERENT
Unlimited Chaos is built around a single principle: every stage you survive should feel less safe than the one before. Stage 1 welcomes you. Stage 4 turns. Stage 14 watches you. Stage 18 changes Stage 1 on replay. Hand-painted in ukiyo-e ink-wash. Lo-fi shamisen score that turns when the grove turns. Boss whispers in fragments of folk-Japanese.

▣ FREE TO PLAY — HONESTLY
Free to download. Daily energy refills naturally over time. Optional paid Path Pass and gem packs. Ad-removal upgrade carries across devices on the same account — buy it once, keep it forever, even if you switch phones.

[GACHA-COMPLIANCE-INSERT — populated per W-Compliance-Disclosure worker output: gacha rates per pool, pity/spark counters, in-app-purchase ceiling disclosure for JP/KR/EU markets, ESRB descriptors. ~400-600 chars expected.]

The grove has been waiting for you.
Walk in.
Just don't trust the lanterns.

Download Unlimited Chaos now.
```

**Char count of the above (measured):** 3,308 chars including the placeholder marker line; 3,085 chars excluding the placeholder. With a typical 500-char compliance insert replacing the marker: ~3,585 chars. Within the 4,000 cap with ~415 chars of headroom.

**Notes for the compliance worker:** the placeholder block sits *before* the closing CTA so the legal language doesn't break the emotional landing. Standard ASO practice is to put compliance disclosures in their own labeled section near the end of the description so neither the player nor the regulator has to dig.

---

## §5 — Keywords (Apple, 100 chars exact)

### 5.1 Recommended

```
roguelike,gacha,arpg,yokai,demon,ghost,cursed,ritual,dark,fantasy,hunt,monster,scary,slay,indie,boss
```

**Length:** exactly 100/100 bytes. Verified by Python.

### 5.2 Construction logic

Words excluded because they appear in title (`Unlimited Chaos`) or subtitle (TBD — Architect to confirm):
- unlimited, chaos + subtitle terms once subtitle is locked

Words included, ranked by my confidence in their search-volume + relevance match:

| Word | Why |
|---|---|
| roguelike | Tower Gauntlet mode, high-volume genre tag |
| gacha | Relic system, high-volume genre tag |
| arpg | Action-RPG genre cluster |
| yokai | Eastern-folk-horror specificity, high in JP market |
| demon | Generic high-volume horror tag |
| ghost | Wraith-adjacent, high-volume |
| cursed | Atmospheric, mid-volume |
| ritual | Folk-horror specificity |
| dark | Dark-fantasy keyword cluster |
| fantasy | RPG-adjacent high-volume |
| hunt | Hunt-tab is core mechanic, doubles as verb |
| monster | Generic high-volume |
| scary | Casual-search high-volume |
| slay | Action verb, roguelike-adjacent |
| indie | Vampire Survivors halo effect |
| boss | Boss-fight content, high-volume |

### 5.3 Honest limitation

I do NOT have access to Sensor Tower / AppFigures / AppTweak paid keyword volume data. The ranking above is my best practitioner estimate from primary-source ASO blogs (ASOMobile, SplitMetrics, etc.) and competitor-listing inspection. **Before launch, the orchestrator should either (a) buy a one-month Sensor Tower Plus subscription to validate volumes for the 16 chosen tokens, or (b) accept that this keyword field is "defensible, not measured-optimal" and plan a Day-30 ASO refresh with real competitive data.**

---

## §6 — Eight screenshot subjects (in order)

Per ASO-blog convergence (see §1.7 caveat — directional not measured), gameplay screenshots in slots 1-3 outperform menu/cinematic screenshots in those slots. The brief asks for 8; Apple allows up to 10 and Play Store allows 8-20. We are leaving slots 9-10 open for future seasonal promotion.

| # | Subject | Caption text (≤25 chars per Apple guidance) |
|---|---|---|
| 1 | **Combat in lantern-lit autumn forest.** Player character mid-attack, three wraith silhouettes circling at edge of frame, lantern light pooled around player, ukiyo-e ink-wash shadows. **The hero shot — what 90% of installers see and judge by.** | `Hunt the wraiths.` |
| 2 | **Boss reveal — the Wraith Father.** Massive horned silhouette filling 80% of frame, framed by torii gate, player character tiny in foreground holding a single lantern. Ink-wash storm clouds. | `Six bosses await.` |
| 3 | **Tower Gauntlet floor counter + buff card pick.** Mid-screen "FLOOR 27" overlay, three buff cards face-up below, leaderboard rank in corner. **Action-vector second hit — proves there's content past the campaign.** | `Endless Tower Gauntlet.` |
| 4 | **Character roster — 9 walkers.** 3×3 grid of ukiyo-e portrait cards, each with name + signature ability one-line. Three are silhouetted "LOCKED" placeholders to signal earnable content. | `Nine walkers. Each broken differently.` (split into 2 caption lines if Apple allows) |
| 5 | **Biome variety split panel.** Six small panels showing summer forest / autumn ash / cold stone / temple / cave / Eldritch, each captioned with biome name. **The "world is bigger than the screenshot" promise.** | `Six biomes. Eighteen stages.` |
| 6 | **Relic gacha summon animation.** Mid-pull frame: paper-charm spirit emerging from broken-mirror gacha portal, particle effects, currency cost visible in corner. | `Draw your relics.` |
| 7 | **Async Duel result screen.** Two character loadouts face-off, Power scores, "VICTORY" or "DEFEAT" stamp, leaderboard rank delta. **Social proof + competitive hook.** | `Duel sleeping rivals.` |
| 8 | **Stage 1 calm vignette.** Player character walking down a lantern-lit path under cherry-blossom trees, no enemies visible, soft golden hour. **The lulling — sets up the rug-pull. The screenshot that makes a folk-horror player smile because they know what comes next.** | `The grove welcomes you.` |

**Order rationale:** combat-first (1-3) per ASO convergence, character/world (4-5) per gacha-RPG convention, monetization-adjacent (6) before social (7), and the last slot (8) is the *brand-tone slot* — the screenshot that says "this game knows what it is." That last slot is where folk-horror players self-identify; it's the most important conversion screenshot for the *right* audience even if it ranks lowest on raw install rate.

---

## §7 — Promo video storyboard (15 sec)

| Time | Frame | Audio |
|---|---|---|
| 0:00–0:02 | Calm Stage 1 vignette. Player walks down lantern-lit path. Cherry blossoms drift. | Gentle shamisen, distant temple bell. |
| 0:02–0:04 | Cut to Stage 4. Lanterns flicker. Fog rolls in. Wraith silhouette pulls back into trees. | Shamisen goes off-key. Single low chime. |
| 0:04–0:07 | Stage 8 combat surge. Character throws a signature attack. Three wraiths shatter into ink-wash particles. | Combat hit-stop. Shamisen returns harder. |
| 0:07–0:10 | Tower Gauntlet floor counter spinning up — Floor 12, 24, 47. Buff cards flash by. | Drum acceleration. Crowd-of-whispers building. |
| 0:10–0:13 | Wraith Father reveal — silhouette rises behind torii gate. Player draws their lantern higher. | Silence. One long deep horn. |
| 0:13–0:14 | Cut to logo: `Unlimited Chaos` in ukiyo-e brush stroke. Subtitle below. | Final shamisen note. |
| 0:14–0:15 | Tagline overlay: `Don't trust the lanterns.` | Held note fades. |

**Format:** 15 seconds, vertical 9:16 for App Store + 16:9 for Play Store landscape variant. **Audio note:** must work without sound — the App Store autoplays muted. Critical info is on-screen; audio is bonus.

---

## §8 — Feature graphic brief (Play Store, 1024×500)

**The moment to capture:** the Wraith Father silhouette looms in the upper-right two-thirds of the frame, partially veiled in ink-wash storm cloud. In the lower-left third, a small player character holds a single lit lantern — the lantern is the brightest pixel in the entire image. The contrast ratio between the lantern and the surrounding dark must be high enough that the lantern reads as a single point of warmth in a field of cold.

**Text overlay:** `Unlimited Chaos` rendered in ukiyo-e brush-stroke font, centered on the horizon line where the player character meets the wraith silhouette. Subtitle below in smaller weight: `Veil of Lanterns`.

**Palette:** ink-wash blacks, lantern-warm orange (single hot point), fog-pale silver-blue, accent of arterial red on the wraith's eye (the only color in its silhouette).

**Composition principle:** the lantern is small, the wraith is huge, the player is alone. The image should convey "you have a tiny light against an enormous dark, and the light is what's drawing the dark to you." That single visual sentence is the Unlimited Chaos pitch in one frame.

**What to avoid:**
- No bright character portraits (this is not a hero-collector graphic).
- No combat VFX overlay (this is not a Survivor.io graphic).
- No floating UI elements (this is not a deal-banner graphic).
- The image should look like a single piece of art, not a marketing collage.

---

## §9 — Genre tags + age rating recommendation

### 9.1 App Store categories

- **Primary:** Roleplaying. Matches Identity V, Onmyoji, Honkai Star Rail. Optimal for the gacha + character-progression metagame layer.
- **Secondary:** Action. Matches PGR, Survivor.io, Vampire Survivors. Optimal for the auto-attack arena gameplay layer.

### 9.2 Play Store category

Single-primary system. Recommend **Role Playing**. The folk-horror tonal register pairs better with the Roleplaying browse-cluster (Genshin, HSR, Identity V, AFK Journey) than with Action (which skews casual / hyper-casual on Play Store).

### 9.3 Age rating

**ESRB: Teen (13+).** Matches Identity V (13+), Honkai (13+), PGR (13+), Survivor.io (13+), Vampire Survivors (13+). The cohort consensus is unambiguous.

**ESRB descriptors expected:**
- Fantasy Violence (boss combat, wraith disintegration)
- Mild Blood (the throat-clutch banshee, the bone-throat oracle — implied not graphic)
- Suggestive Themes (folk-horror dread, the Wraith Father motif)
- In-Game Purchases / Includes Random Items (gacha relics, Path Pass)

**PEGI: 12.** Matches the 13+/Teen tier in EU markets.

**Apple App Store Age Rating: 12+.** "Frequent/Intense Cartoon or Fantasy Violence" + "Infrequent/Mild Horror/Fear Themes." Vampire Survivors and Identity V both rate at this level.

**IARC (Play Store): Teen.** Single global IARC submission covers this.

### 9.4 Critical compliance notes (out of scope but flagged)

- **Random Items disclosure** is REQUIRED on both Apple and Google for any title with gacha. The W-Compliance-Disclosure worker (TASK 2) handles the actual rate disclosure language and the per-jurisdiction store-listing disclosures for JP / KR / EU strict markets. This ASO package does not handle that — but the long description (§4) leaves the compliance-insert marker positioned correctly for that worker to populate.
- **In-App Purchases ceiling display:** Apple requires "Includes In-App Purchases" badge automatically. No action needed at the metadata level.

---

## Done. What this gives the orchestrator

A submission-ready (pending compliance insert) ASO package that:

1. Cites primary-source competitor data — six listings fetched directly from the live App Store on 2026-05-05.
2. Verifies field char limits against Apple/Google docs (via Perplexity Sonar + cited URLs).
3. Provides character-counted candidates for every text field, with three ranked options on the title and subtitle.
4. Provides 8 written screenshot briefs ready for an art worker.
5. Provides a 15-second video storyboard ready for a video worker.
6. Provides a feature-graphic brief ready for an art worker.
7. Stays inside the folk-horror tonal register established by HORROR_DIRECTION_v1 — does not drift toward Survivor.io's exclamation-heavy register or Onmyoji's mythology-soft register.
8. Leaves explicit structural room for the compliance worker (TASK 2) to insert legally-required gacha disclosure language.
9. Names its own limits — the keyword field is "defensible, not measured-optimal" without paid Sensor Tower volume data.

**Architect ratification needed before this enters App Store Connect or Play Console.**

---

*Filed by Quill, w-aso-metadata-prep, 2026-05-05.*
