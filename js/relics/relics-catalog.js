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
    // W-Content-Pack-V2 epic additions (+6)
    { id:'r_murkglass',    name:'Murk Glass',     tier:'epic', icon:'🔭', stat:'critRate',   value: 0.05,  powerValue: 290, effect:'+5% crit; crits leave a blinding flash — target misses its next attack',            lore:'Ground from a mirror that showed only shadows.' },
    { id:'r_thornweft',    name:'Thorn Weft',     tier:'epic', icon:'🌵', stat:'attack',     value: 17,    powerValue: 330, effect:'+17 atk; every 5th hit fires a thorn barrage dealing +30% atk to nearby enemies',   lore:'Woven from the thorns of a bush that grew over a grave.' },
    { id:'r_mudcrown',     name:'Mud Crown',      tier:'epic', icon:'👑', stat:'hpMax',      value: 80,    powerValue: 260, effect:'+80 hp; below 50% HP, gain +25 flat defense',                                        lore:'Modeled after a funeral crown. The clay never dried completely.' },
    { id:'r_emberglass',   name:'Ember Glass',    tier:'epic', icon:'🔥', stat:'attack',     value: 15,    powerValue: 310, effect:'+15 atk; each kill stacks heat +1; at 10 stacks all attacks burn for 3s (8% HP)',   lore:'A glass bead that sat in a cremation furnace for three years.' },
    { id:'r_windkeel',     name:'Wind Keel',      tier:'epic', icon:'🌬', stat:'gatherRate', value: 0.11,  powerValue: 245, effect:'+11% gather; movement creates trailing wind pushing pickup orbs toward you',         lore:'Carved from a kite that was never retrieved.' },
    { id:'r_obsidianskull',name:'Obsidian Skull', tier:'epic', icon:'💀', stat:'defense',    value: 13,    powerValue: 225, effect:'+13 def; once per run, absorbs up to 40 damage from a lethal hit',                  lore:'The skull of a soldier whose ghost refused the crossing.' },

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
    // W-Content-Pack-V2 legendary additions (+6)
    { id:'r_mistweave',    name:'Mist Weave',     tier:'legendary', icon:'🌫', stat:'hpMax',      value: 220,  stat2:'gatherRate', value2: 0.28, powerValue: 680,  effect:'+220 hp, +28% gather; on entering a new stage, briefly become intangible (1.5s)',             lore:'Wound from morning mist before it burned off. Has never been dry.' },
    { id:'r_copperbond',   name:'Copper Bond',    tier:'legendary', icon:'🪙', stat:'defense',    value: 30,   stat2:'attack',     value2: 40,   powerValue: 690,  effect:'+30 def, +40 atk; each blocked hit reflects 15% of damage back to attacker',               lore:'A binding used in a ritual that was only half-completed.' },
    { id:'r_inksworn',     name:'Ink Sworn',      tier:'legendary', icon:'✍', stat:'critRate',   value: 0.12, stat2:'hpMax',      value2: 210,  powerValue: 740,  effect:'+12% crit, +210 hp; after 3 crits, next attack is a guaranteed double crit',               lore:'Signed by a scribe in his own blood to bind a spirit.' },
    { id:'r_ironvow',      name:'Iron Vow',       tier:'legendary', icon:'⚒', stat:'attack',     value: 48,   stat2:'defense',    value2: 34,   powerValue: 770,  effect:'+48 atk, +34 def; when HP drops below 40%, both damage and defense increase 25%',         lore:'Sworn over an iron nail driven into a threshold.' },
    { id:'r_silverroot',   name:'Silver Root',    tier:'legendary', icon:'🌙', stat:'hpMax',      value: 245,  stat2:'defense',    value2: 35,   powerValue: 700,  effect:'+245 hp, +35 def; regenerate 1 HP per 2s; rate quadruples for 10s after a kill',         lore:'Grew from a split grave marker during a blood moon.' },
    { id:'r_jadephoenix',  name:'Jade Phoenix',   tier:'legendary', icon:'🐦', stat:'attack',     value: 52,   stat2:'critRate',   value2: 0.12, powerValue: 830,  effect:'+52 atk, +12% crit; on death (once per stage), revive at 40% HP with +20% damage for 10s', lore:'Carved by a physician as insurance. The phoenix was never tested.' },
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
    // W-Content-Pack-V2 mythic additions (+4)
    { id:'r_blacksun',     name:'Black Sun',      tier:'mythic', icon:'🌑', stat:'attack',     value: 155,  stat2:'critRate', value2: 0.29, powerValue: 2600, effect:'+155 atk, +29% crit; once per 30s, next attack unleashes an eclipse beam hitting all enemies on screen', lore:'The sun seen from the bottom of a well dug too deep. It stares back.' },
    { id:'r_voidcrystal',  name:'Void Crystal',   tier:'mythic', icon:'💎', stat:'hpMax',      value: 780,  stat2:'attack',  value2: 130,  powerValue: 2500, effect:'+780 hp, +130 atk; absorb first lethal hit each stage; overkill damage converts to bonus attack for 12s', lore:'Crystallized from nothing at the center of a place that ceased to exist.' },
    { id:'r_stormjaw',     name:'Storm Jaw',      tier:'mythic', icon:'⚡', stat:'defense',    value: 110,  stat2:'attack',  value2: 140,  powerValue: 2300, effect:'+110 def, +140 atk; every 10s, release lightning arc hitting 3 nearest enemies (30% max HP each)',        lore:'The jawbone of a creature struck by lightning so many times it became the storm.' },
    { id:'r_embershroud',  name:'Ember Shroud',   tier:'mythic', icon:'🔥', stat:'gatherRate', value: 0.78, stat2:'critRate',value2: 0.30, powerValue: 2800, effect:'+78% gather, +30% crit; all pickups leave ember trails; stepping through them grants +15% speed for 4s',  lore:"A funeral cloth that didn't burn. The ceremony was abandoned." },
  ];

  function byId(id) { return RELICS.find(r => r.id === id); }
  function byTier(tier) { return RELICS.filter(r => r.tier === tier); }
  function list() { return RELICS.slice(); }

  function init() {}
  window.WG.RelicsCatalog = { init, byId, byTier, list, RELICS };
})();
