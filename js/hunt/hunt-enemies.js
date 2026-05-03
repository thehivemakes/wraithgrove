// WG.HuntEnemies — enemy roster + AI
(function(){'use strict';
  // ─────────────────────────────────────────────────────────────────────────────
  // Enemy roster. Tunables here are the single source of truth — render/UI must
  // never hardcode HP/damage/speed/size/xp values. `mode` is consumed by the
  // wave spawner: 'day' / 'night' / 'both'. Absence of `mode` is treated as
  // 'both' for backwards compatibility with the original five types.
  // ─────────────────────────────────────────────────────────────────────────────
  const TYPES = {
    lurker:          { name: 'Lurker',         hp:10, speed:35, damage:5,  cooldown:1.0, size:14, color:'#1a0a08', accent:'#a82828', xp:2,  mode:'both'  },
    walker:          { name: 'Walker',         hp:22, speed:25, damage:9,  cooldown:1.3, size:18, color:'#7a2818', accent:'#3a1408', xp:4,  mode:'both'  },
    sprite:          { name: 'Sprite',         hp:6,  speed:60, damage:3,  cooldown:0.6, size:10, color:'#5a2878', accent:'#2a1438', xp:2,  mode:'both'  },
    brute_small:     { name: 'Brute',          hp:55, speed:18, damage:18, cooldown:2.0, size:24, color:'#9a2018', accent:'#4a1008', xp:8,  mode:'both'  },
    caller:          { name: 'Caller',         hp:14, speed:22, damage:8,  cooldown:1.6, size:16, color:'#3a2858', accent:'#1a1228', xp:5,  mode:'both', ranged:true, projectileSpeed:140, projectileRange:260 },

    // Day-baseline cloaked zombie. Existing `drawZombie` sprite is the canonical
    // form; this is just a tagged id so day stages explicitly mix it in.
    red_zombie:      { name: 'Red Zombie',     hp:22, speed:65, damage:6,  cooldown:1.3, size:18, color:'#a82820', accent:'#ffe0b0', xp:3,  mode:'both', ai:'walker' },

    // Night-mode folk-horror. matches screenshot_4 pumpkin-head creature register.
    pumpkin_lantern: { name: 'Pumpkin Lantern',hp:32, speed:70, damage:8,  cooldown:1.2, size:18, color:'#e07820', accent:'#ffc848', xp:4,  mode:'night', ai:'walker' },

    // Hopping Chinese vampire. Conical hat + paper amulet. AI is plain walker for
    // now; actual hop AI is V2 (would need a vertical bob + interval-step).
    jiangshi:        { name: 'Jiangshi',       hp:50, speed:85, damage:12, cooldown:1.4, size:20, color:'#3a2018', accent:'#f8e8c8', xp:7,  mode:'night', ai:'walker' },

    // Armored samurai grunt — both modes (boss-tier henchman across day/night).
    samurai_grunt:   { name: 'Samurai Grunt',  hp:70, speed:80, damage:15, cooldown:1.5, size:22, color:'#a82828', accent:'#ffc850', xp:10, mode:'both', ai:'walker' },
    // W-Banshee-Enemy — Architect 2026-05-02: large Night-only rare frenzied scare.
    // SPEC §0 register. AI 'banshee_charge': erratic sin-wave pursuit + chargeDuration
    // sec of locked-on charge every shriekCooldown sec. `rare` flag → wave-spawner
    // 5% pre-roll, max 1 alive. W-Polish-Gaps-1-5 (A): chargeDuration / chargeSpeedMul
    // / shriek* fields promoted from inline magic numbers for designer-tunability.
    banshee: {
      name: 'Banshee',
      hp: 220, speed: 130, damage: 22, cooldown: 1.0, size: 36,
      color: '#e8e0f0', accent: '#a060ff', xp: 30,
      mode: 'night', ai: 'banshee_charge', rare: true,
      shriekCooldown: 4.0,
      chargeDuration: 0.8,         // seconds of locked-on charge after shriek
      chargeSpeedMul: 1.8,         // forward-speed multiplier during charge
      shriekParticleCount: 16,     // pickupFragment burst count per shriek
      shriekTrauma: 0.3,           // camera-shake trauma added on shriek
      shriekFlashAlpha: 0.3,       // screen-flash alpha (#a060ff)
      shriekFlashDurationMs: 200,  // screen-flash duration ms
      shriekLateralMult: 0.4,      // sin-wave perpendicular factor (idle pursuit)
    },

    // W-Spawn-Tuning — Architect 2026-05-02: 2 new types to thicken the mix.
    // Wraith Stalker: fast Night ghost wisp, light HP, tight hitbox. Drives
    // dodge-priority panic at scale. Sprite drawn in hunt-render `drawWraithFast`.
    wraith_fast:     { name: 'Wraith Stalker', hp:18, speed:140,damage:7,  cooldown:1.1, size:14, color:'#404858', accent:'#a8c0e8', xp:4,  mode:'night', ai:'walker' },
    // Skull Imp: small skeletal swarmer. `swarmSize:4` is read by hunt-waves
    // spawnOne — when this type is picked, four spawn in a 30-unit jittered
    // cluster (POLISH MANDATE: feel like a CHARGE, not overlapping pile).
    skull_swarmer:   { name: 'Skull Imp',      hp:9,  speed:95, damage:3,  cooldown:0.8, size:12, color:'#e8e0d0', accent:'#3a2010', xp:2,  mode:'both',  ai:'walker', swarmSize:4 },
  };

  let nextId = 1;
  // List lives in WG.Hunt.runtime.creatures (managed by hunt-stage runtime)

  function spawn(type, x, y) {
    const t = TYPES[type];
    if (!t) return null;
    return {
      id: nextId++,
      type,
      x, y,
      vx: 0, vy: 0,
      hp: t.hp, maxHp: t.hp,
      damage: t.damage,
      speed: t.speed,
      size: t.size,
      attackTimer: 0,
      attackCooldown: t.cooldown,
      retargetTimer: 0,
      target: null,
      facing: 'S',
      _typeData: t,
      _projTimer: 0,
    };
  }

  function distSq(a, b) { const dx=a.x-b.x, dy=a.y-b.y; return dx*dx+dy*dy; }

  function pickTarget(c, runtime) {
    // For now: always target player (Wood Siege observation: enemies converge on player primarily)
    return runtime.player;
  }

  function tickOne(c, dt, runtime) {
    if (c.hp <= 0) return;
    c.retargetTimer -= dt;
    if (c.retargetTimer <= 0 || !c.target) {
      c.target = pickTarget(c, runtime);
      c.retargetTimer = 0.5;
    }
    if (!c.target) return;

    // W-Turret-And-Campfire-Combat: melee enemies that come within hit range of
    // a built turret attack the turret instead of continuing toward the player.
    // Ranged enemies ignore turrets — they keep firing at the player from range.
    // Range is enemy-half-size + TURRET_HIT_RANGE so big enemies engage from a
    // sensible distance instead of overlapping the wagon sprite.
    if (!c._typeData.ranged && window.WG.HuntTurret && WG.HuntTurret.nearestTurretInRange) {
      const TURRET_HIT_RANGE = WG.HuntTurret.TUNABLES.TURRET_HIT_RANGE;
      const turret = WG.HuntTurret.nearestTurretInRange(c.x, c.y, TURRET_HIT_RANGE + c.size/2, runtime);
      if (turret) {
        const tdx = turret.x - c.x, tdy = turret.y - c.y;
        if (Math.abs(tdx) > Math.abs(tdy)) c.facing = tdx > 0 ? 'E' : 'W';
        else                                c.facing = tdy > 0 ? 'S' : 'N';
        c.attackTimer -= dt;
        if (c.attackTimer <= 0) {
          WG.HuntTurret.damageTurret(turret, c.damage);
          WG.Engine.emit('enemy:hit', { creature: c, target: 'turret' });
          c.attackTimer = c.attackCooldown;
        }
        return;  // skip player-pursuit this tick
      }
    }

    const dx = c.target.x - c.x, dy = c.target.y - c.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const contactDist = c.size/2 + (c.target.size||10)/2;

    if (Math.abs(dx) > Math.abs(dy)) c.facing = dx>0?'E':'W';
    else                              c.facing = dy>0?'S':'N';

    if (c._typeData.ranged) {
      // Stop and shoot if in projectile range; otherwise close to range
      if (dist < c._typeData.projectileRange && dist > c.size + 30) {
        c._projTimer -= dt;
        if (c._projTimer <= 0) {
          fireProjectile(c, runtime);
          c._projTimer = c._typeData.cooldown;
        }
      } else if (dist > c.size + 30) {
        c.x += (dx/dist) * c.speed * dt;
        c.y += (dy/dist) * c.speed * dt;
      }
    } else if (c._typeData.ai === 'banshee_charge') {
      // Frenzied AI — erratic sin-wave lateral motion + periodic shriek-charge.
      // All tunables read from catalog (W-Polish-Gaps-1-5 §A — no magic numbers).
      const td = c._typeData;
      c._shriekTimer = (c._shriekTimer == null) ? td.shriekCooldown : c._shriekTimer - dt;
      const charging = c._chargeTimer > 0;
      if (c._shriekTimer <= 0 && !charging) {
        c._chargeTimer = td.chargeDuration;
        c._shriekTimer = td.shriekCooldown;
        // W-Polish-Gaps-1-5 §C — burst + flash moved to a hunt-fx.js listener
        // for symmetry with repair:complete. Trauma stays inline (kept tightly
        // coupled to the AI tick that owns the shriek's timing).
        WG.Engine.emit('enemy:shriek', { creature: c });
        if (window.WG.HuntRender && WG.HuntRender.addTrauma) WG.HuntRender.addTrauma(td.shriekTrauma);
      }
      if (c._chargeTimer > 0) {
        c._chargeTimer -= dt;
        // Hard charge — straight at player, chargeSpeedMul × speed
        c.x += (dx/dist) * c.speed * td.chargeSpeedMul * dt;
        c.y += (dy/dist) * c.speed * td.chargeSpeedMul * dt;
      } else {
        // Erratic — sin-wave lateral perpendicular to forward direction
        const lateralA = Math.sin(performance.now() / 280 + c.x * 0.01);
        const px = -dy/dist, py = dx/dist; // perpendicular unit
        c.x += (dx/dist) * c.speed * dt + px * lateralA * c.speed * td.shriekLateralMult * dt;
        c.y += (dy/dist) * c.speed * dt + py * lateralA * c.speed * td.shriekLateralMult * dt;
      }
      if (dist <= contactDist) {
        c.attackTimer -= dt;
        if (c.attackTimer <= 0) {
          if (c.target === runtime.player) WG.HuntPlayer.takeDamage(c.damage, { type:'banshee', id:c.id });
          WG.Engine.emit('enemy:hit', { creature: c });
          c.attackTimer = c.attackCooldown;
        }
      }
    } else {
      if (dist > contactDist) {
        c.x += (dx/dist) * c.speed * dt;
        c.y += (dy/dist) * c.speed * dt;
      } else {
        c.attackTimer -= dt;
        if (c.attackTimer <= 0) {
          if (c.target === runtime.player) WG.HuntPlayer.takeDamage(c.damage, { type:'creature', id:c.id });
          WG.Engine.emit('enemy:hit', { creature: c });
          c.attackTimer = c.attackCooldown;
        }
      }
    }
  }

  function fireProjectile(c, runtime) {
    const t = c.target;
    if (!t) return;
    const dx = t.x - c.x, dy = t.y - c.y;
    const d = Math.sqrt(dx*dx+dy*dy) || 1;
    runtime.enemyProjectiles.push({
      x: c.x, y: c.y,
      vx: (dx/d) * c._typeData.projectileSpeed,
      vy: (dy/d) * c._typeData.projectileSpeed,
      damage: c.damage,
      lifetime: 1.5,
      ownerId: c.id,
    });
    WG.Engine.emit('enemy:fire', { creature: c });
  }

  function damage(c, amount, source) {
    if (!c || c.hp <= 0) return false;
    c.hp -= amount;
    WG.Engine.emit('enemy:damaged', { creature: c, amount, source });
    if (c.hp <= 0) {
      WG.Engine.emit('enemy:killed', { creature: c, source, xp: c._typeData.xp });
      return true;
    }
    return false;
  }

  function init() {}
  window.WG.HuntEnemies = { init, TYPES, spawn, tickOne, damage };
})();
