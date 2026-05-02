// WG.ForgeBuildings — 8-slot building grid with idle generators
//
// Tunables (Architect-edit here, not in render code):
//   DEFS[*].unlockGS      — Power threshold below which the slot is locked.
//                           Reaching the GS does NOT auto-unlock; the player
//                           still pays the unlockCost (or bypasses with
//                           DIAMOND_BYPASS / Watch Ad).
//   DEFS[*].unlockCost    — Coin/diamond/card cost to unlock once GS is met.
//   DIAMOND_BYPASS_COST   — Skip-the-GS-gate cost (200💎 per slot, faithful
//                           to scr_02 monetization).
//   AD_REWARD_AVAILABLE   — Watch-Ad-to-Unlock toggle (gates whether the
//                           button appears in the locked-slot modal).
(function(){'use strict';

  const DIAMOND_BYPASS_COST = 200;
  const AD_REWARD_AVAILABLE = true;

  const DEFS = {
    cave:     { name:'Cave',     icon:'⛰', desc:'Idle coin trickle',     unlockGS:0,     unlockCost:{coins:0},     baseGen:0.6 },
    forge:    { name:'Forge',    icon:'🔨', desc:'Craft relics',          unlockGS:0,     unlockCost:{coins:0},     baseGen:0   },
    campfire: { name:'Campfire', icon:'🔥', desc:'+ HP regen in Hunt',    unlockGS:0,     unlockCost:{coins:0},     baseGen:0   },
    fence:    { name:'Fence',    icon:'🪵', desc:'+ defense bonus',        unlockGS:500,   unlockCost:{coins:1500},  baseGen:0   },
    cannon:   { name:'Cannon',   icon:'🎯', desc:'unlock ranged tier 2',   unlockGS:1500,  unlockCost:{coins:6000, diamonds:30}, baseGen:0 },
    blade:    { name:'Anvil',    icon:'🗡', desc:'unlock melee tier 2',    unlockGS:3000,  unlockCost:{coins:8000},  baseGen:0   },
    bow:      { name:'Range',    icon:'🏹', desc:'unlock ranged tier 3',   unlockGS:6000,  unlockCost:{coins:12000, diamonds:60}, baseGen:0 },
    sawtrap:  { name:'Trap',     icon:'⚙', desc:'+ crit bonus',           unlockGS:10000, unlockCost:{coins:15000}, baseGen:0   },
  };

  function get(id) { return DEFS[id]; }
  function genRate(b) {
    const def = DEFS[b.id]; if (!def) return 0;
    return def.baseGen * b.level;
  }
  function upgradeCost(b) { return Math.floor(50 + b.level * b.level * 30); }
  function gsMet(id) {
    const def = DEFS[id]; if (!def) return false;
    return WG.State.recomputePower() >= (def.unlockGS || 0);
  }

  function tryUpgrade(id) {
    const s = WG.State.get();
    const b = s.forge.buildings.find(x => x.id === id);
    if (!b) return { ok: false, reason: 'unknown' };
    if (!b.unlocked) return { ok: false, reason: 'locked' };
    if (b.level >= 10) return { ok: false, reason: 'max' };
    const cost = upgradeCost(b);
    if (!WG.State.spend('coins', cost)) return { ok: false, reason: 'insufficient', cost };
    b.level++;
    WG.Engine.emit('forge:upgrade', { id, level: b.level });
    return { ok: true, level: b.level };
  }

  // Standard unlock path — pays unlockCost, but only if GS gate is met.
  function tryUnlock(id) {
    const s = WG.State.get();
    const b = s.forge.buildings.find(x => x.id === id);
    if (!b) return { ok: false, reason: 'unknown' };
    if (b.unlocked) return { ok: false, reason: 'already' };
    if (!gsMet(id)) return { ok: false, reason: 'gs-gate' };
    const def = DEFS[id];
    const cost = def.unlockCost || {};
    for (const c in cost) if (s.currencies[c] < cost[c]) return { ok: false, reason: 'insufficient-' + c };
    for (const c in cost) WG.State.spend(c, cost[c]);
    b.unlocked = true; b.level = 1;
    WG.Engine.emit('forge:unlock', { id, via: 'standard' });
    return { ok: true };
  }

  // Diamond bypass — skips both the GS gate and the resource cost.
  function tryUnlockByDiamonds(id) {
    const s = WG.State.get();
    const b = s.forge.buildings.find(x => x.id === id);
    if (!b) return { ok: false, reason: 'unknown' };
    if (b.unlocked) return { ok: false, reason: 'already' };
    if (s.currencies.diamonds < DIAMOND_BYPASS_COST) {
      return { ok: false, reason: 'insufficient-diamonds', cost: DIAMOND_BYPASS_COST };
    }
    WG.State.spend('diamonds', DIAMOND_BYPASS_COST);
    b.unlocked = true; b.level = 1;
    WG.Engine.emit('forge:unlock', { id, via: 'diamonds' });
    return { ok: true };
  }

  // Ad bypass — async; resolves true if the rewarded video completed.
  async function tryUnlockByAd(id) {
    if (!AD_REWARD_AVAILABLE) return { ok: false, reason: 'ad-disabled' };
    const s = WG.State.get();
    const b = s.forge.buildings.find(x => x.id === id);
    if (!b) return { ok: false, reason: 'unknown' };
    if (b.unlocked) return { ok: false, reason: 'already' };
    if (!WG.Ads || typeof WG.Ads.showRewardedVideo !== 'function') {
      return { ok: false, reason: 'no-ad-sdk' };
    }
    const r = await WG.Ads.showRewardedVideo({ reward: 'unlock-' + id });
    if (!r || !r.ok) return { ok: false, reason: r && r.reason || 'ad-skipped' };
    b.unlocked = true; b.level = 1;
    WG.Engine.emit('forge:unlock', { id, via: 'ad' });
    return { ok: true };
  }

  // Idle income tick — call every frame.
  let accum = 0;
  function tickIdle(dt) {
    accum += dt;
    if (accum < 1) return;     // grant once per second
    let coinGain = 0;
    for (const b of WG.State.get().forge.buildings) {
      if (!b.unlocked) continue;
      coinGain += genRate(b);
    }
    coinGain += WG.State.get().player.stats.gatherRate * 4;
    if (coinGain > 0) WG.State.grant('coins', Math.floor(coinGain * accum));
    accum = 0;
  }

  function init() {
    WG.Engine.on('tick', ({ dt }) => tickIdle(dt));
  }

  window.WG.ForgeBuildings = {
    init, get, DEFS, DIAMOND_BYPASS_COST, AD_REWARD_AVAILABLE,
    tryUpgrade, tryUnlock, tryUnlockByDiamonds, tryUnlockByAd,
    upgradeCost, genRate, gsMet,
  };
})();
