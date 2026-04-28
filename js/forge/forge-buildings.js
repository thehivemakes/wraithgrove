// WG.ForgeBuildings — 8-slot building grid with idle generators
(function(){'use strict';
  const DEFS = {
    cave:     { name:'Cave',     icon:'⛰', desc:'Idle coin trickle',     unlockCost:{coins:0},     baseGen:0.6 },
    forge:    { name:'Forge',    icon:'🔨', desc:'Craft relics',          unlockCost:{coins:0},     baseGen:0   },
    campfire: { name:'Campfire', icon:'🔥', desc:'+ HP regen in Hunt',    unlockCost:{coins:0},     baseGen:0   },
    fence:    { name:'Fence',    icon:'🪵', desc:'+ Defense bonus',        unlockCost:{coins:1500},  baseGen:0   },
    cannon:   { name:'Cannon',   icon:'🎯', desc:'Unlocks ranged tier 2',  unlockCost:{coins:6000, diamonds:30}, baseGen:0 },
    blade:    { name:'Anvil',    icon:'🗡', desc:'Unlocks melee tier 2',   unlockCost:{coins:8000},  baseGen:0   },
    bow:      { name:'Range',    icon:'🏹', desc:'Unlocks ranged tier 3',  unlockCost:{coins:12000, diamonds:60}, baseGen:0 },
    sawtrap:  { name:'Trap',     icon:'⚙', desc:'+ Crit bonus',           unlockCost:{coins:15000}, baseGen:0   },
  };

  function get(id) { return DEFS[id]; }
  function genRate(b) {
    const def = DEFS[b.id]; if (!def) return 0;
    return def.baseGen * b.level;
  }
  function upgradeCost(b) { return Math.floor(50 + b.level * b.level * 30); }
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
  function tryUnlock(id) {
    const s = WG.State.get();
    const b = s.forge.buildings.find(x => x.id === id);
    if (!b) return { ok: false, reason: 'unknown' };
    if (b.unlocked) return { ok: false, reason: 'already' };
    const def = DEFS[id];
    const cost = def.unlockCost || {};
    for (const c in cost) if (s.currencies[c] < cost[c]) return { ok: false, reason: 'insufficient-' + c };
    for (const c in cost) WG.State.spend(c, cost[c]);
    b.unlocked = true; b.level = 1;
    WG.Engine.emit('forge:unlock', { id });
    return { ok: true };
  }
  // Idle income tick — call every frame
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
  window.WG.ForgeBuildings = { init, get, DEFS, tryUpgrade, tryUnlock, upgradeCost, genRate };
})();
