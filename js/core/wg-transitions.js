// WG.Transitions — biome-tinted fade-overlay transitions between stages
(function(){'use strict';
  const FADE_OUT_MS  = 280;
  const FADE_IN_MS   = 320;
  const PULSE_UP_MS  = 120;
  const PULSE_DOWN_MS = 200;
  const PULSE_PEAK   = 0.28;

  let _overlay = null;
  let _reducedMotion = false;

  function getBiomeColor(biome) {
    return (window.WG && WG.HuntStage && WG.HuntStage.getBiomeColor)
      ? WG.HuntStage.getBiomeColor(biome)
      : '#0c0a08';
  }

  // Snap overlay to opaque biome color, then fade back to transparent.
  // Call this BEFORE the stage-select snap-cut so the swap happens behind
  // the opaque layer and the player sees a smooth fade-in to the new stage.
  function snapAndFadeIn(biome) {
    if (!_overlay || _reducedMotion) return;
    const color = getBiomeColor(biome);
    _overlay.style.transition   = 'none';
    _overlay.style.background   = color;
    _overlay.style.opacity      = '1';
    _overlay.style.pointerEvents = 'auto';
    // Double rAF forces a committed paint before starting the CSS transition
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        _overlay.style.transition   = 'opacity ' + FADE_IN_MS + 'ms ease-in-out';
        _overlay.style.opacity      = '0';
        _overlay.style.pointerEvents = 'none';
      });
    });
  }

  // Fade to biome color (280ms), call cb() at the midpoint, fade back (320ms).
  // Used for stage-clear → results screen so the snap happens behind the overlay.
  function fadeAndThen(biome, cb) {
    if (!_overlay || _reducedMotion) { cb(); return; }
    const color = getBiomeColor(biome);
    _overlay.style.transition   = 'opacity ' + FADE_OUT_MS + 'ms ease-in-out';
    _overlay.style.background   = color;
    _overlay.style.opacity      = '1';
    _overlay.style.pointerEvents = 'auto';
    setTimeout(function() {
      cb();
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          _overlay.style.transition   = 'opacity ' + FADE_IN_MS + 'ms ease-in-out';
          _overlay.style.opacity      = '0';
          _overlay.style.pointerEvents = 'none';
        });
      });
    }, FADE_OUT_MS);
  }

  // Soft pulse: brief opacity flash, no full block (keeps action feel for wave turns).
  function _wavePulse(biome) {
    if (!_overlay || _reducedMotion) return;
    const color = getBiomeColor(biome);
    _overlay.style.transition  = 'none';
    _overlay.style.background  = color;
    _overlay.style.opacity     = '0';
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        _overlay.style.transition = 'opacity ' + PULSE_UP_MS + 'ms ease-in-out';
        _overlay.style.opacity    = String(PULSE_PEAK);
        setTimeout(function() {
          _overlay.style.transition = 'opacity ' + PULSE_DOWN_MS + 'ms ease-in-out';
          _overlay.style.opacity    = '0';
        }, PULSE_UP_MS);
      });
    });
  }

  function _onWaveAdvanced() {
    const rt = (window.WG && WG.Game) ? WG.Game.getHuntRuntime() : null;
    if (!rt || !rt.stage) return;
    _wavePulse(rt.stage.biome);
  }

  function init() {
    _overlay = document.getElementById('wg-fade-overlay');
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    _reducedMotion = mq.matches;
    mq.addEventListener('change', function(e) { _reducedMotion = e.matches; });
    WG.Engine.on('wave:advanced', _onWaveAdvanced);
  }

  window.WG.Transitions = { init, getBiomeColor, snapAndFadeIn, fadeAndThen };
})();
