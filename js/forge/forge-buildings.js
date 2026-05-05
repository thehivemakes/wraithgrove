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

  // W-Monetization-V2-Sub-Blockers §C — wood + stone resource tunables.
  const TUNABLES = Object.freeze({
    WOOD_CAP:          500,
    WOOD_REGEN_MS:     30000,   // 1 wood per 30 seconds
    STONE_CAP:         200,
    STONE_REGEN_MS:    60000,   // 1 stone per 60 seconds
    WOOD_REFILL_GEMS:  25,      // 25💎 → 200 wood
    WOOD_REFILL_AMT:   200,
    STONE_REFILL_GEMS: 25,      // 25💎 → 100 stone
    STONE_REFILL_AMT:  100,
  });

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

  // --- Wood + Stone offline regen ---

  function _processRegen(resource, regenKey, cap, regenMs, now) {
    const f = WG.State.get().forge;
    if (f[resource] >= cap) { f[regenKey] = now; return 0; }
    if (!f[regenKey]) { f[regenKey] = now; return 0; }
    const elapsed = now - f[regenKey];
    if (elapsed < regenMs) return 0;
    const granted = Math.floor(elapsed / regenMs);
    const before = f[resource];
    f[resource] = Math.min(cap, f[resource] + granted);
    f[regenKey] += granted * regenMs;
    if (f[resource] >= cap) f[regenKey] = now;
    const actual = f[resource] - before;
    if (actual > 0) WG.Engine.emit('forge:resources-change', { wood: f.wood, stone: f.stone });
    return actual;
  }

  function processResourceRegen(now) {
    now = now || Date.now();
    _processRegen('wood', 'woodLastRegenAt', TUNABLES.WOOD_CAP, TUNABLES.WOOD_REGEN_MS, now);
    _processRegen('stone', 'stoneLastRegenAt', TUNABLES.STONE_CAP, TUNABLES.STONE_REGEN_MS, now);
  }

  function nextWoodRegenMs(now) {
    now = now || Date.now();
    const f = WG.State.get().forge;
    if (f.wood >= TUNABLES.WOOD_CAP) return 0;
    if (!f.woodLastRegenAt) return TUNABLES.WOOD_REGEN_MS;
    return Math.max(0, TUNABLES.WOOD_REGEN_MS - (now - f.woodLastRegenAt));
  }
  function nextStoneRegenMs(now) {
    now = now || Date.now();
    const f = WG.State.get().forge;
    if (f.stone >= TUNABLES.STONE_CAP) return 0;
    if (!f.stoneLastRegenAt) return TUNABLES.STONE_REGEN_MS;
    return Math.max(0, TUNABLES.STONE_REGEN_MS - (now - f.stoneLastRegenAt));
  }

  function getResources() {
    const f = WG.State.get().forge;
    return { wood: f.wood, stone: f.stone };
  }

  function refillWood() {
    if (!WG.State.spend('diamonds', TUNABLES.WOOD_REFILL_GEMS)) return { ok: false, reason: 'insufficient-diamonds' };
    const f = WG.State.get().forge;
    f.wood = Math.min(TUNABLES.WOOD_CAP, f.wood + TUNABLES.WOOD_REFILL_AMT);
    WG.Engine.emit('forge:resources-change', { wood: f.wood, stone: f.stone });
    return { ok: true };
  }
  function refillStone() {
    if (!WG.State.spend('diamonds', TUNABLES.STONE_REFILL_GEMS)) return { ok: false, reason: 'insufficient-diamonds' };
    const f = WG.State.get().forge;
    f.stone = Math.min(TUNABLES.STONE_CAP, f.stone + TUNABLES.STONE_REFILL_AMT);
    WG.Engine.emit('forge:resources-change', { wood: f.wood, stone: f.stone });
    return { ok: true };
  }

  // Spend resources for a craft attempt; shows refill prompt if insufficient.
  const WOOD_PER_CRAFT = 20;
  const STONE_PER_CRAFT = 10;
  function canCraft() {
    const f = WG.State.get().forge;
    return f.wood >= WOOD_PER_CRAFT && f.stone >= STONE_PER_CRAFT;
  }
  function spendCraftResources() {
    const f = WG.State.get().forge;
    if (f.wood < WOOD_PER_CRAFT || f.stone < STONE_PER_CRAFT) return false;
    f.wood -= WOOD_PER_CRAFT;
    f.stone -= STONE_PER_CRAFT;
    WG.Engine.emit('forge:resources-change', { wood: f.wood, stone: f.stone });
    return true;
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

  let _regenTickHandle = 0;
  function init() {
    WG.Engine.on('tick', ({ dt }) => tickIdle(dt));
    // Catch-up offline regen on session start, then tick every 30s
    processResourceRegen(Date.now());
    if (!_regenTickHandle) _regenTickHandle = setInterval(() => processResourceRegen(Date.now()), 30000);
  }

  window.WG.ForgeBuildings = {
    init, get, DEFS, DIAMOND_BYPASS_COST, AD_REWARD_AVAILABLE, TUNABLES,
    tryUpgrade, tryUnlock, tryUnlockByDiamonds, tryUnlockByAd,
    upgradeCost, genRate, gsMet,
    processResourceRegen, nextWoodRegenMs, nextStoneRegenMs,
    getResources, refillWood, refillStone, canCraft, spendCraftResources,
    WOOD_PER_CRAFT, STONE_PER_CRAFT,
  };
})();
