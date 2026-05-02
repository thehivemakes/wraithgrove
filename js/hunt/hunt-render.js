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
  // Trauma-based screen shake (DOPAMINE_DESIGN §9 / Eiserloh GDC 2016).
  // shake = trauma², decays ~1.4/sec, max 18px offset + 0.04 rad rotation.
  let _trauma = 0;
  let _shakeLastMs = performance.now();
  // Player swing squash timestamp (DOPAMINE_DESIGN §9 sprite techniques).
  let _lastSwingAt = 0;

  // SPEC §0 — Night Mode lighting. Overlay alpha eases with (1 - torchAmount).
  // Holes carved at player + every built campfire via destination-out compositing.
  // Constants in world units (radii) and seconds (time-bases).
  const NIGHT_OVERLAY_TOP        = '#02010a';   // sky band — deepest indigo
  const NIGHT_OVERLAY_MID        = '#0a0818';   // horizon — slight warmth
  const NIGHT_MAX_ALPHA          = 0.93;        // never fully opaque — keep fight legible
  const NIGHT_PLAYER_LIGHT_R     = 80;          // SPEC §0: ~80px world units around player
  const NIGHT_CAMPFIRE_LIGHT_R   = 140;         // SPEC §0: ~140px around any built campfire
  const NIGHT_PLAYER_FLICKER     = 3;           // amplitude (world units) of torch breathing
  const NIGHT_CAMPFIRE_FLICKER   = 6;           // amplitude (world units) of bonfire pulse

  function _easeInOutCubic(t) {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;
  }

  function addTrauma(amt) { _trauma = Math.min(1, _trauma + amt); }

  // W-FX-Polish-Pass — gap 2: HUD pill ghost track. When a buff expires or is
  // consumed, push a ghost entry that desaturates and fades over 280ms instead
  // of snap-removing. The active list (WG.Buffs.list()) prunes the buff
  // immediately, so without this the pill just vanished mid-frame.
  const BUFF_GHOST_DUR_MS = 280;
  const _buffGhosts = []; // { id, short, expiredAt }
  let _lastFrameMs = 0;

  // HUD counter pulse — DOPAMINE_DESIGN §1+§2: counter scale-bounce + tint on increment.
  const HUD_PULSE_DUR_MS    = 280;
  const HUD_PULSE_SCALE_AMP = 0.35;
  const HUD_PULSE_TINT      = '#ffe888';
  const _hudPulse = {
    wood: { val: 0, ts: 0 },
    gold: { val: 0, ts: 0 },
    xp:   { val: 0, ts: 0 },
  };
  function _hudMixHex(a, b, t) {
    const ar=parseInt(a.slice(1,3),16), ag=parseInt(a.slice(3,5),16), ab=parseInt(a.slice(5,7),16);
    const br=parseInt(b.slice(1,3),16), bg=parseInt(b.slice(3,5),16), bb=parseInt(b.slice(5,7),16);
    const r=Math.round(ar+(br-ar)*t), g=Math.round(ag+(bg-ag)*t), bl=Math.round(ab+(bb-ab)*t);
    return 'rgb('+r+','+g+','+bl+')';
  }
  function _hudPulseStyle(key, baseColor) {
    const entry = _hudPulse[key];
    if (!entry || !entry.ts) return { scale: 1, color: baseColor };
    const k = (performance.now() - entry.ts) / HUD_PULSE_DUR_MS;
    if (k >= 1 || k < 0) return { scale: 1, color: baseColor };
    const scale = 1 + HUD_PULSE_SCALE_AMP * Math.sin(k * Math.PI);
    return { scale, color: _hudMixHex(baseColor, HUD_PULSE_TINT, 1 - k) };
  }
  function _hudDrawScaled(ctx, cx, cy, scale, drawFn) {
    if (scale === 1) { drawFn(); return; }
    ctx.save(); ctx.translate(cx, cy); ctx.scale(scale, scale); ctx.translate(-cx, -cy);
    drawFn();
    ctx.restore();
  }
  function _hudBumpCache(woodNow, goldNow, xpNow) {
    const tNow = performance.now();
    if (woodNow > _hudPulse.wood.val) { _hudPulse.wood.ts = tNow; }
    if (woodNow !== _hudPulse.wood.val) _hudPulse.wood.val = woodNow;
    if (goldNow > _hudPulse.gold.val) { _hudPulse.gold.ts = tNow; }
    if (goldNow !== _hudPulse.gold.val) _hudPulse.gold.val = goldNow;
    if (xpNow > _hudPulse.xp.val)     { _hudPulse.xp.ts = tNow; }
    if (xpNow !== _hudPulse.xp.val) _hudPulse.xp.val = xpNow; // resets on level-up
  }

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

  function setRuntime(rt) {
    runtime = rt; _stagePropsCache = {};
    _hudPulse.wood.val = 0; _hudPulse.wood.ts = 0;
    _hudPulse.gold.val = 0; _hudPulse.gold.ts = 0;
    _hudPulse.xp.val   = 0; _hudPulse.xp.ts   = 0;
  }

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
      { x: cxBase - 110, y: cyBase - 10,  type: 'turret',   name: 'Turret',   have: 0, need: 4,  built: false, drainTimer: 0 },
      { x: cxBase + 110, y: cyBase - 10,  type: 'turret',   name: 'Turret',   have: 0, need: 4,  built: false, drainTimer: 0 },
      { x: cxBase - 110, y: cyBase + 90,  type: 'turret',   name: 'Turret',   have: 0, need: 4,  built: false, drainTimer: 0 },
      { x: cxBase + 110, y: cyBase + 90,  type: 'turret',   name: 'Turret',   have: 0, need: 4,  built: false, drainTimer: 0 },
      { x: cxBase + 70,  y: cyBase + 30,  type: 'campfire', name: 'Campfire', have: 0, need: 30, built: false, drainTimer: 0 },
    ];

    // DENSE forest covering the ENTIRE map on a jittered grid (Wood Siege register —
    // map is uniform forest, player chops INTO it to expand the playable clearing).
    // Skip cells within initial spawn clearing + building footprints.
    const stumps = [];
    const TREE_SPACING = 22;       // tighter than 30 — Architect: 'denser, darker'
    const initialClearingR = 80;   // small clearing around spawn so player can move
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
    // Foliage — three stacked triangles, darker than before per Architect feedback
    ctx.fillStyle = '#0a1c0a';
    ctx.beginPath(); ctx.moveTo(sx + 11, sy + 0);  ctx.lineTo(sx + 2,  sy + 14); ctx.lineTo(sx + 20, sy + 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#102810';
    ctx.beginPath(); ctx.moveTo(sx + 11, sy + 8);  ctx.lineTo(sx,      sy + 22); ctx.lineTo(sx + 22, sy + 22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#143018';
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
    // Foliage — 3 stacked triangles, sized by hash, brighter on hit.
    // Architect: 'darker' — pulled green channels down ~12 across the board.
    // DOPAMINE_DESIGN §9 — bumped flash factor from 30→48 for cleaner pop.
    const flashBoost = flash * 48;
    ctx.fillStyle = `rgb(${10 + flashBoost},${32 + flashBoost*1.5},${14 + flashBoost})`;
    ctx.beginPath(); ctx.moveTo(sx, sy - 33); ctx.lineTo(sx - 9, sy - 19); ctx.lineTo(sx + 9, sy - 19); ctx.closePath(); ctx.fill();
    ctx.fillStyle = `rgb(${14 + flashBoost},${40 + flashBoost*1.5},${16 + flashBoost})`;
    ctx.beginPath(); ctx.moveTo(sx, sy - 25); ctx.lineTo(sx - 11, sy - 11); ctx.lineTo(sx + 11, sy - 11); ctx.closePath(); ctx.fill();
    ctx.fillStyle = `rgb(${18 + flashBoost},${48 + flashBoost*1.5},${22 + flashBoost})`;
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
    const playerX = runtime.player ? runtime.player.x : -9999;
    const playerY = runtime.player ? runtime.player.y : -9999;
    for (const c of props.constructions) {
      if (c.built) continue;  // built sites are drawn by drawBuiltStructures
      const s = w2s(c.x, c.y);
      if (s.x < -60 || s.x > D().width + 60 || s.y < -60 || s.y > D().height + 60) continue;
      const r = 28;
      // Player-on-circle highlight: brighter ring + warmer fill when within radius
      const dx = playerX - c.x, dy = playerY - c.y;
      const onCircle = (dx*dx + dy*dy) < r * r;
      // Dashed circle outline
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = -t * 8;
      ctx.strokeStyle = onCircle ? 'rgba(255, 224, 120, 1.0)' : 'rgba(232, 224, 200, 0.85)';
      ctx.lineWidth = onCircle ? 2.5 : 1.5;
      ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      // Subtle tint inside
      ctx.fillStyle = onCircle ? 'rgba(255, 224, 120, 0.18)' : 'rgba(232, 224, 200, 0.06)';
      ctx.beginPath(); ctx.arc(s.x, s.y, r - 1, 0, Math.PI * 2); ctx.fill();
      // Progress fill — pie slice based on have/need
      if (c.have > 0) {
        const frac = Math.min(1, c.have / c.need);
        ctx.fillStyle = 'rgba(120, 220, 120, 0.30)';
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.arc(s.x, s.y, r - 2, -Math.PI/2, -Math.PI/2 + frac * Math.PI * 2);
        ctx.closePath();
        ctx.fill();
      }
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

  // Built structures — draw turrets / campfires that have been completed.
  // Construction tick (in hunt-player) consumes wood while player stands on a
  // dashed-circle slot; once have >= need, sets c.built = true and emits
  // construction:built. Built turrets render here with a small wagon+cannon
  // sprite. Built campfire sites adopt the existing campfire flame + light.
  function drawBuiltStructures(ctx, props) {
    if (!props.constructions) return;
    const t = performance.now() / 1000;
    for (const c of props.constructions) {
      if (!c.built) continue;
      const s = w2s(c.x, c.y);
      if (s.x < -60 || s.x > D().width + 60 || s.y < -60 || s.y > D().height + 60) continue;
      if (c.type === 'turret') {
        // Drop shadow
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath(); ctx.ellipse(s.x, s.y + 12, 18, 5, 0, 0, Math.PI*2); ctx.fill();
        // Wagon base (brown wood plank platform)
        ctx.fillStyle = '#6a3818';
        ctx.fillRect(s.x - 14, s.y - 2, 28, 12);
        ctx.strokeStyle = '#3a1c08'; ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(s.x - 14, s.y - 2 + i*4 + 2);
          ctx.lineTo(s.x + 14, s.y - 2 + i*4 + 2);
          ctx.stroke();
        }
        // Wheels
        ctx.fillStyle = '#1a0a02';
        ctx.beginPath(); ctx.arc(s.x - 11, s.y + 11, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(s.x + 11, s.y + 11, 3, 0, Math.PI*2); ctx.fill();
        // Cannon barrel — points along c.aimAngle. atan2 returns 0=east; canvas
        // rotate is clockwise from up, so canvas rotation = aimAngle + PI/2.
        // (HuntTurret keeps c.aimAngle smoothly lerped toward the live target.)
        const aimWorld = (typeof c.aimAngle === 'number') ? c.aimAngle : -Math.PI / 2;
        const aimCanvas = aimWorld + Math.PI / 2;
        ctx.save();
        ctx.translate(s.x, s.y - 2);
        ctx.rotate(aimCanvas);
        ctx.fillStyle = '#4a4438';
        ctx.fillRect(-2, -14, 4, 14);
        ctx.fillStyle = '#7a7468';
        ctx.fillRect(-2, -16, 4, 2);  // muzzle
        ctx.restore();
        // Faint muzzle glow at the muzzle tip — pulses gently.
        const muzzleX = s.x + Math.cos(aimWorld) * 14;
        const muzzleY = s.y - 2 + Math.sin(aimWorld) * 14;
        ctx.fillStyle = `rgba(255, 200, 80, ${0.3 + Math.sin(t * 4) * 0.15})`;
        ctx.beginPath();
        ctx.arc(muzzleX, muzzleY, 3, 0, Math.PI*2);
        ctx.fill();
        // HP bar — only when damaged. Width 26, height 3, sits 12px above the
        // wagon. Animated via c._hpDisplayed (lerped in HuntTurret.tickOne) so
        // damage reads as a smooth sweep instead of a snap.
        if (typeof c.hp === 'number' && c.hp < (c.maxHp || c.hp)) {
          const barW = 26, barH = 3;
          const barX = s.x - barW / 2;
          const barY = s.y - 16;
          const dispHp = (typeof c._hpDisplayed === 'number') ? c._hpDisplayed : c.hp;
          const frac = Math.max(0, Math.min(1, dispHp / c.maxHp));
          // Background
          ctx.fillStyle = 'rgba(20, 12, 8, 0.85)';
          ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
          // Damage taken (lighter red, behind fill — shows as shrinking sweep)
          ctx.fillStyle = '#a02020';
          ctx.fillRect(barX, barY, barW, barH);
          // Current HP — green→yellow→red as health drops
          const hue = 120 * frac; // 120=green, 0=red
          ctx.fillStyle = `hsl(${hue}, 75%, 50%)`;
          ctx.fillRect(barX, barY, barW * frac, barH);
        }
      }
      // Campfire built sites: handled by drawCampfireLight + drawCampfireFlame
      // which iterate props.fires; the construction tick should push the fire
      // when c.built becomes true. Render-side no-op here.
    }
  }

  // W-Turret-And-Campfire-Combat — faint pulsing ring on the ground showing
  // the campfire's HP-regen radius. Reads radius from HuntTurret.TUNABLES so
  // there's a single source of truth (no hardcoded 60). Highlights brighter
  // when the player is actually inside (so the player sees "I'm regenerating").
  function drawCampfireRegenRings(ctx, props) {
    if (!props.constructions) return;
    if (!window.WG.HuntTurret || !WG.HuntTurret.TUNABLES) return;
    const radius = WG.HuntTurret.TUNABLES.CAMPFIRE_REGEN_RADIUS;
    const t = performance.now() / 1000;
    const px = runtime.player ? runtime.player.x : -9999;
    const py = runtime.player ? runtime.player.y : -9999;
    for (const c of props.constructions) {
      if (!c.built || c.type !== 'campfire') continue;
      const s = w2s(c.x, c.y);
      if (s.x < -radius - 60 || s.x > D().width + radius + 60 ||
          s.y < -radius - 60 || s.y > D().height + radius + 60) continue;
      const dx = px - c.x, dy = py - c.y;
      const inside = (dx*dx + dy*dy) <= radius * radius;
      const pulse = 0.5 + 0.5 * Math.sin(t * 2 + c.x * 0.013);
      // Faint filled circle on ground (hp regen "aura").
      const baseAlpha = inside ? 0.12 : 0.05;
      ctx.fillStyle = `rgba(150, 230, 160, ${baseAlpha + pulse * 0.05})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, radius, 0, Math.PI*2); ctx.fill();
      // Pulsing outline ring.
      ctx.strokeStyle = `rgba(180, 240, 180, ${(inside ? 0.55 : 0.30) + pulse * 0.20})`;
      ctx.lineWidth = inside ? 2 : 1.2;
      ctx.setLineDash([5, 6]);
      ctx.lineDashOffset = -t * 12;
      ctx.beginPath(); ctx.arc(s.x, s.y, radius, 0, Math.PI*2); ctx.stroke();
      ctx.setLineDash([]);
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

  // SPEC §0 — Night Mode overlay. Screen-space dark fill with light holes carved
  // at the player + every built campfire. Drawn AFTER world restore so it sits in
  // pure screen space (avoids trauma-shake banding from a transformed fillRect).
  // Hole positions use w2s + ZOOM so they track the camera without trauma jitter —
  // intentional: world shakes around a steady torch.
  //
  // Edge cases:
  //   - torchAmount undefined (Concern A standalone) → defaults to 1.0 → no overlay.
  //   - Player exactly on campfire boundary → soft radial gradient, no hard edge.
  //   - Multiple campfires overlap → each destination-out draw subtracts; overlapping
  //     gradients compound naturally (brighter overlap, no clipping artifacts).
  //   - Mode switched mid-tick → top-of-function guard: returns immediately if not 'night'.
  function drawNightOverlay(ctx) {
    if (!runtime || runtime.mode !== 'night') return;
    const p = runtime.player;
    const torchRaw = (p && typeof p.torchAmount === 'number') ? p.torchAmount : 1.0;
    const torch = Math.max(0, Math.min(1, torchRaw));
    // Smooth ease (Architect: not linear stair-step). Cubic in/out gives a slow
    // initial darkening that accelerates through the danger zone.
    const darkness = _easeInOutCubic(1 - torch);
    if (darkness <= 0.001) return;

    const W = D().width, H = D().height;
    const t = performance.now() / 1000;

    ctx.save();
    ctx.globalAlpha = darkness * NIGHT_MAX_ALPHA;

    // Considered overlay — vertical gradient with deeper indigo at top + horizon,
    // slightly warmer mid-band (folk-horror register, not flat black).
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0,    NIGHT_OVERLAY_TOP);
    skyGrad.addColorStop(0.55, NIGHT_OVERLAY_MID);
    skyGrad.addColorStop(1,    NIGHT_OVERLAY_TOP);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // Subtle vignette dim at corners (tunnel-vision in the dark).
    const vmid = Math.max(W, H);
    const vGrad = ctx.createRadialGradient(W/2, H/2, vmid * 0.30, W/2, H/2, vmid * 0.85);
    vGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vGrad.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 0, W, H);

    // Carve light holes — destination-out subtracts alpha from the dark fill.
    ctx.globalCompositeOperation = 'destination-out';

    // Player torch hole (always carved when overlay is up — even if hp=0, the
    // body still has a faint glow). Two-frequency flicker reads as living flame.
    if (p) {
      const ps = w2s(p.x, p.y);
      const sx = ps.x * ZOOM, sy = ps.y * ZOOM;
      const flick =
        Math.sin(t * 7.3) * NIGHT_PLAYER_FLICKER +
        Math.sin(t * 13.1 + 1.7) * NIGHT_PLAYER_FLICKER * 0.4;
      const pr = (NIGHT_PLAYER_LIGHT_R + flick) * ZOOM;
      const grad = ctx.createRadialGradient(sx, sy, pr * 0.18, sx, sy, pr);
      grad.addColorStop(0,    'rgba(0,0,0,1)');
      grad.addColorStop(0.55, 'rgba(0,0,0,0.85)');
      grad.addColorStop(1,    'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(sx, sy, pr, 0, Math.PI*2); ctx.fill();
    }

    // Campfire holes — props.fires preferred (built-campfire-tick pushes fire
    // entities onto props.fires; see hunt-player.js constructionTick). Fallback
    // to filtering constructions if a stage somehow has no fires array yet.
    if (runtime.stage) {
      const props = getStageProps(runtime.stage);
      let fires = props.fires;
      if (!fires || fires.length === 0) {
        if (props.constructions) {
          fires = props.constructions.filter(c => c.built && c.type === 'campfire');
        }
      }
      if (fires) {
        for (const f of fires) {
          const fs = w2s(f.x, f.y);
          const fx = fs.x * ZOOM, fy = fs.y * ZOOM;
          const fphase = (typeof f.flicker === 'number') ? f.flicker : 0;
          const ff =
            Math.sin(t * 4.7 + fphase) * NIGHT_CAMPFIRE_FLICKER +
            Math.sin(t * 9.2 + fphase * 1.7) * NIGHT_CAMPFIRE_FLICKER * 0.3;
          const fr = (NIGHT_CAMPFIRE_LIGHT_R + ff) * ZOOM;
          const fgrad = ctx.createRadialGradient(fx, fy, fr * 0.12, fx, fy, fr);
          fgrad.addColorStop(0,    'rgba(0,0,0,1)');
          fgrad.addColorStop(0.5,  'rgba(0,0,0,0.88)');
          fgrad.addColorStop(1,    'rgba(0,0,0,0)');
          ctx.fillStyle = fgrad;
          ctx.beginPath(); ctx.arc(fx, fy, fr, 0, Math.PI*2); ctx.fill();
        }
      }
    }

    ctx.restore();
  }

  function drawDrops(ctx) {
    for (const d of runtime.drops) {
      const s = w2s(d.x, d.y);
      if (d.type === 'orb') {
        ctx.fillStyle = '#80d0ff';
        ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, Math.PI*2); ctx.fill();
      } else if (d.type === 'coin') {
        ctx.fillStyle = '#ffd870'; ctx.fillRect(s.x-3, s.y-3, 6, 6);
      } else if (d.type === 'wood') {
        ctx.fillStyle = '#a06028'; ctx.fillRect(s.x-3, s.y-2, 6, 4);
        ctx.fillStyle = '#5a3010'; ctx.fillRect(s.x-3, s.y-2, 6, 1);
      } else if (d.type === 'fragment') {
        ctx.fillStyle = '#e0a8ff';
        ctx.beginPath(); ctx.moveTo(s.x, s.y-4); ctx.lineTo(s.x+4, s.y); ctx.lineTo(s.x, s.y+4); ctx.lineTo(s.x-4, s.y); ctx.closePath(); ctx.fill();
      } else if (d.type === 'torch') {
        // SPEC §0 — Field Torch drop. Small flickering orange flame on a stick,
        // scaled-down version of drawCampfireFlame's two-triangle flame logic
        // with a per-drop seed so adjacent torches don't pulse in lockstep.
        const tt = performance.now() / 1000;
        const seed = (typeof d._flickerSeed === 'number') ? d._flickerSeed : 0;
        const flick = Math.sin(tt * 8 + seed) * 0.7 + Math.sin(tt * 14 + seed * 1.7) * 0.3;
        // Stick (haft)
        ctx.fillStyle = '#5a3010';
        ctx.fillRect(s.x - 0.5, s.y - 1, 1, 5);
        // Outer flame
        ctx.fillStyle = '#f87018';
        ctx.beginPath();
        ctx.moveTo(s.x - 2, s.y - 1);
        ctx.lineTo(s.x,     s.y - 5 + flick);
        ctx.lineTo(s.x + 2, s.y - 1);
        ctx.closePath(); ctx.fill();
        // Inner core
        ctx.fillStyle = '#fcc848';
        ctx.beginPath();
        ctx.moveTo(s.x - 1, s.y - 2);
        ctx.lineTo(s.x,     s.y - 4 + flick * 0.6);
        ctx.lineTo(s.x + 1, s.y - 2);
        ctx.closePath(); ctx.fill();
        // Subtle warm glow ring
        const gr = 6 + flick * 0.3;
        const grad = ctx.createRadialGradient(s.x, s.y - 3, 1, s.x, s.y - 3, gr);
        grad.addColorStop(0, 'rgba(255, 200, 96, 0.50)');
        grad.addColorStop(1, 'rgba(255, 160, 48, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(s.x, s.y - 3, gr, 0, Math.PI*2); ctx.fill();
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Boss draws — every boss is a HUMANOID FIGURE first (head + robe + arms),
  // not a colored shape. Identity comes from cloak color, headpiece, and
  // accessory (sash / crown / antlers / staff / many-eyes / aura). All bosses
  // share the same hit-flash + wobble FX as regular enemies, plus their per-
  // identity drawBossAura halo. Caller passes `t = performance.now()/1000`.
  // ─────────────────────────────────────────────────────────────────────────────
  function _bossHitFx(b) {
    // Bosses use the same _lastDamageAt timestamp the enemy:damaged emit sets.
    return _creatureHitFx(b);
  }
  function _bossDropShadow(ctx, sx, sy, sz) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.ellipse(sx, sy + sz*0.55, sz*0.55, sz*0.18, 0, 0, Math.PI*2); ctx.fill();
  }
  function _bossFlash(ctx, sx, sy, sz, fx) {
    if (fx.flash <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fx.flash;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(sx, sy - sz*0.1, sz*0.6, sz*0.7, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // Pale Bride — long white wedding-veil silhouette, dark eyes, red bridal sash.
  function drawBoss_pale_bride(ctx, sx, sy, b, t) {
    const fx = _bossHitFx(b); sx += fx.wobble;
    const sz = b.size;
    drawBossAura(ctx, sx, sy, sz, 'rgba(248, 240, 224, 0.28)', t);
    _bossDropShadow(ctx, sx, sy, sz);
    // Long bridal gown — wide bottom trapezoid in cream
    ctx.fillStyle = '#e8e0c8';
    ctx.beginPath();
    ctx.moveTo(sx - sz*0.30, sy - sz*0.10);
    ctx.lineTo(sx + sz*0.30, sy - sz*0.10);
    ctx.lineTo(sx + sz*0.55, sy + sz*0.55);
    ctx.lineTo(sx - sz*0.55, sy + sz*0.55);
    ctx.closePath(); ctx.fill();
    // Subtle vertical pleats in shadow tone
    ctx.strokeStyle = '#c8c0a8'; ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(sx + i * sz*0.10, sy - sz*0.05);
      ctx.lineTo(sx + i * sz*0.18, sy + sz*0.50);
      ctx.stroke();
    }
    // Red bridal sash diagonal across torso
    ctx.fillStyle = '#a01818';
    ctx.beginPath();
    ctx.moveTo(sx - sz*0.30, sy + sz*0.05);
    ctx.lineTo(sx + sz*0.30, sy - sz*0.06);
    ctx.lineTo(sx + sz*0.32, sy + sz*0.02);
    ctx.lineTo(sx - sz*0.28, sy + sz*0.13);
    ctx.closePath(); ctx.fill();
    // Pale face
    ctx.fillStyle = '#f4ecd8';
    ctx.beginPath(); ctx.ellipse(sx, sy - sz*0.28, sz*0.16, sz*0.20, 0, 0, Math.PI*2); ctx.fill();
    // Dark hollow eyes
    ctx.fillStyle = '#1a0828';
    ctx.fillRect(sx - sz*0.09, sy - sz*0.32, sz*0.06, sz*0.05);
    ctx.fillRect(sx + sz*0.03, sy - sz*0.32, sz*0.06, sz*0.05);
    // Long flowing veil — translucent white drape behind, 2 layers
    ctx.fillStyle = 'rgba(248, 240, 224, 0.55)';
    ctx.beginPath();
    ctx.moveTo(sx - sz*0.34, sy - sz*0.34);
    ctx.lineTo(sx + sz*0.34, sy - sz*0.34);
    ctx.lineTo(sx + sz*0.50, sy + sz*0.40);
    ctx.lineTo(sx - sz*0.50, sy + sz*0.40);
    ctx.closePath(); ctx.fill();
    // Crown of white blossoms at brow line
    ctx.fillStyle = '#ffffff';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.arc(sx + i * sz*0.10, sy - sz*0.46, 2.5, 0, Math.PI*2); ctx.fill();
    }
    _bossFlash(ctx, sx, sy, sz, fx);
  }

  // Frozen Crone — ice-blue robe, jagged ice-crown.
  function drawBoss_frozen_crone(ctx, sx, sy, b, t) {
    const fx = _bossHitFx(b); sx += fx.wobble;
    const sz = b.size;
    drawBossAura(ctx, sx, sy, sz, 'rgba(168, 200, 232, 0.32)', t);
    _bossDropShadow(ctx, sx, sy, sz);
    // Robe — pale ice-blue trapezoid
    ctx.fillStyle = '#7090b0';
    ctx.beginPath();
    ctx.moveTo(sx - sz*0.28, sy - sz*0.15);
    ctx.lineTo(sx + sz*0.28, sy - sz*0.15);
    ctx.lineTo(sx + sz*0.50, sy + sz*0.55);
    ctx.lineTo(sx - sz*0.50, sy + sz*0.55);
    ctx.closePath(); ctx.fill();
    // Robe shadow side
    ctx.fillStyle = '#506880';
    ctx.beginPath();
    ctx.moveTo(sx, sy - sz*0.15);
    ctx.lineTo(sx + sz*0.28, sy - sz*0.15);
    ctx.lineTo(sx + sz*0.50, sy + sz*0.55);
    ctx.lineTo(sx, sy + sz*0.55);
    ctx.closePath(); ctx.fill();
    // Frost-rimed hem (lighter blue-white sparkle line)
    ctx.fillStyle = '#d8e8ff';
    ctx.fillRect(sx - sz*0.50, sy + sz*0.50, sz*1.0, sz*0.05);
    // Hunched arms — wide cuff sleeves coming forward
    ctx.fillStyle = '#506880';
    ctx.fillRect(sx - sz*0.40, sy - sz*0.05, sz*0.16, sz*0.30);
    ctx.fillRect(sx + sz*0.24, sy - sz*0.05, sz*0.16, sz*0.30);
    // Pale gnarled face under the hood-shadow
    ctx.fillStyle = '#c8d8e8';
    ctx.beginPath(); ctx.ellipse(sx, sy - sz*0.30, sz*0.16, sz*0.20, 0, 0, Math.PI*2); ctx.fill();
    // Glowing ice-blue eyes
    ctx.fillStyle = '#a8e0ff';
    ctx.fillRect(sx - sz*0.09, sy - sz*0.32, sz*0.05, sz*0.04);
    ctx.fillRect(sx + sz*0.04, sy - sz*0.32, sz*0.05, sz*0.04);
    // Jagged ice crown — 5 sharp shards rising from the head
    ctx.fillStyle = '#e8f0ff';
    for (let i = -2; i <= 2; i++) {
      const cx = sx + i * sz*0.12;
      const ch = sz * (0.32 + Math.abs(i) * 0.04);
      ctx.beginPath();
      ctx.moveTo(cx - 2, sy - sz*0.42);
      ctx.lineTo(cx + 2, sy - sz*0.42);
      ctx.lineTo(cx,     sy - sz*0.42 - ch);
      ctx.closePath(); ctx.fill();
    }
    // Crown base band
    ctx.fillStyle = '#a8c8e8';
    ctx.fillRect(sx - sz*0.30, sy - sz*0.44, sz*0.60, 3);
    _bossFlash(ctx, sx, sy, sz, fx);
  }

  // Autumn Lord — orange-brown cloak, antlered crown, pumpkin-mask face.
  function drawBoss_autumn_lord(ctx, sx, sy, b, t) {
    const fx = _bossHitFx(b); sx += fx.wobble;
    const sz = b.size;
    drawBossAura(ctx, sx, sy, sz, 'rgba(232, 128, 56, 0.30)', t);
    _bossDropShadow(ctx, sx, sy, sz);
    // Heavy cloak — deep orange-brown layered trapezoid
    ctx.fillStyle = '#8a3a18';
    ctx.beginPath();
    ctx.moveTo(sx - sz*0.32, sy - sz*0.15);
    ctx.lineTo(sx + sz*0.32, sy - sz*0.15);
    ctx.lineTo(sx + sz*0.55, sy + sz*0.55);
    ctx.lineTo(sx - sz*0.55, sy + sz*0.55);
    ctx.closePath(); ctx.fill();
    // Orange under-robe peeking through
    ctx.fillStyle = '#d06820';
    ctx.beginPath();
    ctx.moveTo(sx - sz*0.20, sy - sz*0.10);
    ctx.lineTo(sx + sz*0.20, sy - sz*0.10);
    ctx.lineTo(sx + sz*0.32, sy + sz*0.55);
    ctx.lineTo(sx - sz*0.32, sy + sz*0.55);
    ctx.closePath(); ctx.fill();
    // Leather belt
    ctx.fillStyle = '#3a1808';
    ctx.fillRect(sx - sz*0.28, sy + sz*0.10, sz*0.56, sz*0.06);
    // Sleeves — dark with orange cuffs
    ctx.fillStyle = '#5a2810';
    ctx.fillRect(sx - sz*0.42, sy - sz*0.05, sz*0.16, sz*0.30);
    ctx.fillRect(sx + sz*0.26, sy - sz*0.05, sz*0.16, sz*0.30);
    ctx.fillStyle = '#d06820';
    ctx.fillRect(sx - sz*0.42, sy + sz*0.20, sz*0.16, sz*0.05);
    ctx.fillRect(sx + sz*0.26, sy + sz*0.20, sz*0.16, sz*0.05);
    // Pumpkin-mask face — round orange head with carved triangle eyes
    ctx.fillStyle = '#e07820';
    ctx.beginPath(); ctx.arc(sx, sy - sz*0.30, sz*0.20, 0, Math.PI*2); ctx.fill();
    // Pumpkin rib lines
    ctx.strokeStyle = '#a04810'; ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(sx + i * sz*0.08, sy - sz*0.46);
      ctx.lineTo(sx + i * sz*0.08, sy - sz*0.14);
      ctx.stroke();
    }
    // Triangle glowing eyes
    ctx.fillStyle = '#ffe040';
    ctx.beginPath();
    ctx.moveTo(sx - sz*0.10, sy - sz*0.28);
    ctx.lineTo(sx - sz*0.04, sy - sz*0.28);
    ctx.lineTo(sx - sz*0.07, sy - sz*0.36);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(sx + sz*0.04, sy - sz*0.28);
    ctx.lineTo(sx + sz*0.10, sy - sz*0.28);
    ctx.lineTo(sx + sz*0.07, sy - sz*0.36);
    ctx.closePath(); ctx.fill();
    // Antlers — branching brown silhouettes either side of head
    ctx.strokeStyle = '#3a1c08'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx - sz*0.16, sy - sz*0.42);
    ctx.lineTo(sx - sz*0.34, sy - sz*0.62);
    ctx.moveTo(sx - sz*0.26, sy - sz*0.52);
    ctx.lineTo(sx - sz*0.40, sy - sz*0.50);
    ctx.moveTo(sx - sz*0.30, sy - sz*0.56);
    ctx.lineTo(sx - sz*0.42, sy - sz*0.64);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx + sz*0.16, sy - sz*0.42);
    ctx.lineTo(sx + sz*0.34, sy - sz*0.62);
    ctx.moveTo(sx + sz*0.26, sy - sz*0.52);
    ctx.lineTo(sx + sz*0.40, sy - sz*0.50);
    ctx.moveTo(sx + sz*0.30, sy - sz*0.56);
    ctx.lineTo(sx + sz*0.42, sy - sz*0.64);
    ctx.stroke();
    _bossFlash(ctx, sx, sy, sz, fx);
  }

  // Temple Warden — gold ceremonial robes, pillar staff in hand.
  function drawBoss_temple_warden(ctx, sx, sy, b, t) {
    const fx = _bossHitFx(b); sx += fx.wobble;
    const sz = b.size;
    drawBossAura(ctx, sx, sy, sz, 'rgba(232, 192, 96, 0.32)', t);
    _bossDropShadow(ctx, sx, sy, sz);
    // Long ceremonial robe — deep red base
    ctx.fillStyle = '#8a2820';
    ctx.beginPath();
    ctx.moveTo(sx - sz*0.30, sy - sz*0.10);
    ctx.lineTo(sx + sz*0.30, sy - sz*0.10);
    ctx.lineTo(sx + sz*0.55, sy + sz*0.55);
    ctx.lineTo(sx - sz*0.55, sy + sz*0.55);
    ctx.closePath(); ctx.fill();
    // Gold trim hem + center seam
    ctx.fillStyle = '#ffd848';
    ctx.fillRect(sx - sz*0.55, sy + sz*0.50, sz*1.10, sz*0.05);
    ctx.fillRect(sx - 1.5, sy - sz*0.05, 3, sz*0.55);
    // Gold sash crossing torso
    ctx.fillStyle = '#ffd848';
    ctx.beginPath();
    ctx.moveTo(sx - sz*0.32, sy);
    ctx.lineTo(sx + sz*0.32, sy + sz*0.06);
    ctx.lineTo(sx + sz*0.32, sy + sz*0.14);
    ctx.lineTo(sx - sz*0.32, sy + sz*0.08);
    ctx.closePath(); ctx.fill();
    // Sleeves — wide gold-trimmed
    ctx.fillStyle = '#8a2820';
    ctx.fillRect(sx - sz*0.42, sy - sz*0.05, sz*0.18, sz*0.30);
    ctx.fillRect(sx + sz*0.24, sy - sz*0.05, sz*0.18, sz*0.30);
    ctx.fillStyle = '#ffd848';
    ctx.fillRect(sx - sz*0.42, sy + sz*0.22, sz*0.18, sz*0.05);
    ctx.fillRect(sx + sz*0.24, sy + sz*0.22, sz*0.18, sz*0.05);
    // Bald golden-mask head
    ctx.fillStyle = '#f0c860';
    ctx.beginPath(); ctx.ellipse(sx, sy - sz*0.30, sz*0.16, sz*0.20, 0, 0, Math.PI*2); ctx.fill();
    // Forehead jewel — red dot
    ctx.fillStyle = '#c81818';
    ctx.beginPath(); ctx.arc(sx, sy - sz*0.40, 2, 0, Math.PI*2); ctx.fill();
    // Slit eyes — narrow dark lines
    ctx.fillStyle = '#1a0808';
    ctx.fillRect(sx - sz*0.10, sy - sz*0.30, sz*0.07, 1.5);
    ctx.fillRect(sx + sz*0.03, sy - sz*0.30, sz*0.07, 1.5);
    // Golden cap (bishop-style with finial)
    ctx.fillStyle = '#ffd848';
    ctx.beginPath();
    ctx.moveTo(sx - sz*0.18, sy - sz*0.42);
    ctx.lineTo(sx + sz*0.18, sy - sz*0.42);
    ctx.lineTo(sx + sz*0.10, sy - sz*0.58);
    ctx.lineTo(sx - sz*0.10, sy - sz*0.58);
    ctx.closePath(); ctx.fill();
    ctx.fillRect(sx - 1.5, sy - sz*0.66, 3, sz*0.10);
    // Pillar staff — held to the right side, vertical with stylized capital
    ctx.fillStyle = '#c8a040';
    ctx.fillRect(sx + sz*0.50, sy - sz*0.58, sz*0.08, sz*1.10);
    // Capital block at top of staff
    ctx.fillStyle = '#ffd848';
    ctx.fillRect(sx + sz*0.46, sy - sz*0.62, sz*0.16, sz*0.06);
    // Base of staff
    ctx.fillRect(sx + sz*0.46, sy + sz*0.46, sz*0.16, sz*0.06);
    _bossFlash(ctx, sx, sy, sz, fx);
  }

  // Cave Mother — dark earth-tone hooded figure, MANY-eyes inside the hood.
  function drawBoss_cave_mother(ctx, sx, sy, b, t) {
    const fx = _bossHitFx(b); sx += fx.wobble;
    const sz = b.size;
    drawBossAura(ctx, sx, sy, sz, 'rgba(40, 20, 30, 0.42)', t);
    _bossDropShadow(ctx, sx, sy, sz);
    // Massive earth-tone cloak — wider than other bosses (motherly bulk)
    ctx.fillStyle = '#2a1a14';
    ctx.beginPath();
    ctx.moveTo(sx - sz*0.40, sy - sz*0.10);
    ctx.lineTo(sx + sz*0.40, sy - sz*0.10);
    ctx.lineTo(sx + sz*0.62, sy + sz*0.55);
    ctx.lineTo(sx - sz*0.62, sy + sz*0.55);
    ctx.closePath(); ctx.fill();
    // Cloak shadow side
    ctx.fillStyle = '#1a0e0a';
    ctx.beginPath();
    ctx.moveTo(sx, sy - sz*0.10);
    ctx.lineTo(sx + sz*0.40, sy - sz*0.10);
    ctx.lineTo(sx + sz*0.62, sy + sz*0.55);
    ctx.lineTo(sx, sy + sz*0.55);
    ctx.closePath(); ctx.fill();
    // Tattered hem — irregular triangle cuts
    ctx.fillStyle = '#0a0604';
    for (let i = -3; i <= 3; i++) {
      const ex = sx + i * sz*0.16;
      ctx.beginPath();
      ctx.moveTo(ex - sz*0.06, sy + sz*0.50);
      ctx.lineTo(ex + sz*0.06, sy + sz*0.50);
      ctx.lineTo(ex,           sy + sz*0.62);
      ctx.closePath(); ctx.fill();
    }
    // Hood — deep cowl casting shadow
    ctx.fillStyle = '#1a0e0a';
    ctx.beginPath();
    ctx.moveTo(sx - sz*0.30, sy - sz*0.10);
    ctx.lineTo(sx + sz*0.30, sy - sz*0.10);
    ctx.lineTo(sx + sz*0.20, sy - sz*0.55);
    ctx.lineTo(sx - sz*0.20, sy - sz*0.55);
    ctx.closePath(); ctx.fill();
    // Hood interior — pure black void
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(sx, sy - sz*0.32, sz*0.16, sz*0.20, 0, 0, Math.PI*2); ctx.fill();
    // MANY EYES inside the hood — 6 yellow-orange glints, subtle pulse offset by index
    for (let i = 0; i < 6; i++) {
      const ax = (i - 2.5) * 4 + Math.sin(t * 1.5 + i) * 0.5;
      const ay = ((i % 2) ? -2 : 2) + Math.cos(t * 1.2 + i) * 0.5;
      const flick = 0.6 + Math.sin(t * 2.5 + i * 1.7) * 0.4;
      ctx.fillStyle = `rgba(248, 200, 64, ${flick})`;
      ctx.beginPath(); ctx.arc(sx + ax, sy - sz*0.32 + ay, 1.5, 0, Math.PI*2); ctx.fill();
    }
    _bossFlash(ctx, sx, sy, sz, fx);
  }

  // Wraith Father — purple aura + crown of thorns, void cloak.
  function drawBoss_wraith_father(ctx, sx, sy, b, t) {
    const fx = _bossHitFx(b); sx += fx.wobble;
    const sz = b.size;
    // Layered purple aura BEHIND the figure (existing concentric pulse logic).
    for (let i = 3; i > 0; i--) {
      ctx.fillStyle = `rgba(60, 24, 100, ${0.18 + Math.sin(t*1.5 + i)*0.05})`;
      ctx.beginPath(); ctx.arc(sx, sy, sz*0.5 + i*4, 0, Math.PI*2); ctx.fill();
    }
    drawBossAura(ctx, sx, sy, sz, 'rgba(160, 96, 255, 0.35)', t);
    _bossDropShadow(ctx, sx, sy, sz);
    // Void cloak — black with deep purple inner shadow
    ctx.fillStyle = '#180828';
    ctx.beginPath();
    ctx.moveTo(sx - sz*0.34, sy - sz*0.18);
    ctx.lineTo(sx + sz*0.34, sy - sz*0.18);
    ctx.lineTo(sx + sz*0.58, sy + sz*0.55);
    ctx.lineTo(sx - sz*0.58, sy + sz*0.55);
    ctx.closePath(); ctx.fill();
    // Inner robe — deep purple
    ctx.fillStyle = '#3a1860';
    ctx.beginPath();
    ctx.moveTo(sx - sz*0.22, sy - sz*0.12);
    ctx.lineTo(sx + sz*0.22, sy - sz*0.12);
    ctx.lineTo(sx + sz*0.36, sy + sz*0.55);
    ctx.lineTo(sx - sz*0.36, sy + sz*0.55);
    ctx.closePath(); ctx.fill();
    // Bone clasps down chest — pale dots
    ctx.fillStyle = '#d0c8b0';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.arc(sx, sy + i * sz*0.10, 1.6, 0, Math.PI*2); ctx.fill();
    }
    // Shrouded arms hanging straight down
    ctx.fillStyle = '#180828';
    ctx.fillRect(sx - sz*0.46, sy - sz*0.08, sz*0.16, sz*0.40);
    ctx.fillRect(sx + sz*0.30, sy - sz*0.08, sz*0.16, sz*0.40);
    // Skeletal hands at ends
    ctx.fillStyle = '#d0c8b0';
    ctx.beginPath(); ctx.arc(sx - sz*0.38, sy + sz*0.34, sz*0.06, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(sx + sz*0.38, sy + sz*0.34, sz*0.06, 0, Math.PI*2); ctx.fill();
    // Pale gaunt face inside hood
    ctx.fillStyle = '#c0a8c8';
    ctx.beginPath(); ctx.ellipse(sx, sy - sz*0.32, sz*0.16, sz*0.22, 0, 0, Math.PI*2); ctx.fill();
    // Black void eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(sx - sz*0.10, sy - sz*0.34, sz*0.07, sz*0.06);
    ctx.fillRect(sx + sz*0.03, sy - sz*0.34, sz*0.07, sz*0.06);
    // Glowing purple pupils
    ctx.fillStyle = `rgba(200, 128, 255, ${0.7 + Math.sin(t * 2.2) * 0.3})`;
    ctx.beginPath(); ctx.arc(sx - sz*0.07, sy - sz*0.31, 1.2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(sx + sz*0.07, sy - sz*0.31, 1.2, 0, Math.PI*2); ctx.fill();
    // Crown of thorns — jagged spikes radiating from skull
    ctx.strokeStyle = '#1a0828'; ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
      const ax = sx + i * sz*0.12;
      ctx.beginPath();
      ctx.moveTo(ax,         sy - sz*0.48);
      ctx.lineTo(ax + i * 2, sy - sz*0.62 - Math.abs(i));
      ctx.stroke();
    }
    ctx.fillStyle = '#1a0828';
    ctx.fillRect(sx - sz*0.30, sy - sz*0.50, sz*0.60, 3);
    // Crown gem — purple glowing
    ctx.fillStyle = `rgba(168, 96, 255, ${0.7 + Math.sin(t * 1.8) * 0.3})`;
    ctx.beginPath(); ctx.arc(sx, sy - sz*0.56, 2.2, 0, Math.PI*2); ctx.fill();
    _bossFlash(ctx, sx, sy, sz, fx);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Shared hit reaction for every enemy type.
  //   - 80ms additive white flash (DOPAMINE_DESIGN §9 sprite techniques)
  //   - 200ms damped sine wobble on x — small but readable at thumbnail glance
  // Caller applies the wobble to sx BEFORE drawing, then calls _creatureFlash
  // AFTER drawing the body to add the white tint.
  // ─────────────────────────────────────────────────────────────────────────────
  function _creatureHitFx(c) {
    const sinceDmg = performance.now() - (c._lastDamageAt || 0);
    let wobble = 0;
    if (sinceDmg < 200) {
      const decay = 1 - sinceDmg / 200;
      wobble = decay * decay * Math.sin(sinceDmg / 14) * 1.6;
    }
    const flash = sinceDmg < 80 ? (1 - sinceDmg / 80) * 0.6 : 0;
    return { wobble, flash, sinceDmg };
  }
  function _creatureFlash(ctx, sx, sy, sz, flash) {
    if (flash <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = flash;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(sx, sy - sz * 0.15, sz * 0.5, sz * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Cloaked-zombie enemy sprite. Hooded silhouette, no visible legs, faint pale face.
  // Used for both legacy types (lurker/walker/sprite/brute_small/caller) AND the
  // new red_zombie id — drawZombie is the day-baseline form.
  // ─────────────────────────────────────────────────────────────────────────────
  function drawZombie(ctx, sx, sy, c) {
    const fx = _creatureHitFx(c); sx += fx.wobble;
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
    _creatureFlash(ctx, sx, sy, sz, fx.flash);
    if (c.hp < c.maxHp) WG.Render.drawHpBar(ctx, sx, sy - sz*0.7, Math.max(20, sz+4), c.hp, c.maxHp);
  }

  // Pumpkin-head folk-horror night enemy. matches screenshot_4 night-mode pumpkin head.
  // Large orange jack-o-lantern head, dark stick body; glowing face pulses per-creature
  // so a group doesn't flash in unison.
  function drawPumpkin(ctx, sx, sy, c) {
    const fx = _creatureHitFx(c); sx += fx.wobble;
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

    _creatureFlash(ctx, sx, sy, sz, fx.flash);
    if (c.hp < c.maxHp) WG.Render.drawHpBar(ctx, sx, sy - sz * 0.85, Math.max(20, sz + 4), c.hp, c.maxHp);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Jiangshi — Chinese hopping vampire. Conical straw hat with paper amulet
  // (the classic mid-yellow ofuda strip with red brush mark), arms stiffly
  // outstretched, green-tinged dark robe. Matches the SPEC night-folk-horror
  // register. Actual hop AI is V2 — body is statically posed for V0.
  // ─────────────────────────────────────────────────────────────────────────────
  function drawJiangshi(ctx, sx, sy, c) {
    const fx = _creatureHitFx(c); sx += fx.wobble;
    const sz = c.size;
    const robeColor = c._typeData.color || '#3a2018';

    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath(); ctx.ellipse(sx, sy + sz*0.55, sz*0.45, sz*0.16, 0, 0, Math.PI*2); ctx.fill();

    // Robe — taller trapezoid, green-tinged dark color
    ctx.fillStyle = robeColor;
    ctx.beginPath();
    ctx.moveTo(sx - sz*0.24, sy - sz*0.30);
    ctx.lineTo(sx + sz*0.24, sy - sz*0.30);
    ctx.lineTo(sx + sz*0.42, sy + sz*0.55);
    ctx.lineTo(sx - sz*0.42, sy + sz*0.55);
    ctx.closePath(); ctx.fill();
    // Robe shadow side (warmer green-black)
    ctx.fillStyle = shade(robeColor, -22);
    ctx.beginPath();
    ctx.moveTo(sx, sy - sz*0.30);
    ctx.lineTo(sx + sz*0.24, sy - sz*0.30);
    ctx.lineTo(sx + sz*0.42, sy + sz*0.55);
    ctx.lineTo(sx, sy + sz*0.55);
    ctx.closePath(); ctx.fill();
    // Pale yellow waist sash (Qing-dynasty register)
    ctx.fillStyle = '#c8a040';
    ctx.fillRect(sx - sz*0.26, sy + sz*0.10, sz*0.52, sz*0.06);

    // Arms — stiffly outstretched horizontal sleeves (signature jiangshi pose)
    ctx.fillStyle = robeColor;
    ctx.fillRect(sx - sz*0.62, sy - sz*0.10, sz*0.40, sz*0.14);  // left sleeve
    ctx.fillRect(sx + sz*0.22, sy - sz*0.10, sz*0.40, sz*0.14);  // right sleeve
    // Pale hands at ends
    ctx.fillStyle = '#a8b890';  // pale green-tinged
    ctx.beginPath(); ctx.arc(sx - sz*0.66, sy - sz*0.03, sz*0.07, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(sx + sz*0.66, sy - sz*0.03, sz*0.07, 0, Math.PI*2); ctx.fill();

    // Pale face — green-tinged pallor under the hat brim
    ctx.fillStyle = '#a8b890';
    ctx.beginPath(); ctx.ellipse(sx, sy - sz*0.30, sz*0.18, sz*0.20, 0, 0, Math.PI*2); ctx.fill();
    // Red dot eyes (jiangshi tradition)
    ctx.fillStyle = '#c81818';
    ctx.beginPath(); ctx.arc(sx - sz*0.07, sy - sz*0.32, 1.6, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(sx + sz*0.07, sy - sz*0.32, 1.6, 0, Math.PI*2); ctx.fill();
    // Mouth — small dark line
    ctx.fillStyle = '#1a0a08';
    ctx.fillRect(sx - sz*0.05, sy - sz*0.22, sz*0.10, 1.2);

    // Conical straw hat — wide triangular brim, c._typeData.accent for color
    const hatColor = c._typeData.accent || '#f8e8c8';
    ctx.fillStyle = hatColor;
    ctx.beginPath();
    ctx.moveTo(sx - sz*0.45, sy - sz*0.42);
    ctx.lineTo(sx + sz*0.45, sy - sz*0.42);
    ctx.lineTo(sx,           sy - sz*0.78);
    ctx.closePath(); ctx.fill();
    // Hat shadow underside line
    ctx.strokeStyle = shade(hatColor, -30); ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx - sz*0.45, sy - sz*0.42);
    ctx.lineTo(sx + sz*0.45, sy - sz*0.42);
    ctx.stroke();
    // Brush-stroke ribs on hat (3 short angled lines for woven straw read)
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(sx + i * sz*0.16, sy - sz*0.42);
      ctx.lineTo(sx + i * sz*0.08, sy - sz*0.64);
      ctx.stroke();
    }

    // Paper amulet — vertical white strip hanging in front of face from hat brim
    ctx.fillStyle = '#f4ecd0';
    ctx.fillRect(sx - sz*0.04, sy - sz*0.42, sz*0.08, sz*0.30);
    ctx.strokeStyle = '#a01818'; ctx.lineWidth = 1;
    // Red brush mark down the amulet
    ctx.beginPath();
    ctx.moveTo(sx, sy - sz*0.40);
    ctx.lineTo(sx, sy - sz*0.14);
    ctx.stroke();
    // Cross-stroke (talisman ideogram hint)
    ctx.beginPath();
    ctx.moveTo(sx - sz*0.025, sy - sz*0.30);
    ctx.lineTo(sx + sz*0.025, sy - sz*0.30);
    ctx.stroke();

    _creatureFlash(ctx, sx, sy, sz, fx.flash);
    if (c.hp < c.maxHp) WG.Render.drawHpBar(ctx, sx, sy - sz*0.85, Math.max(22, sz + 4), c.hp, c.maxHp);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Samurai grunt — armored humanoid with horned kabuto helmet, red robe over
  // dark armor plates, katana sheathed at the hip. Slightly larger silhouette
  // than walker/sprite to read as a heavier threat.
  // ─────────────────────────────────────────────────────────────────────────────
  function drawSamurai(ctx, sx, sy, c) {
    const fx = _creatureHitFx(c); sx += fx.wobble;
    const sz = c.size;
    const robeColor = c._typeData.color || '#a82828';
    const goldColor = c._typeData.accent || '#ffc850';

    // Drop shadow — wider, samurai is bigger
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.beginPath(); ctx.ellipse(sx, sy + sz*0.58, sz*0.52, sz*0.18, 0, 0, Math.PI*2); ctx.fill();

    // Lower robe — wide trapezoid skirting (haidate)
    ctx.fillStyle = robeColor;
    ctx.beginPath();
    ctx.moveTo(sx - sz*0.28, sy - sz*0.10);
    ctx.lineTo(sx + sz*0.28, sy - sz*0.10);
    ctx.lineTo(sx + sz*0.50, sy + sz*0.58);
    ctx.lineTo(sx - sz*0.50, sy + sz*0.58);
    ctx.closePath(); ctx.fill();
    // Shadow side
    ctx.fillStyle = shade(robeColor, -22);
    ctx.beginPath();
    ctx.moveTo(sx, sy - sz*0.10);
    ctx.lineTo(sx + sz*0.28, sy - sz*0.10);
    ctx.lineTo(sx + sz*0.50, sy + sz*0.58);
    ctx.lineTo(sx, sy + sz*0.58);
    ctx.closePath(); ctx.fill();
    // Gold trim along bottom hem
    ctx.fillStyle = goldColor;
    ctx.fillRect(sx - sz*0.50, sy + sz*0.50, sz*1.0, sz*0.05);
    // Vertical gold seam down center (front of robe)
    ctx.fillRect(sx - 1, sy - sz*0.05, 2, sz*0.55);

    // Chest armor cuirass — darker rect with gold rivets
    ctx.fillStyle = shade(robeColor, -38);
    ctx.fillRect(sx - sz*0.26, sy - sz*0.30, sz*0.52, sz*0.24);
    ctx.fillStyle = goldColor;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.arc(sx + i * sz*0.18, sy - sz*0.20, 1.5, 0, Math.PI*2); ctx.fill();
    }

    // Shoulder pads (sode) — angled gold-trimmed plates
    ctx.fillStyle = shade(robeColor, -12);
    ctx.beginPath();
    ctx.moveTo(sx - sz*0.42, sy - sz*0.28);
    ctx.lineTo(sx - sz*0.22, sy - sz*0.30);
    ctx.lineTo(sx - sz*0.20, sy - sz*0.10);
    ctx.lineTo(sx - sz*0.46, sy - sz*0.06);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(sx + sz*0.42, sy - sz*0.28);
    ctx.lineTo(sx + sz*0.22, sy - sz*0.30);
    ctx.lineTo(sx + sz*0.20, sy - sz*0.10);
    ctx.lineTo(sx + sz*0.46, sy - sz*0.06);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = goldColor; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sx - sz*0.46, sy - sz*0.06); ctx.lineTo(sx - sz*0.42, sy - sz*0.28); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx + sz*0.46, sy - sz*0.06); ctx.lineTo(sx + sz*0.42, sy - sz*0.28); ctx.stroke();

    // Mempo (face mask) — dark grimace under helmet brim
    ctx.fillStyle = '#1a0808';
    ctx.beginPath(); ctx.ellipse(sx, sy - sz*0.40, sz*0.16, sz*0.13, 0, 0, Math.PI*2); ctx.fill();
    // Red glaring eyes
    ctx.fillStyle = '#ff4040';
    ctx.fillRect(sx - sz*0.10, sy - sz*0.42, sz*0.06, 1.6);
    ctx.fillRect(sx + sz*0.04, sy - sz*0.42, sz*0.06, 1.6);

    // Kabuto helmet — wide gold brim + dome
    ctx.fillStyle = goldColor;
    ctx.beginPath();
    ctx.moveTo(sx - sz*0.34, sy - sz*0.46);
    ctx.lineTo(sx + sz*0.34, sy - sz*0.46);
    ctx.lineTo(sx + sz*0.30, sy - sz*0.38);
    ctx.lineTo(sx - sz*0.30, sy - sz*0.38);
    ctx.closePath(); ctx.fill();
    // Helmet dome — darker red metal
    ctx.fillStyle = shade(robeColor, -32);
    ctx.beginPath();
    ctx.moveTo(sx - sz*0.28, sy - sz*0.46);
    ctx.lineTo(sx + sz*0.28, sy - sz*0.46);
    ctx.lineTo(sx + sz*0.18, sy - sz*0.66);
    ctx.lineTo(sx - sz*0.18, sy - sz*0.66);
    ctx.closePath(); ctx.fill();
    // Two short horns (kuwagata) — gold crescents on the brim
    ctx.fillStyle = goldColor;
    ctx.beginPath();
    ctx.moveTo(sx - sz*0.30, sy - sz*0.46);
    ctx.lineTo(sx - sz*0.40, sy - sz*0.66);
    ctx.lineTo(sx - sz*0.22, sy - sz*0.50);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(sx + sz*0.30, sy - sz*0.46);
    ctx.lineTo(sx + sz*0.40, sy - sz*0.66);
    ctx.lineTo(sx + sz*0.22, sy - sz*0.50);
    ctx.closePath(); ctx.fill();
    // Helmet front gold crest
    ctx.fillStyle = goldColor;
    ctx.fillRect(sx - 1.5, sy - sz*0.62, 3, sz*0.16);

    // Katana — angled gray line at hip with gold guard
    ctx.strokeStyle = '#c8c8c8'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx + sz*0.20, sy + sz*0.18);
    ctx.lineTo(sx + sz*0.55, sy + sz*0.42);
    ctx.stroke();
    // Tsuba (guard)
    ctx.fillStyle = goldColor;
    ctx.beginPath(); ctx.arc(sx + sz*0.22, sy + sz*0.18, 2, 0, Math.PI*2); ctx.fill();
    // Hilt (dark wrap)
    ctx.strokeStyle = '#1a1208'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(sx + sz*0.14, sy + sz*0.13);
    ctx.lineTo(sx + sz*0.22, sy + sz*0.18);
    ctx.stroke();

    _creatureFlash(ctx, sx, sy, sz, fx.flash);
    if (c.hp < c.maxHp) WG.Render.drawHpBar(ctx, sx, sy - sz*0.78, Math.max(24, sz + 6), c.hp, c.maxHp);
  }

  function drawCreatures(ctx) {
    for (const c of runtime.creatures) {
      if (c.hp <= 0) continue;
      const s = w2s(c.x, c.y);
      switch (c.type) {
        case 'pumpkin_lantern': drawPumpkin(ctx, s.x, s.y, c);   break;
        case 'jiangshi':        drawJiangshi(ctx, s.x, s.y, c);  break;
        case 'samurai_grunt':   drawSamurai(ctx, s.x, s.y, c);   break;
        default:                drawZombie(ctx, s.x, s.y, c);  // red_zombie + classic five
      }
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

  // Projectile draw — supports an optional `_trail` array on the projectile
  // (push current position each render frame, trim to TRAIL_LEN, render fading
  // streak behind the head). Used by turret projectiles for "moving fast" read.
  const _PROJ_TRAIL_LEN = 8;
  function drawProjectiles(ctx) {
    for (const p of runtime.projectiles) {
      // Trail bookkeeping (presentation-only mutation, no game state).
      if (p._trail) {
        p._trail.push({ x: p.x, y: p.y });
        if (p._trail.length > _PROJ_TRAIL_LEN) p._trail.shift();
        // Render trail under the head so the head reads as the bright tip.
        for (let i = 0; i < p._trail.length - 1; i++) {
          const a = (i + 1) / p._trail.length;       // 0 (oldest) → 1 (newest)
          const t1 = p._trail[i], t2 = p._trail[i + 1];
          const s1 = w2s(t1.x, t1.y), s2 = w2s(t2.x, t2.y);
          ctx.strokeStyle = p.color || '#ffd870';
          ctx.globalAlpha = a * 0.7;
          ctx.lineWidth = 1 + a * 2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(s1.x, s1.y);
          ctx.lineTo(s2.x, s2.y);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1;
        // Glow halo behind head.
        const sh = w2s(p.x, p.y);
        const grad = ctx.createRadialGradient(sh.x, sh.y, 0, sh.x, sh.y, 8);
        grad.addColorStop(0,   p.color || '#ffd870');
        grad.addColorStop(0.4, 'rgba(255, 220, 120, 0.35)');
        grad.addColorStop(1,   'rgba(255, 220, 120, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(sh.x, sh.y, 8, 0, Math.PI*2); ctx.fill();
      }
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
    // Architect: 'sword too far from character' — visual radius capped tight at 16
    // even if weapon range is larger. Damage range is still the weapon's actual range
    // (set in hunt-player.js autoAttack), so far-edge enemies still get hit even
    // though the sprite stays close to the body.
    const VISUAL_R = 16;
    const range = Math.min(VISUAL_R, weaponRange || VISUAL_R);
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
    // Architect: scythe was too far from character. Cap visual radius to keep
    // it tight to the player. Actual damage range still follows weapon stats.
    let weaponRange = 22;
    if (window.WG.HuntWeapons) {
      const meleeId = (p.heldPickupId || WG.State.get().player.slots.melee || 'branch_stick');
      const wep = WG.HuntWeapons.byId(meleeId);
      if (wep && wep.range) weaponRange = wep.range;
    }
    const visualRadius = Math.min(weaponRange, 16);
    // Player swing squash-and-stretch (DOPAMINE_DESIGN §9 sprite techniques) —
    // 60ms ease-back from 1.08x / 0.92y to 1.0. Sells weapon weight.
    const sinceSwing = performance.now() - _lastSwingAt;
    if (sinceSwing < 60) {
      const k = sinceSwing / 60;
      const sxK = 1 + (1 - k) * 0.08;
      const syK = 1 - (1 - k) * 0.08;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.scale(sxK, syK);
      ctx.translate(-s.x, -s.y);
      drawAnimeGirl(ctx, s.x, s.y, visualRadius);
      ctx.restore();
    } else {
      drawAnimeGirl(ctx, s.x, s.y, visualRadius);
    }
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
    // Total-wave count now varies (5 / 10 / 15 by stage tier) so hex size
    // scales down for higher counts to stay inside the screen width.
    const currentWave = (runtime.wave && runtime.wave.index) || 1;
    const totalWaves = (runtime.wave && runtime.wave.total) || (runtime.stage && runtime.stage.waveCount) || 5;
    const hexR  = totalWaves <= 5 ? 12 : totalWaves <= 10 ? 8 : 6;
    const hexGap = totalWaves <= 5 ? 10 : totalWaves <= 10 ? 6 : 4;
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
      ctx.font = 'bold ' + (hexR >= 10 ? 12 : hexR >= 8 ? 10 : 8) + 'px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(String(i), dx, dy + (hexR >= 10 ? 4 : hexR >= 8 ? 3 : 2));
      ctx.textAlign = 'left';
    }

    // Top-left: in-stage resource counters (coin + wood)
    const coins = (runtime.runCoins || 0);
    const wood  = (runtime.runWood  || 0);
    _hudBumpCache(wood, coins, p.xp); // DOPAMINE_DESIGN §1+§2 — pulse on increment
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(8, 76, 78, 50);
    // Coin
    ctx.fillStyle = '#ffd870';
    ctx.beginPath(); ctx.arc(20, 90, 6, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#a8801c'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(20, 90, 6, 0, Math.PI*2); ctx.stroke();
    const goldP = _hudPulseStyle('gold', '#f0e8c8');
    ctx.font = 'bold 12px system-ui';
    _hudDrawScaled(ctx, 32, 94, goldP.scale, () => {
      ctx.fillStyle = goldP.color;
      ctx.fillText(String(coins), 32, 94);
    });
    // Wood
    ctx.fillStyle = '#8a5828';
    ctx.fillRect(15, 110, 10, 6);
    ctx.fillStyle = '#5a3010';
    ctx.fillRect(15, 110, 10, 2);
    const woodP = _hudPulseStyle('wood', '#f0e8c8');
    _hudDrawScaled(ctx, 32, 117, woodP.scale, () => {
      ctx.fillStyle = woodP.color;
      ctx.fillText(String(wood), 32, 117);
    });

    // Mid: level bar (smaller, below wave dots)
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(94, 76, w - 200, 22);
    const xpP = _hudPulseStyle('xp', '#f0d890');
    ctx.font = 'bold 11px system-ui';
    _hudDrawScaled(ctx, 100, 91, xpP.scale, () => {
      ctx.fillStyle = xpP.color;
      ctx.fillText('Lv.' + p.level, 100, 91);
    });
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
      banner.textContent = `Highest Wave Reached: ${high} / ${totalWaves} Waves`;
    }

    // SPEC W-Hard-Tuning-And-Monetization §B — active buff badges. Stack vertically
    // top-right just under the wave dots. Gold pill, label + remaining seconds.
    // W-FX-Polish-Pass — gap 2: appended ghost pills (desaturated 280ms fade) so
    // expiry/consume reads as a closing breath, not a snap-cut.
    if (window.WG && WG.Buffs && WG.Buffs.list) {
      const buffs = WG.Buffs.list();
      const padX = 8, padY = 4, h = 18, gap = 4;
      let y = 76;
      ctx.font = 'bold 11px system-ui';
      for (const b of buffs) {
        const remTxt = (b.remainingMs === null) ? '★' : Math.ceil(b.remainingMs / 1000) + 's';
        const text = `${b.short} ${remTxt}`;
        const tw = ctx.measureText(text).width + padX * 2;
        const x = w - tw - 8;
        // Gold gradient pill
        ctx.fillStyle = 'rgba(60,38,8,0.85)';
        ctx.fillRect(x, y, tw, h);
        ctx.strokeStyle = '#f0c060';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 0.5, y + 0.5, tw - 1, h - 1);
        ctx.fillStyle = '#ffe0a0';
        ctx.fillText(text, x + padX, y + h - padY - 1);
        y += h + gap;
      }
      // Ghost pills: desaturated, fade out, then prune.
      if (_buffGhosts.length) {
        const nowMs = performance.now();
        for (let i = _buffGhosts.length - 1; i >= 0; i--) {
          const g = _buffGhosts[i];
          const age = nowMs - g.expiredAt;
          if (age >= BUFF_GHOST_DUR_MS) { _buffGhosts.splice(i, 1); continue; }
        }
        for (const g of _buffGhosts) {
          const age = nowMs - g.expiredAt;
          const k = 1 - (age / BUFF_GHOST_DUR_MS); // 1 → 0
          const text = `${g.short} —`;
          const tw = ctx.measureText(text).width + padX * 2;
          const x = w - tw - 8;
          const prevA = ctx.globalAlpha;
          ctx.globalAlpha = prevA * k;
          ctx.fillStyle = 'rgba(40,40,40,0.85)';
          ctx.fillRect(x, y, tw, h);
          ctx.strokeStyle = '#808080';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x + 0.5, y + 0.5, tw - 1, h - 1);
          ctx.fillStyle = '#b8b8b8';
          ctx.fillText(text, x + padX, y + h - padY - 1);
          ctx.globalAlpha = prevA;
          y += h + gap;
        }
      }
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

  // DOM-based level-up modal — replaces canvas-drawn version for reliable taps.
  // Canvas hit-detection was fighting trauma shake + ctx.scale(ZOOM) + DPR layering.
  // DOM is z-index 100 above canvas with native button event handling.
  let _luEl = null;
  const LU_LABELS = {
    dmg:    ['+ Damage',   'Stronger swings'],
    cd:     ['+ Speed',    'Attack faster'],
    maxhp:  ['+ Vigor',    'More HP'],
    pickup: ['+ Reach',    'Wider pickup'],
    speed:  ['+ Pace',     'Move faster'],
  };
  function _luBuild() {
    if (_luEl) return _luEl;
    const overlay = document.createElement('div');
    overlay.id = 'levelup-modal';
    overlay.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,0.78);z-index:150;display:none;align-items:center;justify-content:center;flex-direction:column;padding:20px;pointer-events:auto';
    const title = document.createElement('div');
    title.style.cssText = 'font:bold 18px system-ui;color:#f0d890;letter-spacing:2px;margin-bottom:18px;text-shadow:0 0 12px rgba(240,216,144,0.5)';
    title.textContent = 'LEVEL UP — Choose a Boon';
    overlay.appendChild(title);
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:10px;width:100%;max-width:520px;justify-content:center';
    overlay.appendChild(row);
    overlay._row = row;
    document.getElementById('app').appendChild(overlay);
    _luEl = overlay;
    return overlay;
  }
  function _luShow(options) {
    const el = _luBuild();
    const row = el._row;
    row.innerHTML = '';
    for (const id of options) {
      const card = document.createElement('button');
      card.style.cssText = 'flex:1;background:linear-gradient(to bottom,#2a1c10,#1a1006);border:2px solid #806040;border-radius:10px;padding:18px 12px;color:#f0d890;font:inherit;cursor:pointer;min-height:120px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:6px;-webkit-tap-highlight-color:rgba(255,255,255,0.15);transition:transform 80ms,border-color 80ms';
      const t = document.createElement('div');
      t.style.cssText = 'font:bold 14px system-ui;color:#f0d890;letter-spacing:1px';
      t.textContent = LU_LABELS[id][0];
      const s = document.createElement('div');
      s.style.cssText = 'font:11px system-ui;color:#c8a868';
      s.textContent = LU_LABELS[id][1];
      card.appendChild(t); card.appendChild(s);
      const onPick = (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        if (!runtime || !runtime.pendingLevelUp) return;
        WG.HuntPlayer.applyLevelChoice(id);
        runtime._luOptions = null;
        _luHide();
      };
      card.addEventListener('click', onPick);
      card.addEventListener('touchend', onPick);
      row.appendChild(card);
    }
    el.style.display = 'flex';
  }
  function _luHide() {
    if (_luEl) _luEl.style.display = 'none';
  }
  function drawLevelUpModal(ctx) {
    // No canvas drawing — DOM overlay handles it. Just sync visibility.
    if (runtime.pendingLevelUp) {
      if (!runtime._luOptions) {
        const all = ['dmg', 'cd', 'maxhp', 'pickup', 'speed'];
        runtime._luOptions = [...all].sort(() => Math.random() - 0.5).slice(0, 3);
      }
      if (!_luEl || _luEl.style.display !== 'flex') {
        _luShow(runtime._luOptions);
      }
    } else {
      if (_luEl && _luEl.style.display !== 'none') _luHide();
    }
  }

  // No-op kept for backwards compat — old canvas-tap code path retired.
  function handleHuntTap() { return false; }

  // ─────────────────────────────────────────────────────────────────────────────
  // Frame composition.
  // ─────────────────────────────────────────────────────────────────────────────
  function drawFrame() {
    if (!runtime || !runtime.stage) return;
    const ctx = D().ctx;
    const biome = WG.HuntStage.getBiome(runtime.stage.biome);
    updateCamera();
    const props = getStageProps(runtime.stage);
    // Derive dt for fx-only systems (game-logic dt handled by wg-game).
    const nowMs = performance.now();
    const fxDt = _lastFrameMs ? Math.min(0.1, (nowMs - _lastFrameMs) / 1000) : 0;
    _lastFrameMs = nowMs;
    if (window.WG.HuntFXNumbers) WG.HuntFXNumbers.tick(fxDt);
    if (window.WG.HuntFX) WG.HuntFX.tick(fxDt);

    WG.Render.clear(ctx, biome.ground);

    // Trauma-based screen shake (DOPAMINE_DESIGN §9). Decays ~1.4/sec, displacement
    // = trauma² × maxOffset (Eiserloh GDC 2016). Wraps world rendering only — HUD
    // and edge-pulse are drawn at native screen-space below and stay anchored.
    const _now = performance.now();
    _trauma = Math.max(0, _trauma - 1.4 * (_now - _shakeLastMs) / 1000);
    _shakeLastMs = _now;
    ctx.save();
    if (_trauma > 0) {
      const shake = _trauma * _trauma;
      const offX = (Math.random() * 2 - 1) * shake * 18;
      const offY = (Math.random() * 2 - 1) * shake * 18;
      const rot  = (Math.random() * 2 - 1) * shake * 0.04;
      const W = D().width, H = D().height;
      ctx.translate(offX + W/2, offY + H/2);
      ctx.rotate(rot);
      ctx.translate(-W/2, -H/2);
    }

    // World rendering — zoomed by ZOOM factor (closer to player, like Wood Siege HD)
    ctx.save();
    ctx.scale(ZOOM, ZOOM);
    drawTiles(ctx, biome);
    drawPineForest(ctx);
    drawCampfireLight(ctx, props);
    drawCampfireRegenRings(ctx, props);
    drawConstructionSites(ctx, props);
    drawBuiltStructures(ctx, props);
    drawStumps(ctx, props);
    drawCaves(ctx, props);
    drawCampfireFlame(ctx, props);
    drawDrops(ctx);
    if (window.WG.HuntPickups) WG.HuntPickups.draw(ctx, w2s, runtime);
    drawCreatures(ctx);
    drawProjectiles(ctx);
    drawPlayer(ctx);
    WG.Render.drawParticles(ctx, w2s);
    if (window.WG.HuntFXNumbers) WG.HuntFXNumbers.draw(ctx, w2s);
    if (window.WG.HuntFX) WG.HuntFX.draw(ctx, w2s);
    ctx.restore();
    ctx.restore(); // pair with outer trauma transform save

    // Screen-space overlays — HUD, fog, modals (drawn at native scale)
    // SPEC §0 — Night-mode darkness with carved torch/campfire holes. Drawn before
    // biome.lightFog so cave-fog sits *on top* of carved torch holes (consistent
    // with "fog is always there, torch only cuts the dark").
    drawNightOverlay(ctx);
    if (biome.lightFog > 0) {
      ctx.fillStyle = `rgba(0,0,0,${biome.lightFog})`;
      ctx.fillRect(0, 0, D().width, D().height);
    }
    drawEdgePulse(ctx);
    drawHud(ctx);
    drawLevelUpModal(ctx);
  }

  function init() {
    if (window.WG.HuntFXNumbers && WG.HuntFXNumbers.init) WG.HuntFXNumbers.init();
    if (window.WG.HuntFX && WG.HuntFX.init) WG.HuntFX.init();
    // Manual HUD pulse trigger — DOPAMINE_DESIGN §2: any module can ping a counter.
    WG.Engine.on('hud:pulse', ({ key }) => {
      if (_hudPulse[key]) _hudPulse[key].ts = performance.now();
    });
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

    // Trauma triggers (DOPAMINE_DESIGN §9 table). stump:hit excluded — would
    // shake constantly with the spinning scythe at 5 chops/sec.
    WG.Engine.on('enemy:killed',  () => addTrauma(0.18));
    WG.Engine.on('boss:damaged',  () => addTrauma(0.10));
    WG.Engine.on('boss:defeated', () => addTrauma(0.65));
    WG.Engine.on('player:damaged', ({ amount }) => addTrauma(0.30 + (amount || 0) / 200));
    WG.Engine.on('player:skill',  () => addTrauma(0.45));
    WG.Engine.on('stump:chopped', () => addTrauma(0.05));

    // Hit-pause triggers (DOPAMINE_DESIGN §9). NOT wired on stump:hit / stump:chopped
    // — would kill chop-flow at 5/sec (explicit DOPAMINE_DESIGN constraint).
    WG.Engine.on('enemy:killed',   () => WG.Engine.hitPause(30));
    WG.Engine.on('boss:damaged',   () => WG.Engine.hitPause(40));
    WG.Engine.on('boss:defeated',  () => WG.Engine.hitPause(220));
    WG.Engine.on('player:damaged', ({ amount }) => { if ((amount || 0) > 20) WG.Engine.hitPause(60); });

    // Sprite-juice state — track damage timestamps for hit-flash + swing for squash.
    WG.Engine.on('enemy:damaged', ({ creature }) => { if (creature) creature._lastDamageAt = performance.now(); });
    WG.Engine.on('player:swing',  () => { _lastSwingAt = performance.now(); });

    // Construction: each wood-tick consumed → small particle puff. Built → big burst + trauma.
    WG.Engine.on('construct:tick', ({ site }) => {
      for (let i = 0; i < 3; i++) {
        const a = Math.random() * Math.PI * 2;
        WG.Render.spawnParticles({
          x: site.x + Math.cos(a) * 16, y: site.y + Math.sin(a) * 12,
          angle: a, speed: 50 + Math.random() * 40,
          life: 0.35, color: '#a8d878', size: 2,
        });
      }
    });
    // W-FX-Polish-Pass — gap 2: track buff expiry/consume for HUD ghost pills.
    function _ghostFor(id) {
      const def = (window.WG && WG.Buffs && WG.Buffs.BUFFS) ? WG.Buffs.BUFFS[id] : null;
      const short = (def && def.short) || (id || '').toUpperCase();
      _buffGhosts.push({ id, short, expiredAt: performance.now() });
    }
    WG.Engine.on('buff:expired',  ({ id }) => _ghostFor(id));
    WG.Engine.on('buff:consumed', ({ id }) => _ghostFor(id));

    WG.Engine.on('construct:built', ({ site }) => {
      addTrauma(0.30);
      WG.Engine.hitPause(80);
      // Big burst at the site
      for (let i = 0; i < 24; i++) {
        const a = Math.PI * 2 * (i / 24);
        WG.Render.spawnParticles({
          x: site.x, y: site.y,
          angle: a, speed: 120 + Math.random() * 60,
          life: 0.8, color: i % 2 === 0 ? '#ffe888' : '#a8d878', size: 3,
        });
      }
    });
  }

  // Expose getStageProps so hunt-player can damage stumps on swing.
  window.WG.HuntRender = { init, drawFrame, setRuntime, w2s, getStageProps, addTrauma };
})();
