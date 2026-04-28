// WG.ForgeCraft — relic crafting with RNG-based outcomes
(function(){'use strict';
  // Drop tables for Craft x10 — depends on Forge level
  // Higher Forge level = better odds for higher rarities
  function getDropTable() {
    const fb = WG.State.get().forge.buildings.find(b => b.id === 'forge');
    const lvl = fb ? fb.level : 1;
    return {
      common:    Math.max(0.2, 0.65 - lvl * 0.025),
      rare:      0.25 + lvl * 0.012,
      epic:      0.08 + lvl * 0.008,
      legendary: 0.02 + lvl * 0.005,
      mythic:    0.0 + Math.max(0, (lvl - 5) * 0.002),
    };
  }

  function rollOne() {
    const t = getDropTable();
    const r = Math.random();
    let acc = 0;
    for (const tier of ['common','rare','epic','legendary','mythic']) {
      acc += t[tier];
      if (r < acc) return tier;
    }
    return 'common';
  }

  // Pick a random relic of the rolled tier
  function pickRelicOfTier(tier) {
    const list = WG.RelicsCatalog.byTier(tier);
    if (!list.length) return null;
    return list[Math.floor(Math.random() * list.length)];
  }

  function craftBatch(n) {
    const s = WG.State.get();
    if (s.forge.craftDailyUsed >= s.forge.craftDailyMax) return { ok: false, reason: 'daily-cap' };
    const cost = n * 3;
    if (s.forge.craftFragments < cost) return { ok: false, reason: 'insufficient-fragments', cost };
    s.forge.craftFragments -= cost;
    s.forge.craftDailyUsed++;
    const drops = [];
    for (let i = 0; i < n; i++) {
      const tier = rollOne();
      const relic = pickRelicOfTier(tier);
      if (!relic) continue;
      drops.push(relic);
      const owned = s.relics.owned[relic.id] || (s.relics.owned[relic.id] = { count: 0, level: 1 });
      owned.count++;
      // Auto-level if owned reaches threshold
      if (owned.count >= 2 && owned.level === 1) { owned.count -= 2; owned.level = 2; }
      else if (owned.count >= 4 && owned.level === 2) { owned.count -= 4; owned.level = 3; }
      WG.Engine.emit('relics:gained', { id: relic.id });
    }
    WG.Engine.emit('forge:craft-batch', { count: n, drops });
    return { ok: true, drops };
  }

  function probabilityInfo() {
    const t = getDropTable();
    return Object.entries(t).map(([k, v]) => ({ tier: k, pct: (v*100).toFixed(1) }));
  }

  function init() {}
  window.WG.ForgeCraft = { init, craftBatch, probabilityInfo, getDropTable };
})();
