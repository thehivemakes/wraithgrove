// WG.Buffs — ad-purchased buff registry. Read-only signals to gameplay code.
//
// Spec: W-Hard-Tuning-And-Monetization §B. Activated by rewarded-video ads
// (level-select panel) or by the death-modal revive flow. Gameplay modules
// READ buff state via has() — only activate()/consume() ever mutate.
//
// Architecture:
//   - Duration-based buffs: stored with absolute expiresAt (ms). has() compares
//     to Date.now(), no tick required, naturally pauses with the wall clock.
//   - One-shot buffs: stored without expiresAt; consume() removes them.
//   - 'revive' is one-shot; 'instant_turret' is one-shot; 'damage_x2' and
//     'wood_x2' are duration-based.
(function () {
  'use strict';

  // Buff catalog — single source of truth. Adding a buff = add a row here.
  const BUFFS = {
    damage_x2:      { kind: 'duration', defaultMs: 60000, label: '2× DAMAGE',  short: '2× DMG'  },
    wood_x2:        { kind: 'duration', defaultMs: 90000, label: '2× WOOD',    short: '2× WOOD' },
    instant_turret: { kind: 'oneshot',  defaultMs: 0,     label: 'INSTANT TURRET', short: 'TURRET' },
    revive:         { kind: 'oneshot',  defaultMs: 0,     label: 'REVIVE READY', short: 'REVIVE' },
  };

  // active[id] → { expiresAt:number|null, activatedAt:number }
  const active = Object.create(null);

  function _now() { return Date.now(); }

  function activate(buffId, durationMs) {
    const def = BUFFS[buffId];
    if (!def) { console.warn('[buffs] unknown buff:', buffId); return false; }
    const ms = (typeof durationMs === 'number' && durationMs > 0) ? durationMs : def.defaultMs;
    const expiresAt = (def.kind === 'duration') ? _now() + ms : null;
    active[buffId] = { expiresAt, activatedAt: _now() };
    if (window.WG && WG.Engine && WG.Engine.emit) {
      WG.Engine.emit('buff:activated', { id: buffId, durationMs: ms, kind: def.kind, label: def.label });
      // Also emit iap:purchase so the existing audio EVENT_MAP plays cha_ching.
      WG.Engine.emit('iap:purchase', { source: 'buff', id: buffId });
    }
    return true;
  }

  function has(buffId) {
    const a = active[buffId];
    if (!a) return false;
    if (a.expiresAt !== null && _now() >= a.expiresAt) {
      delete active[buffId];
      if (window.WG && WG.Engine && WG.Engine.emit) {
        WG.Engine.emit('buff:expired', { id: buffId });
      }
      return false;
    }
    return true;
  }

  function consume(buffId) {
    if (!has(buffId)) return false;
    delete active[buffId];
    if (window.WG && WG.Engine && WG.Engine.emit) {
      WG.Engine.emit('buff:consumed', { id: buffId });
    }
    return true;
  }

  // Snapshot for HUD rendering. Returns array of { id, label, short, kind,
  // remainingMs (null for one-shots). Stale entries (expired) are pruned.
  function list() {
    const out = [];
    const now = _now();
    for (const id of Object.keys(active)) {
      const a = active[id];
      if (a.expiresAt !== null && now >= a.expiresAt) {
        delete active[id];
        continue;
      }
      const def = BUFFS[id] || {};
      out.push({
        id,
        label: def.label || id,
        short: def.short || id,
        kind:  def.kind  || 'oneshot',
        remainingMs: (a.expiresAt === null) ? null : Math.max(0, a.expiresAt - now),
      });
    }
    return out;
  }

  function clearAll() {
    for (const id of Object.keys(active)) delete active[id];
  }

  function init() {}

  window.WG = window.WG || {};
  window.WG.Buffs = { init, activate, has, consume, list, clearAll, BUFFS };
})();
