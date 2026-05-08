// WG.SpecialAbilities — timed special abilities with cooldowns + ad/IAP charge system.
// Architect ratification 2026-05-06: W-Special-Abilities.
//
// Architecture:
//   - CATALOG is frozen: 6 abilities, each with effect, cooldownSec, rarity.
//   - Per-ability state lives in WG.State.get().player:
//       abilitySlots       [null|id, null|id, null|id]  — equipped loadout
//       abilityCharges     { id: count }                — owned charges (meta, persist)
//       abilityCooldowns   { id: endsAtMs }             — next-usable timestamp (meta, persist)
//       abilityAdWatchToday { id: count }               — daily ad charges used per ability
//       abilityAdWatchDay  'YYYY-MM-DD'                 — for daily reset
//   - Runtime effects (invuln, timeSlow, shield, magnetXp, shadowBuff) live on the
//     huntRuntime object and are wiped on stage exit — NOT persisted.
//   - Cooldowns ARE meta (persist through stage exit+re-entry) per spec.
(function () { 'use strict';

  const DAILY_AD_CHARGE_CAP = 5;

  const CATALOG = Object.freeze({
    wraith_banish: {
      name: 'Wraith Banish', icon: '🌀',
      desc: 'Clear all on-screen enemies. Boss damage 30%.',
      cooldownSec: 180,
      effect: 'clear_enemies',
      rarity: 'common',
    },
    lantern_pulse: {
      name: 'Lantern Pulse', icon: '🪔',
      desc: '3s invulnerability + AoE damage in 200u radius.',
      cooldownSec: 120,
      effect: 'invuln_aoe', durationSec: 3, radiusU: 200, damage: 80,
      rarity: 'common',
    },
    time_slow: {
      name: 'Time Slow', icon: '⏳',
      desc: 'World moves at 30% speed for 5 seconds.',
      cooldownSec: 90,
      effect: 'time_slow', durationSec: 5, slowFactor: 0.3,
      rarity: 'rare',
    },
    soul_magnet: {
      name: 'Soul Magnet', icon: '🧲',
      desc: 'Pull all drops + 2x XP for 8 seconds.',
      cooldownSec: 60,
      effect: 'magnet_xp', durationSec: 8, xpMult: 2,
      rarity: 'common',
    },
    shadow_strike: {
      name: 'Shadow Strike', icon: '⚔',
      desc: 'Teleport to nearest enemy + 5× damage on next 3 hits.',
      cooldownSec: 75,
      effect: 'teleport_strike', stacks: 3, damageMult: 5,
      rarity: 'rare',
    },
    paper_charm_ward: {
      name: 'Paper Charm Ward', icon: '🪧',
      desc: '10s shield absorbs all damage.',
      cooldownSec: 240,
      effect: 'shield', durationSec: 10,
      rarity: 'legendary',
    },
  });

  // ── State helpers ────────────────────────────────────────────────────────────

  function _ps() { return WG.State.get().player; }

  function _ensureState() {
    const p = _ps();
    if (!p.abilitySlots)        p.abilitySlots        = [null, null, null];
    if (!p.abilityCharges)      p.abilityCharges      = {};
    if (!p.abilityCooldowns)    p.abilityCooldowns    = {};
    if (!p.abilityAdWatchToday) p.abilityAdWatchToday = {};
    if (!p.abilityAdWatchDay)   p.abilityAdWatchDay   = '';
  }

  function _todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
  }

  function _resetAdCountsIfNewDay() {
    const p = _ps();
    const today = _todayKey();
    if (p.abilityAdWatchDay !== today) {
      p.abilityAdWatchToday = {};
      p.abilityAdWatchDay   = today;
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  function equip(slotIdx, abilityId) {
    _ensureState();
    const p = _ps();
    if (slotIdx < 0 || slotIdx > 2) return false;
    if (abilityId !== null && !CATALOG[abilityId]) return false;
    // Remove the same ability from any other slot first
    if (abilityId !== null) {
      p.abilitySlots = p.abilitySlots.map((s, i) => (i !== slotIdx && s === abilityId ? null : s));
    }
    p.abilitySlots[slotIdx] = abilityId || null;
    WG.Engine.emit('abilities:loadout-changed', { slots: p.abilitySlots });
    WG.Cache.save();
    return true;
  }

  function addCharge(abilityId, n) {
    _ensureState();
    if (!CATALOG[abilityId]) return;
    const p = _ps();
    p.abilityCharges[abilityId] = (p.abilityCharges[abilityId] || 0) + (n || 1);
    WG.Engine.emit('abilities:charge-added', { abilityId, charges: p.abilityCharges[abilityId] });
    WG.Cache.save();
  }

  function cast(slotIdx, runtime) {
    _ensureState();
    const p = _ps();
    const id = p.abilitySlots[slotIdx];
    if (!id) return false;
    const def = CATALOG[id];
    if (!def) return false;

    const charges = p.abilityCharges[id] || 0;
    if (charges <= 0) return false;

    const cooldownEndsAt = p.abilityCooldowns[id] || 0;
    if (Date.now() < cooldownEndsAt) return false;

    // Consume charge + start cooldown
    p.abilityCharges[id] = charges - 1;
    p.abilityCooldowns[id] = Date.now() + def.cooldownSec * 1000;

    WG.Engine.emit('abilities:cast', { abilityId: id, slotIdx });
    _executeEffect(def, runtime);
    WG.Cache.save();
    return true;
  }

  // Returns array[3] of slot state objects for HUD rendering.
  function getState() {
    _ensureState();
    const p = _ps();
    const now = Date.now();
    return p.abilitySlots.map(function (id, i) {
      if (!id) return { slotIdx: i, locked: true };
      const def = CATALOG[id];
      if (!def) return { slotIdx: i, locked: true };
      const charges = p.abilityCharges[id] || 0;
      const cooldownEndsAt = p.abilityCooldowns[id] || 0;
      const cooldownRemainingSec = Math.max(0, (cooldownEndsAt - now) / 1000);
      const onCooldown = cooldownRemainingSec > 0;
      const ready = charges > 0 && !onCooldown;
      return {
        slotIdx: i,
        locked: false,
        abilityId: id,
        icon: def.icon,
        name: def.name,
        rarity: def.rarity,
        charges,
        cooldownSec: def.cooldownSec,
        cooldownRemainingSec,
        onCooldown,
        ready,
      };
    });
  }

  // How many ad-charges the player can still earn today for a given ability.
  function adChargesRemainingToday(abilityId) {
    _ensureState();
    _resetAdCountsIfNewDay();
    const p = _ps();
    return Math.max(0, DAILY_AD_CHARGE_CAP - (p.abilityAdWatchToday[abilityId] || 0));
  }

  // Called by the ad-watch modal flow.  Returns a Promise<bool>.
  function watchAdForCharge(abilityId) {
    _ensureState();
    _resetAdCountsIfNewDay();
    const p = _ps();
    if (!CATALOG[abilityId]) return Promise.resolve(false);
    if (adChargesRemainingToday(abilityId) <= 0) {
      _showInfo('Daily cap reached', `You can earn at most ${DAILY_AD_CHARGE_CAP} ad charges per day for this ability.`);
      return Promise.resolve(false);
    }
    return WG.Ads.showRewardedVideo({ reward: 'ability_charge' }).then(function (result) {
      if (!result.ok && !result.bypassed) return false;
      p.abilityAdWatchToday[abilityId] = (p.abilityAdWatchToday[abilityId] || 0) + 1;
      addCharge(abilityId, 1);
      return true;
    });
  }

  // Show empty-slot tap modal: "Watch ad (+1 charge)" / "Buy pack" / close.
  function showSlotModal(slotIdx) {
    _ensureState();
    const p = _ps();
    const id = p.abilitySlots[slotIdx];
    if (!id) {
      // Slot is empty — open loadout picker
      showLoadoutModal(slotIdx);
      return;
    }
    const def = CATALOG[id];
    const state = getState()[slotIdx];
    const remaining = adChargesRemainingToday(id);

    const root = document.getElementById('modal-root');
    const wrap = document.createElement('div');
    wrap.className = 'modal-overlay show';
    wrap.innerHTML = `
      <div class="modal-card" style="max-width:300px;">
        <div class="modal-title" style="font-size:22px;margin-bottom:4px;">${def.icon} ${def.name}</div>
        <div style="font-size:11px;color:#a89878;margin-bottom:6px;letter-spacing:1px;">${def.rarity.toUpperCase()}</div>
        <div style="font-size:12px;color:#c8b898;line-height:1.4;margin-bottom:12px;">${def.desc}</div>
        <div style="font-size:11px;color:#a0c8a0;margin-bottom:12px;">Charges: <strong>${state.charges}</strong> &nbsp;|&nbsp; Cooldown: <strong>${def.cooldownSec}s</strong>${state.cooldownRemainingSec > 0 ? ' (<span id="sa-cd-remain">'+Math.ceil(state.cooldownRemainingSec)+'s remaining</span>)' : ''}</div>
        <div class="modal-btn-row" style="flex-direction:column;gap:8px;">
          <button id="sa-ad-btn" class="btn primary" ${remaining <= 0 ? 'disabled' : ''}>📺 Watch Ad (+1 charge${remaining > 0 ? ', '+remaining+' left today' : ' — daily cap reached'})</button>
          <button id="sa-shop-btn" class="btn">🛒 Buy Pack</button>
          <button id="sa-close-btn" class="btn">Close</button>
        </div>
      </div>
    `;
    root.appendChild(wrap);

    wrap.querySelector('#sa-close-btn').addEventListener('click', () => wrap.remove());
    wrap.querySelector('#sa-shop-btn').addEventListener('click', () => {
      wrap.remove();
      // Open shop at ability packs section
      if (window.WG && WG.Shop && WG.Shop.openAtSection) WG.Shop.openAtSection('ability_packs');
    });
    const adBtn = wrap.querySelector('#sa-ad-btn');
    adBtn.addEventListener('click', async () => {
      adBtn.disabled = true;
      const ok = await watchAdForCharge(id);
      wrap.remove();
      if (ok) _showInfo('Charge earned!', `+1 ${def.icon} ${def.name} charge added.`);
    });
  }

  // Loadout modal — pick which ability to equip in a slot.
  function showLoadoutModal(slotIdx) {
    _ensureState();
    const p = _ps();
    const root = document.getElementById('modal-root');
    const wrap = document.createElement('div');
    wrap.className = 'modal-overlay show';

    const abilityRows = Object.keys(CATALOG).map(function (id) {
      const def = CATALOG[id];
      const charges = p.abilityCharges[id] || 0;
      const alreadyEquipped = p.abilitySlots.indexOf(id) !== -1 && p.abilitySlots[slotIdx] !== id;
      return `<button class="sa-loadout-row btn${alreadyEquipped ? ' disabled' : ''}" data-id="${id}" ${alreadyEquipped ? 'disabled title="Already equipped in another slot"' : ''} style="display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:10px 12px;margin-bottom:6px;border-radius:8px;">
        <span style="font-size:22px;">${def.icon}</span>
        <span style="flex:1;">
          <div style="font-size:12px;font-weight:700;color:#f0d890;">${def.name}</div>
          <div style="font-size:10px;color:#a89878;">${def.rarity} · ${def.cooldownSec}s cd · ${charges} charge${charges !== 1 ? 's' : ''}</div>
        </span>
      </button>`;
    }).join('');

    wrap.innerHTML = `
      <div class="modal-card" style="max-width:320px;">
        <div class="modal-title">Equip Ability (Slot ${slotIdx + 1})</div>
        <div style="margin:12px 0;">${abilityRows}</div>
        <div class="modal-btn-row">
          ${p.abilitySlots[slotIdx] ? '<button id="sa-unequip-btn" class="btn" style="flex:1;">Unequip</button>' : ''}
          <button id="sa-lm-close" class="btn" style="flex:1;">Cancel</button>
        </div>
      </div>
    `;
    root.appendChild(wrap);

    wrap.querySelector('#sa-lm-close').addEventListener('click', () => wrap.remove());
    const unequipBtn = wrap.querySelector('#sa-unequip-btn');
    if (unequipBtn) {
      unequipBtn.addEventListener('click', () => { equip(slotIdx, null); wrap.remove(); });
    }
    wrap.querySelectorAll('.sa-loadout-row').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = btn.dataset.id;
        equip(slotIdx, id);
        wrap.remove();
      });
    });
  }

  // ── Effect dispatch ──────────────────────────────────────────────────────────

  function _executeEffect(def, runtime) {
    if (!runtime) return;
    switch (def.effect) {
      case 'clear_enemies':    _fx_clearEnemies(def, runtime);    break;
      case 'invuln_aoe':       _fx_invulnAoe(def, runtime);       break;
      case 'time_slow':        _fx_timeSlow(def, runtime);        break;
      case 'magnet_xp':        _fx_magnetXp(def, runtime);        break;
      case 'teleport_strike':  _fx_teleportStrike(def, runtime);  break;
      case 'shield':           _fx_shield(def, runtime);          break;
    }
  }

  // clear_enemies: deal lethal damage to all creatures; 30% HP damage to boss.
  function _fx_clearEnemies(def, runtime) {
    let kills = 0;
    for (const c of runtime.creatures) {
      if (c.hp > 0) {
        if (WG.HuntEnemies.damage(c, 9999, { type: 'ability-clear' })) kills++;
      }
    }
    if (runtime.boss && runtime.boss.hp > 0) {
      const bossDmg = Math.floor(runtime.boss.maxHp * 0.30) || Math.floor(runtime.boss.hp * 0.30);
      runtime.boss.hp = Math.max(1, runtime.boss.hp - bossDmg);
      WG.Engine.emit('boss:damaged', { boss: runtime.boss, amount: bossDmg });
    }
    WG.Engine.emit('ability:clear-enemies', { kills });
    if (window.WG && WG.Render && WG.Render.spawnParticles) {
      WG.Render.spawnParticles(runtime.mapW * 0.5, runtime.mapH * 0.5, 30, { color: '#a080ff', speed: 200 });
    }
  }

  // invuln_aoe: player invulnerable for durationSec + immediate AoE damage burst.
  function _fx_invulnAoe(def, runtime) {
    runtime._invulnEndsAt = Date.now() + def.durationSec * 1000;
    const px = runtime.player.x, py = runtime.player.y;
    const r2 = def.radiusU * def.radiusU;
    for (const c of runtime.creatures) {
      if (c.hp <= 0) continue;
      const dx = c.x - px, dy = c.y - py;
      if (dx*dx + dy*dy <= r2) WG.HuntEnemies.damage(c, def.damage, { type: 'ability-aoe' });
    }
    if (runtime.boss && runtime.boss.hp > 0) {
      const dx = runtime.boss.x - px, dy = runtime.boss.y - py;
      if (dx*dx + dy*dy <= r2) {
        runtime.boss.hp = Math.max(0, runtime.boss.hp - def.damage);
        WG.Engine.emit('boss:damaged', { boss: runtime.boss, amount: def.damage });
      }
    }
    WG.Engine.emit('ability:invuln-aoe', { durationSec: def.durationSec });
    if (window.WG && WG.Render && WG.Render.spawnParticles) {
      WG.Render.spawnParticles(px, py, 20, { color: '#ffffa0', speed: 160 });
    }
  }

  // time_slow: store on runtime; wg-game.js applies dt scaling.
  function _fx_timeSlow(def, runtime) {
    runtime._timeSlow = { endsAt: Date.now() + def.durationSec * 1000, factor: def.slowFactor };
    WG.Engine.emit('ability:time-slow', { durationSec: def.durationSec, factor: def.slowFactor });
  }

  // magnet_xp: extend pickup radius to full screen + 2× XP for duration.
  function _fx_magnetXp(def, runtime) {
    runtime._magnetXpEndsAt = Date.now() + def.durationSec * 1000;
    runtime._magnetXpMult   = def.xpMult || 2;
    WG.Engine.emit('ability:magnet-xp', { durationSec: def.durationSec });
  }

  // teleport_strike: move player to nearest enemy + attach shadow buff (3 stacks, 5× dmg).
  function _fx_teleportStrike(def, runtime) {
    const p = runtime.player;
    if (!p) return;
    let nearest = null, nearDist = Infinity;
    for (const c of runtime.creatures) {
      if (c.hp <= 0) continue;
      const dx = c.x - p.x, dy = c.y - p.y;
      const d = dx*dx + dy*dy;
      if (d < nearDist) { nearDist = d; nearest = c; }
    }
    if (nearest) {
      // Land behind the enemy (32u offset away from center).
      const dx = nearest.x - p.x, dy = nearest.y - p.y;
      const len = Math.sqrt(dx*dx + dy*dy) || 1;
      p.x = nearest.x - (dx/len) * 32;
      p.y = nearest.y - (dy/len) * 32;
      WG.Engine.emit('ability:teleport', { x: p.x, y: p.y });
    }
    p._shadowBuff = { stacks: def.stacks || 3, mult: def.damageMult || 5 };
    WG.Engine.emit('ability:shadow-strike', { stacks: p._shadowBuff.stacks });
  }

  // shield: absorb all damage for durationSec.
  function _fx_shield(def, runtime) {
    runtime._shieldEndsAt = Date.now() + def.durationSec * 1000;
    WG.Engine.emit('ability:shield', { durationSec: def.durationSec });
    if (window.WG && WG.Render && WG.Render.spawnParticles) {
      WG.Render.spawnParticles(runtime.player.x, runtime.player.y, 15, { color: '#80c0ff', speed: 80 });
    }
  }

  // ── IAP grant handler ────────────────────────────────────────────────────────

  function _onIapPurchased(e) {
    const sku = e && e.sku;
    if (!sku || !sku.grants || !sku.grants.abilityCharges) return;
    const grants = sku.grants.abilityCharges;
    for (const id in grants) {
      if (CATALOG[id]) addCharge(id, grants[id]);
    }
  }

  // ── Utility ──────────────────────────────────────────────────────────────────

  function _showInfo(title, body) {
    const root = document.getElementById('modal-root');
    if (!root) return;
    const wrap = document.createElement('div');
    wrap.className = 'modal-overlay show';
    wrap.innerHTML = `<div class="modal-card"><div class="modal-title">${title}</div><div style="font-size:12px;color:#c8b898;margin:8px 0 14px 0;">${body}</div><div class="modal-btn-row"><button class="btn primary">OK</button></div></div>`;
    root.appendChild(wrap);
    wrap.querySelector('.btn').addEventListener('click', () => wrap.remove());
  }

  function init() {
    _ensureState();
    WG.Engine.on('iap:purchased', _onIapPurchased);
  }

  window.WG = window.WG || {};
  window.WG.SpecialAbilities = {
    init,
    CATALOG,
    equip,
    cast,
    addCharge,
    getState,
    adChargesRemainingToday,
    watchAdForCharge,
    showSlotModal,
    showLoadoutModal,
  };
})();
