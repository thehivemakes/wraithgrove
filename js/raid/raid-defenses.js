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

  // ── ACTIVE TRAP TYPES (6 of 10 — shipping) ────────────────────────────────
  const TRAP_TYPES = Object.freeze({
    pressure_spike: {
      name: 'Pressure Plate Spike', icon: '⬆',
      hp: 80, telegraphMs: 500,
      damage: 0.20,           // fraction of attacker max HP
      maxHpDamageCap: 0.25,
      counter: ['jump-ability', 'block-with-weapon'],
      buffOnSpring: 'spike_resist',
      desc: '0.5s tile crack tell → spike pillar, 20% HP damage.',
    },
    wraith_mist: {
      name: 'Wraith Mist Bomb', icon: '💜',
      hp: 60, telegraphMs: 700,
      damage: 0.12, maxHpDamageCap: 0.25,
      aoeTiles: 4,
      slow: { factor: 0.5, durationMs: 2000 },
      counter: ['dispel-ability', 'fox_kabuki-passive'],
      buffOnSpring: 'mist_veil',
      desc: '0.7s purple glow tell → 4-tile AOE + 50% slow 2s.',
    },
    falling_lantern: {
      name: 'Falling Lantern', icon: '🏮',
      hp: 70, telegraphMs: 600,
      dotDamagePerTick: 0.08, dotTickMs: 500, dotDurationMs: 5000,
      maxHpDamageCap: 0.25,
      counter: ['roll-under', 'break-rope-mid-fall'],
      buffOnSpring: 'flame_shroud',
      desc: '0.6s lantern rope-strain tell → drops + flame DOT 5s.',
    },
    sigil_snare: {
      name: 'Sigil Snare', icon: '🔻',
      hp: 50, telegraphMs: 500,
      damage: 0, rootDurationMs: 1500, maxHpDamageCap: 0,
      counter: ['any-movement-ability'],
      buffOnSpring: 'sigil_echo',
      desc: '0.5s glyph pulse tell → roots attacker 1.5s.',
    },
    echo_ringer: {
      name: 'Echo Ringer', icon: '🔔',
      hp: 65, telegraphMs: 500,
      damage: 0, stunDurationMs: 1000, aoeTiles: 3, maxHpDamageCap: 0,
      revealsAttacker: true,
      counter: ['silent_seer-passive', 'proximity-block'],
      buffOnSpring: 'echo_clarity',
      desc: '0.5s humming tell → 3-tile AOE stun 1s + reveals attacker.',
    },
    paper_charm: {
      name: 'Paper Charm Mine', icon: '📄',
      hp: 40, telegraphMs: 400,
      damage: 0.10, aoeTiles: 2, maxHpDamageCap: 0.25,
      debuff: { type: 'marked', durationMs: 3000, defenderAimBonus: 0.15 },
      counter: ['paper_priest-passive', 'quick-step-back'],
      buffOnSpring: 'paper_ward',
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
    getTurret: function(id) { return TURRET_TYPES[id] || null; },
    getTrap:   function(id) { return TRAP_TYPES[id]   || null; },
    getWall:   function(id) { return WALL_TYPES[id]   || null; },
  };
})();
