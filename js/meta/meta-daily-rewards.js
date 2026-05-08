// WG.DailyRewards — 7-day login streak grid + claim modal
// W-Daily-Reward-Streak-UI
(function(){'use strict';

  // Concern A — weekly reward catalog (Object.freeze per spec)
  // energy rows shown in UI but NOT granted on claim — auto-granted by meta-account.js login system.
  // Only gold/gems/frags are new explicit claim rewards.
  const WEEK_REWARDS = Object.freeze([
    { day: 1, reward: { energy: 20, gold: 100 } },
    { day: 2, reward: { gold: 200 } },
    { day: 3, reward: { gems: 10, gold: 200 } },
    { day: 4, reward: { frags: 5, gold: 300 } },
    { day: 5, reward: { gems: 20 } },
    { day: 6, reward: { frags: 15, gold: 500 } },
    { day: 7, reward: { gems: 50, energy: 50, frags: 30 } }, // big payday
  ]);

  function dayStr(d) {
    d = d || new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function yesterdayStr() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return dayStr(d);
  }

  function ensureState() {
    const s = WG.State.get();
    if (!s.meta.dailyReward) {
      s.meta.dailyReward = {
        streakDay: 1,      // 1..7 — current claimable day
        lastClaimKey: '',  // YYYY-MM-DD of last claim
        claimedToday: false,
      };
    }
    return s.meta.dailyReward;
  }

  // Concern D — live badge element for red dot on DAILY side icon
  let _badgeEl = null;
  function setBadgeEl(el) { _badgeEl = el; }
  function hasUnclaimed() { return !ensureState().claimedToday; }
  function refreshBadge() {
    if (!_badgeEl) return;
    _badgeEl.style.display = hasUnclaimed() ? 'block' : 'none';
  }

  // Concern C — fly icon from tileEl to a top-strip target element
  function flyIcon(char, fromEl, targetEl, onArrive) {
    if (!fromEl || !targetEl) { if (onArrive) onArrive(); return; }
    const src  = fromEl.getBoundingClientRect();
    const dst  = targetEl.getBoundingClientRect();
    const x0   = src.left + src.width  / 2;
    const y0   = src.top  + src.height / 2;
    const destX = dst.left + dst.width  / 2;
    const destY = dst.top  + dst.height / 2;
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;z-index:9500;pointer-events:none;font-size:20px;' +
      'line-height:1;left:' + x0 + 'px;top:' + y0 + 'px;transform:translate(-50%,-50%);';
    el.textContent = char;
    document.body.appendChild(el);
    const startMs = performance.now();
    const dur = 380;
    function step(now) {
      const t = Math.min(1, (now - startMs) / dur);
      const ease = 1 - Math.pow(1 - t, 2);
      el.style.left      = (x0 + (destX - x0) * ease) + 'px';
      el.style.top       = (y0 + (destY - y0) * ease) + 'px';
      el.style.transform = 'translate(-50%,-50%) scale(' + (1.5 - 0.5 * ease).toFixed(2) + ')';
      el.style.opacity   = t > 0.8 ? String((1 - t) / 0.2) : '1';
      if (t < 1) requestAnimationFrame(step);
      else { el.remove(); if (onArrive) onArrive(); }
    }
    requestAnimationFrame(step);
  }

  function showToast(msg, color) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;top:54px;left:50%;transform:translateX(-50%);' +
      'background:rgba(0,0,0,0.88);color:' + (color || '#f0d890') + ';' +
      'padding:9px 20px;border-radius:10px;font-size:13px;font-weight:700;letter-spacing:1px;' +
      'pointer-events:none;z-index:9600;border:1.5px solid ' + (color || '#f0d890') + ';' +
      'transition:opacity 0.5s;';
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 2400);
  }

  // Concern C — grant claim rewards + fly animations (sequential queue)
  function grantAndFly(reward, tileEl, onDone) {
    const s = WG.State.get();
    const queue = [];

    if (reward.gold) {
      WG.State.grant('coins', reward.gold);
      queue.push({ char: '🪙', target: document.querySelector('.currency.coins') }); // 🪙
    }
    if (reward.gems) {
      WG.State.grant('gems', reward.gems);
      queue.push({ char: '💎', target: document.getElementById('gems-chip') }); // 💎
    }
    if (reward.frags) {
      // No WG.State.grant API for frags — write directly and dirty the cache
      s.forge.craftFragments = (s.forge.craftFragments || 0) + reward.frags;
      WG.Engine.emit('forge:upgrade', { source: 'daily-reward' }); // triggers wg-cache dirty
      queue.push({ char: '🧩', target: document.querySelector('.nav-tab[data-tab="forge"]') }); // 🧩
    }
    // energy: already auto-granted by meta-account.js processDailyLogin() — do not double-grant

    function runNext(idx) {
      if (idx >= queue.length) { if (onDone) onDone(); return; }
      flyIcon(queue[idx].char, tileEl, queue[idx].target, () => runNext(idx + 1));
    }
    runNext(0);
  }

  function rewardIcon(reward) {
    if (reward.gems && reward.frags) return '💜'; // 💜 day-7 big payday
    if (reward.gems)   return '💎'; // 💎
    if (reward.frags)  return '🧩'; // 🧩
    if (reward.energy && !reward.gold) return '⚡'; // ⚡
    return '🪙'; // 🪙
  }

  function rewardLines(reward) {
    const parts = [];
    if (reward.gold)   parts.push(reward.gold + 'G');
    if (reward.gems)   parts.push(reward.gems + '💎');
    if (reward.frags)  parts.push(reward.frags + '🧩');
    if (reward.energy) parts.push('+' + reward.energy + '⚡');
    return parts;
  }

  function ensureStyles() {
    if (document.getElementById('wg-daily-rewards-style')) return;
    const css = document.createElement('style');
    css.id = 'wg-daily-rewards-style';
    css.textContent = [
      '#wg-daily-rewards-modal{position:fixed;inset:0;z-index:8500;display:flex;align-items:center;justify-content:center;background:rgba(4,2,6,0.88);}',
      '.wg-dr-panel{background:linear-gradient(to bottom,#1c1208,#0e0a06);border:1.5px solid #5a3820;border-radius:16px;padding:20px 12px 18px;width:min(96vw,390px);box-shadow:0 8px 32px rgba(0,0,0,0.75);}',
      '.wg-dr-header{text-align:center;font-size:12px;letter-spacing:2.5px;font-weight:800;color:#f0d890;margin-bottom:14px;}',
      '.wg-dr-grid{display:flex;gap:4px;justify-content:center;margin-bottom:16px;}',
      '.wg-dr-tile{display:flex;flex-direction:column;align-items:center;gap:2px;width:44px;padding:7px 3px;border-radius:10px;border:1.5px solid #3a2014;background:rgba(28,18,8,0.9);flex-shrink:0;}',
      '.wg-dr-tile.today{border-color:#e8a020;background:rgba(55,30,5,0.95);}',
      '@keyframes wg-dr-pulse{0%,100%{box-shadow:0 0 0 0 rgba(232,160,32,0);}55%{box-shadow:0 0 0 6px rgba(232,160,32,0.3);}}',
      '.wg-dr-tile.unclaimed{animation:wg-dr-pulse 1.6s ease-in-out infinite;}',
      '.wg-dr-tile.past{opacity:0.5;}',
      '.wg-dr-tile.future{opacity:0.3;}',
      '.wg-dr-tile.day7{border-color:#d060ff;}',
      '.wg-dr-daylbl{font-size:11px;letter-spacing:0.8px;color:#907050;font-weight:700;}',
      '.wg-dr-daylbl.today{color:#f0d060;}',
      '.wg-dr-icon{font-size:17px;line-height:1;margin:2px 0;}',
      '.wg-dr-amt{font-size:7.5px;color:#b08050;font-weight:700;text-align:center;line-height:1.4;white-space:pre;}',
      '.wg-dr-state{font-size:13px;line-height:1;margin-top:2px;}',
      '.wg-dr-claim{display:block;margin:0 auto;padding:12px 36px;border-radius:30px;border:1.5px solid #f0a030;background:linear-gradient(to bottom,#d88020,#904010);color:#fff8e0;font-size:14px;letter-spacing:2.5px;font-weight:800;cursor:pointer;transition:transform 80ms ease;}',
      '.wg-dr-claim:active{transform:scale(0.96);}',
      '.wg-dr-footer{text-align:center;font-size:10px;color:#605040;margin-top:12px;letter-spacing:1px;}',
      '.wg-dr-close{display:block;margin:12px auto 0;padding:7px 24px;background:transparent;border:1px solid #4a3020;border-radius:20px;color:#907050;font-size:11px;cursor:pointer;letter-spacing:1px;}',
      '.wg-dr-done{text-align:center;font-size:12px;color:#80b050;letter-spacing:1px;padding:10px 0;font-weight:700;}',
    ].join('');
    document.head.appendChild(css);
  }

  // Concern B — 7-day grid modal
  function openModal() {
    if (document.getElementById('wg-daily-rewards-modal')) return;
    ensureStyles();

    const dr = ensureState();
    const currentDay = dr.streakDay;
    const claimed    = dr.claimedToday;

    const overlay = document.createElement('div');
    overlay.id = 'wg-daily-rewards-modal';
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    const panel = document.createElement('div');
    panel.className = 'wg-dr-panel';

    const header = document.createElement('div');
    header.className = 'wg-dr-header';
    header.textContent = 'DAILY REWARDS — Day ' + currentDay + '/7';
    panel.appendChild(header);

    // 7-tile grid
    const grid = document.createElement('div');
    grid.className = 'wg-dr-grid';
    const tileEls = [];

    WEEK_REWARDS.forEach(entry => {
      const dayNum   = entry.day;
      const isToday  = dayNum === currentDay;
      const isPast   = dayNum < currentDay;
      const isFuture = dayNum > currentDay;

      const tile = document.createElement('div');
      const cls  = ['wg-dr-tile'];
      if (isToday)  cls.push('today');
      if (isToday && !claimed) cls.push('unclaimed');
      if (isPast)   cls.push('past');
      if (isFuture) cls.push('future');
      if (dayNum === 7) cls.push('day7');
      tile.className = cls.join(' ');

      const dayLbl = document.createElement('div');
      dayLbl.className = 'wg-dr-daylbl' + (isToday ? ' today' : '');
      dayLbl.textContent = 'DAY ' + dayNum;
      tile.appendChild(dayLbl);

      const icon = document.createElement('div');
      icon.className = 'wg-dr-icon';
      icon.textContent = rewardIcon(entry.reward);
      tile.appendChild(icon);

      const amt = document.createElement('div');
      amt.className = 'wg-dr-amt';
      amt.textContent = rewardLines(entry.reward).join('\n');
      tile.appendChild(amt);

      const stateEl = document.createElement('div');
      stateEl.className = 'wg-dr-state';
      if (isPast || (isToday && claimed)) stateEl.textContent = '✓';
      else if (isFuture)                  stateEl.textContent = '🔒'; // 🔒
      tile.appendChild(stateEl);

      tileEls.push(tile);
      grid.appendChild(tile);
    });

    panel.appendChild(grid);

    // Claim button or "already claimed" message
    if (!claimed) {
      const claimBtn = document.createElement('button');
      claimBtn.className = 'wg-dr-claim';
      claimBtn.textContent = 'CLAIM';
      claimBtn.addEventListener('click', () => {
        claimBtn.disabled = true;
        claimBtn.textContent = '…';
        doClaim(WEEK_REWARDS[currentDay - 1].reward, tileEls[currentDay - 1], () => {
          overlay.remove();
          refreshBadge();
          if (WG.Game && WG.Game.syncTopStrip) WG.Game.syncTopStrip();
        });
      });
      panel.appendChild(claimBtn);
    } else {
      const done = document.createElement('div');
      done.className = 'wg-dr-done';
      done.textContent = '✓ CLAIMED — See you tomorrow';
      panel.appendChild(done);
    }

    const footer = document.createElement('div');
    footer.className = 'wg-dr-footer';
    footer.textContent = 'Streak resets if you miss a day';
    panel.appendChild(footer);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'wg-dr-close';
    closeBtn.textContent = 'CLOSE';
    closeBtn.addEventListener('click', () => overlay.remove());
    panel.appendChild(closeBtn);

    overlay.appendChild(panel);
    document.body.appendChild(overlay);
  }

  function doClaim(reward, tileEl, onDone) {
    const dr = ensureState();
    dr.claimedToday  = true;
    dr.lastClaimKey  = dayStr();
    showToast('Day ' + dr.streakDay + ' reward claimed!', '#a0e060');
    grantAndFly(reward, tileEl, onDone);
    WG.Engine.emit('daily-reward:claimed', { day: dr.streakDay });
  }

  // Concern E — subscribe to daily:reset
  // Increment streakDay if last claim was yesterday; reset to 1 if streak broken.
  // This runs AFTER cache is loaded (see wg-game.js init ordering fix).
  function init() {
    WG.Engine.on('daily:reset', () => {
      const dr   = ensureState();
      const yest = yesterdayStr();
      if (dr.lastClaimKey === yest) {
        // Claimed yesterday — advance to next day (wraps 7→1 to start new cycle)
        dr.streakDay = dr.streakDay >= 7 ? 1 : dr.streakDay + 1;
      } else if (dr.lastClaimKey && dr.lastClaimKey < yest) {
        // Missed at least one day — reset streak
        dr.streakDay = 1;
        setTimeout(() => showToast('Streak Reset — back to Day 1', '#ff8040'), 1200);
      }
      // If lastClaimKey is empty (never claimed), streakDay stays at 1
      dr.claimedToday = false;
      refreshBadge();
    });
  }

  window.WG.DailyRewards = { init, openModal, hasUnclaimed, refreshBadge, setBadgeEl, WEEK_REWARDS };
})();
