# AUDIT — Batch F/G/H/I (FX-Polish-Pass + Roster-And-Rebirth + Buildings-Tab-UI)

Auditor: scheduled task `w-audit-batch-fghi` (audit-only Sonnet, no js/ edits).
Timestamp: 2026-05-02 10:19:14 UTC.
Scope: three predecessor workers — FX-Polish-Pass, Roster-And-Rebirth, Buildings-Tab-UI.

> Note on batch label: prior audit was "B/C/D/E"; the next four workers were
> F (FX-Polish-Pass), G (Roster-And-Rebirth), H (Buildings-Tab-UI). The task
> brief says "FGHI" but only three workers shipped this batch — the fourth
> slot (I) is unfilled. Audit covers the three landed workers and notes the
> phantom fourth.

---

## §0 — Predecessor markers

| Marker | Status | Path |
|---|---|---|
| `workers/done/W-FX-Polish-Pass.done` | ✓ present | content cites commits 7e76783 / a7c8519 / fc372b9 |
| `workers/done/W-Roster-And-Rebirth.done` | ✓ present | content cites commits 7033340 / a2008e0 / b875c07 |
| `workers/done/W-Buildings-Tab-UI.done` | ✓ present | content cites commits ea9fea1 / a2c49a9 / 5cd6006 |

`git log` confirms all three workers landed three commits each (one concern per
commit) plus a fourth done-marker commit for FX-Polish-Pass. **Markers PASS.**

---

## §A — Static checks

### A.1 — `node --check` on every modified `.js` (15 files)

Ran `node --check` against the union of files touched across the three workers.
**All PASS** — zero parse errors.

```
PASS  js/hunt/hunt-fx.js              PASS  js/ascend/ascend-skins.js
PASS  js/hunt/hunt-render.js          PASS  js/ascend/ascend-rebirth.js
PASS  js/hunt/hunt-turret.js          PASS  js/ascend/ascend-render.js
PASS  js/hunt/hunt-results.js         PASS  js/core/wg-state.js
PASS  js/wg-game.js                   PASS  js/duel/duel-roster.js
PASS  js/core/wg-audio.js             PASS  js/forge/forge-render.js
PASS  js/forge/forge-buildings.js     PASS  js/forge/forge-daily.js
PASS  js/forge/forge-craft.js
```

### A.2 — Required-artifact greps

| Artifact | File:Line | Result |
|---|---|---|
| `WG.AscendChars.list` callsite | `js/ascend/ascend-render.js:199` | **PASS** — `for (const ch of WG.AscendChars.list())` drives the 9-tile picker |
| 9-character `CHARACTERS` catalog | `js/ascend/ascend-skins.js:12,23,34,45,56,66,77,87,98` | **PASS** — exactly 9 entries: `lantern_acolyte`, `sigil_student`, `horned_oni`, `paper_priest`, `silent_seer`, `scythe_widow`, `ash_brawler`, `fox_kabuki`, `cap_apprentice` |
| Cultivate cost ladder | `js/ascend/ascend-skins.js` (`CULTIVATE_LADDER`) + done-marker spec | **PASS** — `{2:800, 3:2880, 4:14400}` with `power × 12` fallback |
| 4×2 buildings grid HTML elements | `js/forge/forge-render.js:246-253` | **PASS** — `display:grid;grid-template-columns:repeat(4,1fr)` + `makeBuildingTile` per slot, 8 tiles (3 unlocked, 5 locked). Note: implemented via inline-styled `<div>`, not a literal `id="buildings-grid"`. Structural element is present and correct. |
| Crafting modal | `js/forge/forge-render.js:486-525` (anvil tap → modal) and `js/forge/forge-craft.js` (probability table) | **PASS** — Craft × 10 button + ⓘ Probability Info nested modal + material display + disabled state on insufficient fragments / daily cap |
| Daily Chest 7-day streak persistence | `js/core/wg-state.js:41-56` (`forge.daily.{streak, streakLastClaimMs, claimedDays}`) + `js/forge/forge-daily.js:42-64` (`tryClaim` writes `streak`, `streakLastClaimMs`, `claimedDays`) | **PASS** — persisted on `WG.State`, grace window `STREAK_GRACE_MS` for skip detection, day-7 sets `rareRelicChance` flag |
| **Polish-gap listener 1**: `pickup:torch` | emit `js/hunt/hunt-player.js:434`; listener `js/hunt/hunt-fx.js:175`; audio bind `js/core/wg-audio.js:54` | **PASS** |
| **Polish-gap listener 2**: `player:revived` | emits `hunt-player.js:334` + `hunt-results.js:112`; listener `hunt-fx.js:184`; audio bind `wg-audio.js:55` | **PASS** |
| **Polish-gap listener 3**: `turret:destroyed` (gap was missing screen kick) | emit `hunt-turret.js:163`; listener `hunt-fx.js:171` plus inline `WG.HuntRender.addTrauma(0.4)` at `hunt-turret.js:166` | **PASS** |
| **Polish-gap listener 4**: `buff:expired` | emit `meta-buffs.js:49`; listener `hunt-render.js:2297` (HUD ghost-pill); audio bind `wg-audio.js:56` | **PASS** |
| **Polish-gap listener 5**: `buff:consumed` | emit `meta-buffs.js:60`; listener `hunt-render.js:2298` + confirm-burst `hunt-fx.js:198`; audio bind `wg-audio.js:57` | **PASS** |
| `flashScreen` exposed on `WG.Game` | `js/wg-game.js:484` | **PASS** — gap A required this for the player:revived cyan flash; previously private |
| `ascend-rebirth.js` registered | `index.html:340` | **PASS** — sits between `ascend-skins.js` and `ascend-render.js` in dependency order |

**§A verdict: PASS** (16/16 static checks).

---

## §B — Live runtime smoke

Live URL: `https://defimagic.io/wraithgrove/` (the production deploy from
`thehivemakes.com/wraithgrove/` is currently the Hive landing page, not the
app — the app lives on `defimagic.io`).

| Check | HTTP | Detail |
|---|---|---|
| `index.html` | 200 | 19,321 bytes |
| Build banner | — | `WG.BUILD.version = '0.16.0-batch-fghi-1777714839'` — cache-bust query param matches this batch label, deployment is current |
| `js/ascend/ascend-rebirth.js` | 200 | 11,506 bytes — md5 matches local `a2e7c502b306ec463b7d97abff41ed45` |
| `js/ascend/ascend-skins.js` | 200 | 10,778 bytes |
| `js/ascend/ascend-render.js` | 200 | 15,464 bytes |
| `js/forge/forge-craft.js` | 200 | 2,588 bytes — md5 matches local `61d2a43c76e36b71f877347a633a9bad` |
| `js/forge/forge-daily.js` | 200 | 3,570 bytes |
| `js/forge/forge-buildings.js` | 200 | 5,765 bytes |
| `js/forge/forge-render.js` | 200 | 27,549 bytes |
| `js/hunt/hunt-fx.js` | 200 | 9,819 bytes |
| `js/hunt/hunt-render.js` | 200 | 106,263 bytes |
| `js/hunt/hunt-results.js` | 200 | 7,662 bytes |
| `js/hunt/hunt-turret.js` | 200 | 10,667 bytes |
| `js/wg-game.js` | 200 | 21,103 bytes |
| `js/core/wg-state.js` | 200 | 4,894 bytes |
| `js/core/wg-audio.js` | 200 | 12,224 bytes |
| `js/duel/duel-roster.js` | 200 | 1,849 bytes |

15 of 15 changed files reach the live deploy. Two spot md5 checks (rebirth +
craft) match local exactly — deploy is the same code that was committed and
audited statically.

**§B verdict: PASS.**

---

## §C — Polish-quality assessment (Architect mandate)

The mandate from `audits/AUDIT_BatchBCDE_20260501T200626Z.md` was: every batch
ships visible, eased polish — no stair-step animations, no snap-removals, no
silent gameplay events. Receipts from this batch:

### C.1 — FX-Polish-Pass (the audit's own §C.2 follow-up)

The batch BCDE audit listed seven polish gaps. This worker explicitly closes
**five of them** (gaps 1, 2, 3, 5, 7), with gaps 4 and 6 deferred and named.

| Gap | Was | Now | Receipt |
|---|---|---|---|
| 1 — `player:revived` silent | no FX, no audio, no flash | cyan + gold ring burst (32 particles), 0.5 trauma kick, full-screen `flashScreen('#80f0ff', 0.45, 380)`, "REVIVED" float-text, `level_up` sample on `sfx` bus | `hunt-fx.js:184-197`, `wg-audio.js:55` |
| 2 — `buff:expired/consumed` snap-removed from HUD | pill vanished instantly | 280ms ghost-pill desaturation track — gray border + dim fill fade-out before pruning, `BUFF_GHOST_DUR_MS=280` | `hunt-render.js:42-47, 1968-2018, 2253-2260` |
| 3 — `pickup:torch` silent | no FX, no audio | warm orange-yellow sparkle burst (gravity -20), "+TORCH" float-text, `orb` sample with 60ms throttle | `hunt-fx.js:48-55, 175-181`, `wg-audio.js:54` |
| 5 — `turret:destroyed` no screen kick | trauma stack untouched | `addTrauma(0.4)` inline on emit | `hunt-turret.js:165-167` |
| 7 — `buff:consumed` no positive feedback at player | (was tied to gap 2 visually) | gold confirm-burst at player position + "USED" float-text + `cha_ching` sample | `hunt-fx.js:188-198`, `wg-audio.js:57` |

Beyond gap-closure: the **ad-revive countdown** in `hunt-results.js:75-101` is
not a stair-step number — it's a per-second scale pulse (1.0 → 1.55 → 1.0 with
overshoot ease-back) plus a four-step color shift `white → yellow(3s) → orange(2s)
→ red(1s) → fade(0)`. This is the kind of detail the Architect's mandate
specifically asks for: no number ticks down without telling you *how* it feels
to be down to it.

**Polish quality: high.** Five real gameplay gaps, five real responses, all
eased, all audio-bound. Two named-and-deferred gaps (Day↔Night transition and
wave-tier 5/10/15 silence) are scope-honest, not scope-hidden.

### C.2 — Roster-And-Rebirth

**Modal pop-in + sequenced rewards.** `ascend-rebirth.js` injects 6 keyframes:

- `rebirth-glow` — 2.4s `ease-in-out` infinite golden pulse on the modal border.
- `rebirth-portrait-out / -in` — 1.2s in-place crossfade (not a card flip, not
  a snap), gated by 1.1s `rebirth-flash-burst` (radial gold flash).
- `rebirth-chip-in` — 420ms `cubic-bezier(0.34,1.56,0.64,1)` overshoot; chips
  drop in with **180ms stagger** (line 225). This is the "land with mass" feel
  the Architect's polish review keeps citing.
- `rebirth-arrow-pulse` — 1s ease-in-out infinite on the cultivate-CTA arrow.

**Roster picker tap response.** `ascend-render.js:141-153`:

- Keyframe `roster-tap-bounce` is a 4-stop scale curve `1 → 0.92 → 1.06 → 1`
  over 320ms — overshoot, not linear. Active-tile press uses CSS
  `:active { transform: scale(0.96); }` for instant tactile response under the
  finger.
- Active tile gets `border-color:#ffd870 !important; box-shadow: 0 0 12px
  rgba(255,216,112,0.45)` — visible affordance, not just a checkmark.

**HUD power readout** annotates *which* character + tier contributes to the
total Power and what the next-tier marker / cultivate cost is. This is the
reverse-vector of stair-step UI: numbers come with provenance.

**Polish quality: high.** Easing curves are intentional, modal sequence is
storytelling, roster tap is tactile.

### C.3 — Buildings-Tab-UI

**Diorama is alive.** `forge-render.js:173-205`:

- Two-frequency campfire flicker (`DIORAMA_FLICKER_HZ_PRIMARY = 4.7`,
  `_OVERTONE = 9.2`). Two prime-ish frequencies — won't lock into a visible
  cycle; reads as natural fire rather than a sine wave.
- rAF stops on tab change (line 205-area `dioramaRAF` cancellation) — not
  burning frames when the user is on Hunt or Ascend.

**Daily Chest count-up.** `forge-render.js:565-604`:

- Reward modal animates the gained-coin total over 700ms with cubic ease-out
  (`1 - Math.pow(1 - t, 3)`). Not a snap, not linear. Tied to rAF, bails on
  detached node.
- Streak strip uses 7 grid pips with three visual states (current = glowing,
  claimed = dimmed green, future = dim brown). Day 7 carries the ★ glyph
  instead of 🪙 — discrete signal that the rare-relic chest is the goal.

**Locked-slot unlock flow.** `forge-buildings.js`:

- Three exits: standard cost (only when GS gate met), 200💎 bypass, Watch Ad
  bypass. The GS gate readout is **orange when not met**, not just disabled —
  the player sees *why* they can't unlock, not just *that* they can't.

**Power formula.** Concern C lifts buildings from `level × 6` to `level × 50`
to match `scr_02`'s mid-tier 1347 (default state moves from 76 → 208). This is
the kind of rebalance the BCDE audit flagged as needed for the Power-stat
aggregation to feel meaningful.

**Polish quality: high.** Diorama is non-cyclic, count-up is eased, unlock
flow is explanatory rather than punitive.

---

## §D — Concerns and notes

### D.1 — Uncommitted change in `js/forge/forge-render.js`

`git status` shows one uncommitted hunk in `forge-render.js:357` (line in
streak-pip rendering): `def.coins` → `'' + def.coins`. A 1-character string
coercion fix for the streak strip's coin numerals. This change is **not part
of the three batch commits** and predates or postdates them. Live deploy
already includes whatever was committed; this stray hunk is on disk but not
shipped.

Recommendation: a follow-up worker should either commit this 1-char fix or
revert it. **Not a fail signal for this batch** — this batch's three workers
shipped what they said they shipped, and md5 spot-checks against the live
deploy match the committed state.

### D.2 — `buildings-grid` literal ID

The brief asked for "buildings-grid HTML elements." The grid exists
structurally (4×2 inline-styled `<div>` with 8 tiles) but is not given a
literal `id="buildings-grid"`. If a downstream selector relies on that ID,
it will break. **Pass for structural presence, flag for any future
selector-based instrumentation.**

### D.3 — Phantom worker "I"

The task brief says "FGHI" (four workers). Only three workers shipped this
batch (FX-Polish-Pass = F, Roster-And-Rebirth = G, Buildings-Tab-UI = H).
There is no W-I worker on disk. Either the brief was rounding up, or a
fourth worker was planned and never spawned. **Pass on what shipped, flag
the absent fourth.**

### D.4 — Pre-existing `forge-render` appendChild error

The W-FX-Polish-Pass done-marker note mentions: *"Pre-existing forge-render
appendChild errors observed (unrelated, predates this worker)."* Out of
scope for this audit but worth a worker brief — uncaught console errors
are the kind of thing that erode trust in the polish layer.

---

## §E — Final verdict

| Section | Verdict |
|---|---|
| §0 Markers | PASS |
| §A Static (`node --check` + 16 artifact greps) | PASS |
| §B Live runtime smoke (15 files reach live deploy, 2 spot md5 matches) | PASS |
| §C Polish quality (Architect mandate) | PASS — high quality across all three workers |
| §D Concerns | 4 notes, none rise to FAIL |

**Batch F/G/H verdict: PASS.**

No `workers/AUDIT_FAIL.flag` written.

Three workers, three real shipments, polish discipline visible at the line
level (eased curves, overshoot easings, two-frequency flicker, sequenced
modal staging, audio-bound gameplay events). Five named gameplay gaps from
the prior audit are now closed, with two remaining gaps named-and-deferred
honestly. Ready for the next batch.

— Auditor (scheduled `w-audit-batch-fghi`)
