// WG.State — global persistent game state
(function(){'use strict';
  // W-Monetization-V2-Energy §A — energy economy tunables (frozen).
  // Drives entry-gating across Hunt + Tower; refunded on win, never on loss.
  const ENERGY_TUNABLES = Object.freeze({
    MAX:                 30,
    REGEN_INTERVAL_MS:   900000,  // 15 minutes per energy
    STAGE_COST:          5,
    WIN_REFUND:          3,
    LOSS_REFUND:         0,       // competence treadmill — no loss refund
    LOGIN_BONUS:         20,
    STREAK_7_BONUS:      50,
    FIRST_CLEAR_BONUS:   10,
  });

  const state = {
    version: 2,
    activeTab: 'hunt',
    firstLaunch: true,      // cleared to false after onboarding character pick
    firstLaunchStep: 0,     // 0=unstarted 1=welcome 2=lore 3=char-pick 4=complete
    currencies: { coins: 100, diamonds: 5, cards: 0, gems: 0 },
    energy: { current: ENERGY_TUNABLES.MAX, max: ENERGY_TUNABLES.MAX, lastRegenAt: 0 },
    player: {
      level: 1, xp: 0,
      ascendTier: 0,    // 0=Mortal, 1=Initiate, 2=Apprentice, 3=Adept, 4=Master, 5=Sage, 6=Immortal
      // SPEC §0/§12: 9-character roster. Each character has its own Rebirth-tier
      // ladder (the "skin" IS the current tier). Only the active character grants
      // its bonus. Default unlocked: lantern_acolyte at tier 1.
      activeCharacter: 'lantern_acolyte',
      ownedCharacters: ['lantern_acolyte'],
      characterTiers: { lantern_acolyte: 1 },
      highestStageCleared: 0,           // gates Rebirth tier unlocks
      slots: { melee: 'branch_stick', ranged: null, pet: null },
      stats: { attack: 5, hpMax: 100, hp: 100, gatherRate: 0, critRate: 0.05, defense: 0 },
    },
    huntProgress: {
      currentStage: 1,         // 1..18
      highestUnlocked: 1,
      bestWaves: {},           // stageId -> highest wave reached (decimal mins)
      nightModeUnlocked: {},   // stageId -> bool
    },
    forge: {
      // W-Monetization-V2-Sub-Blockers §C — passive craft resources with offline regen.
      wood: 250, woodLastRegenAt: 0,
      stone: 100, stoneLastRegenAt: 0,
      buildings: [
        { id: 'cave',      level: 1, unlocked: true,  slot: 0 },
        { id: 'forge',     level: 1, unlocked: true,  slot: 1 },
        { id: 'campfire',  level: 1, unlocked: true,  slot: 2 },
        { id: 'fence',     level: 0, unlocked: false, slot: 3 },
        { id: 'cannon',    level: 0, unlocked: false, slot: 4 },
        { id: 'blade',     level: 0, unlocked: false, slot: 5 },
        { id: 'bow',       level: 0, unlocked: false, slot: 6 },
        { id: 'sawtrap',   level: 0, unlocked: false, slot: 7 },
      ],
      craftFragments: 30,
      craftDailyUsed: 0,
      craftDailyMax: 10,
      lastDailyChestMs: 0,
      // 7-day streak tracker (Buildings tab Daily Chest)
      dailyStreakDay: 0,        // 0 means no claim yet; 1..7 cycles
      streakLastClaimMs: 0,     // ms of last claim — used to detect skip
    },
    relics: {
      owned: {},                // relicId -> { count, level }
      equipped: [],             // up to 6 relicIds
      activeRarityFilter: 'rare',
      freeSummonUsedToday: false,   // W-Monetization-V2-Sub-Blockers §B
    },
    duel: {
      rank: 'bronze',
      seasonId: 1,
      rankPoints: 0,
      dailyDuelsUsed: 0,
      dailyDuelsMax: 5,
      streak: 0,
    },
    iap: {
      premiumUnlock: false,        // ad-removal SKU; transferable across devices
      ownedSKUs: [],
      adRemovalActive: false,
      bundleLastPurchased: {},     // bundleId → ms of last purchase (weekly/monthly gating)
      starterCosmeticGranted: false,
    },
    subscriptions: {
      royalPass: { active: false, expiresAt: 0 },
    },
    gacha: {
      pity: { standard_mythic: 0, standard_legendary: 0 },
    },
    rift: {
      sigils: 0,                   // cumulative rift sigil count; floor(sigils/3) = unlocked guest slots
    },
    towerProgress: {
      peakFloor: 0,                // personal best floor in Tower Gauntlet (persisted across runs)
    },
    settings: {
      soundOn: true,
      musicOn: true,
      hapticsOn: true,
    },
    meta: {
      installTimeMs: 0,
      sessionsCount: 0,
      lastSaveMs: 0,
      lastResetDay: '',   // W-Monetization-V2-Sub-Blockers §D — YYYY-MM-DD local
    },
  };

  // Compute aggregate Power stat from all sources
  function recomputePower(){
    const p = state.player;
    let pwr = 0;
    pwr += p.level * 8;
    pwr += p.ascendTier * 120;
    pwr += p.stats.attack * 4;
    pwr += Math.floor(p.stats.hpMax / 4);
    // Active-character contribution (SPEC §0: only the actively-equipped
    // character grants bonus; current Rebirth tier supplies the power value).
    if (WG.AscendChars && typeof WG.AscendChars.activePower === 'function') {
      pwr += WG.AscendChars.activePower();
    }
    // Equipment
    for (const slot of ['melee','ranged','pet']) {
      const id = p.slots[slot];
      if (!id) continue;
      const wep = WG.HuntWeapons && WG.HuntWeapons.byId(id);
      if (wep) pwr += wep.power || 0;
    }
    // Forge buildings — each placed building contributes level × 50 to Power
    // (spec §9 marker: matches scr_02 economy — Power 1347 with mid-tier buildings).
    for (const b of state.forge.buildings) {
      if (b.unlocked) pwr += b.level * 50;
    }
    // Relics
    for (const id in state.relics.owned) {
      const r = state.relics.owned[id];
      pwr += r.count * 2 + r.level * 5;
    }
    return Math.floor(pwr);
  }

  function get(){ return state; }
  function setActiveTab(t){
    state.activeTab = t;
    WG.Engine.emit('tab:change', { tab: t });
  }

  function spend(currency, amount) {
    if (state.currencies[currency] == null) return false;
    if (state.currencies[currency] < amount) return false;
    state.currencies[currency] -= amount;
    WG.Engine.emit('currency:change', { currency, value: state.currencies[currency], delta: -amount });
    return true;
  }
  function grant(currency, amount) {
    if (state.currencies[currency] == null) state.currencies[currency] = 0;
    state.currencies[currency] += amount;
    WG.Engine.emit('currency:change', { currency, value: state.currencies[currency], delta: amount });
  }

  // W-Monetization-V2-Energy §A — energy lifecycle.
  // The "lastRegenAt" timestamp anchors the in-flight regen budget: when we
  // grant N integer points, we move the anchor forward by exactly
  // N * REGEN_INTERVAL_MS so the partial fractional progress is preserved.
  function getEnergy(){ return state.energy; }
  function spendEnergy(amount){
    if (state.energy.current < amount) return false;
    state.energy.current -= amount;
    WG.Engine.emit('energy:change', { value: state.energy.current, delta: -amount });
    return true;
  }
  function grantEnergy(amount, reason){
    const before = state.energy.current;
    state.energy.current = Math.min(state.energy.max, state.energy.current + amount);
    const delta = state.energy.current - before;
    if (delta > 0) WG.Engine.emit('energy:change', { value: state.energy.current, delta, reason: reason || 'grant' });
    return delta;
  }
  // Catch up regen since lastRegenAt — handles both the 60s in-app tick and
  // the cold-load case where the page was closed for hours.
  function processEnergyRegen(now){
    now = now || Date.now();
    const e = state.energy;
    if (e.current >= e.max) { e.lastRegenAt = now; return 0; }
    if (!e.lastRegenAt) { e.lastRegenAt = now; return 0; }
    const elapsed = now - e.lastRegenAt;
    if (elapsed < ENERGY_TUNABLES.REGEN_INTERVAL_MS) return 0;
    const granted = Math.floor(elapsed / ENERGY_TUNABLES.REGEN_INTERVAL_MS);
    const before = e.current;
    e.current = Math.min(e.max, e.current + granted);
    e.lastRegenAt += granted * ENERGY_TUNABLES.REGEN_INTERVAL_MS;
    if (e.current >= e.max) e.lastRegenAt = now; // freeze anchor at cap
    const actual = e.current - before;
    if (actual > 0) WG.Engine.emit('energy:change', { value: e.current, delta: actual, reason: 'regen' });
    return actual;
  }
  // ms until the next +1 energy tick (0 when at MAX).
  function nextRegenMs(now){
    now = now || Date.now();
    const e = state.energy;
    if (e.current >= e.max) return 0;
    if (!e.lastRegenAt) return ENERGY_TUNABLES.REGEN_INTERVAL_MS;
    const elapsed = now - e.lastRegenAt;
    return Math.max(0, ENERGY_TUNABLES.REGEN_INTERVAL_MS - elapsed);
  }

  let _energyTickHandle = 0;
  function startEnergyRegenTick(){
    if (_energyTickHandle) return;
    processEnergyRegen(Date.now());
    _energyTickHandle = setInterval(() => processEnergyRegen(Date.now()), 60000);
  }

  function isRoyalPassActive() {
    const rp = state.subscriptions.royalPass;
    return rp.active;
  }

  function init(){
    if (state.meta.installTimeMs === 0) state.meta.installTimeMs = Date.now();
    state.meta.sessionsCount = (state.meta.sessionsCount || 0) + 1;
    if (!state.energy.lastRegenAt) state.energy.lastRegenAt = Date.now();
    // Restore VIP energy cap if Royal Pass was active on last save
    if (state.subscriptions && state.subscriptions.royalPass && state.subscriptions.royalPass.active) {
      state.energy.max = ENERGY_TUNABLES.MAX + 20;
    }
    processEnergyRegen(Date.now());
    startEnergyRegenTick();
    WG.Engine.emit('state:init', { state });
  }

  window.WG.State = {
    get, init, setActiveTab, spend, grant, recomputePower,
    getEnergy, spendEnergy, grantEnergy, processEnergyRegen, nextRegenMs,
    isRoyalPassActive,
    ENERGY_TUNABLES,
  };
})();
