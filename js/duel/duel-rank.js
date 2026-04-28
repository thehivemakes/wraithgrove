// WG.DuelRank — ranked tier + season state
(function(){'use strict';
  const RANKS = [
    { id:'bronze',   name:'Bronze',     min: 0,    max: 199,   icon:'🥉' },
    { id:'silver',   name:'Silver',     min: 200,  max: 499,   icon:'🥈' },
    { id:'gold',     name:'Gold',       min: 500,  max: 999,   icon:'🥇' },
    { id:'platinum', name:'Platinum',   min: 1000, max: 1799,  icon:'💠' },
    { id:'diamond',  name:'Diamond',    min: 1800, max: 2999,  icon:'💎' },
    { id:'master',   name:'Master',     min: 3000, max: 4999,  icon:'👑' },
    { id:'grandmaster',name:'Grandmaster',min:5000, max: 99999,icon:'⚔' },
  ];
  function rankAt(points) {
    for (let i = RANKS.length - 1; i >= 0; i--) if (points >= RANKS[i].min) return RANKS[i];
    return RANKS[0];
  }
  function recordResult(won, opponentPower) {
    const s = WG.State.get();
    const myPower = WG.State.recomputePower();
    const ratio = opponentPower / Math.max(1, myPower);
    let delta;
    if (won) {
      // More points for beating stronger opponents
      delta = 12 + Math.round(8 * ratio);
      s.duel.streak = Math.max(0, s.duel.streak) + 1;
      if (s.duel.streak >= 3) delta += 4;
    } else {
      delta = -8 - Math.round(4 / Math.max(0.5, ratio));
      s.duel.streak = Math.min(0, s.duel.streak) - 1;
    }
    s.duel.rankPoints = Math.max(0, s.duel.rankPoints + delta);
    const newRank = rankAt(s.duel.rankPoints);
    if (newRank.id !== s.duel.rank) {
      s.duel.rank = newRank.id;
      WG.Engine.emit('duel:rank-change', { rank: newRank });
    }
    WG.Engine.emit('duel:result', { won, delta, rank: s.duel.rank });
    return { delta, rank: s.duel.rank };
  }
  function init() {}
  window.WG.DuelRank = { init, RANKS, rankAt, recordResult };
})();
