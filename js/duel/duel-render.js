// WG.DuelRender — Duel tab DOM UI
(function(){'use strict';
  let _lbTab = 'power'; // active leaderboard sub-tab: 'power' | 'tower' | 'duel'

  function el(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'onclick') e.addEventListener('click', attrs[k]);
      else if (k === 'style') e.style.cssText = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    for (const kid of kids) { if (kid == null) continue; e.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid); }
    return e;
  }
  function getRoot() { return document.getElementById('tab-duel'); }

  // W-Monetization-V2-Sub-Blockers §E — nav badge helper.
  function updateNavBadge() {
    const navTab = document.querySelector('.nav-tab[data-tab="duel"]');
    if (!navTab) return;
    let badge = navTab.querySelector('.nav-badge');
    const left = WG.DuelMatch ? WG.DuelMatch.attemptsLeft() : 0;
    if (left > 0) {
      if (!badge) { badge = document.createElement('span'); badge.className = 'nav-badge has-text'; navTab.appendChild(badge); }
      badge.className = 'nav-badge has-text';
      badge.textContent = left;
    } else {
      if (badge) badge.remove();
    }
  }

  function msUntilMidnight() {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    return midnight - now;
  }
  function fmtCountdown(ms) {
    if (ms <= 0) return '0:00';
    const totalSec = Math.ceil(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return (h ? h + ':' : '') + (h ? String(m).padStart(2,'0') : m) + ':' + String(s).padStart(2,'0');
  }

  function refresh() {
    updateNavBadge();
    const root = getRoot(); root.innerHTML = '';
    const scroll = el('div', { class:'scroll' }); root.appendChild(scroll);
    scroll.appendChild(el('h2', null, 'Duel'));

    const s = WG.State.get();
    const rank = WG.DuelRank.rankAt(s.duel.rankPoints);
    const myPower = WG.State.recomputePower();

    // Rank box — W-Monetization-V2-Whale-Ladder §F: crown badge next to rank name when Royal Pass active
    const vipBadge = (WG.State.isRoyalPassActive && WG.State.isRoyalPassActive())
      ? el('span', { style:'display:inline-block;background:linear-gradient(135deg,#6a20b0,#3a0870);border:1.5px solid #c080ff;border-radius:10px;padding:2px 9px;font-size:10px;color:#e0b8ff;margin-left:6px;font-weight:700;letter-spacing:1px;' }, '👑 ROYAL')
      : null;
    const rankBox = el('div', { class:'scene-row', style:'background:linear-gradient(to bottom,#3a2818,#1a1006);' });
    rankBox.appendChild(el('div', { style:'font-size:36px;' }, rank.icon));
    const rankNameRow = el('div', { style:'display:flex;align-items:center;justify-content:center;gap:4px;' },
      el('span', { style:'font-size:14px;color:#f0d890;' }, rank.name)
    );
    if (vipBadge) rankNameRow.appendChild(vipBadge);
    rankBox.appendChild(rankNameRow);
    rankBox.appendChild(el('div', { style:'font-size:11px;color:#c8a868;' }, s.duel.rankPoints + ' RP · streak ' + (s.duel.streak||0)));
    scroll.appendChild(rankBox);

    // Power + attempts summary
    const left = WG.DuelMatch.attemptsLeft();
    const tun = WG.DuelMatch.TUNABLES;
    const pwrBox = el('div', { class:'scene-row', style:'flex-direction:row;justify-content:space-around;padding:10px 12px;' });
    pwrBox.appendChild(el('div', { style:'text-align:center;' },
      el('div', { style:'font-size:9px;color:#a89878;' }, 'POWER'),
      el('div', { style:'font-size:20px;color:#ffd870;' }, '' + myPower)
    ));
    pwrBox.appendChild(el('div', { style:'text-align:center;' },
      el('div', { style:'font-size:9px;color:#a89878;' }, 'ATTEMPTS'),
      el('div', { style:'font-size:20px;color:' + (left > 0 ? '#a8d878' : '#d88060') + ';' }, left + ' / ' + tun.MAX_DAILY_ATTEMPTS)
    ));
    scroll.appendChild(pwrBox);

    // Find match button
    const matchBox = el('div', { class:'scene-row', style:'gap:8px;' });
    if (left > 0) {
      matchBox.appendChild(el('button', { class:'btn primary', style:'font-size:14px;padding:14px 28px;', onclick: () => findMatch() }, 'FIND OPPONENT'));
    } else {
      matchBox.appendChild(el('div', { style:'color:#d88060;font-size:11px;' }, 'No attempts left — resets in ' + fmtCountdown(msUntilMidnight())));
      matchBox.appendChild(el('button', {
        class:'btn', style:'margin-top:8px;',
        onclick: () => { const r = WG.DuelMatch.refillAttempts(); if (r.ok) refresh(); else if (r.reason === 'insufficient-diamonds') alert('Not enough 💎'); }
      }, 'Refill ' + tun.REFILL_AMOUNT + ' attempts: ' + tun.REFILL_GEMS + ' 💎'));
    }
    scroll.appendChild(matchBox);

    // Ranked ladder (tier reference)
    const histBox = el('div', { class:'scene-row' });
    histBox.appendChild(el('div', { style:'font-size:11px;color:#c8a868;letter-spacing:2px;' }, 'RANKED LADDER'));
    for (const r of WG.DuelRank.RANKS) {
      const cur = r.id === s.duel.rank;
      const row = el('div', { style:`display:flex;justify-content:space-between;padding:4px 8px;font-size:11px;${cur?'color:#f0d890;':'color:#a89878;'}` });
      row.appendChild(el('span', null, r.icon + ' ' + r.name));
      row.appendChild(el('span', null, r.min + ' - ' + (r.max>9999?'∞':r.max)));
      histBox.appendChild(row);
    }
    scroll.appendChild(histBox);

    // Seed-powered leaderboard section
    scroll.appendChild(_buildLeaderboardSection());
  }

  // ── Leaderboard section ──────────────────────────────────────────────────────
  function _buildLeaderboardSection() {
    const wrap = el('div', { class:'scene-row', style:'padding:0;flex-direction:column;gap:0;' });

    // Header row: label + Demo Era badge (honest: no "Live" dot)
    const header = el('div', { style:'display:flex;align-items:center;justify-content:space-between;padding:10px 12px 6px;' });
    header.appendChild(el('span', { style:'font-size:11px;color:#c8a868;letter-spacing:2px;' }, 'LEADERBOARD'));
    header.appendChild(el('span', {
      style: 'font-size:9px;color:#806840;background:rgba(128,90,40,0.18);' +
             'border:1px solid #5a3c1a;border-radius:8px;padding:2px 7px;letter-spacing:1px;',
    }, 'DEMO ERA'));
    wrap.appendChild(header);

    // Sub-tab strip: POWER | TOWER | DUEL
    const tabs = ['power','tower','duel'];
    const tabLabels = { power:'⚔ POWER', tower:'🏯 TOWER', duel:'🥊 DUEL' };
    const tabStrip = el('div', { style:'display:flex;border-bottom:1px solid #2e1e0c;' });
    for (const t of tabs) {
      const active = _lbTab === t;
      const btn = el('button', {
        style: 'flex:1;padding:7px 2px;border:none;background:' +
               (active ? 'rgba(240,200,128,0.08)' : 'transparent') + ';' +
               'color:' + (active ? '#f0d890' : '#705840') + ';' +
               'font-size:9px;letter-spacing:1.2px;font-weight:' + (active ? '700' : '400') + ';' +
               'border-bottom:2px solid ' + (active ? '#d0a840' : 'transparent') + ';' +
               'cursor:pointer;',
      }, tabLabels[t]);
      btn.addEventListener('click', () => { _lbTab = t; refresh(); });
      tabStrip.appendChild(btn);
    }
    wrap.appendChild(tabStrip);

    // Fetch rows for active sub-tab
    let rows = [];
    let valLabel = 'PWR';
    let valKey   = 'power';
    if (window.WG.MetaLeaderboard) {
      if (_lbTab === 'power') {
        rows = WG.MetaLeaderboard.getTopPlayers(10);
        valLabel = 'PWR'; valKey = 'power';
      } else if (_lbTab === 'tower') {
        rows = WG.MetaLeaderboard.getTowerLeaderboard(10);
        valLabel = 'FL'; valKey = 'towerFloor';
      } else {
        rows = WG.MetaLeaderboard.getDuelLadder(10);
        valLabel = 'RP'; valKey = 'duelRankPts';
      }
    }

    const table = el('div', { style:'padding:4px 0;' });

    // Separator flag: if last row has rank > 10, it's the out-of-window player
    const hasPlayerTail = rows.length > 10 || (rows.length === 10 && rows[9].isPlayer && rows[9].rank > 10);
    const mainRows = hasPlayerTail ? rows.slice(0, -1) : rows;
    const tailRow  = hasPlayerTail ? rows[rows.length - 1] : null;

    for (const row of mainRows) {
      table.appendChild(_lbRow(row, valKey, valLabel));
    }
    if (tailRow) {
      table.appendChild(el('div', { style:'text-align:center;font-size:10px;color:#4a3020;padding:2px 0;' }, '···'));
      table.appendChild(_lbRow(tailRow, valKey, valLabel));
    }

    wrap.appendChild(table);
    return wrap;
  }

  function _lbRow(row, valKey, valLabel) {
    const isPlayer = !!row.isPlayer;
    const bg = isPlayer ? 'rgba(240,200,80,0.08)' : (row.rank % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent');
    const nameColor = isPlayer ? '#f0d890' : '#c0a870';
    const rankColor = row.rank === 1 ? '#f0c040' : row.rank === 2 ? '#c0c0c0' : row.rank === 3 ? '#c08040' : '#705840';
    const val = row[valKey] !== undefined ? row[valKey] : '—';
    const r = el('div', { style:`display:flex;align-items:center;gap:6px;padding:5px 12px;background:${bg};` });
    r.appendChild(el('span', { style:`width:22px;text-align:right;font-size:10px;color:${rankColor};font-weight:700;flex-shrink:0;` }, '#' + row.rank));
    r.appendChild(el('span', { style:`flex:1;font-size:11px;color:${nameColor};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;` }, row.name || row.displayName || '—'));
    r.appendChild(el('span', { style:`font-size:9px;color:#806840;margin-right:2px;` }, valLabel));
    r.appendChild(el('span', { style:`font-size:11px;color:#e0b870;font-weight:600;min-width:36px;text-align:right;` }, '' + val));
    return r;
  }

  function findMatch() {
    const m = WG.DuelMatch.startMatch();
    if (!m.ok) return;
    showMatchModal(m);
  }

  function showMatchModal(match) {
    const root = document.getElementById('modal-root');
    const wrap = el('div', { class:'modal-overlay show' });
    const card = el('div', { class:'modal-card', style:'min-width:300px;' });
    card.appendChild(el('div', { class:'modal-title' }, 'Match Ready'));
    const body = el('div', { class:'modal-body' });
    body.appendChild(el('div', { style:'display:flex;justify-content:space-around;align-items:center;' },
      el('div', { style:'text-align:center;' },
        el('div', { style:'font-size:11px;color:#c8a868;' }, 'YOU'),
        el('div', { style:'font-size:18px;color:#ffd870;' }, '' + match.myPower)
      ),
      el('div', { style:'font-size:18px;color:#a85020;' }, 'VS'),
      el('div', { style:'text-align:center;' },
        el('div', { style:'font-size:11px;color:#c8a868;' }, match.opponent.name),
        el('div', { style:'font-size:18px;color:#e0a060;' }, '' + match.opponent.power)
      )
    ));
    card.appendChild(body);
    const row = el('div', { class:'modal-btn-row' });
    row.appendChild(el('button', { class:'btn primary', onclick: () => {
      const r = WG.DuelMatch.resolve(match);
      wrap.remove();
      showResultModal(r, match);
    } }, 'FIGHT'));
    row.appendChild(el('button', { class:'btn', onclick: () => wrap.remove() }, 'CANCEL'));
    card.appendChild(row);
    wrap.appendChild(card);
    root.appendChild(wrap);
  }

  function showResultModal(result, match) {
    const root = document.getElementById('modal-root');
    const wrap = el('div', { class:'modal-overlay show' });
    const card = el('div', { class:'modal-card', style:'min-width:300px;text-align:center;' });
    card.appendChild(el('div', { class:'modal-title', style:`color:${result.won?'#a8d878':'#d88060'};` }, result.won ? 'VICTORY' : 'DEFEAT'));
    card.appendChild(el('div', { class:'modal-body' },
      el('div', null, 'Your score: ' + result.myScore),
      el('div', null, 'Opp score: ' + result.oppScore),
      el('div', { style:'margin-top:8px;color:#f0d890;' }, 'RP ' + (result.delta>=0?'+':'') + result.delta),
      el('div', { style:'margin-top:8px;font-size:13px;' }, '🪙 +' + result.reward.coins + (result.reward.diamonds ? ' · 💎 +' + result.reward.diamonds : ''))
    ));
    const row = el('div', { class:'modal-btn-row' });
    row.appendChild(el('button', { class:'btn primary', onclick: () => { wrap.remove(); refresh(); } }, 'OK'));
    card.appendChild(row);
    wrap.appendChild(card);
    root.appendChild(wrap);
  }

  function init() {
    WG.Engine.on('tab:change', ({ tab }) => { if (tab === 'duel') refresh(); });
    WG.Engine.on('currency:change', () => { if (WG.State.get().activeTab === 'duel') refresh(); });
    WG.Engine.on('duel:refill', () => { refresh(); updateNavBadge(); });
    WG.Engine.on('duel:daily-reset', () => { refresh(); updateNavBadge(); });
    // Keep badge current even when tab isn't open.
    WG.Engine.on('state:init', () => updateNavBadge());
  }
  window.WG.DuelRender = { init, refresh };
})();
