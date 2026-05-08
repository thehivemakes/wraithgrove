// WG.Gacha — unified gacha system: standard pool (open) + rift_guests pool (LOCKED).
// W-Monetization-V2-Whale-Ladder §C
//
// rift_guests catalog is intentionally empty — Ysabel reveal held until KingshotPro
// launches to real users (per HORROR_DIRECTION_v1.md §3 timing constraint). The pool
// definition ships now so the UI can display it as LOCKED; catalog stays empty.
//
// Standard pool rates and pity counters are disclosed in-UI via getRates() / getPityDisplay()
// to satisfy JP/CN/KR/EU gacha disclosure requirements and App Store enforcement.
//
// Architecture:
//   - pull(poolId, count) → deducts currency, rolls with pity, grants relics to owned.
//   - pullTiered(poolId, tier) → forced-tier pull for bundle grants (no currency cost).
//   - Pity counters live in WG.State.get().gacha.pity — persisted to localStorage.
//   - Standard pool catalog = all relics from RelicsCatalog (minus 'epic' — that's forge only).
//   - rift_guests pool catalog = [] until unlocked.
(function(){'use strict';

  const GACHA_POOLS = {
    standard: {
      name: 'Standard Pool',
      description: 'Relics from the depths of Unlimited Chaos.',
      icon: '🔮',
      cost: { currency: 'gems', amount: 30 },
      multiCost: { currency: 'gems', amount: 270 },  // 10-pull = 10% discount
      rates: { common: 0.65, rare: 0.25, legendary: 0.09, mythic: 0.01 },
      pity: { mythic: 100, legendary: 30 },
      catalog: null,   // null = delegate to RelicsCatalog; no 'epic' tier (forge-only)
      locked: false,
    },
    rift_guests: {
      name: 'Rift Guests',
      description: 'Characters pulled across the veil. The boundary holds.',
      icon: '🌀',
      cost: { currency: 'riftSigils', amount: 1 },
      multiCost: { currency: 'riftSigils', amount: 10 },
      rates: { legendary: 0.20, mythic: 0.10 },
      pity: { mythic: 50, legendary: 20 },
      catalog: [],    // EMPTY — DO NOT REVEAL YSABEL until KingshotPro launch
      locked: true,
      lockMessage: 'The boundary intact. Guests arrive when ready.',
    },
  };

  // ─── Tier roll with pity ──────────────────────────────────────────────────

  // Map 4-tier gacha result to 5-tier relic catalog (epic is forge-only).
  const GACHA_TO_RELIC_TIER = { mythic: 'mythic', legendary: 'legendary', rare: 'rare', common: 'common' };

  function _rollTier(pool, poolId) {
    const pity = WG.State.get().gacha.pity;
    const mk = poolId + '_mythic';
    const lk = poolId + '_legendary';

    // Pity override: guaranteed mythic / legendary at threshold
    if (pity[mk] !== undefined && pity[mk] >= pool.pity.mythic) return 'mythic';
    if (pity[lk] !== undefined && pity[lk] >= pool.pity.legendary) return 'legendary';

    // Weighted random draw (iterate from rarest down)
    const r = Math.random();
    let acc = 0;
    for (const t of ['mythic', 'legendary', 'rare', 'common']) {
      acc += pool.rates[t] || 0;
      if (r < acc) return t;
    }
    return 'common';
  }

  function _advancePity(tier, poolId) {
    const pity = WG.State.get().gacha.pity;
    const mk = poolId + '_mythic';
    const lk = poolId + '_legendary';
    if (!(mk in pity)) return; // pool doesn't track pity (rift_guests gets own counters if catalog opens)
    if (tier === 'mythic') {
      pity[mk] = 0;
      pity[lk] = 0;
    } else if (tier === 'legendary') {
      pity[lk] = 0;
      pity[mk] = (pity[mk] || 0) + 1;
    } else {
      pity[mk] = (pity[mk] || 0) + 1;
      pity[lk] = (pity[lk] || 0) + 1;
    }
  }

  function _grantItem(tier, pool) {
    let relic = null;
    if (pool.catalog && pool.catalog.length > 0) {
      const available = pool.catalog.filter(c => c.tier === tier);
      if (available.length) relic = available[Math.floor(Math.random() * available.length)];
    } else if (WG.RelicsCatalog) {
      const relicTier = GACHA_TO_RELIC_TIER[tier] || 'common';
      const available = WG.RelicsCatalog.byTier(relicTier) || [];
      if (available.length) relic = available[Math.floor(Math.random() * available.length)];
    }
    if (relic && relic.id) {
      const owned = WG.State.get().relics.owned;
      const entry = owned[relic.id] || (owned[relic.id] = { count: 0, level: 1 });
      entry.count++;
      // Upgrade path mirrors forge-craft: 2 dupes → lv2, +4 → lv3
      if (entry.count >= 2 && entry.level === 1) { entry.count -= 2; entry.level = 2; }
      else if (entry.count >= 4 && entry.level === 2) { entry.count -= 4; entry.level = 3; }
      WG.Engine.emit('relics:gained', { id: relic.id, source: 'gacha', tier });
    }
    return relic;
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  function getPool(poolId) { return GACHA_POOLS[poolId] || null; }

  // Returns rate + pity info for legal disclosure in summon modal.
  function getRates(poolId) {
    const pool = getPool(poolId);
    if (!pool) return null;
    return {
      name: pool.name,
      rates: Object.assign({}, pool.rates),
      pity: Object.assign({}, pool.pity),
      locked: !!pool.locked,
      lockMessage: pool.lockMessage || '',
    };
  }

  // "Mythic guaranteed in N pulls" label for UI.
  function getPityDisplay(poolId) {
    const pool = getPool(poolId);
    if (!pool || pool.locked) return '';
    const pity = WG.State.get().gacha.pity;
    const mk = poolId + '_mythic';
    const lk = poolId + '_legendary';
    const toMythic = pool.pity.mythic - (pity[mk] || 0);
    const toLegendary = pool.pity.legendary - (pity[lk] || 0);
    return 'Mythic guaranteed in ' + toMythic + ' pulls · Legendary in ' + toLegendary;
  }

  // Main pull: deducts currency, respects pity, grants relics.
  function pull(poolId, count) {
    count = (count === 10) ? 10 : 1;
    const pool = getPool(poolId);
    if (!pool) return { ok: false, reason: 'unknown pool' };
    if (pool.locked) return { ok: false, reason: 'locked', lockMessage: pool.lockMessage };

    // Cost deduction
    const costDef = count === 10 ? pool.multiCost : pool.cost;
    const cur = costDef.currency;
    const amt = costDef.amount;
    if (cur === 'gems') {
      if (!WG.State.spend('gems', amt)) {
        return { ok: false, reason: 'insufficient gems', needed: amt, have: WG.State.get().currencies.gems };
      }
    } else if (cur === 'riftSigils') {
      const s = WG.State.get();
      if ((s.rift.sigils || 0) < amt) {
        return { ok: false, reason: 'insufficient sigils', needed: amt, have: s.rift.sigils };
      }
      s.rift.sigils -= amt;
    }

    const results = [];
    for (let i = 0; i < count; i++) {
      const tier = _rollTier(pool, poolId);
      _advancePity(tier, poolId);
      const item = _grantItem(tier, pool);
      results.push({ tier, item });
    }

    WG.Engine.emit('gacha:pull', { poolId, count, results });
    return { ok: true, results };
  }

  // Forced-tier pull used by bundle grants (no currency cost, no pity advance).
  function pullTiered(poolId, tier) {
    const pool = getPool(poolId);
    if (!pool || pool.locked) return null;
    const item = _grantItem(tier, pool);
    WG.Engine.emit('gacha:pull', { poolId, count: 1, results: [{ tier, item }] });
    return { tier, item };
  }

  function init() {
    // Ensure rift_guests pity keys exist for when catalog opens in the future
    WG.Engine.on('state:init', () => {
      const pity = WG.State.get().gacha.pity;
      if (!('standard_mythic' in pity))    pity.standard_mythic = 0;
      if (!('standard_legendary' in pity)) pity.standard_legendary = 0;
    });
  }

  window.WG.Gacha = { init, getPool, getRates, getPityDisplay, pull, pullTiered, GACHA_POOLS };
})();
