# ANALYTICS_SPEC.md — Events to Track for Retention and Conversion

**Author:** W-Marketing-Launch-Pack-V2  
**Date:** 2026-05-08  
**When this activates:** Phase 4 — when `meta-events.js` swaps from stub to live server POST.  
**Current stub:** `WG.Events.track(name, data)` in `js/meta/meta-events.js` logs to console only. All events below should be wired through this API — the function signature is already in place.

---

## Architecture Note

All analytics calls flow through a single API:
```js
WG.Events.track(eventName, propertiesObject);
```

This function fires `WG.Engine.emit('analytics:event', { name, props, ts: Date.now() })` internally. The Phase 4 backend swap: replace the console.log stub in `meta-events.js` with a `fetch()` POST to `${WG.Config.SERVER_BASE_URL}/events`. Batch-buffer events (flush every 10s or on session end) to reduce request volume. Never discard events between session start and first flush — buffer to `sessionStorage` first.

Every event gets these base properties automatically:
```json
{
  "deviceId": "<anonymous id from WG.Account.getDeviceId()>",
  "sessionId": "<uuid generated at session_start>",
  "ts": 1715000000000,
  "appVersion": "1.0.0",
  "platform": "ios" | "android" | "web",
  "isRoyalPass": true | false,
  "gearScore": 1240
}
```

---

## §1 — Session Events

These measure engagement depth and baseline usage.

| Event | Trigger | Key Properties |
|-------|---------|----------------|
| `session_start` | App foreground or cold launch | `isFirstLaunch`, `dayNumber` (days since install), `platform` |
| `session_end` | App background or close | `duration_ms`, `stagesCompleted`, `towerFloorsClimbed`, `tabsVisited[]` |
| `tab_view` | User taps a nav tab | `tab` (hunt/ascend/forge/relics/duel/alliance) |
| `onboarding_screen` | Onboarding overlay screen shown | `screen` (1/2/3), `isSkipped` |
| `onboarding_complete` | Player picks starter character | `characterId` |

**Retention signals derived from session events:**

- **D1 retention:** `session_start` on install day +1. Fire when `dayNumber === 1`.
- **D7 retention:** `dayNumber === 7`.
- **D30 retention:** `dayNumber === 30`.

Include `dayNumber` on every `session_start`. The backend retention query is then:
```sql
SELECT
  COUNT(DISTINCT CASE WHEN day_number = 1 THEN device_id END) / COUNT(DISTINCT device_id) AS d1,
  COUNT(DISTINCT CASE WHEN day_number = 7 THEN device_id END) / COUNT(DISTINCT device_id) AS d7,
  COUNT(DISTINCT CASE WHEN day_number = 30 THEN device_id END) / COUNT(DISTINCT device_id) AS d30
FROM events
WHERE event = 'session_start'
AND install_date = '2026-05-08'
```

---

## §2 — Hunt Events

Measure content progression and combat engagement.

| Event | Trigger | Key Properties |
|-------|---------|----------------|
| `stage_start` | Player taps BATTLE and stage begins | `stageId`, `mode` (day/night), `characterId`, `power` |
| `stage_complete` | Stage cleared (boss killed, exit modal shown) | `stageId`, `mode`, `duration_ms`, `xpGained`, `coinsGained`, `relicsDropped` |
| `stage_fail` | Player dies mid-stage | `stageId`, `mode`, `timeAlive_ms`, `floor` (always 0 for Hunt), `cause` (enemy/boss contact) |
| `stage_retry` | Player taps RETRY on end-of-stage modal | `stageId`, `attemptNumber` |
| `boss_defeated` | Boss HP reaches 0 | `bossId`, `stageId`, `mode`, `timeToKill_ms` |
| `level_up_boon_pick` | Player picks a level-up boon during stage | `boonType` (cooldown/damage/speed), `level`, `stageId` |
| `fever_start` | Combo hits 20 | `stageId`, `comboCount` |
| `fever_end` | Fever Mode expires or combo breaks | `stageId`, `cause` (survived/broke), `durationMs`, `chestSpawned` |
| `night_mode_play` | Night Mode stage entered | `stageId`, `torchLevel` at start (always 1.0) |
| `torch_empty` | Torch reaches 0 | `stageId` — fires once per stage when torch first hits 0 |

---

## §3 — Tower Gauntlet Events

Measure infinite-mode depth and energy efficiency.

| Event | Trigger | Key Properties |
|-------|---------|----------------|
| `tower_start` | Player taps GAUNTLET, energy spent | `floor` (always 1 on start), `energySpent` (5), `peakFloorBefore` |
| `tower_floor_complete` | Player clears a floor | `floor`, `durationMs`, `buffCardPicked`, `buffCardOptions[]` |
| `tower_death` | Player dies on a Tower floor | `floor`, `enemyType` (what killed), `hpAtDeath` |
| `tower_continue_tapped` | Player spends 2 gems to revive | `floor`, `gemsBefore`, `gemsAfter` |
| `tower_continue_declined` | Player exits instead of reviving | `floor` |
| `tower_run_end` | Run summary shown | `peakFloor`, `durationMs`, `totalFloors`, `buffsCollected[]`, `gemsSpentOnContinues` |
| `tower_personal_best` | New personal best set | `newBest`, `previousBest` |

**Key Tower metric: ad-to-continue ratio.** Track `tower_continue_tapped` / `tower_death` to understand whether 2-gem continues are used. If the ratio is < 5%, the gem price is too high or the floor where death occurs is too frustrating (derive from `floor` distribution on `tower_death`).

---

## §4 — Monetization Events (IAP Funnel)

Measure the full purchase funnel from shop open to payment.

| Event | Trigger | Key Properties |
|-------|---------|----------------|
| `shop_open` | Player opens Shop modal | `entryPoint` (gems_chip/side_icon/stage_result/energy_gate) |
| `shop_section_view` | Player scrolls to a Shop section | `section` (gem_packs/bundles/royal_pass/summon/offers) |
| `iap_tap` | Player taps a SKU purchase button | `sku`, `price`, `currency`, `gearScore`, `dayNumber` |
| `iap_compliance_shown` | Pre-purchase confirm modal shown | `sku` |
| `iap_compliance_confirmed` | Player confirms pre-purchase | `sku` |
| `iap_compliance_cancelled` | Player cancels at confirm | `sku` |
| `iap_purchase_started` | StoreKit/Play Billing sheet shown | `sku`, `price` |
| `iap_purchase_complete` | Entitlement granted | `sku`, `price`, `revenueUsd`, `isFirstPurchase`, `dayNumber` |
| `iap_purchase_failed` | StoreKit/Play error | `sku`, `errorCode` |
| `iap_purchase_cancelled` | User dismisses payment sheet | `sku` |
| `ad_request` | WG.Ads.showRewardedVideo() called | `placement` (stage_result/building_unlock/energy_refill) |
| `ad_show` | Ad impression begins | `placement`, `adType` (rewarded/interstitial) |
| `ad_complete` | Ad watched to completion | `placement`, `rewardGranted`, `reward` (2x/building_slot) |
| `ad_skip` | User skips (mid-roll) | `placement`, `secondsWatched` |
| `ad_fail` | Ad fails to load | `placement`, `errorCode` |
| `ad_removal_cta` | Ad-removal prompt shown | `trigger` (how many total ads watched) |

**IAP funnel analysis:**

```
shop_open
  → shop_section_view (section=gem_packs)
    → iap_tap
      → iap_compliance_confirmed
        → iap_purchase_started
          → iap_purchase_complete  (conversion)
          → iap_purchase_cancelled (drop)
```

Funnel drop-off points to watch:
1. `iap_tap` → `iap_compliance_confirmed`: should be > 80% (compliance modal is disclosure, not friction)
2. `iap_compliance_confirmed` → `iap_purchase_started`: should be > 95% (same session)
3. `iap_purchase_started` → `iap_purchase_complete`: expect 60–80% (App Store / Play Store native; some abandon at payment screen)

**ARPDAU formula:**
```
ARPDAU = SUM(iap_purchase_complete.revenueUsd) / COUNT(DISTINCT session_start.deviceId)
         per calendar day
```

---

## §5 — Subscription and Battle Pass Events

| Event | Trigger | Key Properties |
|-------|---------|----------------|
| `royal_pass_view` | Royal Pass section viewed in Shop | `isCurrentSubscriber` |
| `royal_pass_subscribed` | Royal Pass entitlement granted | `price`, `dayNumber`, `isFirstSub` |
| `royal_pass_cancelled` | Subscription cancelled via OS settings | *(detect on next open via receipt validation)* |
| `battle_pass_view` | Battle Pass modal opened | `currentLevel`, `isPremium`, `daysRemaining` |
| `battle_pass_purchase` | Battle Pass $9.99 purchased | `level`, `premiumTrackClaimsAvailable`, `dayNumber` |
| `battle_pass_level_up` | Battle Pass level increases | `newLevel`, `xpSource` (mission/stage/tower/boss) |
| `battle_pass_claim` | Player claims a Battle Pass reward | `level`, `track` (free/premium), `rewardType` |

---

## §6 — Alliance Events

Measure co-op feature engagement and social retention.

| Event | Trigger | Key Properties |
|-------|---------|----------------|
| `alliance_join` | Player joins an existing alliance | `allianceId`, `memberCount`, `alliancePower`, `dayNumber` |
| `alliance_create` | Player creates a new alliance | `dayNumber` |
| `alliance_boss_enter` | Player enters Alliance Boss round | `bossId`, `cycleIndex`, `hpRemainingPct` |
| `alliance_boss_contribute` | Player submits damage | `bossId`, `damagePct`, `rewardTier` (bronze/silver/gold/legend) |
| `alliance_war_raid` | Player launches a War raid | `captainIndex`, `opponentAlliance`, `weekKey` |
| `alliance_war_result` | War results resolved | `outcome` (win/loss), `weekKey`, `memberCountAttacked` |

**Alliance retention signal:** Players in an active alliance have 2–3× D7 and D30 retention in comparable mobile ARPGs. Track `alliance_join.dayNumber` distribution — if players join after D3, alliance prompts should surface earlier.

---

## §7 — Churn and Re-engagement

These events power cohort analysis and push notification triggers.

| Event | Trigger | Key Properties |
|-------|---------|----------------|
| `daily_reward_claim` | 7-day streak reward claimed | `streakDay`, `rewardType` |
| `daily_reward_miss` | Streak reset fires (48h grace expired) | `streakDay` (what it reset from), `gapDays` |
| `churn_signal` | Session end with no `stage_complete` | `sessionDuration_ms`, `lastStageAttempt`, `gearScore` |
| `re_engage_notification_sent` | Push notification sent | `templateId`, `daysSinceLastSession` |
| `re_engage_notification_open` | Player opens app from push | `templateId` |

**Churn cohort definition:**
- **Soft churn:** No `session_start` in 3 days. Re-engage with push.
- **Hard churn:** No `session_start` in 14 days. Last re-engage attempt; after that, exclude from active push.

**Push notification triggers and templates:**

| Trigger | Timing | Template |
|---------|--------|----------|
| No session in 3 days | Day +3 | "The grove is changing. Your alliance needs you." |
| Alliance Boss event starts | At event open (Fri 22:00) | "Alliance Boss spawned. Your damage window is open." |
| Tower personal best beaten (by alliance member) | Within 1h | "[Member] just hit Floor X. Can you beat it?" |
| Daily reward streak at Day 6 | Day of Day-6 claim | "Day 7 tomorrow — guaranteed Rare relic. Don't lose your streak." |
| Stage 12 first clear | On clear | "You unlocked Night Mode for Eldritch stages. The dark gets worse." |

---

## §8 — Event Implementation Checklist

Wire these in priority order (retention-critical first):

**P0 — Must have at launch:**
- [ ] `session_start` with `dayNumber`
- [ ] `session_end` with `duration_ms`
- [ ] `stage_start`, `stage_complete`, `stage_fail`
- [ ] `iap_purchase_complete` with `revenueUsd`
- [ ] `ad_complete` with `placement`

**P1 — Within 2 weeks of launch:**
- [ ] `tower_run_end` with `peakFloor`
- [ ] `alliance_boss_contribute` with `rewardTier`
- [ ] `royal_pass_subscribed`
- [ ] `onboarding_complete`
- [ ] `churn_signal`

**P2 — Before Phase 4 backend:**
- [ ] Full IAP funnel (`iap_tap` → `iap_purchase_complete`)
- [ ] `daily_reward_claim` + `daily_reward_miss`
- [ ] `battle_pass_level_up` with `xpSource`
- [ ] `re_engage_notification_sent` + `open`
- [ ] All `tab_view` events

---

## §9 — Dashboard KPIs

When the backend is live, build dashboards around these metrics:

| KPI | Definition | Healthy Range (comparable titles) |
|----|-----------|----------------------------------|
| D1 Retention | % of install-day users who return on Day 1 | 35–50% |
| D7 Retention | % who return on Day 7 | 15–25% |
| D30 Retention | % who return on Day 30 | 8–15% |
| ARPDAU | Total IAP revenue / DAU | $0.05–$0.15 F2P mobile |
| Ad-Watch Rate | `ad_complete` / `session_start` | 1.5–3.5 RVs per session |
| IAP CVR | `iap_purchase_complete` / `shop_open` | 2–6% |
| Tower Engagement | % of DAU with ≥1 `tower_start` | 20–40% |
| Alliance Join Rate | % of players in an alliance by D7 | 30–50% |
| Churn Rate (weekly) | % of last-week active who did not return | < 40% |

---

*Filed by W-Marketing-Launch-Pack-V2, 2026-05-08.*
