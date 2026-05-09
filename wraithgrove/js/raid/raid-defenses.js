// WG.RaidDefenses — catalog: 4 turret types, 6 active traps, wall segments
(function(){'use strict';

  // ── TURRET TYPES (pulled from Bow Range / Cannon Battery / Wall Workshop lore) ──
  const TURRET_TYPES = Object.freeze({
    cannon: {
      name: 'Cannon', icon: '🎯', category: 'cannon_battery',
      hp: 300, damage: 45, fireRateHz: 0.4, range: 200, aoeR: 0,
      desc: 'Slow artillery, high single-target damage. Consumes cannon stock.',
    },
    archer: {
      name: 'Archer Tower', icon: '🏹', category: 'bow_range',
      hp: 180, damage: 18, fireRateHz: 1.5, range: 250, aoeR: 0,
      desc: 'Fast ranged fire, good vs swarms. Consumes archer stock.',
    },
    mortar: {
      name: 'Mortar', icon: '💥', category: 'cannon_battery',
      hp: 240, damage: 35, fireRateHz: 0.25, range: 280, aoeR: 80,
      desc: 'AOE explosive, slow reload. Consumes cannon stock.',
    },
    ward: {
      name: 'Spirit Ward', icon: '🔮', category: 'bow_range',
      hp: 200, damage: 12, fireRateHz: 2.0, range: 160, aoeR: 0,
      slowFactor: 0.2,
      desc: 'Spirit bolts that slow attacker 20%. Consumes archer stock.',
    },
  });

  // ── COUNTER REWARD BUFFS (earned by attacker who successfully counters a trap) ──
  const COUNTER_REWARD_BUFFS = Object.freeze({
    atk_boost_10s:        { name: 'Counter: ATK Boost',      desc: '+10% attack for 10s',     durationMs: 10000 },
    free_ability_charge:  { name: 'Counter: Ability Charge', desc: '+1 ability charge',        durationMs: 0     },
    coin_trickle_5s:      { name: 'Counter: Coin Trickle',   desc: 'Coin drops for 5s',        durationMs: 5000  },
    movement_immunity_6s: { name: 'Counter: Move Immunity',  desc: '6s movement immunity',     durationMs: 6000  },
    ranged_block_5s:      { name: 'Counter: Ranged Block',   desc: 'Block ranged damage 5s',   durationMs: 5000  },
    debuff_cleanse:       { name: 'Counter: Debuff Cleanse', desc: 'Clears marked debuff',      durationMs: 0     },
  });

  // ── ACTIVE TRAP TYPES (6 of 10 — shipping) ────────────────────────────────
  // counterAction   — player input id required to counter the trap
  // counterWindowMs — how long the counter window stays open after telegraph fires (400ms)
  // counterRewardBuff — buff id from COUNTER_REWARD_BUFFS awarded on successful counter
  // damagePctOnHit  — fraction of attacker maxHP dealt when counter fails (cap 0.25)
  const TRAP_TYPES = Object.freeze({
    pressure_spike: {
      name: 'Pressure Plate Spike', icon: '⬆',
      hp: 80, telegraphMs: 500,
      damage: 0.20, maxHpDamageCap: 0.25, damagePctOnHit: 0.25,
      counterAction: 'block_swing', counterWindowMs: 400,
      counterRewardBuff: 'atk_boost_10s',
      desc: '0.5s tile crack tell → spike pillar, 20% HP damage.',
    },
    wraith_mist: {
      name: 'Wraith Mist Bomb', icon: '💜',
      hp: 60, telegraphMs: 700,
      damage: 0.12, maxHpDamageCap: 0.25, damagePctOnHit: 0.25,
      aoeTiles: 4,
      slow: { factor: 0.5, durationMs: 2000 },
      counterAction: 'dispel', counterWindowMs: 400,
      counterRewardBuff: 'free_ability_charge',
      desc: '0.7s purple glow tell → 4-tile AOE + 50% slow 2s.',
    },
    falling_lantern: {
      name: 'Falling Lantern', icon: '🏮',
      hp: 70, telegraphMs: 600,
      dotDamagePerTick: 0.08, dotTickMs: 500, dotDurationMs: 5000,
      maxHpDamageCap: 0.25, damagePctOnHit: 0.25,
      counterAction: 'dodge_step', counterWindowMs: 400,
      counterRewardBuff: 'coin_trickle_5s',
      desc: '0.6s lantern rope-strain tell → drops + flame DOT 5s.',
    },
    sigil_snare: {
      name: 'Sigil Snare', icon: '🔻',
      hp: 50, telegraphMs: 500,
      damage: 0, rootDurationMs: 1500, maxHpDamageCap: 0, damagePctOnHit: 0,
      counterAction: 'movement_ability', counterWindowMs: 400,
      counterRewardBuff: 'movement_immunity_6s',
      desc: '0.5s glyph pulse tell → roots attacker 1.5s.',
    },
    echo_ringer: {
      name: 'Echo Ringer', icon: '🔔',
      hp: 65, telegraphMs: 500,
      damage: 0, stunDurationMs: 1000, aoeTiles: 3, maxHpDamageCap: 0, damagePctOnHit: 0,
      revealsAttacker: true,
      counterAction: 'block_swing', counterWindowMs: 400,
      counterRewardBuff: 'ranged_block_5s',
      desc: '0.5s humming tell → 3-tile AOE stun 1s + reveals attacker.',
    },
    paper_charm: {
      name: 'Paper Charm Mine', icon: '📄',
      hp: 40, telegraphMs: 400,
      damage: 0.10, aoeTiles: 2, maxHpDamageCap: 0.25, damagePctOnHit: 0.25,
      debuff: { type: 'marked', durationMs: 3000, defenderAimBonus: 0.15 },
      counterAction: 'dodge_step', counterWindowMs: 400,
      counterRewardBuff: 'debuff_cleanse',
      desc: '0.4s paper-fold tell → small AOE + 3s "marked" debuff.',
    },
  });

  // ── COMING SOON traps (placeholder cards only) ─────────────────────────────
  const TRAPS_COMING_SOON = Object.freeze([
    { id: 'whisper_trap', name: 'Whisper Trap',  icon: '👂' },
    { id: 'coin_mimic',   name: 'Coin Mimic',    icon: '🪙' },
    { id: 'veil_pit',     name: 'Veil Pit',      icon: '🕳' },
    { id: 'lantern_maze', name: 'Lantern Maze',  icon: '🌀' },
  ]);

  // ── WALL TYPES ─────────────────────────────────────────────────────────────
  const WALL_TYPES = Object.freeze({
    basic:      { name: 'Wooden Wall',     icon: '🪵', hp: 200 },
    reinforced: { name: 'Reinforced Wall', icon: '⬛', hp: 400 },
  });

  // ── SPRING BUFFS (10s temp buff awarded to attacker who springs a trap) ────
  const SPRING_BUFFS = Object.freeze({
    spike_resist: { name: 'Spike Resist', durationMs: 10000, effect: '-30% physical trap dmg' },
    mist_veil:    { name: 'Mist Veil',    durationMs: 10000, effect: 'immune to mist slow' },
    flame_shroud: { name: 'Flame Shroud', durationMs: 10000, effect: 'fire immunity' },
    sigil_echo:   { name: 'Sigil Echo',   durationMs: 10000, effect: 'immune to root traps' },
    echo_clarity: { name: 'Echo Clarity', durationMs: 10000, effect: 'stun resist + stealth' },
    paper_ward:   { name: 'Paper Ward',   durationMs: 10000, effect: 'clear marked debuff' },
  });

  window.WG = window.WG || {};
  window.WG.RaidDefenses = {
    TURRET_TYPES,
    TRAP_TYPES,
    TRAPS_COMING_SOON,
    WALL_TYPES,
    SPRING_BUFFS,
    COUNTER_REWARD_BUFFS,
    getTurret:       function(id) { return TURRET_TYPES[id]          || null; },
    getTrap:         function(id) { return TRAP_TYPES[id]             || null; },
    getWall:         function(id) { return WALL_TYPES[id]             || null; },
    getCounterBuff:  function(id) { return COUNTER_REWARD_BUFFS[id]  || null; },
  };
})();
