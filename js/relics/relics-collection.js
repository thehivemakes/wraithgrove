// WG.RelicsCollection — owned-relic state aggregation
// W-Monetization-V2-Sub-Blockers §B — daily free summon added.
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
  // Roll one relic (bypasses fragment cost) and add to owned collection.
  function rollOneRaw() {
    // Reuse ForgeCraft's roll machinery without consuming craftFragments.
    const table = WG.ForgeCraft ? WG.ForgeCraft.getDropTable() : { common:0.7, rare:0.22, epic:0.06, legendary:0.018, mythic:0.002 };
    const r = Math.random();
    let acc = 0;
    let tier = 'common';
    for (const t of ['common','rare','epic','legendary','mythic']) {
      acc += table[t] || 0;
      if (r < acc) { tier = t; break; }
    }
    const list = WG.RelicsCatalog ? WG.RelicsCatalog.byTier(tier) : [];
    if (!list.length) return null;
    const relic = list[Math.floor(Math.random() * list.length)];
    const s = WG.State.get();
    const owned = s.relics.owned[relic.id] || (s.relics.owned[relic.id] = { count: 0, level: 1 });
    owned.count++;
    if (owned.count >= 2 && owned.level === 1) { owned.count -= 2; owned.level = 2; }
    else if (owned.count >= 4 && owned.level === 2) { owned.count -= 4; owned.level = 3; }
    WG.Engine.emit('relics:gained', { id: relic.id });
    return relic;
  }

  function freeSummonAvailable() { return !WG.State.get().relics.freeSummonUsedToday; }

  function doFreeSummon() {
    const s = WG.State.get();
    if (s.relics.freeSummonUsedToday) return { ok: false, reason: 'already-used' };
    s.relics.freeSummonUsedToday = true;
    const relic = rollOneRaw();
    WG.Engine.emit('relics:free-summon', { relic });
    return { ok: true, relic };
  }

  function init() {
    WG.Engine.on('daily:reset', () => {
      WG.State.get().relics.freeSummonUsedToday = false;
      WG.Engine.emit('relics:summon-reset', {});
    });
  }
  window.WG.RelicsCollection = { init, ownedList, isOwned, aggregateBonus, freeSummonAvailable, doFreeSummon };
})();
