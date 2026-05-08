// WG.Game — top-level orchestrator: init order, rAF loop, tab routing, hunt runtime
(function(){'use strict';

  let rafId = 0;
  let running = false;

  // Hunt runtime — populated when entering Hunt mode
  let huntRuntime = null;
  // SPEC §0 — Day/Night mode chosen on lobby level select; persists across panel rerenders
  let currentLevelMode = 'day';
  // W-Stage-Zero-Tutorial — set when stage 0 is cleared; consumed in exitHunt to trigger tabs reveal
  let _stage0JustCleared = false;

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
    // W-Monetization-V2-Energy §C — energy gate. If insufficient, open the
    // Energy Modal (refund SKUs + watch-ad) instead of silently failing.
    // W-Stage-Zero-Tutorial: Stage 0 is free (tutorial, no energy cost).
    const cost = (stageId === 0) ? 0 : (WG.State.ENERGY_TUNABLES ? WG.State.ENERGY_TUNABLES.STAGE_COST : 0);
    if (cost > 0 && WG.State.getEnergy && WG.State.getEnergy().current < cost) {
      if (WG.EnergyModal && WG.EnergyModal.open) WG.EnergyModal.open({ reason: 'out-of-energy' });
      return;
    }
    if (cost > 0 && WG.State.spendEnergy) WG.State.spendEnergy(cost);
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

  function startTowerRun() {
    const cost = WG.State.ENERGY_TUNABLES ? WG.State.ENERGY_TUNABLES.STAGE_COST : 5;
    if (WG.State.getEnergy().current < cost) {
      if (WG.EnergyModal && WG.EnergyModal.open) WG.EnergyModal.open({ reason: 'out-of-energy' });
      return;
    }
    WG.State.spendEnergy(cost);
    cancelMenuLoop();
    const rt = WG.HuntTower.startTower();
    huntRuntime = rt;
    WG.HuntRender.setRuntime(rt);
    switchTab('hunt');
    document.body.classList.add('in-stage');
    WG.Engine.emit('tower:run-start', { floor: 1 });
  }

  function exitHunt() {
    // Clean up tower overlays if returning from a Tower run
    ['wg-buff-picker','wg-milestone-chest','wg-tower-death','wg-run-summary'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
    huntRuntime = null;
    WG.HuntRender.setRuntime(null);
    // SPEC §0 — tabs+top-strip restored on lobby return
    document.body.classList.remove('in-stage');
    // W-Stage-Zero-Tutorial: on first-ever lobby reveal, animate tabs sliding up
    if (_stage0JustCleared) {
      _stage0JustCleared = false;
      _ensureTabsRevealCss();
      const navBar = document.getElementById('nav-bar');
      if (navBar) {
        navBar.style.animation = 'wg-tabs-slide-in 600ms ease-out both';
        setTimeout(function () { navBar.style.animation = ''; }, 620);
      }
    }
    WG.State.setActiveTab('hunt');
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-hunt').classList.add('active');
    document.querySelectorAll('.nav-tab').forEach(n => n.classList.toggle('active', n.dataset.tab === 'hunt'));
    showHuntStageList();
  }

  // W-Stage-Zero-Tutorial — inject slide-in keyframe once for tabs-reveal animation
  function _ensureTabsRevealCss() {
    if (document.getElementById('wg-tabs-reveal-css')) return;
    const st = document.createElement('style');
    st.id = 'wg-tabs-reveal-css';
    st.textContent = '@keyframes wg-tabs-slide-in{from{transform:translateY(100%);opacity:0;}to{transform:translateY(0);opacity:1;}}';
    document.head.appendChild(st);
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
    if (WG.State.get().activeTab === 'hunt' && huntRuntime) {
      // Tower Gauntlet branch — its own tick handles all combat + floor logic
      if (huntRuntime.mode === 'tower') {
        WG.HuntTower.tickFloor(dt);
      } else if (huntRuntime.player && huntRuntime.player.hp > 0 && !huntRuntime.pendingLevelUp) {
      if (!huntRuntime._tutorialPaused && !WG.Engine.isHitPaused()) {
      // W-Special-Abilities: time_slow effect — scale world dt for enemies/projectiles
      const _tsNow = Date.now();
      if (huntRuntime._timeSlow && _tsNow < huntRuntime._timeSlow.endsAt) {
        dt *= huntRuntime._timeSlow.factor;
      } else if (huntRuntime._timeSlow && _tsNow >= huntRuntime._timeSlow.endsAt) {
        huntRuntime._timeSlow = null;
        WG.Engine.emit('ability:time-slow-end', {});
      }
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
            // Fragment-split immunity: echo_throne_keeper is invulnerable to projectiles
            // while any boss fragments (_isBossFragment) are still alive.
            if (!(hit._fragmentsAlive > 0)) {
              hit.hp -= p.damage;
              WG.Engine.emit('boss:damaged', { boss: hit, amount: p.damage });
              if (hit.hp <= 0) {
                WG.Engine.emit('boss:defeated', { boss: hit });
                huntRuntime.bossDefeated = true;
              }
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
      } // end else (Hunt mode)
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
    // W-Monetization-V2-Whale-Ladder §B — Royal Pass 2× stage-clear multiplier
    const vipMul = (cleared && WG.State.isRoyalPassActive?.()) ? 2 : 1;
    const rewards = { coins: (baseCoin + huntRuntime.kills * 2) * vipMul, diamonds: baseDia * vipMul, fragments: baseFrag * vipMul, riftSigils: 0, energyRefund: 0, firstClearBonus: 0, vipMul };
    if (cleared) WG.State.grant('coins', rewards.coins); else WG.State.grant('coins', rewards.coins);
    if (rewards.diamonds) WG.State.grant('diamonds', rewards.diamonds);
    if (rewards.fragments) WG.State.get().forge.craftFragments += rewards.fragments;
    // W-Monetization-V2-Energy §C/G — win/loss refund + first-clear bonus.
    // wasFirstClear must be sampled BEFORE the bestWaves update below; the
    // existence check (not >0) makes the bonus fire exactly once per stage.
    const wasFirstClear = cleared && typeof WG.State.get().huntProgress.bestWaves[stageId] === 'undefined';
    if (WG.State.ENERGY_TUNABLES && WG.State.grantEnergy) {
      const refund = cleared ? WG.State.ENERGY_TUNABLES.WIN_REFUND : WG.State.ENERGY_TUNABLES.LOSS_REFUND;
      if (refund > 0) {
        rewards.energyRefund = WG.State.grantEnergy(refund, cleared ? 'win-refund' : 'loss-refund');
      }
      if (wasFirstClear) {
        const granted = WG.State.grantEnergy(WG.State.ENERGY_TUNABLES.FIRST_CLEAR_BONUS, 'first-clear');
        rewards.firstClearBonus = granted;
        WG.Engine.emit('hunt:first-clear', { stageId, bonus: granted });
      }
    }
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
      // W-Stage-Zero-Tutorial: mark stage 0 cleared + flag tabs reveal for exitHunt
      if (stageId === 0) {
        if (!s.tutorial) s.tutorial = {};
        s.tutorial.stage0Cleared = true;
        _stage0JustCleared = true;
      }
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
    if (tab === 'hunt') {
      // W-Character-Animate-MJ Concern D: preload active character's animated
      // WebP so it's cache-warm when renderHero() fires. Injected once per
      // unique character URL (querySelector guard prevents duplicate links).
      const _preActiveId = (WG.State.get().player && WG.State.get().player.activeCharacter) || 'lantern_acolyte';
      const _preUrl = 'images/portraits/anim/' + _preActiveId + '.webp';
      if (!document.querySelector('link[rel="preload"][href="' + _preUrl + '"]')) {
        const _pl = document.createElement('link');
        _pl.rel = 'preload'; _pl.as = 'image'; _pl.type = 'image/webp'; _pl.href = _preUrl;
        document.head.appendChild(_pl);
      }
      showHuntStageList();
    }
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
    ascended:      { sky: '#04010e', floor: '#0a0418', accent: '#c060ff', silhouette: '#000000' },
  };

  // ART SLOTS: Set BIOME_ART[id] / CHARACTER_PORTRAITS[id] to a URL when
  // illustrated assets ship. Cross-IP intrusions trigger violet drop-shadow +
  // glitch keyframe. Procedural canvas remains the fallback when the value is
  // null or the image errors at runtime. Direction (Architect 2026-05-02):
  // ukiyo-e meets dark illustration for menus; combat keeps current sprites.
  const BIOME_ART = {
    forest_summer: 'images/biomes/forest_summer.png',
    forest_autumn: 'images/biomes/forest_autumn.png',
    cold_stone:    'images/biomes/cold_stone.png',
    temple:        'images/biomes/temple.png',
    cave:          'images/biomes/cave.png',
    eldritch:      'images/biomes/eldritch.png',
    ascended:      'images/biomes/ascended.png',
  };
  const CHARACTER_PORTRAITS = {
    lantern_acolyte: 'images/portraits/lantern_acolyte.png',
    sigil_student:   'images/portraits/sigil_student.png',
    horned_oni:      'images/portraits/horned_oni.png',
    paper_priest:    'images/portraits/paper_priest.png',
    silent_seer:     'images/portraits/silent_seer.png',
    scythe_widow:    'images/portraits/scythe_widow.png',
    ash_brawler:     'images/portraits/ash_brawler.png',
    fox_kabuki:      'images/portraits/fox_kabuki.png',
    cap_apprentice:  'images/portraits/cap_apprentice.png',
  };
  // W-Character-Animate-MJ: animated WebP loops (12fps, 360×480, ~250KB each).
  // Populated when MJ Animate outputs exist; empty until then so fallback chain
  // (anim WebP → static PNG → procedural canvas) degrades gracefully.
  const CHARACTER_PORTRAITS_ANIM = {
    lantern_acolyte: 'images/portraits/anim/lantern_acolyte.webp',
    sigil_student:   'images/portraits/anim/sigil_student.webp',
    horned_oni:      'images/portraits/anim/horned_oni.webp',
    paper_priest:    'images/portraits/anim/paper_priest.webp',
    silent_seer:     'images/portraits/anim/silent_seer.webp',
    scythe_widow:    'images/portraits/anim/scythe_widow.webp',
    ash_brawler:     'images/portraits/anim/ash_brawler.webp',
    fox_kabuki:      'images/portraits/anim/fox_kabuki.webp',
    cap_apprentice:  'images/portraits/anim/cap_apprentice.webp',
  };
  // W-Boss-Portraits — 1024×1024 ukiyo-e portraits shown during boss-intro reveal.
  // Same style register as BIOME_ART + CHARACTER_PORTRAITS. Null id falls through
  // to no overlay so future bosses can ship gameplay-first then art.
  const BOSS_PORTRAITS = {
    pale_bride:     'images/bosses/pale_bride.png',
    frozen_crone:   'images/bosses/frozen_crone.png',
    autumn_lord:    'images/bosses/autumn_lord.png',
    temple_warden:  'images/bosses/temple_warden.png',
    cave_mother:         'images/bosses/cave_mother.png',
    wraith_father:       'images/bosses/wraith_father.png',
    echo_throne_keeper:  'images/bosses/echo_throne_keeper.png',
    wraith_father_echo:  'images/bosses/wraith_father_echo.png',
  };
  // RIFT biomes are future cross-IP intrusion stages — when stage.biome is in
  // this set the menu hero gains a violet drop-shadow + intermittent glitch
  // (per index.html `.wg-rift-intrude` rule). Empty until rift content ships.
  const RIFT_BIOMES = new Set();
  // W-Polish-Gaps-1-5 §D — character ids that should render with the rift
  // glitch even when only the procedural canvas is showing. Lets the rift
  // visual canon be testable now (e.g. ['lantern_acolyte']) without waiting
  // for illustrated portraits. Currently empty — first guest (Ysabel) is
  // queued behind KingshotPro launch.
  const RIFT_GUESTS = [];

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

  function paintBiome_ascended(ctx, w, h, t, isNight, pal) {
    // Deep void sky — darker than eldritch, no warm undertone
    const sg = ctx.createLinearGradient(0, 0, 0, h * 0.7);
    sg.addColorStop(0, '#02000a'); sg.addColorStop(0.55, '#06021a'); sg.addColorStop(1, '#04011a');
    ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h * 0.7);
    // Sigil fragments — slowly rotating angular shards (denser than eldritch)
    for (let i = 0; i < 9; i++) {
      const sx = _hash(i + 70) * w;
      const sy = _hash(i + 80) * h * 0.55;
      const pulse = 0.12 + Math.sin(t * 0.8 + i * 0.9) * 0.12;
      ctx.fillStyle = `rgba(192,96,255,${pulse})`;
      ctx.save(); ctx.translate(sx, sy);
      ctx.rotate(t * 0.2 + i * 0.7);
      const sz = 3 + _hash(i + 90) * 4;
      ctx.fillRect(-sz, -1, sz * 2, 2); ctx.fillRect(-1, -sz, 2, sz * 2);
      ctx.restore();
    }
    // Faint ascending glyph pillars on the horizon
    ctx.fillStyle = '#060118';
    for (let i = 0; i < 5; i++) {
      const px = (i + 0.5) * (w / 5) + (_hash(i + 50) - 0.5) * 12;
      const ph = h * (0.18 + _hash(i + 55) * 0.12);
      const py = h * 0.7;
      const pw = 6 + _hash(i + 60) * 8;
      ctx.fillRect(px - pw / 2, py - ph, pw, ph);
      // crossbar
      ctx.fillRect(px - pw, py - ph * 0.55, pw * 2, 3);
    }
    // Floor — void stone, deep indigo
    const fg = ctx.createLinearGradient(0, h * 0.7, 0, h);
    fg.addColorStop(0, '#0c0428'); fg.addColorStop(1, '#02000a');
    ctx.fillStyle = fg; ctx.fillRect(0, h * 0.7, w, h * 0.3);
    // Pulsing sigil ring on floor — denser and brighter than eldritch
    for (let i = 0; i < 6; i++) {
      const gx = w * (0.12 + i * 0.16);
      const gy = h * (0.82 + (i % 3) * 0.04);
      const pulse = 0.5 + Math.sin(t * 3.0 + i * 1.1) * 0.5;
      const r = 14 + Math.sin(t * 3.0 + i * 1.1) * 3;
      ctx.strokeStyle = `rgba(192,96,255,${pulse * 0.9})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(gx, gy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = `rgba(192,96,255,${pulse * 0.5})`;
      ctx.save(); ctx.translate(gx, gy); ctx.rotate(t * 0.5 + i);
      ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0);
      ctx.moveTo(0, -r); ctx.lineTo(0, r);
      ctx.moveTo(-r * 0.7, -r * 0.7); ctx.lineTo(r * 0.7, r * 0.7);
      ctx.moveTo(r * 0.7, -r * 0.7); ctx.lineTo(-r * 0.7, r * 0.7);
      ctx.stroke(); ctx.restore();
    }
  }

  const BIOME_PAINTERS = {
    forest_summer: paintBiome_forest_summer,
    forest_autumn: paintBiome_forest_autumn,
    cold_stone:    paintBiome_cold_stone,
    temple:        paintBiome_temple,
    cave:          paintBiome_cave,
    eldritch:      paintBiome_eldritch,
    ascended:      paintBiome_ascended,
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

    // Architect 2026-05-06 hotfix: Stage 0 is the tutorial pre-stage — auto-launched
    // on first boot only. It's never shown in the carousel. Otherwise it appeared as
    // a locked tile (no stage -1 exists for the unlock check) and players with existing
    // saves (firstLaunch=false) couldn't get past it.
    const stages = WG.HuntStage.list().filter(s => s.id !== 0);

    // Clamp selection to a valid stage on (re)open.
    if (selectedStageIdx < 0 || selectedStageIdx >= stages.length) selectedStageIdx = 0;

    // W-Event-System-Scaffold — banner slot: shown when a limited-time event is active
    const evtBannerSlot = document.createElement('div');
    evtBannerSlot.style.cssText = 'flex:0 0 auto;margin-bottom:8px;';
    select.appendChild(evtBannerSlot);
    if (WG.LtdEvents && WG.LtdEvents.renderBanner) WG.LtdEvents.renderBanner(evtBannerSlot);

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
    // W-Monetization-V2-Missions-Pass — TASKS opens live missions modal; PASS opens battle pass modal
    const _ti = WG.i18n ? WG.i18n.t.bind(WG.i18n) : function(k) { return k; };
    leftCol.appendChild(sideIcon({glyph:'📋',label:_ti('menu.tasks'),onClick:()=>{ if (WG.Missions && WG.Missions.openModal) WG.Missions.openModal(); else openInfoModal('Tasks','Loading...'); }}));
    // W-Monetization-V2-Whale-Ladder §D — OFFERS renamed SHOP; Offers is sub-section inside Shop modal.
    leftCol.appendChild(sideIcon({glyph:'🛒',label:_ti('menu.shop'),border:'#c080ff',onClick:()=>WG.Shop && WG.Shop.open()}));
    // W-Achievements-UI — long-term achievement track
    leftCol.appendChild(sideIcon({glyph:'🏆',label:_ti('menu.feats'),border:'#c8a030',onClick:()=>{ if (WG.Achievements && WG.Achievements.openModal) WG.Achievements.openModal(); else openInfoModal('Achievements','Loading...'); }}));
    hero.appendChild(leftCol);

    const rightCol = document.createElement('div');
    rightCol.style.cssText = 'position:absolute;right:8px;top:8px;display:flex;flex-direction:column;gap:8px;z-index:3;';
    rightCol.appendChild(sideIcon({glyph:'⚙',label:_ti('menu.settings'),onClick:()=>openSettingsModal()}));
    rightCol.appendChild(sideIcon({glyph:'🎟',label:_ti('menu.pass'),border:'#5030a0',onClick:()=>{ if (WG.BattlePass && WG.BattlePass.openModal) WG.BattlePass.openModal(); else openInfoModal('Battle Pass','Loading...'); }}));
    // W-Daily-Reward-Streak-UI — live 7-day streak grid modal + red dot badge
    const _drIcon = sideIcon({glyph:'🎁',label:_ti('menu.daily'),onClick:()=>{ if (WG.DailyRewards && WG.DailyRewards.openModal) WG.DailyRewards.openModal(); }});
    const _drDot = document.createElement('span');
    _drDot.style.cssText = 'position:absolute;top:-3px;right:-3px;width:9px;height:9px;background:#e02828;border-radius:50%;border:1.5px solid #200808;pointer-events:none;display:' + (WG.DailyRewards && WG.DailyRewards.hasUnclaimed() ? 'block' : 'none') + ';';
    _drIcon.appendChild(_drDot);
    if (WG.DailyRewards && WG.DailyRewards.setBadgeEl) WG.DailyRewards.setBadgeEl(_drDot);
    rightCol.appendChild(_drIcon);
    rightCol.appendChild(sideIcon({glyph:'📅',label:_ti('menu.7days'),badge:'!',onClick:()=>openInfoModal('7-Day Login','Day-of streak rewards — preview.')}));
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
      const _t = WG.i18n ? WG.i18n.t.bind(WG.i18n) : function(k) { return k; };
      modeBar.innerHTML = '';
      modeBar.appendChild(modePill(_t('menu.normal_mode'), 'day'));
      modeBar.appendChild(modePill(_t('menu.nightmare_mode'), 'night'));
    }
    rebuildPills();

    // ─── BATTLE button ──────────────────────────────────────────────────────
    const battleWrap = document.createElement('div');
    battleWrap.style.cssText = 'display:flex;justify-content:center;';
    select.appendChild(battleWrap);

    const battleBtn = document.createElement('button');
    battleBtn.style.cssText = 'min-width:200px;padding:14px 36px;border-radius:32px;border:2px solid #f8a030;background:linear-gradient(to bottom,#e85020,#a02810);color:#fff8e0;font-size:18px;letter-spacing:3px;font-weight:800;cursor:pointer;box-shadow:0 4px 12px rgba(232,80,32,0.45),0 0 0 1px rgba(255,200,120,0.35) inset;text-shadow:0 1px 2px rgba(0,0,0,0.6);transition:transform 80ms ease;';
    battleBtn.textContent = WG.i18n ? WG.i18n.t('menu.battle') : 'BATTLE';
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

    // ─── GAUNTLET button (Tower Gauntlet mode #2) ───────────────────────────
    const gauntletWrap = document.createElement('div');
    gauntletWrap.style.cssText = 'display:flex;justify-content:center;margin-top:10px;';
    select.appendChild(gauntletWrap);

    const gauntletBtn = document.createElement('button');
    gauntletBtn.id = 'wg-gauntlet-btn';
    gauntletBtn.style.cssText = 'min-width:200px;padding:11px 28px;border-radius:28px;border:2px solid #5030a0;background:linear-gradient(to bottom,#3a1a90,#1a0850);color:#c0a8f0;font-size:14px;letter-spacing:3px;font-weight:800;cursor:pointer;box-shadow:0 3px 10px rgba(80,48,160,0.4);transition:transform 80ms ease;';
    gauntletBtn.textContent = WG.i18n ? WG.i18n.t('menu.gauntlet') : '🏰 GAUNTLET';
    gauntletBtn.addEventListener('pointerdown', () => { gauntletBtn.style.transform = 'scale(0.96)'; });
    gauntletBtn.addEventListener('pointerup',   () => { gauntletBtn.style.transform = 'scale(1)'; });
    gauntletBtn.addEventListener('pointerleave',() => { gauntletBtn.style.transform = 'scale(1)'; });
    gauntletBtn.addEventListener('click', () => {
      if (select.parentNode) select.parentNode.removeChild(select);
      startTowerRun();
    });
    gauntletWrap.appendChild(gauntletBtn);

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
      // W-Polish-Gaps-1-5 §D — when activeId is a rift guest, center via
      // `left:calc(50% - 48px)` (not translateX) so the wgRiftGlitch keyframe
      // owns transform without overwriting the centering.
      const charIsRift = RIFT_GUESTS.indexOf(activeId) !== -1;
      const charCanvas = document.createElement('canvas');
      charCanvas.style.cssText = charIsRift
        ? 'position:absolute;left:calc(50% - 48px);bottom:18%;width:96px;height:140px;display:block;pointer-events:none;z-index:2;'
        : 'position:absolute;left:50%;bottom:18%;transform:translateX(-50%);width:96px;height:140px;display:block;pointer-events:none;z-index:2;';
      if (charIsRift) charCanvas.classList.add('wg-rift-intrude');
      heroContent.appendChild(charCanvas);
      const cctx = charCanvas.getContext('2d');

      // W-Character-Animate-MJ: portrait slot. Fallback chain:
      //   animated WebP (MJ Animate output) → static PNG → procedural canvas.
      // Animated WebP carries its own breathing; CSS breathe keyframe only
      // applies to the static PNG fallback to avoid double-animation.
      const _animUrl   = CHARACTER_PORTRAITS_ANIM[activeId];
      const _staticUrl = CHARACTER_PORTRAITS[activeId];
      const _firstSrc  = _animUrl || _staticUrl;
      if (_firstSrc) {
        const portrait = document.createElement('img');
        portrait.alt = '';
        portrait.decoding = 'async';
        portrait.loading = 'lazy';
        portrait.src = _firstSrc;
        // Base style: centered via calc-offset (not translateX) so rift glitch
        // keyframe (which owns `transform`) cannot overwrite the centering.
        const _baseStyle = 'position:absolute;left:calc(50% - 56px);bottom:14%;width:112px;height:160px;object-fit:cover;object-position:center 22%;display:block;z-index:2;pointer-events:none;border-radius:6px;transform-origin:center bottom;';
        // Only apply CSS breathe to static PNG; animated WebP IS the breathing.
        portrait.style.cssText = _baseStyle + (_animUrl ? '' : 'animation:wg-char-breathe 4.6s ease-in-out infinite;');
        if (isRift) portrait.classList.add('wg-rift-intrude');
        portrait.addEventListener('load', () => { charCanvas.style.display = 'none'; });
        portrait.addEventListener('error', () => {
          if (_animUrl && portrait.src.endsWith('.webp') && _staticUrl) {
            // Animated WebP unavailable — fall back to static PNG + CSS breathe.
            portrait.src = _staticUrl;
            portrait.style.cssText = _baseStyle + 'animation:wg-char-breathe 4.6s ease-in-out infinite;';
          } else if (portrait.parentNode) {
            portrait.parentNode.removeChild(portrait);
          }
        });
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
          <div style="font-size:11px;color:#a89878;margin-top:6px;line-height:1.4;">${stage.biome === 'ascended' ? 'Defeat the Wraith Father to ascend.' : 'Beat Stage ' + (stage.id - 1) + ' to unlock'}</div>
        `;
        heroContent.appendChild(lock);
        battleBtn.style.opacity = '0.45';
        battleBtn.style.cursor = 'not-allowed';
        battleBtn.textContent = WG.i18n ? WG.i18n.t('menu.locked') : '🔒  LOCKED';
        battleBtn.style.animation = '';
      } else {
        battleBtn.style.opacity = '1';
        battleBtn.style.cursor = 'pointer';
        battleBtn.textContent = WG.i18n ? WG.i18n.t('menu.battle') : 'BATTLE';
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

  // W-Settings-Modal-Wiring — full settings panel replacing the info-stub.
  function openSettingsModal() {
    const SKEY = 'wg_settings_v1';
    const DFLT = {master:0.8,sfx:1.0,ambient:0.6,ui:0.7,muted:false,haptics:true,language:'en',reminderTime:'20:00'};
    function loadS() {
      try { return Object.assign({},DFLT,JSON.parse(localStorage.getItem(SKEY)||'{}')); } catch(e) { return Object.assign({},DFLT); }
    }
    function saveS(c) { try { localStorage.setItem(SKEY,JSON.stringify(c)); } catch(e) {} }

    const audioS = WG.Audio ? WG.Audio.getSettings() : {master:0.8,sfx:1.0,ambient:0.6,ui:0.7,muted:false};
    const cfg = loadS();

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.78);z-index:200;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto;';

    const SL  = 'font-size:9px;color:#a8d878;letter-spacing:2px;font-weight:700;margin:14px 0 6px;border-bottom:1px solid #3a2818;padding-bottom:4px;';
    const ROW = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;';
    const LBL = 'font-size:11px;color:#a89878;font-weight:700;letter-spacing:0.5px;';
    const VAL = 'font-size:10px;color:#f0d890;font-weight:700;min-width:30px;text-align:right;';

    function slHtml(id, v) {
      return '<input id="'+id+'" type="range" min="0" max="100" value="'+Math.round(v*100)+'" style="flex:1;margin:0 8px;height:4px;accent-color:#a8d878;cursor:pointer;">';
    }
    function togHtml(id, on) {
      const left = on ? '22px' : '2px';
      const bg   = on ? '#2a4a1a' : '#1a1208';
      const kb   = on ? '#a8d878' : '#5a4028';
      return '<button id="'+id+'" data-on="'+(on?1:0)+'" style="width:44px;height:24px;border-radius:12px;border:1.5px solid #5a4028;background:'+bg+';position:relative;cursor:pointer;"><span id="'+id+'-knob" style="position:absolute;top:3px;left:'+left+';width:16px;height:16px;border-radius:50%;background:'+kb+';transition:left 150ms;display:block;"></span></button>';
    }
    function wireToggle(id, cb) {
      const btn = overlay.querySelector('#'+id);
      if (!btn) return;
      btn.addEventListener('click', () => {
        const was = btn.dataset.on === '1';
        const now = !was;
        btn.dataset.on = now ? '1' : '0';
        btn.style.background = now ? '#2a4a1a' : '#1a1208';
        const knob = overlay.querySelector('#'+id+'-knob');
        if (knob) { knob.style.background = now ? '#a8d878' : '#5a4028'; knob.style.left = now ? '22px' : '2px'; }
        cb(now);
      });
    }

    const html =
      '<div style="width:100%;max-width:340px;background:linear-gradient(to bottom,#1a1208,#0a0604);border:2px solid #5a4028;border-radius:14px;padding:18px 16px 20px;position:relative;margin:auto;">' +
      '<button id="cfg-close" style="position:absolute;top:10px;right:12px;background:none;border:none;color:#a89878;font-size:18px;cursor:pointer;line-height:1;">&#x2715;</button>' +
      '<div style="font-size:14px;color:#f0d890;font-weight:700;letter-spacing:2px;text-align:center;margin-bottom:4px;">SETTINGS</div>' +

      '<div style="'+SL+'">AUDIO</div>' +
      '<div style="'+ROW+'"><span style="'+LBL+'">MASTER</span>'+slHtml('cfg-sl-master',audioS.master)+'<span id="cfg-v-master" style="'+VAL+'">'+Math.round(audioS.master*100)+'</span></div>' +
      '<div style="'+ROW+'"><span style="'+LBL+'">SFX</span>'+slHtml('cfg-sl-sfx',audioS.sfx)+'<span id="cfg-v-sfx" style="'+VAL+'">'+Math.round(audioS.sfx*100)+'</span></div>' +
      '<div style="'+ROW+'"><span style="'+LBL+'">AMBIENT</span>'+slHtml('cfg-sl-ambient',audioS.ambient)+'<span id="cfg-v-ambient" style="'+VAL+'">'+Math.round(audioS.ambient*100)+'</span></div>' +
      '<div style="'+ROW+'"><span style="'+LBL+'">UI</span>'+slHtml('cfg-sl-ui',audioS.ui)+'<span id="cfg-v-ui" style="'+VAL+'">'+Math.round(audioS.ui*100)+'</span></div>' +
      '<div style="'+ROW+';margin-top:4px;"><span style="'+LBL+'">MUTE ALL</span>'+togHtml('cfg-mute',audioS.muted)+'</div>' +

      '<div style="'+SL+'">HAPTICS</div>' +
      '<div style="'+ROW+'"><span style="'+LBL+'">VIBRATION</span>'+togHtml('cfg-haptics',cfg.haptics)+'</div>' +

      '<div style="'+SL+'">LANGUAGE</div>' +
      '<div style="'+ROW+'">' +
        '<select id="cfg-lang" style="background:#1a1208;border:1.5px solid #5a4028;color:#f0d890;font-size:11px;padding:5px 8px;border-radius:7px;cursor:pointer;font-weight:700;">' +
          '<option value="en"'+(cfg.language==='en'?' selected':'')+'>English</option>' +
          '<option value="es" disabled>Spanish (coming soon)</option>' +
          '<option value="ja" disabled>Japanese (coming soon)</option>' +
        '</select>' +
        '<span style="font-size:9px;color:#5a4028;margin-left:8px;letter-spacing:0.5px;">MORE v0.25</span>' +
      '</div>' +

      '<div style="'+SL+'">DAILY REWARD REMINDER</div>' +
      '<div style="'+ROW+'"><span style="'+LBL+'">REMINDER TIME</span>' +
        '<input id="cfg-reminder" type="time" value="'+cfg.reminderTime+'" style="background:#1a1208;border:1.5px solid #5a4028;color:#f0d890;font-size:11px;padding:5px 8px;border-radius:7px;font-weight:700;">' +
      '</div>' +

      '<div style="'+SL+'">ABOUT</div>' +
      '<div style="font-size:11px;color:#a89878;line-height:1.7;padding:2px 0;">' +
        '<div>Wraithgrove v0.25 · Build 2026-05-05</div>' +
        '<div>Made by <span style="color:#d4a040;">The Hive Makes</span></div>' +
        '<div style="margin-top:6px;font-size:10px;color:#7a6858;line-height:1.5;">All purchases final. Refunds handled by App Store or Google Play per platform policy. We do not handle refunds directly.</div>' +
      '</div>' +

      '<div style="'+SL+'">LINKS</div>' +
      '<div style="display:flex;gap:8px;margin-bottom:4px;">' +
        '<a href="privacy.html" target="_blank" style="flex:1;text-align:center;padding:7px;border-radius:8px;border:1.5px solid #5a4028;background:#1a1208;color:#d4a040;font-size:10px;font-weight:700;letter-spacing:1px;text-decoration:none;">PRIVACY POLICY</a>' +
        '<a href="terms.html" target="_blank" style="flex:1;text-align:center;padding:7px;border-radius:8px;border:1.5px solid #5a4028;background:#1a1208;color:#d4a040;font-size:10px;font-weight:700;letter-spacing:1px;text-decoration:none;">TERMS OF SERVICE</a>' +
      '</div>' +

      '<div style="'+SL+'">TUTORIAL</div>' +
      '<button id="cfg-walkthrough" style="width:100%;padding:10px;border-radius:8px;border:1.5px solid #3a4060;background:#080a18;color:#a0b8f0;font-size:11px;font-weight:700;letter-spacing:1.5px;cursor:pointer;margin-bottom:6px;">REPLAY WALKTHROUGH</button>' +
      '<button id="cfg-reset-tutorial" style="width:100%;padding:10px;border-radius:8px;border:1.5px solid #3a4828;background:#0a1208;color:#a8d878;font-size:11px;font-weight:700;letter-spacing:1.5px;cursor:pointer;margin-bottom:4px;">RESET TUTORIAL</button>' +
      '<div id="cfg-reset-tutorial-msg" style="display:none;font-size:10px;text-align:center;padding:4px 0;color:#a8d878;letter-spacing:0.5px;">Tutorial reset. Play again to see all hints.</div>' +

      '<div style="'+SL+'">SAVE DATA</div>' +
      '<button id="cfg-delete-save" style="width:100%;padding:10px;border-radius:8px;border:1.5px solid #8a2020;background:#1a0808;color:#e06060;font-size:11px;font-weight:700;letter-spacing:1.5px;cursor:pointer;margin-bottom:4px;">DELETE SAVE</button>' +
      '<div id="cfg-delete-confirm" style="display:none;font-size:10px;color:#e06060;padding:6px 0;">' +
        '<div style="text-align:center;margin-bottom:6px;">All progress will be lost. Are you sure?</div>' +
        '<div style="display:flex;gap:8px;">' +
          '<button id="cfg-delete-yes" style="flex:1;padding:7px;border-radius:7px;border:1.5px solid #8a2020;background:#3a0808;color:#e06060;font-size:10px;font-weight:700;cursor:pointer;">YES, DELETE</button>' +
          '<button id="cfg-delete-no" style="flex:1;padding:7px;border-radius:7px;border:1.5px solid #5a4028;background:#1a1208;color:#a89878;font-size:10px;font-weight:700;cursor:pointer;">CANCEL</button>' +
        '</div>' +
      '</div>' +

      '<div style="'+SL+'">PURCHASES</div>' +
      '<button id="cfg-restore" style="width:100%;padding:10px;border-radius:8px;border:1.5px solid #3a6028;background:#0a1a08;color:#a8d878;font-size:11px;font-weight:700;letter-spacing:1.5px;cursor:pointer;margin-bottom:4px;">RESTORE PURCHASES</button>' +
      '<div id="cfg-restore-msg" style="display:none;font-size:10px;text-align:center;padding:4px 0;letter-spacing:0.5px;"></div>' +

      '<div style="'+SL+'">ACCOUNT</div>' +
      '<button disabled style="width:100%;padding:10px;border-radius:8px;border:1.5px solid #3a2818;background:#1a1208;color:#5a4028;font-size:11px;font-weight:700;letter-spacing:1.5px;cursor:not-allowed;opacity:0.5;">LOG OUT</button>' +
      '<div style="font-size:9px;color:#5a4028;text-align:center;margin-top:4px;letter-spacing:0.5px;">Account system — Phase 4</div>' +

      '<div style="'+SL+'">ABILITY LOADOUT</div>' +
      '<div id="cfg-ability-loadout" style="display:flex;flex-direction:column;gap:6px;margin-bottom:4px;"></div>' +

      '</div>';

    overlay.innerHTML = html;
    document.body.appendChild(overlay);
    overlay.querySelector('#cfg-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    // W-Special-Abilities: populate ability loadout section
    (function() {
      const loadoutEl = overlay.querySelector('#cfg-ability-loadout');
      if (!loadoutEl || !window.WG || !WG.SpecialAbilities) return;
      const SA = WG.SpecialAbilities;
      for (let si = 0; si < 3; si++) {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:10px;background:#0a0604;border:1.5px solid #3a2818;border-radius:8px;padding:8px 10px;';
        const slotState = SA.getState()[si];
        const label = document.createElement('div');
        label.style.cssText = 'font-size:10px;color:#7a6848;letter-spacing:1px;min-width:40px;';
        label.textContent = 'SLOT ' + (si + 1);
        const icon = document.createElement('div');
        icon.style.cssText = 'font-size:20px;';
        icon.textContent = slotState.locked ? '—' : slotState.icon;
        const info = document.createElement('div');
        info.style.cssText = 'flex:1;font-size:11px;color:#c8b898;';
        info.textContent = slotState.locked ? '(empty)' : (slotState.name + ' · ' + (slotState.charges || 0) + ' charges');
        const btn = document.createElement('button');
        btn.style.cssText = 'padding:6px 12px;border-radius:7px;border:1.5px solid #5a4028;background:#1a1208;color:#f0d890;font-size:10px;font-weight:700;letter-spacing:1.5px;cursor:pointer;';
        btn.textContent = 'CHANGE';
        btn.addEventListener('click', function() {
          overlay.remove();
          SA.showLoadoutModal(si);
        });
        row.appendChild(label);
        row.appendChild(icon);
        row.appendChild(info);
        row.appendChild(btn);
        loadoutEl.appendChild(row);
      }
    })();

    // Audio sliders — update in real-time, persist to both wg_audio_v1 (via setBus) and wg_settings_v1.
    ['master','sfx','ambient','ui'].forEach(bus => {
      const sl = overlay.querySelector('#cfg-sl-'+bus);
      const vl = overlay.querySelector('#cfg-v-'+bus);
      if (!sl || !vl) return;
      sl.addEventListener('input', () => {
        const v = sl.value / 100;
        vl.textContent = sl.value;
        if (WG.Audio) WG.Audio.setBus(bus, v);
        cfg[bus] = v;
        saveS(cfg);
      });
    });

    wireToggle('cfg-mute', (on) => {
      if (WG.Audio) WG.Audio.setMuted(on);
      cfg.muted = on;
      saveS(cfg);
    });

    wireToggle('cfg-haptics', (on) => {
      cfg.haptics = on;
      saveS(cfg);
      if (on && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics) {
        try { window.Capacitor.Plugins.Haptics.impact({style:'light'}); } catch(e) {}
      }
    });

    const langEl = overlay.querySelector('#cfg-lang');
    if (langEl) langEl.addEventListener('change', (e) => {
      cfg.language = e.target.value;
      saveS(cfg);
      if (WG.i18n) WG.i18n.setLocale(e.target.value);
    });

    const remEl = overlay.querySelector('#cfg-reminder');
    if (remEl) remEl.addEventListener('change', (e) => { cfg.reminderTime = e.target.value; saveS(cfg); });

    const walkthroughBtn = overlay.querySelector('#cfg-walkthrough');
    if (walkthroughBtn && WG.Walkthrough) {
      walkthroughBtn.addEventListener('click', () => { overlay.remove(); WG.Walkthrough.show(); });
    }

    const resetTutBtn = overlay.querySelector('#cfg-reset-tutorial');
    const resetTutMsg = overlay.querySelector('#cfg-reset-tutorial-msg');
    if (resetTutBtn) {
      resetTutBtn.addEventListener('click', () => {
        if (WG.HuntTutorialExt && WG.HuntTutorialExt.resetAll) WG.HuntTutorialExt.resetAll();
        if (resetTutMsg) resetTutMsg.style.display = 'block';
        resetTutBtn.textContent = 'RESET DONE';
        resetTutBtn.disabled = true;
      });
    }

    const delBtn  = overlay.querySelector('#cfg-delete-save');
    const delConf = overlay.querySelector('#cfg-delete-confirm');
    const delNo   = overlay.querySelector('#cfg-delete-no');
    const delYes  = overlay.querySelector('#cfg-delete-yes');
    if (delBtn) delBtn.addEventListener('click', () => { delConf.style.display='block'; delBtn.style.display='none'; });
    if (delNo)  delNo.addEventListener('click',  () => { delConf.style.display='none';  delBtn.style.display='block'; });
    if (delYes) delYes.addEventListener('click', () => {
      const _cleanup = () => {
        try { ['wg_save_v2','wg_audio_v1','wg_compliance_v1',SKEY].forEach(k => localStorage.removeItem(k)); } catch(e) {}
        overlay.remove();
        window.location.reload();
      };
      // Phase 4 save sync: signal server to delete save before local clear.
      // 1.5s grace; proceeds regardless of server response.
      if (window.WG && WG.MetaSaveSync) {
        Promise.race([
          WG.MetaSaveSync.delete(),
          new Promise(function(r){ setTimeout(r, 1500); }),
        ]).then(_cleanup).catch(_cleanup);
      } else {
        _cleanup();
      }
    });

    // W-Ad-Removal-Cross-Device — Concern C: Restore Purchases button.
    const restoreBtn = overlay.querySelector('#cfg-restore');
    const restoreMsg = overlay.querySelector('#cfg-restore-msg');
    if (restoreBtn && restoreMsg && window.WG && WG.IAP && WG.IAP.restorePurchases) {
      restoreBtn.addEventListener('click', () => {
        restoreBtn.disabled = true;
        restoreBtn.textContent = 'CHECKING…';
        WG.IAP.restorePurchases().then(result => {
          restoreBtn.disabled = false;
          restoreBtn.textContent = 'RESTORE PURCHASES';
          if (result.restored) {
            restoreMsg.style.color = '#a8d878';
            restoreMsg.textContent = 'Purchases restored — ads removed.';
          } else {
            restoreMsg.style.color = '#a89878';
            restoreMsg.textContent = 'Nothing to restore.';
          }
          restoreMsg.style.display = 'block';
        }).catch(() => {
          restoreBtn.disabled = false;
          restoreBtn.textContent = 'RESTORE PURCHASES';
          restoreMsg.style.color = '#e06060';
          restoreMsg.textContent = 'Restore failed — try again.';
          restoreMsg.style.display = 'block';
        });
      });
    }
  }

  function syncTopStrip() {
    const c = WG.State.get().currencies;
    document.querySelectorAll('[data-bind="coins"]').forEach(el => el.textContent = String(c.coins));
    document.querySelectorAll('[data-bind="diamonds"]').forEach(el => el.textContent = String(c.diamonds));
    document.querySelectorAll('[data-bind="cards"]').forEach(el => el.textContent = String(c.cards));
    // W-Monetization-V2-Whale-Ladder §D — sync gems chip
    document.querySelectorAll('[data-bind="gems"]').forEach(el => el.textContent = String(c.gems || 0));
    document.querySelectorAll('[data-bind="power"]').forEach(el => el.textContent = String(WG.State.recomputePower()));
    // W-Monetization-V2-Energy §B — energy + countdown
    if (WG.State.getEnergy) {
      const e = WG.State.getEnergy();
      document.querySelectorAll('[data-bind="energy-current"]').forEach(el => el.textContent = String(e.current));
      document.querySelectorAll('[data-bind="energy-max"]').forEach(el => el.textContent = String(e.max));
      const chip = document.getElementById('energy-chip');
      if (chip) chip.classList.toggle('full', e.current >= e.max);
      const cdEl = document.querySelector('[data-bind="energy-cd"]');
      if (cdEl) {
        if (e.current >= e.max) {
          cdEl.textContent = 'FULL';
        } else {
          const ms = WG.State.nextRegenMs(Date.now());
          const totalSec = Math.max(0, Math.ceil(ms / 1000));
          const m = Math.floor(totalSec / 60);
          const s = totalSec % 60;
          cdEl.textContent = '+1 in ' + (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
        }
      }
    }
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
    // W-Monetization-V2-Energy §B — tap energy chip → open Energy Modal
    const energyChip = document.getElementById('energy-chip');
    if (energyChip) energyChip.addEventListener('click', () => {
      if (WG.EnergyModal && WG.EnergyModal.open) WG.EnergyModal.open();
    });
    // W-Monetization-V2-Whale-Ladder §D — tap gems chip → open Shop at Gem Packs
    const gemsChip = document.getElementById('gems-chip');
    if (gemsChip) gemsChip.addEventListener('click', () => {
      if (WG.Shop && WG.Shop.open) WG.Shop.open({ section: 'gems' });
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
    if (WG.EnergyModal && WG.EnergyModal.init) WG.EnergyModal.init();
    if (WG.Gacha && WG.Gacha.init) WG.Gacha.init();
    if (WG.Compliance && WG.Compliance.init) WG.Compliance.init(); // must follow Gacha — wraps pull()
    if (WG.Shop && WG.Shop.init) WG.Shop.init();
    if (WG.Buffs && WG.Buffs.init) WG.Buffs.init();
    if (WG.SpecialAbilities && WG.SpecialAbilities.init) WG.SpecialAbilities.init();
    if (WG.Audio && WG.Audio.init) WG.Audio.init();
    // W-Settings-Modal-Wiring §C — apply wg_settings_v1 on cold-load.
    // wg_audio_v1 is already restored by WG.Audio.init(); this re-applies if settings ever diverge
    // (e.g. settings modal last run, then audio module resets). Belt-and-suspenders.
    try {
      const _raw = localStorage.getItem('wg_settings_v1');
      if (_raw && WG.Audio) {
        const _cfg = JSON.parse(_raw);
        ['master','sfx','ambient','ui'].forEach(b => { if (typeof _cfg[b] === 'number') WG.Audio.setBus(b, _cfg[b]); });
        if (typeof _cfg.muted === 'boolean') WG.Audio.setMuted(_cfg.muted);
      }
    } catch (e) {}
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
    if (WG.HuntTutorialExt && WG.HuntTutorialExt.init) WG.HuntTutorialExt.init();
    if (WG.Walkthrough && WG.Walkthrough.init) WG.Walkthrough.init();
    if (WG.Onboarding && WG.Onboarding.init) WG.Onboarding.init();
    if (WG.HuntTowerBuffs && WG.HuntTowerBuffs.init) WG.HuntTowerBuffs.init();
    if (WG.HuntTower && WG.HuntTower.init) WG.HuntTower.init();
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
    // W-Monetization-V2-Missions-Pass — after cache load so saved progress is restored
    if (WG.Missions && WG.Missions.init) WG.Missions.init();
    if (WG.BattlePass && WG.BattlePass.init) WG.BattlePass.init();
    // W-Achievements-UI — after cache load so saved achievement state is restored
    if (WG.Achievements && WG.Achievements.init) WG.Achievements.init();
    // W-Daily-Reward-Streak-UI — subscribe handlers before firing daily:reset
    // MetaDailyReset.init() subscribes Royal Pass daily-bonus (pre-existing missing call fixed here)
    if (WG.MetaDailyReset && WG.MetaDailyReset.init) WG.MetaDailyReset.init();
    if (WG.DailyRewards && WG.DailyRewards.init) WG.DailyRewards.init();
    // W-Event-System-Scaffold — apply event buffs + register active missions
    if (WG.LtdEvents && WG.LtdEvents.init) WG.LtdEvents.init();
    // Fire daily:reset now — state is loaded + all listeners registered
    if (WG.MetaDailyReset) WG.MetaDailyReset.checkAndReset();

    setupNav();
    syncTopStrip();
    // W-Stage-Zero-Tutorial: auto-launch Stage 0 on first-ever boot before showing lobby
    const _st0 = WG.State.get();
    const _tut0 = _st0.tutorial || {};
    if (_st0.firstLaunch === true && !_tut0.stage0Cleared) {
      startHunt(0, 'day');
    } else {
      showHuntStageList();
      if (WG.Onboarding) WG.Onboarding.maybeShow();
    }
    initBossIntro();
  }

  // W-Boss-Portraits — boss-intro reveal: 1.5s overlay on boss:spawned event.
  // Dark gradient + portrait fade-in (300ms) + name display + slide-out (300ms).
  // World-sim paused during reveal via WG.Engine.hitPause. Falls through (no
  // overlay) when BOSS_PORTRAITS[bossType] is null/missing or image errors.
  let _bossIntroEl = null;
  let _bossIntroTimer = 0;
  function ensureBossIntroDom() {
    if (_bossIntroEl) return _bossIntroEl;
    if (!document.getElementById('wg-boss-intro-style')) {
      const css = document.createElement('style');
      css.id = 'wg-boss-intro-style';
      // W-FX-P2-Polish §C — extended boss intro: pre-darken → reveal → hold → exit.
      // pre-darken: background opacity:1 but card hidden (opacity:0).
      // show: card fades + slides in (300ms). Both classes removed together on exit.
      css.textContent = `
        .wg-boss-intro{position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;
          background:radial-gradient(ellipse at center,rgba(20,8,12,0.78) 0%,rgba(4,2,6,0.96) 70%);
          opacity:0;pointer-events:none;transition:opacity 300ms ease-out;}
        .wg-boss-intro.pre-darken{opacity:1;}
        .wg-boss-intro.show{opacity:1;}
        .wg-boss-intro .wg-bi-card{display:flex;flex-direction:column;align-items:center;gap:12px;
          opacity:0;transform:translateY(24px) scale(0.96);
          transition:opacity 300ms ease-out,transform 300ms cubic-bezier(.2,.8,.2,1);}
        .wg-boss-intro.pre-darken .wg-bi-card{opacity:0;}
        .wg-boss-intro.show .wg-bi-card{opacity:1;transform:translateY(0) scale(1);}
        .wg-boss-intro .wg-bi-img{width:min(72vw,420px);height:min(72vw,420px);object-fit:cover;
          border:1px solid rgba(220,180,120,0.35);box-shadow:0 0 32px rgba(120,40,60,0.45),0 0 96px rgba(40,8,16,0.6);
          background:#0a0608;}
        .wg-boss-intro .wg-bi-name{font-family:Georgia,serif;font-size:28px;letter-spacing:0.08em;
          color:#f0d8a8;text-shadow:0 2px 12px rgba(0,0,0,0.9),0 0 4px rgba(180,80,60,0.35);
          text-transform:uppercase;}
        @keyframes wg-bi-pulse{
          0%,100%{text-shadow:0 2px 12px rgba(0,0,0,0.9),0 0 4px rgba(180,80,60,0.35);opacity:1;}
          50%{text-shadow:0 2px 20px rgba(0,0,0,0.9),0 0 18px rgba(220,100,60,0.75);opacity:0.82;}}
        .wg-boss-intro .wg-bi-name.pulsing{animation:wg-bi-pulse 0.6s ease-in-out infinite;}
      `;
      document.head.appendChild(css);
    }
    const el = document.createElement('div');
    el.className = 'wg-boss-intro';
    el.innerHTML = '<div class="wg-bi-card"><img class="wg-bi-img" alt=""><div class="wg-bi-name"></div></div>';
    document.body.appendChild(el);
    _bossIntroEl = el;
    return el;
  }
  // W-FX-P2-Polish §C — extended boss intro sequence (total 1600ms hitPause):
  //   t=0    pre-darken: background fades in (300ms CSS), card hidden.
  //   t=200  show: card fades in (300ms) + name slide-up + trauma(0.4) + boss:intro audio.
  //   t=500  hold: name pulsing begins (800ms).
  //   t=1300 exit: remove show + pre-darken simultaneously → both fade out (300ms).
  //   t=1600 hitPause expires; overlay fully gone.
  function showBossIntro(boss) {
    const url = BOSS_PORTRAITS[boss.type];
    if (!url) return;
    const el = ensureBossIntroDom();
    const img = el.querySelector('.wg-bi-img');
    const nameEl = el.querySelector('.wg-bi-name');
    img.src = url;
    img.onerror = () => { hideBossIntro(); };
    nameEl.textContent = (boss._typeData && boss._typeData.name) || boss.type || '';
    nameEl.classList.remove('pulsing');
    if (_bossIntroTimer) clearTimeout(_bossIntroTimer);
    if (WG.Engine && WG.Engine.hitPause) WG.Engine.hitPause(1600);
    if (WG.Engine) WG.Engine.emit('boss:intro', { boss });
    requestAnimationFrame(() => el.classList.add('pre-darken'));
    setTimeout(() => {
      el.classList.add('show');
      if (window.WG && WG.HuntRender && WG.HuntRender.addTrauma) WG.HuntRender.addTrauma(0.4);
    }, 200);
    setTimeout(() => nameEl.classList.add('pulsing'), 500);
    _bossIntroTimer = setTimeout(hideBossIntro, 1300);
  }
  function hideBossIntro() {
    if (!_bossIntroEl) return;
    const nameEl = _bossIntroEl.querySelector('.wg-bi-name');
    if (nameEl) nameEl.classList.remove('pulsing');
    _bossIntroEl.classList.remove('show');
    _bossIntroEl.classList.remove('pre-darken');
  }
  function initBossIntro() {
    if (!WG.Engine || !WG.Engine.on) return;
    WG.Engine.on('boss:spawned', ({ boss }) => { if (boss) showBossIntro(boss); });

    // memory_husk: splits into 2 lurkers on death (needs runtime for spawn).
    // Boss fragments: decrement _fragmentsAlive; when 0 the boss's immunity drops
    // and it is finished via a direct hp=0 + boss:defeated emit.
    WG.Engine.on('enemy:killed', ({ creature }) => {
      if (!huntRuntime) return;
      if (creature.type === 'memory_husk') {
        for (let i = 0; i < 2; i++) {
          const ang = Math.PI * 2 * (i / 2) + Math.random() * 0.5;
          const e = WG.HuntEnemies.spawn('lurker', creature.x + Math.cos(ang) * 24, creature.y + Math.sin(ang) * 24);
          if (e) huntRuntime.creatures.push(e);
        }
      }
      if (creature._isBossFragment && creature._bossRef) {
        const boss = creature._bossRef;
        boss._fragmentsAlive = Math.max(0, (boss._fragmentsAlive || 1) - 1);
        if (boss._fragmentsAlive === 0 && boss.hp > 0) {
          boss.hp = 0;
          WG.Engine.emit('boss:defeated', { boss });
          huntRuntime.bossDefeated = true;
        }
      }
    });
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

  window.WG.Game = { init, start, stop, switchTab, startHunt, startTowerRun, exitHunt, syncTopStrip, getHuntRuntime, flashScreen };
})();
