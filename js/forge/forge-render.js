// WG.ForgeRender — Forge tab DOM UI
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
  function getRoot() { return document.getElementById('tab-forge'); }
  function refresh() {
    const root = getRoot(); root.innerHTML = '';
    const scroll = el('div', { class:'scroll' }); root.appendChild(scroll);
    scroll.appendChild(el('h2', null, 'Forge'));

    // Power line
    const power = WG.State.recomputePower();
    const pwrBox = el('div', { class:'scene-row', style:'background:linear-gradient(to bottom,#3a2818,#1a1006);' });
    pwrBox.appendChild(el('div', { style:'font-size:11px;color:#c8a868;letter-spacing:2px;' }, 'POWER'));
    pwrBox.appendChild(el('div', { style:'font-size:24px;color:#ffd870;font-weight:700;' }, '' + power));
    scroll.appendChild(pwrBox);

    // Daily Chest button
    const dailyAvail = WG.ForgeDaily.isAvailable();
    const dailyBox = el('div', { class:'scene-row', style:'flex-direction:row;align-items:center;justify-content:space-between;' });
    dailyBox.appendChild(el('div', { style:'font-size:13px;color:#f0d890;' }, '🎁 Daily Chest'));
    if (dailyAvail) {
      dailyBox.appendChild(el('button', { class:'btn primary', onclick: () => { const r = WG.ForgeDaily.tryClaim(); if (r.ok) { showRewardToast(r.reward); refresh(); } } }, 'CLAIM'));
    } else {
      const hr = Math.ceil(WG.ForgeDaily.timeUntil() / (60*60*1000));
      dailyBox.appendChild(el('div', { style:'font-size:11px;color:#a89878;' }, hr + 'h'));
    }
    scroll.appendChild(dailyBox);

    // Building grid 4×2
    const gridBox = el('div', { class:'scene-row' });
    gridBox.appendChild(el('div', { style:'font-size:11px;color:#c8a868;letter-spacing:2px;align-self:flex-start;' }, 'BUILDINGS'));
    const grid = el('div', { style:'display:grid;grid-template-columns:repeat(4,1fr);gap:6px;width:100%;' });
    for (const b of WG.State.get().forge.buildings) {
      const def = WG.ForgeBuildings.get(b.id);
      const tile = el('div', { class:'card-tile' + (!b.unlocked ? ' locked' : '') });
      tile.appendChild(el('div', { class:'icon-box' }, def.icon || '?'));
      tile.appendChild(el('div', { class:'name' }, def.name));
      tile.appendChild(el('div', { class:'level' }, b.unlocked ? 'Lv ' + b.level : 'LOCKED'));
      if (b.unlocked && b.level < 10) {
        const cost = WG.ForgeBuildings.upgradeCost(b);
        tile.appendChild(el('button', { class:'btn', style:'font-size:9px;padding:3px 6px;margin-top:4px;', onclick: (e) => { e.stopPropagation(); const r = WG.ForgeBuildings.tryUpgrade(b.id); refresh(); if (!r.ok) toast('Need ' + cost + ' 🪙'); } }, '+ ' + cost + '🪙'));
      } else if (!b.unlocked) {
        const cost = def.unlockCost || {};
        const costStr = Object.entries(cost).map(([k,v])=>v+(k==='coins'?'🪙':k==='diamonds'?'💎':'🎴')).join(' ');
        tile.appendChild(el('button', { class:'btn', style:'font-size:9px;padding:3px 6px;margin-top:4px;', onclick: (e) => { e.stopPropagation(); const r = WG.ForgeBuildings.tryUnlock(b.id); refresh(); if (!r.ok) toast('Insufficient'); } }, costStr));
      }
      grid.appendChild(tile);
    }
    gridBox.appendChild(grid);
    scroll.appendChild(gridBox);

    // Forge crafting station
    const craftBox = el('div', { class:'scene-row' });
    craftBox.appendChild(el('div', { style:'font-size:11px;color:#c8a868;letter-spacing:2px;align-self:flex-start;' }, 'CRAFTING'));
    craftBox.appendChild(el('div', { style:'font-size:24px;text-align:center;margin:8px 0;' }, '🔨'));
    const s = WG.State.get();
    craftBox.appendChild(el('div', { style:'font-size:12px;color:#a8d878;' }, 'Fragments: ' + s.forge.craftFragments + '   Daily: ' + s.forge.craftDailyUsed + ' / ' + s.forge.craftDailyMax));
    const craftRow = el('div', { class:'modal-btn-row', style:'margin-top:8px;' });
    craftRow.appendChild(el('button', { class:'btn primary', onclick: () => { const r = WG.ForgeCraft.craftBatch(10); if (!r.ok) { toast(r.reason === 'daily-cap' ? 'Daily cap' : 'Need 30 frag'); } else { showCraftResults(r.drops); refresh(); } } }, 'CRAFT × 10 (30 ✦)'));
    craftRow.appendChild(el('button', { class:'btn', onclick: () => showProbabilityInfo() }, 'ODDS'));
    craftBox.appendChild(craftRow);
    scroll.appendChild(craftBox);

    if (WG.Game && WG.Game.syncTopStrip) WG.Game.syncTopStrip();
  }

  function showRewardToast(r) {
    const root = document.getElementById('modal-root');
    const wrap = el('div', { class:'modal-overlay show' });
    wrap.innerHTML = `<div class="modal-card"><div class="modal-title">Daily Chest!</div><div class="modal-body" style="text-align:center;font-size:14px;">🪙 ${r.coins}<br>💎 ${r.diamonds}<br>🎴 ${r.cards}<br>✦ ${r.fragments}</div><div class="modal-btn-row"><button class="btn primary">CLAIM</button></div></div>`;
    root.appendChild(wrap);
    wrap.querySelector('.btn').addEventListener('click', () => wrap.remove());
  }

  function showCraftResults(drops) {
    const root = document.getElementById('modal-root');
    const wrap = el('div', { class:'modal-overlay show' });
    const tierColor = { common:'#a89878', rare:'#80a0e0', epic:'#c080e0', legendary:'#e8c060', mythic:'#e08080' };
    let html = '<div class="modal-card" style="max-width:340px;"><div class="modal-title">Craft Results</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:4px;max-height:240px;overflow-y:auto;">';
    for (const d of drops) {
      html += `<div style="background:${tierColor[d.tier]||'#666'}33;border:1px solid ${tierColor[d.tier]||'#666'};border-radius:4px;padding:4px;text-align:center;font-size:9px;">
        <div style="font-size:18px;">${d.icon||'✦'}</div>
        <div style="color:${tierColor[d.tier]||'#fff'};">${d.name}</div>
      </div>`;
    }
    html += '</div><div class="modal-btn-row" style="margin-top:12px;"><button class="btn primary">OK</button></div></div>';
    wrap.innerHTML = html;
    root.appendChild(wrap);
    wrap.querySelector('.btn').addEventListener('click', () => wrap.remove());
  }

  function showProbabilityInfo() {
    const root = document.getElementById('modal-root');
    const wrap = el('div', { class:'modal-overlay show' });
    const probs = WG.ForgeCraft.probabilityInfo();
    let html = '<div class="modal-card"><div class="modal-title">Drop Odds</div><div class="modal-body">';
    for (const p of probs) html += `<div style="display:flex;justify-content:space-between;padding:4px 0;"><span>${p.tier}</span><span>${p.pct}%</span></div>`;
    html += '</div><div class="modal-btn-row"><button class="btn primary">OK</button></div></div>';
    wrap.innerHTML = html;
    root.appendChild(wrap);
    wrap.querySelector('.btn').addEventListener('click', () => wrap.remove());
  }

  function toast(msg) {
    const t = el('div', { style:'position:fixed;left:50%;bottom:120px;transform:translateX(-50%);background:rgba(80,20,10,0.9);color:#fff;padding:8px 16px;border-radius:6px;font-size:12px;z-index:500;' }, msg);
    document.getElementById('modal-root').appendChild(t);
    setTimeout(() => t.remove(), 1500);
  }

  function init() {
    WG.Engine.on('tab:change', ({ tab }) => { if (tab === 'forge') refresh(); });
    WG.Engine.on('currency:change', () => { if (WG.State.get().activeTab === 'forge') refresh(); });
  }
  window.WG.ForgeRender = { init, refresh };
})();
