// WG.AllianceRender — Alliance tab DOM: roster, missions, chat, MOTD, shop, boss
(function(){'use strict';

  let _subTab = 'roster'; // 'roster' | 'boss' | 'leaderboard' | 'shop'
  let _shopCat = 'cosmetics'; // 'cosmetics' | 'buffs' | 'building_skins' | 'member_benefits'
  let _warCountdownTimer = 0;

  // Recruitment browser filter state
  let _filterOpenOnly = false;
  let _filterTier     = null;
  let _filterLanguage = null;

  function _esc(s) {
    return String(s || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _fmtPts(n) { return (n || 0).toLocaleString(); }
  function _fmt(n)    { return Math.floor(n||0).toLocaleString(); }

  function _fmtCountdown(ms) {
    if (ms <= 0) return '0s';
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    if (h > 0) return h + 'h ' + m + 'm';
    if (m > 0) return m + 'm ' + ss + 's';
    return ss + 's';
  }

  // Boss config display
  const BOSS_DISPLAY = {
    wraith_father: { name: 'Wraith Father', emoji: '👻', color: '#b060e0' },
    frozen_crone:  { name: 'Frozen Crone',  emoji: '❄',  color: '#60b8e8' },
    samurai_lord:  { name: 'Samurai Lord',  emoji: '⚔',  color: '#d0a030' },
    void_emperor:  { name: 'Void Emperor',  emoji: '🌑', color: '#6040d0' },
  };
  function _ago(ms) {
    const d = Date.now() - ms;
    if (d < 60000)  return 'just now';
    if (d < 3600000) return Math.floor(d/60000) + 'm ago';
    return Math.floor(d/3600000) + 'h ago';
  }

  // ---- Locked state ----
  function _renderLocked(panel) {
    panel.innerHTML = [
      '<div style="',
        'display:flex;flex-direction:column;align-items:center;justify-content:center;',
        'height:100%;padding:40px 20px;text-align:center;gap:16px;">',
        '<div style="font-size:36px;">🔒</div>',
        '<div style="font-size:14px;color:#f0d890;letter-spacing:1.5px;text-transform:uppercase;">',
          'Alliance',
        '</div>',
        '<div style="font-size:12px;color:#907858;line-height:1.6;max-width:260px;">',
          'Clear Stage 1 to unlock Alliances.',
          '<br>Form a squad, tackle daily missions,',
          '<br>and earn Alliance Points together.',
        '</div>',
      '</div>',
    ].join('');
  }

  // ---- Empty state — full recruitment browser ----
  const TIER_COLORS  = { rookie:'#708060', mid:'#c0a040', elite:'#c06040', 'whale-tier':'#a040c0' };
  const TIER_LABELS  = { rookie:'Rookie', mid:'Mid-Tier', elite:'Elite', 'whale-tier':'Whale' };

  function _renderEmpty(panel) {
    const myPower = (WG.State && WG.State.recomputePower) ? WG.State.recomputePower() : 0;
    const filters = {
      openOnly:  _filterOpenOnly,
      tier:      _filterTier   || undefined,
      language:  _filterLanguage || undefined,
    };
    const list = (WG.AllianceRecruitment && WG.AllianceRecruitment.browse)
      ? WG.AllianceRecruitment.browse(filters) : [];

    const allianceCards = list.map(function(a) {
      let threshLabel, threshColor;
      if (a.recruitThreshold.type === 'open') {
        threshLabel = 'Open'; threshColor = '#50a860';
      } else if (a.recruitThreshold.type === 'minPower') {
        threshLabel = '⚡ ' + _fmt(a.recruitThreshold.value) + '+ pwr';
        threshColor = myPower >= a.recruitThreshold.value ? '#c0a040' : '#905040';
      } else {
        threshLabel = 'Closed'; threshColor = '#704030';
      }
      const canApply = a.recruitThreshold.type !== 'closed' &&
        (a.recruitThreshold.type !== 'minPower' || myPower >= a.recruitThreshold.value);

      return [
        '<div style="background:rgba(255,255,255,0.03);border:1px solid #3a2818;',
          'border-radius:8px;padding:10px 12px;margin-bottom:7px;">',
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">',
            '<div style="width:14px;height:14px;border-radius:50%;flex-shrink:0;background:' + _esc(a.banner) + ';',
              'border:1.5px solid rgba(255,255,255,0.2);"></div>',
            '<div style="flex:1;font-size:12px;color:#e0c898;font-weight:700;',
              'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + _esc(a.name) + '</div>',
            '<span style="font-size:9px;font-weight:700;color:' + (TIER_COLORS[a.tier]||'#a09070') + ';',
              'background:rgba(0,0,0,0.3);border-radius:4px;padding:2px 5px;letter-spacing:0.5px;">',
              _esc(TIER_LABELS[a.tier] || a.tier),
            '</span>',
          '</div>',
          '<div style="display:flex;align-items:center;gap:6px;">',
            '<div style="flex:1;">',
              '<div style="font-size:10px;color:#705840;">',
                a.memberCount + ' / ' + a.memberCap + ' members · Σ ' + _fmt(a.cumulativePower) + ' pwr · ' + _esc(a.language),
              '</div>',
              '<div style="font-size:9px;font-weight:700;color:' + threshColor + ';margin-top:2px;">' + threshLabel + '</div>',
            '</div>',
            canApply
              ? '<button class="wg-al-apply-btn" data-id="' + _esc(a.id) + '" style="' +
                  'padding:6px 12px;border-radius:5px;border:1px solid #806040;' +
                  'background:linear-gradient(to bottom,#5a3810,#3a2008);' +
                  'color:#f0d890;font-size:10px;font-weight:700;letter-spacing:1px;cursor:pointer;">APPLY</button>'
              : '<span style="font-size:9px;color:#504030;font-weight:700;">' +
                  (a.recruitThreshold.type === 'closed' ? 'CLOSED' : 'NEED ⚡' + _fmt(a.recruitThreshold.value)) +
                '</span>',
          '</div>',
        '</div>',
      ].join('');
    }).join('');

    const tierOptions = ['', 'rookie', 'mid', 'elite', 'whale-tier'].map(function(t) {
      const sel = (_filterTier === t || (!t && !_filterTier)) ? ' selected' : '';
      return '<option value="' + t + '"' + sel + '>' + (t ? (TIER_LABELS[t]||t) : 'All Tiers') + '</option>';
    }).join('');
    const langOptions = ['', 'EN', 'JP', 'KR', 'ES'].map(function(l) {
      const sel = (_filterLanguage === l || (!l && !_filterLanguage)) ? ' selected' : '';
      return '<option value="' + l + '"' + sel + '>' + (l || 'Any Lang') + '</option>';
    }).join('');

    panel.innerHTML = [
      '<div class="scroll" style="position:absolute;inset:0;overflow-y:auto;padding:16px;">',
        '<div style="text-align:center;padding:20px 0 12px;letter-spacing:2px;',
          'font-size:13px;color:#f0d890;text-transform:uppercase;">Alliance</div>',

        '<div style="margin-bottom:14px;">',
          '<button id="wg-al-create-btn" style="',
            'width:100%;padding:13px;border-radius:8px;border:1px solid #b08840;',
            'background:linear-gradient(to bottom,#806020,#5a3c0a);',
            'color:#fff0c8;font-size:12px;font-weight:700;letter-spacing:1.5px;',
            'cursor:pointer;text-transform:uppercase;">',
            'Create Alliance',
            '<span style="font-size:10px;color:#c8a050;font-weight:400;margin-left:8px;">🪙 500 coins</span>',
          '</button>',
        '</div>',

        // Filter bar
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;flex-wrap:wrap;">',
          '<label style="display:flex;align-items:center;gap:4px;font-size:10px;color:#907858;cursor:pointer;">',
            '<input type="checkbox" id="wg-rec-open-only"' + (_filterOpenOnly ? ' checked' : '') + '>',
            'Open only',
          '</label>',
          '<select id="wg-rec-tier" style="background:#1a1006;border:1px solid #4a3018;color:#c0a060;',
            'font-size:10px;border-radius:4px;padding:4px 6px;cursor:pointer;">', tierOptions, '</select>',
          '<select id="wg-rec-lang" style="background:#1a1006;border:1px solid #4a3018;color:#c0a060;',
            'font-size:10px;border-radius:4px;padding:4px 6px;cursor:pointer;">', langOptions, '</select>',
          '<span style="font-size:9px;color:#5a4028;margin-left:auto;">' + list.length + ' / 20</span>',
        '</div>',

        list.length
          ? allianceCards
          : '<div style="color:#4a3020;font-size:11px;text-align:center;padding:24px 0;">No alliances match your filters.</div>',
      '</div>',
    ].join('');

    const createBtn = panel.querySelector('#wg-al-create-btn');
    if (createBtn) createBtn.addEventListener('click', _openCreateDialog);

    panel.addEventListener('click', function(e) {
      const btn = e.target.closest('.wg-al-apply-btn');
      if (!btn) return;
      const id = btn.dataset.id;
      if (!WG.AllianceRecruitment) return;
      const result = WG.AllianceRecruitment.apply(id);
      if (result.ok) {
        refresh();
      } else if (result.reason === 'power_too_low') {
        _toast('Need ⚡' + _fmt(result.required) + ' power to apply');
      } else {
        _toast('Cannot apply: ' + result.reason);
      }
    });

    const openChk = panel.querySelector('#wg-rec-open-only');
    if (openChk) openChk.addEventListener('change', function() { _filterOpenOnly = this.checked; _renderEmpty(panel); });
    const tierSel = panel.querySelector('#wg-rec-tier');
    if (tierSel) tierSel.addEventListener('change', function() { _filterTier = this.value || null; _renderEmpty(panel); });
    const langSel = panel.querySelector('#wg-rec-lang');
    if (langSel) langSel.addEventListener('change', function() { _filterLanguage = this.value || null; _renderEmpty(panel); });
  }

  function _openCreateDialog() {
    const existing = document.getElementById('wg-al-create-dialog');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.id = 'wg-al-create-dialog';
    overlay.style.cssText = [
      'position:fixed;inset:0;z-index:400;background:rgba(0,0,0,0.82);',
      'display:flex;align-items:center;justify-content:center;padding:20px;',
    ].join('');

    const COLORS = ['#a040ff','#d04020','#2080d0','#f0a020','#208040','#c08020','#e04080'];
    let chosenColor = COLORS[0];
    let colorDots = '';
    COLORS.forEach(function(c, i) {
      colorDots += '<div class="wg-al-color" data-color="' + c + '" style="',
        'width:24px;height:24px;border-radius:50%;background:' + c + ';',
        'cursor:pointer;border:2px solid ' + (i === 0 ? '#f0d890' : 'transparent') + ';',
        'flex-shrink:0;" title="' + c + '"></div>';
    });

    overlay.innerHTML = [
      '<div style="',
        'background:linear-gradient(to bottom,#2a1c10,#1a1006);',
        'border:2px solid #604020;border-radius:12px;padding:20px;',
        'width:min(320px,100%);box-shadow:0 8px 32px rgba(0,0,0,0.7);">',
        '<div style="font-size:14px;color:#f0d890;letter-spacing:1.5px;',
          'text-transform:uppercase;margin-bottom:16px;">Create Alliance</div>',
        '<div style="font-size:11px;color:#907858;margin-bottom:6px;letter-spacing:1px;">Name</div>',
        '<input id="wg-al-name-in" maxlength="24" placeholder="My Alliance" style="',
          'width:100%;padding:9px 12px;background:#0a0604;border:1px solid #5a3a18;',
          'border-radius:6px;color:#f0d890;font-size:13px;outline:none;',
          'box-sizing:border-box;margin-bottom:14px;"/>',
        '<div style="font-size:11px;color:#907858;margin-bottom:8px;letter-spacing:1px;">Banner Color</div>',
        '<div id="wg-al-color-row" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px;">',
          colorDots,
        '</div>',
        '<div style="display:flex;gap:8px;">',
          '<button id="wg-al-create-cancel" style="flex:1;padding:10px;border-radius:6px;',
            'border:1px solid #5a3a18;background:transparent;color:#907858;',
            'font-size:11px;font-weight:700;letter-spacing:1px;cursor:pointer;">CANCEL</button>',
          '<button id="wg-al-create-confirm" style="flex:2;padding:10px;border-radius:6px;',
            'border:1px solid #b08840;background:linear-gradient(to bottom,#806020,#5a3c0a);',
            'color:#fff0c8;font-size:11px;font-weight:700;letter-spacing:1px;cursor:pointer;">',
            'CREATE · 🪙 500</button>',
        '</div>',
      '</div>',
    ].join('');

    document.body.appendChild(overlay);

    // Color picker
    overlay.querySelectorAll('.wg-al-color').forEach(function(dot) {
      dot.addEventListener('click', function() {
        overlay.querySelectorAll('.wg-al-color').forEach(function(d){ d.style.border = '2px solid transparent'; });
        dot.style.border = '2px solid #f0d890';
        chosenColor = dot.dataset.color;
      });
    });
    overlay.querySelector('#wg-al-create-cancel').addEventListener('click', function(){ overlay.remove(); });
    overlay.querySelector('#wg-al-create-confirm').addEventListener('click', function() {
      const name = (overlay.querySelector('#wg-al-name-in').value || '').trim();
      const result = WG.Alliance.create(name, chosenColor);
      if (result.ok) {
        overlay.remove();
        refresh();
      } else if (result.reason === 'insufficient_coins') {
        _toast('Need 500 coins to create an Alliance');
      } else {
        _toast('Could not create: ' + result.reason);
      }
    });
    overlay.addEventListener('click', function(e){ if (e.target === overlay) overlay.remove(); });
  }

  // ---- Full alliance view ----
  // ── Sub-tab nav ─────────────────────────────────────────────────────────────
  function _subTabNav() {
    const tabDefs = [
      { id: 'roster',      label: '⚑ Alliance' },
      { id: 'boss',        label: '☠ Boss' },
      { id: 'leaderboard', label: '🏯 Tower' },
      { id: 'shop',        label: '🛒 Shop' },
    ];
    return [
      '<div style="display:flex;border-bottom:1px solid #2e1e0c;flex-shrink:0;">',
        tabDefs.map(function(def) {
          const active = _subTab === def.id;
          return '<button class="wg-al-subtab" data-subtab="' + def.id + '" style="' +
            'flex:1;padding:10px 2px;border:none;background:' +
            (active ? 'rgba(240,200,128,0.08)' : 'transparent') + ';' +
            'color:' + (active ? '#f0d890' : '#705840') + ';' +
            'font-size:10px;letter-spacing:1px;text-transform:uppercase;' +
            'font-weight:' + (active ? '700' : '400') + ';' +
            'border-bottom:2px solid ' + (active ? '#d0a840' : 'transparent') + ';' +
            'cursor:pointer;">' +
            def.label +
            '</button>';
        }).join(''),
      '</div>',
    ].join('');
  }

  // ── Tower leaderboard sub-tab ────────────────────────────────────────────────
  function _renderLeaderboardSection(panel) {
    const rows = (window.WG.MetaLeaderboard && WG.MetaLeaderboard.getTowerLeaderboard)
      ? WG.MetaLeaderboard.getTowerLeaderboard(10)
      : [];
    const alRows = (window.WG.MetaLeaderboard && WG.MetaLeaderboard.getAllianceLeaderboard)
      ? WG.MetaLeaderboard.getAllianceLeaderboard(10)
      : [];

    function lbRow(r, valKey, valLabel) {
      const isP = !!r.isPlayer;
      const bg  = isP ? 'rgba(240,200,80,0.08)' : (r.rank % 2 ? 'transparent' : 'rgba(255,255,255,0.015)');
      const nc  = isP ? '#f0d890' : '#c0a870';
      const rc  = r.rank === 1 ? '#f0c040' : r.rank === 2 ? '#c0c0c0' : r.rank === 3 ? '#c08040' : '#705840';
      const val = r[valKey] !== undefined ? r[valKey] : '—';
      return [
        '<div style="display:flex;align-items:center;gap:6px;padding:5px 12px;background:' + bg + ';">',
          '<span style="width:22px;text-align:right;font-size:10px;color:' + rc + ';font-weight:700;flex-shrink:0;">#' + r.rank + '</span>',
          '<span style="flex:1;font-size:11px;color:' + nc + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + _esc(r.name || r.displayName || '—') + '</span>',
          '<span style="font-size:9px;color:#806840;margin-right:2px;">' + valLabel + '</span>',
          '<span style="font-size:11px;color:#e0b870;font-weight:600;min-width:36px;text-align:right;">' + val + '</span>',
        '</div>',
      ].join('');
    }

    const hasPlayerTail = rows.length > 10 || (rows.length > 0 && rows[rows.length - 1].isPlayer && rows[rows.length - 1].rank > 10);
    const mainRows = hasPlayerTail ? rows.slice(0, -1) : rows;
    const tailRow  = hasPlayerTail ? rows[rows.length - 1] : null;

    panel.innerHTML = [
      '<div class="scroll" style="position:absolute;inset:0;overflow-y:auto;padding:0 0 16px;">',
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 12px 6px;">',
          '<span style="font-size:11px;color:#c8a868;letter-spacing:2px;">TOWER RANKINGS</span>',
          '<span style="font-size:9px;color:#806840;background:rgba(128,90,40,0.18);',
            'border:1px solid #5a3c1a;border-radius:8px;padding:2px 7px;letter-spacing:1px;">DEMO ERA</span>',
        '</div>',
        mainRows.map(function(r) { return lbRow(r, 'towerFloor', 'FL'); }).join(''),
        tailRow ? '<div style="text-align:center;font-size:10px;color:#4a3020;padding:2px 0;">···</div>' +
                  lbRow(tailRow, 'towerFloor', 'FL') : '',
        '<div style="font-size:11px;color:#c8a868;letter-spacing:2px;padding:14px 12px 6px;">',
          'TOP ALLIANCES',
        '</div>',
        alRows.map(function(a, i) {
          return [
            '<div style="display:flex;align-items:center;gap:8px;padding:5px 12px;',
              'background:' + (i % 2 ? 'rgba(255,255,255,0.015)' : 'transparent') + ';">',
              '<span style="width:22px;text-align:right;font-size:10px;color:#705840;font-weight:700;">#' + a.rank + '</span>',
              '<div style="width:10px;height:10px;border-radius:50%;flex-shrink:0;background:' + _esc(a.banner) + ';"></div>',
              '<span style="flex:1;font-size:11px;color:#c0a870;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + _esc(a.name) + '</span>',
              '<span style="font-size:9px;color:#806840;margin-right:2px;">DMG</span>',
              '<span style="font-size:11px;color:#e0b870;font-weight:600;min-width:48px;text-align:right;">' + _fmt(a.cumulativeDamage) + '</span>',
            '</div>',
          ].join('');
        }).join(''),
      '</div>',
    ].join('');
  }

  function _renderFull(panel) {
    if (_subTab === 'boss')        { _renderBossSection(panel);        return; }
    if (_subTab === 'leaderboard') { _renderLeaderboardSection(panel); return; }
    if (_subTab === 'shop')        { _renderShopSection(panel);        return; }
    const a    = WG.Alliance.get();
    const msgs = (WG.AllianceChat && WG.AllianceChat.recent()) || [];
    const missions = (WG.AllianceMissions && WG.AllianceMissions.progress()) || [];
    const NPCs = (WG.Alliance && WG.Alliance.getNPCMembers()) || [];
    const myId = (window.WG && WG.Account && WG.Account.getDeviceId) ? WG.Account.getDeviceId() : 'local';

    // Member list (player + NPCs that are in memberIds)
    const memberIds = a.memberIds || [];
    const isLeaderOrOfficer = a.leaderId === myId || (a.officerIds || []).includes(myId);
    const pendingApps = (WG.AllianceRecruitment && WG.AllianceRecruitment.getApplications)
      ? WG.AllianceRecruitment.getApplications() : [];

    let rosterHtml = memberIds.slice(0, 15).map(function(id) {
      const isMe = id === myId;
      const npc  = WG.Alliance.getNPCMember && WG.Alliance.getNPCMember(id);
      const name = isMe ? 'You' : (npc ? npc.name : id.slice(0, 8));
      const online = isMe || (npc && npc.online);
      const isLeader = id === a.leaderId;
      const isOfficer = (a.officerIds || []).includes(id);
      const warState  = WG.AllianceWar && WG.AllianceWar.getState && WG.AllianceWar.getState();
      const warCaptains = (warState && warState.currentMatch && warState.currentMatch.attackers) || [];
      const isWarCaptain = warCaptains.indexOf(id) >= 0;
      const badge = isLeader ? '<span style="color:#f0c040;font-size:9px;"> ♛</span>'
                  : isOfficer ? '<span style="color:#a080c0;font-size:9px;"> ◆</span>' : '';
      const warBadge = isWarCaptain ? '<span style="color:#e06030;font-size:9px;font-weight:700;"> ⚔</span>' : '';
      return [
        '<div data-memberid="' + _esc(id) + '" style="display:flex;align-items:center;gap:8px;padding:6px 0;',
          'border-bottom:1px solid rgba(255,255,255,0.04);cursor:pointer;">',
          '<div style="width:8px;height:8px;border-radius:50%;flex-shrink:0;',
            'background:' + (online ? '#60d080' : '#4a3828') + '"></div>',
          '<span style="flex:1;font-size:12px;color:' + (isMe ? '#f0d890' : '#c0a870') + ';">',
            _esc(name), badge, warBadge,
          '</span>',
        '</div>',
      ].join('');
    }).join('');

    // Missions
    let missionsHtml = missions.map(function(m) {
      const pct = Math.min(100, Math.round((m.progress / m.goal) * 100));
      const canClaim = m.done && !m.claimed;
      return [
        '<div style="margin-bottom:10px;">',
          '<div style="display:flex;justify-content:space-between;align-items:center;',
            'margin-bottom:4px;">',
            '<span style="font-size:11px;color:' + (m.claimed ? '#5a4828' : '#c0a870') + ';',
              'flex:1;padding-right:8px;">' + _esc(m.label) + '</span>',
            canClaim
              ? '<button class="wg-al-claim-btn" data-id="' + m.id + '" style="' +
                  'padding:4px 10px;border-radius:4px;border:1px solid #b08840;' +
                  'background:linear-gradient(to bottom,#806020,#5a3c0a);' +
                  'color:#fff0c8;font-size:9px;font-weight:700;letter-spacing:1px;cursor:pointer;">' +
                  'CLAIM +' + m.reward + 'pts</button>'
              : m.claimed
              ? '<span style="font-size:10px;color:#5a4828;">✓ CLAIMED</span>'
              : '',
          '</div>',
          '<div style="height:4px;background:#1e140a;border-radius:2px;overflow:hidden;">',
            '<div style="height:100%;width:' + pct + '%;',
              'background:' + (m.done ? '#f0c040' : 'linear-gradient(to right,#a04020,#d08030)') + ';',
              'border-radius:2px;transition:width 300ms;"></div>',
          '</div>',
          '<div style="font-size:9px;color:#705840;margin-top:2px;text-align:right;">',
            m.progress + ' / ' + m.goal,
          '</div>',
        '</div>',
      ].join('');
    }).join('');

    // Chat messages
    const chatItems = msgs.slice(-12).map(function(m) {
      return [
        '<div style="margin-bottom:6px;">',
          '<span style="font-size:10px;font-weight:700;color:' + _esc(m.authorColor || '#c0a870') + ';">',
            _esc(m.authorName),
          '</span>',
          '<span style="font-size:9px;color:#5a4828;margin-left:4px;">' + _ago(m.ts) + '</span>',
          '<div style="font-size:12px;color:#d0b888;line-height:1.4;margin-top:2px;">',
            _esc(m.text),
          '</div>',
        '</div>',
      ].join('');
    }).join('');

    // Gift state
    const canSendGift   = !(a.giftsSentToday >= 1);
    const canClaimGift  = !a.giftsClaimedToday && (a.giftPool || 0) > 0;

    panel.innerHTML = [
      '<div style="position:absolute;inset:0;display:flex;flex-direction:column;">',
      _subTabNav(),
      '<div class="scroll" id="wg-al-scroll" style="flex:1;overflow-y:auto;padding:12px 12px 20px;position:relative;">',
        // Top row: banner + name + count + points
        '<div style="display:flex;align-items:center;gap:10px;padding:12px;',
          'background:rgba(255,255,255,0.03);border:1px solid #3a2818;border-radius:8px;margin-bottom:10px;">',
          '<div id="wg-al-banner-dot" style="width:32px;height:32px;border-radius:50%;flex-shrink:0;background:' + _esc(a.banner) + ';',
            'border:2px solid rgba(255,255,255,0.2);',
            (WG.Alliance.canEditBanner && WG.Alliance.canEditBanner(myId) ? 'cursor:pointer;' : '') + '"></div>',
          '<div style="flex:1;">',
            '<div style="font-size:14px;color:#f0d890;font-weight:700;">' + _esc(a.name) + '</div>',
            '<div style="font-size:10px;color:#706040;">' + memberIds.length + ' / ' + (a.memberCap || 30) + ' members</div>',
          '</div>',
          '<div style="text-align:right;">',
            '<div style="font-size:14px;color:#c0a040;font-weight:700;">⚑ ' + _fmtPts(a.points) + '</div>',
            '<div style="font-size:9px;color:#705840;margin-top:1px;">alliance pts</div>',
          '</div>',
        '</div>',

        // Active buff timer strip
        _activeBuffStrip(a),

        // MOTD card — leader sees edit button even when empty
        (a.msgOfDay || (WG.Alliance.canSetMOTD && WG.Alliance.canSetMOTD(myId)))
          ? '<div style="display:flex;align-items:flex-start;gap:8px;' +
              'background:rgba(80,40,8,0.3);border:1px solid #5a3018;border-radius:6px;' +
              'padding:8px 12px;margin-bottom:10px;">' +
              '<div style="flex:1;font-size:11px;color:#c0a060;letter-spacing:0.3px;font-style:italic;">' +
                (a.msgOfDay ? _esc(a.msgOfDay) : '<span style="color:#5a4828;">No message set.</span>') +
              '</div>' +
              ((WG.Alliance.canSetMOTD && WG.Alliance.canSetMOTD(myId))
                ? '<button id="wg-al-motd-edit" style="flex-shrink:0;padding:3px 8px;border-radius:4px;' +
                    'border:1px solid #5a3a18;background:transparent;color:#907858;' +
                    'font-size:10px;cursor:pointer;" title="Edit MOTD">✏</button>'
                : '') +
            '</div>'
          : '',

        // Application inbox (leader/officer only)
        isLeaderOrOfficer
          ? pendingApps.length
            ? [
                '<div style="font-size:9px;color:#c08040;letter-spacing:1.5px;text-transform:uppercase;',
                  'margin-bottom:6px;">Applications (' + pendingApps.length + ')</div>',
                '<div id="wg-al-inbox" style="background:rgba(255,255,255,0.02);border:1px solid #5a3018;',
                  'border-radius:8px;padding:4px 10px;margin-bottom:12px;">',
                  pendingApps.map(function(ap) {
                    const charLabel = ap.character ? ap.character.replace(/_/g,' ') : '—';
                    const laLabel   = _ago(ap.lastActive || Date.now());
                    return [
                      '<div style="display:flex;align-items:center;gap:8px;padding:7px 0;',
                        'border-bottom:1px solid rgba(255,255,255,0.04);">',
                        '<div style="flex:1;">',
                          '<div style="font-size:11px;color:#e0c898;font-weight:600;">' + _esc(ap.name) + '</div>',
                          '<div style="font-size:9px;color:#705840;margin-top:2px;">',
                            '⚡' + _fmt(ap.power) + ' pwr · ' + _esc(charLabel) + ' · ' + laLabel,
                          '</div>',
                        '</div>',
                        '<button class="wg-al-inbox-accept" data-apid="' + _esc(ap.applicantId) + '" style="',
                          'padding:5px 9px;border-radius:4px;border:1px solid #508040;',
                          'background:rgba(20,48,16,0.8);color:#80c060;font-size:10px;',
                          'font-weight:700;cursor:pointer;letter-spacing:0.5px;">✓</button>',
                        '<button class="wg-al-inbox-reject" data-apid="' + _esc(ap.applicantId) + '" style="',
                          'padding:5px 9px;border-radius:4px;border:1px solid #703020;',
                          'background:rgba(48,12,8,0.8);color:#c06040;font-size:10px;',
                          'font-weight:700;cursor:pointer;letter-spacing:0.5px;">✗</button>',
                      '</div>',
                    ].join('');
                  }).join(''),
                '</div>',
              ].join('')
            : '<div style="font-size:9px;color:#c08040;letter-spacing:1.5px;text-transform:uppercase;' +
                'margin-bottom:6px;">Applications <span style="color:#5a4028;">(none)</span></div>'
          : '',

        // Auto-accept threshold (leader/officer only)
        isLeaderOrOfficer
          ? (function() {
              const cur = (WG.AllianceRecruitment && WG.AllianceRecruitment.getAutoAcceptMinPower)
                ? WG.AllianceRecruitment.getAutoAcceptMinPower() : 0;
              return [
                '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">',
                  '<span style="font-size:9px;color:#705840;letter-spacing:1px;flex-shrink:0;text-transform:uppercase;">',
                    'Auto-Accept ⚡',
                  '</span>',
                  '<input id="wg-al-autoacc-in" type="number" min="0" max="15000" value="' + cur + '" ' +
                    'style="width:72px;padding:4px 7px;background:#0a0604;border:1px solid #4a3018;' +
                    'border-radius:4px;color:#f0d890;font-size:11px;outline:none;"/>',
                  '<button id="wg-al-autoacc-set" style="padding:4px 10px;border-radius:4px;' +
                    'border:1px solid #604030;background:rgba(40,20,8,0.8);color:#c0a050;' +
                    'font-size:9px;font-weight:700;letter-spacing:1px;cursor:pointer;">SET</button>',
                  cur > 0
                    ? '<span style="font-size:9px;color:#50a860;">on ≥' + _fmt(cur) + '</span>'
                    : '<span style="font-size:9px;color:#5a4028;">off</span>',
                '</div>',
              ].join('');
            }())
          : '',

        // Roster section
        '<div style="font-size:9px;color:#705840;letter-spacing:1.5px;text-transform:uppercase;',
          'margin-bottom:6px;">Members</div>',
        '<div id="wg-al-roster" style="background:rgba(255,255,255,0.02);border:1px solid #2e1e0c;border-radius:8px;',
          'padding:4px 10px;margin-bottom:12px;">',
          rosterHtml,
        '</div>',

        // Daily missions
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">',
          '<span style="font-size:9px;color:#705840;letter-spacing:1.5px;text-transform:uppercase;">Daily Missions</span>',
          '<button id="wg-al-claim-all" style="padding:4px 10px;border-radius:4px;',
            'border:1px solid #605030;background:rgba(40,24,8,0.8);color:#c0a050;',
            'font-size:9px;font-weight:700;letter-spacing:1px;cursor:pointer;">CLAIM ALL</button>',
        '</div>',
        '<div id="wg-al-missions" style="margin-bottom:14px;">',
          missionsHtml,
        '</div>',

        // Gifts row
        '<div style="font-size:9px;color:#705840;letter-spacing:1.5px;text-transform:uppercase;',
          'margin-bottom:8px;">Gift Exchange</div>',
        '<div style="display:flex;gap:8px;margin-bottom:14px;">',
          '<button id="wg-al-send-gift" style="flex:1;padding:9px;border-radius:6px;',
            'border:1px solid ' + (canSendGift ? '#806040' : '#3a2818') + ';',
            'background:' + (canSendGift ? 'rgba(60,30,8,0.9)' : 'rgba(20,12,4,0.5)') + ';',
            'color:' + (canSendGift ? '#d0a060' : '#5a4028') + ';',
            'font-size:10px;font-weight:700;letter-spacing:1px;cursor:pointer;">',
            '🎁 Send Gift' + (canSendGift ? '' : ' (sent)'),
          '</button>',
          '<button id="wg-al-claim-gift" style="flex:1;padding:9px;border-radius:6px;',
            'border:1px solid ' + (canClaimGift ? '#b08840' : '#3a2818') + ';',
            'background:' + (canClaimGift ? 'linear-gradient(to bottom,#806020,#5a3c0a)' : 'rgba(20,12,4,0.5)') + ';',
            'color:' + (canClaimGift ? '#fff0c8' : '#5a4028') + ';',
            'font-size:10px;font-weight:700;letter-spacing:1px;cursor:pointer;">',
            '📦 Claim Gift' + (a.giftPool ? ' (' + a.giftPool + ')' : ''),
          '</button>',
        '</div>',

        // Chat
        '<div style="font-size:9px;color:#705840;letter-spacing:1.5px;text-transform:uppercase;',
          'margin-bottom:6px;">Alliance Chat</div>',
        '<div id="wg-al-chat" style="background:rgba(0,0,0,0.3);border:1px solid #2e1e0c;',
          'border-radius:6px;padding:10px;margin-bottom:8px;min-height:80px;max-height:200px;',
          'overflow-y:auto;">',
          chatItems || '<div style="color:#4a3020;font-size:11px;font-style:italic;">No messages yet.</div>',
        '</div>',
        '<div style="display:flex;gap:6px;margin-bottom:14px;">',
          '<input id="wg-al-chat-in" maxlength="200" placeholder="Say something..." style="',
            'flex:1;padding:8px 10px;background:#0a0604;border:1px solid #4a3018;',
            'border-radius:5px;color:#f0d890;font-size:12px;outline:none;"/>',
          '<button id="wg-al-chat-send" style="padding:8px 14px;border-radius:5px;',
            'border:1px solid #806040;background:linear-gradient(to bottom,#5a3810,#3a2008);',
            'color:#f0d890;font-size:11px;font-weight:700;cursor:pointer;">SEND</button>',
        '</div>',

        // Alliance shop button — leader-only (canSpendPoints)
        (WG.Alliance.canSpendPoints && WG.Alliance.canSpendPoints(myId))
          ? '<button id="wg-al-shop-btn" style="' +
              'width:100%;padding:12px;border-radius:8px;border:1px solid #a08040;' +
              'background:linear-gradient(to bottom,#5a3c10,#3a2408);' +
              'color:#f0d890;font-size:12px;font-weight:700;letter-spacing:2px;' +
              'text-transform:uppercase;cursor:pointer;margin-bottom:6px;">⚑ Alliance Shop</button>'
          : '',

        // Leave button
        '<button id="wg-al-leave-btn" style="',
          'width:100%;padding:9px;border-radius:6px;border:1px solid #5a3818;',
          'background:transparent;color:#705840;',
          'font-size:10px;letter-spacing:1px;cursor:pointer;">',
          'Leave Alliance',
        '</button>',
      '</div>',  // close .scroll
      '</div>',  // close outer flex wrapper
    ].join('');

    _wireFullButtons(panel);
  }

  // ── War sub-tab ──────────────────────────────────────────────────────────────
  function _renderWarSection(panel) {
    if (!WG.AllianceWar) {
      panel.innerHTML = _subTabNav() +
        '<div style="padding:32px;text-align:center;color:#705840;font-size:12px;">War data unavailable.</div>';
      _wireSubTabNav(panel);
      return;
    }
    const ws    = WG.AllianceWar.getState();
    const myId  = (WG.Account && WG.Account.getDeviceId) ? WG.Account.getDeviceId() : 'local';
    const a     = WG.Alliance.get();
    const match = ws.currentMatch;
    const sched = ws.schedule;

    function _memberName(id) {
      if (id === myId) return 'You';
      const npc = WG.Alliance.getNPCMember && WG.Alliance.getNPCMember(id);
      return npc ? npc.name : id.slice(0, 8);
    }

    // ── idle ──────────────────────────────────────────────────────────────────
    if (ws.phase === 'idle') {
      const msToNext = Math.max(0, sched.matchmakingStartMs - Date.now());
      const histRows = (ws.history || []).map(function(h) {
        const won = h.winner === 'us';
        return [
          '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);">',
            '<span style="font-size:10px;color:' + (won?'#60c060':'#c06060') + ';font-weight:700;width:28px;">' + (won?'WIN':'LOSS') + '</span>',
            '<span style="flex:1;font-size:11px;color:#c0a870;">vs ' + _esc(h.opponentName) + '</span>',
            '<span style="font-size:9px;color:#807050;">+' + h.rewardCoins + '🪙 +' + h.rewardPts + 'pts</span>',
          '</div>',
        ].join('');
      }).join('');
      panel.innerHTML = [
        '<div style="position:absolute;inset:0;display:flex;flex-direction:column;">',
        _subTabNav(),
        '<div class="scroll" style="flex:1;overflow-y:auto;padding:16px;">',
          '<div style="text-align:center;padding:20px 0 12px;">',
            '<div style="font-size:28px;">⚔</div>',
            '<div style="font-size:13px;color:#f0d890;letter-spacing:2px;text-transform:uppercase;margin-top:6px;">Alliance War</div>',
            '<div style="font-size:10px;color:#705840;margin-top:4px;">Weekly · Saturday 6pm</div>',
          '</div>',
          '<div style="text-align:center;background:rgba(255,255,255,0.03);border:1px solid #3a2818;',
            'border-radius:8px;padding:16px;margin-bottom:14px;">',
            '<div style="font-size:10px;color:#705840;letter-spacing:1.5px;text-transform:uppercase;">Matchmaking Opens In</div>',
            '<div id="wg-war-idle-cd" style="font-size:22px;color:#f0d890;font-weight:700;margin-top:4px;">' + _fmtCountdown(msToNext) + '</div>',
          '</div>',
          ws.history && ws.history.length
            ? '<div style="font-size:9px;color:#705840;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;">War History</div>' +
              '<div style="background:rgba(255,255,255,0.02);border:1px solid #2e1e0c;border-radius:8px;padding:4px 10px;">' + histRows + '</div>'
            : '<div style="text-align:center;font-size:11px;color:#4a3020;padding:20px 0;">No wars fought yet.</div>',
        '</div>',
        '</div>',
      ].join('');
      _wireSubTabNav(panel);
      _startWarCountdown(panel, sched.matchmakingStartMs, '#wg-war-idle-cd');
      return;
    }

    // ── matchmaking ────────────────────────────────────────────────────────────
    if (ws.phase === 'matchmaking') {
      const opp      = match && match.opponentAlliance;
      const selected = (match && match.attackers) || [];
      const msLeft   = Math.max(0, sched.attackStartMs - Date.now());
      const canSelect = a.leaderId === myId || String(a.leaderId || '').startsWith('npc_');
      const roster    = a.memberIds || [];

      const captainRows = roster.slice(0, 20).map(function(id) {
        const isSel = selected.indexOf(id) >= 0;
        const name  = _memberName(id);
        return [
          '<div data-capid="' + _esc(id) + '" style="display:flex;align-items:center;gap:8px;padding:7px 10px;',
            'border-radius:6px;border:1px solid ' + (isSel?'#e06030':'#2e1e0c') + ';',
            'background:' + (isSel?'rgba(224,96,48,0.10)':'rgba(255,255,255,0.02)') + ';',
            'margin-bottom:4px;cursor:' + (canSelect?'pointer':'default') + ';">',
            '<span style="flex:1;font-size:12px;color:' + (isSel?'#f0a060':'#c0a870') + ';">' + _esc(name) + '</span>',
            isSel ? '<span style="font-size:9px;color:#e06030;font-weight:700;">⚔ CAPTAIN</span>' : '',
          '</div>',
        ].join('');
      }).join('');

      panel.innerHTML = [
        '<div style="position:absolute;inset:0;display:flex;flex-direction:column;">',
        _subTabNav(),
        '<div class="scroll" style="flex:1;overflow-y:auto;padding:12px;">',
          opp ? [
            '<div style="background:rgba(255,255,255,0.03);border:1px solid #3a2818;border-radius:8px;',
              'padding:12px;margin-bottom:12px;display:flex;align-items:center;gap:12px;">',
              '<div style="width:28px;height:28px;border-radius:50%;flex-shrink:0;background:' + _esc(opp.banner) + ';border:2px solid rgba(255,255,255,0.15);"></div>',
              '<div style="flex:1;"><div style="font-size:12px;color:#e0c898;font-weight:700;">vs ' + _esc(opp.name) + '</div>',
                '<div style="font-size:10px;color:#705840;">Power ≈ ' + (opp.power||'?') + '</div></div>',
              '<div style="text-align:right;">',
                '<div style="font-size:9px;color:#705840;letter-spacing:1px;text-transform:uppercase;">Attack Opens In</div>',
                '<div id="wg-war-mm-cd" style="font-size:14px;color:#f0d890;font-weight:700;">' + _fmtCountdown(msLeft) + '</div>',
              '</div>',
            '</div>',
          ].join('') : '',
          '<div style="font-size:9px;color:#705840;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;">War Captains (' + selected.length + '/4)</div>',
          canSelect
            ? '<div style="font-size:10px;color:#807050;margin-bottom:8px;">Tap to select up to 4 captains.</div>'
            : '<div style="font-size:10px;color:#605040;margin-bottom:8px;">Leader is selecting captains.</div>',
          '<div id="wg-war-captain-list">' + captainRows + '</div>',
        '</div>',
        '</div>',
      ].join('');
      _wireSubTabNav(panel);
      _startWarCountdown(panel, sched.attackStartMs, '#wg-war-mm-cd');

      if (canSelect) {
        const listEl = panel.querySelector('#wg-war-captain-list');
        if (listEl) listEl.addEventListener('click', function(e) {
          const row = e.target.closest('[data-capid]');
          if (!row) return;
          const id  = row.dataset.capid;
          const cur = (WG.AllianceWar.getState().currentMatch || {}).attackers || [];
          let next;
          if (cur.indexOf(id) >= 0) {
            next = cur.filter(function(x){ return x !== id; });
          } else if (cur.length < 4) {
            next = cur.concat([id]);
          } else { _toast('Max 4 captains selected'); return; }
          const r = WG.AllianceWar.selectAttackers(next);
          if (r.ok) refresh(); else _toast('Could not update: ' + r.reason);
        });
      }
      return;
    }

    // ── attack ─────────────────────────────────────────────────────────────────
    if (ws.phase === 'attack') {
      const opp       = match && match.opponentAlliance;
      const attackers = (match && match.attackers) || [];
      const results   = (match && match.attackResults) || [];
      const msLeft    = Math.max(0, sched.attackEndMs - Date.now());
      const doneCount = results.filter(Boolean).length;
      const totalPct  = results.reduce(function(s,r){ return s+(r?r.damagePercent:0); }, 0);
      const avgPct    = attackers.length ? Math.round(totalPct/attackers.length) : 0;

      const raidSlots = attackers.length
        ? attackers.map(function(id, i) {
            const r = results[i];
            const name = _memberName(id);
            return [
              '<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;',
                'background:rgba(255,255,255,0.03);border:1px solid #3a2818;border-radius:8px;margin-bottom:6px;">',
                '<div style="flex:1;">',
                  '<div style="font-size:11px;color:#e0c898;font-weight:700;">⚔ ' + _esc(name) + '</div>',
                  r ? '<div style="font-size:10px;color:#60c080;margin-top:2px;">Damage: ' + r.damagePercent + '%</div>'
                    : '<div style="font-size:10px;color:#705840;margin-top:2px;">Awaiting raid</div>',
                '</div>',
                r ? '<div style="width:40px;height:40px;border-radius:50%;background:rgba(96,192,128,0.15);' +
                      'border:2px solid #60c080;display:flex;align-items:center;justify-content:center;' +
                      'font-size:11px;font-weight:700;color:#60c080;flex-shrink:0;">' + r.damagePercent + '%</div>'
                  : '<button class="wg-war-raid-btn" data-idx="' + i + '" style="' +
                      'padding:8px 14px;border-radius:6px;border:2px solid #e06030;' +
                      'background:linear-gradient(to bottom,rgba(60,20,8,0.9),rgba(32,10,4,0.9));' +
                      'color:#e09060;font-size:11px;font-weight:700;letter-spacing:1px;cursor:pointer;flex-shrink:0;">RAID</button>',
              '</div>',
            ].join('');
          }).join('')
        : '<div style="text-align:center;font-size:11px;color:#4a3020;padding:20px 0;">No captains selected.</div>';

      panel.innerHTML = [
        '<div style="position:absolute;inset:0;display:flex;flex-direction:column;">',
        _subTabNav(),
        '<div class="scroll" style="flex:1;overflow-y:auto;padding:12px;">',
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">',
            '<div style="font-size:13px;color:#e09060;font-weight:700;letter-spacing:2px;">⚔ WAR ACTIVE</div>',
            '<div style="text-align:right;">',
              '<div style="font-size:9px;color:#705840;letter-spacing:1px;">Window Ends</div>',
              '<div id="wg-war-atk-cd" style="font-size:13px;color:#f0d890;font-weight:700;">' + _fmtCountdown(msLeft) + '</div>',
            '</div>',
          '</div>',
          opp ? '<div style="background:rgba(255,255,255,0.03);border:1px solid #3a2818;border-radius:6px;padding:8px 12px;margin-bottom:10px;display:flex;align-items:center;gap:10px;">' +
            '<div style="width:18px;height:18px;border-radius:50%;flex-shrink:0;background:' + _esc(opp.banner) + ';border:1px solid rgba(255,255,255,0.2);"></div>' +
            '<span style="flex:1;font-size:11px;color:#c0a870;">vs ' + _esc(opp.name) + '</span>' +
            '<span style="font-size:11px;color:#e08060;font-weight:700;">' + avgPct + '% avg</span></div>' : '',
          '<div style="font-size:9px;color:#705840;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">Raid Attempts (' + doneCount + '/' + attackers.length + ')</div>',
          raidSlots,
        '</div>',
        '</div>',
      ].join('');
      _wireSubTabNav(panel);
      _startWarCountdown(panel, sched.attackEndMs, '#wg-war-atk-cd');

      panel.addEventListener('click', function(e) {
        const btn = e.target.closest('.wg-war-raid-btn');
        if (!btn) return;
        const r = WG.AllianceWar.launchRaid(parseInt(btn.dataset.idx, 10));
        if (r && r.ok) { _toast('Raid complete — ' + r.damagePercent + '% damage!'); refresh(); }
        else if (r) _toast('Cannot raid: ' + r.reason);
      });
      return;
    }

    // ── results ────────────────────────────────────────────────────────────────
    if (ws.phase === 'results') {
      const winner    = match && match.winner;
      const oppName   = match && match.opponentAlliance && match.opponentAlliance.name;
      const oppScore  = match && match.opponentScore;
      const attackers = (match && match.attackers) || [];
      const results   = (match && match.attackResults) || [];
      const totalPct  = results.reduce(function(s,r){ return s+(r?r.damagePercent:0); }, 0);
      const playerAvg = attackers.length ? Math.round(totalPct/attackers.length) : 0;
      const claimed   = match && match.rewardsGranted;
      const won       = winner === 'us';
      const reward    = won ? WG.AllianceWar.REWARDS.WIN : WG.AllianceWar.REWARDS.LOSE;

      const resultRows = attackers.map(function(id, i) {
        const r = results[i];
        return '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04);">' +
          '<span style="flex:1;font-size:11px;color:#c0a870;">⚔ ' + _esc(_memberName(id)) + '</span>' +
          '<span style="font-size:11px;color:' + (r?'#60c080':'#4a3020') + ';font-weight:700;">' + (r?r.damagePercent:0) + '%</span>' +
          '</div>';
      }).join('');

      panel.innerHTML = [
        '<div style="position:absolute;inset:0;display:flex;flex-direction:column;">',
        _subTabNav(),
        '<div class="scroll" style="flex:1;overflow-y:auto;padding:12px;">',
          '<div style="text-align:center;padding:18px 0 12px;">',
            '<div style="font-size:36px;">' + (won?'🏆':'💀') + '</div>',
            '<div style="font-size:18px;color:' + (won?'#70e080':'#e06060') + ';font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-top:6px;">' + (won?'VICTORY':'DEFEAT') + '</div>',
            '<div style="font-size:11px;color:#705840;margin-top:4px;">vs ' + _esc(oppName||'?') + '</div>',
          '</div>',
          '<div style="display:flex;gap:8px;margin-bottom:12px;">',
            '<div style="flex:1;background:rgba(255,255,255,0.03);border:1px solid #3a2818;border-radius:8px;padding:10px;text-align:center;">',
              '<div style="font-size:18px;color:' + (won?'#70e080':'#e06060') + ';font-weight:700;">' + playerAvg + '%</div>',
              '<div style="font-size:9px;color:#705840;letter-spacing:1px;text-transform:uppercase;margin-top:2px;">Our Average</div>',
            '</div>',
            '<div style="flex:1;background:rgba(255,255,255,0.03);border:1px solid #3a2818;border-radius:8px;padding:10px;text-align:center;">',
              '<div style="font-size:18px;color:#c0a870;font-weight:700;">' + (oppScore||'—') + '%</div>',
              '<div style="font-size:9px;color:#705840;letter-spacing:1px;text-transform:uppercase;margin-top:2px;">Enemy Average</div>',
            '</div>',
          '</div>',
          '<div style="font-size:9px;color:#705840;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;">Captain Results</div>',
          '<div style="background:rgba(255,255,255,0.02);border:1px solid #2e1e0c;border-radius:8px;padding:4px 10px;margin-bottom:12px;">' +
            (resultRows || '<div style="color:#4a3020;font-size:11px;padding:8px 0;text-align:center;">No raids attempted.</div>') +
          '</div>',
          claimed
            ? '<div style="text-align:center;font-size:11px;color:#5a8040;letter-spacing:1px;padding:8px;">✓ Rewards claimed</div>'
            : '<button id="wg-war-claim-btn" style="width:100%;padding:13px;border-radius:8px;' +
                'border:1px solid ' + (won?'#70c060':'#806040') + ';' +
                'background:linear-gradient(to bottom,' + (won?'#2a4c20,#1a2c10':'#5a3c10,#3a2408') + ');' +
                'color:' + (won?'#a0e890':'#f0d890') + ';font-size:12px;font-weight:700;letter-spacing:2px;cursor:pointer;text-transform:uppercase;">' +
                'CLAIM: +' + reward.coins + '🪙 +' + reward.alliancePoints + ' pts</button>',
        '</div>',
        '</div>',
      ].join('');
      _wireSubTabNav(panel);
      const claimBtn = panel.querySelector('#wg-war-claim-btn');
      if (claimBtn) claimBtn.addEventListener('click', function() {
        const r = WG.AllianceWar.grantRewards();
        if (r && r.ok) { _toast((r.winner==='us'?'🏆 Victory! ':'💀 Defeat. ') + '+' + r.reward.coins + '🪙 +' + r.reward.alliancePoints + 'pts'); refresh(); }
        else if (r) _toast('Could not claim: ' + r.reason);
      });
    }
  }

  function _startWarCountdown(panel, targetMs, selector) {
    if (_warCountdownTimer) clearInterval(_warCountdownTimer);
    _warCountdownTimer = setInterval(function() {
      if (!_isAllianceTabActive() || _subTab !== 'war') { clearInterval(_warCountdownTimer); return; }
      const el = panel.querySelector(selector);
      if (el) el.textContent = _fmtCountdown(Math.max(0, targetMs - Date.now()));
    }, 1000);
  }

  // ── Boss sub-tab ─────────────────────────────────────────────────────────────
  function _renderBossSection(panel) {
    const boss = WG.AllianceBoss && WG.AllianceBoss.getCurrentBoss();
    if (!boss) {
      panel.innerHTML = _subTabNav() +
        '<div style="padding:32px;text-align:center;color:#705840;font-size:12px;">Boss data unavailable.</div>';
      _wireSubTabNav(panel);
      return;
    }
    if (!boss.inEvent) {
      _renderBreakWindow(panel, boss);
    } else {
      _renderEventWindow(panel, boss);
    }
  }

  function _renderEventWindow(panel, boss) {
    const cfg     = BOSS_DISPLAY[boss.bossId] || { name: boss.bossId, emoji: '👿', color: '#a040a0' };
    const hpPct   = boss.hpMax > 0 ? Math.max(0, Math.round((boss.hpRemaining / boss.hpMax) * 100)) : 0;
    const msLeft  = Math.max(0, boss.eventEndMs - Date.now());
    const myId    = (window.WG && WG.Account && WG.Account.getDeviceId) ? WG.Account.getDeviceId() : 'local';
    const myTier  = WG.AllianceBoss && WG.AllianceBoss.getTierForPlayer && WG.AllianceBoss.getTierForPlayer();
    const claimed = boss.claimedTiers && boss.claimedTiers[myId];

    // Leaderboard: sort contributions
    const contrib = boss.contributions || {};
    const sorted  = Object.keys(contrib).sort(function(a,b){ return (contrib[b]||0)-(contrib[a]||0); });
    const total   = sorted.reduce(function(s,id){ return s+(contrib[id]||0); },0);
    const myDmg   = contrib[myId] || 0;
    const myPct   = total > 0 ? ((myDmg / total) * 100).toFixed(1) : '0.0';

    const TIER_COLORS = { bronze: '#c07840', silver: '#b0c0d8', gold: '#f0c040', legend: '#e060ff' };

    let lbRows = sorted.slice(0, 10).map(function(id, i) {
      const isMe  = id === myId;
      const npc   = WG.Alliance && WG.Alliance.getNPCMember && WG.Alliance.getNPCMember(id);
      const name  = isMe ? 'You' : (npc ? npc.name : id.slice(0,8));
      const dmg   = contrib[id] || 0;
      const pct   = total > 0 ? ((dmg / total) * 100).toFixed(1) : '0.0';
      const tier  = _tierForPct(dmg, total);
      const tcol  = tier ? (TIER_COLORS[tier] || '#a09070') : '#5a4828';
      return [
        '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;',
          'border-bottom:1px solid rgba(255,255,255,0.04);">',
          '<span style="font-size:9px;color:#604838;width:14px;text-align:right;">' + (i+1) + '</span>',
          '<span style="flex:1;font-size:11px;color:' + (isMe ? '#f0d890' : '#c0a870') + ';">',
            _esc(name),
          '</span>',
          tier ? '<span style="font-size:9px;color:' + tcol + ';font-weight:700;letter-spacing:1px;">' + tier.toUpperCase() + '</span>' : '',
          '<span style="font-size:10px;color:#908060;">' + pct + '%</span>',
        '</div>',
      ].join('');
    }).join('');

    const canClaim = myTier && !claimed && boss.defeated;

    panel.innerHTML = [
      '<div style="position:absolute;inset:0;display:flex;flex-direction:column;">',
      _subTabNav(),
      '<div style="flex:1;overflow-y:auto;padding:12px;">',

        // Boss header
        '<div style="display:flex;flex-direction:column;align-items:center;',
          'gap:6px;padding:14px 0 10px;text-align:center;">',
          '<div style="font-size:52px;line-height:1;">' + _esc(cfg.emoji) + '</div>',
          '<div style="font-size:15px;color:' + _esc(cfg.color) + ';font-weight:700;',
            'letter-spacing:3px;text-transform:uppercase;">' + _esc(cfg.name) + '</div>',
          // HP bar
          '<div style="width:100%;max-width:280px;height:12px;background:#180a10;',
            'border-radius:6px;overflow:hidden;border:1px solid #3a1828;margin-top:4px;">',
            '<div id="wg-boss-tab-hpfill" style="height:100%;border-radius:6px;',
              'background:linear-gradient(to right,#b02040,#e03060);',
              'width:' + hpPct + '%;transition:width 400ms;"></div>',
          '</div>',
          '<div style="font-size:9px;color:#60504a;letter-spacing:0.5px;">',
            _fmt(boss.hpRemaining) + ' / ' + _fmt(boss.hpMax) + ' HP',
          '</div>',
          // Countdown
          '<div style="font-size:11px;color:#907858;letter-spacing:1px;margin-top:4px;">',
            'Event ends in <span id="wg-boss-tab-cd" style="color:#f0d890;font-weight:700;">',
              _fmtCountdown(msLeft),
            '</span>',
          '</div>',
        '</div>',

        // My contribution row
        myDmg > 0 ? [
          '<div style="background:rgba(240,200,96,0.06);border:1px solid #3a2a0a;',
            'border-radius:6px;padding:8px 12px;margin-bottom:10px;',
            'display:flex;align-items:center;gap:10px;">',
            '<span style="flex:1;font-size:11px;color:#d0b878;">Your damage: ',
              '<strong style="color:#f0d890;">' + _fmt(myDmg) + '</strong> (' + myPct + '%)',
            '</span>',
            myTier ? '<span style="font-size:9px;font-weight:700;color:' + (TIER_COLORS[myTier]||'#a09070') + ';letter-spacing:1px;">' + myTier.toUpperCase() + '</span>' : '',
          '</div>',
        ].join('') : '',

        // Defeat claim (if boss is down and player has contribution)
        canClaim
          ? '<button id="wg-boss-tab-claim" style="width:100%;padding:12px;border-radius:8px;' +
              'border:1px solid #b08840;background:linear-gradient(to bottom,#806020,#5a3c0a);' +
              'color:#fff0c8;font-size:12px;font-weight:700;letter-spacing:2px;cursor:pointer;' +
              'margin-bottom:12px;">CLAIM ' + (myTier||'').toUpperCase() + ' REWARD</button>'
          : '',
        claimed
          ? '<div style="text-align:center;font-size:10px;color:#5a8040;letter-spacing:1px;' +
              'margin-bottom:10px;">✓ Reward claimed</div>'
          : '',

        // Leaderboard
        '<div style="font-size:9px;color:#705840;letter-spacing:1.5px;text-transform:uppercase;',
          'margin-bottom:6px;">Top Contributors</div>',
        '<div style="background:rgba(255,255,255,0.02);border:1px solid #2e1e0c;',
          'border-radius:8px;padding:4px 10px;margin-bottom:12px;">',
          lbRows || '<div style="color:#4a3020;font-size:11px;padding:8px 0;text-align:center;">No damage yet.</div>',
        '</div>',

        // Attack button
        boss.defeated
          ? '<div style="text-align:center;font-size:11px;color:#508040;letter-spacing:1px;' +
              'padding:10px;">✓ Boss Defeated!</div>'
          : '<button id="wg-boss-tab-attack" style="width:100%;padding:14px;border-radius:8px;' +
              'border:2px solid ' + _esc(cfg.color) + ';' +
              'background:linear-gradient(to bottom,rgba(40,16,60,0.9),rgba(20,8,32,0.9));' +
              'color:' + _esc(cfg.color) + ';font-size:14px;font-weight:700;' +
              'letter-spacing:2px;cursor:pointer;text-transform:uppercase;">' +
              '⚔ ATTACK  —  5 ⚡</button>',

      '</div>',  // close scroll
      '</div>',  // close flex wrapper
    ].join('');

    _wireSubTabNav(panel);
    _wireBossButtons(panel);
    _startBossCountdown(panel, boss);
  }

  function _renderBreakWindow(panel, boss) {
    const msToNext  = Math.max(0, boss.breakUntilMs - Date.now());
    const nextId    = WG.AllianceBoss && WG.AllianceBoss.getNextBoss && WG.AllianceBoss.getNextBoss();
    const nextCfg   = BOSS_DISPLAY[nextId] || { name: nextId || 'Unknown', emoji: '👿', color: '#a040a0' };
    const cfg       = BOSS_DISPLAY[boss.bossId] || { name: boss.bossId, emoji: '👿', color: '#a040a0' };

    // Previous-event leaderboard
    const contrib = boss.contributions || {};
    const sorted  = Object.keys(contrib).sort(function(a,b){ return (contrib[b]||0)-(contrib[a]||0); });
    const total   = sorted.reduce(function(s,id){ return s+(contrib[id]||0); },0);
    const TIER_COLORS = { bronze: '#c07840', silver: '#b0c0d8', gold: '#f0c040', legend: '#e060ff' };

    let prevRows = sorted.slice(0, 10).map(function(id, i) {
      const isMe  = id === ((window.WG && WG.Account && WG.Account.getDeviceId) ? WG.Account.getDeviceId() : 'local');
      const npc   = WG.Alliance && WG.Alliance.getNPCMember && WG.Alliance.getNPCMember(id);
      const name  = isMe ? 'You' : (npc ? npc.name : id.slice(0,8));
      const dmg   = contrib[id] || 0;
      const pct   = total > 0 ? ((dmg / total) * 100).toFixed(1) : '0.0';
      const tier  = _tierForPct(dmg, total);
      const tcol  = tier ? (TIER_COLORS[tier]||'#a09070') : '#5a4828';
      return [
        '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;',
          'border-bottom:1px solid rgba(255,255,255,0.04);">',
          '<span style="font-size:9px;color:#604838;width:14px;text-align:right;">' + (i+1) + '</span>',
          '<span style="flex:1;font-size:11px;color:' + (isMe?'#f0d890':'#c0a870') + ';">' + _esc(name) + '</span>',
          tier ? '<span style="font-size:9px;color:' + tcol + ';font-weight:700;">' + tier.toUpperCase() + '</span>' : '',
          '<span style="font-size:10px;color:#908060;">' + pct + '%</span>',
        '</div>',
      ].join('');
    }).join('');

    panel.innerHTML = [
      '<div style="position:absolute;inset:0;display:flex;flex-direction:column;">',
      _subTabNav(),
      '<div style="flex:1;overflow-y:auto;padding:12px;">',

        // Break banner
        '<div style="display:flex;flex-direction:column;align-items:center;',
          'gap:8px;padding:20px 0 16px;text-align:center;">',
          '<div style="font-size:11px;color:#705840;letter-spacing:2px;text-transform:uppercase;">',
            'Next Event In',
          '</div>',
          '<div id="wg-boss-break-cd" style="font-size:28px;color:#f0d890;font-weight:700;',
            'letter-spacing:2px;">' + _fmtCountdown(msToNext) + '</div>',
          '<div style="margin-top:10px;font-size:13px;color:' + _esc(nextCfg.color) + ';',
            'letter-spacing:2px;font-weight:700;text-transform:uppercase;">',
            _esc(nextCfg.emoji) + ' ' + _esc(nextCfg.name),
          '</div>',
          '<div style="font-size:10px;color:#605040;margin-top:2px;">coming next</div>',
        '</div>',

        // Previous event leaderboard
        '<div style="font-size:9px;color:#705840;letter-spacing:1.5px;text-transform:uppercase;',
          'margin-bottom:6px;">Previous Event — ' + _esc(cfg.name) + '</div>',
        '<div style="background:rgba(255,255,255,0.02);border:1px solid #2e1e0c;',
          'border-radius:8px;padding:4px 10px;">',
          prevRows || '<div style="color:#4a3020;font-size:11px;padding:8px 0;text-align:center;">No data.</div>',
        '</div>',

      '</div>',
      '</div>',
    ].join('');

    _wireSubTabNav(panel);
    _startBreakCountdown(panel, boss);
  }

  function _tierForPct(dmg, total) {
    if (!total || dmg <= 0) return null;
    const pct = dmg / total;
    if (!WG.AllianceBoss) return null;
    const tiers = WG.AllianceBoss.TIERS;
    for (var i = 0; i < tiers.length; i++) {
      if (pct >= tiers[i].min) return tiers[i].name;
    }
    return null;
  }

  function _wireSubTabNav(panel) {
    panel.addEventListener('click', function(e) {
      const btn = e.target.closest('.wg-al-subtab');
      if (!btn) return;
      const t = btn.dataset.subtab;
      if (t && t !== _subTab) { _subTab = t; refresh(); }
    });
  }

  function _wireBossButtons(panel) {
    const attackBtn = panel.querySelector('#wg-boss-tab-attack');
    if (attackBtn) attackBtn.addEventListener('click', function() {
      if (WG.RaidBossAttack && WG.RaidBossAttack.open) WG.RaidBossAttack.open();
    });
    const claimBtn = panel.querySelector('#wg-boss-tab-claim');
    if (claimBtn) claimBtn.addEventListener('click', function() {
      const r = WG.AllianceBoss && WG.AllianceBoss.claimTier && WG.AllianceBoss.claimTier();
      if (r && r.ok) {
        const labels = { bronze: '🥉 Bronze', silver: '🥈 Silver', gold: '🥇 Gold', legend: '✨ Legend' };
        _toast((labels[r.tier]||r.tier) + ' reward claimed!');
        refresh();
      } else if (r) {
        _toast(r.reason === 'already_claimed' ? 'Already claimed!' : 'Nothing to claim yet.');
      }
    });
  }

  let _bossCountdownTimer = 0;
  let _breakCountdownTimer = 0;

  function _startBossCountdown(panel, boss) {
    if (_bossCountdownTimer) clearInterval(_bossCountdownTimer);
    _bossCountdownTimer = setInterval(function() {
      if (!_isAllianceTabActive() || _subTab !== 'boss') { clearInterval(_bossCountdownTimer); return; }
      const el = panel.querySelector('#wg-boss-tab-cd');
      if (el) el.textContent = _fmtCountdown(Math.max(0, boss.eventEndMs - Date.now()));
    }, 1000);
  }

  function _startBreakCountdown(panel, boss) {
    if (_breakCountdownTimer) clearInterval(_breakCountdownTimer);
    _breakCountdownTimer = setInterval(function() {
      if (!_isAllianceTabActive() || _subTab !== 'boss') { clearInterval(_breakCountdownTimer); return; }
      const el = panel.querySelector('#wg-boss-break-cd');
      if (el) el.textContent = _fmtCountdown(Math.max(0, boss.breakUntilMs - Date.now()));
    }, 1000);
  }

  // ── Member action modal ──────────────────────────────────────────────────────
  function _npcPowerHash(id) {
    var h = 0;
    for (var i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
    return 200 + Math.abs(h) % 301;
  }

  function _openMemberModal(memberId, myId) {
    const existing = document.getElementById('wg-al-member-modal');
    if (existing) existing.remove();

    const a   = WG.Alliance.get();
    const npc = WG.Alliance.getNPCMember && WG.Alliance.getNPCMember(memberId);
    const isMe = memberId === myId;
    const name = isMe ? 'You' : (npc ? npc.name : memberId.slice(0, 8));

    const isTargetLeader  = memberId === a.leaderId;
    const isTargetOfficer = (a.officerIds || []).includes(memberId);
    const roleBadge = isTargetLeader ? 'LEADER' : isTargetOfficer ? 'OFFICER' : 'MEMBER';
    const roleColor = isTargetLeader ? '#f0c040' : isTargetOfficer ? '#a080c0' : '#907858';

    const cPromote  = WG.Alliance.canPromote  && WG.Alliance.canPromote(myId, memberId);
    const cKick     = WG.Alliance.canKick     && WG.Alliance.canKick(myId, memberId);
    const cDemote   = WG.Alliance.canDemote   && WG.Alliance.canDemote(myId, memberId);
    const cTransfer = a.leaderId === myId && isTargetOfficer;

    let power = '—';
    if (isMe && WG.State && WG.State.recomputePower) {
      power = WG.State.recomputePower();
    } else if (npc) {
      power = _npcPowerHash(memberId);
    }

    const boss    = WG.AllianceBoss && WG.AllianceBoss.getCurrentBoss && WG.AllianceBoss.getCurrentBoss();
    const contrib = boss && boss.contributions && (boss.contributions[memberId] || 0);

    const BTN = 'padding:9px 14px;border-radius:6px;font-size:10px;font-weight:700;letter-spacing:1px;cursor:pointer;width:100%;text-align:left;';
    let actionBtns = '';
    if (cPromote)  actionBtns += '<button class="wg-al-mm-promote" style="' + BTN + 'border:1px solid #806040;background:linear-gradient(to bottom,#4a3220,#2e1c0c);color:#d0a060;">Promote to Officer</button>';
    if (cDemote)   actionBtns += '<button class="wg-al-mm-demote"  style="' + BTN + 'border:1px solid #605030;background:rgba(40,24,8,0.8);color:#c0a050;">Demote to Member</button>';
    if (cTransfer) actionBtns += '<button class="wg-al-mm-transfer" style="' + BTN + 'border:1px solid #a040c0;background:rgba(40,0,60,0.8);color:#d080f0;">Transfer Leadership</button>';
    if (cKick)     actionBtns += '<button class="wg-al-mm-kick" style="' + BTN + 'border:1px solid #802020;background:rgba(40,8,8,0.8);color:#e06060;">Kick</button>';

    const overlay = document.createElement('div');
    overlay.id = 'wg-al-member-modal';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:400;background:rgba(0,0,0,0.82);' +
      'display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = [
      '<div style="background:linear-gradient(to bottom,#2a1c10,#1a1006);',
        'border:2px solid #604020;border-radius:12px;padding:20px;',
        'width:min(300px,100%);box-shadow:0 8px 32px rgba(0,0,0,0.7);">',
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">',
          '<div style="font-size:13px;color:#f0d890;font-weight:700;">' + _esc(name) + '</div>',
          '<span style="font-size:9px;color:' + roleColor + ';font-weight:700;letter-spacing:1.5px;',
            'border:1px solid ' + roleColor + ';padding:2px 6px;border-radius:4px;">' + roleBadge + '</span>',
        '</div>',
        '<div style="display:flex;gap:12px;margin-bottom:' + (actionBtns ? '14px' : '6px') + ';">',
          '<div style="flex:1;background:rgba(255,255,255,0.03);border:1px solid #2e1e0c;',
            'border-radius:6px;padding:8px;text-align:center;">',
            '<div style="font-size:16px;color:#e0b870;font-weight:700;">' + power + '</div>',
            '<div style="font-size:9px;color:#705840;letter-spacing:1px;text-transform:uppercase;margin-top:2px;">Power</div>',
          '</div>',
          '<div style="flex:1;background:rgba(255,255,255,0.03);border:1px solid #2e1e0c;',
            'border-radius:6px;padding:8px;text-align:center;">',
            '<div style="font-size:16px;color:#e0b870;font-weight:700;">' + (contrib ? _fmt(contrib) : '—') + '</div>',
            '<div style="font-size:9px;color:#705840;letter-spacing:1px;text-transform:uppercase;margin-top:2px;">Boss Dmg</div>',
          '</div>',
        '</div>',
        actionBtns
          ? '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px;">' + actionBtns + '</div>'
          : '',
        '<button id="wg-al-mm-close" style="width:100%;padding:9px;border-radius:6px;',
          'border:1px solid #3a2818;background:transparent;color:#705840;',
          'font-size:10px;letter-spacing:1px;cursor:pointer;">CLOSE</button>',
      '</div>',
    ].join('');
    document.body.appendChild(overlay);

    overlay.querySelector('#wg-al-mm-close').addEventListener('click', function(){ overlay.remove(); });
    overlay.addEventListener('click', function(e){ if (e.target === overlay) overlay.remove(); });

    const promBtn = overlay.querySelector('.wg-al-mm-promote');
    if (promBtn) promBtn.addEventListener('click', function() {
      WG.Alliance && WG.Alliance.promote(memberId);
      overlay.remove(); refresh();
    });
    const demBtn = overlay.querySelector('.wg-al-mm-demote');
    if (demBtn) demBtn.addEventListener('click', function() {
      WG.Alliance && WG.Alliance.demote(memberId);
      overlay.remove(); refresh();
    });
    const trBtn = overlay.querySelector('.wg-al-mm-transfer');
    if (trBtn) trBtn.addEventListener('click', function() {
      overlay.remove();
      _openTransferConfirmModal(memberId, name, myId);
    });
    const kickBtn = overlay.querySelector('.wg-al-mm-kick');
    if (kickBtn) kickBtn.addEventListener('click', function() {
      WG.Alliance && WG.Alliance.kick(memberId);
      overlay.remove();
      _toast(name + ' kicked');
      refresh();
    });
  }

  function _openTransferConfirmModal(targetId, targetName, myId) {
    const existing = document.getElementById('wg-al-transfer-modal');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.id = 'wg-al-transfer-modal';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:401;background:rgba(0,0,0,0.88);' +
      'display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = [
      '<div style="background:linear-gradient(to bottom,#2a1c10,#1a1006);',
        'border:2px solid #a040c0;border-radius:12px;padding:20px;',
        'width:min(300px,100%);box-shadow:0 8px 32px rgba(0,0,0,0.8);">',
        '<div style="font-size:13px;color:#d080f0;font-weight:700;letter-spacing:1.5px;',
          'text-transform:uppercase;margin-bottom:10px;">Transfer Leadership</div>',
        '<div style="font-size:12px;color:#c0a870;line-height:1.6;margin-bottom:18px;">',
          'Hand leadership to <strong style="color:#f0d890;">' + _esc(targetName) + '</strong>?',
          '<br><span style="font-size:10px;color:#705840;">You will become an Officer.</span>',
        '</div>',
        '<div style="display:flex;gap:8px;">',
          '<button id="wg-al-transfer-cancel" style="flex:1;padding:10px;border-radius:6px;',
            'border:1px solid #3a2818;background:transparent;color:#705840;',
            'font-size:11px;font-weight:700;letter-spacing:1px;cursor:pointer;">CANCEL</button>',
          '<button id="wg-al-transfer-confirm" style="flex:2;padding:10px;border-radius:6px;',
            'border:1px solid #a040c0;background:rgba(60,0,80,0.8);color:#d080f0;',
            'font-size:11px;font-weight:700;letter-spacing:1px;cursor:pointer;">CONFIRM TRANSFER</button>',
        '</div>',
      '</div>',
    ].join('');
    document.body.appendChild(overlay);
    overlay.querySelector('#wg-al-transfer-cancel').addEventListener('click', function(){ overlay.remove(); });
    overlay.querySelector('#wg-al-transfer-confirm').addEventListener('click', function() {
      const r = WG.Alliance && WG.Alliance.transferLeadership(myId, targetId);
      overlay.remove();
      if (r && r.ok) { _toast('Leadership transferred to ' + targetName); refresh(); }
      else _toast('Transfer failed');
    });
    overlay.addEventListener('click', function(e){ if (e.target === overlay) overlay.remove(); });
  }

  function _openMOTDModal(currentMOTD) {
    const existing = document.getElementById('wg-al-motd-modal');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.id = 'wg-al-motd-modal';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:400;background:rgba(0,0,0,0.82);' +
      'display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = [
      '<div style="background:linear-gradient(to bottom,#2a1c10,#1a1006);',
        'border:2px solid #604020;border-radius:12px;padding:20px;',
        'width:min(320px,100%);box-shadow:0 8px 32px rgba(0,0,0,0.7);">',
        '<div style="font-size:13px;color:#f0d890;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:12px;">Edit MOTD</div>',
        '<textarea id="wg-al-motd-ta" maxlength="120" rows="3" placeholder="Message of the Day..." style="',
          'width:100%;padding:9px 12px;background:#0a0604;border:1px solid #5a3a18;',
          'border-radius:6px;color:#f0d890;font-size:12px;outline:none;resize:none;',
          'box-sizing:border-box;margin-bottom:14px;">' + _esc(currentMOTD || '') + '</textarea>',
        '<div style="display:flex;gap:8px;">',
          '<button id="wg-al-motd-cancel" style="flex:1;padding:10px;border-radius:6px;',
            'border:1px solid #5a3a18;background:transparent;color:#907858;',
            'font-size:11px;font-weight:700;letter-spacing:1px;cursor:pointer;">CANCEL</button>',
          '<button id="wg-al-motd-save" style="flex:2;padding:10px;border-radius:6px;',
            'border:1px solid #b08840;background:linear-gradient(to bottom,#806020,#5a3c0a);',
            'color:#fff0c8;font-size:11px;font-weight:700;letter-spacing:1px;cursor:pointer;">SAVE</button>',
        '</div>',
      '</div>',
    ].join('');
    document.body.appendChild(overlay);
    const ta = overlay.querySelector('#wg-al-motd-ta');
    if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
    overlay.querySelector('#wg-al-motd-cancel').addEventListener('click', function(){ overlay.remove(); });
    overlay.querySelector('#wg-al-motd-save').addEventListener('click', function() {
      WG.Alliance && WG.Alliance.setMOTD(ta ? ta.value : '');
      overlay.remove(); refresh();
    });
    overlay.addEventListener('click', function(e){ if (e.target === overlay) overlay.remove(); });
  }

  function _openBannerPickerModal(currentBanner) {
    const existing = document.getElementById('wg-al-banner-modal');
    if (existing) existing.remove();
    const COLORS = ['#a040ff','#d04020','#2080d0','#f0a020','#208040','#c08020','#e04080','#40a080','#e08000'];
    let chosenColor = currentBanner || COLORS[0];
    let colorDots = COLORS.map(function(c) {
      return '<div class="wg-al-bp-color" data-color="' + c + '" style="' +
        'width:28px;height:28px;border-radius:50%;background:' + c + ';cursor:pointer;flex-shrink:0;' +
        'border:2px solid ' + (c === chosenColor ? '#f0d890' : 'transparent') + ';"></div>';
    }).join('');
    const overlay = document.createElement('div');
    overlay.id = 'wg-al-banner-modal';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:400;background:rgba(0,0,0,0.82);' +
      'display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = [
      '<div style="background:linear-gradient(to bottom,#2a1c10,#1a1006);',
        'border:2px solid #604020;border-radius:12px;padding:20px;',
        'width:min(300px,100%);box-shadow:0 8px 32px rgba(0,0,0,0.7);">',
        '<div style="font-size:13px;color:#f0d890;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:12px;">Banner Color</div>',
        '<div id="wg-al-bp-row" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px;">' + colorDots + '</div>',
        '<div style="display:flex;gap:8px;">',
          '<button id="wg-al-bp-cancel" style="flex:1;padding:10px;border-radius:6px;',
            'border:1px solid #5a3a18;background:transparent;color:#907858;',
            'font-size:11px;font-weight:700;letter-spacing:1px;cursor:pointer;">CANCEL</button>',
          '<button id="wg-al-bp-save" style="flex:2;padding:10px;border-radius:6px;',
            'border:1px solid #b08840;background:linear-gradient(to bottom,#806020,#5a3c0a);',
            'color:#fff0c8;font-size:11px;font-weight:700;letter-spacing:1px;cursor:pointer;">SAVE</button>',
        '</div>',
      '</div>',
    ].join('');
    document.body.appendChild(overlay);
    overlay.querySelectorAll('.wg-al-bp-color').forEach(function(dot) {
      dot.addEventListener('click', function() {
        overlay.querySelectorAll('.wg-al-bp-color').forEach(function(d){ d.style.border = '2px solid transparent'; });
        dot.style.border = '2px solid #f0d890';
        chosenColor = dot.dataset.color;
      });
    });
    overlay.querySelector('#wg-al-bp-cancel').addEventListener('click', function(){ overlay.remove(); });
    overlay.querySelector('#wg-al-bp-save').addEventListener('click', function() {
      WG.Alliance && WG.Alliance.setBanner && WG.Alliance.setBanner(chosenColor);
      overlay.remove(); refresh();
    });
    overlay.addEventListener('click', function(e){ if (e.target === overlay) overlay.remove(); });
  }
  // ─────────────────────────────────────────────────────────────────────────────

  // ── Active buff timer strip (shown in roster header) ─────────────────────────
  function _activeBuffStrip(a) {
    if (!WG.Alliance || !WG.Alliance.getActiveTimedBoosts) return '';
    const boosts = WG.Alliance.getActiveTimedBoosts();
    if (!boosts.length) return '';
    const pills = boosts.map(function(b) {
      const ms = b.timeLeftMs;
      const h  = Math.floor(ms / 3600000);
      const m  = Math.floor((ms % 3600000) / 60000);
      const timeStr = h > 0 ? h + 'h ' + m + 'm' : m + 'm';
      return '<span style="display:inline-flex;align-items:center;gap:4px;' +
        'background:rgba(80,200,80,0.12);border:1px solid rgba(80,200,80,0.25);' +
        'border-radius:10px;padding:3px 8px;font-size:9px;color:#90d870;' +
        'white-space:nowrap;letter-spacing:0.5px;">' +
        '▶ ' + _esc(b.label) + ' · ' + timeStr + ' left' +
        '</span>';
    }).join('');
    return '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">' + pills + '</div>';
  }

  // ── Shop section render ───────────────────────────────────────────────────────
  const _SHOP_CATEGORIES = [
    { id: 'cosmetics',       label: 'Cosmetics' },
    { id: 'buffs',           label: 'Buffs' },
    { id: 'building_skins',  label: 'Building Skins' },
    { id: 'member_benefits', label: 'Member Benefits' },
  ];

  function _renderShopSection(panel) {
    const a   = WG.Alliance.get();
    const pts = a.points || 0;
    const myId = (window.WG && WG.Account && WG.Account.getDeviceId) ? WG.Account.getDeviceId() : 'local';
    const canBuy = WG.Alliance.canSpendPoints && WG.Alliance.canSpendPoints(myId);
    const SP = WG.Alliance.SPEND_POOL;

    const catTabs = _SHOP_CATEGORIES.map(function(cat) {
      const active = _shopCat === cat.id;
      return '<button class="wg-al-shopcat" data-cat="' + cat.id + '" style="' +
        'flex:1;padding:7px 2px;border:none;background:' +
        (active ? 'rgba(240,200,128,0.1)' : 'transparent') + ';' +
        'color:' + (active ? '#f0d890' : '#705840') + ';font-size:9px;' +
        'letter-spacing:0.8px;text-transform:uppercase;font-weight:' + (active ? '700' : '400') + ';' +
        'border-bottom:2px solid ' + (active ? '#d0a840' : 'transparent') + ';cursor:pointer;">' +
        _esc(cat.label) + '</button>';
    }).join('');

    const entries = Object.keys(SP).filter(function(k) {
      return SP[k].category === _shopCat;
    });

    const rows = entries.map(function(key) {
      const def = SP[key];
      const canAfford = pts >= def.cost;
      const isTimedActive = WG.Alliance.isActiveTimedBoost && WG.Alliance.isActiveTimedBoost(key);
      const timeLeft = isTimedActive && WG.Alliance.boostTimeLeftMs ? WG.Alliance.boostTimeLeftMs(key) : 0;
      const isBannerEquipped = key.indexOf('BANNER_ART') === 0 && (a.activeBoosts || {}).bannerArt === key;
      const isOwned = key === 'MEMBER_BADGE_FRAME' && !!(a.activeBoosts || {}).memberBadgeFrame ||
                      key === 'SKIN_CANNON_GOLD' && (a.activeBoosts || {}).skinCannon === 'gold' ||
                      key === 'SKIN_WALL_JADE'   && (a.activeBoosts || {}).skinWall   === 'jade';
      const relicCooldown = key === 'BENEFIT_RELIC_PULL' &&
        (a.activeBoosts || {}).relicPull &&
        (a.activeBoosts || {}).relicPull.grantedAt > Date.now() - 86400000;

      const blocked = isTimedActive || isOwned || relicCooldown || isBannerEquipped;
      const btnDisabled = !canBuy || !canAfford || blocked;

      let btnLabel = '⚑ ' + def.cost;
      let btnColor = '#fff0c8';
      let btnBorder = '#b08840';
      let btnBg = 'linear-gradient(to bottom,#806020,#5a3c0a)';
      let btnCursor = 'pointer';
      if (isTimedActive) {
        const h = Math.floor(timeLeft / 3600000);
        const m = Math.floor((timeLeft % 3600000) / 60000);
        btnLabel = 'ACTIVE · ' + (h > 0 ? h + 'h' : m + 'm');
        btnColor = '#90d870'; btnBorder = '#408030'; btnBg = 'rgba(20,50,12,0.8)'; btnCursor = 'not-allowed';
      } else if (isBannerEquipped) {
        btnLabel = 'EQUIPPED'; btnColor = '#a0c090'; btnBorder = '#406030'; btnBg = 'rgba(20,40,12,0.8)'; btnCursor = 'default';
      } else if (isOwned) {
        btnLabel = 'OWNED'; btnColor = '#a0c090'; btnBorder = '#406030'; btnBg = 'rgba(20,40,12,0.8)'; btnCursor = 'default';
      } else if (relicCooldown) {
        btnLabel = 'SENT'; btnColor = '#a0c090'; btnBorder = '#406030'; btnBg = 'rgba(20,40,12,0.8)'; btnCursor = 'not-allowed';
      } else if (!canAfford) {
        btnColor = '#6a5038'; btnBorder = '#4a3018'; btnBg = 'rgba(30,18,6,0.8)'; btnCursor = 'not-allowed';
      }

      const durationPill = def.durationMs > 0
        ? '<span style="font-size:9px;color:#907858;background:rgba(80,50,10,0.5);' +
            'border-radius:4px;padding:1px 5px;margin-left:4px;">' +
            (def.durationMs >= 604800000 ? '7 days' : '24h') + '</span>'
        : '';

      return [
        '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;',
          'background:rgba(255,255,255,0.03);border:1px solid #3a2818;',
          'border-radius:8px;margin-bottom:7px;">',
          '<div style="flex:1;min-width:0;">',
            '<div style="font-size:11px;color:#f0d890;font-weight:600;letter-spacing:0.5px;">',
              _esc(def.label), durationPill,
            '</div>',
            '<div style="font-size:9px;color:#907858;margin-top:3px;line-height:1.4;">' + _esc(def.desc) + '</div>',
          '</div>',
          canBuy
            ? '<button class="wg-al-shop-buy" data-key="' + key + '" ' +
                (btnDisabled ? 'disabled ' : '') +
                'style="flex-shrink:0;padding:7px 11px;border-radius:6px;border:1px solid ' + btnBorder + ';' +
                'background:' + btnBg + ';color:' + btnColor + ';font-size:9px;font-weight:700;' +
                'letter-spacing:0.8px;cursor:' + btnCursor + ';white-space:nowrap;">' +
                btnLabel + '</button>'
            : '<span style="flex-shrink:0;font-size:9px;color:#5a4028;font-weight:700;' +
                'letter-spacing:0.8px;padding:7px 0;white-space:nowrap;">VIEW ONLY</span>',
        '</div>',
      ].join('');
    }).join('');

    panel.innerHTML = [
      '<div style="position:absolute;inset:0;display:flex;flex-direction:column;">',
      _subTabNav(),
      // Points header
      '<div style="display:flex;align-items:center;justify-content:space-between;',
        'padding:10px 12px;background:rgba(40,24,8,0.5);border-bottom:1px solid #2e1e0c;flex-shrink:0;">',
        '<span style="font-size:11px;color:#c0a040;font-weight:700;">⚑ ' + _fmtPts(pts) + ' pts</span>',
        !canBuy ? '<span style="font-size:9px;color:#605040;letter-spacing:1px;">MEMBER VIEW</span>' : '',
      '</div>',
      // Category tabs
      '<div style="display:flex;border-bottom:1px solid #2e1e0c;flex-shrink:0;">',
        catTabs,
      '</div>',
      // Entries
      '<div class="scroll" style="flex:1;overflow-y:auto;padding:12px;">',
        rows || '<div style="color:#4a3020;font-size:11px;text-align:center;padding:24px;">Nothing here yet.</div>',
      '</div>',
      '</div>',
    ].join('');

    _wireSubTabNav(panel);
    panel.querySelectorAll('.wg-al-shopcat').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const cat = btn.dataset.cat;
        if (cat && cat !== _shopCat) { _shopCat = cat; _renderShopSection(panel); }
      });
    });
    panel.addEventListener('click', function(e) {
      const btn = e.target.closest('.wg-al-shop-buy');
      if (!btn || btn.disabled) return;
      const key = btn.dataset.key;
      const result = WG.Alliance.spend(key);
      if (result.ok) {
        _toast('✓ ' + (WG.Alliance.SPEND_POOL[key] || {}).label);
        _renderShopSection(panel);
      } else if (result.reason === 'insufficient_points') {
        _toast('Not enough alliance points');
      } else if (result.reason === 'already_active') {
        _toast('This buff is already active');
      } else if (result.reason === 'already_owned') {
        _toast('Already owned');
      } else if (result.reason === 'on_cooldown') {
        _toast('Pull was already sent — resets in 24h');
      } else {
        _toast('Could not purchase: ' + result.reason);
      }
    });
  }

  function _openShop() {
    _subTab = 'shop';
    refresh();
  }

  function _wireFullButtons(panel) {
    const myId = (window.WG && WG.Account && WG.Account.getDeviceId) ? WG.Account.getDeviceId() : 'local';
    _wireSubTabNav(panel);

    // Roster row tap → member modal
    const roster = panel.querySelector('#wg-al-roster');
    if (roster) roster.addEventListener('click', function(e) {
      const row = e.target.closest('[data-memberid]');
      if (row) _openMemberModal(row.dataset.memberid, myId);
    });

    // Inbox — Accept / Reject (leader/officer only)
    const inbox = panel.querySelector('#wg-al-inbox');
    if (inbox) {
      inbox.addEventListener('click', function(e) {
        const acceptBtn = e.target.closest('.wg-al-inbox-accept');
        if (acceptBtn) {
          const r = WG.AllianceRecruitment && WG.AllianceRecruitment.acceptApplicant(acceptBtn.dataset.apid);
          if (r && r.ok) { _toast('✓ ' + (r.name || 'Applicant') + ' accepted!'); refresh(); }
          else if (r && r.reason === 'at_capacity') _toast('Alliance is full — expand capacity first');
          else _toast('Could not accept');
          return;
        }
        const rejectBtn = e.target.closest('.wg-al-inbox-reject');
        if (rejectBtn) {
          WG.AllianceRecruitment && WG.AllianceRecruitment.rejectApplicant(rejectBtn.dataset.apid);
          refresh();
        }
      });
    }

    // MOTD edit (leader-only)
    const motdEditBtn = panel.querySelector('#wg-al-motd-edit');
    if (motdEditBtn) motdEditBtn.addEventListener('click', function() {
      _openMOTDModal(WG.Alliance.get().msgOfDay);
    });

    // Auto-accept threshold SET button (leader/officer)
    const autoAccBtn = panel.querySelector('#wg-al-autoacc-set');
    if (autoAccBtn) autoAccBtn.addEventListener('click', function() {
      const input = panel.querySelector('#wg-al-autoacc-in');
      const val   = input ? Math.max(0, parseInt(input.value, 10) || 0) : 0;
      if (WG.AllianceRecruitment) WG.AllianceRecruitment.setAutoAcceptMinPower(val);
      _toast(val > 0 ? 'Auto-accept set to ⚡' + _fmt(val) + '+' : 'Auto-accept disabled');
      refresh();
    });

    // Banner color picker (leader-only)
    const bannerDot = panel.querySelector('#wg-al-banner-dot');
    if (bannerDot && WG.Alliance.canEditBanner && WG.Alliance.canEditBanner(myId)) {
      bannerDot.addEventListener('click', function() {
        _openBannerPickerModal(WG.Alliance.get().banner);
      });
    }

    // Claim individual mission
    panel.addEventListener('click', function(e) {
      const btn = e.target.closest('.wg-al-claim-btn');
      if (!btn) return;
      const id = btn.dataset.id;
      const r = WG.AllianceMissions && WG.AllianceMissions.claim(id);
      if (r && r.ok) { _toast('⚑ +' + r.reward + ' alliance points!'); refresh(); }
    });

    // Claim all
    const claimAllBtn = panel.querySelector('#wg-al-claim-all');
    if (claimAllBtn) claimAllBtn.addEventListener('click', function() {
      const claimed = WG.AllianceMissions && WG.AllianceMissions.claimAll();
      if (claimed && claimed.length) _toast('⚑ Claimed ' + claimed.length + ' missions!');
      else _toast('No missions ready to claim');
      refresh();
    });

    // Send gift
    const sendGiftBtn = panel.querySelector('#wg-al-send-gift');
    if (sendGiftBtn) sendGiftBtn.addEventListener('click', function() {
      const r = WG.Alliance && WG.Alliance.sendGift();
      if (r && r.ok) { _toast('🎁 Gift sent! (+1 pts)'); refresh(); }
      else _toast('Already sent a gift today');
    });

    // Claim gift
    const claimGiftBtn = panel.querySelector('#wg-al-claim-gift');
    if (claimGiftBtn) claimGiftBtn.addEventListener('click', function() {
      const r = WG.Alliance && WG.Alliance.claimGift();
      if (r && r.ok) { _toast('📦 Gift claimed! +5 energy, +50 coins'); refresh(); }
      else if (r && r.reason === 'already_claimed_today') _toast('Already claimed a gift today');
      else _toast('No gifts in pool');
    });

    // Chat send
    const chatIn   = panel.querySelector('#wg-al-chat-in');
    const chatSend = panel.querySelector('#wg-al-chat-send');
    function _doSend() {
      if (!chatIn) return;
      const text = chatIn.value.trim();
      if (!text) return;
      const r = WG.AllianceChat && WG.AllianceChat.send(text);
      if (r && r.ok) {
        chatIn.value = '';
        _appendChatMsg(panel, r.msg);
      }
    }
    if (chatSend) chatSend.addEventListener('click', _doSend);
    if (chatIn) chatIn.addEventListener('keydown', function(e){ if (e.key === 'Enter') _doSend(); });

    // Alliance shop — navigate to shop sub-tab
    const shopBtn = panel.querySelector('#wg-al-shop-btn');
    if (shopBtn) shopBtn.addEventListener('click', function() {
      _subTab = 'shop'; refresh();
    });

    // Leave
    const leaveBtn = panel.querySelector('#wg-al-leave-btn');
    if (leaveBtn) leaveBtn.addEventListener('click', function() {
      if (window.confirm('Leave alliance?')) {
        WG.Alliance && WG.Alliance.leave();
        refresh();
      }
    });
  }

  function _appendChatMsg(panel, msg) {
    const container = panel.querySelector('#wg-al-chat');
    if (!container) return;
    const item = document.createElement('div');
    item.style.marginBottom = '6px';
    item.innerHTML = [
      '<span style="font-size:10px;font-weight:700;color:' + _esc(msg.authorColor || '#c0a870') + ';">',
        _esc(msg.authorName),
      '</span>',
      '<span style="font-size:9px;color:#5a4828;margin-left:4px;">just now</span>',
      '<div style="font-size:12px;color:#d0b888;line-height:1.4;margin-top:2px;">' + _esc(msg.text) + '</div>',
    ].join('');
    container.appendChild(item);
    container.scrollTop = container.scrollHeight;
  }

  function _toast(msg) {
    const t = document.createElement('div');
    t.style.cssText = [
      'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);',
      'background:rgba(20,12,4,0.92);border:1px solid #604020;border-radius:8px;',
      'padding:10px 18px;color:#f0d890;font-size:12px;letter-spacing:1px;',
      'z-index:500;pointer-events:none;white-space:nowrap;',
      'opacity:1;transition:opacity 400ms;',
    ].join('');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function(){ t.style.opacity = '0'; }, 2200);
    setTimeout(function(){ if(t.parentNode) t.parentNode.removeChild(t); }, 2700);
  }

  // ---- Lock icon on nav tab ----
  function _updateNavLock() {
    const navTab = document.getElementById('nav-tab-alliance');
    if (!navTab) return;
    const unlocked = WG.Alliance && WG.Alliance.isUnlocked();
    let lockDot = navTab.querySelector('.wg-al-lock-dot');
    if (!unlocked) {
      if (!lockDot) {
        lockDot = document.createElement('span');
        lockDot.className = 'wg-al-lock-dot';
        lockDot.style.cssText = [
          'position:absolute;top:2px;right:calc(50% - 18px);',
          'font-size:10px;line-height:1;pointer-events:none;',
        ].join('');
        lockDot.textContent = '🔒';
        navTab.appendChild(lockDot);
      }
    } else {
      if (lockDot) lockDot.remove();
    }
  }

  function refresh() {
    const panel = document.getElementById('tab-alliance');
    if (!panel) return;
    if (!WG.Alliance) return;

    _updateNavLock();

    if (!WG.Alliance.isUnlocked()) {
      _renderLocked(panel);
      return;
    }
    if (!WG.Alliance.isInAlliance()) {
      _renderEmpty(panel);
      return;
    }
    _renderFull(panel);
  }

  function init() {
    // Refresh on tab:change
    WG.Engine.on('tab:change', function(ev) {
      if (ev && ev.tab === 'alliance') refresh();
    });
    // Refresh on alliance state changes
    WG.Engine.on('alliance:changed',        function(){ if (_isAllianceTabActive()) refresh(); });
    WG.Engine.on('alliance:msg',            function(ev) {
      if (!_isAllianceTabActive()) return;
      const panel = document.getElementById('tab-alliance');
      if (panel) _appendChatMsg(panel, ev);
    });
    WG.Engine.on('alliance:mission-progress', function(){ if (_isAllianceTabActive()) refresh(); });
    WG.Engine.on('hunt:stage-cleared', _updateNavLock);
    // Live HP bar update on boss damage while Boss tab is open
    WG.Engine.on('allianceBoss:damage', function(ev) {
      if (!_isAllianceTabActive() || _subTab !== 'boss') return;
      const panel = document.getElementById('tab-alliance');
      if (!panel) return;
      const boss = WG.AllianceBoss && WG.AllianceBoss.getCurrentBoss();
      if (!boss) return;
      const pct = Math.max(0, Math.round((boss.hpRemaining / boss.hpMax) * 100));
      const fill = panel.querySelector('#wg-boss-tab-hpfill');
      if (fill) fill.style.width = pct + '%';
    });
    WG.Engine.on('allianceBoss:defeated', function() {
      if (_isAllianceTabActive() && _subTab === 'boss') refresh();
    });
    WG.Engine.on('allianceBoss:tierClaimed', function() {
      if (_isAllianceTabActive() && _subTab === 'boss') refresh();
    });
    // Initial lock state update on boot
    _updateNavLock();
  }

  function _isAllianceTabActive() {
    return WG.State && WG.State.get && WG.State.get().activeTab === 'alliance';
  }

  window.WG.AllianceRender = { init, refresh, openShop: _openShop };
})();
