// WG.HuntCaptureHill — Mode 2: async-sharded capture-the-hill
// 60s run: player holds a glowing hill at arena center against 3 AI ghost clones.
// Hold-time recorded; WG.CaptureHillMatch ranks it against 3 seeded opponent times.
// Reuses HuntPlayer / HuntEnemies combat machinery. mode flag: 'capture_hill'.
(function(){'use strict';

  // ─── Tunables (frozen) ────────────────────────────────────────────────────
  const TUNABLES = Object.freeze({
    MATCH_DURATION:  60,    // seconds per run
    HILL_RADIUS:     24,    // world units; player must be inside to accumulate hold-time
    ARENA_W:         480,
    ARENA_H:         480,
    GHOST_COUNT:     3,     // AI ghost enemies (one per opponent)
    GHOST_RESPAWN:   8,     // seconds before a killed ghost respawns
    GHOST_STAGGER:   2,     // seconds between initial spawns (0, 2, 4)
    ENERGY_COST:     5,     // CF-001: pre-launch, can adjust
    ENEMY_HP_MUL:    1.4,   // ghosts are tougher than stock enemies
    ENEMY_DMG_MUL:   1.2,
    ENEMY_SPD_MUL:   1.15,
  });

  const GHOST_TYPES = ['lurker', 'walker', 'sprite'];

  let chRuntime = null;

  // ─── Runtime shape ────────────────────────────────────────────────────────
  // Parallel to huntRuntime. Fields used by HuntPlayer / HuntEnemies / HuntBosses
  // must exist (stage:null suppresses construction / torch / stump ticks).
  function _buildRuntime(ghostNames) {
    return {
      mode:     'capture_hill',
      mapW:     TUNABLES.ARENA_W,
      mapH:     TUNABLES.ARENA_H,
      elapsed:  0,
      holdTime: 0,
      onHill:   false,
      // combat arrays (same shape HuntPlayer / HuntEnemies expect)
      player:           null,
      creatures:        [],
      projectiles:      [],
      enemyProjectiles: [],
      drops:            [],
      boss:             null,
      bossDefeated:     false,
      // HuntPlayer compat shims
      stage:          null,
      pendingLevelUp: false,
      combo: { count: 0, lastKillAt: 0, peak: 0 },
      runWood: 0,
      kills:   0,
      // ghost management
      ghostNames:  ghostNames || ['Shade A', 'Shade B', 'Shade C'],
      ghostTimers: [0, TUNABLES.GHOST_STAGGER, TUNABLES.GHOST_STAGGER * 2],
      ghostAlive:  [false, false, false],
    };
  }

  // ─── startCaptureHill ─────────────────────────────────────────────────────
  // Called by WG.Game.startCaptureHillRun. Returns runtime for huntRuntime assignment.
  function startCaptureHill(ghostNames) {
    const rt = _buildRuntime(ghostNames);
    chRuntime = rt;
    WG.HuntPlayer.place(rt.mapW * 0.5, rt.mapH * 0.5, rt);
    return rt;
  }

  // ─── tickMatch ────────────────────────────────────────────────────────────
  // Per-frame tick. Called by wg-game.js rAF when huntRuntime.mode === 'capture_hill'.
  function tickMatch(dt) {
    const rt = chRuntime;
    if (!rt || !rt.player || rt.player.hp <= 0) return;
    if (WG.Engine.isHitPaused()) return;

    rt.elapsed += dt;

    // Player movement + auto-attack + pickups
    const inp = WG.Input.poll();
    WG.HuntPlayer.move(dt, inp.x, inp.y);
    if (WG.Input.consumeSkill()) WG.HuntPlayer.trySkill();
    WG.HuntPlayer.tick(dt);

    // Hill hold-time accumulation
    const p  = rt.player;
    const cx = rt.mapW * 0.5, cy = rt.mapH * 0.5;
    const ddx = p.x - cx, ddy = p.y - cy;
    rt.onHill = (ddx*ddx + ddy*ddy) <= TUNABLES.HILL_RADIUS * TUNABLES.HILL_RADIUS;
    if (rt.onHill) rt.holdTime = Math.min(rt.holdTime + dt, TUNABLES.MATCH_DURATION);

    // Ghost spawner
    _tickGhosts(rt, dt);

    // Enemy AI ticks
    for (const c of rt.creatures) WG.HuntEnemies.tickOne(c, dt, rt);

    // Projectile lifecycle
    _tickProjectiles(rt, dt);

    // Reap dead creatures
    for (let i = rt.creatures.length - 1; i >= 0; i--) {
      if (rt.creatures[i].hp <= 0) { rt.creatures.splice(i, 1); rt.kills++; }
    }

    WG.Render.tickParticles(dt);

    if (rt.elapsed >= TUNABLES.MATCH_DURATION) _endMatch(rt, false);
  }

  // ─── Ghost management ─────────────────────────────────────────────────────
  function _tickGhosts(rt, dt) {
    for (let i = 0; i < TUNABLES.GHOST_COUNT; i++) {
      if (rt.ghostAlive[i]) {
        // Check if still alive in creatures array
        let alive = false;
        for (const c of rt.creatures) {
          if (c._ghostIdx === i && c.hp > 0) { alive = true; break; }
        }
        if (!alive) {
          rt.ghostAlive[i]  = false;
          rt.ghostTimers[i] = TUNABLES.GHOST_RESPAWN;
        }
      } else {
        rt.ghostTimers[i] -= dt;
        if (rt.ghostTimers[i] <= 0) _spawnGhost(rt, i);
      }
    }
  }

  function _spawnGhost(rt, idx) {
    const type = GHOST_TYPES[idx % GHOST_TYPES.length];
    // Spawn from a random arena edge
    const edge = Math.floor(Math.random() * 4);
    let x, y;
    switch (edge) {
      case 0: x = rt.mapW * Math.random(); y = 20; break;
      case 1: x = rt.mapW - 20;            y = rt.mapH * Math.random(); break;
      case 2: x = rt.mapW * Math.random(); y = rt.mapH - 20; break;
      default: x = 20;                     y = rt.mapH * Math.random();
    }
    const e = WG.HuntEnemies.spawn(type, x, y);
    if (!e) return;
    e._ghostIdx  = idx;
    e._ghostName = rt.ghostNames[idx];
    e.hp     = Math.round(e.hp    * TUNABLES.ENEMY_HP_MUL);
    e.maxHp  = e.hp;
    e.damage = Math.round(e.damage * TUNABLES.ENEMY_DMG_MUL);
    e.speed  = e.speed * TUNABLES.ENEMY_SPD_MUL;
    rt.creatures.push(e);
    rt.ghostAlive[idx] = true;
  }

  // ─── Projectile lifecycle (mirrors hunt-tower.js) ─────────────────────────
  function _tickProjectiles(rt, dt) {
    for (let i = rt.projectiles.length - 1; i >= 0; i--) {
      const p = rt.projectiles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.lifetime -= dt;
      if (p.lifetime <= 0) { rt.projectiles.splice(i, 1); continue; }
      let hit = null;
      for (const c of rt.creatures) {
        if (c.hp <= 0) continue;
        const dx = c.x - p.x, dy = c.y - p.y;
        const r  = (c.size / 2) + 6;
        if (dx*dx + dy*dy < r*r) { hit = c; break; }
      }
      if (hit) {
        WG.HuntEnemies.damage(hit, p.damage, p.sourceType ? { type: p.sourceType } : null);
        rt.projectiles.splice(i, 1);
      }
    }
    for (let i = rt.enemyProjectiles.length - 1; i >= 0; i--) {
      const p = rt.enemyProjectiles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.lifetime -= dt;
      if (p.lifetime <= 0) { rt.enemyProjectiles.splice(i, 1); continue; }
      const pl = rt.player;
      const dx = pl.x - p.x, dy = pl.y - p.y;
      if (dx*dx + dy*dy < 14*14) {
        WG.HuntPlayer.takeDamage(p.damage, { type: 'enemy-proj' });
        rt.enemyProjectiles.splice(i, 1);
      }
    }
  }

  // ─── Match end ────────────────────────────────────────────────────────────
  function _endMatch(rt, playerDied) {
    if (chRuntime !== rt) return;
    chRuntime = null;
    const holdTime = Math.round(rt.holdTime * 10) / 10;
    WG.Engine.emit('capture-hill:match-end', { holdTime, playerDied, kills: rt.kills });
    setTimeout(function() {
      if (window.WG.CaptureHillMatch && WG.CaptureHillMatch.onRunComplete) {
        WG.CaptureHillMatch.onRunComplete(holdTime);
      }
    }, 300);
  }

  // ─── init ─────────────────────────────────────────────────────────────────
  function init() {
    WG.Engine.on('player:died', function() {
      if (chRuntime && chRuntime.mode === 'capture_hill') {
        _endMatch(chRuntime, true);
      }
    });
  }

  function getRuntime() { return chRuntime; }

  window.WG.HuntCaptureHill = { init, startCaptureHill, tickMatch, getRuntime, TUNABLES };
})();
