// WG.ForgeRender — Forge / Buildings tab DOM UI
//
// Layout (scr_02 reference):
//   1. Top currency strip      (in index.html, not in this module)
//   2. Diorama (~30% viewport) — small canvas with the 3 unlocked buildings drawn procedurally
//   3. Power readout in red/orange
//   4. 4×2 building grid       — 3 unlocked, 5 locked; tap to open detail modal
//   5. Daily Chest icon        — small chest, top-left of grid area
//   6. Anvil station bottom    — tap to open crafting modal
//   7. Bottom nav              (in index.html, not in this module)
//
// DOM-based UI (not canvas) for reliable phone taps. The diorama canvas is
// purely decorative — every tap target is a DOM element.
(function(){'use strict';

  // ---------- diorama tunables ----------
  const DIORAMA_HEIGHT_VH = 30;          // ~30% of viewport height per spec
  const DIORAMA_FLICKER_HZ_PRIMARY = 4.7; // campfire flame primary frequency
  const DIORAMA_FLICKER_HZ_OVERTONE = 9.2;

  // ---------- helpers ----------
  function el(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'onclick') e.addEventListener('click', attrs[k]);
      else if (k === 'style') e.style.cssText = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    for (const kid of kids) {
      if (kid == null) continue;
      e.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
    }
    return e;
  }
  function getRoot() { return document.getElementById('tab-forge'); }
  function modalRoot() { return document.getElementById('modal-root'); }

  // ---------- diorama (small canvas inside the tab) ----------
  let dioramaCanvas = null;
  let dioramaCtx = null;
  let dioramaRAF = 0;
  let dioramaStartMs = 0;

  function makeDiorama() {
    const wrap = el('div', { style:
      'position:relative;width:100%;border:1px solid #3a2818;border-radius:8px;overflow:hidden;' +
      'background:#0a1408;margin-bottom:8px;'
    });
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'display:block;width:100%;height:30vh;max-height:260px;';
    wrap.appendChild(canvas);
    dioramaCanvas = canvas;
    dioramaCtx = canvas.getContext('2d');
    return wrap;
  }

  function sizeDioramaCanvas() {
    if (!dioramaCanvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cssW = dioramaCanvas.clientWidth || 320;
    const cssH = dioramaCanvas.clientHeight || 200;
    const targetW = Math.max(1, Math.floor(cssW * dpr));
    const targetH = Math.max(1, Math.floor(cssH * dpr));
    if (dioramaCanvas.width !== targetW)  dioramaCanvas.width  = targetW;
    if (dioramaCanvas.height !== targetH) dioramaCanvas.height = targetH;
  }

  function drawDiorama() {
    if (!dioramaCanvas || !dioramaCtx) return;
    sizeDioramaCanvas();
    const ctx = dioramaCtx;
    const W = dioramaCanvas.width;
    const H = dioramaCanvas.height;
    const t = (performance.now() - dioramaStartMs) / 1000;

    // Sky / forest backdrop
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.55);
    sky.addColorStop(0,  '#0a1004');
    sky.addColorStop(1,  '#1c2c12');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Distant tree silhouettes
    ctx.fillStyle = '#091308';
    const treeCount = 14;
    for (let i = 0; i < treeCount; i++) {
      const x = (i + 0.5) * (W / treeCount);
      const baseY = H * 0.55;
      const trH = H * (0.18 + 0.06 * Math.sin(i * 1.3));
      ctx.beginPath();
      ctx.moveTo(x - W * 0.04, baseY);
      ctx.lineTo(x,             baseY - trH);
      ctx.lineTo(x + W * 0.04, baseY);
      ctx.closePath();
      ctx.fill();
    }

    // Ground (clearing)
    const ground = ctx.createLinearGradient(0, H * 0.5, 0, H);
    ground.addColorStop(0, '#3a6020');
    ground.addColorStop(1, '#244010');
    ctx.fillStyle = ground;
    ctx.fillRect(0, H * 0.5, W, H * 0.5);

    // Lit center clearing
    const clearing = ctx.createRadialGradient(W * 0.5, H * 0.78, W * 0.05, W * 0.5, H * 0.78, W * 0.42);
    clearing.addColorStop(0, 'rgba(140,180,80,0.45)');
    clearing.addColorStop(1, 'rgba(140,180,80,0)');
    ctx.fillStyle = clearing;
    ctx.fillRect(0, 0, W, H);

    // Pull unlocked buildings from state — only draw what the player owns
    const buildings = WG.State.get().forge.buildings;
    const cave     = buildings.find(b => b.id === 'cave'     && b.unlocked);
    const pagoda   = buildings.find(b => b.id === 'forge'    && b.unlocked);
    const campfire = buildings.find(b => b.id === 'campfire' && b.unlocked);

    if (cave)     drawCave(ctx, W * 0.22, H * 0.55, W * 0.22, cave.level);
    if (pagoda)   drawPagoda(ctx, W * 0.50, H * 0.50, W * 0.20, pagoda.level);
    if (campfire) drawCampfire(ctx, W * 0.78, H * 0.78, W * 0.10, campfire.level, t);
  }

  function drawCave(ctx, cx, cy, sz, level) {
    // Dark mound with cave mouth — gets bigger with level
    const s = sz * (0.85 + 0.04 * level);
    ctx.fillStyle = '#3a3028';
    ctx.beginPath();
    ctx.moveTo(cx - s, cy + s * 0.55);
    ctx.quadraticCurveTo(cx - s * 0.6, cy - s * 0.5, cx, cy - s * 0.6);
    ctx.quadraticCurveTo(cx + s * 0.6, cy - s * 0.5, cx + s, cy + s * 0.55);
    ctx.closePath();
    ctx.fill();
    // Cave mouth
    ctx.fillStyle = '#0a0604';
    ctx.beginPath();
    ctx.ellipse(cx, cy + s * 0.25, s * 0.32, s * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPagoda(ctx, cx, cy, sz, level) {
    // Tiered red roof + body — tiers grow with level
    const tiers = Math.min(4, 1 + Math.floor((level - 1) / 2));
    const wallH = sz * 0.7;
    const wallW = sz * 1.1;
    // Walls
    ctx.fillStyle = '#5a3820';
    ctx.fillRect(cx - wallW * 0.5, cy, wallW, wallH);
    // Door
    ctx.fillStyle = '#1a0e06';
    ctx.fillRect(cx - sz * 0.18, cy + wallH * 0.45, sz * 0.36, wallH * 0.55);
    // Roofs (stacked)
    for (let i = 0; i < tiers; i++) {
      const rW = wallW * (1.4 - i * 0.18);
      const ry = cy - i * sz * 0.32;
      ctx.fillStyle = i === 0 ? '#9c2818' : '#7a2010';
      ctx.beginPath();
      ctx.moveTo(cx - rW * 0.5, ry);
      ctx.lineTo(cx + rW * 0.5, ry);
      ctx.lineTo(cx + rW * 0.42, ry - sz * 0.18);
      ctx.lineTo(cx - rW * 0.42, ry - sz * 0.18);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawCampfire(ctx, cx, cy, sz, level, t) {
    // Logs
    ctx.fillStyle = '#3a2010';
    ctx.fillRect(cx - sz, cy + sz * 0.2, sz * 2, sz * 0.3);
    ctx.fillStyle = '#2a1808';
    ctx.fillRect(cx - sz * 0.9, cy + sz * 0.05, sz * 1.8, sz * 0.2);
    // Flame — two-frequency flicker, scales with level
    const flickA = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * DIORAMA_FLICKER_HZ_PRIMARY);
    const flickB = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * DIORAMA_FLICKER_HZ_OVERTONE);
    const flameH = sz * (1.0 + 0.18 * level + 0.12 * flickA + 0.06 * flickB);
    const flameW = sz * 0.85;
    const fg = ctx.createRadialGradient(cx, cy - flameH * 0.3, sz * 0.2, cx, cy - flameH * 0.3, flameH);
    fg.addColorStop(0,    'rgba(255,220,120,0.95)');
    fg.addColorStop(0.5,  'rgba(255,140,40,0.7)');
    fg.addColorStop(1,    'rgba(120,30,10,0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.ellipse(cx, cy - flameH * 0.4, flameW, flameH * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    // Hot core
    ctx.fillStyle = 'rgba(255,250,200,0.85)';
    ctx.beginPath();
    ctx.ellipse(cx, cy - flameH * 0.25, flameW * 0.35, flameH * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function startDioramaLoop() {
    if (dioramaRAF) return;
    dioramaStartMs = performance.now();
    const tick = () => {
      // Only animate while Forge tab is active and canvas is in DOM
      if (!dioramaCanvas || !dioramaCanvas.isConnected || WG.State.get().activeTab !== 'forge') {
        dioramaRAF = 0;
        return;
      }
      drawDiorama();
      dioramaRAF = requestAnimationFrame(tick);
    };
    dioramaRAF = requestAnimationFrame(tick);
  }
  function stopDioramaLoop() {
    if (dioramaRAF) cancelAnimationFrame(dioramaRAF);
    dioramaRAF = 0;
  }

  // ---------- main render ----------
  function refresh() {
    const root = getRoot(); root.innerHTML = '';
    const scroll = el('div', { class:'scroll' }); root.appendChild(scroll);
    scroll.appendChild(el('h2', null, 'Buildings'));

    // Diorama
    scroll.appendChild(makeDiorama());

    // Power readout in red/orange (per scr_02)
    const power = WG.State.recomputePower();
    const pwrBox = el('div', {
      style:'text-align:center;margin:-2px 0 10px 0;font-size:18px;font-weight:700;' +
            'color:#ff8838;letter-spacing:1px;text-shadow:0 0 12px rgba(255,140,60,0.6);'
    }, 'Power: ' + power);
    scroll.appendChild(pwrBox);

    // Daily Chest icon row + 4×2 grid
    scroll.appendChild(makeBuildingsSection());

    // Anvil station (center-bottom)
    scroll.appendChild(makeAnvilSection());

    if (WG.Game && WG.Game.syncTopStrip) WG.Game.syncTopStrip();

    startDioramaLoop();
  }

  function makeBuildingsSection() {
    const box = el('div', { class:'scene-row', style:'gap:6px;' });

    // Daily Chest with 7-day streak strip
    box.appendChild(makeDailyChestRow());

    // 4×2 grid
    const grid = el('div', { style:
      'display:grid;grid-template-columns:repeat(4,1fr);gap:6px;width:100%;'
    });
    for (const b of WG.State.get().forge.buildings) {
      grid.appendChild(makeBuildingTile(b));
    }
    box.appendChild(grid);
    return box;
  }

  function makeBuildingTile(b) {
    const def = WG.ForgeBuildings.get(b.id);
    const tile = el('div', {
      class:'card-tile' + (!b.unlocked ? ' locked' : ''),
      style:'cursor:pointer;',
      onclick: () => {
        if (!b.unlocked) { showLockedSlotModal(b); }
        else            { showBuildingDetailModal(b); }
      },
    });
    tile.appendChild(el('div', { class:'icon-box' }, def.icon || '?'));
    tile.appendChild(el('div', { class:'name' }, def.name));
    tile.appendChild(el('div', { class:'level' }, b.unlocked ? 'Lv.' + b.level : 'LOCKED'));
    return tile;
  }

  function makeAnvilSection() {
    const row = el('div', { class:'scene-row', style:
      'background:radial-gradient(ellipse at center,#3a2a18 0%,#1a1006 70%);padding:18px 12px;'
    });
    // Anvil glyph centered on a stone-platform shape
    const platform = el('div', { style:
      'width:140px;height:24px;margin:6px auto 0 auto;border-radius:50%;' +
      'background:radial-gradient(ellipse at center,#5a4828 0%,#1a1006 70%);'
    });
    row.appendChild(platform);
    const anvil = el('div', {
      style:'font-size:52px;text-align:center;line-height:1;margin-top:-32px;cursor:pointer;transition:transform 80ms;',
      onclick: () => {
        anvil.style.transform = 'scale(0.92)';
        setTimeout(() => anvil.style.transform = 'scale(1)', 90);
        showCraftingModal();
      },
    }, '⚒');
    row.appendChild(anvil);

    // Craft x10 primary button + Probability Info side button
    const btnRow = el('div', { class:'modal-btn-row', style:'margin-top:10px;' });
    const s = WG.State.get();
    btnRow.appendChild(el('button', {
      class:'btn primary',
      onclick: () => showCraftingModal(),
    }, 'Craft × 10  ✦ ' + s.forge.craftFragments));
    btnRow.appendChild(el('button', {
      class:'btn',
      onclick: () => showProbabilityInfo(),
    }, 'ⓘ Odds'));
    row.appendChild(btnRow);
    return row;
  }

  // ---------- daily chest with 7-day streak strip ----------
  function makeDailyChestRow() {
    const dailyAvail = WG.ForgeDaily.isAvailable();
    const nextDay = WG.ForgeDaily.nextStreakDay();
    const rewards = WG.ForgeDaily.streakRewards();

    const wrap = el('div', { style:
      'width:100%;background:linear-gradient(to bottom,#241608,#140a04);' +
      'border:1px solid #4a3018;border-radius:6px;padding:8px;' +
      'display:flex;align-items:center;gap:10px;'
    });

    // Chest button on the left
    const chestBtn = el('div', {
      style:'flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;' +
            'padding:6px 8px;border-radius:6px;background:rgba(0,0,0,0.3);transition:transform 80ms;' +
            (dailyAvail ? 'box-shadow:0 0 14px rgba(255,180,40,0.5);' : 'opacity:0.55;'),
      onclick: () => {
        chestBtn.style.transform = 'scale(0.92)';
        setTimeout(() => chestBtn.style.transform = 'scale(1)', 90);
        if (!dailyAvail) { toast(hoursUntil(WG.ForgeDaily.timeUntil()) + 'h until next chest'); return; }
        const r = WG.ForgeDaily.tryClaim();
        if (r.ok) {
          showRewardModal(r.reward, 'Daily Chest — Day ' + r.reward.day);
          refresh();
        }
      },
    });
    chestBtn.appendChild(el('div', { style:'font-size:24px;line-height:1;' }, '🎁'));
    chestBtn.appendChild(el('div', { style:'font-size:9px;color:#f0d890;letter-spacing:1px;' }, 'DAILY'));
    chestBtn.appendChild(el('div', { style:'font-size:9px;color:#a89878;' },
      dailyAvail ? 'CLAIM' : hoursUntil(WG.ForgeDaily.timeUntil()) + 'h'));
    wrap.appendChild(chestBtn);

    // 7-day streak pip strip
    const strip = el('div', { style:'flex:1;display:grid;grid-template-columns:repeat(7,1fr);gap:3px;' });
    for (let i = 1; i <= 7; i++) {
      const def = rewards[i - 1];
      const isCurrent = (i === nextDay) && dailyAvail;
      const isClaimed = (WG.State.get().forge.dailyStreakDay >= i) &&
                       (WG.State.get().forge.dailyStreakDay < 7 || !dailyAvail);
      const pip = el('div', { style:
        'background:' + (isCurrent ? 'linear-gradient(to bottom,#806020,#5a3c0a)' :
                         isClaimed ? '#2a3818' : '#1a1408') + ';' +
        'border:1px solid ' + (isCurrent ? '#ffd870' : isClaimed ? '#4a6a28' : '#3a2818') + ';' +
        'border-radius:4px;padding:4px 2px;text-align:center;' +
        (isCurrent ? 'box-shadow:0 0 8px rgba(255,216,112,0.7);' : '')
      });
      pip.appendChild(el('div', { style:'font-size:8px;color:#a89878;letter-spacing:1px;' }, 'DAY ' + i));
      pip.appendChild(el('div', { style:'font-size:11px;color:' + (isCurrent ? '#fff0c8' : isClaimed ? '#80a060' : '#7a6848') + ';' },
        i === 7 ? '★' : '🪙'));
      pip.appendChild(el('div', { style:'font-size:8px;color:' + (isCurrent ? '#fff0c8' : '#7a6848') + ';' },
        i === 7 ? def.diamonds + '💎' : '' + def.coins));
      strip.appendChild(pip);
    }
    wrap.appendChild(strip);
    return wrap;
  }

  // ---------- modals ----------
  function showBuildingDetailModal(b) {
    const def = WG.ForgeBuildings.get(b.id);
    const wrap = el('div', { class:'modal-overlay show' });
    const card = el('div', { class:'modal-card', style:'max-width:320px;' });
    card.appendChild(el('div', { class:'modal-title' }, def.name + ' · Lv.' + b.level));
    card.appendChild(el('div', { class:'modal-body' }, def.desc || ''));

    // Upgrade ladder: current → +5 levels (capped at 10)
    const ladder = el('div', { style:'font-size:11px;color:#c8a868;' });
    ladder.appendChild(el('div', { style:'color:#f0d890;margin-bottom:4px;letter-spacing:1px;' }, 'UPGRADE LADDER'));
    for (let i = 0; i < 5 && b.level + i < 10; i++) {
      const peek = { id: b.id, level: b.level + i };
      const cost = WG.ForgeBuildings.upgradeCost(peek);
      const benefit = (def.baseGen ? '+' + (def.baseGen * (b.level + i + 1)).toFixed(1) + ' coins/s' : tierBenefit(def, b.level + i + 1));
      const isNext = i === 0;
      ladder.appendChild(el('div', {
        style:'display:flex;justify-content:space-between;padding:3px 0;' +
              (isNext ? 'color:#fff0c8;font-weight:600;' : ''),
      }, 'Lv.' + (b.level + i + 1) + '  →  ' + benefit, el('span', null, '🪙 ' + cost)));
    }
    if (b.level >= 10) ladder.appendChild(el('div', { style:'margin-top:6px;' }, 'MAX LEVEL'));
    card.appendChild(ladder);

    const btnRow = el('div', { class:'modal-btn-row', style:'margin-top:12px;' });
    if (b.level < 10) {
      const cost = WG.ForgeBuildings.upgradeCost(b);
      btnRow.appendChild(el('button', {
        class:'btn primary',
        onclick: () => {
          const r = WG.ForgeBuildings.tryUpgrade(b.id);
          if (r.ok) { wrap.remove(); refresh(); }
          else      { toast('Need ' + cost + ' 🪙'); }
        },
      }, 'Upgrade  🪙 ' + cost));
    }
    btnRow.appendChild(el('button', { class:'btn', onclick: () => wrap.remove() }, 'Close'));
    card.appendChild(btnRow);
    wrap.appendChild(card);
    modalRoot().appendChild(wrap);
  }

  function tierBenefit(def, level) {
    // Plain-English benefit strings per building type
    if (def.name === 'Cave')     return '+' + (0.6 * level).toFixed(1) + ' coins/s';
    if (def.name === 'Forge')    return 'better craft odds';
    if (def.name === 'Campfire') return '+ HP regen in Hunt';
    if (def.name === 'Fence')    return '+ defense bonus';
    if (def.name === 'Cannon')   return 'unlock ranged tier 2';
    if (def.name === 'Anvil')    return 'unlock melee tier 2';
    if (def.name === 'Range')    return 'unlock ranged tier 3';
    if (def.name === 'Trap')     return '+ crit bonus';
    return '+ Power';
  }

  // Locked-slot unlock-flow modal: standard cost / Pay 200💎 bypass / Watch Ad.
  function showLockedSlotModal(b) {
    const def = WG.ForgeBuildings.get(b.id);
    const power = WG.State.recomputePower();
    const gsMet = power >= (def.unlockGS || 0);
    const cost = def.unlockCost || {};
    const costStr = Object.entries(cost).map(([k,v])=>v+(k==='coins'?'🪙':k==='diamonds'?'💎':'🎴')).filter(s=>!s.startsWith('0')).join(' ') || 'free';

    const wrap = el('div', { class:'modal-overlay show' });
    const card = el('div', { class:'modal-card', style:'max-width:320px;' });
    card.appendChild(el('div', { class:'modal-title' }, 'Unlock ' + def.name));
    card.appendChild(el('div', { class:'modal-body', style:'text-align:center;' }, def.desc || ''));

    // GS gate readout (orange when not met)
    const gsLine = el('div', { style:
      'text-align:center;font-size:13px;margin-bottom:10px;font-weight:600;' +
      (gsMet ? 'color:#80c040;' : 'color:#ff8838;')
    }, gsMet ? '✓ Power ' + (def.unlockGS || 0) + ' reached' : 'Unlock at Power ' + (def.unlockGS || 0) + '  (you: ' + power + ')');
    card.appendChild(gsLine);

    const btnRow = el('div', { class:'modal-btn-row', style:'flex-direction:column;align-items:stretch;gap:6px;' });

    // Standard unlock (only available if GS gate met)
    if (gsMet) {
      btnRow.appendChild(el('button', {
        class:'btn primary',
        onclick: () => {
          const r = WG.ForgeBuildings.tryUnlock(b.id);
          if (r.ok) { wrap.remove(); refresh(); toast(def.name + ' unlocked!'); }
          else      { toast(r.reason === 'gs-gate' ? 'Power too low' : 'Insufficient'); }
        },
      }, 'Unlock  ' + costStr));
    }

    // Watch Ad bypass (placeholder ad if no SDK; real AdMob in Phase 4)
    if (WG.ForgeBuildings.AD_REWARD_AVAILABLE && WG.Ads) {
      btnRow.appendChild(el('button', {
        class:'btn',
        onclick: async () => {
          const r = await WG.ForgeBuildings.tryUnlockByAd(b.id);
          if (r && r.ok) { wrap.remove(); refresh(); toast(def.name + ' unlocked via ad!'); }
          else if (r && r.reason === 'capped') { toast('Daily ad cap reached'); }
          else { toast('Ad skipped'); }
        },
      }, '▶ Watch Ad to Unlock'));
    }

    // Pay diamonds bypass
    const dCost = WG.ForgeBuildings.DIAMOND_BYPASS_COST;
    btnRow.appendChild(el('button', {
      class:'btn',
      onclick: () => {
        const r = WG.ForgeBuildings.tryUnlockByDiamonds(b.id);
        if (r.ok) { wrap.remove(); refresh(); toast(def.name + ' unlocked!'); }
        else      { toast('Need ' + dCost + ' 💎'); }
      },
    }, 'Pay ' + dCost + ' 💎'));

    btnRow.appendChild(el('button', { class:'btn', onclick: () => wrap.remove() }, 'Cancel'));
    card.appendChild(btnRow);
    wrap.appendChild(card);
    modalRoot().appendChild(wrap);
  }

  // Polished crafting modal — Craft x10 + Probability Info + material display.
  function showCraftingModal() {
    const s = WG.State.get();
    const wrap = el('div', { class:'modal-overlay show' });
    const card = el('div', { class:'modal-card', style:'max-width:340px;' });
    card.appendChild(el('div', { class:'modal-title' }, 'FORGE — Craft Relics'));

    // Cost line
    const costPerBatch = 30;
    const cost = el('div', { class:'modal-body', style:'text-align:center;' });
    cost.appendChild(el('div', { style:'font-size:12px;color:#a89878;margin-bottom:4px;' },
      '10 fragments → 1 relic each (×10)'));
    cost.appendChild(el('div', { style:'font-size:14px;color:#f0d890;font-weight:600;' },
      '✦ ' + s.forge.craftFragments + ' fragments  ·  Daily ' + s.forge.craftDailyUsed + '/' + s.forge.craftDailyMax));
    if (s.forge.craftFragments < costPerBatch) {
      cost.appendChild(el('div', { style:'font-size:11px;color:#ff8838;margin-top:4px;' },
        'Need ' + (costPerBatch - s.forge.craftFragments) + ' more fragments'));
    }
    card.appendChild(cost);

    const btnRow = el('div', { class:'modal-btn-row', style:'flex-direction:column;align-items:stretch;gap:6px;' });
    const craftBtn = el('button', {
      class:'btn primary',
      style:'font-size:14px;padding:12px;',
      onclick: () => {
        craftBtn.style.transform = 'scale(0.96)';
        setTimeout(() => craftBtn.style.transform = '', 90);
        const r = WG.ForgeCraft.craftBatch(10);
        if (!r.ok) {
          toast(r.reason === 'daily-cap' ? 'Daily craft cap reached' : 'Need ' + costPerBatch + ' fragments');
          return;
        }
        wrap.remove();
        showCraftResults(r.drops);
        refresh();
      },
    }, 'Craft × 10  (✦ ' + costPerBatch + ')');
    if (s.forge.craftFragments < costPerBatch || s.forge.craftDailyUsed >= s.forge.craftDailyMax) {
      craftBtn.disabled = true;
    }
    btnRow.appendChild(craftBtn);
    btnRow.appendChild(el('button', {
      class:'btn',
      onclick: () => showProbabilityInfo(),
    }, 'ⓘ Probability Info'));
    btnRow.appendChild(el('button', { class:'btn', onclick: () => wrap.remove() }, 'Close'));
    card.appendChild(btnRow);
    wrap.appendChild(card);
    modalRoot().appendChild(wrap);
  }

  function showCraftResults(drops) {
    const wrap = el('div', { class:'modal-overlay show' });
    const tierColor = { common:'#a89878', rare:'#80a0e0', epic:'#c080e0', legendary:'#e8c060', mythic:'#e08080' };
    let html = '<div class="modal-card" style="max-width:340px;"><div class="modal-title">Craft Results</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:4px;max-height:240px;overflow-y:auto;">';
    for (const d of drops) {
      html += `<div style="background:${tierColor[d.tier]||'#666'}33;border:1px solid ${tierColor[d.tier]||'#666'};border-radius:4px;padding:4px;text-align:center;font-size:9px;">
        <div style="font-size:18px;">${d.icon||'✦'}</div>
        <div style="color:${tierColor[d.tier]||'#fff'};">${d.name}</div>
      </div>`;
    }
    html += '</div><div class="modal-btn-row" style="margin-top:12px;"><button class="btn primary">OK</button></div></div>';
    wrap.innerHTML = html;
    modalRoot().appendChild(wrap);
    wrap.querySelector('.btn').addEventListener('click', () => wrap.remove());
  }

  function showProbabilityInfo() {
    const wrap = el('div', { class:'modal-overlay show' });
    const probs = WG.ForgeCraft.probabilityInfo();
    let html = '<div class="modal-card"><div class="modal-title">Drop Odds</div><div class="modal-body">';
    for (const p of probs) html += `<div style="display:flex;justify-content:space-between;padding:4px 0;"><span>${cap(p.tier)}</span><span>${p.pct}%</span></div>`;
    html += '</div><div class="modal-btn-row"><button class="btn primary">OK</button></div></div>';
    wrap.innerHTML = html;
    modalRoot().appendChild(wrap);
    wrap.querySelector('.btn').addEventListener('click', () => wrap.remove());
  }

  // Reward modal with count-up animation (~700ms ease-out).
  function showRewardModal(r, title) {
    const wrap = el('div', { class:'modal-overlay show' });
    const card = el('div', { class:'modal-card', style:'max-width:280px;' });
    card.appendChild(el('div', { class:'modal-title' }, title));

    const body = el('div', { class:'modal-body', style:'text-align:center;font-size:18px;line-height:1.7;' });
    const rows = [
      { glyph:'🪙', target: r.coins || 0 },
      { glyph:'💎', target: r.diamonds || 0 },
      { glyph:'🎴', target: r.cards || 0 },
      { glyph:'✦', target: r.fragments || 0 },
    ];
    const spans = rows.map(rw => {
      const line = el('div', { style:'display:flex;justify-content:center;gap:10px;' });
      line.appendChild(el('span', null, rw.glyph));
      const num = el('span', { style:'min-width:48px;text-align:left;color:#ffd870;font-weight:700;' }, '0');
      line.appendChild(num);
      body.appendChild(line);
      return num;
    });
    if (r.rareRelic) {
      body.appendChild(el('div', {
        style:'margin-top:8px;padding:6px;border:1px solid #80a0e0;border-radius:6px;background:rgba(128,160,224,0.1);font-size:13px;'
      }, 'Bonus Rare relic: ' + (r.rareRelic.icon || '✦') + ' ' + r.rareRelic.name));
    }
    card.appendChild(body);

    // Count-up animation
    const t0 = performance.now();
    const DUR = 700;
    function step() {
      const t = (performance.now() - t0) / DUR;
      const e = t >= 1 ? 1 : 1 - Math.pow(1 - t, 3);  // ease-out cubic
      for (let i = 0; i < rows.length; i++) {
        spans[i].textContent = '' + Math.round(rows[i].target * e);
      }
      if (t < 1 && wrap.isConnected) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);

    const btnRow = el('div', { class:'modal-btn-row' });
    btnRow.appendChild(el('button', {
      class:'btn primary',
      onclick: () => wrap.remove(),
    }, 'CLAIM'));
    card.appendChild(btnRow);
    wrap.appendChild(card);
    modalRoot().appendChild(wrap);
  }

  function toast(msg) {
    const t = el('div', { style:
      'position:fixed;left:50%;bottom:120px;transform:translateX(-50%);background:rgba(80,20,10,0.9);' +
      'color:#fff;padding:8px 16px;border-radius:6px;font-size:12px;z-index:500;'
    }, msg);
    modalRoot().appendChild(t);
    setTimeout(() => t.remove(), 1500);
  }

  function hoursUntil(ms) { return Math.max(1, Math.ceil(ms / (60*60*1000))); }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  function init() {
    WG.Engine.on('tab:change', ({ tab }) => {
      if (tab === 'forge') refresh();
      else                 stopDioramaLoop();
    });
    WG.Engine.on('currency:change', () => { if (WG.State.get().activeTab === 'forge') refresh(); });
    WG.Engine.on('forge:upgrade', () => { if (WG.State.get().activeTab === 'forge') refresh(); });
  }

  // Public API. The `_show*` hooks let Concern B override modal behaviors
  // without rewriting the render module.
  window.WG.ForgeRender = {
    init, refresh,
    // overridable hooks (Concern B):
    _showCraftingModal: null,
    _showLockedSlotModal: null,
    // helpers Concern B reuses:
    _modalRoot: modalRoot,
    _toast: toast,
    _showRewardModal: showRewardModal,
    _showCraftResults: showCraftResults,
    _showProbabilityInfo: showProbabilityInfo,
  };
})();
