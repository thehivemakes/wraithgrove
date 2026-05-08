// WG.AscendCharacter — character level + ascension tier
(function(){'use strict';
  const TIERS = ['Mortal', 'Initiate', 'Apprentice', 'Adept', 'Master', 'Sage', 'Immortal'];
  const TIER_THRESHOLDS = [0, 30, 30, 30, 30, 30, 30];   // each tier requires reaching level 30 from base of tier

  function tierName(idx) { return TIERS[Math.max(0, Math.min(TIERS.length - 1, idx))]; }

  function levelUpCost(level) { return Math.floor(80 + level * level * 4); }
  function ascendCost(tier) { return 5000 * Math.pow(2, tier); }

  function tryLevelUp() {
    const ps = WG.State.get().player;
    if (ps.level >= 30) return { ok: false, reason: 'tier-cap' };
    const cost = levelUpCost(ps.level);
    if (!WG.State.spend('coins', cost)) return { ok: false, reason: 'insufficient-coins', cost };
    ps.level++;
    ps.stats.attack = Math.floor(5 + ps.level * 1.6 + ps.ascendTier * 12);
    ps.stats.hpMax  = Math.floor(100 + ps.level * 8 + ps.ascendTier * 60);
    ps.stats.hp     = ps.stats.hpMax;
    WG.Engine.emit('player:level', { level: ps.level });
    return { ok: true, level: ps.level, cost };
  }

  function tryAscend() {
    const ps = WG.State.get().player;
    if (ps.level < 30) return { ok: false, reason: 'level-floor' };
    if (ps.ascendTier >= TIERS.length - 1) return { ok: false, reason: 'max-tier' };
    const cost = ascendCost(ps.ascendTier);
    if (!WG.State.spend('coins', cost)) return { ok: false, reason: 'insufficient-coins', cost };
    ps.ascendTier++;
    ps.level = 1;
    ps.stats.attack = Math.floor(5 + 1 * 1.6 + ps.ascendTier * 12);
    ps.stats.hpMax  = Math.floor(100 + 1 * 8 + ps.ascendTier * 60);
    ps.stats.hp     = ps.stats.hpMax;
    WG.Engine.emit('player:ascend', { tier: ps.ascendTier });
    return { ok: true, tier: ps.ascendTier, cost };
  }

  function tryCultivate() {
    // Cultivate: alternate progression that consumes diamonds for stat gains without leveling
    const cost = 5;
    if (!WG.State.spend('diamonds', cost)) return { ok: false, reason: 'insufficient-diamonds' };
    const ps = WG.State.get().player;
    ps.stats.attack += 2;
    ps.stats.hpMax  += 8;
    ps.stats.hp = Math.min(ps.stats.hpMax, ps.stats.hp + 8);
    WG.Engine.emit('player:cultivate', { stats: ps.stats });
    return { ok: true };
  }

  function init() {}
  window.WG.AscendCharacter = { init, tierName, levelUpCost, ascendCost, tryLevelUp, tryAscend, tryCultivate, TIERS };
})();
