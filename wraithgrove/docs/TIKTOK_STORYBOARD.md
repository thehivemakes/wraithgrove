# TIKTOK_STORYBOARD.md — 30-Second Launch Video

**Author:** W-Marketing-Launch-Pack-V2  
**Date:** 2026-05-08  
**Format:** 8-frame storyboard. Each frame has visual composition, on-screen text, caption copy, and transition note.  
**Companion to:** MARKETING_EMAIL_SOCIAL.md §4 (TikTok script outlines V1)  
**Runtime:** 30 seconds. 60fps capture recommended; export at 1080×1920 (9:16).

---

## MUSIC

**Track type:** Shamisen-led folk-horror instrumental. Sparse at open (1–2 notes per bar), builds with taiko drum hits on each cut, reaches full intensity at Frame 5 (boss reveal), drops to ambient at Frame 8.  
**Do not use:** Trending pop audio — it undermines the folk-horror register and gets buried in the algorithm's pop-first feed.  
**Fallback:** CC0 koto/erhu drone available in `audio/` directory. Short-loop edit (15s) or request from the audio sourcing pipeline.  
**Algorithm note:** A distinctive non-pop track helps TikTok's For You Page serve the video to folk-horror and RPG niches rather than the generic gaming bucket.

---

## Frame 1 — The Hook (0:00–0:04)

**Duration:** 4 seconds  
**Visual composition:** Pure black frame. Center: a single paper lantern icon slowly pulses, dim gold. Vignette edges. No UI, no player, no game canvas — just the lantern in darkness. The pulse rhythm is 2 seconds per beat (matches the in-game lantern animation from `hunt-render.js`).  
**Camera/angle:** Static. No movement.  
**On-screen text (position: center, lower-third):**
```
This is Stage 1.
```
**Text style:** Off-white, minimal serif. Small. Unhurried.  
**Transition out:** Hard cut on taiko drum strike.  
**Caption line (for the full post caption):** *(see end of document)*  
**Intent:** Curiosity gap. Nothing is explained. The lantern carries dread because the viewer does not yet know what it means. Do not add a title card here — that kills the hook.

---

## Frame 2 — Stage 1, The Welcome (0:04–0:07)

**Duration:** 3 seconds  
**Visual composition:** Top-down gameplay capture, `forest_summer` biome. Player character (lantern_acolyte) walking the central path. Green-gold grass. Enemies at a comfortable distance — lurkers and walkers, slow, not yet threatening. Coins arcing off them. The HUD is visible (HP bar, XP ring) but calm.  
**Camera/angle:** Game camera, no edit. Device frame optional (clean crop preferred).  
**On-screen text (position: top-left corner, small):**
```
18 stages.
```
**Transition out:** Hard cut.  
**Intent:** Establish the genre and visual register. Players who know Survivor.io / Wood Siege instantly recognize the formula — this is the anchor. Players who don't will follow the character and understand "fight waves, collect drops."

---

## Frame 3 — Stage 4, The Turn (0:07–0:11)

**Duration:** 4 seconds  
**Visual composition:** Jump cut to `cold_stone` biome. Night Mode active — dark indigo overlay, torch bar visible at bottom-left, torch level halfway and falling. Lanterns on the path flicker and dim. Two wraiths push in fast from the right. The player's light pool carves a small circle of visibility; the rest is dark.  
**Camera/angle:** Game camera. Slight zoom toward the enemy cluster on cut to sell urgency.  
**On-screen text (two lines, top-center):**
```
Stage 4 is different.
The lantern is bait.
```
**Text style:** Second line fades in 0.5s after the first.  
**Transition out:** Quick fade through black, 0.2s.  
**Intent:** This is the emotional pivot of the video. The viewer who thought this was a light auto-battler now understands there is a second layer. "The lantern is bait" is the tagline moment.

---

## Frame 4 — Fever Mode (0:11–0:15)

**Duration:** 4 seconds  
**Visual composition:** Hunt combat at full intensity. Fever Mode active — enemies tinted orange with `shadowBlur:9` glow, screen-wide orange overlay at 15% opacity, combo counter in the HUD reading "FEVER x20+". Player moving fast, enemies dying in quick succession. A Fever Chest spawns mid-screen as the combo closes.  
**Camera/angle:** Game camera, fast tracking shot if possible. If screen recording only, the visual density of fever mode carries itself.  
**On-screen text (position: top-right):**
```
20-kill combo.
Everything changes.
```
**Transition out:** Hard cut.  
**Intent:** Demonstrate the skill ceiling. This is for viewers who want to know if there is depth. The Fever Chest drop communicates reward. The visual intensity shows mobile games can have moment-to-moment density.

---

## Frame 5 — Boss Reveal (0:15–0:19)

**Duration:** 4 seconds  
**Visual composition:** Wraith Father boss spawns. The boss intro card slides in from below with `cubic-bezier(.15,.85,.25,1.05)` overshoot — dark gradient panel, gold gradient name "WRAITH FATHER", italic title below. Then the card exits and the boss floats at center, 4 aura rings, 8 wisps, void cloak, crown gem pulsing. Player in corner with HP bar lower than comfortable.  
**Camera/angle:** Game camera. Hold the intro card for 1.5s, then cut to combat.  
**On-screen text (fades in under the intro card):**
```
Six bosses.
Each one has a name.
```
**Transition out:** Hard cut on a taiko drum hit.  
**Intent:** Show the RPG depth layer. Named bosses with personality signals are a differentiator from template auto-battlers. This frame converts viewers who came for the mechanics and will stay for the world.

---

## Frame 6 — Tower Gauntlet (0:19–0:22)

**Duration:** 3 seconds  
**Visual composition:** Tower Gauntlet interior — stone temple background, torch sconces flickering, floor badge centered at top. Quick cuts: Floor 1 → Floor 5 → Floor 12 → Floor 23 → Floor 47. The floor number increments fast on each cut. On Floor 47 the screen frame is visibly stressed (enemies at max tier, buff pills at 4+).  
**Camera/angle:** Tight on the floor badge. Each floor number is the center of the cut.  
**On-screen text (lower-center):**
```
Tower Gauntlet.
No ceiling.
```
**Transition out:** Fade through black, 0.3s.  
**Intent:** Communicate infinite-mode depth for players who bounce off 18-stage finite content. The floor-47 screenshot implies real players reached it — use actual player footage here if available, or a dev-run capture.

---

## Frame 7 — Alliance Boss (0:22–0:25)

**Duration:** 3 seconds  
**Visual composition:** Alliance Boss screen. A thick HP bar fills top of frame, labeled with boss name (e.g. "VOID EMPEROR"). Below: contribution list showing alliance member damage percentages including 3–4 NPC names at 55% collective and the player's slice highlighted in gold. "LEGEND TIER" reward badge flashes on completion.  
**Camera/angle:** Static screen recording of the Alliance Boss UI at moment of kill.  
**On-screen text (left side, stacked):**
```
Alliance Boss.
3-day event.
Everyone contributes.
```
**Transition out:** Hard cut.  
**Intent:** Social proof frame. Shows the game has a live community layer and cooperative play beyond the solo loop. "3-day event" communicates recurring engagement — not a one-time feature.

---

## Frame 8 — Title Card (0:25–0:30)

**Duration:** 5 seconds  
**Visual composition:** Full black. Center: "Unlimited Chaos" in a brush-stroke / ukiyo-e style font, gold on black. Below (smaller, fades in at 1.5s): "Folk-horror survival arena." Below that (fades in at 2.5s): "Free on iOS + Android." Bottom-right: app store badge icons.  
**Camera/angle:** Static.  
**On-screen text:**
```
Unlimited Chaos
Folk-horror survival arena.
Free on iOS + Android.
```
**Final line (fades in at 4s, smallest text, italic):**
```
Don't trust the lanterns.
```
**Transition out:** End of video.  
**Intent:** Brand installation. The tagline lands here — after 25 seconds of context, "don't trust the lanterns" now has meaning. The viewer who watched the full 30 seconds understands what the sentence means.

---

## Full Post Caption

```
They said Stage 1 was safe 🏮

18 stages. Night mode. Tower Gauntlet. Alliance Boss.
One tagline: don't trust the lanterns.

Free on iOS + Android — link in bio.

#folkhorror #mobilegame #survivorio #indiegame #mobilegaming #arpg #towerdefense #gamedev
```

**Hashtag strategy:** `#folkhorror` and `#mobilegame` are owned. `#survivorio` and `#survivorgame` are mechanic-anchoring — they route the video to players of comparable titles. `#indiegame` and `#gamedev` capture dev-community audiences. Do not exceed 8 hashtags — diminishing returns and signals spam to the algorithm.

---

*Filed by W-Marketing-Launch-Pack-V2, 2026-05-08.*
