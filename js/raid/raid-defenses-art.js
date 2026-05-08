// WG.RaidDefensesArt — procedural ukiyo-e sprites for raids
// Traps:   drawXxx(ctx, sx, sy, state)     state ∈ {idle|telegraph|fired}
// Turrets: drawXxx(ctx, sx, sy, hp, maxHp, aimAngle)
// Sprite footprint: 24×24px centred at (sx, sy). No external deps.
(function () { 'use strict';

  // ── PALETTE ────────────────────────────────────────────────────────────────
  var WOOD  = '#3a2010';
  var IRON  = '#5a6470';
  var PAPER = '#f0e4c8';
  var INK   = '#1a1010';
  var VERM  = '#cc3020';

  // ── SHARED HELPERS ─────────────────────────────────────────────────────────

  // HP bar: 22×3px centred at sx, top-edge at barY
  function _hpBar(ctx, sx, barY, hp, maxHp) {
    var bw = 22, bx = sx - 11;
    var frac = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx, barY, bw, 3);
    ctx.fillStyle = frac > 0.5 ? '#5dcc50' : frac > 0.25 ? '#d0a010' : '#cc2020';
    ctx.fillRect(bx, barY, Math.round(bw * frac), 3);
  }

  // Bell silhouette centred at (x, y), used by drawEchoRinger
  function _bell(ctx, x, y, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(x - 5, y + 5);             // rim left
    ctx.lineTo(x - 3, y - 6);             // upper left
    ctx.arc(x, y - 7, 2.5, Math.PI, 0);  // crown arch
    ctx.lineTo(x + 3, y - 6);             // upper right
    ctx.lineTo(x + 5, y + 5);             // rim right
    ctx.arc(x, y + 5, 5, 0, Math.PI);    // bottom rim
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.fillStyle = '#3a3838';
    ctx.beginPath(); ctx.arc(x, y + 2.5, 1.5, 0, Math.PI * 2); ctx.fill();
  }

  // ── TRAP DRAWERS ───────────────────────────────────────────────────────────

  // 1. Pressure Plate Spike ──────────────────────────────────────────────────
  function drawPressurePlateSpike(ctx, sx, sy, state) {
    ctx.save();
    if (state === 'fired') {
      // Cracked plate fragments
      ctx.fillStyle = '#3a3438';
      ctx.fillRect(sx - 9, sy + 3, 8, 6);
      ctx.fillRect(sx + 2, sy + 4, 7, 5);
      // 5 iron spikes
      ctx.fillStyle = '#8a9aaa';
      ctx.strokeStyle = '#2a3040'; ctx.lineWidth = 0.7;
      for (var k = 0; k < 5; k++) {
        var x = sx - 8 + k * 4;
        ctx.beginPath();
        ctx.moveTo(x,     sy + 3);
        ctx.lineTo(x + 2, sy - 9);
        ctx.lineTo(x + 4, sy + 3);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
      }
    } else {
      if (state === 'telegraph') { ctx.shadowColor = '#cc3010'; ctx.shadowBlur = 10; }
      ctx.fillStyle = '#4a4440';
      ctx.fillRect(sx - 9, sy - 3, 18, 11);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#6a6860'; ctx.lineWidth = 0.8;
      ctx.strokeRect(sx - 9, sy - 3, 18, 11);
      ctx.strokeStyle = '#282422'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx - 9, sy + 2); ctx.lineTo(sx + 9, sy + 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx, sy - 3);     ctx.lineTo(sx, sy + 8);     ctx.stroke();
      ctx.fillStyle = state === 'telegraph' ? '#d0c8b0' : '#706860';
      ctx.globalAlpha = state === 'telegraph' ? 0.9 : 0.45;
      for (var i = 0; i < 5; i++) {
        ctx.beginPath(); ctx.arc(sx - 8 + i * 4, sy + 1, 1.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  // 2. Wraith Mist Bomb ──────────────────────────────────────────────────────
  function drawWraithMistBomb(ctx, sx, sy, state) {
    ctx.save();
    if (state === 'fired') {
      var clouds = [{dx:-4,dy:-3,r:9},{dx:5,dy:-4,r:8},{dx:-2,dy:4,r:10},{dx:4,dy:3,r:7}];
      ctx.globalAlpha = 0.5; ctx.fillStyle = '#7030b0';
      clouds.forEach(function(c) {
        ctx.beginPath(); ctx.arc(sx+c.dx, sy+c.dy, c.r, 0, Math.PI*2); ctx.fill();
      });
      ctx.globalAlpha = 0.22; ctx.fillStyle = '#c080f0';
      clouds.forEach(function(c) {
        ctx.beginPath(); ctx.arc(sx+c.dx-1, sy+c.dy-1, c.r*0.5, 0, Math.PI*2); ctx.fill();
      });
      ctx.globalAlpha = 1;
    } else {
      if (state === 'telegraph') { ctx.shadowColor = '#9050e0'; ctx.shadowBlur = 14; }
      ctx.fillStyle = '#3a1860';
      ctx.beginPath(); ctx.arc(sx, sy + 1, 8, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.35; ctx.fillStyle = '#c080f0';
      ctx.beginPath(); ctx.arc(sx - 2, sy - 2, 3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#6040c0'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(sx, sy + 1, 8, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#8050c8'; ctx.lineWidth = 1; ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.moveTo(sx+1, sy-7); ctx.quadraticCurveTo(sx+6, sy-10, sx+4, sy-12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx+7, sy-1); ctx.quadraticCurveTo(sx+11, sy-4, sx+10, sy-7); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  // 3. Falling Lantern ───────────────────────────────────────────────────────
  function drawFallingLantern(ctx, sx, sy, state) {
    ctx.save();
    if (state === 'fired') {
      ctx.fillStyle = '#7a1818';
      ctx.beginPath(); ctx.ellipse(sx, sy + 8, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
      var flames = [{ox:-3,h:9},{ox:0,h:12},{ox:3,h:8}];
      flames.forEach(function(f) {
        ctx.fillStyle = '#e05010'; ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.moveTo(sx+f.ox, sy+6);
        ctx.quadraticCurveTo(sx+f.ox-3, sy+6-f.h*0.4, sx+f.ox, sy+6-f.h);
        ctx.quadraticCurveTo(sx+f.ox+3, sy+6-f.h*0.4, sx+f.ox, sy+6);
        ctx.fill();
        ctx.fillStyle = '#f0c820'; ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(sx+f.ox, sy+6);
        ctx.quadraticCurveTo(sx+f.ox-1.5, sy+6-f.h*0.28, sx+f.ox, sy+6-f.h*0.65);
        ctx.quadraticCurveTo(sx+f.ox+1.5, sy+6-f.h*0.28, sx+f.ox, sy+6);
        ctx.fill();
        ctx.globalAlpha = 1;
      });
    } else {
      var lx = state === 'telegraph' ? sx + 3 : sx;
      ctx.strokeStyle = '#6a5030'; ctx.lineWidth = 1.2;
      ctx.beginPath();
      if (state === 'telegraph') {
        ctx.moveTo(sx, sy-12); ctx.lineTo(sx+2, sy-9);
        ctx.lineTo(sx-1, sy-6); ctx.lineTo(lx, sy-4);
      } else {
        ctx.moveTo(sx, sy-12); ctx.lineTo(sx, sy-4);
      }
      ctx.stroke();
      if (state === 'telegraph') { ctx.shadowColor = '#e05010'; ctx.shadowBlur = 9; }
      ctx.fillStyle = '#bb2424';
      ctx.beginPath(); ctx.ellipse(lx, sy+2, 6, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#601010'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(lx, sy+2, 6, 9, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#7a1818'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(lx-5, sy);   ctx.lineTo(lx+5, sy);   ctx.stroke();
      ctx.beginPath(); ctx.moveTo(lx-5, sy+4); ctx.lineTo(lx+5, sy+4); ctx.stroke();
      ctx.globalAlpha = 0.28; ctx.fillStyle = '#f8d820';
      ctx.beginPath(); ctx.arc(lx, sy+2, 4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#8a1818'; ctx.lineWidth = 1;
      for (var t = -1; t <= 1; t++) {
        ctx.beginPath(); ctx.moveTo(lx+t*3, sy+11); ctx.lineTo(lx+t*3, sy+13); ctx.stroke();
      }
    }
    ctx.restore();
  }

  // 4. Sigil Snare ───────────────────────────────────────────────────────────
  function drawSigilSnare(ctx, sx, sy, state) {
    ctx.save();
    if (state === 'fired') {
      ctx.strokeStyle = '#f0e840'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(sx, sy, 10, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(sx, sy, 10, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#e0c820'; ctx.lineWidth = 1;
      [0, Math.PI/2, Math.PI, Math.PI*3/2].forEach(function(a) {
        ctx.beginPath();
        ctx.moveTo(sx + 10*Math.cos(a), sy + 10*Math.sin(a));
        ctx.lineTo(sx + 12*Math.cos(a), sy + 12*Math.sin(a));
        ctx.stroke();
      });
      ctx.globalAlpha = 0.75; ctx.fillStyle = '#ffffc0';
      ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      var alpha = state === 'telegraph' ? 1.0 : 0.4;
      var col   = state === 'telegraph' ? '#d0a020' : '#907040';
      if (state === 'telegraph') { ctx.shadowColor = '#e0c040'; ctx.shadowBlur = 10; }
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = col;
      ctx.lineWidth = state === 'telegraph' ? 1.5 : 1;
      ctx.beginPath(); ctx.arc(sx, sy, 9, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx-9, sy); ctx.lineTo(sx+9, sy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx, sy-9); ctx.lineTo(sx, sy+9); ctx.stroke();
      ctx.fillStyle = col;
      [45, 135, 225, 315].forEach(function(deg) {
        var a = deg * Math.PI / 180;
        ctx.beginPath(); ctx.arc(sx + 9*Math.cos(a), sy + 9*Math.sin(a), 1.5, 0, Math.PI*2); ctx.fill();
      });
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  // 5. Echo Ringer ───────────────────────────────────────────────────────────
  function drawEchoRinger(ctx, sx, sy, state) {
    ctx.save();
    if (state === 'fired') {
      [4, 8, 12].forEach(function(r, i) {
        ctx.globalAlpha = 0.9 - i * 0.26;
        ctx.strokeStyle = '#d0c860'; ctx.lineWidth = 1.6 - i * 0.35;
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.globalAlpha = 1;
      _bell(ctx, sx, sy - 2, '#4a5060');
    } else {
      ctx.fillStyle = '#6a5030';
      ctx.fillRect(sx - 1, sy - 12, 2, 4);
      if (state === 'telegraph') {
        ctx.shadowColor = '#d0c860'; ctx.shadowBlur = 10;
        ctx.globalAlpha = 0.3;
        _bell(ctx, sx - 2, sy - 2, '#c0c8a0');
        _bell(ctx, sx + 2, sy - 2, '#c0c8a0');
        ctx.globalAlpha = 1;
      }
      _bell(ctx, sx, sy - 2, state === 'telegraph' ? '#8090a0' : '#6a7880');
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  // 6. Paper Charm Mine ──────────────────────────────────────────────────────
  function drawPaperCharmMine(ctx, sx, sy, state) {
    ctx.save();
    if (state === 'fired') {
      ctx.strokeStyle = PAPER; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.85;
      for (var k = 0; k < 6; k++) {
        var a = (k / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(sx + 3*Math.cos(a), sy + 3*Math.sin(a));
        ctx.lineTo(sx + 11*Math.cos(a), sy + 11*Math.sin(a));
        ctx.stroke();
      }
      ctx.globalAlpha = 0.7; ctx.fillStyle = '#f0d060';
      ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      if (state === 'telegraph') { ctx.shadowColor = '#d0a020'; ctx.shadowBlur = 10; }
      ctx.fillStyle = PAPER;
      ctx.beginPath();
      for (var j = 0; j < 8; j++) {
        var ang = (j / 8) * Math.PI * 2 - Math.PI / 8;
        if (j === 0) ctx.moveTo(sx + 9*Math.cos(ang), sy + 9*Math.sin(ang));
        else         ctx.lineTo(sx + 9*Math.cos(ang), sy + 9*Math.sin(ang));
      }
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = state === 'telegraph' ? '#d0a020' : '#8a7050';
      ctx.lineWidth = 1; ctx.stroke();
      // Simplified seal strokes (kanji-like)
      ctx.strokeStyle = VERM; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx,   sy-4); ctx.lineTo(sx,   sy+4);
      ctx.moveTo(sx-3, sy-2); ctx.lineTo(sx+3, sy-2);
      ctx.moveTo(sx-3, sy+1); ctx.lineTo(sx+3, sy+1);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── TURRET DRAWERS ─────────────────────────────────────────────────────────

  // 7. Cannon Turret ─────────────────────────────────────────────────────────
  function drawCannonTurret(ctx, sx, sy, hp, maxHp, aimAngle) {
    ctx.save();
    _hpBar(ctx, sx, sy - 13, hp, maxHp);
    // Octagonal stone base
    ctx.fillStyle = '#3a3040'; ctx.strokeStyle = INK; ctx.lineWidth = 1;
    ctx.beginPath();
    for (var k = 0; k < 8; k++) {
      var a = (k / 8) * Math.PI * 2 - Math.PI / 8;
      if (k === 0) ctx.moveTo(sx + 8*Math.cos(a), sy + 8*Math.sin(a));
      else         ctx.lineTo(sx + 8*Math.cos(a), sy + 8*Math.sin(a));
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // Barrel (dark wood + iron hoops)
    ctx.save();
    ctx.translate(sx, sy); ctx.rotate(aimAngle);
    ctx.fillStyle = WOOD; ctx.strokeStyle = INK; ctx.lineWidth = 0.8;
    ctx.fillRect(0, -3, 12, 6); ctx.strokeRect(0, -3, 12, 6);
    ctx.fillStyle = IRON;
    ctx.fillRect(3, -3, 2, 6);
    ctx.fillRect(7, -3, 2, 6);
    ctx.restore();
    // Pivot
    ctx.fillStyle = '#8090a0';
    ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // 8. Archer Turret ─────────────────────────────────────────────────────────
  function drawArcherTurret(ctx, sx, sy, hp, maxHp, aimAngle) {
    ctx.save();
    _hpBar(ctx, sx, sy - 13, hp, maxHp);
    // Tower body
    ctx.fillStyle = WOOD; ctx.strokeStyle = INK; ctx.lineWidth = 1;
    ctx.fillRect(sx - 6, sy - 8, 12, 15); ctx.strokeRect(sx - 6, sy - 8, 12, 15);
    // Arrow slits
    ctx.fillStyle = '#100808';
    ctx.fillRect(sx - 4, sy - 3, 2, 7);
    ctx.fillRect(sx + 2, sy - 3, 2, 7);
    // 3 merlons
    ctx.fillStyle = '#4a2818';
    [-4, 0, 4].forEach(function(ox) { ctx.fillRect(sx+ox-2, sy-11, 4, 4); });
    // Arrow direction indicator
    ctx.save();
    ctx.translate(sx, sy); ctx.rotate(aimAngle);
    ctx.strokeStyle = '#d0a040'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(11, 0); ctx.stroke();
    ctx.fillStyle = '#d0a040';
    ctx.beginPath(); ctx.moveTo(11,0); ctx.lineTo(8,-2); ctx.lineTo(8,2); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  // 9. Mortar Turret ─────────────────────────────────────────────────────────
  function drawMortarTurret(ctx, sx, sy, hp, maxHp, aimAngle) {
    ctx.save();
    _hpBar(ctx, sx, sy - 13, hp, maxHp);
    // Wide stone platform
    ctx.fillStyle = '#4a4448'; ctx.strokeStyle = INK; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(sx, sy+2, 9, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5a6070';
    ctx.beginPath(); ctx.arc(sx, sy+2, 7, 0, Math.PI*2); ctx.fill();
    // Short wide barrel
    ctx.save();
    ctx.translate(sx, sy + 2); ctx.rotate(aimAngle);
    ctx.fillStyle = '#4a5060'; ctx.strokeStyle = INK; ctx.lineWidth = 0.8;
    ctx.fillRect(-2, -5, 9, 10); ctx.strokeRect(-2, -5, 9, 10);
    ctx.fillStyle = '#3a4048'; ctx.fillRect(5, -5, 2, 10);
    ctx.restore();
    // Bore
    ctx.fillStyle = '#181820';
    ctx.beginPath(); ctx.arc(sx, sy+2, 3.5, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // 10. Ward Turret ──────────────────────────────────────────────────────────
  function drawWardTurret(ctx, sx, sy, hp, maxHp, aimAngle) {
    ctx.save();
    _hpBar(ctx, sx, sy - 13, hp, maxHp);
    // Wooden post
    ctx.fillStyle = '#4a3018'; ctx.strokeStyle = INK; ctx.lineWidth = 0.8;
    ctx.fillRect(sx-2, sy-10, 4, 18); ctx.strokeRect(sx-2, sy-10, 4, 18);
    // Paper talisman strips (3)
    [-5, 0, 5].forEach(function(ox) {
      ctx.fillStyle = PAPER; ctx.strokeStyle = '#a09070'; ctx.lineWidth = 0.5;
      ctx.fillRect(sx+ox-2, sy-6, 4, 9); ctx.strokeRect(sx+ox-2, sy-6, 4, 9);
      ctx.strokeStyle = VERM; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(sx+ox, sy-4); ctx.lineTo(sx+ox, sy+1); ctx.stroke();
    });
    // Spirit orb (amber glow at top)
    ctx.fillStyle = '#e0c050';
    ctx.shadowColor = '#f0d020'; ctx.shadowBlur = 7;
    ctx.beginPath(); ctx.arc(sx, sy-10, 4, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.3; ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(sx-1, sy-11, 2, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
    // Spirit bolt direction indicator
    ctx.save();
    ctx.translate(sx, sy); ctx.rotate(aimAngle);
    ctx.strokeStyle = '#b090d0'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(9, 0); ctx.stroke();
    ctx.fillStyle = '#b090d0';
    ctx.beginPath(); ctx.moveTo(9,0); ctx.lineTo(7,-1.5); ctx.lineTo(7,1.5); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  // ── DISPATCH HELPERS ───────────────────────────────────────────────────────

  var TRAP_MAP = {
    pressure_spike:  drawPressurePlateSpike,
    wraith_mist:     drawWraithMistBomb,
    falling_lantern: drawFallingLantern,
    sigil_snare:     drawSigilSnare,
    echo_ringer:     drawEchoRinger,
    paper_charm:     drawPaperCharmMine,
  };

  var TURRET_MAP = {
    cannon: drawCannonTurret,
    archer: drawArcherTurret,
    mortar: drawMortarTurret,
    ward:   drawWardTurret,
  };

  function drawTrap(ctx, sx, sy, trapId, state) {
    var fn = TRAP_MAP[trapId];
    if (fn) fn(ctx, sx, sy, state || 'idle');
  }

  function drawTurret(ctx, sx, sy, turretId, hp, maxHp, aimAngle) {
    var fn = TURRET_MAP[turretId];
    if (fn) fn(ctx, sx, sy, hp, maxHp, aimAngle || 0);
  }

  window.WG = window.WG || {};
  window.WG.RaidDefensesArt = {
    drawPressurePlateSpike : drawPressurePlateSpike,
    drawWraithMistBomb     : drawWraithMistBomb,
    drawFallingLantern     : drawFallingLantern,
    drawSigilSnare         : drawSigilSnare,
    drawEchoRinger         : drawEchoRinger,
    drawPaperCharmMine     : drawPaperCharmMine,
    drawCannonTurret       : drawCannonTurret,
    drawArcherTurret       : drawArcherTurret,
    drawMortarTurret       : drawMortarTurret,
    drawWardTurret         : drawWardTurret,
    drawTrap               : drawTrap,
    drawTurret             : drawTurret,
  };
})();
