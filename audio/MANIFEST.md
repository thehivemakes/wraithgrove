# Audio sourcing manifest — Wraithgrove

**Engine:** `js/core/wg-audio.js` (Concern A, shipped 2026-04-28)
**Format:** mp3 (universal browser support, mobile-friendly file size)
**Mono OK** for all SFX. Stereo for ambient.
**Loudness target:** -18 LUFS for SFX, -23 LUFS for ambient (so ambient sits behind SFX without ducking).

The audio engine **fails silent** if a file is missing — it warns once to console and moves on. So you can land files in any order; the game keeps working. Drop-in a few SFX, hear them in-game; drop-in more later.

---

## Directory layout

```
audio/
├── sfx/             — gameplay one-shots (combat, hits, deaths)
├── ambient/         — looping background per biome
├── ui/              — UI clicks, modals, IAP, duel results
└── MANIFEST.md      — this file
```

---

## SFX needed (16 files)

| File | Source | Notes |
|---|---|---|
| `audio/sfx/swing.mp3` | Kenney "Impact Sounds" → swoosh / whoosh | Quick wood/blade swing. ≤200ms. Throttled to 60ms in-engine. |
| `audio/sfx/fire_arrow.mp3` | Kenney "Impact Sounds" → arrow_shoot | Bowstring + air. ≤300ms. |
| `audio/sfx/skill_burst.mp3` | Freesound "explosion shockwave" CC0 | Heavy impact, low rumble. ≤1.0s. The 22s-cooldown signature sound. |
| `audio/sfx/player_hurt.mp3` | Kenney "Voice Pack" → hurt grunt | Muffled "ugh." ≤400ms. Throttled to 200ms. |
| `audio/sfx/player_die.mp3` | Freesound "fall down" / "death gasp" CC0 | Slightly longer, despairing. ≤1.5s. |
| `audio/sfx/level_up.mp3` | Kenney "RPG Audio" → level up chime | Triumphal arpeggio. ≤1.0s. |
| `audio/sfx/pet_attack.mp3` | Kenney "Animal Pack" → small bite/peck | Lighter than swing. ≤200ms. |
| `audio/sfx/boss_hit.mp3` | Kenney "Impact Sounds" → heavy thump | Meaty — bass-heavy. ≤300ms. |
| `audio/sfx/boss_die.mp3` | Freesound "monster death" CC0 | 1-2s death rattle. Stinger: ambient ducks under it. |
| `audio/sfx/orb.mp3` | Kenney "Interface Sounds" → click_soft | Tiny ping. ≤120ms. |
| `audio/sfx/coin.mp3` | Kenney "Casino Audio" → coin clink | Bright. ≤200ms. |
| `audio/sfx/fragment.mp3` | Kenney "Interface Sounds" → glass_chime | Crystalline. ≤300ms. |
| `audio/sfx/craft.mp3` | Freesound "anvil hammer" CC0 | Forge clang. ≤800ms. |

## Ambient needed (6 biomes)

| File | Biome | Source | Notes |
|---|---|---|---|
| `audio/ambient/forest_day.mp3` | forest_summer | Sonniss GDC archive — forest birds | 60-120s loop. Bright, daytime. |
| `audio/ambient/forest_dusk.mp3` | forest_autumn | Sonniss — autumn wind through dry leaves | 60-120s loop. Sparser birds, more wind. |
| `audio/ambient/wind_stone.mp3` | cold_stone | Sonniss — high-altitude wind, stone | 60-120s loop. No fauna. |
| `audio/ambient/temple_drone.mp3` | temple | Freesound CC0 — low drone + distant chime | 90-120s loop. The Eastern folk-horror register. |
| `audio/ambient/cave_drips.mp3` | cave | Freesound CC0 — water drips + cave reverb | 60-120s loop. Sparse, claustrophobic. |
| `audio/ambient/wraith_choir.mp3` | eldritch | Freesound CC0 — choral pad + dissonant hum | 90-120s loop. The Wraith Father biome. Most processed. |

## UI needed (7 files)

| File | Source | Notes |
|---|---|---|
| `audio/ui/ui_tab.mp3` | Kenney "Interface Sounds" → switch | Tab change. ≤120ms. |
| `audio/ui/ui_button.mp3` | Kenney "Interface Sounds" → click | Generic button. ≤80ms. Throttled. |
| `audio/ui/ui_modal.mp3` | Kenney "Interface Sounds" → glass_004 | Modal open. ≤200ms. |
| `audio/ui/cha_ching.mp3` | Freesound CC0 — cash register | IAP success. ≤1.0s. |
| `audio/ui/duel_win.mp3` | Kenney "RPG Audio" → victory fanfare | Async PvP win. ≤2.0s. |
| `audio/ui/duel_lose.mp3` | Kenney "RPG Audio" → defeat sting | Async PvP loss. ≤1.5s. |

---

## Source URLs

- **Kenney.nl** (CC0): https://kenney.nl/assets/category:Audio
  - Impact Sounds, Interface Sounds, RPG Audio, Casino Audio, Animal Pack, Voice Pack
  - License: CC0 1.0 — no attribution required
- **Freesound** (filter to CC0): https://freesound.org/search/?f=license%3A%22Creative+Commons+0%22
- **Sonniss GDC archive** (royalty-free pro audio): https://sonniss.com/gameaudiogdc

---

## Drop-in workflow

1. Download Kenney packs first — single zip per pack covers most SFX/UI files.
2. Convert to mp3 (128kbps mono for SFX, 192kbps stereo for ambient) via `ffmpeg`:
   ```
   ffmpeg -i input.wav -ac 1 -b:a 128k audio/sfx/swing.mp3
   ffmpeg -i input.wav -ac 2 -b:a 192k audio/ambient/forest_day.mp3
   ```
3. Save under the exact filename in the table above.
4. Reload http://localhost:3996/ — the audio context arms on first tap and starts playing immediately.

## Verification

In browser console after first tap:
```js
WG.Audio._state()
// → { ctx: true, ambientId: 'forest_day' (or null), settings: {...}, missing: [...ids of files not yet on disk...] }
```

The `missing` array shows which files the engine tried to fetch and 404'd on. Empty array = all wired sounds have files.

## Mute / volume API

```js
WG.Audio.setMuted(true)            // kill all sound
WG.Audio.setVolume('master', 0.5)  // master 50%
WG.Audio.setVolume('sfx', 1.0)     // sfx 100%
WG.Audio.setVolume('ambient', 0.4) // ambient 40%
WG.Audio.setVolume('ui', 0.7)      // ui 70%
WG.Audio.getSettings()             // current state
```

Settings persist to `localStorage.wg_audio_v1`. Architect-touch task: add a settings panel UI (separate Concern, post-Concern-B).

---

## What's NOT in this manifest

- **Music tracks beyond ambient.** No menu music, no boss-fight music. The Wood Siege register is sparse — ambient only. Add later if playtest demands.
- **Per-stage variants.** All forest_summer stages share `forest_day.mp3`. Variation comes from gameplay, not audio.
- **Voice acting.** None. Eastern folk-horror register stays mostly silent / atmospheric.

If a future Claude wants to expand: add rows to `EVENT_MAP` in `wg-audio.js`, add files here, done. No engine change needed.
