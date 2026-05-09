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
    // W-Content-Pack-V2 additions (+12)
    // ── Common (+3, weight 60) ──────────────────────────────────────────────
    armor_plus_10:     { id:'armor_plus_10',      rarity:'common',    weight:60, name:'+10 Armor',       desc:'+10 flat damage reduction per hit',  icon:'🛡', upgradeTo:'armor_plus_20' },
    dodge_plus_5:      { id:'dodge_plus_5',        rarity:'common',    weight:60, name:'+5% Dodge',       desc:'+5% chance to dodge incoming attacks',icon:'🌀', upgradeTo:'dodge_plus_10' },
    orb_value_plus_20: { id:'orb_value_plus_20',   rarity:'common',    weight:60, name:'+20% Orb Value',  desc:'+20% XP and coin from pickup orbs',   icon:'⚡', upgradeTo:'orb_value_plus_20' },
    // ── Rare (+3, weight 30) ────────────────────────────────────────────────
    armor_plus_20:     { id:'armor_plus_20',       rarity:'rare',      weight:30, name:'+20 Armor',       desc:'+20 flat damage reduction per hit',   icon:'🛡', upgradeTo:null },
    dodge_plus_10:     { id:'dodge_plus_10',        rarity:'rare',      weight:30, name:'+10% Dodge',      desc:'+10% chance to dodge incoming attacks',icon:'🌀', upgradeTo:null },
    blast_radius_plus_30:{ id:'blast_radius_plus_30',rarity:'rare',     weight:30, name:'+30% Blast',      desc:'+30% explosion radius on kills',      icon:'💣', upgradeTo:null },
    // ── Legendary (+3, weight 10, floor 5+) ────────────────────────────────
    double_gold:       { id:'double_gold',         rarity:'legendary', weight:10, name:'Double Gold',     desc:'All coin pickups worth 2×',           icon:'💰', upgradeTo:null, minFloor:5 },
    full_heal:         { id:'full_heal',            rarity:'legendary', weight:10, name:'Full Heal',       desc:'Restore HP to maximum now',           icon:'💊', upgradeTo:null, minFloor:5 },
    relic_echo:        { id:'relic_echo',           rarity:'legendary', weight:10, name:'Relic Echo',      desc:'Relic effects trigger twice per proc',icon:'🔮', upgradeTo:null, minFloor:5 },
    // ── Mythic (+3, weight 5, floor 30+ only) ──────────────────────────────
    time_warp:         { id:'time_warp',            rarity:'mythic',    weight:5,  name:'Time Warp',       desc:'All enemies move at 50% speed this floor',icon:'⌛', upgradeTo:null, minFloor:30 },
    wraithform:        { id:'wraithform',           rarity:'mythic',    weight:5,  name:'Wraithform',      desc:'8s of invulnerability; attacks phase through you',icon:'👁', upgradeTo:null, minFloor:30 },
    void_surge:        { id:'void_surge',           rarity:'mythic',    weight:5,  name:'Void Surge',      desc:'+80% damage and crit chance for this floor',icon:'🌌', upgradeTo:null, minFloor:30 },
    // ── W-H-Buff-Catalog-Complete (+6 mythic, floor 31+ only) ──────────────
    wraith_form:     { id:'wraith_form',     rarity:'mythic', mythic:true, weight:5, name:'Wraith Form',     desc:'Invulnerable for 5s every 30s',                 icon:'🌫', upgradeTo:null, minFloor:31, balanceTag:'invuln-cycle-5s-per-30s'     },
    lantern_halo:    { id:'lantern_halo',    rarity:'mythic', mythic:true, weight:5, name:'Lantern Halo',    desc:'Passive AOE damage tick to all nearby enemies',  icon:'🕯', upgradeTo:null, minFloor:31, balanceTag:'aoe-tick-passive'             },
    echo_strike:     { id:'echo_strike',     rarity:'mythic', mythic:true, weight:5, name:'Echo Strike',     desc:'Every 3rd hit triggers a copy attack on target', icon:'🔁', upgradeTo:null, minFloor:31, balanceTag:'3rd-hit-repeat'               },
    soul_tether:     { id:'soul_tether',     rarity:'mythic', mythic:true, weight:5, name:'Soul Tether',     desc:'XP orbs auto-collect from anywhere on screen',   icon:'💫', upgradeTo:null, minFloor:31, balanceTag:'orb-vacuum-global'            },
    lantern_wedding: { id:'lantern_wedding', rarity:'mythic', mythic:true, weight:5, name:'Lantern Wedding', desc:'Heal 1 HP per 4 enemies killed',                 icon:'🏮', upgradeTo:null, minFloor:31, balanceTag:'kill-heal-1per4'              },
    empress_crown:   { id:'empress_crown',   rarity:'mythic', mythic:true, weight:5, name:'Empress Crown',   desc:'Gold drops doubled; enemy HP +50%',              icon:'👑', upgradeTo:null, minFloor:31, balanceTag:'gold-2x-enemy-hp-plus-50pct'  },
  };

  const RARITY_COLORS = {
    common:    { border:'#686868', glow:'rgba(120,120,120,0.3)',  bg:'#111111', text:'#c8c8c8' },
    rare:      { border:'#3870d8', glow:'rgba(56,112,216,0.35)', bg:'#08101e', text:'#78b0f8' },
    legendary: { border:'#c89820', glow:'rgba(200,152,32,0.5)',  bg:'#181004', text:'#f8d060' },
    mythic:    { border:'#a030d8', glow:'rgba(160,48,216,0.65)', bg:'#120820', text:'#e080ff' },
  };

  // Roll `count` distinct cards from the eligible pool, weighted by rarity.
  // Mythic cards are gated to floor > 30 regardless of individual minFloor.
  function roll(count, floor) {
    const eligible = Object.values(CATALOG).filter(c =>
      (c.rarity !== 'mythic' || floor > 30) &&
      (!c.minFloor || floor >= c.minFloor)
    );
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
      // W-Content-Pack-V2 common
      case 'armor_plus_10':     p._towerArmor = (p._towerArmor || 0) + 10; break;
      case 'armor_plus_20':     p._towerArmor = (p._towerArmor || 0) + 20; break;
      case 'dodge_plus_5':      p._towerDodge = (p._towerDodge || 0) + 0.05; break;
      case 'dodge_plus_10':     p._towerDodge = (p._towerDodge || 0) + 0.10; break;
      case 'orb_value_plus_20': rt._orbValueBonus = (rt._orbValueBonus || 0) + 0.20; break;
      // W-Content-Pack-V2 rare
      case 'blast_radius_plus_30': rt._blastRadiusBonus = (rt._blastRadiusBonus || 0) + 0.30; break;
      // W-Content-Pack-V2 legendary
      case 'double_gold':       rt._coinMultiplier = (rt._coinMultiplier || 1) * 2; break;
      case 'full_heal':         if (p) p.hp = p.maxHp; break;
      case 'relic_echo':        rt._relicEcho = true; break;
      // W-Content-Pack-V2 mythic
      case 'time_warp':         rt._enemySpeedMul = (rt._enemySpeedMul || 1) * 0.5; break;
      case 'wraithform':        rt._wraithformUntil = Date.now() + 8000; break;
      case 'void_surge':        rt._voidSurgeFloor = rt.floor; p._towerDmgPct = (p._towerDmgPct || 0) + 0.80; p._towerCritBonus = (p._towerCritBonus || 0) + 0.80; break;
      // W-H-Buff-Catalog-Complete mythic (floor 31+)
      case 'wraith_form':     rt._wraithFormCycle = true; break;
      case 'lantern_halo':    rt._lanternHalo = true; break;
      case 'echo_strike':     p._echoStrike = true; break;
      case 'soul_tether':     p._soulTether = true; break;
      case 'lantern_wedding': rt._lanternWedding = true; break;
      case 'empress_crown':   rt._coinMultiplier = (rt._coinMultiplier || 1) * 2; rt._empressEnemyHpBonus = (rt._empressEnemyHpBonus || 0) + 0.5; break;
    }
    if (rt.buffStack) rt.buffStack.push(buffId);
    WG.Engine.emit('tower:buff-applied', { buffId, floor: rt.floor });
  }

  function getCard(id)             { return CATALOG[id]; }
  function getRarityColors(rarity) { return RARITY_COLORS[rarity] || RARITY_COLORS.common; }

  function init() {}

  window.WG.HuntTowerBuffs = { init, roll, apply, getCard, getRarityColors, CATALOG };
})();
