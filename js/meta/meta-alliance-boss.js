// WG.AllianceBoss — collective HP-pool boss, 3-day event / 1-day break cycle
(function(){'use strict';

  const BOSS_IDS = ['wraith_father', 'frozen_crone', 'samurai_lord', 'void_emperor'];
  const EVENT_MS = 3 * 86400000;   // 3 days active
  const CYCLE_MS = 4 * 86400000;   // 3 on + 1 off

  const TIERS = [
    { name: 'legend', min: 0.30 },
    { name: 'gold',   min: 0.15 },
    { name: 'silver', min: 0.05 },
    { name: 'bronze', min: 0.01 },
  ];

  const REWARDS = {
    bronze: { coins: 200 },
    silver: { coins: 500,  diamonds: 5 },
    gold:   { coins: 2000, diamonds: 20, epicRelicFrags: 1 },
    legend: { coins: 5000, diamonds: 50, legendaryRelicFrags: 1 },
  };

  // NPC allies seeded on each new cycle so the HP bar looks active
  const NPC_DMG_SEED_FRAC = 0.55;  // NPCs together consume 55% of hpMax before player joins

  function _epochForNow(now) {
    const d   = new Date(now);
    const day = d.getDay();  // 0=Sun 1=Mon...
    const msSinceMon =
      ((day + 6) % 7) * 86400000 +
      d.getHours()   * 3600000  +
      d.getMinutes() * 60000    +
      d.getSeconds() * 1000     +
      d.getMilliseconds();
    return now - msSinceMon;
  }

  function _schedule(now) {
    const epoch      = _epochForNow(now);
    const elapsed    = now - epoch;
    const cycleIndex = Math.floor(elapsed / CYCLE_MS);
    const within     = elapsed % CYCLE_MS;
    const cycleStart = epoch + cycleIndex * CYCLE_MS;
    return {
      inEvent:      within < EVENT_MS,
      cycleIndex,
      bossId:       BOSS_IDS[cycleIndex % BOSS_IDS.length],
      eventStartMs: cycleStart,
      eventEndMs:   cycleStart + EVENT_MS,
      breakUntilMs: cycleStart + CYCLE_MS,
    };
  }

  function _memberCount() {
    if (WG.Alliance && WG.Alliance.isInAlliance && WG.Alliance.isInAlliance()) {
      const a = WG.Alliance.get();
      return Math.max(1, (a.memberIds || []).length);
    }
    return 10;
  }

  function _playerId() {
    return (window.WG && WG.Account && WG.Account.getDeviceId)
      ? WG.Account.getDeviceId()
      : 'local';
  }

  function _ensureState(sched) {
    const s = WG.State.get();
    if (!s.allianceBoss || s.allianceBoss.cycleIndex !== sched.cycleIndex) {
      const mc    = _memberCount();
      const hpMax = Math.floor(5000000 * mc / 10);

      // Seed NPC contributions so the boss looks alive at event start
      const contributions = {};
      const npcIds = (WG.Alliance && WG.Alliance.getNPCMembers)
        ? WG.Alliance.getNPCMembers().map(function(m){ return m.id; })
        : ['npc_kira','npc_sol','npc_mend','npc_vex','npc_thorn'];
      if (npcIds.length > 0) {
        const seedTotal = Math.floor(hpMax * NPC_DMG_SEED_FRAC);
        npcIds.forEach(function(id, i) {
          contributions[id] = Math.floor(seedTotal * (0.1 + Math.random() * 0.25));
        });
      }
      const npcDmgTotal = Object.values(contributions).reduce(function(a,b){return a+b;},0);

      s.allianceBoss = {
        cycleIndex:    sched.cycleIndex,
        activeBossId:  sched.bossId,
        hpMax,
        hpRemaining:   Math.max(0, hpMax - npcDmgTotal),
        eventStartMs:  sched.eventStartMs,
        eventEndMs:    sched.eventEndMs,
        breakUntilMs:  sched.breakUntilMs,
        contributions,
        claimedTiers:  {},
        defeated:      false,
      };
    }
    return s.allianceBoss;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  function getCurrentBoss() {
    const sched = _schedule(Date.now());
    const bs    = _ensureState(sched);
    return {
      inEvent:      sched.inEvent,
      bossId:       bs.activeBossId,
      hpRemaining:  bs.hpRemaining,
      hpMax:        bs.hpMax,
      eventStartMs: bs.eventStartMs,
      eventEndMs:   bs.eventEndMs,
      breakUntilMs: bs.breakUntilMs,
      contributions: bs.contributions,
      claimedTiers:  bs.claimedTiers,
      defeated:      bs.defeated,
    };
  }

  function recordDamage(amount) {
    if (!amount || amount <= 0) return;
    const sched = _schedule(Date.now());
    if (!sched.inEvent) return;
    const bs = _ensureState(sched);
    if (bs.defeated) return;
    const pid = _playerId();
    bs.contributions[pid] = (bs.contributions[pid] || 0) + amount;
    bs.hpRemaining = Math.max(0, bs.hpRemaining - amount);
    if (WG.Engine) WG.Engine.emit('allianceBoss:damage', { memberId: pid, amount, hpRemaining: bs.hpRemaining });
    if (bs.hpRemaining <= 0 && !bs.defeated) {
      bs.defeated = true;
      if (WG.Engine) WG.Engine.emit('allianceBoss:defeated', { bossId: bs.activeBossId });
    }
    if (WG.Cache && WG.Cache.save) WG.Cache.save();
  }

  function _computeTier(pid) {
    const bs = WG.State.get().allianceBoss;
    if (!bs) return null;
    const myDmg = bs.contributions[pid] || 0;
    if (myDmg <= 0) return null;
    const total = Object.values(bs.contributions).reduce(function(a,b){return a+b;},0);
    if (!total) return null;
    const pct = myDmg / total;
    for (var i = 0; i < TIERS.length; i++) {
      if (pct >= TIERS[i].min) return TIERS[i].name;
    }
    return null;
  }

  function claimTier() {
    const sched = _schedule(Date.now());
    const bs    = _ensureState(sched);
    const pid   = _playerId();
    if (bs.claimedTiers[pid]) return { ok: false, reason: 'already_claimed' };
    const tier = _computeTier(pid);
    if (!tier) return { ok: false, reason: 'no_contribution' };
    bs.claimedTiers[pid] = tier;
    const r = REWARDS[tier];
    if (r.coins)              WG.State.grant('coins', r.coins);
    if (r.diamonds)           WG.State.grant('diamonds', r.diamonds);
    if (r.epicRelicFrags) {
      const f = WG.State.get().forge;
      f.epicRelicFrags = (f.epicRelicFrags || 0) + r.epicRelicFrags;
    }
    if (r.legendaryRelicFrags) {
      const f = WG.State.get().forge;
      f.legendaryRelicFrags = (f.legendaryRelicFrags || 0) + r.legendaryRelicFrags;
    }
    if (WG.Engine) WG.Engine.emit('allianceBoss:tierClaimed', { tier, pid });
    if (WG.Cache && WG.Cache.save) WG.Cache.save();
    return { ok: true, tier, rewards: r };
  }

  function getTierForPlayer() {
    return _computeTier(_playerId());
  }

  function getNextBoss() {
    const now = Date.now();
    const sched = _schedule(now);
    const nextCycle = sched.cycleIndex + 1;
    return BOSS_IDS[nextCycle % BOSS_IDS.length];
  }

  function init() {
    const sched = _schedule(Date.now());
    _ensureState(sched);
    // Grant alliance points when player claims a tier reward
    WG.Engine.on('allianceBoss:tierClaimed', function(ev) {
      const pts = {
        bronze: WG.Alliance && WG.Alliance.EARN_RATES && WG.Alliance.EARN_RATES.BOSS_BRONZE,
        silver: WG.Alliance && WG.Alliance.EARN_RATES && WG.Alliance.EARN_RATES.BOSS_SILVER,
        gold:   WG.Alliance && WG.Alliance.EARN_RATES && WG.Alliance.EARN_RATES.BOSS_GOLD,
        legend: WG.Alliance && WG.Alliance.EARN_RATES && WG.Alliance.EARN_RATES.BOSS_LEGEND,
      };
      const p = pts[ev.tier];
      if (p && WG.Alliance && WG.Alliance.addPoints) WG.Alliance.addPoints(p);
      WG.Engine.emit('alliance:boss-hit', { tier: ev.tier });
    });
  }

  window.WG.AllianceBoss = {
    init, getCurrentBoss, recordDamage, claimTier, getTierForPlayer, getNextBoss,
    BOSS_IDS, TIERS, REWARDS, EVENT_MS, CYCLE_MS,
  };
})();
