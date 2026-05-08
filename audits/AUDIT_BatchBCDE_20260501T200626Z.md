# AUDIT — Batch B/C/D/E (DayNight + EnemyCatalog + Turret/Campfire + HardTuning)

Auditor: Worker AM (W-Audit-Mega) — automated scheduled task `w-audit-mega`
Timestamp: 2026-05-01 20:06:26 UTC
Scope: read-only audit of four predecessor workers, no js/ or audio/ edits.
Mandate: functional PASS/FAIL + Architect-mandated polish assessment.

---

## Predecessor markers

| Marker | Status |
|---|---|
| `workers/done/W-DayNight-And-Torch.done` | ✓ present |
| `workers/done/W-Enemy-Catalog.done` | ✓ present |
| `workers/done/W-Turret-And-Campfire-Combat.done` | ✓ present |
| `workers/done/W-Hard-Tuning-And-Monetization.done` | ✓ present |

All four predecessors landed. Audit proceeds.

---

## §A — Static checks

### A.1 — `node --check` on every JS file under `js/`

Ran `node --check` against all 26 files in `js/core/`, `js/hunt/`, `js/meta/`. **All PASS** — zero parse errors.

```
PASS js/core/wg-audio.js     PASS js/hunt/hunt-bosses.js     PASS js/meta/meta-account.js
PASS js/core/wg-cache.js     PASS js/hunt/hunt-enemies.js    PASS js/meta/meta-ads.js
PASS js/core/wg-display.js   PASS js/hunt/hunt-fx.js         PASS js/meta/meta-buffs.js
PASS js/core/wg-engine.js    PASS js/hunt/hunt-fxnumbers.js  PASS js/meta/meta-events.js
PASS js/core/wg-input.js     PASS js/hunt/hunt-pickups.js    PASS js/meta/meta-iap.js
PASS js/core/wg-render.js    PASS js/hunt/hunt-player.js
PASS js/core/wg-state.js     PASS js/hunt/hunt-render.js     PASS js/hunt/hunt-results.js
                             PASS js/hunt/hunt-stage.js      PASS js/hunt/hunt-tutorial.js
                             PASS js/hunt/hunt-turret.js     PASS js/hunt/hunt-waves.js
                             PASS js/hunt/hunt-weapons.js
```

### A.2 — Required artifact greps

| Artifact | File | Result |
|---|---|---|
| `runtime.mode` referenced | `js/hunt/hunt-stage.js:74-75` | PASS — refs in spawn-time mode-mix doc |
| `runtime.mode` referenced | `js/hunt/hunt-waves.js:17,29,65,93,98-103` | PASS — used to gate spawn rate, mix, and night enemy filters |
| `torchAmount`, `torchDecay` | `js/hunt/hunt-player.js:8,43-45,433,486-487,500,512,519` | PASS — initialized, picked-up by torch drops, ticked by `tickTorch` |
| `pumpkin_lantern` | `js/hunt/hunt-enemies.js:21` | PASS |
| `jiangshi` | `js/hunt/hunt-enemies.js:25` | PASS |
| `samurai_grunt` | `js/hunt/hunt-enemies.js:28` | PASS |
| `red_zombie` | `js/hunt/hunt-enemies.js:18` | PASS |
| `WG.HuntTurret` | `js/hunt/hunt-turret.js:243` | PASS — exposes `init/tick/damageTurret/nearestTurretInRange/TUNABLES` |
| `TURRET_FIRE_RATE` (1.4s) | `js/hunt/hunt-turret.js:17` | PASS |
| `TURRET_RANGE` (200) | `js/hunt/hunt-turret.js:18` | PASS |
| `TURRET_DAMAGE` (12) | `js/hunt/hunt-turret.js:19` | PASS |
| `WG.Buffs.activate` | `js/meta/meta-buffs.js:29,95` | PASS |
| `damage_x2` / `wood_x2` / `instant_turret` / `revive` | `js/meta/meta-buffs.js:18-21` | PASS — full catalog |
| Wave-count scaling 5/10/15 | `js/hunt/hunt-stage.js:105-107` (`WAVE_COUNT_EARLY=5`, `_MID=10`, `_LATE=15`) | PASS — applied via `waveCountFor()` lines 117-120, written into stages at lines 129-133 |
| `index.html` MODULES — `meta-buffs.js` | `index.html:322` | PASS |
| `index.html` MODULES — `hunt-turret.js` | `index.html:334` | PASS |

**§A verdict: PASS**

---

## §B — Runtime smoke checks (live build)

Live URL: `https://defimagic.io/wraithgrove/` (308 redirect from `index.html` → trailing slash; followed with `-L`).

| Check | HTTP | Detail |
|---|---|---|
| `index.html` (followed redirect) | 200 | 19,284 bytes |
| `js/hunt/hunt-turret.js` | 200 | 10,418 bytes — md5 matches local |
| `js/meta/meta-buffs.js` | 200 | 3,540 bytes — md5 matches local |
| `js/hunt/hunt-enemies.js` | 200 | 7,132 bytes |
| `js/hunt/hunt-stage.js` | 200 | 10,889 bytes |
| `js/hunt/hunt-waves.js` | 200 | 5,944 bytes |
| `js/hunt/hunt-player.js` | 200 | 23,862 bytes |
| `js/hunt/hunt-render.js` | 200 | 103,165 bytes |

**Cache-bust**: live `WG.BUILD.version = '0.14.0-batch-bcde-1777665452'` (line 256) — distinct from local `'0.2.0-mvp'`. The deploy pipeline rewrites `version` so script `?v=` query params change per deploy. **PASS** — cache-bust is active for batch B/C/D/E.

**§B verdict: PASS** — all new files reachable, content matches local, cache-bust applied.

---

## §C — Polish audit (Architect mandate)

### C.1 — Where polish landed (specific lines)

The four batches show real polish discipline. Quoting the receipts:

#### Eased animations (no stair-step)

- **Turret HP bar — eased lerp**, not snap.
  `js/hunt/hunt-turret.js:117-121` —
  ```
  if (t._hpDisplayed !== t.hp) {
    const k = Math.min(1, dt * 8);
    t._hpDisplayed += (t.hp - t._hpDisplayed) * k;
    if (Math.abs(t._hpDisplayed - t.hp) < 0.05) t._hpDisplayed = t.hp;
  }
  ```
  Render reads `c._hpDisplayed` (`hunt-render.js:577`) so damage reads as a sweep, not a step.

- **Turret aim — shortest-path angle lerp**, not jump.
  `js/hunt/hunt-turret.js:42-47` (`lerpAngle` handles -π/+π wrap) and `:129-131` (drifts back to "up" at 25% speed when no target).

- **Night-overlay darkness — cubic ease-in-out**, not linear.
  `js/hunt/hunt-render.js:701-703` —
  ```
  // Smooth ease (Architect: not linear stair-step). Cubic in/out gives a slow
  // initial darkening that accelerates through the danger zone.
  const darkness = _easeInOutCubic(1 - torch);
  ```

#### Hit-flash + wobble (every enemy)

- **Shared `_creatureHitFx()`** — 80 ms additive white flash + 200 ms damped sine wobble, applied to every enemy draw call.
  `js/hunt/hunt-render.js:1239-1248` —
  ```
  if (sinceDmg < 200) {
    const decay = 1 - sinceDmg / 200;
    wobble = decay * decay * Math.sin(sinceDmg / 14) * 1.6;
  }
  const flash = sinceDmg < 80 ? (1 - sinceDmg / 80) * 0.6 : 0;
  ```
  Threaded through `drawZombie`, `drawPumpkin`, `drawJiangshi`, `drawSamurai`, `drawRedZombie` — every new batch enemy gets it via shared helper, not copy-paste.

- **Boss hit-flash** uses a parallel `_bossHitFx()` (`hunt-render.js:867,920,973,1049,1112,1166`).

- **Player hit-flash** uses inline `flash`/`wobble`/`flashBoost` on the body draw at `hunt-render.js:331-351`.

#### Smooth transitions / pulses

- **Pumpkin face glow** — per-creature phase offset `c.x * 0.01` so a group of pumpkins doesn't flash in unison.
  `js/hunt/hunt-render.js:1317` — `const glow = 0.8 + 0.2 * Math.sin(performance.now() / 280 + c.x * 0.01);`

- **Campfire flicker** — two-frequency sine sum, NOT a single wave. Living-flame feel.
  `js/hunt/hunt-render.js:737-739` (player torch) and `:765-767` (campfire) — base + 0.4× harmonic at ~1.8× speed with phase offset.

- **Campfire regen aura** — pulsing dashed ring, brightens when player inside.
  `js/hunt/hunt-render.js:615-625` — pulse phased by `c.x * 0.013`, `lineDashOffset = -t * 12` rotates the dashes.

- **Muzzle flash + projectile trail** — turret fires a `muzzleFlash` burst (`hunt-fx.js:160-162`) AND projectiles get an 8-sample fading streak via `_trail: []` (`hunt-turret.js:104`).

- **Campfire sparkle drift** — rate-limited (`CAMPFIRE_SPARKLE_PERIOD=0.16s`) green particles drifting up off the player while regenerating, with -30 gravity.
  `js/hunt/hunt-turret.js:209-219` + `js/hunt/hunt-fx.js:46-47`.

- **Revive button heartbeat** — keyframe scale-bounce on the death-modal "WATCH AD TO REVIVE" button.
  `js/hunt/hunt-results.js:30,61-65` — `animation: hr-heartbeat 0.9s ease-in-out infinite` with paired `0 0 0 0 → 0 0 0 10px rgba(255,80,64,0.7→0)` shadow pulse.

- **Buff button scale-bounce** — pointerdown 0.94, pointerup/leave restore.
  `js/wg-game.js:266` (`transition:transform 80ms ease`) + `:277-279`.

- **Buff activation gold flash** — `flashScreen('#f0c060', 0.35, 320ms)` non-blocking overlay with CSS transition fade.
  `js/wg-game.js:289` and `:305-314`.

- **Day/Night mode tabs** — gradient backgrounds, accent color shift on active.
  `js/wg-game.js:336-339,365-366`.

This is **substantively polished**, not stub-grade. The Klovur reference player would feel the difference.

### C.2 — Where it's still flat / snap (gaps for next iteration)

These are real gaps. Not blockers, but the polish baseline isn't fully consistent.

1. **`player:revived` is emitted with no listener.**
   - Emitted at `hunt-player.js:334` (buff revive) and `hunt-results.js:94` (ad revive).
   - `grep -rn '\.on..player:revived' js/` → **zero matches**.
   - **Effect:** The most dramatic moment in the run — coming back from death — has no audio, no screen flash, no particle burst. Just HP refilled to full. This will read as flat, especially after the buildup of the 5-sec heartbeat countdown.
   - **Suggested fix (next iteration):** add `WG.Engine.on('player:revived', ...)` in `hunt-fx.js` → cyan/gold ring burst at player + brief screen flash. Audio in `wg-audio.js` EVENT_MAP.

2. **`buff:expired` and `buff:consumed` are emitted with no listener.**
   - `meta-buffs.js:49,60` emit them.
   - `grep -rn '\.on..buff:' js/` → **zero matches** (the activate-side `iap:purchase` co-emit at `meta-buffs.js:38` does pipe to audio, but expiry/consume don't).
   - **Effect:** Buffs silently disappear from the HUD pill stack. `instant_turret` consumes silently when used. No closure feedback.
   - **Suggested fix:** brief desaturation pulse on the HUD pill on expire; small confirm-burst on consume.

3. **`pickup:torch` is emitted with no FX burst.**
   - `hunt-player.js:434` emits it on torch-drop pickup.
   - `hunt-fx.js` does NOT have a `pickup:torch` handler (only `pickup:coin`, `pickup:orb`, `pickup:fragment`).
   - **Effect:** In Night Mode, the torch refill is the most tension-resolving pickup in the game. Currently it just sets `torchAmount = TORCH_INITIAL` with no burst. Compare to coin/orb pickups which DO get particles.
   - **Suggested fix:** add `pickup:torch` burst type in `hunt-fx.js BURST_TYPES` (warm orange/yellow sparkle, larger radius) + listener.

4. **Day↔Night transition is binary at stage entry, not a transition.**
   - `wg-game.js:19` — `mode: (mode === 'night' ? 'night' : 'day')` is set once at `enterStage`, no fade.
   - `hunt-render.js:697` — overlay returns immediately if `runtime.mode !== 'night'`, so flipping mode would snap-cut.
   - **Effect:** Nothing in the live game flips mode mid-run, so this is dormant — but if the Architect ever wants in-stage day→night progression (a real Wood Siege mechanic), the current code will hard-cut. Eased darkness via `_easeInOutCubic(1 - torch)` is in place; the missing piece is a separate `runtime.modeAlpha` for transition-blending.
   - **Polish gap, not bug.**

5. **Turret destruction has burst but no screen-shake.**
   - `hunt-fx.js:163-165` — `turret:destroyed` fires `turretExplode` particle burst, good.
   - But losing a turret is a meaningful tactical event — no `WG.Camera.trauma()` or `traumaPulse` is wired in. The trauma-shake system clearly exists (`hunt-render.js:687` references it as the reason night-overlay sits in screen space).
   - **Effect:** Destruction reads as soft. Compare to enemy kill bursts which are smaller events but get full shake-friendly canvas treatment.
   - **Suggested fix:** add `WG.Engine.emit('camera:trauma', {amount: 0.4})` or equivalent in `hunt-turret.js:163` after the `turret:destroyed` emit.

6. **Wave-count tier transitions (5→10→15) are silent.**
   - `hunt-stage.js:105-107,117-120` correctly tier wave counts at stage IDs ≤6 / 7-12 / ≥13, but the player gets no in-game signal that "you crossed into mid-tier" or "this is late-tier marathon". The tier shows up only as a longer stage time.
   - **Polish gap, not bug.** The tier is a knob the Architect tunes; visibility to the player is a separate concern.

7. **Ad-revive countdown timer increments visually but doesn't pulse.**
   - `hunt-results.js:73-84` — `setInterval(() => { revRem--; cd.textContent = String(revRem); ... }, 1000);` — a flat number swap.
   - The button heartbeats. The countdown text doesn't. As tension peaks at "1" the text doesn't intensify.
   - **Suggested fix:** color shift red→white as it approaches 0; small scale punch on each decrement.

### C.3 — Polish summary

**Overall verdict: substantially polished. ~7/10 baseline, with a clear next-iteration list above.**

The four batches landed real polish primitives: shared hit-flash helper, eased HP/aim/darkness lerps, two-frequency flicker, per-creature phase offsets, particle bursts on the right events. Where polish is missing it's missing for a consistent reason — **events emitted by gameplay code without HuntFX/Audio listeners on the receiving side**. That's a single class of fix, not seven different problems. A focused "polish pass" worker could close gaps 1, 2, 3, 5, 7 together by extending `hunt-fx.js init()` and adding 3-4 BURST_TYPES rows.

Day↔Night transition (gap 4) and tier-crossing feedback (gap 6) are scope-extension items, not polish gaps strictly.

**§C verdict: PASS with recommended polish-pass next iteration.**

---

## Manual test items (in-browser at https://defimagic.io/wraithgrove/)

The Architect should verify these by hand — runtime behavior the audit can't statically prove:

- [ ] **Day Mode plays.** Pick a stage, leave the Day tab selected, enter — player runs, enemies spawn, gameplay behaves as before.
- [ ] **Night Mode darkens.** Pick the Night tab, enter the same stage — screen darkens with vertical gradient + corner vignette + carved torch hole around player.
- [ ] **Torch dims over time.** In Night Mode, watch `torchAmount` decay; carved hole should shrink as torch runs low.
- [ ] **Pumpkin spawns at night, NOT in day.** Hunt-enemies catalog filters via `runtime.mode === 'night'` for `pumpkin_lantern`/`jiangshi` (mode:'night'). Confirm by entering the same stage in both modes and watching what type IDs appear.
- [ ] **Samurai + red zombie spawn in both.** `mode:'both'` for those.
- [ ] **Turret shoots.** Build a turret (or run with `instant_turret` buff). Confirm cannon barrel rotates smoothly toward enemies, fires every ~1.4s, projectile leaves muzzle tip with trail, muzzle-flash burst spawns on each shot.
- [ ] **Turret takes damage and explodes.** Pull aggro to it, watch HP bar sweep down (eased), confirm `turretExplode` burst on destroy. Note: no screen-shake currently — see §C.2 gap 5.
- [ ] **Campfire regens HP.** Take damage, walk inside the dashed regen ring around a built campfire — green sparkles drift up off the player, HP bar climbs at +4/sec.
- [ ] **Campfire regen-ring brightens when player is inside.** `inside` flag in render bumps line width 1.2→2 and opacity (`hunt-render.js:621-623`).
- [ ] **Ad-revive button on death modal.** Die in stage, modal shows "WATCH AD TO REVIVE" button heartbeating, 5s countdown. Click → mock ad → HP restored → game resumes.
- [ ] **Pre-armed revive buff.** Activate `revive` buff in level-select, enter stage, die — buff intercepts, HP restored without modal. Single-use (consumed on revive).
- [ ] **2× DAMAGE / 2× WOOD timed buffs.** Activate, enter stage, see HUD pill in upper-right counting down. After expiry, pill disappears.
- [ ] **Cache-bust verified.** Hard-refresh confirms `WG.BUILD.version` in console contains `batch-bcde-`.

---

## Deviations / warnings

- **Live `index.html` redirects from full URL to trailing-slash dir** (308). Smoke check used `-L` to follow. Not a defect, but worth noting that tooling using `curl -sS` without `-L` will see HTTP 308 + 0 bytes.
- **Local working tree has `WG.BUILD.version = '0.2.0-mvp'`** while live has `'0.14.0-batch-bcde-1777665452'`. Confirms a deploy pipeline rewrites version on push. Not a defect — flagged so future workers know not to manually bump this.
- **No console.error grep performed** — that's a runtime check, not static. Architect's manual-test pass should glance at the JS console while testing.
- **Polish gaps in §C.2 are not failures** — they're forward-looking. All four predecessor workers shipped what they were scoped for. The gaps reflect a class of integration (events without listeners) that none of the four was scoped to address.

---

## Final verdict

| Section | Verdict |
|---|---|
| §A static checks | **PASS** |
| §B live smoke | **PASS** |
| §C polish audit | **PASS with next-iteration list** |
| **Overall** | **PASS** |

No `workers/AUDIT_FAIL.flag` written. Orchestrator may proceed to next batch.

Marker: `workers/done/W-Audit-Mega.done` (written separately).
