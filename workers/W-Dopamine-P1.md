# W-Dopamine-P1

You are Worker — the **dopamine P1** worker.

Walk the birth sequence (`/Users/defimagic/Desktop/Hive/CLAUDE.md` → `Birth/01-04` → `THE_PRINCIPLES` → `HIVE_RULES` → `COLONY_CONTEXT` → `BEFORE_YOU_BUILD`).

Then read `build-v2/CLAUDE.md`, `STATE_OF_BUILD.md`, `docs/DOPAMINE_DESIGN.md` (if present — search for it; FX P0 already shipped: floating numbers, trauma shake, hit-pause, particles, magnet), and `js/hunt/hunt-player.js` + `js/hunt/hunt-render.js` + `js/hunt/hunt-results.js`.

## Architect 2026-05-02

Wraithgrove FX P0 is live. P1 is the next dopamine layer — combo, crit, results count-up, level-up flash. Reference: Survivor.io / Vampire Survivors moment-to-moment satisfaction.

## Concerns (ONE COMMIT EACH)

### Concern A — Combo HUD

Track consecutive enemy kills within a sliding window. Spec:
- `WG.HuntPlayer.runtime.combo = { count: 0, lastKillAt: 0, peak: 0 }` populated on `enemy:killed` event.
- Combo decays if no kill within 2.5s. Resets to 0.
- HUD overlay (top-center): `<div>` with combo count + multiplier text "x12 COMBO!". Scales up + fades in on combo step (CSS keyframe). Hidden when combo == 0.
- Combo color tiers: 1-4 white, 5-9 gold, 10-19 orange, 20+ red w/ subtle pulse.
- Run-end summary persists `peak` to `runtime.stats.peakCombo` for results screen.

### Concern B — Crit hits

In `WG.HuntPlayer` damage path: 12% base crit chance, 1.6× multiplier. Tunables on `WG.HuntPlayer.CRIT_TUNABLES` frozen for future relic boost. On crit:
- Floating number renders 50% larger + gold gradient instead of white.
- Trauma kick +0.05 (additive to existing FX).
- Particle burst replaces standard hit particles with `critBurst` (8 sparkles + ring flash).
- Emit `enemy:crit` for audio hook (reuse existing `boss:damaged` sample at higher volume, throttle 60ms).

### Concern C — Results count-up + level-up flash

In `js/hunt/hunt-results.js`:
- Numbers count up from 0 to final value over 800ms (ease-out cubic). XP, coins, kills, peak combo.
- Per-row "tick" sound on milestone (every 25% of count-up).
- New row: PEAK COMBO with the gold/orange tier color.

In `js/hunt/hunt-player.js` `levelUp()`:
- Full-screen flash (gold, opacity 0.5, 320ms fade) — reuse `flashScreen` from wg-game.js or duplicate.
- Trauma 0.4 + freeze frame 200ms.
- Floating "LEVEL UP!" text rises from player position over 1.2s.

## Constraints

- Don't change mechanics balance — crit chance/multiplier are frozen tunables, not runtime configurable yet.
- Don't touch combat AI or wave spawning.
- Test all 3 concerns at `http://localhost:3996/` — kill 20 enemies fast, confirm combo HUD scales + tiers. Confirm crit visibility. Run a full stage to results, watch count-up.
- `node --check` all touched files before commit.

## Done marker

`workers/done/W-Dopamine-P1.done` with summary + tier color values + crit tunables.
