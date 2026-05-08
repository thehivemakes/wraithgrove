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
    // Post-launch endgame tier — beyond the rift, where the Wraith Father came from.
    // Visual register: deep space-violet + bone-white sigil marks + bleeding starlight.
    ascended: {
      ground:   '#0a0418',
      groundAlt:'#06021a',
      tree:     '#1a0a30',
      treeBark: '#0c0620',
      ambient:  '#06021a',
      lightFog: 0.32,
      decoration:'sigils-ascended',
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

    // ─── Tutorial pre-stage (W-Stage-Zero-Tutorial) ─────────────────────────
    // Auto-launched on first boot. Tabs hidden until cleared. Single enemy type.
    // hpMult/speedMult/damageMult applied by applyGodWindowScaling when isTutorial=true.
    // invulnFirstSec: player cannot die for first 45s (shield deflect FX).
    { id: 0, name: 'Lantern Wake', biome: 'forest_summer',
      durationSec: 90, enemyMix: ['lurker'], bossId: null,
      weaponPickups: ['charred_axe'],
      notes: 'Tutorial pre-stage. Player is auto-launched into this. Tabs hidden until clear.',
      isTutorial: true, hpMult: 0.4, speedMult: 0.6, damageMult: 0.2,
      invulnFirstSec: 45 },

    { id:1,  name:'Lantern Vigil',    biome:'forest_summer', durationSec:150, enemyMix:['lurker','red_zombie','pumpkin_lantern','skull_swarmer','wraith_fast'],                                              bossId:null,             weaponPickups:['charred_axe'],                                 subtitle:'Lanterns lit. The dead not yet stirring.',      lore:'First night of the Lantern Festival. The shrine-keeper failed to burn the offerings before sundown. Now the red-paper lanterns sway without wind and figures pace the treeline — hungry but still slow. Someone must keep vigil until dawn. The candles must not go out. Keep moving. They are counting on it.', notes:'Tutorial encounter. Single enemy type. Fast clear to hook the player.' },
    { id:2,  name:'Pale Crossing',    biome:'forest_summer', durationSec:165, enemyMix:['lurker','sprite','red_zombie','pumpkin_lantern','jiangshi','skull_swarmer','wraith_fast'],                          bossId:null,             weaponPickups:['charred_axe','twin_blades'],                   subtitle:'She crosses when the lanterns dim.',            lore:'The old bridge over the black river marks the edge of the safe quarter. Families burned joss paper here for a century to appease the wandering dead. Tonight the jiangshi arrive in rows — stiff-armed, following a pale woman in white. She does not run. She does not need to. The bridge is the only way through.', notes:'Sprite introduced — fast but fragile; teaches dodge-priority vs swarm.' },
    { id:3,  name:'Hollow Shrine',    biome:'forest_summer', durationSec:195, enemyMix:['lurker','sprite','walker','red_zombie','samurai_grunt','pumpkin_lantern','jiangshi','skull_swarmer','wraith_fast'],  bossId:'pale_bride',     weaponPickups:['charred_axe','twin_blades'],                   subtitle:'The bride has been waiting too long.',           lore:'Three centuries ago a bride was abandoned at the altar on her wedding night. She burned the shrine to coal and never stopped waiting. The stone walls remember her — the altar is warm to the touch. She walks between the old pines now, and she is not alone. The hollow in the stone is shaped like a doorway. It has always been open.', notes:'Boss-stage. Walker + samurai grunt before Pale Bride enters.' },
    { id:4,  name:'Frostbound Watch', biome:'cold_stone',    durationSec:195, enemyMix:['walker','sprite','red_zombie','pumpkin_lantern','jiangshi','skull_swarmer','wraith_fast'],                          bossId:null,             weaponPickups:['twin_blades','bow_of_mourning'],               subtitle:'The watchman stopped writing weeks ago.',        lore:'The northern garrison post has been silent since the first snow. Dispatch riders return with horses but not themselves. The fire in the watchtower still burns — someone feeds it — but the gate log stopped mid-sentence in the third week of the cold month. Something is maintaining the post. It is not who was assigned.', notes:'Biome shift to cold stone. Walker + sprite in low fog — orientation challenge.' },
    { id:5,  name:'Glacier Mouth',    biome:'cold_stone',    durationSec:215, enemyMix:['walker','sprite','brute_small','red_zombie','pumpkin_lantern','jiangshi','skull_swarmer','wraith_fast'],             bossId:null,             weaponPickups:['twin_blades','bow_of_mourning'],               subtitle:'It was sealed for a reason.',                   lore:'The glacier carved a mouth in the mountain face and the villagers called it the Sleeping Jaw. They packed the entrance with river stones and salt charms every solstice for eighty years. This winter the charms were gone and the stones were stacked neatly aside, as if something tidied up on its way out. Something with patience.', notes:'Brute_small introduced — slow, tanky, high damage; forces weapon priority.' },
    { id:6,  name:'Throat of Ice',    biome:'cold_stone',    durationSec:240, enemyMix:['walker','sprite','brute_small','lurker','samurai_grunt','pumpkin_lantern','jiangshi','skull_swarmer','wraith_fast'], bossId:'frozen_crone',   weaponPickups:['twin_blades','bow_of_mourning','paper_charm'],  subtitle:'Ice remembers every throat it fills.',          lore:'The mountain\'s deepest channel — where the glacier breathes. The Frozen Crone has been here since the cold locked her in, extending her reach a little further down the mountain each winter. Shards of ice orbit her like prayer beads. Her cold touches from the inside out. The throat belongs to her now.', notes:'First Frozen Crone — shard projectiles + area-freeze. Broadest cold-stone mix.' },
    { id:7,  name:'Crimson Path',     biome:'forest_autumn', durationSec:220, enemyMix:['caller','lurker','red_zombie','pumpkin_lantern','jiangshi','skull_swarmer','wraith_fast'],                          bossId:null,             weaponPickups:['paper_charm','bramble_stick'],                  subtitle:'The leaves fall toward you, not down.',         lore:'The road through the autumn forest was a funeral route for eight generations. The leaves are the color of the banners from those processions. Now the callers stand at the treeline — they do not approach, they gesture with long pale arms. What they summon walks faster. Leave the road and you will not find it again.', notes:'Caller introduced at stage 7 — first ranged threat; forces player out of hover.' },
    { id:8,  name:'Withering Grove',  biome:'forest_autumn', durationSec:240, enemyMix:['caller','lurker','sprite','red_zombie','pumpkin_lantern','jiangshi','skull_swarmer','wraith_fast'],                  bossId:null,             weaponPickups:['paper_charm','bramble_stick'],                  subtitle:'The grove dies again each night.',              lore:'The grove was sacred before the war. Burned, restored, burned again. Now it burns every night in a fire that leaves no ash and dies at dawn. The sprites move through it like sparks and the callers stand at the edge, performing something between a ritual and a demand. By morning there is no evidence it happened.', notes:'Caller + sprite swarm combo: projectile harassment while sprites close.' },
    { id:9,  name:'Marrow Hollow',    biome:'forest_autumn', durationSec:270, enemyMix:['caller','sprite','walker','brute_small','samurai_grunt','pumpkin_lantern','jiangshi','skull_swarmer','wraith_fast'], bossId:'autumn_lord',    weaponPickups:['paper_charm','bramble_stick','silver_thorn'],   subtitle:'He made the trees remember the dead.',          lore:'The Autumn Lord learned his name from the forest — he is what the forest becomes when it stops grieving and starts keeping score. His leaf-storms strip flesh to bone in passing and the bones remember to stand up afterward. The hollow at the grove\'s heart is shaped like a throne. He has been sitting in it a very long time.', notes:'Boss-stage. Full autumn cluster mix before Autumn Lord leaf-storm + charge.' },
    { id:10, name:'Shrine of Embers', biome:'temple',        durationSec:245, enemyMix:['walker','caller','red_zombie','samurai_grunt','pumpkin_lantern','jiangshi','skull_swarmer','wraith_fast'],          bossId:null,             weaponPickups:['silver_thorn','paper_charm'],                   subtitle:"The incense smoke spells someone's name.",      lore:'The temple complex was maintained by three priest families for two hundred years. One by one the families vanished between new moon and full. The offering fires never stopped burning — brighter after each disappearance. The samurai who guard the inner gate do not respond to questions. They do not respond to anything anymore. The incense still rises.', notes:'Temple biome: ambient red — walker + caller combo, mid-range density.' },
    { id:11, name:'Pagoda of Bones',  biome:'temple',        durationSec:265, enemyMix:['walker','sprite','brute_small','samurai_grunt','pumpkin_lantern','jiangshi','skull_swarmer','wraith_fast'],         bossId:null,             weaponPickups:['silver_thorn','sutra_blade'],                   subtitle:'Each bone belongs to someone still owed.',      lore:'The pagoda was built on the old burial grounds to honor the ancestors. The builders used shortcuts and the bones are in the foundations. Now the structure vibrates at night with the resonance of three hundred unpaid debts. The brutes here move like muscle but are made of something older. The pagoda lists slightly toward the past.', notes:'Dense melee wave; no ranged relief — tests sustained area control.' },
    { id:12, name:'Vault of Names',   biome:'temple',        durationSec:295, enemyMix:['caller','brute_small','walker','sprite','samurai_grunt','pumpkin_lantern','jiangshi','skull_swarmer','wraith_fast'],bossId:'temple_warden',  weaponPickups:['silver_thorn','sutra_blade'],                   subtitle:'Say no name here. It will answer.',            lore:'The innermost chamber holds the death-register for ten thousand souls — every name recorded in the surrounding valleys for four centuries. The Temple Warden keeps it sealed. He is what happens when a guardian outlives the thing it was guarding and decides to protect it anyway. His shockwave opens the seals. They must remain shut.', notes:'Boss-stage. Temple Warden shockwave + samurai squads; full mix punishes tunnel-vision.' },
    { id:13, name:'Mouth of Black',   biome:'cave',          durationSec:260, enemyMix:['lurker','sprite','walker','samurai_grunt','pumpkin_lantern','jiangshi','skull_swarmer','wraith_fast'],              bossId:null,             weaponPickups:['sutra_blade','ember_lash'],                     subtitle:'The cave breathes in. You were exhaled.',       lore:'Locals call it the Mouth of Black because it exhales once at midnight — a slow cold breath that extinguishes every lantern within hearing range. What follows is the sound of things that live in total dark navigating by sounds they were not supposed to hear. You made sounds on the way down.', notes:'Cave biome: 45% fog. Low-tier swarm reintroduction — overwhelming in the dark.' },
    { id:14, name:'Lightless Tunnel', biome:'cave',          durationSec:285, enemyMix:['sprite','brute_small','lurker','samurai_grunt','pumpkin_lantern','jiangshi','skull_swarmer','wraith_fast'],         bossId:null,             weaponPickups:['ember_lash','sutra_blade'],                     subtitle:'Sound travels here. Nothing else does.',        lore:'The tunnel was carved by miners who stopped sending reports in the third week. The rescue team found the tools laid down with care, as if the miners had stepped out on a short break. The tunnels were empty. The air is still. The sprites were already here when the miners arrived. They were waiting then too.', notes:'Sprite speed + brute durability + lurker chaff — three threat profiles simultaneously.' },
    { id:15, name:'Cradle of Maw',    biome:'cave',          durationSec:320, enemyMix:['sprite','walker','brute_small','caller','samurai_grunt','pumpkin_lantern','jiangshi','skull_swarmer','wraith_fast'],bossId:'cave_mother',    weaponPickups:['ember_lash','sutra_blade','willow_charm'],      subtitle:'She waits at the bottom to be found.',          lore:'At the deepest point is a chamber that is warm. The warmth is the Cave Mother — she has been below the world long enough to absorb its heat. Her darkness pulse is not an attack; it is breath. Her brood are not spawns; they are memories of what she once was. The cradle is comfortable. Do not stop moving.', notes:'Boss-stage. Cave Mother darkness pulse + brood spawn — survival wall before eldritch.' },
    { id:16, name:'Veil Tear',        biome:'eldritch',      durationSec:300, enemyMix:['caller','sprite','walker','samurai_grunt','pumpkin_lantern','jiangshi','skull_swarmer','wraith_fast'],              bossId:null,             weaponPickups:['willow_charm','ember_lash'],                    subtitle:'Something reached through from outside.',       lore:'The eldritch quarter begins at the tear — a vertical wound in the air showing nothing on the other side except more dark. The callers near it are changed: their gestures have purpose now, not habit. The sprites orbit it like moths around a flame that does not burn. Whatever made the wound is still nearby. It did not leave.', notes:'Eldritch opener: sigil-fog atmosphere. Caller + sprite harassment sets late-game tempo.' },
    { id:17, name:'Hollow Throne',    biome:'eldritch',      durationSec:340, enemyMix:['walker','brute_small','caller','sprite','samurai_grunt','pumpkin_lantern','jiangshi','skull_swarmer','wraith_fast'],bossId:null,             weaponPickups:['willow_charm','sutra_blade','ember_lash'],      subtitle:'The throne was filled before you came.',        lore:'The Hollow Throne was not built — it was carved by the force of something wanting to sit, using patience as its chisel. The Wraith Father has not arrived yet. His procession of brutes and callers is his announcement. By the time the throne is visible through the sigil-smoke, you are already inside his audience chamber.', notes:'Near-maximal mix — everything except lurker; gauntlet before final boss.' },
    { id:18, name:'The Wraith Father',biome:'eldritch',      durationSec:420, enemyMix:['caller','sprite','walker','brute_small','lurker','samurai_grunt','pumpkin_lantern','jiangshi','skull_swarmer','wraith_fast'],bossId:'wraith_father',weaponPickups:['willow_charm','sutra_blade','ember_lash'], subtitle:'Every other ghost was his shadow.',             lore:'The Wraith Father came from beyond the tear — not made by this world\'s dead but drawn to them, as water finds a crack. He does not haunt. He collects. The armies you have fought through are his interest made physical. He has three faces and no fear and he will use all seven minutes. Every haunting was an audition.', notes:'Endgame. Full roster + Wraith Father triple-phase + 7-minute marathon. Power-gated wall.' },

    // ─── Post-launch ascended tier (stages 19-24) ────────────────────────────
    // Locked until stage 18 cleared (isStageUnlocked checks bestWaves[18] > 0).
    // Biome: ascended — deep space-violet + bone-white sigils + bleeding starlight.
    // New enemy types: sigil_drone (ranged, 25 HP) + memory_husk (80 HP, splits on death).
    // New bosses: echo_throne_keeper (stage 21) + wraith_father_echo (stage 24).
    { id:19, name:'Hollow Above',         biome:'ascended', durationSec:420, enemyMix:['sigil_drone','memory_husk','caller','lurker','sprite'],                                    bossId:null,                  weaponPickups:['ember_lash','willow_charm'],             subtitle:'Past the rift, space forgot its rules.',        lore:'The Wraith Father is gone but the rift he left is open. The Hollow Above waits on the other side — void-purple and wrong in proportion, where the horizon bends away and the sigil drones fly in patterns too regular to be alive. The memory husks are what remains of those who entered before and did not return intact.', notes:'Ascended opener. Sigil drones introduce long-range harassment; memory husks teach the split.' },
    { id:20, name:'Boneworm Sky',         biome:'ascended', durationSec:420, enemyMix:['sigil_drone','memory_husk','brute_small','walker','caller'],                               bossId:null,                  weaponPickups:['willow_charm','sutra_blade'],            subtitle:'The sky opened and the bones fell up.',         lore:'The Boneworm Sky earns its name — the void above writhes with pale segments too large to be what they appear to be. Memory husks split and reform and split again; the brutes below are gravity-anchor points for things trying to descend. The arena floor is the safest part of this stage. Do not look up.', notes:'Memory husks + brutes: split-on-death flooding the arena while slow tanks punish tunnel-vision.' },
    { id:21, name:"First Sigil's Throne", biome:'ascended', durationSec:420, enemyMix:['sigil_drone','memory_husk','caller','sprite','walker'],                                    bossId:'echo_throne_keeper',  weaponPickups:['sutra_blade','ember_lash'],              subtitle:'Hold all three fragments. Earn nothing.',       lore:'The Echo Throne Keeper does not protect the throne — it is the throne, shattered into three moving fragments that test whether any mind can track all three at once. All three must fall for the throne to break. This is not a guardian that defends; it is a selection mechanism. Most who enter never hold more than one.', notes:'Boss-stage. Echo Throne Keeper splits into 3 fragments; all three must fall before the throne breaks.' },
    { id:22, name:'Echo Tear',            biome:'ascended', durationSec:420, enemyMix:['sigil_drone','memory_husk','sprite','walker','caller','lurker'],                           bossId:null,                  weaponPickups:['ember_lash','willow_charm'],             subtitle:'The rift is learning to stay open.',            lore:'Past the throne the rift has widened — it tears at itself now, cycling its own edge. The echo tear is not a wound; it is a pattern that has decided to repeat. Maximum sigil drone density, maximum memory husk spawns. No boss is needed. The rift is the threat. Moving through it is the whole test.', notes:'The rift widens. Broadest ascended mix; no boss but sigil drones + husk floods at maximum tempo.' },
    { id:23, name:'Memory Husk',          biome:'ascended', durationSec:420, enemyMix:['memory_husk','brute_small','sigil_drone','lurker','caller','walker'],                      bossId:null,                  weaponPickups:['willow_charm','sutra_blade'],            subtitle:'What remains when forgetting fails.',           lore:'This stage is named for what walks it. The memory husks are not dead — they are the residue of consciousness that could not let go when the body did. They split and reform and split, and each fragment remembers only the final moment of the life it was. Dense cascades of them. The survivor is whoever the husks forget first.', notes:'Named for the dominant threat. Dense memory-husk waves — split cascades push the player back constantly.' },
    { id:24, name:'The Quiet Beyond',     biome:'ascended', durationSec:480, enemyMix:['sigil_drone','memory_husk','caller','sprite','walker','brute_small','lurker'],              bossId:'wraith_father_echo',  weaponPickups:['willow_charm','sutra_blade','ember_lash'], subtitle:'He is quieter now. That is the problem.',       lore:'The Wraith Father returns as a memory of himself — diminished, patient, and more precise. The Quiet Beyond is not silence; it is the space after the last sound. He arrives without announcement. The echo of every enemy you have fought is in him now. Eight waves, eight minutes, and the abyss wearing the only face it has left.', notes:'Final expansion stage. The Wraith Father as a faded memory-echo: diminished but still the abyss. 8-minute marathon.' },
  ];

  // SPEC §0 difficulty mandate (W-Hard-Tuning-And-Monetization).
  // Wave-count tiers — early stages give the player a foothold, late stages
  // are the brutal-feeling marathon the architect wants. Per-wave duration
  // sits inside the spec-mandated 90–120s window so wave 1 feels approachable
  // and the curve ramps via WAVE_TIER_RAMP + WAVE_STAT_BASE in hunt-waves.
  const TIER_BREAKS = { early: 6, mid: 12 }; // ≤6 early, 7..12 mid, ≥13 late
  // Architect 2026-05-03: stages were way too long. Stage 1 was 7.5 min — bailed
  // the mobile-hook window. Cut for modern pacing. Early hooks players in 90s;
  // late endgame caps at 7 min for brag-rights without burnout. See docs/DECISIONS.md.
  const WAVE_COUNT_EARLY = 3;   // was 5
  const WAVE_COUNT_MID   = 5;   // was 10
  const WAVE_COUNT_LATE  = 7;   // was 15
  const WAVE_SEC_EARLY   = 30;  // was 90 — stage 1-6 now 1.5 min total
  const WAVE_SEC_MID     = 50;  // was 100 — stage 7-12 now 4.2 min total
  const WAVE_SEC_LATE    = 60;  // was 110 — stage 13-18 now 7 min total

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
  // Stage 24 override — 8-minute final boss marathon (8 waves × 60s).
  const _s24 = STAGES.find(s => s.id === 24);
  if (_s24) { _s24.waveCount = 8; _s24.durationSec = _s24.waveCount * _s24.waveDurationSec; }

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
