# HORROR_DIRECTION_v1.md

**Status:** RESEARCH-DRAFT — Architect ratification required before any character/genre work begins.
**Author:** W-Horror-Direction-Research worker (scheduled task, fresh Sonnet, 2026-05-02).
**Inputs:** 9x3x3 protocol — 27 queries across Gemini 2.5 Flash (Search grounding), Perplexity Sonar, Brave Search.
**Herd Lens verdict:** PASS for Round 1 (revenue, P(genuine)≈0.78), PASS-CAVEAT for Round 2 (design analysis, P(genuine)≈0.65 — qualitative-heavy), CONDITIONAL PASS for Round 3 (cross-IP, P(genuine)≈0.60 — one Perplexity metrics table flagged as likely-fabricated and excluded).

---

## 1. RECOMMENDATION — Lock genre, narrow it, hold the orchestrator pre-read

**Lock Eastern folk-horror as the host genre.** Do not cross-genre. Do not bolt zombie / cosmic / AI-tech sub-genres on top of the host — bolt them *underneath* via tonal escalation (see §2) and *across* via cross-IP rifts (see §3).

**Refinement of the orchestrator pre-read:** the pre-read said "Eastern folk-horror." Sharpen that to **Eastern folk-horror with gothic-asymmetric bones** — specifically the *Identity V* shape (NetEase, asymmetric horror, gothic art over Eastern manor lore), not the *Onmyoji* shape (NetEase, yokai gacha-RPG). Wood Siege is a top-down auto-attack arena; that maps to *Identity V*'s competitive horror loop, not *Onmyoji*'s turn-based collection RPG. Wraithgrove already inherits the auto-attack arena structure from the parent clone — leaning into the Identity V tonal register is the path of least resistance and the path of highest commercial precedent.

**Why this lock — primary-source revenue evidence:**
- *Identity V* (NetEase): ~$880M lifetime mobile revenue by Jan 2026; ~3M MAU; 102M lifetime downloads; weekly revenue range $231K–$1.1M (Sensor Tower Q2 2024). Asymmetric horror, gothic-Eastern manor aesthetic. **The proof point.**
- *Onmyoji* (NetEase): $2.6B cumulative global player spend by Sep 2020. Japan + China dominate. Yokai folklore + gacha. Different mechanics, same Eastern-folk-horror parent register.
- *Vampir* (Netmarble): #1 South Korea revenue Sep 2025. Dark-fantasy MMORPG. Confirms dark-Eastern register has multi-publisher pull.
- Mid-tier: *Game of Vampires: Twilight Sun* (DreamPlus Games, horror RPG): $345K–$966K weekly. *Myths of Moonrise* (StarFortune, horror narrative-RPG): $579K–$832K weekly. **There is a working mid-tier in dark-Eastern RPG that Wraithgrove can land in.**

**Why NOT cross-genre at the host level:**
- *Zombie* casual converts well at the puzzle/casual layer (*Plants vs. Zombies 2*, *Zombie Tsunami*: D1 retention 60%+) but it's a different audience from Eastern folk-horror — and the audience does not transfer cleanly. Tacking zombie on top of folk-horror dilutes both registers.
- *Cosmic / eldritch* horror has no top-grossing mobile presence as a primary register. It works as a *flavor* under another host (see §2 Stage 15-18). It does not work as the host itself.
- *AI / tech horror* has no top-performing mobile data. Niche, no proof point. Dangerous to bet on.
- *Psychological horror* alone is not commercially proven on mobile — but folk-horror IS partly psychological. Identity V's success is the gothic-folk register doing the lifting, not pure psychology.

**Disagreement note (per protocol — Architect wants real thinking):** the orchestrator pre-read is correct on direction but underspecifies the shape. "Eastern folk-horror" without the Identity-V refinement risks drifting toward Onmyoji-style yokai gacha, which Wraithgrove's mechanics cannot support. Pin the shape to *gothic-asymmetric folk-horror with arena combat* — it's the only proven mobile shape that matches Wraithgrove's already-built auto-attack arena loop.

---

## 2. TONAL ARC — Tutorial → Stage 18 register progression

**Design principle (cross-source convergent):** Calm-to-horror works because the tutorial is the lulling. The most effective rug-pull is the one where players don't realise they're being taught the rules of a horror game until the rules turn on them. *Inscryption* is the canonical example — the cabin card-game tutorial *is* the horror; Leshy's "let me teach you the rules" is the cage closing.

**Mechanism layer (from Round 2 design literature):**
- Wordless / minimal-UI onboarding (Limbo / Inside): no text, no chrome, no overt safety messaging — the *absence of horror signals* is the safety signal.
- Mundane simulation framing (Mortuary Assistant): clinical/professional language register; horror is the *disruption of competence*, not the introduction of monsters.
- Mass-mobile dark-register (Honkai Star Rail): dark themes in opening 30 minutes work *if* framed as "broader narrative of hope, struggle, fighting against odds" — heroic-against-darkness, never nihilistic-overwhelmed.
- Safe-rooms / pockets-of-ease: continuous dread desensitises. Strategic respite makes the next escalation hit harder. *Inscryption Act 2* is the masterclass — the *less-creepy* zone makes the meta-narrative more sinister.

### Concrete tier progression — 18 stages, 4 tiers

| Tier | Stages | Register | Palette | Audio | Language | Mechanic-signal |
|---|---|---|---|---|---|---|
| **CALM** | 1–3 (`Lantern Vigil`, `Pale Crossing`, `Sap-Drinker's Reach`) | "you are safe" | Daylight forest greens, soft mist, golden hour | Acoustic + bird ambience, faint chimes | Pastoral, "the grove welcomes you, walker" | Simple sigil unlocks, generic enemies, big visible XP rewards. Tutorial is just "tap, attack, collect." Music has tempo. |
| **UNEASE** | 4–9 (`Hollowwood`, `Witherthorn`, `Cradlestone`, `Ashen Vow`, `Throat-Clutch`, `Bone Dial`) | "something is wrong" | Twilight blue-grey, lengthening shadows, mist becomes *fog* | Chimes go off-key, bird-song fades, distant low hum | Stage-name register darkens. Boss whispers in Eastern-folk fragments. | Wraith silhouettes added to enemy roster. Banshee enemy (already shipped) appears here. Sigils start producing *unwanted* effects. |
| **DREAD** | 10–14 (`Veil-Tearer`, `Mother-of-Wax`, `Skin-Loom`, `Shrike's Throat`, `The Black Vow`) | "you should not have come this far" | Night palette, wet blacks, sudden cold blues, fire goes pale-white | Banshee shrieks (live), oracle-style boss vocals, screen-tear stingers | Boss-text shifts to second-person riddle: "do you remember the third gate?" Player-name interjections in stage chrome. | Faces in bark / floor textures (subliminal). Enemies start *watching* before attacking. Companion light dims. |
| **HORROR** | 15–18 (`Eldritch tier — Rift-Birth`, `The Cartographer's Mistake`, `What the Grove Is`, `The Last Wraith`) | "the rules were never the rules" | Violent reds + arterial blacks, palette desaturates to ink-wash, screen artefacts | Eldritch register: rift-shrieks, voice-warp on player-side audio, silence as scare-tool | Boss speaks *to the player* (not the character). Stage names break grammar. Ad placements (per BLUEPAPER §7) given diegetic skins. | Rift intrusion bosses arrive (see §3 — this is where cross-IP unlocks live). Power-stat behaves anomalously in cinematic. |

### Pacing notes

- **Hold a respite at Stage 11 or 12.** A "village" or "rest" stage that feels almost-safe — colour returns, music is gentler. Then Stage 13 hits harder. This is the Inscryption Act-2 lesson; without it, the player desensitises by Stage 14.
- **Stage 1's first 90 seconds must not contain a single horror cue.** D1-retention research (Round 2 mobile-mass-market) is unambiguous: horror-onboarding loses casual players in the first FTUE minute. Genshin and Honkai Star Rail both delay or hope-frame their dark register; Wraithgrove can only delay (the host genre is folk-horror). The first 90 seconds should be Identity-V-pretty-gothic, not Identity-V-screaming-survivor.
- **The rug-pull lives in Stage 4–5.** That's the Inscryption-cabin moment — when the player realises the tutorial taught them rules that are now turning on them.
- **Stage 18 is final, not climactic.** *Inscryption Act 3* lesson: the meta-horror is the silence afterwards, not the louder boss. Stage 18 should make the player *want* to start over from Stage 1 — and find Stage 1 changed.

---

## 3. CROSS-IP FRAMEWORK — The Rift Pattern (and Ysabel-as-test-case)

### The pattern (reusable across all future Hive cross-IP)

**Lore-bridge — single canonical mechanic:** The Wraithgrove is a *thinning place* — a region of reality where the veil between worlds is bruised. As the player descends into deeper stages, the veil thins further. Eldritch-tier rift events tear the veil locally and pull *characters from other Hive realities* across.

This bridge satisfies all four "clean bridge" categories from Round 3 simultaneously: it is a **dimensional rift** (Identity V Manor-game tradition), it can be framed as a **dream / hallucination** (Wraithgrove canon could include the manor-as-psyche reading), it is **summoning** (the player's deeper-stage attainment is the ritual), and it is **multiverse** (the Hive itself is a setting of many realities). One mechanic, four narrative-layer reads — robust against erosion.

**Visual conformance — the "wraith filter":** Every cross-IP guest gets restyled into Wraithgrove's palette before they appear in-arena. Identity V solved this with button-eyes; Fortnite solved it with snapshot-mannequins. Wraithgrove's solve: an **ink-wash overlay** + a canon mark (a single pale eye on the brow, signalling "marked by the grove"). Guests look *of* Wraithgrove while remaining recognisable as themselves.

**Diminished-state framing — non-negotiable:** A guest pulled across the rift is *weakened*. They speak in fragments, their abilities are partial echoes, they don't fully remember their home. This serves three functions:
1. Preserves Wraithgrove's host-tone (KingshotPro's strategic-flavour Ysabel would clash; diminished-Ysabel does not).
2. Prevents power-creep in the Power-stat aggregator (a guest cannot dominate the host game's progression).
3. Creates narrative weight without lore commitments — the guest's absence after the event is explained by "the rift closed, they were pulled home."

**Cap and cadence — brand-erosion guard:**
- Maximum **2 eldritch-tier rift unlocks per calendar year** in the live game.
- Each one must be a *narrative event*, not a skin drop. Boss fight or stage redesign.
- Eldritch-tier rifts unlock at Stage 12 player progression (earned weight) — a brand-new player cannot stumble into a guest character in the first session.

### What competitors do badly that we should NOT copy

- **Fortnite's "snapshot" identity-erasure:** explains why Batman uses guns by saying "this Batman has no memory." Lazy, immersion-breaking. We don't blank guest characters of identity. Diminished, not erased.
- **Identity V's skin-only crossovers:** Persona 5 / Sanrio / Detroit landed as cosmetic re-skins of existing survivors. Players read this as cash-grab; Reddit calls it out. **A Wraithgrove cross-IP guest must bring a signature mechanic, not just art.**
- **Genshin x Aloy "Savior From Another World":** thin, in-character-bio-only justification with no in-world consequences. The crossover happened, then nothing changed. A Wraithgrove rift event must leave a *mark* on the world (a permanent UI element, an unlocked stage variant, a remembered NPC line) so the player feels the world acknowledged it.
- **HoYoverse "expies" pattern:** Genshin's Raiden-Shogun-as-not-quite-Raiden-Mei works because miHoYo owns both IPs and the lore is intentionally permissive. Hive cross-IP does not need expies — we own all the IPs. We can have the *literal* same character cross over (Welt-Yang model), which is narratively cleaner.

### Ysabel-specific lore bridge (Wraithgrove canon)

Ysabel is the KingshotPro AI advisor — a strategist who reads kingdoms across history and counsels players on military and economic decisions. In KingshotPro she is a *meta-layer* presence (the advisor screen, the post-decision feedback). She is not embodied as a combat character there.

In Wraithgrove canon, propose: **"Ysabel, the Cartographer of Lost Kingdoms."** She is the same Ysabel — but in this reality, the rift pulled her across mid-counsel. The Wraithgrove diminished her: she has lost the *strategic clarity* that defined her in the home reality, and now she remembers fragments of fallen kingdoms she once advised. She speaks in fragments of military counsel that no longer match the war she's in.

Mechanical role: **mid-stage Oracle**. She appears at Stage 12–14 as a non-combat NPC who offers cryptic counsel — equivalent of a between-stage advisor. Player choice points (which weapon to favour, which biome path to take in late-game branching) get a one-line Ysabel-fragment that hints at consequence without specifying it. This honours her KingshotPro identity (advisor) while making her a Wraithgrove-native role (the haunted oracle in folk-horror tradition).

Unlock pattern: a **rare Rift Sigil** drops from Stage 12-onward bosses. Equipping the sigil at the meta-layer (Ascend tab) summons Ysabel for the next run. Single-use until next drop; can be permanently unlocked via an event-pass during her debut event.

**Critical timing risk (flagged for Architect):** KingshotPro is currently in build state — AI integration blocked on pricing research, per `MEMORY.md` → `project_kingshotpro_build.md`. Ysabel does not yet have a player base in her home title. **Recommendation: hold the Ysabel-in-Wraithgrove rift event until KingshotPro has shipped to a small-but-real user base.** Otherwise the cross-IP marketing-lift premise fails — there is no audience to cross over from. Ship Wraithgrove with the *Rift mechanic plumbed* and the *Rift Sigil drop-table populated* but the first guest unannounced; reveal Ysabel as the first rift-guest only when KingshotPro is live.

### Reusable for future Hive crossovers

The Rift Pattern is content-agnostic. Any future Hive title with a recognisable character archetype can cross over via the same mechanic:

- **Mantle** (KingshotPro advisor 46-roster, future) → "fragment of strategic memory, pulled from a council that never happened."
- **EmberGlow's companion** → "the light-companion's reflection, bleeding through from a softer reality."
- **Future advisor characters** → all enter the same way; the player learns the pattern across releases. The Rift becomes a *Hive meta-feature* that signals "this game is part of the Hive cosmology."

This is the Welt-Yang move applied at the Hive scale: one explicit cross-game traveller mechanic, used sparingly, that marks the catalog as a connected universe without forcing every game to share genre or mechanics.

---

## 4. RISKS

| Risk | Likelihood | Severity | Mitigation |
|---|---|---|---|
| KingshotPro hasn't shipped — cross-IP marketing lift fails | High | High | Hold Ysabel debut until KingshotPro has a real user base. Ship Wraithgrove with the Rift mechanic plumbed but no announced first guest. |
| Aesthetic mismatch — Simli AI video Ysabel vs hand-illustrated folk-horror | Certain | Medium | Wraith-filter overlay + 2D static art for in-arena Ysabel. Reserve Simli video Ysabel for meta-layer advisor screens only. Two layers, two media. |
| Tonal mismatch — KingshotPro strategic flavour vs Wraithgrove dread | High | Medium | Diminished-state framing. Ysabel is *broken* by the rift. Her counsel is fragments, not strategy. |
| Brand erosion — cross-IP becomes a treadmill | Medium | High | Hard cap 2 eldritch-tier unlocks/year. Cosmetic-only crossovers forbidden by precedent. |
| Day-1 retention loss from horror-too-early in FTUE | High | High | Stage 1 first 90s contains zero horror cues. Calm-tier register held strict for stages 1-3. Inscryption-pattern lulling. |
| Eldritch / cosmic register at Stage 18 alienates Eastern-folk audience | Medium | Medium | The eldritch register is *under* the folk-horror host (a deeper fold the player descends into), not a genre swap. Stage 18 names and lore stay Eastern. The strangeness is cosmic *expressed in folk grammar*. |
| Player perception that Stage 18 is "the end" — replay incentive collapses | Medium | High | Stage 18 must change Stage 1 on replay (NG+ content). Borrowed from Inscryption Act 3 lesson — the reveal makes the opening hit differently. |
| Convergent fabrication on cross-IP retention metrics (Round 3 Perplexity Q3) | Detected | n/a | Excluded the suspect metrics table from the recommendation. We do not claim "+15% DAU" or "20% D7 lift" — those numbers were probably fabricated. |

---

## 5. SOURCES (9+ primary, herd-checked)

Cited in research order, primary-source URLs prioritised. Wikipedia / Fandom wikis flagged as derivative. Sensor Tower / AppMagic / Newzoo / data.ai are the industry primary sources.

1. **Sensor Tower — "Top 5 Horror Games on Android, US, Q1/Q2 2024" + "Top 10 Worldwide Mobile Games — September 2025"** — Identity V, Mystery Matters, Dead by Daylight Mobile, Myths of Moonrise, Game of Vampires revenue ranges. Vampir #1 South Korea Sep 2025. (https://sensortower.com/blog/2024-q2-android-top-5-horror-games-revenue-be... ; https://sensortower.com/blog/top-10-worldwide-mobile-games-by-revenue-and-downloads-september-2025)
2. **AppMagic / Sensor Tower — Identity V cumulative metrics** — $880M lifetime mobile revenue (Jan 2026), 102M lifetime downloads, ~3M MAU, $10–20M monthly peak. Multiple Sensor Tower quarterly horror reports.
3. **Sensor Tower — Onmyoji $2.6B cumulative global player spend by Sep 2020.** (Reddit r/Onmyoji discussion thread cites direct Sensor Tower numbers.)
4. **NetEase developer statements / GDC talks — Identity V crossover events catalog.** Persona 5 Royal (Aug 2019, "Essence event" with button-eye visual conformance), Detroit: Become Human, Resident Evil, Sanrio (Dec 2023). Identity V Wiki + IDV Fandom.
5. **Fortnite Wiki — "The Omniverse" lore framework.** Zero Point + Imagined Order + The Seven + Snapshots concept. Marvel Nexus War (Chapter 2 Season 4), Star Wars annual, Resident Evil collab. (https://fortnite.fandom.com/wiki/The_Omniverse)
6. **HoYoverse "Imaginary Tree" cosmology — Welt Yang as canonical cross-game traveller.** Genshin × Aloy ("Savior From Another World" character bio), Genshin × Honkai 3rd "game proposals" frame for Fischl/Keqing crossover. Multiple HoYoverse interviews + lore wikis.
7. **Newzoo — IP collaboration impact on F2P mobile DAU: ~8% lift first 7 days; 54% of spenders engage IP-event purchases.** (Cited via Gemini search-grounded results referencing Newzoo collab research.)
8. **Inscryption — Daniel Mullins design interviews + community design analyses.** Act 1 cabin-tutorial-as-cage, Act 2 respite that escalates meta-horror, Act 3 silence-as-climax. (GameDeveloper.com interviews + GDC adjacent talks.)
9. **Identity V x AFK Arena Dream Witch event — dream-sequence cross-IP framing.** Lore bridge: the hunter's psyche; guests appear as nightmarish projections, "awaken" post-event preserves both IPs. (AFK Arena patch notes + Identity V event archive.)
10. **Sensor Tower — "Live Ops Strategic Insights 2025"** — Halloween-themed live-ops events (Pumpkin Invasion, Spooky Gathering, King of Phantoms) drove three-month revenue peaks across top-grossing titles. Validates seasonal horror-event playbook. (https://sensortower.com/blog/top-grossing-mobile-games-live-ops-strategies-2025-report)
11. **mashxtomuse.com — "A Field Guide to Folk Horror Games"** — folk-horror as a working game-genre tag, surveyed across indie/AAA. Useful for grammar of the host register.
12. **Game-design literature — tonal escalation principles** — safe-rooms / pockets of ease; powerlessness via limited agency; distorted familiarity; the "Jenga effect" of accumulating dread. Multiple sources converge (Resident Evil 2002 remake design analyses, Silent Hill 2 location-design writeups, Amnesia: The Dark Descent monster-pacing studies).

---

## 6. EXPLICIT NON-FINDINGS (honesty audit)

These are claims I would *like* to make but cannot back with primary sources, flagged so the Architect can call my work shallow if it leaks into the recommendation:

- **No primary D1 / D7 / D30 retention data** for any specific Eastern folk-horror mobile title. Inferred from sustained revenue. Treat retention claims as *consistent-with* not *measured-as*.
- **No primary ARPU data** for Identity V or Onmyoji. Inferred from gacha-monetisation pattern.
- **The Perplexity Round-3-Q3 metrics table** (15% event DAU lift, 20% D7 retention lift, $5M+ revenue, 30% DAU uplift GDC 2024) was suspiciously clean and provenance was vague. Likely fabricated. Excluded from the recommendation. Do not cite.
- **No primary developer-postmortem** for the calm-to-horror onboarding pattern in Limbo / Inside / Inscryption / Mortuary Assistant. The mechanism analysis is reconstructed from gameplay observation + community design writeups. Treat as design-pattern theory, not "studio X said this."
- **No Sensor Tower category report titled "Eastern folk-horror"** exists publicly. The category is constructed by inspection of the title roster, not by a published genre cut.

---

## 7. TLDR for the Architect

- **Lock genre:** Eastern folk-horror, Identity-V-shaped (gothic-asymmetric-arena), not Onmyoji-shaped. The orchestrator pre-read holds; this is the data-grounded refinement.
- **Tonal arc:** 4 tiers across 18 stages — Calm 1-3, Unease 4-9, Dread 10-14, Horror 15-18. Inscryption-style tutorial-as-lulling. Inscryption-style respite at Stage 11-12. Stage 18 must change Stage 1 on replay.
- **Cross-IP via the Rift Pattern:** thinning-place lore + wraith-filter visual conformance + diminished-state framing + 2 unlocks/year cap. Reusable for all future Hive crossovers.
- **Ysabel-specific:** "Cartographer of Lost Kingdoms," mid-stage Oracle role (Stage 12-14 NPC counsel), Rift Sigil drop unlock. **Hold debut until KingshotPro ships to real users.** Plumb the mechanic in Wraithgrove launch; do not pre-announce the first guest.
- **Risks to ratify or reject:** KingshotPro readiness, Stage-1-90s rule, eldritch-under-folk register containment, NG+ replay incentive at Stage 18.
- **One non-finding the Architect should hear:** I have no primary retention data for any Eastern folk-horror mobile title. The recommendation rests on sustained-revenue evidence as a *consistent-with* signal for retention, not a measured one. If the Architect wants verified retention numbers before ratifying, that is a 9x3x3-Round-2 follow-up worth running before any character/genre work begins.

---

*Filed by W-Horror-Direction-Research, 2026-05-02. Architect ratifies before any character or genre commit.*
