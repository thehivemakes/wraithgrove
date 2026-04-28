// WG.Engine — core event bus + frame loop driver
(function(){'use strict';
  const listeners = {};
  function on(e,fn){(listeners[e]=listeners[e]||[]).push(fn);}
  function off(e,fn){const a=listeners[e];if(!a)return;const i=a.indexOf(fn);if(i>=0)a.splice(i,1);}
  function emit(e,p){const a=listeners[e];if(!a)return;for(let i=0;i<a.length;i++){try{a[i](p);}catch(err){console.error('[engine]',e,err);}}}

  let running = false, paused = false, lastFrameMs = 0, rafId = 0;
  let viewW = 0, viewH = 0;

  function tick(dt){ emit('tick', { dt }); }
  function start(){ running = true; lastFrameMs = performance.now(); emit('engine:start',{}); }
  function pause(){ paused = true; emit('engine:pause',{}); }
  function resume(){ paused = false; lastFrameMs = performance.now(); emit('engine:resume',{}); }
  function stop(){ running = false; emit('engine:stop',{}); }
  function onResize(w,h){ viewW=w; viewH=h; emit('resize',{w,h}); }

  window.WG.Engine = { on, off, emit, tick, start, pause, resume, stop, onResize,
    get running(){return running;}, get paused(){return paused;},
    get viewW(){return viewW;}, get viewH(){return viewH;},
    setLastFrame(ms){ lastFrameMs = ms; },
    getLastFrame(){ return lastFrameMs; },
  };
})();
