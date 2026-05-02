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
    const rewards = { coins: baseCoin + huntRuntime.kills * 2, diamonds: baseDia, fragments: baseFrag };
    if (cleared) WG.State.grant('coins', rewards.coins); else WG.State.grant('coins', rewards.coins);
    if (rewards.diamonds) WG.State.grant('diamonds', rewards.diamonds);
    if (rewards.fragments) WG.State.get().forge.craftFragments += rewards.fragments;
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
    const showResults = () => WG.HuntResults.show({ stageId, cleared, mins, kills: huntRuntime.kills, rewards });
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
      heroContent.innerHTML = '';
      const stage = stages[selectedStageIdx];
      const isNight = currentLevelMode === 'night';
      const pal = BIOME_PALETTE[stage.biome] || BIOME_PALETTE.forest_summer;
      const unlocked = isStageUnlocked(stage, stages);
      const bestWaves = WG.State.get().huntProgress.bestWaves || {};
      const best = bestWaves[stage.id] ? `${(+bestWaves[stage.id]).toFixed(1)}m` : '—';

      // Sky band + floor band — biome gradient.
      const sky = isNight ? '#08081a' : pal.sky;
      const floor = isNight ? '#10121a' : pal.floor;
      const skyDiv = document.createElement('div');
      skyDiv.style.cssText = `position:absolute;inset:0 0 38% 0;background:linear-gradient(to bottom, ${sky}, ${floor});`;
      heroContent.appendChild(skyDiv);
      const floorDiv = document.createElement('div');
      floorDiv.style.cssText = `position:absolute;inset:62% 0 0 0;background:linear-gradient(to bottom, ${floor}, ${pal.silhouette});`;
      heroContent.appendChild(floorDiv);

      // Tree silhouettes left + right (CSS triangles)
      const treeStyle = (left, height) => `position:absolute;${left?'left':'right'}:${left||0}px;bottom:30%;width:0;height:0;border-left:36px solid transparent;border-right:36px solid transparent;border-bottom:${height}px solid ${pal.silhouette};opacity:0.8;`;
      [10, 70, 130].forEach((x,i)=>{ const t=document.createElement('div'); t.style.cssText=treeStyle(x, 90 - i*8); heroContent.appendChild(t); });
      [10, 70, 130].forEach((x,i)=>{ const t=document.createElement('div'); t.style.cssText=treeStyle(0, 90 - i*8).replace('left:'+x,'right:'+x); heroContent.appendChild(t); });

      // Stage title block (top center)
      const titleBlock = document.createElement('div');
      titleBlock.style.cssText = 'position:absolute;top:14px;left:0;right:0;text-align:center;z-index:2;pointer-events:none;';
      titleBlock.innerHTML = `
        <div style="font-size:11px;letter-spacing:2px;color:${pal.accent};opacity:0.85;text-shadow:0 1px 2px rgba(0,0,0,0.7);">STAGE ${stage.id} ${isNight?'· ☾':'· ☀'}</div>
        <div style="font-size:22px;font-weight:800;color:#fff8e0;margin-top:4px;text-shadow:0 2px 4px rgba(0,0,0,0.8);letter-spacing:1px;">${stage.name}</div>
        <div style="font-size:10px;color:${pal.accent};opacity:0.8;margin-top:5px;text-shadow:0 1px 2px rgba(0,0,0,0.7);">${stage.bossId?'⚔ BOSS · ':'· WAVE · '} ${(stage.durationSec/60).toFixed(1)}m · BEST: ${best}</div>
      `;
      heroContent.appendChild(titleBlock);

      // Character silhouette (placeholder — Ascend skin preview hook in v0.20)
      const charDiv = document.createElement('div');
      const activeId = (WG.State.get().player && WG.State.get().player.activeCharacter) || 'lantern_acolyte';
      const activeChar = (WG.AscendSkins && WG.AscendSkins.get && WG.AscendSkins.get(activeId)) || null;
      const charLabel = activeChar && activeChar.name ? activeChar.name : 'Acolyte';
      charDiv.style.cssText = `position:absolute;left:50%;bottom:20%;transform:translateX(-50%);text-align:center;z-index:2;`;
      charDiv.innerHTML = `
        <div style="width:54px;height:72px;background:radial-gradient(ellipse at center top, ${pal.accent} 0%, ${pal.silhouette} 70%);border-radius:50% 50% 30% 30%;margin:0 auto;box-shadow:0 4px 12px ${pal.accent}55;"></div>
        <div style="font-size:10px;color:#fff8e0;margin-top:6px;text-shadow:0 1px 2px rgba(0,0,0,0.8);letter-spacing:1px;">${charLabel}</div>
      `;
      heroContent.appendChild(charDiv);

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
      } else {
        battleBtn.style.opacity = '1';
        battleBtn.style.cursor = 'pointer';
        battleBtn.textContent = 'BATTLE';
      }

      // Carousel position dots
      const dots = document.createElement('div');
      dots.style.cssText = 'position:absolute;bottom:6px;left:0;right:0;display:flex;justify-content:center;gap:4px;z-index:2;';
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
