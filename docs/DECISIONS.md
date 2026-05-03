# Decision 2026-05-03 — Stage durations cut aggressively for mobile pacing

**Architect verbal directive 2026-05-03 14:50 EDT:** *"the enemy waves during battle are way too long. people don't want to wait that long. Especially for stage 1."*

## Was
- Early (1-6): 5 waves × 90s = **7.5 min/stage**
- Mid (7-12): 10 waves × 100s = **16.7 min/stage**
- Late (13-18): 15 waves × 110s = **27.5 min/stage**

## Now
- Early (1-6): 3 waves × 30s = **1.5 min/stage**
- Mid (7-12): 5 waves × 50s = **4.2 min/stage**
- Late (13-18): 7 waves × 60s = **7 min/stage**

## Why
Mobile hook window for Day 1 retention is 30-90 seconds for first win. We were 5× too long. Stage 1 at 7.5 min loses the player before the dopamine peak ever lands. Late endgame at 7 min is still long enough to feel epic but won't burn out the marathon player.

## Risk acknowledged vs BLUEPAPER
BLUEPAPER §0 prior wave-spec window was 90-120s/wave. This decision narrows below that floor. Architect verbal ratification overrides bluepaper window. BLUEPAPER §3 wave config will be updated to match in next sweep.

---

# DECISIONS — Wraithgrove Architectural Log

Newest at top. Each entry: date, one-line verdict, decisions made, commits/refs.

Reversal protocol: never delete an old entry. Add a new entry on top with reason, and flag the old entry as `[Reversed YYYY-MM-DD by entry above]`.

Source-of-truth precedence: this file documents decisions; `CLAUDE.md` documents rules; `STATE_OF_BUILD.md` documents state; `BLUEPAPER.md` v2 documents intended structure. If two disagree, the bluepaper's §3-§7 mechanics specs win for clone-fidelity questions; CLAUDE.md wins for project-protocol questions.

---

## 2026-04-27 — Genesis: Path A faithful clone, Wraithgrove name, original IP layer

**Verdict:** Wraithgrove is a faithful mechanics-clone of Wood Siege under monetization Path A (faithful) with original art / names / specific text strings as the IP-clean layer. Architect-confirmed 2026-04-27.

**Decisions made (transcribed forward from BLUEPAPER §14):**
- v1 Hollow Grove design fully superseded — frame error: a "humane response" was built before observing the actual game. v1 quarantined as `build/` scaffold; do not read it for design inspiration. Source: `GAMEPLAY_OBSERVATION.md` §8.
- v2 is a clone, not a response. Architect directive: "build identically without any BS." Source: this conversation.
- Five-tab navigation structure: Duel / Ascend / Hunt / Forge / Relics. Source: Wood Siege App Store screenshots 4 and 6 show this exact bottom-nav.
- Top-down auto-attack arena (NOT isometric, NOT tap-to-attack). Source: 261 frames sampled across two YouTube walkthrough storyboards.
- 18 stages with biome rotation across 6 biomes (forest_summer / cold_stone / forest_autumn / temple / cave / eldritch). Source: publisher description + YouTube walkthrough naming pattern.
- 6 bosses, one per 3-stage cluster. Source: standard mobile-RPG cadence + observation pacing.
- Skins are gameplay-relevant power, not cosmetic. Source: App Store screenshot 5 "UNLOCK SKIN BOOST POWER" with LV.1 → LV.99 power scaling.
- Original IP discipline: replicate mechanics + structure + monetization tier; do NOT replicate specific Wood Siege names, art, or text. All stage names (Lantern Vigil, Pale Crossing, ...), relic names (Hempcord, Ironbloom, Wraithheart, ...), character/skin names (Lantern Acolyte, ...), and weapon names (Branch Stick, Charred Axe, Bow of Mourning, ...) are original to Wraithgrove. Mechanics are not copyrightable; specific creative expression is.
- Path A monetization (faithful) chosen — 12 IAP SKUs $0.99 to $99.99, daily 50-RV ad cap, $99.99 mega-bundle, ad-gated weapon pickups in Hunt mode. Architect directive 2026-04-27.
- TWO deliberate non-replications under Path A:
  1. Ad-removal SKU is cross-device transferable via account-upgrade. Wood Siege's same SKU did not transfer (per aj griffing's review); we treat that as a bug, not a feature.
  2. Ad SDK MUST not auto-launch other apps or open malicious URLs. Wood Siege's review evidence (likegoodgames Mar 30, 123729506 Feb 21, Whydoihavetouseanickname? Jan 31) reports unauthorized cross-app redirects. We treat that as an SDK security failure, not a feature. Production SDK choice + lockdown is documented in BLUEPAPER §0 Rule 5.
- Engine architecture: 36 modules across 7 groups (core / meta / hunt / ascend / forge / relics / duel / orchestrator), vanilla JS, no frameworks, no third-party SDKs in v1.0. Source: BLUEPAPER §8.2.
- `wg-state.recomputePower()` is the single source of truth for the Power stat — never cached. Every change to level/skin/equipment/buildings/relics implicitly bumps Power on next read. Source: BLUEPAPER §3 design + the existing Wood Siege observation that Power is the master combat stat.
- Worker delegation pattern: orchestrator-Claude writes self-contained worker prompts as markdown documents in `workers/`. Each prompt is paste-and-run cold by a fresh Sonnet session. The harness Agent tool is hook-blocked; this is the Hive's standard delegation pattern (per the Embergrain Delegator workspace, validated 2026-04-26).
- Working-title hold: "Wraithgrove" remains the development name. Final ASO-tested name is a Phase 5 (soft launch) decision, not Phase 1.

**Commits:** 1 (this file's creation)

**Refs:**
- BLUEPAPER.md v2 §0–§15
- GAMEPLAY_OBSERVATION.md §1–§12
- AD_BAIT_LIBRARY.md §1–§8
- PHASE_2_LOG.md (build verification matrix)
