// WG.ForgeBuildings — 8-building forge grid (W-Buildings-Redesign-V2)
//
// Category A (always relevant):       gold_mine, forge
// Category B (personal buff amplifiers): campfire, anvil
// Category C (raid stockpiles):       cannon_battery, bow_range, barracks, wall_workshop
//
// All buildings start unlocked. Progression is through leveling (max 20), not unlock gates.
// Strip unlockGS / weapon-tier side-effects are gone; each building has its own function.
(function(){'use strict';

  // ── ENCHANTMENTS catalog (Category B — Anvil) ─────────────────────────────
  // 6 types unlocked progressively as Anvil levels. Apply one scroll to weapon
  // before a stage/raid; effect expires after expiresStages or expiresRaids.
  const ENCHANTMENTS = Object.freeze({
    basic_dmg:       { name: 'Power Etching',    effect: '+15% melee dmg',        unlocksAtL: 1  },
    bleed_chain:     { name: 'Bleed Chain',       effect: 'hits apply bleed stack', unlocksAtL: 5  },
    crit_cascade:    { name: 'Crit Cascade',      effect: 'crits chain to nearby',  unlocksAtL: 10 },
    lifesteal_touch: { name: 'Lifesteal Touch',   effect: '8% lifesteal on hit',    unlocksAtL: 13 },
    frost_touch:     { name: 'Frost Touch',       effect: 'slow enemy 30% on hit',  unlocksAtL: 16 },
    void_pierce:     { name: 'Void Pierce',       effect: 'ignore 25% enemy armor', unlocksAtL: 20 },
  });

  // ── PROJECTILE_TYPES catalog (Category C — Cannon Battery) ────────────────
  // 6 types unlocked by Cannon Battery level. Player picks 3-type loadout pre-raid.
  const PROJECTILE_TYPES = Object.freeze({
    stone_shot:  { name: 'Stone Shot',  damage: 80, special: 'basic',            unlocksAtL: 1  },
    chain_shot:  { name: 'Chain Shot',  damage: 60, special: 'splash r60',       unlocksAtL: 5  },
    flame_shot:  { name: 'Flame Shot',  damage: 70, special: 'AOE + DOT 3s',     unlocksAtL: 10 },
    wraith_shot: { name: 'Wraith Shot', damage: 50, special: 'stun turrets 3s',  unlocksAtL: 15 },
    void_shot:   { name: 'Void Shot',   damage: 90, special: 'pierces walls',    unlocksAtL: 18 },
    storm_shot:  { name: 'Storm Shot',  damage: 75, special: 'chains 3 targets', unlocksAtL: 20 },
  });

  // ── DEFS ──────────────────────────────────────────────────────────────────
  const DEFS = Object.freeze({
    gold_mine:      { name: 'Gold Mine',      icon: '⛏', category: 'A', desc: 'Idle coin yield while offline — tap to collect' },
    forge:          { name: 'Forge',          icon: '🔨', category: 'A', desc: 'Daily free relic-craft slots' },
    campfire:       { name: 'Campfire',       icon: '🔥', category: 'B', desc: 'HP regen radius + night-mode torch protection' },
    anvil:          { name: 'Anvil',          icon: '🗡', category: 'B', desc: 'Produces weapon enchantment scrolls' },
    cannon_battery: { name: 'Cannon Battery', icon: '🎯', category: 'C', desc: 'Projectile stockpile for raids (6 types)' },
    bow_range:      { name: 'Bow Range',      icon: '🏹', category: 'C', desc: 'Archer regiments for raids' },
    barracks:       { name: 'Barracks',       icon: '⚔', category: 'C', desc: 'Footmen squads — tank role in raids' },
    wall_workshop:  { name: 'Wall Workshop',  icon: '🪵', category: 'C', desc: 'Wall segments for base defense layout' },
  });

  const MAX_LEVEL = 20;

  // ── UNLOCK TABLES (cumulative per-level new IDs) ──────────────────────────
  const _CANNON_UNLOCKS = {
    1: ['stone_shot'], 5: ['chain_shot'], 10: ['flame_shot'],
    15: ['wraith_shot'], 18: ['void_shot'], 20: ['storm_shot'],
  };
  const _ANVIL_UNLOCKS = {
    1: ['basic_dmg'], 5: ['bleed_chain'], 10: ['crit_cascade'],
    13: ['lifesteal_touch'], 16: ['frost_touch'], 20: ['void_pierce'],
  };

  // ── PER-LEVEL SCALING FUNCTIONS ───────────────────────────────────────────

  // Gold Mine: coins/hr. L1=50, +30/level. L20=620.
  function yieldAt(level) { return level * 30 + 20; }

  // Gold Mine: storage cap in coins. Cap hours: L1=8h → L20=24h (linear).
  function capAt(level) {
    const hours = 8 + (level - 1) * 16 / 19; // W-Balance-Flags-Action: base was 2h (reason: L1 2h cap = 100 coins, casual once-daily player loses 92% of production — 121 days to afford L5 upgrades. 8h base → 400 coins L1, viable idle income from D1)
    return Math.round(yieldAt(level) * hours);
  }

  // Forge: free craft slots per day. L1=1, L20=5.
  function craftSlotsAt(level) { return 1 + Math.floor((level - 1) * 4 / 19); }
  function hasGuaranteedEpicAt(level) { return level >= 20; }

  // Campfire: regen/sec (1→4) and radius (60→100).
  function campfireRegenAt(level)  { return parseFloat((1 + (level - 1) * 3 / 19).toFixed(2)); }
  function campfireRadiusAt(level) { return Math.round(60 + (level - 1) * 40 / 19); }

  // Anvil: enchantment scrolls produced per day. L1=1, L10≈3, L20=5.
  function anvilScrollsAt(level) { return 1 + Math.round((level - 1) * 4 / 19); }

  // Cannon Battery: shot cap. L1=6, L20=12.
  function shotCapAt(level) { return 6 + Math.round((level - 1) * 6 / 19); }

  // Bow Range: archer count and captains per squad.
  function archerCountAt(level) {
    if (level < 5)  return 5;
    if (level < 10) return 8;
    if (level < 15) return 12;
    if (level < 20) return 15;
    return 18;
  }
  function archerCaptainsAt(level) {
    if (level < 15) return 0;
    if (level < 20) return 1;
    return 2;
  }

  // Barracks: footman count and captains per squad.
  function footmanCountAt(level) {
    if (level < 5)  return 3;
    if (level < 10) return 5;
    if (level < 15) return 8;
    return 10;
  }
  function footmanCaptainsAt(level) {
    if (level < 10) return 0;
    if (level < 15) return 1;
    return 2;
  }

  // Wall Workshop: wall segment cap. L1=6, L5=8, L10=10, L15=12, L20=14.
  function wallCountAt(level) {
    if (level < 5)  return 6;
    if (level < 10) return 8;
    if (level < 15) return 10;
    if (level < 20) return 12;
    return 14;
  }

  // Refill interval (ms) per unit for each C-category building.
  function refillIntervalMs(id) {
    switch (id) {
      case 'cannon_battery': return 30 * 60 * 1000;      // 30 min per shot
      case 'bow_range':      return 4 * 60 * 60 * 1000;  // 4h per squad
      case 'barracks':       return 4 * 60 * 60 * 1000;  // 4h per squad
      case 'wall_workshop':  return 90 * 60 * 1000;       // 90 min per wall segment
      default: return 0;
    }
  }

  // IDs newly unlocked at this exact level for this building.
  function unlocksAt(id, level) {
    if (id === 'cannon_battery') return _CANNON_UNLOCKS[level] || [];
    if (id === 'anvil')          return _ANVIL_UNLOCKS[level]  || [];
    return [];
  }

  // Cumulative available IDs at a given level (for picker UI).
  function availableProjectilesAt(level) {
    return Object.keys(PROJECTILE_TYPES).filter(k => PROJECTILE_TYPES[k].unlocksAtL <= level);
  }
  function availableEnchantmentsAt(level) {
    return Object.keys(ENCHANTMENTS).filter(k => ENCHANTMENTS[k].unlocksAtL <= level);
  }

  // ── CORE API ───────────────────────────────────────────────────────────────
  function get(id) { return DEFS[id]; }

  // Upgrade cost: quadratic curve, halved for levels 1-5 to ease early casual access.
  // L1→2: 60 (was 120), L2→3: 120 (was 240), L3→4: 220 (was 440), L4→5: 360 (was 720),
  // L5→6: 540 (was 1080). Full formula resumes at L6+.
  // Source: BALANCE_AUDIT §5 G5 — "halve the formula for levels 1–5: floor(40 + level² × 20)"
  function upgradeCost(b) {
    return b.level <= 5
      ? Math.floor(40 + b.level * b.level * 20)
      : Math.floor(80 + b.level * b.level * 40);
  }

  function tryUpgrade(id) {
    const s = WG.State.get();
    const b = s.forge.buildings.find(x => x.id === id);
    if (!b) return { ok: false, reason: 'unknown' };
    if (b.level >= MAX_LEVEL) return { ok: false, reason: 'max' };
    const cost = upgradeCost(b);
    if (!WG.State.spend('coins', cost)) return { ok: false, reason: 'insufficient', cost };
    b.level++;
    if (id === 'forge') s.forge.craftDailyMax = craftSlotsAt(b.level);
    const newUnlocks = unlocksAt(id, b.level);
    WG.Engine.emit('forge:upgrade', { id, level: b.level, newUnlocks });
    return { ok: true, level: b.level, newUnlocks };
  }

  // Gold Mine tap-collect: move mineStored to coins.
  function collectMine() {
    const f = WG.State.get().forge;
    const stored = f.mineStored || 0;
    if (stored <= 0) return { ok: false, reason: 'empty' };
    WG.State.grant('coins', stored);
    f.mineStored = 0;
    WG.Engine.emit('forge:mine-collected', { amount: stored });
    return { ok: true, amount: stored };
  }

  // Apply enchantment scroll from Anvil inventory to weapon.
  // Decrement one scroll; expires after 3 stages or 1 raid.
  function applyEnchantment(enchId) {
    const f = WG.State.get().forge;
    const scrolls = f.enchantmentScrolls;
    if ((scrolls[enchId] || 0) <= 0) return { ok: false, reason: 'no-scroll' };
    scrolls[enchId]--;
    f.equippedEnchantment = { type: enchId, expiresStages: 3, expiresRaids: 1 };
    WG.Engine.emit('forge:enchantment-applied', { enchId });
    return { ok: true };
  }

  // ── IDLE TICK (Gold Mine — runs every frame, accumulates to mineStored) ────
  let _mineAccum = 0;
  function tickIdle(dt) {
    _mineAccum += dt;
    if (_mineAccum < 1) return;
    const f = WG.State.get().forge;
    const mine = f.buildings.find(b => b.id === 'gold_mine');
    if (mine) {
      const ratePerSec = yieldAt(mine.level) / 3600;
      const cap = capAt(mine.level);
      const earned = Math.floor(ratePerSec * _mineAccum);
      if (earned > 0 && (f.mineStored || 0) < cap) {
        f.mineStored = Math.min(cap, (f.mineStored || 0) + earned);
        WG.Engine.emit('forge:mine-tick', { stored: f.mineStored });
      }
    }
    // gatherRate stat still grants directly (it's a player stat, not a building)
    const gatherBonus = WG.State.get().player.stats.gatherRate * 4;
    if (gatherBonus > 0) WG.State.grant('coins', Math.floor(gatherBonus * _mineAccum));
    _mineAccum = 0;
  }

  // Offline catch-up for Gold Mine: compute yield for (now - mineLastTickAt).
  function processMineAccumulation(now) {
    now = now || Date.now();
    const f = WG.State.get().forge;
    const mine = f.buildings.find(b => b.id === 'gold_mine');
    if (!mine) return;
    if (!f.mineLastTickAt) { f.mineLastTickAt = now; return; }
    const elapsedHrs = (now - f.mineLastTickAt) / 3600000;
    if (elapsedHrs <= 0) return;
    const cap = capAt(mine.level);
    const earned = Math.floor(yieldAt(mine.level) * elapsedHrs);
    if (earned > 0) f.mineStored = Math.min(cap, (f.mineStored || 0) + earned);
    f.mineLastTickAt = now;
    WG.Engine.emit('forge:mine-tick', { stored: f.mineStored });
  }

  // ── RAID STOCKPILE REFILL TICK ─────────────────────────────────────────────
  // Called on init (offline catch-up) and every 30s via setInterval.
  function processStockRefills(now) {
    now = now || Date.now();
    const f  = WG.State.get().forge;
    const bl = f.buildings;

    // Cannon Battery: 1 shot per 30 min up to shotCapAt(level).
    const cannB = bl.find(b => b.id === 'cannon_battery');
    if (cannB) {
      const cap = shotCapAt(cannB.level);
      if (f.stocks.cannon_shots.length < cap) {
        const iMs  = refillIntervalMs('cannon_battery');
        const last = f.nextRefillAt.cannon_shots || now;
        if (now > last) {
          const count = Math.min(Math.floor((now - last) / iMs), cap - f.stocks.cannon_shots.length);
          if (count > 0) {
            for (let i = 0; i < count; i++) f.stocks.cannon_shots.push('stone_shot');
            f.nextRefillAt.cannon_shots = last + count * iMs;
          }
        }
      } else {
        f.nextRefillAt.cannon_shots = now;
      }
    }

    // Bow Range: full archer squad every 4h (max 1 squad ready at a time).
    const bowB = bl.find(b => b.id === 'bow_range');
    if (bowB && f.stocks.archer_squads < 1) {
      const iMs  = refillIntervalMs('bow_range');
      const last = f.nextRefillAt.archer_squads || now;
      if (now - last >= iMs) {
        f.stocks.archer_squads = 1;
        f.nextRefillAt.archer_squads = now;
      }
    } else if (bowB && f.stocks.archer_squads >= 1) {
      f.nextRefillAt.archer_squads = now;
    }

    // Barracks: full footman squad every 4h (max 1 squad ready at a time).
    const barrB = bl.find(b => b.id === 'barracks');
    if (barrB && f.stocks.footman_squads < 1) {
      const iMs  = refillIntervalMs('barracks');
      const last = f.nextRefillAt.footman_squads || now;
      if (now - last >= iMs) {
        f.stocks.footman_squads = 1;
        f.nextRefillAt.footman_squads = now;
      }
    } else if (barrB && f.stocks.footman_squads >= 1) {
      f.nextRefillAt.footman_squads = now;
    }

    // Wall Workshop: 1 wall segment per 90 min up to wallCountAt(level).
    const wallB = bl.find(b => b.id === 'wall_workshop');
    if (wallB) {
      const cap = wallCountAt(wallB.level);
      if (f.stocks.walls.length < cap) {
        const iMs  = refillIntervalMs('wall_workshop');
        const last = f.nextRefillAt.walls || now;
        if (now > last) {
          const count = Math.min(Math.floor((now - last) / iMs), cap - f.stocks.walls.length);
          if (count > 0) {
            for (let i = 0; i < count; i++) f.stocks.walls.push({ hp: 200, variant: 'basic' });
            f.nextRefillAt.walls = last + count * iMs;
          }
        }
      } else {
        f.nextRefillAt.walls = now;
      }
    }
  }

  // ── WOOD + STONE (relic crafting resources — unchanged) ───────────────────
  const TUNABLES = Object.freeze({
    WOOD_CAP: 500, WOOD_REGEN_MS: 30000,
    STONE_CAP: 200, STONE_REGEN_MS: 60000,
    WOOD_REFILL_GEMS: 25, WOOD_REFILL_AMT: 200,
    STONE_REFILL_GEMS: 25, STONE_REFILL_AMT: 100,
  });
  const WOOD_PER_CRAFT  = 20;
  const STONE_PER_CRAFT = 10;

  function _processRegen(resource, regenKey, cap, regenMs, now) {
    const f = WG.State.get().forge;
    if (f[resource] >= cap) { f[regenKey] = now; return 0; }
    if (!f[regenKey])       { f[regenKey] = now; return 0; }
    const elapsed = now - f[regenKey];
    if (elapsed < regenMs) return 0;
    const granted = Math.floor(elapsed / regenMs);
    const before  = f[resource];
    f[resource] = Math.min(cap, f[resource] + granted);
    f[regenKey] += granted * regenMs;
    if (f[resource] >= cap) f[regenKey] = now;
    const actual = f[resource] - before;
    if (actual > 0) WG.Engine.emit('forge:resources-change', { wood: f.wood, stone: f.stone });
    return actual;
  }
  function processResourceRegen(now) {
    now = now || Date.now();
    _processRegen('wood',  'woodLastRegenAt',  TUNABLES.WOOD_CAP,  TUNABLES.WOOD_REGEN_MS,  now);
    _processRegen('stone', 'stoneLastRegenAt', TUNABLES.STONE_CAP, TUNABLES.STONE_REGEN_MS, now);
  }
  function nextWoodRegenMs(now) {
    now = now || Date.now();
    const f = WG.State.get().forge;
    if (f.wood >= TUNABLES.WOOD_CAP) return 0;
    if (!f.woodLastRegenAt) return TUNABLES.WOOD_REGEN_MS;
    return Math.max(0, TUNABLES.WOOD_REGEN_MS - (now - f.woodLastRegenAt));
  }
  function nextStoneRegenMs(now) {
    now = now || Date.now();
    const f = WG.State.get().forge;
    if (f.stone >= TUNABLES.STONE_CAP) return 0;
    if (!f.stoneLastRegenAt) return TUNABLES.STONE_REGEN_MS;
    return Math.max(0, TUNABLES.STONE_REGEN_MS - (now - f.stoneLastRegenAt));
  }
  function getResources() { const f = WG.State.get().forge; return { wood: f.wood, stone: f.stone }; }
  function refillWood() {
    if (!WG.State.spend('diamonds', TUNABLES.WOOD_REFILL_GEMS)) return { ok: false, reason: 'insufficient-diamonds' };
    const f = WG.State.get().forge;
    f.wood = Math.min(TUNABLES.WOOD_CAP, f.wood + TUNABLES.WOOD_REFILL_AMT);
    WG.Engine.emit('forge:resources-change', { wood: f.wood, stone: f.stone });
    return { ok: true };
  }
  function refillStone() {
    if (!WG.State.spend('diamonds', TUNABLES.STONE_REFILL_GEMS)) return { ok: false, reason: 'insufficient-diamonds' };
    const f = WG.State.get().forge;
    f.stone = Math.min(TUNABLES.STONE_CAP, f.stone + TUNABLES.STONE_REFILL_AMT);
    WG.Engine.emit('forge:resources-change', { wood: f.wood, stone: f.stone });
    return { ok: true };
  }
  function canCraft() {
    const f = WG.State.get().forge;
    return f.wood >= WOOD_PER_CRAFT && f.stone >= STONE_PER_CRAFT;
  }
  function spendCraftResources() {
    const f = WG.State.get().forge;
    if (f.wood < WOOD_PER_CRAFT || f.stone < STONE_PER_CRAFT) return false;
    f.wood  -= WOOD_PER_CRAFT;
    f.stone -= STONE_PER_CRAFT;
    WG.Engine.emit('forge:resources-change', { wood: f.wood, stone: f.stone });
    return true;
  }

  // ── INIT ──────────────────────────────────────────────────────────────────
  let _tickHandle = 0;
  function init() {
    WG.Engine.on('tick', ({ dt }) => tickIdle(dt));
    processMineAccumulation(Date.now());
    processResourceRegen(Date.now());
    processStockRefills(Date.now());
    if (!_tickHandle) _tickHandle = setInterval(() => {
      processResourceRegen(Date.now());
      processStockRefills(Date.now());
    }, 30000);
  }

  window.WG.ForgeBuildings = {
    init, get, DEFS, TUNABLES, MAX_LEVEL,
    ENCHANTMENTS, PROJECTILE_TYPES,
    // per-level scaling
    yieldAt, capAt, craftSlotsAt, hasGuaranteedEpicAt,
    campfireRegenAt, campfireRadiusAt,
    anvilScrollsAt, shotCapAt,
    archerCountAt, archerCaptainsAt,
    footmanCountAt, footmanCaptainsAt,
    wallCountAt, refillIntervalMs,
    unlocksAt, availableProjectilesAt, availableEnchantmentsAt,
    // actions
    tryUpgrade, upgradeCost, collectMine, applyEnchantment,
    // ticks
    tickIdle, processMineAccumulation, processStockRefills,
    // craft resources (for forge-craft.js compatibility)
    processResourceRegen, nextWoodRegenMs, nextStoneRegenMs,
    getResources, refillWood, refillStone, canCraft, spendCraftResources,
    WOOD_PER_CRAFT, STONE_PER_CRAFT,
  };
})();
