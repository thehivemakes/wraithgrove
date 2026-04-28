// WG.AscendSkins — character skins (Path A: gameplay-relevant power)
(function(){'use strict';
  const SKINS = {
    starter:        { id:'starter',        name:'Lantern Acolyte',  power: 0,    cost: { coins: 0 },     unlocked: true,  tier:'common',  color:'#3a3022', accent:'#f0d890' },
    crow_cloak:     { id:'crow_cloak',     name:'Crow Cloak',       power: 30,   cost: { coins: 800 },                tier:'rare',    color:'#1a1620', accent:'#8090a0' },
    ash_walker:     { id:'ash_walker',     name:'Ash Walker',       power: 60,   cost: { coins: 2400 },               tier:'rare',    color:'#403028', accent:'#e0a060' },
    bone_diviner:   { id:'bone_diviner',   name:'Bone Diviner',     power: 120,  cost: { diamonds: 80 },              tier:'epic',    color:'#d8d0c0', accent:'#604030' },
    night_celebrant:{ id:'night_celebrant',name:'Night Celebrant',  power: 240,  cost: { diamonds: 250 },             tier:'epic',    color:'#280830', accent:'#ffaaff' },
    moon_keeper:    { id:'moon_keeper',    name:'Moon Keeper',      power: 480,  cost: { cards: 30, diamonds: 200 },  tier:'legendary', color:'#88a0c0', accent:'#fffacc' },
    shrine_oracle:  { id:'shrine_oracle',  name:'Shrine Oracle',    power: 900,  cost: { cards: 80, diamonds: 600 },  tier:'legendary', color:'#601830', accent:'#ffe0b0' },
    wraith_walker:  { id:'wraith_walker',  name:'Wraith Walker',    power: 1800, cost: { cards: 200, diamonds: 1500 },tier:'mythic',  color:'#1a0828', accent:'#a060ff' },
  };

  function get(id) { return SKINS[id]; }
  function list() { return Object.values(SKINS); }

  function tryUnlock(id) {
    const s = get(id);
    if (!s) return { ok: false, reason: 'unknown' };
    const ps = WG.State.get().player;
    if (ps.ownedSkins.includes(id)) return { ok: false, reason: 'already-owned' };
    const cost = s.cost || {};
    // Check affordability across all currencies in cost
    for (const cur of ['coins','diamonds','cards']) {
      if (cost[cur] && WG.State.get().currencies[cur] < cost[cur]) return { ok: false, reason: 'insufficient-' + cur };
    }
    for (const cur of ['coins','diamonds','cards']) {
      if (cost[cur]) WG.State.spend(cur, cost[cur]);
    }
    ps.ownedSkins.push(id);
    WG.Engine.emit('skin:unlocked', { skin: s });
    return { ok: true, skin: s };
  }

  function trySetActive(id) {
    const ps = WG.State.get().player;
    if (!ps.ownedSkins.includes(id)) return { ok: false, reason: 'locked' };
    ps.activeSkin = id;
    WG.Engine.emit('skin:active-change', { skin: get(id) });
    return { ok: true };
  }

  function init() {}
  window.WG.AscendSkins = { init, get, list, tryUnlock, trySetActive, SKINS };
})();
