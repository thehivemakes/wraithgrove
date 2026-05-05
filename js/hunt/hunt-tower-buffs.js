// WG.HuntTowerBuffs — buff card catalog + roll/apply API for Tower Gauntlet
(function(){'use strict';

  // 24 buff cards across 3 rarity tiers. weight fields drive the weighted roll.
  // upgradeTo: if the player picks the same buff twice, the second pick applies
  // the named upgrade variant instead (stacking upgrade).
  const CATALOG = {
    // ── Common (weight 60) ──────────────────────────────────────────────────
    damage_plus_15:    { id:'damage_plus_15',    rarity:'common',    weight:60, name:'+15% Damage',     desc:'+15% melee & ranged damage',      icon:'⚔',  upgradeTo:'damage_plus_30' },
    crit_plus_5:       { id:'crit_plus_5',       rarity:'common',    weight:60, name:'+5% Crit',        desc:'+5% critical hit chance',          icon:'🎯', upgradeTo:'crit_plus_15'   },
    hp_plus_25:        { id:'hp_plus_25',         rarity:'common',    weight:60, name:'+25 Max HP',      desc:'+25 max health, +25 current HP',   icon:'❤',  upgradeTo:'hp_plus_25'     },
    magnet_plus_30:    { id:'magnet_plus_30',     rarity:'common',    weight:60, name:'+30% Magnet',     desc:'+30% pickup magnet radius',         icon:'🧲', upgradeTo:'magnet_plus_30' },
    move_plus_10:      { id:'move_plus_10',       rarity:'common',    weight:60, name:'+10% Speed',      desc:'+10% movement speed',              icon:'💨', upgradeTo:'move_plus_10'   },
    wood_plus_1:       { id:'wood_plus_1',        rarity:'common',    weight:60, name:'+1 Wood/Floor',   desc:'+1 starting wood per floor',       icon:'🪵', upgradeTo:'wood_plus_1'    },
    // ── Rare (weight 30) ────────────────────────────────────────────────────
    damage_plus_30:    { id:'damage_plus_30',     rarity:'rare',      weight:30, name:'+30% Damage',     desc:'+30% melee & ranged damage',       icon:'⚔',  upgradeTo:null             },
    lifesteal_4:       { id:'lifesteal_4',        rarity:'rare',      weight:30, name:'4% Lifesteal',    desc:'4% lifesteal on hit',              icon:'🩸', upgradeTo:'lifesteal_15'   },
    crit_dmg_plus_50:  { id:'crit_dmg_plus_50',   rarity:'rare',      weight:30, name:'+50% Crit DMG',   desc:'Critical damage +50%',             icon:'💥', upgradeTo:'crit_dmg_plus_50'},
    cooldown_minus_15: { id:'cooldown_minus_15',  rarity:'rare',      weight:30, name:'-15% Cooldown',   desc:'Skill & attack cooldown -15%',     icon:'⏱',  upgradeTo:'cooldown_minus_15'},
    proj_count_plus_1: { id:'proj_count_plus_1',  rarity:'rare',      weight:30, name:'+1 Projectile',   desc:'+1 ranged projectile per attack',  icon:'🏹', upgradeTo:'proj_count_plus_1'},
    chest_drop_plus_10:{ id:'chest_drop_plus_10', rarity:'rare',      weight:30, name:'+10% Chest Drop', desc:'+10% treasure chest drop rate',    icon:'📦', upgradeTo:'chest_drop_plus_10'},
    // ── Legendary (weight 10, floor 5+) ─────────────────────────────────────
    revive_once:       { id:'revive_once',        rarity:'legendary', weight:10, name:'1 Free Revive',   desc:'1 free revival on death this run', icon:'✨', upgradeTo:null, minFloor:5 },
    lifesteal_15:      { id:'lifesteal_15',       rarity:'legendary', weight:10, name:'15% Lifesteal',   desc:'15% lifesteal on hit',             icon:'🩸', upgradeTo:null, minFloor:5 },
    damage_plus_60:    { id:'damage_plus_60',     rarity:'legendary', weight:10, name:'+60% Damage',     desc:'+60% melee & ranged damage',       icon:'⚔',  upgradeTo:null, minFloor:5 },
    crit_plus_15:      { id:'crit_plus_15',       rarity:'legendary', weight:10, name:'+15% Crit',       desc:'+15% critical hit chance',         icon:'🎯', upgradeTo:null, minFloor:5 },
    phantom_strike:    { id:'phantom_strike',     rarity:'legendary', weight:10, name:'Phantom Strike',  desc:'Every 3rd hit auto-crits',         icon:'👻', upgradeTo:null, minFloor:5 },
    floor_skip:        { id:'floor_skip',         rarity:'legendary', weight:10, name:'Floor Skip',      desc:'Skip next floor with full rewards',icon:'⏭',  upgradeTo:null, minFloor:5 },
  };

  const RARITY_COLORS = {
    common:    { border:'#686868', glow:'rgba(120,120,120,0.3)',  bg:'#111111', text:'#c8c8c8' },
    rare:      { border:'#3870d8', glow:'rgba(56,112,216,0.35)', bg:'#08101e', text:'#78b0f8' },
    legendary: { border:'#c89820', glow:'rgba(200,152,32,0.5)',  bg:'#181004', text:'#f8d060' },
  };

  // Roll `count` distinct cards from the eligible pool, weighted by rarity.
  function roll(count, floor) {
    const eligible = Object.values(CATALOG).filter(c => !c.minFloor || floor >= c.minFloor);
    // Build flat weighted pool
    const pool = [];
    for (const card of eligible) {
      for (let w = 0; w < card.weight; w++) pool.push(card.id);
    }
    const picked = [];
    const used   = new Set();
    let attempts = 0;
    while (picked.length < count && attempts < 400) {
      attempts++;
      const id = pool[Math.floor(Math.random() * pool.length)];
      if (!used.has(id)) { used.add(id); picked.push(CATALOG[id]); }
    }
    return picked;
  }

  // Apply a buff to the tower runtime. Mutates rt.player and rt buff fields.
  // buffStack records each pick so upgrade checks work correctly.
  function apply(buffId, rt) {
    const p = rt.player;
    if (!p) return;
    switch (buffId) {
      case 'damage_plus_15':    p._towerDmgPct = (p._towerDmgPct || 0) + 0.15; break;
      case 'damage_plus_30':    p._towerDmgPct = (p._towerDmgPct || 0) + 0.30; break;
      case 'damage_plus_60':    p._towerDmgPct = (p._towerDmgPct || 0) + 0.60; break;
      case 'crit_plus_5':       p._towerCritBonus = (p._towerCritBonus || 0) + 0.05; break;
      case 'crit_plus_15':      p._towerCritBonus = (p._towerCritBonus || 0) + 0.15; break;
      case 'hp_plus_25':        p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); break;
      case 'magnet_plus_30':    p.pickupRadius = (p.pickupRadius || 28) * 1.30; break;
      case 'move_plus_10':      p.speedBonus = (p.speedBonus || 0) + 12; break;
      case 'wood_plus_1':       rt.runWood = (rt.runWood || 0) + 1; break;
      case 'lifesteal_4':       rt._towerLifesteal = (rt._towerLifesteal || 0) + 0.04; break;
      case 'lifesteal_15':      rt._towerLifesteal = (rt._towerLifesteal || 0) + 0.15; break;
      case 'crit_dmg_plus_50':  p._towerCritDmgBonus = (p._towerCritDmgBonus || 0) + 0.50; break;
      case 'cooldown_minus_15': p.cooldownMul = (p.cooldownMul || 1) * 0.85; break;
      case 'proj_count_plus_1': p._towerProjCount = (p._towerProjCount || 1) + 1; break;
      case 'chest_drop_plus_10':rt._chestDropBonus = (rt._chestDropBonus || 0) + 0.10; break;
      case 'revive_once':       rt._towerRevives = (rt._towerRevives || 0) + 1; break;
      case 'phantom_strike':    p._phantomStrike = true; break;
      case 'floor_skip':        rt._pendingFloorSkip = true; break;
    }
    if (rt.buffStack) rt.buffStack.push(buffId);
    WG.Engine.emit('tower:buff-applied', { buffId, floor: rt.floor });
  }

  function getCard(id)             { return CATALOG[id]; }
  function getRarityColors(rarity) { return RARITY_COLORS[rarity] || RARITY_COLORS.common; }

  function init() {}

  window.WG.HuntTowerBuffs = { init, roll, apply, getCard, getRarityColors, CATALOG };
})();
