# DAYNIGHT_ARCHITECTURE.md — Wraithgrove Day/Night Cycle + Gather-Build-Defend Loop

**Author:** Worker DN (W-DayNight-Architecture)  
**Date:** 2026-04-28  
**Status:** SPEC — design only. No code. Implementing workers paste from this doc.  
**Source authority:**
- `observation/HD_SOURCE_OBSERVATIONS_2026-04-28.md` §A, §C, §D, §E, §G (primary visual ground truth)
- `GAMEPLAY_OBSERVATION.md` §3 (structural loop)
- `build-v2/STATE_OF_BUILD.md` (current disk state)
- `build-v2/CLAUDE.md` (project rules)

---

## 0 — Why This Doc Exists

The current Wraithgrove build (STATE_OF_BUILD.md, 2026-04-27) is a working top-down auto-attack arena with 36 modules, 18 stages, and all five meta tabs. What it is missing is the game's core hybrid loop. HD_SOURCE_OBSERVATIONS §A is unambiguous:

> *"Wood Siege is NOT a pure survival arena ARPG. It is a gather-build-defend hybrid with a day/night cycle."*

Missing mechanics confirmed by HD source:
- Day/night cycle (`HD_SOURCE §A, §G`)
- Construction site system (Turret, Campfire) with wood-cost progress (`HD_SOURCE §D`)
- Tree-chopping resource gather (`HD_SOURCE §A, §D`)
- Battery resource with 0/4 HUD counter (`HD_SOURCE §A` — screenshot_4 night-mode HUD)
- Wave-bounded 5-wave stage structure (`HD_SOURCE §A, §C`)
- Night enemy roster: pumpkin-headed monsters (`HD_SOURCE §E` — partially done, `pumpkin_lantern` in TYPES)

These are not polish. They are the game. This architecture doc specifies all of them at function-signature level.

---

## 1 — State Machine

### 1.1 States

Five states govern the in-stage lifecycle:

| State | ID string | Description |
|---|---|---|
| Day | `'day'` | Chop trees, build structures, fight light day spawns |
| Dusk Warning | `'dusk_warning'` | Day ending — 10s visual/audio warning, chopping still allowed |
| Night | `'night'` | MONSTERS ATTACK — pumpkin wave; no building; structures defend |
| Dawn | `'dawn'` | Brief 5s transition; day enemies cease; screen lightens |
| Wave Intermission | `'wave_intermission'` | 8s rest between waves; player heals partially |

### 1.2 Transition Model: Wave-Bounded

**Decision:** Wave-bounded transitions, not pure real-time clock.

**Reasoning grounded in HD source:**
- HD §C shows numbered wave dots "1 2 3 4 5" — each dot is a discrete wave unit, not a time slice.
- HD §A shows a hard modal transition to "NIGHT MODE — MONSTERS ATTACK" — a discrete flip, not a gradient.
- "Highest Wave Reached: X/5 Waves" (HD §C) treats wave as the primary progression unit.
- Wave-bounded is also more predictable for the player: "when the day phase ends, night starts" — no timer ambiguity.

Each wave = one full cycle: `day → dusk_warning → night → dawn → wave_intermission`.  
After wave 5's intermission: stage ends (success) or boss remains (special handling — see §4.4).

### 1.3 Per-Wave Timing Table

All durations in seconds. These are tunables — stored in `HuntDayNight.WAVE_CONFIG`, never hardcoded in render or orchestrator.

| Wave | `day_s` | `dusk_warning_s` | `night_s` | `dawn_s` | `intermission_s` | Total |
|---|---|---|---|---|---|---|
| 1 | 55 | 10 | 30 | 5 | 8 | 108 |
| 2 | 50 | 10 | 35 | 5 | 8 | 108 |
| 3 | 45 | 10 | 42 | 5 | 8 | 110 |
| 4 | 40 | 10 | 52 | 5 | 8 | 115 |
| 5 | 35 | 10 | 65 | 5 | 0 | 115 |

Wave 5 has no intermission — night ends only when the wave boss is killed or the player dies. If the boss was spawned by wave 5 night start, `dawn` does not trigger until boss HP = 0.

### 1.4 Per-State Allowed Actions

| Action | `day` | `dusk_warning` | `night` | `dawn` | `wave_intermission` |
|---|---|---|---|---|---|
| Player movement | ✓ | ✓ | ✓ | ✓ | ✓ |
| Auto-attack (day enemies) | ✓ | ✓ | — | — | — |
| Auto-attack (night enemies) | — | — | ✓ | — | — |
| Chop trees for wood | ✓ | ✓ | — | — | — |
| Build construction site | ✓ | ✓ | — | — | — |
| Weapon pickups (HuntPickups) | ✓ | ✓ | ✓ | — | — |
| Partial HP regen (0.5 HP/s) | — | — | — | — | ✓ |
| Level-up boon draft | ✓ | ✓ | ✓ | — | ✓ |
| Skill use | ✓ | ✓ | ✓ | — | — |

### 1.5 Event Bus Events on Transitions

All events emitted via `WG.Engine.emit(name, payload)`.

| Transition | Event name | Payload |
|---|---|---|
| → `day` | `'day:start'` | `{ wave: N, stageId }` |
| → `dusk_warning` | `'dusk:warning'` | `{ wave: N, secondsLeft: 10 }` |
| → `night` | `'night:start'` | `{ wave: N, stageId }` |
| → `dawn` | `'dawn:start'` | `{ wave: N }` |
| → `wave_intermission` | `'wave:intermission'` | `{ wave: N, nextWave: N+1 }` |
| Wave 5 night ends (boss dead) | `'stage:victory'` | `{ stageId, wavesCompleted: 5 }` |
| Player dies | `'stage:defeat'` | `{ stageId, waveReached: N }` |
| Construction built | `'building:built'` | `{ slotId, type, wave: N }` |
| Construction destroyed | `'building:destroyed'` | `{ slotId, type, wave: N }` |

Subscribers in `HuntDayNight.init()` also listen to `'night:start'` to clear day-enemy spawn queue and activate night spawn cadence. `'dawn:start'` clears night spawn queue.

---

## 2 — Resource Economy

### 2.1 Wood

**Source:** Confirmed in HD §A ("chop trees for wood"), §D ("Turret 0/4, Campfire 0/30" cost bars).

**Gather mechanic:**
- Resource nodes (trees + stumps) are placed on the stage map at positions defined in `HuntStage.STAGES[id].resourceNodes` (see §5.1.1 for schema).
- Player within 36px of a node during `day` or `dusk_warning` → auto-chops at rate `CHOP_RATE_PER_S` (base 2.0 wood/s, modified by `Logging Speed` Ascend stat).
- Each node has `woodRemaining` units (initial value varies by node type: `tree` = 12, `stump` = 4).
- When `woodRemaining` reaches 0: node becomes a depleted stump (visual change, no more wood).
- Wood appears as floating pickups at the node's position → auto-collected by player magnet (same `pickupRadius` used by XP orbs).
- Collected wood → `runtime.resources.wood` (integer). **Not persisted across stages.**

**Stack max:** 60. Enforced at collection time. Overflow drops are not collected.

**HUD surfacing:** Top-left resource strip alongside coins. Icon: brown axe-and-log glyph. Counter: `W: NN`.

**Catalog table location:** `HuntResources.RESOURCE_CONFIG.wood` in `js/hunt/hunt-resources.js`.

### 2.2 Battery

**Source:** "Battery 0/4" HUD counter confirmed in HD §A (screenshot_4 night-mode view). HD §H.5 notes function is uncertain; this spec resolves it.

**Decision:** Battery is a collectible in-stage resource (max 4) that powers built structures during the night phase. Batteries are scattered as pickups on the stage map and also generated slowly by a built Campfire during day (1 battery per day phase while Campfire is active).

**Rationale:** This creates strategic tension between the two buildable structures: Turret (offensive, cheap) uses a battery at night to fire; Campfire (expensive, 30 wood) both generates batteries during day and uses one to power its light radius at night. A player who builds both structures but has only 1 battery must choose which to power. This is consistent with the "LOG & BUILD EXPAND OUTPOST" pressure described in HD §K.

**Gather mechanic:**
- Battery pickups: 1–2 per stage, placed at `resourceNodes` entries with `type: 'battery'`.
- Auto-collected on proximity (same `pickupRadius` as wood orbs).
- Campfire generation: while built and day/dusk phase active → `+1 battery` per full day phase (minimum: at least 20s of day phase elapsed).

**Stack max:** 4. Hard cap — overflow is lost.

**Consumption:**
- `night:start` event: each built, powered structure checks if `runtime.resources.battery > 0`. If yes: `battery -= 1`, structure sets `powered = true`. If no battery available: structure sets `powered = false` (turret doesn't fire; campfire has no light radius).
- Priority on insufficient battery: Campfire first, then Turrets in order built. (Rationale: Campfire's light radius is survivability; turret is offense. Prioritize survival.)

**HUD surfacing:** Top-left strip. Icon: battery cell glyph. Counter: `🔋 N/4` (or text `BAT: N`).

**Catalog table location:** `HuntResources.RESOURCE_CONFIG.battery` in `js/hunt/hunt-resources.js`.

### 2.3 Coins

Coins already exist in `WG.State.get().currencies.coins`. Kill-based coin drops are wired in `hunt-waves.js`. No new architecture needed for coins. The day/night system should NOT change coin drop rates — that's a tuning concern outside this scope.

---

## 3 — Construction Sites

### 3.1 Stage Schema Addition

Each stage in `HuntStage.STAGES` gains a new `constructionSlots` array. This array is added in `hunt-stage.js` — one entry per buildable site on that stage's map.

**Slot schema:**
```
{
  id: 'slot_1',              // unique within stage
  type: 'turret',            // 'turret' | 'campfire' | (future types)
  mapXFrac: 0.35,            // position as fraction of mapW (0..1)
  mapYFrac: 0.55,            // position as fraction of mapH (0..1)
}
```

Position as fraction avoids hardcoding pixel values. The runtime resolves to absolute coords via `mapW * mapXFrac`.

**Example Stage 1 slots (Lantern Vigil, forest_summer):**
- Slot 1: turret at (0.35, 0.50)
- Slot 2: campfire at (0.65, 0.30)

Stage 1 has exactly 2 slots (tutorial-friendly). Later stages may have 3–4 slots. Total buildable slots per stage is a designer judgment — not derived from source (HD §H.2 open question).

### 3.2 Runtime Site State

`runtime.buildingSites` is an array initialized by `HuntBuildings.spawnForStage(runtime, stage)`. Each entry:
```
{
  id: 'slot_1',
  type: 'turret',
  x: 280,                    // resolved from mapXFrac * mapW
  y: 400,                    // resolved from mapYFrac * mapH
  progress: 0.0,             // 0..1 — fill rate = chop progress
  built: false,
  powered: false,
  hp: 0,
  maxHp: 0,                  // set when built, from BUILDING_TYPES catalog
  _buildTimer: 0,            // tracks active build animation (0.5s)
}
```

### 3.3 Build Activation Flow

**No menu required.** Build is proximity-triggered during day phase.

1. Player within 40px of site center **AND** `runtime.phase === 'day' OR 'dusk_warning'`.
2. If `runtime.resources.wood < siteCost(site.type)`:  
   → Render the site progress bar in red ("insufficient wood" state). No building occurs.  
3. If `runtime.resources.wood >= siteCost(site.type)` AND `site.built === false`:  
   → Deduct cost: `runtime.resources.wood -= siteCost(site.type)`.  
   → Set `site.progress = 0`, `site._buildTimer = 0`.  
   → Over next 0.5s (`_buildTimer`): site.progress animates from 0 → 1.  
   → At progress = 1: `site.built = true`; set `site.hp = site.maxHp` (from catalog); emit `'building:built'`.  
4. If `site.built === true`: ignore proximity (site is already built).

**Wood cost table (BUILDING_TYPES catalog in `hunt-buildings.js`):**

| Type | `wood_cost` | `hp` | Description |
|---|---|---|---|
| `turret` | 4 | 40 | Auto-shoots nearest enemy within 180px; fires every 1.8s; 12 damage/shot. Requires 1 battery at night start. |
| `campfire` | 30 | 80 | Light radius 120px at night (fog pushed back). Generates +1 battery per day phase. Requires 1 battery at night to activate light. |

These values are in the BUILDING_TYPES table, never in render code.

### 3.4 Structure Targeting (Night Enemies)

**Decision: built structures can be destroyed by night enemies.**

Rationale: "defending them is the game" — per HD §D: "buildings fight alongside them." If buildings couldn't die, there's no reason to defend them. This is the Don't-Starve / They-Are-Billions structural hook.

**Enemy targeting extension (see §5.3 for code changes):**  
`pickTarget(creature, runtime)` in `hunt-enemies.js` currently returns `runtime.player` always. Extending it:

```
pickTarget(creature, runtime):
  candidates = [runtime.player, ...runtime.buildingSites.filter(s => s.built && s.hp > 0)]
  if candidates.length === 1: return player
  // Night only: 30% chance to target nearest built structure if within 250px
  if runtime.phase === 'night':
    nearStructures = candidates.filter(s => s !== player && dist(creature, s) < 250)
    if nearStructures.length > 0 AND Math.random() < 0.30:
      return nearest(nearStructures)
  return player
```

**Structure damage and death:**
- `HuntBuildings.takeDamage(siteId, amount)` — reduces `site.hp`.
- When `site.hp <= 0`: `site.built = false`, `site.powered = false`, `site.hp = 0`; emit `'building:destroyed'`.
- Destroyed sites can be rebuilt in the next day phase (full cost again).

### 3.5 Visual Rendering (handled in hunt-render.js — see §6.3)

Sites render in three visual states:
1. **Unbuilt:** dashed circle + name label above + resource cost bar (wood progress). Bar is green if player can afford, red if not.
2. **Building:** dashed circle animates to solid; progress arc fills over 0.5s.
3. **Built:** Structure sprite (turret = small cannon silhouette; campfire = flame glyph). HP bar below if damaged.

---

## 4 — Wave Structure

### 4.1 5-Wave Confirmed

HD §A: "Highest Wave Reached: X/5 Waves." HD §C: numbered dots "1 2 3 4 5". 5 waves per stage is ground truth.

### 4.2 Wave Lifecycle Per Wave

```
Wave N lifecycle:
  [day:start emitted]
  → day phase (day_s from WAVE_CONFIG[N])
  [dusk:warning emitted at 10s before end of day]
  → dusk_warning (10s)
  [night:start emitted]
  → night phase (night_s from WAVE_CONFIG[N])
    (if wave 5 and boss not killed: night extends until boss HP = 0)
  [dawn:start emitted]
  → dawn (5s)
  [wave:intermission emitted (waves 1-4 only)]
  → intermission (8s) — partial heal, no enemies
  [day:start emitted for wave N+1 OR stage:victory]
```

### 4.3 Spawn Cadence Per Phase

**Day phase spawns (light enemies):**
- Uses enemy mix from `stage.enemyMix` (existing catalog) — excludes `pumpkin_lantern`.
- Spawn rate: low during day (0.3 enemies/s early, 0.8 enemies/s in dusk_warning).
- Day is primarily a prep phase; too many day enemies would prevent building.

**Night phase spawns (pumpkin wave):**
- Enemy type: `pumpkin_lantern` exclusively (per HD §E: "pumpkin-headed monsters — folk-horror Halloween register, very specific visual identity"; per W-Pumpkin-Sprite commit: type already in `HuntEnemies.TYPES`).
- Spawn rate table by wave:

| Wave | Night spawn rate (enemies/s) | Max simultaneous |
|---|---|---|
| 1 | 0.8 | 6 |
| 2 | 1.0 | 8 |
| 3 | 1.3 | 10 |
| 4 | 1.6 | 14 |
| 5 | 2.0 | 20 |

- Night spawn positions: all four edges of map (same edge logic as `spawnOne` in `hunt-waves.js`).
- Night enemies always spawn a minimum 220px from player (prevent instant contact on spawn).

**Wave_intermission:**
- No spawns.
- All living `pumpkin_lantern` creatures despawn (fade-out effect — emit `'creature:despawn'` per creature).
- Day enemies also despawn.
- Player regen: `+0.25 * maxHp` over the 8s intermission (total +25% heal per intermission).

### 4.4 Boss Placement

**Decision:** Boss spawns on wave 5 night phase only, not at end of timer.

Reasoning: HD §A shows 5 waves — the final night is the boss siege. Each boss in the existing catalog maps to a stage cluster (pale_bride for stages 1-3, etc.). The boss for a given stage is `stage.bossId`.

**Boss spawn trigger:** `night:start` event fires on wave 5 → `HuntDayNight` calls `HuntWaves.spawnBoss(runtime, stage)` immediately (not at 100% timer). Boss HP bar appears. Day enemies and pumpkin_lantern both active during wave 5 night.

**Boss death → stage end:** `'boss:defeated'` event → `HuntDayNight` transitions to `dawn` (waiving remaining night duration) → stage_victory fires after 5s dawn.

---

## 5 — Module Layout

### 5.1 New Files

#### 5.1.1 `js/hunt/hunt-daynight.js` — `WG.HuntDayNight`

Manages state machine. All phase transitions, timers, spawn orchestration calls.

```js
WG.HuntDayNight = {
  init(),                           // subscribe to engine events; no-op if already inited
  startStage(runtime, stage),       // called by wg-game.js on Hunt stage launch; sets wave=1, state='day'
  tick(runtime, dt),                // called every frame from wg-game.js Hunt loop
  getPhase(runtime),                // returns runtime.phase (string)
  getWave(runtime),                 // returns runtime.wave (1-5)
}
```

**Internal state stored on `runtime`:**

```
runtime.phase           string — 'day'|'dusk_warning'|'night'|'dawn'|'wave_intermission'
runtime.wave            int 1-5
runtime.phaseTimer      float — seconds remaining in current phase
runtime.nightSpawnAccum float — fractional spawn accumulator for night enemies
runtime.daySpawnAccum   float — fractional spawn accumulator for day enemies
```

**WAVE_CONFIG catalog (all numeric tunables in one table):**

```js
const WAVE_CONFIG = [
  null,  // index 0 unused (waves are 1-indexed)
  { day_s:55, dusk_s:10, night_s:30, dawn_s:5, intermission_s:8, nightRate:0.8, nightMax:6  },
  { day_s:50, dusk_s:10, night_s:35, dawn_s:5, intermission_s:8, nightRate:1.0, nightMax:8  },
  { day_s:45, dusk_s:10, night_s:42, dawn_s:5, intermission_s:8, nightRate:1.3, nightMax:10 },
  { day_s:40, dusk_s:10, night_s:52, dawn_s:5, intermission_s:8, nightRate:1.6, nightMax:14 },
  { day_s:35, dusk_s:10, night_s:65, dawn_s:5, intermission_s:0, nightRate:2.0, nightMax:20 },
];
```

**`tick(runtime, dt)` logic outline:**

```
decrement runtime.phaseTimer by dt
if phaseTimer <= 0:
  advance to next phase (based on current phase + wave)
  emit transition event
  phaseTimer = next-phase duration from WAVE_CONFIG[wave]

if phase === 'day' || phase === 'dusk_warning':
  spawn day enemies via daySpawnAccum (existing HuntWaves.spawnOne logic, day-safe types only)
  tick HuntResources (tree chopping, battery generation)
  tick HuntBuildings (proximity build check)

if phase === 'night':
  spawn pumpkin_lantern enemies via nightSpawnAccum
  (if wave 5 and boss not yet spawned): spawnBoss
  (if wave 5 and boss dead): force transition to dawn

if phase === 'wave_intermission':
  despawn all creatures
  apply regen to player (0.25 * maxHp over intermission duration)

if phase === 'dawn':
  no spawns; fade screen overlay from night to day tint
```

#### 5.1.2 `js/hunt/hunt-buildings.js` — `WG.HuntBuildings`

Manages construction sites and built structures.

```js
WG.HuntBuildings = {
  init(),
  spawnForStage(runtime, stage),         // populates runtime.buildingSites from stage.constructionSlots
  tick(runtime, dt),                     // check player proximity → progress build; tick powered structures
  takeDamage(runtime, siteId, amount),   // damage a structure; emit 'building:destroyed' on death
  isPoweredAt(runtime, siteId),          // returns bool — used by render for glow state
  applyNightPower(runtime),              // called on 'night:start' — deducts battery, sets powered flags
}
```

**BUILDING_TYPES catalog:**

```js
const BUILDING_TYPES = {
  turret: {
    name: 'Turret',
    wood_cost: 4,
    hp: 40,
    battery_cost: 1,
    attack_range: 180,
    attack_cooldown: 1.8,
    attack_damage: 12,
    display_color: '#808080',
  },
  campfire: {
    name: 'Campfire',
    wood_cost: 30,
    hp: 80,
    battery_cost: 1,
    light_radius: 120,
    battery_gen_per_day: 1,
    display_color: '#e06020',
  },
};
```

**`tick(runtime, dt)`:**

```
for each site in runtime.buildingSites:
  if site.built:
    if site.type === 'turret' AND site.powered:
      site._attackTimer -= dt
      if site._attackTimer <= 0:
        findNearestEnemy(site, runtime, range=BUILDING_TYPES.turret.attack_range)
        if found: deal damage, spawn projectile visual
        site._attackTimer = BUILDING_TYPES.turret.attack_cooldown
    if site.type === 'campfire' AND site.powered:
      tick battery generation during day
  else:
    // check if player is nearby + in day phase + can afford
    if phase is 'day' or 'dusk_warning':
      if dist(player, site) < 40 AND wood >= BUILDING_TYPES[site.type].wood_cost:
        deduct wood
        site._buildTimer += dt
        site.progress = site._buildTimer / 0.5
        if site._buildTimer >= 0.5:
          site.built = true
          site.hp = site.maxHp = BUILDING_TYPES[site.type].hp
          emit 'building:built'
```

#### 5.1.3 `js/hunt/hunt-resources.js` — `WG.HuntResources`

Manages resource nodes (trees, stumps, battery pickups).

```js
WG.HuntResources = {
  init(),
  spawnForStage(runtime, stage),     // populates runtime.resourceNodes from stage.resourceNodes
  tick(runtime, dt),                 // proximity chop, battery pickup, collect orbs
  RESOURCE_CONFIG: {
    wood: {
      chop_rate_base: 2.0,           // wood/s (modified by Logging Speed stat)
      tree_wood: 12,
      stump_wood: 4,
      magnet_radius: 48,
      stack_max: 60,
    },
    battery: {
      stack_max: 4,
      magnet_radius: 48,
    },
  },
}
```

**Stage schema addition for `resourceNodes`:**

Each stage gains `resourceNodes: [ { id, type, mapXFrac, mapYFrac, woodRemaining? } ]`.

`type` values: `'tree'` | `'stump'` | `'battery'`.

Example Stage 1 resource nodes:
```
resourceNodes: [
  { id:'rn1', type:'tree',    mapXFrac:0.20, mapYFrac:0.40, woodRemaining:12 },
  { id:'rn2', type:'tree',    mapXFrac:0.70, mapYFrac:0.25, woodRemaining:12 },
  { id:'rn3', type:'stump',   mapXFrac:0.50, mapYFrac:0.70, woodRemaining:4  },
  { id:'rn4', type:'battery', mapXFrac:0.45, mapYFrac:0.15                   },
  { id:'rn5', type:'battery', mapXFrac:0.80, mapYFrac:0.65                   },
]
```

**`tick(runtime, dt)` logic:**

```
chopRate = RESOURCE_CONFIG.wood.chop_rate_base * (1 + loggingSpeedBonus)

for each node in runtime.resourceNodes:
  if node.type === 'battery' AND !node.collected:
    if dist(player, node) < RESOURCE_CONFIG.battery.magnet_radius:
      if runtime.resources.battery < RESOURCE_CONFIG.battery.stack_max:
        runtime.resources.battery += 1
        node.collected = true
        emit 'resource:collected', { type:'battery', nodeId:node.id }

  if (node.type === 'tree' OR node.type === 'stump') AND node.woodRemaining > 0:
    if phase === 'day' OR phase === 'dusk_warning':
      if dist(player, node) < 36:
        woodGain = chopRate * dt
        actual = min(woodGain, node.woodRemaining, RESOURCE_CONFIG.wood.stack_max - runtime.resources.wood)
        node.woodRemaining -= actual
        runtime.resources.wood += actual
        if node.woodRemaining <= 0:
          node.depleted = true
          emit 'resource:depleted', { nodeId:node.id }
```

### 5.2 Existing Files: Required Modifications

#### 5.2.1 `js/hunt/hunt-stage.js`

Add `constructionSlots` and `resourceNodes` arrays to each stage in `STAGES`. Worker implementing this only needs to add the arrays — no logic change in this file.

Provide defaults for stages 1 and 2 (Lantern Vigil, Pale Crossing). Stages 3–18 can use a minimal default set (1 turret slot, 1 campfire slot, 3 trees, 1 stump, 1 battery pickup) until per-stage tuning is done.

#### 5.2.2 `js/hunt/hunt-waves.js`

`spawnInWindow(runtime, stage, dt)` currently uses `runtime.elapsed / stage.durationSec` as the progress fraction. This must be replaced:

- Remove the single `spawnInWindow` function.
- Add `spawnDayTick(runtime, stage, dt)` — spawns day-phase enemies from `stage.enemyMix` (excluding `pumpkin_lantern`). Rate controlled by `runtime.daySpawnAccum`.
- Add `spawnNightTick(runtime, wave, dt)` — spawns `pumpkin_lantern` exclusively at rate `WAVE_CONFIG[wave].nightRate`. Count capped at `WAVE_CONFIG[wave].nightMax` simultaneous.
- `spawnBoss(runtime, stage)` — unchanged signature, still called by `HuntDayNight.tick`.

#### 5.2.3 `js/hunt/hunt-enemies.js`

Add `pumpkin_lantern` to `TYPES` — **already done by W-Pumpkin-Sprite commit.** Verify it is present before this worker runs.

Modify `pickTarget(creature, runtime)`:
- Current: always returns `runtime.player`.
- New: during `night` phase, 30% chance to target nearest built structure within 250px (see §3.4 pseudo-code).
- Signature unchanged: `pickTarget(c, runtime)` → target object (player or site).
- The `tickOne` function calls `takeDamage` on `c.target` — extend to handle both player and site targets:
  - If target is player: `WG.HuntPlayer.takeDamage(damage, source)` (existing path).
  - If target is a site: `WG.HuntBuildings.takeDamage(runtime, target.id, damage)`.

#### 5.2.4 `js/hunt/hunt-render.js`

Add four new draw functions (all called from `drawFrame`):

```js
drawPhaseOverlay(ctx, runtime)
  // draws semi-transparent tint over the scene based on phase:
  // 'night': deep dark-blue overlay rgba(10,8,30,0.55)
  // 'dusk_warning': amber pulse rgba(40,20,0,0.25) flashing every 2s
  // 'dawn': fading overlay from night tint to zero over 5s
  // 'day' / 'wave_intermission': no overlay
  // Campfire light radius: if campfire built+powered, carve out a radial gradient at site position
  // (creates circle of visibility in night overlay — key game feel element)

drawConstructionSites(ctx, runtime)
  // for each site in runtime.buildingSites:
  //   unbuilt: dashed-circle 40px radius + name label + cost bar (green/red based on wood)
  //   building: fill-arc progress animation
  //   built: structure glyph (turret or campfire); if hp < maxHp: hp bar below

drawResourceNodes(ctx, runtime)
  // for each node in runtime.resourceNodes:
  //   tree: green-tufted vertical rectangle (2-step pixel tree)
  //   stump: brown circle (8px radius)
  //   battery: small battery-cell icon (uncollected only)
  //   proximity visual: if player within 36px of tree/stump in day: chop-particles emit

drawDayNightHud(ctx, runtime)
  // draws the day/night HUD additions (see §6)
```

Call order in `drawFrame`:
```
drawTiles → drawResourceNodes → drawDrops → drawConstructionSites →
HuntPickups.draw → drawCreatures → drawProjectiles → drawPlayer →
drawParticles → drawPhaseOverlay → drawEdgePulse → drawHud →
drawDayNightHud → drawLevelUpModal
```

`drawPhaseOverlay` must come AFTER all world elements but BEFORE HUD — it darkens the world, not the UI.

#### 5.2.5 `js/core/wg-state.js`

Add transient in-stage resource fields to the hunt runtime init block (called on stage start):

```js
runtime.resources = {
  wood: 0,
  battery: 0,
};
```

These are NOT persisted to `wg_save_v2` — they reset each stage. Only coins earned during a stage feed into `WG.State.get().currencies.coins` on stage end.

Also add `loggingSpeedBonus` accessor:

```js
WG.State.loggingSpeedBonus()
// returns the 'Logging Speed' stat bonus from Ascend (ascend-stats.js)
// as a decimal multiplier bonus (e.g. +0.25 for 25% logging speed upgrade)
// Currently ascend-stats.js has 'Gather' stat. Rename 'Gather' → 'Logging Speed'
// to match HD §J.5 ("Logging Speed — the distinguishing Wood-Siege stat")
```

**Note on stat rename:** `ascend-stats.js` currently has a 5-stat system including `Gather`. The worker implementing this should rename `Gather` → `Logging Speed` and wire it into `HuntResources.tick` as the chop-rate multiplier. The HD §J.5 observation confirms "Logging Speed" is the canonical stat name.

#### 5.2.6 `js/orchestrator/wg-game.js`

In the Hunt stage launch sequence, after constructing the runtime object:
```js
WG.HuntDayNight.startStage(runtime, stage);
WG.HuntResources.spawnForStage(runtime, stage);
WG.HuntBuildings.spawnForStage(runtime, stage);
```

In the main Hunt game loop tick (rAF):
```js
WG.HuntDayNight.tick(runtime, dt);   // must come before waves tick — phase determines spawn type
WG.HuntBuildings.tick(runtime, dt);
WG.HuntResources.tick(runtime, dt);
// HuntWaves.spawnInWindow → replaced by HuntDayNight.tick internally calling spawnDayTick/spawnNightTick
```

`HuntWaves.spawnInWindow` call in the current game loop is deleted; spawn is now driven by `HuntDayNight.tick`.

### 5.3 Event Bus Contract Between Modules

```
HuntDayNight   → emits: day:start, dusk:warning, night:start, dawn:start,
                         wave:intermission, stage:victory
HuntBuildings  → emits: building:built, building:destroyed
               → listens: night:start (to call applyNightPower)
HuntResources  → emits: resource:collected, resource:depleted
HuntRender     → listens: night:start (to activate night overlay)
               → listens: dawn:start (to begin fade-out of overlay)
               → listens: building:built, building:destroyed (to redraw site)
               → listens: resource:depleted (to swap tree → stump visual)
hunt-enemies   → listens: night:start (to switch target pool to include structures)
               → listens: dawn:start (to revert target pool to player-only)
hunt-player    → listens: wave:intermission (to start regen tick)
```

---

## 6 — HUD Additions

### 6.1 Day/Night Phase Indicator

Position: top-center, replacing or augmenting current stage-name banner.

Layout:
```
[ SUN icon | ████░░░░░░░░ | MOON icon ]
         "NIGHT IN 32s"
```

- Icon: sun glyph (☀) for day phases, moon glyph (☾) for night.
- Progress bar: 120px wide, fills left-to-right over the phase duration. Color: amber for day, deep-blue for night.
- Text label below: `"NIGHT IN Xs"` during day, `"NIGHT MODE"` flashing red during night, `"DAWN"` during dawn, `"WAVE N/5"` during intermission.

This HUD element is **canvas-drawn** (in `drawDayNightHud`) not DOM — keeps it in sync with the game loop without layout reflow.

### 6.2 Resource Counters

Current HUD (HD §C confirms): top-left shows yellow coin "0", brown wood bag "0". Possibly a third icon.

Add to the existing top-left resource strip rendered in `drawHud`:

| Resource | Position | Icon glyph | Format |
|---|---|---|---|
| Coins | existing top-left | `🪙` (yellow circle) | `C: NNN` |
| Wood | new, below coins or inline | axe+log glyph (brown) | `W: NN` |
| Battery | new, below wood or inline | cell glyph | `B: N/4` |

Wood and Battery counters are only drawn during Hunt (not meta tabs). They are drawn in `drawDayNightHud`, not `drawHud`, to keep the concerns separate.

### 6.3 Wave Counter (5-dot display)

Current HUD has a stage timer banner (`runtime.stage.name — X.Xm / X.Xm`). Replace with the HD-confirmed 5-dot wave indicator.

HD §C: "numbered wave dots **1 2 3 4 5** with circle-progress for each (white when unfinished, red when active/threatened)."

Spec:
- 5 circles, each 14px diameter, centered horizontally in top HUD.
- Unfinished: hollow circle, stroke `#808080`.
- Current active wave: filled circle, stroke + fill `#e04040` (red/threatened).
- Completed wave: filled circle, fill `#40a040` (green/cleared).
- Label: small numeral 1–5 inside each circle.
- Draw in `drawDayNightHud`. Canvas-drawn, not DOM.

---

## 7 — Worker Prompts Queued

In dependency order. Each is one self-contained session for a fresh Sonnet.

### W-DayNight-Engine (implement first)
**Scope:** Create `hunt-daynight.js` + `hunt-resources.js` + extend `wg-state.js` with `runtime.resources`. Wire into `wg-game.js`. Add `constructionSlots` and `resourceNodes` to Stage 1 and Stage 2 only (enough to test). Modify `hunt-waves.js` to split `spawnInWindow` → `spawnDayTick` + `spawnNightTick`. Add `loggingSpeedBonus` accessor, rename Gather → Logging Speed in `ascend-stats.js`.  
**Acceptance:** In browser at localhost:3996, Stage 1 shows day phase → dusk warning → night phase → dawn → intermission cycling. Wave counter increments. Wood counter changes when near trees. Battery counter updates on pickup collection. Console: no errors.

### W-DayNight-Buildings (depends on Engine)
**Scope:** Create `hunt-buildings.js`. Add `constructionSlots` + `resourceNodes` to all 18 stages (use minimal defaults for stages 3–18). Wire into `wg-game.js` tick. Extend `hunt-enemies.js` `pickTarget` for structure targeting. Implement `HuntBuildings.applyNightPower` on `night:start`.  
**Acceptance:** Stage 1 day phase: walk near construction site with wood → progress fills → Turret spawns. Turret fires at night enemies when powered. Campfire shows light radius at night. Night enemies occasionally target structures. Structure HP bar appears when damaged.

### W-DayNight-Render (depends on Engine + Buildings)
**Scope:** Add `drawPhaseOverlay`, `drawConstructionSites`, `drawResourceNodes`, `drawDayNightHud` to `hunt-render.js`. Update `drawFrame` call order per §5.2.4. Draw night overlay with campfire carve-out. Draw 5-dot wave counter.  
**Acceptance:** Night phase darkens scene; campfire site (if built) has visible light pocket. Trees/stumps visible on map. Construction site shows dashed circle + cost bar. Wave dots show correct state. Resource counters readable.

### W-DayNight-Tuning (depends on all above; requires build running)
**Scope:** Tune WAVE_CONFIG timing, RESOURCE_CONFIG chop rates, BUILDING_TYPES costs and HP. Play-test by watching Stages 1, 2, 3. Target: player can build 1 turret + campfire in day 1 if they prioritize chopping, but not both easily on wave 1. Night wave 1 should feel manageable; wave 5 should feel overwhelming without structures.  
**Acceptance:** The stage feels like the HD source description in §K: "build your outpost as fast as you can to eliminate the monsters closing in" — time pressure is real, not trivial.

### W-DayNight-HUD-Polish (depends on Render)
**Scope:** Audio hooks for day/night transitions (placeholder beep or silence). Edge-pulse on `night:start` (red flash, existing `pulseEdges` mechanism). Dusk-warning amber screen flicker. NIGHT MODE modal text appears for 2s at `night:start` (DOM or canvas overlay). Cleanup: remove elapsed-timer banner, replace with wave dots.  
**Acceptance:** Transition from day to night has clear audiovisual signal. Player cannot miss that night has started. NIGHT MODE text visible briefly. No regressions in level-up modal, skill button, or boss HP bar.

---

## 8 — Open Questions and Blockers

Items this doc cannot resolve without Architect input or live phone capture:

1. **Day/night ratio:** Are the WAVE_CONFIG timing numbers right? HD §H.1 lists "Day/night phase timing — fixed seconds? wave-bounded? player-triggered?" as open. This spec chose wave-bounded with the ratios above (§1.3). Architect should validate or override before W-DayNight-Engine runs.

2. **Building UI flow:** HD §H.2: "how does the player select which structure to build?" This spec chose auto-build on proximity (no menu). If source shows a menu/selection UI, the spec must change. The implementing worker should note this as unresolved before building the menu-less path.

3. **Battery function:** HD §H.5: function uncertain. This spec's interpretation (powers structures at night, charges via campfire + pickups) is reasoned from context but not HD-confirmed. If live capture shows different behavior, revert and rebuild `hunt-buildings.js` battery logic.

4. **Number of construction slots per stage:** Only 2 slots specified for Stage 1 in this doc. Stages 3–18 get minimal defaults. Source has not confirmed slot counts for higher stages. W-DayNight-Buildings worker should flag this explicitly and use the minimal-default pattern until Architect approves stage-specific slot designs.

5. **Pumpkin_lantern stat values:** The type was added by W-Pumpkin-Sprite. This doc assumes the TYPES entry exists with reasonable values. If that worker's commit didn't include HP/damage/speed, the W-DayNight-Engine worker must fill them in before night spawning can be tuned.

---

*Written 2026-04-28 by Worker DN. Primary sources: HD_SOURCE_OBSERVATIONS_2026-04-28.md §A §C §D §E §G; GAMEPLAY_OBSERVATION.md §3. All HD screenshots referenced in source doc were at non-existent disk paths (`reference/screenshots_hires/carousel/`) — written observations in HD_SOURCE doc were used as the visual grounding authority instead.*
