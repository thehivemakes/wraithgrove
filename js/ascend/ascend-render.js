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
    const charId = ps.activeCharacter || 'lantern_acolyte';
    const character = WG.AscendChars.get(charId);
    const tier = WG.AscendChars.currentTier(charId) || (character && character.tiers[0]);

    // Character display
    const heroBox = el('div', { class: 'scene-row' });
    heroBox.appendChild(el('h2', null, 'Ascend'));

    // Hero portrait — current Rebirth-tier appearance
    const portrait = el('div', { style:'position:relative;width:80px;height:96px;background:linear-gradient(to bottom, rgba(20,16,10,0.6), rgba(8,4,2,0.6));border:1px solid #604020;border-radius:6px;margin:6px 0;display:flex;align-items:flex-end;justify-content:center;' });
    const fig = el('div', { style:`width:30px;height:48px;background:${tier.color};border-radius:6px 6px 2px 2px;position:relative;margin-bottom:8px;` });
    const head = el('div', { style:`position:absolute;top:-12px;left:6px;width:18px;height:18px;background:${tier.accent};border-radius:50%;border:1px solid #2a1c10;` });
    fig.appendChild(head);
    portrait.appendChild(fig);
    heroBox.appendChild(portrait);

    // Name / tier / level
    heroBox.appendChild(el('div', { style:'font-size:14px;color:#f0d890;letter-spacing:1px;' }, character.name));
    heroBox.appendChild(el('div', { style:'font-size:11px;color:#c8a868;' }, `${tier.name} · Tier ${tier.tier} · Lv ${ps.level}`));

    // Skin button
    const skinBtnRow = el('div', { style:'margin-top:6px;display:flex;gap:6px;' });
    skinBtnRow.appendChild(el('button', { class:'btn', onclick: () => showSkinPicker() }, 'SKIN'));
    skinBtnRow.appendChild(el('button', { class:'btn primary', onclick: () => { const r = WG.AscendCharacter.tryLevelUp(); refresh(); if (!r.ok) toast('Need ' + (r.cost||0) + ' coins'); } }, `LEVEL UP (${WG.AscendCharacter.levelUpCost(ps.level)} <span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:radial-gradient(#ffe89a,#d8a838);border:1px solid #b08820;vertical-align:-2px;margin-right:2px;"></span>)`));
    heroBox.appendChild(skinBtnRow);

    const ascRow = el('div', { style:'margin-top:6px;display:flex;gap:6px;' });
    ascRow.appendChild(el('button', { class:'btn', onclick: () => { const r = WG.AscendCharacter.tryAscend(); refresh(); if(!r.ok) toast('Need lvl 30 + ' + WG.AscendCharacter.ascendCost(ps.ascendTier) + ' <span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:radial-gradient(#ffe89a,#d8a838);border:1px solid #b08820;vertical-align:-2px;margin-right:2px;"></span>'); } }, `ASCEND (${WG.AscendCharacter.ascendCost(ps.ascendTier)} <span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:radial-gradient(#ffe89a,#d8a838);border:1px solid #b08820;vertical-align:-2px;margin-right:2px;"></span>)`));
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
        const costStr = Object.entries(cost).map(([k,v])=>`${v}${k==='coins'?'<span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:radial-gradient(#ffe89a,#d8a838);border:1px solid #b08820;vertical-align:-2px;margin-right:2px;"></span>':k==='diamonds'?'💎':'🎴'}`).join(' ');
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
      row.appendChild(el('button', { class:'btn', style:'font-size:9px;padding:4px 8px;', onclick: () => { const r = WG.AscendStats.tryUpgrade(ln.upgrade); refresh(); if(!r.ok) toast('Insufficient'); } }, '+ ' + cost + '<span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:radial-gradient(#ffe89a,#d8a838);border:1px solid #b08820;vertical-align:-2px;margin-right:2px;"></span>'));
      statsBox.appendChild(row);
    }
    scroll.appendChild(statsBox);

    // Power summary — annotated with the active character's tier contribution
    // and the next-tier marker so the player can see what's coming.
    const power = WG.State.recomputePower();
    const charPower = (WG.AscendChars.activePower && WG.AscendChars.activePower()) || 0;
    const pwrBox = el('div', { class:'scene-row', style:'background:linear-gradient(to bottom,#3a2818,#1a1006);' });
    pwrBox.appendChild(el('div', { style:'font-size:11px;color:#c8a868;letter-spacing:2px;' }, 'TOTAL POWER'));
    pwrBox.appendChild(el('div', { style:'font-size:28px;color:#ffd870;font-weight:700;' }, '' + power));
    pwrBox.appendChild(el('div', { style:'font-size:10px;color:#a89878;margin-top:2px;' },
      `${character.name} · Tier ${tier.tier} (+${charPower} pwr)`));

    // Rebirth marker — tease the next tier's appearance + cost when it's
    // possible to advance. Uses the Cultivate ladder from AscendChars.
    const next = character.tiers.find(t => t.tier === tier.tier + 1);
    if (next) {
      const need = next.requiresStageClear || 0;
      const highest = ps.highestStageCleared || 0;
      const cost = (WG.AscendChars.rebirthCost && WG.AscendChars.rebirthCost(charId)) || 2880;
      const ready = highest >= need;
      const note = ready
        ? `↑ Tier ${next.tier} ready · Cultivate ${cost}<span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:radial-gradient(#ffe89a,#d8a838);border:1px solid #b08820;vertical-align:-2px;margin-right:2px;"></span>`
        : `↑ Tier ${next.tier} locked · clear stage ${need}`;
      pwrBox.appendChild(el('div', {
        style: `font-size:10px;color:${ready ? '#ffd870' : '#806040'};margin-top:4px;letter-spacing:1px;`
      }, note));
    }
    scroll.appendChild(pwrBox);

    syncTopStrip();
  }

  // Inject roster-picker CSS once: tap scale-bounce, active checkmark badge,
  // and the small 3-col tile portrait.
  function injectRosterCSS() {
    if (document.getElementById('roster-picker-css')) return;
    const st = document.createElement('style');
    st.id = 'roster-picker-css';
    st.textContent = `
      @keyframes roster-tap-bounce {
        0%   { transform: scale(1); }
        40%  { transform: scale(0.92); }
        70%  { transform: scale(1.06); }
        100% { transform: scale(1); }
      }
      .roster-tile {
        position: relative; cursor: pointer;
        transition: transform 120ms ease, border-color 120ms ease;
      }
      .roster-tile.tap { animation: roster-tap-bounce 320ms ease-out; }
      .roster-tile:active { transform: scale(0.96); }
      .roster-tile.active { border-color: #ffd870 !important; box-shadow: 0 0 12px 1px rgba(255,216,112,0.45); }
      .roster-tile .check {
        position: absolute; top: 4px; right: 4px;
        width: 18px; height: 18px; border-radius: 50%;
        background: linear-gradient(135deg, #ffe888, #c89030);
        color: #2a1c10; font-size: 11px; font-weight: 800;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 0 6px rgba(255,200,100,0.8);
      }
      .roster-portrait {
        width: 56px; height: 64px; border-radius: 6px;
        background: linear-gradient(to bottom, rgba(20,16,10,0.9), rgba(8,4,2,0.95));
        border: 1px solid #3a2818; position: relative; overflow: hidden;
      }
      .roster-portrait .body {
        position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%);
        width: 22px; height: 32px; border-radius: 5px 5px 2px 2px;
      }
      .roster-portrait .head {
        position: absolute; left: 50%; bottom: 36px; transform: translateX(-50%);
        width: 14px; height: 14px; border-radius: 50%; border: 1px solid #2a1c10;
      }
      .roster-tag {
        font-size: 8px; letter-spacing: 1.5px; color: #c8a868; margin-top: 2px;
      }
      .roster-tag.cta { color: #ffd870; font-weight: 700; text-shadow: 0 0 4px rgba(255,200,100,0.4); }
      .roster-bonus { font-size: 8px; color: #80c8a0; margin-top: 1px; line-height: 1.2; }
      .roster-cost-btn {
        margin-top: 4px; font-size: 9px; padding: 3px 6px;
      }
    `;
    document.head.appendChild(st);
  }

  function showSkinPicker() {
    injectRosterCSS();
    const root = document.getElementById('modal-root');
    const wrap = el('div', { class:'modal-overlay show' });
    const card = el('div', { class:'modal-card', style:'width:92%;max-width:380px;' });
    card.appendChild(el('div', { class:'modal-title' }, 'ROSTER — TAP TO PLAY'));

    const grid = el('div', { style:'display:grid;grid-template-columns:repeat(3,1fr);gap:8px;' });
    const ps = WG.State.get().player;
    const ownedSet = new Set(ps.ownedCharacters || ['lantern_acolyte']);
    const activeId = ps.activeCharacter || 'lantern_acolyte';

    for (const ch of WG.AscendChars.list()) {
      const owned = ownedSet.has(ch.id);
      // Show the player's CURRENT tier appearance for owned chars; tier-1 for locked.
      const tier = owned ? (WG.AscendChars.currentTier(ch.id) || ch.tiers[0]) : ch.tiers[0];
      const isActive = owned && (ch.id === activeId);
      const tile = el('div', { class:'card-tile roster-tile' + (!owned ? ' locked' : '') + (isActive ? ' active' : '') });

      // Active checkmark badge — only visible when this character is currently active.
      if (isActive) {
        const check = el('div', { class:'check' }, '✓');
        tile.appendChild(check);
      }

      // Portrait: simulated body+head matching tier color/accent.
      const portrait = el('div', { class:'roster-portrait' });
      const body = el('div', { class:'body', style:`background:${tier.color};` });
      const head = el('div', { class:'head', style:`background:${tier.accent};` });
      portrait.appendChild(body);
      portrait.appendChild(head);
      tile.appendChild(portrait);

      tile.appendChild(el('div', { class:'name' }, ch.name));
      tile.appendChild(el('div', { class:'roster-tag' + (owned && !isActive ? ' cta' : '') },
        isActive ? 'ACTIVE' : (owned ? 'TAP TO PLAY' : `Tier ${tier.tier}`)));

      // Active bonus hint for owned characters (special effect line).
      if (owned && ch.bonus && ch.bonus.special) {
        tile.appendChild(el('div', { class:'roster-bonus' }, ch.bonus.special));
      }

      if (owned) {
        tile.addEventListener('click', () => {
          // Scale-bounce + commit + refresh after the tap animation reads.
          tile.classList.add('tap');
          setTimeout(() => {
            WG.AscendChars.setActive(ch.id);
            wrap.remove();
            refresh();
          }, 220);
        });
      } else {
        const costStr = Object.entries(ch.cost || {}).map(([k,v]) => `${v}${k==='coins'?'<span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:radial-gradient(#ffe89a,#d8a838);border:1px solid #b08820;vertical-align:-2px;margin-right:2px;"></span>':k==='diamonds'?'💎':'🎴'}`).join(' ') || 'LOCKED';
        const btn = el('button', { class:'btn roster-cost-btn',
          onclick: (e) => {
            e.stopPropagation();
            const r = WG.AscendChars.tryUnlock(ch.id);
            if (r.ok) { wrap.remove(); refresh(); }
            else toast('Need ' + costStr);
          }
        }, costStr);
        tile.appendChild(btn);
      }
      grid.appendChild(tile);
    }
    card.appendChild(grid);

    const row = el('div', { class:'modal-btn-row', style:'margin-top:14px;' });
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
