# AUDIT — Banshee + Building-Repair + Spawn-Tuning batch

Run: 2026-05-02 08:52 (scheduled `w-audit-banshee-repair-spawn`)
Auditor: Sonnet (audit-only)
Scope: workers W-Banshee-Enemy, W-Building-Repair, W-Spawn-Tuning

## Verdict

**FAIL** — `W-Spawn-Tuning` has no done marker and is functionally incomplete (per-stage `enemyMix` arrays were not updated to include the new types, so `wraith_fast` will never spawn through the standard mix path and `skull_swarmer` only spawns from stages whose mix already nominally includes it — which is none).

`W-Banshee-Enemy` and `W-Building-Repair` PASS. `workers/AUDIT_FAIL.flag` written.

---

## Item 1 — done markers

| Marker                                      | State | Notes |
|---------------------------------------------|-------|-------|
| `workers/done/W-Banshee-Enemy.done`         | PASS  | Detailed marker; cross-worker note flags that the `drawBanshee` render code rode in commit `7520eaf` (Building-Repair B) due to a shared working tree on commit. Honest disclosure, no foul play. |
| `workers/done/W-Building-Repair.done`       | PASS  | Detailed marker w/ tunables, commits, eval-side verification, polish-mandate accounting. |
| `workers/done/W-Spawn-Tuning.done`          | **FAIL** | File does not exist (`ls workers/done/` confirms). |

## Item 2 — `node --check` on modified files

Files in scope (from `git diff --name-only ed651a9~1 c63bc83` plus the W-Spawn-Tuning footprint in `hunt-enemies.js` / `hunt-render.js` / `hunt-waves.js`):

```
js/core/wg-audio.js     OK
js/hunt/hunt-enemies.js OK
js/hunt/hunt-fx.js      OK
js/hunt/hunt-player.js  OK
js/hunt/hunt-render.js  OK
js/hunt/hunt-waves.js   OK
```

PASS — all six files parse clean.

## Item 3 — required artifact grep

| Artifact                       | Location                                          | State |
|--------------------------------|---------------------------------------------------|-------|
| `banshee:` type entry          | `js/hunt/hunt-enemies.js:32`                      | PASS  |
| `banshee_charge` AI branch     | `js/hunt/hunt-enemies.js:126,32`                  | PASS  |
| `enemy:shriek` emit            | `js/hunt/hunt-enemies.js:133`                     | PASS  |
| `enemy:shriek` EVENT_MAP entry | `js/core/wg-audio.js:63` (boss_die placeholder)   | PASS  |
| `drawBanshee` function         | `js/hunt/hunt-render.js:1680`                     | PASS  |
| `case 'banshee':` dispatch     | `js/hunt/hunt-render.js:1803`                     | PASS  |
| `_rollBanshee` 5% Night-only   | `js/hunt/hunt-waves.js:116-126,159`               | PASS  |
| `repairTick` function          | `js/hunt/hunt-player.js:595,643` (defined + wired)| PASS  |
| `REPAIR_HOVER_DELAY` const     | `js/hunt/hunt-player.js:532` (=3.0)               | PASS  |
| `REPAIR_TUNABLES` export       | `js/hunt/hunt-player.js:654-661`                  | PASS  |
| `repair:tick` / `repair:complete` events | `js/hunt/hunt-player.js:626,631`        | PASS  |
| `audio:repair_complete` route  | `js/core/wg-audio.js:59` (→ `craft` sample)       | PASS  |
| `wraith_fast` type entry       | `js/hunt/hunt-enemies.js:37`                      | PASS  |
| `skull_swarmer` type entry     | `js/hunt/hunt-enemies.js:41` (`swarmSize:4`)      | PASS  |
| `drawWraithFast` / `drawSkullImp` dispatch | `js/hunt/hunt-render.js:1804-1805`    | PASS  |
| `swarmSize` cluster spawn      | `js/hunt/hunt-waves.js:170-183` (jitter ≤ 30u)    | PASS  |
| `BASE_SPAWN_RATE` 1.4× boost   | `js/hunt/hunt-waves.js:21-25` (`WAVE_BASE_RATE_MIN/MAX` already 1.4× from prior `W-Hard-Tuning-And-Monetization`; spec said "or equivalent") | PASS (with caveat — see Item 5) |
| Wave-tier ramp `*= 1 + waveIdx*0.15` | `js/hunt/hunt-waves.js:25,68`               | PASS  |
| Per-stage `enemyMix` updates for new types in `js/hunt/hunt-stage.js` | none of `wraith_fast`, `skull_swarmer`, `banshee` appear in any stage's `enemyMix` array (lines 79–96) | **FAIL** |

## Item 4 — live URL smoke check

Server was not running on `:3996` at audit start (no `LISTEN` on port). Started a transient `http-server` on the build-v2 root for the smoke check, then stopped it. Results:

```
GET /                           code=200
GET /js/hunt/hunt-enemies.js    code=200 bytes=10221
```

Live-URL fetches confirm the same artifacts that the local grep found:

- `banshee` / `wraith_fast` / `skull_swarmer` type rows present
- `drawBanshee`, `drawWraithFast`, `drawSkullImp` definitions + dispatch cases present
- `repairTick`, `REPAIR_HOVER_DELAY`, `REPAIR_TUNABLES` present
- `enemy:shriek` and `audio:repair_complete` rows present in EVENT_MAP

PASS.

## Item 5 — polish quality assessment (Architect Polish Mandate)

The Architect's standing mandate: dopamine peaks must FEEL — trauma, particles, screen flash, audio cues. Per-worker assessment:

### W-Banshee-Enemy — STRONG polish

- Erratic chase + 0.8s 1.8× charge state separates it from every other walker. Mechanically distinct.
- Shriek-fire dopamine peak: trauma 0.3 + 16-particle violet `pickupFragment` HuntFX burst + screen flash `#a060ff @ 0.3α / 200ms`. Three layers of feedback on one beat.
- Pre-shriek tell: aura pulses faster when `shriekTimer < 0.6` (anticipation register; player learns to read it).
- Visible HP bar above sprite (220 HP needs a gauge; brief required this).
- Expanding purple ring during charge (post-action feedback the player sees mid-windup).
- Night-only + 5% per spawn-tick + cap of 1 alive — feels like a SCARE, not a fixture. Matches brief intent.
- Minor concern: shriek audio reuses `boss_die` sample as placeholder. Marker explicitly notes a dedicated `banshee_screech.mp3` is the proper follow-up. Acceptable for now; flag in audio-sourcing queue.

### W-Building-Repair — STRONG polish

- Hover ring with ease-out cubic growth (`1 - (1-t01)³`) — fast initial fill that settles. "Wind-up tension resolving" — exactly the language a polish mandate wants.
- Active-repair wrench glyph with low-amplitude bobble (`sin(t·5.5)·1.6` px) — alive, not jittery.
- `repair:complete` trauma 0.15 (sized between silent `repair:tick` and `turret:destroyed` 0.4 — small but felt punctuation for the heal payoff). Considered.
- Green burst: 12 particles, ring shape, life 0.70s, colors `#a8f0a0 / #80e088 / #fff0c0` — green + warm cream (heal not poison). Color discipline.
- Audio routed to `craft` sample (existing) — saves an audio source and is on-brand for "build-state recovered".
- Tunables NAMED (REPAIR_HOVER_DELAY/RATE/HP_PER_WOOD/RANGE) per Architect monetization hook ("repair 2× speed ad-buff" later).
- Honest disclosure of skipped manual playtest (scheduled-task can't dismiss the splash) and clear instructions for the Architect to validate.

### W-Spawn-Tuning — INCOMPLETE polish (work matches brief where present, but stage-mix gap means none of it ships to the player)

- Cluster spawn implemented well: `CLUSTER_JITTER_RADIUS = 30`, polar-coord random angle + radius, no overlap-pile risk. Matches the "feels like a CHARGE" mandate where it fires.
- `wraith_fast` and `skull_swarmer` type entries are tuned reasonably (HP/speed/damage in line with the catalog) and have proper sprite dispatch.
- BASE_SPAWN_RATE was already bumped 1.4× by the prior `W-Hard-Tuning-And-Monetization` worker (commit `addbe44`). The Spawn-Tuning brief noted "or equivalent" so this is nominally satisfied — but the Spawn-Tuning worker has not added a NEW multiplier on top, so the 1.4× the brief asked for is the SAME 1.4× already in tree. Architect should decide whether that counts as fulfillment or whether another bump is required.
- **Critical gap**: `js/hunt/hunt-stage.js` lines 79–96 — none of the 18 stages reference `wraith_fast`, `skull_swarmer`, or `banshee` in their `enemyMix` arrays. The mode-mix filter in `_modeMixFor` only picks from `stage.enemyMix`. The rare-roll path (`_rollBanshee`) covers banshee, but `wraith_fast` and `skull_swarmer` will NEVER spawn through the standard path. The new types are dead code in production.
- Polish that can't run isn't polish.

### Cross-worker hygiene

- The Banshee marker openly notes its B-concern code rode in the W-Building-Repair B commit (shared working tree). This is the right level of disclosure (per `feedback_dont_push_other_claude.md`). No covert behavior.
- The Building-Repair marker explicitly preserves an uncommitted `player:damaged` audio tuning it found in `wg-audio.js` — preserved untouched per "don't push another Claude's work without asking". Correct hygiene.

---

## Failures (drives `workers/AUDIT_FAIL.flag`)

1. `workers/done/W-Spawn-Tuning.done` does not exist.
2. `js/hunt/hunt-stage.js` per-stage `enemyMix` arrays do not include `wraith_fast` (night) or `skull_swarmer` (day/night) — the new enemy types are unreachable through the standard spawn path.

## Recommended remediation (out-of-scope for this audit)

1. Spawn-Tuning worker (or a small follow-up) appends `wraith_fast` to night-stage mixes (4, 5, 6, 13, 14, 15, 16, 17, 18 — and any other night biome), and `skull_swarmer` to all 18 stage mixes (`mode: 'both'`).
2. Decide whether to add a second 1.4× multiplier on top of the existing W-Hard-Tuning rate, or document that the existing rate counts as the brief's "1.4×".
3. Source a dedicated `banshee_screech.mp3` and replace the `boss_die` placeholder in `wg-audio.js:63`.
4. Have the Architect manually playtest the Building-Repair flow (build a turret, let it take damage, hover within 36u for 3s, watch wood drain + HP climb) — the worker correctly noted the scheduled-task environment can't dismiss the "tap to begin" splash.
