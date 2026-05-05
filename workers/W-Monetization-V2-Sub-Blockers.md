# W-Monetization-V2-Sub-Blockers

You are Worker — the **sub-system daily blockers** worker. Sonnet 3 of 5 in Monetization V2.

Walk the birth sequence (`/Users/defimagic/Desktop/Hive/CLAUDE.md` → `Birth/01-04` → `THE_PRINCIPLES` → `HIVE_RULES` → `COLONY_CONTEXT` → `BEFORE_YOU_BUILD`).

Then read:
- `build-v2/CLAUDE.md`
- `js/duel/duel-match.js` (PvP attempt flow — needs daily cap)
- `js/relics/relics-collection.js` + `relics-equip.js` (relic summon flow — needs daily free summon)
- `js/forge/forge-buildings.js` + `forge-craft.js` (resource flow — needs cap + regen)
- `js/core/wg-state.js` (state shape — extend with daily-reset trackers)

## Architect 2026-05-03 — design

Each sub-system gets ITS OWN daily blocker so free players rotate through systems instead of grinding one to exhaustion. The blockers are GENEROUS (not hostage-taking) and clearly disclosed. Whales skip via gem refills.

## Concerns

### Concern A — Daily duel attempt cap (5/day)

In `js/duel/duel-match.js`: add `dailyAttempts` counter to `WG.State.get().duelProgress`. Reset at midnight local time.

- `MAX_DAILY_ATTEMPTS = 5`
- Each duel start consumes 1 attempt. Display "Attempts: <n>/5" prominently in Duel tab.
- When 0 left: button greyed, tooltip "Attempts reset in <countdown>"
- Refill button next to counter: "Refill 5 attempts: 30 💎"
- Tunable on `WG.DuelMatch.TUNABLES`

### Concern B — Daily relic free summon

In `js/relics/relics-collection.js` (or wherever summon is gated):
- 1 free relic summon per day
- Reset at midnight local
- UI: big "FREE SUMMON" pulse button in Relics tab when available; greyed with countdown when used
- After free used, regular summon costs persist (existing flow)

### Concern C — Forge resource caps + offline regen

In `js/forge/forge-buildings.js` (or state init): wood/stone resources have caps. Already passively regenerate offline (existing pattern). Tighten:

- `WOOD_CAP = 500`, regen 1/30s
- `STONE_CAP = 200`, regen 1/60s
- Above cap: regen pauses (visual indicator: cap icon pulses subtly)
- Below cap: shows countdown to next +1
- Tunable on `WG.ForgeBuildings.TUNABLES`

Refill prompt when cap hit + player tries to start a craft costing more than current: "Buy 200 wood: 25 💎" / "Buy 100 stone: 25 💎"

### Concern D — Daily reset infrastructure (shared)

New module: `js/meta/meta-daily-reset.js` exports:
- `WG.MetaDailyReset.checkAndReset()` — call on each session boot
- Compares `lastResetDay` (YYYY-MM-DD local) against today
- If different: emit `daily:reset` event + update lastResetDay
- All sub-systems subscribe to `daily:reset` to clear their daily counters

Hook into `wg-game.js` init() so it runs once per session.

### Concern E — UI polish: surfacing "what's available today"

In Hunt menu hero tile (existing) or top of relevant tabs: small badges showing daily-available counts:
- Duel tab: "5 attempts ready" badge → "0 left, resets in <time>"
- Relics tab: "FREE pull ready" → "Used, resets in <time>"
- Daily mission count (if W-Monetization-V2-Missions-Pass landed): "5 missions today"

Use existing red-dot notification pattern for "something to claim".

## Constraints

- DO NOT change combat balance, stage durations, enemy stats, or any tuning that affects difficulty.
- Caps tighten existing systems; do NOT add new resources.
- All counters reset at midnight LOCAL time (per Path A faithful clone — Wood Siege uses local time).
- Generous defaults — if a free player feels punished, the design is wrong.

## OUTPUT DISCIPLINE (absolute paths)

Done marker: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/workers/done/W-Monetization-V2-Sub-Blockers.done`

5 commits (A-E). Same git add/commit/push pattern from Hive root after each.

## Test path

1. Cold-load → confirm `daily:reset` fires on date change
2. Use 5 duels → 6th blocked + countdown shown
3. Free relic pull works once → second blocked
4. Wood crafts at cap show offline-regen pauses
5. Refill prompts open IAP modal (or ad-watch fallback if applicable)
