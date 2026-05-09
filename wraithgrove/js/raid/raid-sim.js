// WG.RaidSim — deterministic 3-min raid simulator
// seed = (attackerId + '|' + defenderId + '|' + layoutHash + '|' + stocksHash)
// MVP: stat-math resolution (no frame loop). Real frame replay is V2.
// W-Squad-System-Full: squad units (archer + footman) participate in the sim tick.
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

  // ── SQUAD HP / DPS SCALING (reads forge-buildings TUNABLES via ForgeBuildings API) ──
  // Archer: fragile ranged DPS. Footman: melee tank, body-blocks traps.
  function _archerHp(level)   { return 20 + level * 10; }           // L1=30 … L20=220
  function _footmanHp(level)  { return 60 + level * 15; }           // L1=75 … L20=360
  function _archerDps(level)  { return 5  + level * 1.5; }          // L1=6.5 … L20=35
  function _footmanDps(level) { return 3  + level * 1.0; }          // L1=4   … L20=23

  // Build live squad unit objects from a squadPick { archer:bool, footman:bool }.
  // Reads WG.State + WG.ForgeBuildings at call time — call just before simulate().
  function buildSquadUnits(squadPick) {
    if (!squadPick) return [];
    const units = [];
    const s  = WG.State ? WG.State.get() : null;
    const fb = window.WG && WG.ForgeBuildings;
    if (!s) return units;

    if (squadPick.archer && s.forge.stocks.archer_squads >= 1) {
      const bowB    = s.forge.buildings.find(b => b.id === 'bow_range');
      const level   = bowB ? bowB.level : 1;
      const captains = fb ? fb.archerCaptainsAt(level) : 0;
      const baseDps = _archerDps(level);
      const dps     = captains >= 1 ? baseDps * 1.25 : baseDps; // Elite Captain +25% DPS
      const hp      = _archerHp(level);
      units.push({ type: 'archer',  hp, maxHp: hp, dps, captains, level });
    }
    if (squadPick.footman && s.forge.stocks.footman_squads >= 1) {
      const barrB   = s.forge.buildings.find(b => b.id === 'barracks');
      const level   = barrB ? barrB.level : 1;
      const captains = fb ? fb.footmanCaptainsAt(level) : 0;
      const baseHp  = _footmanHp(level);
      const hp      = captains >= 1 ? Math.round(baseHp * 1.20) : baseHp; // Banner Captain +20% HP
      const baseDps = _footmanDps(level);
      const dps     = captains >= 1 ? baseDps * 1.20 : baseDps;           // Banner Captain +20% DPS
      units.push({ type: 'footman', hp, maxHp: hp, dps, captains, level });
    }
    return units;
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
  //   squadUnits: [] — optional, from buildSquadUnits()
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
    const squadUnits  = (params.squadUnits || []).map(u => Object.assign({}, u)); // shallow copy so originals are clean
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

      // ── Squad units attack (archer = closest = current target; footman = same) ──
      const liveTgt = nextTarget(); // re-fetch in case just destroyed
      if (liveTgt) {
        for (const u of squadUnits) {
          if (u.hp <= 0) continue;
          const sqDmg = u.dps * (0.85 + rng() * 0.30);
          liveTgt.hp -= sqDmg;
          log.push({ tFrame: elapsed, eventType: 'squad_attack', actorId: u.type, targetId: liveTgt.id, value: +sqDmg.toFixed(1) });
          if (liveTgt.hp <= 0) {
            liveTgt.hp = 0;
            log.push({ tFrame: elapsed, eventType: 'structure_destroyed', actorId: u.type, targetId: liveTgt.id, value: 0 });
            break; // target is gone — remaining squad find next target next tick
          }
        }
      }

      // ── Turrets hit squad units (archer absorbs 30%, footman 20% of turret DPS) ──
      for (const u of squadUnits) {
        if (u.hp <= 0) continue;
        const frac   = u.type === 'archer' ? 0.30 : 0.20;
        const sqTDmg = tdps * frac * (0.85 + rng() * 0.30);
        u.hp -= sqTDmg;
        if (u.hp <= 0) {
          u.hp = 0;
          log.push({ tFrame: elapsed, eventType: 'squad_unit_death', actorId: u.type, targetId: null, value: 0 });
        }
      }

      // ── Trap triggers — footman body-block reduces trigger prob 5% → 3% ──
      // attackerCounterChance (0.0–1.0): probability the attacker successfully counters
      // each triggered trap within the 400ms counter window. Default 0 (no auto-counters).
      const aliveFoot      = squadUnits.some(u => u.type === 'footman' && u.hp > 0);
      const trapProb       = aliveFoot ? 0.03 : 0.05;
      const counterChance  = (typeof params.attackerCounterChance === 'number') ? params.attackerCounterChance : 0.0;

      for (const s of structures) {
        if (s.hp <= 0 || s.type !== 'trap') continue;
        if (rng() < trapProb) {
          const trapDef = WG.RaidDefenses.getTrap(s.defenseId);
          if (!trapDef) continue;

          const countered = rng() < counterChance;
          if (countered) {
            // Telegraph fired, player matched counterAction — trap harmless, buff spawned
            log.push({
              tFrame: elapsed,
              eventType: 'trap:countered',
              actorId: s.id,
              targetId: 'attacker',
              trapId: s.defenseId,
              counterAction: trapDef.counterAction,
              counterRewardBuff: trapDef.counterRewardBuff,
              value: 0,
            });
          } else {
            // Counter missed or not attempted — full trap effect
            let trapDmg = 0;
            if (trapDef.damagePctOnHit > 0) {
              trapDmg = Math.min(trapDef.damagePctOnHit * params.attackerHp, 0.25 * params.attackerHp);
              attackerHp -= trapDmg;
            }
            log.push({
              tFrame: elapsed,
              eventType: 'trap:hit',
              actorId: s.id,
              targetId: 'attacker',
              trapId: s.defenseId,
              counterAction: trapDef.counterAction,
              value: +trapDmg.toFixed(1),
            });
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
      squadUnits: squadUnits.map(u => ({ type: u.type, hp: Math.max(0, u.hp), maxHp: u.maxHp, survived: u.hp > 0 })),
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

  // Run a raid against a SIM_LEADERBOARD opponent.
  // squadPick = { archer: bool, footman: bool } — optional; consumed from stocks inside simulate caller.
  function runVsSimOpponent(opponentId, squadPick) {
    const opp = SIM_LEADERBOARD.find(o => o.id === opponentId);
    if (!opp) return null;

    const s           = WG.State.get();
    const player      = s.player;
    const attackerHp  = player.stats.hpMax || 100;
    const attackerDps = (player.stats.attack || 5) * 2.5;
    const defLayout   = _simLayout(opp.layoutTier);
    const stocksHash  = (s.forge.stocks.cannon_shots || []).length + (s.forge.stocks.walls || []).length;
    const seed        = makeSeed(player.activeCharacter, opp.id, WG.RaidLayout.hashLayout(defLayout.slots), stocksHash);
    const squadUnits  = buildSquadUnits(squadPick || {});

    const result = simulate({ attackerCharId: player.activeCharacter, attackerHp, attackerDps, layout: defLayout, seed, squadUnits });
    const reward = calcReward(result.result, opp.power, result.structuresDestroyed);
    return { opponent: opp, defLayout, result, reward, squadPick: squadPick || {} };
  }

  // ── DRAW SQUAD UNIT — procedural canvas sprite (screen-space coords) ─────────
  // ctx: CanvasRenderingContext2D, sx/sy: screen center of unit, hp/maxHp: current state.
  function drawSquadUnit(ctx, sx, sy, unitType, hp, maxHp) {
    const dead = hp <= 0;
    ctx.save();
    ctx.globalAlpha = dead ? 0.3 : 1.0;

    if (unitType === 'archer') {
      // Small green silhouette + bow (ranged, fragile)
      ctx.fillStyle = dead ? '#446644' : '#88cc88';
      ctx.beginPath(); ctx.arc(sx, sy - 8, 3, 0, Math.PI * 2); ctx.fill();   // head
      ctx.fillRect(sx - 2, sy - 5, 4, 7);                                     // body
      // Bow arc on right side
      ctx.strokeStyle = dead ? '#446644' : '#66aa44';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sx + 4, sy - 4, 5, -Math.PI * 0.6, Math.PI * 0.6);
      ctx.stroke();
      // Bowstring
      ctx.beginPath();
      ctx.moveTo(sx + 4 + 5 * Math.cos(-Math.PI * 0.6), sy - 4 + 5 * Math.sin(-Math.PI * 0.6));
      ctx.lineTo(sx + 4 + 5 * Math.cos( Math.PI * 0.6), sy - 4 + 5 * Math.sin( Math.PI * 0.6));
      ctx.stroke();
    } else {
      // Small dark silhouette + shield (footman, melee tank)
      ctx.fillStyle = dead ? '#334455' : '#778899';
      ctx.beginPath(); ctx.arc(sx, sy - 9, 3.5, 0, Math.PI * 2); ctx.fill(); // head
      ctx.fillRect(sx - 3, sy - 5.5, 6, 8);                                   // body
      // Shield (left side)
      ctx.fillStyle = dead ? '#445566' : '#4488bb';
      ctx.beginPath();
      ctx.rect(sx - 9, sy - 8, 5, 8);
      ctx.fill();
      ctx.strokeStyle = dead ? '#334455' : '#99ccdd';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    if (!dead) {
      // HP bar above unit
      const barW = 16, barX = sx - barW / 2, barY = sy + 4;
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#222';
      ctx.fillRect(barX, barY, barW, 2);
      const frac = Math.max(0, Math.min(1, hp / maxHp));
      ctx.fillStyle = frac > 0.5 ? '#44cc44' : frac > 0.25 ? '#ccaa00' : '#cc4444';
      ctx.fillRect(barX, barY, barW * frac, 2);
    } else {
      // Dead — red X
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = '#cc4444';
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx - 4, sy - 4); ctx.lineTo(sx + 4, sy + 4);
      ctx.moveTo(sx + 4, sy - 4); ctx.lineTo(sx - 4, sy + 4);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── DRAW DEFENSE MAP — called by playback renderer each frame ────────────
  // Draws all placed defenses at their correct state for tSec elapsed.
  // Reads WG.RaidLayout.SLOT_CONFIG for slot positions (nx, ny).
  // Traps: idle → telegraph (within telegraphMs/1000 of next trigger)
  //        → fired (within 1s window after last trigger). Turrets: HP from log.
  function drawDefenseMap(ctx, canvasW, canvasH, layoutSlots, replayLog, tSec) {
    if (!window.WG || !WG.RaidDefensesArt || !WG.RaidLayout || !WG.RaidDefenses) return;
    var cfg = WG.RaidLayout.SLOT_CONFIG;
    var log = replayLog || [];

    for (var i = 0; i < layoutSlots.length; i++) {
      var entry = layoutSlots[i];
      if (!entry || !entry.defenseId) continue;
      var slotDef = cfg[i];
      if (!slotDef) continue;
      var sx = Math.round(slotDef.nx * canvasW);
      var sy = Math.round(slotDef.ny * canvasH);
      var structId = 'struct_' + i;

      if (slotDef.type === 'turret') {
        var tDef = WG.RaidDefenses.getTurret(entry.defenseId);
        if (!tDef) continue;
        var hp = tDef.hp;
        for (var j = 0; j < log.length; j++) {
          var ev = log[j];
          if (ev.tFrame > tSec) break;
          if (ev.targetId === structId) {
            if (ev.eventType === 'attacker_attack' || ev.eventType === 'squad_attack') hp -= ev.value;
            if (ev.eventType === 'structure_destroyed') { hp = 0; break; }
          }
        }
        if (hp <= 0) continue;
        WG.RaidDefensesArt.drawTurret(ctx, sx, sy, entry.defenseId, Math.max(0, hp), tDef.hp, 0);

      } else if (slotDef.type === 'trap') {
        var trapDef = WG.RaidDefenses.getTrap(entry.defenseId);
        if (!trapDef) continue;
        // Skip if structure destroyed
        var destroyed = false;
        for (var d = 0; d < log.length; d++) {
          if (log[d].targetId === structId && log[d].eventType === 'structure_destroyed' && log[d].tFrame <= tSec) { destroyed = true; break; }
        }
        if (destroyed) continue;
        // Compute trap state
        var telegSec = (trapDef.telegraphMs || 500) / 1000;
        var lastFiredT  = -Infinity;
        var nextTriggerT = Infinity;
        for (var e = 0; e < log.length; e++) {
          var le = log[e];
          if (le.actorId === structId && (le.eventType === 'trap:hit' || le.eventType === 'trap:countered')) {
            if (le.tFrame <= tSec) lastFiredT  = Math.max(lastFiredT, le.tFrame);
            else if (le.tFrame < nextTriggerT) nextTriggerT = le.tFrame;
          }
        }
        var trapState = 'idle';
        if (lastFiredT > tSec - 1.0) trapState = 'fired';
        else if (nextTriggerT !== Infinity && nextTriggerT - tSec <= telegSec) trapState = 'telegraph';
        WG.RaidDefensesArt.drawTrap(ctx, sx, sy, entry.defenseId, trapState);
      }
      // Wall slots: no art drawer — intentionally skipped
    }
  }

  window.WG = window.WG || {};
  window.WG.RaidSim = {
    simulate, makeSeed, calcReward,
    SIM_LEADERBOARD,
    runVsSimOpponent,
    buildSquadUnits, drawSquadUnit, drawDefenseMap,
  };
})();
