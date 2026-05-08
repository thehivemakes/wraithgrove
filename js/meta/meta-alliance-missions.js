// WG.AllianceMissions — 12-pool daily alliance missions, 5 picked per day (W-Daily-Mission-Expand)
(function(){'use strict';

  // Full pool of 12 alliance missions (W-Daily-Mission-Expand Concern C)
  const DAILY_MISSIONS = Object.freeze([
    // original 5
    { id: 'stages_30',        label: 'Members complete 30 Hunt stages',         goal: 30,     reward: 5 },
    { id: 'boss_100k',        label: 'Alliance deals 100K damage to the boss',   goal: 100000, reward: 5 },
    { id: 'members_login_5',  label: '5 members log in today',                   goal: 5,      reward: 5 },
    { id: 'raids_win_2',      label: 'Win 2 base raids together',                goal: 2,      reward: 5 },
    { id: 'gifts_10',         label: 'Send 10 gifts among members',              goal: 10,     reward: 5 },
    // 7 new additions
    { id: 'kills_500',        label: 'Members collectively kill 500 enemies',    goal: 500,    reward: 5 },
    { id: 'tower_floors_30',  label: 'Members climb 30 Tower floors combined',   goal: 30,     reward: 5 },
    { id: 'boss_150k',        label: 'Alliance deals 150K damage to the boss',   goal: 150000, reward: 8 },
    { id: 'gifts_25',         label: 'Send 25 gifts among members',              goal: 25,     reward: 8 },
    { id: 'members_login_10', label: '10 members log in today',                  goal: 10,     reward: 8 },
    { id: 'raids_win_5',      label: 'Win 5 base raids together',                goal: 5,      reward: 8 },
    { id: 'applications_3',   label: 'Accept 3 new alliance applications',       goal: 3,      reward: 5 },
  ]);

  const ACTIVE_COUNT = 5; // missions shown per day

  // ─── Seeded daily picker ──────────────────────────────────────────────────
  function _dateToSeed(str) {
    var n = 0;
    for (var i = 0; i < str.length; i++) n = (n * 31 + str.charCodeAt(i)) | 0;
    return n;
  }

  function _seededRng(seed) {
    var s = seed | 0;
    return function() {
      s = (s ^ (s << 13)) | 0;
      s = (s ^ (s >>> 17)) | 0;
      s = (s ^ (s << 5))  | 0;
      return (s >>> 0) / 0xFFFFFFFF;
    };
  }

  function _activeMissionIds(dateStr) {
    if (!dateStr) dateStr = new Date().toISOString().slice(0, 10);
    var rng  = _seededRng(_dateToSeed(dateStr));
    var pool = DAILY_MISSIONS.slice();
    var ids  = [];
    for (var i = 0; i < ACTIVE_COUNT; i++) {
      var j = i + Math.floor(rng() * (pool.length - i));
      var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
      ids.push(pool[i].id);
    }
    return ids;
  }

  function _todayStr() {
    return window.WG && WG.MetaDailyReset ? WG.MetaDailyReset.todayStr()
                                           : new Date().toISOString().slice(0, 10);
  }

  function _ensureState(dateStr) {
    const a = window.WG && WG.Alliance && WG.Alliance.get();
    if (!a) return null;
    if (!a.dailyMissionState) a.dailyMissionState = {};
    const ids = _activeMissionIds(dateStr || _todayStr());
    ids.forEach(function(id) {
      if (!a.dailyMissionState[id]) {
        a.dailyMissionState[id] = { progress: 0, claimed: false };
      }
    });
    return a.dailyMissionState;
  }

  function _activeMissionDefs(dateStr) {
    const ids = _activeMissionIds(dateStr || _todayStr());
    return ids.map(function(id) {
      return DAILY_MISSIONS.find(function(m) { return m.id === id; });
    }).filter(Boolean);
  }

  function progress() {
    const ms = _ensureState();
    if (!ms) return [];
    return _activeMissionDefs().map(function(m) {
      const st = ms[m.id] || { progress: 0, claimed: false };
      return Object.assign({}, m, {
        progress: st.progress,
        claimed:  st.claimed,
        done:     st.progress >= m.goal,
      });
    });
  }

  function increment(missionId, amount) {
    const ms = _ensureState();
    if (!ms || !ms[missionId]) return; // not in today's active set
    const m = DAILY_MISSIONS.find(function(d){ return d.id === missionId; });
    if (!m) return;
    if (ms[missionId].claimed) return;
    ms[missionId].progress = Math.min(m.goal, ms[missionId].progress + (amount || 1));
    WG.Engine.emit('alliance:mission-progress', { missionId, progress: ms[missionId].progress, goal: m.goal });
    WG.Engine.emit('alliance:changed', {});
  }

  function claim(missionId) {
    const ms = _ensureState();
    if (!ms || !ms[missionId]) return { ok: false, reason: 'not_found' };
    const m = DAILY_MISSIONS.find(function(d){ return d.id === missionId; });
    if (!m) return { ok: false, reason: 'not_found' };
    if (ms[missionId].claimed) return { ok: false, reason: 'already_claimed' };
    if (ms[missionId].progress < m.goal) return { ok: false, reason: 'not_complete' };
    ms[missionId].claimed = true;
    if (WG.Alliance && WG.Alliance.addPoints) WG.Alliance.addPoints(m.reward);
    WG.Engine.emit('alliance:mission-claimed', { missionId, reward: m.reward });
    WG.Engine.emit('alliance:changed', {});
    return { ok: true, reward: m.reward };
  }

  function claimAll() {
    const ms = _ensureState();
    if (!ms) return [];
    const claimed = [];
    _activeMissionDefs().forEach(function(m) {
      const st = ms[m.id];
      if (st && !st.claimed && st.progress >= m.goal) {
        const r = claim(m.id);
        if (r.ok) claimed.push(m.id);
      }
    });
    return claimed;
  }

  function dailyReset() {
    const a = window.WG && WG.Alliance && WG.Alliance.get();
    if (!a) return;
    // Clear all prior mission state, then initialise today's active 5
    a.dailyMissionState = {};
    const today = _todayStr();
    _ensureState(today);
    const ms = a.dailyMissionState;
    // Seed NPC-contributed progress so today's missions feel active at reset
    if (ms['stages_30'])        ms['stages_30'].progress        = Math.floor(Math.random() * 8) + 4;
    if (ms['kills_500'])        ms['kills_500'].progress        = Math.floor(Math.random() * 80) + 20;
    if (ms['tower_floors_30'])  ms['tower_floors_30'].progress  = Math.floor(Math.random() * 8) + 2;
    if (ms['members_login_5'])  ms['members_login_5'].progress  = 3;
    if (ms['members_login_10']) ms['members_login_10'].progress = 3;
    if (ms['gifts_10'])         ms['gifts_10'].progress         = Math.floor(Math.random() * 3) + 1;
    if (ms['gifts_25'])         ms['gifts_25'].progress         = Math.floor(Math.random() * 3) + 1;
    WG.Engine.emit('alliance:missions-reset', {});
    WG.Engine.emit('alliance:changed', {});
  }

  // ---- Points spend — delegates to AllianceRender shop sub-tab ----
  function openShopModal() {
    if (window.WG && WG.AllianceRender && WG.AllianceRender.openShop) {
      WG.AllianceRender.openShop();
    }
  }

  function _esc(s) {
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _showToast(msg) {
    const t = document.createElement('div');
    t.style.cssText = [
      'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);',
      'background:rgba(20,12,4,0.92);border:1px solid #604020;border-radius:8px;',
      'padding:10px 18px;color:#f0d890;font-size:12px;letter-spacing:1px;',
      'z-index:500;pointer-events:none;white-space:nowrap;',
      'animation:none;opacity:1;transition:opacity 400ms;',
    ].join('');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function(){ t.style.opacity='0'; }, 2200);
    setTimeout(function(){ if(t.parentNode) t.parentNode.removeChild(t); }, 2700);
  }

  function init() {
    _ensureState();

    WG.Engine.on('hunt:stage-cleared', function() {
      increment('stages_30', 1);
    });
    WG.Engine.on('enemy:killed', function() {
      increment('kills_500', 1);
    });
    WG.Engine.on('tower:floor-start', function() {
      increment('tower_floors_30', 1);
    });
    // Boss damage — allianceBoss:damage carries {amount}
    WG.Engine.on('allianceBoss:damage', function(ev) {
      var dmg = (ev && ev.amount) ? ev.amount : 0;
      if (dmg > 0) {
        increment('boss_100k', dmg);
        increment('boss_150k', dmg);
      }
    });
    WG.Engine.on('duel:match-result', function(ev) {
      if (ev && ev.won) {
        increment('raids_win_2', 1);
        increment('raids_win_5', 1);
      }
    });
    WG.Engine.on('alliance:gift-sent', function() {
      increment('gifts_10', 1);
      increment('gifts_25', 1);
    });
    WG.Engine.on('alliance:member-joined', function() {
      increment('applications_3', 1);
      increment('members_login_5', 1);
      increment('members_login_10', 1);
    });
    WG.Engine.on('daily:reset', function() {
      dailyReset();
    });
    WG.Engine.on('alliance:created', function() {
      dailyReset();
    });
    WG.Engine.on('alliance:joined', function() {
      dailyReset();
    });
  }

  window.WG.AllianceMissions = {
    init, progress, increment, claim, claimAll, dailyReset,
    openShopModal, DAILY_MISSIONS, ACTIVE_COUNT,
    activeMissionDefs: _activeMissionDefs,
  };
})();
