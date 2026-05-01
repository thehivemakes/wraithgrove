// WG.Game — top-level orchestrator: init order, rAF loop, tab routing, hunt runtime
(function(){'use strict';

  let rafId = 0;
  let running = false;

  // Hunt runtime — populated when entering Hunt mode
  let huntRuntime = null;

  function buildHuntRuntime(stageId) {
    const stage = WG.HuntStage.get(stageId);
    if (!stage) return null;
    const mapW = 720;
    const mapH = 1100;
    const rt = {
      stage,
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
    };
    huntRuntime = rt;
    WG.HuntRender.setRuntime(rt);
    WG.HuntPlayer.place(mapW * 0.5, mapH * 0.5, rt);
    WG.HuntPickups.spawnForStage(rt, stage);
    return rt;
  }

  function startHunt(stageId) {
    buildHuntRuntime(stageId);
    WG.State.get().huntProgress.currentStage = stageId;
    // Remove the stage select overlay if present
    const sel = document.getElementById('hunt-stage-select');
    if (sel && sel.parentNode) sel.parentNode.removeChild(sel);
    switchTab('hunt');
    WG.Engine.emit('hunt:stage-start', { stageId });
    WG.HuntTutorial.maybeStart(stageId);
  }

  function getHuntRuntime() { return huntRuntime; }

  function exitHunt() {
    huntRuntime = null;
    WG.HuntRender.setRuntime(null);
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
      WG.Engine.emit('hunt:stage-cleared', { stageId, mins, kills: huntRuntime.kills });
    } else {
      WG.Engine.emit('hunt:stage-failed', { stageId, mins, kills: huntRuntime.kills });
    }
    WG.HuntResults.show({ stageId, cleared, mins, kills: huntRuntime.kills, rewards });
    // Restart loop to keep top-strip / autosave running
    running = true;
    huntRuntime.player = null;
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

  function showHuntStageList() {
    // If a stage is currently running, do nothing.
    if (huntRuntime && huntRuntime.player && huntRuntime.player.hp > 0) return;
    const root = document.getElementById('tab-hunt');
    // Always recreate the panel to ensure correct DOM position after nav transitions.
    const existing = document.getElementById('hunt-stage-select');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    const select = document.createElement('div');
    select.id = 'hunt-stage-select';
    select.style.cssText = 'position:absolute;inset:36px 0 0 0;overflow-y:auto;padding:12px;background:#0c0a08;z-index:10;';
    root.appendChild(select);
    const h2 = document.createElement('h2');
    h2.textContent = 'Hunt — Stage Select';
    h2.style.cssText = 'font-size:14px;color:#f0d890;letter-spacing:2px;text-transform:uppercase;text-align:center;margin:8px 0 12px 0;';
    select.appendChild(h2);
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(2,1fr);gap:8px;';
    const highest = WG.State.get().huntProgress.highestUnlocked;
    for (const stage of WG.HuntStage.list()) {
      const locked = stage.id > highest;
      const tile = document.createElement('div');
      const biome = WG.HuntStage.getBiome(stage.biome);
      tile.style.cssText = `background:${biome.ground};border:1px solid #604020;border-radius:6px;padding:10px;cursor:${locked?'default':'pointer'};opacity:${locked?0.5:1};text-align:center;`;
      tile.innerHTML = `<div style="font-size:9px;color:#a89878;letter-spacing:1px;">STAGE ${stage.id}</div>
        <div style="font-size:13px;color:#f0d890;margin:4px 0;">${stage.name}</div>
        <div style="font-size:10px;color:#c8a868;">${stage.bossId ? '⚔ Boss' : '· wave ·'} · ${(stage.durationSec/60).toFixed(1)}m</div>`;
      if (!locked) {
        tile.addEventListener('click', () => {
          if (select.parentNode) select.parentNode.removeChild(select);
          startHunt(stage.id);
        });
      } else {
        tile.innerHTML += '<div style="font-size:18px;margin-top:6px;">🔒</div>';
      }
      grid.appendChild(tile);
    }
    select.appendChild(grid);
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

  window.WG.Game = { init, start, stop, switchTab, startHunt, exitHunt, syncTopStrip, getHuntRuntime };
})();
