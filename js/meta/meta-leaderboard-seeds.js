// WG.LeaderboardSeeds — deterministic simulated player + alliance roster.
// CF-001 (pre-launch): zero real players exist. Seeds populate leaderboard
// surfaces to drive social pressure → whale conversion → retention.
// All data is generated from a fixed seed — same sequence every load.
(function(){'use strict';

  // Seeded 32-bit LCG — deterministic, zero external deps
  function _rng(seed) {
    var s = (seed | 0) >>> 0;
    return function() {
      s = (Math.imul(s, 1664525) + 1013904223) | 0;
      return (s >>> 0) / 0xffffffff;
    };
  }

  // 200 unique folk-horror names: 20 elements × 10 roles (IP-clean, Eastern register)
  var NAMES = (function() {
    var EL = [
      'Ash',    'Pale',   'Hollow', 'Ember',   'Bone',
      'Ink',    'Fog',    'Iron',   'Mist',    'Frost',
      'Stone',  'Silk',   'Moon',   'Cedar',   'Crimson',
      'Shadow', 'Wind',   'Tide',   'Dust',    'Lantern',
    ];
    var RO = [
      'Cantor', 'Pilgrim', 'Seer',   'Warder', 'Hermit',
      'Exile',  'Revenant','Blade',  'Caller', 'Monk',
    ];
    var n = [];
    for (var e = 0; e < EL.length; e++)
      for (var r = 0; r < RO.length; r++)
        n.push(EL[e] + ' ' + RO[r]);
    return n; // 200 entries
  }());

  var CHARS = [
    'lantern_acolyte','sigil_student','horned_oni','paper_priest',
    'silent_seer','scythe_widow','ash_brawler','fox_kabuki','cap_apprentice',
  ];

  var BANNER_COLORS = [
    '#a040ff','#d04020','#2080d0','#f0a020','#208040',
    '#c08020','#e04080','#804020','#206080','#208060',
    '#606020','#402060','#604040','#204060','#804060',
    '#a06020','#406020','#204080','#608020','#806040',
  ];

  var ALLIANCE_NAMES = [
    'Wraith Stalkers',   'Sigil Hunters',     'Pale Vigil',         'Lantern Order',
    'Cave Wardens',      'Iron Chorus',        'Bone Cantors',       'Ash Pilgrims',
    'Fog Seekers',       'Hollow Monks',       'Ember Exiles',       'Mist Wanderers',
    'Frost Seers',       'Moon Warders',       'Shadow Hermits',     'Cedar Blades',
    'Crimson Revenants', 'Wind Callers',       'Tide Shrine',        'Ink Brotherhood',
  ];

  // Power distribution shape per sorted index (0=weakest, 199=strongest):
  //   bottom 30% (0–59):   200–800    (apprentices, novices)
  //   mid 60%   (60–179):  800–3000   (seasoned players)
  //   top 5%    (180–194): 3000–8000  (veterans)
  //   top 5     (195–199): 8000–15000 (whales)
  function _powerBand(idx) {
    if (idx < 60)  return [200,  800];
    if (idx < 180) return [800,  3000];
    if (idx < 195) return [3000, 8000];
    return [8000, 15000];
  }

  function _buildPlayers() {
    var r = _rng(0xDEAD1337);

    // Shuffle names so the power-top players don't all share one element prefix
    var namePool = NAMES.slice();
    for (var ni = namePool.length - 1; ni > 0; ni--) {
      var nj = Math.floor(r() * (ni + 1));
      var nt = namePool[ni]; namePool[ni] = namePool[nj]; namePool[nj] = nt;
    }

    // Assign 130 of 200 players to alliances using round-robin → shuffle.
    // Guarantees every alliance gets ~6–7 members (no empty alliances).
    var slots = [];
    for (var i = 0; i < 130; i++)
      slots.push('sa_' + String((i % 20) + 1).padStart(2, '0'));
    for (var si = slots.length - 1; si > 0; si--) {
      var sj = Math.floor(r() * (si + 1));
      var st = slots[si]; slots[si] = slots[sj]; slots[sj] = st;
    }

    var players = [];
    for (var p = 0; p < 200; p++) {
      var band  = _powerBand(p);
      var pMin  = band[0], pMax = band[1];
      // pow(t, 0.75) biases toward lower end within each band → realistic skew
      var power = Math.round(pMin + (pMax - pMin) * Math.pow(r(), 0.75));
      var towerFloor  = Math.min(60, Math.max(1, Math.round(power / 280 + r() * 6)));
      var duelRankPts = Math.max(0, Math.round(power * 0.38 + r() * 180));
      var charKey     = CHARS[Math.floor(r() * CHARS.length)];
      var tier        = Math.min(5, Math.floor(power / 2800));
      players.push({
        id:          'seed_' + String(p + 1).padStart(3, '0'),
        name:        namePool[p],
        bannerColor: BANNER_COLORS[p % BANNER_COLORS.length],
        character:   charKey,
        tier:        tier,
        power:       power,
        towerFloor:  towerFloor,
        duelRankPts: duelRankPts,
        allianceId:  p < 130 ? slots[p] : null,
      });
    }
    return players;
  }

  function _buildAlliances(players) {
    var r = _rng(0xBEEFCAFE);
    return ALLIANCE_NAMES.map(function(name, idx) {
      var id      = 'sa_' + String(idx + 1).padStart(2, '0');
      var members = players.filter(function(p) { return p.allianceId === id; });
      var baseDmg = Math.round(r() * 5000);
      var cumDmg  = members.reduce(function(sum, p) {
        return sum + Math.round(p.power * (6 + r() * 14));
      }, baseDmg);
      return {
        id:               id,
        name:             name,
        banner:           BANNER_COLORS[idx % BANNER_COLORS.length],
        memberCount:      members.length,
        memberIds:        members.map(function(p) { return p.id; }),
        cumulativeDamage: cumDmg,
        points:           Math.round(cumDmg / 80 + r() * 300),
      };
    });
  }

  var _players   = _buildPlayers();
  var _alliances = _buildAlliances(_players);

  // Pre-sorted views — computed once at module load
  var _byPower = _players.slice().sort(function(a,b){ return b.power       - a.power; });
  var _byFloor = _players.slice().sort(function(a,b){ return b.towerFloor  - a.towerFloor; });
  var _byDuel  = _players.slice().sort(function(a,b){ return b.duelRankPts - a.duelRankPts; });
  var _byDmg   = _alliances.slice().sort(function(a,b){ return b.cumulativeDamage - a.cumulativeDamage; });

  window.WG.LeaderboardSeeds = {
    getPlayers:    function() { return _players; },
    getAlliances:   function() { return _alliances; },
    byPower:       function() { return _byPower; },
    byFloor:       function() { return _byFloor; },
    byDuel:        function() { return _byDuel; },
    byAllianceDmg: function() { return _byDmg; },
  };
}());
