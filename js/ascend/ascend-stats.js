// WG.AscendStats — stat upgrades (Attack / Gather Rate / Defense)
(function(){'use strict';
  const UPGRADES = {
    attack:     { label:'Attack',       step: 2,    cost: (n)=>10 + n*4 },
    gatherRate: { label:'Gather Rate',  step: 0.05, cost: (n)=>20 + n*8, max: 5 },
    defense:    { label:'Defense',      step: 1,    cost: (n)=>15 + n*6 },
    critRate:   { label:'Crit',         step: 0.01, cost: (n)=>30 + n*12, max: 0.5 },
    hpMax:      { label:'HP Max',       step: 8,    cost: (n)=>14 + n*5 },
  };

  function tryUpgrade(stat) {
    const u = UPGRADES[stat];
    if (!u) return { ok: false, reason: 'unknown-stat' };
    const ps = WG.State.get().player.stats;
    if (u.max != null && ps[stat] >= u.max) return { ok: false, reason: 'max-reached' };
    const n = ps['_lvl_' + stat] || 0;
    const cost = u.cost(n);
    if (!WG.State.spend('coins', cost)) return { ok: false, reason: 'insufficient-coins', cost };
    ps[stat] = (ps[stat] || 0) + u.step;
    if (stat === 'hpMax') ps.hp = ps.hpMax;   // refill on hpMax buy
    ps['_lvl_' + stat] = n + 1;
    WG.Engine.emit('stat:upgrade', { stat, value: ps[stat], cost });
    return { ok: true, stat, value: ps[stat], cost };
  }

  function init() {}
  window.WG.AscendStats = { init, tryUpgrade, UPGRADES };
})();
