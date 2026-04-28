// WG.ForgeDaily — daily chest reward
(function(){'use strict';
  const DAY_MS = 24 * 60 * 60 * 1000;
  function isAvailable() {
    const last = WG.State.get().forge.lastDailyChestMs || 0;
    return Date.now() - last >= DAY_MS;
  }
  function tryClaim() {
    if (!isAvailable()) return { ok: false, reason: 'cooldown' };
    const day = Math.floor((Date.now() - WG.State.get().meta.installTimeMs) / DAY_MS) + 1;
    const reward = {
      coins: 100 + day * 30,
      diamonds: day % 7 === 0 ? 30 : (day % 3 === 0 ? 10 : 5),
      cards: 1 + Math.floor(day / 5),
      fragments: 5 + Math.floor(day / 4),
    };
    WG.State.grant('coins', reward.coins);
    WG.State.grant('diamonds', reward.diamonds);
    WG.State.grant('cards', reward.cards);
    WG.State.get().forge.craftFragments += reward.fragments;
    WG.State.get().forge.lastDailyChestMs = Date.now();
    WG.Engine.emit('daily:claimed', { reward });
    return { ok: true, reward };
  }
  function timeUntil() {
    const last = WG.State.get().forge.lastDailyChestMs || 0;
    const remaining = DAY_MS - (Date.now() - last);
    if (remaining <= 0) return 0;
    return remaining;
  }
  function init() {}
  window.WG.ForgeDaily = { init, isAvailable, tryClaim, timeUntil };
})();
