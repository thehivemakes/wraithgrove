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
    { id:1,  name:'Lantern Vigil',    biome:'forest_summer', durationSec:150, enemyMix:['lurker'],                               bossId:null,             weaponPickups:['charred_axe'],                                 notes:'Tutorial encounter. Single enemy type. Fast clear to hook the player.' },
    { id:2,  name:'Pale Crossing',    biome:'forest_summer', durationSec:165, enemyMix:['lurker','sprite'],                      bossId:null,             weaponPickups:['charred_axe','twin_blades'],                   notes:'Sprite introduced — fast but fragile; teaches dodge-priority vs swarm.' },
    { id:3,  name:'Hollow Shrine',    biome:'forest_summer', durationSec:195, enemyMix:['lurker','sprite','walker'],              bossId:'pale_bride',     weaponPickups:['charred_axe','twin_blades'],                   notes:'Boss-stage. Walker adds melee pressure before Pale Bride enters.' },
    { id:4,  name:'Frostbound Watch', biome:'cold_stone',    durationSec:195, enemyMix:['walker','sprite'],                      bossId:null,             weaponPickups:['twin_blades','bow_of_mourning'],               notes:'Biome shift to cold stone. Walker + sprite in low fog — orientation challenge.' },
    { id:5,  name:'Glacier Mouth',    biome:'cold_stone',    durationSec:215, enemyMix:['walker','sprite','brute_small'],         bossId:null,             weaponPickups:['twin_blades','bow_of_mourning'],               notes:'Brute_small introduced — slow, tanky, high damage; forces weapon priority.' },
    { id:6,  name:'Throat of Ice',    biome:'cold_stone',    durationSec:240, enemyMix:['walker','sprite','brute_small','lurker'],bossId:'frozen_crone',   weaponPickups:['twin_blades','bow_of_mourning','paper_charm'],  notes:'First Frozen Crone — shard projectiles + area-freeze. Broadest cold-stone mix.' },
    { id:7,  name:'Crimson Path',     biome:'forest_autumn', durationSec:220, enemyMix:['caller','lurker'],                      bossId:null,             weaponPickups:['paper_charm','bramble_stick'],                  notes:'Caller introduced at stage 7 — first ranged threat; forces player out of hover.' },
    { id:8,  name:'Withering Grove',  biome:'forest_autumn', durationSec:240, enemyMix:['caller','lurker','sprite'],              bossId:null,             weaponPickups:['paper_charm','bramble_stick'],                  notes:'Caller + sprite swarm combo: projectile harassment while sprites close.' },
    { id:9,  name:'Marrow Hollow',    biome:'forest_autumn', durationSec:270, enemyMix:['caller','sprite','walker','brute_small'],bossId:'autumn_lord',    weaponPickups:['paper_charm','bramble_stick','silver_thorn'],   notes:'Boss-stage. Full autumn cluster mix before Autumn Lord leaf-storm + charge.' },
    { id:10, name:'Shrine of Embers', biome:'temple',        durationSec:245, enemyMix:['walker','caller'],                      bossId:null,             weaponPickups:['silver_thorn','paper_charm'],                   notes:'Temple biome: ambient red — walker + caller combo, mid-range density.' },
    { id:11, name:'Pagoda of Bones',  biome:'temple',        durationSec:265, enemyMix:['walker','sprite','brute_small'],         bossId:null,             weaponPickups:['silver_thorn','sutra_blade'],                   notes:'Dense melee wave; no ranged relief — tests sustained area control.' },
    { id:12, name:'Vault of Names',   biome:'temple',        durationSec:295, enemyMix:['caller','brute_small','walker','sprite'],bossId:'temple_warden',  weaponPickups:['silver_thorn','sutra_blade'],                   notes:'Boss-stage. Temple Warden shockwave + walker squads; full mix punishes tunnel-vision.' },
    { id:13, name:'Mouth of Black',   biome:'cave',          durationSec:260, enemyMix:['lurker','sprite','walker'],              bossId:null,             weaponPickups:['sutra_blade','ember_lash'],                     notes:'Cave biome: 45% fog. Low-tier swarm reintroduction — overwhelming in the dark.' },
    { id:14, name:'Lightless Tunnel', biome:'cave',          durationSec:285, enemyMix:['sprite','brute_small','lurker'],         bossId:null,             weaponPickups:['ember_lash','sutra_blade'],                     notes:'Sprite speed + brute durability + lurker chaff — three threat profiles simultaneously.' },
    { id:15, name:'Cradle of Maw',    biome:'cave',          durationSec:320, enemyMix:['sprite','walker','brute_small','caller'],bossId:'cave_mother',    weaponPickups:['ember_lash','sutra_blade','willow_charm'],      notes:'Boss-stage. Cave Mother darkness pulse + brood spawn — survival wall before eldritch.' },
    { id:16, name:'Veil Tear',        biome:'eldritch',      durationSec:300, enemyMix:['caller','sprite','walker'],              bossId:null,             weaponPickups:['willow_charm','ember_lash'],                    notes:'Eldritch opener: sigil-fog atmosphere. Caller + sprite harassment sets late-game tempo.' },
    { id:17, name:'Hollow Throne',    biome:'eldritch',      durationSec:340, enemyMix:['walker','brute_small','caller','sprite'],bossId:null,             weaponPickups:['willow_charm','sutra_blade','ember_lash'],      notes:'Near-maximal mix — everything except lurker; gauntlet before final boss.' },
    { id:18, name:'The Wraith Father',biome:'eldritch',      durationSec:420, enemyMix:['caller','sprite','walker','brute_small','lurker'],bossId:'wraith_father',weaponPickups:['willow_charm','sutra_blade','ember_lash'],notes:'Endgame. Full roster + Wraith Father triple-phase + 7-minute marathon. Power-gated wall.' },
  ];

  function get(id) { return STAGES.find(s => s.id === id); }
  function getBiome(name) { return BIOMES[name]; }
  function list() { return STAGES.slice(); }

  function init() {}
  window.WG.HuntStage = { init, get, getBiome, list, BIOMES, STAGES };
})();
