// WG.AscendRender — Ascend tab DOM UI
(function(){'use strict';
  function el(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'onclick') e.addEventListener('click', attrs[k]);
      else if (k === 'style') e.style.cssText = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    for (const kid of kids) {
      if (kid == null) continue;
      e.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
    }
    return e;
  }

  function getRoot() { return document.getElementById('tab-ascend'); }

  function refresh() {
    const root = getRoot();
    root.innerHTML = '';
    const scroll = el('div', { class:'scroll' });
    root.appendChild(scroll);

    const ps = WG.State.get().player;
    const skin = WG.AscendSkins.get(ps.activeSkin);

    // Character display
    const heroBox = el('div', { class: 'scene-row' });
    heroBox.appendChild(el('h2', null, 'Ascend'));

    // Hero portrait
    const portrait = el('div', { style:'position:relative;width:80px;height:96px;background:linear-gradient(to bottom, rgba(20,16,10,0.6), rgba(8,4,2,0.6));border:1px solid #604020;border-radius:6px;margin:6px 0;display:flex;align-items:flex-end;justify-content:center;' });
    const fig = el('div', { style:`width:30px;height:48px;background:${skin.color};border-radius:6px 6px 2px 2px;position:relative;margin-bottom:8px;` });
    const head = el('div', { style:`position:absolute;top:-12px;left:6px;width:18px;height:18px;background:${skin.accent};border-radius:50%;border:1px solid #2a1c10;` });
    fig.appendChild(head);
    portrait.appendChild(fig);
    heroBox.appendChild(portrait);

    // Name / tier / level
    heroBox.appendChild(el('div', { style:'font-size:14px;color:#f0d890;letter-spacing:1px;' }, skin.name));
    heroBox.appendChild(el('div', { style:'font-size:11px;color:#c8a868;' }, `${WG.AscendCharacter.tierName(ps.ascendTier)} · Lv ${ps.level}`));

    // Skin button
    const skinBtnRow = el('div', { style:'margin-top:6px;display:flex;gap:6px;' });
    skinBtnRow.appendChild(el('button', { class:'btn', onclick: () => showSkinPicker() }, 'SKIN'));
    skinBtnRow.appendChild(el('button', { class:'btn primary', onclick: () => { const r = WG.AscendCharacter.tryLevelUp(); refresh(); if (!r.ok) toast('Need ' + (r.cost||0) + ' coins'); } }, `LEVEL UP (${WG.AscendCharacter.levelUpCost(ps.level)} 🪙)`));
    heroBox.appendChild(skinBtnRow);

    const ascRow = el('div', { style:'margin-top:6px;display:flex;gap:6px;' });
    ascRow.appendChild(el('button', { class:'btn', onclick: () => { const r = WG.AscendCharacter.tryAscend(); refresh(); if(!r.ok) toast('Need lvl 30 + ' + WG.AscendCharacter.ascendCost(ps.ascendTier) + ' 🪙'); } }, `ASCEND (${WG.AscendCharacter.ascendCost(ps.ascendTier)} 🪙)`));
    ascRow.appendChild(el('button', { class:'btn', onclick: () => { const r = WG.AscendCharacter.tryCultivate(); refresh(); if(!r.ok) toast('Need 5 💎'); } }, 'CULTIVATE (5 💎)'));
    heroBox.appendChild(ascRow);

    scroll.appendChild(heroBox);

    // 3 equipment slots
    const eqRow = el('div', { style:'display:flex;gap:6px;margin-bottom:10px;' });
    for (const slot of ['melee','ranged','pet']) {
      const equipped = ps.slots[slot];
      const w = equipped && WG.HuntWeapons.byId(equipped);
      const tile = el('div', { class:'card-tile' + (!equipped && slot !== 'melee' ? ' locked' : ''), style:'flex:1;' });
      tile.appendChild(el('div', { class:'icon-box' }, w ? '⚔' : '?'));
      tile.appendChild(el('div', { class:'name' }, slot.toUpperCase()));
      tile.appendChild(el('div', { class:'level' }, w ? w.name : 'LOCKED'));
      if (!equipped && slot !== 'melee') {
        const cost = WG.AscendEquipment.SLOT_UNLOCK_COSTS[slot];
        const costStr = Object.entries(cost).map(([k,v])=>`${v}${k==='coins'?'🪙':k==='diamonds'?'💎':'🎴'}`).join(' ');
        const btn = el('button', { class:'btn', style:'margin-top:4px;font-size:9px;padding:4px 6px;', onclick: (e) => { e.stopPropagation(); const r = WG.AscendEquipment.tryUnlockSlot(slot); refresh(); if(!r.ok) toast('Insufficient'); } }, 'UNLOCK ' + costStr);
        tile.appendChild(btn);
      } else {
        tile.addEventListener('click', () => showWeaponPicker(slot));
      }
      eqRow.appendChild(tile);
    }
    scroll.appendChild(eqRow);

    // Stats
    const statsBox = el('div', { class:'scene-row' });
    statsBox.appendChild(el('h2', null, 'Stats'));
    const stats = ps.stats;
    const lines = [
      { label:'Attack', value: Math.round(stats.attack), upgrade:'attack' },
      { label:'HP Max', value: Math.round(stats.hpMax), upgrade:'hpMax' },
      { label:'Defense', value: Math.round(stats.defense), upgrade:'defense' },
      { label:'Crit',   value: ((stats.critRate||0)*100).toFixed(0)+'%', upgrade:'critRate' },
      { label:'Gather', value: ((stats.gatherRate||0)*100).toFixed(0)+'%', upgrade:'gatherRate' },
    ];
    for (const ln of lines) {
      const u = WG.AscendStats.UPGRADES[ln.upgrade];
      const n = ps.stats['_lvl_'+ln.upgrade] || 0;
      const cost = u.cost(n);
      const row = el('div', { style:'display:flex;align-items:center;justify-content:space-between;width:100%;padding:6px 4px;border-bottom:1px solid rgba(96,64,32,0.3);' });
      row.appendChild(el('span', { style:'color:#c8a868;' }, ln.label));
      row.appendChild(el('span', { style:'color:#f0d890;font-weight:600;' }, '' + ln.value));
      row.appendChild(el('button', { class:'btn', style:'font-size:9px;padding:4px 8px;', onclick: () => { const r = WG.AscendStats.tryUpgrade(ln.upgrade); refresh(); if(!r.ok) toast('Insufficient'); } }, '+ ' + cost + '🪙'));
      statsBox.appendChild(row);
    }
    scroll.appendChild(statsBox);

    // Power summary
    const power = WG.State.recomputePower();
    const pwrBox = el('div', { class:'scene-row', style:'background:linear-gradient(to bottom,#3a2818,#1a1006);' });
    pwrBox.appendChild(el('div', { style:'font-size:11px;color:#c8a868;letter-spacing:2px;' }, 'TOTAL POWER'));
    pwrBox.appendChild(el('div', { style:'font-size:28px;color:#ffd870;font-weight:700;' }, '' + power));
    scroll.appendChild(pwrBox);

    syncTopStrip();
  }

  function showSkinPicker() {
    const root = document.getElementById('modal-root');
    const wrap = el('div', { class:'modal-overlay show' });
    const card = el('div', { class:'modal-card', style:'width:90%;max-width:380px;' });
    card.appendChild(el('div', { class:'modal-title' }, 'Skins — boost power'));
    const grid = el('div', { style:'display:grid;grid-template-columns:repeat(3,1fr);gap:6px;' });
    const ps = WG.State.get().player;
    for (const skin of WG.AscendSkins.list()) {
      const owned = ps.ownedSkins.includes(skin.id);
      const tile = el('div', { class:'card-tile' + (!owned ? ' locked' : ''), style:'cursor:pointer;' });
      tile.appendChild(el('div', { class:'icon-box', style:`background:${skin.color};color:${skin.accent};` }, '👤'));
      tile.appendChild(el('div', { class:'name' }, skin.name));
      tile.appendChild(el('div', { class:'level' }, '+' + skin.power + ' PWR'));
      if (owned) {
        tile.addEventListener('click', () => { WG.AscendSkins.trySetActive(skin.id); wrap.remove(); refresh(); });
      } else {
        const costStr = Object.entries(skin.cost||{}).map(([k,v])=>`${v}${k==='coins'?'🪙':k==='diamonds'?'💎':'🎴'}`).join(' ');
        const btn = el('button', { class:'btn', style:'font-size:9px;padding:4px 6px;', onclick: (e) => { e.stopPropagation(); const r = WG.AscendSkins.tryUnlock(skin.id); if (r.ok) { wrap.remove(); refresh(); } else toast('Need ' + costStr); } }, costStr);
        tile.appendChild(btn);
      }
      grid.appendChild(tile);
    }
    card.appendChild(grid);
    const row = el('div', { class:'modal-btn-row', style:'margin-top:12px;' });
    row.appendChild(el('button', { class:'btn', onclick: () => wrap.remove() }, 'CLOSE'));
    card.appendChild(row);
    wrap.appendChild(card);
    root.appendChild(wrap);
  }

  function showWeaponPicker(slot) {
    const root = document.getElementById('modal-root');
    const wrap = el('div', { class:'modal-overlay show' });
    const card = el('div', { class:'modal-card', style:'width:90%;max-width:380px;' });
    card.appendChild(el('div', { class:'modal-title' }, slot.toUpperCase() + ' — pick weapon'));
    const list = WG.AscendEquipment.listAvailableForSlot(slot);
    const grid = el('div', { style:'display:grid;grid-template-columns:repeat(2,1fr);gap:6px;' });
    const ps = WG.State.get().player;
    for (const w of list) {
      const tile = el('div', { class:'card-tile', style:'cursor:pointer;' });
      tile.appendChild(el('div', { class:'icon-box', style:`background:${w.visual.color};` }, '⚔'));
      tile.appendChild(el('div', { class:'name' }, w.name));
      tile.appendChild(el('div', { class:'level' }, 'DMG ' + w.damage + '  CD ' + w.cooldown.toFixed(2) + 's'));
      if (ps.slots[slot] === w.id) tile.style.borderColor = '#f0d890';
      tile.addEventListener('click', () => { WG.AscendEquipment.trySetEquipped(slot, w.id); wrap.remove(); refresh(); });
      grid.appendChild(tile);
    }
    card.appendChild(grid);
    const row = el('div', { class:'modal-btn-row', style:'margin-top:12px;' });
    row.appendChild(el('button', { class:'btn', onclick: () => wrap.remove() }, 'CLOSE'));
    card.appendChild(row);
    wrap.appendChild(card);
    root.appendChild(wrap);
  }

  function toast(msg) {
    const root = document.getElementById('modal-root');
    const t = el('div', { style:'position:fixed;left:50%;bottom:120px;transform:translateX(-50%);background:rgba(80,20,10,0.9);color:#fff;padding:8px 16px;border-radius:6px;font-size:12px;z-index:500;' }, msg);
    root.appendChild(t);
    setTimeout(() => t.remove(), 1600);
  }

  function syncTopStrip() {
    if (WG.Game && WG.Game.syncTopStrip) WG.Game.syncTopStrip();
  }

  function init() {
    WG.Engine.on('tab:change', ({ tab }) => { if (tab === 'ascend') refresh(); });
    WG.Engine.on('currency:change', () => { if (WG.State.get().activeTab === 'ascend') refresh(); });
  }

  window.WG.AscendRender = { init, refresh };
})();
