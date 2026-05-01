// WG.HuntResults — end-of-stage modal (cleared / failed)
(function(){'use strict';
  // SPEC W-Hard-Tuning-And-Monetization §B
  const REVIVE_COUNTDOWN_SEC = 5;     // dramatic 5s window before stage truly ends
  const REVIVE_LIMIT_PER_RUN = 1;     // one ad-revive per stage run

  function show(opts) {
    // opts: { stageId, cleared, mins, kills, rewards }
    const root = document.getElementById('modal-root');
    const wrap = document.createElement('div');
    wrap.className = 'modal-overlay show';
    const stageName = (WG.HuntStage.get(opts.stageId) || {}).name || ('Stage ' + opts.stageId);
    const title = opts.cleared ? `${stageName} — CLEARED` : `${stageName} — FAILED`;
    const r = opts.rewards || {};
    // Show revive button only on death AND if revive budget unspent.
    const rt = WG.Game.getHuntRuntime && WG.Game.getHuntRuntime();
    const reviveAvailable = !opts.cleared && rt && (rt.reviveCount || 0) < REVIVE_LIMIT_PER_RUN;

    wrap.innerHTML = `
      <div class="modal-card" style="min-width: 320px;">
        <div class="modal-title" style="color:${opts.cleared ? '#a8d878' : '#d88060'};">${title}</div>
        <div class="modal-body">
          ${reviveAvailable ? `
            <div id="hr-revive-panel" style="background:linear-gradient(135deg,#3a0a0a,#1a0202);border:2px solid #ff5040;border-radius:6px;padding:10px;margin-bottom:10px;text-align:center;">
              <div style="font-size:10px;letter-spacing:2px;color:#ffa080;font-weight:700;">— ONE LAST CHANCE —</div>
              <button id="hr-revive" class="btn" style="
                  margin:8px auto 4px auto;display:block;
                  background:linear-gradient(135deg,#e83020,#a01010);color:#fff;
                  border:1.5px solid #ffd0c0;font-weight:700;letter-spacing:1px;
                  animation: hr-heartbeat 0.9s ease-in-out infinite;
                  padding:10px 18px;font-size:13px;">▶ WATCH AD TO REVIVE</button>
              <div style="font-size:11px;color:#ff8060;">
                Stage ends in <span id="hr-revive-cd" style="font-weight:700;color:#ffe080;">${REVIVE_COUNTDOWN_SEC}</span>s
              </div>
            </div>
          ` : ''}
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

    // Inject heartbeat keyframes once per session.
    if (reviveAvailable && !document.getElementById('hr-heartbeat-css')) {
      const st = document.createElement('style');
      st.id = 'hr-heartbeat-css';
      st.textContent = `@keyframes hr-heartbeat {
        0%,100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,80,64,0.7); }
        50%     { transform: scale(1.06); box-shadow: 0 0 0 10px rgba(255,80,64,0.0); }
      }`;
      document.head.appendChild(st);
    }
    root.appendChild(wrap);

    function close() { wrap.remove(); }

    // Revive flow: countdown → if ad watched, restore HP and resume run; else
    // when timer hits zero, hide the revive panel (player chose not to act).
    let revIv = null, revRem = REVIVE_COUNTDOWN_SEC;
    if (reviveAvailable) {
      const cd = wrap.querySelector('#hr-revive-cd');
      // W-FX-Polish-Pass — gap 7: countdown number now pulses + color-shifts as
      // tension peaks. White → yellow → orange → red as it approaches 0.
      revIv = setInterval(() => {
        revRem--;
        if (cd) {
          cd.textContent = String(revRem);
          // Color shift by remaining seconds
          const color = revRem <= 1 ? '#ff4040' : revRem <= 2 ? '#ff9040' : revRem <= 3 ? '#ffd870' : '#ffe080';
          cd.style.color = color;
          // Scale punch on each tick (CSS transition handles the ease back)
          cd.style.transition = 'transform 200ms cubic-bezier(0.34,1.56,0.64,1), color 150ms ease';
          cd.style.transform = 'scale(1.4)';
          setTimeout(() => { if (cd) cd.style.transform = 'scale(1.0)'; }, 200);
        }
        if (revRem <= 0) {
          clearInterval(revIv); revIv = null;
          const panel = wrap.querySelector('#hr-revive-panel');
          if (panel) panel.style.display = 'none';
        }
      }, 1000);

      const reviveBtn = wrap.querySelector('#hr-revive');
      reviveBtn.addEventListener('click', async () => {
        reviveBtn.disabled = true;
        const adRes = await WG.Ads.showRewardedVideo({ reward: 'revive' });
        if (adRes && adRes.ok && rt && rt.player) {
          if (revIv) { clearInterval(revIv); revIv = null; }
          rt.reviveCount = (rt.reviveCount || 0) + 1;
          rt.player.hp = rt.player.maxHp;
          WG.Engine.emit('player:revived', { source: 'ad' });
          close();
          // Hand control back to the running loop — wg-game.frame() picks up
          // again because running was set true in finishHunt() to keep the
          // top-strip alive. Player.hp > 0 reactivates the gameplay branch.
          if (typeof WG.Game.start === 'function') WG.Game.start();
        } else {
          reviveBtn.disabled = false;
        }
      });
    }

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
