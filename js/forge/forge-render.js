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

  // Deterministic pseudo-noise — same index always yields same value.
  // Identical to wg-game.js _hash; defined locally because IIFEs don't share scope.
  function _hash(i) { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); }

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

    // Sky — forest_summer BIOME_PALETTE sky (#1a3a1c) with paper-texture stipple
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.55);
    sky.addColorStop(0,    '#0c1a0a');
    sky.addColorStop(0.55, '#162c10');
    sky.addColorStop(1,    '#1a3a1c');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    // Paper-texture stipple on sky (ink-speckle feel)
    ctx.fillStyle = 'rgba(168,216,120,0.045)';
    for (let i = 0; i < 80; i++) {
      ctx.fillRect(_hash(i + 700) * W, _hash(i + 701) * H * 0.50, 1, 1);
    }

    // Mist band — horizontal drift at mid-horizon
    ctx.fillStyle = 'rgba(148,196,120,0.07)';
    for (let my = H * 0.40; my < H * 0.54; my += 3) ctx.fillRect(0, my, W, 1.5);

    // Distant pagoda silhouette on right horizon (matches paintBiome_forest_summer)
    const pagX = W * 0.72, pagY = H * 0.50;
    ctx.fillStyle = '#04100a';
    ctx.beginPath();
    ctx.moveTo(pagX - 18, pagY);    ctx.lineTo(pagX + 18, pagY);
    ctx.lineTo(pagX + 14, pagY - 9); ctx.lineTo(pagX + 20, pagY - 9);
    ctx.lineTo(pagX, pagY - 22);     ctx.lineTo(pagX - 20, pagY - 9);
    ctx.lineTo(pagX - 14, pagY - 9); ctx.closePath();
    ctx.fill();
    ctx.fillRect(pagX - 9, pagY, 18, H * 0.07);

    // Distant tree silhouettes — silhouette color from BIOME_PALETTE (#082010)
    ctx.fillStyle = '#082010';
    const treeCount = 12;
    for (let i = 0; i < treeCount; i++) {
      const x = (i + 0.5) * (W / treeCount);
      const baseY = H * 0.53;
      const trH = H * (0.16 + 0.05 * Math.sin(i * 1.3));
      ctx.beginPath();
      ctx.moveTo(x - W * 0.035, baseY);
      ctx.lineTo(x,              baseY - trH);
      ctx.lineTo(x + W * 0.035, baseY);
      ctx.closePath();
      ctx.fill();
    }

    // Ground — forest_summer BIOME_PALETTE floor (#2a5028) with grass-tuft stipple
    const ground = ctx.createLinearGradient(0, H * 0.50, 0, H);
    ground.addColorStop(0, '#2a5028');
    ground.addColorStop(1, '#183418');
    ctx.fillStyle = ground;
    ctx.fillRect(0, H * 0.50, W, H * 0.50);
    // Grass-tuft stipple (matches paintBiome_forest_summer floor stipple exactly)
    ctx.fillStyle = 'rgba(168,216,120,0.22)';
    for (let i = 0; i < 100; i++) {
      ctx.fillRect(_hash(i + 800) * W, H * 0.50 + _hash(i + 801) * H * 0.50, 1, 2);
    }

    // Lit center clearing (campfire warmth, kept from original)
    const clearing = ctx.createRadialGradient(W * 0.5, H * 0.78, W * 0.05, W * 0.5, H * 0.78, W * 0.42);
    clearing.addColorStop(0, 'rgba(140,180,80,0.40)');
    clearing.addColorStop(1, 'rgba(140,180,80,0)');
    ctx.fillStyle = clearing;
    ctx.fillRect(0, 0, W, H);

    // Pull unlocked buildings from state — only draw what the player owns
    const buildings = WG.State.get().forge.buildings;
    const cave     = buildings.find(b => b.id === 'gold_mine' && b.unlocked);
    const pagoda   = buildings.find(b => b.id === 'forge'     && b.unlocked);
    const campfire = buildings.find(b => b.id === 'campfire'  && b.unlocked);

    if (cave)     drawTent(ctx, W * 0.22, H * 0.55, W * 0.22, cave.level, t);
    if (pagoda)   drawHouse(ctx, W * 0.50, H * 0.50, W * 0.20, pagoda.level);
    if (campfire) drawCampfire(ctx, W * 0.78, H * 0.78, W * 0.10, campfire.level, t);
  }

  // Ukiyo-e folk tent / yurt — conical canvas with rope flap, ink outline, stipple texture.
  // Replaces the flat dark-gray dome of the original drawCave.
  function drawTent(ctx, cx, cy, sz, level, t) {
    const s = sz * (0.85 + 0.04 * Math.min(level, 10));
    const tentH = s * 1.8;
    const tentW = s * 1.2;
    const baseY = cy;

    // --- tent body: conical with slight side curvature (quadratic) ---
    ctx.beginPath();
    ctx.moveTo(cx - tentW * 0.5, baseY);
    ctx.quadraticCurveTo(cx - tentW * 0.56, baseY - tentH * 0.44, cx, baseY - tentH);
    ctx.quadraticCurveTo(cx + tentW * 0.56, baseY - tentH * 0.44, cx + tentW * 0.5, baseY);
    ctx.closePath();
    const bodyGrad = ctx.createLinearGradient(cx - tentW * 0.5, baseY, cx, baseY - tentH);
    bodyGrad.addColorStop(0, '#b8ac82');
    bodyGrad.addColorStop(0.55, '#d0c498');
    bodyGrad.addColorStop(1,  '#a49870');
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // --- paper-texture stipple on canvas body ---
    ctx.fillStyle = 'rgba(72,50,22,0.11)';
    for (let i = 0; i < 55; i++) {
      const tx = cx + (_hash(i + 300) - 0.5) * tentW * 0.86;
      const ty = baseY - _hash(i + 301) * tentH * 0.88;
      const prog = (baseY - ty) / tentH;
      if (Math.abs(tx - cx) < tentW * 0.5 * (1 - prog) * 1.02) ctx.fillRect(tx, ty, 1, 1);
    }

    // --- panel seam lines (canvas sections) ---
    ctx.strokeStyle = 'rgba(55,38,16,0.28)';
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    ctx.moveTo(cx - tentW * 0.27, baseY);
    ctx.quadraticCurveTo(cx - tentW * 0.15, baseY - tentH * 0.58, cx, baseY - tentH);
    ctx.moveTo(cx + tentW * 0.27, baseY);
    ctx.quadraticCurveTo(cx + tentW * 0.15, baseY - tentH * 0.58, cx, baseY - tentH);
    ctx.stroke();

    // --- ink-line outline ---
    ctx.strokeStyle = '#1a120a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - tentW * 0.5, baseY);
    ctx.quadraticCurveTo(cx - tentW * 0.56, baseY - tentH * 0.44, cx, baseY - tentH);
    ctx.quadraticCurveTo(cx + tentW * 0.56, baseY - tentH * 0.44, cx + tentW * 0.5, baseY);
    ctx.stroke();

    // --- rope-tied flap entrance ---
    const flapW = tentW * 0.24;
    const flapH = tentH * 0.27;
    ctx.fillStyle = '#160c04';
    ctx.beginPath();
    ctx.moveTo(cx - flapW * 0.5, baseY);
    ctx.lineTo(cx + flapW * 0.5, baseY);
    ctx.lineTo(cx + flapW * 0.24, baseY - flapH);
    ctx.lineTo(cx - flapW * 0.24, baseY - flapH);
    ctx.closePath();
    ctx.fill();
    // rope accent across flap
    ctx.strokeStyle = '#5a3418';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - flapW * 0.5, baseY - flapH * 0.48);
    ctx.lineTo(cx + flapW * 0.5, baseY - flapH * 0.48);
    ctx.stroke();

    // --- wood pole at peak ---
    ctx.strokeStyle = '#2a1a0c';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, baseY - tentH);
    ctx.lineTo(cx, baseY - tentH - s * 0.22);
    ctx.stroke();
    // small flag
    ctx.fillStyle = '#7a3818';
    ctx.beginPath();
    ctx.moveTo(cx, baseY - tentH - s * 0.22);
    ctx.lineTo(cx + s * 0.09, baseY - tentH - s * 0.15);
    ctx.lineTo(cx, baseY - tentH - s * 0.09);
    ctx.closePath();
    ctx.fill();

    // --- smoke wisps drifting from peak hole ---
    for (let i = 0; i < 3; i++) {
      const seed = _hash(i + 360);
      const period = s * 0.65;
      const rise = ((seed * period + t * (9 + seed * 4)) % period);
      const wx = cx + (seed - 0.5) * s * 0.12 + Math.sin(t * 1.4 + i) * s * 0.07;
      const wy = baseY - tentH - rise;
      const alpha = 0.15 * (1 - rise / period);
      const wg = ctx.createRadialGradient(wx, wy, 0, wx, wy, 4 + i * 2.2);
      wg.addColorStop(0, `rgba(170,162,148,${alpha})`);
      wg.addColorStop(1, 'rgba(170,162,148,0)');
      ctx.fillStyle = wg;
      ctx.beginPath();
      ctx.arc(wx, wy, 4 + i * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Ukiyo-e folk house / minka — wooden lattice walls, curved tile roof, stone foundation.
  // Replaces the flat brown box with red-square roof of the original drawPagoda.
  function drawHouse(ctx, cx, cy, sz, level) {
    const s = sz * (0.85 + 0.04 * Math.min(level, 10));
    const wallH = s * 0.80;
    const wallW = s * 1.15;
    const tiers  = Math.min(3, 1 + Math.floor((level - 1) / 3));
    const baseY  = cy + wallH;

    // --- stone foundation row ---
    ctx.fillStyle = '#38302a';
    ctx.fillRect(cx - wallW * 0.56, baseY - s * 0.10, wallW * 1.12, s * 0.12);
    // foundation stipple
    ctx.fillStyle = 'rgba(56,44,32,0.30)';
    for (let i = 0; i < 10; i++) {
      ctx.fillRect(cx - wallW * 0.5 + _hash(i + 400) * wallW, baseY - s * 0.07, 3, 2);
    }

    // --- wooden lattice walls (weathered cedar) ---
    const wallGrad = ctx.createLinearGradient(cx - wallW * 0.5, cy, cx + wallW * 0.5, cy);
    wallGrad.addColorStop(0, '#5c3c20');
    wallGrad.addColorStop(0.5, '#704830');
    wallGrad.addColorStop(1, '#543418');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(cx - wallW * 0.5, cy, wallW, wallH);
    // vertical panel divisions (ink)
    ctx.strokeStyle = 'rgba(24,10,4,0.38)';
    ctx.lineWidth = 0.75;
    const panels = 3 + Math.min(Math.floor(level / 2), 3);
    for (let i = 1; i < panels; i++) {
      const px = cx - wallW * 0.5 + wallW * i / panels;
      ctx.beginPath(); ctx.moveTo(px, cy); ctx.lineTo(px, cy + wallH); ctx.stroke();
    }
    // horizontal mid-band
    ctx.beginPath();
    ctx.moveTo(cx - wallW * 0.5, cy + wallH * 0.50);
    ctx.lineTo(cx + wallW * 0.5, cy + wallH * 0.50);
    ctx.stroke();
    // wall stipple
    ctx.fillStyle = 'rgba(24,10,4,0.10)';
    for (let i = 0; i < 40; i++) {
      ctx.fillRect(
        cx - wallW * 0.44 + _hash(i + 500) * wallW * 0.88,
        cy + _hash(i + 501) * wallH, 1, 1
      );
    }
    // ink wall outline
    ctx.strokeStyle = '#180904';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - wallW * 0.5, cy, wallW, wallH);

    // --- door alcove with paper-screen suggestion ---
    const dW = wallW * 0.23;
    const dH = wallH * 0.37;
    ctx.fillStyle = '#0c0502';
    ctx.fillRect(cx - dW * 0.5, baseY - dH, dW, dH);
    // faint paper-screen interior
    ctx.fillStyle = 'rgba(216,196,152,0.10)';
    ctx.fillRect(cx - dW * 0.4, baseY - dH + 3, dW * 0.8, dH * 0.82);

    // --- curved minka tile roofs (bottom tier drawn last = on top) ---
    for (let tier = tiers - 1; tier >= 0; tier--) {
      const rW    = wallW * (1.42 - tier * 0.24);
      const rBaseY = cy - tier * s * 0.26;
      const rH    = s * 0.22;

      // muted terracotta fill
      ctx.fillStyle = tier === 0 ? '#783620' : '#683018';
      ctx.beginPath();
      ctx.moveTo(cx - rW * 0.5, rBaseY);
      ctx.lineTo(cx + rW * 0.5, rBaseY);
      // curved eaves — bezier gives subtle upward curl at tips
      ctx.bezierCurveTo(
        cx + rW * 0.42, rBaseY - rH * 0.10,
        cx + rW * 0.28, rBaseY - rH * 0.76,
        cx, rBaseY - rH
      );
      ctx.bezierCurveTo(
        cx - rW * 0.28, rBaseY - rH * 0.76,
        cx - rW * 0.42, rBaseY - rH * 0.10,
        cx - rW * 0.5, rBaseY
      );
      ctx.closePath();
      ctx.fill();
      // ink edge
      ctx.strokeStyle = '#180800';
      ctx.lineWidth = 1;
      ctx.stroke();
      // tile row stipple near eave
      ctx.fillStyle = 'rgba(18,6,2,0.22)';
      const tc = Math.floor(rW / 7);
      for (let j = 0; j < tc; j++) {
        ctx.fillRect(cx - rW * 0.5 + j * 7 + 1, rBaseY - 4, 5, 2);
      }
    }
  }

  // Ukiyo-e folk campfire — stacked ink-outlined logs, stone ring, flickering
  // bezier flame with muted amber palette, ash motes, and smoke wisps.
  function drawCampfire(ctx, cx, cy, sz, level, t) {
    const s = sz * (0.85 + 0.04 * Math.min(level, 10));

    // --- ground ember glow ---
    const glowG = ctx.createRadialGradient(cx, cy, s * 0.06, cx, cy, s * 1.1);
    glowG.addColorStop(0, 'rgba(180,96,28,0.28)');
    glowG.addColorStop(1, 'rgba(180,96,28,0)');
    ctx.fillStyle = glowG;
    ctx.beginPath();
    ctx.ellipse(cx, cy, s * 1.1, s * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- stone ring (8 stones, perspective ellipse) ---
    const stoneShades = ['#484038','#3c3430','#504840','#443c34'];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const sx = cx + Math.cos(angle) * s * 0.54;
      const sy = cy + Math.sin(angle) * s * 0.20;
      ctx.fillStyle = stoneShades[i % stoneShades.length];
      ctx.beginPath();
      ctx.ellipse(sx, sy, 3.5 + _hash(i + 100) * 2.0, 2.2 + _hash(i + 101) * 1.4, angle, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(18,10,4,0.50)';
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }

    // --- stacked log pile ---
    const logBase = cy - s * 0.04;
    // bottom-left log (rotated)
    ctx.save();
    ctx.translate(cx - s * 0.18, logBase + s * 0.12);
    ctx.rotate(-0.45);
    ctx.fillStyle = '#2c1a0a';
    ctx.fillRect(-s * 0.50, -s * 0.09, s * 0.86, s * 0.18);
    ctx.strokeStyle = 'rgba(14,8,2,0.65)';
    ctx.lineWidth = 0.75;
    ctx.strokeRect(-s * 0.50, -s * 0.09, s * 0.86, s * 0.18);
    ctx.restore();
    // bottom-right log (rotated opposite)
    ctx.save();
    ctx.translate(cx + s * 0.18, logBase + s * 0.12);
    ctx.rotate(0.45);
    ctx.fillStyle = '#2c1a0a';
    ctx.fillRect(-s * 0.50, -s * 0.09, s * 0.86, s * 0.18);
    ctx.strokeStyle = 'rgba(14,8,2,0.65)';
    ctx.lineWidth = 0.75;
    ctx.strokeRect(-s * 0.50, -s * 0.09, s * 0.86, s * 0.18);
    ctx.restore();
    // top log (horizontal, ember-dark)
    ctx.fillStyle = '#382010';
    ctx.fillRect(cx - s * 0.45, logBase - s * 0.08, s * 0.90, s * 0.17);
    ctx.strokeStyle = 'rgba(14,8,2,0.62)';
    ctx.lineWidth = 0.75;
    ctx.strokeRect(cx - s * 0.45, logBase - s * 0.08, s * 0.90, s * 0.17);
    // ember blush on top log
    ctx.fillStyle = 'rgba(200,90,24,0.18)';
    ctx.fillRect(cx - s * 0.34, logBase - s * 0.06, s * 0.68, s * 0.06);

    // --- flickering flame (bezier tongue spline) ---
    const flickA = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * DIORAMA_FLICKER_HZ_PRIMARY);
    const flickB = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * DIORAMA_FLICKER_HZ_OVERTONE);
    const flickC = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 3.1 + 0.8);
    const flameH  = s * (1.1 + 0.14 * level + 0.09 * flickA + 0.05 * flickB);
    const flameBase = logBase - s * 0.05;
    const fw = s * 0.46 * (0.9 + flickC * 0.11);
    // outer flame
    const of = ctx.createRadialGradient(
      cx + (flickA - 0.5) * s * 0.07, flameBase - flameH * 0.27, s * 0.08,
      cx, flameBase - flameH * 0.18, flameH * 0.92
    );
    of.addColorStop(0,    'rgba(206,148,48,0.82)');
    of.addColorStop(0.42, 'rgba(176,76,22,0.58)');
    of.addColorStop(1,    'rgba(88,16,6,0)');
    ctx.fillStyle = of;
    ctx.beginPath();
    ctx.moveTo(cx - fw, flameBase);
    ctx.bezierCurveTo(
      cx - fw * 1.09, flameBase - flameH * 0.27,
      cx - fw * 0.36 + (flickB - 0.5) * s * 0.07, flameBase - flameH * 0.73,
      cx + (flickA - 0.5) * s * 0.08, flameBase - flameH
    );
    ctx.bezierCurveTo(
      cx + fw * 0.36 + (flickC - 0.5) * s * 0.06, flameBase - flameH * 0.73,
      cx + fw * 1.09, flameBase - flameH * 0.27,
      cx + fw, flameBase
    );
    ctx.closePath();
    ctx.fill();
    // inner hot core
    const ic = ctx.createRadialGradient(
      cx, flameBase - flameH * 0.22, 0,
      cx, flameBase - flameH * 0.22, flameH * 0.42
    );
    ic.addColorStop(0,    'rgba(250,238,188,0.90)');
    ic.addColorStop(0.45, 'rgba(238,168,66,0.60)');
    ic.addColorStop(1,    'rgba(196,66,14,0)');
    ctx.fillStyle = ic;
    ctx.beginPath();
    ctx.ellipse(cx, flameBase - flameH * 0.22, fw * 0.43, flameH * 0.44, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- ash motes drifting upward ---
    for (let i = 0; i < 7; i++) {
      const seed = _hash(i + 120);
      const period = flameH * 2.2;
      const riseY = (seed * period + t * (15 + seed * 10)) % period;
      const mx = cx + (seed - 0.5) * s * 0.58 + Math.sin(t * 1.4 + i * 1.3) * s * 0.13;
      const my = flameBase - riseY;
      if (my > flameBase - flameH * 1.7 && my < flameBase - s * 0.04) {
        const a = Math.max(0, (1 - riseY / period)) * 0.44;
        ctx.fillStyle = `rgba(206,140,54,${a})`;
        ctx.beginPath();
        ctx.arc(mx, my, 0.8 + seed * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // --- smoke wisps curling upward ---
    for (let i = 0; i < 4; i++) {
      const seed = _hash(i + 140);
      const period = flameH * 2.8;
      const riseY = (seed * period + t * (8 + seed * 5)) % period;
      const wx = cx + (seed - 0.5) * s * 0.48 + Math.sin(t * 0.7 + i * 1.5) * s * 0.18;
      const wy = (flameBase - flameH) - riseY;
      const alpha = Math.max(0, (1 - riseY / period)) * 0.17;
      const wR = 5 + i * 2.8 + riseY * 0.055;
      const wg = ctx.createRadialGradient(wx, wy, 0, wx, wy, wR);
      wg.addColorStop(0, `rgba(152,145,135,${alpha})`);
      wg.addColorStop(1, 'rgba(152,145,135,0)');
      ctx.fillStyle = wg;
      ctx.beginPath();
      ctx.arc(wx, wy, wR, 0, Math.PI * 2);
      ctx.fill();
    }
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

    // Forge crafting station (center-bottom — relic crafting, separate from Anvil building)
    scroll.appendChild(makeForgeStation());

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

  // --- building stat helpers ---

  function _msToHuman(ms) {
    if (ms <= 0) return 'Ready';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (h > 0) return h + 'h ' + m + 'm';
    return m + 'm';
  }

  function _buildingStatLine(b) {
    const f = WG.State.get().forge;
    const lv = b.level;
    const FB = WG.ForgeBuildings;
    switch (b.id) {
      case 'gold_mine': {
        const stored = f.mineStored || 0;
        const capC = FB.capAt(lv);
        const pct = Math.floor(stored / capC * 100);
        return stored + '/' + capC + ' 🪙 (' + pct + '%)';
      }
      case 'forge':
        return FB.craftSlotsAt(lv) + ' craft/day' + (FB.hasGuaranteedEpicAt(lv) ? ' · +Epic' : '');
      case 'campfire':
        return FB.campfireRegenAt(lv) + 'HP/s · r' + FB.campfireRadiusAt(lv);
      case 'anvil': {
        const avail = FB.availableEnchantmentsAt(lv);
        const total = avail.reduce((s, k) => s + (f.enchantmentScrolls[k] || 0), 0);
        const equipped = f.equippedEnchantment && f.equippedEnchantment.type;
        return total + ' scroll' + (total !== 1 ? 's' : '') + (equipped ? ' · ✦ equipped' : '');
      }
      case 'cannon_battery': {
        const shots = f.stocks.cannon_shots.length;
        const capC = FB.shotCapAt(lv);
        return shots + '/' + capC + ' shots';
      }
      case 'bow_range':
        return (f.stocks.archer_squads || 0) + '/1 squad · ' + FB.archerCountAt(lv) + ' archers';
      case 'barracks':
        return (f.stocks.footman_squads || 0) + '/1 squad · ' + FB.footmanCountAt(lv) + ' footmen';
      case 'wall_workshop': {
        const walls = f.stocks.walls.length;
        const capC = FB.wallCountAt(lv);
        return walls + '/' + capC + ' walls';
      }
      default: return '';
    }
  }

  function _buildingRefillLine(b) {
    const f = WG.State.get().forge;
    const now = Date.now();
    const FB = WG.ForgeBuildings;
    switch (b.id) {
      case 'cannon_battery': {
        const cap = FB.shotCapAt(b.level);
        if (f.stocks.cannon_shots.length >= cap) return 'Full';
        const iMs = FB.refillIntervalMs('cannon_battery');
        const last = f.nextRefillAt.cannon_shots || now;
        return _msToHuman(Math.max(0, (last + iMs) - now));
      }
      case 'bow_range':
        if (f.stocks.archer_squads >= 1) return 'Ready';
        return _msToHuman(Math.max(0, (f.nextRefillAt.archer_squads || now) + FB.refillIntervalMs('bow_range') - now));
      case 'barracks':
        if (f.stocks.footman_squads >= 1) return 'Ready';
        return _msToHuman(Math.max(0, (f.nextRefillAt.footman_squads || now) + FB.refillIntervalMs('barracks') - now));
      case 'wall_workshop': {
        const cap = FB.wallCountAt(b.level);
        if (f.stocks.walls.length >= cap) return 'Full';
        const iMs = FB.refillIntervalMs('wall_workshop');
        const last = f.nextRefillAt.walls || now;
        return _msToHuman(Math.max(0, (last + iMs) - now));
      }
      default: return '';
    }
  }

  function makeBuildingTile(b) {
    const def = WG.ForgeBuildings.get(b.id);
    const isGoldMine = b.id === 'gold_mine';
    const f = WG.State.get().forge;
    const statLine = _buildingStatLine(b);
    const refillLine = _buildingRefillLine(b);

    const tile = el('div', {
      class: 'card-tile',
      style: 'cursor:pointer;',
      onclick: () => showBuildingDetailModal(b),
    });
    tile.appendChild(el('div', { class: 'icon-box' }, def.icon || '?'));
    tile.appendChild(el('div', { class: 'name' }, def.name));
    tile.appendChild(el('div', { class: 'level' }, 'Lv.' + b.level));
    if (statLine) {
      tile.appendChild(el('div', {
        style: 'font-size:9px;color:#a8d878;margin-top:1px;line-height:1.2;text-align:center;',
      }, statLine));
    }
    if (refillLine) {
      tile.appendChild(el('div', {
        style: 'font-size:8px;color:#808060;margin-top:1px;text-align:center;',
      }, refillLine));
    }
    // Collect button on Gold Mine tile when there's stored coin
    if (isGoldMine && (f.mineStored || 0) > 0) {
      const btn = el('button', {
        style: 'margin-top:3px;font-size:8px;padding:2px 5px;background:#5a3a08;border:1px solid #c8a020;' +
               'color:#fff0a0;border-radius:3px;cursor:pointer;width:100%;',
        onclick: (e) => {
          e.stopPropagation();
          const r = WG.ForgeBuildings.collectMine();
          if (r.ok) { toast('+' + r.amount + ' 🪙 collected'); refresh(); }
        },
      }, '+ Collect');
      tile.appendChild(btn);
    }
    return tile;
  }

  function makeForgeStation() {
    const row = el('div', { class:'scene-row', style:
      'background:radial-gradient(ellipse at center,#3a2a18 0%,#1a1006 70%);padding:18px 12px;'
    });
    // Forge glyph centered on stone platform
    const platform = el('div', { style:
      'width:140px;height:24px;margin:6px auto 0 auto;border-radius:50%;' +
      'background:radial-gradient(ellipse at center,#5a4828 0%,#1a1006 70%);'
    });
    row.appendChild(platform);
    const forgeGlyph = el('div', {
      style:'font-size:52px;text-align:center;line-height:1;margin-top:-32px;cursor:pointer;transition:transform 80ms;',
      onclick: () => {
        forgeGlyph.style.transform = 'scale(0.92)';
        setTimeout(() => forgeGlyph.style.transform = 'scale(1)', 90);
        showCraftingModal();
      },
    }, '⚒');
    row.appendChild(forgeGlyph);

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
    const tun = WG.ForgeBuildings ? WG.ForgeBuildings.TUNABLES : {};
    const woodOk = s.forge.wood >= (WG.ForgeBuildings ? WG.ForgeBuildings.WOOD_PER_CRAFT : 20);
    const stoneOk = s.forge.stone >= (WG.ForgeBuildings ? WG.ForgeBuildings.STONE_PER_CRAFT : 10);
    const cost = el('div', { class:'modal-body', style:'text-align:center;' });
    cost.appendChild(el('div', { style:'font-size:12px;color:#a89878;margin-bottom:4px;' },
      '10 fragments → 1 relic each (×10)'));
    cost.appendChild(el('div', { style:'font-size:14px;color:#f0d890;font-weight:600;' },
      '✦ ' + s.forge.craftFragments + ' fragments  ·  Daily ' + s.forge.craftDailyUsed + '/' + s.forge.craftDailyMax));
    // W-Monetization-V2-Sub-Blockers §C — wood + stone resource display
    const resRow = el('div', { style:'display:flex;justify-content:center;gap:12px;margin-top:6px;' });
    resRow.appendChild(el('span', { style:'font-size:12px;color:' + (woodOk ? '#a8d878' : '#ff8838') + ';' },
      '🪵 ' + s.forge.wood + ' / ' + (tun.WOOD_CAP || 500)));
    resRow.appendChild(el('span', { style:'font-size:12px;color:' + (stoneOk ? '#a8d878' : '#ff8838') + ';' },
      '🪨 ' + s.forge.stone + ' / ' + (tun.STONE_CAP || 200)));
    cost.appendChild(resRow);
    if (!woodOk) {
      const refWood = el('button', { class:'btn', style:'margin-top:4px;font-size:10px;padding:4px 10px;', onclick: () => {
        const r = WG.ForgeBuildings.refillWood();
        if (!r.ok) { toast('Not enough 💎'); return; }
        wrap.remove(); openCraftModal();
      }}, 'Buy ' + (tun.WOOD_REFILL_AMT||200) + ' wood: ' + (tun.WOOD_REFILL_GEMS||25) + ' 💎');
      cost.appendChild(refWood);
    }
    if (!stoneOk) {
      const refStone = el('button', { class:'btn', style:'margin-top:4px;font-size:10px;padding:4px 10px;', onclick: () => {
        const r = WG.ForgeBuildings.refillStone();
        if (!r.ok) { toast('Not enough 💎'); return; }
        wrap.remove(); openCraftModal();
      }}, 'Buy ' + (tun.STONE_REFILL_AMT||100) + ' stone: ' + (tun.STONE_REFILL_GEMS||25) + ' 💎');
      cost.appendChild(refStone);
    }
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
          if (r.reason === 'daily-cap') toast('Daily craft cap reached');
          else if (r.reason === 'insufficient-resources') toast('Need more 🪵 wood or 🪨 stone');
          else toast('Need ' + costPerBatch + ' fragments');
          return;
        }
        wrap.remove();
        showCraftResults(r.drops);
        refresh();
      },
    }, 'Craft × 10  (✦ ' + costPerBatch + ')');
    if (s.forge.craftFragments < costPerBatch || s.forge.craftDailyUsed >= s.forge.craftDailyMax || !woodOk || !stoneOk) {
      craftBtn.disabled = !woodOk || !stoneOk ? true : (s.forge.craftFragments < costPerBatch || s.forge.craftDailyUsed >= s.forge.craftDailyMax);
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
    WG.Engine.on('forge:resources-change', () => { if (WG.State.get().activeTab === 'forge') refresh(); });
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
