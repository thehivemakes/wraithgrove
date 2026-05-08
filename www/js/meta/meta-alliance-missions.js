// WG.AllianceMissions — 5 daily alliance missions, gift system, points-spend modal
(function(){'use strict';

  // 5 daily missions (Architect-locked)
  const DAILY_MISSIONS = Object.freeze([
    {
      id:     'stages_30',
      label:  'Members complete 30 Hunt stages today',
      goal:   30,
      reward: 5,  // alliance points
    },
    {
      id:     'boss_100k',
      label:  'Alliance damages boss for 100K total',
      goal:   100000,
      reward: 5,
    },
    {
      id:     'members_login_5',
      label:  '5 members log in today',
      goal:   5,
      reward: 5,
    },
    {
      id:     'raids_win_2',
      label:  'Win 2 base raids together',
      goal:   2,
      reward: 5,
    },
    {
      id:     'gifts_10',
      label:  'Send 10 gifts among members',
      goal:   10,
      reward: 5,
    },
  ]);

  function _ensureState() {
    const a = window.WG && WG.Alliance && WG.Alliance.get();
    if (!a) return null;
    if (!a.dailyMissionState) a.dailyMissionState = {};
    DAILY_MISSIONS.forEach(function(m) {
      if (!a.dailyMissionState[m.id]) {
        a.dailyMissionState[m.id] = { progress: 0, claimed: false };
      }
    });
    return a.dailyMissionState;
  }

  function progress() {
    const ms = _ensureState();
    if (!ms) return [];
    return DAILY_MISSIONS.map(function(m) {
      const st = ms[m.id];
      return Object.assign({}, m, {
        progress: st.progress,
        claimed:  st.claimed,
        done:     st.progress >= m.goal,
      });
    });
  }

  function increment(missionId, amount) {
    const ms = _ensureState();
    if (!ms || !ms[missionId]) return;
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
    DAILY_MISSIONS.forEach(function(m) {
      if (!ms[m.id].claimed && ms[m.id].progress >= m.goal) {
        const r = claim(m.id);
        if (r.ok) claimed.push(m.id);
      }
    });
    return claimed;
  }

  function dailyReset() {
    const ms = _ensureState();
    if (!ms) return;
    DAILY_MISSIONS.forEach(function(m) {
      ms[m.id] = { progress: 0, claimed: false };
    });
    // Seed NPC-contributed progress so missions feel active at reset
    if (ms['stages_30'])     ms['stages_30'].progress    = Math.floor(Math.random() * 8) + 4;
    if (ms['members_login_5']) ms['members_login_5'].progress = 3; // 3 NPCs already "logged in"
    if (ms['gifts_10'])      ms['gifts_10'].progress     = Math.floor(Math.random() * 3) + 1;
    WG.Engine.emit('alliance:missions-reset', {});
    WG.Engine.emit('alliance:changed', {});
  }

  // ---- Points spend modal ----
  function openShopModal() {
    const existing = document.getElementById('wg-alliance-shop-modal');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

    const a = WG.Alliance && WG.Alliance.get();
    if (!a || !a.id) return;

    const SP = WG.Alliance.SPEND_POOL;
    const pts = a.points || 0;

    const overlay = document.createElement('div');
    overlay.id = 'wg-alliance-shop-modal';
    overlay.style.cssText = [
      'position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0.82);',
      'display:flex;align-items:center;justify-content:center;padding:16px;',
    ].join('');

    const card = document.createElement('div');
    card.style.cssText = [
      'background:linear-gradient(to bottom,#2a1c10,#1a1006);',
      'border:2px solid #604020;border-radius:12px;padding:20px;',
      'width:min(360px,100%);max-height:90vh;overflow-y:auto;',
      'box-shadow:0 8px 32px rgba(0,0,0,0.7);',
    ].join('');

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;';
    header.innerHTML = [
      '<span style="font-size:15px;color:#f0d890;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Alliance Shop</span>',
      '<span style="font-size:13px;color:#c0a040;font-weight:700;">⚑ ' + pts + ' pts</span>',
    ].join('');

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'background:none;border:none;color:#a08858;font-size:18px;cursor:pointer;padding:0;';
    closeBtn.addEventListener('click', function() { overlay.remove(); });
    header.appendChild(closeBtn);
    card.appendChild(header);

    Object.keys(SP).forEach(function(key) {
      const def   = SP[key];
      const canAfford = pts >= def.cost;
      const row = document.createElement('div');
      row.style.cssText = [
        'display:flex;align-items:center;gap:12px;padding:12px;',
        'background:rgba(255,255,255,0.03);border-radius:8px;',
        'border:1px solid #3a2818;margin-bottom:8px;',
      ].join('');
      row.innerHTML = [
        '<div style="flex:1;">',
          '<div style="font-size:12px;color:#f0d890;font-weight:600;letter-spacing:0.5px;">' + _esc(def.label) + '</div>',
          '<div style="font-size:10px;color:#907858;margin-top:2px;">' + _esc(def.desc) + '</div>',
        '</div>',
        '<button class="wg-shop-btn" data-key="' + key + '" style="',
          'padding:8px 14px;border-radius:6px;border:1px solid ' + (canAfford ? '#b08840' : '#4a3018') + ';',
          'background:' + (canAfford ? 'linear-gradient(to bottom,#806020,#5a3c0a)' : 'rgba(30,18,6,0.8)') + ';',
          'color:' + (canAfford ? '#fff0c8' : '#6a5038') + ';',
          'font-size:10px;font-weight:700;letter-spacing:1px;cursor:' + (canAfford ? 'pointer' : 'not-allowed') + ';',
          'white-space:nowrap;">',
          '⚑ ' + def.cost,
        '</button>',
      ].join('');
      card.appendChild(row);
    });

    overlay.appendChild(card);
    overlay.addEventListener('click', function(e){ if (e.target === overlay) overlay.remove(); });

    // Spend button handlers (delegated)
    card.addEventListener('click', function(e) {
      const btn = e.target.closest('.wg-shop-btn');
      if (!btn) return;
      const key = btn.dataset.key;
      const result = WG.Alliance.spend(key);
      if (result.ok) {
        _showToast('Purchased! ' + SP[key].label);
        // Refresh modal with updated points
        overlay.remove();
        openShopModal();
      } else if (result.reason === 'insufficient_points') {
        _showToast('Not enough alliance points');
      } else if (result.reason === 'cap_maxed') {
        _showToast('Member cap is already at maximum (50)');
      } else {
        _showToast('Could not purchase: ' + result.reason);
      }
    });

    document.body.appendChild(overlay);
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
    // Wire mission progress events
    WG.Engine.on('hunt:stage-cleared', function() {
      increment('stages_30', 1);
    });
    WG.Engine.on('duel:match-result', function(ev) {
      if (ev && ev.won) increment('raids_win_2', 1);
    });
    WG.Engine.on('alliance:gift-sent', function() {
      increment('gifts_10', 1);
    });
    WG.Engine.on('daily:reset', function() {
      dailyReset();
    });
    WG.Engine.on('alliance:created', function() {
      _ensureState();
      dailyReset(); // seed fresh NPC progress
    });
    WG.Engine.on('alliance:joined', function() {
      _ensureState();
      dailyReset();
    });
  }

  window.WG.AllianceMissions = {
    init, progress, increment, claim, claimAll, dailyReset,
    openShopModal, DAILY_MISSIONS,
  };
})();
