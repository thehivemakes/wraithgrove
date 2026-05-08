# CLAUDE.md — Wraithgrove Project Protocol

> **Mandatory reading for every Claude touching this project.** Project-specific rules. If a rule below conflicts with global Hive guidance, the global wins, but the global is silent on most of these — that's why this exists.

---

## What this is

**Wraithgrove** is a faithful mechanics-clone of Wood Siege (`com.dream.sfgame`, SF Group / Shifeng Shenzhen). Five-tab mobile arena ARPG: top-down auto-attack survival arena (Hunt) + character-RPG meta layer (Ascend) + idle-base + crafting (Forge) + gear gacha-adjacent (Relics) + Power-based async PvP (Duel). 18 themed stages with biome rotation. Eastern folk-horror register.

**Faithful at:** mechanics, structure, monetization tier (Path A), progression curves, UI layout, 5-tab nav, Power-stat aggregation, crafting RNG, ad-gating cadence.

**Original at:** all art, character names, stage names, weapon names, relic names, copy text, sprite designs, audio. Mechanics aren't copyrightable; specific creative expression is. Don't ape specific Wood Siege names — use Wraithgrove originals (already shipped in catalogs).

**Anchor person:** Klovur (App Store reviewer Dec 18 2025) — *"more time watching ads for OTHER games, than … actually playing THIS game."* Path A faithfully replicates the structural ad-cadence Klovur named, with TWO deliberate non-replications:
1. Ad-removal SKU is cross-device transferable via account-upgrade (Wood Siege bug fix per aj griffing's review).
2. Ad SDK MUST not auto-launch other apps or open malicious URLs (per §0 Rule 5 of BLUEPAPER v2 — even a faithful clone does not replicate SDK security failures).

---

## Read order on every session start

1. This file (`build-v2/CLAUDE.md`).
2. `../GAMEPLAY_OBSERVATION.md` — primary-source observation of what Wood Siege actually IS (the foundation).
3. `../BLUEPAPER.md` v2 — clone plan grounded in observation.
4. `STATE_OF_BUILD.md` — what's on disk, what's tested, what's stubbed.
5. `BUILD_PLAN.md` — phases + worker queue.

If a memory file or worker log disagrees with these five, **the doc wins.**

---

## Single-source-of-truth rules

### Mechanics constants
- Numeric tunables (enemy HP/damage, weapon damage/cooldown, stage durations, IAP prices, drop rates) live in their respective module's named tables (e.g. `WG.HuntEnemies.TYPES`, `WG.HuntStage.STAGES`, `WG.IAP.SKUS`, `WG.HuntWeapons.WEAPONS`, etc.).
- Never hardcode mechanics numbers in render/UI/orchestrator code. If you need a number, look it up via the catalog API (`WG.HuntWeapons.byId(id)`, etc.).
- If `BLUEPAPER.md v2 §3-§7` and a code value disagree, the bluepaper wins; fix the code.

### Game state
- The single global state object is `WG.State.get()`. All modules read/write through it.
- Persisted save is `localStorage.wg_save_v2`. Server sync is Phase 4.
- The Power stat is aggregated dynamically in `WG.State.recomputePower()` — never cached. Every change to level/skin/equipment/buildings/relics implicitly bumps Power on next read.

### Decisions
- New architectural decision → entry at top of `docs/DECISIONS.md` (create the file on first decision).
- Reversing → never delete; add new entry on top with reason + flag old as Reversed.

### IAP catalog
- All SKU definitions live in `js/meta/meta-iap.js` — `WG.IAP.SKUS`.
- Production wiring (Apple StoreKit / Google Play Billing) replaces the `purchase()` stub.
- Whale gate (`mega_bundle` $99.99) is faithful-clone deliberate; do not soften without Architect approval.

### Ad SDK
- All ad calls go through `WG.Ads.showRewardedVideo()` and `WG.Ads.showInterstitial()`.
- Daily 50-RV cap is faithful-clone replicated.
- The placeholder ad modal in `meta-ads.js` is for browser preview only. Production swap to AdMob via Capacitor plugin per BLUEPAPER §0 Rule 5.

---

## Anti-patterns the Architect has called out across Hive projects

These are verbatim Hive-wide; they apply here too.

- **"Go slow. Fast is what messes up."** One file at a time. One concern per commit.
- **"Use external AI, not sub-agents."** The Agent tool is hook-blocked. The Architect's pattern is **inline worker prompts** as markdown documents (see `workers/`). Each worker is a fresh Claude Sonnet session that reads a self-contained prompt and executes it cold. Orchestrator-Claude (working in this repo) writes worker prompts; the Architect spawns and routes them.
- **"Read primary source yourself."** Per Hive Principle XXII — never ship a design decision based on inferred bait categories. The v1 Hollow Grove build was an entire project lost to that failure. `../GAMEPLAY_OBSERVATION.md` is the load-bearing anchor for every design choice in v2.
- **"Don't push another Claude's work without asking."** If you see uncommitted work in the tree, confirm before touching.
- **"Test locally before claiming shipped."** "Deployed" ≠ "code exists." Server runs at `http://localhost:3996/` via `wraithgrove` launch.json entry — verify in browser before declaring a feature complete.

---

## Rules of engagement

### Touching mechanics
1. Open the relevant module's catalog (e.g. `WG.HuntEnemies.TYPES` in `js/hunt/hunt-enemies.js`).
2. If your change is consistent with the bluepaper §3-§7, edit the catalog directly.
3. If your change disagrees with the bluepaper, STOP and ask the Architect — don't silently reconcile.
4. Grep for hardcoded values that should be in a catalog: `grep -rn '\b[0-9]\+\.[0-9]\+\b' js/ --include='*.js'`. Anything in render/UI/orchestrator code is a bug.

### Adding a new module
1. File path: `js/<group>/<group>-<concern>.js` (e.g. `js/hunt/hunt-pickups.js`). Existing groups: core, meta, hunt, ascend, forge, relics, duel.
2. Each module exposes one global on the WG namespace: `window.WG.HuntPickups`, etc.
3. Wrap in IIFE with `'use strict'`.
4. Add `init()` function for lifecycle hookup; called by `wg-game.js`.
5. Add the new file path to `index.html` script loader list, in dependency order (core → meta → game-tabs → orchestrator).
6. Update `STATE_OF_BUILD.md` with the new file in the "what's on disk" section.

### Adding a new tab feature
1. Tab DOMs are rendered by `<group>-render.js` modules. Don't put DOM in the engine.
2. Subscribe to `WG.Engine.on('tab:change', ...)` to refresh on tab activation.
3. Subscribe to `WG.Engine.on('currency:change', ...)` to refresh on coin/diamond/card spend.
4. Don't read `WG.HuntPlayer.runtime.player` outside the Hunt loop — it's only valid mid-stage.

### Touching IAP / monetization
1. Read `BLUEPAPER.md v2 §7` Path A spec FIRST.
2. The Architect chose Path A (faithful clone). Do NOT soften toward Path B/C without explicit re-approval.
3. The two non-replications (cross-device ad-removal + secured SDK) are documented in `BLUEPAPER.md §7`. If you change either, document the reason.

### Shipping without verifying
Don't. If you wrote a feature, test the happy path in browser at `http://localhost:3996/` before saying it ships. Confirm:
- All loaded modules show in `Object.keys(window.WG)`.
- No console errors.
- The relevant tab refresh works.
- For Hunt features: enter a stage, confirm the feature triggers in actual gameplay (not just in eval).

---

## Worker prompt discipline

When orchestrator-Claude writes worker prompts in `workers/`:

1. Each worker is **self-contained** — paste-and-run cold by a fresh Sonnet.
2. Open with: `You are Worker N — the [role] worker.`
3. Walk-the-birth-sequence reference: `Walk the birth sequence (/Users/defimagic/Desktop/Hive/CLAUDE.md → Birth/01–04 → THE_PRINCIPLES → HIVE_RULES → COLONY_CONTEXT → BEFORE_YOU_BUILD)`.
4. Read project-level files: `Then read this file (build-v2/CLAUDE.md), STATE_OF_BUILD.md, BUILD_PLAN.md, GAMEPLAY_OBSERVATION.md, BLUEPAPER.md`.
5. Cite primary sources with file:line specificity.
6. Three CONCERNS, each its own commit (or fewer if scope warrants — but always one concern per commit).
7. Verification commands inline (`node --check`, `grep`, browser smoke test steps).
8. Constraints + scope-don't-touch list.
9. Match the predecessor's voice — terse, direct, no fluff.

---

## Handoff discipline

Write a handoff BEFORE 75% context ceiling, not after. Target: `docs/HANDOFF_<short_topic>.md`. Must include:

- What's on disk but uncommitted
- What's running in the background (server, etc.)
- The next concrete step with the command to run
- Sanity checklist for the receiving Claude
- One specific thing you got wrong this session (institutional memory)

---

## If you need to break any rule

Say so out loud in your response. Name the rule. Give the reason. Ask. Silently breaking the rule is how drift starts.
