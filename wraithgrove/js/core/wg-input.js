// WG.Input — virtual joystick + keyboard fallback for Hunt mode
(function(){'use strict';
  const D = () => window.WG.Display;

  const state = {
    joystickActive: false,
    joystickId: null,
    joystickStart: { x: 0, y: 0 },
    joystickCurrent: { x: 0, y: 0 },
    dirX: 0, dirY: 0, magnitude: 0,
    skillTrigger: false,
    keys: {},
  };

  const DEAD_ZONE = 8;
  const MAX_RADIUS = 60;

  function leftHalf(x){ return x < D().width * 0.5; }

  function setupCanvas(){
    const c = D().canvas;
    c.addEventListener('pointerdown', onDown, { passive: false });
    c.addEventListener('pointermove', onMove, { passive: false });
    c.addEventListener('pointerup',   onUp,   { passive: false });
    c.addEventListener('pointercancel', onUp, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);
  }

  function isHuntActive(){ return WG.State.get().activeTab === 'hunt'; }

  function onDown(e){
    if (!isHuntActive()) return;
    e.preventDefault();
    if (leftHalf(e.clientX) && state.joystickId === null) {
      state.joystickId = e.pointerId;
      state.joystickActive = true;
      state.joystickStart.x = e.clientX;
      state.joystickStart.y = e.clientY;
      state.joystickCurrent.x = e.clientX;
      state.joystickCurrent.y = e.clientY;
      const vis = document.getElementById('hunt-joystick');
      if (vis) {
        vis.style.left = (e.clientX - 48) + 'px';
        vis.style.top  = (e.clientY - 48) + 'px';
        vis.classList.add('active');
        const knob = vis.querySelector('.knob');
        if (knob) { knob.style.left = '30px'; knob.style.top = '30px'; }
      }
    }
  }
  function onMove(e){
    if (e.pointerId !== state.joystickId) return;
    state.joystickCurrent.x = e.clientX;
    state.joystickCurrent.y = e.clientY;
    const vis = document.getElementById('hunt-joystick');
    const knob = vis && vis.querySelector('.knob');
    if (knob) {
      let dx = e.clientX - state.joystickStart.x;
      let dy = e.clientY - state.joystickStart.y;
      const mag = Math.sqrt(dx*dx + dy*dy);
      if (mag > MAX_RADIUS) { dx = (dx/mag)*MAX_RADIUS; dy = (dy/mag)*MAX_RADIUS; }
      knob.style.left = (30 + dx) + 'px';
      knob.style.top  = (30 + dy) + 'px';
    }
  }
  function onUp(e){
    if (e.pointerId === state.joystickId) {
      state.joystickId = null;
      state.joystickActive = false;
      state.dirX = 0; state.dirY = 0; state.magnitude = 0;
      const vis = document.getElementById('hunt-joystick');
      if (vis) vis.classList.remove('active');
    }
  }
  function onKeyDown(e){
    state.keys[e.key.toLowerCase()] = true;
    if (e.key === ' ') { state.skillTrigger = true; e.preventDefault(); }
  }
  function onKeyUp(e){ state.keys[e.key.toLowerCase()] = false; }

  function poll(){
    if (state.joystickActive) {
      const dx = state.joystickCurrent.x - state.joystickStart.x;
      const dy = state.joystickCurrent.y - state.joystickStart.y;
      const mag = Math.sqrt(dx*dx + dy*dy);
      if (mag > DEAD_ZONE) {
        const norm = Math.min(1, (mag - DEAD_ZONE) / (MAX_RADIUS - DEAD_ZONE));
        state.dirX = (dx / mag) * norm;
        state.dirY = (dy / mag) * norm;
        state.magnitude = norm;
      } else { state.dirX=0; state.dirY=0; state.magnitude=0; }
    } else {
      let dx=0, dy=0;
      if (state.keys['w']||state.keys['arrowup']) dy -= 1;
      if (state.keys['s']||state.keys['arrowdown']) dy += 1;
      if (state.keys['a']||state.keys['arrowleft']) dx -= 1;
      if (state.keys['d']||state.keys['arrowright']) dx += 1;
      const m = Math.sqrt(dx*dx+dy*dy);
      if (m > 1) { dx/=m; dy/=m; }
      state.dirX = dx; state.dirY = dy; state.magnitude = m > 0 ? Math.min(1, m) : 0;
    }
    return { x: state.dirX, y: state.dirY, magnitude: state.magnitude };
  }

  function consumeSkill(){ const v = state.skillTrigger; state.skillTrigger = false; return v; }
  function triggerSkill(){ state.skillTrigger = true; }

  function init(){ setupCanvas(); }
  window.WG.Input = { init, poll, consumeSkill, triggerSkill };
})();
