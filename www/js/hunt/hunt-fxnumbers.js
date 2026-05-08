// WG.HuntFXNumbers — floating numerical feedback layer.
// DOPAMINE_DESIGN.md §1 (per-second feedback density: every input must trigger
// ≥3 channels — visual+audio+numeric). This module covers the numeric channel.
// World-anchored spawn; screen-space drift+fade.
(function(){'use strict';

  // Tunables — DOPAMINE_DESIGN.md §1 acceptance test (chop = +1 wood + +2 coin etc.)
  const DEFAULT_DURATION_MS = 700;       // §1 floating-number table: 600ms travel + 200ms fade ≈ 700ms total
  const DEFAULT_VELOCITY    = -32;       // px/s — drift up; §1 "floats up"
  const DEFAULT_COLOR       = '#fff8d8'; // pale-cream baseline
  const SCALE_PEAK_AT_MS    = 80;        // 1 → 1.15 in first 80ms (pop), then 1.15 → 0.95 over remainder
  const SCALE_PEAK          = 1.15;
  const SCALE_END           = 0.95;
  const FONT_FAMILY         = 'system-ui';

  // Event-driven defaults — colors and sizes per W-FX-Numbers-And-Pulse spec
  const COLOR_WOOD       = '#c89058'; // §1 floating-number table — wood-tint
  const COLOR_COIN       = '#ffd870'; // §1 — coin-tint
  const COLOR_DAMAGE     = '#ffe888'; // §1 — damage white-yellow
  const COLOR_BOSS_DMG   = '#ffaa44'; // §1 — boss damage warmer
  const COLOR_LEVEL      = '#80f0ff'; // §1 — cyan/level-up
  const COLOR_FRAGMENT   = '#c890ff'; // rare — purple per relic-tier register
  const SIZE_BASE        = 14;        // §1 "12–18px font"
  const SIZE_BOSS_MUL    = 1.4;       // boss damage 1.4× base
  const SIZE_LEVEL_MUL   = 1.5;
  const DUR_LEVEL_MS     = 1500;
  const DEFAULT_FALLBACK_DAMAGE = 10; // spec: creature.lastDamage if present, else +10

  const particles = [];

  function spawn(worldX, worldY, text, opts) {
    opts = opts || {};
    particles.push({
      wx: worldX,
      wy: worldY,
      text: String(text),
      color: opts.color || DEFAULT_COLOR,
      size: opts.size != null ? opts.size : SIZE_BASE,
      duration: opts.duration != null ? opts.duration : DEFAULT_DURATION_MS,
      velocity: opts.velocity != null ? opts.velocity : DEFAULT_VELOCITY,
      age: 0,
    });
  }

  function tick(dt) {
    const dtMs = dt * 1000;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dtMs;
      p.wy += p.velocity * dt;
      if (p.age >= p.duration) particles.splice(i, 1);
    }
  }

  function draw(ctx, w2s) {
    if (!particles.length) return;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const t = p.age / p.duration;                 // 0..1
      const oneMinus = 1 - t;
      const alpha = oneMinus * oneMinus;            // easeOutQuad on opacity
      let scale;
      if (p.age < SCALE_PEAK_AT_MS) {
        scale = 1 + (SCALE_PEAK - 1) * (p.age / SCALE_PEAK_AT_MS);
      } else {
        const k = (p.age - SCALE_PEAK_AT_MS) / Math.max(1, p.duration - SCALE_PEAK_AT_MS);
        scale = SCALE_PEAK + (SCALE_END - SCALE_PEAK) * k;
      }
      const s = w2s(p.wx, p.wy);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.font = 'bold ' + Math.round(p.size * scale) + 'px ' + FONT_FAMILY;
      // Outline for legibility against bright tile noise
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.strokeText(p.text, s.x, s.y);
      ctx.fillText(p.text, s.x, s.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function init() {
    // Subscriptions per W-FX-Numbers-And-Pulse spec
    WG.Engine.on('stump:hit', ({ stump }) => {
      if (!stump) return;
      spawn(stump.x, stump.y - 8, '+1', { color: COLOR_WOOD });
    });
    WG.Engine.on('stump:chopped', ({ stump }) => {
      if (!stump) return;
      spawn(stump.x, stump.y - 8, '+2', { color: COLOR_COIN });
    });
    // Cache last damage on creature so enemy:killed can read it (no edit to hunt-enemies.js).
    WG.Engine.on('enemy:damaged', ({ creature, amount }) => {
      if (creature) creature.lastDamage = amount;
    });
    WG.Engine.on('enemy:killed', ({ creature }) => {
      if (!creature) return;
      const dmg = (creature.lastDamage != null) ? creature.lastDamage : DEFAULT_FALLBACK_DAMAGE;
      spawn(creature.x, creature.y - 6, '+' + Math.round(dmg), { color: COLOR_DAMAGE });
    });
    WG.Engine.on('boss:damaged', ({ boss, amount }) => {
      if (!boss) return;
      const dmg = (amount != null) ? amount : DEFAULT_FALLBACK_DAMAGE;
      spawn(boss.x, boss.y - 14, '+' + Math.round(dmg), {
        color: COLOR_BOSS_DMG,
        size: SIZE_BASE * SIZE_BOSS_MUL,
      });
    });
    WG.Engine.on('player:level', () => {
      const rt = (WG.Game && WG.Game.getHuntRuntime) ? WG.Game.getHuntRuntime() : null;
      const player = rt && rt.player;
      if (!player) return;
      spawn(player.x, player.y - 22, 'LEVEL UP!', {
        color: COLOR_LEVEL,
        size: SIZE_BASE * SIZE_LEVEL_MUL,
        duration: DUR_LEVEL_MS,
      });
    });
    WG.Engine.on('pickup:coin', ({ x, y, amount }) => {
      const wx = (x != null) ? x : 0, wy = (y != null) ? y : 0;
      spawn(wx, wy - 4, '+' + (amount || 1), { color: COLOR_COIN, size: SIZE_BASE * 0.85 });
    });
    // W-Dopamine-P1 §B — crit: 50% larger number, bright gold
    WG.Engine.on('enemy:crit', ({ x, y, amount }) => {
      if (x == null || y == null) return;
      spawn(x, y - 10, '+' + Math.round(amount || 0), {
        color: '#ffe060',
        size: SIZE_BASE * 1.5,
        duration: DEFAULT_DURATION_MS + 200,
        velocity: DEFAULT_VELOCITY * 1.3,
      });
    });
    WG.Engine.on('relic:fragment-pickup', ({ x, y, amount }) => {
      const rt = (WG.Game && WG.Game.getHuntRuntime) ? WG.Game.getHuntRuntime() : null;
      const player = rt && rt.player;
      const wx = (x != null) ? x : (player ? player.x : 0);
      const wy = (y != null) ? y : (player ? player.y - 10 : 0);
      spawn(wx, wy, '+' + (amount || 1) + ' frag', { color: COLOR_FRAGMENT, size: SIZE_BASE * 0.85 });
    });
  }

  window.WG = window.WG || {};
  window.WG.HuntFXNumbers = { init, spawn, tick, draw };
})();
