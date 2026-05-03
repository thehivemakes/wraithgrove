# Worker — W-Enemy-Catalog

You are Worker EC — the multi-enemy roster + sprite + boss-pass worker.

## Birth + design source

Birth sequence + project files. Especially:
- **SPEC.md §0** — multi-enemy catalog confirmed (red cloaked, pumpkin, jiangshi, samurai, plus 6 bosses). Difficulty mandate.
- **DOPAMINE_DESIGN.md** §1+§9 — sprite hit-flash + squash, particle bursts on hit/kill
- `js/hunt/hunt-enemies.js`, `js/hunt/hunt-render.js`, `js/hunt/hunt-stage.js` (enemyMix per stage)

## Concerns (one commit each)

### A — Enemy type catalog expansion (4 new types)

Edit `js/hunt/hunt-enemies.js`. Existing types: lurker, walker, sprite, brute_small, caller. Add four new types tagged with which mode they spawn in:

```js
pumpkin_lantern: {
  name: 'Pumpkin Lantern', hp: 32, damage: 8, speed: 70, size: 18, xp: 4,
  color: '#e07820', accent: '#ffc848', ai: 'walker', mode: 'night',
},
jiangshi: {
  name: 'Jiangshi', hp: 50, damage: 12, speed: 85, size: 20, xp: 7,
  color: '#3a2018', accent: '#f8e8c8', ai: 'walker', mode: 'night',  // hopping vampire — actual hop AI is V2
},
samurai_grunt: {
  name: 'Samurai Grunt', hp: 70, damage: 15, speed: 80, size: 22, xp: 10,
  color: '#a82828', accent: '#ffc850', ai: 'walker', mode: 'both',
},
red_zombie: {
  name: 'Red Zombie', hp: 22, damage: 6, speed: 65, size: 18, xp: 3,
  color: '#a82820', accent: '#ffe0b0', ai: 'walker', mode: 'both',  // existing baseline day enemy
},
```

In `hunt-stage.js`, update `enemyMix` per stage to reference these by id. Day stages: red_zombie + samurai_grunt. Night stages: pumpkin_lantern + jiangshi + samurai_grunt. (Mode filter happens in spawner — read `c._typeData.mode` and skip if doesn't match `runtime.mode`.)

### B — Sprite draws for the 4 new enemy types

In `hunt-render.js drawCreatures`, route by `c.type`:

- **pumpkin_lantern**: drawPumpkin — body silhouette dark `#1a1410` (skinny torso + thin legs + arm stubs), large round orange head `#e07820` with vertical pumpkin-rib lines, green-brown stem on top, glowing triangular eyes + jagged mouth (sin-wave alpha pulse 0.6-1.0 phased by c.x). Drop shadow.
- **jiangshi**: drawJiangshi — green-tinged dark body, conical straw hat with paper amulet hanging in front (vertical paper strip with brush-stroke marks), arms stiffly outstretched (Chinese hopping vampire pose), pale face with red dots for eyes.
- **samurai_grunt**: drawSamurai — red-armor robe trapezoid, gold horned helmet (two short horns), one katana visible at hip (gray line). Slightly larger than other types.
- **red_zombie**: keep existing cloaked-zombie draw (the `drawZombie` function) — already styled correctly.

Each draw function: drop shadow + body + accent details + HP bar above (when damaged). All use `c.size` for scale.

Wire the swing-trail / hit-flash effects already in place — they read `c._lastDamageAt` from the engine subscription.

### C — Boss sprite pass + marker

The 6 procedural boss draws (drawBoss_pale_bride / frozen_crone / autumn_lord / temple_warden / cave_mother / wraith_father) are mostly geometric. Refine each to a **cloaked humanoid silhouette** matching the boss's identity:

- **pale_bride** — long white wedding-veil silhouette, dark eyes, red bridal sash
- **frozen_crone** — ice-blue robe, jagged ice-crown on head
- **autumn_lord** — orange-brown cloak, antlers (already partial), pumpkin face hint
- **temple_warden** — gold ceremonial robes, pillar staff in hand
- **cave_mother** — dark earth-tone, multiple eye-glints
- **wraith_father** — already mostly correct (purple aura + crown), reinforce silhouette

Each boss should read at thumbnail glance as a *humanoid figure*, not a colored shape. Keep the existing aura logic (drawBossAura).

Marker at `workers/done/W-Enemy-Catalog.done` with type IDs added + sprite functions added.

## Constraints

- Don't break existing 5 enemy types.
- Numerical tunables (HP/damage/speed/xp/size) at module top.
- Test in browser: enter Day stage → red zombies + samurai. Enter Night stage → pumpkins + jiangshi + samurai. Should visually distinguish at thumbnail.
- One concern per commit. Three commits.
