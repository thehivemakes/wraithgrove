// WG.ForgeDaily — 24-hour Daily Chest with 7-day streak tracker.
//
// Streak rules:
//   - Each successful claim advances dailyStreakDay (1..7, then wraps).
//   - If the gap since the last claim exceeds STREAK_GRACE_MS the streak
//     resets to day 1 (skip a day -> lose progress).
//   - Day-7 claims hand out a bigger reward + a guaranteed Rare relic chance
//     (10 craft fragments, enough for one batch with bumped odds).
(function(){'use strict';
  const DAY_MS = 24 * 60 * 60 * 1000;
  // STREAK_GRACE_MS: 48h since last claim.  24h is the cooldown floor; the
  // grace gives the player ~24h after the chest re-arms before the streak
  // actually resets.  Same model as standard mobile-arena daily chests.
  const STREAK_GRACE_MS = 48 * 60 * 60 * 1000;

  // 7-day reward ladder.  Numbers are tunable here.
  const STREAK_REWARDS = [
    { day: 1, coins: 100,  diamonds: 5,   cards: 1, fragments: 5  },
    { day: 2, coins: 150,  diamonds: 5,   cards: 1, fragments: 5  },
    { day: 3, coins: 200,  diamonds: 10,  cards: 2, fragments: 6  },
    { day: 4, coins: 250,  diamonds: 10,  cards: 2, fragments: 7  },
    { day: 5, coins: 300,  diamonds: 15,  cards: 2, fragments: 8  },
    { day: 6, coins: 400,  diamonds: 20,  cards: 3, fragments: 9  },
    { day: 7, coins: 500,  diamonds: 100, cards: 5, fragments: 10, rareRelicChance: true },
  ];

  function isAvailable() {
    const last = WG.State.get().forge.lastDailyChestMs || 0;
    return Date.now() - last >= DAY_MS;
  }

  function timeUntil() {
    const last = WG.State.get().forge.lastDailyChestMs || 0;
    const remaining = DAY_MS - (Date.now() - last);
    if (remaining <= 0) return 0;
    return remaining;
  }

  // Day shown in the strip = the day the player will claim NEXT.
  function nextStreakDay() {
    const f = WG.State.get().forge;
    const last = f.streakLastClaimMs || 0;
    const cur  = f.dailyStreakDay || 0;
    if (cur === 0) return 1;
    if (Date.now() - last > STREAK_GRACE_MS) return 1; // streak broken
    return (cur % 7) + 1; // 1..7 wrap
  }

  function streakRewards() {
    return STREAK_REWARDS.slice();
  }

  function tryClaim() {
    if (!isAvailable()) return { ok: false, reason: 'cooldown' };
    const f = WG.State.get().forge;
    const day = nextStreakDay();
    const def = STREAK_REWARDS[day - 1];

    WG.State.grant('coins', def.coins);
    WG.State.grant('diamonds', def.diamonds);
    WG.State.grant('cards', def.cards);
    f.craftFragments += def.fragments;
    f.dailyStreakDay = day;
    f.streakLastClaimMs = Date.now();
    f.lastDailyChestMs  = Date.now();

    const reward = {
      coins: def.coins, diamonds: def.diamonds,
      cards: def.cards, fragments: def.fragments,
      day,
      rareRelicChance: !!def.rareRelicChance,
    };

    // Day 7 bonus — drop a single Rare-tier relic into the collection.
    if (def.rareRelicChance && WG.RelicsCatalog) {
      const list = WG.RelicsCatalog.byTier('rare');
      if (list && list.length) {
        const r = list[Math.floor(Math.random() * list.length)];
        const owned = WG.State.get().relics.owned;
        const slot = owned[r.id] || (owned[r.id] = { count: 0, level: 1 });
        slot.count++;
        reward.rareRelic = { id: r.id, name: r.name, icon: r.icon };
        WG.Engine.emit('relics:gained', { id: r.id });
      }
    }

    WG.Engine.emit('daily:claimed', { reward });
    return { ok: true, reward };
  }

  function init() {}
  window.WG.ForgeDaily = { init, isAvailable, tryClaim, timeUntil, nextStreakDay, streakRewards, STREAK_REWARDS };
})();
