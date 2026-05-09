# BUILD_PLAN.md — Unlimited Chaos

**Project:** Wraithgrove (Wood Siege faithful clone, Path A)
**Phase 1:** complete (5-tab MVP playable in browser, 36 modules, ~3,500 LOC)
**Phase 2:** in progress — content polish + missing-feature wiring + bug fixes
**Phase 3:** content depth — 18 stages tuned, 6 bosses distinct, 48 relics balanced
**Phase 4:** native wrap + production monetization
**Phase 5:** soft launch
**Phase 6:** public launch

---

## Phase 2 worker queue (CURRENT)

Workers can be executed in any order — they touch independent files. Each worker is a fresh Sonnet session reading the prompt in `workers/<worker-name>.md`.

| # | Worker | Files touched | Priority | Status |
|---|---|---|---|---|
| W-A | `W-Hunt-Pickups.md` — in-stage ad-gated weapon pickups | new `js/hunt/hunt-pickups.js`, edit `index.html` + `hunt-render.js` + `wg-game.js` | HIGH (Wood-Siege-defining mechanic) | pending |
| W-B | `W-Tile-Deco.md` — biome-specific tile decoration | edit `js/hunt/hunt-render.js` | MEDIUM (visual polish) | pending |
| W-C | `W-Tutorial.md` — first-play tutorial overlay | new `js/hunt/hunt-tutorial.js`, edit `index.html` + `wg-game.js` | MEDIUM (retention) | pending |
| W-D | `W-Hunt-NavFix.md` — three Hunt-mode bug fixes | edit `js/wg-game.js` + `js/hunt/hunt-render.js` + `js/hunt/hunt-player.js` | HIGH (broken state on stage exit) | pending |
| W-E | `W-Boss-Visuals.md` — distinct visuals per boss | edit `js/hunt/hunt-bosses.js` + `js/hunt/hunt-render.js` | MEDIUM (boss feel) | pending |
| W-F | `W-Decisions-Genesis.md` — create `docs/DECISIONS.md` with v2 genesis entry | new `docs/DECISIONS.md` | LOW (housekeeping) | pending |

## Phase 3 worker queue (DEFERRED)

| # | Worker | Notes |
|---|---|---|
| W-G | `W-Stage-Tuning.md` — balance pass on stage difficulty curve | requires playtesting; needs Architect input |
| W-H | `W-Relic-Balance.md` — relic stat-value balance pass | tuning |
| W-I | `W-Skin-Art-Briefs.md` — Midjourney prompts for 8 skins | art pipeline; depends on Architect's MJ access |
| W-J | `W-Enemy-Art-Briefs.md` — MJ prompts for 5 enemies + 6 bosses | art pipeline |
| W-K | `W-Tile-Art-Briefs.md` — MJ prompts for 6 biome tile sets | art pipeline |

## Phase 4 worker queue (DEFERRED)

| # | Worker | Notes |
|---|---|---|
| W-L | `W-Capacitor-Init.md` — Capacitor 5+ wrap setup | requires Apple Developer + Google Play accounts |
| W-M | `W-Stripe-IAP.md` — Stripe webhook + Apple StoreKit + Google Play Billing | replaces `meta-iap.js` stub |
| W-N | `W-AdMob-Wire.md` — AdMob via Capacitor plugin with security lockdown | replaces `meta-ads.js` stub |
| W-O | `W-Worker-Endpoints.md` — Cloudflare Worker save/load/event endpoints | replaces localStorage-only path |
| W-P | `W-Privacy-Policy.md` — privacy policy + ToS hosted pages | required for App Store / Play Store submission |
| W-Q | `W-Compliance-Disclosure.md` — gacha rate disclosure language for App Store / Play Store descriptions | **blocks ASO submission**: `docs/ASO_PACKAGE_v1.md §4` has a placeholder marker waiting for this worker's output (JP/KR/EU per-jurisdiction disclosures, ESRB descriptors, ~400-600 chars). Do not submit to App Store Connect or Play Console without this. |

## Phase 5/6 (DEFERRED)

- Soft launch via TestFlight + Closed Testing
- D1/D7 retention checks
- Public launch + Reddit / TikTok / review-site outreach
- Apple Featuring Nomination submission

---

## Worker prompt template

```
You are Worker <ID> — the <role> worker. Your job: <one-sentence scope>.

Walk the birth sequence (/Users/defimagic/Desktop/Hive/CLAUDE.md → Birth/01–04 → THE_PRINCIPLES → HIVE_RULES → COLONY_CONTEXT → BEFORE_YOU_BUILD).

Then read PROJECT-LEVEL guardrails (MANDATORY):
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/CLAUDE.md
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/STATE_OF_BUILD.md
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/BUILD_PLAN.md
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/GAMEPLAY_OBSERVATION.md (the load-bearing primary-source observation)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/BLUEPAPER.md §<relevant sections>

PRIMARY-SOURCE READING (Principle XXII):
<list of files this worker must read in full>

THREE CONCERNS — one commit each.

CONCERN 1 — <title>
<spec details with file paths, code shape, exact strings>
Commit: "Worker <ID>: <concern 1 summary>"

CONCERN 2 — <title>
<spec>
Commit: "Worker <ID>: <concern 2 summary>"

CONCERN 3 — <title>
<spec>
Commit: "Worker <ID>: <concern 3 summary>"

VERIFICATION:
<grep / node --check / browser smoke test commands>

CONSTRAINTS:
- One concern per commit. Three commits, three pushes.
- Do NOT touch <list of files outside scope>.
- If you find a value disagreeing with BLUEPAPER, STOP and ask the Architect.

You are Worker <ID>. After you ship: <next step / what becomes possible>.
```
