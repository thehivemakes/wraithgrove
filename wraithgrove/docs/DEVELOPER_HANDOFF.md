# DEVELOPER_HANDOFF.md — Codebase Orientation for New Developers

**Author:** W-Marketing-Launch-Pack-V2  
**Date:** 2026-05-08  
**Target reader:** A developer picking up Wraithgrove / Unlimited Chaos cold. No prior context required — this document is self-contained.  
**Companion reads:** `CLAUDE.md` (project rules), `STATE_OF_BUILD.md` (detailed feature log), `BUILD_PLAN.md` (worker task queue)

---

## §1 — What This Codebase Is

Wraithgrove (store name: **Unlimited Chaos**) is a single-file-HTML-first mobile ARPG built in vanilla JS. No frameworks. No build pipeline beyond `npm start` for the dev server. All game logic runs in the browser; the native iOS/Android app is a Capacitor shell wrapping the HTML.

**Tech stack:**
- Vanilla JS (ES6+, IIFE module pattern, no ESM)
- Canvas 2D (game rendering) + DOM (UI tabs, modals, overlays)
- Capacitor 6 (iOS/Android native wrap)
- Cloudflare Workers + Durable Objects (Phase 4 backend — stubs in v1.0)
- `localStorage` for save state (v1.0); cross-device sync planned for Phase 4

**Why no framework:** This was a deliberate constraint. Zero bundle time, zero dependency drift, open instantly in a browser. The tradeoff is that global namespace pollution is real — every module is on `window.WG.*`.

---

## §2 — File Map

All source files live under `build-v2/`. The native shells are in `ios/` and `android/`.

```
build-v2/
├── index.html              Entry point. Module loader. Canvas element. Tab nav DOM.
├── wg-game.js              Orchestrator. Init chain. rAF loop. All tab wiring.
├── js/
│   ├── core/               Foundation layer (load first)
│   │   ├── wg-engine.js    Event bus + tick driver. WG.Engine.emit() / on() / tick()
│   │   ├── wg-state.js     Global state schema, Power recompute, currency grant/spend
│   │   ├── wg-cache.js     localStorage save/load, dirty-flag autosave (3s throttle)
│   │   ├── wg-render.js    Particle system, HP bars, float text, screen clear utils
│   │   ├── wg-input.js     Virtual joystick + WASD fallback + skill trigger
│   │   ├── wg-display.js   Canvas resize hook
│   │   ├── wg-audio.js     Web Audio engine. 25 CC0 sounds. Fail-silent on missing files.
│   │   └── wg-i18n.js      i18n: init(code), t(key), setLocale(). 248 keys in locales/en.json
│   │
│   ├── meta/               Meta-progression layer (load after core)
│   │   ├── meta-account.js         Anonymous device-ID. Email upgrade stub.
│   │   ├── meta-events.js          Analytics event reporter stub. Phase 4 server POST.
│   │   ├── meta-iap.js             30+ IAP SKUs. purchase() stub (Phase 4: StoreKit / Play Billing)
│   │   ├── meta-ads.js             Rewarded video + interstitial stubs. 50 RV/day cap.
│   │   ├── meta-gacha.js           Standard summon pool + locked rift_guests pool. Pity system.
│   │   ├── meta-shop.js            Fullscreen Shop modal. 5 sections.
│   │   ├── meta-compliance.js      Age gate, pre-purchase confirm, gacha disclosure.
│   │   ├── meta-leaderboard.js     submit/top/meAndAround stubs. Phase 4 server swap.
│   │   ├── meta-missions.js        Daily (13 catalog / 5 active) + weekly (5) missions. BP XP.
│   │   ├── meta-battle-pass.js     60-level season engine. Free + premium tracks.
│   │   ├── meta-achievements.js    21-entry permanent catalog. Event-wired. Claim flow.
│   │   ├── meta-daily-rewards.js   7-day streak grid. Claim fly animations.
│   │   ├── meta-daily-reset.js     Daily reset timer. Fires daily:reset event.
│   │   ├── meta-energy-modal.js    Energy refill modal.
│   │   ├── meta-ltd-events.js      Limited-time events. 3 hardcoded events, hourly poll.
│   │   ├── meta-onboarding.js      First-launch 3-screen overlay + character pick.
│   │   ├── meta-buffs.js           Buff stack reader. Used by systems that apply buffs.
│   │   ├── meta-alliance.js        Alliance create/join/leave/roster. WG.Alliance.
│   │   ├── meta-alliance-boss.js   3-day co-op boss event. 4-boss cycle. Contribution tracking.
│   │   ├── meta-alliance-chat.js   Alliance chat stub.
│   │   ├── meta-alliance-missions.js  Alliance mission catalog.
│   │   ├── meta-alliance-notifications.js  Badge state module. Red dots on alliance sub-tabs.
│   │   ├── meta-alliance-recruitment.js   Application queue. Officer approve/reject flow.
│   │   ├── meta-alliance-render.js  Full alliance panel DOM. War sub-tab. Boss sub-tab.
│   │   ├── meta-alliance-war.js    Weekly war state machine. NPC matchmaking. Raid sim.
│   │   └── meta-capture-hill-match.js  Capture Hill mode match resolver.
│   │
│   ├── hunt/               Hunt (arena) game module
│   │   ├── hunt-stage.js        18 stages × 6 biomes. Stage catalog.
│   │   ├── hunt-weapons.js      14 weapons. Combat catalog.
│   │   ├── hunt-enemies.js      5 enemy types. HP/damage/speed/AI flags.
│   │   ├── hunt-bosses.js       6 bosses. Attack patterns, phase transitions.
│   │   ├── hunt-waves.js        Wave spawner. Ramp curve. Night Mode multipliers.
│   │   ├── hunt-player.js       Auto-attack, level-up boons, torch system, Fever Mode.
│   │   ├── hunt-results.js      End-of-stage modal. NEXT/RETRY/+2× ad button.
│   │   ├── hunt-render.js       Top-down camera, tile renderer, HUD, night overlay, Fever tint.
│   │   ├── hunt-fxnumbers.js    Floating damage/XP/coin numbers. World-anchored.
│   │   ├── hunt-tower.js        Tower Gauntlet mode. Floor engine. Buff picker. Death/continue.
│   │   ├── hunt-tower-buffs.js  24 buff cards. Weighted roll. Apply mutates runtime.
│   │   └── hunt-tower-render.js Stone temple background painter. Tier color shifts by floor.
│   │
│   ├── ascend/             Character progression module
│   │   ├── ascend-character.js  Level-up, 7-tier ascension, Cultivate (diamond spend).
│   │   ├── ascend-skins.js      8 skins. Path-A power-relevant scaling.
│   │   ├── ascend-equipment.js  3 equipment slots (Melee/Ranged/Pet). Unlock costs.
│   │   ├── ascend-stats.js      5 upgradable stats. Coin cost per rank.
│   │   └── ascend-render.js     Ascend tab DOM. Portrait + stat rows + Power total.
│   │
│   ├── forge/              Idle base + crafting module
│   │   ├── forge-buildings.js   8-slot grid. Idle coin generator. GS-gated unlock flow.
│   │   ├── forge-craft.js       10-batch crafting. RNG drop table. Daily cap.
│   │   ├── forge-daily.js       24h daily chest. 7-day streak tracker (48h grace).
│   │   └── forge-render.js      Forge tab DOM. Diorama canvas. Building grid. Craft modal.
│   │
│   ├── relics/             Gear gacha-adjacent module
│   │   ├── relics-catalog.js    48 relics × 5 rarities. Stat + value + icon.
│   │   ├── relics-collection.js Owned-list aggregation. Equipped stat bonus computation.
│   │   ├── relics-equip.js      Max-6 active relics. Equip/unequip. Aggregate refresh.
│   │   └── relics-render.js     Relics tab DOM. Rarity filter strip. Grid. Forge CTA.
│   │
│   └── duel/               Async PvP module
│       ├── duel-roster.js   Opponent generator. Power-matched ±20%.
│       ├── duel-rank.js     7 ranked tiers. RP delta calc.
│       ├── duel-match.js    Async match resolver. Reward grant. Daily quota.
│       └── duel-render.js   Duel tab DOM. Rank icon. Match + result modals.
│
├── locales/
│   └── en.json             248 i18n keys. English baseline.
│
├── images/
│   ├── portraits/          9 character portraits (.png). Animated WebP if available.
│   └── ...                 Biome art, banner assets, etc.
│
├── audio/                  25 CC0 .mp3 files. Ambient tracks + SFX.
│
├── legal/                  privacy.html, terms.html (Architect fill markers for entity name)
│
├── docs/                   This file and all other project documentation.
│
├── workers/                Worker prompt queue and done markers.
│   └── done/               Zero-byte .done files mark completed workers.
│
└── audits/                 Audit reports filed by auditor workers.
```

---

## §3 — Module Conventions

Every module follows the same pattern. Deviating will break the global namespace.

```js
// js/hunt/hunt-example.js
(function () {
  'use strict';

  // All state in this module (not shared state — that lives in WG.State.get())
  let _runtime = null;

  // Public API
  window.WG = window.WG || {};
  window.WG.HuntExample = {

    init: function () {
      // Called once by wg-game.js in the init chain.
      // Subscribe to events here, not in the module body.
      WG.Engine.on('hunt:stage-start', _onStageStart);
    },

    doThing: function (param) { ... },
  };

  function _onStageStart(data) {
    // Private handlers prefixed with underscore.
  }

})();
```

**Rules:**
1. **IIFE with `'use strict'`** — always, no exceptions.
2. **One global on `window.WG`** — e.g. `window.WG.HuntExample`. No sub-namespacing beyond the two-part name.
3. **`init()` for lifecycle** — `wg-game.js` calls `init()` on every module in dependency order during boot. Put event subscriptions in `init()`, not in the IIFE body (IIFE runs before the engine is ready).
4. **Read state via `WG.State.get()`** — never cache a reference to the state object. Always call `.get()` fresh.
5. **Emit analytics via `WG.Events.track(name, data)`** — every player action worth measuring goes here.
6. **Add new files to `index.html` MODULES list** in dependency order (core first, then meta, then hunt/ascend/forge/relics/duel, then `wg-game.js` last).

---

## §4 — Deploy Steps

### Local development

```bash
cd build-v2
npm install          # first time only
npm start            # starts dev server at http://localhost:3996/
```

The Claude Code IDE `launch.json` entry named `wraithgrove` points to `localhost:3996`. Alternatively, open the URL directly in Chrome.

**Verify after any code change:**
1. Open the URL in Chrome. No console errors.
2. `Object.keys(window.WG)` in the console — confirm all module names are present.
3. Enter a Hunt stage. Confirm gameplay runs.

**Syntax check (no browser required):**
```bash
node --check js/hunt/hunt-example.js
```
Run this on every file you touch before committing.

### iOS (Capacitor)

```bash
npx cap sync ios
npx cap open ios
```

Xcode opens. Select a simulator or device. Run. The app shell loads `index.html` from `www/`.

**Before opening Xcode:** copy the `www/` output. Capacitor copies the web assets from `www/` to the native project. If your changes are in `build-v2/` but not synced to `www/`, the native app runs an old version.

### Android (Capacitor)

```bash
npx cap sync android
npx cap open android
```

Android Studio opens. Run on device or emulator.

### Web (Cloudflare Pages — Phase 4)

The Phase 4 backend plan: Cloudflare Workers at `api.wraithgrove.com` (or equivalent), Durable Objects for server state. The frontend is deployed as a static site to Cloudflare Pages from `www/`. The `meta-events.js`, `meta-leaderboard.js`, and `meta-account.js` modules activate when `WG.Config.SERVER_BASE_URL` is set to the live Worker URL.

Set `WG.Config.SERVER_BASE_URL = 'https://api.wraithgrove.com'` in `index.html` once the backend is live.

---

## §5 — State Schema

The full save state lives at `localStorage.wg_save_v2`. Read/write through `WG.State.get()` and the currency/grant APIs. Never write to `localStorage` directly — use `WG.Cache.markDirty()` after mutations and the autosave throttle handles persistence.

```js
WG.State.get() = {
  // Character progression
  character: {
    id: 'lantern_acolyte',      // active character id
    level: 1,
    xp: 0,
    ascensionTier: 0,           // 0–7
    equippedSkinId: null,
    ownedSkins: [],
    ownedCharacters: ['lantern_acolyte'],
  },

  // Currencies
  currencies: {
    coins: 50,                  // primary currency
    diamonds: 0,                // premium currency (earned + purchased)
    craftFragments: 0,          // feeds forge crafting
    gems: 0,                    // gacha / shop currency
    alliancePoints: 0,
  },

  // Equipment slots (3)
  equipment: {
    melee: null,
    ranged: null,
    pet: null,
  },

  // Stat upgrades
  stats: {
    attack: 0, hpMax: 0, defense: 0, crit: 0, gather: 0,
  },

  // Forge
  forge: {
    buildings: {},              // buildingId → { level, unlockedAt }
    lastDailyChestKey: null,    // YYYY-MM-DD key
    streakDay: 1,               // 1–7
    lastCraftAt: 0,             // timestamp
    dailyCraftCount: 0,
  },

  // Relics
  relics: {
    owned: [],                  // array of { id, rarity }
    equipped: [],               // max 6 relic ids
  },

  // Hunt progress
  hunt: {
    highestStageCleared: 0,
    gearScore: 0,               // derived on recomputePower()
  },

  // Tower Gauntlet
  towerProgress: {
    peakFloor: 0,
  },

  // Duel
  duel: {
    rank: 'bronze',
    rankPoints: 0,
    dailyDuels: 0,
    lastDuelKey: null,
  },

  // Missions + Battle Pass
  missions: {
    daily: {},                  // missionId → { progress, claimed, dayKey }
    weekly: {},                 // missionId → { progress, claimed, weekKey }
    event: {},
  },
  battlePass: {
    level: 0,
    xp: 0,
    premium: false,
    claimedFree: [],
    claimedPremium: [],
  },

  // Achievements
  achievements: {},             // id → { progress, unlockedAt, claimed }

  // Daily reward
  meta: {
    dailyReward: {
      streakDay: 1,
      lastClaimKey: null,
      claimedToday: false,
    },
  },

  // Alliance
  alliance: {
    id: null, name: null, memberIds: [], role: 'member',
    points: 0,
  },
  allianceWar: {
    phase: 'idle',
    currentMatch: null,
    history: [],
  },
  allianceBoss: {
    cycleIndex: null,
    hpMax: null, hpRemaining: null,
    contributions: {},          // playerId → damage dealt
    rewardsGranted: false,
  },

  // Gacha pity counters
  gacha: {
    pity: { standard: { pulls: 0, guaranteedLegendary: 30, guaranteedMythic: 100 } },
  },

  // Subscriptions
  subscriptions: {
    royalPass: false,
    battlePassPremium: null,    // 'wraithgrove_s1' or null
  },

  // Rift (late-game)
  rift: {
    sigils: 0,
  },

  // Event buffs (recomputed on init, not persisted)
  eventBuffs: {},

  // Progressive tab unlock
  tabs: {
    hunt: true,
    ascend: false,              // unlocks at Stage 0 clear
    forge: false,               // unlocks at Stage 2 clear
    relics: false,              // unlocks at Stage 5 clear
    duel: false,                // unlocks at Stage 8 clear
  },

  // Onboarding
  firstLaunch: true,
  firstLaunchStep: 0,
};
```

**Power computation:** Call `WG.State.recomputePower()` after any change to level / equipment / buildings / relics. Power is never cached — it reads the current state every call. The result is exposed via `WG.State.get().power` (set by recomputePower).

---

## §6 — How to Add New Content

### Add a new enemy type

1. Open `js/hunt/hunt-enemies.js`.
2. Add an entry to `WG.HuntEnemies.TYPES`:
   ```js
   new_enemy: {
     hp: 4,
     damage: 2,
     speed: 2.0,         // cells per second
     reward: 10,         // gold on kill
     xpReward: 8,
     size: 18,           // draw radius in px
     priority: 'hero',   // 'throne' | 'hero' | 'tower'
     ranged: false,
   }
   ```
3. Add the enemy `id` to the `enemyMix` array for the relevant stages in `js/hunt/hunt-stage.js`.
4. If the enemy needs a unique render (beyond the default circle), add a draw case in `hunt-render.js` `drawCreatures()`.
5. `node --check js/hunt/hunt-enemies.js js/hunt/hunt-stage.js js/hunt/hunt-render.js` — all pass.

### Add a new relic

1. Open `js/relics/relics-catalog.js`.
2. Append to the `CATALOG` array:
   ```js
   {
     id: 'shadow_spine',
     name: 'Shadow Spine',
     rarity: 'rare',      // common | rare | epic | legendary | mythic
     stat: 'attack',      // which stat it boosts
     value: 18,           // magnitude of the boost
     icon: '🦴',          // or a path to an image
     desc: 'A spine left by a dissolved walker.',
   }
   ```
3. No other files need changing — the relic auto-appears in crafting drop tables and the Relics tab grid.

### Add a new character

1. Add the character entry to `WG.State.CHARACTER_DATA` in `js/core/wg-state.js`:
   ```js
   new_character: {
     id: 'new_character',
     name: 'Character Name',
     rarity: 'rare',
     basePower: 120,
     startWeapon: 'iron_blade',
     skillId: 'light_burst',
     lore: 'One sentence of lore.',
   }
   ```
2. Add a portrait PNG to `images/portraits/new_character.png` (512×512 recommended). If an animated WebP exists, place it at `images/portraits/anim/new_character.webp`.
3. Add the character id to the Gacha standard pool in `js/meta/meta-gacha.js` `STANDARD_POOL`.
4. Add an i18n key for the character name in `locales/en.json`.

### Add a new building (Forge)

1. Open `js/forge/forge-buildings.js`.
2. Add an entry to `WG.ForgeBuildings.DEFS`:
   ```js
   {
     id: 'watchtower',
     name: 'Watchtower',
     icon: '🗼',
     unlockGS: 3000,       // Gear Score gate (or 0 for always-unlocked)
     baseIncome: 8,        // idle coins per tick
     maxLevel: 5,
     upgradeCost: function(level) { return level * 400; },
   }
   ```
3. The building auto-appears in the Forge grid and unlock flow — no render changes needed unless you want a unique diorama element.

### Add a new daily or weekly mission

1. Open `js/meta/meta-missions.js`.
2. Add to `DAILY_CATALOG` (for daily) or `WEEKLY_CATALOG` (for weekly):
   ```js
   {
     id: 'kill_brutes_5',
     title: 'Fell 5 Brutes',
     desc: 'Kill 5 brute enemies in any Hunt stage.',
     event: 'enemy:killed',
     filter: function(data) { return data.type === 'brute_small'; },
     target: 5,
     reward: { coins: 300, bpXp: 50 },
   }
   ```
3. `WG.Engine.emit('enemy:killed', { type, ... })` is already fired by `hunt-enemies.js` on kill. The missions system listens to `WG.Engine.on('enemy:killed', ...)` and calls `filter(data)` to route progress to the correct mission. No other wiring required.
4. For entirely new events: fire `WG.Engine.emit('your:event', data)` from the relevant module, then subscribe in `meta-missions.js init()`.

---

*Filed by W-Marketing-Launch-Pack-V2, 2026-05-08.*
