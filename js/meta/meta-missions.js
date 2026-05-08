// WG.Missions — Daily + weekly missions catalog, tracker, UI, and event dispatcher.
// W-Monetization-V2-Missions-Pass Concerns A (daily) + B (weekly) + C (UI) + F (events)
(function(){'use strict';

  // ─── Concern A: Daily missions catalog ────────────────────────────────────
  const DAILY_MISSIONS = [
    { id: 'kill_30',        desc: 'Kill 30 enemies',           target: 30,  reward: { coins: 100,  diamonds: 5 } },
    { id: 'kill_100',       desc: 'Kill 100 enemies',          target: 100, reward: { coins: 300,  energy: 10 } },
    { id: 'clear_2_stages', desc: 'Clear 2 Hunt stages',       target: 2,   reward: { diamonds: 10 } },
    { id: 'clear_5_stages', desc: 'Clear 5 Hunt stages',       target: 5,   reward: { coins: 500,  diamonds: 15 } },
    { id: 'tower_floor_5',  desc: 'Reach Tower floor 5',       target: 5,   reward: { diamonds: 20, frags: 5 } },
    { id: 'win_3_duels',    desc: 'Win 3 Duel matches',        target: 3,   reward: { coins: 200,  diamonds: 8 } },
    { id: 'craft_1',        desc: 'Craft 1 building',          target: 1,   reward: { coins: 150 } },
    { id: 'pull_relic',     desc: 'Pull 1 relic',              target: 1,   reward: { frags: 10 } },
    { id: 'pickup_50_orbs', desc: 'Pick up 50 orbs',           target: 50,  reward: { coins: 100,  energy: 5 } },
    { id: 'crit_10',        desc: 'Land 10 critical hits',     target: 10,  reward: { diamonds: 5 } },
    { id: 'combo_15',       desc: 'Reach 15-kill combo',       target: 15,  reward: { coins: 200,  diamonds: 10 } },
    { id: 'level_up',       desc: 'Level up 1 character',      target: 1,   reward: { coins: 100 } },
    { id: 'buff_ad_watch',  desc: 'Watch 1 buff ad',           target: 1,   reward: { diamonds: 5 } },
  ];

  const TUNABLES = Object.freeze({
    DAILY_PICK_COUNT: 5,
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

  function _pickDailySet(dateStr, userId) {
    const seed = _dateToSeed(dateStr) ^ _dateToSeed(String(userId || 'anon'));
    const rng = _seededRng(seed);
    const pool = DAILY_MISSIONS.slice();
    const picks = [];
    for (let i = 0; i < TUNABLES.DAILY_PICK_COUNT; i++) {
      const j = i + Math.floor(rng() * (pool.length - i));
      const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
      picks.push(pool[i].id);
    }
    return picks;
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

    // Boss defeated → BP XP
    eng.on('boss:defeated', function() {
      if (WG.BattlePass && WG.BattlePass.addXP) WG.BattlePass.addXP(100, 'boss-defeated');
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
