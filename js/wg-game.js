// WG.Game — top-level orchestrator: init order, rAF loop, tab routing, hunt runtime
(function(){'use strict';

  let rafId = 0;
  let running = false;

  // Hunt runtime — populated when entering Hunt mode
  let huntRuntime = null;
  // SPEC §0 — Day/Night mode chosen on lobby level select; persists across panel rerenders
  let currentLevelMode = 'day';

  function buildHuntRuntime(stageId, mode) {
    const stage = WG.HuntStage.get(stageId);
    if (!stage) return null;
    const mapW = 720;
    const mapH = 1100;
    const rt = {
      stage,
      mode: (mode === 'night' ? 'night' : 'day'), // SPEC §0 — read by hunt-stage/waves/render in later workers
      mapW, mapH,
      elapsed: 0,
      spawnAccum: 0,
      bossSpawned: false,
      bossDefeated: false,
      creatures: [],
      projectiles: [],
      enemyProjectiles: [],
      drops: [],
      boss: null,
      player: null,
      pendingLevelUp: false,
      kills: 0,
      // SPEC W-Hard-Tuning-And-Monetization §B — limit ad-revive uses per run
      reviveCount: 0,
      // W-Dopamine-P1 §A — kill-combo tracker
      combo: { count: 0, lastKillAt: 0, peak: 0 },
    };
    huntRuntime = rt;
    WG.HuntRender.setRuntime(rt);
    WG.HuntPlayer.place(mapW * 0.5, mapH * 0.5, rt);
    WG.HuntPickups.spawnForStage(rt, stage);
    return rt;
  }

  function startHunt(stageId, mode) {
    buildHuntRuntime(stageId, mode);
    WG.State.get().huntProgress.currentStage = stageId;
    // Remove the stage select overlay if present
    cancelMenuLoop();
    const sel = document.getElementById('hunt-stage-select');
    if (sel && sel.parentNode) sel.parentNode.removeChild(sel);
    switchTab('hunt');
    // SPEC §0 — tabs hidden once a stage starts
    document.body.classList.add('in-stage');
    WG.Engine.emit('hunt:stage-start', { stageId, mode: huntRuntime ? huntRuntime.mode : 'day' });
    WG.HuntTutorial.maybeStart(stageId);
  }

  function getHuntRuntime() { return huntRuntime; }

  function exitHunt() {
    huntRuntime = null;
    WG.HuntRender.setRuntime(null);
    // SPEC §0 — tabs+top-strip restored on lobby return
    document.body.classList.remove('in-stage');
    WG.State.setActiveTab('hunt');
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-hunt').classList.add('active');
    document.querySelectorAll('.nav-tab').forEach(n => n.classList.toggle('active', n.dataset.tab === 'hunt'));
    showHuntStageList();
  }

  // rAF main loop
  function frame(now) {
    if (!running) return;
    const last = WG.Engine.getLastFrame();
    let dt = (now - last) / 1000;
    if (dt > 0.05) dt = 0.05;
    if (dt < 0) dt = 0;
    WG.Engine.setLastFrame(now);

    // Run engine tick (drives ticked modules)
    WG.Engine.tick(dt);

    // Hunt-specific runtime update only when on Hunt tab AND in a stage.
    // Hit-pause (DOPAMINE_DESIGN §9) freezes world sim but lets render continue
    // — runtime.elapsed must NOT advance during the pause window.
    if (WG.State.get().activeTab === 'hunt' && huntRuntime && huntRuntime.player && huntRuntime.player.hp > 0 && !huntRuntime.pendingLevelUp) {
      if (!huntRuntime._tutorialPaused && !WG.Engine.isHitPaused()) {
      huntRuntime.elapsed += dt;
      // Player movement from input
      const inp = WG.Input.poll();
      WG.HuntPlayer.move(dt, inp.x, inp.y);
      // Skill button consume
      if (WG.Input.consumeSkill()) WG.HuntPlayer.trySkill();
      // Player auto-attack + pet + ranged
      WG.HuntPlayer.tick(dt);
      WG.HuntPickups.tick(huntRuntime, dt);
      // Enemies tick
      for (const c of huntRuntime.creatures) WG.HuntEnemies.tickOne(c, dt, huntRuntime);
      // Boss tick
      if (huntRuntime.boss) WG.HuntBosses.tickBoss(huntRuntime.boss, dt, huntRuntime);
      // Projectile lifecycle (player projectiles)
      for (let i = huntRuntime.projectiles.length - 1; i >= 0; i--) {
        const p = huntRuntime.projectiles[i];
        p.x += p.vx * dt; p.y += p.vy * dt; p.lifetime -= dt;
        if (p.lifetime <= 0) { huntRuntime.projectiles.splice(i,1); continue; }
        // collide with enemies
        let hit = null;
        for (const c of huntRuntime.creatures) {
          if (c.hp <= 0) continue;
          const dx = c.x - p.x, dy = c.y - p.y;
          const r = (c.size/2) + 6;
          if (dx*dx + dy*dy < r*r) { hit = c; break; }
        }
        if (!hit && huntRuntime.boss && huntRuntime.boss.hp > 0) {
          const dx = huntRuntime.boss.x - p.x, dy = huntRuntime.boss.y - p.y;
          const r = (huntRuntime.boss.size/2) + 8;
          if (dx*dx + dy*dy < r*r) hit = huntRuntime.boss;
        }
        if (hit) {
          if (hit === huntRuntime.boss) {
            hit.hp -= p.damage;
            WG.Engine.emit('boss:damaged', { boss: hit, amount: p.damage });
            if (hit.hp <= 0) {
              WG.Engine.emit('boss:defeated', { boss: hit });
              huntRuntime.bossDefeated = true;
            }
          } else {
            WG.HuntEnemies.damage(hit, p.damage, p.sourceType ? { type: p.sourceType } : null);
          }
          // AOE on impact
          if (p.areaR > 0) {
            for (const c of huntRuntime.creatures) {
              if (c.hp <= 0 || c === hit) continue;
              const dx = c.x - p.x, dy = c.y - p.y;
              if (dx*dx + dy*dy < p.areaR * p.areaR) {
                WG.HuntEnemies.damage(c, Math.floor(p.damage * 0.6), p.sourceType ? { type: p.sourceType } : null);
              }
            }
          }
          huntRuntime.projectiles.splice(i, 1);
        }
      }
      // Enemy projectile lifecycle
      for (let i = huntRuntime.enemyProjectiles.length - 1; i >= 0; i--) {
        const p = huntRuntime.enemyProjectiles[i];
        p.x += p.vx * dt; p.y += p.vy * dt; p.lifetime -= dt;
        if (p.lifetime <= 0) { huntRuntime.enemyProjectiles.splice(i,1); continue; }
        const pl = huntRuntime.player;
        const dx = pl.x - p.x, dy = pl.y - p.y;
        if (dx*dx + dy*dy < 14*14) {
          WG.HuntPlayer.takeDamage(p.damage, { type: 'enemy-proj' });
          huntRuntime.enemyProjectiles.splice(i, 1);
        }
      }
      // Reap dead creatures + count kills
      for (let i = huntRuntime.creatures.length - 1; i >= 0; i--) {
        if (huntRuntime.creatures[i].hp <= 0) { huntRuntime.creatures.splice(i,1); huntRuntime.kills++; }
      }
      // Wave manager
      WG.HuntWaves.spawnInWindow(huntRuntime, huntRuntime.stage, dt);
      // Particles
      WG.Render.tickParticles(dt);

      // Stage end conditions
      const completed = (huntRuntime.elapsed >= huntRuntime.stage.durationSec) && (!huntRuntime.stage.bossId || huntRuntime.bossDefeated);
      const failed    = huntRuntime.player.hp <= 0;
      if (failed) {
        running = false;
        finishHunt(false);
      } else if (completed) {
        running = false;
        finishHunt(true);
      }
      } // end !_tutorialPaused && !isHitPaused guard
    }

    // Always render appropriate canvas content
    if (WG.State.get().activeTab === 'hunt' && huntRuntime && huntRuntime.player) {
      WG.HuntRender.drawFrame();
    } else {
      // Other tabs: clear canvas to background; tab DOM panels handle their own UI
      const ctx = WG.Display.ctx;
      ctx.fillStyle = '#0c0a08';
      ctx.fillRect(0, 0, WG.Display.width, WG.Display.height);
    }

    syncTopStrip();
    rafId = requestAnimationFrame(frame);
  }

  function finishHunt(cleared) {
    if (!huntRuntime) return;
    const stageId = huntRuntime.stage.id;
    const mins = huntRuntime.elapsed / 60;
    // Reward calculation
    const baseCoin = cleared ? (60 + stageId * 25) : (15 + stageId * 5);
    const baseDia  = cleared ? (stageId % 3 === 0 ? 5 : 2) : 0;
    const baseFrag = cleared ? 2 : 0;
    const rewards = { coins: baseCoin + huntRuntime.kills * 2, diamonds: baseDia, fragments: baseFrag, riftSigils: 0 };
    if (cleared) WG.State.grant('coins', rewards.coins); else WG.State.grant('coins', rewards.coins);
    if (rewards.diamonds) WG.State.grant('diamonds', rewards.diamonds);
    if (rewards.fragments) WG.State.get().forge.craftFragments += rewards.fragments;
    // Rift sigil drops — eldritch tier only; zero cost on earlier stages.
    if (cleared && WG.HuntPickups && WG.HuntPickups.rollSigilDrop) {
      const sigils = WG.HuntPickups.rollSigilDrop(stageId, huntRuntime.bossDefeated);
      if (sigils > 0) {
        WG.State.get().rift.sigils += sigils;
        rewards.riftSigils = sigils;
        WG.Engine.emit('rift:sigil-found', { count: sigils, total: WG.State.get().rift.sigils });
      }
    }
    // Update best wave / unlock next
    const s = WG.State.get();
    if (cleared) {
      const cur = s.huntProgress.bestWaves[stageId] || 0;
      if (mins > cur) s.huntProgress.bestWaves[stageId] = +mins.toFixed(2);
      s.huntProgress.highestUnlocked = Math.max(s.huntProgress.highestUnlocked, stageId + 1);
      // Bump highestStageCleared — gates Rebirth tier eligibility (SPEC §0).
      s.player.highestStageCleared = Math.max(s.player.highestStageCleared || 0, stageId);
      WG.Engine.emit('hunt:stage-cleared', { stageId, mins, kills: huntRuntime.kills });
    } else {
      WG.Engine.emit('hunt:stage-failed', { stageId, mins, kills: huntRuntime.kills });
    }
    const showResults = () => WG.HuntResults.show({ stageId, cleared, mins, kills: huntRuntime.kills, rewards, peakCombo: huntRuntime.combo ? huntRuntime.combo.peak : 0 });
    if (cleared && WG.AscendRebirth && WG.AscendRebirth.maybeShow) {
      huntRuntime.rebirthPending = !!WG.AscendRebirth.isEligible();
      WG.AscendRebirth.maybeShow({ stageId, onContinue: showResults });
    } else {
      showResults();
    }
    // Restart loop to keep top-strip / autosave running. We keep huntRuntime.player
    // intact so the §B revive flow can restore HP from the existing entity —
    // exitHunt() clears the runtime when the user backs out for real.
    running = true;
    rafId = requestAnimationFrame(frame);
  }

  // ---- tab switching ----
  function switchTab(tab) {
    const valid = ['duel','ascend','hunt','forge','relics'];
    if (!valid.includes(tab)) return;
    // Stop the menu canvas loop when leaving Hunt; renderHero will restart it
    // when we land back on Hunt (via showHuntStageList below).
    if (tab !== 'hunt') cancelMenuLoop();
    WG.State.setActiveTab(tab);
    // panels
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById('tab-' + tab);
    if (panel) panel.classList.add('active');
    // nav highlight
    document.querySelectorAll('.nav-tab').forEach(n => n.classList.toggle('active', n.dataset.tab === tab));
    // Refresh tab DOMs
    if (tab === 'ascend' && WG.AscendRender) WG.AscendRender.refresh();
    if (tab === 'forge' && WG.ForgeRender) WG.ForgeRender.refresh();
    if (tab === 'relics' && WG.RelicsRender) WG.RelicsRender.refresh();
    if (tab === 'duel' && WG.DuelRender) WG.DuelRender.refresh();
    if (tab === 'hunt') showHuntStageList();
  }

  // SPEC W-Hard-Tuning-And-Monetization §B — ad-watch buff buttons in level select.
  // Gold border + ad-icon for visual distinctness vs stage cards. Tap = scale-bounce
  // + WG.Ads.showRewardedVideo → on success, WG.Buffs.activate(id, ms).
  // The "ON" pill swaps in when the buff is currently active so a player who
  // primed a buff sees it persist while they pick a stage.
  function appendBuffStrip(parent) {
    const wrap = document.createElement('div');
    wrap.id = 'buff-strip';
    wrap.style.cssText = 'display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin:0 0 12px 0;';
    parent.appendChild(wrap);

    const buttons = [
      { id: 'damage_x2',     ms: 60000, title: '2× DAMAGE',  sub: '60s after watching ad' },
      { id: 'wood_x2',       ms: 90000, title: '2× WOOD',    sub: '90s after watching ad' },
      { id: 'instant_turret', ms: 0,    title: 'INSTANT TURRET', sub: 'Free build, one use' },
      { id: 'revive',        ms: 0,     title: 'PRE-ARM REVIVE',  sub: 'One free death save' },
    ];

    function buildBtn(spec) {
      const btn = document.createElement('button');
      const active = (WG.Buffs && WG.Buffs.has && WG.Buffs.has(spec.id));
      btn.style.cssText = [
        'position:relative;cursor:pointer;text-align:left;',
        'padding:9px 11px;border-radius:7px;',
        'background:linear-gradient(135deg,#3a2a08,#1a1004);',
        'border:1.5px solid #f0c060;',
        'box-shadow:0 0 0 1px rgba(240,192,96,0.18) inset, 0 2px 6px rgba(0,0,0,0.5);',
        'color:#f8e0a0;transition:transform 80ms ease;',
      ].join('');
      btn.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:11px;background:#f0c060;color:#2a1a04;padding:1px 5px;border-radius:3px;font-weight:700;letter-spacing:1px;">▶ AD</span>
          <span style="font-size:12px;font-weight:700;letter-spacing:1px;color:#f8e0a0;">${spec.title}</span>
          ${active ? '<span style="margin-left:auto;font-size:10px;background:#5aa040;color:#0a1a04;padding:1px 5px;border-radius:3px;font-weight:700;">ON</span>' : ''}
        </div>
        <div style="font-size:10px;color:#c0a060;margin-top:3px;letter-spacing:0.5px;">${spec.sub}</div>
      `;
      // Scale-bounce tap feedback
      btn.addEventListener('pointerdown', () => { btn.style.transform = 'scale(0.94)'; });
      btn.addEventListener('pointerup',   () => { btn.style.transform = 'scale(1)'; });
      btn.addEventListener('pointerleave',() => { btn.style.transform = 'scale(1)'; });

      btn.addEventListener('click', async () => {
        if (active) return; // already on
        btn.disabled = true;
        const res = await WG.Ads.showRewardedVideo({ reward: 'buff:' + spec.id });
        btn.disabled = false;
        if (res && res.ok) {
          WG.Buffs.activate(spec.id, spec.ms);
          // Brief gold flash on the level-select panel for activation feedback.
          flashScreen('#f0c060', 0.35, 320);
          // Re-render to show ON pill.
          const s = document.getElementById('hunt-stage-select');
          if (s && s.parentNode) {
            s.parentNode.removeChild(s);
            showHuntStageList();
          }
        }
      });
      return btn;
    }

    for (const spec of buttons) wrap.appendChild(buildBtn(spec));
  }

  // Quick fullscreen flash overlay — non-blocking, fades out, removed on done.
  function flashScreen(color, alpha, durationMs) {
    const flash = document.createElement('div');
    flash.style.cssText = `
      position:fixed;inset:0;background:${color};opacity:${alpha};
      pointer-events:none;z-index:300;transition:opacity ${durationMs}ms ease-out;
    `;
    document.body.appendChild(flash);
    requestAnimationFrame(() => { flash.style.opacity = '0'; });
    setTimeout(() => { if (flash.parentNode) flash.parentNode.removeChild(flash); }, durationMs + 60);
  }

  // SPEC §0 / W-Hunt-Menu-Hero-Redesign (Architect 2026-05-02):
  // Replaced the 2×N stage grid with a single hero-tile carousel: biome art +
  // character silhouette + ◀ ▶ scroll between stages, locked progression
  // (Stage N requires bestWaves[N-1] > 0), Day/Nightmare mode pills, big BATTLE
  // button. Side icons (Tasks / Offers / Daily / 7-Days / Settings) collapse
  // monetization + meta-flow into corner clickables that open modals — keeps
  // the hero tile uncluttered. Reference screenshot: Wood Siege "Ghost Marriage"
  // home — but ours wins on biome variety + actual equipped skin preview hook.

  // Selected stage index for the carousel. Persists during the session; reset
  // to first unlocked stage on first menu open.
  let selectedStageIdx = 0;

  // Biome → gradient + silhouette palette. Stages re-skin the hero tile.
  const BIOME_PALETTE = {
    forest_summer: { sky: '#1a3a1c', floor: '#2a5028', accent: '#a8d878', silhouette: '#082010' },
    forest_autumn: { sky: '#3a2010', floor: '#5a3010', accent: '#f0a040', silhouette: '#1a0808' },
    cold_stone:    { sky: '#1a2a4c', floor: '#3a4a68', accent: '#7aa0e0', silhouette: '#0a1428' },
    temple:        { sky: '#3a1818', floor: '#5a2818', accent: '#f0c060', silhouette: '#1a0808' },
    cave:          { sky: '#0a0612', floor: '#180c20', accent: '#a878d8', silhouette: '#000000' },
    eldritch:      { sky: '#1a0a2a', floor: '#2a0a3a', accent: '#c060ff', silhouette: '#000000' },
  };

  // ART SLOTS: Set BIOME_ART[id] / CHARACTER_PORTRAITS[id] to a URL when
  // illustrated assets ship. Cross-IP intrusions trigger violet drop-shadow +
  // glitch keyframe. Procedural canvas remains the fallback when the value is
  // null or the image errors at runtime. Direction (Architect 2026-05-02):
  // ukiyo-e meets dark illustration for menus; combat keeps current sprites.
  const BIOME_ART = {
    forest_summer: null,
    forest_autumn: null,
    cold_stone:    null,
    temple:        null,
    cave:          null,
    eldritch:      null,
  };
  const CHARACTER_PORTRAITS = {};
  // RIFT biomes are future cross-IP intrusion stages — when stage.biome is in
  // this set the menu hero gains a violet drop-shadow + intermittent glitch
  // (per index.html `.wg-rift-intrude` rule). Empty until rift content ships.
  const RIFT_BIOMES = new Set();

  // ─── Menu hero canvas paint pipeline ────────────────────────────────────────
  // W-Menu-Art-Pass (Architect 2026-05-02): replaces the CSS gradient + triangle
  // trees with canvas-rendered painterly biomes + character sprite. Single rAF
  // loop drives one canvas per hero tile. Cancel on stage change re-entry,
  // tab leave, hunt start, or document visibility hidden — never leak.
  let _menuRaf = 0;
  function cancelMenuLoop() { if (_menuRaf) { cancelAnimationFrame(_menuRaf); _menuRaf = 0; } }

  // Deterministic pseudo-noise — same x,i pair always yields the same offset.
  // Lets stipple/star fields stay still across frames without storing arrays.
  function _hash(i) { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); }

  // Each biome paint takes (ctx, w, h, t, isNight, pal). w/h are CSS pixels;
  // ctx is already DPR-scaled by the loop. t is seconds since loop start.
  function paintBiome_forest_summer(ctx, w, h, t, isNight, pal) {
    const skyTop  = isNight ? '#06081a' : '#2a4a30';
    const skyMid  = isNight ? '#080a18' : '#1a3a1c';
    const horizon = isNight ? '#0a0a14' : '#0f2418';
    const sg = ctx.createLinearGradient(0, 0, 0, h * 0.7);
    sg.addColorStop(0, skyTop); sg.addColorStop(0.6, skyMid); sg.addColorStop(1, horizon);
    ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h * 0.7);
    // Mist band — slow horizontal drift
    ctx.fillStyle = isNight ? 'rgba(80,60,120,0.10)' : 'rgba(190,220,180,0.10)';
    for (let y = h * 0.42; y < h * 0.58; y += 4) ctx.fillRect(0, y, w, 1.5);
    // Distant pagoda silhouette
    const pagX = w * 0.66, pagY = h * 0.56;
    ctx.fillStyle = isNight ? '#02020a' : '#06140a';
    ctx.beginPath();
    ctx.moveTo(pagX - 26, pagY);    ctx.lineTo(pagX + 26, pagY);
    ctx.lineTo(pagX + 20, pagY - 11); ctx.lineTo(pagX + 28, pagY - 11);
    ctx.lineTo(pagX, pagY - 26);     ctx.lineTo(pagX - 28, pagY - 11);
    ctx.lineTo(pagX - 20, pagY - 11); ctx.closePath(); ctx.fill();
    ctx.fillRect(pagX - 14, pagY, 28, h * 0.13);
    // Pine silhouettes across mid horizon (parallax band)
    ctx.fillStyle = isNight ? '#040a06' : '#082010';
    for (let i = 0; i < 7; i++) {
      const px = (i + 0.5) * (w / 7) + (_hash(i) - 0.5) * 18;
      const ph = h * (0.16 + _hash(i + 17) * 0.10);
      const py = h * 0.7;
      ctx.beginPath();
      ctx.moveTo(px - 22, py); ctx.lineTo(px + 22, py); ctx.lineTo(px, py - ph);
      ctx.closePath(); ctx.fill();
    }
    // Foreground floor + grass stipple
    const fg = ctx.createLinearGradient(0, h * 0.7, 0, h);
    fg.addColorStop(0, isNight ? '#10141a' : '#1a3414');
    fg.addColorStop(1, isNight ? '#04060a' : '#0a1808');
    ctx.fillStyle = fg; ctx.fillRect(0, h * 0.7, w, h * 0.3);
    ctx.fillStyle = isNight ? 'rgba(100,120,80,0.16)' : 'rgba(168,216,120,0.32)';
    for (let i = 0; i < 90; i++) {
      const x = _hash(i) * w;
      const y = h * 0.7 + _hash(i + 53) * h * 0.3;
      ctx.fillRect(x, y, 1, 2);
    }
    // Paper lanterns — bob + glow
    for (let i = 0; i < 4; i++) {
      const lx = w * (0.16 + i * 0.22);
      const baseY = h * (0.26 + (i % 2) * 0.08);
      const ly = baseY + Math.sin(t * 1.4 + i * 1.7) * 3.5;
      const glow = ctx.createRadialGradient(lx, ly, 1, lx, ly, 16);
      glow.addColorStop(0, 'rgba(255,200,120,0.55)'); glow.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(lx, ly, 16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f0a040';
      ctx.beginPath(); ctx.ellipse(lx, ly, 4, 5.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(20,12,6,0.55)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(lx, ly - 5.5); ctx.lineTo(lx, h * 0.06); ctx.stroke();
    }
  }

  function paintBiome_forest_autumn(ctx, w, h, t, isNight, pal) {
    const skyTop  = isNight ? '#0c0612' : '#5a2818';
    const skyMid  = isNight ? '#100814' : '#3a1810';
    const horizon = isNight ? '#0a0608' : '#1a0a06';
    const sg = ctx.createLinearGradient(0, 0, 0, h * 0.7);
    sg.addColorStop(0, skyTop); sg.addColorStop(0.55, skyMid); sg.addColorStop(1, horizon);
    ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h * 0.7);
    // Distant ridge silhouette
    ctx.fillStyle = isNight ? '#06040a' : '#1a0808';
    ctx.beginPath(); ctx.moveTo(0, h * 0.62);
    for (let i = 0; i <= 8; i++) {
      const px = (i / 8) * w;
      const py = h * (0.50 + Math.sin(i * 0.7) * 0.06);
      ctx.lineTo(px, py);
    }
    ctx.lineTo(w, h * 0.7); ctx.lineTo(0, h * 0.7); ctx.closePath(); ctx.fill();
    // Maple silhouettes — fan crowns
    for (let i = 0; i < 5; i++) {
      const tx = w * (0.10 + i * 0.20) + (_hash(i + 7) - 0.5) * 14;
      const ty = h * 0.7;
      const th = h * (0.18 + _hash(i + 11) * 0.10);
      ctx.fillStyle = isNight ? '#0a0608' : '#1a0808';
      ctx.fillRect(tx - 1.5, ty - th, 3, th);
      // Crown — three overlapping ellipses
      ctx.fillStyle = isNight ? '#180a14' : '#601810';
      ctx.beginPath(); ctx.ellipse(tx - 6, ty - th * 0.92, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(tx + 6, ty - th * 0.92, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(tx, ty - th * 1.05, 11, 8, 0, 0, Math.PI * 2); ctx.fill();
    }
    // Floor — autumn leaf litter
    const fg = ctx.createLinearGradient(0, h * 0.7, 0, h);
    fg.addColorStop(0, isNight ? '#100808' : '#4a1808');
    fg.addColorStop(1, isNight ? '#040204' : '#1a0604');
    ctx.fillStyle = fg; ctx.fillRect(0, h * 0.7, w, h * 0.3);
    ctx.fillStyle = isNight ? 'rgba(120,40,20,0.20)' : 'rgba(240,120,40,0.30)';
    for (let i = 0; i < 60; i++) {
      const x = _hash(i + 91) * w;
      const y = h * 0.7 + _hash(i + 113) * h * 0.3;
      ctx.fillRect(x, y, 2, 1);
    }
    // Falling leaves — drift downward + sway
    for (let i = 0; i < 14; i++) {
      const seed = _hash(i + 41);
      const lx = ((_hash(i + 23) * w) + Math.sin(t * 0.5 + i) * 14) % w;
      const period = h * 0.7;
      const ly = ((seed * period) + (t * (18 + seed * 14))) % period;
      ctx.fillStyle = `rgba(240,${120 + (i % 3) * 20},40,${0.55 + seed * 0.3})`;
      ctx.beginPath(); ctx.ellipse(lx, ly, 2.5, 1.4, t + i, 0, Math.PI * 2); ctx.fill();
    }
  }

  function paintBiome_cold_stone(ctx, w, h, t, isNight, pal) {
    const skyTop  = isNight ? '#06081a' : '#1a2a4c';
    const skyMid  = isNight ? '#0a0a18' : '#2a3a5c';
    const horizon = isNight ? '#080a14' : '#3a4a68';
    const sg = ctx.createLinearGradient(0, 0, 0, h * 0.7);
    sg.addColorStop(0, skyTop); sg.addColorStop(0.6, skyMid); sg.addColorStop(1, horizon);
    ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h * 0.7);
    // Mountain silhouette — jagged
    ctx.fillStyle = isNight ? '#06081a' : '#0a1428';
    ctx.beginPath(); ctx.moveTo(0, h * 0.7);
    const peaks = [0.35, 0.42, 0.30, 0.48, 0.36, 0.50, 0.38, 0.44];
    for (let i = 0; i < peaks.length; i++) {
      ctx.lineTo((i / (peaks.length - 1)) * w, h * peaks[i]);
    }
    ctx.lineTo(w, h * 0.7); ctx.closePath(); ctx.fill();
    // Snow caps on peaks
    ctx.fillStyle = isNight ? 'rgba(160,180,220,0.35)' : 'rgba(240,248,255,0.65)';
    for (let i = 0; i < peaks.length; i++) {
      const px = (i / (peaks.length - 1)) * w;
      const py = h * peaks[i];
      ctx.beginPath(); ctx.moveTo(px - 14, py + 10); ctx.lineTo(px, py); ctx.lineTo(px + 14, py + 10); ctx.closePath(); ctx.fill();
    }
    // Floor — snow
    const fg = ctx.createLinearGradient(0, h * 0.7, 0, h);
    fg.addColorStop(0, isNight ? '#1a1c28' : '#5a6a80');
    fg.addColorStop(1, isNight ? '#08080c' : '#1a2030');
    ctx.fillStyle = fg; ctx.fillRect(0, h * 0.7, w, h * 0.3);
    // Ice spires foreground
    ctx.fillStyle = isNight ? 'rgba(140,180,220,0.55)' : 'rgba(220,240,255,0.75)';
    for (let i = 0; i < 5; i++) {
      const sx = w * (0.05 + i * 0.22 + (_hash(i + 5) - 0.5) * 0.04);
      const sh = h * (0.10 + _hash(i + 13) * 0.06);
      const sy = h * 0.78;
      ctx.beginPath(); ctx.moveTo(sx - 4, sy); ctx.lineTo(sx + 4, sy); ctx.lineTo(sx, sy - sh); ctx.closePath(); ctx.fill();
    }
    // Snow drifting down
    for (let i = 0; i < 22; i++) {
      const seed = _hash(i + 71);
      const sx = ((_hash(i + 31) * w) + Math.sin(t * 0.6 + i * 0.8) * 8) % w;
      const period = h;
      const sy = ((seed * period) + (t * (20 + seed * 12))) % period;
      ctx.fillStyle = `rgba(240,248,255,${0.5 + seed * 0.4})`;
      ctx.beginPath(); ctx.arc(sx, sy, 1.2 + seed * 0.6, 0, Math.PI * 2); ctx.fill();
    }
  }

  function paintBiome_temple(ctx, w, h, t, isNight, pal) {
    const skyTop  = isNight ? '#1a0612' : '#5a1818';
    const skyMid  = isNight ? '#10040a' : '#3a1010';
    const horizon = isNight ? '#08020a' : '#1a0606';
    const sg = ctx.createLinearGradient(0, 0, 0, h * 0.7);
    sg.addColorStop(0, skyTop); sg.addColorStop(0.6, skyMid); sg.addColorStop(1, horizon);
    ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h * 0.7);
    // Pagoda foreground silhouette — three tiers
    const pagX = w * 0.5, baseY = h * 0.7;
    ctx.fillStyle = isNight ? '#04020a' : '#0a0404';
    // Bottom tier
    ctx.fillRect(pagX - 38, baseY - 28, 76, 28);
    // Roof 1
    ctx.beginPath(); ctx.moveTo(pagX - 46, baseY - 28); ctx.lineTo(pagX + 46, baseY - 28); ctx.lineTo(pagX + 38, baseY - 38); ctx.lineTo(pagX - 38, baseY - 38); ctx.closePath(); ctx.fill();
    // Mid tier
    ctx.fillRect(pagX - 28, baseY - 56, 56, 18);
    ctx.beginPath(); ctx.moveTo(pagX - 36, baseY - 56); ctx.lineTo(pagX + 36, baseY - 56); ctx.lineTo(pagX + 28, baseY - 64); ctx.lineTo(pagX - 28, baseY - 64); ctx.closePath(); ctx.fill();
    // Top tier
    ctx.fillRect(pagX - 18, baseY - 78, 36, 14);
    ctx.beginPath(); ctx.moveTo(pagX - 24, baseY - 78); ctx.lineTo(pagX + 24, baseY - 78); ctx.lineTo(pagX, baseY - 92); ctx.closePath(); ctx.fill();
    // Floor — sand stone
    const fg = ctx.createLinearGradient(0, h * 0.7, 0, h);
    fg.addColorStop(0, isNight ? '#180a14' : '#502818');
    fg.addColorStop(1, isNight ? '#04020a' : '#180806');
    ctx.fillStyle = fg; ctx.fillRect(0, h * 0.7, w, h * 0.3);
    // Floor stipple
    ctx.fillStyle = isNight ? 'rgba(160,80,40,0.16)' : 'rgba(240,192,96,0.20)';
    for (let i = 0; i < 70; i++) {
      const x = _hash(i + 17) * w;
      const y = h * 0.7 + _hash(i + 89) * h * 0.3;
      ctx.fillRect(x, y, 1, 1);
    }
    // Ember motes — drift upward, glow
    for (let i = 0; i < 18; i++) {
      const seed = _hash(i + 53);
      const ex = ((_hash(i + 19) * w) + Math.sin(t * 0.8 + i) * 10) % w;
      const period = h;
      const ey = period - (((seed * period) + (t * (16 + seed * 10))) % period);
      const a = 0.4 + Math.sin(t * 2 + i) * 0.25;
      ctx.fillStyle = `rgba(255,${160 + (i % 3) * 20},80,${a})`;
      ctx.beginPath(); ctx.arc(ex, ey, 1.4, 0, Math.PI * 2); ctx.fill();
    }
  }

  function paintBiome_cave(ctx, w, h, t, isNight, pal) {
    // Cave is dark regardless of mode — night just deepens it
    const skyTop  = isNight ? '#020208' : '#0a0612';
    const skyMid  = isNight ? '#04020a' : '#0e0818';
    const horizon = isNight ? '#000004' : '#04020a';
    const sg = ctx.createLinearGradient(0, 0, 0, h * 0.7);
    sg.addColorStop(0, skyTop); sg.addColorStop(0.6, skyMid); sg.addColorStop(1, horizon);
    ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h * 0.7);
    // Cave ceiling silhouette — top of frame
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.lineTo(w, h * 0.18);
    for (let i = 8; i >= 0; i--) {
      const px = (i / 8) * w;
      const py = h * (0.10 + Math.sin(i * 1.3) * 0.05 + (i % 2) * 0.04);
      ctx.lineTo(px, py);
    }
    ctx.lineTo(0, h * 0.18); ctx.closePath(); ctx.fill();
    // Stalactites hanging
    for (let i = 0; i < 7; i++) {
      const sx = w * (0.08 + i * 0.14 + (_hash(i + 5) - 0.5) * 0.04);
      const sh = h * (0.08 + _hash(i + 19) * 0.08);
      ctx.fillStyle = '#000000';
      ctx.beginPath(); ctx.moveTo(sx - 5, h * 0.14); ctx.lineTo(sx + 5, h * 0.14); ctx.lineTo(sx, h * 0.14 + sh); ctx.closePath(); ctx.fill();
      // Highlight on edge
      ctx.strokeStyle = 'rgba(168,120,216,0.18)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx - 5, h * 0.14); ctx.lineTo(sx, h * 0.14 + sh); ctx.stroke();
    }
    // Floor — wet rock
    const fg = ctx.createLinearGradient(0, h * 0.7, 0, h);
    fg.addColorStop(0, '#140820'); fg.addColorStop(1, '#040208');
    ctx.fillStyle = fg; ctx.fillRect(0, h * 0.7, w, h * 0.3);
    // Stalagmites
    for (let i = 0; i < 5; i++) {
      const sx = w * (0.10 + i * 0.20 + (_hash(i + 23) - 0.5) * 0.04);
      const sh = h * (0.06 + _hash(i + 31) * 0.06);
      const sy = h * 0.84;
      ctx.fillStyle = '#06030c';
      ctx.beginPath(); ctx.moveTo(sx - 6, sy); ctx.lineTo(sx + 6, sy); ctx.lineTo(sx, sy - sh); ctx.closePath(); ctx.fill();
    }
    // Water drip glints on stalactite tips — periodic flash
    for (let i = 0; i < 7; i++) {
      const sx = w * (0.08 + i * 0.14 + (_hash(i + 5) - 0.5) * 0.04);
      const sh = h * (0.08 + _hash(i + 19) * 0.08);
      const phase = (t * 0.6 + i * 0.7) % 3;
      if (phase < 0.3) {
        const a = (0.3 - phase) / 0.3;
        ctx.fillStyle = `rgba(200,180,255,${a * 0.9})`;
        ctx.beginPath(); ctx.arc(sx, h * 0.14 + sh + 2, 1.6, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  function paintBiome_eldritch(ctx, w, h, t, isNight, pal) {
    const skyTop  = isNight ? '#0a0418' : '#1a0a2a';
    const skyMid  = isNight ? '#080214' : '#10081e';
    const horizon = isNight ? '#04020a' : '#080410';
    const sg = ctx.createLinearGradient(0, 0, 0, h * 0.7);
    sg.addColorStop(0, skyTop); sg.addColorStop(0.6, skyMid); sg.addColorStop(1, horizon);
    ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h * 0.7);
    // Distant violet stars
    for (let i = 0; i < 30; i++) {
      const sx = _hash(i + 3) * w;
      const sy = _hash(i + 41) * h * 0.5;
      const a = 0.2 + Math.sin(t * 1.5 + i) * 0.2;
      ctx.fillStyle = `rgba(192,128,255,${a})`;
      ctx.fillRect(sx, sy, 1, 1);
    }
    // Broken sigil silhouettes — angular shards on horizon
    ctx.fillStyle = '#020008';
    for (let i = 0; i < 6; i++) {
      const sx = (i + 0.5) * (w / 6) + (_hash(i + 9) - 0.5) * 16;
      const sh = h * (0.16 + _hash(i + 17) * 0.10);
      const sy = h * 0.7;
      ctx.beginPath();
      ctx.moveTo(sx - 12, sy);
      ctx.lineTo(sx - 8, sy - sh * 0.7);
      ctx.lineTo(sx, sy - sh);
      ctx.lineTo(sx + 8, sy - sh * 0.6);
      ctx.lineTo(sx + 12, sy);
      ctx.closePath(); ctx.fill();
    }
    // Floor — soaked violet stone
    const fg = ctx.createLinearGradient(0, h * 0.7, 0, h);
    fg.addColorStop(0, '#1a0428'); fg.addColorStop(1, '#04020a');
    ctx.fillStyle = fg; ctx.fillRect(0, h * 0.7, w, h * 0.3);
    // Pulsing sigil glyphs on the floor
    for (let i = 0; i < 4; i++) {
      const gx = w * (0.18 + i * 0.22);
      const gy = h * (0.84 + (i % 2) * 0.05);
      const pulse = 0.4 + Math.sin(t * 2.5 + i * 1.3) * 0.4;
      const r = 12 + Math.sin(t * 2.5 + i * 1.3) * 2;
      ctx.strokeStyle = `rgba(192,96,255,${pulse * 0.7})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(gx, gy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = `rgba(192,96,255,${pulse * 0.4})`;
      ctx.beginPath();
      ctx.moveTo(gx - r, gy); ctx.lineTo(gx + r, gy);
      ctx.moveTo(gx, gy - r); ctx.lineTo(gx, gy + r);
      ctx.stroke();
    }
  }

  const BIOME_PAINTERS = {
    forest_summer: paintBiome_forest_summer,
    forest_autumn: paintBiome_forest_autumn,
    cold_stone:    paintBiome_cold_stone,
    temple:        paintBiome_temple,
    cave:          paintBiome_cave,
    eldritch:      paintBiome_eldritch,
  };

  // Menu-scale character sprite. Mirrors hunt-render.js drawAnimeGirl body
  // (legs/skirt/shirt/sash/arms/head/hair/eyes) at 2× scale, idle facing-S,
  // no rotating scythe — menu is at-rest. Tier-derived `color` tints the
  // skirt, `accent` tints sash/shoes/hair-ribbon for per-character variety.
  // Idle bob is 2px @ 1.5s period; ground shadow is a soft ellipse below feet.
  function drawMenuCharacter(ctx, cx, cy, t, color, accent) {
    const scale = 2;
    const bob = Math.sin(t * (Math.PI * 2 / 1.5)) * 2;
    ctx.save();
    ctx.translate(cx, cy + bob);
    // Ground shadow — drawn pre-scale so dimensions are in CSS pixels
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 14 * scale, 14 * scale, 4 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.scale(scale, scale);
    // Legs
    ctx.fillStyle = '#f0c890';
    ctx.fillRect(-4, 4, 3, 8);
    ctx.fillRect(1, 4, 3, 8);
    // Shoes — accent-tinted
    ctx.fillStyle = accent;
    ctx.fillRect(-4, 11, 3, 2);
    ctx.fillRect(1, 11, 3, 2);
    // Skirt trapezoid — primary color
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-6, -1); ctx.lineTo(6, -1);
    ctx.lineTo(8, 6);   ctx.lineTo(-8, 6);
    ctx.closePath(); ctx.fill();
    // Skirt rim highlight
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(-5, -1, 10, 1);
    // Shirt — cream
    ctx.fillStyle = '#f0e8d0';
    ctx.fillRect(-5, -8, 10, 8);
    // Sash — accent
    ctx.fillStyle = accent;
    ctx.fillRect(-5, -3, 10, 1);
    // Arms
    ctx.fillStyle = '#f0c890';
    ctx.fillRect(-7, -6, 2, 5);
    ctx.fillRect(5, -6, 2, 5);
    // Head — peach face
    ctx.fillStyle = '#f8d8a8';
    ctx.beginPath(); ctx.arc(0, -11, 4.5, 0, Math.PI * 2); ctx.fill();
    // Hair — dark mass behind face
    ctx.fillStyle = '#1a0a06';
    ctx.fillRect(-5, -14, 10, 8);
    ctx.fillRect(-5, -14, 2, 5);
    ctx.fillRect(3, -14, 2, 5);
    ctx.beginPath(); ctx.arc(0, -13, 4, Math.PI, 0, false); ctx.fill();
    // Hair ribbon — accent
    ctx.fillStyle = accent;
    ctx.fillRect(-5, -14, 2, 1.5);
    // Eyes
    ctx.fillStyle = '#1a0410';
    ctx.fillRect(-2, -11, 1, 1);
    ctx.fillRect(1, -11, 1, 1);
    // Tiny rim-light blink on cheek
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    ctx.beginPath(); ctx.arc(-2.4, -10.2, 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function isStageUnlocked(stage, allStages) {
    if (stage.id === 1) return true;
    const prev = allStages.find(s => s.id === stage.id - 1);
    if (!prev) return false;
    const best = (WG.State.get().huntProgress.bestWaves || {})[prev.id];
    return !!(best && best > 0);
  }

  function showHuntStageList() {
    if (huntRuntime && huntRuntime.player && huntRuntime.player.hp > 0) return;
    const root = document.getElementById('tab-hunt');
    const existing = document.getElementById('hunt-stage-select');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    const select = document.createElement('div');
    select.id = 'hunt-stage-select';
    select.style.cssText = 'position:absolute;inset:36px 0 0 0;padding:8px 14px 16px 14px;background:#0c0a08;z-index:10;display:flex;flex-direction:column;';
    root.appendChild(select);

    const stages = WG.HuntStage.list();

    // Clamp selection to a valid stage on (re)open.
    if (selectedStageIdx < 0 || selectedStageIdx >= stages.length) selectedStageIdx = 0;

    // ─── Hero tile ──────────────────────────────────────────────────────────
    const hero = document.createElement('div');
    hero.style.cssText = 'position:relative;flex:1 1 auto;min-height:260px;border-radius:14px;overflow:hidden;border:2px solid #3a2818;box-shadow:0 4px 14px rgba(0,0,0,0.6);margin-bottom:10px;';
    select.appendChild(hero);

    // Side-icon column factory (left + right floating columns over hero).
    function sideIcon(opts) {
      const b = document.createElement('button');
      b.style.cssText = `display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;width:52px;padding:7px 4px;border:1.5px solid ${opts.border||'#5a4028'};border-radius:9px;background:linear-gradient(to bottom,rgba(40,30,16,0.85),rgba(20,12,6,0.92));color:#f0d890;cursor:pointer;font-size:9px;letter-spacing:0.5px;font-weight:700;position:relative;transition:transform 80ms ease;`;
      b.innerHTML = `<span style="font-size:22px;line-height:1;">${opts.glyph}</span><span style="margin-top:2px;text-align:center;line-height:1.05;">${opts.label}</span>${opts.badge?`<span style="position:absolute;top:-3px;right:-3px;background:#e02828;color:#fff;font-size:9px;padding:1px 4px;border-radius:8px;font-weight:700;border:1px solid #200808;">${opts.badge}</span>`:''}${opts.timer?`<span style="font-size:8px;color:#a8d878;margin-top:1px;letter-spacing:0;">${opts.timer}</span>`:''}`;
      b.addEventListener('pointerdown',()=>{b.style.transform='scale(0.92)';});
      b.addEventListener('pointerup',()=>{b.style.transform='scale(1)';});
      b.addEventListener('pointerleave',()=>{b.style.transform='scale(1)';});
      b.addEventListener('click', opts.onClick);
      return b;
    }

    const leftCol = document.createElement('div');
    leftCol.style.cssText = 'position:absolute;left:8px;top:8px;display:flex;flex-direction:column;gap:8px;z-index:3;';
    leftCol.appendChild(sideIcon({glyph:'📋',label:'TASKS',onClick:()=>openInfoModal('Tasks','Daily quest tracker — ship in v0.20.')}));
    leftCol.appendChild(sideIcon({glyph:'🎒',label:'OFFERS',border:'#f0c060',badge:'AD',onClick:openOffersModal}));
    hero.appendChild(leftCol);

    const rightCol = document.createElement('div');
    rightCol.style.cssText = 'position:absolute;right:8px;top:8px;display:flex;flex-direction:column;gap:8px;z-index:3;';
    rightCol.appendChild(sideIcon({glyph:'⚙',label:'SETTINGS',onClick:()=>openInfoModal('Settings','Audio, vibration, language — wiring next pass.')}));
    rightCol.appendChild(sideIcon({glyph:'🎁',label:'DAILY',timer:'01:58',onClick:()=>openInfoModal('Daily Reward','Today\'s claim + 7-day streak grid — preview, full wiring v0.20.')}));
    rightCol.appendChild(sideIcon({glyph:'📅',label:'7-DAYS',badge:'!',onClick:()=>openInfoModal('7-Day Login','Day-of streak rewards — preview.')}));
    hero.appendChild(rightCol);

    // Carousel arrows
    function arrowBtn(dir) {
      const a = document.createElement('button');
      a.textContent = dir === 'left' ? '◀' : '▶';
      a.style.cssText = `position:absolute;${dir}:6px;top:50%;transform:translateY(-50%);width:34px;height:54px;border-radius:8px;border:1.5px solid #5a4028;background:linear-gradient(to bottom,rgba(40,30,16,0.85),rgba(20,12,6,0.92));color:#f0d890;font-size:18px;cursor:pointer;z-index:3;transition:transform 80ms ease;`;
      a.addEventListener('pointerdown',()=>{a.style.transform='translateY(-50%) scale(0.92)';});
      a.addEventListener('pointerup',()=>{a.style.transform='translateY(-50%) scale(1)';});
      a.addEventListener('pointerleave',()=>{a.style.transform='translateY(-50%) scale(1)';});
      a.addEventListener('click', () => {
        if (dir === 'left' && selectedStageIdx > 0) selectedStageIdx--;
        else if (dir === 'right' && selectedStageIdx < stages.length - 1) selectedStageIdx++;
        renderHero();
      });
      return a;
    }
    hero.appendChild(arrowBtn('left'));
    hero.appendChild(arrowBtn('right'));

    // Hero content layer (re-rendered on stage change)
    const heroContent = document.createElement('div');
    heroContent.style.cssText = 'position:absolute;inset:0;z-index:1;';
    hero.appendChild(heroContent);

    // ─── Mode pills ─────────────────────────────────────────────────────────
    const modeBar = document.createElement('div');
    modeBar.style.cssText = 'display:flex;gap:8px;margin-bottom:10px;';
    select.appendChild(modeBar);

    function modePill(label, mode) {
      const isActive = currentLevelMode === mode;
      const isNight = mode === 'night';
      const accent = isNight ? '#a060ff' : '#a8d878';
      const p = document.createElement('button');
      p.style.cssText = `flex:1;padding:11px;border-radius:22px;border:1.5px solid ${isActive?accent:'#3a2818'};background:${isActive?(isNight?'linear-gradient(to bottom,#3a1858,#1a0a30)':'linear-gradient(to bottom,#1c3a1c,#0a2010)'):'#1a1208'};color:${isActive?accent:'#a89878'};font-size:11px;letter-spacing:2px;font-weight:700;cursor:pointer;transition:transform 80ms ease;`;
      p.textContent = label;
      p.addEventListener('pointerdown',()=>{p.style.transform='scale(0.97)';});
      p.addEventListener('pointerup',()=>{p.style.transform='scale(1)';});
      p.addEventListener('pointerleave',()=>{p.style.transform='scale(1)';});
      p.addEventListener('click', () => { currentLevelMode = mode; renderHero(); rebuildPills(); });
      return p;
    }
    function rebuildPills() {
      modeBar.innerHTML = '';
      modeBar.appendChild(modePill('☀ NORMAL MODE', 'day'));
      modeBar.appendChild(modePill('☾ NIGHTMARE MODE', 'night'));
    }
    rebuildPills();

    // ─── BATTLE button ──────────────────────────────────────────────────────
    const battleWrap = document.createElement('div');
    battleWrap.style.cssText = 'display:flex;justify-content:center;';
    select.appendChild(battleWrap);

    const battleBtn = document.createElement('button');
    battleBtn.style.cssText = 'min-width:200px;padding:14px 36px;border-radius:32px;border:2px solid #f8a030;background:linear-gradient(to bottom,#e85020,#a02810);color:#fff8e0;font-size:18px;letter-spacing:3px;font-weight:800;cursor:pointer;box-shadow:0 4px 12px rgba(232,80,32,0.45),0 0 0 1px rgba(255,200,120,0.35) inset;text-shadow:0 1px 2px rgba(0,0,0,0.6);transition:transform 80ms ease;';
    battleBtn.textContent = 'BATTLE';
    battleBtn.addEventListener('pointerdown',()=>{battleBtn.style.transform='scale(0.96)';});
    battleBtn.addEventListener('pointerup',()=>{battleBtn.style.transform='scale(1)';});
    battleBtn.addEventListener('pointerleave',()=>{battleBtn.style.transform='scale(1)';});
    battleBtn.addEventListener('click', () => {
      const stage = stages[selectedStageIdx];
      if (!stage) return;
      if (!isStageUnlocked(stage, stages)) {
        flashScreen('#e02828', 0.18, 220);
        return;
      }
      if (select.parentNode) select.parentNode.removeChild(select);
      startHunt(stage.id, currentLevelMode);
    });
    battleWrap.appendChild(battleBtn);

    // ─── Hero render (called on stage change / mode change) ─────────────────
    function renderHero() {
      cancelMenuLoop();
      heroContent.innerHTML = '';
      const stage = stages[selectedStageIdx];
      const isNight = currentLevelMode === 'night';
      const pal = BIOME_PALETTE[stage.biome] || BIOME_PALETTE.forest_summer;
      const painter = BIOME_PAINTERS[stage.biome] || paintBiome_forest_summer;
      const unlocked = isStageUnlocked(stage, stages);
      const bestWaves = WG.State.get().huntProgress.bestWaves || {};
      const best = bestWaves[stage.id] ? `${(+bestWaves[stage.id]).toFixed(1)}m` : '—';
      const activeId = (WG.State.get().player && WG.State.get().player.activeCharacter) || 'lantern_acolyte';
      const activeChar = (WG.AscendSkins && WG.AscendSkins.get && WG.AscendSkins.get(activeId)) || null;
      const tier = (WG.AscendSkins && WG.AscendSkins.currentTier && WG.AscendSkins.currentTier(activeId)) || null;
      const charLabel = (tier && tier.name) ? tier.name : (activeChar && activeChar.name ? activeChar.name : 'Acolyte');
      const charColor  = (tier && tier.color)  || pal.accent;
      const charAccent = (tier && tier.accent) || pal.accent;

      // Biome canvas — replaces former gradient skyDiv/floorDiv + 6 triangle trees.
      // DPR-aware. 30+ fps animation loop until heroContent is wiped or menu cancelled.
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
      heroContent.appendChild(canvas);
      const ctx = canvas.getContext('2d');

      // Concern D — biome art slot. If BIOME_ART[stage.biome] is a non-null
      // URL, overlay an <img> at z-index 1 (same plane as canvas). On load,
      // hide the canvas to spare the painter loop. On error, drop the img and
      // fall back to procedural canvas. Rift biomes carry a violet drop-shadow
      // + glitch keyframe via the .wg-rift-intrude class (index.html).
      const isRift = RIFT_BIOMES.has(stage.biome);
      const biomeArtUrl = BIOME_ART[stage.biome];
      if (biomeArtUrl) {
        const img = document.createElement('img');
        img.alt = '';
        img.decoding = 'async';
        img.loading = 'lazy';
        img.src = biomeArtUrl;
        img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;z-index:1;pointer-events:none;';
        if (isRift) img.classList.add('wg-rift-intrude');
        img.addEventListener('load', () => { canvas.style.display = 'none'; });
        img.addEventListener('error', () => { if (img.parentNode) img.parentNode.removeChild(img); });
        heroContent.appendChild(img);
      }

      // Character canvas — overlaid above biome (own canvas per W-Menu-Art-Pass §B).
      // Sized to a centered 96×140 CSS box near bottom-center so it composites
      // over the biome floor band. Lock overlay still wins via its own z-index.
      const charCanvas = document.createElement('canvas');
      charCanvas.style.cssText = 'position:absolute;left:50%;bottom:18%;transform:translateX(-50%);width:96px;height:140px;display:block;pointer-events:none;z-index:2;';
      heroContent.appendChild(charCanvas);
      const cctx = charCanvas.getContext('2d');

      // Concern D — character portrait slot. If CHARACTER_PORTRAITS[activeId]
      // is a non-null URL, overlay an <img> matching the procedural sprite's
      // box. On load, hide the procedural sprite. On error, fall back. Rift
      // biome class follows the biome (cross-IP characters appear in rifts).
      const portraitUrl = CHARACTER_PORTRAITS[activeId];
      if (portraitUrl) {
        const portrait = document.createElement('img');
        portrait.alt = '';
        portrait.decoding = 'async';
        portrait.loading = 'lazy';
        portrait.src = portraitUrl;
        // Centered via calc-offset, not translateX(-50%), so the rift glitch
        // keyframe (which owns `transform`) cannot overwrite the centering.
        portrait.style.cssText = 'position:absolute;left:calc(50% - 48px);bottom:18%;width:96px;height:140px;object-fit:contain;display:block;z-index:2;pointer-events:none;';
        if (isRift) portrait.classList.add('wg-rift-intrude');
        portrait.addEventListener('load', () => { charCanvas.style.display = 'none'; });
        portrait.addEventListener('error', () => { if (portrait.parentNode) portrait.parentNode.removeChild(portrait); });
        heroContent.appendChild(portrait);
      }
      let lastW = 0, lastH = 0;
      let lastCW = 0, lastCH = 0;
      const t0 = performance.now();
      function loop(now) {
        if (!canvas.isConnected) { _menuRaf = 0; return; }
        const cssW = canvas.clientWidth | 0;
        const cssH = canvas.clientHeight | 0;
        if (cssW <= 0 || cssH <= 0) { _menuRaf = requestAnimationFrame(loop); return; }
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (cssW !== lastW || cssH !== lastH) {
          canvas.width = cssW * dpr; canvas.height = cssH * dpr;
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          lastW = cssW; lastH = cssH;
        }
        const ccW = charCanvas.clientWidth | 0;
        const ccH = charCanvas.clientHeight | 0;
        if (ccW !== lastCW || ccH !== lastCH) {
          charCanvas.width = ccW * dpr; charCanvas.height = ccH * dpr;
          cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          lastCW = ccW; lastCH = ccH;
        }
        const t = (now - t0) / 1000;
        ctx.clearRect(0, 0, cssW, cssH);
        painter(ctx, cssW, cssH, t, isNight, pal);
        cctx.clearRect(0, 0, ccW, ccH);
        // Center sprite at canvas mid-X, near the bottom (feet anchor at +14*scale below).
        drawMenuCharacter(cctx, ccW * 0.5, ccH * 0.62, t, charColor, charAccent);
        _menuRaf = requestAnimationFrame(loop);
      }
      _menuRaf = requestAnimationFrame(loop);

      // Vignette overlay — drops focus on the character; sits between biome
      // canvas (z-index 1, default) and HUD chrome (titles/dots z-index 3).
      const vignette = document.createElement('div');
      vignette.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:2;background:radial-gradient(ellipse at 50% 60%, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.7) 100%);mix-blend-mode:multiply;opacity:0.4;';
      heroContent.appendChild(vignette);

      // Stage title block (top center) — with glyphic divider underline
      const titleBlock = document.createElement('div');
      titleBlock.style.cssText = 'position:absolute;top:14px;left:0;right:0;text-align:center;z-index:3;pointer-events:none;';
      titleBlock.innerHTML = `
        <div style="font-size:11px;letter-spacing:2px;color:${pal.accent};opacity:0.85;text-shadow:0 1px 2px rgba(0,0,0,0.7);">STAGE ${stage.id} ${isNight?'· ☾':'· ☀'}</div>
        <div style="font-size:22px;font-weight:800;color:#fff8e0;margin-top:4px;text-shadow:0 2px 6px rgba(0,0,0,0.85);letter-spacing:1px;">${stage.name}</div>
        <div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-top:6px;">
          <div style="height:1px;width:54px;background:linear-gradient(to right, transparent, ${pal.accent}, transparent);opacity:0.9;"></div>
          <div style="width:5px;height:5px;border-radius:50%;background:${pal.accent};box-shadow:0 0 6px ${pal.accent};"></div>
          <div style="height:1px;width:54px;background:linear-gradient(to left, transparent, ${pal.accent}, transparent);opacity:0.9;"></div>
        </div>
        <div style="font-size:10px;color:${pal.accent};opacity:0.85;margin-top:5px;text-shadow:0 1px 2px rgba(0,0,0,0.75);">${stage.bossId?'⚔ BOSS · ':'· WAVE · '} ${(stage.durationSec/60).toFixed(1)}m · BEST: ${best}</div>
      `;
      heroContent.appendChild(titleBlock);

      // Character name plate — sits under the canvas-rendered sprite (above).
      // The sprite itself is drawn into charCanvas inside the rAF loop above.
      const charLabelEl = document.createElement('div');
      charLabelEl.style.cssText = 'position:absolute;left:0;right:0;bottom:14%;text-align:center;z-index:3;pointer-events:none;font-size:10px;color:#fff8e0;text-shadow:0 1px 2px rgba(0,0,0,0.85);letter-spacing:1px;';
      charLabelEl.textContent = charLabel;
      heroContent.appendChild(charLabelEl);

      // Lock overlay if stage isn't unlocked
      if (!unlocked) {
        const lock = document.createElement('div');
        lock.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,0.65);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:4;text-align:center;padding:20px;';
        lock.innerHTML = `
          <div style="font-size:48px;line-height:1;">🔒</div>
          <div style="font-size:14px;color:#f0d890;margin-top:10px;font-weight:700;letter-spacing:1px;">LOCKED</div>
          <div style="font-size:11px;color:#a89878;margin-top:6px;line-height:1.4;">Beat Stage ${stage.id - 1} to unlock</div>
        `;
        heroContent.appendChild(lock);
        battleBtn.style.opacity = '0.45';
        battleBtn.style.cursor = 'not-allowed';
        battleBtn.textContent = '🔒  LOCKED';
        battleBtn.style.animation = '';
      } else {
        battleBtn.style.opacity = '1';
        battleBtn.style.cursor = 'pointer';
        battleBtn.textContent = 'BATTLE';
        battleBtn.style.animation = 'battlePulse 2s ease-in-out infinite';
      }

      // Carousel position dots — tighter 5px gap
      const dots = document.createElement('div');
      dots.style.cssText = 'position:absolute;bottom:6px;left:0;right:0;display:flex;justify-content:center;gap:5px;z-index:3;';
      for (let i = 0; i < stages.length; i++) {
        const dot = document.createElement('div');
        const isCurrent = i === selectedStageIdx;
        dot.style.cssText = `width:${isCurrent?10:5}px;height:5px;border-radius:3px;background:${isCurrent?pal.accent:'rgba(255,255,255,0.3)'};transition:all 120ms ease;`;
        dots.appendChild(dot);
      }
      heroContent.appendChild(dots);
    }

    renderHero();
  }

  // ─── Modal helpers (Offers + generic info stub) ─────────────────────────────
  // Offers modal collapses the 4 ad-buffs (formerly the buff strip on the menu)
  // into a single tap-to-open panel keyed off the OFFERS side icon. Keeps the
  // hero tile uncluttered while preserving Path A monetization placement.
  function openOffersModal() {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;';
    const panel = document.createElement('div');
    panel.style.cssText = 'width:100%;max-width:340px;background:linear-gradient(to bottom,#1a1208,#0a0604);border:2px solid #f0c060;border-radius:14px;padding:18px;';
    panel.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;"><div style="font-size:14px;color:#f0c060;font-weight:700;letter-spacing:2px;">▶ OFFERS</div><button id="offers-close" style="background:none;border:none;color:#a89878;font-size:20px;cursor:pointer;line-height:1;">✕</button></div>`;
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    appendBuffStrip(panel);
    panel.querySelector('#offers-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  }
  function openInfoModal(title, body) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `<div style="width:100%;max-width:320px;background:linear-gradient(to bottom,#1a1208,#0a0604);border:2px solid #5a4028;border-radius:14px;padding:18px;text-align:center;"><div style="font-size:14px;color:#f0d890;font-weight:700;letter-spacing:2px;margin-bottom:10px;">${title.toUpperCase()}</div><div style="font-size:12px;color:#a89878;line-height:1.5;margin-bottom:14px;">${body}</div><button id="info-close" style="padding:8px 24px;border-radius:18px;border:1.5px solid #5a4028;background:#1a1208;color:#f0d890;font-size:11px;letter-spacing:2px;font-weight:700;cursor:pointer;">CLOSE</button></div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#info-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  }

  function syncTopStrip() {
    const c = WG.State.get().currencies;
    document.querySelectorAll('[data-bind="coins"]').forEach(el => el.textContent = String(c.coins));
    document.querySelectorAll('[data-bind="diamonds"]').forEach(el => el.textContent = String(c.diamonds));
    document.querySelectorAll('[data-bind="cards"]').forEach(el => el.textContent = String(c.cards));
    document.querySelectorAll('[data-bind="power"]').forEach(el => el.textContent = String(WG.State.recomputePower()));
    // hide power on hunt tab
    const showOn = WG.State.get().activeTab;
    document.querySelectorAll('[data-show-on]').forEach(el => {
      const tabs = el.dataset.showOn.split(' ');
      el.style.display = tabs.includes(showOn) ? 'flex' : 'none';
    });
  }

  function setupNav() {
    document.querySelectorAll('.nav-tab').forEach(n => {
      n.addEventListener('click', () => switchTab(n.dataset.tab));
    });
    // Cancel menu paint loop when the page hides — saves CPU on background tabs.
    // Restored automatically by the next render (renderHero starts a new loop).
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelMenuLoop();
      else if (WG.State.get().activeTab === 'hunt' && !huntRuntime) showHuntStageList();
    });
    // SPEC §0 — in-stage back-to-lobby button (counts as exit, no rewards)
    const backBtn = document.getElementById('hunt-back-btn');
    if (backBtn) backBtn.addEventListener('click', () => {
      if (huntRuntime) exitHunt();
    });
  }

  async function init() {
    if (!WG.Engine || !WG.State || !WG.Display) throw new Error('core modules missing');
    // Init cycle
    WG.State.init();
    WG.Cache.init();
    WG.Cache.load();
    WG.Account.init();
    WG.Events.init();
    WG.IAP.init();
    WG.Ads.init();
    if (WG.Buffs && WG.Buffs.init) WG.Buffs.init();
    if (WG.Audio && WG.Audio.init) WG.Audio.init();
    WG.Input.init();
    WG.Render.init();
    WG.HuntStage.init();
    WG.HuntWeapons.init();
    WG.HuntPickups.init();
    WG.HuntEnemies.init();
    WG.HuntBosses.init();
    WG.HuntWaves.init();
    WG.HuntPlayer.init();
    WG.HuntResults.init();
    WG.HuntRender.init();
    WG.HuntTutorial.init();
    WG.AscendCharacter.init();
    WG.AscendSkins.init();
    WG.AscendEquipment.init();
    WG.AscendStats.init();
    WG.AscendRebirth.init();
    WG.AscendRender.init();
    WG.ForgeBuildings.init();
    WG.ForgeCraft.init();
    WG.ForgeDaily.init();
    WG.ForgeRender.init();
    WG.RelicsCatalog.init();
    WG.RelicsCollection.init();
    WG.RelicsEquip.init();
    WG.RelicsRender.init();
    WG.DuelRoster.init();
    WG.DuelRank.init();
    WG.DuelMatch.init();
    WG.DuelRender.init();

    setupNav();
    syncTopStrip();
    showHuntStageList();
  }

  function start() {
    if (running) return;
    running = true;
    WG.Engine.setLastFrame(performance.now());
    WG.Engine.start();
    rafId = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  window.WG.Game = { init, start, stop, switchTab, startHunt, exitHunt, syncTopStrip, getHuntRuntime, flashScreen };
})();
