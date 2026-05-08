# BALANCE_AUDIT.md — Unlimited Chaos Pre-Launch Tunables Sweep
**Date:** 2026-05-08 | **Worker:** W-Balance-Audit | **State:** Pre-launch (zero players)

---

## §1 Tunables Snapshot

### 1.1 Enemy Roster (hunt-enemies.js `TYPES`)

| ID | HP | Speed | Damage | Cooldown(s) | Size | XP | Mode | Special |
|----|----|-------|--------|-------------|------|-----|------|---------|
| lurker | 10 | 35 | 5 | 1.0 | 14 | 2 | both | — |
| walker | 22 | 25 | 9 | 1.3 | 18 | 4 | both | — |
| sprite | 6 | 60 | 3 | 0.6 | 10 | 2 | both | Fast+fragile |
| brute_small | 55 | 18 | 18 | 2.0 | 24 | 8 | both | Elite threshold |
| caller | 14 | 22 | 8 | 1.6 | 16 | 5 | both | Ranged, projSpeed 140, range 260 |
| red_zombie | 22 | 65 | 6 | 1.3 | 18 | 3 | both | Fast walker |
| pumpkin_lantern | 32 | 70 | 8 | 1.2 | 18 | 4 | night | — |
| jiangshi | 50 | 85 | 12 | 1.4 | 20 | 4 | night | Very fast tank |
| samurai_grunt | 70 | 80 | 15 | 1.5 | 22 | 7 | both | Fast elite |
| banshee | 220 | 130 | 22 | 1.0 | 36 | 20 | night | Rare 5%; shriekCD 4.0s; chargeDur 0.8s; chargeSpeedMul 1.8× |
| wraith_fast | 18 | 140 | 7 | 1.1 | 14 | 3 | night | Fastest enemy |
| skull_swarmer | 9 | 95 | 3 | 0.8 | 12 | 1 | both | swarmSize 4 |
| sigil_drone | 25 | 50 | 7 | 1.2 | 13 | 5 | both | Ranged; projSpeed 155, range 280 |
| memory_husk | 80 | 16 | 14 | 1.7 | 22 | 10 | both | splitOnDeath → 2× lurker @50% HP |

**God Window (hunt-enemies.js `GOD_WINDOW`):**

| Param | Value |
|-------|-------|
| DURATION_SEC | 60 |
| START_MULT | 0.60 |
| END_MULT | 1.00 |
| EASE | cubic-out |

**Level Scaling (hunt-enemies.js `LEVEL_SCALE_TUNABLES`):**

| Param | Value | Notes |
|-------|-------|-------|
| HP_PER_LEVEL | 0.15 | +15% HP per player in-stage level above 1. Applied on top of all other mults. |
| SPLIT_FRAGMENT_HP_SCALE | 0.50 | Split-spawn lurkers start at 50% base HP. |

---

### 1.2 Stage Structure (hunt-stage.js)

**Tier breaks:** early ≤ 6, mid 7–12, late ≥ 13

| Tier | Wave Count | Wave Duration(s) | Total Stage Duration |
|------|-----------|-----------------|---------------------|
| Early (stages 1–6) | 3 | 30 | **90s (1.5 min)** |
| Mid (stages 7–12) | 5 | 50 | **250s (4.2 min)** |
| Late (stages 13–18) | 7 | 60 | **420s (7 min)** |
| Ascended (19–23) | 7 | 60 | **420s** |
| Stage 24 (final) | 8 | 60 | **480s (8 min)** |

Tutorial (stage 0): 90s, isTutorial; hpMult 0.4, speedMult 0.6, damageMult 0.2, invulnFirstSec 45.

Bosses spawn at the **start** of the last wave (not after all mobs clear).

---

### 1.3 Spawn Ramp (hunt-waves.js)

| Param | Value | Effect at wave N (0-indexed = N-1) |
|-------|-------|-------------------------------------|
| WAVE_TIER_RAMP | 0.15 | rate × (1 + w0 × 0.15); last wave of mid (w0=4): 1.6×; last wave of late (w0=6): 1.9× |
| WAVE_STAT_BASE | 0.18 | stats × (1 + w0 × 0.18); last wave of mid: 1.72×; last wave of late: 2.08× |
| WAVE_BASE_RATE_MIN | 0.7 /s | Base spawn rate at start of each wave |
| WAVE_BASE_RATE_MAX | 2.1 /s | Base spawn rate at end of each wave |
| NIGHT_SPAWN_MUL | 1.6× | Multiplier on spawn rate in night mode |
| NIGHT_STAT_MUL | 1.4× | HP + damage multiplier for all night enemies |

**Compounded worst case** (wave 7 late-tier, night mode, player level 8):
Enemy HP = base × 2.08 (wave stat) × 1.4 (night) × [1 + 7×0.15] (level) = base × 4.14×
→ Lurker: 10 × 4.14 = **41 HP** at wave 7 night-late-stage, player level 8.

---

### 1.4 Weapons (hunt-weapons.js `WEAPONS`)

| ID | Slot | Range | Cooldown(s) | Damage | Power |
|----|------|-------|-------------|--------|-------|
| branch_stick | melee (starter) | 50 | 0.65 | 6 | 5 |
| charred_axe | pickup | 65 | 0.85 | 14 | 0 |
| twin_blades | pickup | 55 | 0.45 | 9 | 0 |
| bow_of_mourning | pickup | 220 | 1.0 | 12 | 0 |
| paper_charm | pickup | 180 | 1.4 | 16 | 0 |
| bramble_stick | pickup | 75 | 0.7 | 11 | 0 |
| silver_thorn | pickup | 90 | 0.6 | 13 | 0 |
| sutra_blade | pickup | 70 | 0.5 | 12 | 0 |
| ember_lash | pickup | 95 | 0.7 | 15 | 0 |
| willow_charm | pickup | 150 | 1.1 | 18 | 0 |
| iron_sling | ranged (meta) | 140 | 0.8 | 8 | 18 |
| bone_horn | ranged (meta) | 120 | 1.5 | 22 | 32 |
| pet_wisp | pet (meta) | 80 | 1.2 | 5 | 22 |
| pet_fox | pet (meta) | 50 | 0.9 | 8 | 36 |
| pet_crow | pet (meta) | 110 | 1.4 | 12 | 50 |

---

### 1.5 Player Tunables (hunt-player.js)

| Param | Value | Notes |
|-------|-------|-------|
| Base speed | 95 + level×1.2 | Level is in-stage level |
| SKILL_BASE_CD | 22s | AoE shockwave 110u, 60 dmg, 80 boss dmg |
| TORCH_INITIAL | 1.0 | |
| TORCH_DECAY_PER_S | 0.012 | ≈83s full burn in night mode |
| TORCH_RELIGHT_R | 100u | Campfire relight radius |
| TORCH_DROP_CHANCE | 20% | Per chopped tree in night mode |
| XP base (xpToNext) | 25 | 1.7× growth: 25, 42, 72, 123, 209, 355, 603, 1025… |
| CRIT_CHANCE | 12% | |
| CRIT_MULT | 1.6× | |
| HIT_STOP: crit | 60ms | |
| HIT_STOP: elite | 100ms | Enemies with size ≥ 24 |
| HIT_STOP: bossDamaged | 140ms | |
| HIT_STOP: bossDefeated | 280ms | |
| FEVER threshold | 20 combo | |
| FEVER duration | 10s | |
| FEVER drop rate mult | 3× | |
| FEVER chest gold | 1–4 | 1d4 |
| Damage reduction | max(1, dmg − floor(defense×0.5)) | defense stat |
| CONSTRUCT_TICK_S | 0.22s | Time per wood during build |
| REPAIR_HOVER_DELAY | 3.0s | Seconds standing before repair starts |
| REPAIR_RATE | 0.25s/wood | Wood drain interval during repair |
| REPAIR_HP_PER_WOOD | 8 | HP per wood spent on repair |

**Level-up choices (applyLevelChoice):**

| Choice | Effect |
|--------|--------|
| dmg | +floor(activeDamage × 0.18) bonus dmg |
| cd | cooldownMul × 0.92 |
| maxhp | maxHp × 1.15, +25 HP |
| pickup | pickupRadius +8 |
| speed | speedBonus +12 |

---

### 1.6 Tower Gauntlet (hunt-tower.js `TUNABLES`)

| Param | Value |
|-------|-------|
| ENERGY_COST | 5 |
| HP_MULT_PER_FLOOR | 0.18 |
| DAMAGE_MULT_PER_FLOOR | 0.10 |
| SPEED_MULT_PER_FLOOR | 0.04 |
| SPEED_MULT_CAP | 1.6× |
| MINIBOSS_AT_FLOOR_PCT | 70% |
| MINIBOSS_HP_BASE | 200 |
| MINIBOSS_HP_PER_FLOOR | 30 |
| BASE_SPAWN_RATE | 1.5/s |
| SPAWN_RATE_PER_FLOOR | 0.15/s per floor |
| FLOOR_DURATION_BASE | 75s |
| FLOOR_DURATION_MIN | 45s |
| MAX_CONTINUES | 2 |
| CONTINUE_COST floors 1–4 | 1 💎 |
| CONTINUE_COST floors 5–9 | 3 💎 |
| CONTINUE_COST floors 10+ | 5 💎 |
| CONTINUE_REVIVE_HP_PCT | 50% |

**Derived floor durations:** floor 1–4: 75s, floor 5–9: 65s, floor 10–14: 55s, floor 15+: 45s (cap).

**Enemy HP at floor N:** 1.0 + 0.18×(N−1)
→ Floor 5: 1.72×, Floor 10: 2.62×, Floor 15: 3.52×, Floor 20: 4.42×

**Mini-boss HP at floor N:** 200 + N×30
→ Floor 1: 230, Floor 5: 350, Floor 10: 500, Floor 20: 800

**Spawn rate at floor N:** 1.5 + 0.15×N
→ Floor 10: 3.0/s, Floor 20: 4.5/s (skull_swarmers can arrive as 18 entities/s at floor 20)

**Tower milestone loot:**
- Floor 5: 20 gold, 1 gem, 1 frag
- Floor 10: 50 gold, 3 gems, 5 frags
- Floor 15: 100 gold, 5 gems, 10 frags, 1 rare mat
- Floor 20+: floor/5 × {40 gold, 2 gems, 4 frags} + 1 rare mat per 3 tiers

---

### 1.7 Forge Buildings (forge-buildings.js)

| Building | Category | Key Scaling |
|----------|----------|-------------|
| gold_mine | A | L1: 50 coins/hr, cap 100 coins (2h); L20: 620/hr, cap ~14,880 (24h) |
| forge | A | Craft slots: L1=1/day, L20=5/day; L20 = guaranteed epic |
| campfire | B | Regen/s: L1=1, L20=4; radius: L1=60u, L20=100u |
| anvil | B | Enchant scrolls/day: L1=1, L20=5 |
| cannon_battery | C | Shot cap: L1=6, L20=12; refill 30 min/shot |
| bow_range | C | Archer squad; refill 4h/squad |
| barracks | C | Footman squad; refill 4h/squad |
| wall_workshop | C | Wall cap: L1=6, L20=14; refill 90 min/segment |

**Upgrade cost formula:** floor(80 + level² × 40)
→ L1→2: 120, L5→6: 1,080, L10→11: 4,080, L19→20: 14,520

**Full max-level cost (L1→L20) per building: ≈100,320 coins**

**Craft resources:**

| Resource | Cap | Regen | Gem refill |
|----------|-----|-------|-----------|
| Wood | 500 | 1 per 30s = 120/hr | 25 💎 → +200 |
| Stone | 200 | 1 per 60s = 60/hr | 25 💎 → +100 |
| Craft cost per attempt | 20 wood + 10 stone | — | — |

---

### 1.8 Energy System (wg-state.js `ENERGY_TUNABLES`)

| Param | Value |
|-------|-------|
| MAX | 30 |
| REGEN_INTERVAL_MS | 900,000ms (15 min/energy) |
| STAGE_COST | 5 |
| WIN_REFUND | 3 |
| LOSS_REFUND | 0 |
| LOGIN_BONUS | 20 |
| STREAK_7_BONUS | 50 |
| FIRST_CLEAR_BONUS | 10 |

Tower run energy cost: 5 (same as Hunt stage, from hunt-tower.js TUNABLES.ENERGY_COST).
RV energy reward (meta-energy-modal.js): +5 per video.
Daily RV cap (meta-ads.js): 50 (shared across energy refills, buff activations, ability charges).
Royal Pass adds: +20 energy cap (cap → 50) + +10 daily energy.

---

### 1.9 IAP SKUs (meta-iap.js `SKUS`)

| SKU | Price | Primary Grant |
|-----|-------|---------------|
| coin_pack_pocket | $0.99 | 500 coins |
| coin_pack_pouch | $2.99 | 1,800 coins + 5 💎 |
| coin_pack_chest | $4.99 | 3,500 coins + 15 💎 |
| coin_pack_hoard | $9.99 | 8,000 coins + 40 💎 |
| coin_pack_vault | $19.99 | 18,000 coins + 100 💎 |
| diamond_starter | $0.99 | 30 💎 |
| ad_removal | $4.99 | No-ads + premium unlock |
| mega_bundle | $99.99 | 200,000 coins + 1,500 💎 + 250 cards |
| refill_5 | $0.99 | +5 energy |
| refill_15 | $1.99 | +15 energy |
| refill_30 | $4.99 | +30 energy (Best Value badge) |
| refill_60 | $9.99 | +60 energy |
| refill_150 | $19.99 | +150 energy |
| gems_5 | $0.99 | 50 gems |
| gems_1500 | $99.99 | 25,000 gems |
| starter_pack | $4.99 | 500 gems + 50 frags + rare relic + 30 energy + cosmetic |
| weekly_deal | $9.99 | 200 gems + 100 frags + 50 energy + 1,000 XP |
| monthly_deal | $19.99 | 800 gems + 500 frags + 200 energy + legendary relic |
| royal_pass_monthly | $14.99/mo | 2× stage rewards + +20 energy cap + +10 daily + 20% gem discount |
| battle_pass_s1 | $9.99 | Premium Season 1 pass |
| ability packs | $1.99–$4.99 | 1–5 ability charges per type |

---

### 1.10 Ad-Gated Buffs (meta-buffs.js `BUFFS`)

| Buff | Kind | Duration |
|------|------|----------|
| damage_x2 | duration | 60s |
| wood_x2 | duration | 90s |
| instant_turret | oneshot | — |
| revive | oneshot | — |

---

### 1.11 Special Abilities (meta-special-abilities.js `CATALOG`)

| Ability | Cooldown(s) | Rarity | Effect |
|---------|-------------|--------|--------|
| wraith_banish | 180 | common | Clear all enemies; 30% HP damage to boss |
| lantern_pulse | 120 | common | 3s invuln + 80 dmg AoE 200u |
| time_slow | 90 | rare | 30% world speed for 5s |
| soul_magnet | 60 | common | Full-screen pickup magnet + 2× XP for 8s |
| shadow_strike | 75 | rare | Teleport to nearest + 5× dmg for 3 hits |
| paper_charm_ward | 240 | legendary | Full damage shield for 10s |

Daily ad cap per ability: 5. Can also be purchased via ability pack SKUs.

---

### 1.12 Alliance Economy (meta-alliance.js)

**Earn rates (EARN_RATES):** WIN_RAID 5, LOSE_RAID 1, DAILY_LOGIN 3, SEND_GIFT 1 (cap 5/day), DAILY_MISSION 5, BOSS_BRONZE 5, BOSS_SILVER 10, BOSS_GOLD 20, BOSS_LEGEND 50, WAR_WIN 20.

**Spend pool (SPEND_POOL):**

| Perk | Cost |
|------|------|
| SLOT_EXPAND (+5 member slots) | 200 pts |
| ENERGY_REGEN (+10% regen 24h) | 100 pts |
| RAID_REWARDS (+20% raid 24h) | 150 pts |
| BANNER_COSMETIC | 50 pts |

Create cost: 500 coins. Member cap: 30 base, max 50.
Alliance gift claim: +5 energy + 50 coins per day.

---

### 1.13 Alliance Boss (meta-alliance-boss.js)

**HP formula:** floor(5,000,000 × memberCount / 10)

| Members | hpMax | After 55% NPC seed remaining |
|---------|-------|------------------------------|
| 6 (default create) | 3,000,000 | ~1,350,000 |
| 10 | 5,000,000 | ~2,250,000 |
| 20 | 10,000,000 | ~4,500,000 |
| 30 | 15,000,000 | ~6,750,000 |

Tier thresholds: legend ≥30% total dmg share, gold ≥15%, silver ≥5%, bronze ≥1%.
Tier rewards: bronze 200 coins; silver 500 coins + 5 💎; gold 2,000 + 20 💎 + 1 epic frag; legend 5,000 + 50 💎 + 1 legendary frag.
Event: 3 days active, 1 day break (4-day cycle).

---

### 1.14 Raid System (raid-defenses.js, raid-sim.js)

**Turret DPS:**

| Turret | HP | Damage | Fire rate | Effective DPS |
|--------|-----|--------|-----------|---------------|
| cannon | 300 | 45 | 0.4 Hz | 18/s |
| archer | 180 | 18 | 1.5 Hz | 27/s |
| mortar | 240 | 35 | 0.25 Hz | 8.75/s (AOE 80u) |
| ward | 200 | 12 | 2.0 Hz | 24/s + 20% slow |

**Raid sim constants:** duration 180s, WIN_THRESHOLD 80% structures destroyed, RESPAWN_PENALTY_S 15, RESPAWN_HP_FRAC 50%.

**Reward formula (win):** floor(targetPower × 0.35) + structuresDestroyed × 8 coins + conditional diamonds.

---

## §2 Imbalance Flags

### FLAG-01 — LOGIN_BONUS is silently wasted for all consistent daily players

**System:** wg-state.js ENERGY_TUNABLES.LOGIN_BONUS = 20

**The problem:** The max energy cap is 30. Energy regenerates at 1/15 min = 4/hr. Any player who stopped playing more than 7.5 hours ago wakes up to a full 30-energy cap. The +20 login bonus is capped at 30, meaning it is **entirely discarded** for the most common player behavior: open once per day in the morning.

**Impact:** The login incentive — a core daily-retention lever — does nothing. Players who log in daily never experience the +20 reward. The STREAK_7_BONUS (50) has the same problem: at max 30 cap, a returning player gets +20 max anyway.

**Fix:** Change LOGIN_BONUS delivery to one of: (a) grant as coins (500 coins is more meaningful), or (b) grant as "overflow" energy stored in a buffer separate from the 30-cap that drains into the live pool over the next 2 hours, or (c) convert login bonus to a daily chest containing coins + XP instead of energy.

**Target value:** LOGIN_BONUS deliver as 500 coins OR as a time-gated overflow of +20 energy above cap (spendable only, non-regenerating buffer).

---

### FLAG-02 — Early→Mid stage cliff: 2.77× duration jump at stage 7

**System:** hunt-stage.js WAVE_COUNT_EARLY=3/WAVE_SEC_EARLY=30 vs WAVE_COUNT_MID=5/WAVE_SEC_MID=50

**The problem:** Stage 6 runs 90 seconds total. Stage 7 runs 250 seconds total — a **2.77× jump in survival time**. Stage 7 also introduces the Caller (first ranged enemy). A player who barely survived stage 6's 90-second gauntlet is immediately hit with a 250-second run featuring a new mechanic. This is the highest per-stage duration jump in the entire progression and correlates with maximum churn in comparable ARPGs.

**Impact:** Players who cleared stage 6 (boss stage, 90s) will hit a wall at stage 7 and may interpret difficulty as a game problem rather than a skill gap. Ad-watch rate at stage 7 will spike because players die late in the run.

**Fix option A (preferred):** Add a bridge tier for stages 4–6: 4 waves × 30s = 120s, making the stage 6→7 jump only 2.08× instead of 2.77×. Change WAVE_COUNT_EARLY to 4 for stages 4–6 only (by adding a `bridgeTier: 4` override in the tier system).

**Fix option B (simpler):** Lower WAVE_SEC_MID from 50 to 40, making mid stages 200s total. Reduces the jump to 2.22× while keeping late-stage structure intact.

**Target:** Stage 6→7 duration ratio ≤ 2.0×. Recommended: WAVE_COUNT_EARLY 4 (was 3) for stages 4–6 specifically.

---

### FLAG-03 — Gold Mine L1 cap traps casual players at 8% of daily yield

**System:** forge-buildings.js yieldAt()/capAt()

**The problem:** Gold Mine L1 yields 50 coins/hr with a cap of 100 coins (2h worth). A player who opens the game once per day (8am, then 8am) accumulates 24 hours of yield but can only collect 100 coins — 8.3% of available production. The remaining 1,100 coins are silently discarded. Players who do not tap the mine multiple times per day are punished invisibly.

**Building upgrade cost context:** Upgrading all 8 buildings to L5 requires ~12,160 coins. A casual player collecting 100 coins/day from the mine takes **121 days** to afford basic building upgrades, which is wildly out of proportion with the game's early pacing.

**Fix:** Change the cap formula hours from `2 + (level-1)×22/19` to `12 + (level-1)×12/19`. This gives L1 a 12-hour cap (600 coins), L20 a 24-hour cap (unchanged, ~14,880), and casual players lose only ~50% of potential instead of 92%.

**Target:** capAt(1) from 100 to 600 coins (formula change: base hours 2 → 12; scale 22/19 → 12/19).

---

### FLAG-04 — God Window power fantasy erodes for elite enemies at player level 6+

**System:** hunt-enemies.js GOD_WINDOW.START_MULT=0.60, LEVEL_SCALE_TUNABLES.HP_PER_LEVEL=0.15

**The problem:** God Window applies a 0.60 start multiplier to already level-scaled HP. At player level 7 (realistic by wave 3–4 of any mid stage), level mult = 1 + 6×0.15 = 1.9×. A samurai_grunt at god window start: 70 × 1.9 × 0.60 = **79.8 HP**. At window end: 70 × 1.9 = 133 HP. Player doing ~9 base damage takes 9 hits at window start vs 15 hits at end. The "first 60s feel invincible" intent is functionally lost for elite-tier enemies by mid-game.

At player level 10: lurker at god window start = 10 × 2.35 × 0.60 = 14.1 HP (2 hits — same as level 1 god window). Lurker at window end = 23.5 HP (3 hits). The god window effect is imperceptible for small enemies too, because player has also gained damage.

**Fix:** Lower START_MULT from 0.60 to 0.40. This restores the felt power gap: samurai_grunt at level 7 window start = 70 × 1.9 × 0.40 = 53.2 HP (6 hits, genuinely easy), vs window end = 133 HP (15 hits, genuinely hard). The transition is felt.

**Target:** GOD_WINDOW.START_MULT: 0.40 (current 0.60).

---

### FLAG-05 — Tower HP scaling too steep: F2P wall at floor 7–10

**System:** hunt-tower.js TUNABLES.HP_MULT_PER_FLOOR=0.18

**The problem:** Floor 10 enemy HP = 2.62× base. Floor 15 = 3.52×. A new player with starting stats (attack 5, branch_stick 6 damage, effective 9 DPS) faces:
- Floor 10 lurker: 10 × 2.62 = 26 HP (3 hits).
- Floor 10 walker: 22 × 2.62 = 58 HP (7 hits).
- Floor 10 mini-boss HP: 500 HP at 9 damage/swing = **55 swings** needed.
- Spawn rate at floor 10: 3.0/s. In 55s (time to kill mini-boss), 165 enemies spawn. Overwhelm is certain without tower buffs.

**F2P reaching floor 5 (milestone chest) is reasonable. Floor 10 requires tower buff stacking across multiple runs.** The gap between "first run" and "sustainable floor 10" is too steep without 💎 continues.

**Fix:** Reduce HP_MULT_PER_FLOOR from 0.18 to 0.12. Floor 10 HP mult drops to 2.08×, floor 15 to 2.68×. Mini-boss at floor 10: 200 + 300 = 500 HP unchanged (mini-boss HP uses a separate formula), but regular enemy HP becomes survivable ~2 runs earlier.

**Target:** HP_MULT_PER_FLOOR: 0.12 (current 0.18).

---

### FLAG-06 — Night Mode NIGHT_STAT_MUL 1.4× stacks on already-scaling enemies with no player offset

**System:** hunt-waves.js NIGHT_STAT_MUL=1.4, NIGHT_SPAWN_MUL=1.6

**The problem:** Night mode adds 1.4× HP+damage to all enemies on top of wave scaling and level scaling. A wave-5 late-stage night-mode enemy at player level 8: base HP × 2.08 (wave) × 1.4 (night) × 2.2 (level) = **6.4× base HP**. A samurai_grunt becomes 448 HP. Player with ~12 damage (3 dmg level-ups) needs 37 hits. Night mode also spawns enemies 1.6× faster.

The player gets no corresponding night-mode offense boost. The only mitigation is the torch system (visibility), which punishes players but doesn't reduce enemy HP. There is no "night bonus" for players who successfully manage torch, making night mode feel like pure punishment rather than risk/reward.

**Fix:** Add a night-mode kill XP bonus (NIGHT_XP_MULT: 1.3×) and a night-mode coin drop bonus (NIGHT_COIN_MULT: 1.5×) to offset the difficulty. These are trivial tunable additions that transform night mode from "punishment" to "challenge with reward."

**Target:** Add NIGHT_XP_MULT=1.3 and NIGHT_COIN_DROP_MULT=1.5 to hunt-waves.js NIGHT constants. Apply in pickup and onEnemyKill paths.

---

### FLAG-07 — Banshee banish cooldown vs player skill: 180s wraith_banish vs 4.0s shriek cycle

**System:** meta-special-abilities.js CATALOG.wraith_banish.cooldownSec=180, hunt-enemies.js banshee.shriekCooldown=4.0

**The problem:** The Banshee shrieks every 4 seconds. The closest player counter (wraith_banish) has a 180-second cooldown and requires a purchased charge. A single banshee appearing in night mode will shriek 45 times in the 180-second ability window. Each charge costs $1.99 for 5. The ability pack was designed for hard situations but is priced as a soft counter ($0.40/charge), yet the banshee spawns 5% of every night spawn tick — a non-trivial frequency.

**Impact:** Night-mode players will either: (a) stockpile ability charges (spend), (b) avoid night mode entirely (retention loss), or (c) get frustrated (churn).

**Fix:** Either: (a) lower banshee shriekCooldown from 4.0 to 8.0 seconds so it's threatening but not spammy, or (b) reduce wraith_banish cooldown from 180s to 120s at common rarity.

**Target:** banshee.shriekCooldown: 8.0 (current 4.0) — preserves threat without requiring ability burn. OR wraith_banish cooldownSec: 120 (common rarity alignment with lantern_pulse).

---

### FLAG-08 — Alliance boss is non-viable for small alliances (< 15 active members)

**System:** meta-alliance-boss.js hpMax = floor(5,000,000 × memberCount / 10)

**The problem:** The 55% NPC seed is a visual fix only — NPCs don't represent real daily attacks. The remaining HP after NPC seed must be dealt by real players over 3 days. For a default-created 6-member alliance (1 player + 5 NPCs):
- hpMax: 3,000,000. After NPC seed: ~1,350,000 remaining.
- Single player needs 450,000 damage/day.
- Energy cost per alliance boss attack: 5 (raid-boss-attack.js line 5).
- F2P player has ~15 viable energy uses/day: if they spend 10 on boss = 2 runs × 5 energy.
- Without knowing ATTACK_DURATION_MS and the damage formula from raid-boss-attack.js, exact per-attack damage is unverified. However at any reasonable per-attack damage (e.g., 5,000–20,000), 450,000 damage/day requires 22–90 attacks. At 5 energy each, that's 110–450 energy/day — impossible for F2P.

**Fix:** Add a minimum viable alliance check: boss HP = max(memberCount_required_floor, actual_count) × 5,000,000/10. Set memberCount floor at 8 to match NPC_MEMBERS count. This makes a solo player's effective hpMax = 8/10 × 5M = 4M (with 55% NPC seed = 1.8M remaining for 1 player over 3 days = 600k/day). Still hard, but narratively "the NPCs are carrying their weight."

**Target:** `Math.max(NPC_MEMBERS.length, _memberCount())` as input to hpMax formula. NPC_MEMBERS.length = 5 → min input = 5+1 = 6, but should be higher. Recommended minimum effective count: 10 (guaranteeing hpMax floor of 5M, NPC seed 2.75M, 1 player deals 250k/day — realistic with moderate boss attack frequency).

---

## §3 Daily-Loop Simulations

### Energy Economy Baseline

- MAX: 30. Net energy per winning run: 5 − 3 = **2**.
- Full energy → winning runs before depletion: **15 runs**.
- After depletion: regen 15 runs × 2 energy = 30 energy in 30 × 15 min = **7.5 hours**.
- Overnight regen (8h sleep): 8h × 60 min / 15 min = 32 energy → capped at 30. Player wakes at cap.

---

### F2P Optimal (no ads, daily login, always wins)

**Morning open (1 session per day):**

| Metric | Value |
|--------|-------|
| Start energy | 30 (regen hit cap during sleep) |
| Login bonus | +20 → **silently wasted** (already at cap) |
| Net energy available | 30 |
| Runs possible | 15 |
| Early stages (1.5 min): gameplay time | 22.5 min |
| Mid stages (4.2 min) in 30-min session | ~7 runs |
| Late stages (7 min) in 30-min session | ~4 runs |

**Daily progression estimate:**
- Early game (stages 1–6): 15 stage runs/day → advance 1–3 new stages/day.
- Mid game (stages 7–12): 7–10 runs/day → ~1 stage/day.
- Late game (stages 13–18): 4–6 runs/day → 1 stage every 2 days.

**Gold mine income (L1 casual tap, once daily):** 100 coins/day (cap limit, 91% waste).
**Gold mine income (L5 casual tap, once daily):** 200 × 2 = 400 coins (L5 cap = 2h×200 = ~950; once-daily still loses ~58% of production).

**Steady-state retention signal:** F2P can progress meaningfully in Hunt through mid-game with daily play. Late-game stages require ~2 days per stage. The loop is **viable but fragile** — one loss depletes 5 energy with zero refund (LOSS_REFUND 0), creating frustration spikes.

---

### Ad-Watcher (5 energy RVs/day from meta-energy-modal, plus standard F2P)

| Metric | Value |
|--------|-------|
| Base energy | 30 |
| RVs watched | 5 (consumes 5/50 daily RV cap) |
| Energy from RVs | +25 |
| Total available | 55 |
| Runs possible | 27.5 (vs F2P's 15) |
| Mid-stage time in 30 min | ~7 runs (same as F2P — time-limited not energy-limited) |
| Full session possible | 55 × 4.2 min / 2 = 115 min of mid gameplay |

**Note:** Ad-watcher is only 1.83× more energy-efficient than F2P, but their real advantage is **not running out of energy mid-session**. F2P in mid-game runs out of energy in ~10 runs (20 energy net on mid stages), which forces a return tomorrow. Ad-watchers keep going.

**Daily progression vs F2P:** ~2× stages/day in early-mid game.

---

### Whale ($5/day — refill_30 daily)

| Metric | Value |
|--------|-------|
| Base energy | 30 |
| IAP energy | +30 (refill_30 $4.99) |
| Total available | 60 |
| Runs possible | 30 (vs F2P 15) |
| Daily progression | 2× F2P stages/day |

**$99 Day-1 burst whale (mega_bundle):**

| Day | State |
|-----|-------|
| Day 1 | 200,000 coins → all 8 buildings to L10–L14; Gold Mine L12: 380 coins/hr. 1,500 💎 enables 300 tower continues (5/continue at floor 10+) → can push tower to floor 25–30 with skill. 250 cards → strong relic loadout. |
| Day 7 | All buildings maxed (L20). Gold Mine 620/hr, cap 14,880. Full cannon battery + bow unlocks ready for raids. Energy still gated at 30 (no energy advantage from the bundle). |
| Day 30 | Tower record likely floor 30+. Maxed passive economy. Boss contribution legend tier every cycle. Power gap vs F2P: massive in economy, similar in Hunt combat (energy-gated equally). |

**Power ceiling observation:** The $99 whale cannot buy their way through stages faster because STAGE_COST is 5 and there is no IAP that increases the energy cap (only Royal Pass adds +20 cap at $14.99/mo). Their advantage is entirely **economic compounding** (buildings, relics, tower), not direct combat speed. This is good P2W design.

**Royal Pass ($14.99/mo) daily-loop math:**

| Metric | Value |
|--------|-------|
| Energy cap | 50 (+20 over base) |
| Daily login energy | +10 (daily royal pass grant, meta-daily-reset.js) |
| Effective energy available | 50 + 10 = 60 (similar to $5/day whale energy, but via subscription) |
| Extra benefit | 2× stage rewards on all runs |
| Monthly cost | $14.99 vs $150 ($5/day); Royal Pass is ~10× more efficient per dollar for steady players |

---

## §4 Top 5 Priority Tuning Fixes

**Ranked by impact on D1 retention and long-term monetization:**

---

### P1 — Fix the LOGIN_BONUS waste (D1 retention impact: high)

**Current:** `LOGIN_BONUS: 20` (energy). Wasted for all players who open after 7.5h gap.

**Change:** Replace with daily login chest: 500 coins + 10 XP (meta-account.js `claimDailyReward`). Remove energy grant from login flow entirely. The STREAK_7_BONUS should become 30 💎 instead of 50 energy for the same reason.

```js
// wg-state.js
LOGIN_BONUS: 500,          // coins, not energy
STREAK_7_BONUS: 30,        // diamonds, not energy

// meta-account.js claimDailyReward:
// WG.State.grant('coins', T.LOGIN_BONUS)  instead of grantEnergy
// WG.State.grant('diamonds', T.STREAK_7_BONUS) at streak 7
```

**Retention mechanism:** A 500-coin chest is immediately visible and spendable. It funds building upgrades. Players who receive it feel progression; players who currently get the energy bonus feel nothing (it's silently discarded).

---

### P2 — Lower God Window START_MULT from 0.60 to 0.40 (D7 engagement: high)

**Current:** `GOD_WINDOW.START_MULT: 0.60`

**Change:**
```js
// hunt-enemies.js GOD_WINDOW:
START_MULT: 0.40,   // was 0.60
```

**Reasoning:** At mid-game player levels (6–8), the 0.60 start mult still results in elite enemies taking 6–9 hits at second 0. Dropping to 0.40 makes elites take 4–5 hits — genuinely easy — then ramp to 12–15 hits by second 60. The power-fantasy arc is felt across all stages, not just early ones. No XP or reward balancing required; stat-only change.

---

### P3 — Fix Gold Mine L1 cap from 2h to 8h (D30 monetization: medium-high)

**Current:** capAt hours formula starts at 2h for L1.

**Change:**
```js
// forge-buildings.js capAt():
function capAt(level) {
  const hours = 8 + (level - 1) * 16 / 19;   // was: 2 + (level-1) * 22/19
  return Math.round(yieldAt(level) * hours);
}
```

**Result:** L1 cap → 400 coins (8h buffer). L10 cap → ~5,000 coins. L20 cap → ~14,400 coins (negligible change at max).

**Retention mechanism:** Casual once-daily players see meaningful gold mine income from day 1 without needing to tap 12×/day. They invest coins in buildings, progress faster, convert at higher rates on building upgrades. The gold mine becomes a genuine idle mechanic rather than a trap for infrequent openers.

---

### P4 — Reduce Tower HP_MULT_PER_FLOOR from 0.18 to 0.12 (D3–D14 retention: high)

**Current:** `HP_MULT_PER_FLOOR: 0.18`

**Change:**
```js
// hunt-tower.js TUNABLES:
HP_MULT_PER_FLOOR: 0.12,   // was 0.18
```

**Result:** Floor 10 HP mult drops from 2.62× to 2.08×. Floor 15 from 3.52× to 2.68×. Floor 20 from 4.42× to 3.28×. The floor-10 milestone chest (50 gold, 3 gems, 5 frags) becomes achievable for F2P players without burning 💎 on continues. This turns the tower from a "whales only" mode into a meaningful engagement loop for all players within 1–2 weeks of play.

**Monetization neutral:** The continue mechanic still generates revenue at floor 15+ where scaling remains steep (2.68×). Whales retain floor 20+ as their benchmark. The change only unlocks floor 5–10 for F2P, which drives engagement without cannibalizing whale spend.

---

### P5 — Reduce Early→Mid stage duration jump via WAVE_COUNT_EARLY adjustment (D1–D3 retention: high)

**Current:** Early (stages 1–6): 3 waves × 30s = 90s. Mid (stages 7–12): 5 waves × 50s = 250s. Jump: 2.77×.

**Change:** Apply a `bridgeWaveCount` override for stages 4–6 (the pre-boss cluster that transitions to mid):

```js
// hunt-stage.js — after STAGES loop:
for (const s of STAGES) {
  if (s.id >= 4 && s.id <= 6) {
    s.waveCount = 4;       // bridge tier: was 3
    s.durationSec = s.waveCount * s.waveDurationSec;
  }
}
```

**Result:** Stages 4–6 become 4 × 30s = 120s. Stage 6→7 jump becomes 250/120 = 2.08× (was 2.77×). Stage 3→4 jump: 120/90 = 1.33× (comfortable).

**Risk:** Stages 4–6 take 33% longer. Energy efficiency drops slightly (more time per run). Given the current 30-second wave duration, this is a 30-second extension per stage — acceptable.

---

## §5 What's Untunable — System-Level Gaps

### G1 — Energy cap architecture makes overflow bonuses meaningless

Any bonus granted when `energy.current == energy.max` is silently discarded (wg-state.js `grantEnergy` clamps to max). This affects: LOGIN_BONUS, STREAK_7_BONUS, alliance gift claim (+5 energy), Royal Pass daily (+10 energy if already full). **Fix requires architecture change:** either an overflow buffer, a daily-chest conversion, or a separate "bonus energy pool" that drains into live pool at spend-time. This cannot be fixed by changing a tunable.

### G2 — Alliance boss has no floor for solo/tiny alliance play

The boss HP scales purely by `_memberCount()` with no minimum floor. A solo player creates an alliance, gets 5 NPC members, and faces a boss requiring 450,000 damage/day from a single real player. NPCs do not contribute damage after the initial seed. The "alliance" feature is non-functional for players who don't have 15+ active real friends. Requires either: (a) a solo-boss variant, (b) NPC members that contribute actual daily attacks (tick-based), or (c) a playerCount floor. Tuning hpMax alone doesn't solve the absence of daily NPC contributions.

### G3 — Four spawn multipliers compound without a cap

Hunt-waves applies multipliers in series: wave scaling × night scaling, then god-window scaling, then level scaling. There is no combined cap. At wave 7 late-stage, night mode, player level 8, past god window: lurker HP = 10 × 2.08 × 1.4 × 2.2 = **64 HP**. A lurker with 64 HP and a player dealing ~12 damage takes 6 hits — same as a mid-stage brute. This compressing of enemy identity (lurkers feel like brutes) is a feel problem, not just a number problem. Requires a `COMBINED_MULT_CAP` (e.g., 5.0×) applied before spawn, or separating which multipliers apply to which enemy tiers.

### G4 — Weapon pickup impermanence: every stage starts with branch_stick

In-stage pickups don't persist between stages. Any player without a meta ranged/pet slot equipped always starts with branch_stick (damage 6). The meta weapon unlock path isn't clear in the current build (no unlock tutorials for ranged/pet slots). Early-game players are silently penalized by their starting weapon becoming increasingly weak relative to scaling enemies. Fix requires either: (a) a one-time "keep your best pickup" mechanic (persist one pickup slot across stages), or (b) earlier exposure to the meta weapon upgrade path in the onboarding flow.

### G5 — Forge building upgrade cost vs passive income creates a 30–90 day progression gap

At L1 gold mine (100 coins/day casual cap), upgrading all buildings to L5 requires 12,160 coins = **122 days**. Even after the FLAG-03 fix (400 coins/day), that's 30 days to reach L5 across all buildings. The building progression and Hunt stage progression are decoupled — a player who reaches stage 12 in 2 weeks will have L1–L2 buildings, making Forge crafting inaccessible for weeks after combat progression implies it should be available. This requires either: (a) a building fast-track mechanic tied to stage progress (e.g., "clear stage 5, gold mine jumps to L3"), or (b) reducing the per-building upgrade cost curve significantly for levels 1–5 (e.g., halve the formula for levels 1–5: floor(40 + level² × 20)). This is architectural — a tunable change to the formula alone without a progression bridge solves the math but not the feeling.

---

*Total findings: 8 imbalance flags, 5 system-level gaps (13 total). Files surveyed: 13 JS source files + 1 state file.*

*Written by W-Balance-Audit, 2026-05-08.*
