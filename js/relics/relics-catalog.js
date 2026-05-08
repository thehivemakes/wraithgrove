// WG.RelicsCatalog — 66 relics across 5 rarity tiers (original IP)
(function(){'use strict';
  // Generated catalog. All names are original to Wraithgrove.
  // Stat conventions:
  //   stat: 'attack' | 'hpMax' | 'defense' | 'critRate' | 'gatherRate'
  //   value: numeric (additive bonus when equipped)

  // STAT-CURVE TABLE (Worker H — tier-doubling power curve)
  // Each tier roughly doubles the previous. Stay within the column range when tuning values.
  // Within a tier+stat group, first-listed relic = low end; last-listed = high end.
  //
  //  stat       | common      | rare        | epic        | legendary   | mythic
  //  -----------+-------------+-------------+-------------+-------------+-------------
  //  attack     |   1 – 3     |   5 – 9     |  14 – 22    |  38 – 55    |  110 – 160
  //  hpMax      |   8 – 15    |  22 – 32    |  65 – 95    | 200 – 260   |  600 – 800
  //  defense    |   1 – 2     |   4 – 6     |  11 – 15    |  28 – 38    |   90 – 115
  //  critRate   | .005 – .015 | .018 – .028 | .04 – .06   | .10 – .14   |  .25 – .32
  //  gatherRate | .015 – .030 | .045 – .065 | .10 – .14   | .25 – .35   |  .60 – .80

  const RELICS = [
    // Common (12) — eclectic mix per Wood Siege register — see SPEC §10 + HD_SOURCE §F. All names original to Wraithgrove.
    // Mix: 4 tools/weapons + 3 mundane + 3 folk-horror ceremonial + 2 wildcards (mundane-absurd, the Potato/Roller-skates slot).
    { id:'r_twinelash',     name:'Twine Lash',      tier:'common', icon:'🧵', stat:'attack',     value: 2 },
    { id:'r_burntpetition', name:'Burnt Petition',  tier:'common', icon:'📜', stat:'hpMax',      value: 12 },
    { id:'r_tinbowl',       name:'Tin Bowl',        tier:'common', icon:'🥣', stat:'defense',    value: 1 },
    { id:'r_rivercobble',   name:'River Cobble',    tier:'common', icon:'🪨', stat:'attack',     value: 3 },
    { id:'r_reedpipe',      name:'Reed Pipe',       tier:'common', icon:'🪈', stat:'gatherRate', value: 0.02 },
    { id:'r_whettedsliver', name:'Whetted Sliver',  tier:'common', icon:'🔪', stat:'attack',     value: 2 },
    { id:'r_funeralurn',    name:'Funeral Urn',     tier:'common', icon:'⚱', stat:'critRate',   value: 0.01 },
    { id:'r_pickledradish', name:'Pickled Radish',  tier:'common', icon:'🥖', stat:'defense',    value: 2 },
    { id:'r_boiledrag',     name:'Boiled Rag',      tier:'common', icon:'🧻', stat:'gatherRate', value: 0.03 },
    { id:'r_garlicstalk',   name:'Garlic Stalk',    tier:'common', icon:'🌱', stat:'hpMax',      value: 10 },
    { id:'r_jossleaf',      name:'Joss Leaf',       tier:'common', icon:'🍃', stat:'gatherRate', value: 0.025 },
    { id:'r_rustedhatchet', name:'Rusted Hatchet',  tier:'common', icon:'🪓', stat:'attack',     value: 3 },

    // Rare (12) — eclectic mix per Wood Siege register — see SPEC §10 + HD_SOURCE §J.3. All names original to Wraithgrove.
    // Lean: practical Western tools + Eastern baroque ceremonial (cinnabar/lantern/silk/joss-paper register) + folk-horror anchors. More elaborate than Common.
    { id:'r_ironcog',         name:'Iron Cog',         tier:'rare',   icon:'⚙', stat:'attack',     value: 8 },
    { id:'r_papermoth',       name:'Paper Moth',       tier:'rare',   icon:'🦋', stat:'critRate',   value: 0.02 },
    { id:'r_brasslantern',    name:'Brass Lantern',    tier:'rare',   icon:'🪔', stat:'hpMax',      value: 28 },
    { id:'r_embroideredsash', name:'Embroidered Sash', tier:'rare',   icon:'🎗', stat:'defense',    value: 5 },
    { id:'r_carvedtibia',     name:'Carved Tibia',     tier:'rare',   icon:'🦴', stat:'attack',     value: 7 },
    { id:'r_cypressresin',    name:'Cypress Resin',    tier:'rare',   icon:'🌲', stat:'gatherRate', value: 0.06 },
    { id:'r_bonecharm',       name:'Bone Charm',       tier:'rare',   icon:'🤍', stat:'defense',    value: 6 },
    { id:'r_carpentermaul',   name:'Carpenter Maul',   tier:'rare',   icon:'🔨', stat:'attack',     value: 9 },
    { id:'r_knottedcord',     name:'Knotted Cord',     tier:'rare',   icon:'🪢', stat:'critRate',   value: 0.023 },
    { id:'r_saltsack',        name:'Salt Sack',        tier:'rare',   icon:'🌾', stat:'hpMax',      value: 32 },
    { id:'r_vermilionbrush',  name:'Vermilion Brush',  tier:'rare',   icon:'🖌', stat:'gatherRate', value: 0.05 },
    { id:'r_crowplume',       name:'Crow Plume',       tier:'rare',   icon:'🪶', stat:'critRate',   value: 0.025 },

    // Epic (18)
    { id:'r_stargazer',  name:'Stargazer',        tier:'epic',   icon:'⭐', stat:'attack',     value: 20 },
    { id:'r_blackthorn', name:'Blackthorn',       tier:'epic',   icon:'🌑', stat:'attack',     value: 17 },
    { id:'r_mournlock',  name:'Mournlock',        tier:'epic',   icon:'🔒', stat:'defense',    value: 14 },
    { id:'r_maskedfox',  name:'Masked Fox',       tier:'epic',   icon:'🦊', stat:'critRate',   value: 0.05 },
    { id:'r_jadeshard',  name:'Jade Shard',       tier:'epic',   icon:'💚', stat:'hpMax',      value: 90 },
    { id:'r_cinderbell', name:'Cinder Bell',      tier:'epic',   icon:'🔔', stat:'attack',     value: 19 },
    { id:'r_silvermoss', name:'Silvermoss',       tier:'epic',   icon:'🌿', stat:'gatherRate', value: 0.12 },
    { id:'r_glassbeak',  name:'Glass Beak',       tier:'epic',   icon:'🪞', stat:'critRate',   value: 0.06 },
    { id:'r_thrushhorn', name:'Thrush Horn',      tier:'epic',   icon:'🎺', stat:'defense',    value: 15 },
    { id:'r_lichensigil',name:'Lichen Sigil',     tier:'epic',   icon:'🌀', stat:'hpMax',      value: 95 },
    { id:'r_ravenknot',  name:'Raven Knot',       tier:'epic',   icon:'🪡', stat:'attack',     value: 22 },
    { id:'r_dustcrown',  name:'Dust Crown',       tier:'epic',   icon:'👑', stat:'critRate',   value: 0.06 },
    // Epic additions — W-Relics-Catalog-Expand
    { id:'r_inkwyrm',      name:'Ink Wyrm',       tier:'epic', icon:'✒', stat:'attack',     value: 20,    powerValue: 320, effect:'+20 atk; kills leave an ink cloud slowing nearby enemies 20% for 2s',              lore:'Brewed from the bile of a transcription spirit. What it writes, bleeds.' },
    { id:'r_porcelainhand',name:'Porcelain Hand', tier:'epic', icon:'🏺', stat:'hpMax',      value: 75,    powerValue: 255, effect:'+75 hp; first kill per stage restores 12% max HP',                                lore:"Taken from a burial effigy whose fingers wouldn't stop moving." },
    { id:'r_rustpendulum', name:'Rust Pendulum',  tier:'epic', icon:'⏳', stat:'defense',    value: 14,    powerValue: 215, effect:'+14 def; after taking a hit, defense increases 60% for 2s',                       lore:'It still swings. No one wound it.' },
    { id:'r_ashveil',      name:'Ash Veil',       tier:'epic', icon:'💨', stat:'critRate',   value: 0.055, powerValue: 285, effect:'+5.5% crit; crits apply 2s ash mark reducing target defense by 8',                lore:"Ash from a cremation that wasn't finished. The warmth never left it." },
    { id:'r_ironmantis',   name:'Iron Mantis',    tier:'epic', icon:'🦗', stat:'attack',     value: 18,    powerValue: 335, effect:'+18 atk; first strike each stage deals double damage',                            lore:'The mantis waits. Its patience is itself a weapon.' },
    { id:'r_whitejoss',    name:'White Joss',     tier:'epic', icon:'🕯', stat:'gatherRate', value: 0.13,  powerValue: 240, effect:'+13% gather; 15% chance on wood collect to drop a spirit fragment (+5% gather 8s)', lore:'Burned in place of a name. The name finds its way back.' },

    // Legendary (16) + 1 special progression key
    { id:'r_moonshear',  name:'Moonshear',        tier:'legendary', icon:'🌙', stat:'attack',     value: 38 },
    { id:'r_souldrift',  name:'Souldrift',        tier:'legendary', icon:'💫', stat:'critRate',   value: 0.12 },
    { id:'r_marrowveil', name:'Marrowveil',       tier:'legendary', icon:'🌫', stat:'hpMax',      value: 230 },
    { id:'r_paleforge',  name:'Paleforge',        tier:'legendary', icon:'🔥', stat:'attack',     value: 47 },
    { id:'r_grimroot',   name:'Grimroot',         tier:'legendary', icon:'🌳', stat:'defense',    value: 33 },
    { id:'r_silentbell', name:'Silent Bell',      tier:'legendary', icon:'🪘', stat:'gatherRate', value: 0.30 },
    { id:'r_ashtongue',  name:'Ash Tongue',       tier:'legendary', icon:'🔥', stat:'attack',     value: 55 },
    { id:'r_hollowmark', name:'Hollow Mark',      tier:'legendary', icon:'⚜', stat:'critRate',   value: 0.14 },
    // Legendary additions — W-Relics-Catalog-Expand
    { id:'r_mourningbell', name:'Mourning Bell',  tier:'legendary', icon:'🛎', stat:'attack',     value: 45,   stat2:'critRate',   value2: 0.11, powerValue: 780,  effect:'+45 atk, +11% crit; 3 kills within 4s rings bell granting +30% atk for 5s',                  lore:'Cast from a cracked temple bell. Still rings the note no living ear hears.' },
    { id:'r_bloodquill',   name:'Blood Quill',    tier:'legendary', icon:'🩸', stat:'attack',     value: 40,   stat2:'hpMax',      value2: 180,  powerValue: 720,  effect:'+40 atk, +180 hp; 8% of damage dealt restores HP (lifesteal)',                              lore:"Used to sign contracts the living shouldn't have signed. Both parties bled." },
    { id:'r_cinerroot',    name:'Ciner Root',     tier:'legendary', icon:'☘', stat:'defense',    value: 32,   stat2:'hpMax',      value2: 200,  powerValue: 650,  effect:'+32 def, +200 hp; below 30% HP, all incoming damage is halved',                            lore:'Grows only above sealed tombs. It feeds on the stillness inside.' },
    { id:'r_hangingthread',name:'Hanging Thread', tier:'legendary', icon:'🧶', stat:'gatherRate', value: 0.30, stat2:'attack',     value2: 38,   powerValue: 680,  effect:'+30% gather, +38 atk; enemy kills drop red thread (+5% gather 10s, stacks x3)',            lore:'Cut from the burial shroud of a weaver who refused to stop. Thread still warm.' },
    { id:'r_emberpaper',   name:'Ember Paper',    tier:'legendary', icon:'📄', stat:'critRate',   value: 0.13, stat2:'attack',     value2: 42,   powerValue: 800,  effect:'+13% crit, +42 atk; crit kills create fire sigil — first enemy inside burns 4s (15% HP)',  lore:"Folded by a monk who prayed for destruction. The fire wasn't a surprise to anyone who knew him." },
    { id:'r_stonepalm',    name:'Stone Palm',     tier:'legendary', icon:'🖐', stat:'defense',    value: 36,   stat2:'critRate',   value2: 0.10, powerValue: 700,  effect:'+36 def, +10% crit; killing an attacker before their blow lands grants +20% crit for 5s',  lore:'The hand preserved in lime mortar. Open and waiting.' },
    { id:'r_foxmantle',    name:'Fox Mantle',     tier:'legendary', icon:'🌠', stat:'attack',     value: 50,   stat2:'gatherRate', value2: 0.25, powerValue: 900,  effect:'+50 atk, +25% gather; once per stage at <40% HP, gain +35% speed and intangibility 6s',    lore:'Nine tails, one intention. She left it behind willingly — which was the frightening part.' },
    { id:'r_ashneedle',    name:'Ash Needle',     tier:'legendary', icon:'⚡', stat:'hpMax',      value: 215,  stat2:'critRate',   value2: 0.13, powerValue: 850,  effect:'+215 hp, +13% crit; every 15th crit, next strike pierces through all enemies in a line',    lore:'The seamstress used it to sew shrouds. Stopped counting after the first thousand.' },
    // Rift Sigil — progression key only; no combat stat; not equippable.
    // Drops from eldritch boss (stage 18 guaranteed) + 1% per eldritch stage clear.
    // 3 collected → unlock next Rift Guest slot in Ascend tab.
    // Icon: violet sigil 24×24 canvas draw — deferred to render worker.
    { id:'rift_sigil', name:'Rift Sigil', tier:'legendary', icon:'🔮', stat:null, value:0, equippable:false },

    // Mythic (8)
    { id:'r_wraithheart',name:'Wraithheart',      tier:'mythic', icon:'💜', stat:'attack',     value: 135 },
    { id:'r_voidlantern',name:'Void Lantern',     tier:'mythic', icon:'🪔', stat:'hpMax',      value: 800 },
    { id:'r_starpyre',   name:'Starpyre',         tier:'mythic', icon:'☄', stat:'critRate',   value: 0.30 },
    { id:'r_nightclasp', name:'Nightclasp',       tier:'mythic', icon:'🪙', stat:'defense',    value: 103 },
    // Mythic additions — W-Relics-Catalog-Expand
    { id:'r_riverbone',   name:'River Bone',      tier:'mythic', icon:'🌊', stat:'attack',     value: 140,  stat2:'defense',  value2: 95,   powerValue: 1800, effect:'+140 atk, +95 def; once per run, when HP reaches 0, survive at 1 HP and gain 5s invulnerability', lore:'Pulled from the deepest ford where the drowned linger longest. It carries the weight of every uncompleted crossing.' },
    { id:'r_silkspecter', name:'Silk Specter',    tier:'mythic', icon:'👻', stat:'critRate',   value: 0.28, stat2:'attack',   value2: 120,  powerValue: 2100, effect:'+28% crit, +120 atk; every 25s a spectral duplicate fights for you for 8s inheriting your stats',     lore:'The shroud remembers the body. The body is gone. The shroud stayed.' },
    { id:'r_jademourn',   name:'Jade Mourn',      tier:'mythic', icon:'💠', stat:'hpMax',      value: 750,  stat2:'defense',  value2: 100,  powerValue: 2400, effect:'+750 hp, +100 def; regenerate 1% max HP every 3s; rate doubles during first 30s of each stage',      lore:"Carved by a physician who refused to accept the deaths of his patients. The jade outlasted all of them." },
    { id:'r_eyeofwinter', name:'Eye of Winter',   tier:'mythic', icon:'❄', stat:'attack',     value: 150,  stat2:'critRate', value2: 0.30, powerValue: 2700, effect:'+150 atk, +30% crit; once per stage on first crit, all enemies move at half speed for 4s',           lore:'Found in the socket of a statue that had watched the valley for four hundred years. Still warm when removed.' },
  ];

  function byId(id) { return RELICS.find(r => r.id === id); }
  function byTier(tier) { return RELICS.filter(r => r.tier === tier); }
  function list() { return RELICS.slice(); }

  function init() {}
  window.WG.RelicsCatalog = { init, byId, byTier, list, RELICS };
})();
