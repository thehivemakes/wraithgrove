// WG.HuntTurret — Built-turret combat behavior + Campfire HP regen.
//
// SPEC §0 — Turret: auto-shoots nearest enemy in TURRET_RANGE, deals damage,
// has HP, can be destroyed; Campfire: HP regen for player when inside radius
// (torch relight in Night Mode is handled by hunt-player tickTorch).
//
// All tunables are NAMED constants at the top — Architect tunes these for
// difficulty + monetization (per SPEC §0 difficulty mandate). No hardcoded
// numbers in render/UI/orchestrator code (per build-v2/CLAUDE.md).
//
// This file ships across two concerns:
//   A — auto-fire / projectile / smooth aim / muzzle flash / projectile trail
//   B — turret HP + enemy-attacks-turret + destruction + campfire regen + viz
(function(){'use strict';

  // ── Tunables ──────────────────────────────────────────────────────────────
  const TURRET_FIRE_RATE        = 1.4;     // seconds between shots
  const TURRET_RANGE            = 200;     // world units — target acquisition radius
  const TURRET_DAMAGE           = 12;      // damage per projectile
  const TURRET_PROJ_SPEED       = 360;     // world units / sec
  const TURRET_PROJ_LIFE        = 1.4;     // seconds (range/speed ≈ 0.55s; margin)
  const TURRET_AIM_LERP         = 0.18;    // 0..1 smoothing per tick toward desired angle
  const TURRET_AIM_FIRE_THRESH  = 0.35;    // radians — only fire when aim within this of target
  const TURRET_BARREL_LEN       = 14;      // world units — muzzle offset along aim direction
  const TURRET_PROJ_COLOR       = '#ffe48a';

  const TURRET_MAX_HP           = 80;
  const TURRET_HIT_RANGE        = 14;      // enemy attacks turret if within this distance

  const CAMPFIRE_REGEN_RADIUS   = 60;
  const CAMPFIRE_REGEN_RATE     = 4;       // hp / sec while inside
  const CAMPFIRE_SPARKLE_PERIOD = 0.16;    // seconds between sparkle emissions

  // ── Helpers ──────────────────────────────────────────────────────────────
  function _props(runtime) {
    if (!window.WG.HuntRender || !WG.HuntRender.getStageProps || !runtime.stage) return null;
    return WG.HuntRender.getStageProps(runtime.stage);
  }

  // Shortest-path angle lerp — handles the -PI/+PI wraparound so a turret tracking
  // an enemy that crosses behind it doesn't spin the long way around.
  function lerpAngle(a, b, t) {
    let d = b - a;
    while (d > Math.PI)  d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  }

  function _ensureFields(t) {
    if (typeof t.aimAngle    !== 'number') t.aimAngle    = -Math.PI / 2;  // default: aim up
    if (typeof t.fireTimer   !== 'number') t.fireTimer   = TURRET_FIRE_RATE * (0.5 + Math.random() * 0.5);
    if (typeof t.hp          !== 'number') t.hp          = TURRET_MAX_HP;
    if (typeof t.maxHp       !== 'number') t.maxHp       = TURRET_MAX_HP;
    if (typeof t._hpDisplayed!== 'number') t._hpDisplayed= t.hp;
  }

  // After destruction the construction slot can be rebuilt. When the build
  // flow flips built back to true, restore HP fields fresh.
  function _resetOnRebuild(t) {
    if (t.built && (t.hp == null || t.hp <= 0)) {
      t.hp = TURRET_MAX_HP;
      t.maxHp = TURRET_MAX_HP;
      t._hpDisplayed = TURRET_MAX_HP;
      t.fireTimer = TURRET_FIRE_RATE * 0.5;
      t.aimAngle = -Math.PI / 2;
    }
  }

  function pickTarget(turret, runtime) {
    const r2 = TURRET_RANGE * TURRET_RANGE;
    let best = null, bestD = r2;
    for (const c of runtime.creatures) {
      if (c.hp <= 0) continue;
      const dx = c.x - turret.x, dy = c.y - turret.y;
      const d = dx*dx + dy*dy;
      if (d < bestD) { best = c; bestD = d; }
    }
    if (runtime.boss && runtime.boss.hp > 0) {
      const dx = runtime.boss.x - turret.x, dy = runtime.boss.y - turret.y;
      const d = dx*dx + dy*dy;
      if (d < bestD) { best = runtime.boss; bestD = d; }
    }
    return best;
  }

  function fire(turret, target, runtime) {
    const dx = target.x - turret.x, dy = target.y - turret.y;
    const d = Math.sqrt(dx*dx + dy*dy) || 1;
    // Spawn from muzzle tip — TURRET_BARREL_LEN units in aim direction (matches
    // drawBuiltStructures barrel length so the visual reads truthfully).
    const muzzleX = turret.x + Math.cos(turret.aimAngle) * TURRET_BARREL_LEN;
    const muzzleY = turret.y + Math.sin(turret.aimAngle) * TURRET_BARREL_LEN;
    runtime.projectiles.push({
      x: muzzleX, y: muzzleY,
      vx: (dx/d) * TURRET_PROJ_SPEED,
      vy: (dy/d) * TURRET_PROJ_SPEED,
      damage: TURRET_DAMAGE,
      lifetime: TURRET_PROJ_LIFE,
      areaR: 0,
      sourceType: 'turret',
      color: TURRET_PROJ_COLOR,
      // Trail array — hunt-render.drawProjectiles populates + renders this if present.
      // 8-sample fading streak so projectile reads as "moving fast" not "drifting dot".
      _trail: [],
    });
    WG.Engine.emit('turret:fire', {
      turret, x: muzzleX, y: muzzleY, angle: turret.aimAngle,
    });
  }

  function tickOne(t, dt, runtime) {
    _ensureFields(t);
    _resetOnRebuild(t);

    // Animate HP bar — eased lerp from displayed → actual so damage reads as
    // a smooth sweep, not a stair-step. (Concern B uses _hpDisplayed in render.)
    if (t._hpDisplayed !== t.hp) {
      const k = Math.min(1, dt * 8);
      t._hpDisplayed += (t.hp - t._hpDisplayed) * k;
      if (Math.abs(t._hpDisplayed - t.hp) < 0.05) t._hpDisplayed = t.hp;
    }

    // Aim — smooth lerp toward target's angle. When no target, drift gently
    // back toward up so the cannon doesn't freeze pointing wherever the last
    // enemy died.
    const target = pickTarget(t, runtime);
    if (target) {
      const desiredAngle = Math.atan2(target.y - t.y, target.x - t.x);
      t.aimAngle = lerpAngle(t.aimAngle, desiredAngle, TURRET_AIM_LERP);
    } else {
      t.aimAngle = lerpAngle(t.aimAngle, -Math.PI / 2, TURRET_AIM_LERP * 0.25);
    }

    // Fire timer + aim-tolerance gate (don't fire 90° off the target).
    t.fireTimer -= dt;
    if (t.fireTimer <= 0 && target) {
      const desiredAngle = Math.atan2(target.y - t.y, target.x - t.x);
      let diff = desiredAngle - t.aimAngle;
      while (diff > Math.PI)  diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) < TURRET_AIM_FIRE_THRESH) {
        fire(t, target, runtime);
        t.fireTimer = TURRET_FIRE_RATE;
      } else {
        // Aim not ready — keep timer at 0 so we re-check next tick (responsive
        // first shot once aim catches up to a fast-moving target).
        t.fireTimer = 0;
      }
    }
  }

  // Public: enemy-vs-turret damage application. Called from hunt-enemies when
  // an enemy is within TURRET_HIT_RANGE of a built turret. Returns true on kill.
  function damageTurret(t, amount) {
    _ensureFields(t);
    if (t.hp <= 0 || !t.built) return false;
    t.hp -= amount;
    WG.Engine.emit('turret:damaged', { turret: t, amount });
    if (t.hp <= 0) {
      t.hp = 0;
      t.built = false;
      t.have = 0;        // dashed-circle slot reappears, can be rebuilt
      WG.Engine.emit('turret:destroyed', { turret: t });
      // W-FX-Polish-Pass — gap 5: turret destruction was soft. Add screen kick.
      if (window.WG.HuntRender && WG.HuntRender.addTrauma) WG.HuntRender.addTrauma(0.4);
      return true;
    }
    return false;
  }

  // Public: nearest built turret within range of (x,y). Used by enemy AI to
  // decide whether to attack a turret instead of advancing on the player.
  function nearestTurretInRange(x, y, range, runtime) {
    const props = _props(runtime);
    if (!props || !props.constructions) return null;
    const r2 = range * range;
    let best = null, bestD = r2;
    for (const c of props.constructions) {
      if (!c.built || c.type !== 'turret') continue;
      const dx = c.x - x, dy = c.y - y;
      const d = dx*dx + dy*dy;
      if (d < bestD) { best = c; bestD = d; }
    }
    return best;
  }

  // ── Campfire regen ────────────────────────────────────────────────────────
  // Tracks total elapsed for sparkle pacing across calls (one player → one accumulator).
  let _sparkleAccum = 0;
  function campfireRegenTick(dt, runtime) {
    const props = _props(runtime);
    if (!props || !props.constructions) { _sparkleAccum = 0; return; }
    const p = runtime.player;
    if (!p) { _sparkleAccum = 0; return; }
    let inside = false;
    for (const c of props.constructions) {
      if (!c.built || c.type !== 'campfire') continue;
      const dx = p.x - c.x, dy = p.y - c.y;
      if (dx*dx + dy*dy <= CAMPFIRE_REGEN_RADIUS * CAMPFIRE_REGEN_RADIUS) {
        inside = true;
        break;
      }
    }
    if (!inside) { _sparkleAccum = 0; return; }
    if (p.hp < p.maxHp) {
      p.hp = Math.min(p.maxHp, p.hp + CAMPFIRE_REGEN_RATE * dt);
    }
    // Drift small green sparkles up from the player while regenerating — visual
    // confirmation that the regen is active. Rate-limited so a 60fps tick
    // doesn't overflow the 200-particle pool.
    _sparkleAccum += dt;
    while (_sparkleAccum >= CAMPFIRE_SPARKLE_PERIOD) {
      _sparkleAccum -= CAMPFIRE_SPARKLE_PERIOD;
      if (window.WG.HuntFX && WG.HuntFX.burst) {
        WG.HuntFX.burst(
          p.x + (Math.random() - 0.5) * 16,
          p.y + 6 + (Math.random() - 0.5) * 6,
          'campfireSparkle'
        );
      }
    }
  }

  function tick(dt) {
    const rt = (window.WG.Game && WG.Game.getHuntRuntime) ? WG.Game.getHuntRuntime() : null;
    if (!rt || !rt.player || rt.player.hp <= 0) return;
    const props = _props(rt);
    if (!props || !props.constructions) return;
    for (const c of props.constructions) {
      if (!c.built || c.type !== 'turret') continue;
      tickOne(c, dt, rt);
    }
    campfireRegenTick(dt, rt);
  }

  // Public: tunables — for HUD/debug and for the done-marker doc.
  const TUNABLES = Object.freeze({
    TURRET_FIRE_RATE, TURRET_RANGE, TURRET_DAMAGE,
    TURRET_PROJ_SPEED, TURRET_PROJ_LIFE, TURRET_AIM_LERP, TURRET_AIM_FIRE_THRESH,
    TURRET_BARREL_LEN, TURRET_MAX_HP, TURRET_HIT_RANGE,
    CAMPFIRE_REGEN_RADIUS, CAMPFIRE_REGEN_RATE, CAMPFIRE_SPARKLE_PERIOD,
  });

  function init() {}
  window.WG.HuntTurret = {
    init, tick, damageTurret, nearestTurretInRange, TUNABLES,
  };
})();
