// WG.RaidSim — deterministic 3-min raid simulator
// seed = (attackerId + '|' + defenderId + '|' + layoutHash + '|' + stocksHash)
// MVP: stat-math resolution (no frame loop). Real frame replay is V2.
(function(){'use strict';

  const RAID_DURATION_S = 180;
  const WIN_THRESHOLD   = 0.80;   // fraction of structures destroyed to win
  const RESPAWN_PENALTY_S = 15;   // seconds lost per attacker death
  const RESPAWN_HP_FRAC   = 0.50; // attacker respawns at 50% HP

  // ── xorshift32 PRNG (deterministic from numeric seed) ────────────────────
  function makeRng(seed) {
    let s = (seed >>> 0) || 1;
    return function() {
      s ^= s << 13; s ^= s >> 17; s ^= s << 5;
      return (s >>> 0) / 4294967296;
    };
  }

  function _hashStr(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
  }

  function makeSeed(attackerId, defenderId, layoutHash, stocksHash) {
    return _hashStr(String(attackerId) + '|' + String(defenderId) + '|' + String(layoutHash) + '|' + String(stocksHash));
  }

  // ── BUILD STRUCTURES from layout slots ───────────────────────────────────
  function _buildStructures(slots) {
    const out = [];
    const cfg = WG.RaidLayout.SLOT_CONFIG;
    for (let i = 0; i < slots.length; i++) {
      const entry = slots[i];
      if (!entry || !entry.defenseId) continue;
      const slotDef = cfg[i];
      let maxHp = 100;
      if (slotDef.type === 'turret') {
        const t = WG.RaidDefenses.getTurret(entry.defenseId);
        if (t) maxHp = t.hp;
      } else if (slotDef.type === 'trap') {
        const t = WG.RaidDefenses.getTrap(entry.defenseId);
        if (t) maxHp = t.hp;
      } else {
        const t = WG.RaidDefenses.getWall(entry.defenseId);
        if (t) maxHp = t.hp;
      }
      out.push({ id: 'struct_' + i, slotIdx: i, type: slotDef.type, defenseId: entry.defenseId, hp: maxHp, maxHp });
    }
    return out;
  }

  // ── SIMULATE ─────────────────────────────────────────────────────────────
  // params = {
  //   attackerCharId, attackerHp, attackerDps,
  //   layout: { slots[] },
  //   attackerDeaths: [output-init],
  //   seed (string or number),
  // }
  function simulate(params) {
    const seed       = typeof params.seed === 'number' ? params.seed : _hashStr(String(params.seed));
    const rng        = makeRng(seed);
    const structures = _buildStructures(params.layout.slots);
    const totalCount = structures.length;

    if (totalCount === 0) {
      return { result: 'win', damageDealt: 0, attackerDeaths: 0, structuresDestroyed: 0, replayLog: [] };
    }

    let attackerHp    = params.attackerHp  || 100;
    const attackerDps = params.attackerDps || 20;
    let elapsed       = 0;
    let deaths        = 0;
    const log         = [];

    // Per-second turret aggregate DPS against attacker
    function turretDps() {
      let d = 0;
      for (const s of structures) {
        if (s.hp <= 0 || s.type !== 'turret') continue;
        const def = WG.RaidDefenses.getTurret(s.defenseId);
        if (def) d += def.damage * def.fireRateHz;
      }
      return d;
    }

    // Find nearest alive structure (simple sequential — MVP)
    function nextTarget() {
      for (const s of structures) { if (s.hp > 0) return s; }
      return null;
    }

    while (elapsed < RAID_DURATION_S) {
      const tdps = turretDps();
      const target = nextTarget();

      if (!target) break; // all destroyed

      // 1-second tick
      elapsed += 1;

      // Turrets fire at attacker
      const turretDmg = tdps * (0.85 + rng() * 0.30); // ±15% variance
      attackerHp -= turretDmg;
      if (turretDmg > 0) {
        log.push({ tFrame: elapsed, eventType: 'turret_fire', actorId: 'defense', targetId: 'attacker', value: +turretDmg.toFixed(1) });
      }

      // Attacker attacks target structure
      const atkDmg = attackerDps * (0.85 + rng() * 0.30);
      target.hp -= atkDmg;
      log.push({ tFrame: elapsed, eventType: 'attacker_attack', actorId: 'attacker', targetId: target.id, value: +atkDmg.toFixed(1) });

      if (target.hp <= 0) {
        target.hp = 0;
        log.push({ tFrame: elapsed, eventType: 'structure_destroyed', actorId: 'attacker', targetId: target.id, value: 0 });
      }

      // Trap triggers (simplified: each alive trap in path has 5% chance per second)
      for (const s of structures) {
        if (s.hp <= 0 || s.type !== 'trap') continue;
        if (rng() < 0.05) {
          const trapDef = WG.RaidDefenses.getTrap(s.defenseId);
          if (trapDef && trapDef.damage) {
            const trapDmg = Math.min(trapDef.damage * attackerHp, trapDef.maxHpDamageCap * params.attackerHp);
            attackerHp -= trapDmg;
            log.push({ tFrame: elapsed, eventType: 'trap_trigger', actorId: s.id, targetId: 'attacker', value: +trapDmg.toFixed(1) });
          }
        }
      }

      // Attacker death
      if (attackerHp <= 0) {
        deaths++;
        attackerHp = params.attackerHp * RESPAWN_HP_FRAC;
        elapsed += RESPAWN_PENALTY_S;
        log.push({ tFrame: elapsed, eventType: 'attacker_death', actorId: 'attacker', targetId: null, value: deaths });
        if (elapsed >= RAID_DURATION_S) break;
      }

      // Win check
      const destroyed = structures.filter(s => s.hp <= 0).length;
      if (destroyed / totalCount >= WIN_THRESHOLD) break;
    }

    const destroyed    = structures.filter(s => s.hp <= 0).length;
    const result       = destroyed / totalCount >= WIN_THRESHOLD ? 'win' : 'loss';
    const damageDealt  = structures.reduce((acc, s) => acc + (s.maxHp - Math.max(0, s.hp)), 0);

    return {
      result,
      damageDealt: Math.round(damageDealt),
      attackerDeaths: deaths,
      structuresDestroyed: destroyed,
      replayLog: log,
    };
  }

  // ── REWARD FORMULA ────────────────────────────────────────────────────────
  // Scales with target Power. Whale bases on leaderboard = big visible reward.
  function calcReward(result, targetPower, structuresDestroyed) {
    if (result === 'loss') return { coins: Math.floor(targetPower * 0.05), diamonds: 0, trophies: 0 };
    const base    = Math.floor(targetPower * 0.35);
    const destroy = Math.floor(structuresDestroyed * 8);
    const coins   = base + destroy;
    const diamonds = targetPower >= 1000 ? 5 : targetPower >= 500 ? 2 : 0;
    const trophies = Math.max(1, Math.floor(Math.log2(targetPower / 100 + 1)));
    return { coins, diamonds, trophies };
  }

  // ── SIMULATED LEADERBOARD (Phase-4 placeholder) ───────────────────────────
  // 5 opponents at varied Power tiers — replaced by real server data in Phase 4
  const SIM_LEADERBOARD = Object.freeze([
    { id: 'sim_001', name: 'IronFang',    power: 280,  portrait: '🗡',  layoutTier: 'light'  },
    { id: 'sim_002', name: 'VeilWarden',  power: 520,  portrait: '🌙',  layoutTier: 'medium' },
    { id: 'sim_003', name: 'ShadowMerk',  power: 890,  portrait: '👁',  layoutTier: 'heavy'  },
    { id: 'sim_004', name: 'WyrmBreaker', power: 1350, portrait: '🐉',  layoutTier: 'elite'  },
    { id: 'sim_005', name: 'VoidAnchor',  power: 2200, portrait: '💀',  layoutTier: 'max'    },
  ]);

  // Generate a plausible defense layout for a sim opponent based on tier
  function _simLayout(tier) {
    const traps  = Object.keys(WG.RaidDefenses.TRAP_TYPES);
    const walls  = Object.keys(WG.RaidDefenses.WALL_TYPES);
    const turrets = Object.keys(WG.RaidDefenses.TURRET_TYPES);
    const density = { light: 0.4, medium: 0.65, heavy: 0.85, elite: 1.0, max: 1.0 };
    const d = density[tier] || 0.5;
    const slots = new Array(14).fill(null);
    const cfg = WG.RaidLayout.SLOT_CONFIG;
    for (let i = 0; i < cfg.length; i++) {
      if (Math.random() > d) continue;
      if (cfg[i].type === 'wall')   slots[i] = { type: 'wall',   defenseId: walls[Math.floor(Math.random() * walls.length)] };
      if (cfg[i].type === 'trap')   slots[i] = { type: 'trap',   defenseId: traps[Math.floor(Math.random() * traps.length)] };
      if (cfg[i].type === 'turret') slots[i] = { type: 'turret', defenseId: turrets[Math.floor(Math.random() * turrets.length)] };
    }
    return { slots };
  }

  // Run a raid against a SIM_LEADERBOARD opponent
  function runVsSimOpponent(opponentId) {
    const opp = SIM_LEADERBOARD.find(o => o.id === opponentId);
    if (!opp) return null;

    const s           = WG.State.get();
    const player      = s.player;
    const attackerHp  = player.stats.hpMax || 100;
    const attackerDps = (player.stats.attack || 5) * 2.5;
    const defLayout   = _simLayout(opp.layoutTier);
    const stocksHash  = (s.forge.stocks.cannon_shots || []).length + (s.forge.stocks.walls || []).length;
    const seed        = makeSeed(player.activeCharacter, opp.id, WG.RaidLayout.hashLayout(defLayout.slots), stocksHash);

    const result = simulate({ attackerCharId: player.activeCharacter, attackerHp, attackerDps, layout: defLayout, seed });
    const reward = calcReward(result.result, opp.power, result.structuresDestroyed);
    return { opponent: opp, defLayout, result, reward };
  }

  window.WG = window.WG || {};
  window.WG.RaidSim = {
    simulate, makeSeed, calcReward,
    SIM_LEADERBOARD,
    runVsSimOpponent,
  };
})();
