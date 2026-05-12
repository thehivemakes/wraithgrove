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

  // W-FX-P2-Polish §A — hit-stop durations per damage tier. Frozen so render and
  // future relic/buff code can read without risk of accidental mutation.
  // Elite threshold: enemy _typeData.size >= 24 (brute_small=24, banshee=36).
  const HITSTOP_TIERS = Object.freeze({
    normal:       0,
    crit:         60,
    elite:        100,
    bossDamaged:  140,
    bossDefeated: 280,
  });

  // W-Fever-Mode §A — fever mode tunables. Frozen so render + pickup layers read
  // without risk of mutation. CHEST_GOLD_MIN/MAX define the 1d4 gold range.
  const FEVER_TUNABLES = Object.freeze({
    THRESHOLD_COMBO: 20,
    DURATION_SEC:    10,
    DROP_RATE_MULT:  3.0,
    ENEMY_GLOW:           '#ff8040',
    SCREEN_TINT_RGBA:     'rgba(255,140,40,0.15)',
    CHEST_GOLD_MIN:  1,
    CHEST_GOLD_MAX:  4,
  });

  let runtime = null;
  // W-Performance-Patches: cap runtime.drops to prevent unbounded accumulation (PERFORMANCE_AUDIT.md §2A: 800 drops possible on stage 18)
  const MAX_DROPS = 500;
  function _pushDrop(d) { if (runtime.drops.length < MAX_DROPS) runtime.drops.push(d); }

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
      xpToNext: 25,              // W-LevelUp-Storm-Tune: base 25 (was 12), 1.7x growth
                                 // per level → 25, 43, 73, 124, 211, 359, 610, 1037...
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
      // W-Fever-Mode §A — reset each stage entry
      feverActive:   false,
      feverEndsAt:   0,
      feverDropMult: 1,
      // PHOENIX REVIVE (Architect 2026-05-09): once per stage, death → 1 HP + 3s
      // godmode + 2× damage + AOE blast. Refreshes via ad-watch in death modal.
      phoenixAvailable: true,
      phoenixActive:    false,
      phoenixEndsAt:    0,
      phoenixDmgMult:   1,
      // SPIRIT SURGE (Architect 2026-05-09): triple-tap / long-press panic button.
      // 1.5s slowmo + 3× scythe + 200-unit nuke. 60s CD. Charged at stage start.
      spiritSurgeCd:    0,
      spiritSurgeActive: false,
      spiritSurgeEndsAt: 0,
      // WRAITH UNLEASH (Architect 2026-05-09): combo cascade. Tracks last-fired
      // milestone to prevent re-trigger within same combo run.
      wraithLastTier:   0,
    };
  }

  // ─── Architect 2026-05-09 tunables (post-Stage1-onboarding) ────────────────
  const PHOENIX_TUNABLES = Object.freeze({
    GODMODE_MS:   3000,
    DMG_MULT:     2.0,
    AOE_RADIUS:   220,
    AOE_DAMAGE:   60,
  });
  const SPIRIT_SURGE_TUNABLES = Object.freeze({
    CD_SEC:           60,
    SLOWMO_MS:        1500,
    SLOWMO_SCALE:     0.30,    // world ticks at 30% speed during slowmo
    NUKE_RADIUS:      200,
    NUKE_DAMAGE:      120,
    SCYTHE_MULT:      3.0,
    TRAUMA:           0.55,
  });
  const WRAITH_UNLEASH_TIERS = [
    // count, label, behavior
    { combo: 30,  tier: 1, label: 'WRAITH SWEEP',  aoeRadius: 180, aoeDamage: 70,  reward: null },
    { combo: 60,  tier: 2, label: 'GOLD CASCADE',  aoeRadius: 260, aoeDamage: 110, reward: 'gold_chest' },
    { combo: 100, tier: 3, label: 'ASCENDANT',     aoeRadius: 999, aoeDamage: 200, reward: 'ascendant_15s' },
  ];

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
    // W-Performance-Patches: was O(1380) scan per iter (reason: 0.8–2.5ms/frame on A11, PERFORMANCE_AUDIT.md §1B)
    // Spatial grid reduces to ~27 neighbour checks; gcx0/gcy0 recomputed per iter since p.x/y shifts.
    const grid = props.stumpsGrid;
    const cell = props.stumpsGridCell || 64;
    if (grid) {
      for (let iter = 0; iter < 3; iter++) {
        let resolved = false;
        const gcx0 = Math.floor(p.x / cell) - 1;
        const gcy0 = Math.floor(p.y / cell) - 1;
        for (let gcx = gcx0; gcx <= gcx0 + 2; gcx++) {
          for (let gcy = gcy0; gcy <= gcy0 + 2; gcy++) {
            const bucket = grid[gcx + ',' + gcy];
            if (!bucket) continue;
            for (const t of bucket) {
              if (t.dropped) continue;
              const dx = p.x - t.x, dy = p.y - t.y;
              const d2 = dx*dx + dy*dy;
              if (d2 < minD2) {
                if (d2 < 0.01) { p.x += minD; resolved = true; continue; }
                const d = Math.sqrt(d2);
                const overlap = minD - d;
                p.x += (dx / d) * overlap;
                p.y += (dy / d) * overlap;
                const dotV = (p.vx * (dx/d) + p.vy * (dy/d));
                if (dotV < 0) { p.vx -= dotV * (dx/d); p.vy -= dotV * (dy/d); }
                resolved = true;
              }
            }
          }
        }
        if (!resolved) break;
      }
    } else {
      // Fallback: O(n) scan if grid not yet populated (first-frame safety)
      for (let iter = 0; iter < 3; iter++) {
        let resolved = false;
        for (let i = 0; i < props.stumps.length; i++) {
          const t = props.stumps[i];
          if (t.dropped) continue;
          const dx = p.x - t.x, dy = p.y - t.y;
          const d2 = dx*dx + dy*dy;
          if (d2 < minD2) {
            if (d2 < 0.01) { p.x += minD; resolved = true; continue; }
            const d = Math.sqrt(d2);
            const overlap = minD - d;
            p.x += (dx / d) * overlap;
            p.y += (dy / d) * overlap;
            const dotV = (p.vx * (dx/d) + p.vy * (dy/d));
            if (dotV < 0) { p.vx -= dotV * (dx/d); p.vy -= dotV * (dy/d); }
            resolved = true;
          }
        }
        if (!resolved) break;
      }
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
      // W-FX-P2-Polish §A — track highest hit-stop tier across all enemies this swing;
      // fire a single hitPause at the end so crowd-hits don't stack 10× pause calls.
      let swingPause = 0;
      for (const c of runtime.creatures) {
        if (c.hp <= 0) continue;
        const dx = c.x - p.x, dy = c.y - p.y;
        if (dx*dx + dy*dy < r * r) {
          let dmg = baseDamage(w);
          // PHOENIX dmg mult: 2× during 3s godmode after revive
          if (p.phoenixActive) dmg = Math.round(dmg * p.phoenixDmgMult);
          const isCrit = Math.random() < CRIT_TUNABLES.chance;
          if (isCrit) {
            dmg = Math.round(dmg * CRIT_TUNABLES.multiplier);
            WG.Engine.emit('enemy:crit', { x: c.x, y: c.y, amount: dmg });
          }
          if (WG.HuntEnemies.damage(c, dmg, { type:'player-melee', crit: isCrit })) onEnemyKill(c);
          const tier = isCrit ? HITSTOP_TIERS.crit
                     : (c._typeData && c._typeData.size >= 24) ? HITSTOP_TIERS.elite
                     : HITSTOP_TIERS.normal;
          if (tier > swingPause) swingPause = tier;
          hits++;
        }
      }
      if (swingPause > 0) WG.Engine.hitPause(swingPause);
      if (runtime.boss && runtime.boss.hp > 0) {
        const dx = runtime.boss.x - p.x, dy = runtime.boss.y - p.y;
        if (dx*dx + dy*dy < r * r) {
          runtime.boss.hp -= baseDamage(w);
          WG.Engine.emit('boss:damaged', { boss: runtime.boss, amount: baseDamage(w) });
          WG.Engine.hitPause(HITSTOP_TIERS.bossDamaged);
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
              _pushDrop({
                x: s.x, y: s.y, type: 'coin',
                vx: Math.cos(cAng) * cSp, vy: Math.sin(cAng) * cSp,
              });
              const cAng2 = cAng + Math.PI + (Math.random() - 0.5);
              const cSp2  = 80 + Math.random() * 40;
              // SPEC §0 — Night Mode: TORCH_DROP_CHANCE replaces this second
              // coin with a Torch item. Tree still gives wood + first coin.
              if (runtime.mode === 'night' && Math.random() < TORCH_DROP_CHANCE) {
                _pushDrop({
                  x: s.x + 6, y: s.y + 4, type: 'torch',
                  vx: Math.cos(cAng2) * cSp2, vy: Math.sin(cAng2) * cSp2,
                  _flickerSeed: Math.random() * Math.PI * 2,
                });
              } else {
                _pushDrop({
                  x: s.x + 6, y: s.y + 4, type: 'coin',
                  vx: Math.cos(cAng2) * cSp2, vy: Math.sin(cAng2) * cSp2,
                });
              }
              const wAng = Math.random() * Math.PI * 2;
              const wSp  = 160 + Math.random() * 60;
              _pushDrop({
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
                _pushDrop({
                  x: s.x, y: s.y, type: 'wood',
                  vx: Math.cos(wAng2) * wSp2, vy: Math.sin(wAng2) * wSp2,
                });
                const cAngB = Math.random() * Math.PI * 2;
                const cSpB  = 80 + Math.random() * 40;
                _pushDrop({
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
    // W-Special-Abilities: shadow_strike — consumes stacks on hit
    const sb = runtime && runtime.player && runtime.player._shadowBuff;
    if (sb && sb.stacks > 0) {
      d *= sb.mult;
      sb.stacks--;
      if (sb.stacks <= 0) { runtime.player._shadowBuff = null; WG.Engine.emit('ability:shadow-strike-end', {}); }
    }
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
    // W-Special-Abilities: invuln_aoe + shield effects absorb damage
    const now = Date.now();
    if (runtime._invulnEndsAt && now < runtime._invulnEndsAt) return;
    if (runtime._shieldEndsAt && now < runtime._shieldEndsAt) return;
    // W-Stage-Zero-Tutorial: first invulnFirstSec seconds are damage-free
    if (runtime.stage && runtime.stage.invulnFirstSec && runtime.elapsed < runtime.stage.invulnFirstSec) {
      WG.Engine.emit('fx:shield-deflect', { x: p.x, y: p.y });
      return;
    }
    const ps = WG.State.get().player.stats;
    const reduced = Math.max(1, amount - Math.floor(ps.defense * 0.5));
    p.hp = Math.max(0, p.hp - reduced);
    WG.Engine.emit('player:damaged', { amount: reduced, hp: p.hp, source });
    if (p.hp <= 0) {
      // PHOENIX REVIVE (Architect 2026-05-09) — first death per stage drops you
      // to 1 HP + 3s godmode + 2× damage + AOE blast. Higher priority than
      // pre-armed revive buff (so the per-stage save fires first; ad-watch
      // refresh sets phoenixAvailable=true for a 2nd death).
      if (p.phoenixAvailable) {
        p.phoenixAvailable = false;
        p.phoenixActive    = true;
        p.phoenixEndsAt    = Date.now() + PHOENIX_TUNABLES.GODMODE_MS;
        p.phoenixDmgMult   = PHOENIX_TUNABLES.DMG_MULT;
        p.hp = 1;
        runtime._invulnEndsAt = p.phoenixEndsAt;
        // AOE blast — damage all enemies within radius at revive position
        if (runtime.creatures) {
          for (const c of runtime.creatures) {
            if (c.hp <= 0) continue;
            const dx = c.x - p.x, dy = c.y - p.y;
            if (dx*dx + dy*dy < PHOENIX_TUNABLES.AOE_RADIUS * PHOENIX_TUNABLES.AOE_RADIUS) {
              WG.HuntEnemies.damage(c, PHOENIX_TUNABLES.AOE_DAMAGE);
            }
          }
        }
        WG.Engine.emit('player:revived', { source: 'phoenix', x: p.x, y: p.y });
        return;
      }
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

  // PHOENIX tick — clears godmode flag + dmg mult when timer expires
  function tickPhoenix() {
    const p = runtime.player;
    if (!p || !p.phoenixActive) return;
    if (Date.now() >= p.phoenixEndsAt) {
      p.phoenixActive  = false;
      p.phoenixDmgMult = 1;
      WG.Engine.emit('player:phoenix-end', {});
    }
  }

  // SPIRIT SURGE — cooldown tick + trigger handler
  function tickSpiritSurge(dt) {
    const p = runtime.player;
    if (!p) return;
    if (p.spiritSurgeCd > 0) p.spiritSurgeCd = Math.max(0, p.spiritSurgeCd - dt);
    if (p.spiritSurgeActive && Date.now() >= p.spiritSurgeEndsAt) {
      p.spiritSurgeActive = false;
      // _timeSlow auto-clears via wg-game.js line 173 once endsAt passes
      WG.Engine.emit('player:spirit-surge-end', {});
    }
  }
  function trySpiritSurge() {
    const p = runtime.player;
    if (!p || p.hp <= 0 || p.spiritSurgeCd > 0 || p.spiritSurgeActive) {
      return { ok: false, reason: 'unavailable' };
    }
    p.spiritSurgeActive = true;
    p.spiritSurgeEndsAt = Date.now() + SPIRIT_SURGE_TUNABLES.SLOWMO_MS;
    p.spiritSurgeCd     = SPIRIT_SURGE_TUNABLES.CD_SEC;
    // Reuse existing _timeSlow infrastructure (wg-game.js line 171)
    runtime._timeSlow = { factor: SPIRIT_SURGE_TUNABLES.SLOWMO_SCALE, endsAt: p.spiritSurgeEndsAt };
    // Nuke radius damage
    if (runtime.creatures) {
      for (const c of runtime.creatures) {
        if (c.hp <= 0) continue;
        const dx = c.x - p.x, dy = c.y - p.y;
        if (dx*dx + dy*dy < SPIRIT_SURGE_TUNABLES.NUKE_RADIUS * SPIRIT_SURGE_TUNABLES.NUKE_RADIUS) {
          WG.HuntEnemies.damage(c, SPIRIT_SURGE_TUNABLES.NUKE_DAMAGE);
        }
      }
    }
    WG.Engine.emit('player:spirit-surge', {
      x: p.x, y: p.y,
      radius: SPIRIT_SURGE_TUNABLES.NUKE_RADIUS,
      trauma: SPIRIT_SURGE_TUNABLES.TRAUMA,
    });
    return { ok: true };
  }

  // WRAITH UNLEASH — combo milestone cascade. Called from combo:step handler.
  function checkWraithUnleash(comboCount) {
    const p = runtime.player;
    if (!p) return;
    for (const tier of WRAITH_UNLEASH_TIERS) {
      if (comboCount >= tier.combo && p.wraithLastTier < tier.tier) {
        p.wraithLastTier = tier.tier;
        // AOE
        if (runtime.creatures) {
          for (const c of runtime.creatures) {
            if (c.hp <= 0) continue;
            const dx = c.x - p.x, dy = c.y - p.y;
            if (dx*dx + dy*dy < tier.aoeRadius * tier.aoeRadius) {
              WG.HuntEnemies.damage(c, tier.aoeDamage);
            }
          }
        }
        // Rewards
        if (tier.reward === 'gold_chest') {
          _pushDrop({ x: p.x, y: p.y, type: 'gold_chest', vx: 0, vy: 0 });
        } else if (tier.reward === 'ascendant_15s') {
          runtime._invulnEndsAt = Date.now() + 15000;
          p.speedBonus = (p.speedBonus || 0) + 400; // +5× base 95 ≈ 475 → cap at ~+400
        }
        WG.Engine.emit('wraith:unleash', { tier: tier.tier, label: tier.label, x: p.x, y: p.y, radius: tier.aoeRadius });
      }
    }
  }

  function heal(amount) {
    const p = runtime.player;
    if (!p) return;
    p.hp = Math.min(p.maxHp, p.hp + amount);
  }

  function onEnemyKill(c) {
    const p = runtime.player;
    // W-Balance-Tier2 FLAG-06: night mode XP bonus. was: c._typeData.xp (no mult)
    const _nightXpMul = (runtime.mode === 'night' && WG.HuntWaves && WG.HuntWaves.NIGHT_XP_MULT) ? WG.HuntWaves.NIGHT_XP_MULT : 1;
    p.xp += Math.round(c._typeData.xp * _nightXpMul);
    if (p.xp >= p.xpToNext) levelUp();
    // 25% base orb drop; W-Fever-Mode §B multiplies roll count during fever.
    // Multiple rolls = multiple orbs, each with slight arc for visual spread.
    const orbRolls = (runtime.player && runtime.player.feverActive)
      ? Math.round(FEVER_TUNABLES.DROP_RATE_MULT) : 1;
    for (let _i = 0; _i < orbRolls; _i++) {
      if (Math.random() < 0.25) {
        const _ang = Math.random() * Math.PI * 2;
        _pushDrop({
          x: c.x, y: c.y, type: 'orb',
          vx: orbRolls > 1 ? Math.cos(_ang) * 28 : 0,
          vy: orbRolls > 1 ? Math.sin(_ang) * 28 : 0,
        });
      }
    }
    // W-Dopamine-P1 §A — combo tracking
    const combo = runtime.combo;
    if (combo) {
      combo.count++;
      combo.lastKillAt = performance.now();
      if (combo.count > combo.peak) combo.peak = combo.count;
      WG.Engine.emit('combo:step', { count: combo.count });
      // W-Fever-Mode §B — trigger on first crossing of threshold
      if (combo.count >= FEVER_TUNABLES.THRESHOLD_COMBO && !runtime.player.feverActive) {
        startFever();
      }
      // WRAITH UNLEASH (Architect 2026-05-09): cascade rewards on combo
      // milestones (30 / 60 / 100). Reset by combo:reset path below.
      checkWraithUnleash(combo.count);
    }
  }

  function comboDecayTick() {
    const combo = runtime.combo;
    if (!combo || combo.count === 0) return;
    const p = runtime.player;
    // W-Fever-Mode §B — check fever timer expiry and combo-below-threshold break
    if (p && p.feverActive) {
      if (Date.now() >= p.feverEndsAt) {
        endFever('survived');
      } else if (combo.count < FEVER_TUNABLES.THRESHOLD_COMBO) {
        endFever('broke');
      }
    }
    if (performance.now() - combo.lastKillAt > 2500) {
      if (p && p.feverActive) endFever('broke');
      combo.count = 0;
      // WRAITH UNLEASH — reset tier on combo break so next chain can re-trigger
      if (p) p.wraithLastTier = 0;
      WG.Engine.emit('combo:reset', {});
    }
  }

  // W-Fever-Mode §B — enter FEVER MODE when combo first crosses threshold.
  function startFever() {
    const p = runtime.player;
    p.feverActive   = true;
    p.feverEndsAt   = Date.now() + FEVER_TUNABLES.DURATION_SEC * 1000;
    p.feverDropMult = FEVER_TUNABLES.DROP_RATE_MULT;
    WG.Engine.emit('fever:start', { endsAt: p.feverEndsAt });
  }

  // W-Fever-Mode §B — exit FEVER MODE. cause: 'survived' | 'broke'.
  // On survive: spawn FEVER CHEST + floating label. Render/audio handled via event.
  function endFever(cause) {
    const p = runtime.player;
    p.feverActive   = false;
    p.feverEndsAt   = 0;
    p.feverDropMult = 1;
    WG.Engine.emit('fever:end', { feverEndsBecause: cause });
    if (cause === 'survived') {
      const gold = FEVER_TUNABLES.CHEST_GOLD_MIN
        + Math.floor(Math.random() * (FEVER_TUNABLES.CHEST_GOLD_MAX - FEVER_TUNABLES.CHEST_GOLD_MIN + 1));
      const loot = [
        { kind: 'fragment', amount: 1 },
        { kind: 'gem',      amount: 1 },
        { kind: 'gold',     amount: gold },
      ];
      if (window.WG && WG.HuntPickups && WG.HuntPickups.spawnFeverChest) {
        WG.HuntPickups.spawnFeverChest(runtime, p.x, p.y, loot);
      }
      if (window.WG && WG.HuntFXNumbers) {
        WG.HuntFXNumbers.spawn(p.x, p.y - 40, 'FEVER CHEST!',
          { color: '#ffb040', size: 22, duration: 1800, velocity: -28 });
      }
    }
  }
  function onBossKill() {
    const p = runtime.player;
    p.xp += runtime.boss._typeData.xp;
    if (p.xp >= p.xpToNext) levelUp();
    runtime.bossDefeated = true;
    WG.Engine.emit('boss:defeated', { boss: runtime.boss });
    WG.Engine.hitPause(HITSTOP_TIERS.bossDefeated);
  }

  function levelUp() {
    const p = runtime.player;
    p.xp -= p.xpToNext;
    p.xpToNext = Math.floor(p.xpToNext * 1.7);
    p.level++;
    WG.Engine.emit('player:level', { level: p.level });
    // W-Dopamine-P1 §C — full-screen flash + screen shake + freeze frame (every level)
    if (window.WG && WG.Game && WG.Game.flashScreen) WG.Game.flashScreen('#f0c060', 0.5, 320);
    if (window.WG && WG.HuntRender && WG.HuntRender.addTrauma) WG.HuntRender.addTrauma(0.4);
    if (window.WG && WG.Engine && WG.Engine.hitPause) WG.Engine.hitPause(200);
    // W-LevelUp-Storm-Tune §B — queue extra level-ups instead of stacking modals
    if (runtime.pendingLevelUp) {
      runtime.queuedLevelUps = (runtime.queuedLevelUps || 0) + 1;
    } else {
      runtime.pendingLevelUp = true;
    }
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
    // W-LevelUp-Storm-Tune §B — drain queue: if more levels pending, keep modal open
    if (runtime.queuedLevelUps && runtime.queuedLevelUps > 0) {
      runtime.queuedLevelUps--;
      // pendingLevelUp stays true; render will regenerate fresh cards (runtime._luOptions
      // is cleared by the pick handler in hunt-render.js before calling applyLevelChoice)
    } else {
      runtime.pendingLevelUp = false;
    }
  }

  function pickupTick(dt) {
    const p = runtime.player;
    // W-Special-Abilities: soul_magnet — extends radius to full screen + 2× XP
    const _smActive = runtime._magnetXpEndsAt && Date.now() < runtime._magnetXpEndsAt;
    const r = _smActive ? Math.max(p.pickupRadius, 800) : p.pickupRadius;
    if (_smActive && Date.now() >= runtime._magnetXpEndsAt) runtime._magnetXpEndsAt = 0;
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
            // W-Special-Abilities: soul_magnet 2× XP mult
            const _orbXpMult = (_smActive && runtime._magnetXpMult) ? runtime._magnetXpMult : 1;
            p.xp += 1 * _orbXpMult;
            if (p.xp >= p.xpToNext) levelUp();
            WG.Engine.emit('pickup:orb', { x: d.x, y: d.y, amount: 1 });
          } else if (d.type === 'coin') {
            // W-Balance-Tier2 FLAG-06: night coin bonus (probabilistic so 1.5× = always 1 + 50% chance +1).
            // was: WG.State.grant('coins', 1) with no night mult
            const _ncm = (runtime.mode === 'night' && WG.HuntWaves && WG.HuntWaves.NIGHT_COIN_DROP_MULT) ? WG.HuntWaves.NIGHT_COIN_DROP_MULT : 1;
            const _cAmt = Math.floor(_ncm) + (Math.random() < (_ncm % 1) ? 1 : 0);
            WG.State.grant('coins', _cAmt);
            WG.Engine.emit('pickup:coin', { x: d.x, y: d.y, amount: _cAmt });
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
    tickPhoenix();
    tickSpiritSurge(dt);
    comboDecayTick();
  }

  // Render reads REPAIR_HOVER_DELAY + REPAIR_RANGE through here so there's a
  // single source of truth (matches WG.HuntTurret.TUNABLES pattern).
  const REPAIR_TUNABLES = Object.freeze({
    REPAIR_HOVER_DELAY, REPAIR_RATE, REPAIR_HP_PER_WOOD, REPAIR_RANGE,
  });

  function init() {}
  // PHOENIX REVIVE ad-watch refresh — sets phoenixAvailable back to true.
  // Called from death modal's "Watch Ad" button. One-shot per stage.
  function rearmPhoenix() {
    const p = runtime && runtime.player;
    if (!p) return false;
    p.phoenixAvailable = true;
    return true;
  }

  window.WG.HuntPlayer = {
    init, place, move, tick, takeDamage, heal, trySkill, applyLevelChoice,
    REPAIR_TUNABLES, CRIT_TUNABLES, HITSTOP_TIERS, FEVER_TUNABLES,
    // Architect 2026-05-09 dopamine cascade
    trySpiritSurge, rearmPhoenix,
    PHOENIX_TUNABLES, SPIRIT_SURGE_TUNABLES, WRAITH_UNLEASH_TIERS,
  };
})();
