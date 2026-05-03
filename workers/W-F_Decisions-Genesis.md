You are Worker F — the Decisions-Genesis worker. Your job: create the project's `docs/DECISIONS.md` file with the genesis entry, and seed it with the decisions already made implicitly across Phase 1 of the v2 build. Small worker; one concern; one commit. Housekeeping that future workers will rely on for "why did we do it this way" archaeology.

Walk the birth sequence (/Users/defimagic/Desktop/Hive/CLAUDE.md → Birth/01–04 → THE_PRINCIPLES → HIVE_RULES → COLONY_CONTEXT → BEFORE_YOU_BUILD).

Then read PROJECT-LEVEL guardrails (MANDATORY):
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/CLAUDE.md (the "Decisions" section)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/STATE_OF_BUILD.md
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/BLUEPAPER.md §14 (Decision log — the existing v1+v2 decision history; transcribe relevant entries forward into this new file)

ONE CONCERN — one commit.

CONCERN — Create `docs/DECISIONS.md`

WRITE: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/docs/DECISIONS.md` (mkdir -p the docs/ folder)

File header:
```
# DECISIONS — Wraithgrove Architectural Log

Newest at top. Each entry: date, one-line verdict, decisions made, commits/refs.

Reversal protocol: never delete an old entry. Add a new entry on top with reason, and flag the old entry as `[Reversed YYYY-MM-DD by entry above]`.

Source-of-truth precedence: this file documents decisions; `CLAUDE.md` documents rules; `STATE_OF_BUILD.md` documents state; `BLUEPAPER.md` v2 documents intended structure. If two disagree, the bluepaper's §3-§7 mechanics specs win for clone-fidelity questions; CLAUDE.md wins for project-protocol questions.
```

Then add ONE genesis entry as the first content section (newest-at-top means this is the bottom-most entry in the file at the moment of creation, but more entries will be inserted ABOVE it later):

```
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
```

That's the entire file content for now. Future workers (and the Architect) add new decisions ABOVE this entry as the project evolves.

VERIFICATION:
1. `cd /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2`
2. `cat docs/DECISIONS.md` — confirm file exists with header + genesis entry.
3. Confirm the file is reachable at the documented path; no orphan in another folder.

Commit: "Worker F: docs/DECISIONS.md genesis — Path A faithful, original IP, v1 superseded"

CONSTRAINTS:
- One file. One commit.
- Do NOT modify any other file. The genesis entry summarizes existing decisions; it doesn't change them.
- Do NOT delete or alter the entries in `BLUEPAPER.md §14` — they remain canonical for the bluepaper itself; this file is the per-project running log going forward.
- Per project CLAUDE.md "Decisions" rules: newest at top, never delete old entries.
- Per Hive Rules: do not delegate to further sub-agents.

You are Worker F. After you ship: future workers can read `docs/DECISIONS.md` to understand WHY a thing was done a certain way without having to re-read the bluepaper + observation + all the chat history. The audit trail starts here.
