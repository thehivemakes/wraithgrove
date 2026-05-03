# W-Polish-Gaps-1-5

You are Worker — the **post-audit polish-gap closure** worker. 5 small concerns, one Sonnet pass.

Walk the birth sequence (`/Users/defimagic/Desktop/Hive/CLAUDE.md` → `Birth/01-04` → `THE_PRINCIPLES` → `HIVE_RULES` → `COLONY_CONTEXT` → `BEFORE_YOU_BUILD`).

Then read:
- `build-v2/CLAUDE.md`
- `STATE_OF_BUILD.md`
- `audits/AUDIT_Menu_Banshee_Repair_Spawn_20260503T100016Z.md` (the audit that surfaced these gaps — read §"Polish gaps surfaced (non-blocking)")
- `js/hunt/hunt-enemies.js` (Banshee AI block, lines 117-158ish)
- `js/hunt/hunt-fx.js` (existing event-listener patterns for `repair:tick` / `repair:complete`)
- `js/core/wg-audio.js` (EVENT_MAP — for shriek audio swap)
- `js/wg-game.js` (renderHero — `wg-rift-intrude` class hook)
- `js/hunt/hunt-player.js` (search for `runWood` and the defensive repeat the audit flagged)

## The 5 gaps to close (ONE COMMIT EACH)

### Concern A — Banshee tunables to catalog

In `js/hunt/hunt-enemies.js` `TYPES.banshee`: the AI-branch (`banshee_charge`) currently inlines magic numbers — charge duration (0.8s), charge speed mult (1.8×), shriek-particle count (16), trauma value (0.3), flash alpha (0.3), flash duration (200ms).

Promote these to named fields on the catalog entry:
```js
banshee: {
  ...,
  shriekCooldown: 4.0,         // already there
  chargeDuration: 0.8,         // NEW
  chargeSpeedMult: 1.8,        // NEW
  shriekParticleCount: 16,     // NEW
  shriekTrauma: 0.3,           // NEW
  shriekFlashAlpha: 0.3,       // NEW
  shriekFlashDurationMs: 200,  // NEW
  shriekLateralMult: 0.4,      // NEW (the sin-wave perpendicular factor)
}
```

Then in the AI branch, READ from `c._typeData.<field>` instead of hardcoded values. No behavior change — pure refactor for designer-tunability.

### Concern B — Real banshee shriek audio

Source a CC0/CC-BY ghostly female screech sample from freesound.org or pixabay (matching tags: "ghost scream", "banshee wail", "horror female screech"). 1-2 seconds, mono, 44.1kHz, MP3 ~50KB.

Place at: `audio/sfx/banshee_screech.mp3`

Update `js/core/wg-audio.js` EVENT_MAP entry for `enemy:shriek`:
- Change `id: 'boss_die'` → `id: 'banshee_screech'`
- Keep bus 'sfx', throttleMs 600, vol 0.85

Document the source URL + license in a comment above the entry.

### Concern C — Symmetric event-listener for shriek FX

Audit gap: shriek FX is inlined in the AI tick (hunt-enemies.js), asymmetric with `repair:complete` which uses an event listener pattern (hunt-fx.js subscribes).

Refactor:
1. In `hunt-enemies.js` AI branch: ONLY emit `enemy:shriek` and call `addTrauma`. Remove the inline `HuntFX.burst` + flash calls.
2. In `hunt-fx.js`: add an `enemy:shriek` listener that performs the burst + screen flash, mirroring the `repair:complete` pattern. Read the tunables from `creature._typeData.shriek*` so designers tuning the catalog see the FX update too.

Verify: shriek behavior identical pre/post (same trauma, same particles, same flash). The change is structural only.

### Concern D — `wg-rift-intrude` class wired to procedural canvas

In `js/wg-game.js` `renderHero()`: the rift-intrusion drop-shadow + glitch keyframe (Concern D from W-Menu-Art-Pass) currently only fires when illustrated portraits ship via `CHARACTER_PORTRAITS[<id>]`.

Make it work on the procedural canvas character too:
1. Add `RIFT_GUESTS = []` array to wg-game.js scope (currently empty — Ysabel queued behind KingshotPro launch).
2. When the active character id is in `RIFT_GUESTS`, add `wg-rift-intrude` class to the character canvas element AND apply the violet drop-shadow + glitch keyframe.
3. Test path: temporarily set `RIFT_GUESTS = ['lantern_acolyte']`, scroll the menu, confirm violet edge + glitch fires on procedural canvas. Then revert to empty array before commit.

This makes the rift visual canon testable now without waiting for illustrated assets.

### Concern E — `runWood` defensive repeat comment

Find the duplicate `runWood` exhaustion-guard the audit flagged (search `js/hunt/hunt-player.js` for the second guard). Add a one-line comment above the second guard:

```js
// Defensive repeat: covers the case where mid-batch turret repair drains the
// last wood after the first guard already passed. Do not strip on cleanup.
```

That's it. No behavior change — pure intent documentation.

## Constraints

- ONE COMMIT per concern (5 commits total).
- No code in catalog files (catalog edits are pure data).
- No behavior change in A, C, E. Behavior changes only in B (real audio replaces placeholder) and D (rift class wired).
- `node --check` all 5 touched files before each commit.
- Test happy path at `http://localhost:3996/` after each commit:
  - A: trigger Banshee shriek, confirm FX still fires
  - B: trigger shriek, confirm new audio sample plays (browser console may show first-load fetch)
  - C: trigger shriek, confirm FX matches pre-refactor visually
  - D: with `RIFT_GUESTS = ['lantern_acolyte']` temporarily, confirm violet glitch on character canvas
  - E: load Hunt, repair turret to wood-zero, confirm no crash

## OUTPUT DISCIPLINE (absolute paths only)

Done marker: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/workers/done/W-Polish-Gaps-1-5.done`

After writing, from `/Users/defimagic/Desktop/Hive`:
```
git add MobileGameResearch/wood-siege/build-v2/
git commit -m "W-Polish-Gaps-1-5 — done marker + 5 polish gaps closed"
git push
```

Done-marker contents: per-concern verdict + commit SHAs + the audio source URL + license + a brief note on whether the rift class test passed visually.

NO new specs. NO scope creep beyond the 5 gaps.
