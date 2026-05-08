// WG.Missions — Daily + weekly missions catalog, tracker, UI, and event dispatcher.
// W-Monetization-V2-Missions-Pass Concerns A (daily) + B (weekly) + C (UI) + F (events)
(function(){'use strict';

  // ─── Concern A: Daily missions catalog (20 entries, W-Daily-Mission-Expand) ─
  const DAILY_MISSIONS = [
    // ── Easy (12) — reward: 200 coins ───────────────────────────────────────
    { id: 'kill_30',           desc: 'Kill 30 enemies in Hunt',              target: 30,  tier: 'easy',     reward: { coins: 200 } },
    { id: 'clear_2_stages',    desc: 'Clear 2 Hunt stages today',            target: 2,   tier: 'easy',     reward: { coins: 200 } },
    { id: 'win_3_duels',       desc: 'Win 3 Duel matches today',             target: 3,   tier: 'easy',     reward: { coins: 200 } },
    { id: 'craft_1',           desc: 'Upgrade 1 Forge building today',       target: 1,   tier: 'easy',     reward: { coins: 200 } },
    { id: 'pickup_50_orbs',    desc: 'Pick up 50 orbs in Hunt',              target: 50,  tier: 'easy',     reward: { coins: 200 } },
    { id: 'crit_10',           desc: 'Land 10 critical hits in Hunt',        target: 10,  tier: 'easy',     reward: { coins: 200 } },
    { id: 'level_up',          desc: 'Level up 1 character in Ascend',       target: 1,   tier: 'easy',     reward: { coins: 200 } },
    { id: 'buff_ad_watch',     desc: 'Watch 1 buff ad for a boost',          target: 1,   tier: 'easy',     reward: { coins: 200 } },
    { id: 'forge_gold_mine',   desc: 'Tap-collect from the Gold Mine',       target: 1,   tier: 'easy',     reward: { coins: 200 } },
    { id: 'send_gifts_3',      desc: 'Send 3 gifts to alliance members',     target: 3,   tier: 'easy',     reward: { coins: 200 } },
    { id: 'pickup_coins_200',  desc: 'Collect 200 coins during Hunt runs',   target: 200, tier: 'easy',     reward: { coins: 200 } },
    { id: 'claim_daily_login', desc: 'Claim your daily login reward today',  target: 1,   tier: 'easy',     reward: { coins: 200 } },
    // ── Standard (5) — reward: 500 coins + 5 diamonds ───────────────────────
    { id: 'kill_100',          desc: 'Kill 100 enemies in Hunt today',       target: 100, tier: 'standard', reward: { coins: 500, diamonds: 5 } },
    { id: 'clear_5_stages',    desc: 'Clear 5 Hunt stages today',            target: 5,   tier: 'standard', reward: { coins: 500, diamonds: 5 } },
    { id: 'tower_floor_5',     desc: 'Reach Tower floor 5 today',            target: 5,   tier: 'standard', reward: { coins: 500, diamonds: 5 } },
    { id: 'pull_relic',        desc: 'Pull 1 relic from the Forge today',    target: 1,   tier: 'standard', reward: { coins: 500, diamonds: 5 } },
    { id: 'tower_climb_5',     desc: 'Reach Tower floor 5 in a single run', target: 1,   tier: 'standard', reward: { coins: 500, diamonds: 5 } },
    // ── Hard (3) — reward: 1500 coins + 20 diamonds + 1 fragment ────────────
    { id: 'combo_15',          desc: 'Land a 15-kill combo in Hunt',         target: 15,  tier: 'hard',     reward: { coins: 1500, diamonds: 20, frags: 1 } },
    { id: 'boss_defeated_1',   desc: 'Defeat 1 boss in Hunt today',          target: 1,   tier: 'hard',     reward: { coins: 1500, diamonds: 20, frags: 1 } },
    { id: 'tower_peak',        desc: 'Beat your Tower personal record today',target: 1,   tier: 'hard',     reward: { coins: 1500, diamonds: 20, frags: 1 } },
  ];

  const TUNABLES = Object.freeze({
    DAILY_PICK_COUNT: 5,  // total per day (3 easy + 1 standard + 1 hard)
    EASY_PER_DAY: 3,
    STANDARD_PER_DAY: 1,
    HARD_PER_DAY: 1,
    NO_REPEAT_WINDOW: 4, // days before a mission may recur
  });

  // Dynamic event missions — populated by WG.LtdEvents via setEventMissions()
  var EVENT_MISSIONS = [];

  // ─── Concern B: Weekly missions catalog ───────────────────────────────────
  const WEEKLY_MISSIONS = [
    { id: 'wk_kill_500',        desc: 'Kill 500 enemies this week', target: 500,  reward: { coins: 2000, diamonds: 50 } },
    { id: 'wk_clear_15_stages', desc: 'Clear 15 Hunt stages',       target: 15,   reward: { diamonds: 100, energy: 50 } },
    { id: 'wk_tower_floor_15',  desc: 'Reach Tower floor 15',       target: 15,   reward: { diamonds: 200, rareMat: 1 } },
    { id: 'wk_duel_wins_15',    desc: 'Win 15 Duel matches',        target: 15,   reward: { diamonds: 80 } },
    { id: 'wk_chests_50',       desc: 'Open 50 treasure chests',    target: 50,   reward: { coins: 1500, diamonds: 60 } },
  ];

  // Deterministic seeded RNG — same date + userId always yields the same mission set.
  function _seededRng(seed) {
    let s = seed | 0;
    return function() {
      s = (s ^ (s << 13)) | 0;
      s = (s ^ (s >>> 17)) | 0;
      s = (s ^ (s << 5)) | 0;
      return (s >>> 0) / 0xFFFFFFFF;
    };
  }

  function _dateToSeed(str) {
    let n = 0;
    for (let i = 0; i < str.length; i++) n = (n * 31 + str.charCodeAt(i)) | 0;
    return n;
  }

  // Pick n missions from a tier pool, excluding missions seen in the previous
  // NO_REPEAT_WINDOW-1 days. Falls back to unrestricted pick if pool is too small.
  function _pickFromTier(tierPool, n, epochDay, uid, tierOffset) {
    var excluded = {};
    for (var d = 1; d < TUNABLES.NO_REPEAT_WINDOW; d++) {
      var pSeed = _dateToSeed(String(epochDay - d)) ^ _dateToSeed(uid) ^ tierOffset;
      var pRng  = _seededRng(pSeed);
      var pArr  = tierPool.slice();
      for (var pi = 0; pi < n && pi < pArr.length; pi++) {
        var pj   = pi + Math.floor(pRng() * (pArr.length - pi));
        var ptmp = pArr[pi]; pArr[pi] = pArr[pj]; pArr[pj] = ptmp;
        excluded[pArr[pi].id] = true;
      }
    }
    var available = tierPool.filter(function(m) { return !excluded[m.id]; });
    var src  = (available.length >= n) ? available : tierPool;
    var seed = _dateToSeed(String(epochDay)) ^ _dateToSeed(uid) ^ tierOffset;
    var rng  = _seededRng(seed);
    var arr  = src.slice();
    var picks = [];
    for (var i = 0; i < n && i < arr.length; i++) {
      var j   = i + Math.floor(rng() * (arr.length - i));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
      picks.push(arr[i].id);
    }
    return picks;
  }

  function _pickDailySet(dateStr, userId) {
    var uid      = String(userId || 'anon');
    var epochDay = Math.floor(new Date(dateStr).getTime() / 86400000);
    var easy     = DAILY_MISSIONS.filter(function(m) { return m.tier === 'easy'; });
    var standard = DAILY_MISSIONS.filter(function(m) { return m.tier === 'standard'; });
    var hard     = DAILY_MISSIONS.filter(function(m) { return m.tier === 'hard'; });
    return [].concat(
      _pickFromTier(easy,     TUNABLES.EASY_PER_DAY,     epochDay, uid, 0),
      _pickFromTier(standard, TUNABLES.STANDARD_PER_DAY, epochDay, uid, 1000000),
      _pickFromTier(hard,     TUNABLES.HARD_PER_DAY,     epochDay, uid, 2000000)
    );
  }

  function _weekStartStr(now) {
    const d = new Date(now);
    const day = d.getDay(); // 0=Sun..6=Sat; Monday=1
    const diff = (day === 0 ? -6 : 1 - day);
    d.setDate(d.getDate() + diff);
    return d.getFullYear() + '-' +
           String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0');
  }

  function ensureState() {
    const s = WG.State.get();
    if (!s.missions) {
      s.missions = { date: '', daily: {}, weekStart: '', weekly: {}, event: {} };
    }
    if (!s.missions.event) s.missions.event = {};
  }

  function _grantReward(reward) {
    if (!reward) return;
    if (reward.coins)    WG.State.grant('coins', reward.coins);
    if (reward.diamonds) WG.State.grant('diamonds', reward.diamonds);
    if (reward.gems)     WG.State.grant('gems', reward.gems);
    if (reward.energy && WG.State.grantEnergy) WG.State.grantEnergy(reward.energy, 'mission-reward');
    if (reward.frags) {
      const s = WG.State.get();
      s.forge.craftFragments = (s.forge.craftFragments || 0) + reward.frags;
      WG.Engine.emit('currency:change', { currency: 'frags', value: s.forge.craftFragments, delta: reward.frags });
    }
    if (reward.rareMat) {
      const s = WG.State.get();
      s.forge.rareMaterials = (s.forge.rareMaterials || 0) + reward.rareMat;
    }
  }

  function refreshDaily(dateStr) {
    ensureState();
    const ms = WG.State.get().missions;
    if (ms.date === dateStr) return;
    const userId = WG.State.get().meta && WG.State.get().meta.deviceId;
    const picks = _pickDailySet(dateStr, userId || 'anon');
    ms.date = dateStr;
    ms.daily = {};
    for (const id of picks) ms.daily[id] = { progress: 0, claimed: false };
  }

  function refreshWeekly(weekStartStr) {
    ensureState();
    const ms = WG.State.get().missions;
    if (ms.weekStart === weekStartStr) return;
    ms.weekStart = weekStartStr;
    ms.weekly = {};
    for (const m of WEEKLY_MISSIONS) ms.weekly[m.id] = { progress: 0, claimed: false };
  }

  function checkAndRefresh() {
    const today = WG.MetaDailyReset ? WG.MetaDailyReset.todayStr() : new Date().toISOString().slice(0, 10);
    refreshDaily(today);
    refreshWeekly(_weekStartStr(Date.now()));
  }

  // increment progress for a given mission id (daily or weekly)
  function increment(id, amount) {
    ensureState();
    const ms = WG.State.get().missions;
    amount = amount || 1;
    const tryUpdate = function(tracker, defList) {
      if (!tracker) return;
      if (tracker.claimed) return;
      const mDef = defList.find(function(m) { return m.id === id; });
      if (!mDef) return;
      const prev = tracker.progress;
      tracker.progress = Math.min(tracker.progress + amount, mDef.target);
      if (tracker.progress !== prev) {
        WG.Engine.emit('mission:progress', { id, progress: tracker.progress, target: mDef.target });
      }
    };
    tryUpdate(ms.daily[id], DAILY_MISSIONS);
    tryUpdate(ms.weekly[id], WEEKLY_MISSIONS);
    tryUpdate(ms.event[id], EVENT_MISSIONS);
  }

  function claim(id) {
    ensureState();
    const ms = WG.State.get().missions;
    // Look in daily first, then weekly
    var mDef = DAILY_MISSIONS.find(function(m) { return m.id === id; });
    var tracker = ms.daily[id];
    var isWeekly = false;
    if (!mDef || !tracker) {
      mDef = WEEKLY_MISSIONS.find(function(m) { return m.id === id; });
      tracker = ms.weekly[id];
      isWeekly = true;
    }
    if (!mDef || !tracker) {
      // Check event missions last
      mDef    = EVENT_MISSIONS.find(function(m) { return m.id === id; });
      tracker = ms.event[id];
      if (!mDef || !tracker) return false;
      if (tracker.claimed) return false;
      if (tracker.progress < mDef.target) return false;
      tracker.claimed = true;
      _grantReward(mDef.reward);
      WG.Engine.emit('mission:claimed', { id, type: 'event', reward: mDef.reward, bpXP: 0 });
      return true;
    }
    if (tracker.claimed) return false;
    if (tracker.progress < mDef.target) return false;
    tracker.claimed = true;
    _grantReward(mDef.reward);
    const bpXP = isWeekly ? 200 : 50;
    if (WG.BattlePass && WG.BattlePass.addXP) WG.BattlePass.addXP(bpXP, 'mission-claimed');
    WG.Engine.emit('mission:claimed', { id, type: isWeekly ? 'weekly' : 'daily', reward: mDef.reward, bpXP });
    return true;
  }

  function getActive() {
    ensureState();
    const ms = WG.State.get().missions;
    const daily = DAILY_MISSIONS
      .filter(function(m) { return ms.daily[m.id] !== undefined; })
      .map(function(m) {
        return { id: m.id, desc: m.desc, target: m.target, reward: m.reward,
                 progress: ms.daily[m.id].progress, claimed: ms.daily[m.id].claimed };
      });
    const weekly = WEEKLY_MISSIONS.map(function(m) {
      const t = ms.weekly[m.id] || { progress: 0, claimed: false };
      return { id: m.id, desc: m.desc, target: m.target, reward: m.reward,
               progress: t.progress, claimed: t.claimed };
    });
    const event = EVENT_MISSIONS.map(function(m) {
      const t = ms.event[m.id] || { progress: 0, claimed: false };
      return { id: m.id, desc: m.desc, target: m.target, reward: m.reward,
               progress: t.progress, claimed: t.claimed, eventName: m.eventName };
    });
    return { daily: daily, weekly: weekly, event: event };
  }

  // ─── Concern F: Event dispatcher ──────────────────────────────────────────
  // Single hub — all mission progress + battle-pass XP wired here.
  function _wireEvents() {
    var eng = WG.Engine;

    // Kill missions
    eng.on('enemy:killed', function() {
      increment('kill_30', 1);
      increment('kill_100', 1);
      increment('wk_kill_500', 1);
    });

    // Stage clear missions + BP XP
    eng.on('hunt:stage-cleared', function() {
      increment('clear_2_stages', 1);
      increment('clear_5_stages', 1);
      increment('wk_clear_15_stages', 1);
      if (WG.BattlePass && WG.BattlePass.addXP) WG.BattlePass.addXP(20, 'stage-clear');
    });

    // Tower floor missions + BP XP.
    // tower:floor-start fires at the start of each floor (floor=1 on run start).
    // Increment by 1 per floor-start so target=5 means "reach floor 5".
    eng.on('tower:floor-start', function(e) {
      var floor = (e && e.floor) ? e.floor : 0;
      if (floor >= 1) {
        increment('tower_floor_5', 1);
        increment('wk_tower_floor_15', 1);
      }
      if (WG.BattlePass && WG.BattlePass.addXP) WG.BattlePass.addXP(5, 'tower-floor');
    });

    // Duel win missions — duel:match-result emitted by duel-match.js resolve()
    eng.on('duel:match-result', function(e) {
      if (e && e.won) {
        increment('win_3_duels', 1);
        increment('wk_duel_wins_15', 1);
      }
    });

    // Craft mission — fires once per 10-craft batch; 1 progress per batch
    eng.on('forge:craft-batch', function() {
      increment('craft_1', 1);
      // wk_chests_50: craft batches proxy for "open chests" until a dedicated
      // chest:opened event is added in a future pass.
      increment('wk_chests_50', 1);
    });

    // Relic pull mission
    eng.on('relics:gained', function() {
      increment('pull_relic', 1);
    });

    // Orb pickup mission
    eng.on('pickup:orb', function() {
      increment('pickup_50_orbs', 1);
    });

    // Critical hit mission
    eng.on('enemy:crit', function() {
      increment('crit_10', 1);
    });

    // Combo mission — each combo:step fires when combo count increases by 1.
    // target=15 completes when the player lands 15 consecutive kills.
    eng.on('combo:step', function() {
      increment('combo_15', 1);
    });

    // Level-up mission
    eng.on('player:level', function() {
      increment('level_up', 1);
    });

    // Buff ad-watch mission — filter for buff rewards specifically
    eng.on('ad:rewarded', function(e) {
      if (e && typeof e.reward === 'string' && e.reward.indexOf('buff:') === 0) {
        increment('buff_ad_watch', 1);
      }
    });

    // Boss defeated → mission + BP XP
    eng.on('boss:defeated', function() {
      increment('boss_defeated_1', 1);
      if (WG.BattlePass && WG.BattlePass.addXP) WG.BattlePass.addXP(100, 'boss-defeated');
    });

    // Tower run end → floor-5-in-one-run + personal-record missions
    eng.on('tower:run-end', function(e) {
      if (e && e.floor >= 5) increment('tower_climb_5', 1);
      if (e && e.isNewRecord) increment('tower_peak', 1);
    });

    // Gold Mine collect
    eng.on('forge:mine-collected', function() {
      increment('forge_gold_mine', 1);
    });

    // Alliance gift sent
    eng.on('alliance:gift-sent', function() {
      increment('send_gifts_3', 1);
    });

    // Coin pickup in Hunt
    eng.on('pickup:coin', function() {
      increment('pickup_coins_200', 1);
    });

    // Daily login reward claimed
    eng.on('daily:claimed', function() {
      increment('claim_daily_login', 1);
    });

    // Daily reset — refresh missions for the new day; also check weekly
    eng.on('daily:reset', function(e) {
      var day = (e && e.day) ? e.day : (WG.MetaDailyReset ? WG.MetaDailyReset.todayStr() : '');
      refreshDaily(day);
      refreshWeekly(_weekStartStr(Date.now()));
    });
  }

  // ─── Concern C: Missions Modal UI ─────────────────────────────────────────
  function _missionIcon(id) {
    var icons = {
      kill_30: '⚔', kill_100: '⚔', clear_2_stages: '🏆', clear_5_stages: '🏆',
      tower_floor_5: '🗼', win_3_duels: '🥊', craft_1: '🔨', pull_relic: '💎',
      pickup_50_orbs: '🔮', crit_10: '💥', combo_15: '🔥', level_up: '🎯',
      buff_ad_watch: '📺',
      // W-Daily-Mission-Expand new entries
      forge_gold_mine: '⛏', send_gifts_3: '🎁', pickup_coins_200: '🪙',
      claim_daily_login: '📅', tower_climb_5: '🗼', boss_defeated_1: '💀',
      tower_peak: '🏔',
      // weekly
      wk_kill_500: '⚔', wk_clear_15_stages: '🏆',
      wk_tower_floor_15: '🗼', wk_duel_wins_15: '🥊', wk_chests_50: '📦',
    };
    return icons[id] || '📋';
  }

  function _rewardLine(reward) {
    var parts = [];
    if (reward.coins)    parts.push('+' + reward.coins + '🪙');
    if (reward.diamonds) parts.push('+' + reward.diamonds + '💎');
    if (reward.gems)     parts.push('+' + reward.gems + '💎');
    if (reward.energy)   parts.push('+' + reward.energy + '⚡');
    if (reward.frags)    parts.push('+' + reward.frags + '🔷');
    if (reward.rareMat)  parts.push('+' + reward.rareMat + '⭐');
    return parts.join('  ');
  }

  // Register event missions dynamically (called by WG.LtdEvents on init + hourly)
  function setEventMissions(defs) {
    EVENT_MISSIONS = defs || [];
    ensureState();
    const ms = WG.State.get().missions;
    EVENT_MISSIONS.forEach(function(m) {
      if (!ms.event[m.id]) ms.event[m.id] = { progress: 0, claimed: false };
    });
  }

  function clearEventMissions() {
    EVENT_MISSIONS = [];
  }

  function _injectPulseStyle() {
    if (document.getElementById('wg-mission-style')) return;
    var s = document.createElement('style');
    s.id = 'wg-mission-style';
    s.textContent = '@keyframes missionClaim{0%,100%{box-shadow:0 0 4px #a8d87880;}50%{box-shadow:0 0 10px #a8d878cc;}}';
    document.head.appendChild(s);
  }

  function openModal(initialTab) {
    _injectPulseStyle();
    var existing = document.getElementById('wg-missions-modal');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

    var overlay = document.createElement('div');
    overlay.id = 'wg-missions-modal';
    overlay.className = 'modal-overlay show';
    overlay.style.cssText = 'z-index:120;';

    var activeTab = initialTab || 'daily';

    function render() {
      overlay.innerHTML = '';
      var card = document.createElement('div');
      card.className = 'modal-card';
      card.style.cssText = 'width:92%;max-width:360px;max-height:80vh;display:flex;flex-direction:column;padding:0;overflow:hidden;';

      // ── Header + pills
      var hdr = document.createElement('div');
      hdr.style.cssText = 'padding:14px 16px 10px 16px;flex:0 0 auto;';

      var title = document.createElement('div');
      title.style.cssText = 'font-size:15px;color:#f0d890;font-weight:700;letter-spacing:2px;text-align:center;margin-bottom:10px;';
      title.textContent = 'MISSIONS';
      hdr.appendChild(title);

      var pills = document.createElement('div');
      pills.style.cssText = 'display:flex;gap:6px;';
      var tabList = ['DAILY', 'WEEKLY'];
      if (getActive().event && getActive().event.length) tabList.push('EVENT');
      tabList.forEach(function(tab) {
        var pill = document.createElement('button');
        pill.textContent = tab;
        var isAct = (activeTab === tab.toLowerCase());
        var isEvt = tab === 'EVENT';
        pill.style.cssText = 'flex:1;padding:7px 0;border-radius:16px;font-size:11px;font-weight:700;letter-spacing:1px;cursor:pointer;border:none;' +
          (isAct
            ? (isEvt ? 'background:linear-gradient(to bottom,#6010a0,#3a0860);color:#d8b0ff;'
                     : 'background:linear-gradient(to bottom,#806020,#5a3c0a);color:#fff0c8;')
            : (isEvt ? 'background:rgba(160,64,224,0.12);color:#9060c8;'
                     : 'background:rgba(255,255,255,0.07);color:#a08858;'));
        pill.addEventListener('click', function() { activeTab = tab.toLowerCase(); render(); });
        pills.appendChild(pill);
      });
      hdr.appendChild(pills);
      card.appendChild(hdr);

      // ── Mission list
      var list = document.createElement('div');
      list.style.cssText = 'flex:1;overflow-y:auto;padding:0 12px 4px 12px;';

      var active = getActive();
      var missions = activeTab === 'daily' ? active.daily
                   : activeTab === 'event' ? (active.event || [])
                   : active.weekly;

      missions.forEach(function(m) {
        var pct = Math.min(1, m.progress / m.target);
        var complete = pct >= 1;
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:9px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);';

        // Icon
        var icon = document.createElement('div');
        icon.style.cssText = 'flex:0 0 34px;height:34px;border-radius:8px;background:rgba(255,255,255,0.05);border:1px solid #3a2818;display:flex;align-items:center;justify-content:center;font-size:16px;';
        icon.textContent = _missionIcon(m.id);
        row.appendChild(icon);

        // Middle
        var mid = document.createElement('div');
        mid.style.cssText = 'flex:1;min-width:0;';

        var desc = document.createElement('div');
        desc.style.cssText = 'font-size:12px;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;' +
          (m.claimed ? 'color:#604838;text-decoration:line-through;' : complete ? 'color:#f0d890;' : 'color:#d0b878;');
        desc.textContent = m.desc;
        mid.appendChild(desc);

        var barBg = document.createElement('div');
        barBg.style.cssText = 'height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;';
        var barFill = document.createElement('div');
        barFill.style.cssText = 'height:100%;border-radius:2px;width:' + Math.round(pct * 100) + '%;' +
          (complete ? 'background:#a8d878;box-shadow:0 0 4px #a8d87880;' : 'background:#a06828;');
        barBg.appendChild(barFill);
        mid.appendChild(barBg);

        var prog = document.createElement('div');
        prog.style.cssText = 'font-size:10px;color:#807060;margin-top:3px;';
        prog.textContent = m.progress + ' / ' + m.target;
        mid.appendChild(prog);

        row.appendChild(mid);

        // Right: reward + claim button
        var right = document.createElement('div');
        right.style.cssText = 'flex:0 0 auto;display:flex;flex-direction:column;align-items:flex-end;gap:4px;min-width:58px;';

        var rwdEl = document.createElement('div');
        rwdEl.style.cssText = 'font-size:10px;color:#c8a868;text-align:right;line-height:1.4;white-space:nowrap;';
        rwdEl.textContent = _rewardLine(m.reward);
        right.appendChild(rwdEl);

        if (!m.claimed) {
          var btn = document.createElement('button');
          btn.textContent = complete ? 'CLAIM' : '—';
          btn.disabled = !complete;
          btn.style.cssText = 'padding:5px 9px;border-radius:5px;font-size:10px;font-weight:700;letter-spacing:0.5px;border:none;' +
            (complete ? 'background:linear-gradient(to bottom,#a8d878,#5a9030);color:#0a1808;cursor:pointer;animation:missionClaim 1.8s infinite;'
                      : 'background:rgba(255,255,255,0.05);color:#604838;cursor:default;');
          btn.addEventListener('click', function() {
            if (claim(m.id)) render();
          });
          right.appendChild(btn);
        } else {
          var done = document.createElement('div');
          done.style.cssText = 'font-size:13px;color:#5a8040;font-weight:700;padding:3px 6px;';
          done.textContent = '✓';
          right.appendChild(done);
        }
        row.appendChild(right);
        list.appendChild(row);
      });

      card.appendChild(list);

      // ── Footer: countdown + close
      var now = new Date();
      var countdown;
      if (activeTab === 'daily') {
        var midnight = new Date(now); midnight.setHours(24, 0, 0, 0);
        var secs = Math.floor((midnight - now) / 1000);
        countdown = 'Resets in ' + String(Math.floor(secs / 3600)).padStart(2,'0') + ':' +
                    String(Math.floor((secs % 3600) / 60)).padStart(2,'0') + ':' +
                    String(secs % 60).padStart(2,'0');
      } else if (activeTab === 'event') {
        countdown = 'Event missions active';
      } else {
        var monday = new Date(now);
        var diff = (1 - monday.getDay() + 7) % 7 || 7;
        monday.setDate(monday.getDate() + diff); monday.setHours(0,0,0,0);
        var days = Math.ceil((monday - now) / 86400000);
        countdown = 'Resets in ' + days + ' day' + (days !== 1 ? 's' : '');
      }

      var footer = document.createElement('div');
      footer.style.cssText = 'flex:0 0 auto;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(255,255,255,0.07);';

      var cdown = document.createElement('div');
      cdown.style.cssText = 'font-size:10px;color:#806848;';
      cdown.textContent = countdown;
      footer.appendChild(cdown);

      var closeBtn = document.createElement('button');
      closeBtn.className = 'btn';
      closeBtn.style.cssText = 'padding:7px 16px;font-size:11px;';
      closeBtn.textContent = 'CLOSE';
      closeBtn.addEventListener('click', function() {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      });
      footer.appendChild(closeBtn);
      card.appendChild(footer);

      overlay.appendChild(card);
      // Tap outside = close
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }
      });
    }

    render();
    (document.getElementById('modal-root') || document.body).appendChild(overlay);
  }

  function init() {
    ensureState();
    checkAndRefresh();
    _wireEvents();
  }

  window.WG.Missions = {
    init, checkAndRefresh, refreshDaily, refreshWeekly,
    increment, claim, getActive, openModal,
    setEventMissions, clearEventMissions,
    DAILY_MISSIONS, WEEKLY_MISSIONS, TUNABLES,
  };
})();
