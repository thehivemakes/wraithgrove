// WG.AscendSkins — character roster + Rebirth-tier appearances
// SPEC §0: 9 characters, character SWAP (NOT team passive — only active grants bonus),
// skin = Rebirth-tier appearance per character (each character has multiple tiers
// unlocked via Rebirth events at stage clears). All names IP-clean Wraithgrove originals.
(function(){'use strict';

  // 9 character archetypes per HD source (observation §J.2). Each has multiple
  // Rebirth tiers — a character's "skin" IS its current tier. Tier 1 unlocked
  // by default for `lantern_acolyte`; others gated by IAP / progression.
  const CHARACTERS = {
    lantern_acolyte: {
      id: 'lantern_acolyte', name: 'Lantern Acolyte', archetype: 'schoolgirl',
      unlocked: true, defaultTier: 1,
      bonus: { teamAtk: 0.02, teamHp: 0.02, special: 'Wood-chop XP +5%' },
      tiers: [
        { tier: 1, name: 'Lantern Acolyte',   power:   0, color: '#f0e8d0', accent: '#a82838' },
        { tier: 2, name: 'Wandering Lantern', power:  60, color: '#a87838', accent: '#ffd870', requiresStageClear: 1 },
        { tier: 3, name: 'Lantern Bride',     power: 240, color: '#e8d0d8', accent: '#a82828', requiresStageClear: 4 },
        { tier: 4, name: 'Crowned Vigil',     power: 1200, color: '#d8a838', accent: '#ffe888', requiresStageClear: 12 },
      ],
    },
    sigil_student: {
      id: 'sigil_student', name: 'Sigil Student', archetype: 'white_haired',
      unlocked: false, defaultTier: 1,
      cost: { diamonds: 80 },
      bonus: { teamAtk: 0.04, teamHp: 0.01, special: 'Crit chance +3%' },
      tiers: [
        { tier: 1, name: 'Sigil Student', power:  90, color: '#f0e8d8', accent: '#a8a8a8' },
        { tier: 2, name: 'Talisman Adept', power: 360, color: '#d8c8a0', accent: '#604058', requiresStageClear: 6 },
        { tier: 3, name: 'Pale Reader',    power: 900, color: '#f8f0e8', accent: '#3a2858', requiresStageClear: 14 },
      ],
    },
    horned_oni: {
      id: 'horned_oni', name: 'Horned Oni', archetype: 'samurai',
      unlocked: false, defaultTier: 1,
      cost: { diamonds: 200 },
      bonus: { teamAtk: 0.06, teamHp: 0.03, special: 'Melee damage +8%' },
      tiers: [
        { tier: 1, name: 'Horned Oni',      power: 180, color: '#a82828', accent: '#ffc850' },
        { tier: 2, name: 'Iron Oni',        power: 540, color: '#601818', accent: '#a8a8a8', requiresStageClear: 8 },
        { tier: 3, name: 'Crimson Daimyo',  power: 1500, color: '#601020', accent: '#ffd870', requiresStageClear: 16 },
      ],
    },
    paper_priest: {
      id: 'paper_priest', name: 'Paper Priest', archetype: 'jiangshi',
      unlocked: false, defaultTier: 1,
      cost: { diamonds: 150 },
      bonus: { teamAtk: 0.03, teamHp: 0.05, special: 'Night-mode darkness slowed 20%' },
      tiers: [
        { tier: 1, name: 'Paper Priest',  power: 120, color: '#3a2018', accent: '#f8e8c8' },
        { tier: 2, name: 'Talisman Walker', power: 420, color: '#604030', accent: '#fff0c0', requiresStageClear: 7 },
        { tier: 3, name: 'Mortuary Master', power: 1100, color: '#1a1020', accent: '#a060ff', requiresStageClear: 15 },
      ],
    },
    silent_seer: {
      id: 'silent_seer', name: 'Silent Seer', archetype: 'seated_grim',
      unlocked: false, defaultTier: 1,
      cost: { diamonds: 500 },  // premium
      bonus: { teamAtk: 0.05, teamHp: 0.08, special: 'Build cost -15%' },
      tiers: [
        { tier: 1, name: 'Silent Seer', power: 300, color: '#2a1820', accent: '#a89848' },
        { tier: 2, name: 'Throned Seer', power: 1200, color: '#3a1018', accent: '#ffd870', requiresStageClear: 12 },
      ],
    },
    scythe_widow: {
      id: 'scythe_widow', name: 'Scythe Widow', archetype: 'hooded_reaper',
      unlocked: false, defaultTier: 1,
      cost: { diamonds: 250 },
      bonus: { teamAtk: 0.07, teamHp: 0.02, special: 'Scythe range +12%' },
      tiers: [
        { tier: 1, name: 'Scythe Widow',  power: 200, color: '#1a1018', accent: '#8a8898' },
        { tier: 2, name: 'Veil Reaper',   power: 600, color: '#0a0a18', accent: '#c060ff', requiresStageClear: 9 },
        { tier: 3, name: 'Hollow Empress', power: 1600, color: '#101830', accent: '#ffe0a0', requiresStageClear: 17 },
      ],
    },
    ash_brawler: {
      id: 'ash_brawler', name: 'Ash Brawler', archetype: 'afro_brawler',
      unlocked: false, defaultTier: 1,
      cost: { diamonds: 220 },
      bonus: { teamAtk: 0.08, teamHp: 0.04, special: 'Knockback on hit' },
      tiers: [
        { tier: 1, name: 'Ash Brawler',  power: 240, color: '#3a2820', accent: '#ffa848' },
        { tier: 2, name: 'Cinder Champion', power: 800, color: '#1a1010', accent: '#ff8040', requiresStageClear: 11 },
      ],
    },
    fox_kabuki: {
      id: 'fox_kabuki', name: 'Fox Kabuki', archetype: 'fox_mask',
      unlocked: false, defaultTier: 1,
      cost: { diamonds: 180 },
      bonus: { teamAtk: 0.05, teamHp: 0.04, special: 'Coin drops +20%' },
      tiers: [
        { tier: 1, name: 'Fox Kabuki', power: 150, color: '#a82828', accent: '#ffe0a0' },
        { tier: 2, name: 'Nine-Tail Dancer', power: 480, color: '#80101a', accent: '#fff0c0', requiresStageClear: 8 },
        { tier: 3, name: 'Kitsune Empress',  power: 1300, color: '#481020', accent: '#ffd870', requiresStageClear: 14 },
      ],
    },
    cap_apprentice: {
      id: 'cap_apprentice', name: 'Cap Apprentice', archetype: 'cap_boy',
      unlocked: false, defaultTier: 1,
      cost: { diamonds: 60 },
      bonus: { teamAtk: 0.02, teamHp: 0.03, special: 'Wood gather +10%' },
      tiers: [
        { tier: 1, name: 'Cap Apprentice', power:  80, color: '#404038', accent: '#80c8e0' },
        { tier: 2, name: 'Hooded Wanderer', power: 320, color: '#202830', accent: '#a8d8e8', requiresStageClear: 5 },
      ],
    },
  };

  function get(id) { return CHARACTERS[id]; }
  function list() { return Object.values(CHARACTERS); }

  // The CURRENT tier of the active character (its "skin"). Power read from this.
  function currentTier(id) {
    const c = get(id);
    if (!c) return null;
    const ps = WG.State.get().player;
    const ownedTiers = (ps.characterTiers && ps.characterTiers[id]) || c.defaultTier;
    return c.tiers.find(t => t.tier === ownedTiers) || c.tiers[0];
  }

  function tryUnlock(id) {
    const c = get(id);
    if (!c) return { ok: false, reason: 'unknown' };
    const ps = WG.State.get().player;
    ps.ownedCharacters = ps.ownedCharacters || [];
    if (ps.ownedCharacters.includes(id)) return { ok: false, reason: 'already-owned' };
    const cost = c.cost || {};
    for (const cur of ['coins','diamonds','cards']) {
      if (cost[cur] && WG.State.get().currencies[cur] < cost[cur]) return { ok: false, reason: 'insufficient-' + cur };
    }
    for (const cur of ['coins','diamonds','cards']) {
      if (cost[cur]) WG.State.spend(cur, cost[cur]);
    }
    ps.ownedCharacters.push(id);
    ps.characterTiers = ps.characterTiers || {};
    ps.characterTiers[id] = c.defaultTier;
    WG.Engine.emit('character:unlocked', { character: c });
    return { ok: true, character: c };
  }

  // Set active character — only the active grants bonus (SPEC §0).
  function setActive(id) {
    const ps = WG.State.get().player;
    ps.ownedCharacters = ps.ownedCharacters || ['lantern_acolyte'];
    if (!ps.ownedCharacters.includes(id)) return { ok: false, reason: 'locked' };
    ps.activeCharacter = id;
    WG.Engine.emit('character:active-change', { character: get(id), tier: currentTier(id) });
    return { ok: true };
  }

  // Cultivate cost ladder per next-tier index. Anchors SPEC §8's "~2880 coins"
  // to the tier-3 advance (Lantern Bride), with geometric growth above that.
  // Tier 2 advances are intentionally cheap to teach the Rebirth UX early.
  // Beyond tier 4 falls back to power × 12 to support future-tier additions.
  const CULTIVATE_LADDER = { 2: 800, 3: 2880, 4: 14400 };
  function rebirthCost(id) {
    const c = get(id);
    if (!c) return 0;
    const ps = WG.State.get().player;
    const currentTierIdx = (ps.characterTiers && ps.characterTiers[id]) || c.defaultTier || 1;
    const next = c.tiers.find(t => t.tier === currentTierIdx + 1);
    if (!next) return 0;
    return CULTIVATE_LADDER[next.tier] || Math.max(800, next.power * 12);
  }

  // Rebirth — advance the active character to next tier if eligible.
  // Eligibility: stage cleared with id ≥ tier.requiresStageClear AND coins >= rebirthCost.
  function tryRebirth(id, opts) {
    const c = get(id);
    if (!c) return { ok: false, reason: 'unknown' };
    const ps = WG.State.get().player;
    const currentTierIdx = (ps.characterTiers && ps.characterTiers[id]) || c.defaultTier || 1;
    const next = c.tiers.find(t => t.tier === currentTierIdx + 1);
    if (!next) return { ok: false, reason: 'max-tier' };
    const requireStage = next.requiresStageClear || 0;
    const highest = (ps.highestStageCleared || 0);
    if (highest < requireStage) return { ok: false, reason: 'stage-locked', need: requireStage };
    const cost = (opts && opts.cost != null) ? opts.cost : rebirthCost(id);
    if (WG.State.get().currencies.coins < cost) return { ok: false, reason: 'insufficient-coins', need: cost };
    WG.State.spend('coins', cost);
    ps.characterTiers = ps.characterTiers || {};
    ps.characterTiers[id] = next.tier;
    WG.Engine.emit('character:rebirth', { character: c, fromTier: currentTierIdx, toTier: next.tier, rewards: { skin: 1, diamonds: 100, hammer: 10 } });
    return { ok: true, newTier: next };
  }

  // Active character's bonus — applied to player stats by ascend-character recompute.
  function activeBonus() {
    const ps = WG.State.get().player;
    const id = ps.activeCharacter || 'lantern_acolyte';
    const c = get(id);
    return c ? c.bonus : { teamAtk: 0, teamHp: 0, special: '' };
  }

  // Power contribution from active character's current tier.
  function activePower() {
    const ps = WG.State.get().player;
    const id = ps.activeCharacter || 'lantern_acolyte';
    const t = currentTier(id);
    return t ? t.power : 0;
  }

  function init() {
    // Migrate legacy ownedSkins → ownedCharacters on first load.
    const ps = WG.State.get().player;
    if (ps.ownedSkins && !ps.ownedCharacters) {
      ps.ownedCharacters = ['lantern_acolyte'];
      ps.activeCharacter = 'lantern_acolyte';
      ps.characterTiers = { lantern_acolyte: 1 };
    }
  }

  // Backwards-compat aliases for any code still calling skin-named functions.
  window.WG.AscendSkins = {
    init, get, list, tryUnlock, trySetActive: setActive, SKINS: CHARACTERS,
    // Roster API:
    setActive, currentTier, tryRebirth, rebirthCost, activeBonus, activePower,
    CHARACTERS,
  };
  // Also alias as AscendChars for clarity.
  window.WG.AscendChars = window.WG.AscendSkins;
})();
