// WG.HuntBosses — 6 bosses with distinct attack patterns
(function(){'use strict';
  const BOSSES = {
    pale_bride: {
      id:'pale_bride',  name:'Pale Bride',     hp: 380, speed: 22, damage: 18, contactCd:1.4, size:36, color:'#d8c0d0', accent:'#5a3050', xp:30,
      patterns:['summon_minions','triple_dash'], summonType:'sprite', summonCount:3, summonInterval:7.0,
    },
    frozen_crone: {
      id:'frozen_crone', name:'Frozen Crone',  hp: 520, speed: 16, damage: 22, contactCd:1.6, size:40, color:'#c8d8e8', accent:'#3a4a6a', xp:45,
      patterns:['ice_shards','area_freeze'], shardCount:5, shardSpeed:160, shardCd:3.5, areaFreezeR:80, areaFreezeCd:9.0,
    },
    autumn_lord: {
      id:'autumn_lord', name:'Autumn Lord',    hp: 720, speed: 24, damage: 28, contactCd:1.5, size:44, color:'#c08038', accent:'#5a3a18', xp:65,
      patterns:['leaf_storm','charge'], leafCount:8, leafSpeed:180, chargeSpeed:200, chargeCd:6.0,
    },
    temple_warden: {
      id:'temple_warden',name:'Temple Warden', hp: 980, speed: 20, damage: 35, contactCd:1.8, size:48, color:'#e8c060', accent:'#5a3818', xp:90,
      patterns:['shockwave','minion_squads'], shockwaveR:120, shockwaveCd:5.0, summonType:'walker', summonCount:2, summonInterval:8.0,
    },
    cave_mother: {
      id:'cave_mother', name:'Cave Mother',    hp: 1300,speed: 14, damage: 42, contactCd:2.0, size:56, color:'#3a2a3a', accent:'#1a1018', xp:120,
      patterns:['darkness_pulse','spawn_brood'], darknessR:140, darknessCd:7.0, broodType:'lurker', broodCount:5, broodInterval:10.0,
    },
    wraith_father: {
      id:'wraith_father',name:'The Wraith Father', hp:2400, speed: 26, damage: 50, contactCd:1.6, size:64, color:'#1a0a30', accent:'#6020a0', xp:250,
      patterns:['triple_phase','soul_volley','area_drain'],
      shardCount:12, shardSpeed:200, shardCd:4.5, areaR:160, areaCd:10.0, summonType:'caller', summonCount:3, summonInterval:12.0,
    },

    // ─── Post-launch ascended tier bosses ────────────────────────────────────
    // echo_throne_keeper — sigil-shaped entity, splits into 3 fragments at 50% HP.
    // All 3 fragments must die before the boss can be killed (see wg-game.js
    // enemy:killed handler + projectile immunity guard).
    echo_throne_keeper: {
      id:'echo_throne_keeper', name:'Echo Throne Keeper', hp:1800, speed:18, damage:45, contactCd:1.8, size:52, color:'#2a0850', accent:'#c060ff', xp:200,
      patterns:['fragment_split','sigil_burst'],
      shardCount:10, shardSpeed:175, shardCd:4.0,
      areaCd:8.0, areaR:130,
      splitThreshold:0.5, splitType:'sigil_drone', splitCount:3,
    },
    // wraith_father_echo — faded memory of the Wraith Father. Diminished HP/speed/damage
    // but visually the same silhouette washed pale. Summons memory_husks instead of callers.
    wraith_father_echo: {
      id:'wraith_father_echo', name:'Wraith Father Echo', hp:2000, speed:22, damage:42, contactCd:1.6, size:60, color:'#2a1040', accent:'#8040c0', xp:240,
      patterns:['soul_volley','area_drain','echo_summon'],
      shardCount:10, shardSpeed:180, shardCd:5.0,
      areaR:150, areaCd:9.0, summonType:'memory_husk', summonCount:2, summonInterval:14.0,
    },
  };

  function get(id) { return BOSSES[id]; }

  function spawn(id, x, y) {
    const b = BOSSES[id];
    if (!b) return null;
    return {
      isBoss: true,
      id: 'boss_' + id,
      type: id,
      x, y,
      vx: 0, vy: 0,
      hp: b.hp, maxHp: b.hp,
      damage: b.damage,
      speed: b.speed,
      size: b.size,
      attackTimer: 0,
      attackCooldown: b.contactCd,
      target: null,
      retargetTimer: 0,
      facing: 'S',
      _typeData: b,
      _patternTimers: {},
    };
  }

  // Boss tick: contact damage like normal enemies, plus pattern-driven specials
  function tickBoss(b, dt, runtime) {
    if (b.hp <= 0) return;
    const td = b._typeData;

    // Movement toward player (simple chase)
    const p = runtime.player;
    if (!p) return;
    const dx = p.x - b.x, dy = p.y - b.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const contactDist = b.size/2 + (p.size||10)/2;
    if (dist > contactDist + 4) {
      b.x += (dx/dist) * b.speed * dt;
      b.y += (dy/dist) * b.speed * dt;
    } else {
      b.attackTimer -= dt;
      if (b.attackTimer <= 0) {
        WG.HuntPlayer.takeDamage(b.damage, { type:'boss', id:b.id });
        WG.Engine.emit('boss:contact', { boss: b });
        b.attackTimer = b.attackCooldown;
      }
    }

    // Pattern timers
    if (td.summonInterval) {
      b._patternTimers.summon = (b._patternTimers.summon||0) - dt;
      if (b._patternTimers.summon <= 0) {
        b._patternTimers.summon = td.summonInterval;
        const t = td.summonType || td.broodType;
        const count = td.summonCount || td.broodCount || 2;
        for (let i = 0; i < count; i++) {
          const ang = Math.random() * Math.PI * 2;
          const r = 50 + Math.random() * 30;
          const e = WG.HuntEnemies.spawn(t, b.x + Math.cos(ang)*r, b.y + Math.sin(ang)*r);
          if (e) runtime.creatures.push(e);
        }
        WG.Engine.emit('boss:summon', { boss: b, count });
      }
    }
    if (td.shardCd) {
      b._patternTimers.shard = (b._patternTimers.shard||0) - dt;
      if (b._patternTimers.shard <= 0 && p) {
        b._patternTimers.shard = td.shardCd;
        const count = td.shardCount;
        for (let i = 0; i < count; i++) {
          const ang = Math.PI * 2 * (i / count) + (Math.random()-0.5)*0.2;
          runtime.enemyProjectiles.push({
            x: b.x, y: b.y,
            vx: Math.cos(ang) * td.shardSpeed,
            vy: Math.sin(ang) * td.shardSpeed,
            damage: Math.floor(b.damage * 0.4),
            lifetime: 2.0, ownerId: b.id,
          });
        }
        WG.Engine.emit('boss:shard', { boss: b, count });
      }
    }
    // Fragment split — one-time trigger at splitThreshold (default 50% HP).
    // Spawns splitCount creatures tagged as boss fragments; boss becomes immune
    // to projectile damage (enforced in wg-game.js) until all fragments die.
    // Fragment death + boss kill are handled by the enemy:killed listener in wg-game.js.
    if (td.splitThreshold && !b._splitDone && (b.hp / b.maxHp) <= td.splitThreshold) {
      b._splitDone = true;
      b._fragmentsAlive = td.splitCount;
      for (let i = 0; i < td.splitCount; i++) {
        const ang = Math.PI * 2 * (i / td.splitCount);
        const fe = WG.HuntEnemies.spawn(td.splitType, b.x + Math.cos(ang)*70, b.y + Math.sin(ang)*70);
        if (fe) {
          fe._isBossFragment = true;
          fe._bossRef = b;
          fe.hp = fe.maxHp = 120; // hardened fragment HP
          runtime.creatures.push(fe);
        }
      }
      WG.Engine.emit('boss:split', { boss: b, count: td.splitCount });
    }

    if (td.areaCd || td.areaFreezeCd || td.shockwaveCd || td.darknessCd) {
      const cd = td.areaCd || td.areaFreezeCd || td.shockwaveCd || td.darknessCd;
      b._patternTimers.area = (b._patternTimers.area||0) - dt;
      if (b._patternTimers.area <= 0) {
        b._patternTimers.area = cd;
        const r = td.areaR || td.areaFreezeR || td.shockwaveR || td.darknessR || 100;
        const ddx = p.x - b.x, ddy = p.y - b.y;
        if (ddx*ddx + ddy*ddy < r*r) {
          WG.HuntPlayer.takeDamage(Math.floor(b.damage * 0.55), { type:'boss-area', id:b.id });
        }
        WG.Engine.emit('boss:area', { boss: b, radius: r });
      }
    }
  }

  function init() {}
  window.WG.HuntBosses = { init, get, spawn, tickBoss, BOSSES };
})();
