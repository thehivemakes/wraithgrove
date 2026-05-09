// WG.MetaSaveSync — cross-device save sync client; Phase 4 server swap.
// All network calls are STUB: upload no-ops, download returns null, delete no-ops.
// Real calls activate when WG.Config.SERVER_BASE_URL is set to a live Cloudflare Worker.
// See docs/SAVE_SYNC_API.md for the full server contract.
(function(){'use strict';

  if (!window.WG.Config) window.WG.Config = {};
  const BASE_URL = (window.WG.Config && window.WG.Config.SERVER_BASE_URL) || null;

  function _userId() {
    return (window.WG.Account && WG.Account.getDeviceId) ? WG.Account.getDeviceId() : 'local_player';
  }

  // Phase 4: base64( gzip( JSON.stringify(state minus runtime fields) ) )
  // Stub: returns raw JSON string.
  function _serializeBlob(state) {
    return JSON.stringify(state);
  }

  // Phase 4: parse base64 + gunzip + JSON.parse
  // Stub: JSON.parse(blob).
  function _deserializeBlob(blob) {
    try { return JSON.parse(blob); } catch(e) { return null; }
  }

  function _authHeader() {
    // Phase 4: signed JWT with userId + saveVersion + iat + sig
    // Stub: bare userId only — server not live.
    return { 'Authorization': 'Bearer stub:' + _userId() };
  }

  // POST /save/upload
  // Serializes WG.State.get() and POSTs to server.
  // Stub: resolves immediately with { ok:true, stub:true }.
  function upload() {
    const state = window.WG.State ? WG.State.get() : null;
    if (!state) return Promise.resolve({ ok: false, stub: true, error: 'no_state' });
    console.log('[MetaSaveSync] upload — Phase 4 server swap');
    if (!BASE_URL) return Promise.resolve({ ok: true, stub: true });
    const payload = {
      userId: _userId(),
      saveBlob: _serializeBlob(state),
      saveVersion: 2,
      signature: '',
    };
    return fetch(BASE_URL + '/save/upload', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, _authHeader()),
      body: JSON.stringify(payload),
    }).then(function(r) { return r.json(); }).catch(function(err) {
      console.warn('[MetaSaveSync] upload error', err);
      return { ok: false, stub: true, error: String(err) };
    });
  }

  // GET /save/latest
  // Returns the latest server save blob, or null if no server save / stub / error.
  // On cold-load: caller should compare blob.meta.lastSaveMs to local and merge if newer.
  function download() {
    console.log('[MetaSaveSync] download — Phase 4 server swap');
    if (!BASE_URL) return Promise.resolve(null);
    return fetch(BASE_URL + '/save/latest', {
      headers: _authHeader(),
    }).then(function(r) {
      if (!r.ok) return null;
      return r.json();
    }).then(function(data) {
      if (!data || !data.ok || !data.saveBlob) return null;
      return _deserializeBlob(data.saveBlob);
    }).catch(function(err) {
      console.warn('[MetaSaveSync] download error', err);
      return null;
    });
  }

  // Merge localBlob and serverBlob — MAX of progression counters, newer-timestamp wins for settings.
  // Phase 4: if response.conflict === "major", show user-choice prompt instead.
  // Stub: simple field-level MAX merge, writes directly into WG.State.get().
  function resolve(localBlob, serverBlob) {
    if (!serverBlob) return localBlob;
    if (!localBlob) return serverBlob;
    console.log('[MetaSaveSync] resolve — Phase 4 server swap', {
      localMs: localBlob.meta && localBlob.meta.lastSaveMs,
      serverMs: serverBlob.meta && serverBlob.meta.lastSaveMs,
    });
    const s = window.WG.State ? WG.State.get() : null;
    if (!s) return serverBlob;

    // Currencies: MAX
    if (serverBlob.currencies) {
      for (const k in serverBlob.currencies) {
        if (typeof serverBlob.currencies[k] === 'number') {
          s.currencies[k] = Math.max(s.currencies[k] || 0, serverBlob.currencies[k]);
        }
      }
    }
    // Player progression: MAX
    if (serverBlob.player) {
      if (serverBlob.player.level > s.player.level) {
        s.player.level = serverBlob.player.level;
        s.player.xp = serverBlob.player.xp;
      }
      if (serverBlob.player.ascendTier > s.player.ascendTier) s.player.ascendTier = serverBlob.player.ascendTier;
      if (serverBlob.player.highestStageCleared > s.player.highestStageCleared) {
        s.player.highestStageCleared = serverBlob.player.highestStageCleared;
      }
    }
    // Hunt progress: MAX
    if (serverBlob.huntProgress) {
      if (serverBlob.huntProgress.highestUnlocked > s.huntProgress.highestUnlocked) {
        s.huntProgress.highestUnlocked = serverBlob.huntProgress.highestUnlocked;
      }
      if (serverBlob.huntProgress.bestWaves) {
        for (const stageId in serverBlob.huntProgress.bestWaves) {
          const sv = serverBlob.huntProgress.bestWaves[stageId];
          const lv = s.huntProgress.bestWaves[stageId] || 0;
          if (sv > lv) s.huntProgress.bestWaves[stageId] = sv;
        }
      }
    }
    // Tower progress: MAX
    if (serverBlob.towerProgress && serverBlob.towerProgress.peakFloor > s.towerProgress.peakFloor) {
      s.towerProgress.peakFloor = serverBlob.towerProgress.peakFloor;
    }
    // Forge buildings: per-building MAX level
    if (serverBlob.forge && Array.isArray(serverBlob.forge.buildings)) {
      for (const sb of serverBlob.forge.buildings) {
        const lb = s.forge.buildings.find(function(b){ return b.id === sb.id; });
        if (lb && sb.level > lb.level) { lb.level = sb.level; lb.unlocked = sb.unlocked || lb.unlocked; }
      }
    }
    // Relics: union MAX count + level
    if (serverBlob.relics && serverBlob.relics.owned) {
      for (const id in serverBlob.relics.owned) {
        const sr = serverBlob.relics.owned[id];
        const lr = s.relics.owned[id];
        if (!lr) {
          s.relics.owned[id] = { count: sr.count, level: sr.level };
        } else {
          lr.count = Math.max(lr.count, sr.count);
          lr.level = Math.max(lr.level, sr.level);
        }
      }
    }
    // IAP: server-wins (cross-device entitlement source of truth)
    if (serverBlob.iap) Object.assign(s.iap, serverBlob.iap);
    // Settings: newer timestamp wins
    if (serverBlob.settings && serverBlob.meta && s.meta &&
        serverBlob.meta.lastSaveMs > s.meta.lastSaveMs) {
      Object.assign(s.settings, serverBlob.settings);
    }

    WG.Engine.emit('savesync:merged', {});
    return s;
  }

  // DELETE /save
  // Signals server to delete all save data for this user.
  // Called before local storage clear in the settings modal "Delete Save" flow.
  // Stub: resolves immediately with { ok:true, stub:true }.
  function del() {
    console.log('[MetaSaveSync] delete — Phase 4 server swap');
    if (!BASE_URL) return Promise.resolve({ ok: true, stub: true });
    return fetch(BASE_URL + '/save', {
      method: 'DELETE',
      headers: Object.assign({ 'Content-Type': 'application/json' }, _authHeader()),
      body: JSON.stringify({ userId: _userId(), signature: '' }),
    }).then(function(r) { return r.json(); }).catch(function(err) {
      console.warn('[MetaSaveSync] delete error', err);
      return { ok: false, stub: true, error: String(err) };
    });
  }

  function init() {}

  window.WG.MetaSaveSync = { init, upload, download, resolve, delete: del };
})();
