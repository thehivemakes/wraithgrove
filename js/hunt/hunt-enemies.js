// WG.HuntEnemies — enemy roster + AI
(function(){'use strict';
  const TYPES = {
    lurker:      { hp:10, speed:35, damage:5,  cooldown:1.0, size:14, color:'#1a0a08', accent:'#a82828', xp:2  },
    walker:      { hp:22, speed:25, damage:9,  cooldown:1.3, size:18, color:'#7a2818', accent:'#3a1408', xp:4  },
    sprite:      { hp:6,  speed:60, damage:3,  cooldown:0.6, size:10, color:'#5a2878', accent:'#2a1438', xp:2  },
    brute_small: { hp:55, speed:18, damage:18, cooldown:2.0, size:24, color:'#9a2018', accent:'#4a1008', xp:8  },
    caller:      { hp:14, speed:22, damage:8,  cooldown:1.6, size:16, color:'#3a2858', accent:'#1a1228', xp:5, ranged:true, projectileSpeed:140, projectileRange:260 },
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
