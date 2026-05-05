// WG.HuntTower — Tower Gauntlet mode #2 (alongside Hunt)
// Reuses WG.HuntPlayer / WG.HuntEnemies / WG.HuntBosses with tower runtime.
// Read-only: hunt-enemies.js, hunt-bosses.js, hunt-stage.js, hunt-waves.js, hunt-player.js.
(function(){'use strict';

  // ─── Concern A: Tunables (frozen) ────────────────────────────────────────
  const TUNABLES = Object.freeze({
    ENERGY_COST:           5,
    // Concern B fills scaling constants
    BASE_HP_MULT:          1.0,
    HP_MULT_PER_FLOOR:     0.18,
    DAMAGE_MULT_PER_FLOOR: 0.10,
    SPEED_MULT_PER_FLOOR:  0.04,
    SPEED_MULT_CAP:        1.6,
    XP_MULT_PER_FLOOR:     0.20,
    MINIBOSS_AT_FLOOR_PCT: 0.70,
    MINIBOSS_HP_BASE:      200,
    MINIBOSS_HP_PER_FLOOR: 30,
    BASE_SPAWN_RATE:       1.5,
    SPAWN_RATE_PER_FLOOR:  0.15,
    FLOOR_DURATION_BASE:   75,
    FLOOR_DURATION_STEP:   5,
    FLOOR_DURATION_DECAY:  2,
    FLOOR_DURATION_MIN:    45,
    MAX_CONTINUES:         2,
    CONTINUE_COST_LOW:     1,
    CONTINUE_COST_MID:     3,
    CONTINUE_COST_HIGH:    5,
  });

  // ─── Concern A: Tower runtime shape ──────────────────────────────────────
  // Parallel to huntRuntime in wg-game.js. Fields used by HuntPlayer/Enemies/Bosses
  // must exist (stage:null suppresses construction/torch/stump ticks).
  function buildTowerRuntime() {
    return {
      mode: 'tower',
      mapW: 720,
      mapH: 1100,
      // floor state
      floor: 1,
      buffStack: [],
      buffPickActive: false,
      // combat (same fields HuntPlayer / HuntEnemies / HuntBosses expect)
      player: null,
      creatures: [],
      projectiles: [],
      enemyProjectiles: [],
      drops: [],
      boss: null,
      bossDefeated: false,
      // floor timing
      floorElapsed: 0,
      floorDuration: _floorDurationSec(1),
      totalElapsed: 0,
      // accounting
      kills: 0,
      goldEarned: 0,
      fragsEarned: 0,
      // spawner
      spawnAccum: 0,
      miniBossSpawned: false,
      floorCleared: false,
      // HuntPlayer compatibility shims
      pendingLevelUp: false,
      combo: { count: 0, lastKillAt: 0, peak: 0 },
      stage: null,      // suppresses constructionTick / repairTick / tickTorch
      runWood: 0,
      // chest / continue
      milestoneChestActive: false,
      continueCount: 0,
      pendingDeath: false,
      // tower-buff state (applied by HuntTowerBuffs.apply)
      _towerRevives: 0,
      _towerLifesteal: 0,
      _pendingFloorSkip: false,
    };
  }

  let towerRuntime = null;

  // ─── Concern A: startTower ───────────────────────────────────────────────
  // Called by wg-game.js#startTowerRun. Energy already spent by caller.
  // Places the player and returns the runtime so wg-game can assign huntRuntime.
  function startTower() {
    const rt = buildTowerRuntime();
    towerRuntime = rt;
    WG.HuntPlayer.place(rt.mapW * 0.5, rt.mapH * 0.5, rt);
    return rt;
  }

  // ─── Concern B: tickFloor ────────────────────────────────────────────────
  // Full per-frame tower logic. Called from wg-game.js rAF when mode==='tower'.
  function tickFloor(dt) {
    const rt = towerRuntime;
    if (!rt || !rt.player || rt.player.hp <= 0) return;
    if (rt.buffPickActive || rt.milestoneChestActive) return;
    if (rt.floorCleared) return;
    if (WG.Engine.isHitPaused()) return;

    rt.floorElapsed += dt;
    rt.totalElapsed += dt;

    // Player input + movement + auto-attack
    const inp = WG.Input.poll();
    WG.HuntPlayer.move(dt, inp.x, inp.y);
    if (WG.Input.consumeSkill()) WG.HuntPlayer.trySkill();
    WG.HuntPlayer.tick(dt);

    // Spawner (enemies + mini-boss at 70%)
    _tickSpawner(rt, dt);

    // Enemy ticks
    for (const c of rt.creatures) WG.HuntEnemies.tickOne(c, dt, rt);

    // Mini-boss tick
    if (rt.boss && rt.boss.hp > 0) WG.HuntBosses.tickBoss(rt.boss, dt, rt);

    // Projectiles
    _tickProjectiles(rt, dt);

    // Reap dead creatures + optional lifesteal
    for (let i = rt.creatures.length - 1; i >= 0; i--) {
      const c = rt.creatures[i];
      if (c.hp > 0) continue;
      rt.creatures.splice(i, 1);
      rt.kills++;
      if (rt.player && rt._towerLifesteal > 0) {
        WG.HuntPlayer.heal(Math.ceil(c._typeData.hp * rt._towerLifesteal * 0.1));
      }
    }

    // Boss cleared (bossDefeated set by HuntPlayer.onBossKill)
    if (rt.boss && rt.bossDefeated) {
      rt.boss = null;
      rt.bossDefeated = false;
    }

    // Particles
    WG.Render.tickParticles(dt);

    // Floor clear: timer done AND no surviving mini-boss
    if (rt.floorElapsed >= rt.floorDuration && (!rt.miniBossSpawned || !rt.boss)) {
      _onFloorClear(rt);
    }
  }

  // ─── Concern B: enemy + boss pool ────────────────────────────────────────
  const FLOOR_ENEMY_BANDS = [
    { from: 1,  types: ['lurker','walker','sprite'] },
    { from: 4,  types: ['lurker','walker','sprite','red_zombie','skull_swarmer'] },
    { from: 8,  types: ['lurker','walker','sprite','red_zombie','skull_swarmer','caller','brute_small','wraith_fast'] },
    { from: 13, types: ['lurker','walker','sprite','red_zombie','skull_swarmer','caller','brute_small','wraith_fast','jiangshi','samurai_grunt','pumpkin_lantern'] },
    { from: 18, types: ['lurker','walker','sprite','red_zombie','skull_swarmer','caller','brute_small','wraith_fast','jiangshi','samurai_grunt','pumpkin_lantern','banshee'] },
  ];

  const BOSS_POOL = ['pale_bride','frozen_crone','autumn_lord','temple_warden','cave_mother','wraith_father'];

  function _getEnemyMix(floor) {
    let mix = FLOOR_ENEMY_BANDS[0].types;
    for (const band of FLOOR_ENEMY_BANDS) { if (floor >= band.from) mix = band.types; }
    return mix;
  }

  function _hpMult(floor)     { return TUNABLES.BASE_HP_MULT + TUNABLES.HP_MULT_PER_FLOOR * (floor - 1); }
  function _damageMult(floor) { return 1 + TUNABLES.DAMAGE_MULT_PER_FLOOR * (floor - 1); }
  function _speedMult(floor)  { return Math.min(TUNABLES.SPEED_MULT_CAP, 1 + TUNABLES.SPEED_MULT_PER_FLOOR * (floor - 1)); }
  function _spawnRate(floor)  { return TUNABLES.BASE_SPAWN_RATE + TUNABLES.SPAWN_RATE_PER_FLOOR * floor; }

  function _randEdgePos(rt) {
    const edge = Math.floor(Math.random() * 4);
    const jitter = () => (Math.random() - 0.5) * 60;
    switch (edge) {
      case 0: return { x: rt.mapW * Math.random(), y: 20 + Math.abs(jitter()) };
      case 1: return { x: rt.mapW - 20 - Math.abs(jitter()), y: rt.mapH * Math.random() };
      case 2: return { x: rt.mapW * Math.random(), y: rt.mapH - 20 - Math.abs(jitter()) };
      default:return { x: 20 + Math.abs(jitter()), y: rt.mapH * Math.random() };
    }
  }

  // Concern B: spawn one enemy (with floor scaling)
  function _spawnOneEnemy(rt) {
    const floor = rt.floor;
    const mix  = _getEnemyMix(floor);
    const type = mix[Math.floor(Math.random() * mix.length)];
    const { x, y } = _randEdgePos(rt);
    const e = WG.HuntEnemies.spawn(type, x, y);
    if (!e) return;
    e.hp    = Math.round(e.hp    * _hpMult(floor));
    e.maxHp = e.hp;
    e.damage = Math.round(e.damage * _damageMult(floor));
    e.speed  = e.speed * _speedMult(floor);
    rt.creatures.push(e);
    // skull_swarmer: spawn swarmSize-1 extra in a 40-unit cluster
    if (e._typeData && e._typeData.swarmSize && e._typeData.swarmSize > 1) {
      for (let s = 1; s < e._typeData.swarmSize; s++) {
        const sx = x + (Math.random() - 0.5) * 40;
        const sy = y + (Math.random() - 0.5) * 40;
        const se = WG.HuntEnemies.spawn(type, sx, sy);
        if (!se) continue;
        se.hp = Math.round(se.hp * _hpMult(floor));
        se.maxHp = se.hp;
        se.damage = Math.round(se.damage * _damageMult(floor));
        se.speed  = se.speed * _speedMult(floor);
        rt.creatures.push(se);
      }
    }
  }

  // Concern B: spawn mini-boss at 70% of floor time
  function _spawnMiniBoss(rt) {
    const bossId = BOSS_POOL[Math.floor(Math.random() * BOSS_POOL.length)];
    const b = WG.HuntBosses.spawn(bossId, rt.mapW * 0.5, 100);
    if (!b) return;
    const scaledHp = TUNABLES.MINIBOSS_HP_BASE + rt.floor * TUNABLES.MINIBOSS_HP_PER_FLOOR;
    b.hp = scaledHp; b.maxHp = scaledHp;
    rt.boss = b;
    WG.Engine.emit('boss:spawned', { boss: b });
  }

  // Concern B: wave spawner tick
  function _tickSpawner(rt, dt) {
    if (rt.floorCleared || rt.buffPickActive) return;
    rt.spawnAccum += dt * _spawnRate(rt.floor);
    while (rt.spawnAccum >= 1) { rt.spawnAccum -= 1; _spawnOneEnemy(rt); }
    if (!rt.miniBossSpawned && rt.floorElapsed >= rt.floorDuration * TUNABLES.MINIBOSS_AT_FLOOR_PCT) {
      _spawnMiniBoss(rt);
      rt.miniBossSpawned = true;
    }
  }

  // Concern B: projectile tick (mirrors wg-game.js rAF projectile block)
  function _tickProjectiles(rt, dt) {
    // Player projectiles
    for (let i = rt.projectiles.length - 1; i >= 0; i--) {
      const p = rt.projectiles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.lifetime -= dt;
      if (p.lifetime <= 0) { rt.projectiles.splice(i, 1); continue; }
      let hit = null;
      for (const c of rt.creatures) {
        if (c.hp <= 0) continue;
        const dx = c.x - p.x, dy = c.y - p.y;
        const r = (c.size / 2) + 6;
        if (dx*dx + dy*dy < r*r) { hit = c; break; }
      }
      if (!hit && rt.boss && rt.boss.hp > 0) {
        const dx = rt.boss.x - p.x, dy = rt.boss.y - p.y;
        const r = (rt.boss.size / 2) + 8;
        if (dx*dx + dy*dy < r*r) hit = rt.boss;
      }
      if (hit) {
        if (hit === rt.boss) {
          hit.hp -= p.damage;
          WG.Engine.emit('boss:damaged', { boss: hit, amount: p.damage });
          if (hit.hp <= 0) { WG.Engine.emit('boss:defeated', { boss: hit }); rt.bossDefeated = true; }
        } else {
          WG.HuntEnemies.damage(hit, p.damage, p.sourceType ? { type: p.sourceType } : null);
        }
        if (p.areaR > 0) {
          for (const c of rt.creatures) {
            if (c.hp <= 0 || c === hit) continue;
            const dx = c.x - p.x, dy = c.y - p.y;
            if (dx*dx + dy*dy < p.areaR * p.areaR)
              WG.HuntEnemies.damage(c, Math.floor(p.damage * 0.6), null);
          }
        }
        rt.projectiles.splice(i, 1);
      }
    }
    // Enemy projectiles
    for (let i = rt.enemyProjectiles.length - 1; i >= 0; i--) {
      const p = rt.enemyProjectiles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.lifetime -= dt;
      if (p.lifetime <= 0) { rt.enemyProjectiles.splice(i, 1); continue; }
      const pl = rt.player;
      const dx = pl.x - p.x, dy = pl.y - p.y;
      if (dx*dx + dy*dy < 14*14) {
        WG.HuntPlayer.takeDamage(p.damage, { type: 'enemy-proj' });
        rt.enemyProjectiles.splice(i, 1);
      }
    }
  }

  // ─── Concern C: buff picker UI ────────────────────────────────────────────
  // Full-screen overlay between floors. 3 cards face-up. Tap → apply + advance.
  function _showBuffPicker(rt) {
    rt.buffPickActive = true;
    const cards = WG.HuntTowerBuffs.roll(3, rt.floor);

    const overlay = document.createElement('div');
    overlay.id = 'wg-buff-picker';
    overlay.style.cssText = [
      'position:fixed;inset:0;z-index:2200;display:flex;flex-direction:column;',
      'align-items:center;justify-content:center;background:rgba(0,0,0,0.84);',
    ].join('');

    overlay.innerHTML = `
      <div style="font-family:Georgia,serif;font-size:19px;font-weight:800;color:#f8d060;
        letter-spacing:2px;margin-bottom:20px;text-shadow:0 0 12px rgba(240,192,64,0.5);">
        CHOOSE A POWER
      </div>
      <div id="wg-buff-cards" style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;
        padding:0 12px;max-width:560px;"></div>
    `;
    document.body.appendChild(overlay);

    const container = document.getElementById('wg-buff-cards');
    for (const card of cards) {
      const rc = WG.HuntTowerBuffs.getRarityColors(card.rarity);
      // Upgrade check: if already have this buff and it upgrades
      const existingCount = rt.buffStack.filter(b => b === card.id).length;
      const upgCard = (existingCount > 0 && card.upgradeTo)
        ? WG.HuntTowerBuffs.getCard(card.upgradeTo) : null;
      const displayName = upgCard ? upgCard.name + ' ↑' : card.name;
      const displayDesc  = upgCard ? upgCard.desc  : card.desc;
      const rarityLabel  = card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1);

      const el = document.createElement('div');
      el.style.cssText = [
        `background:${rc.bg};border:2px solid ${rc.border};border-radius:12px;`,
        'padding:18px 14px;width:140px;min-height:160px;',
        'display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;',
        `box-shadow:0 0 18px ${rc.glow},0 4px 12px rgba(0,0,0,0.7);`,
        'cursor:pointer;transition:transform 100ms ease,box-shadow 100ms ease;position:relative;',
      ].join('');
      el.innerHTML = `
        <div style="position:absolute;top:7px;right:8px;font-size:8px;font-weight:700;
          letter-spacing:1px;color:${rc.border};text-transform:uppercase;">${rarityLabel}</div>
        <div style="font-size:26px;margin-bottom:8px;">${card.icon}</div>
        <div style="font-size:11px;font-weight:700;color:${rc.text};letter-spacing:0.5px;
          margin-bottom:5px;">${displayName}</div>
        <div style="font-size:10px;color:${rc.text};opacity:0.72;line-height:1.4;">${displayDesc}</div>
      `;
      el.addEventListener('pointerenter', () => {
        el.style.transform = 'scale(1.06)';
        el.style.boxShadow = `0 0 28px ${rc.glow},0 6px 18px rgba(0,0,0,0.8)`;
      });
      el.addEventListener('pointerleave', () => {
        el.style.transform = 'scale(1)';
        el.style.boxShadow = `0 0 18px ${rc.glow},0 4px 12px rgba(0,0,0,0.7)`;
      });
      el.addEventListener('click', () => {
        el.style.transition = 'all 180ms ease';
        el.style.transform = 'scale(0.88) translateY(-16px)';
        el.style.opacity = '0';
        const applyId = upgCard ? upgCard.id : card.id;
        WG.HuntTowerBuffs.apply(applyId, rt);
        setTimeout(() => {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
          rt.buffPickActive = false;
          advanceFloor(rt);
        }, 180);
      });
      container.appendChild(el);
    }
  }

  // ─── Concern D: milestone loot tables ────────────────────────────────────
  const MILESTONE_LOOT = {
    5:  { gold:20,  gems:1, frags:1,  rareMats:0 },
    10: { gold:50,  gems:3, frags:5,  rareMats:0 },
    15: { gold:100, gems:5, frags:10, rareMats:1 },
  };

  function _getMilestoneLoot(floor) {
    if (MILESTONE_LOOT[floor]) return MILESTONE_LOOT[floor];
    const factor = Math.floor(floor / 5);
    return { gold: factor * 40, gems: factor * 2, frags: factor * 4, rareMats: Math.max(0, Math.floor(factor / 3)) };
  }

  // Concern D: floor-clear event — grants gold/frags, routes to chest or buff picker
  function _onFloorClear(rt) {
    if (rt.floorCleared) return;
    rt.floorCleared = true;
    rt.creatures = [];
    rt.boss = null;
    rt.drops = [];

    // Grant floor gold + frag chance
    rt.goldEarned += rt.floor * 50;
    if (Math.random() < 0.25) rt.fragsEarned++;

    // "FLOOR N CLEARED" celebration text
    _showFloorClearedFX(rt.floor);

    const isMilestone = rt.floor % 5 === 0;
    if (isMilestone) {
      rt.milestoneChestActive = true;
      setTimeout(() => _showMilestoneChest(rt), 800);
    } else {
      setTimeout(() => _showBuffPicker(rt), 600);
    }
  }

  function _showFloorClearedFX(floor) {
    const el = document.createElement('div');
    el.style.cssText = [
      'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);',
      'z-index:1900;pointer-events:none;',
      'font-family:Georgia,serif;font-size:30px;font-weight:800;letter-spacing:3px;',
      'color:#f0d060;text-shadow:0 0 20px rgba(240,192,64,0.8),0 2px 4px rgba(0,0,0,0.9);',
      'transition:opacity 400ms ease-out,transform 400ms ease-out;',
    ].join('');
    el.textContent = `FLOOR ${floor} CLEARED`;
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-70%)'; }, 700);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 1200);
  }

  // Concern D: milestone chest overlay
  function _showMilestoneChest(rt) {
    const floor = rt.floor;
    const loot  = _getMilestoneLoot(floor);
    const rareMatsRow = loot.rareMats > 0
      ? `<div style="color:#a060ff">+ ${loot.rareMats} Rare Mat${loot.rareMats>1?'s':''}</div>` : '';
    const bonusLegendary = floor >= 20
      ? '<div style="color:#c89820;margin-top:4px;">+ 1 Legendary Buff Pre-Applied!</div>' : '';

    const overlay = document.createElement('div');
    overlay.id = 'wg-milestone-chest';
    overlay.style.cssText = [
      'position:fixed;inset:0;z-index:2100;display:flex;align-items:center;justify-content:center;',
      'background:rgba(0,0,0,0.76);',
    ].join('');
    overlay.innerHTML = `
      <div style="background:linear-gradient(145deg,#2a1c04,#100c02);border:2px solid #c09018;
        border-radius:16px;padding:28px 28px;max-width:300px;width:88%;text-align:center;
        box-shadow:0 0 40px rgba(192,144,24,0.4),0 8px 32px rgba(0,0,0,0.8);">
        <div style="font-family:Georgia,serif;font-size:20px;font-weight:800;color:#f8d060;
          letter-spacing:2px;margin-bottom:10px;">🏆 MILESTONE!</div>
        <div style="font-size:48px;margin:6px 0;">📦</div>
        <div style="font-size:13px;color:#d0a040;font-weight:700;margin-bottom:14px;">
          FLOOR ${floor} CHEST
        </div>
        <div style="font-size:13px;color:#f0d090;line-height:1.9;">
          <div>+ ${loot.gold} 🪙</div>
          <div>+ ${loot.gems} 💎</div>
          <div>+ ${loot.frags} Frags</div>
          ${rareMatsRow}${bonusLegendary}
        </div>
        <button id="wg-chest-open-btn" style="
          margin-top:18px;padding:12px 28px;border-radius:28px;border:2px solid #f8d060;
          background:linear-gradient(to bottom,#c09018,#7a5c0a);color:#fff8e0;
          font-size:15px;font-weight:800;letter-spacing:2px;cursor:pointer;
          box-shadow:0 4px 12px rgba(192,144,24,0.4);transition:transform 80ms ease;width:200px;">
          TAP TO OPEN
        </button>
      </div>
    `;
    document.body.appendChild(overlay);

    const btn = document.getElementById('wg-chest-open-btn');
    btn.addEventListener('pointerdown', () => { btn.style.transform = 'scale(0.95)'; });
    btn.addEventListener('pointerup',   () => { btn.style.transform = 'scale(1)'; });
    btn.addEventListener('click', () => {
      WG.State.grant('coins', loot.gold);
      if (loot.gems)     WG.State.grant('diamonds', loot.gems);
      if (loot.frags)    WG.State.get().forge.craftFragments += loot.frags;
      // Floor 20+: pre-apply a random legendary buff
      if (floor >= 20 && WG.HuntTowerBuffs) {
        const bonus = WG.HuntTowerBuffs.roll(1, floor);
        if (bonus.length) WG.HuntTowerBuffs.apply(bonus[0].id, rt);
      }
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      rt.milestoneChestActive = false;
      _showBuffPicker(rt);
    });
  }

  // Concern D: advance to next floor after buff pick
  function advanceFloor(rt) {
    // Floor-skip buff: grant rewards for the skipped floor then increment twice
    if (rt._pendingFloorSkip) {
      rt._pendingFloorSkip = false;
      rt.goldEarned += (rt.floor + 1) * 50;
      rt.floor++;
      WG.Engine.emit('tower:floor-skip', { floor: rt.floor });
    }
    rt.floor++;
    rt.floorElapsed    = 0;
    rt.spawnAccum      = 0;
    rt.floorDuration   = _floorDurationSec(rt.floor);
    rt.floorCleared    = false;
    rt.miniBossSpawned = false;
    rt.bossDefeated    = false;
    rt.boss            = null;
    rt.creatures       = [];
    rt.drops           = [];
    rt.projectiles     = [];
    rt.enemyProjectiles= [];
    rt.buffPickActive  = false;
    if (rt.player) {
      rt.player.x = rt.mapW * 0.5;
      rt.player.y = rt.mapH * 0.5;
      rt.player.vx = rt.player.vy = 0;
    }
    WG.Engine.emit('tower:floor-start', { floor: rt.floor });
    _showFloorBanner(rt.floor);
  }

  function _showFloorBanner(floor) {
    const el = document.createElement('div');
    el.style.cssText = [
      'position:fixed;top:40%;left:50%;transform:translate(-50%,-50%);',
      'z-index:1900;pointer-events:none;',
      'font-family:Georgia,serif;font-size:26px;font-weight:800;letter-spacing:4px;',
      'color:#e0d8f8;text-shadow:0 0 16px rgba(160,120,240,0.8),0 2px 4px rgba(0,0,0,0.9);',
      'opacity:0;transition:opacity 200ms ease-in;',
    ].join('');
    el.textContent = `FLOOR ${floor}`;
    document.body.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = '1'; });
    setTimeout(() => { el.style.opacity = '0'; }, 1000);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 1400);
  }

  // ─── Concern E: death + continue + run summary ───────────────────────────
  function onPlayerDeath(rt) {
    if (!rt || rt.mode !== 'tower') return;
    if (rt._towerRevives > 0) {
      rt._towerRevives--;
      const p = rt.player;
      if (p) p.hp = Math.floor(p.maxHp * 0.5);
      WG.Engine.emit('tower:revive', { floor: rt.floor });
      return;
    }
    rt.pendingDeath = true;
    setTimeout(() => showDeathScreen(rt), 1200);
  }

  function showDeathScreen(rt) {
    if (!rt.pendingDeath) return;
    const cost = continueCost(rt.floor);
    const gems = WG.State.get().currencies.diamonds;
    const canContinue = rt.continueCount < TUNABLES.MAX_CONTINUES && gems >= cost;

    const overlay = document.createElement('div');
    overlay.id = 'wg-tower-death';
    overlay.style.cssText = [
      'position:fixed;inset:0;z-index:2300;display:flex;align-items:center;justify-content:center;',
      'background:rgba(0,0,0,0.88);',
    ].join('');

    const continueHtml = canContinue
      ? `<button id="wg-death-continue" style="
          display:block;width:220px;padding:13px 0;margin:0 auto 10px;border-radius:28px;
          border:2px solid #4488ff;background:linear-gradient(to bottom,#2255cc,#112288);
          color:#c8e0ff;font-size:15px;font-weight:800;letter-spacing:1px;cursor:pointer;">
          CONTINUE 💎×${cost}</button>`
      : `<div style="font-size:12px;color:#888;margin-bottom:10px;">
          ${rt.continueCount >= TUNABLES.MAX_CONTINUES ? 'No continues left' : `Need ${cost} 💎`}
         </div>`;

    overlay.innerHTML = `
      <div style="background:linear-gradient(145deg,#0e0408,#1a0608);border:2px solid #882020;
        border-radius:16px;padding:30px 24px;max-width:300px;width:88%;text-align:center;
        box-shadow:0 0 40px rgba(160,20,20,0.4),0 8px 32px rgba(0,0,0,0.8);">
        <div style="font-size:40px;margin-bottom:8px;">💀</div>
        <div style="font-family:Georgia,serif;font-size:22px;font-weight:800;color:#f04040;
          letter-spacing:2px;margin-bottom:4px;">YOU FELL</div>
        <div style="font-size:13px;color:#c08080;margin-bottom:20px;">Floor ${rt.floor}</div>
        ${continueHtml}
        <button id="wg-death-end" style="
          display:block;width:220px;padding:12px 0;margin:0 auto;border-radius:28px;
          border:2px solid #664444;background:linear-gradient(to bottom,#3a1010,#220808);
          color:#d08080;font-size:14px;font-weight:700;letter-spacing:1px;cursor:pointer;">
          END RUN</button>
      </div>`;
    document.body.appendChild(overlay);

    if (canContinue) {
      document.getElementById('wg-death-continue').addEventListener('click', () => {
        if (!WG.State.spend('diamonds', cost)) return;
        rt.continueCount++;
        rt.pendingDeath = false;
        const p = rt.player;
        if (p) p.hp = Math.floor(p.maxHp * 0.5);
        rt.creatures = []; rt.projectiles = []; rt.enemyProjectiles = [];
        rt.boss = null; rt.bossDefeated = false; rt.floorCleared = false;
        rt.miniBossSpawned = false; rt.spawnAccum = 0; rt.floorElapsed = 0;
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        WG.Engine.emit('tower:continued', { floor: rt.floor });
      });
    }

    document.getElementById('wg-death-end').addEventListener('click', () => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      endRun(rt, 'death');
    });
  }

  function endRun(rt, reason) {
    const s = WG.State.get();
    const isNewRecord = rt.floor > s.towerProgress.peakFloor;
    if (isNewRecord) s.towerProgress.peakFloor = rt.floor;
    WG.State.grant('coins', rt.goldEarned);
    if (rt.fragsEarned > 0) s.forge.craftFragments += rt.fragsEarned;
    if (rt.floor >= 5) WG.State.grantEnergy(WG.State.ENERGY_TUNABLES.WIN_REFUND, 'tower-run');
    WG.Engine.emit('tower:run-end', { floor: rt.floor, reason, isNewRecord });
    towerRuntime = null;
    setTimeout(() => showRunSummary(rt, isNewRecord), 200);
  }

  function showRunSummary(rt, isNewRecord) {
    ['wg-buff-picker','wg-milestone-chest','wg-tower-death'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });

    const overlay = document.createElement('div');
    overlay.id = 'wg-run-summary';
    overlay.style.cssText = [
      'position:fixed;inset:0;z-index:2400;display:flex;align-items:center;justify-content:center;',
      'background:rgba(0,0,0,0.92);overflow-y:auto;',
    ].join('');

    const newRecordBadge = isNewRecord
      ? '<div style="color:#f8d060;font-size:11px;font-weight:800;letter-spacing:2px;margin-bottom:4px;">✨ NEW RECORD</div>'
      : '';

    const buffsHtml = rt.buffStack.length
      ? rt.buffStack.slice(-8).map(id => {
          const c = WG.HuntTowerBuffs.getCard(id);
          return c ? `<span style="font-size:14px" title="${c.name}">${c.icon}</span>` : '';
        }).join(' ')
      : '<span style="color:#666;font-size:11px">—</span>';

    overlay.innerHTML = `
      <div style="background:linear-gradient(145deg,#080410,#12081a);border:2px solid #5030a0;
        border-radius:16px;padding:28px 24px;max-width:320px;width:90%;text-align:center;
        box-shadow:0 0 40px rgba(80,48,160,0.4),0 8px 32px rgba(0,0,0,0.8);">
        ${newRecordBadge}
        <div style="font-family:Georgia,serif;font-size:20px;font-weight:800;color:#c0a8f0;
          letter-spacing:2px;margin-bottom:16px;">RUN COMPLETE</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;
          font-size:13px;color:#c0c0d8;margin-bottom:16px;text-align:left;">
          <div>🏰 Floor</div><div style="color:#e0d8ff;font-weight:700">${rt.floor}</div>
          <div>⚔ Kills</div><div style="color:#e0d8ff;font-weight:700">${rt.kills}</div>
          <div>🪙 Gold</div><div style="color:#e0d8ff;font-weight:700">${rt.goldEarned}</div>
          <div>🧩 Frags</div><div style="color:#e0d8ff;font-weight:700">${rt.fragsEarned}</div>
        </div>
        <div style="font-size:11px;color:#8880a8;margin-bottom:4px;text-align:left;">BUFFS COLLECTED</div>
        <div style="background:#0c0820;border-radius:8px;padding:8px;margin-bottom:16px;
          min-height:28px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;">${buffsHtml}</div>
        ${_buildLeaderboardHTML(rt.floor)}
        <div style="display:flex;gap:10px;margin-top:18px;">
          <button id="wg-summary-again" style="flex:1;padding:12px 0;border-radius:24px;
            border:2px solid #5030a0;background:linear-gradient(to bottom,#3820a0,#200c60);
            color:#c0a8f0;font-size:14px;font-weight:800;cursor:pointer;">TRY AGAIN</button>
          <button id="wg-summary-lobby" style="flex:1;padding:12px 0;border-radius:24px;
            border:2px solid #443366;background:linear-gradient(to bottom,#2a1a50,#180c30);
            color:#9880c8;font-size:14px;font-weight:700;cursor:pointer;">LOBBY</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    document.getElementById('wg-summary-again').addEventListener('click', () => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (WG.Game && typeof WG.Game.startTowerRun === 'function') WG.Game.startTowerRun();
    });
    document.getElementById('wg-summary-lobby').addEventListener('click', () => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (WG.Game && typeof WG.Game.exitHunt === 'function') WG.Game.exitHunt();
    });
  }

  // ─── Concern G: leaderboard stub — TODO: Phase 4 server sync ─────────────
  function _buildLeaderboardHTML(playerFloor) {
    const stub = [
      { name:'Wraithwalker', floor:47 },
      { name:'DuskReaper',   floor:38 },
      { name:'VoidBound',    floor:31 },
      { name:'YOU',          floor:playerFloor, isPlayer:true },
      { name:'Ashcaller',    floor:22 },
    ].sort((a,b) => b.floor - a.floor).slice(0,5);

    const rows = stub.map((e,i) => {
      const medal = i===0 ? '🥇' : i===1 ? '🥈' : i===2 ? '🥉' : `${i+1}.`;
      const hi = e.isPlayer ? 'background:#1a0830;' : '';
      return `<div style="display:flex;align-items:center;gap:8px;padding:4px 6px;border-radius:6px;${hi}">
        <span style="width:20px;font-size:12px;text-align:center;">${medal}</span>
        <span style="flex:1;font-size:11px;color:${e.isPlayer?'#c0a8f0':'#a090b8'};font-weight:${e.isPlayer?700:400};">${e.name}</span>
        <span style="font-size:11px;color:${e.isPlayer?'#e0d8ff':'#9080a8'};font-weight:700;">Fl.${e.floor}</span>
      </div>`;
    }).join('');

    return `
      <div style="font-size:11px;color:#8880a8;margin-bottom:4px;text-align:left;">
        LEADERBOARD <span style="color:#554;font-size:10px;">— TODO: Phase 4 server sync</span></div>
      <div style="background:#0c0820;border-radius:8px;padding:6px;margin-bottom:4px;">${rows}</div>`;
  }

  // ─── Concern A: helpers ───────────────────────────────────────────────────
  function _floorDurationSec(floor) {
    const steps = Math.floor(floor / TUNABLES.FLOOR_DURATION_STEP);
    return Math.max(TUNABLES.FLOOR_DURATION_MIN,
      TUNABLES.FLOOR_DURATION_BASE - steps * TUNABLES.FLOOR_DURATION_DECAY * TUNABLES.FLOOR_DURATION_STEP);
  }

  function continueCost(floor) {
    if (floor <= 4) return TUNABLES.CONTINUE_COST_LOW;
    if (floor <= 9) return TUNABLES.CONTINUE_COST_MID;
    return TUNABLES.CONTINUE_COST_HIGH;
  }

  function getRuntime() { return towerRuntime; }

  // ─── Concern A: init ─────────────────────────────────────────────────────
  function init() {
    WG.Engine.on('player:died', () => {
      if (towerRuntime && towerRuntime.mode === 'tower') onPlayerDeath(towerRuntime);
    });
  }

  window.WG.HuntTower = {
    init, startTower, tickFloor, getRuntime, advanceFloor, endRun, TUNABLES,
  };
})();
