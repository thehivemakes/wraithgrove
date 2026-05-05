# W-Tower-Gauntlet

You are Worker — the **Tower Gauntlet new mode** worker. Sonnet 2 of 5 in Monetization V2.

**BUILD-ON, NOT REPLACE.** Hunt 18 stages + Day/Night stay untouched. Tower is mode #2 — sits ALONGSIDE Hunt, both gated by the same energy system.

Walk the birth sequence (`/Users/defimagic/Desktop/Hive/CLAUDE.md` → `Birth/01-04` → `THE_PRINCIPLES` → `HIVE_RULES` → `COLONY_CONTEXT` → `BEFORE_YOU_BUILD`).

Then read:
- `build-v2/CLAUDE.md`
- `js/hunt/hunt-stage.js`, `hunt-waves.js`, `hunt-enemies.js`, `hunt-bosses.js` (you REUSE these — DO NOT modify them)
- `js/hunt/hunt-player.js` (combat tick — you'll fork a tower-version of the loop)
- `js/wg-game.js` (rAF loop — branch on mode: 'hunt' vs 'tower')
- `js/core/wg-state.js` (W-Monetization-V2-Energy added energy state — Tower also costs 5 energy to enter)

## Tower Gauntlet design (architect-locked)

**Loop:** 5 energy to ENTER. Run is free until death. Each floor: 60-90s of fast enemy waves + a mini-boss. Win → choose 1 of 3 buff cards → next floor. Infinite scaling.

**Pacing different from Hunt:** Hunt = fixed 5-7 min linear stages. Tower = 5-30 min depending on climb skill. ONE energy commit, variable session length.

**Dopamine pillars:**
1. Buff card reveal between floors (deck-builder satisfaction)
2. Personal-best floor tracker
3. Milestone reward chest every 5 floors
4. Leaderboard (top 100) — whale pressure
5. Soft monetization on death: "Continue from this floor? 1 gem (Floor 1-4) / 3 gems (5-9) / 5 gems (10+)"

## Concerns (ONE COMMIT EACH)

### Concern A — Tower runtime + state shape

New file: `js/hunt/hunt-tower.js`. Exports:
- `WG.HuntTower.startTower()` — deducts energy, builds tower runtime, switches to tower mode
- `WG.HuntTower.advanceFloor()` — clears current floor state, increments floor, applies selected buff, spawns next floor
- `WG.HuntTower.endRun()` — final summary, grants persistent rewards, returns to lobby
- `WG.HuntTower.tickFloor(dt)` — per-frame floor logic (parallel to Hunt's tick block in wg-game.js)

Tower runtime shape (parallel to huntRuntime):
```js
{
  mode: 'tower',
  floor: 1,
  buffStack: [],       // active buffs from card picks
  buffPickActive: false, // pause loop while card picker open
  player: <reuses HuntPlayer entity>,
  creatures: [], projectiles: [], enemyProjectiles: [],
  miniBoss: null,      // each floor has a mini-boss spawned at 70% time
  floorElapsed: 0,
  floorDuration: 75,   // seconds per floor (scales -2s per 5 floors, min 45s)
  totalElapsed: 0,
  kills: 0,
  goldEarned: 0,
  fragsEarned: 0,
}
```

### Concern B — Floor scaling formula + enemy spawning

New tunables on `WG.HuntTower.TUNABLES`:
- `BASE_HP_MULT = 1.0` (floor 1 enemies use Hunt-spec HP)
- `HP_MULT_PER_FLOOR = 0.18` (floor N enemies have HP × (1 + 0.18 × (N-1)))
- `DAMAGE_MULT_PER_FLOOR = 0.10`
- `SPEED_MULT_PER_FLOOR = 0.04` (caps at 1.6×)
- `XP_MULT_PER_FLOOR = 0.20` (kills give more XP at higher floors)
- `MINIBOSS_AT_FLOOR_PCT = 0.70` (mini-boss spawns at 70% of floor time)
- `MINIBOSS_HP_BASE = 200`
- `MINIBOSS_HP_PER_FLOOR = 30`

Spawn logic (mirrors Hunt waves but tighter):
- Spawn rate scales with floor: `BASE_SPAWN_RATE = 1.5 + 0.15 × floor`
- Enemy mix: pull from existing Hunt enemy catalog. Floors 1-3 use lurker/walker/sprite. Floors 4-7 add red_zombie/skull_swarmer. Floors 8-12 add caller/brute_small/wraith_fast. Floors 13-17 add jiangshi/samurai_grunt/pumpkin_lantern. Floor 18+ adds banshee (rare).
- Floor 5/10/15/20… mini-boss is a random pick from Hunt boss catalog (pale_bride / frozen_crone / autumn_lord / temple_warden / cave_mother / wraith_father). Don't modify the boss code — just spawn the existing entity.

### Concern C — Buff card catalog + per-floor pick UI

New file: `js/hunt/hunt-tower-buffs.js`. ~24 buff cards across 3 rarity tiers:

Common (60% spawn rate per slot):
- `damage_plus_15` — +15% melee/ranged damage
- `crit_plus_5` — +5% crit chance
- `hp_plus_25` — +25 max HP
- `magnet_plus_30` — +30% pickup magnet radius
- `move_plus_10` — +10% movement speed
- `wood_plus_1` — +1 starting wood per floor

Rare (30%):
- `damage_plus_30` — +30% damage
- `lifesteal_4` — 4% lifesteal on hit
- `crit_dmg_plus_50` — crit damage +50%
- `cooldown_minus_15` — skill cooldown -15%
- `proj_count_plus_1` — +1 projectile per attack
- `chest_drop_plus_10` — +10% treasure chest drop rate

Legendary (10%, only spawns floor 5+):
- `revive_once` — 1 free revive on death
- `lifesteal_15` — 15% lifesteal
- `damage_plus_60` — +60% damage
- `crit_plus_15` — +15% crit chance
- `phantom_strike` — every 3rd hit is auto-crit
- `floor_skip` — skip the next floor with full rewards

Buff stacking: each buff applies once. Same buff selected twice → upgraded variant (e.g. `damage_plus_15` × 2 = `damage_plus_30`).

Buff pick UI: full-screen overlay between floors:
- 3 cards face-up, arranged horizontally
- Each card: rarity-colored border + buff name + effect text + small icon
- Tap to choose → card flies to top + 200ms apply animation + advance to next floor
- Tower runtime sets `buffPickActive = true` while overlay open (pauses combat tick)

### Concern D — Floor-clear rewards + milestone chests

On floor clear, before buff picker:
- Grant gold: floor × 50 (running total in `goldEarned`)
- Grant frag chance: 25% per floor
- Show "Floor N CLEARED" celebration text + count-up

Every 5 floors (5/10/15/20…): milestone chest appears mid-screen:
- Big ornate gold chest (canvas-rendered, larger than treasure chest)
- Tap to open → loot reveal animation:
  - Floor 5: +20 gold + 1 gem + 1 frag
  - Floor 10: +50 gold + 3 gems + 5 frags
  - Floor 15: +100 gold + 5 gems + 10 frags + 1 rare mat
  - Floor 20+: +200 gold + 10 gems + 20 frags + 2 rare mats + 1 random LEGENDARY buff card pre-applied to current run
- Loot grants persist on death (so even a floor-21 death rewards meaningfully)

### Concern E — Death screen + continue prompt + run summary

On player death in Tower:
- 1.2s death animation (slow-mo + fade)
- "FLOOR <N> REACHED" overlay
- Continue prompt:
  - Floor 1-4: "Continue with full HP? 1 💎"
  - Floor 5-9: "Continue with full HP? 3 💎"
  - Floor 10+: "Continue with full HP? 5 💎"
  - Cap: max 2 continues per run (after 2nd, no continue offered)
- Buttons: [CONTINUE] gem-cost / [END RUN]
- On END RUN: full run summary screen:
  - Floor reached (with PEAK BEST tag if new record)
  - Total kills
  - Gold earned (auto-added to wallet)
  - Frags earned
  - Gems earned
  - Buffs collected (small icon row)
  - Buttons: [TRY AGAIN] (5 ⚡) / [BACK TO LOBBY]

Persist `peakFloor` on `WG.State.get().towerProgress.peakFloor`.

### Concern F — Tower entry from menu + tab-switching

In `js/wg-game.js` (Hunt menu): add a small TOWER button below the BATTLE button. Style:
- Smaller than BATTLE (60% size)
- Stone-grey color scheme (distinct from BATTLE's gold/red)
- Label: "⛰ TOWER"
- Subtitle: "Best Floor: <peakFloor>" or "First Climb"

Tap → check energy → start tower run via `WG.HuntTower.startTower()`.

In `wg-game.js` rAF loop: branch the per-frame logic on `huntRuntime?.mode`:
- `'hunt'` → existing Hunt tick
- `'tower'` → call `WG.HuntTower.tickFloor(dt)`
- null/missing → other tabs

Tower mode hides the lobby UI same as Hunt does (`document.body.classList.add('in-stage')`).

### Concern G — Leaderboard placeholder

Tower run summary shows a leaderboard preview:
- "TOP CLIMBERS" section
- For now: stub data array (5 fake entries with names + floor counts)
- Player's row highlighted: "YOU — Floor <peakFloor>"
- TODO comment: real leaderboard wired in Phase 4 (server sync)

## Constraints

- DO NOT MODIFY: hunt-enemies.js, hunt-bosses.js, hunt-stage.js, hunt-waves.js, hunt-player.js (you can READ from them, EXTEND state, but don't edit catalogs).
- Reuse Hunt's `WG.HuntPlayer.tick`, `WG.HuntEnemies.tickOne`, `WG.HuntBosses.tickBoss` — pass them the tower runtime instead of huntRuntime. They should work transparently because they read from runtime.player / creatures / boss.
- All new files: hunt-tower.js, hunt-tower-buffs.js, optional hunt-tower-render.js if visuals get heavy.
- Day/Night not relevant in Tower (tower is its own mode). Default to Night atmosphere for visual variety.

## OUTPUT DISCIPLINE (absolute paths)

Done marker: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/workers/done/W-Tower-Gauntlet.done`

7 commits (one per concern A-G). After each:
```
cd /Users/defimagic/Desktop/Hive
git add MobileGameResearch/wood-siege/build-v2/
git commit -m "W-Tower-Gauntlet <letter> — <description>"
git push
```

## Test path

After full landing:
1. Lobby — TOWER button visible below BATTLE
2. Tap TOWER → energy deducted → floor 1 starts
3. Kill enemies + mini-boss → floor clear → 3-card buff picker
4. Pick buff → floor 2 starts with buff applied
5. Reach floor 5 → milestone chest appears + opens
6. Die → continue prompt → end run → summary screen → peakFloor persisted
7. Re-enter Tower → confirm "Best Floor: 5" shows on TOWER button
