// WG.MetaLeaderboard — tower leaderboard client; Phase 4 server swap.
// All network calls are STUB: returns cached fake data + logs "Phase 4 server swap".
// Real calls activate when WG.Config.SERVER_BASE_URL is set to a live Cloudflare Worker.
// See docs/LEADERBOARD_API.md for the full server contract.
//
// Seed-powered APIs (getTopPlayers / getTowerLeaderboard / getDuelLadder /
// getAllianceLeaderboard) serve WG.LeaderboardSeeds data pre-launch (CF-001).
// Player's live stats are inserted at the correct rank automatically.
(function(){'use strict';

  if (!window.WG.Config) window.WG.Config = {};
  const BASE_URL = (window.WG.Config && window.WG.Config.SERVER_BASE_URL) || null;

  const STUB_ROWS = [
    { rank:1, userId:'usr_wr4ith', displayName:'Wraithwalker', peakFloor:47 },
    { rank:2, userId:'usr_d4sk',   displayName:'DuskReaper',   peakFloor:38 },
    { rank:3, userId:'usr_v01d',   displayName:'VoidBound',    peakFloor:31 },
    { rank:4, userId:'usr_4sh',    displayName:'Ashcaller',    peakFloor:22 },
    { rank:5, userId:'usr_g4le',   displayName:'Galewarden',   peakFloor:19 },
  ];

  function _userId() {
    return (window.WG.Account && WG.Account.getDeviceId) ? WG.Account.getDeviceId() : 'local_player';
  }

  function _stubMeRow(peakFloor) {
    const above = STUB_ROWS.filter(r => r.peakFloor > peakFloor).length;
    return { rank: above + 1, userId: _userId(), displayName: 'YOU', peakFloor, isPlayer: true };
  }

  // POST /leaderboard/tower/submit
  // Stub: resolves immediately with { ok:true, stub:true }.
  function submit(peakFloor, runDuration, charactersUsed) {
    console.log('[MetaLeaderboard] submit — Phase 4 server swap', { peakFloor, runDuration, charactersUsed });
    if (!BASE_URL) return Promise.resolve({ ok: true, stub: true });
    const payload = {
      userId: _userId(),
      peakFloor, runDuration,
      charactersUsed: charactersUsed || [],
      signature: '',
    };
    return fetch(BASE_URL + '/leaderboard/tower/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(function(r){ return r.json(); }).catch(function(err){
      console.warn('[MetaLeaderboard] submit error', err);
      return { ok: false, stub: true, error: String(err) };
    });
  }

  // GET /leaderboard/tower/top?limit=N
  // Stub: returns STUB_ROWS sliced to limit.
  function top(limit) {
    console.log('[MetaLeaderboard] top — Phase 4 server swap', { limit });
    if (!BASE_URL) return Promise.resolve(STUB_ROWS.slice(0, limit || 100));
    return fetch(BASE_URL + '/leaderboard/tower/top?limit=' + (limit || 100))
      .then(function(r){ return r.json(); }).catch(function(err){
        console.warn('[MetaLeaderboard] top error', err);
        return STUB_ROWS.slice(0, limit || 100);
      });
  }

  // GET /leaderboard/tower/around/:userId
  // Stub: builds synthetic slice from STUB_ROWS with player row inserted at correct rank.
  // On real failure, falls back to [ player-only row ] for graceful local-only display.
  function meAndAround() {
    const s = window.WG.State ? WG.State.get() : null;
    const myFloor = (s && s.towerProgress && s.towerProgress.peakFloor) || 0;
    console.log('[MetaLeaderboard] meAndAround — Phase 4 server swap', { myFloor });

    if (!BASE_URL) {
      const me = _stubMeRow(myFloor);
      const above = STUB_ROWS.filter(function(r){ return r.peakFloor > myFloor; }).slice(-2);
      const below = STUB_ROWS.filter(function(r){ return r.peakFloor < myFloor; }).slice(0, 2);
      const rows = above.concat([me]).concat(below).sort(function(a, b){ return b.peakFloor - a.peakFloor; });
      return Promise.resolve(rows);
    }

    return fetch(BASE_URL + '/leaderboard/tower/around/' + _userId())
      .then(function(r){
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function(data){ return data.rows || data; })
      .catch(function(err){
        console.warn('[MetaLeaderboard] meAndAround error — falling back to local', err);
        return [_stubMeRow(myFloor)];
      });
  }

  // ── Seed-powered leaderboard APIs ───────────────────────────────────────────
  // All use WG.LeaderboardSeeds (pre-launch: CF-001). Player's live stats are
  // inserted at the correct position. If the player falls outside the top-N
  // window, their row is appended as the last item (rank > n) so the UI can
  // render a separator + "your position" row without a second call.

  function _livePlayerRow() {
    const s     = window.WG.State ? WG.State.get() : null;
    const power = (window.WG.State && WG.State.recomputePower) ? WG.State.recomputePower() : 0;
    return {
      id:          _userId(),
      name:        'YOU',
      power:       power,
      towerFloor:  (s && s.towerProgress && s.towerProgress.peakFloor) || 0,
      duelRankPts: (s && s.duel && s.duel.rankPoints) || 0,
      isPlayer:    true,
    };
  }

  function _mergeTopN(seeds, compareFn, n) {
    const me     = _livePlayerRow();
    const merged = seeds.concat([me]).sort(compareFn);
    const ranked = merged.map(function(row, i) { return Object.assign({}, row, { rank: i + 1 }); });
    const topN   = ranked.slice(0, n);
    const inTop  = topN.some(function(r) { return r.isPlayer; });
    if (!inTop) {
      const myRank = ranked.find(function(r) { return r.isPlayer; });
      if (myRank) topN.push(myRank);
    }
    return topN;
  }

  // top N players sorted by Power; player inserted at correct rank.
  function getTopPlayers(n) {
    const seeds = window.WG.LeaderboardSeeds ? WG.LeaderboardSeeds.byPower() : [];
    return _mergeTopN(seeds, function(a,b){ return b.power - a.power; }, n || 10);
  }

  // top N players sorted by tower floor reached.
  function getTowerLeaderboard(n) {
    const seeds = window.WG.LeaderboardSeeds ? WG.LeaderboardSeeds.byFloor() : [];
    return _mergeTopN(seeds, function(a,b){ return b.towerFloor - a.towerFloor; }, n || 10);
  }

  // top N players sorted by duel rank points.
  function getDuelLadder(n) {
    const seeds = window.WG.LeaderboardSeeds ? WG.LeaderboardSeeds.byDuel() : [];
    return _mergeTopN(seeds, function(a,b){ return b.duelRankPts - a.duelRankPts; }, n || 10);
  }

  // top N alliances sorted by cumulative boss damage.
  function getAllianceLeaderboard(n) {
    const seeds = window.WG.LeaderboardSeeds ? WG.LeaderboardSeeds.byAllianceDmg() : [];
    return seeds.slice(0, n || 10).map(function(a, i) { return Object.assign({}, a, { rank: i + 1 }); });
  }

  function init() {}

  window.WG.MetaLeaderboard = {
    init,
    submit,
    top,
    meAndAround,
    getTopPlayers,
    getTowerLeaderboard,
    getDuelLadder,
    getAllianceLeaderboard,
  };
})();
