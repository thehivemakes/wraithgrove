// WG.DuelMatch — async PvP match resolver (Power-based)
(function(){'use strict';
  // W-Monetization-V2-Sub-Blockers §A — duel daily cap tunables.
  const TUNABLES = Object.freeze({
    MAX_DAILY_ATTEMPTS: 5,
    REFILL_GEMS:        30,   // 30💎 refills REFILL_AMOUNT attempts
    REFILL_AMOUNT:      5,
  });

  function dailyAvailable() {
    const s = WG.State.get().duel;
    return s.dailyDuelsUsed < TUNABLES.MAX_DAILY_ATTEMPTS;
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
    WG.Engine.emit('duel:match-result', { won });
    return { won, ...result, reward, myScore: Math.round(myScore), oppScore: Math.round(oppScore) };
  }
  function refillAttempts() {
    const s = WG.State.get();
    if (!WG.State.spend('diamonds', TUNABLES.REFILL_GEMS)) return { ok: false, reason: 'insufficient-diamonds' };
    s.duel.dailyDuelsUsed = Math.max(0, s.duel.dailyDuelsUsed - TUNABLES.REFILL_AMOUNT);
    WG.Engine.emit('duel:refill', { remaining: TUNABLES.MAX_DAILY_ATTEMPTS - s.duel.dailyDuelsUsed });
    return { ok: true };
  }

  function attemptsLeft() {
    const s = WG.State.get().duel;
    return Math.max(0, TUNABLES.MAX_DAILY_ATTEMPTS - s.dailyDuelsUsed);
  }

  function init() {
    WG.Engine.on('daily:reset', () => {
      WG.State.get().duel.dailyDuelsUsed = 0;
      WG.Engine.emit('duel:daily-reset', {});
    });
  }
  window.WG.DuelMatch = { init, dailyAvailable, startMatch, resolve, refillAttempts, attemptsLeft, TUNABLES };
})();
