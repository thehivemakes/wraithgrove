// WG.HuntWaves — wave manager: spawns enemies on a difficulty curve
(function(){'use strict';
  // Each stage runs for durationSec. Enemies spawn in a ramp:
  // - First 10s: tutorial trickle (1 enemy / 4s)
  // - 10-50% duration: rising waves (2-4 enemies / 3-2s)
  // - 50-85% duration: peak waves (4-7 enemies / 1.5s)
  // - 85-100%: pre-boss surge (3-5 enemies / 1s)
  // Boss spawns at 100% if stage.bossId is set.

  function spawnInWindow(runtime, stage, dt) {
    const elapsed = runtime.elapsed;
    const dur = stage.durationSec;
    const frac = elapsed / dur;

    // Determine spawn rate (enemies per second)
    let rate;
    if (frac < 0.05)      rate = 0.25;
    else if (frac < 0.5)  rate = 0.6 + frac * 0.8;
    else if (frac < 0.85) rate = 1.4 + (frac - 0.5) * 1.0;
    else if (frac < 1.0)  rate = 2.0;
    else                  rate = 0;

    runtime.spawnAccum += rate * dt;
    while (runtime.spawnAccum >= 1) {
      runtime.spawnAccum -= 1;
      spawnOne(runtime, stage);
    }

    // Boss spawn at end (only once)
    if (frac >= 1.0 && !runtime.bossSpawned && stage.bossId) {
      runtime.bossSpawned = true;
      spawnBoss(runtime, stage);
    }
  }

  function spawnOne(runtime, stage) {
    const types = stage.enemyMix || ['lurker'];
    const t = types[Math.floor(Math.random() * types.length)];
    // Pick spawn point near map edge, away from player
    const W = runtime.mapW, H = runtime.mapH;
    const p = runtime.player;
    let x, y, tries = 0;
    do {
      const edge = Math.floor(Math.random() * 4);
      if (edge === 0)      { x = Math.random() * W; y = 30; }
      else if (edge === 1) { x = Math.random() * W; y = H - 30; }
      else if (edge === 2) { x = 30;                y = Math.random() * H; }
      else                 { x = W - 30;            y = Math.random() * H; }
      tries++;
    } while (tries < 4 && p && Math.hypot(x-p.x, y-p.y) < 200);
    const e = WG.HuntEnemies.spawn(t, x, y);
    if (e) runtime.creatures.push(e);
  }

  function spawnBoss(runtime, stage) {
    const W = runtime.mapW, H = runtime.mapH;
    const b = WG.HuntBosses.spawn(stage.bossId, W*0.5, 50);
    if (b) {
      runtime.boss = b;
      WG.Engine.emit('boss:spawned', { boss: b, stageId: stage.id });
    }
  }

  function init() {}
  window.WG.HuntWaves = { init, spawnInWindow };
})();
