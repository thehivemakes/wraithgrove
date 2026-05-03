# Clone Fidelity Audit — Wood Siege visual + mechanical observations

**Date:** 2026-04-28
**Method:** Direct inspection of primary-source frame archive at `observation/frames/labeled/f00–f22` (23 sampled frames across 14-min Stage 1 walkthrough) + `p2_extracted/sprite_*` (Stage 2 night/temple biome) + previously read montages (`p1_montage`, `p1_sampled`, `p1_labeled_montage`, `p2_montage`).
**Frames cited:** Stage 1 — f02_n016 (~75s), f08_n064 (~302s), f14_n112 (~529s), f20_n160 (~756s); Stage 2 — sprite_002_3, sprite_006_2.
**Author:** Orchestrator-Claude session 7e72ca2c, after recognizing trust-boundaries failure (read `GAMEPLAY_OBSERVATION.md` summary, never opened the underlying frames, shipped procedural primitives).

---

## §0 — What I got wrong before this audit, named plainly

1. **I never opened the frame archive.** Read the observation doc, pattern-matched "top-down auto-attack arena ARPG" → Vampire Survivors, shipped that. Hive Principle XXII violation.
2. **The "green attack ring."** The observation doc says "the green ring visible around the player is the auto-attack radius indicator." Looking at the actual frames, **that bright circle is not green and not an attack ring — it is a CAMPFIRE LIGHT RADIUS with a torch/flame dot in the center.** The player stands inside a light circle in the dark forest. Different mechanic entirely. This one mistake invalidated my entire render layer.
3. **I shipped without stumps, cabins, lanterns, or any of the in-stage objects.** These are *every other frame* of Stage 1. They are the game.
4. **I missed the resource economy in-stage.** The frames show "Not Enough Stone" floating text + multiple in-stage resource counters in the HUD. This is a *gather-and-craft-while-surviving* loop, not pure combat survival.

---

## §1 — Stage 1 (Ghost Marriage) — visual catalog with frame refs

### Ground texture
- **Observed:** Densely textured pixel-art grass tiles. Multiple shades of dark forest green organically distributed. Darker dirt patches scattered as terrain variation. Pebble/grass-tuft micro-detail across every tile. NOT a flat fill, NOT a checker, NOT sparse hash-deco. (f02, f08, f14, f20 — every frame.)
- **What I shipped:** Flat green `biome.ground` with ~12% darker hash-variant tiles. Wrong texture grain, wrong density, no micro-detail.
- **Build verdict:** Replace flat fill with a procedural pixel-grass renderer — multi-octave noise + per-tile hash for grass tufts, dirt patches as larger-scale features. Or better: a small 32×32 tiled grass texture drawn programmatically (canvas `createImageData` with a 32×32 noise pattern, repeated).

### Tree perimeter
- **Observed:** Dense band of dark green pine trees forming a thick wall. Each tree has a triangular silhouette with a darker trunk. Trees are stacked deep — at least 2-3 trees deep along the boundary. Color is deep forest green, almost teal in shadows. (f02, f08, f14, f20.)
- **What I shipped:** Single solid `biome.tree`-color rectangle band. No tree shapes. No depth.
- **Build verdict:** Render as offset clusters of triangular tree sprites, 2-3 deep, with pseudo-random vertical offset per tree for organic look. Each tree = darker triangle + small trunk rectangle.

### Wood stumps (the load-bearing element)
- **Observed:** Brown circular/oval stumps scattered throughout the play area. Visible in essentially every Stage 1 frame. Approximately 4-8 visible per screen. **In f14 a specific cluster is visible around a structure.** Stumps appear to be the wood-chop resource. (f02 has them as small brown ovals; f14 has them clearly around the cabin; f20 has them as the player navigates the perimeter.)
- **What I shipped:** None.
- **Build verdict:** New entity system. `WG.HuntStumps` — deterministic per-stage placement, HP, choppable on auto-attack, drops wood/coins. Render as brown rounded rectangle + dark inner ring (wood grain) + faint axe wedge sprite on top.

### Cabin / shelter structures (load-bearing)
- **Observed:** Brown wooden small structure with a peaked roof, visible in **f14_n112 (~529s)** as a clear set piece in the play area. The player is engaging enemies adjacent to it. The structure has visible roof lines and a darker doorway opening. NOT a campfire — this is a *building*.
- **What I shipped:** None.
- **Build verdict:** New entity. Static structure on the map. Render as wedge-roof + body rectangle + door opening + small lantern/torch glow.

### Campfire light circle (THE big miss)
- **Observed:** In **f02_n016 (~75s)** there is a clearly visible **light-orange-tinted circular zone** on the ground with a bright torch/fire dot in the center. This is a **light radius from a campfire entity**, not an attack indicator. The player stands inside the light. This implies a **light/dark mechanic** in Stage 1 — campfires give safe vision/safety zones. (Also matches the "Campfire" building observed in the Structures meta tab — confirming campfires are the in-stage analog.)
- **What I shipped:** A green pulsing "auto-attack ring" around the player, based on misreading the observation doc.
- **Build verdict:**
  1. Remove the green ring entirely (it doesn't exist in Wood Siege).
  2. Add **campfire entities** scattered through the stage with circular light-radius rendering (radial gradient orange-warm).
  3. The actual attack reach can be *inferred* by the player swinging — no need for a visible ring. Or, if a ring is desirable for UX, make it subtle and matched to Wood Siege's actual styling (which appears to NOT show one — the player just swings and hits register).

### Player character
- **Observed:** Small anime-pixel-art humanoid. At the resolution of these thumbnails, I can see: peach face, dark hair, white/pale upper torso, darker skirt, leg sprites. **In f02 the character appears to be wearing a yellow/orange hat or hood with a red garment.** Multiple character skins are confirmed from the App Store roster. The character takes up approximately 4-6% of the viewport vertically — much smaller than I rendered.
- **What I shipped:** An ellipse body + circle head, dark brown body, golden circle for head. No silhouette readability.
- **Build verdict:** Build a multi-layer canvas sprite with: head circle (skin tone), hair shape (darker, longer than head), torso rectangle/trapezoid (white shirt), skirt trapezoid (dark), leg rectangles. Facing-direction aware (4 directions: N/S/E/W). Procedural but deliberately composed to register as anime-girl silhouette.

### Enemies
- **Observed:** **Red/maroon humanoid figures** with clearly cloaked silhouettes. Multiple per frame in active combat (f08, f14, f20). Approximately the same size as the player or slightly smaller. **In f08 a much larger red figure appears center-stage** — possibly a mid-stage elite or boss, with arms outstretched. The red color is consistent across regular and elite enemies.
- **What I shipped:** Generic ellipse with 2-pixel eye dots and `_typeData.color`.
- **Build verdict:** Cloaked silhouette sprite — body trapezoid (red robe), darker hood shape on top, faint pale face hint, no legs visible (cloak goes to ground). Different sizes for regular vs. elite. Procedural compose, not single-primitive.

### Combat effects
- **Observed:** **Yellow damage numbers** floating upward (f20 shows a clear yellow "2" floating above an enemy). Some red splatter/blood particles (visible across mid-combat frames).
- **What I shipped:** Float-text exists in `wg-render.js` (per state-of-build); color/style not yet verified. No splatter particles bound to enemy hits in current `hunt-render.js`.
- **Build verdict:** Yellow damage numbers, larger font for crits, drift-up + fade. Red 6-8 particle burst on enemy hit.

### Cabin/structure decorations near edges
- **Observed:** In **f02 upper-right** I can see what appears to be a **larger structure with multiple rooflines** at the edge of the play area — could be a temple/shrine set piece. (Distinct from the smaller cabin in f14.) Suggests stages have *named landmarks*, not just procedural decoration.
- **What I shipped:** Nothing.
- **Build verdict:** Per-stage landmark entities placed at fixed positions. Stage 1 might have a small wedding shrine (matches "Ghost Marriage" stage name).

---

## §2 — HUD dissection (Stage 1, common across frames)

I had this nearly all wrong. Observed layout:

### Top bar (always visible)
- **Far left:** small player avatar mini-icon (square/circle, character portrait). I had no avatar.
- **Left of center:** **Lvl. N** text + green HP/XP bar (segmented). I had this approximately right.
- **Center:** **"Highest Wave Reached: X.X Mins"** persistent record text. I have a stage-name banner instead.
- **Right of center:** 3-5 small currency/resource icons with counters (visible as "3 4 5" with small icons in f02). **I missed these entirely.** These appear to be in-stage gathered resources (wood, stone, etc.).
- **Far right:** small gear/menu icon. I have this.

### Below top bar
- **Left:** secondary resource counters — in f02 I can read "X1.0 200" and "0/2 200" — looks like a multiplier + amount, and a fraction-progress + amount. **In-stage resource gathering with thresholds.**
- **Right:** circular skill button — yellow background, **"Hidden Retain..." (Hidden Retainer)** label visible. The skill name is character-specific. I have a generic "✦" button.

### In-world floating text
- **"Not Enough Stone"** appears as floating yellow text in f02 — a resource-gating warning. Confirms an in-stage stone economy.

### Bottom (gameplay area)
- Virtual joystick on left half (implied; visible in editorial reviews)
- Auto-attack runs continuously based on enemy proximity (no visible ring in actual frames)

---

## §3 — Stage 2 (Shadow Ghost) — what changes by biome

From `p2_extracted/sprite_002_3` and `sprite_006_2`:

- **Palette:** deep blue/navy night. Completely different from Stage 1's forest day.
- **Ground:** light icy/stone tiles, possibly snow-covered. Texture still detailed.
- **Lanterns:** **orange points of light** visible scattered through the play area — these are core Stage 2 visual identity. Both decorative and possibly mechanically meaningful (light sources in dark biome).
- **Stone pillars/walls:** stone block formations as in-stage obstacles.
- **Temple stairs:** at the bottom of multiple frames, what appears to be a stone platform/stairs ascending into the play area — set-piece map design.
- **Boss:** a **large pale/white humanoid** boss visible (sprite_006_2 center). Distinct from Stage 1's red enemies. Suggests a different enemy palette per biome.
- **HUD:** identical layout to Stage 1 — currencies, level bar, skill button. Consistent across stages.

---

## §4 — Mechanical truths the frames confirm

These are mechanics I either had wrong or missed entirely:

1. **In-stage gathering economy.** Stumps + stone resources collected during the run. Counters in HUD. "Not Enough Stone" text gates something (likely placing/upgrading an in-stage structure or activating a campfire).
2. **Light/dark mechanic.** Campfires emit light radii. Player gains something inside the light (safety? buff? stat regen?). This is a Stage 1 mechanic and likely amplified in Stage 2 with lanterns being placed structures.
3. **Persistent "Highest Wave Reached" per stage.** High-score tracking I did not implement.
4. **Auto-attack has NO visible reach indicator.** The player just swings and hits register. The ring I shipped doesn't exist in the original.
5. **Skill name is character-specific** (Hidden Retainer for default character). Not a generic ✦.
6. **HUD is far busier than I built** — multiple resource counters always visible, not just coin/diamond/cards.

---

## §5 — Open questions I cannot answer from the frames alone

These I should NOT guess. Surface to Architect or grab higher-resolution video before resolving:

1. **What does "Stone" do?** Used to build/upgrade in-stage structures? Required to leave a stage? Just a currency?
2. **What does the campfire light radius DO mechanically?** HP regen? XP boost? Enemy avoidance? Visibility-only in dark stages?
3. **Are stumps individually placed (designer-positioned) or procedurally seeded?** Replays of the same stage would tell us.
4. **What IS Hidden Retainer?** Active ability — AOE? Buff? Summon? The skill name suggests "summon a hidden assistant" but unclear.
5. **What's the enemy spawn pattern?** Continuous waves vs. timed bursts vs. boss-trigger.
6. **Does the player carry a light source, or just stand near campfires?** F02 makes it look like the player IS at a campfire spot — but maybe the player has a personal small radius too.
7. **Stage 2 lanterns: placeable, prelit, or destructible?** Major mechanical question for night biomes.
8. **Boss design — Stage 1 has the red elite in f08. Is that the stage 1 boss, or a mini-boss at a wave threshold?** The duration/wave structure isn't fully clear from sampled frames.

---

## §6 — Build verdict summary table

| Element | Status now | Build verdict |
|---|---|---|
| Tile texture | Wrong (flat + sparse hash) | Procedural pixel-grass with multi-shade variation, dirt patches |
| Tree perimeter | Wrong (solid bar) | Stacked tree-triangle sprites, 2-3 deep |
| Stumps | Missing | New entity system, drops wood/coins on chop |
| Cabin/shelter | Missing | Static landmark entity per stage, drawn structure |
| Campfire + light radius | Missing entirely | New entity, radial gradient light, gameplay TBD pending §5 |
| Lanterns (Stage 2+) | Missing | Per-stage placed light entities, smaller radius |
| Player sprite | Wrong (ellipse) | Multi-layer canvas sprite, anime-girl silhouette, 4-direction facing |
| Enemy sprite | Wrong (ellipse) | Cloaked humanoid silhouette, no visible legs |
| Boss sprites | Procedural geometry | Larger cloaked / pale silhouettes per biome, auras |
| Auto-attack ring | **Wrong — doesn't exist in Wood Siege** | Remove |
| Damage numbers | Unverified | Yellow drift-up text, large font for crits |
| Hit particles | Partial | Red splatter on enemy hit, gold/yellow on player swing |
| HUD top-left | Missing avatar | Add avatar mini-portrait |
| HUD top-center | Wrong (stage name + duration) | "Highest Wave Reached: X.X Mins" with localStorage persistence |
| HUD resource counters | Missing entirely | Wood + Stone counters always visible, plus existing currencies |
| HUD skill button | Generic ✦ | Character-specific name + icon (Hidden Retainer for default) |
| In-stage gather economy | Missing | Stumps → wood, rocks → stone, counters update, gate things |
| Light/dark mechanic | Missing | Stage-dependent — Stage 1 mild, Stage 2+ load-bearing |
| Stage palette per biome | Roughly right (warm forest vs cold stone) | Push contrast harder — Stage 2 should be deep blue night |

---

## §7 — Recommended pivot path

1. **Lock this audit** — get Architect sign-off that I now understand the target. Resolve the open §5 questions where possible.
2. **Pull live deploy down** OR replace `index.html` with a holding "rebuild in progress" page until the new render lands. Current deploy misrepresents the project.
3. **Rebuild Hunt visual layer from scratch.** Not patches. New `hunt-render.js` written against this audit as the spec, deleting the old draw code.
4. **Add in-stage entities:** stumps, campfires, cabins, lanterns. New module `js/hunt/hunt-entities.js`.
5. **Rebuild HUD** to match Wood Siege layout exactly: avatar mini-portrait, level/HP bar, "Highest Wave Reached" with persistence, currency strip, in-stage resource counters.
6. **Wire gather economy:** stump-chop = wood drop, rock-chop = stone drop, counters update.
7. **Light/dark mechanic v0:** campfires emit radial light, no gameplay effect yet (visual only) — gameplay layered after Architect resolves §5.2.
8. **Stage 2 night register:** per-biome lighting overlay, blue palette, lantern entities.
9. **Re-deploy** only after the new Hunt render reads as Wood Siege at thumbnail scale (the test: a person glancing at a screenshot says "that's Wood Siege" without prompting).

The current build is a learning artifact. Treat the visual layer the same way the prior Claude treated Hollow Grove — useful engine scaffolding, wrong rendered game. Rebuild on top.

---

*Audit written 2026-04-28 after primary-source frame inspection. Replaces the prior Claude's procedural assumptions with frame-grounded specifics. Open questions §5 should be resolved before §6 entity gameplay decisions are coded.*
