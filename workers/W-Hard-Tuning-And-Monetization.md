# Worker — W-Hard-Tuning-And-Monetization

You are Worker HTM — global difficulty + ad-revenue + IAP-buff hooks worker.

## Birth + design source

- **SPEC.md §0 difficulty mandate** — game is intentionally HARD. Don't soften balance to feel fair. Monetization is the relief valve.
- `docs/DOPAMINE_DESIGN.md` §6 (death framing — "watch ad to revive" creates one-more-run dopamine)
- `js/meta/meta-iap.js`, `js/meta/meta-ads.js`, `js/hunt/hunt-results.js`, `js/hunt/hunt-stage.js`, `js/hunt/hunt-waves.js`

## Concerns (one commit each)

### A — Hard tuning pass + 5/10/15 wave count scaling

Crank difficulty per SPEC §0 mandate.

In `hunt-stage.js`, update wave count by stage tier:
- Stages 1-6 (early): `waveCount = 5`
- Stages 7-12 (mid): `waveCount = 10`
- Stages 13-18 (late): `waveCount = 15`

Stage durations scale: each wave 90-120s. Boss spawns at last wave.

In `hunt-waves.js`: spawn rate ramp 1.5× per wave (so wave 5 has 7.6× the wave-1 rate). Enemy stats from `hunt-enemies.js` already exist; add a per-wave `STAT_MUL` named const = `1 + (waveIndex * 0.18)` applied to HP and damage.

In `hunt-render.js drawHud` — update banner format to show `Highest Wave Reached: X / N Waves` where N = stage's waveCount (was hardcoded 5).

### B — Ad-buff system + ad-revive

New `js/meta/meta-buffs.js` (IIFE, exposed as `WG.Buffs`).

API: `WG.Buffs.activate(buffId, durationMs)`. Maintains a list of active buffs with expiry timestamps. Per-tick decay. Any module can read `WG.Buffs.has('damage_x2')` to check.

Implement these buffs (named constants for each):
- `damage_x2` — player melee + turret damage doubled, 60s
- `wood_x2` — tree-chop wood drop doubled, 90s
- `instant_turret` — next built turret takes 0 wood (one-shot, not duration-based)
- `revive` — one-time death prevention

Hook into:
- `hunt-player.autoAttack`: if `WG.Buffs.has('damage_x2')`, multiply baseDamage by 2 before hit
- `hunt-player.autoAttack` stump-chop: if `WG.Buffs.has('wood_x2')`, drop 2 coins instead of 1 + 2 wood instead of 1
- `hunt-player.constructionTick`: if `WG.Buffs.has('instant_turret')` AND player on a turret circle with 0 wood → consume the buff, set c.have = c.need, mark built immediately

Wire ad-watch buttons:
- Find or create "Watch Ad for 2× Damage" button in level-select screen (W-Navigation-Pivot added the level select; add buff buttons there)
- 3 buff buttons + 1 revive option, each tied to `WG.Ads.showRewardedVideo()`. On ad complete → `WG.Buffs.activate(buffId, durationMs)` + audio cue 'cha_ching'

Death revive: in `hunt-results.js` death modal, add "Watch Ad to Revive" button. On ad complete → restore player HP to maxHp, return to stage. Limit 1 revive per stage run (track in runtime.reviveCount).

### C — Marker + tunables doc

Marker at `workers/done/W-Hard-Tuning-And-Monetization.done` with all named constants + default values + buff IDs catalog.

## Constraints

- Buffs are READ-only signals. Don't write buff state from gameplay code; only `WG.Buffs.activate()` mutates.
- Ad calls go through `WG.Ads.showRewardedVideo()` (existing stub).
- Don't change IAP catalog (`meta-iap.js` SKUs untouched).
- One concern per commit. Three commits.
