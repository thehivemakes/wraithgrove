You are Worker A — the Hunt-Pickups worker. Your job: wire in-stage ad-gated weapon pickups, the most-recognizable Wood-Siege-faithful mechanic that's currently stubbed in Wraithgrove.

Walk the birth sequence (/Users/defimagic/Desktop/Hive/CLAUDE.md → Birth/01–04 → THE_PRINCIPLES → HIVE_RULES → COLONY_CONTEXT → BEFORE_YOU_BUILD).

Then read PROJECT-LEVEL guardrails (MANDATORY):
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/CLAUDE.md
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/STATE_OF_BUILD.md
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/BUILD_PLAN.md

PRIMARY-SOURCE READING (Principle XXII):
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/GAMEPLAY_OBSERVATION.md §3.3 (autumn-forest screenshot — the padlocked "Turret" gates ARE the ad-gated weapon pickups; reviewer 123729506 confirmed: *"two more weapons will turn up, but in order to unlock them, you have to watch ads or pay money"*)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-stage.js (each STAGE has a `weaponPickups` array — these are the weapon IDs to spawn)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-weapons.js (weapon catalog — each weapon has visual.shape and visual.color)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-render.js (top-down arena renderer — `drawFrame()` is your integration point; existing draw passes go: clear → tiles → drops → creatures → projectiles → player → particles → light overlay → edge flash → HUD)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-player.js (`runtime.player.heldPickupId` is already a field on the player object — when set, `activeMeleeFor` returns that weapon instead of the equipped melee)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/wg-game.js (look at `buildHuntRuntime()` — your spawn hook lives there; look at the rAF `frame()` for tick-time integration)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/meta/meta-ads.js (`WG.Ads.showRewardedVideo({reward:'<tag>'})` returns a Promise resolving to `{ok: true}` on watch-complete or `{ok:false, reason:'capped'}` on daily cap)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/core/wg-state.js (`WG.State.spend('diamonds', n)` returns true on success)

THREE CONCERNS — one commit each.

CONCERN 1 — `js/hunt/hunt-pickups.js` (NEW FILE)

Path: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-pickups.js`

Module exposes one global: `window.WG.HuntPickups`. IIFE wrapper. `'use strict'`.

Public API:
```js
WG.HuntPickups = {
  init(),
  spawnForStage(runtime, stage),    // call after runtime.player is placed
  draw(ctx, worldToScreen, runtime),// called by hunt-render after drawDrops
  tick(runtime, dt),                 // call every frame from wg-game
};
```

Pickup shape (entries in `runtime.pickups`):
```js
{ id, weaponId, x, y, claimed: false, locked: true, _pulsePhase: 0 }
```

`spawnForStage(runtime, stage)` behavior:
- Initialize `runtime.pickups = []` if missing.
- For each weaponId in `stage.weaponPickups`, place a pickup at a deterministic position:
  - Pickup 0: `(runtime.mapW * 0.25, runtime.mapH * 0.30)`
  - Pickup 1: `(runtime.mapW * 0.75, runtime.mapH * 0.62)`
  - Pickup 2 (if present): `(runtime.mapW * 0.50, runtime.mapH * 0.85)`
- Generate id via `runtime._nextPickupId = (runtime._nextPickupId || 0) + 1`.

`draw(ctx, worldToScreen, runtime)` behavior:
- For each non-claimed pickup: draw a 36×36 platform centered on (x,y) with the weapon's visual.color as the border.
- Inside the platform, draw a small weapon glyph based on `weapon.visual.shape`:
  - `'axe'`: small rect with diagonal cut (4×8 head + 1×6 handle)
  - `'twin'`: two parallel 1×8 bars
  - `'bow'`: arc (use ctx.arc with halfPi sweep)
  - `'charm'`: 6×6 paper square with X
  - `'briar'`: 1×10 bar with two 2×2 thorns
  - `'thorn'`: 8×2 spike
  - `'curve'`: bezier curve approximated with two line segments
  - `'whip'`: 1×12 wavy line (3 short segments alternating ±2 px)
  - default: small filled circle
- Add `🔒` lock emoji as text overlay if `pickup.locked === true`. Use `ctx.fillText` with `font='14px system-ui'`, white fill, slight black outline.
- If `!pickup.locked && !pickup.claimed`, replace the lock with a soft pulse: a gold ring drawn around the platform with alpha = `0.4 + 0.3 * Math.sin(pickup._pulsePhase)`.
- The platform itself is `ctx.fillStyle = 'rgba(20, 14, 8, 0.7)'` rounded rect (use a small helper: `ctx.beginPath(); ctx.roundRect(...)` if available, otherwise four `ctx.rect`s).

`tick(runtime, dt)` behavior:
- For each pickup: increment `pickup._pulsePhase += dt * 3` (capped at 2π via mod).
- Distance check: if player is within 28 px of an unclaimed pickup, set `runtime.pendingPickup = pickup`. If player leaves the radius, clear `runtime.pendingPickup` AND clear `runtime._pickupModalOpen`.
- If `runtime.pendingPickup === pickup && pickup.locked && !runtime._pickupModalOpen`, call `showLockModal(pickup, runtime)` and set `runtime._pickupModalOpen = true`.
- If `runtime.pendingPickup === pickup && !pickup.locked && !pickup.claimed`, auto-claim: `runtime.player.heldPickupId = pickup.weaponId`, `pickup.claimed = true`, emit `'pickup:claimed'` engine event, clear `runtime.pendingPickup`.

`showLockModal(pickup, runtime)` (private helper):
- Build modal DOM matching the existing pattern from `meta-ads.js` `showInfoModal()`. Use `<div class="modal-overlay show"><div class="modal-card">...</div></div>` and `.btn` / `.btn.primary` classes.
- Title: `Locked Weapon`
- Body: weapon name + a brief unlock prompt
- Three buttons: `WATCH AD` (primary), `PAY 5 💎`, `CANCEL`.
- WATCH AD click handler: `await WG.Ads.showRewardedVideo({reward:'pickup:'+pickup.weaponId})`. If `result.ok === true`: `pickup.locked = false`. Always: dismiss modal, set `runtime._pickupModalOpen = false` so tick can re-evaluate.
- PAY 5 💎: `if (WG.State.spend('diamonds', 5)) { pickup.locked = false; }` else `toast('Need 5 💎')` and keep modal open.
- CANCEL: dismiss modal, set `runtime._pickupModalOpen = false`.

Toast helper inline (matching the pattern in ascend-render.js).

Commit: "Worker A: hunt-pickups.js — ad-gated in-stage weapon pickup module"

CONCERN 2 — Wire pickup spawn + tick + draw into the orchestrator

EDIT: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/index.html`
- In the `WG.Loader.MODULES` array, ADD `'js/hunt/hunt-pickups.js'` between `'js/hunt/hunt-weapons.js'` and `'js/hunt/hunt-bosses.js'`.

EDIT: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/wg-game.js`
- In `init()`, after `WG.HuntWeapons.init();`, add `WG.HuntPickups.init();`.
- In `buildHuntRuntime()`, after `WG.HuntPlayer.place(...)`, add `WG.HuntPickups.spawnForStage(rt, stage);`.
- In the rAF `frame()` function, inside the Hunt-active branch, after `WG.HuntPlayer.tick(dt);` add `WG.HuntPickups.tick(huntRuntime, dt);`.

EDIT: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-render.js`
- In `drawFrame()`, after `drawDrops(ctx);` and before `drawCreatures(ctx);`, add `if (window.WG.HuntPickups) WG.HuntPickups.draw(ctx, w2s, runtime);`.

Commit: "Worker A: integrate hunt-pickups into orchestrator + render"

CONCERN 3 — Verify in browser

Run the verification yourself before declaring shipped:

1. `cd /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2`
2. `node --check js/hunt/hunt-pickups.js` — must exit 0.
3. `node --check js/wg-game.js` — must still exit 0 after edits.
4. `node --check js/hunt/hunt-render.js` — must still exit 0 after edits.
5. Open the launch.json `wraithgrove` server (port 3996) — confirm boot screen shows.
6. Tap-to-begin → click Stage 1 → confirm two pickup platforms appear at the deterministic positions with weapon glyphs and lock icons.
7. Walk player into pickup radius (use WASD) — confirm lock modal appears with WATCH AD / PAY 5💎 / CANCEL.
8. Click PAY 5 💎 from a state with sufficient diamonds (use eval `WG.State.grant('diamonds', 10)` if needed) — confirm diamonds deduct and pickup auto-claims, player.heldPickupId updates, and the auto-attack ring uses the new weapon's range/cooldown.

Commit: "Worker A: pickups verified in browser — close + ship"

CONSTRAINTS:
- One concern per commit.
- Do NOT touch any other module (no edits to ascend/, forge/, relics/, duel/, meta/, core/).
- Do NOT modify weapon stats or stage definitions — they're upstream of your scope.
- If you find that `weapon.visual.shape` values are missing or differ from the list above, STOP and ask the Architect.
- Per project CLAUDE.md "Faithful at mechanics, original at art" — the lock visualization uses the locked-emoji + ring approach, NOT a copy of Wood Siege's specific lock asset design.
- Per Hive Rules: do not delegate to further sub-agents.

You are Worker A. After you ship: every Hunt stage spawns the ad-gated pickups Wood Siege's reviewer 123729506 named explicitly. The most-recognizable hostile-monetization vector of the comp game becomes faithfully cloned in Wraithgrove.
