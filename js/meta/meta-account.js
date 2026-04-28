// WG.Account — anonymous device-ID + optional email account upgrade
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
  function init() {
    const id = getDeviceId();
    WG.State.get().meta.deviceId = id;
  }
  window.WG.Account = { init, getDeviceId, isPremium, upgradeAccount };
})();
