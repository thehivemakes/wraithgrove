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

## SFX needed (13 files)

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

## UI needed (6 files)

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

---

## Sources used (this download — W-Audio-Sourcing, 2026-05-01)

All 25 files present (13 sfx + 6 ambient + 6 ui). Total disk: **6.6 MB** of 50 MB budget. License: **CC0 / public-domain only.**

### SFX — Kenney CC0 packs (mono 128 kbps mp3)

| File | Source pack | Source file | License |
|---|---|---|---|
| `sfx/swing.mp3` | Kenney RPG Audio | `Audio/chop.ogg` | CC0 — https://kenney.nl/assets/rpg-audio |
| `sfx/fire_arrow.mp3` | Kenney RPG Audio | `Audio/knifeSlice2.ogg` (trim 0.3 s) | CC0 — https://kenney.nl/assets/rpg-audio |
| `sfx/skill_burst.mp3` | Kenney Sci-Fi Sounds | `Audio/lowFrequency_explosion_001.ogg` | CC0 — https://kenney.nl/assets/sci-fi-sounds |
| `sfx/player_hurt.mp3` | Kenney Voiceover Pack (Fighter) | `Audio/1.ogg` (trim 0.4 s) | CC0 — https://kenney.nl/assets/voiceover-pack-fighter |
| `sfx/player_die.mp3` | Kenney Voiceover Pack (Fighter) | `Audio/7.ogg` | CC0 — https://kenney.nl/assets/voiceover-pack-fighter |
| `sfx/level_up.mp3` | Kenney Digital Audio | `Audio/zapThreeToneUp.ogg` | CC0 — https://kenney.nl/assets/digital-audio |
| `sfx/pet_attack.mp3` | Kenney Impact Sounds | `Audio/impactSoft_medium_002.ogg` | CC0 — https://kenney.nl/assets/impact-sounds |
| `sfx/boss_hit.mp3` | Kenney Impact Sounds | `Audio/impactPunch_heavy_002.ogg` (trim 0.3 s) | CC0 — https://kenney.nl/assets/impact-sounds |
| `sfx/boss_die.mp3` | Kenney Sci-Fi Sounds | `Audio/explosionCrunch_002.ogg` | CC0 — https://kenney.nl/assets/sci-fi-sounds |
| `sfx/orb.mp3` | Kenney Interface Sounds | `Audio/pluck_001.ogg` | CC0 — https://kenney.nl/assets/interface-sounds |
| `sfx/coin.mp3` | Kenney RPG Audio | `Audio/handleCoins2.ogg` | CC0 — https://kenney.nl/assets/rpg-audio |
| `sfx/fragment.mp3` | Kenney Interface Sounds | `Audio/glass_001.ogg` | CC0 — https://kenney.nl/assets/interface-sounds |
| `sfx/craft.mp3` | Kenney RPG Audio | `Audio/metalPot2.ogg` | CC0 — https://kenney.nl/assets/rpg-audio |

### UI — Kenney CC0 packs (mono 128 kbps mp3)

| File | Source pack | Source file | License |
|---|---|---|---|
| `ui/ui_tab.mp3` | Kenney Interface Sounds | `Audio/switch_002.ogg` (trim 0.15 s) | CC0 — https://kenney.nl/assets/interface-sounds |
| `ui/ui_button.mp3` | Kenney Interface Sounds | `Audio/click_002.ogg` | CC0 — https://kenney.nl/assets/interface-sounds |
| `ui/ui_modal.mp3` | Kenney Interface Sounds | `Audio/glass_004.ogg` (trim 0.25 s) | CC0 — https://kenney.nl/assets/interface-sounds |
| `ui/cha_ching.mp3` | Kenney RPG Audio | `Audio/handleCoins.ogg` | CC0 — https://kenney.nl/assets/rpg-audio |
| `ui/duel_win.mp3` | Kenney Digital Audio | `Audio/threeTone2.ogg` | CC0 — https://kenney.nl/assets/digital-audio |
| `ui/duel_lose.mp3` | Kenney Digital Audio | `Audio/zapThreeToneDown.ogg` | CC0 — https://kenney.nl/assets/digital-audio |

### Ambient — synthesized via ffmpeg (stereo 128 kbps mp3, original generation, public-domain clean)

No third-party audio used. Each file generated from pure noise/sine primitives via `ffmpeg -f lavfi`. Loop-friendly (no abrupt fades).

| File | Generator | Length |
|---|---|---|
| `ambient/forest_day.mp3` | brown noise, bandpass 80–1800 Hz | 60 s |
| `ambient/forest_dusk.mp3` | brown noise, bandpass 120–900 Hz, slow tremolo | 60 s |
| `ambient/wind_stone.mp3` | white noise, bandpass 300–2200 Hz, slow tremolo | 60 s |
| `ambient/temple_drone.mp3` | sine 82.4 Hz + 123.5 Hz (root + perfect-5th), tremolo | 90 s |
| `ambient/cave_drips.mp3` | quiet brown bed + 600 Hz drip pings every 5 s, lowpass 4 kHz | 60 s |
| `ambient/wraith_choir.mp3` | sine 87.3 + 92.5 + 174.6 Hz (minor-2nd cluster), tremolo | 90 s |

**Quality note (be honest):** ambients are placeholder-grade synthesized beds, not field recordings. Drones (temple/wraith/cave) sit cleanly in the Eastern folk-horror register. Forest/wind beds suggest texture without nature detail. Replace with Sonniss/Freesound CC0 field recordings when network access to those services is available.

### Tools used

- `curl` — fetch Kenney pack zips from `https://kenney.nl/media/pages/assets/...`.
- `unzip` — extract to `/tmp/wraith-audio/`.
- `ffmpeg` — convert ogg→mp3, trim, and synthesize ambient beds via `lavfi`.

### Replacement workflow (future Claude)

To swap any file, drop a new mp3 at the same path. Engine fail-silent means you can do this live with the server running. To replace an ambient with a field recording, prefer 60–120 s loop-friendly cuts at -23 LUFS, stereo, 128–192 kbps mp3.
