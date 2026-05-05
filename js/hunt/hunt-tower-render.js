// WG.HuntTowerRender — Tower Gauntlet procedural interior painter.
// W-Tower-Art-Procedural (Sconce 2026-05-05): stone temple interior background,
// floor-tier color shifts, torch flicker + sigil pulse + ash motes.
// Called by hunt-render.js _drawFrameTower() — no own rAF, driven by main loop.
// Style register matches wg-game.js biome painters: _hash noise, stipple, ink fills.
(function(){'use strict';

  // Deterministic pseudo-noise — same seed always yields same value.
  function _hash(i) { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); }

  // ─── Concern B: Floor-tier color palette ─────────────────────────────────
  // Returns { torch:[r,g,b], sigil:[r,g,b], ambient:hexStr }
  function _tierPalette(floor) {
    if (floor >= 20) return { torch: [60, 0, 100],   sigil: [80, 0, 140],   ambient: '#04000a' };
    if (floor >= 15) return { torch: [120, 0, 200],  sigil: [160, 0, 255],  ambient: '#08000e' };
    if (floor >= 10) return { torch: [160, 210, 255], sigil: [130, 190, 255], ambient: '#050810' };
    if (floor >= 5)  return { torch: [255, 195, 70],  sigil: [255, 200, 90],  ambient: '#100908' };
    return               { torch: [255, 130, 36],  sigil: [255, 150, 50],  ambient: '#120806' };
  }

  // ─── Concern A: Tower interior painter ───────────────────────────────────
  // ctx    — 2d context (at screen scale, no ZOOM applied — background is fixed)
  // w, h   — screen CSS pixels
  // t      — seconds since performance.now() epoch / 1000
  // floor  — current tower floor (1-indexed)
  function paintTowerInterior(ctx, w, h, t, floor) {
    const pal = _tierPalette(floor);
    const [tr, tg, tb] = pal.torch;
    const [sr, sg, sb] = pal.sigil;

    // ── Background void gradient ──────────────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0,   '#030007');
    bg.addColorStop(0.4, pal.ambient);
    bg.addColorStop(1,   '#020006');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // ── Ceiling band + crossbeams ─────────────────────────────────────────
    ctx.fillStyle = '#08040e';
    ctx.fillRect(0, 0, w, h * 0.05);
    // Three crossbeams
    for (let i = 0; i < 3; i++) {
      const bx = w * (0.20 + i * 0.30);
      ctx.fillStyle = '#060210';
      ctx.fillRect(bx - 9, 0, 18, h * 0.05);
    }

    // ── Far wall between inner column pair ───────────────────────────────
    // Stone tile grid — faint hatching for depth
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = '#1a0c2a';
    ctx.lineWidth = 0.6;
    const wallL = w * 0.28, wallR = w * 0.72;
    const tileW = (wallR - wallL) / 8;
    for (let col = 0; col <= 8; col++) {
      const x = wallL + col * tileW;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h * 0.70); ctx.stroke();
    }
    const tileH = h * 0.70 / 10;
    for (let row = 0; row <= 10; row++) {
      const y = row * tileH;
      ctx.beginPath(); ctx.moveTo(wallL, y); ctx.lineTo(wallR, y); ctx.stroke();
    }
    ctx.restore();

    // ── Central wall sigil glyph (slow-rotating, mid-depth) ──────────────
    {
      const gx = w * 0.50, gy = h * 0.28;
      const wallPulse = 0.20 + Math.sin(t * 1.6) * 0.20;
      const gRad = 28 + Math.sin(t * 1.6) * 2.5;
      ctx.strokeStyle = `rgba(${sr},${sg},${sb},${wallPulse * 0.55})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(gx, gy, gRad, 0, Math.PI * 2); ctx.stroke();
      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(t * 0.15);
      ctx.strokeStyle = `rgba(${sr},${sg},${sb},${wallPulse * 0.30})`;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(-gRad, 0);       ctx.lineTo(gRad, 0);
      ctx.moveTo(0, -gRad);       ctx.lineTo(0, gRad);
      ctx.moveTo(-gRad*0.7, -gRad*0.7); ctx.lineTo(gRad*0.7, gRad*0.7);
      ctx.moveTo( gRad*0.7, -gRad*0.7); ctx.lineTo(-gRad*0.7, gRad*0.7);
      ctx.stroke();
      ctx.restore();
    }

    // ── Four massive columns (two left + two right) ───────────────────────
    // Each column: stone gradient body, edge-light, horizontal block seams,
    // two torch sconces, one floating sigil ring per sconce.
    const COL_X = [w * 0.10, w * 0.24, w * 0.76, w * 0.90];
    const COL_W = 34;

    for (let ci = 0; ci < COL_X.length; ci++) {
      const cx = COL_X[ci];

      // Column body — stone gradient
      const cGrad = ctx.createLinearGradient(cx - COL_W/2, 0, cx + COL_W/2, 0);
      cGrad.addColorStop(0,    '#0e0618');
      cGrad.addColorStop(0.30, '#221030');
      cGrad.addColorStop(0.55, '#1a0c26');
      cGrad.addColorStop(0.80, '#160a20');
      cGrad.addColorStop(1,    '#0a0412');
      ctx.fillStyle = cGrad;
      ctx.fillRect(cx - COL_W/2, 0, COL_W, h);

      // Edge torch-light bleed from the opposite side (warm/cool per tier)
      const bleedSide = ci < 2 ? 1 : -1; // left columns bleed right; right bleed left
      const bleedGrad = ctx.createLinearGradient(
        cx + bleedSide * (COL_W/2), 0,
        cx + bleedSide * (COL_W/2 + 28), 0
      );
      bleedGrad.addColorStop(0, `rgba(${tr},${tg},${tb},0.08)`);
      bleedGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = bleedGrad;
      ctx.fillRect(
        cx + bleedSide * (COL_W/2),
        0,
        bleedSide * 28,
        h
      );

      // Horizontal stone seam lines
      ctx.strokeStyle = 'rgba(4,2,10,0.7)';
      ctx.lineWidth = 0.8;
      for (let s = 1; s < 9; s++) {
        const sy2 = h * (s / 9);
        ctx.beginPath();
        ctx.moveTo(cx - COL_W/2, sy2);
        ctx.lineTo(cx + COL_W/2, sy2);
        ctx.stroke();
      }

      // Torches at ~28% and ~62% height
      for (let ti = 0; ti < 2; ti++) {
        const torchY = h * (0.28 + ti * 0.34);
        const seedBase = ci * 7 + ti * 13;
        const flicker  = 0.55 + Math.sin(t * 8.1 + seedBase)  * 0.30
                               + Math.sin(t * 5.3 + seedBase + 2.1) * 0.15;
        const flickOff = Math.sin(t * 11.7 + seedBase + 1.4) * 0.12;

        // Sconce bracket
        ctx.fillStyle = '#14081e';
        ctx.fillRect(cx - 5, torchY - 4, 10, 9);

        // Outer torch glow (wide, soft)
        const glowR = 30 + flickOff * 10;
        const outerGlow = ctx.createRadialGradient(cx, torchY, 0, cx, torchY, glowR);
        outerGlow.addColorStop(0,   `rgba(${tr},${tg},${tb},${0.50 * flicker})`);
        outerGlow.addColorStop(0.5, `rgba(${tr},${tg},${tb},${0.14 * flicker})`);
        outerGlow.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = outerGlow;
        ctx.beginPath(); ctx.arc(cx, torchY, glowR, 0, Math.PI * 2); ctx.fill();

        // Flame tip — tapered quadratic curve
        const fTipR  = Math.min(255, tr + 70);
        const fTipG  = Math.min(255, tg + 50);
        ctx.fillStyle = `rgba(${fTipR},${fTipG},${tb},${0.92 * flicker})`;
        ctx.beginPath();
        ctx.moveTo(cx - 2.8, torchY);
        ctx.quadraticCurveTo(
          cx + flickOff * 5, torchY - 6 - flickOff * 5,
          cx, torchY - 9 - flickOff * 7
        );
        ctx.quadraticCurveTo(
          cx - flickOff * 5, torchY - 6 - flickOff * 5,
          cx + 2.8, torchY
        );
        ctx.closePath();
        ctx.fill();

        // Sigil ring floating around torch position (mid-ground depth)
        const sPulse = 0.45 + Math.sin(t * 2.6 + seedBase * 0.4) * 0.45;
        const sRad   = 13 + Math.sin(t * 2.6 + seedBase * 0.4) * 1.5;
        ctx.strokeStyle = `rgba(${sr},${sg},${sb},${sPulse * 0.60})`;
        ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.arc(cx, torchY, sRad, 0, Math.PI * 2); ctx.stroke();
        // Cross inside ring
        ctx.strokeStyle = `rgba(${sr},${sg},${sb},${sPulse * 0.28})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(cx - sRad, torchY); ctx.lineTo(cx + sRad, torchY);
        ctx.moveTo(cx, torchY - sRad); ctx.lineTo(cx, torchY + sRad);
        ctx.stroke();
      }
    }

    // ── Foreground floor ──────────────────────────────────────────────────
    const floorY = h * 0.72;
    const floorGrad = ctx.createLinearGradient(0, floorY, 0, h);
    floorGrad.addColorStop(0, '#170c22');
    floorGrad.addColorStop(1, '#05020c');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, floorY, w, h - floorY);

    // Floor tile grid
    const ftW = w / 7;
    const ftH = (h - floorY) / 3;
    ctx.strokeStyle = 'rgba(36,18,50,0.65)';
    ctx.lineWidth = 0.7;
    for (let col = 0; col <= 7; col++) {
      ctx.beginPath();
      ctx.moveTo(col * ftW, floorY);
      ctx.lineTo(col * ftW, h);
      ctx.stroke();
    }
    for (let row = 0; row <= 3; row++) {
      ctx.beginPath();
      ctx.moveTo(0, floorY + row * ftH);
      ctx.lineTo(w, floorY + row * ftH);
      ctx.stroke();
    }

    // Sigil engravings on floor — 4 glyphs in a row
    for (let i = 0; i < 4; i++) {
      const gx = w * (0.14 + i * 0.24);
      const gy = floorY + (h - floorY) * 0.38;
      const sPulse = 0.30 + Math.sin(t * 2.0 + i * 1.571) * 0.30;
      const r = 9 + Math.sin(t * 2.0 + i * 1.571) * 1;
      ctx.strokeStyle = `rgba(${sr},${sg},${sb},${sPulse * 0.85})`;
      ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.arc(gx, gy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = `rgba(${sr},${sg},${sb},${sPulse * 0.40})`;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(gx - r, gy); ctx.lineTo(gx + r, gy);
      ctx.moveTo(gx, gy - r); ctx.lineTo(gx, gy + r);
      ctx.stroke();
    }

    // ── Floating ash motes — drift upward ────────────────────────────────
    for (let i = 0; i < 22; i++) {
      const seed  = _hash(i + 41);
      const mxBase = _hash(i + 17) * w;
      const sway  = Math.sin(t * 0.45 + i * 0.83) * 14;
      const mx    = ((mxBase + sway) % w + w) % w;
      const period = h * 0.90;
      const my    = period - ((seed * period + t * (8 + seed * 9)) % period);
      if (my > h || my < h * 0.04) continue;
      const a = (0.18 + Math.sin(t * 1.8 + i * 0.7) * 0.15) * (1 - my / h * 0.5);
      ctx.fillStyle = `rgba(${tr},${tg},${tb},${a})`;
      ctx.beginPath();
      ctx.arc(mx, my, 0.7 + seed * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  window.WG = window.WG || {};
  window.WG.HuntTowerRender = { paintTowerInterior };
})();
