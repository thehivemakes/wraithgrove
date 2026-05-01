// WG.Engine — core event bus + frame loop driver
(function(){'use strict';
  const listeners = {};
  function on(e,fn){(listeners[e]=listeners[e]||[]).push(fn);}
  function off(e,fn){const a=listeners[e];if(!a)return;const i=a.indexOf(fn);if(i>=0)a.splice(i,1);}
  function emit(e,p){const a=listeners[e];if(!a)return;for(let i=0;i<a.length;i++){try{a[i](p);}catch(err){console.error('[engine]',e,err);}}}

  let running = false, paused = false, lastFrameMs = 0, rafId = 0;
  let viewW = 0, viewH = 0;
  // Hit-pause (DOPAMINE_DESIGN §9). Orthogonal to engine.pause/resume — additive,
  // never advances world time, render keeps ticking. Frame loop checks isHitPaused()
  // to gate world-sim; tick() also early-returns to keep tick subscribers quiet.
  let _pauseUntil = 0;

  function isHitPaused(){ return performance.now() < _pauseUntil; }
  function hitPause(durationMs){
    const target = performance.now() + (durationMs || 0);
    if (target > _pauseUntil) _pauseUntil = target;
    emit('engine:hitpause', { durationMs });
  }
  function tick(dt){ if (performance.now() < _pauseUntil) return; emit('tick', { dt }); }
  function start(){ running = true; lastFrameMs = performance.now(); emit('engine:start',{}); }
  function pause(){ paused = true; emit('engine:pause',{}); }
  function resume(){ paused = false; lastFrameMs = performance.now(); emit('engine:resume',{}); }
  function stop(){ running = false; emit('engine:stop',{}); }
  function onResize(w,h){ viewW=w; viewH=h; emit('resize',{w,h}); }

  window.WG.Engine = { on, off, emit, tick, start, pause, resume, stop, onResize,
    hitPause, isHitPaused,
    get running(){return running;}, get paused(){return paused;},
    get viewW(){return viewW;}, get viewH(){return viewH;},
    setLastFrame(ms){ lastFrameMs = ms; },
    getLastFrame(){ return lastFrameMs; },
  };
})();
