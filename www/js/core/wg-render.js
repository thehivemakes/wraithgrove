// WG.Render — base 2D drawing utilities + particle system
(function(){'use strict';
  const D = () => window.WG.Display;

  const PARTICLE_CAP = 120;
  const particles = [];

  function spawnParticles(opts) {
    const count = opts.count || 1;
    for (let i = 0; i < count; i++) {
      if (particles.length >= PARTICLE_CAP) break;
      const ang = (opts.angle != null) ? opts.angle : Math.random() * Math.PI * 2;
      const sp  = (opts.speed != null) ? opts.speed : 60 + Math.random() * 60;
      particles.push({
        x: opts.x, y: opts.y,
        vx: Math.cos(ang) * sp + (opts.vx||0),
        vy: Math.sin(ang) * sp + (opts.vy||0),
        life: opts.life || 0.6,
        maxLife: opts.life || 0.6,
        color: opts.color || '#e8c878',
        size: opts.size || 2,
        gravity: opts.gravity || 0,
        worldSpace: opts.worldSpace !== false,
      });
    }
  }

  function tickParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function drawParticles(ctx, worldToScreen) {
    for (const p of particles) {
      const a = Math.max(0, Math.min(1, p.life / p.maxLife));
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      let dx = p.x, dy = p.y;
      if (p.worldSpace && worldToScreen) { const s = worldToScreen(p.x, p.y); dx = s.x; dy = s.y; }
      ctx.fillRect(dx - p.size/2, dy - p.size/2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawHpBar(ctx, cx, cy, width, hp, maxHp) {
    const w = width, h = 3;
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(cx - w/2, cy, w, h);
    const frac = Math.max(0, hp / maxHp);
    ctx.fillStyle = frac > 0.5 ? '#88c878' : (frac > 0.25 ? '#d8c060' : '#d04848');
    ctx.fillRect(cx - w/2 + 1, cy + 1, (w - 2) * frac, h - 2);
  }

  function drawFloatText(ctx, text, x, y, color) {
    ctx.fillStyle = color || '#fff';
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(text, x, y);
    ctx.textAlign = 'left';
  }

  function clear(ctx, color) {
    ctx.fillStyle = color || '#0c0a08';
    ctx.fillRect(0, 0, D().width, D().height);
  }

  function init(){ /* nothing */ }
  window.WG.Render = { init, spawnParticles, tickParticles, drawParticles, drawHpBar, drawFloatText, clear };
})();
