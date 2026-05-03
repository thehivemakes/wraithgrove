# Worker — W-Banshee-Enemy

You are Worker BE — Banshee enemy type + audio + spawn rules.

Architect 2026-05-02: "We need a shrieking scary banshee randomly attack and go nuts and is big."

## Birth + design source

Standard birth + project files. Especially:
- SPEC.md §0 (multi-enemy catalog, Night Mode register)
- DOPAMINE_DESIGN.md §1+§9 (sprite hit-flash, particle bursts)
- `js/hunt/hunt-enemies.js` (existing TYPES catalog), `js/hunt/hunt-render.js` (drawCreatures dispatch + sprite functions), `js/hunt/hunt-waves.js` (spawn logic), `js/core/wg-audio.js` (EVENT_MAP)

## Concerns (one commit each)

### A — Banshee enemy type + frenzied AI

In `hunt-enemies.js` add:
```js
banshee: {
  name: 'Banshee', hp: 220, damage: 22, speed: 130, size: 36, xp: 30,
  color: '#e8e0f0', accent: '#a060ff', ai: 'banshee_charge',
  mode: 'night',  // Night Mode only — scary register matches dark biome
  rare: true,     // wave-spawner uses this flag for low-prob roll
  shriekCooldown: 4.0,  // seconds between shriek-charge attacks
},
```

New AI 'banshee_charge': moves erratically (sin-wave lateral + fast forward toward player), every shriekCooldown seconds emits `enemy:shriek` event AND charges directly at player at 1.8× speed for 0.8s, then resumes erratic. Implement in `hunt-enemies.js tick` or wherever per-creature AI lives.

### B — Drawn sprite (large, ghostly, shrieking visuals)

In `hunt-render.js`, add `drawBanshee(ctx, sx, sy, c)` and route from `drawCreatures` switch on `c.type === 'banshee'`.

Sprite spec:
- **Size 36** (vs 18-22 for normal enemies — visually 2× the rest)
- **Body**: long ghostly white-violet trailing robe — trapezoid that widens to ground, shifts horizontally with sin-wave (`Math.sin(t*4 + c.x*0.01)*4`)
- **Hair**: long flowing dark strands rendered as 5 vertical lines from head down past body, curving with the wind-sin
- **Head**: pale violet `#e8e0f0` with hollow black eye sockets that GLOW purple `#a060ff` (additive composite)
- **Mouth**: gaping dark hole, stretched wide-open during shriek attack
- **Aura**: 3-layer purple-violet aura behind body (radial gradient, pulsing 1.0 ± 0.2 with sin-wave)
- **Hit flash + wobble**: use shared `_creatureHitFx()` helper if accessible
- **Shriek visualization**: when within shriekCooldown < 0.6, draw expanding ring around banshee (scared visualization)
- **HP bar**: above sprite (Banshee has 220 HP — needs visible health gauge)

### C — Audio shriek + spawn config + marker

In `wg-audio.js` EVENT_MAP add:
```js
{ event: 'enemy:shriek', id: 'boss_die', bus: 'sfx', throttleMs: 600, vol: 0.85 },
```
(reuses boss_die placeholder until a dedicated banshee_screech mp3 is sourced — comment that the file is a placeholder).

In `hunt-waves.js`: in spawn-roll logic, add a low-probability path: 5% per wave-spawn-tick rolls the rare-flagged banshee instead of standard enemy. Only when `runtime.mode === 'night'`. Cap of 1 banshee alive at a time per stage (track in runtime.bansheeCount).

Marker `workers/done/W-Banshee-Enemy.done` with type entry + sprite function name + AI behavior summary + commits.

## Constraints

- Banshee is Night-only and rare — should feel like a SCARE, not a regular fixture
- Do NOT touch other enemy types
- Do NOT add new files unless necessary; extend existing modules
- One concern per commit. Three commits.
- Voice: terse, cite SPEC §0 inline.

POLISH MANDATE: the shriek charge is the dopamine peak — purple particle burst on shriek-fire (use HuntFX 'pickupFragment' burst as placeholder), screen flash purple-tint 0.3 for 200ms during shriek, addTrauma(0.3) on shriek-fire so the player feels it.
