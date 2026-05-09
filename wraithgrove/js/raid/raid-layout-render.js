// WG.RaidLayoutRender — drag-drop DOM editor for base defense layout
// Shows 14-slot top-down map; drag from bottom rail to slot; highlights on drag.
(function(){'use strict';

  const SLOT_COLOR = { wall: '#8060a0', trap: '#c04040', turret: '#4080c0' };
  const SLOT_LABEL = { wall: 'WALL', trap: 'TRAP', turret: 'TURRET' };

  // ── OPEN EDITOR ────────────────────────────────────────────────────────────
  function open(opts) {
    opts = opts || {};
    const onClose = opts.onClose || function(){};

    const overlay = document.createElement('div');
    overlay.id = 'wg-raid-layout-editor';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(6,4,12,0.94);z-index:500;display:flex;flex-direction:column;overflow:hidden;';
    document.body.appendChild(overlay);

    // ── HEADER ──────────────────────────────────────────────────────────────
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 14px 8px;border-bottom:1px solid #2a1a38;flex-shrink:0;';
    header.innerHTML = '<div style="font-size:13px;color:#c0a0e0;font-weight:800;letter-spacing:2px;">⚔ BASE LAYOUT</div>';

    const headerRight = document.createElement('div');
    headerRight.style.cssText = 'display:flex;gap:6px;';

    const autoBtn = _mkBtn('AUTO', '#4060a0', '#8090d0');
    autoBtn.title = 'Auto-deploy from stocks';
    autoBtn.addEventListener('click', () => { WG.RaidLayout.autoDeploy(); renderSlots(); });

    const undoBtn = _mkBtn('↩', '#3a2828', '#c08080');
    undoBtn.title = 'Undo last placement';
    undoBtn.addEventListener('click', () => { WG.RaidLayout.undoLast(); renderSlots(); });

    const undoAllBtn = _mkBtn('↩↩', '#3a2828', '#c08080');
    undoAllBtn.title = 'Undo all';
    undoAllBtn.addEventListener('click', () => { WG.RaidLayout.undoAll(); renderSlots(); });

    const saveBtn = _mkBtn('SAVE', '#205020', '#80d080');
    saveBtn.addEventListener('click', () => _saveDialog(overlay));

    const closeBtn = _mkBtn('✕', '#2a1a18', '#c08060');
    closeBtn.addEventListener('click', () => { overlay.remove(); onClose(); });

    headerRight.appendChild(autoBtn);
    headerRight.appendChild(undoBtn);
    headerRight.appendChild(undoAllBtn);
    headerRight.appendChild(saveBtn);
    headerRight.appendChild(closeBtn);
    header.appendChild(headerRight);
    overlay.appendChild(header);

    // ── MAP AREA (proportional to 1080×1650 logical size) ────────────────────
    const mapWrap = document.createElement('div');
    mapWrap.style.cssText = 'flex:1 1 auto;position:relative;overflow:hidden;margin:8px 14px;border-radius:10px;border:1.5px solid #2a1a38;background:radial-gradient(ellipse at center,#1a0a28 0%,#0a0414 100%);';
    overlay.appendChild(mapWrap);

    // Slot DOM nodes — keyed by global index
    const slotEls = {};

    function renderSlots() {
      const layout = WG.RaidLayout.getLayout();
      const mw = mapWrap.clientWidth  || 320;
      const mh = mapWrap.clientHeight || 480;

      // Base diamond / crystal shape as backdrop
      const base = mapWrap.querySelector('.raid-base-bg') || (function(){
        const d = document.createElement('div');
        d.className = 'raid-base-bg';
        d.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:52%;height:52%;border:2px solid #3a2050;border-radius:50%;background:rgba(20,10,40,0.6);pointer-events:none;';
        mapWrap.appendChild(d);
        return d;
      })();
      void base;

      const cfg = WG.RaidLayout.SLOT_CONFIG;
      for (let i = 0; i < cfg.length; i++) {
        const slot = cfg[i];
        let el = slotEls[i];
        if (!el) {
          el = document.createElement('div');
          el.dataset.slotIdx = i;
          el.dataset.slotType = slot.type;
          el.style.cssText = 'position:absolute;transform:translate(-50%,-50%);width:48px;height:48px;border-radius:9px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:box-shadow 150ms,border-color 150ms;user-select:none;';
          el.addEventListener('dragover', _onDragOver);
          el.addEventListener('drop', function(e) { _onDrop(e, i, renderSlots); });
          el.addEventListener('click', function() { _onSlotClick(i, renderSlots); });
          mapWrap.appendChild(el);
          slotEls[i] = el;
        }
        el.style.left = (slot.nx * mw) + 'px';
        el.style.top  = (slot.ny * mh) + 'px';

        const entry = layout.slots[i];
        const typeColor = SLOT_COLOR[slot.type] || '#606060';
        if (entry && entry.defenseId) {
          const def = slot.type === 'turret' ? WG.RaidDefenses.getTurret(entry.defenseId)
                    : slot.type === 'trap'   ? WG.RaidDefenses.getTrap(entry.defenseId)
                    : WG.RaidDefenses.getWall(entry.defenseId);
          el.innerHTML = '';
          // Procedural sprite for trap/turret slots; emoji fallback for walls
          if (window.WG && WG.RaidDefensesArt && (slot.type === 'trap' || slot.type === 'turret')) {
            var artCvs = document.createElement('canvas');
            artCvs.width = 24; artCvs.height = 24;
            artCvs.style.cssText = 'width:24px;height:24px;flex-shrink:0;';
            el.appendChild(artCvs);
            var artCtx = artCvs.getContext('2d');
            if (slot.type === 'trap')   WG.RaidDefensesArt.drawTrap(artCtx, 12, 12, entry.defenseId, 'idle');
            else                        WG.RaidDefensesArt.drawTurret(artCtx, 12, 12, entry.defenseId, 1, 1, 0);
          } else {
            var iconSpan = document.createElement('span');
            iconSpan.style.cssText = 'font-size:22px;line-height:1;';
            iconSpan.textContent = def ? def.icon : '?';
            el.appendChild(iconSpan);
          }
          var nameLbl = document.createElement('span');
          nameLbl.style.cssText = 'font-size:10px;color:#c0b0d8;letter-spacing:0.5px;margin-top:2px;';
          nameLbl.textContent = def ? def.name.split(' ')[0].toUpperCase() : entry.defenseId.toUpperCase();
          el.appendChild(nameLbl);
          el.style.background = 'linear-gradient(135deg,' + typeColor + '44,' + typeColor + '22)';
          el.style.border = '1.5px solid ' + typeColor;
          el.style.boxShadow = '0 0 8px ' + typeColor + '44';
        } else {
          el.innerHTML = '<span style="font-size:13px;color:#40304a;font-weight:700;">+</span><span style="font-size:11px;color:#40304a;letter-spacing:1px;margin-top:2px;">' + SLOT_LABEL[slot.type] + '</span>';
          el.style.background = 'rgba(20,12,32,0.7)';
          el.style.border = '1.5px dashed #3a2048';
          el.style.boxShadow = 'none';
        }
      }
    }

    // ── BOTTOM RAIL (drag source) ────────────────────────────────────────────
    const rail = document.createElement('div');
    rail.style.cssText = 'flex-shrink:0;padding:8px 10px;background:#0a0612;border-top:1px solid #1a1028;';
    overlay.appendChild(rail);

    // Category tabs: WALLS | TRAPS | TURRETS
    const catTabs = document.createElement('div');
    catTabs.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;';
    const categories = ['wall','trap','turret'];
    let activeCat = 'turret';

    function buildRail() {
      rail.querySelectorAll('.rail-items').forEach(el => el.remove());
      const items = document.createElement('div');
      items.className = 'rail-items';
      items.style.cssText = 'display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;';

      if (activeCat === 'wall') {
        const defs = WG.RaidDefenses.WALL_TYPES;
        Object.keys(defs).forEach(id => _railCard(items, id, defs[id], 'wall'));
      } else if (activeCat === 'trap') {
        const defs = WG.RaidDefenses.TRAP_TYPES;
        Object.keys(defs).forEach(id => _railCard(items, id, defs[id], 'trap'));
        // Coming soon stubs
        WG.RaidDefenses.TRAPS_COMING_SOON.forEach(t => _railCardComingSoon(items, t));
      } else {
        const defs = WG.RaidDefenses.TURRET_TYPES;
        Object.keys(defs).forEach(id => _railCard(items, id, defs[id], 'turret'));
      }
      rail.appendChild(items);
    }

    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.textContent = SLOT_LABEL[cat];
      btn.style.cssText = 'flex:1;padding:6px;border-radius:7px;font-size:10px;font-weight:700;letter-spacing:1px;cursor:pointer;border:1.5px solid ' + (cat === activeCat ? SLOT_COLOR[cat] : '#2a1a38') + ';background:' + (cat === activeCat ? SLOT_COLOR[cat] + '33' : 'transparent') + ';color:' + (cat === activeCat ? SLOT_COLOR[cat] : '#7a6888') + ';transition:all 120ms;';
      btn.addEventListener('click', () => {
        activeCat = cat;
        catTabs.querySelectorAll('button').forEach((b, bi) => {
          const c = categories[bi];
          b.style.border = '1.5px solid ' + (c === cat ? SLOT_COLOR[c] : '#2a1a38');
          b.style.background = c === cat ? SLOT_COLOR[c] + '33' : 'transparent';
          b.style.color = c === cat ? SLOT_COLOR[c] : '#7a6888';
        });
        buildRail();
      });
      catTabs.appendChild(btn);
    });
    rail.appendChild(catTabs);
    buildRail();
    overlay.appendChild(rail);

    // Initial render after layout in DOM
    requestAnimationFrame(() => { renderSlots(); });

    // Saved layout picker
    const savedRow = document.createElement('div');
    savedRow.style.cssText = 'display:flex;gap:6px;padding:0 10px 8px;flex-shrink:0;';
    _buildSavedRow(savedRow, renderSlots);
    overlay.insertBefore(savedRow, mapWrap);

    WG.Engine.on('raid:layout-changed', () => renderSlots());
  }

  // ── DRAG & DROP HELPERS ───────────────────────────────────────────────────
  let _dragId   = null;
  let _dragType = null;

  function _railCard(parent, id, def, slotType) {
    const card = document.createElement('div');
    card.style.cssText = 'flex-shrink:0;width:56px;padding:7px 4px;border-radius:8px;border:1.5px solid ' + SLOT_COLOR[slotType] + '66;background:' + SLOT_COLOR[slotType] + '22;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:grab;user-select:none;transition:transform 80ms;';
    card.innerHTML = '<span style="font-size:22px;">' + def.icon + '</span><span style="font-size:10px;color:#c0b0d8;letter-spacing:0.5px;text-align:center;line-height:1.2;">' + def.name.split(' ')[0] + '</span>';
    card.draggable = true;
    card.addEventListener('dragstart', function(e) {
      _dragId = id; _dragType = slotType;
      e.dataTransfer.effectAllowed = 'copy';
    });
    card.addEventListener('pointerdown', () => { _dragId = id; _dragType = slotType; });
    card.addEventListener('click', function() {
      // On mobile tap: set dragId, then user taps a slot
      _dragId = id; _dragType = slotType;
      card.style.boxShadow = '0 0 0 2px ' + SLOT_COLOR[slotType];
      setTimeout(() => { card.style.boxShadow = ''; }, 800);
    });
    parent.appendChild(card);
  }

  function _railCardComingSoon(parent, trap) {
    const card = document.createElement('div');
    card.style.cssText = 'flex-shrink:0;width:56px;padding:7px 4px;border-radius:8px;border:1.5px dashed #3a2840;background:#140c1c;display:flex;flex-direction:column;align-items:center;gap:3px;opacity:0.45;pointer-events:none;';
    card.innerHTML = '<span style="font-size:22px;">' + trap.icon + '</span><span style="font-size:11px;color:#7a6888;letter-spacing:0.5px;text-align:center;">SOON</span>';
    parent.appendChild(card);
  }

  function _onDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }

  function _onDrop(e, slotIdx, rerender) {
    e.preventDefault();
    if (!_dragId) return;
    const slotType = WG.RaidLayout.SLOT_CONFIG[slotIdx].type;
    if (_dragType !== slotType) return; // wrong type for this slot
    const typeIdx = slotIdx < 6 ? slotIdx : slotIdx < 10 ? slotIdx - 6 : slotIdx - 10;
    WG.RaidLayout.place(_dragType, typeIdx, _dragId);
    _dragId = null; _dragType = null;
    rerender();
  }

  function _onSlotClick(slotIdx, rerender) {
    const slotType = WG.RaidLayout.SLOT_CONFIG[slotIdx].type;
    if (_dragId && _dragType === slotType) {
      const typeIdx = slotIdx < 6 ? slotIdx : slotIdx < 10 ? slotIdx - 6 : slotIdx - 10;
      WG.RaidLayout.place(_dragType, typeIdx, _dragId);
      _dragId = null; _dragType = null;
      rerender();
    } else if (!_dragId) {
      // Clear slot on tap-while-empty-drag
      WG.RaidLayout.clear(slotIdx);
      rerender();
    }
  }

  // ── SAVE DIALOG ───────────────────────────────────────────────────────────
  function _saveDialog(parent) {
    const existing = parent.querySelector('#wg-layout-save-dialog');
    if (existing) { existing.remove(); return; }
    const dialog = document.createElement('div');
    dialog.id = 'wg-layout-save-dialog';
    dialog.style.cssText = 'position:absolute;bottom:80px;left:50%;transform:translateX(-50%);background:#140c20;border:1.5px solid #5a3878;border-radius:10px;padding:12px 16px;z-index:10;width:240px;';
    dialog.innerHTML = '<div style="font-size:11px;color:#c0a0e0;font-weight:700;letter-spacing:1px;margin-bottom:8px;">SAVE LAYOUT AS</div>';
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 20;
    input.placeholder = 'Layout name…';
    input.style.cssText = 'width:100%;box-sizing:border-box;padding:7px 9px;border-radius:7px;border:1.5px solid #5a3878;background:#0a0614;color:#e0d0f0;font-size:12px;margin-bottom:8px;outline:none;';
    const rs = WG.State.get().raid || {};
    if (rs.savedLayouts && rs.savedLayouts.length) {
      const existing2 = document.createElement('div');
      existing2.style.cssText = 'margin-bottom:8px;';
      rs.savedLayouts.forEach(l => {
        const row = document.createElement('button');
        row.style.cssText = 'width:100%;text-align:left;padding:5px 8px;border-radius:6px;border:1px solid #3a2050;background:#180c28;color:#b090d0;font-size:11px;cursor:pointer;margin-bottom:4px;';
        row.textContent = l.name;
        row.addEventListener('click', () => {
          const res = WG.RaidLayout.save(l.name);
          dialog.remove();
          if (res.ok) _flash(parent, '#a8d878', 'Saved!');
        });
        existing2.appendChild(row);
      });
      dialog.appendChild(existing2);
    }
    dialog.appendChild(input);
    const saveBtn = _mkBtn('SAVE', '#205020', '#80d080');
    saveBtn.style.width = '100%';
    saveBtn.addEventListener('click', () => {
      const name = input.value.trim() || ('Layout ' + ((rs.savedLayouts || []).length + 1));
      const res = WG.RaidLayout.save(name);
      dialog.remove();
      if (res.ok) _flash(parent, '#a8d878', 'Saved: ' + name);
      else _flash(parent, '#e06060', 'Max layouts reached (' + res.max + ')');
    });
    dialog.appendChild(saveBtn);
    parent.appendChild(dialog);
    input.focus();
  }

  function _buildSavedRow(container, rerender) {
    const rs = WG.State.get().raid;
    if (!rs || !rs.savedLayouts || !rs.savedLayouts.length) return;
    const lbl = document.createElement('span');
    lbl.style.cssText = 'font-size:9px;color:#7a6888;letter-spacing:1px;margin-right:4px;align-self:center;';
    lbl.textContent = 'LAYOUTS:';
    container.appendChild(lbl);
    rs.savedLayouts.forEach(l => {
      const btn = _mkBtn(l.name, '#1a1028', '#c0a0e0');
      btn.addEventListener('click', () => { WG.RaidLayout.load(l.name); rerender(); });
      container.appendChild(btn);
    });
  }

  // ── UTILS ─────────────────────────────────────────────────────────────────
  function _mkBtn(label, bg, color) {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'padding:6px 11px;border-radius:7px;border:1.5px solid ' + color + '55;background:' + bg + ';color:' + color + ';font-size:10px;font-weight:700;letter-spacing:1px;cursor:pointer;white-space:nowrap;';
    b.addEventListener('pointerdown', () => { b.style.opacity = '0.7'; });
    b.addEventListener('pointerup',   () => { b.style.opacity = '1'; });
    b.addEventListener('pointerleave',() => { b.style.opacity = '1'; });
    return b;
  }

  function _flash(parent, color, msg) {
    const toast = document.createElement('div');
    toast.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.85);border:1.5px solid ' + color + ';color:' + color + ';padding:10px 18px;border-radius:10px;font-size:13px;font-weight:700;letter-spacing:1px;z-index:20;pointer-events:none;transition:opacity 400ms;';
    toast.textContent = msg;
    parent.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 420); }, 1200);
  }

  window.WG = window.WG || {};
  window.WG.RaidLayoutRender = { open };
})();
