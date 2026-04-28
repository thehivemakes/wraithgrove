// WG.State — global persistent game state
(function(){'use strict';
  const state = {
    version: 2,
    activeTab: 'hunt',
    currencies: { coins: 100, diamonds: 5, cards: 0 },
    player: {
      level: 1, xp: 0,
      ascendTier: 0,    // 0=Mortal, 1=Initiate, 2=Apprentice, 3=Adept, 4=Master, 5=Sage, 6=Immortal
      activeSkin: 'starter',
      ownedSkins: ['starter'],
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
    },
    relics: {
      owned: {},                // relicId -> { count, level }
      equipped: [],             // up to 6 relicIds
      activeRarityFilter: 'rare',
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
    // Skin contribution
    if (p.activeSkin && WG.AscendSkins) {
      const s = WG.AscendSkins.get(p.activeSkin);
      if (s) pwr += s.power || 0;
    }
    // Equipment
    for (const slot of ['melee','ranged','pet']) {
      const id = p.slots[slot];
      if (!id) continue;
      const wep = WG.HuntWeapons && WG.HuntWeapons.byId(id);
      if (wep) pwr += wep.power || 0;
    }
    // Forge buildings
    for (const b of state.forge.buildings) {
      if (b.unlocked) pwr += b.level * 6;
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

  function init(){
    if (state.meta.installTimeMs === 0) state.meta.installTimeMs = Date.now();
    state.meta.sessionsCount = (state.meta.sessionsCount || 0) + 1;
    WG.Engine.emit('state:init', { state });
  }

  window.WG.State = { get, init, setActiveTab, spend, grant, recomputePower };
})();
