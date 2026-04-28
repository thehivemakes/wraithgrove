// WG.RelicsCatalog — 48 relics across 5 rarity tiers (original IP)
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
    // Common (12)
    { id:'r_hempcord',   name:'Hempcord',         tier:'common', icon:'🧵', stat:'attack',     value: 2 },
    { id:'r_birchstrip', name:'Birch Strip',      tier:'common', icon:'📜', stat:'hpMax',      value: 12 },
    { id:'r_chippedbowl',name:'Chipped Bowl',     tier:'common', icon:'🥣', stat:'defense',    value: 1 },
    { id:'r_riverstone', name:'River Stone',      tier:'common', icon:'🪨', stat:'attack',     value: 3 },
    { id:'r_brokenpipe', name:'Broken Pipe',      tier:'common', icon:'🪈', stat:'gatherRate', value: 0.02 },
    { id:'r_stalkknife', name:'Stalk Knife',      tier:'common', icon:'🔪', stat:'attack',     value: 2 },
    { id:'r_sootash',    name:'Soot & Ash',       tier:'common', icon:'⚱', stat:'critRate',   value: 0.01 },
    { id:'r_clayrod',    name:'Clay Rod',          tier:'common', icon:'🥖', stat:'defense',    value: 2 },
    { id:'r_oilrag',     name:'Oil Rag',           tier:'common', icon:'🧻', stat:'gatherRate', value: 0.03 },
    { id:'r_dryroot',    name:'Dry Root',          tier:'common', icon:'🌱', stat:'hpMax',      value: 10 },
    { id:'r_mothleaf',   name:'Moth Leaf',         tier:'common', icon:'🍃', stat:'gatherRate', value: 0.025 },
    { id:'r_chippedaxe', name:'Chipped Axehead',   tier:'common', icon:'🪓', stat:'attack',     value: 3 },

    // Rare (12)
    { id:'r_ironbloom',  name:'Iron Bloom',       tier:'rare',   icon:'⚙', stat:'attack',     value: 8 },
    { id:'r_whitemoth',  name:'White Moth',       tier:'rare',   icon:'🦋', stat:'critRate',   value: 0.02 },
    { id:'r_lampshade',  name:'Lamp Shade',       tier:'rare',   icon:'🪔', stat:'hpMax',      value: 28 },
    { id:'r_silktape',   name:'Silk Tape',        tier:'rare',   icon:'🎗', stat:'defense',    value: 5 },
    { id:'r_quailbone',  name:'Quail Bone',       tier:'rare',   icon:'🦴', stat:'attack',     value: 7 },
    { id:'r_pinescent',  name:'Pine Scent',       tier:'rare',   icon:'🌲', stat:'gatherRate', value: 0.06 },
    { id:'r_pearlash',   name:'Pearl Ash',        tier:'rare',   icon:'🤍', stat:'defense',    value: 6 },
    { id:'r_stonehammer',name:'Stone Hammer',     tier:'rare',   icon:'🔨', stat:'attack',     value: 9 },
    { id:'r_bramblerope',name:'Bramble Rope',     tier:'rare',   icon:'🪢', stat:'critRate',   value: 0.023 },
    { id:'r_ricepouch',  name:'Rice Pouch',       tier:'rare',   icon:'🌾', stat:'hpMax',      value: 32 },
    { id:'r_inkbrush',   name:'Ink Brush',        tier:'rare',   icon:'🖌', stat:'gatherRate', value: 0.05 },
    { id:'r_owlfeather', name:'Owl Feather',      tier:'rare',   icon:'🪶', stat:'critRate',   value: 0.025 },

    // Epic (12)
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

    // Legendary (8)
    { id:'r_moonshear',  name:'Moonshear',        tier:'legendary', icon:'🌙', stat:'attack',     value: 38 },
    { id:'r_souldrift',  name:'Souldrift',        tier:'legendary', icon:'💫', stat:'critRate',   value: 0.12 },
    { id:'r_marrowveil', name:'Marrowveil',       tier:'legendary', icon:'🌫', stat:'hpMax',      value: 230 },
    { id:'r_paleforge',  name:'Paleforge',        tier:'legendary', icon:'🔥', stat:'attack',     value: 47 },
    { id:'r_grimroot',   name:'Grimroot',         tier:'legendary', icon:'🌳', stat:'defense',    value: 33 },
    { id:'r_silentbell', name:'Silent Bell',      tier:'legendary', icon:'🪘', stat:'gatherRate', value: 0.30 },
    { id:'r_ashtongue',  name:'Ash Tongue',       tier:'legendary', icon:'🔥', stat:'attack',     value: 55 },
    { id:'r_hollowmark', name:'Hollow Mark',      tier:'legendary', icon:'⚜', stat:'critRate',   value: 0.14 },

    // Mythic (4)
    { id:'r_wraithheart',name:'Wraithheart',      tier:'mythic', icon:'💜', stat:'attack',     value: 135 },
    { id:'r_voidlantern',name:'Void Lantern',     tier:'mythic', icon:'🪔', stat:'hpMax',      value: 800 },
    { id:'r_starpyre',   name:'Starpyre',         tier:'mythic', icon:'☄', stat:'critRate',   value: 0.30 },
    { id:'r_nightclasp', name:'Nightclasp',       tier:'mythic', icon:'🪙', stat:'defense',    value: 103 },
  ];

  function byId(id) { return RELICS.find(r => r.id === id); }
  function byTier(tier) { return RELICS.filter(r => r.tier === tier); }
  function list() { return RELICS.slice(); }

  function init() {}
  window.WG.RelicsCatalog = { init, byId, byTier, list, RELICS };
})();
