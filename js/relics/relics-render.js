// WG.RelicsRender — Relics tab DOM UI
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
  const TIER_COLOR = { common:'#a89878', rare:'#80a0e0', epic:'#c080e0', legendary:'#e8c060', mythic:'#e08080' };

  function getRoot() { return document.getElementById('tab-relics'); }
  function refresh() {
    const root = getRoot(); root.innerHTML = '';
    const scroll = el('div', { class:'scroll' }); root.appendChild(scroll);
    scroll.appendChild(el('h2', null, 'Relics'));

    const s = WG.State.get();
    const filter = s.relics.activeRarityFilter || 'rare';

    // Tier filter tabs
    const tabRow = el('div', { style:'display:flex;gap:4px;margin-bottom:8px;flex-wrap:wrap;' });
    for (const t of ['common','rare','epic','legendary','mythic']) {
      const b = el('button', {
        class: 'btn' + (t === filter ? ' primary' : ''),
        style: `font-size:9px;padding:4px 8px;flex:1;color:${TIER_COLOR[t]};`,
        onclick: () => { s.relics.activeRarityFilter = t; refresh(); }
      }, t.toUpperCase());
      tabRow.appendChild(b);
    }
    scroll.appendChild(tabRow);

    // Equipped count
    const equipBox = el('div', { class:'scene-row', style:'flex-direction:row;align-items:center;justify-content:space-between;padding:8px 12px;' });
    equipBox.appendChild(el('div', { style:'font-size:11px;color:#c8a868;' }, 'EQUIPPED ' + s.relics.equipped.length + ' / ' + WG.RelicsEquip.MAX_EQUIPPED));
    const totals = WG.RelicsCollection.aggregateBonus();
    const summary = Object.entries(totals).filter(([k,v])=>v>0).map(([k,v])=>k+'+'+(typeof v==='number'?(k.includes('Rate')?(v*100).toFixed(1)+'%':Math.round(v)):v)).join(' · ');
    equipBox.appendChild(el('div', { style:'font-size:10px;color:#a8d878;' }, summary || 'no bonus'));
    scroll.appendChild(equipBox);

    // Grid of relics in selected tier
    const list = WG.RelicsCatalog.byTier(filter);
    const grid = el('div', { style:'display:grid;grid-template-columns:repeat(4,1fr);gap:6px;' });
    for (const r of list) {
      const owned = s.relics.owned[r.id];
      const isEq = WG.RelicsEquip.isEquipped(r.id);
      const tile = el('div', { class:'card-tile' + (!owned ? ' locked' : ''), style:`cursor:${owned?'pointer':'default'};${isEq?'border-color:#f0d890;background:linear-gradient(to bottom,#3a2818,#1a1006);':''}` });
      tile.appendChild(el('div', { class:'icon-box', style:`color:${TIER_COLOR[r.tier]};` }, r.icon));
      tile.appendChild(el('div', { class:'name' }, r.name));
      if (owned) {
        tile.appendChild(el('div', { class:'level' }, 'Lv ' + owned.level + ' · ' + owned.count + '/2'));
        tile.appendChild(el('div', { style:'font-size:9px;color:#a8d878;' }, '+' + (r.value * owned.level).toFixed(2) + ' ' + r.stat));
        tile.addEventListener('click', () => {
          if (isEq) WG.RelicsEquip.tryUnequip(r.id);
          else { const res = WG.RelicsEquip.tryEquip(r.id); if (!res.ok) toast(res.reason); }
          refresh();
        });
      } else {
        tile.appendChild(el('div', { class:'level' }, '?'));
        tile.appendChild(el('div', { style:'font-size:9px;color:#605040;' }, 'undiscovered'));
      }
      grid.appendChild(tile);
    }
    scroll.appendChild(grid);

    // CTA: link to Forge for crafting more
    const ctaBox = el('div', { class:'scene-row', style:'margin-top:12px;' });
    ctaBox.appendChild(el('div', { style:'font-size:11px;color:#c8a868;text-align:center;' }, 'Craft more relics at the Forge'));
    ctaBox.appendChild(el('button', { class:'btn primary', style:'margin-top:8px;', onclick: () => WG.Game.switchTab('forge') }, 'GO TO FORGE'));
    scroll.appendChild(ctaBox);
  }

  function toast(msg) {
    const t = el('div', { style:'position:fixed;left:50%;bottom:120px;transform:translateX(-50%);background:rgba(80,20,10,0.9);color:#fff;padding:8px 16px;border-radius:6px;font-size:12px;z-index:500;' }, msg);
    document.getElementById('modal-root').appendChild(t);
    setTimeout(() => t.remove(), 1500);
  }

  function init() {
    WG.Engine.on('tab:change', ({ tab }) => { if (tab === 'relics') refresh(); });
    WG.Engine.on('relics:gained', () => { if (WG.State.get().activeTab === 'relics') refresh(); });
  }
  window.WG.RelicsRender = { init, refresh };
})();
