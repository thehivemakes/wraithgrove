You are Worker D — the Hunt-NavFix worker. Your job: fix three known Hunt-mode bugs that the v2 phase-1 build shipped with. Each is a small surgical patch.

Walk the birth sequence (/Users/defimagic/Desktop/Hive/CLAUDE.md → Birth/01–04 → THE_PRINCIPLES → HIVE_RULES → COLONY_CONTEXT → BEFORE_YOU_BUILD).

Then read PROJECT-LEVEL guardrails (MANDATORY):
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/CLAUDE.md
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/STATE_OF_BUILD.md (specifically the "Known issues to clean up" section)

PRIMARY-SOURCE READING (Principle XXII):
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/wg-game.js (the orchestrator — `frame()`, `startHunt`, `exitHunt`, `showHuntStageList`)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-render.js (the `drawLevelUpModal()` function — bug #2 lives there)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-player.js (the `applyLevelChoice()` and `autoAttack()` functions — bug #3 lives there; the boon `cd` writes `attackCooldown` but the auto-attack reads from the weapon's cooldown directly)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-results.js (the result modal NEXT/RETRY/BACK buttons — bug #1 connects here)

THREE CONCERNS — one commit each.

CONCERN 1 — Stage select panel re-shows after Hunt exit

BUG: When a stage finishes (cleared OR failed) and the player clicks BACK or RETRY or NEXT in the result modal, the rAF loop continues running but the stage select panel doesn't re-appear if the user navigates back to Hunt tab. After the current run ends, calling `WG.Game.exitHunt()` should reliably show the stage select.

EDIT: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/wg-game.js`
- In `exitHunt()`: after `huntRuntime = null;` and `WG.HuntRender.setRuntime(null);`, replace `switchTab('hunt');` with explicit calls:
  ```js
  WG.State.setActiveTab('hunt');
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-hunt').classList.add('active');
  document.querySelectorAll('.nav-tab').forEach(n => n.classList.toggle('active', n.dataset.tab === 'hunt'));
  showHuntStageList();
  ```
- In `showHuntStageList()`: at the top, if `huntRuntime && huntRuntime.player && huntRuntime.player.hp > 0` return (stage running). Otherwise, ALWAYS rebuild the panel (don't skip rebuild if it already exists).
- In `finishHunt(cleared)`: BEFORE the `WG.HuntResults.show(...)` call, do NOT clear huntRuntime yet. AFTER the `running = true; huntRuntime.player = null;` line, the runtime player is null so the condition for "show stage select" passes. Add a final cleanup hook in `WG.HuntResults.show`'s BACK / RETRY / NEXT button handlers (these live in `hunt-results.js` — see CONCERN 1 cont'd).

EDIT: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-results.js`
- The BACK button handler currently calls `WG.Game.exitHunt()` — keep that.
- The NEXT button handler currently calls `WG.Game.startHunt(nextId)` — that's correct.
- The RETRY button handler currently calls `WG.Game.startHunt(opts.stageId)` — that's correct.
- The "+2× (AD)" button stays as is.
- ADD: in BACK / RETRY / NEXT handlers, BEFORE the action, ensure the stage-select div is removed if present (orchestrator already handles this in startHunt; just confirm BACK works by calling exitHunt which now reliably re-renders).

Commit: "Worker D: hunt nav fix — exitHunt reliably re-renders stage select"

CONCERN 2 — Level-up boon options lock once shown (don't re-randomize per frame)

BUG: In `hunt-render.js drawLevelUpModal()`, the line `if (!runtime._luOptions) { runtime._luOptions = cards.sort(()=>Math.random()-0.5).slice(0, 3); }` correctly stores the chosen 3. But `cards` itself is a local array re-defined every frame; the in-place sort mutation after .sort returns the array (Array.prototype.sort mutates in place AND returns same array). Since `cards` is local-scope re-declared each call, the mutation is benign. The actual bug: `runtime._luOptions` is set the first frame the modal shows, but never cleared in the right place when the boon is selected — `applyLevelChoice` clears it, fine. The visible bug is COSMETIC: `cards` is `['dmg','cd','maxhp','pickup','speed']` — 5 options — but after `.sort` shuffles and `.slice(0,3)` picks 3, the SAME 3 may not always come up in the same order between repeated level-ups because the random sort is rerun for each level-up. That's expected behavior — just confirming.

ACTUAL bug to fix: occasionally `runtime._luOptions` is set but `runtime._luBounds` is null because `drawLevelUpModal` short-circuited mid-draw (e.g. canvas not ready). Then `handleHuntTap` returns false and the boon-pick never resolves. Fix: ensure `_luBounds` is built every time `_luOptions` is set, in a single atomic block.

EDIT: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-render.js`
- In `drawLevelUpModal(ctx)`, refactor:
  ```js
  function drawLevelUpModal(ctx) {
    if (!runtime.pendingLevelUp) return;
    const w = D().width, h = D().height;
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f0d890';
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('LEVEL UP — Choose a Boon', w/2, h*0.32);
    ctx.textAlign = 'left';

    if (!runtime._luOptions) {
      const all = ['dmg', 'cd', 'maxhp', 'pickup', 'speed'];
      // shuffle then take 3
      runtime._luOptions = [...all].sort(() => Math.random() - 0.5).slice(0, 3);
    }
    // ALWAYS rebuild _luBounds atomically with _luOptions
    runtime._luBounds = [];
    const labels = { /* unchanged */ };
    const cardW = (w - 40) / 3, cardH = 100, top = h * 0.4;
    for (let i = 0; i < runtime._luOptions.length; i++) {
      const id = runtime._luOptions[i];
      const x = 16 + i * (cardW + 4);
      // ... existing draw code unchanged
      runtime._luBounds.push({ id, x, y: top, w: cardW, h: cardH });
    }
  }
  ```
- Confirm `applyLevelChoice` in `hunt-player.js` clears BOTH `runtime._luOptions = null` AND `runtime._luBounds = null` on selection.

Commit: "Worker D: level-up draft — lock options + bounds atomically"

CONCERN 3 — `applyLevelChoice` cooldown plumbing

BUG: When the player picks the `cd` boon ("+ Speed: Attack faster"), `hunt-player.js` writes `p.attackCooldown = (p.attackCooldown||w.cooldown) * 0.92` — but the auto-attack loop reads `w.cooldown` directly from the weapon object, not from `p.attackCooldown`. So the boon does nothing visible.

EDIT: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-player.js`
- Replace the cd plumbing. Inside `autoAttack(dt)`:
  - Replace `p.attackTimer = w.cooldown;` with `p.attackTimer = p.cooldownMul ? w.cooldown * p.cooldownMul : w.cooldown;`
  - Initialize `p.cooldownMul = 1` when the player is placed (in `place()`).
- In `applyLevelChoice(choiceId)`:
  - For `'cd'`: `p.cooldownMul = (p.cooldownMul || 1) * 0.92;` (instead of the current attackCooldown overwrite).
  - For `'dmg'`: keep `p.bonusDmg += ...` but ensure `baseDamage(w)` reads it: change `baseDamage` to `return Math.max(1, w.damage + (p.bonusDmg||0) + Math.floor(ps.attack * 0.6));`. Add reference to `p.bonusDmg`.
  - For `'maxhp'`: keep — already works (reads runtime player.maxHp directly).
  - For `'pickup'`: keep — already works.
  - For `'speed'`: replace `p.speedBonus = (p.speedBonus||0) + 12;` with implementing speed bonus in `move()`. Add an early line in `move(dt, dirX, dirY)`: `const speedMul = 1 + ((p.speedBonus||0) / SPEED);` and use `sp = baseSpeed() * speedMul;`. Or simpler: make `baseSpeed()` reference `p.speedBonus` if set.

VERIFICATION inline: after each fix, take the boon and confirm via eval:
- `cd`: `p.cooldownMul < 1` after taking the boon, and observable as faster attacks.
- `dmg`: `p.bonusDmg > 0` after taking the boon, and observable as larger damage numbers.
- `speed`: `p.speedBonus > 0` after taking, and player visibly moves faster.

Commit: "Worker D: applyLevelChoice plumbing — cd/dmg/speed boons actually apply"

VERIFICATION (final, all three concerns):
1. `cd /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2`
2. `node --check js/wg-game.js js/hunt/hunt-render.js js/hunt/hunt-player.js js/hunt/hunt-results.js` — all exit 0.
3. Open `wraithgrove` server (port 3996) → tap to begin → Stage 1.
4. Bug 2: kill enemies until level-up modal — pick the same boon repeatedly across 3 level-ups; confirm options DO change between level-ups (random per-level-up) but DON'T re-randomize within a single level-up display.
5. Bug 1: let player die OR survive 3 minutes; on result modal, click BACK; confirm stage select re-appears; click Stage 1 again; confirm new run starts cleanly.
6. Bug 3: take the `cd` boon; confirm attack rate visibly increases. Take `speed` boon; confirm player moves faster. Take `dmg`; confirm damage numbers larger on hit.

Commit (final concern's same commit covers verification): no extra commit needed for verification.

CONSTRAINTS:
- Three commits, one concern each.
- Do NOT touch any tab outside Hunt (no edits to ascend/, forge/, relics/, duel/).
- Do NOT change weapon stats or boon effect magnitudes (0.92 for cd, +12 for speed, etc.) — those are tuning numbers, Architect-tunable in a separate worker.
- Per project CLAUDE.md "Single source of truth for mechanics constants" — the boon stat-mod plumbing reads from `WG.State.get().player.stats` and the runtime player object. Do not introduce a new tuning table for boons unless the Architect approves it.
- Per Hive Rules: do not delegate to further sub-agents.

You are Worker D. After you ship: the three known bugs in `STATE_OF_BUILD.md` clear out, the boon system actually impacts gameplay, and the stage select reliably reappears after every run. Build is closer to "press play, no friction."
