// WG.HuntTowerRender — Tower Gauntlet procedural interior painter.
// W-Tower-Visual-Polish (2026-05-08): 6 floor-tier backdrops, 4-6 parallax layers,
// tier-specific ambient particles, 30% accent shift per 10-floor band.
// W-Tower-Art-Procedural (2026-05-05) by Sconce: original stone temple painter.
// Called by hunt-render.js _drawFrameTower() — no own rAF, driven by main loop.
// paintTowerInterior(ctx, w, h, t, floor, clearShift=0)
//   clearShift 0→1: forward parallax offset for floor-clear payoff (600ms ease).
(function(){'use strict';

  function _hash(i){ const x=Math.sin(i*12.9898)*43758.5453; return x-Math.floor(x); }
  function _lerp(a,b,t){ return a+(b-a)*t; }
  function _lerpC(a,b,t){ return [Math.round(_lerp(a[0],b[0],t)),Math.round(_lerp(a[1],b[1],t)),Math.round(_lerp(a[2],b[2],t))]; }
  function _rgb(c){ return 'rgb('+c[0]+','+c[1]+','+c[2]+')'; }
  function _rgba(c,a){ return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')'; }

  // ─── 6 tier configurations ────────────────────────────────────────────────
  const TIERS = [
    { id:'wooden_hall',    min:1,  max:9,
      bgT:'#1a0d04', bgM:'#2a1508', bgB:'#0e0600',
      wallA:'#3d2210', wallB:'#291508',
      colA:'#4a2e14', colB:'#5c3a1c',
      floorA:'#2e1a08', floorB:'#3a2010', floorLine:'rgba(16,6,0,0.7)',
      acc:[255,130,36], accB:[255,185,65],
      partRGB:[220,168,85], partType:'mote', partCnt:18,
    },
    { id:'mossy_stone',    min:10, max:19,
      bgT:'#030d06', bgM:'#051410', bgB:'#020908',
      wallA:'#182e1e', wallB:'#0f1e14',
      colA:'#1a3020', colB:'#243a28',
      floorA:'#0e1e12', floorB:'#182a1a', floorLine:'rgba(2,10,4,0.65)',
      acc:[60,188,100], accB:[85,230,145],
      partRGB:[100,200,140], partType:'chip', partCnt:20,
    },
    { id:'cracked_obsidian', min:20, max:29,
      bgT:'#060200', bgM:'#100400', bgB:'#040100',
      wallA:'#1c0804', wallB:'#100400',
      colA:'#220a04', colB:'#2c0e06',
      floorA:'#100400', floorB:'#1c0804', floorLine:'rgba(80,22,0,0.28)',
      acc:[255,90,18], accB:[255,55,0],
      partRGB:[255,100,28], partType:'ash', partCnt:24,
    },
    { id:'bone_yard',      min:30, max:39,
      bgT:'#080c05', bgM:'#0e1408', bgB:'#060a04',
      wallA:'#c4c2ae', wallB:'#b0ae9c',
      colA:'#b8b6a2', colB:'#cccab8',
      floorA:'#a8a898', floorB:'#bcbcac', floorLine:'rgba(60,60,40,0.4)',
      acc:[118,200,76], accB:[158,255,78],
      partRGB:[228,228,198], partType:'dust', partCnt:22,
    },
    { id:'starlight_void', min:40, max:49,
      bgT:'#000006', bgM:'#00000c', bgB:'#000004',
      wallA:'#030312', wallB:'#02020a',
      colA:'#050514', colB:'#08081c',
      floorA:'#02020c', floorB:'#04040e', floorLine:'rgba(38,38,118,0.22)',
      acc:[100,118,255], accB:[142,100,255],
      partRGB:[178,200,255], partType:'star', partCnt:30,
    },
    { id:'wraith_court',   min:50, max:9999,
      bgT:'#050008', bgM:'#09000e', bgB:'#040008',
      wallA:'#190028', wallB:'#110018',
      colA:'#1c002e', colB:'#240040',
      floorA:'#0e0018', floorB:'#160024', floorLine:'rgba(80,0,100,0.32)',
      acc:[158,38,198], accB:[198,18,158],
      partRGB:[178,58,218], partType:'ember', partCnt:26,
    },
  ];

  function _getTier(floor){
    for(const t of TIERS){ if(floor>=t.min && floor<=t.max) return t; }
    return TIERS[5];
  }

  // 30% accent shift across band's floor span
  function _accent(tier, floor){
    const span = tier.max-tier.min;
    const k = span>0 ? Math.min(1,((floor-tier.min)/span)*0.30) : 0;
    return _lerpC(tier.acc, tier.accB, k);
  }

  // ─── Shared draw helpers ─────────────────────────────────────────────────

  function _bgGrad(ctx, w, h, tier){
    const g = ctx.createLinearGradient(0,0,0,h);
    g.addColorStop(0,   tier.bgT);
    g.addColorStop(0.5, tier.bgM);
    g.addColorStop(1,   tier.bgB);
    ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
  }

  // Draw 4 columns with gradient body + optional edge glow
  function _columns(ctx, w, h, tier, acc, dy, glowAlpha){
    const COL_X = [w*0.10, w*0.26, w*0.74, w*0.90];
    const CW = 32;
    for(let ci=0;ci<4;ci++){
      const cx = COL_X[ci];
      const cg = ctx.createLinearGradient(cx-CW/2,0,cx+CW/2,0);
      cg.addColorStop(0,    tier.colA+'cc');
      cg.addColorStop(0.4,  tier.colB);
      cg.addColorStop(0.7,  tier.colA);
      cg.addColorStop(1,    tier.colA+'aa');
      ctx.fillStyle = cg;
      ctx.fillRect(cx-CW/2, dy, CW, h);
      // seam lines
      ctx.strokeStyle='rgba(0,0,0,0.55)'; ctx.lineWidth=0.7;
      for(let s=1;s<7;s++){
        const sy=dy+h*(s/7);
        ctx.beginPath(); ctx.moveTo(cx-CW/2,sy); ctx.lineTo(cx+CW/2,sy); ctx.stroke();
      }
      if(glowAlpha>0){
        const side=ci<2?1:-1;
        const bg2=ctx.createLinearGradient(cx+side*(CW/2),0,cx+side*(CW/2+30),0);
        bg2.addColorStop(0,_rgba(acc,glowAlpha));
        bg2.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=bg2;
        ctx.fillRect(cx+side*(CW/2),dy,side*30,h);
      }
    }
  }

  function _floor(ctx, w, h, tier, dy){
    const fy=h*0.72+dy;
    const fg=ctx.createLinearGradient(0,fy,0,h);
    fg.addColorStop(0,tier.floorA); fg.addColorStop(1,tier.floorB);
    ctx.fillStyle=fg; ctx.fillRect(0,fy,w,h-fy);
    // tile lines
    ctx.strokeStyle=tier.floorLine; ctx.lineWidth=0.7;
    const tw=w/7, fh=(h-fy)/3;
    for(let c=0;c<=7;c++){
      ctx.beginPath(); ctx.moveTo(c*tw,fy); ctx.lineTo(c*tw,h); ctx.stroke();
    }
    for(let r=0;r<=3;r++){
      ctx.beginPath(); ctx.moveTo(0,fy+r*fh); ctx.lineTo(w,fy+r*fh); ctx.stroke();
    }
  }

  // ─── Tier painters ───────────────────────────────────────────────────────

  // ── Tier 1: Wooden Hall (floors 1-9) ─────────────────────────────────────
  function _paintWoodenHall(ctx, w, h, t, tier, acc, pOff){
    _bgGrad(ctx,w,h,tier);

    // Back wall — horizontal wood planks
    const planks=12;
    for(let i=0;i<planks;i++){
      const py=h*0.04+(h*0.70/planks)*i;
      const ph=h*0.70/planks-2;
      const darkness=0.05+_hash(i)*0.06;
      ctx.fillStyle=`rgba(${Math.round(acc[0]*0.4)},${Math.round(acc[1]*0.15)},0,${darkness})`;
      ctx.fillRect(w*0.22,py,w*0.56,ph);
      // grain line
      ctx.strokeStyle='rgba(8,2,0,0.28)'; ctx.lineWidth=0.5;
      ctx.beginPath(); ctx.moveTo(w*0.22,py+ph); ctx.lineTo(w*0.78,py+ph); ctx.stroke();
    }

    // Mid layer 1 — hanging banners (parallax 0.3)
    ctx.save(); ctx.translate(pOff.dx*0.3, pOff.dy*0.3);
    const bannerX=[w*0.35,w*0.50,w*0.65];
    for(const bx of bannerX){
      const bw=18, bh=h*0.28;
      ctx.fillStyle=`rgba(${acc[0]*0.8|0},${acc[1]*0.3|0},0,0.55)`;
      ctx.fillRect(bx-bw/2, h*0.04, bw, bh);
      // fringe
      for(let f=0;f<5;f++){
        ctx.fillStyle=`rgba(${acc[0]},${acc[1]*0.5|0},0,0.7)`;
        ctx.fillRect(bx-bw/2+f*(bw/5), h*0.04+bh, bw/5-1, 8);
      }
    }
    ctx.restore();

    // Ceiling beams (parallax 0.5)
    ctx.save(); ctx.translate(pOff.dx*0.5, pOff.dy*0.5);
    const beamX=[w*0.22,w*0.50,w*0.78];
    for(const bx of beamX){
      ctx.fillStyle='#08030d'; ctx.fillRect(bx-10,0,20,h*0.06);
    }
    ctx.restore();

    // Columns (parallax 0.55)
    ctx.save(); ctx.translate(pOff.dx*0.55, pOff.dy*0.55);
    _columns(ctx,w,h,tier,acc,-pOff.dy*0.55,0.10);
    // Torch glows at 30% + 65%
    const COL_X=[w*0.10,w*0.26,w*0.74,w*0.90];
    for(let ci=0;ci<4;ci++){
      for(let ti=0;ti<2;ti++){
        const cy=h*(0.30+ti*0.35);
        const seed=ci*7+ti*13;
        const flk=0.55+Math.sin(t*8.1+seed)*0.30+Math.sin(t*5.3+seed+2.1)*0.15;
        const gr=ctx.createRadialGradient(COL_X[ci],cy,0,COL_X[ci],cy,28);
        gr.addColorStop(0,_rgba(acc,0.50*flk));
        gr.addColorStop(0.5,_rgba(acc,0.14*flk));
        gr.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=gr; ctx.beginPath(); ctx.arc(COL_X[ci],cy,28,0,Math.PI*2); ctx.fill();
        // flame
        ctx.fillStyle=_rgba([Math.min(255,acc[0]+60),Math.min(255,acc[1]+40),acc[2]],0.9*flk);
        ctx.beginPath(); ctx.moveTo(COL_X[ci]-2.5,cy);
        ctx.quadraticCurveTo(COL_X[ci]+Math.sin(t*11+seed)*3,cy-6,COL_X[ci],cy-10);
        ctx.quadraticCurveTo(COL_X[ci]-Math.sin(t*11+seed)*3,cy-6,COL_X[ci]+2.5,cy);
        ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();

    // Floor (parallax 0.8)
    ctx.save(); ctx.translate(pOff.dx*0.8, pOff.dy*0.8);
    _floor(ctx,w,h,tier,pOff.dy*0.1);
    ctx.restore();
  }

  // ── Tier 2: Mossy Stone (floors 10-19) ────────────────────────────────────
  function _paintMossyStone(ctx, w, h, t, tier, acc, pOff){
    _bgGrad(ctx,w,h,tier);

    // Back wall — stone tile grid with mossy patches
    ctx.save(); ctx.translate(pOff.dx*0,pOff.dy*0);
    const wallL=w*0.24, wallR=w*0.76, wallH=h*0.70;
    const tW=(wallR-wallL)/8, tH=wallH/10;
    ctx.strokeStyle='rgba(4,18,8,0.5)'; ctx.lineWidth=0.7;
    for(let c=0;c<=8;c++){
      ctx.beginPath(); ctx.moveTo(wallL+c*tW,0); ctx.lineTo(wallL+c*tW,wallH); ctx.stroke();
    }
    for(let r=0;r<=10;r++){
      ctx.beginPath(); ctx.moveTo(wallL,r*tH); ctx.lineTo(wallR,r*tH); ctx.stroke();
    }
    // Mossy patches — green blobs
    for(let m=0;m<20;m++){
      const mx=wallL+_hash(m+100)*(wallR-wallL);
      const my=_hash(m+200)*wallH;
      const mr=8+_hash(m+300)*14;
      ctx.fillStyle=`rgba(${acc[0]*0.4|0},${acc[1]*0.5|0},${acc[2]*0.3|0},0.35)`;
      ctx.beginPath(); ctx.arc(mx,my,mr,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();

    // Mid layer 1 — dripping stalactites (parallax 0.3)
    ctx.save(); ctx.translate(pOff.dx*0.3,pOff.dy*0.3);
    for(let s=0;s<8;s++){
      const sx=w*(0.12+s*0.11);
      const sl=h*(0.08+_hash(s+50)*0.12);
      const drip=(Math.sin(t*0.8+s*1.1)+1)*0.5;
      ctx.fillStyle=_rgba(acc,0.30);
      ctx.beginPath(); ctx.moveTo(sx-4,0); ctx.lineTo(sx+4,0); ctx.lineTo(sx+1,sl); ctx.lineTo(sx-1,sl); ctx.closePath(); ctx.fill();
      // drip bead
      if(drip>0.5){
        const bead=sl+(drip-0.5)*h*0.06;
        ctx.fillStyle=_rgba(acc,0.55); ctx.beginPath(); ctx.arc(sx,bead,2.5,0,Math.PI*2); ctx.fill();
      }
    }
    ctx.restore();

    // Columns + green glow (parallax 0.55)
    ctx.save(); ctx.translate(pOff.dx*0.55,pOff.dy*0.55);
    _columns(ctx,w,h,tier,acc,-pOff.dy*0.55,0.14);
    // Bioluminescent moss glow patches on columns
    const CX=[w*0.10,w*0.26,w*0.74,w*0.90];
    for(let ci=0;ci<4;ci++){
      for(let mi=0;mi<3;mi++){
        const my=h*(0.20+mi*0.25);
        const gp=0.35+Math.sin(t*1.8+ci*2.1+mi)*0.25;
        const gr=ctx.createRadialGradient(CX[ci],my,0,CX[ci],my,18);
        gr.addColorStop(0,_rgba(acc,gp*0.6));
        gr.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=gr; ctx.beginPath(); ctx.arc(CX[ci],my,18,0,Math.PI*2); ctx.fill();
      }
    }
    ctx.restore();

    ctx.save(); ctx.translate(pOff.dx*0.8,pOff.dy*0.8);
    _floor(ctx,w,h,tier,pOff.dy*0.1);
    // Shallow puddle reflections
    for(let p=0;p<3;p++){
      const px=w*(0.20+p*0.30), py=h*0.80;
      const pw=w*0.12, ph2=h*0.03;
      const pudA=0.10+Math.sin(t*0.6+p*1.4)*0.05;
      ctx.fillStyle=_rgba(acc,pudA);
      ctx.beginPath(); ctx.ellipse(px,py,pw/2,ph2/2,0,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  // ── Tier 3: Cracked Obsidian (floors 20-29) ───────────────────────────────
  function _paintCrackedObsidian(ctx, w, h, t, tier, acc, pOff){
    _bgGrad(ctx,w,h,tier);

    // Back wall — obsidian surface with glowing cracks (parallax 0)
    // Deep orange glow at base (lava seep)
    const lavaG=ctx.createLinearGradient(0,h*0.55,0,h*0.72);
    lavaG.addColorStop(0,'rgba(0,0,0,0)');
    lavaG.addColorStop(1,_rgba(acc,0.35));
    ctx.fillStyle=lavaG; ctx.fillRect(0,h*0.55,w,h*0.17);

    // Crack network — jagged zigzag lines
    const cracks=[
      [{x:0.35,y:0.05},{x:0.38,y:0.18},{x:0.32,y:0.28},{x:0.36,y:0.42},{x:0.30,y:0.55}],
      [{x:0.55,y:0.08},{x:0.52,y:0.20},{x:0.58,y:0.35},{x:0.53,y:0.48},{x:0.57,y:0.62}],
      [{x:0.44,y:0.12},{x:0.40,y:0.25},{x:0.46,y:0.36},{x:0.42,y:0.50}],
      [{x:0.25,y:0.20},{x:0.28,y:0.35},{x:0.24,y:0.50}],
      [{x:0.68,y:0.15},{x:0.72,y:0.30},{x:0.66,y:0.45}],
    ];
    const crackPulse=0.60+Math.sin(t*0.7)*0.25;
    ctx.lineWidth=1.8;
    for(let c=0;c<cracks.length;c++){
      const pts=cracks[c];
      ctx.strokeStyle=_rgba(acc,crackPulse*(0.6+_hash(c)*0.35));
      ctx.shadowColor=_rgb(acc); ctx.shadowBlur=4;
      ctx.beginPath(); ctx.moveTo(pts[0].x*w,pts[0].y*h);
      for(let p=1;p<pts.length;p++) ctx.lineTo(pts[p].x*w,pts[p].y*h);
      ctx.stroke();
      ctx.shadowBlur=0;
    }

    // Mid layer 1 — heat shimmer bands (parallax 0.3)
    ctx.save(); ctx.translate(pOff.dx*0.3,pOff.dy*0.3);
    for(let s=0;s<5;s++){
      const sx=w*(0.10+s*0.20);
      const sa=0.04+Math.sin(t*3.0+s*1.7)*0.03;
      ctx.fillStyle=_rgba(acc,sa);
      const sw=w*0.08;
      for(let seg=0;seg<8;seg++){
        const sy=h*(0.05+seg*0.09);
        const sk=Math.sin(t*2.1+s+seg*0.5)*3;
        ctx.fillRect(sx+sk,sy,sw,h*0.06);
      }
    }
    ctx.restore();

    // Columns + lava edge glow (parallax 0.55)
    ctx.save(); ctx.translate(pOff.dx*0.55,pOff.dy*0.55);
    _columns(ctx,w,h,tier,acc,-pOff.dy*0.55,0.18);
    ctx.restore();

    ctx.save(); ctx.translate(pOff.dx*0.8,pOff.dy*0.8);
    _floor(ctx,w,h,tier,pOff.dy*0.1);
    // Lava crack on floor
    ctx.strokeStyle=_rgba(acc,0.55+Math.sin(t*1.2)*0.20); ctx.lineWidth=2;
    ctx.shadowColor=_rgb(acc); ctx.shadowBlur=6;
    ctx.beginPath(); ctx.moveTo(w*0.35,h*0.78); ctx.lineTo(w*0.48,h*0.82); ctx.lineTo(w*0.60,h*0.78); ctx.stroke();
    ctx.shadowBlur=0;
    ctx.restore();
  }

  // ── Tier 4: Bone Yard (floors 30-39) ─────────────────────────────────────
  function _paintBoneYard(ctx, w, h, t, tier, acc, pOff){
    _bgGrad(ctx,w,h,tier);

    // Back wall — bone-brick wall with skull motifs
    const wallL=w*0.22, wallW=w*0.56, wallH=h*0.70;
    const brickH=h*0.055, brickW=wallW/5;
    for(let row=0;row<Math.ceil(wallH/brickH);row++){
      const by=row*brickH;
      const offX=row%2===0?0:brickW*0.5;
      for(let col=0;col<6;col++){
        const bx=wallL+col*brickW-offX;
        ctx.fillStyle=row%3===0?tier.wallA:tier.wallB;
        ctx.fillRect(bx+1,by+1,brickW-2,brickH-2);
      }
    }
    // Skull at center
    ctx.save();
    const skullX=w*0.50, skullY=h*0.20, sr=16;
    const skullPulse=0.55+Math.sin(t*1.4)*0.25;
    ctx.fillStyle=_rgba(acc,skullPulse*0.5);
    ctx.beginPath(); ctx.arc(skullX,skullY,sr,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=_rgba(acc,skullPulse*0.8); ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(skullX,skullY,sr,0,Math.PI*2); ctx.stroke();
    // eye sockets
    ctx.fillStyle=_rgba([0,0,0],0.8);
    ctx.beginPath(); ctx.arc(skullX-6,skullY-3,4,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(skullX+6,skullY-3,4,0,Math.PI*2); ctx.fill();
    ctx.restore();

    // Mid layer 1 — bone chains hanging (parallax 0.3)
    ctx.save(); ctx.translate(pOff.dx*0.3,pOff.dy*0.3);
    for(let c=0;c<6;c++){
      const cx=w*(0.18+c*0.13);
      const cl=h*(0.18+_hash(c+80)*0.15);
      const sway=Math.sin(t*0.6+c*0.9)*4;
      ctx.strokeStyle=_rgba([200,198,178],0.60); ctx.lineWidth=2;
      for(let s=0;s<Math.ceil(cl/10);s++){
        const seg=s*10;
        ctx.beginPath();
        ctx.moveTo(cx+sway*Math.sin(seg/cl*Math.PI),seg);
        ctx.lineTo(cx+sway*Math.sin((seg+10)/cl*Math.PI),Math.min(seg+10,cl));
        ctx.stroke();
        // bone joint
        ctx.fillStyle=_rgba([210,208,190],0.70);
        ctx.beginPath(); ctx.arc(cx+sway*Math.sin(seg/cl*Math.PI),seg,2.5,0,Math.PI*2); ctx.fill();
      }
    }
    ctx.restore();

    // Columns (parallax 0.55)
    ctx.save(); ctx.translate(pOff.dx*0.55,pOff.dy*0.55);
    _columns(ctx,w,h,tier,acc,-pOff.dy*0.55,0.12);
    // Skull lanterns on columns
    const CX=[w*0.10,w*0.26,w*0.74,w*0.90];
    for(let ci=0;ci<4;ci++){
      const lanY=h*0.35;
      const glow=0.30+Math.sin(t*2.2+ci*1.1)*0.20;
      const gr=ctx.createRadialGradient(CX[ci],lanY,0,CX[ci],lanY,20);
      gr.addColorStop(0,_rgba(acc,glow)); gr.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=gr; ctx.beginPath(); ctx.arc(CX[ci],lanY,20,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(8,12,4,0.85)'; ctx.beginPath(); ctx.arc(CX[ci],lanY,7,0,Math.PI*2); ctx.fill();
      ctx.fillStyle=_rgba(acc,glow*0.9);
      ctx.beginPath(); ctx.arc(CX[ci]-2.5,lanY-2,2,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(CX[ci]+2.5,lanY-2,2,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();

    ctx.save(); ctx.translate(pOff.dx*0.8,pOff.dy*0.8);
    _floor(ctx,w,h,tier,pOff.dy*0.1);
    // Bone shards on floor
    for(let b=0;b<10;b++){
      const bx=w*(0.15+_hash(b+40)*0.70);
      const by=h*(0.76+_hash(b+50)*0.18);
      const bl=10+_hash(b+60)*18;
      const ba=_hash(b+70)*Math.PI;
      ctx.strokeStyle=_rgba([210,208,188],0.45); ctx.lineWidth=2;
      ctx.beginPath();
      ctx.moveTo(bx-Math.cos(ba)*bl/2,by-Math.sin(ba)*bl/2);
      ctx.lineTo(bx+Math.cos(ba)*bl/2,by+Math.sin(ba)*bl/2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Tier 5: Starlight Void (floors 40-49) ────────────────────────────────
  function _paintStarlightVoid(ctx, w, h, t, tier, acc, pOff){
    _bgGrad(ctx,w,h,tier);

    // Star field — many small twinkles (back wall, parallax 0)
    for(let s=0;s<60;s++){
      const sx=_hash(s)*w, sy=_hash(s+300)*h*0.72;
      const sa=0.30+Math.sin(t*2.0+s*0.47)*0.45;
      const sr=0.5+_hash(s+400)*1.2;
      ctx.fillStyle=_rgba(acc,sa);
      ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.fill();
    }

    // Nebula cloud — soft background glow (parallax 0)
    for(let n=0;n<3;n++){
      const nx=w*(0.25+n*0.25), ny=h*(0.15+n*0.18);
      const nr=w*0.14;
      const np=0.06+Math.sin(t*0.3+n)*0.03;
      const gr=ctx.createRadialGradient(nx,ny,0,nx,ny,nr);
      gr.addColorStop(0,_rgba(acc,np));
      gr.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=gr; ctx.beginPath(); ctx.arc(nx,ny,nr,0,Math.PI*2); ctx.fill();
    }

    // Mid layer 1 — floating crystalline clusters (parallax 0.3)
    ctx.save(); ctx.translate(pOff.dx*0.3,pOff.dy*0.3);
    for(let cr=0;cr<6;cr++){
      const crx=w*(0.14+cr*0.15);
      const cry=h*(0.10+_hash(cr+90)*0.45)+Math.sin(t*0.4+cr)*8;
      const cra=0.25+Math.sin(t*1.2+cr*0.8)*0.20;
      ctx.strokeStyle=_rgba(acc,cra); ctx.lineWidth=1.2;
      // hexagon-ish crystal
      for(let e=0;e<6;e++){
        const a1=e*(Math.PI/3); const a2=(e+1)*(Math.PI/3);
        const cr2=8+_hash(cr+91)*6;
        ctx.beginPath();
        ctx.moveTo(crx+Math.cos(a1)*cr2,cry+Math.sin(a1)*cr2);
        ctx.lineTo(crx+Math.cos(a2)*cr2,cry+Math.sin(a2)*cr2);
        ctx.stroke();
      }
      // center glow
      const cg=ctx.createRadialGradient(crx,cry,0,crx,cry,10);
      cg.addColorStop(0,_rgba(acc,cra*0.8)); cg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(crx,cry,10,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();

    // Columns — void pillars, mostly translucent (parallax 0.55)
    ctx.save(); ctx.translate(pOff.dx*0.55,pOff.dy*0.55);
    _columns(ctx,w,h,tier,acc,-pOff.dy*0.55,0.20);
    ctx.restore();

    // Reflective void floor (parallax 0.8)
    ctx.save(); ctx.translate(pOff.dx*0.8,pOff.dy*0.8);
    _floor(ctx,w,h,tier,pOff.dy*0.1);
    // Star reflections on floor
    for(let s=0;s<20;s++){
      const sx=_hash(s+500)*w;
      const sy=h*(0.78+_hash(s+600)*0.18);
      const sa=0.12+Math.sin(t*1.8+s*0.6)*0.10;
      ctx.fillStyle=_rgba(acc,sa);
      ctx.beginPath(); ctx.arc(sx,sy,0.8+_hash(s+700)*1.2,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  // ── Tier 6: Wraith Court (floors 50+) ────────────────────────────────────
  function _paintWraithCourt(ctx, w, h, t, tier, acc, pOff){
    _bgGrad(ctx,w,h,tier);

    // Back wall — spectral gothic arches
    const archCX=[w*0.35,w*0.50,w*0.65];
    for(const ax of archCX){
      const archPulse=0.22+Math.sin(t*0.8+(ax/w)*3)*0.14;
      ctx.strokeStyle=_rgba(acc,archPulse); ctx.lineWidth=2;
      ctx.beginPath();
      ctx.moveTo(ax-20,h*0.70); ctx.lineTo(ax-20,h*0.20);
      ctx.arcTo(ax-20,h*0.10, ax,h*0.10, 20);
      ctx.arcTo(ax+20,h*0.10, ax+20,h*0.20, 20);
      ctx.lineTo(ax+20,h*0.70);
      ctx.stroke();
    }
    // Spectral mist bands at base
    for(let m=0;m<3;m++){
      const my=h*(0.58+m*0.05);
      const ma=0.06+Math.sin(t*0.5+m*1.2)*0.04;
      const mg=ctx.createLinearGradient(0,my,0,my+h*0.05);
      mg.addColorStop(0,'rgba(0,0,0,0)');
      mg.addColorStop(0.5,_rgba(acc,ma));
      mg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=mg; ctx.fillRect(0,my,w,h*0.05);
    }

    // Mid layer 1 — wraith wisps (parallax 0.3)
    ctx.save(); ctx.translate(pOff.dx*0.3,pOff.dy*0.3);
    for(let w2=0;w2<5;w2++){
      const wx=w*(0.14+w2*0.18)+Math.sin(t*0.55+w2)*12;
      const wy=h*(0.18+_hash(w2+60)*0.40)+Math.sin(t*0.35+w2*1.5)*10;
      const wa=0.10+Math.sin(t*1.5+w2*0.7)*0.12;
      const wr=16+_hash(w2+61)*10;
      const wg=ctx.createRadialGradient(wx,wy,0,wx,wy,wr);
      wg.addColorStop(0,_rgba(acc,wa)); wg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=wg; ctx.beginPath(); ctx.arc(wx,wy,wr,0,Math.PI*2); ctx.fill();
      // wisp tail
      ctx.strokeStyle=_rgba(acc,wa*0.5); ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(wx,wy+wr*0.5);
      ctx.quadraticCurveTo(wx+Math.sin(t+w2)*8,wy+wr*1.5,wx,wy+wr*2.5);
      ctx.stroke();
    }
    ctx.restore();

    // Columns + wraith fire (parallax 0.55)
    ctx.save(); ctx.translate(pOff.dx*0.55,pOff.dy*0.55);
    _columns(ctx,w,h,tier,acc,-pOff.dy*0.55,0.16);
    const CX=[w*0.10,w*0.26,w*0.74,w*0.90];
    for(let ci=0;ci<4;ci++){
      for(let fi=0;fi<2;fi++){
        const fy=h*(0.32+fi*0.34);
        const seed=ci*5+fi*11;
        const flk=0.55+Math.sin(t*7.5+seed)*0.28+Math.sin(t*4.8+seed+1.9)*0.14;
        const gr=ctx.createRadialGradient(CX[ci],fy,0,CX[ci],fy,22);
        gr.addColorStop(0,_rgba(acc,0.55*flk));
        gr.addColorStop(0.5,_rgba(acc,0.16*flk));
        gr.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=gr; ctx.beginPath(); ctx.arc(CX[ci],fy,22,0,Math.PI*2); ctx.fill();
        // dark spectral flame
        ctx.fillStyle=_rgba([Math.min(255,acc[0]+30),acc[1],Math.min(255,acc[2]+20)],0.85*flk);
        ctx.beginPath();
        ctx.moveTo(CX[ci]-2,fy);
        ctx.quadraticCurveTo(CX[ci]+Math.sin(t*9+seed)*3,fy-8,CX[ci],fy-13);
        ctx.quadraticCurveTo(CX[ci]-Math.sin(t*9+seed)*3,fy-8,CX[ci]+2,fy);
        ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();

    // Floor + rune carvings (parallax 0.8)
    ctx.save(); ctx.translate(pOff.dx*0.8,pOff.dy*0.8);
    _floor(ctx,w,h,tier,pOff.dy*0.1);
    // Glowing rune circles
    for(let r=0;r<4;r++){
      const rx=w*(0.15+r*0.24), ry=h*0.83;
      const rPulse=0.25+Math.sin(t*1.8+r*1.571)*0.25;
      const rRad=8+Math.sin(t*1.8+r*1.571)*1;
      ctx.strokeStyle=_rgba(acc,rPulse*0.9); ctx.lineWidth=0.9;
      ctx.beginPath(); ctx.arc(rx,ry,rRad,0,Math.PI*2); ctx.stroke();
      ctx.strokeStyle=_rgba(acc,rPulse*0.4); ctx.lineWidth=0.7;
      ctx.beginPath();
      ctx.moveTo(rx-rRad,ry); ctx.lineTo(rx+rRad,ry);
      ctx.moveTo(rx,ry-rRad); ctx.lineTo(rx,ry+rRad);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ─── Tier-specific ambient particles ─────────────────────────────────────
  function _drawParticles(ctx, w, h, t, tier, acc){
    const p=tier.partRGB, cnt=tier.partCnt;
    for(let i=0;i<cnt;i++){
      const seed=_hash(i+41);
      const baseX=_hash(i+17)*w;
      const period=h*0.88;

      if(tier.partType==='mote'||tier.partType==='dust'){
        // drift upward, gentle sway
        const sway=Math.sin(t*0.45+i*0.83)*14;
        const mx=((baseX+sway)%w+w)%w;
        const my=period-((seed*period+t*(7+seed*8))%period);
        if(my<h*0.03||my>h) continue;
        const a=(0.16+Math.sin(t*1.8+i*0.7)*0.14)*(1-my/h*0.5);
        ctx.fillStyle=`rgba(${p[0]},${p[1]},${p[2]},${a})`;
        ctx.beginPath(); ctx.arc(mx,my,0.6+seed*0.9,0,Math.PI*2); ctx.fill();

      }else if(tier.partType==='chip'){
        // stone chips: sharper, faster, smaller
        const sway=Math.sin(t*0.6+i*1.1)*8;
        const mx=((baseX+sway)%w+w)%w;
        const my=period-((seed*period+t*(10+seed*12))%period);
        if(my<h*0.03||my>h) continue;
        const a=0.20+Math.sin(t*2.2+i*0.9)*0.15;
        ctx.fillStyle=`rgba(${p[0]},${p[1]},${p[2]},${a})`;
        ctx.fillRect(mx-0.8,my-0.8,1.6,1.6);

      }else if(tier.partType==='ash'){
        // hot ash: fast rise, warm glow
        const sway=Math.sin(t*0.8+i*0.72)*10;
        const mx=((baseX+sway)%w+w)%w;
        const my=period-((seed*period+t*(14+seed*16))%period);
        if(my<h*0.03||my>h) continue;
        const a=(0.25+Math.sin(t*2.4+i*0.8)*0.18)*(1-my/h*0.4);
        ctx.fillStyle=`rgba(${p[0]},${p[1]},${p[2]},${a})`;
        ctx.beginPath(); ctx.arc(mx,my,0.5+seed*1.1,0,Math.PI*2); ctx.fill();
        // occasional bright spark
        if(seed>0.85){
          ctx.fillStyle=`rgba(255,240,200,${a*0.9})`;
          ctx.beginPath(); ctx.arc(mx,my,0.4,0,Math.PI*2); ctx.fill();
        }

      }else if(tier.partType==='star'){
        // starlight wisps — twinkle, drift very slowly
        const sway=Math.sin(t*0.25+i*0.55)*5;
        const mx=_hash(i+600)*w+sway;
        const my=(_hash(i+700)*h*0.70+t*2.0*(0.5+seed*0.8))%(h*0.72);
        const a=0.15+Math.sin(t*3.0+i*0.83)*0.35;
        const r=0.5+seed*1.5;
        ctx.fillStyle=`rgba(${p[0]},${p[1]},${p[2]},${a})`;
        ctx.beginPath(); ctx.arc(mx,my,r,0,Math.PI*2); ctx.fill();

      }else if(tier.partType==='ember'){
        // wraith embers: slow, spiral-ish drift
        const angle=t*0.3+i*0.7;
        const sway=Math.sin(angle)*18;
        const mx=((baseX+sway)%w+w)%w;
        const my=period-((seed*period+t*(6+seed*9))%period);
        if(my<h*0.03||my>h) continue;
        const a=(0.18+Math.sin(t*2.0+i*0.7)*0.16)*(1-my/h*0.4);
        ctx.fillStyle=`rgba(${p[0]},${p[1]},${p[2]},${a})`;
        ctx.beginPath(); ctx.arc(mx,my,0.7+seed*1.0,0,Math.PI*2); ctx.fill();
      }
    }
  }

  // ─── Tier dispatcher ─────────────────────────────────────────────────────
  const PAINTERS = {
    wooden_hall:      _paintWoodenHall,
    mossy_stone:      _paintMossyStone,
    cracked_obsidian: _paintCrackedObsidian,
    bone_yard:        _paintBoneYard,
    starlight_void:   _paintStarlightVoid,
    wraith_court:     _paintWraithCourt,
  };

  // ─── Public API ──────────────────────────────────────────────────────────
  // clearShift: 0 (none) → 1 (full forward shift) during floor-clear payoff.
  function paintTowerInterior(ctx, w, h, t, floor, clearShift){
    const tier = _getTier(floor || 1);
    const acc  = _accent(tier, floor || 1);

    // Parallax base: gentle horizontal sway + vertical clear-shift
    const swayAmp = w * 0.005;
    const pOff = {
      dx: Math.sin(t * 0.18) * swayAmp,
      dy: -(clearShift || 0) * h * 0.10,  // upward shift during floor-clear
    };

    const painter = PAINTERS[tier.id];
    if(painter) painter(ctx, w, h, t, tier, acc, pOff);
    else { ctx.fillStyle='#06020c'; ctx.fillRect(0,0,w,h); }

    _drawParticles(ctx, w, h, t, tier, acc);
  }

  window.WG = window.WG || {};
  window.WG.HuntTowerRender = { paintTowerInterior };
})();
