// WG.HuntWaves — wave manager: spawns enemies on a difficulty curve
(function(){'use strict';
  // SPEC §0 / W-Hard-Tuning-And-Monetization: wave-driven spawning.
  //   - stage.waveCount waves per stage (5 / 10 / 15 by tier — see hunt-stage.js)
  //   - stage.waveDurationSec per wave (90 / 100 / 110)
  //   - per-wave spawn-rate multiplier compounds 1.5× each wave (WAVE_RATE_MUL)
  //   - per-wave stat multiplier 1 + (waveIndex0 * WAVE_STAT_BASE) on hp/maxHp/damage
  //   - boss (if any) spawns at the START of the last wave so it shares the
  //     final wave's chaos rather than dropping into an empty arena
  //   - within a wave, baseRateInWave ramps 0.5 → 1.5 enemies/sec so wave 1
  //     opens approachable and wave-N tail-end is the brutal moment
  //
  // Wave 1 (waveIndex0=0) intentionally gives a 1.0 multiplier on both spawn
  // rate and stat scaling so new players have a foothold per architect mandate.

  // SPEC §0 — Night Mode is harder. Day Mode is the existing baseline (mul=1).
  const NIGHT_SPAWN_MUL = 1.6;   // applied to spawn rate when runtime.mode === 'night'
  const NIGHT_STAT_MUL  = 1.4;   // applied to enemy + boss hp/maxHp/damage at spawn

  // Per-wave compounding (named constants — exposed via WG.HuntWaves for tunables doc)
  const WAVE_RATE_MUL  = 1.5;    // spawn rate × this each wave (compounds)
  const WAVE_STAT_BASE = 0.18;   // STAT_MUL = 1 + (waveIndex0 * 0.18)

  // Within-wave intensity ramp (enemies/sec)
  const WAVE_BASE_RATE_MIN = 0.5;
  const WAVE_BASE_RATE_MAX = 1.5;

  function applyNightScaling(runtime, ent) {
    if (!ent || runtime.mode !== 'night') return ent;
    ent.hp     = Math.round(ent.hp     * NIGHT_STAT_MUL);
    ent.maxHp  = Math.round(ent.maxHp  * NIGHT_STAT_MUL);
    ent.damage = Math.round(ent.damage * NIGHT_STAT_MUL);
    return ent;
  }

  function applyWaveScaling(runtime, ent) {
    if (!ent || !runtime.wave) return ent;
    const w0 = (runtime.wave.index || 1) - 1;
    if (w0 <= 0) return ent;
    const mul = 1 + w0 * WAVE_STAT_BASE;
    ent.hp     = Math.round(ent.hp     * mul);
    ent.maxHp  = Math.round(ent.maxHp  * mul);
    ent.damage = Math.round(ent.damage * mul);
    return ent;
  }

  function ensureWave(runtime, stage) {
    if (runtime.wave) return runtime.wave;
    const total = stage.waveCount || 5;
    const dur   = stage.waveDurationSec || 90;
    runtime.wave = { index: 1, total, durationSec: dur, elapsedInWave: 0 };
    return runtime.wave;
  }

  function spawnInWindow(runtime, stage, dt) {
    const wave = ensureWave(runtime, stage);
    if (wave.index > wave.total) return; // stage running out the clock; clear-check in wg-game

    wave.elapsedInWave += dt;

    const w0 = wave.index - 1;
    const within = Math.min(1, wave.elapsedInWave / wave.durationSec);
    const baseRate = WAVE_BASE_RATE_MIN + (WAVE_BASE_RATE_MAX - WAVE_BASE_RATE_MIN) * within;
    let rate = baseRate * Math.pow(WAVE_RATE_MUL, w0);
    if (runtime.mode === 'night') rate *= NIGHT_SPAWN_MUL;

    runtime.spawnAccum += rate * dt;
    while (runtime.spawnAccum >= 1) {
      runtime.spawnAccum -= 1;
      spawnOne(runtime, stage);
    }

    // Boss spawns at the start of the last wave (once)
    if (wave.index === wave.total && !runtime.bossSpawned && stage.bossId) {
      runtime.bossSpawned = true;
      spawnBoss(runtime, stage);
    }

    // Wave advance
    if (wave.elapsedInWave >= wave.durationSec) {
      wave.index++;
      wave.elapsedInWave = 0;
      runtime.spawnAccum = 0;
      WG.Engine.emit('wave:advanced', { index: wave.index, total: wave.total });
    }
  }

  // Filter the stage mix down to types valid for this runtime mode. Catalog entry
  // mode = 'day' | 'night' | 'both' (or absent → 'both' for back-compat with the
  // original five types). The result is cached on the stage object so the filter
  // pass runs once per stage rather than every spawn.
  function _modeMixFor(runtime, stage) {
    if (stage._modeMix && stage._modeMix.mode === runtime.mode) return stage._modeMix.list;
    const TYPES = WG.HuntEnemies.TYPES;
    const list = (stage.enemyMix || ['lurker']).filter(id => {
      const t = TYPES[id];
      if (!t) return false;
      const m = t.mode || 'both';
      return m === 'both' || m === runtime.mode;
    });
    // Defensive: if filter empties the list (mis-tagged stage), fall back to lurker.
    const safe = list.length ? list : ['lurker'];
    stage._modeMix = { mode: runtime.mode, list: safe };
    return safe;
  }

  function spawnOne(runtime, stage) {
    const types = _modeMixFor(runtime, stage);
    const t = types[Math.floor(Math.random() * types.length)];
    // Pick spawn point near map edge, away from player
    const W = runtime.mapW, H = runtime.mapH;
    const p = runtime.player;
    let x, y, tries = 0;
    do {
      const edge = Math.floor(Math.random() * 4);
      if (edge === 0)      { x = Math.random() * W; y = 30; }
      else if (edge === 1) { x = Math.random() * W; y = H - 30; }
      else if (edge === 2) { x = 30;                y = Math.random() * H; }
      else                 { x = W - 30;            y = Math.random() * H; }
      tries++;
    } while (tries < 4 && p && Math.hypot(x-p.x, y-p.y) < 200);
    const e = WG.HuntEnemies.spawn(t, x, y);
    if (e) {
      applyWaveScaling(runtime, e);
      applyNightScaling(runtime, e);
      runtime.creatures.push(e);
    }
  }

  function spawnBoss(runtime, stage) {
    const W = runtime.mapW, H = runtime.mapH;
    const b = WG.HuntBosses.spawn(stage.bossId, W*0.5, 50);
    if (b) {
      applyWaveScaling(runtime, b);
      applyNightScaling(runtime, b);
      runtime.boss = b;
      WG.Engine.emit('boss:spawned', { boss: b, stageId: stage.id });
    }
  }

  function init() {}
  window.WG.HuntWaves = {
    init, spawnInWindow,
    NIGHT_SPAWN_MUL, NIGHT_STAT_MUL,
    WAVE_RATE_MUL, WAVE_STAT_BASE,
    WAVE_BASE_RATE_MIN, WAVE_BASE_RATE_MAX,
  };
})();
