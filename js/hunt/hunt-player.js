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
      xpToNext: 12,              // Architect: HARDER. Base 12 (was 5), 1 xp/chop, 1.5x growth
                                 // per level → 12, 18, 27, 40, 60, 90... real grind
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

  // Tree collision — standing trees block player movement; only chopped (.dropped) ones
  // are walkable. Iterates twice for stability when pinched between adjacent trees.
  function resolveTreeCollisions(p) {
    if (!window.WG.HuntRender || !WG.HuntRender.getStageProps || !runtime.stage) return;
    const props = WG.HuntRender.getStageProps(runtime.stage);
    if (!props || !props.stumps) return;
    const PLAYER_R = 10;
    const TREE_R = 9;
    const minD = PLAYER_R + TREE_R;
    const minD2 = minD * minD;
    for (let iter = 0; iter < 3; iter++) {
      let resolved = false;
      for (let i = 0; i < props.stumps.length; i++) {
        const t = props.stumps[i];
        if (t.dropped) continue;
        const dx = p.x - t.x, dy = p.y - t.y;
        const d2 = dx*dx + dy*dy;
        if (d2 < minD2) {
          if (d2 < 0.01) {
            // Player exactly at tree center — push +x by default
            p.x += minD;
            resolved = true;
            continue;
          }
          const d = Math.sqrt(d2);
          const overlap = minD - d;
          p.x += (dx / d) * overlap;
          p.y += (dy / d) * overlap;
          // Damp velocity along the collision normal to prevent jitter
          const dotV = (p.vx * (dx/d) + p.vy * (dy/d));
          if (dotV < 0) {
            p.vx -= dotV * (dx/d);
            p.vy -= dotV * (dy/d);
          }
          resolved = true;
        }
      }
      if (!resolved) break;
    }
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
    // Tree barrier collision (trees are walls until chopped)
    resolveTreeCollisions(p);
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
    // Pause attacks while level-up modal is up — prevents the chop cascade that
    // generated more XP → more level-ups while the user was trying to pick a card.
    if (runtime.pendingLevelUp) return;
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
              // DOPAMINE_DESIGN §2 — drops pop outward, magnet inward. Coins:
              // ~20px arc with fast magnet (lerp 0.22). Wood chunk: 30-40px arc
              // over 200ms, 100ms linger, then magnet at lerp 0.18. The wood
              // counter increments at pickup time, not at chop — "nothing on the
              // counter without traveling through screen space first."
              const cAng = Math.random() * Math.PI * 2;
              const cSp  = 80 + Math.random() * 40;
              runtime.drops.push({
                x: s.x, y: s.y, type: 'coin',
                vx: Math.cos(cAng) * cSp, vy: Math.sin(cAng) * cSp,
              });
              const cAng2 = cAng + Math.PI + (Math.random() - 0.5);
              const cSp2  = 80 + Math.random() * 40;
              runtime.drops.push({
                x: s.x + 6, y: s.y + 4, type: 'coin',
                vx: Math.cos(cAng2) * cSp2, vy: Math.sin(cAng2) * cSp2,
              });
              const wAng = Math.random() * Math.PI * 2;
              const wSp  = 160 + Math.random() * 60;
              runtime.drops.push({
                x: s.x, y: s.y, type: 'wood',
                vx: Math.cos(wAng) * wSp, vy: Math.sin(wAng) * wSp,
              });
              // Architect tuning preserved: 1 XP per chop, harder curve.
              p.xp += 1;
              if (p.xp >= p.xpToNext) levelUp();
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

  function pickupTick(dt) {
    const p = runtime.player;
    const r = p.pickupRadius;
    for (let i = runtime.drops.length - 1; i >= 0; i--) {
      const d = runtime.drops[i];

      // DOPAMINE_DESIGN §2 — initial pop physics. Each drop carries vx/vy at
      // spawn; exponential decay settles it within the type's pop window.
      d._lifetime = (d._lifetime || 0) + dt;
      if (d.vx || d.vy) {
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        const decayPerSec = (d.type === 'coin') ? 12 : 8;
        const k = Math.exp(-decayPerSec * dt);
        d.vx *= k;
        d.vy *= k;
        if (Math.abs(d.vx) < 0.5 && Math.abs(d.vy) < 0.5) { d.vx = 0; d.vy = 0; }
      }

      // §2 magnet table — wood lingers 300ms (200ms pop + 100ms hold) before
      // magnet engages; coin gets aggressive 0.22 lerp; orb/fragment 0.18.
      const linger = (d.type === 'wood') ? 0.30 : 0;
      if (d._lifetime < linger) continue;
      const lerp = (d.type === 'coin') ? 0.22 : 0.18;

      const dx = d.x - p.x, dy = d.y - p.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < r) {
        d.x += (p.x - d.x) * lerp;
        d.y += (p.y - d.y) * lerp;
        if (dist < 14) {
          if (d.type === 'orb') {
            p.xp += 1;
            if (p.xp >= p.xpToNext) levelUp();
            WG.Engine.emit('pickup:orb', { x: d.x, y: d.y, amount: 1 });
          } else if (d.type === 'coin') {
            WG.State.grant('coins', 1);
            WG.Engine.emit('pickup:coin', { x: d.x, y: d.y, amount: 1 });
          } else if (d.type === 'wood') {
            runtime.runWood = (runtime.runWood || 0) + 1;
            WG.Engine.emit('pickup:wood', { x: d.x, y: d.y, amount: 1 });
          } else if (d.type === 'fragment') {
            WG.State.get().forge.craftFragments++;
            WG.Engine.emit('relic:fragment-pickup', { x: d.x, y: d.y, amount: 1 });
            WG.Engine.emit('pickup:fragment',       { x: d.x, y: d.y, amount: 1 });
          }
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

  // Construction tick — when player stands inside a dashed-circle slot AND
  // has wood, drain wood and accumulate progress. When have >= need, mark
  // built and (for campfire) push to props.fires for the existing campfire
  // render to pick up. Emits construction:built for FX hooks.
  const CONSTRUCT_RADIUS = 28;       // matches drawConstructionSites r
  const CONSTRUCT_TICK_S = 0.22;     // time per wood consumed (faster = more responsive)
  function constructionTick(dt) {
    if (runtime.pendingLevelUp) return;
    if (!window.WG.HuntRender || !WG.HuntRender.getStageProps || !runtime.stage) return;
    const props = WG.HuntRender.getStageProps(runtime.stage);
    if (!props.constructions) return;
    const p = runtime.player;
    for (const c of props.constructions) {
      if (c.built) continue;
      const dx = p.x - c.x, dy = p.y - c.y;
      if (dx*dx + dy*dy > CONSTRUCT_RADIUS * CONSTRUCT_RADIUS) {
        c.drainTimer = 0;  // reset when player leaves
        continue;
      }
      // Player on circle. Drain wood if available.
      if ((runtime.runWood || 0) <= 0) continue;
      c.drainTimer = (c.drainTimer || 0) + dt;
      if (c.drainTimer >= CONSTRUCT_TICK_S) {
        c.drainTimer -= CONSTRUCT_TICK_S;
        runtime.runWood = Math.max(0, runtime.runWood - 1);
        c.have += 1;
        WG.Engine.emit('construct:tick', { site: c });
        if (c.have >= c.need) {
          c.built = true;
          c.drainTimer = 0;
          // Campfire built → push fire entity for existing flame render
          if (c.type === 'campfire') {
            if (!props.fires) props.fires = [];
            props.fires.push({ x: c.x, y: c.y, flicker: Math.random() * Math.PI * 2 });
          }
          WG.Engine.emit('construct:built', { site: c });
        }
      }
    }
  }

  function tick(dt) {
    if (!runtime || !runtime.player || runtime.player.hp <= 0) return;
    autoAttack(dt);
    pickupTick(dt);
    constructionTick(dt);
    tickSkill(dt);
  }

  function init() {}
  window.WG.HuntPlayer = { init, place, move, tick, takeDamage, heal, trySkill, applyLevelChoice };
})();
