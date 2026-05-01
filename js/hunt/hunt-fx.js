// WG.HuntFX — pooled particle bursts on key events.
// DOPAMINE_DESIGN.md §1 (per-second feedback density: visual channel) and §9
// (visual juice catalog: particle bursts). Pool-cap 200 to avoid GC stutter
// (§9 explicit). Layered on top of legacy WG.Render.spawnParticles — additive,
// not a replacement. World-space spawn; world→screen at draw time.
(function(){'use strict';

  const POOL_CAP = 200;
  const pool = new Array(POOL_CAP);
  for (let i = 0; i < POOL_CAP; i++) {
    pool[i] = { active: false, x: 0, y: 0, vx: 0, vy: 0,
                life: 0, maxLife: 0, color: '#fff', size: 2,
                gravity: 0, shape: 'square' };
  }

  // Per-type burst signatures — DOPAMINE_DESIGN.md §1 floating-number table
  // and §9 particle bursts catalog. Counts/lives/speeds match worker brief.
  const TYPES = {
    chopChip:       { count: 5,  life: 0.45, sMin:  80, sMax: 140, gravity: 220, size: 2,
                      colors: ['#c89058', '#a06028', '#5a3010'], shape: 'square' },
    enemyHit:       { count: 3,  life: 0.30, sMin:  50, sMax:  80, gravity:  40, size: 2,
                      colors: ['#ff4040'], shape: 'square' },
    enemyKill:      { count: 12, life: 0.70, sMin: 100, sMax: 200, gravity:  90, size: 2,
                      colors: ['#ff4040', '#ffcc40'], shape: 'square' },
    pickupCoin:     { count: 4,  life: 0.40, sMin:  60, sMax: 100, gravity:   0, size: 2,
                      colors: ['#ffe888'], shape: 'sparkle' },
    pickupOrb:      { count: 6,  life: 0.50, sMin:  60, sMax: 110, gravity:   0, size: 2,
                      colors: ['#80d0ff'], shape: 'sparkle' },
    pickupFragment: { count: 8,  life: 0.60, sMin:  70, sMax: 130, gravity:   0, size: 2,
                      colors: ['#e0a8ff'], shape: 'sparkle' },
    levelUp:        { count: 24, life: 0.80, sMin:  80, sMax:  80, gravity:   0, size: 3,
                      colors: ['#fff0c0'], shape: 'square', ring: true },
    bossKill:       { count: 30, life: 1.20, sMin: 200, sMax: 200, gravity:  60, size: 3,
                      colors: ['#ffd870', '#ff8040', '#ffffff'], shape: 'square', ring: true },
  };

  function _alloc() {
    for (let i = 0; i < POOL_CAP; i++) {
      if (!pool[i].active) return pool[i];
    }
    return null; // pool exhausted — silently drop (DOPAMINE_DESIGN §9 cap)
  }

  function burst(worldX, worldY, type, opts) {
    const def = TYPES[type];
    if (!def) return;
    opts = opts || {};
    const count = (opts.count != null) ? opts.count : def.count;
    const life  = (opts.life  != null) ? opts.life  : def.life;
    const sMin  = (opts.sMin  != null) ? opts.sMin  : def.sMin;
    const sMax  = (opts.sMax  != null) ? opts.sMax  : def.sMax;
    const grav  = (opts.gravity != null) ? opts.gravity : def.gravity;
    const size  = (opts.size  != null) ? opts.size  : def.size;
    const colors = def.colors;

    for (let i = 0; i < count; i++) {
      const p = _alloc();
      if (!p) return;
      const ang = def.ring ? (Math.PI * 2 * i / count)
                           : (Math.random() * Math.PI * 2);
      const sp  = sMin + Math.random() * Math.max(0, sMax - sMin);
      p.active  = true;
      p.x       = worldX;
      p.y       = worldY;
      p.vx      = Math.cos(ang) * sp;
      p.vy      = Math.sin(ang) * sp;
      p.life    = life;
      p.maxLife = life;
      p.gravity = grav;
      p.size    = size;
      p.shape   = def.shape;
      p.color   = colors[(Math.random() * colors.length) | 0];
    }
  }

  function tick(dt) {
    for (let i = 0; i < POOL_CAP; i++) {
      const p = pool[i];
      if (!p.active) continue;
      p.x  += p.vx * dt;
      p.y  += p.vy * dt;
      p.vy += p.gravity * dt;
      p.life -= dt;
      if (p.life <= 0) p.active = false;
    }
  }

  function draw(ctx, w2s) {
    for (let i = 0; i < POOL_CAP; i++) {
      const p = pool[i];
      if (!p.active) continue;
      const a = Math.max(0, Math.min(1, p.life / p.maxLife));
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      const s = w2s ? w2s(p.x, p.y) : { x: p.x, y: p.y };
      if (p.shape === 'sparkle') {
        const sz = p.size + 1;
        ctx.fillRect(s.x - sz / 2, s.y - 0.5, sz, 1);
        ctx.fillRect(s.x - 0.5, s.y - sz / 2, 1, sz);
      } else {
        ctx.fillRect(s.x - p.size / 2, s.y - p.size / 2, p.size, p.size);
      }
    }
    ctx.globalAlpha = 1;
  }

  function _runtimePlayer() {
    const rt = (window.WG.Game && WG.Game.getHuntRuntime) ? WG.Game.getHuntRuntime() : null;
    return rt && rt.player;
  }

  function init() {
    WG.Engine.on('stump:hit', ({ stump }) => {
      if (stump) burst(stump.x, stump.y, 'chopChip');
    });
    WG.Engine.on('stump:chopped', ({ stump }) => {
      if (stump) burst(stump.x, stump.y, 'chopChip', { count: 14, life: 0.7, sMin: 100, sMax: 180 });
    });
    WG.Engine.on('enemy:killed', ({ creature }) => {
      if (creature) burst(creature.x, creature.y, 'enemyKill');
    });
    WG.Engine.on('enemy:damaged', ({ creature }) => {
      if (creature) burst(creature.x, creature.y, 'enemyHit');
    });
    WG.Engine.on('boss:defeated', ({ boss }) => {
      if (boss) burst(boss.x, boss.y, 'bossKill');
    });
    WG.Engine.on('pickup:coin', ({ x, y }) => {
      if (x != null && y != null) burst(x, y, 'pickupCoin');
    });
    WG.Engine.on('pickup:orb', ({ x, y }) => {
      if (x != null && y != null) burst(x, y, 'pickupOrb');
    });
    WG.Engine.on('pickup:fragment', ({ x, y }) => {
      const player = _runtimePlayer();
      const wx = (x != null) ? x : (player ? player.x : 0);
      const wy = (y != null) ? y : (player ? player.y : 0);
      burst(wx, wy, 'pickupFragment');
    });
    WG.Engine.on('player:level', () => {
      const player = _runtimePlayer();
      if (player) burst(player.x, player.y, 'levelUp');
    });
  }

  window.WG = window.WG || {};
  window.WG.HuntFX = { init, burst, tick, draw };
})();
