// WG.HuntPickups — in-stage ad-gated weapon pickup platforms + rift-sigil drop table
(function(){'use strict';

  // Rift Sigil drop tunables (Concern B — W-Rift-Mechanic-Plumbing).
  // RIFT_SIGIL_DROP_RATE_BOSS: Wraith Father (stage 18 boss) always drops 1 sigil on clear.
  // RIFT_SIGIL_DROP_RATE_STAGE_CLEAR: 1% per eldritch stage clear (stages 16-18).
  // Both rates apply on stage 18 clear: boss drop + independent stage-clear roll.
  const RIFT_TUNABLES = {
    RIFT_SIGIL_DROP_RATE_BOSS:        1.0,
    RIFT_SIGIL_DROP_RATE_STAGE_CLEAR: 0.01,
  };

  // W-Monetization-V2-Energy §D — treasure chest tunables (frozen).
  // Energy at 25% is the dopamine peak; every 5th chest re-rolls until energy
  // or gem lands so the streak guarantee always feels rewarding.
  const TREASURE_TUNABLES = Object.freeze({
    DROP_FROM_ENEMY:        0.05,
    DROP_FROM_BOSS:         0.30,
    OPEN_DURATION_SEC:      0.8,
    PICKUP_RADIUS:          28,
    GUARANTEE_EVERY_N:      5,
    LOOT_TABLE: Object.freeze([
      { kind: 'gold',     weight: 50, range: [1, 3], guaranteeable: false },
      { kind: 'energy',   weight: 25, amount: 5,    guaranteeable: true  },
      { kind: 'fragment', weight: 15, amount: 1,    guaranteeable: false },
      { kind: 'rare_mat', weight: 8,  amount: 1,    guaranteeable: false },
      { kind: 'gem',      weight: 2,  amount: 1,    guaranteeable: true  },
    ]),
  });

  function rollLoot(forceGuaranteeable){
    // Forced rolls draw from the guaranteeable subset only (deterministic, never
    // leaks gold/frag/rare-mat). Their internal weights are preserved so the
    // streak reward still honors energy>>gem rarity.
    const table = forceGuaranteeable
      ? TREASURE_TUNABLES.LOOT_TABLE.filter(e => e.guaranteeable)
      : TREASURE_TUNABLES.LOOT_TABLE;
    const total = table.reduce((sum, e) => sum + e.weight, 0);
    let pick = null;
    let r = Math.random() * total;
    for (const entry of table) {
      r -= entry.weight;
      if (r <= 0) { pick = entry; break; }
    }
    if (!pick) pick = table[0];
    let amount = pick.amount || 1;
    if (pick.range) amount = pick.range[0] + Math.floor(Math.random() * (pick.range[1] - pick.range[0] + 1));
    return { kind: pick.kind, amount };
  }

  function grantLoot(loot){
    const s = WG.State.get();
    switch (loot.kind) {
      case 'gold':     WG.State.grant('coins', loot.amount); break;
      case 'energy':   if (WG.State.grantEnergy) WG.State.grantEnergy(loot.amount, 'chest'); break;
      case 'gem':      WG.State.grant('diamonds', loot.amount); break;
      case 'fragment': s.forge.craftFragments = (s.forge.craftFragments || 0) + loot.amount; break;
      case 'rare_mat': s.forge.rareMats = (s.forge.rareMats || 0) + loot.amount; break;
    }
  }

  // Visual + chip for the magnet/pulse polish.
  const LOOT_VISUALS = {
    gold:     { color: '#ffd870', label: '🪙', chip: '.currency.coins' },
    energy:   { color: '#f0c060', label: '⚡', chip: '#energy-chip' },
    gem:      { color: '#80c8ff', label: '💎', chip: '.currency.diamonds' },
    fragment: { color: '#c0e0ff', label: '✦',  chip: null },
    rare_mat: { color: '#d8a060', label: '◆', chip: null },
  };

  function pulseChip(selector){
    if (!selector) return;
    const el = document.querySelector(selector);
    if (!el) return;
    el.classList.remove('chest-loot-pulse');
    void el.offsetWidth;
    el.classList.add('chest-loot-pulse');
    setTimeout(() => el.classList.remove('chest-loot-pulse'), 600);
  }

  // Inject pulse keyframes once.
  if (typeof document !== 'undefined' && !document.getElementById('wg-chest-css')) {
    const css = document.createElement('style');
    css.id = 'wg-chest-css';
    css.textContent = `
      @keyframes wg-chest-pulse {
        0%   { transform: scale(1);   filter: brightness(1); }
        45%  { transform: scale(1.18); filter: brightness(1.6); }
        100% { transform: scale(1);   filter: brightness(1); }
      }
      .chest-loot-pulse { animation: wg-chest-pulse 600ms cubic-bezier(.2,.8,.2,1); }
    `;
    document.head.appendChild(css);
  }

  // Returns how many rift sigils to grant at the end of a cleared stage.
  // Called by wg-game.js finishHunt(true). Zero cost if eldritch biome not reached.
  function rollSigilDrop(stageId, bossDefeated) {
    const stage = WG.HuntStage.get(stageId);
    if (!stage || stage.biome !== 'eldritch') return 0;
    let count = 0;
    if (bossDefeated && stage.bossId === 'wraith_father' && Math.random() < RIFT_TUNABLES.RIFT_SIGIL_DROP_RATE_BOSS) {
      count += 1;
    }
    if (Math.random() < RIFT_TUNABLES.RIFT_SIGIL_DROP_RATE_STAGE_CLEAR) {
      count += 1;
    }
    return count;
  }

  const POSITIONS = [
    [0.25, 0.30],
    [0.75, 0.62],
    [0.50, 0.85],
  ];

  function toast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:#f0d890;padding:8px 16px;border-radius:8px;font-size:13px;pointer-events:none;z-index:200;transition:opacity 0.4s;';
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 1800);
  }

  function showLockModal(pickup, runtime) {
    const existing = document.getElementById('pickup-lock-modal');
    if (existing) existing.remove();

    const weapon = WG.HuntWeapons.byId(pickup.weaponId);
    const root = document.getElementById('modal-root');
    const wrap = document.createElement('div');
    wrap.id = 'pickup-lock-modal';
    wrap.className = 'modal-overlay show';
    wrap.innerHTML =
      '<div class="modal-card">' +
        '<div class="modal-title">Locked Weapon</div>' +
        '<div class="modal-body">' + (weapon ? weapon.name : pickup.weaponId) +
          '<br>Watch an ad or pay diamonds to unlock this field weapon.</div>' +
        '<div class="modal-btn-row">' +
          '<button class="btn primary" id="_pw-watch">WATCH AD</button>' +
          '<button class="btn" id="_pw-pay">PAY 5 \uD83D\uDC8E</button>' +
          '<button class="btn" id="_pw-cancel">CANCEL</button>' +
        '</div>' +
      '</div>';
    root.appendChild(wrap);

    const dismiss = () => {
      wrap.remove();
      runtime._pickupModalOpen = false;
    };

    wrap.querySelector('#_pw-watch').addEventListener('click', async () => {
      const btn = wrap.querySelector('#_pw-watch');
      btn.disabled = true;
      const result = await WG.Ads.showRewardedVideo({ reward: 'pickup:' + pickup.weaponId });
      if (result.ok === true) {
        pickup.locked = false;
      }
      dismiss();
    });

    wrap.querySelector('#_pw-pay').addEventListener('click', () => {
      if (WG.State.spend('diamonds', 5)) {
        pickup.locked = false;
        dismiss();
      } else {
        toast('Need 5 \uD83D\uDC8E');
      }
    });

    wrap.querySelector('#_pw-cancel').addEventListener('click', dismiss);
  }

  function drawGlyph(ctx, shape, cx, cy) {
    ctx.fillStyle = '#f0e0b4';
    ctx.strokeStyle = '#f0e0b4';
    ctx.lineWidth = 1;
    switch (shape) {
      case 'axe':
        ctx.fillRect(cx - 0.5, cy, 1, 6);
        ctx.fillRect(cx - 2, cy - 8, 4, 8);
        break;
      case 'twin':
        ctx.fillRect(cx - 3, cy - 4, 1, 8);
        ctx.fillRect(cx + 2, cy - 4, 1, 8);
        break;
      case 'bow':
        ctx.beginPath();
        ctx.arc(cx, cy, 7, -Math.PI / 4, Math.PI / 4);
        ctx.stroke();
        break;
      case 'charm':
        ctx.beginPath();
        ctx.rect(cx - 3, cy - 3, 6, 6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - 3, cy - 3); ctx.lineTo(cx + 3, cy + 3);
        ctx.moveTo(cx + 3, cy - 3); ctx.lineTo(cx - 3, cy + 3);
        ctx.stroke();
        break;
      case 'briar':
        ctx.fillRect(cx - 0.5, cy - 5, 1, 10);
        ctx.fillRect(cx - 3, cy - 2, 2, 2);
        ctx.fillRect(cx + 1, cy + 1, 2, 2);
        break;
      case 'thorn':
        ctx.fillRect(cx - 4, cy - 1, 8, 2);
        break;
      case 'curve':
        ctx.beginPath();
        ctx.moveTo(cx - 4, cy + 5);
        ctx.lineTo(cx, cy - 1);
        ctx.lineTo(cx + 4, cy - 5);
        ctx.stroke();
        break;
      case 'whip':
        ctx.beginPath();
        ctx.moveTo(cx, cy - 6);
        ctx.lineTo(cx + 2, cy - 2);
        ctx.lineTo(cx - 2, cy + 2);
        ctx.lineTo(cx, cy + 6);
        ctx.stroke();
        break;
      default:
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
  }

  function draw(ctx, worldToScreen, runtime) {
    if (!runtime.pickups) return;
    const savedAlign = ctx.textAlign;
    const savedBaseline = ctx.textBaseline;

    for (const pickup of runtime.pickups) {
      if (pickup.claimed) continue;
      const s = worldToScreen(pickup.x, pickup.y);
      const hw = 18;

      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(20, 14, 8, 0.7)';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(s.x - hw, s.y - hw, 36, 36, 4);
      } else {
        ctx.rect(s.x - hw, s.y - hw, 36, 36);
      }
      ctx.fill();

      const weapon = WG.HuntWeapons.byId(pickup.weaponId);
      const borderColor = (weapon && weapon.visual && weapon.visual.color) || '#888';
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const shape = (weapon && weapon.visual && weapon.visual.shape) || 'default';
      drawGlyph(ctx, shape, s.x, s.y);

      if (pickup.locked) {
        ctx.font = '14px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000';
        ctx.fillText('\uD83D\uDD12', s.x + 1, s.y + hw - 6 + 1);
        ctx.fillStyle = '#fff';
        ctx.fillText('\uD83D\uDD12', s.x, s.y + hw - 6);
      } else {
        const alpha = 0.4 + 0.3 * Math.sin(pickup._pulsePhase);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#ffd870';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(s.x, s.y, hw + 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    ctx.globalAlpha = 1;
    ctx.textAlign = savedAlign;
    ctx.textBaseline = savedBaseline;
  }

  function tick(runtime, dt) {
    if (!runtime.pickups) return;
    const player = runtime.player;
    if (!player) return;

    let nearPickup = null;
    for (const pickup of runtime.pickups) {
      if (pickup.claimed) continue;
      pickup._pulsePhase = (pickup._pulsePhase + dt * 3) % (Math.PI * 2);
      const dx = player.x - pickup.x;
      const dy = player.y - pickup.y;
      if (dx * dx + dy * dy < 28 * 28) {
        nearPickup = pickup;
        break;
      }
    }

    if (!nearPickup) {
      runtime.pendingPickup = null;
      runtime._pickupModalOpen = false;
      return;
    }

    runtime.pendingPickup = nearPickup;

    if (nearPickup.locked && !runtime._pickupModalOpen) {
      showLockModal(nearPickup, runtime);
      runtime._pickupModalOpen = true;
    } else if (!nearPickup.locked && !nearPickup.claimed) {
      runtime.player.heldPickupId = nearPickup.weaponId;
      nearPickup.claimed = true;
      WG.Engine.emit('pickup:claimed', { pickup: nearPickup });
      runtime.pendingPickup = null;
    }
  }

  function spawnForStage(runtime, stage) {
    if (!runtime.pickups) runtime.pickups = [];
    if (!stage.weaponPickups) return;
    for (let i = 0; i < stage.weaponPickups.length; i++) {
      const pos = POSITIONS[i] || POSITIONS[POSITIONS.length - 1];
      runtime._nextPickupId = (runtime._nextPickupId || 0) + 1;
      runtime.pickups.push({
        id: runtime._nextPickupId,
        weaponId: stage.weaponPickups[i],
        x: runtime.mapW * pos[0],
        y: runtime.mapH * pos[1],
        claimed: false,
        locked: true,
        _pulsePhase: 0,
      });
    }
  }

  // W-Fever-Mode §C — fever chest: bigger, gold-orange, guaranteed multi-item loot.
  // lootItems: array of {kind, amount} built in hunt-player endFever('survived').
  // Loot table is designer-tunable via WG.HuntPlayer.FEVER_TUNABLES (CHEST_GOLD_MIN/MAX).
  function spawnFeverChest(runtime, x, y, lootItems) {
    if (!runtime) return;
    if (!runtime.chests) runtime.chests = [];
    runtime._nextChestId = (runtime._nextChestId || 0) + 1;
    runtime.chests.push({
      id: runtime._nextChestId,
      x, y,
      state: 'closed',
      stateTimer: 0,
      _pulsePhase: Math.random() * Math.PI * 2,
      feverChest: true,
      feverLoot: lootItems,
    });
  }

  // W-Monetization-V2-Energy §D — chest spawning, tick, draw.
  function spawnChest(runtime, x, y) {
    if (!runtime) return;
    if (!runtime.chests) runtime.chests = [];
    runtime._nextChestId = (runtime._nextChestId || 0) + 1;
    runtime.chests.push({
      id: runtime._nextChestId,
      x, y,
      state: 'closed',          // 'closed' | 'opening'
      stateTimer: 0,
      _pulsePhase: Math.random() * Math.PI * 2,
    });
  }

  function tickChests(runtime, dt) {
    if (!runtime.chests || !runtime.chests.length) return;
    const player = runtime.player;
    if (!player) return;
    const RAD = TREASURE_TUNABLES.PICKUP_RADIUS;
    for (let i = runtime.chests.length - 1; i >= 0; i--) {
      const c = runtime.chests[i];
      c._pulsePhase = (c._pulsePhase + dt * 3) % (Math.PI * 2);
      if (c.state === 'closed') {
        const dx = player.x - c.x, dy = player.y - c.y;
        if (dx * dx + dy * dy < RAD * RAD) {
          c.state = 'opening';
          c.stateTimer = TREASURE_TUNABLES.OPEN_DURATION_SEC;
          WG.Engine.emit('chest:opening', { chest: c });
        }
      } else if (c.state === 'opening') {
        c.stateTimer -= dt;
        if (c.stateTimer <= 0) {
          if (c.feverChest && c.feverLoot) {
            // W-Fever-Mode §C — grant all fever loot items with per-item FX
            for (let _li = 0; _li < c.feverLoot.length; _li++) {
              const item = c.feverLoot[_li];
              grantLoot(item);
              const vis = LOOT_VISUALS[item.kind] || LOOT_VISUALS.gold;
              if (WG.HuntFXNumbers) {
                WG.HuntFXNumbers.spawn(
                  c.x + (Math.random() - 0.5) * 18,
                  c.y - 12 - _li * 14,
                  vis.label + ' +' + item.amount,
                  { color: vis.color, size: 14, duration: 1100, velocity: -22 }
                );
              }
            }
            WG.Engine.emit('chest:opened', { chest: c, fever: true });
          } else {
            // Standard treasure chest loot
            const s = WG.State.get();
            s.meta.chestsOpenedSinceGuarantee = (s.meta.chestsOpenedSinceGuarantee || 0) + 1;
            const force = (s.meta.chestsOpenedSinceGuarantee % TREASURE_TUNABLES.GUARANTEE_EVERY_N) === 0;
            const loot = rollLoot(force);
            grantLoot(loot);
            const vis = LOOT_VISUALS[loot.kind] || LOOT_VISUALS.gold;
            if (WG.HuntFXNumbers) {
              WG.HuntFXNumbers.spawn(c.x, c.y - 12, vis.label + ' +' + loot.amount, { color: vis.color, size: 14, duration: 1100, velocity: -22 });
            }
            pulseChip(vis.chip);
            WG.Engine.emit('chest:opened', { chest: c, loot, guaranteed: force });
          }
          runtime.chests.splice(i, 1);
        }
      }
    }
  }

  function drawChests(ctx, worldToScreen, runtime) {
    if (!runtime.chests || !runtime.chests.length) return;
    for (const c of runtime.chests) {
      const s = worldToScreen(c.x, c.y);
      const opening = c.state === 'opening';
      const t = opening ? 1 - (c.stateTimer / TREASURE_TUNABLES.OPEN_DURATION_SEC) : 0;
      // W-Fever-Mode §C — fever chest is 45% larger with gold-orange palette
      const w = c.feverChest ? 32 : 22;
      const h = c.feverChest ? 23 : 16;
      ctx.save();
      ctx.translate(s.x, s.y);
      // W-Fever-Mode §C — fever chest uses orange-gold palette; normal chest uses brown.
      const bodyColor   = c.feverChest ? '#7a3800' : '#5a3a1a';
      const rimColor    = c.feverChest ? '#ff8040' : '#f0c060';
      const bandColor   = c.feverChest ? '#c05820' : '#8a5a28';
      const lidColor    = c.feverChest ? '#9a4800' : '#7a4a22';
      const lockColor   = c.feverChest ? '#ff8040' : '#f0c060';
      const glowColor   = c.feverChest ? '#ff6020' : '#ffd870';
      const burstColor  = c.feverChest ? '#ff9040' : '#ffe080';
      const glowRadius  = c.feverChest ? w/2 + 10 : w/2 + 6;
      ctx.fillStyle = bodyColor;
      ctx.strokeStyle = rimColor;
      ctx.lineWidth = c.feverChest ? 1.8 : 1.2;
      ctx.fillRect(-w/2, -h/2, w, h);
      ctx.strokeRect(-w/2, -h/2, w, h);
      // Iron bands
      ctx.fillStyle = bandColor;
      ctx.fillRect(-w/2, -h/2 - 1, w, 3);
      ctx.fillRect(-w/2, h/2 - 2, w, 3);
      // Lid lift during opening (rotates up by t * 90deg)
      ctx.save();
      ctx.translate(0, -h/2);
      ctx.rotate(-t * Math.PI / 2);
      ctx.fillStyle = lidColor;
      ctx.fillRect(-w/2, -3, w, 4);
      ctx.strokeStyle = rimColor;
      ctx.strokeRect(-w/2, -3, w, 4);
      // Lock plate
      ctx.fillStyle = lockColor;
      ctx.fillRect(-2, -2, 4, 3);
      ctx.restore();
      // Glow ring while closed — fever chest glows stronger
      if (!opening) {
        const basePulse = c.feverChest ? 0.45 : 0.3;
        const ampPulse  = c.feverChest ? 0.35 : 0.25;
        const alpha = basePulse + ampPulse * Math.sin(c._pulsePhase);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = c.feverChest ? 3 : 2;
        ctx.beginPath();
        ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // Burst particles while opening
      if (opening && t > 0.3) {
        const burstA = (t - 0.3) / 0.7;
        ctx.globalAlpha = 1 - burstA;
        ctx.fillStyle = burstColor;
        const numBursts = c.feverChest ? 10 : 6;
        for (let k = 0; k < numBursts; k++) {
          const ang = k * (Math.PI * 2 / numBursts);
          const r = (c.feverChest ? 6 : 4) + burstA * (c.feverChest ? 22 : 16);
          ctx.beginPath();
          ctx.arc(Math.cos(ang) * r, Math.sin(ang) * r - h/2, c.feverChest ? 2.5 : 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }
  }

  // Wrap original draw + tick to also process chests, preserving existing pickup logic.
  const _origDraw = draw;
  const _origTick = tick;
  function drawAll(ctx, worldToScreen, runtime){
    _origDraw(ctx, worldToScreen, runtime);
    drawChests(ctx, worldToScreen, runtime);
  }
  function tickAll(runtime, dt){
    _origTick(runtime, dt);
    tickChests(runtime, dt);
  }

  function init() {
    WG.Engine.on('enemy:killed', ({ creature }) => {
      if (!creature) return;
      const rt = WG.Game && WG.Game.getHuntRuntime && WG.Game.getHuntRuntime();
      if (!rt) return;
      if (Math.random() < TREASURE_TUNABLES.DROP_FROM_ENEMY) spawnChest(rt, creature.x, creature.y);
    });
    WG.Engine.on('boss:defeated', ({ boss }) => {
      if (!boss) return;
      const rt = WG.Game && WG.Game.getHuntRuntime && WG.Game.getHuntRuntime();
      if (!rt) return;
      if (Math.random() < TREASURE_TUNABLES.DROP_FROM_BOSS) spawnChest(rt, boss.x, boss.y);
    });
  }

  window.WG.HuntPickups = { init, spawnForStage, draw: drawAll, tick: tickAll, rollSigilDrop, RIFT_TUNABLES, TREASURE_TUNABLES, spawnChest, spawnFeverChest, rollLoot };
})();
