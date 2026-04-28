// WG.RelicsCollection — owned-relic state aggregation
(function(){'use strict';
  function ownedList() {
    const owned = WG.State.get().relics.owned;
    const list = [];
    for (const id in owned) {
      const r = WG.RelicsCatalog.byId(id);
      if (!r) continue;
      list.push({ ...r, count: owned[id].count, level: owned[id].level });
    }
    return list;
  }
  function isOwned(id) { return !!WG.State.get().relics.owned[id]; }
  function aggregateBonus() {
    // Sum stat bonuses from EQUIPPED relics (max 6)
    const eq = WG.State.get().relics.equipped;
    const totals = { attack: 0, hpMax: 0, defense: 0, critRate: 0, gatherRate: 0 };
    for (const id of eq) {
      const r = WG.RelicsCatalog.byId(id);
      if (!r) continue;
      const owned = WG.State.get().relics.owned[id];
      const lvl = (owned && owned.level) || 1;
      totals[r.stat] = (totals[r.stat] || 0) + r.value * lvl;
    }
    return totals;
  }
  function init() {}
  window.WG.RelicsCollection = { init, ownedList, isOwned, aggregateBonus };
})();
