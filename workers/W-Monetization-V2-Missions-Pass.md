# W-Monetization-V2-Missions-Pass

You are Worker — the **daily/weekly missions + Battle Pass scaffolding** worker. Sonnet 4 of 5 in Monetization V2.

Walk the birth sequence (`/Users/defimagic/Desktop/Hive/CLAUDE.md` → `Birth/01-04` → `THE_PRINCIPLES` → `HIVE_RULES` → `COLONY_CONTEXT` → `BEFORE_YOU_BUILD`).

Then read:
- `build-v2/CLAUDE.md` (Path A faithful clone)
- `BLUEPAPER.md v2 §7` (mission cadence + battle pass tier)
- `js/core/wg-state.js`
- `js/meta/meta-daily-reset.js` (from `W-Monetization-V2-Sub-Blockers` — subscribe to `daily:reset`)
- `js/meta/meta-iap.js` (add Battle Pass SKU)

## Concerns

### Concern A — Daily missions catalog + tracker

New file: `js/meta/meta-missions.js`. Daily missions catalog (~12-15 missions, system picks 5-7 per day):

```js
const DAILY_MISSIONS = [
  { id: 'kill_30',         desc: 'Kill 30 enemies',            target: 30,  reward: { gold: 100, gems: 5 } },
  { id: 'kill_100',        desc: 'Kill 100 enemies',           target: 100, reward: { gold: 300, energy: 10 } },
  { id: 'clear_2_stages',  desc: 'Clear 2 Hunt stages',        target: 2,   reward: { gems: 10 } },
  { id: 'clear_5_stages',  desc: 'Clear 5 Hunt stages',        target: 5,   reward: { gold: 500, gems: 15 } },
  { id: 'tower_floor_5',   desc: 'Reach Tower floor 5',        target: 5,   reward: { gems: 20, frags: 5 } },
  { id: 'win_3_duels',     desc: 'Win 3 Duel matches',         target: 3,   reward: { gold: 200, gems: 8 } },
  { id: 'craft_1',         desc: 'Craft 1 building',           target: 1,   reward: { gold: 150 } },
  { id: 'pull_relic',      desc: 'Pull 1 relic',               target: 1,   reward: { frags: 10 } },
  { id: 'pickup_50_orbs',  desc: 'Pick up 50 orbs',            target: 50,  reward: { gold: 100, energy: 5 } },
  { id: 'crit_10',         desc: 'Land 10 critical hits',      target: 10,  reward: { gems: 5 } },
  { id: 'combo_15',        desc: 'Reach 15 combo in a stage',  target: 15,  reward: { gold: 200, gems: 10 } },
  { id: 'level_up',        desc: 'Level up 1 character',       target: 1,   reward: { gold: 100 } },
  { id: 'buff_ad_watch',   desc: 'Watch 1 buff ad',            target: 1,   reward: { gems: 5 } },
];
```

System picks 5 random missions per day (deterministic from date+userId so refresh shows same set).

Track progress in `WG.State.get().missions = { date: 'YYYY-MM-DD', daily: { id1: { progress: 0, claimed: false }, ... } }`.

Hook event listeners for each mission id (e.g. `enemy:killed` → increment kill_30 + kill_100 progress).

### Concern B — Weekly missions catalog

Same shape, larger rewards, 3-5 weekly missions:

```js
const WEEKLY_MISSIONS = [
  { id: 'wk_kill_500',      desc: 'Kill 500 enemies this week', target: 500,  reward: { gold: 2000, gems: 50 } },
  { id: 'wk_clear_15_stages', desc: 'Clear 15 stages',          target: 15,   reward: { gems: 100, energy: 50 } },
  { id: 'wk_tower_floor_15', desc: 'Reach Tower floor 15',      target: 15,   reward: { gems: 200, rareMat: 1 } },
  { id: 'wk_duel_wins_15',   desc: 'Win 15 Duel matches',       target: 15,   reward: { gems: 80 } },
  { id: 'wk_chests_50',      desc: 'Open 50 treasure chests',   target: 50,   reward: { gold: 1500, gems: 60 } },
];
```

Weekly reset: Monday 00:00 local time.

### Concern C — Missions tab/modal UI

New tab OR modal accessed from existing `📋 TASKS` side icon in Hunt menu (currently a placeholder):
- Top: "DAILY" / "WEEKLY" tab pills
- List of active missions with progress bars
- Each mission row: icon + description + progress (e.g. "23/30") + reward icons
- "CLAIM" button when complete; greys after claim
- Bottom: "Resets in <countdown>" footer

Visual polish: completed missions glow gold, claimed missions strike-through.

### Concern D — Battle Pass scaffolding

New file: `js/meta/meta-battle-pass.js`. Season 1 starter:

```js
const SEASON_1 = {
  id: 'wraithgrove_s1',
  name: 'Whispering Pines',
  startDate: '2026-05-15',
  endDate: '2026-06-15',
  premiumSku: 'battle_pass_s1', // $9.99
  levels: 60,
  xpPerLevel: 100,
  freeTrack: [
    { level: 1,  reward: { gold: 100 } },
    { level: 5,  reward: { energy: 20 } },
    { level: 10, reward: { gems: 30 } },
    // ... 20 entries spread across 60 levels (every 3rd level)
  ],
  premiumTrack: [
    { level: 1,  reward: { gems: 50 } },
    { level: 2,  reward: { gold: 500 } },
    { level: 3,  reward: { frags: 10 } },
    // ... full 60 entries — premium tier rewards every level
  ],
};
```

Pass XP earned via:
- Daily mission complete: +50 XP
- Weekly mission complete: +200 XP
- Hunt stage clear: +20 XP
- Tower floor cleared: +5 XP
- Boss defeated: +100 XP

Persist `WG.State.get().battlePass = { season: 'wraithgrove_s1', xp: 0, level: 1, premium: false, claimedFree: [], claimedPremium: [] }`.

### Concern E — Battle Pass UI

New tab OR modal accessed from a new side icon in Hunt menu (replace one of the placeholder side icons with `🎟 PASS`):
- Top banner: season name + countdown to end
- Progress bar: current XP toward next level + level number
- Reward track grid: 60 cells, free + premium icons stacked per level
- Claimed cells dim, claimable cells pulse
- Bottom: "UNLOCK PREMIUM TRACK — $9.99" button (if not premium)
- Premium SKU added to `meta-iap.js`

### Concern F — Mission + pass event hooks

Wire all the relevant events: `enemy:killed` → kill_30/100 + wk_kill_500. `hunt:stage-clear` → clear_2/5 + wk_clear_15 + +20 BP XP. Etc.

Use a single dispatcher in `meta-missions.js` to avoid scattering listeners.

## Constraints

- All season data CONFIG-driven; designers can ship new seasons without code edits.
- Mission rewards generous — free players feel rewarded.
- Battle pass premium track is genuinely better than free, but free track is still meaningful (not insulting).
- DO NOT change existing rewards (stage clear, enemy kill XP, etc.) — additions only.

## OUTPUT DISCIPLINE (absolute paths)

Done marker: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/workers/done/W-Monetization-V2-Missions-Pass.done`

6 commits (A-F). Same git pattern.

## Test path

1. Daily missions populate on cold-load + change next day
2. Killing enemies progresses kill missions
3. Claim button works + grants reward
4. Battle pass tab opens, free + premium track visible
5. XP increments correctly from missions/clears
6. Premium SKU pops the IAP stub on tap
