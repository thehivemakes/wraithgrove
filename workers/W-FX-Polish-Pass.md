# Worker — W-FX-Polish-Pass

You are Worker FXP — closes the 5 silent-event polish gaps from `audits/AUDIT_BatchBCDE_20260501T200626Z.md` §C.2.

**Single class of fix.** Five gameplay events emit but have no FX listener. Wire them.

## Birth + design source

Standard birth sequence. Then read:
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/SPEC.md` §0
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/audits/AUDIT_BatchBCDE_20260501T200626Z.md` §C.2 (gaps 1, 2, 3, 5, 7)
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/docs/DOPAMINE_DESIGN.md`
- `js/hunt/hunt-fx.js`, `js/hunt/hunt-fxnumbers.js`, `js/hunt/hunt-results.js`, `js/core/wg-engine.js`

## Concerns (one commit each)

### A — `player:revived` + `pickup:torch` + `turret:destroyed` FX bursts

Wire three new event handlers in `hunt-fx.js init()`:

1. **player:revived** (most dramatic moment in the run):
   - Spawn cyan+gold ring burst at player.x/y, 32 particles, life 0.9s, speed 200
   - Dispatch `WG.Engine.emit('camera:trauma', {amount:0.5})` (or call addTrauma directly if exposed) for screen kick
   - Brief screen flash via `WG.Game.flashScreen('#80f0ff', 0.5, 400)` if available; else inline overlay
   - Audio: emit `audio:revive` event so wg-audio EVENT_MAP picks it up (you'll wire the audio binding in §B)

2. **pickup:torch** (Night-Mode tension resolution):
   - Add new BURST_TYPE row `pickupTorch` — 8 warm orange/yellow particles `#f8b850 / #ffe888`, life 0.55s, speed 90, slight upward bias (gravity -20)
   - Spawn at the pickup origin
   - Floating-number `+TORCH` (color `#ffc848`) via `WG.HuntFXNumbers.spawn()` if module exists

3. **turret:destroyed** (currently has burst, missing screen-shake):
   - In `hunt-turret.js` find where `turret:destroyed` is emitted; alongside it call `WG.Engine.emit('camera:trauma', {amount:0.4})` if we have a camera-trauma event, else add directly via the trauma helper exposed by hunt-render
   - The existing turretExplode burst stays — additive change

Verification: chop a tree in Night Mode, walk over a torch drop → torch burst + `+TORCH` float-up. Activate revive buff, die → ring burst + screen flash. Build a turret, let an enemy destroy it → screen kicks (small).

### B — `buff:expired` + `buff:consumed` HUD desaturation + audio cue

In `hunt-fx.js` (or wherever the buff HUD pills render — likely `wg-game.js` or a new module):

1. **buff:expired**: when HUD pill stack receives this event, the matching pill desaturates to gray for 280ms then removes itself with a fade. Don't snap-remove.
2. **buff:consumed** (instant_turret on use): brief gold confirm-burst at the consumed-turret position + small upward "USED" float-text
3. Audio binding: extend `wg-audio.js EVENT_MAP` (if present) with rows for:
   - `pickup:torch` → torch chime (use orb sound or fragment if no torch sample exists)
   - `player:revived` → level_up chime (already in audio set, fits triumphal moment)
   - `buff:expired` → ui_modal close
   - `buff:consumed` → cha_ching

### C — Ad-revive countdown polish + marker

In `hunt-results.js` revive countdown:
- On each second decrement, animate scale 1.0 → 1.3 → 1.0 over 200ms via CSS transition
- Color shift: 5→4 white, 3 yellow `#ffd870`, 2 orange `#ff9040`, 1 red `#ff4040`, 0 fade out
- This is in addition to the existing button heartbeat — the *number* should pulse with rising tension

Marker at `workers/done/W-FX-Polish-Pass.done` with each gap's commit hash + line numbers wired.

## Constraints

- Do NOT touch hunt-stage / hunt-waves / hunt-enemies / hunt-bosses / meta-iap (out of scope)
- Polish gaps 4 (Day↔Night transition) and 6 (wave-tier transitions) deferred — separate scope-extension
- Voice: terse, cite audit gap # in inline comment for each fix
- One concern per commit. Three commits.
