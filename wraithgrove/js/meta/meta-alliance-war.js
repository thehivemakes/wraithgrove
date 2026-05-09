// WG.AllianceWar — alliance vs alliance 4-attacker base-raid war (weekly schedule)
// Phase state machine: idle → matchmaking → attack → results → idle
// Schedule: matchmaking opens Friday 22:00 local; attack window Sat 18:00–Sun 18:00.
// Matchup: NPC opponent pool matched by cumulative alliance power tier (power × member count).
(function(){'use strict';

  // ── CONFIG ──────────────────────────────────────────────────────────────────

  const REWARDS = Object.freeze({
    WIN:  { alliancePoints: 20, coins: 200 },
    LOSE: { alliancePoints:  5, coins:  50 },
  });

  // Opponent pool — sorted by ascending power
  const OPPONENT_POOL = Object.freeze([
    { id:'op_shadow',  name:'Shadow Claw',   banner:'#6030a0', power:  800 },
    { id:'op_bone',    name:'Bone Throne',   banner:'#903020', power: 1600 },
    { id:'op_iron',    name:'Iron Shroud',   banner:'#404080', power: 2800 },
    { id:'op_dusk',    name:'Dusk Assembly', banner:'#206040', power: 4500 },
    { id:'op_void',    name:'Void Covenant', banner:'#400060', power: 7000 },
  ]);

  // ── HELPERS ─────────────────────────────────────────────────────────────────

  function _pad2(n) { return n < 10 ? '0' + n : String(n); }

  function _hashStr(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
  }

  function _makeRng(seed) {
    let s = (_hashStr(String(seed)) >>> 0) || 1;
    return function() {
      s ^= s << 13; s ^= s >> 17; s ^= s << 5;
      return (s >>> 0) / 4294967296;
    };
  }

  // Week key = ISO date of the Saturday of this war week (anchor: the Sat attack day)
  function _weekKey(now) {
    const d   = new Date(now);
    const day = d.getDay(); // 0=Sun … 6=Sat
    // Days until Saturday (0 if today IS Saturday)
    const daysToSat = (6 - day + 7) % 7;
    const sat = new Date(d.getFullYear(), d.getMonth(), d.getDate() + daysToSat);
    return sat.getFullYear() + '-' + _pad2(sat.getMonth() + 1) + '-' + _pad2(sat.getDate());
  }

  // ── SCHEDULE ─────────────────────────────────────────────────────────────────
  // Returns {phase, weekKey, matchmakingStartMs, attackStartMs, attackEndMs, resultsEndMs}
  //
  // Timeline (local time, weekly):
  //   Fri 22:00 → Sat 18:00  — matchmaking (captain selection, opponent reveal)
  //   Sat 18:00 → Sun 18:00  — attack (24h window)
  //   Sun 18:00 → Mon 00:00  — results  (6h window)
  //   Mon 00:00 → Fri 22:00  — idle
  function _getSchedule(now) {
    const d   = new Date(now);
    const day = d.getDay(); // 0=Sun … 6=Sat
    const h   = d.getHours();

    let phase = 'idle';
    if ((day === 5 && h >= 22) || (day === 6 && h < 18))   phase = 'matchmaking';
    else if ((day === 6 && h >= 18) || (day === 0 && h < 18)) phase = 'attack';
    else if (day === 0 && h >= 18)                             phase = 'results';

    // ms since midnight today
    const todMs      = h * 3600000 + d.getMinutes() * 60000 + d.getSeconds() * 1000 + d.getMilliseconds();
    const dayStartMs = now - todMs;

    // next occurrence of (targetDay, targetHour): if we're already past it today, add 7 days
    function _next(targetDay, targetHour) {
      let daysAhead = (targetDay - day + 7) % 7;
      if (daysAhead === 0 && todMs >= targetHour * 3600000) daysAhead = 7;
      return dayStartMs + daysAhead * 86400000 + targetHour * 3600000;
    }

    const attackStartMs = _next(6, 18);         // next Sat 18:00
    const attackEndMs   = attackStartMs + 86400000; // +24 h = Sun 18:00

    return {
      phase,
      weekKey:            _weekKey(now),
      matchmakingStartMs: _next(5, 22),
      attackStartMs,
      attackEndMs,
      resultsEndMs:       attackEndMs + 6 * 3600000,
    };
  }

  // ── STATE ────────────────────────────────────────────────────────────────────

  function _ensureState() {
    const s = WG.State.get();
    if (!s.allianceWar) {
      s.allianceWar = {
        phase:         'idle',
        currentMatch:  null,
        history:       [],
        revengeWindow: null,
        activeBuff:    null,
      };
    }
    if (!('revengeWindow' in s.allianceWar)) s.allianceWar.revengeWindow = null;
    if (!('activeBuff'    in s.allianceWar)) s.allianceWar.activeBuff    = null;
    return s.allianceWar;
  }

  // ── MATCH-UP ──────────────────────────────────────────────────────────────────
  // Cumulative alliance power = player power × member count (faithful-clone approximation).
  function _myAlliancePower() {
    const myPow  = WG.State.recomputePower ? WG.State.recomputePower() : 200;
    const mc     = (WG.Alliance && WG.Alliance.isInAlliance && WG.Alliance.isInAlliance())
                 ? Math.max(1, (WG.Alliance.get().memberIds || []).length)
                 : 1;
    return myPow * mc;
  }

  // Pick the opponent closest in power to our alliance; weekly seed adds ±1 tier variation.
  function _pickOpponent(weekKey) {
    const myPow  = _myAlliancePower();
    const sorted = Array.from(OPPONENT_POOL);  // already sorted ascending
    let bestIdx  = 0;
    let bestDiff = Math.abs(myPow - sorted[0].power);
    sorted.forEach(function(op, i) {
      const diff = Math.abs(myPow - op.power);
      if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
    });
    const variation = (_hashStr(weekKey) % 3) - 1;  // -1, 0, or +1
    const idx = Math.max(0, Math.min(sorted.length - 1, bestIdx + variation));
    return sorted[idx];
  }

  // ── MATCH LIFECYCLE ───────────────────────────────────────────────────────────

  function _ensureMatchForWeek(weekKey) {
    const aw = _ensureState();
    if (!aw.currentMatch || aw.currentMatch.weekKey !== weekKey) {
      const opp = _pickOpponent(weekKey);
      aw.currentMatch = {
        matchId:          weekKey + '_vs_' + opp.id,
        weekKey,
        opponentAlliance: { id: opp.id, name: opp.name, banner: opp.banner, power: opp.power },
        attackers:        [],    // up to 4 member IDs, chosen by leader during matchmaking
        attackResults:    [],    // [{attackerId, damagePercent}] indexed by captainIndex
        opponentScore:    null,  // NPC aggregate (0–100), set on resolution
        winner:           null,  // 'us' | 'them'
        rewardsGranted:   false,
      };
    }
    return aw.currentMatch;
  }

  // ── RAID SIMULATION ───────────────────────────────────────────────────────────
  // Deterministic per (attackerId, weekKey, captainIndex).
  // Damage% = base fraction from power ratio + seeded variance ±15%.
  function _simulateRaid(attackerId, opponentPower, weekKey, captainIndex) {
    const myPow  = WG.State.recomputePower ? WG.State.recomputePower() : 200;
    // Defend per-member power = opponentPower / 6 (6-member NPC alliance estimate)
    const perMbr = Math.max(1, opponentPower / 6);
    const ratio  = Math.max(0.2, Math.min(3.0, myPow / perMbr));
    // Base damage 20%→85% over ratio 0.2→3.0 (linear)
    const base   = 0.20 + (ratio - 0.2) / (3.0 - 0.2) * 0.65;
    const rng    = _makeRng(attackerId + '|' + weekKey + '|' + captainIndex);
    const variance = (rng() - 0.5) * 0.30;   // ±15%
    return Math.min(100, Math.max(5, Math.round((base + variance) * 100)));
  }

  // ── WAR RESOLUTION ────────────────────────────────────────────────────────────

  function _resolveWar(weekKey) {
    const aw    = _ensureState();
    const match = aw.currentMatch;
    if (!match || match.weekKey !== weekKey || match.winner) return;

    const results    = (match.attackResults || []).filter(Boolean);
    const totalPct   = results.reduce(function(s, r) { return s + (r.damagePercent || 0); }, 0);
    // playerAvg is over all 4 attacker slots (unraided slots count as 0)
    const playerAvg  = totalPct / Math.max(1, match.attackers.length || 4);

    // NPC score seeded from matchId: 30–65% average
    const rng  = _makeRng(match.matchId + '_opp');
    const opp  = 30 + rng() * 35;

    match.opponentScore = Math.round(opp);
    match.winner        = playerAvg >= opp ? 'us' : 'them';

    // Concern A — revenge raid window when we lose
    if (match.winner === 'them') {
      aw.revengeWindow = {
        opponentAllianceId: match.opponentAlliance.id,
        opponentName:       match.opponentAlliance.name,
        expiresAt:          Date.now() + 24 * 3600000,
      };
      WG.Engine.emit('alliance-war:attacked', {
        attackerName: match.opponentAlliance.name,
        expiresAt:    aw.revengeWindow.expiresAt,
      });
    }

    _saveState();
    WG.Engine.emit('allianceWar:resolved', {
      winner:        match.winner,
      playerAvg:     Math.round(playerAvg),
      opponentScore: match.opponentScore,
    });
  }

  // ── PHASE TICK ────────────────────────────────────────────────────────────────

  function _tick() {
    const sched = _getSchedule(Date.now());
    const aw    = _ensureState();
    aw.phase = sched.phase;

    if (sched.phase === 'matchmaking' || sched.phase === 'attack') {
      _ensureMatchForWeek(sched.weekKey);
    }
    if (sched.phase === 'results') {
      const m = aw.currentMatch;
      if (m && m.weekKey === sched.weekKey && !m.winner) _resolveWar(sched.weekKey);
    }
    _saveState();
  }

  function _saveState() {
    if (WG.Cache && WG.Cache.save) WG.Cache.save();
  }

  // ── PUBLIC API ────────────────────────────────────────────────────────────────

  // Returns the full war state + current schedule timestamps (for UI countdowns).
  function getState() {
    _tick();
    const aw    = _ensureState();
    const sched = _getSchedule(Date.now());
    return {
      phase:        aw.phase,
      currentMatch: aw.currentMatch,
      history:      aw.history,
      schedule:     sched,
    };
  }

  // Leader (or player if NPC-led alliance) picks up to 4 war captains from alliance roster.
  // Callable only during matchmaking phase.
  function selectAttackers(memberIds) {
    const sched = _getSchedule(Date.now());
    if (sched.phase !== 'matchmaking') return { ok: false, reason: 'wrong_phase' };
    if (!WG.Alliance || !WG.Alliance.isInAlliance()) return { ok: false, reason: 'no_alliance' };

    const a   = WG.Alliance.get();
    const myId = (WG.Account && WG.Account.getDeviceId) ? WG.Account.getDeviceId() : 'local';
    // Allow selection if player is leader, or if the alliance leader is an NPC
    const canSelect = a.leaderId === myId || String(a.leaderId || '').startsWith('npc_');
    if (!canSelect) return { ok: false, reason: 'not_leader' };

    const roster = a.memberIds || [];
    const valid  = (memberIds || []).filter(function(id) {
      return roster.indexOf(id) >= 0;
    }).slice(0, 4);
    if (valid.length === 0) return { ok: false, reason: 'no_valid_members' };

    const match     = _ensureMatchForWeek(sched.weekKey);
    match.attackers = valid;
    _saveState();
    WG.Engine.emit('allianceWar:changed', { phase: 'matchmaking' });
    return { ok: true, attackers: valid };
  }

  // Launch one raid attempt for captain at captainIndex (0–3). Returns damage %.
  // Defense layout auto-locked: we use the saved state.raid.activeLayout as the basis
  // for the NPC's difficulty rating; the player cannot edit their own layout while this
  // function is callable (attack phase guard enforced here + in layout editor).
  function launchRaid(captainIndex) {
    const sched = _getSchedule(Date.now());
    if (sched.phase !== 'attack') return { ok: false, reason: 'wrong_phase' };

    const aw    = _ensureState();
    const match = aw.currentMatch;
    if (!match || match.weekKey !== sched.weekKey) return { ok: false, reason: 'no_match' };

    const attackerId = match.attackers[captainIndex];
    if (!attackerId) return { ok: false, reason: 'no_attacker' };
    if (match.attackResults[captainIndex]) return { ok: false, reason: 'already_raided' };

    const dmgPct = _simulateRaid(
      attackerId,
      match.opponentAlliance.power,
      sched.weekKey,
      captainIndex
    );

    match.attackResults[captainIndex] = { attackerId, damagePercent: dmgPct };
    _saveState();
    WG.Engine.emit('allianceWar:raidComplete', { captainIndex, attackerId, damagePercent: dmgPct });

    // Auto-resolve once all captains have raided
    const allDone = match.attackers.every(function(_, i) { return !!match.attackResults[i]; });
    if (allDone) _resolveWar(sched.weekKey);

    return { ok: true, damagePercent: dmgPct };
  }

  // Claim war rewards (results phase only; one-time per match).
  function grantRewards() {
    const sched = _getSchedule(Date.now());
    if (sched.phase !== 'results') return { ok: false, reason: 'wrong_phase' };

    const aw    = _ensureState();
    const match = aw.currentMatch;
    if (!match || match.weekKey !== sched.weekKey) return { ok: false, reason: 'no_match' };
    if (match.rewardsGranted) return { ok: false, reason: 'already_claimed' };

    if (!match.winner) _resolveWar(sched.weekKey);
    if (!match.winner) return { ok: false, reason: 'not_resolved' };

    match.rewardsGranted = true;
    const reward = match.winner === 'us' ? REWARDS.WIN : REWARDS.LOSE;

    WG.State.grant('coins', reward.coins);
    if (WG.Alliance && WG.Alliance.addPoints) WG.Alliance.addPoints(reward.alliancePoints);
    if (match.winner === 'us' && WG.Engine) {
      WG.Engine.emit('alliance:war-won', {});
      // Concern C — war victory buff
      aw.activeBuff = {
        id:            'war_victors_might',
        durationMs:    24 * 3600000,
        bossDamageMul: 1.5,
        expiresAt:     Date.now() + 24 * 3600000,
      };
      WG.Engine.emit('alliance-war:win', { buff: aw.activeBuff });
    }

    aw.history.unshift({
      weekKey:      match.weekKey,
      opponentName: match.opponentAlliance.name,
      winner:       match.winner,
      rewardCoins:  reward.coins,
      rewardPts:    reward.alliancePoints,
    });
    if (aw.history.length > 5) aw.history.length = 5;

    _saveState();
    WG.Engine.emit('allianceWar:rewardsClaimed', { winner: match.winner, reward });
    return { ok: true, winner: match.winner, reward };
  }

  // ── REVENGE WINDOW ────────────────────────────────────────────────────────────

  function getRevengeWindow() {
    const aw = _ensureState();
    if (!aw.revengeWindow) return null;
    if (Date.now() > aw.revengeWindow.expiresAt) {
      aw.revengeWindow = null;
      _saveState();
      return null;
    }
    return aw.revengeWindow;
  }

  // Launch a revenge raid against the attacker with +50% damage.
  // Burns the window — can only be used once per attack event.
  function launchRevengeRaid() {
    const rw = getRevengeWindow();
    if (!rw) return { ok: false, reason: 'no_window' };
    const aw   = _ensureState();
    const myId = (WG.Account && WG.Account.getDeviceId) ? WG.Account.getDeviceId() : 'local';
    const opp  = OPPONENT_POOL.find(function(o) { return o.id === rw.opponentAllianceId; }) || OPPONENT_POOL[0];
    const seed = rw.opponentAllianceId + '|revenge|' + Math.floor(Date.now() / 3600000);
    const base   = _simulateRaid(myId, opp.power, seed, 0);
    const dmgPct = Math.min(100, Math.round(base * 1.5));
    aw.revengeWindow = null;
    _saveState();
    WG.Engine.emit('allianceWar:revengeRaid', { opponentName: rw.opponentName, damagePercent: dmgPct });
    return { ok: true, damagePercent: dmgPct };
  }

  // ── ACTIVE BUFF ───────────────────────────────────────────────────────────────

  function getActiveBuff() {
    const aw = _ensureState();
    if (!aw.activeBuff) return null;
    if (Date.now() > aw.activeBuff.expiresAt) {
      aw.activeBuff = null;
      _saveState();
      return null;
    }
    return aw.activeBuff;
  }

  function init() {
    _ensureState();
    WG.Engine.on('tab:change', function(ev) {
      if (ev && ev.tab === 'alliance') _tick();
    });
    WG.Engine.on('daily:reset', _tick);
    // Concern C — daily personal mission → +1 alliance point bonus if in an alliance
    WG.Engine.on('mission:claimed', function(ev) {
      if (ev && ev.type === 'daily' &&
          WG.Alliance && WG.Alliance.isInAlliance && WG.Alliance.isInAlliance()) {
        if (WG.Alliance.addPoints) WG.Alliance.addPoints(1);
      }
    });
    // Concern C — alliance mission claimed → +5 personal coins popup (once per day)
    WG.Engine.on('alliance:mission-claimed', function() {
      const s     = WG.State.get();
      const today = new Date().toDateString();
      const aw    = _ensureState();
      if (aw._allianceMissionBonusDay === today) return;
      aw._allianceMissionBonusDay = today;
      WG.State.grant('coins', 5);
      _saveState();
      WG.Engine.emit('alliance-mission-complete', { bonusCoins: 5 });
    });
    _tick();
  }

  window.WG.AllianceWar = {
    init,
    getState,
    selectAttackers,
    launchRaid,
    grantRewards,
    getRevengeWindow,
    launchRevengeRaid,
    getActiveBuff,
    REWARDS,
    OPPONENT_POOL,
  };
})();
