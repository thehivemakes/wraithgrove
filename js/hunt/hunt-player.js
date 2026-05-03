// WG.HuntPlayer — player character in-stage with auto-attack on cooldown
(function(){'use strict';
  // Movement: speed scales with level slightly
  function baseSpeed() { return 95 + WG.State.get().player.level * 1.2; }
  // Skill cooldown
  const SKILL_BASE_CD = 22;

  // SPEC §0 — Night Mode torch system. torchAmount decays only when mode==='night'
  // AND player is outside any built campfire's TORCH_RELIGHT_R radius. Decay is
  // linear-continuous (smooth, not stair-step) — the perceived non-linear darkening
  // comes from the cubic ease in hunt-render.drawNightOverlay's alpha mapping.
  const TORCH_INITIAL       = 1.0;
  const TORCH_DECAY_PER_S   = 0.012;   // 1 / 0.012 ≈ 83s full burn from 1.0 → 0.0
  const TORCH_RELIGHT_R     = 100;     // SPEC §0: campfire 100-unit relight radius
  const TORCH_DROP_CHANCE   = 0.20;    // 20% per chopped tree in Night Mode

  // W-Dopamine-P1 §B — crit tunables. Frozen: future relic boosts read these to
  // compute additive chance / multiplicative modifier deltas, not replace them.
  const CRIT_TUNABLES = Object.freeze({ chance: 0.12, multiplier: 1.6 });

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
      // SPEC §0 — Night Mode torch (always initialized; tickTorch is mode-gated).
      torchAmount: TORCH_INITIAL,
      torchDecay:  TORCH_DECAY_PER_S,
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
          let dmg = baseDamage(w);
          const isCrit = Math.random() < CRIT_TUNABLES.chance;
          if (isCrit) {
            dmg = Math.round(dmg * CRIT_TUNABLES.multiplier);
            WG.Engine.emit('enemy:crit', { x: c.x, y: c.y, amount: dmg });
          }
          if (WG.HuntEnemies.damage(c, dmg, { type:'player-melee', crit: isCrit })) onEnemyKill(c);
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
              // SPEC §0 — Night Mode: TORCH_DROP_CHANCE replaces this second
              // coin with a Torch item. Tree still gives wood + first coin.
              if (runtime.mode === 'night' && Math.random() < TORCH_DROP_CHANCE) {
                runtime.drops.push({
                  x: s.x + 6, y: s.y + 4, type: 'torch',
                  vx: Math.cos(cAng2) * cSp2, vy: Math.sin(cAng2) * cSp2,
                  _flickerSeed: Math.random() * Math.PI * 2,
                });
              } else {
                runtime.drops.push({
                  x: s.x + 6, y: s.y + 4, type: 'coin',
                  vx: Math.cos(cAng2) * cSp2, vy: Math.sin(cAng2) * cSp2,
                });
              }
              const wAng = Math.random() * Math.PI * 2;
              const wSp  = 160 + Math.random() * 60;
              runtime.drops.push({
                x: s.x, y: s.y, type: 'wood',
                vx: Math.cos(wAng) * wSp, vy: Math.sin(wAng) * wSp,
              });
              // SPEC W-Hard-Tuning-And-Monetization §B — wood_x2 buff drops a
              // second wood + a second coin per chopped tree. Both extras get
              // their own arc so the magnet pulls them in independently.
              const woodX2 = (window.WG && WG.Buffs && WG.Buffs.has && WG.Buffs.has('wood_x2'));
              if (woodX2) {
                const wAng2 = wAng + Math.PI + (Math.random() - 0.5) * 0.6;
                const wSp2  = 160 + Math.random() * 60;
                runtime.drops.push({
                  x: s.x, y: s.y, type: 'wood',
                  vx: Math.cos(wAng2) * wSp2, vy: Math.sin(wAng2) * wSp2,
                });
                const cAngB = Math.random() * Math.PI * 2;
                const cSpB  = 80 + Math.random() * 40;
                runtime.drops.push({
                  x: s.x, y: s.y, type: 'coin',
                  vx: Math.cos(cAngB) * cSpB, vy: Math.sin(cAngB) * cSpB,
                });
              }
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
    let d = Math.max(1, w.damage + (p && p.bonusDmg || 0) + Math.floor(ps.attack * 0.6));
    // SPEC W-Hard-Tuning-And-Monetization §B — damage_x2 buff doubles outgoing
    // melee + turret damage. Read at hit-time so buff expiry is reflected
    // immediately mid-stage without a refresh cycle.
    if (window.WG && WG.Buffs && WG.Buffs.has && WG.Buffs.has('damage_x2')) d *= 2;
    return d;
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
      // SPEC W-Hard-Tuning-And-Monetization §B — pre-armed revive buff
      // intercepts death once. Restores to full HP, fires player:revived,
      // does NOT emit player:died (so the death modal doesn't appear).
      if (window.WG && WG.Buffs && WG.Buffs.consume && WG.Buffs.consume('revive')) {
        p.hp = p.maxHp;
        WG.Engine.emit('player:revived', { source: 'buff' });
        return;
      }
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
    // W-Dopamine-P1 §A — combo tracking
    const combo = runtime.combo;
    if (combo) {
      combo.count++;
      combo.lastKillAt = performance.now();
      if (combo.count > combo.peak) combo.peak = combo.count;
      WG.Engine.emit('combo:step', { count: combo.count });
    }
  }

  function comboDecayTick() {
    const combo = runtime.combo;
    if (!combo || combo.count === 0) return;
    if (performance.now() - combo.lastKillAt > 2500) {
      combo.count = 0;
      WG.Engine.emit('combo:reset', {});
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
    // W-Dopamine-P1 §C — full-screen flash + screen shake + freeze frame
    if (window.WG && WG.Game && WG.Game.flashScreen) WG.Game.flashScreen('#f0c060', 0.5, 320);
    if (window.WG && WG.HuntRender && WG.HuntRender.addTrauma) WG.HuntRender.addTrauma(0.4);
    if (window.WG && WG.Engine && WG.Engine.hitPause) WG.Engine.hitPause(200);
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
          } else if (d.type === 'torch') {
            // SPEC §0 — Field-dropped Torch: full relight + event for FX.
            p.torchAmount = TORCH_INITIAL;
            WG.Engine.emit('pickup:torch', { x: d.x, y: d.y });
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

  // SPEC §0 — Torch tick. Linear decay outside any built campfire's relight
  // radius; instant 1.0 reset inside (per spec: "campfire instantly relights
  // torch in Night Mode"). HP is NOT damaged by torch-out — visibility cost
  // (the night overlay) is the punishment.
  //
  // Edge cases:
  //   - mode!=='night' → noop, torch stays at last value (preserved if mode flips).
  //   - props.fires unavailable (stage not loaded) → noop, no decay (defensive).
  //   - Player exactly on relight boundary (dist² == r²) → treated as inside
  //     (<= comparison) — generous, avoids "you were in the campfire but missed".
  //   - Multiple campfires overlap → first in-range fire relights; loop short-circuits.
  //   - Mode switch mid-tick → guard at top; a future toggle goes silent without state mismatch.
  function tickTorch(dt) {
    if (!runtime || runtime.mode !== 'night') return;
    const p = runtime.player;
    if (!p) return;
    if (typeof p.torchAmount !== 'number') p.torchAmount = TORCH_INITIAL;
    if (typeof p.torchDecay  !== 'number') p.torchDecay  = TORCH_DECAY_PER_S;

    if (window.WG.HuntRender && WG.HuntRender.getStageProps && runtime.stage) {
      const props = WG.HuntRender.getStageProps(runtime.stage);
      // Built-campfire fire entities live in props.fires (constructionTick pushes
      // them on built). props.fires also holds any procedurally-placed campfires
      // from getStageProps for non-night stages — that's harmless: tickTorch only
      // runs in 'night' mode and the procedural fires represent the same lit
      // campfire concept.
      if (props.fires) {
        for (const f of props.fires) {
          const dx = p.x - f.x, dy = p.y - f.y;
          if (dx*dx + dy*dy <= TORCH_RELIGHT_R * TORCH_RELIGHT_R) {
            p.torchAmount = TORCH_INITIAL;
            return;
          }
        }
      }
      // Defensive fallback: if an in-progress build hasn't pushed to props.fires
      // yet, also check constructions for built campfires directly.
      if (props.constructions) {
        for (const c of props.constructions) {
          if (!c.built || c.type !== 'campfire') continue;
          const dx = p.x - c.x, dy = p.y - c.y;
          if (dx*dx + dy*dy <= TORCH_RELIGHT_R * TORCH_RELIGHT_R) {
            p.torchAmount = TORCH_INITIAL;
            return;
          }
        }
      }
    }

    p.torchAmount = Math.max(0, p.torchAmount - p.torchDecay * dt);
  }

  // Construction tick — when player stands inside a dashed-circle slot AND
  // has wood, drain wood and accumulate progress. When have >= need, mark
  // built and (for campfire) push to props.fires for the existing campfire
  // render to pick up. Emits construction:built for FX hooks.
  const CONSTRUCT_RADIUS = 28;       // matches drawConstructionSites r
  const CONSTRUCT_TICK_S = 0.22;     // time per wood consumed (faster = more responsive)

  // W-Building-Repair — hover-repair tunables. Architect monetization hook:
  // could later sell ad-buff "repair 2× speed" by halving REPAIR_RATE while
  // a buff is active. All named constants — no magic numbers in render/UI.
  const REPAIR_HOVER_DELAY = 3.0;   // seconds player must stand near before repair starts
  const REPAIR_RATE        = 0.25;  // seconds per wood consumed during repair
  const REPAIR_HP_PER_WOOD = 8;     // HP restored per wood spent
  const REPAIR_RANGE       = 36;    // world units — proximity threshold (slightly past CONSTRUCT_RADIUS)
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
      // SPEC W-Hard-Tuning-And-Monetization §B — instant_turret buff:
      // standing on a turret slot consumes the buff and force-builds it
      // even with zero wood. One-shot, self-consuming. Other slot types
      // (campfire, etc.) ignore the buff so it stays primed for a turret.
      if (c.type === 'turret' && window.WG && WG.Buffs && WG.Buffs.has && WG.Buffs.has('instant_turret')) {
        WG.Buffs.consume('instant_turret');
        c.have = c.need;
        c.built = true;
        c.drainTimer = 0;
        WG.Engine.emit('construct:built', { site: c, source: 'buff' });
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

  // W-Building-Repair — hover-repair for damaged built turrets. Mirrors the
  // constructionTick proximity-drain pattern: stand within REPAIR_RANGE for
  // REPAIR_HOVER_DELAY seconds, then wood drains at REPAIR_RATE consuming
  // REPAIR_HP_PER_WOOD HP per wood until full HP or wood-out. Player leaving
  // range resets both timers (no resume-from-partial-progress).
  //
  // Edge cases:
  //   - pendingLevelUp gates repair (matches autoAttack/constructionTick).
  //   - Campfires (no hp/maxHp) skipped via type check.
  //   - Multiple damaged turrets in range: each ticks independently.
  //   - HP already full: timers cleared so a fresh damage event starts the
  //     hover delay over (player must re-enter intent).
  function repairTick(dt) {
    if (runtime.pendingLevelUp) return;
    if (!window.WG.HuntRender || !WG.HuntRender.getStageProps || !runtime.stage) return;
    const props = WG.HuntRender.getStageProps(runtime.stage);
    if (!props.constructions) return;
    const p = runtime.player;
    for (const c of props.constructions) {
      if (!c.built || c.type !== 'turret') continue;
      if (typeof c.hp !== 'number' || typeof c.maxHp !== 'number') continue;
      if (c.hp >= c.maxHp) {
        c.repairHover = 0;
        c.repairDrainTimer = 0;
        continue;
      }
      const dx = p.x - c.x, dy = p.y - c.y;
      const inRange = (dx*dx + dy*dy) <= REPAIR_RANGE * REPAIR_RANGE;
      if (!inRange) {
        c.repairHover = 0;
        c.repairDrainTimer = 0;
        continue;
      }
      c.repairHover = (c.repairHover || 0) + dt;
      if (c.repairHover < REPAIR_HOVER_DELAY) continue;
      // Hover threshold reached. Drain wood at REPAIR_RATE.
      if ((runtime.runWood || 0) <= 0) continue;
      c.repairDrainTimer = (c.repairDrainTimer || 0) + dt;
      while (c.repairDrainTimer >= REPAIR_RATE) {
        c.repairDrainTimer -= REPAIR_RATE;
        // Defensive repeat: covers the case where mid-batch turret repair drains the
        // last wood after the first guard already passed. Do not strip on cleanup.
        if ((runtime.runWood || 0) <= 0) { c.repairDrainTimer = 0; break; }
        runtime.runWood = Math.max(0, runtime.runWood - 1);
        c.hp = Math.min(c.maxHp, c.hp + REPAIR_HP_PER_WOOD);
        WG.Engine.emit('repair:tick', { site: c, x: c.x, y: c.y });
        if (c.hp >= c.maxHp) {
          c.hp = c.maxHp;
          c.repairHover = 0;
          c.repairDrainTimer = 0;
          WG.Engine.emit('repair:complete', { site: c, x: c.x, y: c.y });
          break;
        }
      }
    }
  }

  function tick(dt) {
    if (!runtime || !runtime.player || runtime.player.hp <= 0) return;
    autoAttack(dt);
    pickupTick(dt);
    constructionTick(dt);
    repairTick(dt);
    // Turret auto-fire + campfire HP regen — owned by W-Turret-And-Campfire-Combat
    // worker. Runs after constructionTick so a turret completed this tick begins
    // ticking next frame, not the same one (prevents fire-during-build edge cases).
    if (window.WG.HuntTurret && WG.HuntTurret.tick) WG.HuntTurret.tick(dt);
    tickSkill(dt);
    tickTorch(dt);
    comboDecayTick();
  }

  // Render reads REPAIR_HOVER_DELAY + REPAIR_RANGE through here so there's a
  // single source of truth (matches WG.HuntTurret.TUNABLES pattern).
  const REPAIR_TUNABLES = Object.freeze({
    REPAIR_HOVER_DELAY, REPAIR_RATE, REPAIR_HP_PER_WOOD, REPAIR_RANGE,
  });

  function init() {}
  window.WG.HuntPlayer = {
    init, place, move, tick, takeDamage, heal, trySkill, applyLevelChoice,
    REPAIR_TUNABLES, CRIT_TUNABLES,
  };
})();
