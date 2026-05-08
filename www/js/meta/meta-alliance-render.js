// WG.AllianceRender — Alliance tab DOM: roster, missions, chat, MOTD, shop
(function(){'use strict';

  function _esc(s) {
    return String(s || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _fmtPts(n) { return (n || 0).toLocaleString(); }
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
  function _renderFull(panel) {
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
      '<div class="scroll" id="wg-al-scroll" style="position:absolute;inset:0;overflow-y:auto;padding:12px 12px 20px;">',
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
      '</div>',
    ].join('');

    _wireFullButtons(panel);
  }

  function _wireFullButtons(panel) {
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
    // Initial lock state update on boot
    _updateNavLock();
  }

  function _isAllianceTabActive() {
    return WG.State && WG.State.get && WG.State.get().activeTab === 'alliance';
  }

  window.WG.AllianceRender = { init, refresh };
})();
