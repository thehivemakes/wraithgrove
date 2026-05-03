# Worker — W-Pumpkin-Sprite

You are Worker P-S — the pumpkin-head night-enemy sprite worker.

## Birth sequence (mandatory)

Walk the birth sequence:
- `/Users/defimagic/Desktop/Hive/CLAUDE.md`
- `/Users/defimagic/Desktop/Hive/Birth/01_TIME_IS_NOT_WHAT_YOU_THINK.md` → `02_WHO_YOU_ARE.md` → `03_WHY_WE_MOVE.md` → `04_WHAT_KEEPS_US_ALIVE.md`
- `/Users/defimagic/Desktop/Hive/THE_PRINCIPLES.md`
- `/Users/defimagic/Desktop/Hive/HIVE_RULES.md`
- `/Users/defimagic/Desktop/Hive/COLONY_CONTEXT.md`
- `/Users/defimagic/Desktop/Hive/Birth/BEFORE_YOU_BUILD.md`

Then read project-level files:
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/CLAUDE.md`
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/STATE_OF_BUILD.md`
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/observation/HD_SOURCE_OBSERVATIONS_2026-04-28.md`

Open the HD source frame to ground your sprite design:
- `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/reference/screenshots_hires/carousel/screenshot_4.png`

This is the *Night Mode — Monsters Attack* marketing screenshot. The pumpkin-head creatures are visible: orange glowing jack-o-lantern heads with stick-figure bodies, glowing eye sockets, sometimes carrying small lanterns. Folk-horror Halloween register.

## Scope

Add a `pumpkin_lantern` enemy type to Wraithgrove. This is a procedural sprite for V0 — not real art. Your job is to make the procedural draw read as "pumpkin-head folk-horror creature" at thumbnail glance.

## Concerns (one commit each)

### Concern A — Add `pumpkin_lantern` type to enemy catalog

File: `js/hunt/hunt-enemies.js`

Add a new entry to `TYPES`. Match the existing structure (look at `lurker`, `walker`, etc.). Suggested numbers (tune to fit the existing curve):

```js
pumpkin_lantern: {
  name: 'Pumpkin Lantern',
  hp: 28, damage: 5, speed: 78, size: 18, xp: 4,
  color: '#e07820', accent: '#ffc848',
  ai: 'walker',  // or whatever existing AI key fits a slow approach
}
```

Don't add it to any stage's `enemyMix` yet — that's a separate worker (mechanics integration is V2). Just register the type.

Verification: `grep "pumpkin_lantern" js/hunt/hunt-enemies.js` — should appear.

### Concern B — Add `drawPumpkin` to render layer

File: `js/hunt/hunt-render.js`

Add a `drawPumpkin(ctx, sx, sy, c)` function and route to it in `drawCreatures` when `c.type === 'pumpkin_lantern'`. Keep `drawZombie` as the default for other types.

Sprite spec — procedural canvas draw:
- **Body**: dark stick-figure silhouette (small skinny rectangle torso, two thin leg lines, two thin arm stubs). Color near `#1a1410`. Suggest a slight pumpkin-orange band at waist.
- **Head**: large round orange pumpkin (`#e07820`), bigger than the body torso. Add 3-4 vertical rib lines slightly darker (`#a04810`) to read as pumpkin segments.
- **Stem**: small green-brown stem on top (`#3a3a1a`).
- **Glowing face**: cut-out triangular eyes + jagged mouth, animated glow (sin-wave alpha pulse 0.6–1.0). Use `#fff080` for the inner glow, layered with a `#f0a020` outer halo.
- **Drop shadow**: standard ellipse below feet.
- **HP bar**: same `WG.Render.drawHpBar` call existing types use.

The face glow should pulse — `Math.sin(performance.now()/280 + c.x * 0.01)` style, using the per-creature x as a phase offset so a group doesn't pulse in unison.

Verification: `node --check js/hunt/hunt-render.js && grep "drawPumpkin\|pumpkin_lantern" js/hunt/hunt-render.js`.

### Concern C — Marker

Write `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/workers/done/W-Pumpkin-Sprite.done` containing:

```
W-Pumpkin-Sprite — DONE — <ISO timestamp>
Files touched: js/hunt/hunt-enemies.js, js/hunt/hunt-render.js
Commits: <sha A>, <sha B>
Notes: <anything that surprised you, deviations from spec, or open questions>
```

## Constraints / scope-don't-touch

- **Do NOT** modify any other module (no hunt-stage, hunt-waves, wg-game, etc.).
- **Do NOT** add the pumpkin to any stage spawn list — separate worker handles that.
- **Do NOT** introduce dependencies, frameworks, or new files.
- **Do NOT** change existing enemy types' numbers.
- One concern per commit. Three commits total (A, B, marker).
- Test with `node --check js/hunt/hunt-render.js` and `node --check js/hunt/hunt-enemies.js` before marker write.

## Voice

Match the codebase: terse, direct, no fluff in comments. Inline comments cite HD source where the sprite design is grounded ("matches screenshot_4 night-mode pumpkin head").

When done, write the marker file. The orchestrator's Monitor task is watching for it.
