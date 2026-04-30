// WG.HuntPlayer — player character in-stage with auto-attack on cooldown
(function(){'use strict';
  // Movement: speed scales with level slightly
  function baseSpeed() { return 95 + WG.State.get().player.level * 1.2; }
  // Skill cooldown
  const SKILL_BASE_CD = 22;

  let runtime = null;

  function place(x, y, rt) {
    runtime = rt;
    const ps = WG.State.get().player;
    ps.stats.hp = ps.stats.hpMax;
    runtime.player = {
      x, y, vx:0, vy:0,
      hp: ps.stats.hpMax, maxHp: ps.stats.hpMax,
      facing:'S',
      size: 16,
      attackTimer: 0,
      attackCooldown: meleeWeapon().cooldown,
      cooldownMul: 1,
      level: 1,                  // in-stage level (Vampire Survivors style)
      xp: 0,
      xpToNext: 5,
      pickupRadius: 28,
      // active skill
      skillCd: 0,
      skillReady: true,
      // weapons currently held in-stage
      heldPickupId: null,        // id of in-stage temp weapon (overrides melee)
      // pet companion
      petCooldown: 0,
    };
  }

  function meleeWeapon() {
    const id = WG.State.get().player.slots.melee || 'branch_stick';
    return WG.HuntWeapons.byId(id) || WG.HuntWeapons.byId('branch_stick');
  }
  function rangedWeapon() {
    const id = WG.State.get().player.slots.ranged;
    return id && WG.HuntWeapons.byId(id);
  }
  function petWeapon() {
    const id = WG.State.get().player.slots.pet;
    return id && WG.HuntWeapons.byId(id);
  }
  function heldPickupWeapon() {
    return runtime.player.heldPickupId && WG.HuntWeapons.byId(runtime.player.heldPickupId);
  }
  function activeMeleeFor(p) {
    return heldPickupWeapon() || meleeWeapon();
  }

  function move(dt, dirX, dirY) {
    const p = runtime.player;
    const sp = baseSpeed() + (p.speedBonus || 0);
    const desiredVx = dirX * sp;
    const desiredVy = dirY * sp;
    const tau = (Math.abs(dirX) + Math.abs(dirY) > 0.01) ? 0.12 : 0.08;
    const a = Math.min(1, dt / tau);
    p.vx += (desiredVx - p.vx) * a;
    p.vy += (desiredVy - p.vy) * a;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.x < 16) p.x = 16;
    if (p.y < 16) p.y = 16;
    if (p.x > runtime.mapW - 16) p.x = runtime.mapW - 16;
    if (p.y > runtime.mapH - 16) p.y = runtime.mapH - 16;
    if (Math.abs(dirX) > Math.abs(dirY)) p.facing = dirX > 0 ? 'E' : 'W';
    else if (Math.abs(dirY) > 0)         p.facing = dirY > 0 ? 'S' : 'N';
  }

  function pickNearestEnemyInRange(range) {
    const p = runtime.player;
    let best = null, bestDsq = range * range;
    for (const c of runtime.creatures) {
      if (c.hp <= 0) continue;
      const dx = c.x - p.x, dy = c.y - p.y;
      const d = dx*dx + dy*dy;
      if (d < bestDsq) { best = c; bestDsq = d; }
    }
    if (runtime.boss && runtime.boss.hp > 0) {
      const dx = runtime.boss.x - p.x, dy = runtime.boss.y - p.y;
      const d = dx*dx + dy*dy;
      if (d < bestDsq) { best = runtime.boss; bestDsq = d; }
    }
    return best;
  }

  function autoAttack(dt) {
    const p = runtime.player;
    p.attackTimer -= dt;
    const w = activeMeleeFor(p);
    if (p.attackTimer <= 0) {
      // Auto-fire: hit ALL enemies in radius (Vampire-Survivors-style aoe melee swing)
      let hits = 0;
      const r = w.range;
      for (const c of runtime.creatures) {
        if (c.hp <= 0) continue;
        const dx = c.x - p.x, dy = c.y - p.y;
        if (dx*dx + dy*dy < r * r) {
          const dmg = baseDamage(w);
          if (WG.HuntEnemies.damage(c, dmg, { type:'player-melee' })) onEnemyKill(c);
          hits++;
        }
      }
      if (runtime.boss && runtime.boss.hp > 0) {
        const dx = runtime.boss.x - p.x, dy = runtime.boss.y - p.y;
        if (dx*dx + dy*dy < r * r) {
          runtime.boss.hp -= baseDamage(w);
          WG.Engine.emit('boss:damaged', { boss: runtime.boss, amount: baseDamage(w) });
          if (runtime.boss.hp <= 0) onBossKill();
          hits++;
        }
      }
      // Stumps in melee range get chopped by the same swing.
      // XP + wood + coins drop on chop. (Wood Siege: XP from chopping trees.)
      if (window.WG.HuntRender && WG.HuntRender.getStageProps && runtime.stage) {
        const props = WG.HuntRender.getStageProps(runtime.stage);
        const stumpR = r * 0.85; // slightly tighter range for stumps so player aims at them
        for (const s of props.stumps) {
          if (s.dropped) continue;
          const dx = s.x - p.x, dy = s.y - p.y;
          if (dx*dx + dy*dy < (stumpR + s.r) * (stumpR + s.r)) {
            s.hp -= 1;
            s.lastHit = performance.now();
            hits++;
            WG.Engine.emit('stump:hit', { stump: s });
            if (s.hp <= 0) {
              s.dropped = true;
              // Drop wood, coin, and grant XP
              runtime.drops.push({ x: s.x, y: s.y, type: 'coin', vx:0, vy:0 });
              runtime.drops.push({ x: s.x + 6, y: s.y + 4, type: 'coin', vx:0, vy:0 });
              p.xp += 2;
              if (p.xp >= p.xpToNext) levelUp();
              runtime.runWood = (runtime.runWood || 0) + 1;
              WG.Engine.emit('stump:chopped', { stump: s });
            }
          }
        }
      }
      if (hits > 0) WG.Engine.emit('player:swing', { weapon: w, hits });
      p.attackTimer = w.cooldown * (p.cooldownMul || 1);
    }

    // Ranged auto-fire if equipped (separate cooldown)
    const rw = rangedWeapon();
    if (rw) {
      p.rangedTimer = (p.rangedTimer || 0) - dt;
      if (p.rangedTimer <= 0) {
        const target = pickNearestEnemyInRange(rw.range);
        if (target) {
          fireProjectile(p.x, p.y, target.x, target.y, rw, 'player-ranged');
          p.rangedTimer = rw.cooldown;
        }
      }
    }

    // Pet companion attack
    const pet = petWeapon();
    if (pet) {
      p.petCooldown -= dt;
      if (p.petCooldown <= 0) {
        const target = pickNearestEnemyInRange(pet.range);
        if (target) {
          if (pet.ranged) {
            fireProjectile(p.x, p.y - 16, target.x, target.y, pet, 'pet');
          } else {
            // Pet AOE melee
            const r = pet.range;
            for (const c of runtime.creatures) {
              if (c.hp <= 0) continue;
              const dx = c.x - p.x, dy = c.y - p.y;
              if (dx*dx + dy*dy < r*r) {
                if (WG.HuntEnemies.damage(c, pet.damage, { type:'pet' })) onEnemyKill(c);
              }
            }
          }
          WG.Engine.emit('pet:attack', { weapon: pet, target });
          p.petCooldown = pet.cooldown;
        }
      }
    }
  }

  function baseDamage(w) {
    const ps = WG.State.get().player.stats;
    const p = runtime.player;
    return Math.max(1, w.damage + (p && p.bonusDmg || 0) + Math.floor(ps.attack * 0.6));
  }

  function fireProjectile(x, y, tx, ty, w, sourceType) {
    const dx = tx - x, dy = ty - y;
    const d = Math.sqrt(dx*dx + dy*dy) || 1;
    const speed = 320;
    runtime.projectiles.push({
      x, y,
      vx: (dx/d) * speed, vy: (dy/d) * speed,
      damage: baseDamage(w),
      lifetime: 1.5,
      areaR: w.areaR || 0,
      sourceType,
      color: (w.visual && w.visual.color) || '#ffd870',
    });
    WG.Engine.emit('player:fire', { weapon: w });
  }

  function takeDamage(amount, source) {
    const p = runtime.player;
    if (!p) return;
    const ps = WG.State.get().player.stats;
    const reduced = Math.max(1, amount - Math.floor(ps.defense * 0.5));
    p.hp = Math.max(0, p.hp - reduced);
    WG.Engine.emit('player:damaged', { amount: reduced, hp: p.hp, source });
    if (p.hp <= 0) {
      WG.Engine.emit('player:died', { source });
    }
  }

  function heal(amount) {
    const p = runtime.player;
    if (!p) return;
    p.hp = Math.min(p.maxHp, p.hp + amount);
  }

  function onEnemyKill(c) {
    const p = runtime.player;
    p.xp += c._typeData.xp;
    if (p.xp >= p.xpToNext) levelUp();
    // 25% drop chance for orb (XP, picked up automatically within radius)
    if (Math.random() < 0.25) {
      runtime.drops.push({ x: c.x, y: c.y, type: 'orb', vx:0, vy:0 });
    }
  }
  function onBossKill() {
    const p = runtime.player;
    p.xp += runtime.boss._typeData.xp;
    if (p.xp >= p.xpToNext) levelUp();
    runtime.bossDefeated = true;
    WG.Engine.emit('boss:defeated', { boss: runtime.boss });
  }

  function levelUp() {
    const p = runtime.player;
    p.xp -= p.xpToNext;
    p.xpToNext = Math.floor(p.xpToNext * 1.5);
    p.level++;
    runtime.pendingLevelUp = true;     // hunt-render shows the 3-card draft
    WG.Engine.emit('player:level', { level: p.level });
  }

  function applyLevelChoice(choiceId) {
    const p = runtime.player;
    const w = activeMeleeFor(p);
    switch (choiceId) {
      case 'dmg':    p.bonusDmg = (p.bonusDmg||0) + Math.max(2, Math.floor(w.damage * 0.18)); break;
      case 'cd':     p.cooldownMul = (p.cooldownMul || 1) * 0.92; break;
      case 'maxhp':  p.maxHp = Math.floor(p.maxHp * 1.15); p.hp = Math.min(p.maxHp, p.hp + 25); break;
      case 'pickup': p.pickupRadius += 8; break;
      case 'speed':  p.speedBonus = (p.speedBonus||0) + 12; break;
    }
    runtime.pendingLevelUp = false;
  }

  function pickupTick() {
    const p = runtime.player;
    const r = p.pickupRadius;
    for (let i = runtime.drops.length - 1; i >= 0; i--) {
      const d = runtime.drops[i];
      const dx = d.x - p.x, dy = d.y - p.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < r) {
        // magnetize
        d.x += (p.x - d.x) * 0.18;
        d.y += (p.y - d.y) * 0.18;
        if (dist < 14) {
          if (d.type === 'orb') { p.xp += 1; if (p.xp >= p.xpToNext) levelUp(); }
          else if (d.type === 'coin') WG.State.grant('coins', 1);
          else if (d.type === 'fragment') { WG.State.get().forge.craftFragments++; WG.Engine.emit('relic:fragment-pickup',{}); }
          runtime.drops.splice(i, 1);
        }
      }
    }
  }

  function trySkill() {
    const p = runtime.player;
    if (!p.skillReady) return false;
    p.skillReady = false; p.skillCd = SKILL_BASE_CD;
    // Default skill: explosive shockwave around player
    const r = 110;
    for (const c of runtime.creatures) {
      if (c.hp <= 0) continue;
      const dx = c.x - p.x, dy = c.y - p.y;
      if (dx*dx + dy*dy < r*r) {
        if (WG.HuntEnemies.damage(c, 60, { type:'skill' })) onEnemyKill(c);
      }
    }
    if (runtime.boss && runtime.boss.hp > 0) {
      const dx = runtime.boss.x - p.x, dy = runtime.boss.y - p.y;
      if (dx*dx + dy*dy < r*r) { runtime.boss.hp -= 80; if (runtime.boss.hp <= 0) onBossKill(); }
    }
    WG.Engine.emit('player:skill', { radius: r });
    return true;
  }
  function tickSkill(dt) {
    const p = runtime.player;
    if (!p.skillReady) {
      p.skillCd -= dt;
      if (p.skillCd <= 0) { p.skillReady = true; p.skillCd = 0; }
    }
  }

  function tick(dt) {
    if (!runtime || !runtime.player || runtime.player.hp <= 0) return;
    autoAttack(dt);
    pickupTick();
    tickSkill(dt);
  }

  function init() {}
  window.WG.HuntPlayer = { init, place, move, tick, takeDamage, heal, trySkill, applyLevelChoice };
})();
