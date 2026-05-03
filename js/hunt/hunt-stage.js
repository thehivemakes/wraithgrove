// WG.HuntStage — 18 stage definitions across 6 biomes
(function(){'use strict';
  // Biomes: forest_summer / forest_autumn / cold_stone / temple / cave / eldritch
  // Each stage: { id, name, biome, durationSec, enemyMix, bossId, weaponPickups, notes }
  const BIOMES = {
    forest_summer: {
      ground:   '#1a3018',
      groundAlt:'#15281a',
      tree:     '#0a1a0a',
      treeBark: '#06120a',
      ambient:  '#000',
      lightFog: 0.0,
      decoration:'grass-tufts',
    },
    cold_stone: {
      ground:   '#3a4258',
      groundAlt:'#2a324a',
      tree:     '#1a2030',
      treeBark: '#0a1018',
      ambient:  '#10182a',
      lightFog: 0.15,
      decoration:'snow-flecks',
    },
    forest_autumn: {
      ground:   '#5a3018',
      groundAlt:'#3a2010',
      tree:     '#a04018',
      treeBark: '#5a1c08',
      ambient:  '#000',
      lightFog: 0.08,
      decoration:'leaves',
    },
    temple: {
      ground:   '#3a302a',
      groundAlt:'#2a2218',
      tree:     '#1a1410',
      treeBark: '#0c0a08',
      ambient:  '#100808',
      lightFog: 0.12,
      decoration:'tiles',
    },
    cave: {
      ground:   '#1c1a18',
      groundAlt:'#100e0c',
      tree:     '#0a0806',
      treeBark: '#000',
      ambient:  '#000',
      lightFog: 0.45,
      decoration:'rocks',
    },
    eldritch: {
      ground:   '#1a0820',
      groundAlt:'#10041a',
      tree:     '#3a1844',
      treeBark: '#1a0a20',
      ambient:  '#10042a',
      lightFog: 0.22,
      decoration:'sigils',
    },
  };

  // Difficulty curve — 18 stages across 6 biome clusters of 3.
  // Each cluster ends with the longest stage (boss-stage). Pre-boss stages ramp within cluster.
  // Cross-cluster step ~25s. Durations (s):
  //   Stages  1-3  (forest_summer): 150, 165, 195
  //   Stages  4-6  (cold_stone):    195, 215, 240
  //   Stages  7-9  (forest_autumn): 220, 240, 270
  //   Stages 10-12 (temple):        245, 265, 295
  //   Stages 13-15 (cave):          260, 285, 320
  //   Stages 16-18 (eldritch):      300, 340, 420
  // Enemy mixes: one new type per intro stage; boss-stages have broadest mix.
  // Future tuners: the `notes` field is designer intent — not consumed at runtime.
  const STAGES = [
    // enemyMix per stage — wave spawner filters at spawn-time using c._typeData.mode
    // vs runtime.mode (see hunt-waves.js spawnOne). Mixes therefore can list both
    // day-only and night-only ids; the right ones survive the filter.
    //   day  → red_zombie, samurai_grunt, skull_swarmer + classic mix
    //   night → pumpkin_lantern, jiangshi, samurai_grunt, wraith_fast, skull_swarmer + classic mix
    //   banshee is night-only rare — handled by 5% pre-roll in hunt-waves spawnOne,
    //   NOT listed here.
    { id:1,  name:'Lantern Vigil',    biome:'forest_summer', durationSec:150, enemyMix:['lurker','red_zombie','pumpkin_lantern','skull_swarmer','wraith_fast'],                                              bossId:null,             weaponPickups:['charred_axe'],                                 notes:'Tutorial encounter. Single enemy type. Fast clear to hook the player.' },
    { id:2,  name:'Pale Crossing',    biome:'forest_summer', durationSec:165, enemyMix:['lurker','sprite','red_zombie','pumpkin_lantern','jiangshi','skull_swarmer','wraith_fast'],                          bossId:null,             weaponPickups:['charred_axe','twin_blades'],                   notes:'Sprite introduced — fast but fragile; teaches dodge-priority vs swarm.' },
    { id:3,  name:'Hollow Shrine',    biome:'forest_summer', durationSec:195, enemyMix:['lurker','sprite','walker','red_zombie','samurai_grunt','pumpkin_lantern','jiangshi','skull_swarmer','wraith_fast'],  bossId:'pale_bride',     weaponPickups:['charred_axe','twin_blades'],                   notes:'Boss-stage. Walker + samurai grunt before Pale Bride enters.' },
    { id:4,  name:'Frostbound Watch', biome:'cold_stone',    durationSec:195, enemyMix:['walker','sprite','red_zombie','pumpkin_lantern','jiangshi','skull_swarmer','wraith_fast'],                          bossId:null,             weaponPickups:['twin_blades','bow_of_mourning'],               notes:'Biome shift to cold stone. Walker + sprite in low fog — orientation challenge.' },
    { id:5,  name:'Glacier Mouth',    biome:'cold_stone',    durationSec:215, enemyMix:['walker','sprite','brute_small','red_zombie','pumpkin_lantern','jiangshi','skull_swarmer','wraith_fast'],             bossId:null,             weaponPickups:['twin_blades','bow_of_mourning'],               notes:'Brute_small introduced — slow, tanky, high damage; forces weapon priority.' },
    { id:6,  name:'Throat of Ice',    biome:'cold_stone',    durationSec:240, enemyMix:['walker','sprite','brute_small','lurker','samurai_grunt','pumpkin_lantern','jiangshi','skull_swarmer','wraith_fast'], bossId:'frozen_crone',   weaponPickups:['twin_blades','bow_of_mourning','paper_charm'],  notes:'First Frozen Crone — shard projectiles + area-freeze. Broadest cold-stone mix.' },
    { id:7,  name:'Crimson Path',     biome:'forest_autumn', durationSec:220, enemyMix:['caller','lurker','red_zombie','pumpkin_lantern','jiangshi','skull_swarmer','wraith_fast'],                          bossId:null,             weaponPickups:['paper_charm','bramble_stick'],                  notes:'Caller introduced at stage 7 — first ranged threat; forces player out of hover.' },
    { id:8,  name:'Withering Grove',  biome:'forest_autumn', durationSec:240, enemyMix:['caller','lurker','sprite','red_zombie','pumpkin_lantern','jiangshi','skull_swarmer','wraith_fast'],                  bossId:null,             weaponPickups:['paper_charm','bramble_stick'],                  notes:'Caller + sprite swarm combo: projectile harassment while sprites close.' },
    { id:9,  name:'Marrow Hollow',    biome:'forest_autumn', durationSec:270, enemyMix:['caller','sprite','walker','brute_small','samurai_grunt','pumpkin_lantern','jiangshi','skull_swarmer','wraith_fast'], bossId:'autumn_lord',    weaponPickups:['paper_charm','bramble_stick','silver_thorn'],   notes:'Boss-stage. Full autumn cluster mix before Autumn Lord leaf-storm + charge.' },
    { id:10, name:'Shrine of Embers', biome:'temple',        durationSec:245, enemyMix:['walker','caller','red_zombie','samurai_grunt','pumpkin_lantern','jiangshi','skull_swarmer','wraith_fast'],          bossId:null,             weaponPickups:['silver_thorn','paper_charm'],                   notes:'Temple biome: ambient red — walker + caller combo, mid-range density.' },
    { id:11, name:'Pagoda of Bones',  biome:'temple',        durationSec:265, enemyMix:['walker','sprite','brute_small','samurai_grunt','pumpkin_lantern','jiangshi','skull_swarmer','wraith_fast'],         bossId:null,             weaponPickups:['silver_thorn','sutra_blade'],                   notes:'Dense melee wave; no ranged relief — tests sustained area control.' },
    { id:12, name:'Vault of Names',   biome:'temple',        durationSec:295, enemyMix:['caller','brute_small','walker','sprite','samurai_grunt','pumpkin_lantern','jiangshi','skull_swarmer','wraith_fast'],bossId:'temple_warden',  weaponPickups:['silver_thorn','sutra_blade'],                   notes:'Boss-stage. Temple Warden shockwave + samurai squads; full mix punishes tunnel-vision.' },
    { id:13, name:'Mouth of Black',   biome:'cave',          durationSec:260, enemyMix:['lurker','sprite','walker','samurai_grunt','pumpkin_lantern','jiangshi','skull_swarmer','wraith_fast'],              bossId:null,             weaponPickups:['sutra_blade','ember_lash'],                     notes:'Cave biome: 45% fog. Low-tier swarm reintroduction — overwhelming in the dark.' },
    { id:14, name:'Lightless Tunnel', biome:'cave',          durationSec:285, enemyMix:['sprite','brute_small','lurker','samurai_grunt','pumpkin_lantern','jiangshi','skull_swarmer','wraith_fast'],         bossId:null,             weaponPickups:['ember_lash','sutra_blade'],                     notes:'Sprite speed + brute durability + lurker chaff — three threat profiles simultaneously.' },
    { id:15, name:'Cradle of Maw',    biome:'cave',          durationSec:320, enemyMix:['sprite','walker','brute_small','caller','samurai_grunt','pumpkin_lantern','jiangshi','skull_swarmer','wraith_fast'],bossId:'cave_mother',    weaponPickups:['ember_lash','sutra_blade','willow_charm'],      notes:'Boss-stage. Cave Mother darkness pulse + brood spawn — survival wall before eldritch.' },
    { id:16, name:'Veil Tear',        biome:'eldritch',      durationSec:300, enemyMix:['caller','sprite','walker','samurai_grunt','pumpkin_lantern','jiangshi','skull_swarmer','wraith_fast'],              bossId:null,             weaponPickups:['willow_charm','ember_lash'],                    notes:'Eldritch opener: sigil-fog atmosphere. Caller + sprite harassment sets late-game tempo.' },
    { id:17, name:'Hollow Throne',    biome:'eldritch',      durationSec:340, enemyMix:['walker','brute_small','caller','sprite','samurai_grunt','pumpkin_lantern','jiangshi','skull_swarmer','wraith_fast'],bossId:null,             weaponPickups:['willow_charm','sutra_blade','ember_lash'],      notes:'Near-maximal mix — everything except lurker; gauntlet before final boss.' },
    { id:18, name:'The Wraith Father',biome:'eldritch',      durationSec:420, enemyMix:['caller','sprite','walker','brute_small','lurker','samurai_grunt','pumpkin_lantern','jiangshi','skull_swarmer','wraith_fast'],bossId:'wraith_father',weaponPickups:['willow_charm','sutra_blade','ember_lash'],notes:'Endgame. Full roster + Wraith Father triple-phase + 7-minute marathon. Power-gated wall.' },
  ];

  // SPEC §0 difficulty mandate (W-Hard-Tuning-And-Monetization).
  // Wave-count tiers — early stages give the player a foothold, late stages
  // are the brutal-feeling marathon the architect wants. Per-wave duration
  // sits inside the spec-mandated 90–120s window so wave 1 feels approachable
  // and the curve ramps via WAVE_TIER_RAMP + WAVE_STAT_BASE in hunt-waves.
  const TIER_BREAKS = { early: 6, mid: 12 }; // ≤6 early, 7..12 mid, ≥13 late
  const WAVE_COUNT_EARLY = 5;
  const WAVE_COUNT_MID   = 10;
  const WAVE_COUNT_LATE  = 15;
  const WAVE_SEC_EARLY   = 90;
  const WAVE_SEC_MID     = 100;
  const WAVE_SEC_LATE    = 110;

  function tierFor(id) {
    if (id <= TIER_BREAKS.early) return 'early';
    if (id <= TIER_BREAKS.mid)   return 'mid';
    return 'late';
  }
  function waveCountFor(id) {
    const t = tierFor(id);
    return t === 'early' ? WAVE_COUNT_EARLY : t === 'mid' ? WAVE_COUNT_MID : WAVE_COUNT_LATE;
  }
  function waveDurationFor(id) {
    const t = tierFor(id);
    return t === 'early' ? WAVE_SEC_EARLY : t === 'mid' ? WAVE_SEC_MID : WAVE_SEC_LATE;
  }

  // Apply tier-driven wave config in place. durationSec is overridden so the
  // stage-clear check in wg-game (elapsed >= durationSec) lines up with the
  // last wave finishing — single source of truth for total stage time.
  for (const s of STAGES) {
    s.waveCount       = waveCountFor(s.id);
    s.waveDurationSec = waveDurationFor(s.id);
    s.durationSec     = s.waveCount * s.waveDurationSec;
  }

  function get(id) { return STAGES.find(s => s.id === id); }
  function getBiome(name) { return BIOMES[name]; }
  function list() { return STAGES.slice(); }

  function init() {}
  window.WG.HuntStage = {
    init, get, getBiome, list, BIOMES, STAGES,
    waveCountFor, waveDurationFor, tierFor,
    WAVE_COUNT_EARLY, WAVE_COUNT_MID, WAVE_COUNT_LATE,
    WAVE_SEC_EARLY, WAVE_SEC_MID, WAVE_SEC_LATE,
  };
})();
