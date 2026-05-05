# STATE_OF_BUILD.md — Wraithgrove

**Last updated:** 2026-05-05 by W-Onboarding-Flow
**Server:** http://localhost:3996/ via `wraithgrove` launch.json entry
**Path decision:** A — faithful clone (Architect-confirmed)

---

## What's on disk + verified working

### Onboarding Flow (W-Onboarding-Flow 2026-05-05)
- **First-launch gate** — `WG.State.get().firstLaunch` (default `true`; `wg-cache.js` sets to `false` for existing saves). `WG.Onboarding.maybeShow()` called after `showHuntStageList()` in init; fires overlay only on first install.
- **3-screen overlay** — Screen 1: "WRAITHGROVE" / "Where the boundary tears." — 2s fade-in, auto-advances (or tap). Screen 2: 4 lore lines staggered, TAP TO CONTINUE. Screen 3: 3 starter character cards (lantern_acolyte, sigil_student, horned_oni). Tap picks, unlocks free, sets active, flashes "WELCOME, [NAME]".
- **Bridge callout** — After pick, pulsing arrow hint at ~24% bottom of `#app` → "Tap BATTLE to begin Stage 1". Dismisses on `hunt:stage-start` or 8s auto.
- **Re-entry guard** — `WG.State.get().firstLaunchStep` (0–4) persisted via `WG.Cache`. Cold-load resumes at saved step.
- **Skip intro** — "SKIP INTRO" button on screens 1+2; skips to character pick; logs `onboarding:skip` to `WG.Events`.
- `meta-onboarding.js` — `WG.Onboarding`: `init()`, `maybeShow()`. All styles self-contained with `wg-ob-` prefix.
- `wg-state.js` — `firstLaunch: true`, `firstLaunchStep: 0` added to state defaults.
- `wg-cache.js` — `load()` restores both fields; `firstLaunch` defaults to `false` if absent from existing saves.
- `wg-game.js` — `Onboarding.init()` in init chain (after `HuntTutorial.init()`); `Onboarding.maybeShow()` after `showHuntStageList()`.
- `index.html` — `meta-onboarding.js` added to module loader (after `meta-battle-pass.js`).
- `hunt-tutorial.js` — **unchanged**. Inline hints still fire via `HuntTutorial.maybeStart()` once Stage 1 starts.
- **Smoke test checklist:** `WORKER_OUTPUT/w-onboarding-flow/READY_FOR_AUDIT.md`. One open flag: bridge callout vertical position (24% bottom) needs browser verification.



### Top-level
- `index.html` — boot scaffold + sequential script loader + canvas + tab navigation + top currency strip + boot overlay
- `CLAUDE.md` — project protocol (this file's sibling)
- `BUILD_PLAN.md` — phase queue (worker tasks)
- `STATE_OF_BUILD.md` — this file

### Missions + Battle Pass (W-Monetization-V2-Missions-Pass 2026-05-05)
- **Daily missions** — 13-mission catalog; 5 picked deterministically per day (date+userId seed). Progress tracked per session + persisted. Claim button grants reward + +50 BP XP. TASKS side icon → live modal.
- **Weekly missions** — 5-mission catalog; resets Monday 00:00 local. Claim grants reward + +200 BP XP.
- **Missions modal** — DAILY/WEEKLY tab pills, progress bars, CLAIM buttons, countdown footer. Accessible from 📋 TASKS side icon in Hunt lobby.
- **Battle Pass — Season 1 "Whispering Pines"** — 60 levels × 100 XP/level. Free track: 20 milestones every 3rd level. Premium track: reward every level. XP sources: mission claim (+50/+200), stage clear (+20), tower floor (+5), boss defeated (+100).
- `meta-missions.js` — WG.Missions: catalog, tracker, modal, event dispatcher hub.
- `meta-battle-pass.js` — WG.BattlePass: season engine, addXP, claimFree/claimPremium, modal with 60-cell grid.
- `meta-iap.js` — `battle_pass_s1` SKU added ($9.99 entitlement, grants `battlePassPremium: 'wraithgrove_s1'`).
- `duel-match.js` — emits `duel:match-result { won }` from resolve() for mission wiring.
- State: `WG.State.get().missions` and `WG.State.get().battlePass` — initialized lazily by ensureState().
- **Premium SKU stub** — `WG.IAP.purchase('battle_pass_s1')` falls through to dev stub on browser preview; production needs StoreKit/Play Billing (Phase 4).
- Battle pass not yet started (startDate 2026-05-15) — modal shows correct countdown. Season 1 runs May 15 – Jun 15 2026.

### Tower Gauntlet (W-Tower-Gauntlet 2026-05-05)
- **Mode #2** — infinite-scaling roguelite alongside Hunt. Entry: 5 energy. GAUNTLET button below BATTLE in stage select.
- `hunt-tower-buffs.js` — 24 buff cards (Common/Rare/Legendary). Weighted roll without replacement. `apply(buffId, rt)` mutates runtime fields. Same buff × 2 → upgrade variant applied.
- `hunt-tower.js` — full Tower module: `startTower()`, `tickFloor(dt)`, floor scaling (HP ×1.18/floor, damage ×1.10, speed ×1.04 capped at 1.6×), spawner with 5 enemy bands unlocking at floors 1/4/8/13/18, mini-boss at 70% of floor time, 3-card buff picker between floors, milestone chest every 5 floors, death screen + 2 gem-paid continues, run summary with leaderboard stub.
- `wg-state.js` — `towerProgress.peakFloor` added (persists personal best across runs).
- `wg-game.js` — `startTowerRun()` (energy gate → spend → build → setRuntime → in-stage), rAF branch on `huntRuntime.mode === 'tower'`, `HuntTowerBuffs.init()` + `HuntTower.init()` in init chain, `exitHunt` tower overlay cleanup, `startTowerRun` exported.
- Leaderboard in run summary: **stub data only** — TODO Phase 4 server sync.

### Rift mechanic (W-Rift-Mechanic-Plumbing 2026-05-02)
- `state.rift.sigils` — cumulative counter; `floor(sigils/3)` = unlocked guest slots.
- Drop path: `wg-game.js finishHunt` → `WG.HuntPickups.rollSigilDrop` → state grant + `rift:sigil-found` event.
- Drop rates: Wraith Father (stage 18) always 1 on clear; 1% per eldritch stage clear.
- `rift_sigil` catalog entry: legendary, `equippable:false` — cannot be slotted as combat relic.
- Ascend tab: "RIFT GUESTS" collapsible section. Slot stays ??? — no guest announced.

### Core (`js/core/` — 7 modules)
- `wg-engine.js` — event bus + tick driver
- `wg-state.js` — global state schema, Power recompute, currency grant/spend
- `wg-display.js` — display shim (resize hook)
- `wg-input.js` — virtual joystick + WASD fallback + skill trigger
- `wg-render.js` — particle system, HP bars, float text, clear utilities
- `wg-cache.js` — localStorage save/load + dirty-flag autosave (3s throttle)
- `wg-audio.js` — Web Audio engine; biome ambient + 13 sfx + 6 ui events; fail-silent on missing files; mute/volume API persisted to `localStorage.wg_audio_v1`. **Wired + sourced** (W-Audio-Sourcing 2026-05-01) — 25 mp3s on disk, 6.6 MB total, all CC0/synthesized.

### Whale Ladder + Royal Pass + Gacha + Shop (W-Monetization-V2-Whale-Ladder 2026-05-05)
- **SKU ladder** — 7 gem packs ($0.99→$99.99) + starter/weekly/monthly bundles + royal_pass_monthly $14.99. Sovereign Trove $99.99 is the whale gate.
- **Gems currency** — `state.currencies.gems`; purple 💎 chip in top strip; tap → Shop (Gem Packs section). Synced via `syncTopStrip()`.
- **Royal Pass** — `state.subscriptions.royalPass`; on activation: energy.max +20 (30→50), 2× stage-clear rewards, +10 daily energy on `daily:reset`. `isRoyalPassActive()` exported from WG.State.
- **Gacha** — `meta-gacha.js` (WG.Gacha): standard pool (30💎 ×1 / 270💎 ×10) with pity (mythic@100, legendary@30). rift_guests pool LOCKED, empty catalog — Ysabel withheld until KingshotPro ships. Pity counters in `state.gacha.pity` (persisted). Rates disclosed via `getRates()`.
- **Shop modal** — `meta-shop.js` (WG.Shop): 5 sections (Gem Packs / Bundles / Royal Pass / Summon / Offers). Entry: gems chip + SHOP side icon in Hunt lobby. Royal Pass landing: benefit comparison + full subscription disclosure per Apple §3.1.2 + FTC 2024. Summon: pull ×1/×10, rate disclosure `<details>`, pity display, locked rift_guests pool.
- **VIP flex** — Royal purple portrait frame in Ascend, 👑 ROYAL badge in Duel rank row, "👑 ROYAL PASS · 2× REWARDS" banner in Hunt results when multiplier active.

### Leaderboard (W-Leaderboard-Backend-Stub 2026-05-05)
- **Contract doc** — `docs/LEADERBOARD_API.md`: 4 endpoints (submit / top / me / around/:userId), auth shape, anti-cheat validation, rate limits, Phase 4 integration notes.
- **`meta-leaderboard.js`** — `WG.MetaLeaderboard`: `submit(peakFloor, runDuration, charactersUsed)` / `top(limit)` / `meAndAround()`. All stubs: log "Phase 4 server swap", return cached fake data. Real fetch paths written and fail-gracefully. Activates when `WG.Config.SERVER_BASE_URL` is set.
- **Tower run summary** — `hunt-tower.js#showRunSummary`: leaderboard section now calls `WG.MetaLeaderboard.meAndAround()` async, fills rows on resolve, hides on reject (graceful degradation). Removed hard-coded fake array.
- **Submit hook** — `hunt-tower.js#endRun`: calls `WG.MetaLeaderboard.submit(rt.floor, rt.totalElapsed, [skinId])` on every run end (death or exit), before summary overlay.
- `WG.Config` initialized as `{}` if absent (safe default in stub mode, swapped for real config in Phase 4).

### Meta (`js/meta/` — 9 modules)
- `meta-iap.js` — 30+ IAP SKUs ($0.99 to $99.99); gem packs, bundles, Royal Pass, energy refills. `isAvailable()` + `bundleResetIn()` for timed gating. **STUB** — production needs Apple StoreKit + Google Play Billing wiring.
- `meta-ads.js` — rewarded video + interstitial placeholder modals; daily 50-RV cap; ad-removal entitlement check. **STUB** — production needs AdMob via Capacitor plugin.
- `meta-gacha.js` — WG.Gacha: standard pool (open) + rift_guests pool (locked/empty). pull() / pullTiered() / getRates() / getPityDisplay(). Pity in state.
- `meta-shop.js` — WG.Shop: fullscreen Shop modal. 5 sections. Royal Pass landing with legal disclosure. Gacha pull UI with rate disclosure.
- `meta-account.js` — anonymous device-ID; optional email upgrade stub. **STUB** — production needs server endpoint.
- `meta-leaderboard.js` — WG.MetaLeaderboard: submit + top + meAndAround. **STUB** — Phase 4 server swap via `WG.Config.SERVER_BASE_URL`.
- `meta-events.js` — analytics event reporter. **STUB** — production needs server POST.
- `meta-missions.js` — daily + weekly missions catalog, tracker, UI, event dispatcher.
- `meta-battle-pass.js` — season battle pass engine + 60-level grid UI.

### Hunt (`js/hunt/` — 9 modules)
- `hunt-stage.js` — 18 stages × 6 biomes (forest_summer / cold_stone / forest_autumn / temple / cave / eldritch). Each stage: id, name, biome, durationSec, enemyMix, bossId, weaponPickups list.
- `hunt-weapons.js` — 14 weapons (1 starter + 9 in-stage pickups + 2 ranged-slot + 3 pet-slot). Each: range, cooldown, damage, power.
- `hunt-enemies.js` — 5 enemy types (lurker, walker, sprite, brute_small, caller) with target-priority AI, contact damage, ranged caller projectiles.
- `hunt-bosses.js` — 6 bosses with distinct attack patterns (summon, shards, area, charge, contact). Names: pale_bride / frozen_crone / autumn_lord / temple_warden / cave_mother / wraith_father.
- `hunt-waves.js` — wave manager: spawn-rate ramp curve + boss spawn at 100%. **Night Mode multipliers** (W-DayNight-And-Torch 2026-05-01): `runtime.mode === 'night'` → spawn rate × `NIGHT_SPAWN_MUL` (1.6) and enemy + boss hp/maxHp/damage × `NIGHT_STAT_MUL` (1.4) at spawn-time. Day Mode is the existing baseline (mul=1).
- `hunt-player.js` — auto-attack on cooldown ring, ranged + pet companion, level-up XP, in-stage skill, pickup magnet, level-up boon draft. cd/dmg/speed boons apply via `cooldownMul`, `bonusDmg`, `speedBonus`. **Torch system** (W-DayNight-And-Torch 2026-05-01): `player.torchAmount` (init 1.0) and `player.torchDecay` (0.012/s). `tickTorch(dt)` runs only when `runtime.mode === 'night'`; instant 1.0 reset inside any built campfire's `TORCH_RELIGHT_R` (100-unit) radius, otherwise linear decay. Stump-chop has `TORCH_DROP_CHANCE` (20%) replacement of second coin with a `'torch'` field drop in Night Mode; pickup sets torch to 1.0 + emits `pickup:torch`.
- `hunt-results.js` — end-of-stage modal with NEXT/RETRY/+2× ad button.
- `hunt-render.js` — top-down camera follow, tile draw, sprites, level-up draft modal, HUD, particle hooks. **basic tile decoration only** — no biome-specific decoration sprites yet. HUD counter pulse on wood/gold/XP increments (DOPAMINE_DESIGN §1+§2). **Night Mode overlay** (W-DayNight-And-Torch 2026-05-01): `drawNightOverlay()` paints a screen-space indigo gradient with corner vignette modulated by `1 - torchAmount` (cubic in/out ease, not stair-step), then carves player + every-built-campfire light holes via `destination-out` radial gradients. Constants: `NIGHT_OVERLAY_TOP/_MID`, `NIGHT_MAX_ALPHA` (0.93), `NIGHT_PLAYER_LIGHT_R` (80), `NIGHT_CAMPFIRE_LIGHT_R` (140), two-frequency flicker on both. `drawDrops` `'torch'` case renders a flickering orange flame on a stick with warm-glow ring (per-drop `_flickerSeed`).
- `hunt-fxnumbers.js` — floating-number FX layer (DOPAMINE_DESIGN §1, P0). World-anchored spawns wired to stump:hit/chopped, enemy:killed, boss:damaged, player:level, pickup:coin, relic:fragment-pickup. Easing: opacity easeOutQuad + scale 1→1.15→0.95.

### Ascend (`js/ascend/` — 5 modules)
- `ascend-character.js` — level-up + 7-tier ascension + Cultivate diamond-spend
- `ascend-skins.js` — 8 skins (LV.1 starter to mythic +1800 PWR). Path-A power-relevant scaling.
- `ascend-equipment.js` — 3-slot Melee/Ranged/Pet with unlock costs (360 / 1100 coins).
- `ascend-stats.js` — 5 upgradable stats (Attack / HP Max / Defense / Crit / Gather).
- `ascend-render.js` — DOM UI: portrait, skin picker modal, weapon picker per slot, stat upgrade rows, total Power.

### Forge (`js/forge/` — 4 modules)
- `forge-buildings.js` — 8-slot grid (Cave/Forge/Campfire unlocked + 5 locked). Idle coin generator tick. **GS-gated unlocks** (W-Buildings-Tab-UI 2026-05-01): `DEFS[*].unlockGS` thresholds (500/1500/3000/6000/10000); `tryUnlockByDiamonds` (200💎 bypass) and async `tryUnlockByAd` (rewarded-video unlock via `WG.Ads.showRewardedVideo`).
- `forge-craft.js` — 10-craft batch with RNG drop table + daily crafting cap. **Tuned to spec baseline** (W-Buildings-Tab-UI 2026-05-01): Forge Lv.1 odds = 70 / 22 / 6 / 1.8 / 0.2 (Common/Rare/Epic/Legendary/Mythic); each Forge level shifts ~2.5% from Common into higher tiers.
- `forge-daily.js` — 24-hour daily chest with **7-day streak tracker** (W-Buildings-Tab-UI 2026-05-01): `STREAK_REWARDS[7]` ladder, `STREAK_GRACE_MS = 48h` (skip threshold), day 7 hands out a guaranteed Rare relic.
- `forge-render.js` — DOM UI: diorama canvas (~30vh, procedural cave + pagoda + animated campfire with two-frequency flicker), Power readout in red/orange, 7-day streak pip strip, 8-slot building grid (4×2), building detail modal with 5-row upgrade ladder, polished crafting modal with Craft × 10 + ⓘ Probability Info + material display, locked-slot unlock-flow modal (GS gate + Watch Ad + 200💎 bypass + Cancel), reward count-up animation (rAF, 700ms ease-out cubic), tap scale-bounce on every button. **DOM-based throughout** — diorama canvas is decorative only.

### Relics (`js/relics/` — 4 modules)
- `relics-catalog.js` — 48 original relics × 5 rarity tiers (Common 12, Rare 12, Epic 12, Legendary 8, Mythic 4). Stat + value + icon.
- `relics-collection.js` — owned-list aggregation + equipped-relic stat bonus computation.
- `relics-equip.js` — max-6 active relics with equip/unequip and aggregate-bonus refresh.
- `relics-render.js` — rarity tab strip + grid + equipped count + stat-bonus summary + Forge CTA.

### Duel (`js/duel/` — 4 modules)
- `duel-roster.js` — opponent generator with Power-matching ±20%.
- `duel-rank.js` — 7 ranked tiers with point thresholds + RP delta calc.
- `duel-match.js` — async match resolver + reward grant + daily quota.
- `duel-render.js` — DOM UI: rank icon, Power+Duels readout, FIND OPPONENT, match modal, result modal, ranked ladder.

### Orchestrator
- `wg-game.js` — init order across all 38 modules, rAF loop, Hunt runtime construction, Tower Gauntlet entry (`startTowerRun`), rAF mode branch (`mode === 'tower'`), tab switching, top-strip currency sync, Hunt stage select + GAUNTLET button.

---

## What's stubbed but planned

| Item | Module | Plan |
|---|---|---|
| Real IAP (Apple StoreKit + Google Play Billing) | `meta-iap.js` | Phase 4 native wrap |
| Real ad SDK (AdMob via Capacitor) | `meta-ads.js` | Phase 4 + §0 Rule 5 SDK lockdown |
| Server endpoints (Cloudflare Worker) | `meta-account.js`, `meta-events.js`, `meta-leaderboard.js` | Phase 4 |
| Cross-device save sync | `wg-cache.js` | Phase 4 server endpoint |
| Async PvP server-side opponent storage | `duel-match.js` | Phase 4 |
| `applyLevelChoice` cooldown plumbing | `hunt-player.js` | ✓ Fixed 2026-04-27 (Worker D) |

---

## What's NOT yet on disk

| Feature | Worker | Notes |
|---|---|---|
| In-stage ad-gated weapon pickups (the visible Wood-Siege-faithful mechanic) | W-Hunt-Pickups | needs new file `hunt-pickups.js` |
| Biome-specific tile decoration | W-Tile-Deco | edits `hunt-render.js` only |
| First-play tutorial overlay (Stage 1) | W-Tutorial | needs new file `hunt-tutorial.js` |
| Stage select panel re-show on hunt exit | W-Hunt-NavFix | small `wg-game.js` patch |
| Level-up draft modal: lock options once shown | W-Hunt-NavFix | tied to Hunt nav fix |
| Boss-specific arena visuals (each boss has distinct sprite/aura) | W-Boss-Visuals | extends `hunt-bosses.js` + `hunt-render.js` |
| Capacitor 5+ native wrap | W-Capacitor-Init | new top-level `capacitor.config.ts` + iOS/Android shells |
| Native splash + icon assets | W-Capacitor-Init | depends on art pipeline |
| Midjourney art for characters/enemies/bosses | W-Art-Pipeline | replaces geometric placeholders |
| Replace placeholder synthesized ambients with field recordings | W-Audio-Ambient-v2 | 6 biome beds at `audio/ambient/*.mp3` are ffmpeg-synthesized; swap for Sonniss/Freesound CC0 nature loops when network access allows |
| Privacy policy + Terms of Service URLs | W-Legal | hosted page; referenced from app |
| ASO keyword volume confirmation | W-Marketing | ASOTools / MobileAction free-tier |

---

## Verified behaviors (browser smoke test 2026-04-27)

- Boot screen → tap-to-begin transitions to main UI
- All 5 tabs render and switch via bottom nav
- Top currency strip persists across tabs
- Hunt Stage 1 (Lantern Vigil) launches; player visible at center; auto-attack ring fires; enemies spawn from edges; combat works; XP triggers level-up boon draft
- Player took contact damage 100→90→80 HP confirming enemy contact damage path
- Ascend tab: portrait, level-up button, ascend button, cultivate button, 3 equipment slots, 5 stats, Power summary (76 with starter loadout)
- Forge tab: diorama canvas with procedural buildings, Power readout in red/orange (default-state Power = 208 with new building formula), 7-day streak pip strip + chest claim, 8-slot building grid (3 unlocked + 5 GS-locked), anvil station with Craft × 10 + ⓘ Odds → polished crafting modal, locked-slot tap → unlock-flow modal (Watch Ad + 200💎 bypass + GS gate readout)
- Relics tab: 5 rarity filter tabs, Rare grid (all undiscovered), Forge CTA
- Duel tab: Bronze rank, 0/5 daily duels, FIND OPPONENT button, full ranked ladder
- **`runtime.mode`** (W-DayNight-And-Torch 2026-05-01): `'day'` or `'night'`, set in `wg-game.js#buildHuntRuntime()` from the lobby Battle-tab card tap, fixed for the duration of the stage. Day = existing baseline. Night = `NIGHT_SPAWN_MUL` (1.6) × spawn rate, `NIGHT_STAT_MUL` (1.4) × hp/dmg, plus the night overlay + torch system below.
- **Torch (Night Mode only)** (W-DayNight-And-Torch 2026-05-01): `player.torchAmount` initialized 1.0; `tickTorch(dt)` decays linearly at 0.012/s (~83s full burn) when player is outside any built campfire's 100-unit relight radius. Inside the radius → instant reset to 1.0. Field-dropped Torch items (20% replacement of second coin per chopped tree in Night Mode) reset on pickup. Visual: cubic-eased dark indigo overlay with carved player (80-unit) and campfire (140-unit) light holes, two-frequency flicker on both. Verified live in browser: bright @ torch=1.0, dark with glowing player + campfire holes @ torch=0.0, mode-guard intact (Day Mode @ torch=0 still bright).

---

## Known issues to clean up

*(none — Worker D cleared all three Hunt nav/boon bugs 2026-04-27)*

---

## Reference: file count

- 42 JS modules + 1 index.html = 43 files
- ~4,500 lines of vanilla JS
- 0 frameworks
- 0 third-party SDKs
- 0 network calls (all client-side localStorage in v1.0)
