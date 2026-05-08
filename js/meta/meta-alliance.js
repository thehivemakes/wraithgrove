// WG.Alliance — alliance state, creation, membership, points economy
(function(){'use strict';

  // Earn rates (Architect-locked)
  const EARN_RATES = Object.freeze({
    WIN_RAID:         5,
    LOSE_RAID:        1,
    DAILY_LOGIN:      3,
    SEND_GIFT:        1,   // cap SEND_GIFT_CAP/day
    SEND_GIFT_CAP:    5,
    DAILY_MISSION:    5,
    BOSS_BRONZE:      5,
    BOSS_SILVER:     10,
    BOSS_GOLD:       20,
    BOSS_LEGEND:     50,
    WAR_WIN:         20,
  });

  // Spend pool (Architect-locked)
  const SPEND_POOL = Object.freeze({
    SLOT_EXPAND:     { cost: 200, label: '+5 Member Slots',          desc: 'Expands cap by 5 (max 50)' },
    ENERGY_REGEN:    { cost: 100, label: '+10% Energy Regen 24h',    desc: 'All members for 24 hours' },
    RAID_REWARDS:    { cost: 150, label: '+20% Raid Rewards 24h',    desc: 'All members for 24 hours' },
    BANNER_COSMETIC: { cost:  50, label: 'Alliance Banner Cosmetic', desc: 'Unlock banner style' },
  });

  const MEMBER_CAP_BASE = 30;
  const MEMBER_CAP_MAX  = 50;
  const MEMBER_CAP_STEP = 5;
  const CREATE_COST_COINS = 500;

  // Simulated NPC allies (for pre-launch demo feel)
  const NPC_MEMBERS = [
    { id: 'npc_kira',  name: 'KiraBlaze',   online: true  },
    { id: 'npc_sol',   name: 'Sol_Wraith',  online: false },
    { id: 'npc_mend',  name: 'Mendrick',    online: true  },
    { id: 'npc_vex',   name: 'VexHunter',   online: false },
    { id: 'npc_thorn', name: 'Thornwood',   online: true  },
  ];

  function _playerId() {
    return (window.WG && WG.Account && WG.Account.getDeviceId)
      ? WG.Account.getDeviceId()
      : 'local';
  }

  function _ensureState() {
    const s = WG.State.get();
    if (!s.alliance) {
      s.alliance = {
        id:                null,
        name:              '',
        banner:            '#a040ff',
        leaderId:          null,
        officerIds:        [],
        memberIds:         [],
        memberCap:         MEMBER_CAP_BASE,
        points:            0,
        warHistory:        [],
        dailyMissionState: {},
        activeBoosts:      {},
        msgOfDay:          '',
        lastClaimedDailyMs: 0,
        giftsSentToday:    0,
        giftPool:          0,
        giftsClaimedToday: false,
      };
    }
    return s.alliance;
  }

  function isUnlocked() {
    const hp = WG.State.get().huntProgress;
    return !!(hp && hp.bestWaves && hp.bestWaves[1] > 0);
  }

  function isInAlliance() {
    return !!_ensureState().id;
  }

  function get() { return _ensureState(); }

  function create(name, bannerColor) {
    if (!WG.State.spend('coins', CREATE_COST_COINS)) {
      return { ok: false, reason: 'insufficient_coins' };
    }
    const a = _ensureState();
    if (a.id) {
      WG.State.grant('coins', CREATE_COST_COINS); // refund
      return { ok: false, reason: 'already_in_alliance' };
    }
    a.id        = 'a_' + Date.now();
    a.name      = (name || 'New Alliance').slice(0, 24).trim() || 'New Alliance';
    a.banner    = bannerColor || '#a040ff';
    a.leaderId  = _playerId();
    a.officerIds = [];
    a.memberIds  = [a.leaderId].concat(NPC_MEMBERS.map(m => m.id));
    a.points     = 0;
    a.msgOfDay   = 'Welcome to ' + a.name + '!';
    a.giftPool   = NPC_MEMBERS.length; // NPCs each send a welcome gift
    WG.Engine.emit('alliance:created', { id: a.id, name: a.name });
    WG.Engine.emit('alliance:changed', {});
    return { ok: true };
  }

  function join(allianceId) {
    const a = _ensureState();
    if (a.id) return { ok: false, reason: 'already_in_alliance' };
    const list  = _fakeAlliances();
    const found = list.find(x => x.id === allianceId);
    if (!found) return { ok: false, reason: 'not_found' };
    a.id        = found.id;
    a.name      = found.name;
    a.banner    = found.banner;
    a.leaderId  = found.npcIds[0];
    a.officerIds = [];
    a.memberIds  = [_playerId()].concat(found.npcIds);
    a.memberCap  = MEMBER_CAP_BASE;
    a.giftPool   = Math.floor(found.npcIds.length * 0.6);
    WG.Engine.emit('alliance:joined', { id: a.id, name: a.name });
    WG.Engine.emit('alliance:changed', {});
    return { ok: true };
  }

  function leave() {
    const a = _ensureState();
    if (!a.id) return;
    a.id = null; a.name = ''; a.leaderId = null;
    a.officerIds = []; a.memberIds = []; a.points = 0;
    a.giftPool = 0; a.giftsSentToday = 0; a.giftsClaimedToday = false;
    WG.Engine.emit('alliance:left', {});
    WG.Engine.emit('alliance:changed', {});
  }

  function kick(memberId) {
    const a = _ensureState();
    a.memberIds = a.memberIds.filter(m => m !== memberId);
    WG.Engine.emit('alliance:changed', {});
  }

  function promote(memberId) {
    const a = _ensureState();
    if (!a.officerIds.includes(memberId)) a.officerIds.push(memberId);
    WG.Engine.emit('alliance:changed', {});
  }

  function demote(memberId) {
    const a = _ensureState();
    a.officerIds = (a.officerIds || []).filter(function(id){ return id !== memberId; });
    WG.Engine.emit('alliance:changed', {});
  }

  function transferLeadership(actorId, newLeaderId) {
    const a = _ensureState();
    if (a.leaderId !== actorId)                       return { ok: false, reason: 'not_leader' };
    if (!(a.memberIds || []).includes(newLeaderId))   return { ok: false, reason: 'not_member' };
    if (!a.officerIds.includes(actorId)) a.officerIds.push(actorId);
    a.officerIds = a.officerIds.filter(function(id){ return id !== newLeaderId; });
    a.leaderId   = newLeaderId;
    WG.Engine.emit('alliance:changed', {});
    return { ok: true };
  }

  function setBanner(color) {
    const a = _ensureState();
    if (!a.id) return;
    a.banner = color || '#a040ff';
    WG.Engine.emit('alliance:changed', {});
  }

  // ── Permission gates ─────────────────────────────────────────────────────────
  function _isLeader(actorId) {
    const a = _ensureState();
    return !!(a.id && a.leaderId === actorId);
  }

  function _isOfficer(actorId) {
    const a = _ensureState();
    return !!(a.id && (a.officerIds || []).includes(actorId));
  }

  function canPromote(actorId, targetId) {
    if (!_isLeader(actorId)) return false;
    const a = _ensureState();
    if (a.leaderId === targetId) return false;
    if ((a.officerIds || []).includes(targetId)) return false;
    return (a.memberIds || []).includes(targetId);
  }

  function canKick(actorId, targetId) {
    const a = _ensureState();
    if (!a.id || actorId === targetId) return false;
    if (a.leaderId === actorId) return true;
    if (_isOfficer(actorId)) {
      return !((a.officerIds || []).includes(targetId)) && a.leaderId !== targetId;
    }
    return false;
  }

  function canDemote(actorId, targetId) {
    if (!_isLeader(actorId)) return false;
    const a = _ensureState();
    return (a.officerIds || []).includes(targetId);
  }

  function canSetMOTD(actorId)    { return _isLeader(actorId); }
  function canEditBanner(actorId) { return _isLeader(actorId); }
  function canSpendPoints(actorId){ return _isLeader(actorId); }
  // ─────────────────────────────────────────────────────────────────────────────

  function setMOTD(text) {
    const a = _ensureState();
    a.msgOfDay = (text || '').slice(0, 120);
    WG.Engine.emit('alliance:changed', {});
  }

  function addPoints(amount) {
    const a = _ensureState();
    if (!a.id) return 0;
    a.points = (a.points || 0) + Math.max(0, amount);
    WG.Engine.emit('alliance:points-change', { points: a.points });
    WG.Engine.emit('alliance:changed', {});
    return a.points;
  }

  function spend(type) {
    const a  = _ensureState();
    if (!a.id) return { ok: false, reason: 'no_alliance' };
    const def = SPEND_POOL[type];
    if (!def)  return { ok: false, reason: 'unknown_type' };
    if (a.points < def.cost) return { ok: false, reason: 'insufficient_points' };
    a.points -= def.cost;
    if (type === 'SLOT_EXPAND') {
      if (a.memberCap >= MEMBER_CAP_MAX) { a.points += def.cost; return { ok: false, reason: 'cap_maxed' }; }
      a.memberCap = Math.min(MEMBER_CAP_MAX, a.memberCap + MEMBER_CAP_STEP);
    } else if (type === 'ENERGY_REGEN') {
      a.activeBoosts.energyRegen = { endsAt: Date.now() + 86400000 };
    } else if (type === 'RAID_REWARDS') {
      a.activeBoosts.raidRewards = { endsAt: Date.now() + 86400000 };
    } else if (type === 'BANNER_COSMETIC') {
      a.activeBoosts.bannerCosmetic = true;
    }
    WG.Engine.emit('alliance:points-change', { points: a.points });
    WG.Engine.emit('alliance:changed', {});
    return { ok: true };
  }

  function sendGift() {
    const a = _ensureState();
    if (!a.id) return { ok: false, reason: 'no_alliance' };
    if ((a.giftsSentToday || 0) >= 1) return { ok: false, reason: 'already_sent_today' };
    a.giftsSentToday = (a.giftsSentToday || 0) + 1;
    a.giftPool = (a.giftPool || 0) + 1;
    const pts = Math.min(EARN_RATES.SEND_GIFT_CAP, (a.points || 0) + EARN_RATES.SEND_GIFT);
    addPoints(EARN_RATES.SEND_GIFT);
    WG.Engine.emit('alliance:gift-sent', {});
    WG.Engine.emit('alliance:changed', {});
    return { ok: true };
  }

  function claimGift() {
    const a = _ensureState();
    if (!a.id) return { ok: false, reason: 'no_alliance' };
    if (a.giftsClaimedToday) return { ok: false, reason: 'already_claimed_today' };
    if ((a.giftPool || 0) < 1) return { ok: false, reason: 'pool_empty' };
    a.giftsClaimedToday = true;
    a.giftPool = Math.max(0, (a.giftPool || 0) - 1);
    WG.State.grantEnergy(5, 'alliance_gift');
    WG.State.grant('coins', 50);
    a.lastClaimedDailyMs = Date.now();
    WG.Engine.emit('alliance:gift-claimed', {});
    WG.Engine.emit('alliance:changed', {});
    return { ok: true };
  }

  // NPC member lookup (for render layer)
  function getNPCMember(id) {
    return NPC_MEMBERS.find(m => m.id === id) || null;
  }
  function getNPCMembers() { return NPC_MEMBERS; }

  function _fakeAlliances() {
    return [
      { id:'fa_1', name:'Wraith Stalkers',  banner:'#a040ff', memberCount:18, points:1240,
        npcIds:['npc_kira','npc_sol','npc_mend','npc_vex','npc_thorn','npc_a1','npc_a2'] },
      { id:'fa_2', name:'Sigil Hunters',    banner:'#d04020', memberCount:22, points:880,
        npcIds:['npc_b1','npc_b2','npc_b3','npc_b4'] },
      { id:'fa_3', name:'Pale Vigil',       banner:'#2080d0', memberCount:9,  points:420,
        npcIds:['npc_c1','npc_c2','npc_c3'] },
      { id:'fa_4', name:'Lantern Order',    banner:'#f0a020', memberCount:27, points:3100,
        npcIds:['npc_d1','npc_d2','npc_d3','npc_d4','npc_d5'] },
      { id:'fa_5', name:'Cave Wardens',     banner:'#208040', memberCount:14, points:760,
        npcIds:['npc_e1','npc_e2','npc_e3'] },
      { id:'fa_6', name:'Iron Chorus',      banner:'#c08020', memberCount:6,  points:210,
        npcIds:['npc_f1','npc_f2'] },
    ];
  }
  function findAlliances() { return _fakeAlliances(); }

  function init() {
    _ensureState();
    // Daily login bonus while in alliance
    WG.Engine.on('daily:reset', function() {
      const a = _ensureState();
      a.giftsSentToday    = 0;
      a.giftsClaimedToday = false;
      if (a.id) {
        // NPC gifts refill pool
        a.giftPool = (a.giftPool || 0) + 3;
        addPoints(EARN_RATES.DAILY_LOGIN);
      }
    });
    // Raid win/loss — using duel:match-result as proxy (Duel = PvP base raids in faithful clone)
    WG.Engine.on('duel:match-result', function(ev) {
      if (ev && ev.won) addPoints(EARN_RATES.WIN_RAID);
      else addPoints(EARN_RATES.LOSE_RAID);
    });
    // Alliance war win (Phase 4 server event; listener ready for wire-up)
    WG.Engine.on('alliance:war-won', function() {
      addPoints(EARN_RATES.WAR_WIN);
    });
    // Boss tier hits (Phase 4 wire; listener ready)
    WG.Engine.on('alliance:boss-hit', function(ev) {
      const tier = ev && ev.tier;
      const map = { bronze: EARN_RATES.BOSS_BRONZE, silver: EARN_RATES.BOSS_SILVER,
                    gold: EARN_RATES.BOSS_GOLD, legend: EARN_RATES.BOSS_LEGEND };
      if (map[tier]) addPoints(map[tier]);
    });
    // Mark save dirty on any alliance change
    WG.Engine.on('alliance:changed', function() {
      if (WG.Cache && WG.Cache.save) WG.Cache.save();
    });
  }

  window.WG.Alliance = {
    init, get, isUnlocked, isInAlliance,
    create, join, leave, kick, promote, demote, transferLeadership, setMOTD, setBanner,
    addPoints, spend, sendGift, claimGift,
    canPromote, canKick, canDemote, canSetMOTD, canEditBanner, canSpendPoints,
    findAlliances, getNPCMember, getNPCMembers,
    EARN_RATES, SPEND_POOL, CREATE_COST_COINS,
    NPC_MEMBERS,
  };
})();
