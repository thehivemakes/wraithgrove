// WG.HuntResults — end-of-stage modal (cleared / failed)
(function(){'use strict';
  function show(opts) {
    // opts: { stageId, cleared, mins, kills, rewards }
    const root = document.getElementById('modal-root');
    const wrap = document.createElement('div');
    wrap.className = 'modal-overlay show';
    const stageName = (WG.HuntStage.get(opts.stageId) || {}).name || ('Stage ' + opts.stageId);
    const title = opts.cleared ? `${stageName} — CLEARED` : `${stageName} — FAILED`;
    const r = opts.rewards || {};
    wrap.innerHTML = `
      <div class="modal-card" style="min-width: 320px;">
        <div class="modal-title" style="color:${opts.cleared ? '#a8d878' : '#d88060'};">${title}</div>
        <div class="modal-body">
          <div style="display:flex;justify-content:space-around;margin-bottom:8px;">
            <div><div style="font-size:11px;color:#a89878;">SURVIVED</div><div style="font-size:18px;color:#f0d890;">${(opts.mins||0).toFixed(1)}m</div></div>
            <div><div style="font-size:11px;color:#a89878;">KILLS</div><div style="font-size:18px;color:#f0d890;">${opts.kills||0}</div></div>
          </div>
          <div style="font-size:11px;color:#a89878;text-align:center;margin-bottom:6px;">REWARDS</div>
          <div style="display:flex;justify-content:center;gap:14px;font-size:13px;">
            ${r.coins?`<div>🪙 ${r.coins}</div>`:''}
            ${r.diamonds?`<div>💎 ${r.diamonds}</div>`:''}
            ${r.cards?`<div>🎴 ${r.cards}</div>`:''}
            ${r.fragments?`<div>✦ ${r.fragments}</div>`:''}
          </div>
        </div>
        <div class="modal-btn-row">
          ${opts.cleared ? '<button class="btn primary" id="hr-next">NEXT STAGE</button>' : '<button class="btn primary" id="hr-retry">RETRY</button>'}
          <button class="btn" id="hr-2x">+2× (AD)</button>
          <button class="btn" id="hr-back">BACK</button>
        </div>
      </div>
    `;
    root.appendChild(wrap);

    function close() { wrap.remove(); }

    const btn2x = wrap.querySelector('#hr-2x');
    btn2x.addEventListener('click', async () => {
      btn2x.disabled = true;
      const res = await WG.Ads.showRewardedVideo({ reward: '2x' });
      if (res && res.ok) {
        if (r.coins) WG.State.grant('coins', r.coins);
        if (r.diamonds) WG.State.grant('diamonds', r.diamonds);
        if (r.cards) WG.State.grant('cards', r.cards);
        if (r.fragments) WG.State.get().forge.craftFragments += r.fragments;
        btn2x.textContent = '✓ DOUBLED';
      } else {
        btn2x.disabled = false;
      }
    });
    wrap.querySelector('#hr-back').addEventListener('click', () => { close(); WG.Game.exitHunt(); });

    if (opts.cleared) {
      wrap.querySelector('#hr-next').addEventListener('click', () => {
        close();
        const nextId = Math.min(opts.stageId + 1, 18);
        WG.State.get().huntProgress.currentStage = nextId;
        WG.State.get().huntProgress.highestUnlocked = Math.max(WG.State.get().huntProgress.highestUnlocked, nextId);
        WG.Game.startHunt(nextId);
      });
    } else {
      wrap.querySelector('#hr-retry').addEventListener('click', () => { close(); WG.Game.startHunt(opts.stageId); });
    }
  }

  function init() {}
  window.WG.HuntResults = { init, show };
})();
