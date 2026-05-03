# DOPAMINE_DESIGN.md — what makes survival-arena hybrids *thump*

**Author:** Worker DR (research-only, no code).
**Date:** 2026-04-30.
**Anchor:** Architect, 2026-04-29 — *"what exactly creates a dopamine hit for this style game? you are missing the piece."*
**Scope:** Concrete, code-level dopamine spec for Wraithgrove, synthesized from primary game-design analysis. No reinvention.

---

## TL;DR — the 5 things, in order of impact

1. **Per-second feedback density.** Every player input must trigger ≥3 channels of response (visual + audio + numeric) within 50–80ms. Vampire Survivors / Survivor.io live on this.
2. **Variable-reward draft moments.** The 3-card level-up draft is the single biggest engagement mechanic in the genre — RNG choices wrapped in player agency.
3. **Magnet + count-up loot.** Pickups must *fly* to the player and count up on a counter that scales/flashes. The flow of XP gems streaking inward is the iconic "dopamine moment" of the genre.
4. **Engineered escalation curve.** Weak at minute 1, god by minute 8–12. Genre rule, not flavor. Without it, the run is a treadmill.
5. **Death framing as progress.** A run that ends ≠ a run that was wasted. Permanent gold, XP, fragments banked. "One more run" lives or dies here.

Everything below expands these. Each section ends with **specific Wraithgrove implementation hooks** pointing at files in `js/hunt/` and `js/core/`.

---

## §1 — Per-second feedback density

The genre's defining trait is **stacked, redundant, instant feedback**. Every chop, every hit, every coin grab triggers multiple sensory channels in parallel. The player cannot make an input that produces silence.

**Primary-source evidence:**
- Vampire Survivors creates a "constant stream of positive feedback — every enemy killed increases your score and drops XP, every level-up offers meaningful choices, and every chest provides exciting bonuses." ([Kokutech analysis](https://www.kokutech.com/blog/gamedev/design-patterns/power-fantasy/vampire-survivors))
- Vlambeer's "Art of Screenshake" talk demonstrates that adding screen shake, hit-pause (~0.2s), pitched-up firing audio, larger bullets, muzzle flash, and camera lerp progressively transforms a flat shooter into something compulsive. Each layer is small; the stack is the product. ([Vlambeer 2013, INDIGO Classes](https://www.youtube.com/watch?v=AJdEqssNZ-U))
- "Juice it or lose it" (GDC Europe 2012, Jonasson + Purho): a juicy game "feels alive and responds to everything you do — tons of cascading action and response for minimal user input." ([GDC Vault talk](https://www.gdcvault.com/play/1016487/Juice-It-or-Lose); [recording](https://www.youtube.com/watch?v=Fy0aCDmgnxg))

**The genre minimum for a player input (chop, kill, pickup):**

| Channel | What fires | Latency |
|---|---|---|
| Visual: hit flash | Sprite tints white for 1 frame | 0ms |
| Visual: particle | 4–8 particles eject from impact, 200–400ms life | 0ms |
| Visual: number | Damage/wood/coin number floats up (12–18px font, 600ms travel, fade-out last 200ms) | 0ms |
| Audio: layer 1 | Impact thunk (low-mid, throttled per-id 60–100ms) | <30ms |
| Audio: layer 2 | Shimmer chime (high, optional but stacks well on chains) | <30ms |
| Camera: micro-shake | 0.5–2px screen-space, 80ms decay | 0ms |
| Hit-pause (kills only) | 30–60ms freeze on enemy death; 80–120ms on boss | n/a |

**Wraithgrove implementation:**

- **`js/hunt/hunt-render.js`** — there is already an `_edgePulse` system for screen-edge flashes. Extend with: (a) per-entity hit-flash (sprite tint white, 1 frame), (b) micro-particle burst on tree chop / enemy kill, (c) floating number layer.
- **`js/core/wg-audio.js`** already has the event-bus subscription model (line 26–50) — `player:swing`, `pickup:coin`, `pickup:orb` are wired. **Missing:** layered chime on chain kills, pitch-shift on combo, throttle review for `tree:chop` event (does not currently exist; add it).
- **Hit-pause:** add a global `WG.Engine.hitPause(durationMs)` that pauses the Hunt update loop (NOT render — render still ticks for visual polish during the pause). Rules:
  - Tree chop: no pause (would cripple flow at 5 chops/sec).
  - Enemy kill: 30ms.
  - Crit / elite kill: 60ms.
  - Boss hit: 80ms.
  - Boss kill: 200ms + 0.5s slow-mo (timeScale=0.4) ramp-back.
  - Player damaged: 50ms + red edge-pulse (already implemented).
- **Floating-number layer:** new sub-module `js/hunt/hunt-fxnumbers.js`. Pool of ~64 entries, world-space anchor + screen-space drift, integer-only, color-coded (white = damage, yellow = coin, brown = wood, cyan = XP, magenta = crit).

**Concrete acceptance test:** chop one tree should produce: sprite shake on tree, 4–6 wood-chip particles, +1 wood floating number, +2 coin floating number, +2 XP floating number, edge of HUD wood/coin/XP counter pulse-flash for 200ms, plus 1 chop SFX. **Five channels minimum.** Currently Wraithgrove fires ~1 channel (sprite swap).

---

## §2 — Loot stacking + accumulation feel

The most cited "dopamine moment" in Vampire Survivors design analysis is **the magnet vacuum** — picking up the magnet item streams every gem on the map toward the player, triggering rapid-fire level-ups. ([Platinum Paragon — Psychology of VS](https://platinumparagon.info/psychology-of-vampire-survivors/); [Magnet wiki](https://vampire.survivors.wiki/w/Magnet))

The flow itself is the reward. The wood chunk floating across the screen toward the counter matters more than the wood. The counter ticking up — visibly, audibly — is the payoff.

**Primary-source evidence:**
- VS uses "psychomathematical tricks": individually worthless blue gems massed into thousands creates the feel of "swimming in experience." Bigger numbers are more impressive even when functionally equivalent. ([HackerNoon](https://hackernoon.com/the-vampire-survivors-effect-how-developers-utilize-gambling-psychology-to-create-addictive-games))
- VS gem tiers: blue (≤2 XP), green (≤9 XP), red (anything beyond). At >400 gems on the ground, all further XP collapses into one red gem. ([VS Wiki — Experience Gem](https://vampire.survivors.wiki/w/Experience_Gem))

**Wraithgrove rule:** **nothing the player earns appears on the counter without traveling through screen space first.**

| Pickup | Magnet behavior | Visual | Audio | Counter |
|---|---|---|---|---|
| Wood chunk (from tree) | Slow drift to player (300ms ease-out), magnet from radius 60px | Brown chip sprite, slight rotation | Soft chip sound (already wired as `tree:chop`?) | Wood counter +1, brown flash 100ms |
| Coin | Faster magnet, radius 80px, 200ms travel | Gold sprite, sparkle particle | Coin chime (`pickup:coin` already wired) | Gold counter +N, gold flash, +200ms tick of subtle "ka-ching" stack on chains |
| XP gem | Magnet on player Magnet stat radius (default 50px, scaling) | Cyan crystal, glow pulse | Quiet pluck (`pickup:orb` wired) | XP bar fills, on bar-cap → level-up draft |
| Relic fragment | Long magnet, radius 120px, slower (500ms) — "rare item" pacing | Glow trail behind, screen-edge pulse if rare tier | Heavier chime + rarity stinger | Inventory popup "Fragment +1" sticky for 1.5s |

**Counter behavior — non-negotiable:**
- Every counter must **scale 1.15× and tint** for 200ms when incremented.
- Multi-pickups within 80ms collapse into one tick + scale (1.3× instead of 1.15×) — the "haul" feel.
- A 5+ chain pickup triggers a brief gold particle ring around the counter and a rising-pitch tick.

**Wraithgrove implementation:**
- **`js/hunt/hunt-pickups.js`** — confirm magnet logic exists; if not, add per-pickup-type magnet radius + travel ease.
- **HUD (find in `js/hunt/hunt-render.js` HUD draw section):** wrap each counter draw in a `pulseCounter(id, intensity)` call that schedules a 200ms scale+tint animation. Currently counters are static text.
- **Chain-tracker:** a 1-frame ring buffer tracking pickups per type per 80ms; if `len > 4`, emit `pickup:chain` event for `wg-audio.js` to map.
- **Massive-chain visual:** when 20+ XP gems collected within 600ms (i.e. magnet pulse moment), spawn a screen-wide cyan vignette + brief slow-mo (0.6× for 250ms). This is the genre's signature moment.

---

## §3 — Variable reward schedules (the slot-machine layer)

Variable-ratio reinforcement is the single most addictive reward schedule known — Skinner's pigeons pressed levers compulsively under it, and game designers have weaponized it for decades. ([Variable Ratio Reinforcement / Skinner Box overview](https://medium.com/design-bootcamp/variable-ratio-reinforcement-beyond-the-skinner-box-191d3e86d86f); [HammerStrike — Variable Reward Schedule](https://hammerstrikegamedesign.wordpress.com/tag/variable-reward-schedule/))

In Vampire Survivors, the chest is the slot machine. "Opening a treasure chest offers a mini slot machine-like moment — will you get that crucial weapon upgrade or maybe level up a passive you'd been neglecting?" ([Kokutech](https://www.kokutech.com/blog/gamedev/design-patterns/power-fantasy/vampire-survivors)) Chests can drop 1, 3, or 5 items at increasing rarity, with gold scaled to match (100–200 / 300–600 / 500–1000). ([VS Wiki — Treasure Chest](https://vampire.survivors.wiki/w/Treasure_Chest))

In Survivor.io, the **3-card level-up draft** is the variable-reward beat, fired every level (~5–15 seconds at peak density). ([Bluestacks Survivor.io guide](https://www.bluestacks.com/blog/game-guides/survivor-io/sio-skills-evolution-guide-en.html))

**Wraithgrove already has the bones of this:**
- **3-card level-up modal** (per SPEC §7 — confirmed in HD source).
- **Relic-craft Probability Info button** (mentioned in worker brief — explicitly called out as a hook).

**What's likely missing or under-tuned:**

1. **Card-reveal animation pacing.** Cards must enter staggered (80ms apart), each with a flip + scale-bounce. Rarity tier flashes the card border (white/blue/purple/gold). If any card is purple+ the entire modal pulses. **Don't reveal all three instantly** — the genre expects suspense in the reveal.
2. **Reroll = currency-burn dopamine.** Survivor.io & Wood Siege bind reroll to ad-watch. Wraithgrove's ADS-currency reroll button (per SPEC §7) is already designed; **make sure the reroll re-runs the staggered reveal** — players watch reroll for the reveal as much as the cards.
3. **Chest drops from elite/boss kills.** A chest drop should: pause briefly, zoom camera 1.05×, play a heavier chime, and show 3-tier reveal animation matching the level-up modal. Even a 1-item chest deserves a beat.
4. **Near-miss bias.** When a card *almost* rolls a higher rarity, show a flicker (purple briefly bleeds through gold border, settles to blue). This is documented as a slot-machine retention technique. ([HackerNoon — VS Effect](https://hackernoon.com/the-vampire-survivors-effect-how-developers-utilize-gambling-psychology-to-create-addictive-games)) Use sparingly — once per run is enough.
5. **Crit roll on attacks.** Already a known dopamine source. If Wraithgrove's scythe doesn't crit, add it: 5–8% crit chance, 2× damage, 6px shake (vs. 1px on normal hit), magenta number, distinct higher-pitched sound. This is the per-second variable-reward layer.

**Wraithgrove implementation:**
- **`js/hunt/hunt-weapons.js`** — add `critChance` and `critMultiplier` to the WEAPONS catalog. Default scythe: `{critChance: 0.06, critMultiplier: 2.0}`.
- **`js/hunt/hunt-render.js`** — extend hit handler to branch on crit: 6px shake, magenta number, higher-pitch SFX (modulate audio playback rate +0.3).
- **Level-up modal** (location TBD in render) — staggered reveal logic + rarity border tint + ad-reroll wired through `WG.Ads.showRewardedVideo()` (per `build-v2/CLAUDE.md`).

---

## §4 — Power fantasy escalation curve

The genre's iron rule: **weak at minute 1, god by minute 8–12.** This is not flavor; it is the architectural spine. ([Kokutech — Power Fantasy through Rapid Escalation](https://www.kokutech.com/blog/gamedev/design-patterns/power-fantasy/vampire-survivors); [Forever Classic Games — VS mobile review](https://foreverclassicgames.com/reviews/2022/12/vampire-survivors-mobile-review-apple))

The mechanism: incremental upgrades stacked rapidly enough that the *rate of change* itself becomes the reward. VS triggers ~10–15 level-ups in the first 5 minutes; weapon evolutions land around minute 10. ([VS analysis sources above])

Survivor.io applies the same curve but weaponized for monetization — energy refills, ad-buffs, and "Quick Patrol" passive-loot mechanics keep the curve feeling steep even when the player stops gaining. ([Survivor.io progressive monetization masterclass — Gamigion](https://www.gamigion.com/survivor-io-the-progressive-monetization-masterclass/))

Brotato's pacing inverts: short 20-wave runs (~10 minutes), with shop visits between waves giving frequent micro-power spikes. Build clarity is preserved by tightly-readable enemy waves. ([Bullet Haven — Brotato review](https://bullethaven.com/review/brotato))

**Wraithgrove's Hunt-stage curve (from SPEC §3):**
- 5/10/15 waves depending on stage tier
- Player levels mid-run via XP from chops + kills (already wired)
- Stage SP resets on stage end — so the within-run curve must do all the heavy lifting

**Where Wraithgrove's curve currently lives:** mostly absent. The scythe rotates at constant cooldown; no per-run weapon upgrades; the 3-card level-up exists in spec but feel-tuning of the cards (numeric scaling) is unclear.

**What to add (priority order):**

1. **Per-run weapon levels.** Default scythe should level-up via the 3-card draft: L1 → L8 with measurable changes (rotation speed +5%, radius +8%, damage +12% per level, +1 projectile every 3 levels). Players must *see* the scythe getting bigger, faster, scarier as the run progresses. Without this, level-ups are abstract.
2. **Weapon evolutions at L8.** Mirror the VS / Survivor.io pattern — once a weapon hits cap and prerequisite passive is owned, the next chest auto-evolves it into a transformed visual + named ability. ([Survivor.io evolution mechanics — BlueStacks](https://www.bluestacks.com/blog/game-guides/survivor-io/sio-skills-evolution-guide-en.html); [VS Wiki — Treasure Chest](https://vampire.survivors.wiki/w/Treasure_Chest))
3. **Power-spike "wow" moments.** Engineered, not random. Around 50% of stage waves cleared, force-spawn an item drop that feels like a gear-shift (e.g. a turret slot completing for the first time, a relic fragment dropping). Survivor.io explicitly times these. ([Naavik — Survivor.io vs Archero](https://naavik.co/deep-dives/survivorio-archeros-footsteps/))
4. **Visible enemy density ramp.** By wave 3, screen should have 3–5× the enemies of wave 1. Players must *see* the wave they're surviving get harder — that's what makes their growing power feel earned.
5. **End-of-stage Rebirth visual.** SPEC §7 confirms the character visually upgrades tier on stage clear. Make this beat *huge*: zoom in, slow-mo, particle column, character model swaps with golden flash. This is the long-arc reward that pays off the run.

**Wraithgrove implementation:**
- **`js/hunt/hunt-weapons.js`** — add `levels` array per weapon catalog entry; `currentLevel` field on player runtime.
- **`js/hunt/hunt-waves.js`** — confirm the density ramp; if flat, scale enemy spawns by `1 + 0.4 * waveIdx`.
- **`js/hunt/hunt-stage.js`** — instrument 50% wave-cleared trigger for forced "anchor drops."
- **Rebirth animation** lives in meta layer (`js/meta/`) — set up in stage:end handler.

---

## §5 — Streak / combo / multiplier systems

A kill-streak / chain-multiplier overlay extends engagement past pure mechanical play by adding a **performance ceiling** the player can chase. Standard tool in the genre.

- **Vampire Survivors** doesn't use explicit combo numbers but achieves the feeling via continuous mob-clear screen-fills. ([Kokutech](https://www.kokutech.com/blog/gamedev/design-patterns/power-fantasy/vampire-survivors))
- **Survivor.io** uses on-screen "kill counter" + chest-progress gauges that fill faster with chains. ([Naavik](https://naavik.co/deep-dives/survivorio-archeros-footsteps/))
- Reward multipliers in general activate dopamine via "value-prediction error." ([Headless — Reward Multipliers psychology](https://headless.collabpay.app/the-psychology-behind-reward-multipliers-in-games/))

**Wraithgrove proposal — minimal combo system:**

- **Chop Combo:** consecutive tree chops within 1.5s of each other build a multiplier (1× → 1.2× → 1.5× → 2.0×, capped). Resets on idle >1.5s or on damage. Multiplier applies to wood + coin + XP yield. Show as "x1.5" floating next to the wood counter, scaling per tier.
- **Kill Chain:** consecutive enemy kills within 0.8s build a kill-counter that resets on hit-taken or 0.8s idle. Visible badge bottom-left ("12 KILL CHAIN"), color-graded yellow/orange/red as it climbs. 25-chain triggers a brief gold particle burst + screen-clear.
- **Screen-clear bonus:** if all on-screen enemies die within 2s (a "wipe"), spawn 3 bonus XP gems + flash the screen + play a layered chime. This is the "Vampire Survivors moment."
- **Boss-stagger combo:** consecutive crits on a boss build a stagger meter; full meter triggers a slow-mo + free-damage window.

**Wraithgrove implementation:**
- **New module `js/hunt/hunt-combo.js`** — single source of combo state (chop combo, kill chain, screen-clear detector). Subscribes to `enemy:killed`, `tree:chopped`, `player:damaged`. Emits `combo:tick`, `combo:milestone`, `combo:reset`.
- **`js/hunt/hunt-render.js`** — combo HUD overlay; render at top-center small (chop combo) and bottom-left bold (kill chain).
- **`js/core/wg-audio.js`** — add EVENT_MAP rows for `combo:milestone` (rising-pitch ladder: 5/10/25/50 chain SFX).

---

## §6 — Death framing and replay loop

**The "one more run" loop is engineered, not emergent.** A run that ends has to deliver permanent forward motion or the player closes the app.

- Survivor.io and Archero both run a "result screen" with: gold banked, XP gained, equipment fragments collected, talent points, daily mission ticks. Multiple progress bars filling at once. ([Naavik on Survivor.io](https://naavik.co/deep-dives/survivorio-archeros-footsteps/); [Game Developer — Archero design analysis](https://www.gamedeveloper.com/design/finding-the-fun-archero-part-1---gameplay))
- Wood Siege's mid-stage death flow uses **ad-revive** as the primary monetization gate — player dies → "Watch Ad to Continue" + "Restart" + "Quit." Klovur's review pinpoints this as the "more time watching ads than playing" cadence. ([Wood Siege Play Store reviews aggregate](https://www.appbrain.com/app/wood-siege/com.dream.sfgame))
- Survivor.io's Piggy Bank ([Gamigion analysis](https://www.gamigion.com/survivor-io-the-progressive-monetization-masterclass/)) demonstrates the endowment-effect pattern: passively-accrued progress that the player has to pay or grind to claim.

**Wraithgrove death/result screen — minimum spec:**

| Element | Treatment |
|---|---|
| "DEFEATED" header | Fade-in 400ms, no audio sting (let silence land for 1 beat) |
| Wave reached | Big number, scale-bounce on settle |
| Gold earned | Counts up over 1.5s (NOT instant — the count-up IS the dopamine) |
| Wood / fragments banked | Counts up in parallel |
| XP added to character | XP bar fills with chime per tick |
| Highest Wave badge update | Only flashes if new record — sticky 1s gold pulse + dedicated chime |
| Watch-ad-to-revive button | Pre-stage-death only; mid-stage CTA per Wood Siege faithful clone |
| Continue / Restart / Quit | Standard 3-button row |

**Critical:** the count-up animation IS the reward. Skipping straight to final numbers loses the dopamine hit entirely. Survivor.io's result screens count up over ~2s for this reason.

**Wraithgrove implementation:**
- **`js/hunt/hunt-results.js`** is the existing module — confirm it has count-up, not instant-settle. Likely needs a `tweenCounter(target, durationMs)` helper.
- **Audio:** add EVENT_MAP rows for `result:reveal`, `result:newRecord`, `result:complete`.
- **First-time flag:** if this run is the first stage clear ever (or a milestone), hold the result screen open for an extra beat with celebratory layered audio. First-times disproportionately reinforce the loop.

---

## §7 — Long-arc meta progression

The within-run dopamine is the moment-to-moment loop; the across-run dopamine is what brings the player back tomorrow.

- Archero's metasystem is the **defining example** — hero-stats, talents, equipment, gear fusion all upgrade off run rewards, with steep early curves softening into grinds. ([Game Developer — Archero progression](https://www.gamedeveloper.com/design/finding-the-fun-archero-part-2---progression); [JWits — Metasystems Matter](https://jwittsf.design.blog/2020/04/06/metasystems-matter-in-roguelite-games/))
- Survivor.io adds Growth Fund (long-term reward bundle), Ender's Echo (daily boss), Daily Challenges, Special Ops missions. ([Naavik — Survivor.io vs Archero](https://naavik.co/deep-dives/survivorio-archeros-footsteps/))
- Wood Siege has Level Up tab (character meta), Buildings tab (idle base), Relics (gear gacha) — confirmed across SPEC §8/§9.

**Wraithgrove's meta layer is largely scaffolded but unsigned.** What needs dopamine treatment:

1. **Level Up tab feedback.** Every spend of gold on a stat must trigger: number flying off the spent currency counter, stat number scaling up, brief gold sparkle on the upgrade button, layered chime. Not just a numeric tick. (Same per-second feedback density principle, applied to meta clicks.)
2. **Rebirth tier visuals.** SPEC §8 confirms a Rebirth banner. **Make this the anchor moment of the meta loop:** full-screen gold cascade, character-portrait swap with crossfade, stat panel flip-in with each new stat sliding in staggered. Give it 3–4 seconds; players will replay stages just to see this animation again. (See §4 power-spike philosophy.)
3. **Building completion in idle base.** Each of the 8 idle slots completing a build cycle should ping a notification badge on the Buildings tab + a soft chime. Returning players should be greeted with "5 buildings completed while you were away" and a single-tap claim-all that fires a 1.5s gold cascade. This is the standard Survivor.io pattern.
4. **Relic gacha pulls.** SPEC §1 confirms Wraithgrove already has a Probability Info button on relic-craft (a transparency hook borrowed from Genshin-style legal compliance + slot-machine tease). The pull animation itself must include: zoom-in, longer suspense beat (1.5s) for purple+, gold-tier cinematic pull breakout. Rarity revealed in 3 stages — flash → settle → name-callout.

**Wraithgrove implementation pointers:**
- **`js/meta/`** — find the Level Up + Rebirth + Buildings + Relics render modules (per CLAUDE.md group naming).
- **`js/core/wg-audio.js`** event map already has `iap:purchase` (`cha_ching`), `forge:craft`, `duel:victory` — extend with `meta:rebirth`, `meta:upgrade`, `building:complete`, `relic:pull`.

---

## §8 — Audio, specifically

This deserves its own section because Wraithgrove has the infrastructure (`wg-audio.js`) but **no sourced audio files yet**. The infrastructure is wired correctly — event-bus subscriptions, throttling, lazy-load, mute persistence (`js/core/wg-audio.js:1–80`). What's missing is the assets and a handful of event-map entries.

**Genre principles (from primary sources):**

- **Layered chimes.** Vlambeer's Art of Screenshake demonstrates pitching firing audio higher to make weapons sound more powerful, plus stacking layers. ([Vlambeer 2013](https://www.youtube.com/watch?v=AJdEqssNZ-U))
- **Music density ramps with enemy density.** The audio "thickens" as the wave intensifies — more layers, more low-end, faster tempo. Implicit in VS / Survivor.io's wave structures.
- **Pitch-shifted chain feedback.** Each step of a combo or chain plays a higher pitch — the rising-tone ladder cues "this is getting bigger." Standard in match-3 (Bejeweled) and exported to roguelites.
- **Vampire Survivors specifically:** "When a player walks over coins or items, there's a really satisfying sound that pops up, contributing to the dopamine reward system throughout gameplay." ([Kokutech](https://www.kokutech.com/blog/gamedev/design-patterns/power-fantasy/vampire-survivors))

**Wraithgrove audio shopping list (priority order):**

| Slot | File id | Notes |
|---|---|---|
| `swing` | scythe whoosh | already mapped, throttle 60ms |
| `tree_chop` *(new)* | wet wood thunk | per-chop, throttle 80ms, vary pitch ±0.05 |
| `coin` | bright "ka-ching" pluck | already mapped |
| `orb` | quiet crystal pluck | already mapped, throttle 40ms |
| `wood_pickup` *(new)* | softer thump than chop | throttle 80ms |
| `level_up` | ladder rise + sparkle | already mapped |
| `crit` *(new)* | sharper, higher than swing | per-crit only, no throttle |
| `combo_5/10/25/50` *(new)* | rising 4-step ladder | one shot per milestone |
| `screen_clear` *(new)* | layered cinematic stinger | rare event, no throttle |
| `boss_die` | impact + low-frequency tail | already mapped |
| `chest_open` *(new)* | wood creak + chime | per chest, no throttle |
| `result_record` *(new)* | triumphant 1.5s fanfare | first-time flag only |
| `magnet_pulse` *(new)* | rising sweep + sparkle | played on magnet vacuum events |

**Music layer (deferred, but specced):**
- 2-layer ambient: low-density (1–2 enemies) + high-density (10+ enemies) with crossfade based on `WG.Engine.enemyCount`.
- Boss music = third layer triggered on `boss:spawn`, faded out on `boss:defeated`.

**Implementation:** all of the above are pure additions to `EVENT_MAP` in `js/core/wg-audio.js` — new rows, no engine changes. Asset sourcing is the gating step (see W-Audio-Sourcing follow-on worker).

---

## §9 — Visual juice catalog

Squirrel Eiserloh's GDC 2016 talk "Juicing Your Cameras with Math" is the canonical reference for camera and shake math. The key insight: **trauma-based shake.** ([GDC 2016 — Squirrel Eiserloh](http://www.mathforgameprogrammers.com/gdc2016/GDC2016_Eiserloh_Squirrel_JuicingYourCameras.pdf); [Godot Recipes — Screen Shake](https://kidscancode.org/godot_recipes/3.x/2d/screen_shake/index.html))

Trauma model:
- `trauma` = float [0, 1], decays linearly over time (e.g. 0.8 / sec).
- Damage *adds* trauma (chop: +0.05, kill: +0.1, crit: +0.2, boss-hit: +0.3, player-damaged: +0.5).
- Actual shake offset = `trauma² × maxOffset × noise(t)` — the squared term makes small trauma look subtle and big trauma look explosive.
- At trauma 0.30, shake is 9% of max. At 0.90, shake is 81% of max. Exponent buys perceptible escalation.

**Wraithgrove screen-shake spec:**

| Trigger | Trauma added | Notes |
|---|---|---|
| Tree chop | 0.04 | barely perceptible, but cumulative on rapid chops |
| Enemy kill | 0.10 | 1px shake at default max=10px |
| Crit | 0.20 | distinctly different from normal |
| Boss hit | 0.25 | meaty |
| Boss kill | 0.60 | combined with hit-pause |
| Player damaged | 0.50 | with red edge-pulse already present |
| Stage clear | 0.40 | + held longer (slower decay 0.4/sec) |
| `maxOffset` | 10px | clamp |
| Shake exponent | 2.0 | per trauma model recommendation |

**Hit-pause spec (from §1, restated for catalog):**
- Enemy kill: 30ms.
- Crit: 60ms + 6px shake.
- Boss hit: 80ms.
- Boss kill: 200ms + 0.5s slow-mo (timeScale=0.4).
- Player damaged: 50ms.

**Sprite techniques:**
- **Hit-flash:** target sprite tints white for 1 frame on damage. Cheap; hugely effective.
- **Squash-and-stretch on player swing:** scale 1.0 → 1.08x / 0.95y → 1.0 over 120ms. Sells weight.
- **Death squash:** enemy dies → scale 1.0 → 0.6 over 150ms with rotation +30° → particle burst → fade. Don't just remove the sprite.
- **Damage-number per hit:** see §1 floating-number layer.

**Color flashes:**
- White full-screen flash on level-up: 150ms ease-out, opacity 0.25.
- Red edge-pulse on damage: already implemented in `hunt-render.js:_edgePulse`. Confirm 250ms decay.
- Gold edge-pulse on milestone (combo, record, evolution): 350ms.

**Particle bursts:**
- Tree chop: 4–6 brown chips, 200–400ms life, gravity-down.
- Enemy hit: 3–5 white sparks, 150ms life, radial.
- Enemy kill: 8–12 colored particles matching enemy tier (white/blue/purple), 300ms life.
- Crit: replace particles with magenta starburst, 12 particles.
- Coin/wood/XP pickup: 3 sparkle particles tracking the magnet curve.
- Boss kill: full-screen 50-particle gold cascade, 800ms.

**Post-process:**
- Bloom on crit hit only — 80ms duration, ease-out.
- Vignette darkens slightly when player HP < 30%. Cheap survival-anxiety cue.
- Grayscale fade on death over 600ms before result screen lifts.

**Wraithgrove implementation:**
- **`js/hunt/hunt-render.js`** — extend with: trauma-based camera shake (replace any existing fixed-amplitude shake), sprite hit-flash, sprite squash-and-stretch, particle pool.
- **New module `js/hunt/hunt-fx.js`** recommended — one home for: floating numbers, particles, screen flashes, edge pulses, post-process effects. Reduces hunt-render.js bloat.

---

## §10 — Wraithgrove implementation priorities

Ranked by impact. P0 items will be felt within the first chop-tree session after deploy.

### P0 — do this week (visceral, immediately felt)

1. **Floating number layer.** New `js/hunt/hunt-fxnumbers.js`. Wood/coin/XP/damage numbers float up on every event. Without this, the rest is whispers.
2. **Trauma-based screen shake.** Replace any fixed shake in `hunt-render.js` with the trauma model from §9. Add trauma triggers per event.
3. **Sprite hit-flash + squash/stretch.** In `hunt-render.js` enemy + player + tree draw paths. White-tint 1 frame on damage; sprite scale on swing/hit.
4. **Hit-pause.** New `WG.Engine.hitPause(ms)` in `wg-engine.js`. Wire to enemy:killed (30ms), crit (60ms), boss hit (80ms), boss kill (200ms+slowmo).
5. **Particle pool basics.** Tree-chop wood chips, enemy-hit sparks, enemy-kill burst, pickup sparkle. New `js/hunt/hunt-fx.js`.
6. **Counter pulse.** HUD counters (wood/gold/XP) scale-bounce + tint on increment. Inline in hunt-render HUD draw.
7. **Magnet behavior on pickups.** Confirm `js/hunt/hunt-pickups.js` magnet logic; tune radius/travel ease per pickup type per §2 table.

**P0 collectively = the difference between "trees chop" and "trees thump." This is the pinpoint the Architect named.**

### P1 — do this month (compound effect, structural)

8. **3-card level-up modal pacing.** Staggered reveal (80ms apart), rarity border tint, scale-bounce, optional near-miss flicker.
9. **Crit system.** Add `critChance/critMultiplier` to weapons catalog; route to magenta numbers + 6px shake + crit SFX.
10. **Combo + chain HUD.** New `js/hunt/hunt-combo.js`. Chop combo + kill chain. Multipliers apply to yields. Audio rises with chain milestones.
11. **Result screen count-up.** In `js/hunt/hunt-results.js` — every counter tweens to final over ~1.5s, layered audio per tick, new-record gold flash.
12. **Per-run weapon levels.** Weapons gain L1–L8 within a run via 3-card draft. Visual scythe scales/colors with level.
13. **Engineered power-spike at 50% wave-cleared.** `js/hunt/hunt-stage.js` triggers a forced anchor drop.
14. **Audio asset sourcing pass.** Spawn W-Audio-Sourcing follow-on. Source the §8 shopping list (CC0 / commissioned).
15. **Level-up full-screen white flash + reveal stagger.** Sells the upgrade beat.
16. **Magnet-vacuum signature moment.** When magnet pulse triggers (or 20+ XP gems collected within 600ms), full-screen cyan vignette + slow-mo + layered chime.

### P2 — polish layer for shipping

17. **Weapon evolutions** at L8 + prerequisite passive. Mirrors VS / Survivor.io. Likely needs new catalog field on weapons + a chest-aware reveal flow.
18. **Music density layers.** Two-layer ambient with crossfade on `enemyCount`. Source files via W-Audio-Sourcing.
19. **Boss-stagger combo + slow-mo window.** Per §5.
20. **Rebirth animation overhaul.** Full-screen gold cascade + portrait crossfade + stat slide-in. Long-arc anchor moment.
21. **Building completion claim-all + cascade.** Survivor.io idle pattern; per §7 Buildings tab section.
22. **Relic-pull cinematic.** 3-stage rarity reveal (flash → settle → name callout).
23. **Post-process bloom/vignette/grayscale.** Per §9 polish techniques.
24. **Daily/login retention beats.** Daily mission tick on result screen, return-day reward cascade. Genre standard.

---

## Sources cited

1. Kokutech — *Power Fantasy Through Rapid Escalation: Game Design Lessons from Vampire Survivors* — https://www.kokutech.com/blog/gamedev/design-patterns/power-fantasy/vampire-survivors
2. Platinum Paragon — *The Psychology of Vampire Survivors* — https://platinumparagon.info/psychology-of-vampire-survivors/
3. HackerNoon — *The Vampire Survivors Effect: How Developers Utilize Gambling Psychology to Create Addictive Games* — https://hackernoon.com/the-vampire-survivors-effect-how-developers-utilize-gambling-psychology-to-create-addictive-games
4. Vlambeer / Jan Willem Nijman — *The Art of Screenshake* (INDIGO Classes 2013) — https://www.youtube.com/watch?v=AJdEqssNZ-U
5. Martin Jonasson + Petri Purho — *Juice It or Lose It* (GDC Europe 2012) — https://www.gdcvault.com/play/1016487/Juice-It-or-Lose ; recording at https://www.youtube.com/watch?v=Fy0aCDmgnxg
6. Squirrel Eiserloh — *Math for Game Programmers: Juicing Your Cameras with Math* (GDC 2016) — http://www.mathforgameprogrammers.com/gdc2016/GDC2016_Eiserloh_Squirrel_JuicingYourCameras.pdf
7. Godot Recipes — *Screen Shake (trauma-based)* — https://kidscancode.org/godot_recipes/3.x/2d/screen_shake/index.html
8. Gamigion — *Survivor.io: The "Progressive" Monetization Masterclass* — https://www.gamigion.com/survivor-io-the-progressive-monetization-masterclass/
9. Naavik — *Survivor.io: Will It Follow in Archero's Footsteps?* — https://naavik.co/deep-dives/survivorio-archeros-footsteps/
10. Global Games Forum — *How Survivor.io continues to pull in $5 million a month three years later* — https://www.globalgamesforum.com/news/how-survivor.io-continues-to-pull-in-5-million-a-month-three-years-later
11. BlueStacks — *Survivor.io Skills and Evolution Guide* — https://www.bluestacks.com/blog/game-guides/survivor-io/sio-skills-evolution-guide-en.html
12. Scott Fine / Game Developer — *Finding the Fun: Archero Part 1 — Gameplay* — https://www.gamedeveloper.com/design/finding-the-fun-archero-part-1---gameplay
13. JWits — *Metasystems Matter in Roguelite Games* — https://jwittsf.design.blog/2020/04/06/metasystems-matter-in-roguelite-games/
14. Bullet Haven — *Brotato Review* — https://bullethaven.com/review/brotato
15. CritPoints (Celia Wagar) — *Hitstop / Hitfreeze / Hitlag / Hitpause* — https://critpoints.net/2017/05/17/hitstophitfreezehitlaghitpausehitshit/
16. Vampire Survivors Wiki — *Magnet* — https://vampire.survivors.wiki/w/Magnet
17. Vampire Survivors Wiki — *Treasure Chest* — https://vampire.survivors.wiki/w/Treasure_Chest
18. Vampire Survivors Wiki — *Experience Gem* — https://vampire.survivors.wiki/w/Experience_Gem
19. Wood Siege — Play Store / AppBrain reviews — https://www.appbrain.com/app/wood-siege/com.dream.sfgame
20. Medium / Bootcamp — *Variable Ratio Reinforcement Beyond the Skinner Box* — https://medium.com/design-bootcamp/variable-ratio-reinforcement-beyond-the-skinner-box-191d3e86d86f
21. Headless — *The Psychology Behind Reward Multipliers in Games* — https://headless.collabpay.app/the-psychology-behind-reward-multipliers-in-games/

---

## Next worker prompts (P0 implementation)

The following follow-on worker prompts implement the P0 items. Each is intended as a fresh-Sonnet, paste-and-run brief.

1. **W-FX-Numbers** — implement `js/hunt/hunt-fxnumbers.js` floating-number layer. Pool size 64, world→screen anchoring, 600ms travel, color-coded by event type. Wire to `tree:chopped`, `pickup:coin`, `pickup:orb`, `enemy:damaged`, `player:damaged`. Reference: §1, §2 of this doc.

2. **W-FX-ScreenShake** — replace any existing screen shake in `js/hunt/hunt-render.js` with the trauma-based model from §9. Add trauma triggers per event in §9 table. Verify decay rate 0.8/sec, exponent 2.0, maxOffset 10px.

3. **W-FX-HitPause** — implement `WG.Engine.hitPause(ms)` in `js/core/wg-engine.js`. Pause Hunt update loop only; render keeps ticking. Wire to `enemy:killed` (30ms), `boss:damaged` (80ms), `boss:defeated` (200ms + slowmo), `player:damaged` (50ms).

4. **W-FX-Sprites-Particles** — extend `js/hunt/hunt-render.js` with sprite hit-flash (1-frame white tint), squash-and-stretch on swing/hit, and a particle pool in new `js/hunt/hunt-fx.js`. Particle types per §9: tree-chop chips, enemy-hit sparks, enemy-kill burst, pickup sparkle, crit starburst.

5. **W-Audio-Sourcing** — source the §8 audio shopping list. CC0 from freesound.org / opengameart.org or commissioned. Place in `audio/sfx/` per existing `js/core/wg-audio.js` layout. Wire new EVENT_MAP rows for `tree:chop`, `wood_pickup`, `crit`, `combo_*`, `screen_clear`, `chest_open`, `result_record`, `magnet_pulse`.

After P0 ships, the moment-to-moment feel of Wraithgrove will close most of the dopamine gap. The remaining gap (P1) is structural — combo systems, weapon levels, result-screen pacing — and compounds across runs rather than within them.

---

*End of doc. Length: dense markdown, ~10 pages rendered. No code changes recommended in this pass — orchestrator drives implementation via the W-FX-* worker chain.*
