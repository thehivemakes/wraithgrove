// WG.RaidLayout — 14-slot defense layout editor (logic layer)
// Slots: indices 0-5 = wall, 6-9 = trap, 10-13 = turret
// Map: 50% larger than Hunt stage (720×1100) → 1080×1650
(function(){'use strict';

  // Slot config: type + normalized position on the raid map
  const SLOT_CONFIG = Object.freeze([
    { idx: 0,  type: 'wall',   nx: 0.20, ny: 0.28 },
    { idx: 1,  type: 'wall',   nx: 0.50, ny: 0.14 },
    { idx: 2,  type: 'wall',   nx: 0.80, ny: 0.28 },
    { idx: 3,  type: 'wall',   nx: 0.12, ny: 0.58 },
    { idx: 4,  type: 'wall',   nx: 0.88, ny: 0.58 },
    { idx: 5,  type: 'wall',   nx: 0.50, ny: 0.86 },
    { idx: 6,  type: 'trap',   nx: 0.30, ny: 0.38 },
    { idx: 7,  type: 'trap',   nx: 0.70, ny: 0.38 },
    { idx: 8,  type: 'trap',   nx: 0.22, ny: 0.68 },
    { idx: 9,  type: 'trap',   nx: 0.78, ny: 0.68 },
    { idx: 10, type: 'turret', nx: 0.50, ny: 0.24 },
    { idx: 11, type: 'turret', nx: 0.22, ny: 0.50 },
    { idx: 12, type: 'turret', nx: 0.78, ny: 0.50 },
    { idx: 13, type: 'turret', nx: 0.50, ny: 0.76 },
  ]);

  const MAP_W = 1080;
  const MAP_H = 1650;
  const MAX_LAYOUTS_F2P  = 3;
  const MAX_LAYOUTS_WHALE = 5;

  // ── STATE HELPERS ──────────────────────────────────────────────────────────
  function _raidState() {
    const s = WG.State.get();
    if (!s.raid) s.raid = WG.State.initRaidState();
    return s.raid;
  }

  // Simple hash of a slot array for deterministic seeding
  function hashLayout(slots) {
    let h = 0;
    for (let i = 0; i < slots.length; i++) {
      const entry = slots[i];
      const str = entry ? (entry.defenseId || '') + (entry.type || '') : 'empty';
      for (let j = 0; j < str.length; j++) {
        h = (h * 31 + str.charCodeAt(j)) >>> 0;
      }
    }
    return h;
  }

  // ── PLACEMENT API ──────────────────────────────────────────────────────────

  // place(slotType, slotIndex, defenseId)
  // slotType: 'wall' | 'trap' | 'turret'
  // slotIndex: 0-based within type (wall 0-5, trap 0-3, turret 0-3)
  // defenseId: key from RaidDefenses catalog or null to clear
  function place(slotType, slotIndex, defenseId) {
    const rs = _raidState();
    const globalIdx = _typeToGlobal(slotType, slotIndex);
    if (globalIdx < 0) return { ok: false, reason: 'invalid-slot' };

    // Validate defenseId matches slotType
    if (defenseId) {
      if (slotType === 'turret' && !WG.RaidDefenses.getTurret(defenseId))
        return { ok: false, reason: 'invalid-defense-id' };
      if (slotType === 'trap' && !WG.RaidDefenses.getTrap(defenseId))
        return { ok: false, reason: 'invalid-defense-id' };
      if (slotType === 'wall' && !WG.RaidDefenses.getWall(defenseId))
        return { ok: false, reason: 'invalid-defense-id' };
    }

    const prev = rs.activeLayout.slots[globalIdx] || null;
    rs.layoutHistory.push({ idx: globalIdx, prev });
    if (rs.layoutHistory.length > 50) rs.layoutHistory.shift();

    rs.activeLayout.slots[globalIdx] = defenseId
      ? { type: slotType, defenseId }
      : null;

    WG.Engine.emit('raid:layout-changed', { slotIdx: globalIdx, defenseId });
    return { ok: true };
  }

  function clear(slotIndex) {
    const rs = _raidState();
    if (slotIndex < 0 || slotIndex >= SLOT_CONFIG.length) return { ok: false, reason: 'oob' };
    const prev = rs.activeLayout.slots[slotIndex] || null;
    rs.layoutHistory.push({ idx: slotIndex, prev });
    rs.activeLayout.slots[slotIndex] = null;
    WG.Engine.emit('raid:layout-changed', { slotIdx: slotIndex, defenseId: null });
    return { ok: true };
  }

  // autoDeploy — fill all slots from available stocks, best units first
  function autoDeploy() {
    const rs   = _raidState();
    const f    = WG.State.get().forge;
    const hist = [];

    // Snapshot history entry for full undo
    for (let i = 0; i < SLOT_CONFIG.length; i++) hist.push({ idx: i, prev: rs.activeLayout.slots[i] || null });
    rs.layoutHistory.push({ batch: hist });

    // Walls from wall_workshop stocks
    const walls = (f.stocks.walls || []).slice();
    let wallUsed = 0;
    for (let i = 0; i < 6 && wallUsed < walls.length; i++, wallUsed++) {
      rs.activeLayout.slots[i] = { type: 'wall', defenseId: walls[wallUsed].variant || 'basic' };
    }

    // Traps from trap_stocks
    const traps = (f.stocks.trap_stocks || []).slice();
    let trapUsed = 0;
    for (let i = 6; i < 10 && trapUsed < traps.length; i++, trapUsed++) {
      rs.activeLayout.slots[i] = { type: 'trap', defenseId: traps[trapUsed] };
    }

    // Turrets — prefer cannon > mortar > ward > archer order
    const turretOrder = ['cannon', 'mortar', 'ward', 'archer'];
    const cannons   = (f.stocks.cannon_shots || []).length;
    const archers   = f.stocks.archer_squads || 0;
    let   turrSlot  = 10;
    let   canUse    = cannons;
    let   arcUse    = archers;

    for (const tId of turretOrder) {
      if (turrSlot >= 14) break;
      const def = WG.RaidDefenses.getTurret(tId);
      if (!def) continue;
      if (def.category === 'cannon_battery' && canUse > 0) {
        rs.activeLayout.slots[turrSlot++] = { type: 'turret', defenseId: tId };
        canUse--;
      } else if (def.category === 'bow_range' && arcUse > 0) {
        rs.activeLayout.slots[turrSlot++] = { type: 'turret', defenseId: tId };
        arcUse--;
      }
    }

    WG.Engine.emit('raid:layout-auto-deployed', {});
    return { ok: true };
  }

  function undoLast() {
    const rs = _raidState();
    const entry = rs.layoutHistory.pop();
    if (!entry) return { ok: false, reason: 'empty' };
    if (entry.batch) {
      for (const h of entry.batch) rs.activeLayout.slots[h.idx] = h.prev;
    } else {
      rs.activeLayout.slots[entry.idx] = entry.prev;
    }
    WG.Engine.emit('raid:layout-changed', {});
    return { ok: true };
  }

  function undoAll() {
    const rs = _raidState();
    if (!rs.layoutHistory.length) return { ok: false, reason: 'empty' };
    // Replay history in reverse to get original state
    while (rs.layoutHistory.length) {
      const entry = rs.layoutHistory.pop();
      if (entry.batch) {
        for (const h of entry.batch) rs.activeLayout.slots[h.idx] = h.prev;
      } else {
        rs.activeLayout.slots[entry.idx] = entry.prev;
      }
    }
    WG.Engine.emit('raid:layout-changed', {});
    return { ok: true };
  }

  function save(name) {
    const rs  = _raidState();
    const max = WG.State.isWhale && WG.State.isWhale() ? MAX_LAYOUTS_WHALE : MAX_LAYOUTS_F2P;
    const existing = rs.savedLayouts.findIndex(l => l.name === name);
    if (existing >= 0) {
      rs.savedLayouts[existing] = { name, slots: rs.activeLayout.slots.slice() };
      WG.Engine.emit('raid:layout-saved', { name });
      return { ok: true, overwrite: true };
    }
    if (rs.savedLayouts.length >= max) return { ok: false, reason: 'max-layouts', max };
    rs.savedLayouts.push({ name, slots: rs.activeLayout.slots.slice() });
    WG.Engine.emit('raid:layout-saved', { name });
    return { ok: true };
  }

  function load(name) {
    const rs = _raidState();
    const layout = rs.savedLayouts.find(l => l.name === name);
    if (!layout) return { ok: false, reason: 'not-found' };
    rs.layoutHistory = [];
    rs.activeLayout.slots = layout.slots.slice();
    WG.Engine.emit('raid:layout-changed', {});
    return { ok: true };
  }

  function getLayout() {
    return _raidState().activeLayout;
  }

  function getLayoutHash() {
    return hashLayout(_raidState().activeLayout.slots);
  }

  // ── INTERNAL ───────────────────────────────────────────────────────────────
  function _typeToGlobal(slotType, slotIndex) {
    if (slotType === 'wall'   && slotIndex >= 0 && slotIndex < 6)  return slotIndex;
    if (slotType === 'trap'   && slotIndex >= 0 && slotIndex < 4)  return 6  + slotIndex;
    if (slotType === 'turret' && slotIndex >= 0 && slotIndex < 4)  return 10 + slotIndex;
    return -1;
  }

  window.WG = window.WG || {};
  window.WG.RaidLayout = {
    SLOT_CONFIG, MAP_W, MAP_H,
    place, clear, autoDeploy,
    undoLast, undoAll,
    save, load,
    getLayout, getLayoutHash, hashLayout,
  };
})();
