// WG.RelicsEquip — equip / unequip relics (max 6 active)
(function(){'use strict';
  const MAX_EQUIPPED = 6;
  function isEquipped(id) { return WG.State.get().relics.equipped.includes(id); }
  function tryEquip(id) {
    const s = WG.State.get();
    if (!s.relics.owned[id]) return { ok: false, reason: 'not-owned' };
    const r = WG.RelicsCatalog.byId(id);
    if (r && r.equippable === false) return { ok: false, reason: 'not-equippable' };
    if (s.relics.equipped.includes(id)) return { ok: false, reason: 'already-equipped' };
    if (s.relics.equipped.length >= MAX_EQUIPPED) return { ok: false, reason: 'max-equipped' };
    s.relics.equipped.push(id);
    applyAggregateToStats();
    WG.Engine.emit('relic:equipped', { id });
    return { ok: true };
  }
  function tryUnequip(id) {
    const s = WG.State.get();
    const i = s.relics.equipped.indexOf(id);
    if (i < 0) return { ok: false, reason: 'not-equipped' };
    s.relics.equipped.splice(i, 1);
    applyAggregateToStats();
    WG.Engine.emit('relic:unequipped', { id });
    return { ok: true };
  }
  // Re-apply equipped relic bonuses to player stats (additive layer)
  function applyAggregateToStats() {
    const s = WG.State.get();
    const totals = WG.RelicsCollection.aggregateBonus();
    s.player.stats._relicBonus = totals;
  }
  function init() {
    applyAggregateToStats();
  }
  window.WG.RelicsEquip = { init, isEquipped, tryEquip, tryUnequip, MAX_EQUIPPED };
})();
