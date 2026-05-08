// WG.AllianceRender — Alliance tab DOM: roster, missions, chat, MOTD, shop, boss
(function(){'use strict';

  let _subTab = 'roster'; // 'roster' | 'boss'

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

  // ---- Empty state (has access, no alliance) ----
  function _renderEmpty(panel) {
    const fakes = (WG.Alliance && WG.Alliance.findAlliances()) || [];

    let findRows = fakes.map(function(f) {
      return [
        '<div style="',
          'display:flex;align-items:center;gap:10px;padding:10px 12px;',
          'background:rgba(255,255,255,0.03);border:1px solid #3a2818;',
          'border-radius:8px;margin-bottom:6px;cursor:pointer;',
        '" data-join="' + _esc(f.id) + '" class="wg-al-find-row">',
          '<div style="width:12px;height:12px;border-radius:50%;flex-shrink:0;background:' + _esc(f.banner) + '"></div>',
          '<div style="flex:1;">',
            '<div style="font-size:12px;color:#e0c898;font-weight:600;">' + _esc(f.name) + '</div>',
            '<div style="font-size:10px;color:#705840;">' + f.memberCount + ' members · ⚑ ' + _fmtPts(f.points) + ' pts</div>',
          '</div>',
          '<button style="padding:5px 10px;border-radius:5px;border:1px solid #806040;',
            'background:linear-gradient(to bottom,#4a3220,#2e1c0c);color:#f0d890;',
            'font-size:10px;font-weight:700;letter-spacing:1px;cursor:pointer;">JOIN</button>',
        '</div>',
      ].join('');
    }).join('');

    panel.innerHTML = [
      '<div class="scroll" style="position:absolute;inset:0;overflow-y:auto;padding:16px;">',
        '<div style="text-align:center;padding:24px 0 16px;letter-spacing:2px;',
          'font-size:13px;color:#f0d890;text-transform:uppercase;">Alliance</div>',
        '<div style="display:flex;gap:10px;margin-bottom:20px;">',
          '<button id="wg-al-create-btn" style="',
            'flex:1;padding:14px;border-radius:8px;border:1px solid #b08840;',
            'background:linear-gradient(to bottom,#806020,#5a3c0a);',
            'color:#fff0c8;font-size:12px;font-weight:700;letter-spacing:1.5px;',
            'cursor:pointer;text-transform:uppercase;">',
            'Create Alliance<br>',
            '<span style="font-size:10px;color:#c8a050;font-weight:400;">🪙 500 coins</span>',
          '</button>',
        '</div>',
        '<div style="font-size:10px;color:#705840;letter-spacing:1.5px;text-transform:uppercase;',
          'margin-bottom:8px;">Find Alliance</div>',
        findRows,
      '</div>',
    ].join('');

    // Create alliance — opens name dialog
    const createBtn = panel.querySelector('#wg-al-create-btn');
    if (createBtn) {
      createBtn.addEventListener('click', function() {
        _openCreateDialog();
      });
    }

    // Join alliance rows
    panel.addEventListener('click', function(e) {
      const row = e.target.closest('[data-join]');
      if (!row) return;
      const id = row.dataset.join;
      if (!WG.Alliance) return;
      const result = WG.Alliance.join(id);
      if (result.ok) {
        refresh();
      } else {
        _toast('Could not join: ' + result.reason);
      }
    });
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
    return [
      '<div style="display:flex;border-bottom:1px solid #2e1e0c;flex-shrink:0;">',
        ['roster','boss'].map(function(t){
          const active = _subTab === t;
          return '<button class="wg-al-subtab" data-subtab="' + t + '" style="' +
            'flex:1;padding:10px 4px;border:none;background:' +
            (active ? 'rgba(240,200,128,0.08)' : 'transparent') + ';' +
            'color:' + (active ? '#f0d890' : '#705840') + ';' +
            'font-size:10px;letter-spacing:1.5px;text-transform:uppercase;' +
            'font-weight:' + (active ? '700' : '400') + ';' +
            'border-bottom:2px solid ' + (active ? '#d0a840' : 'transparent') + ';' +
            'cursor:pointer;">' +
            (t === 'boss' ? '☠ Boss' : '⚑ Alliance') +
            '</button>';
        }).join(''),
      '</div>',
    ].join('');
  }

  function _renderFull(panel) {
    if (_subTab === 'boss') { _renderBossSection(panel); return; }
    const a    = WG.Alliance.get();
    const msgs = (WG.AllianceChat && WG.AllianceChat.recent()) || [];
    const missions = (WG.AllianceMissions && WG.AllianceMissions.progress()) || [];
    const NPCs = (WG.Alliance && WG.Alliance.getNPCMembers()) || [];
    const myId = (window.WG && WG.Account && WG.Account.getDeviceId) ? WG.Account.getDeviceId() : 'local';

    // Member list (player + NPCs that are in memberIds)
    const memberIds = a.memberIds || [];

    let rosterHtml = memberIds.slice(0, 15).map(function(id) {
      const isMe = id === myId;
      const npc  = WG.Alliance.getNPCMember && WG.Alliance.getNPCMember(id);
      const name = isMe ? 'You' : (npc ? npc.name : id.slice(0, 8));
      const online = isMe || (npc && npc.online);
      const isLeader = id === a.leaderId;
      const isOfficer = (a.officerIds || []).includes(id);
      const badge = isLeader ? '<span style="color:#f0c040;font-size:9px;"> ♛</span>'
                  : isOfficer ? '<span style="color:#a080c0;font-size:9px;"> ◆</span>' : '';
      return [
        '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;',
          'border-bottom:1px solid rgba(255,255,255,0.04);">',
          '<div style="width:8px;height:8px;border-radius:50%;flex-shrink:0;',
            'background:' + (online ? '#60d080' : '#4a3828') + '"></div>',
          '<span style="flex:1;font-size:12px;color:' + (isMe ? '#f0d890' : '#c0a870') + ';">',
            _esc(name), badge,
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
          '<div style="width:32px;height:32px;border-radius:50%;flex-shrink:0;background:' + _esc(a.banner) + ';',
            'border:2px solid rgba(255,255,255,0.2);"></div>',
          '<div style="flex:1;">',
            '<div style="font-size:14px;color:#f0d890;font-weight:700;">' + _esc(a.name) + '</div>',
            '<div style="font-size:10px;color:#706040;">' + memberIds.length + ' / ' + (a.memberCap || 30) + ' members</div>',
          '</div>',
          '<div style="text-align:right;">',
            '<div style="font-size:14px;color:#c0a040;font-weight:700;">⚑ ' + _fmtPts(a.points) + '</div>',
            '<div style="font-size:9px;color:#705840;margin-top:1px;">alliance pts</div>',
          '</div>',
        '</div>',

        // MOTD card
        a.msgOfDay
          ? '<div style="background:rgba(80,40,8,0.3);border:1px solid #5a3018;border-radius:6px;' +
              'padding:8px 12px;font-size:11px;color:#c0a060;margin-bottom:10px;' +
              'letter-spacing:0.3px;font-style:italic;">' + _esc(a.msgOfDay) + '</div>'
          : '',

        // Roster section
        '<div style="font-size:9px;color:#705840;letter-spacing:1.5px;text-transform:uppercase;',
          'margin-bottom:6px;">Members</div>',
        '<div style="background:rgba(255,255,255,0.02);border:1px solid #2e1e0c;border-radius:8px;',
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

        // Alliance shop button
        '<button id="wg-al-shop-btn" style="',
          'width:100%;padding:12px;border-radius:8px;border:1px solid #a08040;',
          'background:linear-gradient(to bottom,#5a3c10,#3a2408);',
          'color:#f0d890;font-size:12px;font-weight:700;letter-spacing:2px;',
          'text-transform:uppercase;cursor:pointer;margin-bottom:6px;">',
          '⚑ Alliance Shop',
        '</button>',

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

  function _wireFullButtons(panel) {
    _wireSubTabNav(panel);
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

    // Alliance shop
    const shopBtn = panel.querySelector('#wg-al-shop-btn');
    if (shopBtn) shopBtn.addEventListener('click', function() {
      WG.AllianceMissions && WG.AllianceMissions.openShopModal();
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

  window.WG.AllianceRender = { init, refresh };
})();
