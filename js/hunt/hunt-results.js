// WG.HuntResults — end-of-stage modal (cleared / failed)
(function(){'use strict';
  // SPEC W-Hard-Tuning-And-Monetization §B
  const REVIVE_COUNTDOWN_SEC = 5;     // dramatic 5s window before stage truly ends
  const REVIVE_LIMIT_PER_RUN = 1;     // one ad-revive per stage run

  // W-Dopamine-P1 §C — count-up animation. ease-out cubic, 800ms default.
  // Emits ui:button at each 25% milestone for tick audio.
  function tweenCounter(el, target, durationMs) {
    if (!el || !(target > 0)) return;
    const start = performance.now();
    const milestones = [0.25, 0.5, 0.75, 1.0];
    let lastMile = 0;
    function step(now) {
      const t = Math.min(1, (now - start) / durationMs);
      const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
      el.textContent = String(Math.round(target * ease));
      while (lastMile < milestones.length && t >= milestones[lastMile]) {
        if (window.WG && WG.Engine) WG.Engine.emit('ui:button', {});
        lastMile++;
      }
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // W-FX-P2-Polish §B — icon fly-in: spawns a fixed emoji at (x0,y0) and lerps
  // it to the centre of targetEl over ~380ms, then fades and calls onArrive.
  // Uses rAF (not CSS keyframes) because target position is only known at runtime.
  function flyIcon(char, x0, y0, targetEl, onArrive) {
    if (!targetEl) { if (onArrive) onArrive(); return; }
    const rect = targetEl.getBoundingClientRect();
    const destX = rect.left + rect.width / 2;
    const destY = rect.top  + rect.height / 2;
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;z-index:9500;pointer-events:none;font-size:22px;' +
      'line-height:1;left:' + x0 + 'px;top:' + y0 + 'px;transform:translate(-50%,-50%);';
    el.textContent = char;
    document.body.appendChild(el);
    const startMs = performance.now();
    const dur = 380;
    let rafId = 0;
    let cancelled = false;
    // audit polish gap — cancel-guard for early-dismiss safety
    el.dataset.flyIconActive = '1';
    function step(now) {
      if (cancelled || !el.parentNode) { if (rafId) cancelAnimationFrame(rafId); return; }
      const t   = Math.min(1, (now - startMs) / dur);
      const ease = 1 - Math.pow(1 - t, 2);
      el.style.left      = (x0 + (destX - x0) * ease) + 'px';
      el.style.top       = (y0 + (destY - y0) * ease) + 'px';
      el.style.transform = 'translate(-50%,-50%) scale(' + (1.5 - 0.5 * ease).toFixed(2) + ')';
      el.style.opacity   = t > 0.8 ? String((1 - t) / 0.2) : '1';
      if (t < 1) rafId = requestAnimationFrame(step);
      else { el.remove(); if (onArrive) onArrive(); }
    }
    rafId = requestAnimationFrame(step);
  }

  function comboTierColor(n) {
    if (n >= 20) return '#ff4040';
    if (n >= 10) return '#ff8c00';
    if (n >= 5)  return '#ffd870';
    return '#f0d890';
  }

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

    // W-Monetization-V2-Whale-Ladder §F — Royal Pass badge in results header
    const vipBadge = (opts.rewards && opts.rewards.vipMul && opts.rewards.vipMul > 1 && WG.State.isRoyalPassActive && WG.State.isRoyalPassActive())
      ? `<div style="text-align:center;margin:4px 0 8px 0;"><span style="display:inline-block;background:linear-gradient(135deg,#6a20b0,#3a0870);border:1.5px solid #c080ff;border-radius:12px;padding:3px 12px;font-size:10px;letter-spacing:2px;color:#e0b8ff;font-weight:700;">👑 ROYAL PASS · 2× REWARDS</span></div>`
      : '';
    wrap.innerHTML = `
      <div class="modal-card" style="min-width: 320px;">
        <div class="modal-title" style="color:${opts.cleared ? '#a8d878' : '#d88060'};">${title}</div>
        ${vipBadge}
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
            <div id="hr-kills-row"><div style="font-size:11px;color:#a89878;">KILLS</div><div id="hr-kills" style="font-size:18px;color:#f0d890;">0</div></div>
          </div>
          <div style="font-size:11px;color:#a89878;text-align:center;margin-bottom:6px;">REWARDS</div>
          <div style="display:flex;justify-content:center;gap:14px;font-size:13px;flex-wrap:wrap;">
            ${r.coins?`<div id="hr-coins-row">🪙 <span id="hr-coins">0</span></div>`:''}
            ${r.diamonds?`<div id="hr-diamonds-row">💎 <span id="hr-diamonds">0</span></div>`:''}
            ${r.cards?`<div>🎴 ${r.cards}</div>`:''}
            ${r.fragments?`<div>✦ ${r.fragments}</div>`:''}
            ${r.energyRefund?`<div style="color:#f0c060;">⚡ +${r.energyRefund}</div>`:''}
            ${r.firstClearBonus?`<div style="color:#ffe080;font-weight:700;">⚡ +${r.firstClearBonus} First Clear!</div>`:''}
            ${r.riftSigils?`<div style="color:#c080ff;">🔮 ×${r.riftSigils} Rift Sigil</div>`:''}
          </div>
          ${(opts.peakCombo > 0) ? `
            <div style="text-align:center;margin-top:8px;">
              <span style="font-size:11px;color:#a89878;letter-spacing:1px;">PEAK COMBO</span>
              <span id="hr-peak-combo" style="font-size:18px;font-weight:900;margin-left:6px;color:${comboTierColor(opts.peakCombo)};">0</span>
            </div>
          ` : ''}
        </div>
        <div class="modal-btn-row">
          ${opts.cleared && opts.stageId !== 0 ? '<button class="btn primary" id="hr-next">NEXT STAGE</button>' : ''}
          ${opts.cleared && opts.stageId === 0  ? '<button class="btn primary" id="hr-next">ENTER THE HUNT</button>' : ''}
          ${!opts.cleared ? '<button class="btn primary" id="hr-retry">RETRY</button>' : ''}
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

    // W-FX-P2-Polish §B — currency icons fly from screen corners into their rows,
    // then count-up begins on arrival. Stagger: coin t=0, gem t=200ms, kills t=400ms.
    // peak-combo has no currency icon; fires on its own fixed delay as before.
    const vw = window.innerWidth, vh = window.innerHeight;
    if (r.coins) {
      flyIcon('🪙', 0, vh, wrap.querySelector('#hr-coins-row'),
        () => tweenCounter(wrap.querySelector('#hr-coins'), r.coins, 800));
    }
    setTimeout(() => {
      if (r.diamonds) {
        flyIcon('💎', vw, vh, wrap.querySelector('#hr-diamonds-row'),
          () => tweenCounter(wrap.querySelector('#hr-diamonds'), r.diamonds, 800));
      }
    }, 200);
    setTimeout(() => {
      flyIcon('⭐', vw / 2, 0, wrap.querySelector('#hr-kills-row'),
        () => tweenCounter(wrap.querySelector('#hr-kills'), opts.kills || 0, 800));
    }, 400);
    setTimeout(() => tweenCounter(wrap.querySelector('#hr-peak-combo'), opts.peakCombo || 0, 800), 480);

    function close() { wrap.remove(); }

    // Revive flow: countdown → if ad watched, restore HP and resume run; else
    // when timer hits zero, hide the revive panel (player chose not to act).
    let revIv = null, revRem = REVIVE_COUNTDOWN_SEC;
    if (reviveAvailable) {
      const cd = wrap.querySelector('#hr-revive-cd');
      // W-FX-Polish-Pass — gap 7: countdown number pulses + color-shifts as
      // tension rises. Heartbeat lives on the button; the *number* now leads
      // the panic. White → yellow → orange → red as it approaches 0.
      if (cd) {
        cd.style.display = 'inline-block';
        cd.style.transition = 'transform 200ms cubic-bezier(0.34,1.56,0.64,1), color 150ms ease, opacity 250ms ease';
      }
      revIv = setInterval(() => {
        revRem--;
        if (cd) {
          cd.textContent = String(Math.max(0, revRem));
          const color = revRem <= 1 ? '#ff4040'
                      : revRem <= 2 ? '#ff9040'
                      : revRem <= 3 ? '#ffd870'
                                    : '#ffe080';
          cd.style.color = color;
          if (revRem <= 0) cd.style.opacity = '0';
          // Scale punch on each tick, ease-back via transition
          cd.style.transform = 'scale(1.55)';
          setTimeout(() => { if (cd) cd.style.transform = 'scale(1.0)'; }, 180);
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

    if (opts.cleared && opts.stageId === 0) {
      // W-Stage-Zero-Tutorial: after Stage 0, go to lobby (tabs reveal happens in exitHunt)
      wrap.querySelector('#hr-next').addEventListener('click', () => { close(); WG.Game.exitHunt(); });
    } else if (opts.cleared) {
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
