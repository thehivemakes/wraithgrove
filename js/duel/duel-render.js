// WG.DuelRender — Duel tab DOM UI
(function(){'use strict';
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

  function refresh() {
    const root = getRoot(); root.innerHTML = '';
    const scroll = el('div', { class:'scroll' }); root.appendChild(scroll);
    scroll.appendChild(el('h2', null, 'Duel'));

    const s = WG.State.get();
    const rank = WG.DuelRank.rankAt(s.duel.rankPoints);
    const myPower = WG.State.recomputePower();

    // Rank box
    const rankBox = el('div', { class:'scene-row', style:'background:linear-gradient(to bottom,#3a2818,#1a1006);' });
    rankBox.appendChild(el('div', { style:'font-size:36px;' }, rank.icon));
    rankBox.appendChild(el('div', { style:'font-size:14px;color:#f0d890;' }, rank.name));
    rankBox.appendChild(el('div', { style:'font-size:11px;color:#c8a868;' }, s.duel.rankPoints + ' RP · streak ' + (s.duel.streak||0)));
    scroll.appendChild(rankBox);

    // Power summary
    const pwrBox = el('div', { class:'scene-row', style:'flex-direction:row;justify-content:space-around;padding:10px 12px;' });
    pwrBox.appendChild(el('div', { style:'text-align:center;' },
      el('div', { style:'font-size:9px;color:#a89878;' }, 'POWER'),
      el('div', { style:'font-size:20px;color:#ffd870;' }, '' + myPower)
    ));
    pwrBox.appendChild(el('div', { style:'text-align:center;' },
      el('div', { style:'font-size:9px;color:#a89878;' }, 'DUELS'),
      el('div', { style:'font-size:20px;color:#f0d890;' }, s.duel.dailyDuelsUsed + ' / ' + s.duel.dailyDuelsMax)
    ));
    scroll.appendChild(pwrBox);

    // Find match button
    const matchBox = el('div', { class:'scene-row' });
    if (WG.DuelMatch.dailyAvailable()) {
      matchBox.appendChild(el('button', { class:'btn primary', style:'font-size:14px;padding:14px 28px;', onclick: () => findMatch() }, 'FIND OPPONENT'));
    } else {
      matchBox.appendChild(el('div', { style:'color:#d88060;font-size:11px;' }, 'Daily cap reached. Resets tomorrow.'));
      matchBox.appendChild(el('button', { class:'btn', style:'margin-top:8px;', onclick: () => buyExtraDuels() }, '+1 DUEL (10 💎)'));
    }
    scroll.appendChild(matchBox);

    // Recent results placeholder (server-side in production)
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
  }

  function findMatch() {
    const m = WG.DuelMatch.startMatch();
    if (!m.ok) return;
    showMatchModal(m);
  }
  function buyExtraDuels() {
    if (!WG.State.spend('diamonds', 10)) return;
    WG.State.get().duel.dailyDuelsMax++;
    refresh();
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
  }
  window.WG.DuelRender = { init, refresh };
})();
