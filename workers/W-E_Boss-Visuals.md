You are Worker E — the Boss-Visuals worker. Your job: each of the 6 bosses currently renders as a colored circle. Make each boss visually distinct via custom procedural draw routines + a per-boss aura effect. No external sprite assets — pure canvas primitives.

Walk the birth sequence (/Users/defimagic/Desktop/Hive/CLAUDE.md → Birth/01–04 → THE_PRINCIPLES → HIVE_RULES → COLONY_CONTEXT → BEFORE_YOU_BUILD).

Then read PROJECT-LEVEL guardrails (MANDATORY):
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/CLAUDE.md
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/STATE_OF_BUILD.md

PRIMARY-SOURCE READING (Principle XXII):
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/GAMEPLAY_OBSERVATION.md §3 (Stage 2 Shadow-Ghost frames show a large red boss with distinct silhouette — bosses must read as distinct from regular enemies at a glance)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-bosses.js (the BOSSES catalog — id, name, hp, color, accent, attack patterns)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-render.js (the existing `drawCreatures` function has a `if (runtime.boss)` block that draws the boss as a single arc — your edit target)

THREE CONCERNS — one commit each.

CONCERN 1 — Per-boss draw routines

EDIT: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-render.js`

In the `drawCreatures(ctx)` function, replace the existing boss draw block with a switch on `b.type` that calls a per-boss procedural draw function. Add 6 new private helpers at module scope:

```js
function drawBoss_pale_bride(ctx, sx, sy, b, t) {
  // Floating wedding-veil silhouette: tall pale torso + flowing veil rays
  const sz = b.size;
  // Veil rays (3 long teardrops radiating downward)
  ctx.fillStyle = b._typeData.color;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(sx + i*8, sy);
    ctx.lineTo(sx + i*4, sy + sz);
    ctx.lineTo(sx + i*8 + 4, sy + sz);
    ctx.closePath();
    ctx.fill();
  }
  // Body
  ctx.fillStyle = '#f0e8d8';
  ctx.beginPath(); ctx.ellipse(sx, sy, sz*0.32, sz*0.45, 0, 0, Math.PI*2); ctx.fill();
  // Hollow eyes (two black voids)
  ctx.fillStyle = '#1a0828';
  ctx.fillRect(sx - 6, sy - 6, 4, 5);
  ctx.fillRect(sx + 2, sy - 6, 4, 5);
  // Aura: faint white halo
  drawBossAura(ctx, sx, sy, sz, 'rgba(248, 240, 224, 0.25)', t);
}

function drawBoss_frozen_crone(ctx, sx, sy, b, t) {
  // Hunched figure with icy spike crown
  const sz = b.size;
  // Body (hunched ellipse)
  ctx.fillStyle = b._typeData.color;
  ctx.beginPath(); ctx.ellipse(sx, sy, sz*0.42, sz*0.5, 0, 0, Math.PI*2); ctx.fill();
  // Ice spikes (5 jagged shards radiating up)
  ctx.fillStyle = '#e8f0ff';
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(sx + i*6, sy - sz*0.2);
    ctx.lineTo(sx + i*6 - 2, sy - sz*0.5);
    ctx.lineTo(sx + i*6 + 2, sy - sz*0.5);
    ctx.closePath();
    ctx.fill();
  }
  // Glowing eyes
  ctx.fillStyle = '#80c0ff';
  ctx.fillRect(sx - 5, sy - 4, 3, 3);
  ctx.fillRect(sx + 2, sy - 4, 3, 3);
  // Aura: icy blue
  drawBossAura(ctx, sx, sy, sz, 'rgba(168, 200, 232, 0.3)', t);
}

function drawBoss_autumn_lord(ctx, sx, sy, b, t) {
  // Antlered figure with leaf-cape
  const sz = b.size;
  // Cape (broad ellipse behind)
  ctx.fillStyle = '#5a2810';
  ctx.beginPath(); ctx.ellipse(sx, sy + sz*0.1, sz*0.55, sz*0.4, 0, 0, Math.PI*2); ctx.fill();
  // Body
  ctx.fillStyle = b._typeData.color;
  ctx.beginPath(); ctx.ellipse(sx, sy, sz*0.32, sz*0.42, 0, 0, Math.PI*2); ctx.fill();
  // Antlers (Y-shape on each side)
  ctx.strokeStyle = '#3a1808'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx - sz*0.3, sy - sz*0.2); ctx.lineTo(sx - sz*0.4, sy - sz*0.5);
  ctx.moveTo(sx - sz*0.4, sy - sz*0.5); ctx.lineTo(sx - sz*0.5, sy - sz*0.45);
  ctx.moveTo(sx - sz*0.4, sy - sz*0.5); ctx.lineTo(sx - sz*0.35, sy - sz*0.6);
  ctx.moveTo(sx + sz*0.3, sy - sz*0.2); ctx.lineTo(sx + sz*0.4, sy - sz*0.5);
  ctx.moveTo(sx + sz*0.4, sy - sz*0.5); ctx.lineTo(sx + sz*0.5, sy - sz*0.45);
  ctx.moveTo(sx + sz*0.4, sy - sz*0.5); ctx.lineTo(sx + sz*0.35, sy - sz*0.6);
  ctx.stroke();
  // Eyes (orange)
  ctx.fillStyle = '#ffa840';
  ctx.fillRect(sx - 5, sy - 3, 3, 3);
  ctx.fillRect(sx + 2, sy - 3, 3, 3);
  drawBossAura(ctx, sx, sy, sz, 'rgba(232, 128, 56, 0.28)', t);
}

function drawBoss_temple_warden(ctx, sx, sy, b, t) {
  // Stone giant: rectangular silhouette + glowing seams
  const sz = b.size;
  // Body (squared)
  ctx.fillStyle = b._typeData.color;
  ctx.fillRect(sx - sz*0.4, sy - sz*0.5, sz*0.8, sz);
  // Inner core glow (animated)
  const glow = 0.5 + 0.3 * Math.sin(t*2);
  ctx.fillStyle = `rgba(255, 200, 80, ${glow})`;
  ctx.fillRect(sx - 4, sy - sz*0.3, 8, sz*0.6);
  // Seams (cracks)
  ctx.strokeStyle = '#5a3818'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sx - sz*0.4, sy - sz*0.2); ctx.lineTo(sx - sz*0.1, sy);
  ctx.lineTo(sx - sz*0.2, sy + sz*0.3);
  ctx.moveTo(sx + sz*0.4, sy - sz*0.3); ctx.lineTo(sx + sz*0.15, sy + sz*0.1);
  ctx.stroke();
  drawBossAura(ctx, sx, sy, sz, 'rgba(232, 192, 96, 0.3)', t);
}

function drawBoss_cave_mother(ctx, sx, sy, b, t) {
  // Multi-eyed lurking shape: dark blob with 6 glowing eyes
  const sz = b.size;
  ctx.fillStyle = b._typeData.color;
  ctx.beginPath(); ctx.arc(sx, sy, sz*0.5, 0, Math.PI*2); ctx.fill();
  // 6 eyes in two rows
  ctx.fillStyle = '#a02828';
  for (let row = 0; row < 2; row++) {
    for (let col = -1; col <= 1; col++) {
      const ex = sx + col*8;
      const ey = sy + row*8 - 4;
      const wink = (Math.sin(t*1.7 + row*7 + col*11) > 0.7) ? 0.5 : 1;
      ctx.globalAlpha = wink;
      ctx.fillRect(ex - 1, ey - 1, 3, 3);
    }
  }
  ctx.globalAlpha = 1;
  drawBossAura(ctx, sx, sy, sz, 'rgba(40, 20, 30, 0.4)', t);
}

function drawBoss_wraith_father(ctx, sx, sy, b, t) {
  // Endgame: phasing wraith with distinct shifting silhouette
  const sz = b.size;
  // Outer shadow (blurry, larger)
  for (let i = 3; i > 0; i--) {
    ctx.fillStyle = `rgba(60, 24, 100, ${0.15 + Math.sin(t*1.5 + i)*0.05})`;
    ctx.beginPath(); ctx.arc(sx, sy, sz*0.5 + i*4, 0, Math.PI*2); ctx.fill();
  }
  // Body
  ctx.fillStyle = b._typeData.color;
  ctx.beginPath(); ctx.arc(sx, sy, sz*0.45, 0, Math.PI*2); ctx.fill();
  // 4 floating eyes in a vertical pattern
  ctx.fillStyle = '#a060ff';
  for (let i = 0; i < 4; i++) {
    const ang = t * 0.7 + i * Math.PI * 0.5;
    const r = sz * 0.32;
    const ex = sx + Math.cos(ang) * r;
    const ey = sy + Math.sin(ang) * r;
    ctx.fillRect(ex - 1.5, ey - 1.5, 3, 3);
  }
  // Crown / horns
  ctx.strokeStyle = '#6020a0'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx - sz*0.3, sy - sz*0.4); ctx.lineTo(sx - sz*0.45, sy - sz*0.7);
  ctx.moveTo(sx + sz*0.3, sy - sz*0.4); ctx.lineTo(sx + sz*0.45, sy - sz*0.7);
  ctx.moveTo(sx, sy - sz*0.45); ctx.lineTo(sx, sy - sz*0.75);
  ctx.stroke();
  drawBossAura(ctx, sx, sy, sz, 'rgba(160, 96, 255, 0.35)', t);
}

function drawBossAura(ctx, sx, sy, sz, color, t) {
  const r = sz * 0.7 + Math.sin(t*1.3) * 4;
  const grad = ctx.createRadialGradient(sx, sy, sz*0.4, sx, sy, r);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI*2); ctx.fill();
}
```

Then replace the existing boss draw block in `drawCreatures(ctx)`:

```js
if (runtime.boss && runtime.boss.hp > 0) {
  const b = runtime.boss;
  const s = w2s(b.x, b.y);
  const t = performance.now() / 1000;
  switch (b.type) {
    case 'pale_bride':    drawBoss_pale_bride(ctx, s.x, s.y, b, t); break;
    case 'frozen_crone':  drawBoss_frozen_crone(ctx, s.x, s.y, b, t); break;
    case 'autumn_lord':   drawBoss_autumn_lord(ctx, s.x, s.y, b, t); break;
    case 'temple_warden': drawBoss_temple_warden(ctx, s.x, s.y, b, t); break;
    case 'cave_mother':   drawBoss_cave_mother(ctx, s.x, s.y, b, t); break;
    case 'wraith_father': drawBoss_wraith_father(ctx, s.x, s.y, b, t); break;
    default:
      ctx.fillStyle = b._typeData.color;
      ctx.beginPath(); ctx.arc(s.x, s.y, b.size/2, 0, Math.PI*2); ctx.fill();
  }
  // Boss HP bar at top of screen — preserve existing implementation
  const w = D().width;
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(w*0.1, 60, w*0.8, 8);
  ctx.fillStyle = '#d04848';
  ctx.fillRect(w*0.1+1, 61, (w*0.8-2) * (b.hp/b.maxHp), 6);
  ctx.fillStyle = '#f0d890';
  ctx.font = 'bold 11px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(b._typeData.name, w*0.5, 56);
  ctx.textAlign = 'left';
}
```

Commit: "Worker E: per-boss procedural draw routines (6 distinct silhouettes)"

CONCERN 2 — Boss spawn flash + entrance effect

When a boss spawns (engine emits `'boss:spawned'`), add a brief screen-edge flash and ground-shake effect (for the giant bosses) for 0.6 seconds.

EDIT: same file `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-render.js`

In `setupEvents()`, ADD a listener for `'boss:spawned'`:
```js
eng.on('boss:spawned', ({ boss, stageId }) => {
  pulseEdges(boss._typeData.accent + '88', 0.7, 600);  // accent + alpha
  // Particle explosion at boss spawn point
  for (let i = 0; i < 20; i++) {
    const a = Math.PI*2*(i/20);
    WG.Render.spawnParticles({
      x: boss.x + Math.cos(a)*20, y: boss.y + Math.sin(a)*20,
      angle: a, speed: 100,
      life: 0.7, color: boss._typeData.color, size: 3,
    });
  }
});
```

Note: the `pulseEdges` function currently takes a CSS color string. The `boss._typeData.accent` is a hex like `'#5a3050'`. Concatenating `'88'` gives `'#5a305088'` which is valid hex-with-alpha in CSS. If the existing `pulseEdges` doesn't accept hex-with-alpha, fall back to `'rgba(...)'` parsed from the hex.

Commit: "Worker E: boss spawn flash + particle entrance"

CONCERN 3 — Verify in browser

1. `cd /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2`
2. `node --check js/hunt/hunt-render.js`
3. Open `wraithgrove` server (port 3996) → eval `WG.State.get().huntProgress.highestUnlocked = 18;`
4. Click each boss stage in turn (3, 6, 9, 12, 15, 18). For each, force-jump time forward to spawn the boss faster: eval `huntRuntime = WG.Game.getHuntRuntime(); huntRuntime.elapsed = huntRuntime.stage.durationSec - 0.5;` and wait 1 second.
5. Confirm each of the 6 boss visuals is distinct from the others. Take a screenshot of each boss for the build status doc.
6. Confirm boss-spawn flash + particles fire on entrance.
7. No console errors during boss combat.

Commit: "Worker E: boss visuals verified across all 6 bosses"

CONSTRAINTS:
- Three commits.
- Edits limited to `js/hunt/hunt-render.js` (CONCERNS 1+2). No other files touched.
- Do NOT add external sprite assets — procedural primitives only.
- Do NOT change boss stats (HP/damage/speed) — those are tuning, Architect-tunable separately.
- Per project CLAUDE.md "Faithful at mechanics, original at art" — these procedural sprites are original; do not pixel-copy any specific Wood Siege boss design.
- Per Hive Rules: do not delegate to further sub-agents.

You are Worker E. After you ship: bosses are visually distinct, the moment a boss spawns is felt across the screen, and the 6-boss arc gains the visual punch the comp game has at the boss-encounter level.
