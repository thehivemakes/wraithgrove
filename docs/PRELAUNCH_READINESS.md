# PRELAUNCH_READINESS.md — Unlimited Chaos Comprehensive Go/No-Go
**Date:** 2026-05-08 | **Worker:** W-Prelaunch-Readiness (one-shot Sonnet)
**Sources:** STATE_OF_BUILD.md · audits/AUDIT_v029* · AUDIT_Final_Launch* · AUDIT_Launch_Readiness* · AUDIT_Monetization_V2_Batch* · docs/BALANCE_AUDIT.md · docs/PERFORMANCE_AUDIT.md · docs/ASO_PACKAGE_v1.md · workers/done/ (108 markers) · BUILD_PLAN.md · CLAUDE.md · BLUEPAPER.md

---

## TL;DR — Ship Verdict

**SHIP-WITH-FIXES.** The code is production-quality and functionally complete. All 5 tabs are playable, all 18 primary stages and 6 bosses are wired, the full Path A monetization catalog exists, legal pages are structurally complete, and 108 workers have shipped across all build phases. Two categories of work remain before App Store / Play Store submission:

**Architect-only blockers (10 items):** Legal entity name in privacy/terms (6 fills), AdMob production IDs, Apple StoreKit + Google Play Billing production wiring, code signing credentials, App Store Connect + Play Console app records, ATT pre-prompt, ASO subtitle selection, gacha compliance insert for JP/KR/EU markets.

**Recommended pre-launch fixes (autonomously executable, 5+5):** Five balance tuning changes (FLAG-01 login bonus, FLAG-04 god window, FLAG-03 gold mine cap, FLAG-05 tower HP scaling, FLAG-02 stage duration cliff) and five performance patches (drawStumps sort cache, spatial grid for tree collision, night overlay gradient cache, fever shadowBlur offscreen, drops cap + fever interval cleanup). These are not hard blockers but D1 retention impact is high for the balance fixes.

---

## §1 — Code-Complete Systems (autonomous, done)

All 108 workers have a done marker in `workers/done/`. The following is organized by subsystem with cache-bust version pulled from STATE_OF_BUILD.md and recent worker outputs.

### Core Infrastructure
| System | Version/Marker | Status |
|--------|---------------|--------|
| Boot scaffold, sequential module loader | index.html | ✓ Shipped |
| Global state + Power recompute | `wg-state.js` | ✓ Shipped |
| Event bus + tick driver | `wg-engine.js` | ✓ Shipped |
| Save/load (localStorage, dirty-flag autosave 3s) | `wg-cache.js` | ✓ Shipped |
| Virtual joystick + WASD + skill trigger | `wg-input.js` | ✓ Shipped |
| Web Audio engine (13 SFX + 6 UI + 6 ambient) | `wg-audio.js` — W-Audio-Sourcing | ✓ 25 MP3s on disk, CC0 |
| i18n scaffolding | `wg-i18n.js` — W-i18n-Scaffolding | ✓ 248 keys, EN baseline |
| Phase 4 save-sync stub | `meta-savesync.js` — W-Save-Sync-Phase4-Stub | ✓ Stub, Phase 4 swap-ready |

### Hunt (Action Loop)
| System | Version/Marker | Status |
|--------|---------------|--------|
| 24-stage catalog (18 main + stages 0 + 19–24) | `hunt-stage.js` | ✓ Shipped (W-Content-Expansion-Stages-19-24) |
| Stage lore text for all 24 stages | `docs/STAGE_LORE.md` | ✓ W-Content-Stage-Lore |
| 14 weapons (1 starter + 9 in-stage + 3 meta) | `hunt-weapons.js` | ✓ Shipped |
| 14 enemy types (5 base + 9 expanded) | `hunt-enemies.js` — W-Enemy-Catalog | ✓ Shipped; ENEMY_SPRITES wired |
| Enemy sprite pipeline (Stage 1 pack) | `art/enemies/` — W-Enemy-Sprites-Stage1-Pack | ✓ All 5 Stage 1 types have sprites |
| 6 bosses with distinct attack patterns | `hunt-bosses.js` | ✓ Shipped; boss death payoff (W-Boss-Death-Payoff) |
| Boss portraits (MJ art) | `images/portraits/` — W-Boss-Portraits | ✓ Shipped |
| Boss visual per-arena | `hunt-render.js` — W-E (Boss-Visuals) | ✓ Shipped |
| Wave manager + spawn ramp | `hunt-waves.js` | ✓ Shipped |
| Day/Night mode architecture | — W-DayNight-Architecture, W-DayNight-And-Torch | ✓ Night mode fully wired |
| In-stage weapon pickup system | `hunt-pickups.js` — W-A (Hunt-Pickups) | ✓ Shipped |
| God Window (first-60s ease-in) | `hunt-enemies.js` GOD_WINDOW — W-Wave1-God-Window | ✓ 60s cubic-out, START_MULT 0.60 |
| Fever Mode (combo≥20 → 10s burst) | `hunt-player.js` FEVER_TUNABLES — W-Fever-Mode | ✓ Shipped + committed |
| Tower Gauntlet (infinite roguelite) | `hunt-tower.js` / `hunt-tower-buffs.js` — W-Tower-Gauntlet | ✓ 24 buff cards, floor scaling, 2 continues |
| Tower procedural background + HUD | `hunt-tower-render.js` — W-Tower-Art-Procedural | ✓ Floor-tier palette, torch sconces |
| Tower visual polish | — W-Tower-Visual-Polish | ✓ Shipped |
| Tile biome decoration | `hunt-render.js` — W-B (Tile-Deco) | ✓ Shipped |
| FX: floating numbers + pulse | `hunt-fxnumbers.js` — W-FX-Numbers-And-Pulse | ✓ 6 event types wired |
| FX: particles + magnet | — W-FX-Particles-And-Magnet | ✓ Shipped |
| FX: trauma + hit-pause | — W-FX-Trauma-And-HitPause | ✓ HITSTOP_TIERS frozen |
| FX: P2 polish pass | — W-FX-P2-Polish, W-FX-Polish-Pass | ✓ Shipped |
| Dopamine design pass | — W-Dopamine-P1 | ✓ HUD pulse, visual feedback |
| Building repair system | — W-Building-Repair | ✓ Shipped |
| Turret + campfire combat | — W-Turret-And-Campfire-Combat | ✓ Shipped |
| Stage 0 tutorial (90s invuln gate) | `hunt-tutorial.js` — W-Stage-Zero-Tutorial | ✓ Shipped + committed |
| In-stage tutorial (Stage 1 hints) | `hunt-tutorial-ext.js` — W-C (Tutorial), W-Tutorial-Polish-V2 | ✓ Shipped |
| Tutorial content pass | — W-Tutorial-Content-Pass | ✓ Shipped |
| Tutorial strip (excess hints removed) | — W-Tutorial-Strip | ✓ Shipped |
| Hunt nav fix (stage exit/boon bugs) | `wg-game.js` — W-D (Hunt-NavFix) | ✓ Shipped |
| Level-up storm tuning | — W-LevelUp-Storm-Tune | ✓ Shipped |
| Stat polish | — W-Stat-Polish | ✓ Shipped |
| Spawn tuning | — W-Spawn-Tuning | ✓ Shipped |
| Hard tuning + monetization gate | — W-Hard-Tuning-And-Monetization | ✓ Shipped |
| Squad system | — W-Squad-System-Full | ✓ Shipped |
| Rift mechanic (sigil drops + guest slots) | `wg-state.js` rift — W-Rift-Mechanic-Plumbing | ✓ Shipped; rift_guests pool locked |
| Special abilities (6 types + IAP packs) | `meta-special-abilities.js` — W-Special-Abilities | ✓ Shipped |
| Progressive tab unlock (stages 0/2/5/8) | `wg-game.js` www/ — W-Progressive-Tab-Unlock | ✓ Shipped + committed |

### Ascend
| System | Version/Marker | Status |
|--------|---------------|--------|
| Character level-up + 7-tier ascension | `ascend-character.js` | ✓ Shipped |
| 8 skins (LV.1 to mythic +1800 PWR) | `ascend-skins.js` | ✓ Shipped |
| 3-slot equipment (Melee/Ranged/Pet) | `ascend-equipment.js` | ✓ Shipped |
| 5 upgradable stats | `ascend-stats.js` | ✓ Shipped |
| Roster + rebirth | — W-Roster-And-Rebirth | ✓ Shipped |
| Character portraits (9 walkers, MJ art) | `images/portraits/` — W-Character-Portraits | ✓ Shipped |
| Animated portrait infrastructure | `images/portraits/anim/` — W-Character-Animate-MJ | ✓ Infrastructure ready; MJ Animate generation pending |
| Skin art (MJ briefs) | `art/skins/` — W-I (Skin-Art-Briefs), W-MJ-Briefs-Building-Skins | ✓ Briefs shipped |
| Player sprite (MJ Chrome pipeline) | — W-Player-Sprites-MJ-Chrome, W-Player-Sprites-Finish | ✓ Shipped |

### Forge
| System | Version/Marker | Status |
|--------|---------------|--------|
| 8-slot building grid + idle income | `forge-buildings.js` — W-Buildings-Tab-UI | ✓ 3 unlocked + 5 GS-locked |
| Buildings visual redesign V2 | — W-Buildings-Redesign-V2 | ✓ Shipped |
| Buildings MJ art | — W-Buildings-MJ-Art | ✓ Shipped |
| Forge art pass | — W-Forge-Art-Pass | ✓ Shipped |
| 10-craft batch + RNG drop table | `forge-craft.js` | ✓ Shipped |
| 7-day streak tracker | `forge-daily.js` | ✓ Shipped |
| Forge diorama canvas | `forge-render.js` | ✓ Animated campfire, pagoda, 8-slot grid |

### Relics
| System | Version/Marker | Status |
|--------|---------------|--------|
| 48 original relics × 5 rarity tiers | `relics-catalog.js` — W-Relics-Catalog, W-Relics-Catalog-Refresh | ✓ Shipped |
| Relics catalog expansion | — W-Relics-Catalog-Expand | ✓ Shipped |
| Owned-list + equip (max-6 active) | `relics-collection.js`, `relics-equip.js` | ✓ Shipped |
| Relic balance | — W-H (Relic-Balance) | ✓ Shipped |

### Duel
| System | Version/Marker | Status |
|--------|---------------|--------|
| Opponent generator + 7-tier ranked system | `duel-roster.js`, `duel-rank.js` | ✓ Shipped |
| Match resolver + rewards + daily quota | `duel-match.js` | ✓ Shipped |
| Mode 1 (Raid foundation + trap counterplay) | — W-Mode1-Base-Raid-Foundation, W-Mode1-Trap-Counterplay | ✓ Shipped |

### Alliance
| System | Version/Marker | Status |
|--------|---------------|--------|
| Alliance foundation | — W-Alliance-Foundation | ✓ Shipped |
| Officer roles | — W-Alliance-Officer-Roles | ✓ Shipped |
| Recruitment system | — W-Alliance-Recruitment | ✓ Shipped |
| Alliance boss (Mode 5) | — W-Mode5-Alliance-Boss | ✓ Shipped |
| Alliance shop expansion | — W-Alliance-Shop-Expansion | ✓ Shipped |
| Alliance war scheduling (weekly phase machine) | `meta-alliance-war.js` — W-Alliance-War-Scheduling (2026-05-08) | ✓ Shipped; cache-bust 0.39.5 |

### Meta / Monetization
| System | Version/Marker | Status |
|--------|---------------|--------|
| 30+ IAP SKUs ($0.99–$99.99) | `meta-iap.js` | ✓ Stub — production wiring Phase 4 |
| Ad placeholder modals + 50-RV daily cap | `meta-ads.js` | ✓ Stub — AdMob swap Phase 4 |
| Ad-removal (cross-device transferable) | — W-Ad-Removal-Cross-Device | ✓ PATH_A_NON_REPLICATIONS documented |
| Gems currency + whale ladder | `meta-gacha.js`, `meta-shop.js` — W-Monetization-V2-Whale-Ladder | ✓ Sovereign Trove $99.99 |
| Royal Pass subscription $14.99/mo | — W-Monetization-V2-Sub-Blockers | ✓ 2× rewards + +20 energy cap |
| Energy modal + ad-gated refill | — W-Monetization-V2-Energy | ✓ Shipped |
| Daily missions + weekly missions | `meta-missions.js` — W-Monetization-V2-Missions-Pass | ✓ Shipped |
| Battle pass Season 1 (60 levels) | `meta-battle-pass.js` | ✓ Season 1: May 15–Jun 15 2026 |
| Shop modal (5 sections + rate disclosure) | `meta-shop.js` | ✓ Full Apple §3.1.2 + FTC 2024 |
| Gacha (standard pool + locked rift_guests) | `meta-gacha.js` | ✓ Ysabel pool locked until ship |
| Ad-gated buffs (4 types) | `meta-buffs.js` | ✓ Shipped |
| Special abilities + IAP packs | `meta-special-abilities.js` — W-Special-Abilities | ✓ 6 abilities, daily ad cap 5 |
| Compliance (age gate + pre-purchase + gacha disclosure) | `meta-compliance.js` — W-Compliance-Disclosure | ✓ Shipped |
| Pre-purchase confirmation + gacha rate disclosure | — W-Compliance-Disclosure | ✓ BeGambleAware.org + 1-800-GAMBLER |
| Daily reward streak UI (7-day ladder) | `meta-daily-rewards.js` — W-Daily-Reward-Streak-UI | ✓ Shipped |
| Limited-time event system (3 events cataloged) | `meta-ltd-events.js` — W-Event-System-Scaffold | ✓ Events wired; dates hardcoded |
| Achievements (21 catalog entries, event-wired) | `meta-achievements.js` — W-Achievements-UI | ✓ Shipped |
| Onboarding flow (3-screen + character pick) | `meta-onboarding.js` — W-Onboarding-Flow | ✓ Shipped; bridge callout needs browser verify |
| Leaderboard stub (Phase 4 swap-ready) | `meta-leaderboard.js` — W-Leaderboard-Backend-Stub | ✓ Stub; fake data |
| Leaderboard seed data | — W-Leaderboard-Seed-Data | ✓ Shipped |
| QA harness | `js/qa/qa-harness.js` — W-QA-Harness, W-QA-Harness-Mobile-Ext | ✓ Shipped |
| Settings modal wiring | — W-Settings-Modal-Wiring | ✓ Shipped |
| Anonymous account + device-ID | `meta-account.js` | ✓ Stub — email upgrade Phase 4 |
| Analytics reporter | `meta-events.js` | ✓ Stub — server POST Phase 4 |

### Platform + Build
| System | Version/Marker | Status |
|--------|---------------|--------|
| Capacitor iOS shell | — W-Capacitor-iOS-Shell | ✓ Shipped |
| iOS Info.plist CFBundleDisplayName | `ios/App/App/Info.plist` | ✓ "Unlimited Chaos" |
| capacitor.config.json appName | | ✓ "Unlimited Chaos" |
| Privacy policy (HTML) | `privacy.html`, `terms.html` — W-Legal-Pages | ✓ Structurally complete; 6 ARCHITECT FILL markers |
| Gacha rate disclosure in legal | `terms.html` | ✓ Rates match meta-gacha.js exactly |
| RESTORE PURCHASES button | `wg-game.js` settings modal | ✓ Apple §3.1.2 compliant stub |
| Refund disclosure | `wg-game.js` ABOUT section | ✓ Platform-policy language |
| Delete Save flow | `wg-game.js` + `meta-savesync.js` | ✓ wg_compliance_v1 cleared on delete |
| Public app name | index.html, capacitor.config.json | ✓ "Unlimited Chaos" |
| Android strings.xml | — W-Rename-Unlimited-Chaos §I fix | ✓ Updated to "Unlimited Chaos" (per W-Rename audit §I, autonomously fixable item) |

### Art, Audio, ASO
| System | Version/Marker | Status |
|--------|---------------|--------|
| Horror direction research | `docs/HORROR_DIRECTION_v1.md` — W-Horror-Direction-Research | ✓ Shipped |
| Biome illustrations | — W-Biome-Illustrations | ✓ Shipped |
| Menu art pass | — W-Menu-Art-Pass | ✓ Shipped |
| Enemy/boss tile MJ art briefs | `art/` — W-J, W-K | ✓ Briefs shipped |
| Pumpkin sprite | — W-Pumpkin-Sprite | ✓ Shipped |
| Banshee enemy (art + mechanics) | — W-Banshee-Enemy | ✓ Shipped |
| Banner + cosmetic art prep (MJ briefs) | `docs/MJ_BRIEFS_BANNERS.md` etc. — W-Banner-Cosmetic-Art-Prep | ✓ 4 alliance banners + 17 portraits + 2 building skins |
| ASO metadata package | `docs/ASO_PACKAGE_v1.md` — W-ASO-Metadata-Prep | ✓ Title, subtitle options, 8 screenshot briefs, promo video storyboard |
| ASO screenshot recipes | — W-ASO-Screenshot-Recipes | ✓ Shipped |
| Marketing launch pack | — W-Marketing-Launch-Pack | ✓ Email, social, promo video docs |
| Ad SDK lockdown spec | `docs/AD_SDK_LOCKDOWN.md` | ✓ Per BLUEPAPER §0 Rule 5 |

---

## §2 — Architect-Only Blockers (must complete before App Store / Play Store submission)

Items marked ⚡ are single-session work. Items marked 🏗 require external account/credential setup.

### A1 — Legal entity name (6 ARCHITECT FILL markers) ⚡
**Action:** Open `privacy.html` and `terms.html`, search for `[ARCHITECT FILL]` and replace with the legal business entity name (× 2 per file) and jurisdiction (×1 per file).
**Who:** Architect only — legal entity is a business fact.
**Time:** 15 minutes.
**Cost:** $0.
**Unblocks:** Legal pages are publication-ready. App Store review requires a real entity name; a placeholder triggers rejection.

### A2 — App subtitle selection ⚡
**Action:** Select one of the three subtitle options in `docs/ASO_PACKAGE_v1.md §2.2`. Option 1 recommended: `Folk Horror Survival Arena` (26/30 chars). Update the combined keyword field in §5.2 to exclude any subtitle terms that overlap.
**Who:** Architect — tone/brand decision.
**Time:** 5 minutes.
**Cost:** $0.
**Unblocks:** App Store Connect metadata can be filed. Cannot finalize keyword field without confirmed subtitle.

### A3 — Gacha compliance insert in ASO long description ⚡
**Action:** `docs/ASO_PACKAGE_v1.md §4` has a `[GACHA-COMPLIANCE-INSERT]` placeholder (~400–600 chars). Populate with: JP/KR/EU per-market gacha rate disclosures, ESRB descriptors, in-app purchase ceiling disclosure. The compliance disclosure worker (W-Compliance-Disclosure) has the per-language rate tables ready in `terms.html` and `meta-compliance.js`. Paste the English rate block into the ASO description, then add JP/KR market variants per their store guidelines.
**Who:** Architect (or delegated to a future worker with the W-Compliance output as source).
**Time:** 30–60 minutes.
**Cost:** $0.
**Unblocks:** Long description can be submitted to App Store Connect and Play Console without an "incomplete disclosure" rejection.

### A4 — AdMob production credentials 🏗
**Action:** Create or retrieve AdMob App IDs (iOS + Android) and Ad Unit IDs for: banner, interstitial, rewarded video. Enter them in the appropriate config. Per `docs/AD_SDK_LOCKDOWN.md`: use only named Tier-1 SDK (AdMob), disable redirect-and-deep-link at panel level before activating.
**Who:** Architect — requires Google AdMob account.
**Time:** 1–2 hours.
**Cost:** $0 account creation; revenue share (30%) on ad earnings.
**Unblocks:** Real ads replace the placeholder modal in `meta-ads.js`. Phase 4 swap target is already documented in `meta-ads.js`.

### A5 — Apple StoreKit + Google Play Billing wiring 🏗
**Action:** Replace `meta-iap.js purchase()` stub with production StoreKit (iOS) and Google Play Billing (Android) calls via Capacitor plugin. Requires: `@capacitor-community/purchases` or RevenueCat SDK; configured App Store Connect in-app purchase items matching `WG.IAP.SKUS` array; Google Play Console in-app products configured to match.
**Who:** Architect — requires developer accounts + payment enrollment.
**Time:** 1–2 days.
**Cost:** Apple Developer Program $99/yr + Google Play one-time $25.
**Unblocks:** Real purchases. Without this, all IAP returns stub success — fine for TestFlight, not for public launch.

### A6 — iOS code signing + provisioning profile 🏗
**Action:** Create an iOS Distribution certificate + App Store provisioning profile in Apple Developer. Configure in Capacitor / Xcode. Build `.ipa` for App Store upload.
**Who:** Architect — requires Apple Developer account.
**Time:** 2–4 hours (first-time setup).
**Cost:** Covered by A5's $99/yr.
**Unblocks:** TestFlight distribution + App Store submission.

### A7 — Android keystore + signing 🏗
**Action:** Generate Android release keystore; configure `android/app/build.gradle` signing config. Build release `.aab` for Play Console upload.
**Who:** Architect — keystore must be kept permanently (cannot regenerate once published).
**Time:** 1 hour.
**Cost:** Covered by A5's $25 one-time.
**Unblocks:** Google Play distribution.

### A8 — App Store Connect + Play Console app records 🏗
**Action:** Create the app record on App Store Connect (Bundle ID: `com.thehivemakes.wraithgrove`). Create app record on Play Console. Fill metadata using `docs/ASO_PACKAGE_v1.md`. Complete Apple content rating questionnaire (ESRB Teen 13+). Complete Google Play content rating (IARC Teen). Complete Play Store Data Safety form (data collected: device ID; no health/finance data; data shared with ad network).
**Who:** Architect — account holder only.
**Time:** 3–5 hours.
**Cost:** Covered by existing accounts.
**Unblocks:** Submission pipeline opens.

### A9 — ATT pre-prompt (App Tracking Transparency) ⚡
**Action:** Add `NSUserTrackingUsageDescription` to iOS `Info.plist` with a user-facing reason string explaining ad personalization. Wire `AppTrackingTransparency.requestPermission()` call before the first ad show (or at app start). Per Apple policy, apps using AdMob must show ATT prompt before serving personalized ads.
**Who:** Architect (or single worker with access to iOS project).
**Time:** 1 hour.
**Cost:** $0.
**Unblocks:** ATT compliance; Apple rejects apps using advertising identifiers without this.

### A10 — Crash reporting SDK ⚡ (strongly recommended, not App Store hard-required)
**Action:** Add Firebase Crashlytics (free tier) or Sentry (free tier) to the Capacitor project. Wire uncaught exception handlers. Without this, production crashes are invisible.
**Who:** Architect (or single worker).
**Time:** 2–3 hours.
**Cost:** Free tier sufficient for soft launch.
**Unblocks:** Production stability visibility; essential for D1–D7 retention triage.

---

## §3 — Recommended Pre-Launch Test Plan

### T1 — Critical: real-device Hunt loop performance (Stage 18 + Night + Fever)
**Why:** PERFORMANCE_AUDIT §3 identifies Samsung Galaxy A13 (2GB RAM) as high-risk. Stage 18 (7-min run) with Night Mode active + Fever Mode triggered simultaneously creates worst-case frame budget: estimated 8–13ms of pure overhead on A11, potentially dropping below 30fps on low-RAM Android before fixes.
**Test:** Run Stage 18 Night Mode on A13 (or equivalent 2GB Android) until Fever triggers. Measure frame time via `performance.now()` wrapper on `frame()`. Acceptable: ≥30fps sustained. Action threshold: `<25fps average` → apply Performance §4 top-2 fixes before launch.
**Can ship via TestFlight?** Yes for baseline. But AdMob integration (A4) must be tested on real Android device before Play Store submission.

### T2 — Required: Onboarding flow bridge callout position
**Why:** STATE_OF_BUILD.md flags: "bridge callout vertical position (24% bottom) needs browser verification." First-time player flow must not have the callout obscured by keyboard or navigation bar on target devices (iPhone SE, iPhone 15 Pro Max, common Android sizes).
**Test:** Install on iPhone SE (smallest viewport) and verify the pulsing arrow callout is fully visible above the device nav bar.
**Can ship via TestFlight:** Yes — this is a visual check.

### T3 — Required: Progressive Tab Unlock in www/ vs js/ parity
**Why:** AUDIT_v029 §B structural note: Progressive Tab Unlock is implemented only in `www/js/` (Capacitor web root), not in `js/` (local dev root). iOS TestFlight ship from `www/` is functional; local dev at `localhost:3996` will not unlock tabs.
**Test:** Build iOS `.ipa` via `npx cap sync` + Xcode. Install via TestFlight. Play through Stage 0 → Stage 2 → Stage 5 → Stage 8 and verify each tab unlocks with animation + badge.
**Action:** `npx cap sync` is a required build step before any TestFlight submission (regenerates `ios/App/App/public/` from `www/`).

### T4 — Required: IAP sandbox (StoreKit sandbox + Play Billing test track)
**After A5 completion:** Test each of the 5 price-tier IAP categories (coin pack, gem pack, energy refill, Royal Pass subscription, battle pass) in StoreKit sandbox and Play Billing test track. Verify: purchase flow completes → state.currencies updates → receipt validation stub confirms. Verify cancel path: user cancels → no state change.

### T5 — Required: RESTORE PURCHASES flow
**Test:** Purchase `ad_removal` IAP. Delete + reinstall app. Open → Settings → tap RESTORE PURCHASES. Verify `ad_removal` entitlement restores via `restorePurchases()`.

### T6 — Phase 4 server (defer to soft launch)
These systems are fully stubbed and work offline. They are NOT required for TestFlight or initial soft launch:
- Leaderboard (shows cached fake data — acceptable until Phase 4 server)
- Cross-device save sync (each device is standalone — acceptable for soft launch)
- Analytics (blind but not broken — D1 data collection can start post Phase 4)
- Async PvP opponent storage (local generation works — async matchmaking Phase 4)

**Recommendation:** Soft-launch on TestFlight (iOS) with stub monetization (sandbox). Collect retention data via stub analytics. Deploy Phase 4 server backend before public launch.

---

## §4 — Open Polish Gaps (ranked by estimated impact/effort)

Sources: AUDIT_v029, AUDIT_Final_Launch, BALANCE_AUDIT §2–§4, PERFORMANCE_AUDIT §4.

### P1 — LOGIN_BONUS wastes energy for all daily players ★★★★★ (High impact / Low effort)
**Source:** BALANCE_AUDIT FLAG-01. Energy cap 30; any player who slept >7.5h wakes to full cap — the +20 LOGIN_BONUS is silently discarded. The retention lever that should reward the daily habit does nothing.
**Fix:** Change LOGIN_BONUS delivery to 500 coins (not energy). Change STREAK_7_BONUS to 30 💎 (not 50 energy). Two constant changes in `wg-state.js` + one path change in `meta-account.js claimDailyReward`.
**Estimated effort:** 30 minutes, 1 worker.

### P2 — God Window power fantasy erodes by player level 6+ ★★★★☆ (High impact / Low effort)
**Source:** BALANCE_AUDIT FLAG-04. At mid-game levels (6–8), GOD_WINDOW.START_MULT=0.60 still leaves elites at 6–9 hits at second 0 — the intended "invincible opener" is not felt.
**Fix:** Lower `GOD_WINDOW.START_MULT` from 0.60 to 0.40 in `hunt-enemies.js`. One-line change.
**Estimated effort:** 5 minutes.

### P3 — drawStumps per-frame sort allocation (performance, A11 devices) ★★★★☆ (High impact / Low effort)
**Source:** PERFORMANCE_AUDIT §1A — 1380-element sort + allocation every frame; estimated 1–3ms/frame. Worst-case combined overhead (fever + Night + full tree density): 5–13ms on A11, leaving thin margin.
**Fix:** Cache sorted stumps array in `_stagePropsCache`; rebuild only on tree chop via `splice`. See PERFORMANCE_AUDIT §1A for exact patch location (`hunt-render.js:491`).
**Estimated effort:** 1 hour.

### P4 — Tower HP scaling creates F2P wall at floor 7–10 ★★★★☆ (High D3–D14 retention impact / Low effort)
**Source:** BALANCE_AUDIT FLAG-05. HP_MULT_PER_FLOOR=0.18 → floor 10 HP mult 2.62×; F2P new player with starter stats faces a ~55-swing mini-boss on first run, requiring 💎 continues.
**Fix:** Reduce `HP_MULT_PER_FLOOR` from 0.18 to 0.12 in `hunt-tower.js TUNABLES`. Floor 10 drops to 2.08× — achievable in 1–2 runs without continues. Whales retain floor 20+ as benchmark.
**Estimated effort:** 5 minutes.

### P5 — resolveTreeCollisions O(1380) per move frame (performance) ★★★☆☆ (Medium impact / Medium effort)
**Source:** PERFORMANCE_AUDIT §1B — 4140 distance checks per move frame without spatial partition; 0.8–2.5ms on iPhone X.
**Fix:** Build a 64px spatial grid in `getStageProps`; check only 3×3 cell neighborhood (~27 checks vs 1380). See PERFORMANCE_AUDIT §1B for patch location (`hunt-player.js:101`).
**Estimated effort:** 2–3 hours.

### P6 — Stage 6→7 duration cliff: 2.77× jump ★★★☆☆ (High D1–D3 retention / Low effort)
**Source:** BALANCE_AUDIT FLAG-02. Stage 6 = 90s; Stage 7 = 250s — steepest per-stage jump in the game. Correlates with max churn in comparable ARPGs.
**Fix:** Add `bridgeWaveCount = 4` override for stages 4–6 in `hunt-stage.js` (adds 30s to each transition stage). Stage 6→7 jump becomes 2.08× vs current 2.77×.
**Estimated effort:** 30 minutes.

### P7 — Gold Mine L1 cap traps casual players at 8% daily yield ★★★☆☆ (D30 monetization / Low effort)
**Source:** BALANCE_AUDIT FLAG-03. L1 cap = 100 coins (2h buffer); once-daily player loses 92% of production. Building upgrades inaccessible for 120+ days at L1.
**Fix:** Change `capAt()` formula base hours from 2 → 8 in `forge-buildings.js`. L1 cap → 400 coins; L20 unchanged.
**Estimated effort:** 10 minutes.

### P8 — Night overlay gradient allocation per frame ★★☆☆☆ (Medium / Low effort)
**Source:** PERFORMANCE_AUDIT §1C — 4+ `ctx.createRadialGradient()` calls/frame in Night mode; 0.3–1ms/frame.
**Fix:** Cache gradient objects; recreate only on `resize` event. See PERFORMANCE_AUDIT §1C for exact patch (`hunt-render.js:876`).
**Estimated effort:** 30 minutes.

### P9 — Fever shadowBlur compositor cost on old devices ★★★☆☆ (Medium / Medium effort)
**Source:** PERFORMANCE_AUDIT §1D — `ctx.shadowBlur=9` on 30–50 enemies → 2–6ms/frame on iPhone X.
**Fix:** Offscreen canvas approach: render all creatures to `OffscreenCanvas` during fever, apply single CSS `filter: drop-shadow(...)` on composite. See PERFORMANCE_AUDIT §1D.
**Estimated effort:** 2–3 hours.

### P10 — Fever interval orphan on stage exit during fever ★★☆☆☆ (Low / Very low effort)
**Source:** PERFORMANCE_AUDIT §2C — `_feverCountdownInterval` cleared only on `fever:end`; if stage ends during fever, interval keeps firing. One orphan per such run.
**Fix:** Add `hunt:stage-cleared` + `hunt:stage-failed` listeners that call `clearInterval(_feverCountdownInterval)`. Two event wires in `hunt-render.js`.
**Estimated effort:** 10 minutes.

### P11 — Animated portrait WebP generation (Chrome MCP blocked)
**Source:** STATE_OF_BUILD.md — W-Character-Animate-MJ infrastructure shipped; 9 WebP animation slots exist in `images/portraits/anim/` but are empty. MJ Animate generation requires Chrome MCP configured.
**Fix:** When Chrome MCP is available, run MJ Animate on 9 character portraits; encode to WebP via ffmpeg (`-q:v 60 -s 360x480 -r 12`); verify budget ≤333KB each.
**Estimated effort:** 2–4 hours when Chrome MCP available.

### Carried from prior audits (non-blocking, low severity)
- Fragment HP hardcoded (hunt-bosses.js:146) — `fe.hp = 120` should reference `splitFragmentHp` catalog field
- memory_husk split count hardcoded in wg-game.js — should reference `ct.splitType/splitCount`
- MutationObserver not disconnected in `hunt-tutorial-ext.js _buffObs` — harmless post-completion
- flyIcon cancel-guard missing in `meta-daily-rewards.js` — harmless rAF leak on fast nav
- Alliance render two setIntervals (`_bossCountdownTimer`, `_breakCountdownTimer`) not cleared on tab switch — continuous background tick (PERFORMANCE_AUDIT §2F)

---

## §5 — Monetization Audit (Path A end-to-end wire status)

**Path decision:** A — faithful clone (Architect-confirmed). Two deliberate non-replications documented in `docs/PATH_A_NON_REPLICATIONS.md`.

### 5.1 Energy system ✓
- `wg-state.js` ENERGY_TUNABLES: MAX=30, REGEN=15min/unit, STAGE_COST=5, WIN_REFUND=3, LOGIN_BONUS=20, STREAK_7_BONUS=50
- Energy modal: RV watch → +5 energy (daily 50-RV cap, 50/50 for energy)
- Royal Pass: +20 cap (30→50) + +10 daily
- IAP refills: 5 SKUs ($0.99→$19.99)
- **Gap (FLAG-01):** LOGIN_BONUS is wasted for all daily players (energy already full after 7.5h sleep) — see §4 P1

### 5.2 IAP ✓ (stub — production wiring is A5)
- 30+ SKUs fully defined in `meta-iap.js WG.IAP.SKUS`
- 5 coin pack tiers ($0.99–$19.99)
- 6 gem pack tiers ($0.99–$99.99 Sovereign Trove whale gate)
- Starter/weekly/monthly bundles
- Royal Pass $14.99/mo
- Battle Pass $9.99/season
- 5 energy refill SKUs
- 6 ability packs ($1.99–$4.99)
- `ad_removal` $4.99 (cross-device transferable)
- Whale gate `mega_bundle` $99.99 — intact, not softened
- Pre-purchase confirmation modal (W-Compliance-Disclosure): every purchase calls `WG.Compliance.confirmPurchase(sku)` before StoreKit/Play Billing

### 5.3 Ad-gated buffs ✓ (stub — AdMob swap is A4)
- `meta-buffs.js BUFFS`: damage_x2 (60s), wood_x2 (90s), instant_turret, revive
- `meta-ads.js`: placeholder rewarded video modal; daily 50-RV cap enforced
- `meta-special-abilities.js`: 6 abilities × daily ad-charge cap 5/ability
- Ad-removal entitlement bypasses the ad modal via `WG.Ads.isAdFreeActive()` → emits `ad:rewarded`

### 5.4 Battle pass ✓
- Season 1 "Whispering Pines" — 60 levels × 100XP
- Free track: 20 milestones. Premium track: every level
- XP sources wired: mission claim (+50/+200), stage clear (+20), tower floor (+5), boss (+100)
- Premium entitlement: `WG.IAP.purchase('battle_pass_s1')` — stub; needs StoreKit/Play Billing (A5)
- Season 1 start date: 2026-05-15

### 5.5 Gacha ✓
- Standard pool: 30💎 ×1 / 270💎 ×10
- Pity system: mythic@100, legendary@30; counters in state, persisted
- Rates disclosed in-UI via `<details>` rate table + full disclosure in `terms.html` + compliance modal
- rift_guests pool: LOCKED (`locked:true, catalog:[]`) — Ysabel withheld until ship
- Age gate: `WG.Compliance.checkAgeGate()` before first pull

### 5.6 Alliance shop ✓
- `meta-alliance.js SPEND_POOL`: 4 perk types (slot expand, energy regen, raid rewards, banner cosmetic)
- Earn rates wired for: raids, login, gifts, missions, boss tiers, war win
- Alliance boss economy wired (FLAG-08 gap: boss non-viable for small alliances — architectural gap, not missing wire)

### 5.7 Monetization gaps
| Gap | Type | Severity |
|-----|------|----------|
| StoreKit/Play Billing production wiring | Stub (A5) | Blocks public launch |
| AdMob production IDs | Stub (A4) | Blocks public launch |
| Alliance boss non-viable for <15 active members | Balance gap (FLAG-08) | Medium |
| Night mode has no XP/coin bonus to offset 1.4× stat difficulty | Balance gap (FLAG-06) | Medium |
| Energy overflow architecture — bonuses silently discarded | Architectural gap (G1) | High |

---

## §6 — Legal Posture

### 6.1 Privacy policy (privacy.html)
- **Status:** Structurally complete. W-Legal-Pages (worker: Etch) shipped full GDPR/CCPA/COPPA/PIPL treatment.
- **Content:** Data collection (device ID, ad identifiers); SDK table (AdMob, Cloudflare, Apple/Google payment); 8 GDPR rights; CCPA opt-out; COPPA (no <13 collection); data retention; contact email (privacy@thehivemakes.com)
- **Missing (ARCHITECT FILL × 3):** Legal entity name (×2), jurisdiction
- **Can publish as-is?** No — entity name placeholder triggers App Store review rejection.

### 6.2 Terms of service (terms.html)
- **Status:** Structurally complete.
- **Content:** Subscription auto-renewal per Apple §3.1.2 + FTC 2024; gacha rates verbatim (Common 65%, Rare 25%, Legendary 9%, Mythic 1%; pity@30/100); refund policy per platform; whale gate $99.99 disclosed; ESRB descriptors listed.
- **Missing (ARCHITECT FILL × 3):** Legal entity name (×2), jurisdiction
- **Gacha rates match code:** Verified against `meta-gacha.js:26–27` in AUDIT_Final_Launch §H.

### 6.3 Compliance module (meta-compliance.js)
- **Status:** Shipped (W-Compliance-Disclosure)
- Pre-purchase confirmation modal: wired to every `purchase()` call
- Age gate (13+): shown before first gacha pull; persisted to `wg_compliance_v1`
- Gacha disclosure: auto-shown on first summon + accessible via "?" icon
- Refund disclosure: in settings ABOUT section
- `wg_compliance_v1` (separate localStorage key) never resets on save-delete

### 6.4 App Store / Play Store compliance checklist
| Item | Status |
|------|--------|
| Gacha rates disclosed in-app | ✓ Compliance modal + terms.html |
| Gacha rates in store listing | Pending — gacha compliance insert (A3) |
| Subscription auto-renew disclosure | ✓ Shop modal + terms.html |
| COPPA / child-directed declaration | ✓ Privacy.html + Play Data Safety form needed (A8) |
| RESTORE PURCHASES button | ✓ Wired in settings modal |
| Age rating (13+ / Teen) | ✓ Content designed for ESRB Teen; questionnaire fills (A8) |
| ATT pre-prompt (iOS) | ✗ Not yet added — blocker A9 |
| Data Safety form (Play) | ✗ Not yet filed — part of A8 |
| In-App Purchases badge | ✓ Automatic from Apple/Google; no action needed |
| PATH_A_NON_REPLICATIONS documented | ✓ docs/PATH_A_NON_REPLICATIONS.md |
| Ad SDK redirect lockdown spec | ✓ docs/AD_SDK_LOCKDOWN.md |

### 6.5 Privacy nutrition label (docs/PRIVACY_NUTRITION.md)
- **Status:** Shipped (W-Privacy-Nutrition or equivalent)
- Apple requires filling the App Privacy section in App Store Connect at submission time (A8 action)

---

## Summary Findings Count

| Category | Count |
|----------|-------|
| Code-complete systems (shipped workers) | 108 |
| Architect-only blockers (§2) | 10 |
| Polish gaps (§4) | 11 + 5 carried |
| Monetization wire gaps (§5.7) | 5 |
| Legal placeholder items (§6) | 6 ARCHITECT FILL |
| **Total findings** | **145** |

---

*Filed by W-Prelaunch-Readiness, 2026-05-08. Read-only — zero code edits.*
