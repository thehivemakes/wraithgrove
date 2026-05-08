// WG.HuntWeapons — weapon catalog (in-stage pickups + meta equipment)
// Auto-attack model: every weapon has cooldown + range + damage profile.
(function(){'use strict';
  const WEAPONS = {
    // Starter (always equipped)
    branch_stick:    { id:'branch_stick',    name:'Branch Stick',    slot:'melee',  range: 50, cooldown: 0.65, damage: 6,  power: 5,  visual:{shape:'stick', color:'#a07050'} },

    // Field pickups (in-stage temporary; ad-gated)
    charred_axe:     { id:'charred_axe',     name:'Charred Axe',     slot:'pickup', range: 65, cooldown: 0.85, damage: 14, power: 0,  visual:{shape:'axe',   color:'#3a3030'} },
    twin_blades:     { id:'twin_blades',     name:'Twin Blades',     slot:'pickup', range: 55, cooldown: 0.45, damage: 9,  power: 0,  visual:{shape:'twin',  color:'#c0c0d0'} },
    bow_of_mourning: { id:'bow_of_mourning', name:'Bow of Mourning', slot:'pickup', range: 220,cooldown: 1.0,  damage: 12, power: 0,  visual:{shape:'bow',   color:'#806040'}, ranged:true },
    paper_charm:     { id:'paper_charm',     name:'Paper Charm',     slot:'pickup', range: 180,cooldown: 1.4,  damage: 16, power: 0,  visual:{shape:'charm', color:'#ffe890'}, ranged:true, areaR: 40 },
    bramble_stick:   { id:'bramble_stick',   name:'Bramble Stick',   slot:'pickup', range: 75, cooldown: 0.7,  damage: 11, power: 0,  visual:{shape:'briar', color:'#5a3018'} },
    silver_thorn:    { id:'silver_thorn',    name:'Silver Thorn',    slot:'pickup', range: 90, cooldown: 0.6,  damage: 13, power: 0,  visual:{shape:'thorn', color:'#d8d8e8'} },
    sutra_blade:     { id:'sutra_blade',     name:'Sutra Blade',     slot:'pickup', range: 70, cooldown: 0.5,  damage: 12, power: 0,  visual:{shape:'curve', color:'#e8a040'} },
    ember_lash:      { id:'ember_lash',      name:'Ember Lash',      slot:'pickup', range: 95, cooldown: 0.7,  damage: 15, power: 0,  visual:{shape:'whip',  color:'#ff6020'} },
    willow_charm:    { id:'willow_charm',    name:'Willow Charm',    slot:'pickup', range: 150,cooldown: 1.1,  damage: 18, power: 0,  visual:{shape:'charm', color:'#a0c890'}, ranged:true, areaR: 35 },

    // Meta equipment — ranged slot unlocks
    iron_sling:      { id:'iron_sling',      name:'Iron Sling',      slot:'ranged', range: 140,cooldown: 0.8,  damage: 8,  power: 18, visual:{shape:'sling', color:'#888'} },
    bone_horn:       { id:'bone_horn',       name:'Bone Horn',       slot:'ranged', range: 120,cooldown: 1.5,  damage: 22, power: 32, visual:{shape:'horn',  color:'#e8e0c0'}, ranged:true, areaR:50 },

    // Meta equipment — pet slot unlocks (companion auto-attacks alongside player)
    pet_wisp:        { id:'pet_wisp',        name:'Wisp',            slot:'pet',    range: 80, cooldown: 1.2,  damage: 5,  power: 22, visual:{shape:'orb',   color:'#a8d8ff'}, isPet:true },
    pet_fox:         { id:'pet_fox',         name:'Spectral Fox',    slot:'pet',    range: 50, cooldown: 0.9,  damage: 8,  power: 36, visual:{shape:'fox',   color:'#e08840'}, isPet:true },
    pet_crow:        { id:'pet_crow',        name:'Lantern Crow',    slot:'pet',    range: 110,cooldown: 1.4,  damage: 12, power: 50, visual:{shape:'crow',  color:'#202028'}, isPet:true, ranged:true },
  };

  function byId(id) { return WEAPONS[id]; }
  function bySlot(slot) { return Object.values(WEAPONS).filter(w => w.slot === slot); }
  function rangedSlotUnlocks() { return ['iron_sling', 'bone_horn']; }
  function petSlotUnlocks() { return ['pet_wisp', 'pet_fox', 'pet_crow']; }

  function init() {}
  window.WG.HuntWeapons = { init, byId, bySlot, rangedSlotUnlocks, petSlotUnlocks, WEAPONS };
})();
