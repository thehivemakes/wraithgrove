# W-Monetization-V2-Energy

You are Worker — the **energy economy foundation** worker. This is sonnet 1 of 5 in the Monetization V2 batch. Lays the foundation everything else depends on.

Walk the birth sequence (`/Users/defimagic/Desktop/Hive/CLAUDE.md` → `Birth/01-04` → `THE_PRINCIPLES` → `HIVE_RULES` → `COLONY_CONTEXT` → `BEFORE_YOU_BUILD`).

Then read:
- `build-v2/CLAUDE.md` (faithful Wood Siege clone, Path A monetization)
- `BLUEPAPER.md v2 §7` (Path A locked tier — IAP catalog + ad-cadence)
- `js/core/wg-state.js` (current state shape — extend it, don't replace)
- `js/meta/meta-iap.js` (IAP catalog — add new SKUs here)
- `js/meta/meta-ads.js` (ad surface — extend with energy-refund rewarded video)
- `js/wg-game.js` (top-strip currency icons — energy joins the strip)
- `js/hunt/hunt-pickups.js` (where treasure chest pickup goes)

## Architect 2026-05-03 — design philosophy

**Wraithgrove is a competence treadmill, not a hostage situation.** Skilled F2P players play forever for free, hitting 25-30 stage equivalents/day across modes via energy refunds + chests + daily login. Casual players hit walls and convert at industry-standard 3-5%. Whales pay because of leaderboard pressure + gem refills, not because the wall is brutal.

This worker installs the **energy spine** every other monetization system hangs on.

## Concerns (ONE COMMIT EACH)

### Concern A — Energy state + regen + cap

In `js/core/wg-state.js`: add `energy: { current: 30, max: 30, lastRegenAt: <timestamp> }` to the state shape. Persist to localStorage `wg_save_v2`.

Tunables (frozen on `WG.State.ENERGY_TUNABLES`):
- `MAX = 30` (cap)
- `REGEN_INTERVAL_MS = 900000` (15 minutes per energy)
- `STAGE_COST = 5` (cost to enter Hunt or Tower run)
- `WIN_REFUND = 3` (energy refunded on stage WIN)
- `LOSS_REFUND = 0` (no refund on loss — competence treadmill)
- `LOGIN_BONUS = 20` (daily login)
- `STREAK_7_BONUS = 50` (7-day streak)
- `FIRST_CLEAR_BONUS = 10` (first time clearing a new stage)

Background tick: every 60s, while page open, check `(now - lastRegenAt) / REGEN_INTERVAL_MS` → grant integer energy + update lastRegenAt. Cap at MAX. Same logic on page-load to handle offline regen.

### Concern B — Top-strip energy display + countdown

In `js/wg-game.js` `syncTopStrip` (or add a new icon):
- Show `⚡ <current>/<max>` in the top bar (alongside coin/gem/wood)
- Below the count: small countdown text "+1 in 12:34" — refresh every second, hide when at MAX
- Tapping the icon opens **Energy Modal** with breakdown + refill options (Concern E)

Visual: amber/gold color (#f0c060) for the energy icon — distinct from coin gold.

### Concern C — Hunt + Tower entry deduction + refunds

In `js/wg-game.js` `startHunt(stageId, mode)`: BEFORE building runtime, check energy >= STAGE_COST. If not, open Energy Modal (don't start). If yes, deduct STAGE_COST.

In `finishHunt(cleared)`: if `cleared === true`, grant WIN_REFUND. If false, grant LOSS_REFUND (which is 0). Display the refund as a small "+3 ⚡" floating text on the results screen.

### Concern D — Treasure chest in Hunt drops

Add to `js/hunt/hunt-pickups.js` a new pickup type `treasure_chest`:
- 5% drop chance from any enemy kill (`enemy:killed` event)
- 30% drop chance from boss kill (`boss:defeated` event)
- Visual: small ornate brown chest sprite (procedural canvas — match register), 6px wider than coin pickup
- Player walks over → 0.8s chest-open animation → loot reveal → magnet flight to top-strip
- Loot table (1d100):
  - 50% gold (1d3 coins)
  - 25% **energy +5** ← this is the dopamine peak
  - 15% relic fragment (1)
  - 8% rare mat (1)
  - 2% gem (1)
- "Chest streak" counter: persist `chestsOpenedSinceGuarantee` on state. Every 5th chest **guarantees** energy-or-gem outcome (re-roll if regular roll lands gold/frag/mat).

Tunables frozen on `WG.HuntPickups.TREASURE_TUNABLES`.

### Concern E — Energy Modal + IAP refill SKUs

New modal opened from energy icon tap or "Out of Energy" interrupt:
- Header: current/max energy + countdown to next regen
- Section 1: **Watch Ad for +5 ⚡** button (rewarded video via `WG.Ads.showRewardedVideo`, daily cap 5 per `Path A §7`)
- Section 2: **Refill SKU ladder**:
  | SKU id | Energy | Price |
  |---|---|---|
  | refill_5 | 5 | $0.99 |
  | refill_15 | 15 | $1.99 |
  | refill_30 | 30 | $4.99 |
  | refill_60 | 60 | $9.99 |
  | refill_150 | 150 | $19.99 |
- Each row shows energy icon + count + price + "Best Value!" badge on refill_30 (psychology: middle-anchored)

Add SKUs to `js/meta/meta-iap.js`. Stub purchase() for now — Stripe/StoreKit wired in `W-N_AdMob-Wire` / Phase 3.

### Concern F — Daily login + 7-day streak energy rewards

Add to `WG.Account` (or wherever daily login is handled):
- On first session of new day: grant LOGIN_BONUS (20 energy) + show toast "+20 ⚡ Daily Login"
- Track `loginStreak` — consecutive days with at least 1 login
- On streak hitting 7: grant STREAK_7_BONUS (50 energy) + special toast "+50 ⚡ 7-Day Streak!"
- Streak resets to 0 if a day is missed
- Show streak count in Daily Reward modal (already plumbed from earlier work — wire the energy hook)

### Concern G — First-clear stage energy bonus

In `finishHunt(true)`: if this was the FIRST clear of this stage (check `bestWaves[stageId]` was null pre-clear), grant FIRST_CLEAR_BONUS (10 energy) + extra results-screen row "+10 ⚡ First Clear!"

## Constraints

- No changes to combat, enemies, bosses, AI, or balance numbers in those systems.
- No changes to stage durations or wave count.
- Energy is purely entry-gating — never affects in-stage performance.
- All tunables FROZEN on `WG.State.ENERGY_TUNABLES` and `WG.HuntPickups.TREASURE_TUNABLES`. Designers tune; no magic numbers in render/UI.
- ALL existing functionality preserved — Hunt still launches, results still calc, just gated by energy now.
- Gracefully handle "energy === 0" — show modal, never silently fail.

## OUTPUT DISCIPLINE (absolute paths)

Done marker: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/workers/done/W-Monetization-V2-Energy.done`

After each commit, from `/Users/defimagic/Desktop/Hive`:
```
git add MobileGameResearch/wood-siege/build-v2/
git commit -m "W-Monetization-V2-Energy <Concern letter> — <description>"
git push
```

7 commits total (one per concern A-G).

Final commit also pushes the done marker. Marker contents: per-concern verdict + tunable values + IAP SKU IDs + breakdown of where energy is shown in UI + happy-path test results.

## Test path

`http://localhost:3996/`:
1. Load page — confirm energy ⚡ shows in top strip + countdown ticks
2. Wait → confirm regen happens
3. Start Hunt → confirm -5 deducted
4. Win stage → confirm +3 refund
5. Lose stage → confirm 0 refund
6. Run 20+ enemies → eventually see treasure chest drop
7. Tap energy icon → modal opens with refill SKUs visible
8. Trigger out-of-energy state → modal opens automatically
9. Daily login bonus on cold-load (advance system clock or test-flag the hook)
