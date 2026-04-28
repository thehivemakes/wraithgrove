// WG.DuelMatch — async PvP match resolver (Power-based)
(function(){'use strict';
  function dailyAvailable() {
    const s = WG.State.get().duel;
    return s.dailyDuelsUsed < s.dailyDuelsMax;
  }
  function startMatch() {
    if (!dailyAvailable()) return { ok: false, reason: 'daily-cap' };
    const myPower = WG.State.recomputePower();
    const opp = WG.DuelRoster.generateOpponent(myPower, WG.State.get().duel.rank);
    return { ok: true, opponent: opp, myPower };
  }
  function resolve(match) {
    // Simple resolution: weighted Power vs opponent Power with random factor
    const myAttack = WG.State.get().player.stats.attack * match.opponent.loadout.defenseProfile;
    const myDefense = WG.State.get().player.stats.defense * match.opponent.loadout.attackProfile;
    const myPower = WG.State.recomputePower();
    const oppAttack  = match.opponent.power * 0.18;
    const oppDefense = match.opponent.power * 0.10;
    const myScore  = myPower * (0.6 + Math.random() * 0.4) + myAttack * 4;
    const oppScore = match.opponent.power * (0.6 + Math.random() * 0.4) + oppAttack * 3 + oppDefense * 2;
    const won = myScore > oppScore;
    const result = WG.DuelRank.recordResult(won, match.opponent.power);
    // Reward
    const reward = won
      ? { coins: 80 + Math.floor(myPower * 0.05), diamonds: 1, cards: 0 }
      : { coins: 20, diamonds: 0, cards: 0 };
    if (won && WG.State.get().duel.streak % 5 === 0) reward.diamonds += 5;
    WG.State.grant('coins', reward.coins);
    if (reward.diamonds) WG.State.grant('diamonds', reward.diamonds);
    WG.State.get().duel.dailyDuelsUsed++;
    return { won, ...result, reward, myScore: Math.round(myScore), oppScore: Math.round(oppScore) };
  }
  function init() {}
  window.WG.DuelMatch = { init, dailyAvailable, startMatch, resolve };
})();
