// WG.Events — analytics event reporter (server-side; no third-party SDK)
(function(){'use strict';
  const queue = [];
  const MAX_QUEUE = 200;

  function track(name, props) {
    const e = {
      name,
      props: props || {},
      ts: Date.now(),
      device: WG.Account ? WG.Account.getDeviceId() : null,
      session: WG.State ? WG.State.get().meta.sessionsCount : null,
    };
    queue.push(e);
    if (queue.length > MAX_QUEUE) queue.shift();
    if (window.console && console.debug) console.debug('[evt]', name, props);
  }

  // Auto-track key engine events
  function init() {
    WG.Engine.on('hunt:stage-start',   d => track('hunt_start',   { stage: d && d.stageId }));
    WG.Engine.on('hunt:stage-cleared', d => track('hunt_clear',   { stage: d && d.stageId, mins: d && d.mins }));
    WG.Engine.on('hunt:stage-failed',  d => track('hunt_fail',    { stage: d && d.stageId, mins: d && d.mins }));
    WG.Engine.on('player:level',       d => track('lvl_up',       { level: d && d.level }));
    WG.Engine.on('iap:purchased',      d => track('iap',          { sku: d && d.sku && d.sku.id, price: d && d.sku && d.sku.price }));
    WG.Engine.on('ad:rewarded',        d => track('ad_rv',        { count: d && d.count }));
    WG.Engine.on('ad:interstitial-shown', () => track('ad_inter', {}));
    WG.Engine.on('duel:result',        d => track('duel',         { won: d && d.won, rank: d && d.rank }));
    WG.Engine.on('forge:upgrade',      d => track('forge_up',     { id: d && d.id, level: d && d.level }));
    WG.Engine.on('relics:gained',      d => track('relic_gain',   { id: d && d.id }));
  }

  function flush() { /* server POST stub */ }
  window.WG.Events = { init, track, flush, queue };
})();
