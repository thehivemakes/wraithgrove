// WG.DuelRoster — generates AI clones (opponents) at varying Power levels
(function(){'use strict';
  // Simulate other players: each has a Power, rank, and asynchronous "loadout" that
  // affects the duel resolution. Real production would pull from server KV.
  const NAMES = [
    'Greypath', 'Briar', 'Hollow Wren', 'Pale Elm', 'Cinder Vow', 'Ashling',
    'Vesperhand', 'Lantern Quiet', 'Marrow', 'Hush', 'Tallow', 'Wisp',
    'Cradle', 'Yew', 'Foxglove', 'Owl Knell', 'Throne Black', 'Veiled',
  ];

  function generateOpponent(playerPower, rank) {
    // Power within ±20% of player
    const variance = 0.4;   // ±20%
    const minP = Math.max(10, playerPower * (1 - variance/2));
    const maxP = playerPower * (1 + variance/2);
    const power = Math.floor(minP + Math.random() * (maxP - minP));
    const name = NAMES[Math.floor(Math.random() * NAMES.length)] + ' ' + Math.floor(Math.random()*999);
    const skinKey = ['starter','crow_cloak','ash_walker','bone_diviner','night_celebrant','moon_keeper'][Math.floor(Math.random()*6)];
    const skin = WG.AscendSkins.get(skinKey);
    return {
      name, power, rank,
      skin,
      level: Math.max(1, Math.floor(power / 30)),
      loadout: {
        attackProfile: 0.8 + Math.random() * 0.4,    // damage scaling vs theoretical
        defenseProfile: 0.8 + Math.random() * 0.4,
      },
    };
  }

  function init() {}
  window.WG.DuelRoster = { init, generateOpponent };
})();
