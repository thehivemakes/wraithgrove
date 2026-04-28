// WG.HuntRender — top-down arena rendering with camera follow + level-up draft + HUD
(function(){'use strict';
  const D = () => window.WG.Display;
  const camera = { x: 0, y: 0 };
  let runtime = null;
  let _edgePulse = null;

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

  function setRuntime(rt) { runtime = rt; }

  function updateCamera() {
    if (!runtime || !runtime.player) return;
    const p = runtime.player;
    const vw = D().width, vh = D().height;
    let cx = p.x - vw/2, cy = p.y - vh/2 + 32;  // offset down a touch since HUD eats the top
    if (runtime.mapW <= vw) cx = (runtime.mapW - vw)/2;
    else cx = Math.max(0, Math.min(runtime.mapW - vw, cx));
    if (runtime.mapH <= vh) cy = (runtime.mapH - vh)/2;
    else cy = Math.max(0, Math.min(runtime.mapH - vh, cy));
    camera.x = cx; camera.y = cy;
  }

  function w2s(wx, wy) { return { x: wx - camera.x, y: wy - camera.y }; }

  function tileHash(x, y) {
    return ((x * 374761393) ^ (y * 668265263)) >>> 0;
  }

  function drawDecoration(ctx, biome, x, y, wx, wy, ts) {
    const hash = tileHash(x, y);
    switch (biome.decoration) {
      case 'grass-tufts': {
        if (hash % 6 !== 0) break;
        const bx = wx + (hash >>> 4) % (ts - 6) + 3;
        const by = wy + (hash >>> 8) % (ts - 6) + 3;
        const hex = biome.ground;
        const lr = Math.min(255, parseInt(hex.slice(1,3), 16) + 20);
        const lg = Math.min(255, parseInt(hex.slice(3,5), 16) + 20);
        const lb = Math.min(255, parseInt(hex.slice(5,7), 16) + 20);
        ctx.fillStyle = 'rgb(' + lr + ',' + lg + ',' + lb + ')';
        ctx.fillRect(bx - 2, by, 1, 3);
        ctx.fillRect(bx,     by, 1, 3);
        ctx.fillRect(bx + 2, by, 1, 3);
        break;
      }
      case 'snow-flecks': {
        ctx.fillStyle = 'rgba(240,248,255,0.7)';
        ctx.fillRect(wx + (hash >>> 4)  % ts, wy + (hash >>> 8)  % ts, 1, 1);
        ctx.fillRect(wx + (hash >>> 12) % ts, wy + (hash >>> 16) % ts, 1, 1);
        ctx.fillRect(wx + (hash >>> 20) % ts, wy + (hash >>> 24) % ts, 1, 1);
        break;
      }
      case 'leaves': {
        if (hash % 4 !== 0) break;
        const lx = wx + (hash >>> 4) % (ts - 8) + 4;
        const ly = wy + (hash >>> 8) % (ts - 8) + 4;
        const pal = ['#a04018', '#c05828', '#7a3010'];
        ctx.fillStyle = pal[(hash >>> 20) % 3];
        if ((hash >>> 16) % 4 & 1) {
          ctx.fillRect(lx - 1, ly - 2, 2, 4);
        } else {
          ctx.fillRect(lx - 2, ly - 1, 4, 2);
        }
        break;
      }
      case 'tiles': {
        if (hash % 3 !== 0) break;
        const cx = wx + 16, cy = wy + 16;
        ctx.strokeStyle = 'rgba(232,192,96,0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - 3, cy); ctx.lineTo(cx + 3, cy);
        ctx.moveTo(cx, cy - 3); ctx.lineTo(cx, cy + 3);
        ctx.stroke();
        break;
      }
      case 'rocks': {
        if (hash % 5 !== 0) break;
        const rx = wx + (hash >>> 4) % (ts - 6) + 3;
        const ry = wy + (hash >>> 8) % (ts - 6) + 3;
        ctx.fillStyle = '#5a5a60';
        ctx.fillRect(rx, ry, 3, 3);
        break;
      }
      case 'sigils': {
        if (hash % 7 !== 0) break;
        const sx = wx + 16, sy = wy + 16;
        const now = Date.now() / 1000;
        const alpha = 0.5 + 0.3 * Math.sin(now * 2);
        ctx.strokeStyle = '#a060ff';
        ctx.lineWidth = 1;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(sx, sy, 3, 0, Math.PI * 2);
        ctx.moveTo(sx - 2, sy); ctx.lineTo(sx + 2, sy);
        ctx.moveTo(sx, sy - 2); ctx.lineTo(sx, sy + 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      }
    }
  }

  function drawTiles(ctx, biome) {
    const ts = 32;
    const x0 = Math.max(0, Math.floor(camera.x / ts) - 1);
    const x1 = Math.ceil((camera.x + D().width) / ts) + 1;
    const y0 = Math.max(0, Math.floor(camera.y / ts) - 1);
    const y1 = Math.ceil((camera.y + D().height) / ts) + 1;
    // Solid biome ground (Wood Siege fidelity — observation §3 Stage 1: "Solid green
     // grass field with darker green grass tufts as decoration"). The prior checker
     // pattern between ground/groundAlt scanned as test-build art; killed.
    // groundAlt now reserved for sparse darker variation via per-tile hash, not parity.
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const wx = x * ts - camera.x, wy = y * ts - camera.y;
        const h = tileHash(x, y);
        // ~12% of tiles get the darker variant — sparse, not checkered
        const useAlt = (h % 8) === 0 && biome.groundAlt;
        ctx.fillStyle = useAlt ? biome.groundAlt : biome.ground;
        ctx.fillRect(wx, wy, ts, ts);
        drawDecoration(ctx, biome, x, y, wx, wy, ts);
      }
    }
    // Map boundary trees as a thick band
    drawMapBorder(ctx, biome);
  }

  function drawMapBorder(ctx, biome) {
    const tsize = 32;
    const cols = Math.ceil(runtime.mapW / tsize);
    const rows = Math.ceil(runtime.mapH / tsize);
    ctx.fillStyle = biome.tree;
    for (let x = 0; x < cols; x++) {
      const sN = w2s(x*tsize, 0);
      ctx.fillRect(sN.x, sN.y - 16, tsize, 24);
      const sS = w2s(x*tsize, runtime.mapH - 16);
      ctx.fillRect(sS.x, sS.y, tsize, 24);
    }
    for (let y = 0; y < rows; y++) {
      const sW = w2s(0, y*tsize);
      ctx.fillRect(sW.x - 16, sW.y, 24, tsize);
      const sE = w2s(runtime.mapW - 16, y*tsize);
      ctx.fillRect(sE.x, sE.y, 24, tsize);
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
    ctx.strokeStyle = '#3a1808'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx - sz*0.3, sy - sz*0.2); ctx.lineTo(sx - sz*0.4, sy - sz*0.5);
    ctx.moveTo(sx - sz*0.4, sy - sz*0.5); ctx.lineTo(sx - sz*0.5, sy - sz*0.45);
    ctx.moveTo(sx - sz*0.4, sy - sz*0.5); ctx.lineTo(sx - sz*0.35, sy - sz*0.6);
    ctx.moveTo(sx + sz*0.3, sy - sz*0.2); ctx.lineTo(sx + sz*0.4, sy - sz*0.5);
    ctx.moveTo(sx + sz*0.4, sy - sz*0.5); ctx.lineTo(sx + sz*0.5, sy - sz*0.45);
    ctx.moveTo(sx + sz*0.4, sy - sz*0.5); ctx.lineTo(sx + sz*0.35, sy - sz*0.6);
    ctx.stroke();
    ctx.fillStyle = '#ffa840';
    ctx.fillRect(sx - 5, sy - 3, 3, 3);
    ctx.fillRect(sx + 2, sy - 3, 3, 3);
    drawBossAura(ctx, sx, sy, sz, 'rgba(232, 128, 56, 0.28)', t);
  }

  function drawBoss_temple_warden(ctx, sx, sy, b, t) {
    const sz = b.size;
    ctx.fillStyle = b._typeData.color;
    ctx.fillRect(sx - sz*0.4, sy - sz*0.5, sz*0.8, sz);
    const glow = 0.5 + 0.3 * Math.sin(t*2);
    ctx.fillStyle = `rgba(255, 200, 80, ${glow})`;
    ctx.fillRect(sx - 4, sy - sz*0.3, 8, sz*0.6);
    ctx.strokeStyle = '#5a3818'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx - sz*0.4, sy - sz*0.2); ctx.lineTo(sx - sz*0.1, sy);
    ctx.lineTo(sx - sz*0.2, sy + sz*0.3);
    ctx.moveTo(sx + sz*0.4, sy - sz*0.3); ctx.lineTo(sx + sz*0.15, sy + sz*0.1);
    ctx.stroke();
    drawBossAura(ctx, sx, sy, sz, 'rgba(232, 192, 96, 0.3)', t);
  }

  function drawBoss_cave_mother(ctx, sx, sy, b, t) {
    const sz = b.size;
    ctx.fillStyle = b._typeData.color;
    ctx.beginPath(); ctx.arc(sx, sy, sz*0.5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#a02828';
    for (let row = 0; row < 2; row++) {
      for (let col = -1; col <= 1; col++) {
        const ex = sx + col*8;
        const ey = sy + row*8 - 4;
        const wink = (Math.sin(t*1.7 + row*7 + col*11) > 0.7) ? 0.5 : 1;
        ctx.globalAlpha = wink;
        ctx.fillRect(ex - 1, ey - 1, 3, 3);
      }
    }
    ctx.globalAlpha = 1;
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
    ctx.fillStyle = '#a060ff';
    for (let i = 0; i < 4; i++) {
      const ang = t * 0.7 + i * Math.PI * 0.5;
      const r = sz * 0.32;
      const ex = sx + Math.cos(ang) * r;
      const ey = sy + Math.sin(ang) * r;
      ctx.fillRect(ex - 1.5, ey - 1.5, 3, 3);
    }
    ctx.strokeStyle = '#6020a0'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx - sz*0.3, sy - sz*0.4); ctx.lineTo(sx - sz*0.45, sy - sz*0.7);
    ctx.moveTo(sx + sz*0.3, sy - sz*0.4); ctx.lineTo(sx + sz*0.45, sy - sz*0.7);
    ctx.moveTo(sx, sy - sz*0.45); ctx.lineTo(sx, sy - sz*0.75);
    ctx.stroke();
    drawBossAura(ctx, sx, sy, sz, 'rgba(160, 96, 255, 0.35)', t);
  }

  function drawCreatures(ctx) {
    for (const c of runtime.creatures) {
      if (c.hp <= 0) continue;
      const s = w2s(c.x, c.y);
      ctx.fillStyle = c._typeData.color;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, c.size/2, c.size/1.7, 0, 0, Math.PI*2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = c._typeData.accent;
      ctx.fillRect(s.x - 3, s.y - 2, 2, 2);
      ctx.fillRect(s.x + 1, s.y - 2, 2, 2);
      if (c.hp < c.maxHp) WG.Render.drawHpBar(ctx, s.x, s.y - c.size/2 - 6, Math.max(20, c.size+4), c.hp, c.maxHp);
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
      // Boss HP bar at top of screen — preserve existing implementation
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

  function drawPlayer(ctx) {
    const p = runtime.player;
    if (!p) return;
    const s = w2s(p.x, p.y);
    // Auto-attack ring (Wood Siege fidelity — observation §3 Stage 1: "the green ring
     // visible around the player is the auto-attack radius indicator"). Wraithgrove
     // previously rendered this in pale gold at 20% opacity — effectively invisible.
     // Now: green, gently pulsing, at 45% peak so the player can read attack reach.
    const meleeId = (runtime.player.heldPickupId || WG.State.get().player.slots.melee || 'branch_stick');
    const wep = WG.HuntWeapons.byId(meleeId);
    if (wep) {
      const pulse = 0.32 + 0.13 * Math.sin(performance.now() / 380);
      ctx.strokeStyle = `rgba(120, 220, 120, ${pulse})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(s.x, s.y, wep.range, 0, Math.PI*2); ctx.stroke();
      // Soft inner glow so the ring reads on bright biomes too
      ctx.strokeStyle = 'rgba(180, 240, 180, 0.18)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(s.x, s.y, wep.range, 0, Math.PI*2); ctx.stroke();
      ctx.lineWidth = 1;
    }
    // body
    ctx.fillStyle = '#3a3022';
    ctx.beginPath(); ctx.ellipse(s.x, s.y+2, 9, 12, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#f0d890';
    ctx.beginPath(); ctx.arc(s.x, s.y - 4, 5, 0, Math.PI*2); ctx.fill();
    // weapon hint glyph at hand
    ctx.fillStyle = (wep && wep.visual && wep.visual.color) || '#ccc';
    ctx.fillRect(s.x + 7, s.y - 1, 6, 2);
    // hp bar
    if (p.hp < p.maxHp) WG.Render.drawHpBar(ctx, s.x, s.y - 18, 26, p.hp, p.maxHp);
  }

  function drawHud(ctx) {
    const p = runtime.player;
    if (!p) return;
    const w = D().width;
    // top-left: level + xp
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(8, 40, 110, 28);
    ctx.fillStyle = '#f0d890';
    ctx.font = 'bold 10px system-ui';
    ctx.fillText('Lvl ' + p.level, 14, 53);
    ctx.fillStyle = '#3a3022'; ctx.fillRect(14, 56, 96, 4);
    ctx.fillStyle = '#a8d878'; ctx.fillRect(14, 56, 96 * (p.xp / p.xpToNext), 4);
    // hp number
    ctx.fillStyle = '#f0d890'; ctx.fillText(Math.ceil(p.hp) + ' / ' + p.maxHp, 60, 64);

    // top-center: stage banner / wave time
    const banner = document.getElementById('hunt-stage-banner');
    if (banner && runtime.stage) {
      const elapsed = runtime.elapsed;
      const dur = runtime.stage.durationSec;
      banner.textContent = `${runtime.stage.name} — ${(elapsed/60).toFixed(1)}m / ${(dur/60).toFixed(1)}m`;
    }

    // skill button cooldown overlay (DOM)
    const skillBtn = document.getElementById('hunt-skill-btn');
    if (skillBtn) {
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

  function drawFrame() {
    if (!runtime || !runtime.stage) return;
    const ctx = D().ctx;
    const biome = WG.HuntStage.getBiome(runtime.stage.biome);
    updateCamera();
    WG.Render.clear(ctx, biome.ground);
    drawTiles(ctx, biome);
    drawDrops(ctx);
    if (window.WG.HuntPickups) WG.HuntPickups.draw(ctx, w2s, runtime);
    drawCreatures(ctx);
    drawProjectiles(ctx);
    drawPlayer(ctx);
    WG.Render.drawParticles(ctx, w2s);
    // light fog overlay
    if (biome.lightFog > 0) {
      ctx.fillStyle = `rgba(0,0,0,${biome.lightFog})`;
      ctx.fillRect(0, 0, D().width, D().height);
    }
    drawEdgePulse(ctx);
    drawHud(ctx);
    drawLevelUpModal(ctx);
  }

  function init() {
    // Wire skill button + canvas tap (for level-up cards)
    const skillBtn = document.getElementById('hunt-skill-btn');
    if (skillBtn) skillBtn.addEventListener('click', () => WG.Input.triggerSkill());
    D().canvas.addEventListener('pointerdown', (e) => {
      if (WG.State.get().activeTab !== 'hunt') return;
      if (handleHuntTap(e.clientX, e.clientY)) e.stopImmediatePropagation();
    }, true);

    // Particle hooks
    WG.Engine.on('enemy:killed', ({ creature }) => {
      for (let i = 0; i < 8; i++)
        WG.Render.spawnParticles({ x: creature.x, y: creature.y, life: 0.5, color: creature._typeData.accent || '#a82828', size: 2 });
    });
    WG.Engine.on('player:swing', () => {
      const p = runtime && runtime.player; if (!p) return;
      for (let i = 0; i < 4; i++)
        WG.Render.spawnParticles({ x: p.x, y: p.y, life: 0.25, color: '#f0e0a0', size: 2 });
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

  window.WG.HuntRender = { init, drawFrame, setRuntime, w2s };
})();
