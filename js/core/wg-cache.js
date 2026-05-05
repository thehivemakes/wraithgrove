// WG.Cache — localStorage persistence + hybrid server sync (5s debounce)
(function(){'use strict';
  const KEY = 'wg_save_v2';
  const SERVER_URL = (window.WG && WG.AppConfig && WG.AppConfig.serverUrl) || '';

  let serverSyncTimer = null;

  async function syncToServer() {
    if (!SERVER_URL) return;
    const playerId = WG.Account && WG.Account.getDeviceId();
    if (!playerId) return;
    try {
      const r = await fetch(`${SERVER_URL}/wg/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Player-Id': playerId },
        body: JSON.stringify(WG.State.get()),
      });
      if (r.ok) WG.Engine.emit('cache:server-sync', { ok: true });
    } catch (e) {
      console.warn('[cache] server sync failed', e);
    }
  }

  function scheduleSyncToServer() {
    if (!SERVER_URL) return;
    if (serverSyncTimer) clearTimeout(serverSyncTimer);
    serverSyncTimer = setTimeout(() => { serverSyncTimer = null; syncToServer(); }, 5000);
  }

  async function loadFromServer() {
    if (!SERVER_URL) return false;
    const playerId = WG.Account && WG.Account.getDeviceId();
    if (!playerId) return false;
    try {
      const r = await fetch(`${SERVER_URL}/wg/load`, {
        method: 'GET',
        headers: { 'X-Player-Id': playerId },
      });
      if (!r.ok) return false;
      const { state } = await r.json();
      if (!state) return false;
      // Server wins for IAP entitlement and currency (cross-device source of truth)
      Object.assign(WG.State.get().iap, state.iap || {});
      Object.assign(WG.State.get().currencies, state.currencies || {});
      return true;
    } catch (e) {
      console.warn('[cache] server load failed', e);
      return false;
    }
  }

  function save() {
    try {
      const s = WG.State.get();
      s.meta.lastSaveMs = Date.now();
      localStorage.setItem(KEY, JSON.stringify(s));
      return true;
    } catch (e) { console.warn('[cache] save failed', e); return false; }
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || data.version !== 2) return false;
      const s = WG.State.get();
      // Shallow-merge top-level keys
      Object.assign(s.currencies, data.currencies || {});
      if (data.energy) Object.assign(s.energy, data.energy);
      if (data.player) Object.assign(s.player, data.player);
      if (data.huntProgress) Object.assign(s.huntProgress, data.huntProgress);
      if (data.forge) {
        if (Array.isArray(data.forge.buildings)) s.forge.buildings = data.forge.buildings;
        s.forge.craftFragments = data.forge.craftFragments || s.forge.craftFragments;
        s.forge.rareMaterials = data.forge.rareMaterials || s.forge.rareMaterials || 0;  // audit polish gap — was unrestored, breaking achievement/mission rare-mat rewards across reload
        s.forge.lastDailyChestMs = data.forge.lastDailyChestMs || 0;
      }
      if (data.relics) Object.assign(s.relics, data.relics);
      if (data.duel) Object.assign(s.duel, data.duel);
      if (data.iap) Object.assign(s.iap, data.iap);
      if (data.settings) Object.assign(s.settings, data.settings);
      if (data.meta) Object.assign(s.meta, data.meta);
      // firstLaunch: explicit false if missing = existing save predates onboarding feature
      s.firstLaunch = (data.firstLaunch !== undefined) ? data.firstLaunch : false;
      if (data.firstLaunchStep !== undefined) s.firstLaunchStep = data.firstLaunchStep;
      // W-Achievements-UI: restore per-achievement progress across sessions
      if (data.achievements) s.achievements = data.achievements;
      return true;
    } catch (e) { console.warn('[cache] load failed', e); return false; }
  }

  function clear() { localStorage.removeItem(KEY); }

  let dirty = false, lastSaveMs = 0;
  function markDirty() { dirty = true; }

  function autoSaveTick(now) {
    if (!dirty) return;
    if (now - lastSaveMs < 3000) return;
    save(); dirty = false; lastSaveMs = now;
    scheduleSyncToServer();
    // Phase 4 save sync: fire-and-forget upload after each local save.
    if (window.WG && WG.MetaSaveSync) WG.MetaSaveSync.upload().catch(function(){});
  }

  // Attempt a server download on cold-load with a 2s timeout.
  // If the server blob is newer than local, merge it into WG.State.
  function _coldLoadFromServer() {
    if (!window.WG || !WG.MetaSaveSync) return;
    var timeout = new Promise(function(resolve) { setTimeout(resolve, 2000, null); });
    Promise.race([WG.MetaSaveSync.download(), timeout]).then(function(blob) {
      if (!blob) return;
      var local = window.WG.State ? WG.State.get() : null;
      if (!local) return;
      var serverMs = blob.meta && blob.meta.lastSaveMs || 0;
      var localMs  = local.meta && local.meta.lastSaveMs || 0;
      if (serverMs > localMs) WG.MetaSaveSync.resolve(local, blob);
    }).catch(function(){});
  }

  function init() {
    WG.Engine.on('currency:change', markDirty);
    WG.Engine.on('energy:change',   markDirty);
    WG.Engine.on('player:level',    markDirty);
    WG.Engine.on('hunt:stage-cleared', markDirty);
    WG.Engine.on('forge:upgrade',   markDirty);
    WG.Engine.on('relics:gained',   markDirty);
    WG.Engine.on('duel:result',     markDirty);
    WG.Engine.on('tab:change',      markDirty);
    WG.Engine.on('iap:purchased',   markDirty);
    WG.Engine.on('tick', () => autoSaveTick(performance.now()));
    // Cold-load: after sync localStorage load completes, attempt server download.
    setTimeout(_coldLoadFromServer, 0);
  }

  window.WG.Cache = { init, save, load, clear, loadFromServer, syncToServer };
})();
