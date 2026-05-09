// WG.Account — anonymous device-ID + optional email account upgrade
// W-Monetization-V2-Energy §F — daily-login + 7-day-streak energy bonus.
(function(){'use strict';
  const DEVICE_KEY = 'wg_device_id';
  function generateDeviceId() {
    return 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }
  function getDeviceId() {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) { id = generateDeviceId(); localStorage.setItem(DEVICE_KEY, id); }
    return id;
  }
  function isPremium() { return WG.State.get().iap.adRemovalActive; }
  // upgradeAccount stub: in production this would POST to /wg/account-upgrade with email
  function upgradeAccount(email) {
    if (!email || !email.includes('@')) return { ok: false, reason: 'invalid email' };
    const s = WG.State.get();
    s.meta.email = email;
    WG.Engine.emit('account:upgraded', { email });
    return { ok: true, email };
  }

  function dayKey(d){ d = d || new Date(); return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate(); }
  function yesterdayKey(){ const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); }

  function showToast(msg, color){
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;top:42px;left:50%;transform:translateX(-50%);' +
      'background:rgba(0,0,0,0.85);color:' + (color || '#f0c060') + ';' +
      'padding:8px 18px;border-radius:8px;font-size:13px;font-weight:700;letter-spacing:1px;' +
      'pointer-events:none;z-index:300;border:1.5px solid ' + (color || '#f0c060') + ';' +
      'transition:opacity 0.5s;';
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 2400);
  }

  // Returns the new login streak count if a bonus was granted, 0 otherwise.
  // Exposed for testing — also called automatically from init().
  function processDailyLogin(now){
    const s = WG.State.get();
    const today = dayKey(now ? new Date(now) : new Date());
    if (s.meta.lastLoginDayKey === today) return 0;
    const yesterday = yesterdayKey();
    const streak = (s.meta.lastLoginDayKey === yesterday)
      ? (s.meta.loginStreak || 0) + 1
      : 1;
    s.meta.loginStreak = streak;
    s.meta.lastLoginDayKey = today;

    const T = WG.State.ENERGY_TUNABLES;
    if (WG.State.grant && T) {
      // W-Balance-Flags-Action: was grantEnergy(T.LOGIN_BONUS) — now coins so overflow cap can't silently discard the bonus
      WG.State.grant('coins', T.LOGIN_BONUS);
      showToast('+' + T.LOGIN_BONUS + ' 🪙 Daily Login (Day ' + streak + ')');
      WG.Engine.emit('account:daily-login', { streak, bonus: T.LOGIN_BONUS });
      if (streak >= 7) {
        // W-Balance-Flags-Action: was grantEnergy(T.STREAK_7_BONUS) — now diamonds (non-overflowable)
        WG.State.grant('diamonds', T.STREAK_7_BONUS);
        setTimeout(() => showToast('+' + T.STREAK_7_BONUS + ' 💎 7-Day Streak!', '#ffe080'), 600);
        WG.Engine.emit('account:streak-7', { bonus: T.STREAK_7_BONUS });
        s.meta.loginStreak = 0; // wrap to start the next cycle on the day after
      }
    }
    return streak;
  }

  function init() {
    const id = getDeviceId();
    WG.State.get().meta.deviceId = id;
    // Daily login runs after WG.State.init has set up meta + energy regen.
    processDailyLogin();
  }
  window.WG.Account = { init, getDeviceId, isPremium, upgradeAccount, processDailyLogin };
})();
