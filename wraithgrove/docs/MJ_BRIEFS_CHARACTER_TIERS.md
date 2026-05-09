# MJ_BRIEFS_CHARACTER_TIERS — Rebirth Tier Portrait Art

> **For Architect-driven Sonnet + Chrome MCP session only.**
> Source: `js/ascend/ascend-skins.js` — character CHARACTERS table.
> Tier 1 portraits already exist (from W-Player-Sprites-MJ-Chrome). These briefs cover tier 2 and above only.
> Total: 17 distinct portrait briefs.

**Architecture lock (inherited from W-Player-Sprites-MJ-Chrome):**
- Sprites MUST be WEAPONLESS — weapon is animated overlay
- Signature item IS in the sprite — defines character identity
- Each tier changes cosmetic appearance, not the signature item itself (the item may upgrade in appearance)

**Shared style anchor:**
```
chibi anime sprite, tiny full-body 1/4 view, sharp pixel-clean edges, soft black drop shadow at feet, neutral muted backdrop, no realistic shading, no photorealism, no text, NO weapon, --ar 1:1 --v 7 --stylize 800
```

Output paths: `images/portraits/<char_id>_t<N>.png`

Variation selection: always pick grid variation #1 (top-left), matching the anchor set for tier-1 sprites.

---

## lantern_acolyte

**Archetype:** schoolgirl | **Signature item:** red paper lantern (never remove — may evolve appearance)

### lantern_acolyte_t2 — Wandering Lantern
**Output:** `images/portraits/lantern_acolyte_t2.png`
**Colors:** #a87838 body (warm amber-tan), #ffd870 accent (gold)
**From tier 1:** pale cream → warm amber travel layers; crimson sash → gold sash; lantern upgrades to hanging lantern on bamboo pole over shoulder; travel sandals replace school shoes; slight weathering at hem
**Stage gate:** stage 1 clear (earliest unlock — tutorial reward feel)

**MJ prompt:**
```
chibi anime sprite, young woman schoolgirl archetype, warm amber-tan layered travel kimono with gold sash, dark hair tied back with gold ribbon, red paper lantern hanging from bamboo pole carried over left shoulder, right hand free at side, travel sandals visible, NO weapon, chibi anime sprite, tiny full-body 1/4 view, sharp pixel-clean edges, soft black drop shadow at feet, neutral muted backdrop, no realistic shading, no photorealism, no text
```

---

### lantern_acolyte_t3 — Lantern Bride
**Output:** `images/portraits/lantern_acolyte_t3.png`
**Colors:** #e8d0d8 body (pale blush rose), #a82828 accent (crimson)
**From tier 2:** travel warmth → ceremonial white-adjacent bridal look; kimono shifts pale rose-blush; gold sash → crimson obi; bridal headdress (white shiromuku-style veil with crimson pins); lantern glows brighter red with ceremonial wrap
**Stage gate:** stage 4 clear

**MJ prompt:**
```
chibi anime sprite, young woman schoolgirl archetype, pale rose-blush ceremonial wedding kimono with wide crimson obi sash, dark hair in formal bridal bun with white shiromuku veil and crimson kanzashi pins, glowing red paper lantern held aloft in left hand with ceremonial red silk wrap, right hand at side, NO weapon, chibi anime sprite, tiny full-body 1/4 view, sharp pixel-clean edges, soft black drop shadow at feet, neutral muted backdrop, no realistic shading, no photorealism, no text
```

---

### lantern_acolyte_t4 — Crowned Vigil
**Output:** `images/portraits/lantern_acolyte_t4.png`
**Colors:** #d8a838 body (gold-amber), #ffe888 accent (pale gold)
**From tier 3:** bridal softness → imperial authority; robe shifts gold-amber with pale gold dragon-crest embroidery; ornate crown headdress replaces veil; lantern becomes divine gold-cased artifact with ethereal inner glow
**Stage gate:** stage 12 clear (second-rarest unlock)

**MJ prompt:**
```
chibi anime sprite, young woman schoolgirl archetype, gold-amber imperial robe with pale gold dragon-crest sleeve embroidery, dark hair in tall regal crown-bun with ornate gold-leaf crown headdress, glowing gold-cased divine lantern held aloft in left hand emitting soft ethereal inner light, right hand at side, imperial bearing, NO weapon, chibi anime sprite, tiny full-body 1/4 view, sharp pixel-clean edges, soft black drop shadow at feet, neutral muted backdrop, no realistic shading, no photorealism, no text
```

---

## sigil_student

**Archetype:** white-haired scholar | **Signature item:** talisman scroll in left hand

### sigil_student_t2 — Talisman Adept
**Output:** `images/portraits/sigil_student_t2.png`
**Colors:** #d8c8a0 body (warm parchment), #604058 accent (deep plum)
**From tier 1:** pale cream + grey → warm parchment + deep plum; practiced air; more talismans floating around shoulders (adept-level control); sash more elaborate
**Stage gate:** stage 6 clear

**MJ prompt:**
```
chibi anime sprite, young woman white-haired archetype, warm parchment-tan scholar robe with deep plum-purple sash, long white hair in low loose braid, multiple glowing talisman scrolls floating around shoulders in an arc, left hand holding primary talisman scroll, right hand gesturing upward, NO weapon, chibi anime sprite, tiny full-body 1/4 view, sharp pixel-clean edges, soft black drop shadow at feet, neutral muted backdrop, no realistic shading, no photorealism, no text
```

---

### sigil_student_t3 — Pale Reader
**Output:** `images/portraits/sigil_student_t3.png`
**Colors:** #f8f0e8 body (near-white), #3a2858 accent (deep indigo)
**From tier 2:** parchment → near-white ethereal; plum → deep indigo markings painted on sleeves and neck; talisman orbit becomes complex constellation; subtle eye glow
**Stage gate:** stage 14 clear

**MJ prompt:**
```
chibi anime sprite, young woman white-haired archetype, near-white ethereal scholar robes with deep indigo sash and brushstroke sigil markings on sleeves and collar, long white hair floating slightly with indigo-tipped ends, dense constellation of glowing talisman papers orbiting the figure in layered rings, left hand raised with palm-sigil mark glowing, right hand holding primary scroll, eyes with subtle indigo glow, NO weapon, chibi anime sprite, tiny full-body 1/4 view, sharp pixel-clean edges, soft black drop shadow at feet, neutral muted backdrop, no realistic shading, no photorealism, no text
```

---

## horned_oni

**Archetype:** samurai | **Signature item:** red oni mask + horns worn on forehead (NOT a hand item)

### horned_oni_t2 — Iron Oni
**Output:** `images/portraits/horned_oni_t2.png`
**Colors:** #601818 body (dark maroon), #a8a8a8 accent (silver)
**From tier 1:** crimson lacquer armor + gold → dark maroon-black iron plate armor + silver; heavier shoulder guard; oni mask more battle-worn and grimy; silver chain at collar
**Stage gate:** stage 8 clear

**MJ prompt:**
```
chibi anime sprite, young man samurai archetype, dark maroon-black iron-plate armor with silver-trimmed pauldron shoulder guards, short dark unkempt hair, battle-worn red oni mask with horns mounted on forehead visibly grimy, silver chain detail at collar, scarred and dented armor surface texture, both hands at sides, NO weapon, chibi anime sprite, tiny full-body 1/4 view, sharp pixel-clean edges, soft black drop shadow at feet, neutral muted backdrop, no realistic shading, no photorealism, no text
```

---

### horned_oni_t3 — Crimson Daimyo
**Output:** `images/portraits/horned_oni_t3.png`
**Colors:** #601020 body (very dark crimson), #ffd870 accent (bright gold)
**From tier 2:** raw iron → daimyo ceremony; full elaborate shoulder armor with clan crest in gold; floor-length haori cloak; ornate oni mask with gold-filigree horns; gold clan seal on chest plate
**Stage gate:** stage 16 clear

**MJ prompt:**
```
chibi anime sprite, young man samurai archetype, very dark crimson daimyo armor with large elaborate gold-crested pauldrons and floor-length haori coat, dark hair slicked under crested battle-helm, ornate red oni mask with gold-filigree horns and gold border engraving, gold clan crest seal on chest plate, both hands at sides, NO weapon, chibi anime sprite, tiny full-body 1/4 view, sharp pixel-clean edges, soft black drop shadow at feet, neutral muted backdrop, no realistic shading, no photorealism, no text
```

---

## paper_priest

**Archetype:** jiangshi (hopping vampire/zombie) | **Signature item:** paper amulets floating around shoulders

### paper_priest_t2 — Talisman Walker
**Output:** `images/portraits/paper_priest_t2.png`
**Colors:** #604030 body (mid earth-brown), #fff0c0 accent (warm cream)
**From tier 1:** deep brown → mid earth-brown; more elaborate floating talisman cluster; talismans emit warm amber glow; arms remain stiff jiangshi style; hood still pulled up
**Stage gate:** stage 7 clear

**MJ prompt:**
```
chibi anime sprite, androgynous jiangshi archetype, mid earth-brown hooded robe with warm cream talisman amulet papers floating around the shoulders in a denser cluster, wide cloth hood pulled up over the head, multiple extra amulet papers pinned to chest, arms straight and stiff at sides jiangshi-style, warm amber glow emanating from the talisman cluster, NO weapon, chibi anime sprite, tiny full-body 1/4 view, sharp pixel-clean edges, soft black drop shadow at feet, neutral muted backdrop, no realistic shading, no photorealism, no text
```

---

### paper_priest_t3 — Mortuary Master
**Output:** `images/portraits/paper_priest_t3.png`
**Colors:** #1a1020 body (near-black), #a060ff accent (violet-purple)
**From tier 2:** earthy warm → funerary near-black; ornate silver mortuary charm medallion at chest; talisman papers glow violet-purple; purple mist wisps from hem and sleeves
**Stage gate:** stage 15 clear

**MJ prompt:**
```
chibi anime sprite, androgynous jiangshi archetype, near-black funerary robes with wide dark cloth hood, ornate silver mortuary charm medallion hanging at chest, violet-purple glowing talisman amulet papers floating around the body, purple mist wisps rising from hem and sleeve cuffs, arms straight and stiff at sides jiangshi-style, NO weapon, chibi anime sprite, tiny full-body 1/4 view, sharp pixel-clean edges, soft black drop shadow at feet, neutral muted backdrop, no realistic shading, no photorealism, no text
```

---

## silent_seer

**Archetype:** seated-posture grim (render as standing tall for sprite) | **Signature item:** white silk blindfold wrapping both eyes

### silent_seer_t2 — Throned Seer
**Output:** `images/portraits/silent_seer_t2.png`
**Colors:** #3a1018 body (deep crimson), #ffd870 accent (bright gold)
**From tier 1:** near-black + muted gold → deep crimson + bright gold; blindfold more ornate with gold thread embroidery; two spectral golden orbs float at each shoulder; more authoritative posture; gold sash
**Stage gate:** stage 12 clear

**MJ prompt:**
```
chibi anime sprite, grim standing archetype, deep crimson ceremonial robe with bright gold sash and gold sleeve cuffs, dark hair pinned up in bun, elaborate white silk blindfold with gold thread embroidery wrapping both eyes, two spectral golden orb wisps floating at each shoulder, one hand raised in a slow deliberate blessing gesture, NO weapon, chibi anime sprite, tiny full-body 1/4 view, sharp pixel-clean edges, soft black drop shadow at feet, neutral muted backdrop, no realistic shading, no photorealism, no text
```

---

## scythe_widow

**Archetype:** hooded reaper | **Signature item:** black widow's veil over face (NO scythe — that is her weapon)

### scythe_widow_t2 — Veil Reaper
**Output:** `images/portraits/scythe_widow_t2.png`
**Colors:** #0a0a18 body (near-pure black), #c060ff accent (violet-purple)
**From tier 1:** near-black + grey-silver → near-pure-black + vivid violet-purple; veil more elaborate with violet glow at edges; purple mist at feet; elongated silhouette; hands tucked in sleeves
**Stage gate:** stage 9 clear

**MJ prompt:**
```
chibi anime sprite, young woman hooded reaper archetype, near-pure-black flowing robes with violet-purple glowing hem mist, deep hood pulled forward, elaborate black widow's veil over face glowing faintly violet at its edges, purple wisps swirling around feet and ankles, both hands tucked into opposite sleeves, NO weapon, chibi anime sprite, tiny full-body 1/4 view, sharp pixel-clean edges, soft black drop shadow at feet, neutral muted backdrop, no realistic shading, no photorealism, no text
```

---

### scythe_widow_t3 — Hollow Empress
**Output:** `images/portraits/scythe_widow_t3.png`
**Colors:** #101830 body (midnight blue-black), #ffe0a0 accent (warm gold)
**From tier 2:** void black + purple → midnight blue-black + warm gold; empress transformation; ornate gold diadem crown visible through veil; veil becomes translucent with gold star pattern; gold hemline and sleeve trim; regal posture
**Stage gate:** stage 17 clear (rarest unlock)

**MJ prompt:**
```
chibi anime sprite, young woman hooded reaper archetype, midnight blue-black empress gown with gold-leaf hem trim and wide sleeves, dark hood slightly pulled back revealing ornate gold diadem crown visible through translucent black widow's veil with faint gold star pattern woven in, gold-trimmed sleeve edges, both hands at sides in regal posture, NO weapon, chibi anime sprite, tiny full-body 1/4 view, sharp pixel-clean edges, soft black drop shadow at feet, neutral muted backdrop, no realistic shading, no photorealism, no text
```

---

## ash_brawler

**Archetype:** afro brawler | **Signature item:** dark knuckle wraps + bandaged forearms (both arms, always visible)

### ash_brawler_t2 — Cinder Champion
**Output:** `images/portraits/ash_brawler_t2.png`
**Colors:** #1a1010 body (near-black coal), #ff8040 accent (vivid orange-red)
**From tier 1:** deep brown vest + orange wraps → near-black coal vest + ember-orange glowing wraps; knuckle gaps glow ember-orange; ash wisps rising from wraps; afro hair tips ash-grey; more seasoned battle look
**Stage gate:** stage 11 clear

**MJ prompt:**
```
chibi anime sprite, young man afro brawler archetype, near-black coal-colored open vest with heavy bandage wraps on both forearms and knuckles glowing vivid ember-orange at the knuckle gaps, natural afro hair with ash-grey singed tips, ember sparks and ash wisps rising from the glowing knuckle wraps, both fists clenched at ready idle stance at sides, NO weapon, chibi anime sprite, tiny full-body 1/4 view, sharp pixel-clean edges, soft black drop shadow at feet, neutral muted backdrop, no realistic shading, no photorealism, no text
```

---

## fox_kabuki

**Archetype:** fox mask performer | **Signature item:** white-and-red fox mask + folding fan in right hand

### fox_kabuki_t2 — Nine-Tail Dancer
**Output:** `images/portraits/fox_kabuki_t2.png`
**Colors:** #80101a body (deep burgundy), #fff0c0 accent (cream white)
**From tier 1:** crimson + warm gold → deep burgundy + cream white; more elaborate kabuki mask detail (extra painted lines); folding fan now cream-white with more intricate print; two or three stylized fox tail shapes visible behind hem
**Stage gate:** stage 8 clear

**MJ prompt:**
```
chibi anime sprite, young woman fox mask performer archetype, deep burgundy kimono with cream-white sash and cream sleeve cuffs, dark hair in elaborate geisha updo, white-and-red fox kabuki mask with more painted detail lines on cheeks, ornate cream folding fan held in right hand open, two stylized pale fox tail silhouettes emerging from behind the kimono hem, left hand gesturing outward, NO weapon, chibi anime sprite, tiny full-body 1/4 view, sharp pixel-clean edges, soft black drop shadow at feet, neutral muted backdrop, no realistic shading, no photorealism, no text
```

---

### fox_kabuki_t3 — Kitsune Empress
**Output:** `images/portraits/fox_kabuki_t3.png`
**Colors:** #481020 body (very dark plum), #ffd870 accent (bright gold)
**From tier 2:** deep burgundy + cream → very dark plum + bright gold; nine glowing gold tails burst from behind; ornate gold fox-crown headdress atop the mask; golden fan; phoenix-crest sleeve embroidery
**Stage gate:** stage 14 clear

**MJ prompt:**
```
chibi anime sprite, young woman fox mask performer archetype, very dark plum imperial kimono with gold phoenix-crest embroidery on sleeves, dark hair in tall crown-bun, ornate white-and-gold kitsune fox mask with elaborate gold crown headdress mounted above it, golden folding fan held high in right hand, nine glowing gold fox tails fanning out from behind the figure in a wide arc, left hand at side, NO weapon, chibi anime sprite, tiny full-body 1/4 view, sharp pixel-clean edges, soft black drop shadow at feet, neutral muted backdrop, no realistic shading, no photorealism, no text
```

---

## cap_apprentice

**Archetype:** cap boy | **Signature item:** wide straw cap + small traveling cloak (item evolves at t2)

### cap_apprentice_t2 — Hooded Wanderer
**Output:** `images/portraits/cap_apprentice_t2.png`
**Colors:** #202830 body (dark slate-blue), #a8d8e8 accent (pale ice blue)
**From tier 1:** dark olive-grey tunic + sky blue → dark slate-blue traveler's coat + pale ice blue; straw cap replaced with worn fabric travel cowl (hood up); longer cloak; small rounded travel pack on back visible; more seasoned wanderer look
**Stage gate:** stage 5 clear

**MJ prompt:**
```
chibi anime sprite, young boy cap archetype, dark slate-blue hooded traveler's coat over pale ice-blue undershirt, natural hair under worn fabric travel cowl hood pulled up replacing the straw cap, small rounded travel pack visible on back, both hands in coat pockets, wide curious eyes visible under cowl shadow, NO weapon, chibi anime sprite, tiny full-body 1/4 view, sharp pixel-clean edges, soft black drop shadow at feet, neutral muted backdrop, no realistic shading, no photorealism, no text
```

---

## Tier count reference

| char_id | tier 2 | tier 3 | tier 4 | total |
|---|---|---|---|---|
| lantern_acolyte | Wandering Lantern | Lantern Bride | Crowned Vigil | 3 |
| sigil_student | Talisman Adept | Pale Reader | — | 2 |
| horned_oni | Iron Oni | Crimson Daimyo | — | 2 |
| paper_priest | Talisman Walker | Mortuary Master | — | 2 |
| silent_seer | Throned Seer | — | — | 1 |
| scythe_widow | Veil Reaper | Hollow Empress | — | 2 |
| ash_brawler | Cinder Champion | — | — | 1 |
| fox_kabuki | Nine-Tail Dancer | Kitsune Empress | — | 2 |
| cap_apprentice | Hooded Wanderer | — | — | 1 |
| **Total** | | | | **17** |
