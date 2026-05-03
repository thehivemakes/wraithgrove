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

  function init() {}

  window.WG.HuntPickups = { init, spawnForStage, draw, tick, rollSigilDrop, RIFT_TUNABLES };
})();
