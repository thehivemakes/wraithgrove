// WG.MetaDailyReset — shared daily-reset infrastructure.
// W-Monetization-V2-Sub-Blockers §D
//
// checkAndReset() is called once per session boot (from wg-game.js init).
// If the local calendar date has advanced since the last recorded reset,
// it emits 'daily:reset'. All sub-systems subscribe to that event to clear
// their own daily counters — no centralized list required.
//
// All resets are LOCAL time (faithful to Path A / Wood Siege pattern).
(function(){'use strict';

  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' +
           String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0');
  }

  // Returns true if a reset fired, false if date unchanged.
  function checkAndReset() {
    const today = todayStr();
    const s = WG.State.get();
    if (!s.meta) s.meta = {};
    if (s.meta.lastResetDay === today) return false;
    s.meta.lastResetDay = today;
    WG.Engine.emit('daily:reset', { day: today });
    return true;
  }

  function init() {
    // W-Monetization-V2-Whale-Ladder §B — Royal Pass daily login +10 energy bonus
    WG.Engine.on('daily:reset', () => {
      if (WG.State.isRoyalPassActive && WG.State.isRoyalPassActive()) {
        WG.State.grantEnergy(10, 'royal-pass-daily');
        WG.Engine.emit('royal-pass:daily-bonus', { energy: 10 });
      }
    });
  }

  window.WG.MetaDailyReset = { init, checkAndReset, todayStr };
})();
