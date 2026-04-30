// WG.HuntRender — top-down arena rendering, rebuilt 2026-04-28 from primary-source frames.
// Audit: build-v2/docs/CLONE_FIDELITY_AUDIT.md
// Targets Wood Siege Stage 1 visual register: textured pixel-grass, pine perimeter,
// scattered chopable stumps, cabin landmark, campfire with light radius, anime-girl
// player sprite, cloaked-zombie enemy sprite. No fake "auto-attack ring" — the original
// has none. All v0 props are VISUAL ONLY (no collision/interaction yet).
(function(){'use strict';
  const D = () => window.WG.Display;
  // ZOOM — Wood Siege HD source shows tight zoom on player + base; previously
  // Wraithgrove rendered at 1× and felt too far away. 2.0× lands close to source.
  const ZOOM = 2.0;
  const camera = { x: 0, y: 0 };
  let runtime = null;
  let _edgePulse = null;
  let _stagePropsCache = {}; // stageId → { stumps:[], cabins:[], fires:[] }

  function pulseEdges(color, opacity, durationMs) {
    _edgePulse = { color, opacity, start: performance.now(), end: performance.now() + durationMs };
  }

  function drawEdgePulse(ctx) {
    if (!_edgePulse) return;
    const now = performance.now();
    if (now >= _edgePulse.end) { _edgePulse = null; return; }
    const frac = 1 - (now - _edgePulse.start) / (_edgePulse.end - _edgePulse.start);
    const w = D().width, h = D().height;
    const edge = 44;
    ctx.globalAlpha = _edgePulse.opacity * frac;
    ctx.fillStyle = _edgePulse.color;
    ctx.fillRect(0, 0, w, edge);
    ctx.fillRect(0, h - edge, w, edge);
    ctx.fillRect(0, 0, edge, h);
    ctx.fillRect(w - edge, 0, edge, h);
    ctx.globalAlpha = 1;
  }

  function setRuntime(rt) { runtime = rt; _stagePropsCache = {}; }

  function updateCamera() {
    if (!runtime || !runtime.player) return;
    const p = runtime.player;
    // Viewport in WORLD units = screen pixels / ZOOM
    const vw = D().width / ZOOM, vh = D().height / ZOOM;
    let cx = p.x - vw/2, cy = p.y - vh/2 + 16;
    if (runtime.mapW <= vw) cx = (runtime.mapW - vw)/2;
    else cx = Math.max(0, Math.min(runtime.mapW - vw, cx));
    if (runtime.mapH <= vh) cy = (runtime.mapH - vh)/2;
    else cy = Math.max(0, Math.min(runtime.mapH - vh, cy));
    camera.x = cx; camera.y = cy;
  }

  function w2s(wx, wy) { return { x: wx - camera.x, y: wy - camera.y }; }

  // Deterministic int hash from (x, y) — used for tile texture variation, prop placement.
  function hash2(x, y) {
    let h = ((x * 374761393) ^ (y * 668265263)) >>> 0;
    h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
    return (h ^ (h >>> 16)) >>> 0;
  }
  function tileHash(x, y) { return hash2(x, y); }

  // Hex shade — return a hex-string color shifted by N (negative=darker).
  function shade(hex, delta) {
    const r = Math.max(0, Math.min(255, parseInt(hex.slice(1,3),16) + delta));
    const g = Math.max(0, Math.min(255, parseInt(hex.slice(3,5),16) + delta));
    const b = Math.max(0, Math.min(255, parseInt(hex.slice(5,7),16) + delta));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Stage props — deterministic per-stage placement of stumps, cabins, campfires.
  // V0: visual only. No interaction. Provides Wood Siege register at thumbnail glance.
  // ─────────────────────────────────────────────────────────────────────────────
  function getStageProps(stage) {
    if (_stagePropsCache[stage.id]) return _stagePropsCache[stage.id];
    // Seed off the stage id string.
    let seed = 0;
    for (let i = 0; i < stage.id.length; i++) seed = ((seed << 5) - seed + stage.id.charCodeAt(i)) >>> 0;

    function rand() { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 0xFFFFFFFF; }
    function pick(min, max) { return min + Math.floor(rand() * (max - min + 1)); }

    const mapW = runtime.mapW, mapH = runtime.mapH;
    const inset = 80;
    const cxBase = mapW / 2, cyBase = mapH / 2;

    // Pagoda/cave: fixed landmark at the base, slightly offset
    const caves = [{
      x: cxBase + (rand() - 0.5) * 60,
      y: cyBase + (rand() - 0.5) * 60,
    }];
    // Campfires (ambient light, decorative for now)
    const fires = [
      { x: cxBase + (rand() - 0.5) * 80, y: cyBase + 50 + rand() * 30, flicker: rand() * Math.PI * 2 },
    ];
    // Construction sites — fixed positions arrayed around the base (Wood Siege has
    // 4-6 fixed turret slots around the player's spawn, not random placement)
    const constructions = [
      { x: cxBase - 110, y: cyBase - 10,  name: 'Turret', have: 0, need: 4  },
      { x: cxBase + 110, y: cyBase - 10,  name: 'Turret', have: 0, need: 4  },
      { x: cxBase - 110, y: cyBase + 90,  name: 'Turret', have: 0, need: 4  },
      { x: cxBase + 110, y: cyBase + 90,  name: 'Turret', have: 0, need: 4  },
      { x: cxBase + 70,  y: cyBase + 30,  name: 'Campfire', have: 0, need: 30 },
    ];

    // DENSE forest covering the ENTIRE map on a jittered grid (Wood Siege register —
    // map is uniform forest, player chops INTO it to expand the playable clearing).
    // Skip cells within initial spawn clearing + building footprints.
    const stumps = [];
    const TREE_SPACING = 30;
    const initialClearingR = 80;  // small clearing around spawn so player can move
    function inFootprint(tx, ty) {
      // Avoid the pagoda itself
      for (const c of caves) {
        const dx = tx - c.x, dy = ty - c.y;
        if (dx*dx + dy*dy < 42*42) return true;
      }
      // Avoid construction sites
      for (const cs of constructions) {
        const dx = tx - cs.x, dy = ty - cs.y;
        if (dx*dx + dy*dy < 36*36) return true;
      }
      // Avoid campfires
      for (const f of fires) {
        const dx = tx - f.x, dy = ty - f.y;
        if (dx*dx + dy*dy < 28*28) return true;
      }
      return false;
    }
    for (let gy = TREE_SPACING/2; gy < mapH; gy += TREE_SPACING) {
      for (let gx = TREE_SPACING/2; gx < mapW; gx += TREE_SPACING) {
        // Per-cell deterministic jitter (~±35% of spacing)
        const jh = hash2(Math.floor(gx), Math.floor(gy)) >>> 0;
        const jx = ((jh % 1000) / 1000 - 0.5) * TREE_SPACING * 0.7;
        const jy = (((jh >>> 10) % 1000) / 1000 - 0.5) * TREE_SPACING * 0.7;
        const tx = gx + jx;
        const ty = gy + jy;
        // Skip initial spawn clearing
        const dxc = tx - cxBase, dyc = ty - cyBase;
        if (dxc*dxc + dyc*dyc < initialClearingR * initialClearingR) continue;
        // Skip building footprints
        if (inFootprint(tx, ty)) continue;
        stumps.push({
          x: tx, y: ty,
          r: 12,
          hp: 5, maxHp: 5,
          lastHit: 0,
          dropped: false,
          hash: jh,
        });
      }
    }
    _stagePropsCache[stage.id] = { stumps, caves, fires, constructions };
    return _stagePropsCache[stage.id];
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Ground — densely textured pixel-grass tiles. Multi-shade variation, micro-tufts,
  // occasional dirt patch. Targets Wood Siege Stage 1 frame texture density.
  // ─────────────────────────────────────────────────────────────────────────────
  function drawTiles(ctx, biome) {
    const ts = 32;
    const x0 = Math.max(-1, Math.floor(camera.x / ts) - 1);
    const x1 = Math.ceil((camera.x + D().width) / ts) + 1;
    const y0 = Math.max(-1, Math.floor(camera.y / ts) - 1);
    const y1 = Math.ceil((camera.y + D().height) / ts) + 1;
    const baseR = parseInt(biome.ground.slice(1,3),16);
    const baseG = parseInt(biome.ground.slice(3,5),16);
    const baseB = parseInt(biome.ground.slice(5,7),16);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const wx = x * ts - camera.x, wy = y * ts - camera.y;
        const h = tileHash(x, y);
        // 4 shades of base ground, hash-distributed (organic, not parity)
        const shadeOffset = ((h % 4) - 1) * 6; // -6, 0, +6, +12
        ctx.fillStyle = 'rgb(' + (baseR+shadeOffset) + ',' + (baseG+shadeOffset+2) + ',' + (baseB+shadeOffset) + ')';
        ctx.fillRect(wx, wy, ts, ts);
        // Dirt patch (~5% of tiles)
        if (h % 20 === 0) {
          ctx.fillStyle = 'rgba(60,40,22,0.32)';
          ctx.beginPath();
          ctx.ellipse(wx + ts/2 + ((h>>>4)%6 - 3), wy + ts/2 + ((h>>>8)%6 - 3), 11, 7, 0, 0, Math.PI*2);
          ctx.fill();
        }
        // Grass tufts — 2-5 micro-pixels per tile, lighter green
        const tufts = (h % 4) + 2;
        const tuftR = Math.min(255, baseR + 10);
        const tuftG = Math.min(255, baseG + 22);
        const tuftB = Math.min(255, baseB + 8);
        ctx.fillStyle = 'rgb(' + tuftR + ',' + tuftG + ',' + tuftB + ')';
        for (let i = 0; i < tufts; i++) {
          const tx = wx + ((h >>> (i*5)) % (ts-4)) + 2;
          const ty = wy + ((h >>> (i*5 + 7)) % (ts-4)) + 2;
          ctx.fillRect(tx-1, ty,   1, 2);
          ctx.fillRect(tx,   ty-1, 1, 3);
          ctx.fillRect(tx+1, ty,   1, 2);
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Pine forest perimeter — stacked tree triangles 3 rows deep, hash-jittered.
  // Replaces the prior solid-color bar.
  // ─────────────────────────────────────────────────────────────────────────────
  function drawPine(ctx, sx, sy, h) {
    if (sx < -32 || sx > D().width + 32) return;
    if (sy < -48 || sy > D().height + 32) return;
    const sizeJit = (h % 4); // 0..3 size variance
    // Trunk
    ctx.fillStyle = '#2a1808';
    ctx.fillRect(sx + 9, sy + 26 + sizeJit, 4, 7);
    // Foliage — three stacked triangles, getting wider as they go down
    ctx.fillStyle = '#143018';
    ctx.beginPath(); ctx.moveTo(sx + 11, sy + 0);  ctx.lineTo(sx + 2,  sy + 14); ctx.lineTo(sx + 20, sy + 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1a3a18';
    ctx.beginPath(); ctx.moveTo(sx + 11, sy + 8);  ctx.lineTo(sx,      sy + 22); ctx.lineTo(sx + 22, sy + 22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1c4220';
    ctx.beginPath(); ctx.moveTo(sx + 11, sy + 16); ctx.lineTo(sx - 2,  sy + 30); ctx.lineTo(sx + 24, sy + 30); ctx.closePath(); ctx.fill();
  }

  function drawPineForest(ctx) {
    const ts = 32;
    const cols = Math.ceil(runtime.mapW / ts);
    const rows = Math.ceil(runtime.mapH / ts);
    // Top + bottom — 3 rows deep
    for (let depth = 2; depth >= 0; depth--) {
      for (let x = -1; x < cols + 1; x++) {
        const ht = tileHash(x, -depth - 7);
        const jt = (ht % 9) - 4;
        const sN = w2s(x*ts + jt, -depth*22 - 12);
        drawPine(ctx, sN.x, sN.y, ht);
        const hb = tileHash(x, 9000 + depth);
        const jb = (hb % 9) - 4;
        const sS = w2s(x*ts + jb, runtime.mapH + depth*22 - 18);
        drawPine(ctx, sS.x, sS.y, hb);
      }
    }
    // Left + right
    for (let depth = 2; depth >= 0; depth--) {
      for (let y = -1; y < rows + 1; y++) {
        const hl = tileHash(-depth - 7, y);
        const jl = (hl % 9) - 4;
        const sW = w2s(-depth*22 - 12, y*ts + jl);
        drawPine(ctx, sW.x, sW.y, hl);
        const hr = tileHash(8000 + depth, y);
        const jr = (hr % 9) - 4;
        const sE = w2s(runtime.mapW + depth*22 - 18, y*ts + jr);
        drawPine(ctx, sE.x, sE.y, hr);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Stumps — brown wood circles with concentric rings + small axe wedge.
  // ─────────────────────────────────────────────────────────────────────────────
  // Draw a choppable tree (stacked-triangle pine) at trunk-base (sx, sy).
  // Replaces the prior stump-circle visual — Wood Siege has standing trees, not stumps.
  function drawStump(ctx, sx, sy, r, stumpData) {
    if (sx < -32 || sx > D().width + 32 || sy < -56 || sy > D().height + 16) return;
    // Hit-flash + wobble on recent hit
    const sinceHit = stumpData ? (performance.now() - stumpData.lastHit) : 9999;
    const flash = sinceHit < 140 ? (1 - sinceHit / 140) : 0;
    const wobble = flash * Math.sin(sinceHit / 10) * 2;
    sx += wobble;
    const h = (stumpData && stumpData.hash) || 12345;
    // Ground shadow under trunk
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(sx, sy, 8, 3, 0, 0, Math.PI*2); ctx.fill();
    // Trunk
    ctx.fillStyle = '#2a1808';
    ctx.fillRect(sx - 2, sy - 7, 4, 7);
    // Foliage — 3 stacked triangles, sized by hash, brighter on hit
    const flashBoost = flash * 30;
    ctx.fillStyle = `rgb(${20 + flashBoost},${48 + flashBoost*1.5},${24 + flashBoost})`;
    ctx.beginPath(); ctx.moveTo(sx, sy - 33); ctx.lineTo(sx - 9, sy - 19); ctx.lineTo(sx + 9, sy - 19); ctx.closePath(); ctx.fill();
    ctx.fillStyle = `rgb(${26 + flashBoost},${58 + flashBoost*1.5},${24 + flashBoost})`;
    ctx.beginPath(); ctx.moveTo(sx, sy - 25); ctx.lineTo(sx - 11, sy - 11); ctx.lineTo(sx + 11, sy - 11); ctx.closePath(); ctx.fill();
    ctx.fillStyle = `rgb(${28 + flashBoost},${66 + flashBoost*1.5},${32 + flashBoost})`;
    ctx.beginPath(); ctx.moveTo(sx, sy - 17); ctx.lineTo(sx - 13, sy - 3);  ctx.lineTo(sx + 13, sy - 3);  ctx.closePath(); ctx.fill();
    return; // skip the old stump-circle code below
    // Outer ring (darker bark)
    ctx.strokeStyle = '#3a2010'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(sx, sy, r, r*0.85, 0, 0, Math.PI*2); ctx.stroke();
    // Inner concentric rings
    ctx.strokeStyle = '#5a3010'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(sx, sy, r*0.66, r*0.55, 0, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(sx, sy, r*0.32, r*0.27, 0, 0, Math.PI*2); ctx.stroke();
    // Axe wedge embedded
    ctx.fillStyle = '#c8c0a8';
    ctx.beginPath();
    ctx.moveTo(sx + r*0.4, sy - r*0.3);
    ctx.lineTo(sx + r*0.85, sy - r*0.55);
    ctx.lineTo(sx + r*0.95, sy - r*0.35);
    ctx.lineTo(sx + r*0.55, sy - r*0.1);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5a3818';
    ctx.fillRect(sx + r*0.4, sy - r*0.3, 2, r*0.5);
  }

  function drawStumps(ctx, props) {
    // Sort by Y so closer trees draw over farther ones (top-down layering)
    const sorted = props.stumps.slice().sort((a, b) => a.y - b.y);
    for (const s of sorted) {
      if (s.dropped) continue;
      const ss = w2s(s.x, s.y);
      drawStump(ctx, ss.x, ss.y, s.r, s);
      if (s.hp < s.maxHp && s.hp > 0) {
        const bw = 18, bh = 2;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(ss.x - bw/2, ss.y - 40, bw, bh);
        ctx.fillStyle = '#a8d878';
        ctx.fillRect(ss.x - bw/2, ss.y - 40, bw * (s.hp / s.maxHp), bh);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Cabin / shelter — peaked-roof landmark structure.
  // ─────────────────────────────────────────────────────────────────────────────
  // Pagoda — Asian temple/shrine landmark (Wood Siege Stage 1, per HD source §L.2).
  // Dark tile roof with upturned eaves, red walls, two glowing entry windows.
  // CORRECTION 2026-04-29: previously drawn as a rocky cave; HD source shows pagoda.
  function drawPagoda(ctx, sx, sy) {
    if (sx < -70 || sx > D().width + 70 || sy < -70 || sy > D().height + 70) return;
    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.ellipse(sx, sy + 26, 40, 9, 0, 0, Math.PI*2); ctx.fill();
    // Walls — red/maroon body
    ctx.fillStyle = '#7a2828';
    ctx.fillRect(sx - 28, sy - 4, 56, 30);
    // Wall edge shadow
    ctx.fillStyle = '#5a1818';
    ctx.fillRect(sx + 22, sy - 4, 6, 30);
    // Wall horizontal trim line
    ctx.fillStyle = '#4a1010';
    ctx.fillRect(sx - 28, sy + 8, 56, 1);
    // Two glowing entry windows — orange firelight from inside
    const t = performance.now() / 700;
    const flicker = 0.75 + 0.15 * Math.sin(t * 1.7);
    ctx.fillStyle = `rgba(248, 140, 40, ${flicker})`;
    ctx.fillRect(sx - 22, sy + 2, 10, 14);
    ctx.fillRect(sx + 12, sy + 2, 10, 14);
    // Window frames
    ctx.strokeStyle = '#3a0808'; ctx.lineWidth = 1.5;
    ctx.strokeRect(sx - 22.5, sy + 1.5, 11, 15);
    ctx.strokeRect(sx + 11.5, sy + 1.5, 11, 15);
    // Roof — dark tiles with upturned eaves
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.moveTo(sx - 36, sy - 2);
    ctx.lineTo(sx - 30, sy - 16);
    ctx.lineTo(sx + 30, sy - 16);
    ctx.lineTo(sx + 36, sy - 2);
    ctx.closePath(); ctx.fill();
    // Upturned eave tips (the signature pagoda detail)
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.moveTo(sx - 36, sy - 2);
    ctx.quadraticCurveTo(sx - 40, sy - 5, sx - 38, sy - 8);
    ctx.lineTo(sx - 32, sy - 4);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(sx + 36, sy - 2);
    ctx.quadraticCurveTo(sx + 40, sy - 5, sx + 38, sy - 8);
    ctx.lineTo(sx + 32, sy - 4);
    ctx.closePath(); ctx.fill();
    // Roof ridge line (lighter)
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(sx - 30, sy - 16, 60, 2);
    // Tiny center spire detail
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(sx - 1, sy - 22, 2, 6);
  }

  function drawCaves(ctx, props) {
    // Function name preserved for back-compat; renders Pagoda per HD source.
    for (const c of props.caves) {
      const s = w2s(c.x, c.y);
      drawPagoda(ctx, s.x, s.y);
    }
  }

  // Construction sites — pre-marked dashed-circle build slots with name + cost.
  // HD source (screenshot 3): "Turret 0/4" and "Campfire 0/30" with white dashed
  // outline and small wood-icon + progress fraction text. V0 visual-only.
  function drawConstructionSites(ctx, props) {
    if (!props.constructions) return;
    const t = performance.now() / 1000;
    for (const c of props.constructions) {
      const s = w2s(c.x, c.y);
      if (s.x < -60 || s.x > D().width + 60 || s.y < -60 || s.y > D().height + 60) continue;
      const r = 28;
      // Dashed circle outline
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = -t * 8;
      ctx.strokeStyle = 'rgba(232, 224, 200, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      // Subtle tint inside
      ctx.fillStyle = 'rgba(232, 224, 200, 0.06)';
      ctx.beginPath(); ctx.arc(s.x, s.y, r - 1, 0, Math.PI * 2); ctx.fill();
      // Padlock icon (small) above center
      ctx.fillStyle = '#d8d0b0';
      ctx.fillRect(s.x - 3, s.y - 4, 6, 5);
      ctx.strokeStyle = '#d8d0b0'; ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(s.x, s.y - 5, 2.5, Math.PI, 0);
      ctx.stroke();
      // Name label above circle
      ctx.fillStyle = '#f0e8c8';
      ctx.font = 'bold 10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(c.name, s.x, s.y - r - 8);
      // Progress label inside (have/need)
      ctx.fillStyle = '#f0e8c8';
      ctx.font = '9px system-ui';
      // Tiny wood-icon (brown rect)
      ctx.fillStyle = '#8a5828';
      ctx.fillRect(s.x - 14, s.y + 9, 5, 3);
      ctx.fillStyle = '#5a3010';
      ctx.fillRect(s.x - 14, s.y + 9, 5, 1);
      ctx.fillStyle = '#f0e8c8';
      ctx.textAlign = 'left';
      ctx.fillText(`${c.have}/${c.need}`, s.x - 7, s.y + 12);
      ctx.textAlign = 'left';
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Campfire + light radius. The "yellow circle on the ground" Wood Siege element
  // (which I previously misread as an attack ring).
  // ─────────────────────────────────────────────────────────────────────────────
  function drawCampfireLight(ctx, props) {
    // Light radii FIRST — drawn under sprites but over ground
    const t = performance.now() / 1000;
    for (const f of props.fires) {
      const s = w2s(f.x, f.y);
      const r = 80 + Math.sin(t * 2 + f.flicker) * 4;
      const grad = ctx.createRadialGradient(s.x, s.y, 6, s.x, s.y, r);
      grad.addColorStop(0,    'rgba(255, 220, 140, 0.55)');
      grad.addColorStop(0.4,  'rgba(248, 180, 80,  0.30)');
      grad.addColorStop(1,    'rgba(248, 160, 60,  0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI*2); ctx.fill();
    }
  }

  function drawCampfireFlame(ctx, props) {
    // Stones + flame, drawn on top of light
    const t = performance.now() / 1000;
    for (const f of props.fires) {
      const s = w2s(f.x, f.y);
      // Stone ring
      ctx.fillStyle = '#5a5658';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const sx = s.x + Math.cos(a) * 9, sy = s.y + Math.sin(a) * 7;
        ctx.beginPath(); ctx.ellipse(sx, sy, 3, 2.5, 0, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = '#3a3638';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.5;
        const sx = s.x + Math.cos(a) * 8, sy = s.y + Math.sin(a) * 6;
        ctx.fillRect(sx - 1, sy - 1, 2, 2);
      }
      // Flame — animated triangles
      const flick = Math.sin(t * 6 + f.flicker);
      ctx.fillStyle = '#f87018';
      ctx.beginPath();
      ctx.moveTo(s.x - 4, s.y + 2);
      ctx.lineTo(s.x,     s.y - 8 + flick);
      ctx.lineTo(s.x + 4, s.y + 2);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fcc848';
      ctx.beginPath();
      ctx.moveTo(s.x - 2, s.y);
      ctx.lineTo(s.x,     s.y - 5 + flick * 0.6);
      ctx.lineTo(s.x + 2, s.y);
      ctx.closePath(); ctx.fill();
    }
  }

  function drawDrops(ctx) {
    for (const d of runtime.drops) {
      const s = w2s(d.x, d.y);
      if (d.type === 'orb') {
        ctx.fillStyle = '#80d0ff';
        ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, Math.PI*2); ctx.fill();
      } else if (d.type === 'coin') {
        ctx.fillStyle = '#ffd870'; ctx.fillRect(s.x-3, s.y-3, 6, 6);
      } else if (d.type === 'fragment') {
        ctx.fillStyle = '#e0a8ff';
        ctx.beginPath(); ctx.moveTo(s.x, s.y-4); ctx.lineTo(s.x+4, s.y); ctx.lineTo(s.x, s.y+4); ctx.lineTo(s.x-4, s.y); ctx.closePath(); ctx.fill();
      }
    }
  }

  function drawBossAura(ctx, sx, sy, sz, color, t) {
    const r = sz * 0.7 + Math.sin(t*1.3) * 4;
    const grad = ctx.createRadialGradient(sx, sy, sz*0.4, sx, sy, r);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI*2); ctx.fill();
  }

  // (Boss draws preserved from prior version — they're already procedural variety.
  // V1 will redo them with hood/robe/aura registers per audit. V0 keeps them.)
  function drawBoss_pale_bride(ctx, sx, sy, b, t) {
    const sz = b.size;
    ctx.fillStyle = b._typeData.color;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(sx + i*8, sy);
      ctx.lineTo(sx + i*4, sy + sz);
      ctx.lineTo(sx + i*8 + 4, sy + sz);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#f0e8d8';
    ctx.beginPath(); ctx.ellipse(sx, sy, sz*0.32, sz*0.45, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#1a0828';
    ctx.fillRect(sx - 6, sy - 6, 4, 5);
    ctx.fillRect(sx + 2, sy - 6, 4, 5);
    drawBossAura(ctx, sx, sy, sz, 'rgba(248, 240, 224, 0.25)', t);
  }
  function drawBoss_frozen_crone(ctx, sx, sy, b, t) {
    const sz = b.size;
    ctx.fillStyle = b._typeData.color;
    ctx.beginPath(); ctx.ellipse(sx, sy, sz*0.42, sz*0.5, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#e8f0ff';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(sx + i*6, sy - sz*0.2);
      ctx.lineTo(sx + i*6 - 2, sy - sz*0.5);
      ctx.lineTo(sx + i*6 + 2, sy - sz*0.5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#80c0ff';
    ctx.fillRect(sx - 5, sy - 4, 3, 3);
    ctx.fillRect(sx + 2, sy - 4, 3, 3);
    drawBossAura(ctx, sx, sy, sz, 'rgba(168, 200, 232, 0.3)', t);
  }
  function drawBoss_autumn_lord(ctx, sx, sy, b, t) {
    const sz = b.size;
    ctx.fillStyle = '#5a2810';
    ctx.beginPath(); ctx.ellipse(sx, sy + sz*0.1, sz*0.55, sz*0.4, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = b._typeData.color;
    ctx.beginPath(); ctx.ellipse(sx, sy, sz*0.32, sz*0.42, 0, 0, Math.PI*2); ctx.fill();
    drawBossAura(ctx, sx, sy, sz, 'rgba(232, 128, 56, 0.28)', t);
  }
  function drawBoss_temple_warden(ctx, sx, sy, b, t) {
    const sz = b.size;
    ctx.fillStyle = b._typeData.color;
    ctx.fillRect(sx - sz*0.4, sy - sz*0.5, sz*0.8, sz);
    drawBossAura(ctx, sx, sy, sz, 'rgba(232, 192, 96, 0.3)', t);
  }
  function drawBoss_cave_mother(ctx, sx, sy, b, t) {
    const sz = b.size;
    ctx.fillStyle = b._typeData.color;
    ctx.beginPath(); ctx.arc(sx, sy, sz*0.5, 0, Math.PI*2); ctx.fill();
    drawBossAura(ctx, sx, sy, sz, 'rgba(40, 20, 30, 0.4)', t);
  }
  function drawBoss_wraith_father(ctx, sx, sy, b, t) {
    const sz = b.size;
    for (let i = 3; i > 0; i--) {
      ctx.fillStyle = `rgba(60, 24, 100, ${0.15 + Math.sin(t*1.5 + i)*0.05})`;
      ctx.beginPath(); ctx.arc(sx, sy, sz*0.5 + i*4, 0, Math.PI*2); ctx.fill();
    }
    ctx.fillStyle = b._typeData.color;
    ctx.beginPath(); ctx.arc(sx, sy, sz*0.45, 0, Math.PI*2); ctx.fill();
    drawBossAura(ctx, sx, sy, sz, 'rgba(160, 96, 255, 0.35)', t);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Cloaked-zombie enemy sprite. Hooded silhouette, no visible legs, faint pale face.
  // ─────────────────────────────────────────────────────────────────────────────
  function drawZombie(ctx, sx, sy, c) {
    const baseColor = c._typeData.color || '#a82828';
    const hoodColor = shade(baseColor, -28);
    const sz = c.size;
    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(sx, sy + sz*0.55, sz*0.45, sz*0.18, 0, 0, Math.PI*2); ctx.fill();
    // Robe — trapezoid widening to ground
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.moveTo(sx - sz*0.22, sy - sz*0.35);
    ctx.lineTo(sx + sz*0.22, sy - sz*0.35);
    ctx.lineTo(sx + sz*0.45, sy + sz*0.55);
    ctx.lineTo(sx - sz*0.45, sy + sz*0.55);
    ctx.closePath(); ctx.fill();
    // Robe shadow side
    ctx.fillStyle = shade(baseColor, -20);
    ctx.beginPath();
    ctx.moveTo(sx, sy - sz*0.35);
    ctx.lineTo(sx + sz*0.22, sy - sz*0.35);
    ctx.lineTo(sx + sz*0.45, sy + sz*0.55);
    ctx.lineTo(sx, sy + sz*0.55);
    ctx.closePath(); ctx.fill();
    // Hood — rounded triangular shape
    ctx.fillStyle = hoodColor;
    ctx.beginPath();
    ctx.moveTo(sx - sz*0.3, sy - sz*0.2);
    ctx.lineTo(sx,          sy - sz*0.6);
    ctx.lineTo(sx + sz*0.3, sy - sz*0.2);
    ctx.lineTo(sx + sz*0.22, sy - sz*0.32);
    ctx.lineTo(sx - sz*0.22, sy - sz*0.32);
    ctx.closePath(); ctx.fill();
    // Pale face hint
    ctx.fillStyle = '#d0a888';
    ctx.beginPath(); ctx.ellipse(sx, sy - sz*0.3, sz*0.13, sz*0.16, 0, 0, Math.PI*2); ctx.fill();
    // Dark eye sockets
    ctx.fillStyle = '#1a0410';
    ctx.fillRect(sx - 3, sy - sz*0.32, 2, 2);
    ctx.fillRect(sx + 1, sy - sz*0.32, 2, 2);
    // HP bar above
    if (c.hp < c.maxHp) WG.Render.drawHpBar(ctx, sx, sy - sz*0.7, Math.max(20, sz+4), c.hp, c.maxHp);
  }

  // Pumpkin-head folk-horror night enemy. matches screenshot_4 night-mode pumpkin head.
  // Large orange jack-o-lantern head, dark stick body; glowing face pulses per-creature
  // so a group doesn't flash in unison.
  function drawPumpkin(ctx, sx, sy, c) {
    const sz = c.size;
    // Glow alpha 0.6–1.0; c.x as phase offset avoids group sync.
    const glow = 0.8 + 0.2 * Math.sin(performance.now() / 280 + c.x * 0.01);
    const headR = sz * 0.46;
    const headCy = sy - sz * 0.3;

    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(sx, sy + sz * 0.68, sz * 0.45, sz * 0.18, 0, 0, Math.PI * 2); ctx.fill();

    // Leg lines — dark stick silhouette below torso
    ctx.strokeStyle = '#1a1410'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(sx - sz * 0.07, sy + sz * 0.35); ctx.lineTo(sx - sz * 0.18, sy + sz * 0.68); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx + sz * 0.07, sy + sz * 0.35); ctx.lineTo(sx + sz * 0.18, sy + sz * 0.68); ctx.stroke();

    // Arm stubs — thin lines from upper torso
    ctx.beginPath(); ctx.moveTo(sx - sz * 0.09, sy + sz * 0.02); ctx.lineTo(sx - sz * 0.36, sy + sz * 0.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx + sz * 0.09, sy + sz * 0.02); ctx.lineTo(sx + sz * 0.36, sy + sz * 0.2); ctx.stroke();

    // Torso — thin dark rectangle
    ctx.fillStyle = '#1a1410';
    ctx.fillRect(sx - sz * 0.1, sy - sz * 0.05, sz * 0.2, sz * 0.4);

    // Pumpkin-orange waist band
    ctx.fillStyle = '#c06018';
    ctx.fillRect(sx - sz * 0.13, sy + sz * 0.13, sz * 0.26, sz * 0.07);

    // Head — large orange pumpkin circle (bigger than torso)
    ctx.fillStyle = '#e07820';
    ctx.beginPath(); ctx.arc(sx, headCy, headR, 0, Math.PI * 2); ctx.fill();

    // Rib lines — 3 darker vertical bezier curves (pumpkin segments)
    ctx.strokeStyle = '#a04810'; ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      const rx = sx + i * headR * 0.46;
      ctx.beginPath();
      ctx.moveTo(rx, headCy - headR * 0.85);
      ctx.bezierCurveTo(rx + i * 2.5, headCy - headR * 0.3, rx + i * 2.5, headCy + headR * 0.3, rx, headCy + headR * 0.85);
      ctx.stroke();
    }

    // Outer halo — f0a020 glow, alpha embedded in gradient so it pulses with glow
    const gr = ctx.createRadialGradient(sx, headCy, headR * 0.35, sx, headCy, headR * 1.15);
    gr.addColorStop(0, `rgba(240,160,32,${glow * 0.38})`);
    gr.addColorStop(1, 'rgba(240,160,32,0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(sx, headCy, headR * 1.15, 0, Math.PI * 2); ctx.fill();

    // Face — glowing, alpha-pulsed (fff080 inner, f0a020 halo above)
    ctx.globalAlpha = glow;
    ctx.fillStyle = '#fff080';

    // Left triangular eye (upward-pointing)
    ctx.beginPath();
    ctx.moveTo(sx - headR * 0.45, headCy - headR * 0.02);
    ctx.lineTo(sx - headR * 0.17, headCy - headR * 0.02);
    ctx.lineTo(sx - headR * 0.31, headCy - headR * 0.35);
    ctx.closePath(); ctx.fill();

    // Right triangular eye
    ctx.beginPath();
    ctx.moveTo(sx + headR * 0.17, headCy - headR * 0.02);
    ctx.lineTo(sx + headR * 0.45, headCy - headR * 0.02);
    ctx.lineTo(sx + headR * 0.31, headCy - headR * 0.35);
    ctx.closePath(); ctx.fill();

    // Jagged mouth — zigzag top edge (4 teeth), flat bottom
    const mL = sx - headR * 0.37, mR = sx + headR * 0.37;
    const mTop = headCy + headR * 0.15, mBot = headCy + headR * 0.42;
    const qw = (mR - mL) / 4;
    ctx.beginPath();
    ctx.moveTo(mL, mTop);
    ctx.lineTo(mL + qw,     mBot);
    ctx.lineTo(mL + qw * 2, mTop);
    ctx.lineTo(mL + qw * 3, mBot);
    ctx.lineTo(mR,           mTop);
    ctx.lineTo(mR,           mBot);
    ctx.lineTo(mL,           mBot);
    ctx.closePath(); ctx.fill();

    ctx.globalAlpha = 1;

    // Stem — small green-brown nub on top of head
    ctx.fillStyle = '#3a3a1a';
    ctx.fillRect(sx - 2, headCy - headR - 5, 4, 6);

    if (c.hp < c.maxHp) WG.Render.drawHpBar(ctx, sx, sy - sz * 0.85, Math.max(20, sz + 4), c.hp, c.maxHp);
  }

  function drawCreatures(ctx) {
    for (const c of runtime.creatures) {
      if (c.hp <= 0) continue;
      const s = w2s(c.x, c.y);
      if (c.type === 'pumpkin_lantern') drawPumpkin(ctx, s.x, s.y, c);
      else drawZombie(ctx, s.x, s.y, c);
    }
    if (runtime.boss && runtime.boss.hp > 0) {
      const b = runtime.boss;
      const s = w2s(b.x, b.y);
      const t = performance.now() / 1000;
      switch (b.type) {
        case 'pale_bride':    drawBoss_pale_bride(ctx, s.x, s.y, b, t); break;
        case 'frozen_crone':  drawBoss_frozen_crone(ctx, s.x, s.y, b, t); break;
        case 'autumn_lord':   drawBoss_autumn_lord(ctx, s.x, s.y, b, t); break;
        case 'temple_warden': drawBoss_temple_warden(ctx, s.x, s.y, b, t); break;
        case 'cave_mother':   drawBoss_cave_mother(ctx, s.x, s.y, b, t); break;
        case 'wraith_father': drawBoss_wraith_father(ctx, s.x, s.y, b, t); break;
        default:
          ctx.fillStyle = b._typeData.color;
          ctx.beginPath(); ctx.arc(s.x, s.y, b.size/2, 0, Math.PI*2); ctx.fill();
      }
      const w = D().width;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(w*0.1, 60, w*0.8, 8);
      ctx.fillStyle = '#d04848';
      ctx.fillRect(w*0.1+1, 61, (w*0.8-2) * (b.hp/b.maxHp), 6);
      ctx.fillStyle = '#f0d890';
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(b._typeData.name, w*0.5, 56);
      ctx.textAlign = 'left';
    }
  }

  function drawProjectiles(ctx) {
    for (const p of runtime.projectiles) {
      const s = w2s(p.x, p.y);
      ctx.fillStyle = p.color || '#ffd870';
      ctx.beginPath(); ctx.arc(s.x, s.y, 3, 0, Math.PI*2); ctx.fill();
    }
    for (const p of runtime.enemyProjectiles) {
      const s = w2s(p.x, p.y);
      ctx.fillStyle = '#e08070';
      ctx.beginPath(); ctx.arc(s.x, s.y, 3, 0, Math.PI*2); ctx.fill();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Player — multi-layer anime-girl sprite. Head, hair, shirt, skirt, legs.
  // V0: facing south (down). Direction-aware sprite is V1.
  // No attack ring — Wood Siege has none.
  // ─────────────────────────────────────────────────────────────────────────────
  function drawAnimeGirl(ctx, sx, sy, weaponRange) {
    // Scythe rotates continuously 360° around the player (Vampire Survivors style).
    // Always-on hit-zone — anything within `weaponRange` gets damaged on the auto-attack
    // tick (governed by player.attackTimer in hunt-player.js). Rotation is purely visual
    // continuity; damage cadence is the cooldown timer.
    const range = weaponRange || 22;
    const t = performance.now() / 1000;
    const ROT_SPEED = 5.0;  // rad/s — fast enough to read as a whirling blade
    const angle = t * ROT_SPEED;
    // Faint reach circle (subtle, not a blocky ring)
    ctx.strokeStyle = 'rgba(232,224,200,0.10)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(sx, sy, range, 0, Math.PI*2); ctx.stroke();
    // Motion trail — ghosted scythe positions trailing behind the live blade
    for (let i = 1; i <= 5; i++) {
      const a = angle - i * 0.13;
      const tx = sx + Math.cos(a) * range;
      const ty = sy + Math.sin(a) * range;
      ctx.fillStyle = `rgba(248, 240, 200, ${0.30 - i * 0.05})`;
      ctx.beginPath();
      ctx.arc(tx, ty, 3.5 - i * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Live scythe — drawn at the leading edge of the rotation
    const wx = sx + Math.cos(angle) * range;
    const wy = sy + Math.sin(angle) * range;
    ctx.save();
    ctx.translate(wx, wy);
    // Orient blade tangent to circle (perpendicular to radial)
    ctx.rotate(angle + Math.PI / 2);
    // Haft (small inward stub)
    ctx.strokeStyle = '#5a4628';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-3, 0);
    ctx.lineTo(8, 0);
    ctx.stroke();
    // Curved scythe blade — sweeps the leading direction
    ctx.strokeStyle = '#f0eee0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(8, -2, 7, Math.PI * 0.4, Math.PI * 1.6, false);
    ctx.stroke();
    ctx.strokeStyle = '#a89c80';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(8, -2, 6, Math.PI * 0.4, Math.PI * 1.6, false);
    ctx.stroke();
    // Tip glint
    ctx.fillStyle = '#ffffe8';
    ctx.beginPath();
    ctx.arc(8 + Math.cos(Math.PI*0.4) * 7, -2 + Math.sin(Math.PI*0.4) * 7, 1.5, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(sx, sy + 14, 9, 3, 0, 0, Math.PI*2); ctx.fill();
    // Legs (skin-tone w/ dark shoes)
    ctx.fillStyle = '#f0c890';
    ctx.fillRect(sx - 4, sy + 4, 3, 8);
    ctx.fillRect(sx + 1, sy + 4, 3, 8);
    ctx.fillStyle = '#1a0a02';
    ctx.fillRect(sx - 4, sy + 11, 3, 2);
    ctx.fillRect(sx + 1, sy + 11, 3, 2);
    // Skirt — dark trapezoid
    ctx.fillStyle = '#1a1018';
    ctx.beginPath();
    ctx.moveTo(sx - 6, sy - 1);
    ctx.lineTo(sx + 6, sy - 1);
    ctx.lineTo(sx + 8, sy + 6);
    ctx.lineTo(sx - 8, sy + 6);
    ctx.closePath(); ctx.fill();
    // Skirt highlight
    ctx.fillStyle = '#2a1e2a';
    ctx.fillRect(sx - 5, sy - 1, 10, 2);
    // Shirt — white/cream rectangle
    ctx.fillStyle = '#f0e8d0';
    ctx.fillRect(sx - 5, sy - 8, 10, 8);
    // Shirt sash detail (red, anime touch)
    ctx.fillStyle = '#a82838';
    ctx.fillRect(sx - 5, sy - 3, 10, 1);
    // Arms
    ctx.fillStyle = '#f0c890';
    ctx.fillRect(sx - 7, sy - 6, 2, 5);
    ctx.fillRect(sx + 5, sy - 6, 2, 5);
    // Head — peach face
    ctx.fillStyle = '#f8d8a8';
    ctx.beginPath(); ctx.arc(sx, sy - 11, 4.5, 0, Math.PI*2); ctx.fill();
    // Hair — long, framing face, behind head
    ctx.fillStyle = '#1a0a06';
    // Back hair (rectangle behind head extending down)
    ctx.fillRect(sx - 5, sy - 14, 10, 8);
    // Side bangs
    ctx.fillRect(sx - 5, sy - 14, 2, 5);
    ctx.fillRect(sx + 3, sy - 14, 2, 5);
    // Top of head (covers crown)
    ctx.beginPath(); ctx.arc(sx, sy - 13, 4, Math.PI, 0, false); ctx.fill();
    // Eyes — small dark dots
    ctx.fillStyle = '#1a0410';
    ctx.fillRect(sx - 2, sy - 11, 1, 1);
    ctx.fillRect(sx + 1, sy - 11, 1, 1);
  }

  function drawPlayer(ctx) {
    const p = runtime.player;
    if (!p) return;
    const s = w2s(p.x, p.y);
    // Pull weapon range from active melee weapon for the spinning-scythe radius
    let weaponRange = 22;
    if (window.WG.HuntWeapons) {
      const meleeId = (p.heldPickupId || WG.State.get().player.slots.melee || 'branch_stick');
      const wep = WG.HuntWeapons.byId(meleeId);
      if (wep && wep.range) weaponRange = wep.range;
    }
    drawAnimeGirl(ctx, s.x, s.y, weaponRange);
    if (p.hp < p.maxHp) WG.Render.drawHpBar(ctx, s.x, s.y - 22, 26, p.hp, p.maxHp);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HUD — basic update for v0. Banner shows "Highest Wave Reached".
  // Avatar mini-portrait + resource counters are V1.
  // ─────────────────────────────────────────────────────────────────────────────
  // HUD — matches Wood Siege HD source (screenshot 3):
  //   Top: "Highest Wave Reached: X/5 Waves" + 5 numbered wave dots
  //   Mid-left: level bar + HP + in-stage coin/wood counters
  //   Mid-right: "Hidden Relic" labeled skill button (DOM, updated externally)
  function drawHud(ctx) {
    const p = runtime.player;
    if (!p) return;
    const w = D().width;

    // Wave indicators — HEXAGONAL dots (HD source §L.3 confirms hex shape, not circle).
    // Pointy-top hexagons, purple/dark base with red glow on active wave.
    const currentWave = (runtime.wave && runtime.wave.index) || 1;
    const totalWaves = (runtime.wave && runtime.wave.total) || 5;
    const hexR = 12, hexGap = 10;
    const totalW = totalWaves * (hexR*2) + (totalWaves-1) * hexGap;
    const startX = w/2 - totalW/2 + hexR;
    function hexPath(cx, cy, r) {
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 3) * k - Math.PI / 2; // pointy-top
        const x = cx + r * Math.cos(a);
        const y = cy + r * Math.sin(a);
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }
    for (let i = 1; i <= totalWaves; i++) {
      const dx = startX + (i-1) * (hexR*2 + hexGap);
      const dy = 88;
      const active = (i === currentWave);
      const cleared = (i < currentWave);
      // Fill — purple-dark base, brighter when active/cleared
      ctx.fillStyle = active ? '#3a1838' : (cleared ? '#4a3850' : '#1a0e1c');
      hexPath(dx, dy, hexR); ctx.fill();
      // Border — red on active, lavender on cleared, dim on pending
      ctx.strokeStyle = active ? '#e84838' : (cleared ? '#b896c8' : '#4a3858');
      ctx.lineWidth = active ? 2 : 1.5;
      hexPath(dx, dy, hexR); ctx.stroke();
      // Number text
      ctx.fillStyle = active ? '#ffe0d0' : (cleared ? '#e8c8e0' : '#7a6878');
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(String(i), dx, dy + 4);
      ctx.textAlign = 'left';
    }

    // Top-left: in-stage resource counters (coin + wood)
    const coins = (runtime.runCoins || 0);
    const wood  = (runtime.runWood  || 0);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(8, 76, 78, 50);
    // Coin
    ctx.fillStyle = '#ffd870';
    ctx.beginPath(); ctx.arc(20, 90, 6, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#a8801c'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(20, 90, 6, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = '#f0e8c8';
    ctx.font = 'bold 12px system-ui';
    ctx.fillText(String(coins), 32, 94);
    // Wood
    ctx.fillStyle = '#8a5828';
    ctx.fillRect(15, 110, 10, 6);
    ctx.fillStyle = '#5a3010';
    ctx.fillRect(15, 110, 10, 2);
    ctx.fillStyle = '#f0e8c8';
    ctx.fillText(String(wood), 32, 117);

    // Mid: level bar (smaller, below wave dots)
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(94, 76, w - 200, 22);
    ctx.fillStyle = '#f0d890';
    ctx.font = 'bold 11px system-ui';
    ctx.fillText('Lv.' + p.level, 100, 91);
    ctx.fillStyle = '#3a3022';
    ctx.fillRect(126, 86, w - 240, 6);
    ctx.fillStyle = '#a8d878';
    ctx.fillRect(126, 86, (w - 240) * (p.xp / p.xpToNext), 6);

    // Player HP indicator (below player sprite, drawn elsewhere). Numeric shown here:
    ctx.fillStyle = '#f0d890';
    ctx.font = '10px system-ui';
    ctx.fillText(Math.ceil(p.hp) + ' / ' + p.maxHp, 100, 124);

    // Top-center banner text: "Highest Wave Reached: X/5 Waves"
    const banner = document.getElementById('hunt-stage-banner');
    if (banner && runtime.stage) {
      const stageId = runtime.stage.id;
      const key = 'wg_hwr_' + stageId;
      let high = 0;
      try { high = parseInt(localStorage.getItem(key) || '0', 10); } catch(e) {}
      if (currentWave - 1 > high) {
        high = currentWave - 1;
        try { localStorage.setItem(key, String(high)); } catch(e) {}
      }
      banner.textContent = `Highest Wave Reached: ${high}/${totalWaves} Waves`;
    }

    // Skill button (DOM): label "Hidden Relic" + cooldown overlay
    const skillBtn = document.getElementById('hunt-skill-btn');
    if (skillBtn) {
      skillBtn.title = 'Hidden Relic';
      if (p.skillReady) {
        skillBtn.style.opacity = '1';
        skillBtn.textContent = '✦';
      } else {
        skillBtn.style.opacity = '0.5';
        skillBtn.textContent = Math.ceil(p.skillCd) + 's';
      }
    }
  }

  function drawLevelUpModal(ctx) {
    if (!runtime.pendingLevelUp) return;
    const w = D().width, h = D().height;
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f0d890';
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('LEVEL UP — Choose a Boon', w/2, h*0.32);
    ctx.textAlign = 'left';
    if (!runtime._luOptions) {
      const all = ['dmg', 'cd', 'maxhp', 'pickup', 'speed'];
      runtime._luOptions = [...all].sort(() => Math.random() - 0.5).slice(0, 3);
    }
    const labels = {
      dmg: ['+ Damage',   'Stronger swings'],
      cd: ['+ Speed',     'Attack faster'],
      maxhp: ['+ Vigor',  'More HP'],
      pickup: ['+ Reach', 'Wider pickup'],
      speed: ['+ Pace',   'Move faster'],
    };
    const cardW = (w - 40) / 3, cardH = 100, top = h * 0.4;
    runtime._luBounds = [];
    for (let i = 0; i < runtime._luOptions.length; i++) {
      const id = runtime._luOptions[i];
      const x = 16 + i * (cardW + 4);
      ctx.fillStyle = '#2a1c10';
      ctx.fillRect(x, top, cardW, cardH);
      ctx.strokeStyle = '#806040'; ctx.strokeRect(x+0.5, top+0.5, cardW-1, cardH-1);
      ctx.fillStyle = '#f0d890';
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(labels[id][0], x + cardW/2, top + 44);
      ctx.font = '10px system-ui';
      ctx.fillStyle = '#c8a868';
      ctx.fillText(labels[id][1], x + cardW/2, top + 66);
      ctx.textAlign = 'left';
      runtime._luBounds.push({ id, x, y: top, w: cardW, h: cardH });
    }
  }

  function handleHuntTap(clientX, clientY) {
    if (!runtime.pendingLevelUp || !runtime._luBounds) return false;
    for (const b of runtime._luBounds) {
      if (clientX >= b.x && clientX <= b.x + b.w && clientY >= b.y && clientY <= b.y + b.h) {
        WG.HuntPlayer.applyLevelChoice(b.id);
        runtime._luOptions = null;
        runtime._luBounds = null;
        return true;
      }
    }
    return false;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Frame composition.
  // ─────────────────────────────────────────────────────────────────────────────
  function drawFrame() {
    if (!runtime || !runtime.stage) return;
    const ctx = D().ctx;
    const biome = WG.HuntStage.getBiome(runtime.stage.biome);
    updateCamera();
    const props = getStageProps(runtime.stage);

    WG.Render.clear(ctx, biome.ground);

    // World rendering — zoomed by ZOOM factor (closer to player, like Wood Siege HD)
    ctx.save();
    ctx.scale(ZOOM, ZOOM);
    drawTiles(ctx, biome);
    drawPineForest(ctx);
    drawCampfireLight(ctx, props);
    drawConstructionSites(ctx, props);
    drawStumps(ctx, props);
    drawCaves(ctx, props);
    drawCampfireFlame(ctx, props);
    drawDrops(ctx);
    if (window.WG.HuntPickups) WG.HuntPickups.draw(ctx, w2s, runtime);
    drawCreatures(ctx);
    drawProjectiles(ctx);
    drawPlayer(ctx);
    WG.Render.drawParticles(ctx, w2s);
    ctx.restore();

    // Screen-space overlays — HUD, fog, modals (drawn at native scale)
    if (biome.lightFog > 0) {
      ctx.fillStyle = `rgba(0,0,0,${biome.lightFog})`;
      ctx.fillRect(0, 0, D().width, D().height);
    }
    drawEdgePulse(ctx);
    drawHud(ctx);
    drawLevelUpModal(ctx);
  }

  function init() {
    const skillBtn = document.getElementById('hunt-skill-btn');
    if (skillBtn) skillBtn.addEventListener('click', () => WG.Input.triggerSkill());
    D().canvas.addEventListener('pointerdown', (e) => {
      if (WG.State.get().activeTab !== 'hunt') return;
      if (handleHuntTap(e.clientX, e.clientY)) e.stopImmediatePropagation();
    }, true);

    WG.Engine.on('enemy:killed', ({ creature }) => {
      for (let i = 0; i < 8; i++)
        WG.Render.spawnParticles({ x: creature.x, y: creature.y, life: 0.5, color: creature._typeData.accent || '#a82828', size: 2 });
    });
    WG.Engine.on('player:swing', () => {
      const p = runtime && runtime.player; if (!p) return;
      for (let i = 0; i < 4; i++)
        WG.Render.spawnParticles({ x: p.x, y: p.y, life: 0.25, color: '#f0e0a0', size: 2 });
    });
    WG.Engine.on('stump:hit', ({ stump }) => {
      // Wood-chip particle burst at the stump
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * Math.PI * 2;
        WG.Render.spawnParticles({
          x: stump.x + Math.cos(a) * stump.r * 0.7,
          y: stump.y + Math.sin(a) * stump.r * 0.5,
          angle: a, speed: 70 + Math.random() * 60,
          life: 0.45, color: '#c89058', size: 2,
        });
      }
    });
    WG.Engine.on('stump:chopped', ({ stump }) => {
      // Bigger burst on full chop — wood pieces fly out
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2;
        WG.Render.spawnParticles({
          x: stump.x, y: stump.y,
          angle: a, speed: 100 + Math.random() * 80,
          life: 0.7, color: i % 2 === 0 ? '#a06028' : '#5a3010', size: 3,
        });
      }
    });
    WG.Engine.on('boss:spawned', ({ boss }) => {
      pulseEdges(boss._typeData.accent + '88', 0.7, 600);
      for (let i = 0; i < 20; i++) {
        const a = Math.PI*2*(i/20);
        WG.Render.spawnParticles({
          x: boss.x + Math.cos(a)*20, y: boss.y + Math.sin(a)*20,
          angle: a, speed: 100,
          life: 0.7, color: boss._typeData.color, size: 3,
        });
      }
    });
    WG.Engine.on('player:skill', ({ radius }) => {
      const p = runtime && runtime.player; if (!p) return;
      for (let i = 0; i < 24; i++) {
        const a = Math.PI*2*(i/24);
        WG.Render.spawnParticles({ x: p.x + Math.cos(a)*radius*0.4, y: p.y + Math.sin(a)*radius*0.4, life: 0.5, color: '#fff0c0', size: 3 });
      }
    });
    WG.Engine.on('player:damaged', () => {
      if (WG.Haptics) WG.Haptics.impact('medium');
    });
    WG.Engine.on('boss:defeated', () => {
      if (WG.Haptics) WG.Haptics.impact('heavy');
    });
  }

  // Expose getStageProps so hunt-player can damage stumps on swing.
  window.WG.HuntRender = { init, drawFrame, setRuntime, w2s, getStageProps };
})();
