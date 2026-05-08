// WG.RaidPrepRender — raid prep screen
// Shows inside hunt-stage-select container when MODE = RAID
// Sections: target picker · character preview · Squad placeholder · projectile loadout · [START RAID]
(function(){'use strict';

  const SCOUT_COST = 5; // energy

  // ── SQUAD PICK STATE ────────────────────────────────────────────────────────
  // Persists across show() calls within the session. Resets each new show().
  let _squadPick = { archer: false, footman: false };

  function show(container, onBackToSolo) {
    _squadPick = { archer: false, footman: false }; // reset on each screen open
    container.innerHTML = '';

    const root = document.createElement('div');
    root.id = 'wg-raid-prep';
    root.style.cssText = 'display:flex;flex-direction:column;height:100%;overflow-y:auto;gap:10px;padding:4px 0 12px;';
    container.appendChild(root);

    _buildTargetPicker(root);
    _buildCharacterRow(root);
    _buildSquadPicker(root);
    _buildLoadoutPicker(root);
    _buildActionRow(root, onBackToSolo);
  }

  // ── TARGET PICKER ─────────────────────────────────────────────────────────
  let _selectedOpponentId = 'sim_001';

  function _buildTargetPicker(root) {
    const section = _section(root, '⚔ SELECT TARGET');

    const leaderboard = WG.RaidSim.SIM_LEADERBOARD;
    const myPower = WG.State.recomputePower ? WG.State.recomputePower() : 0;

    leaderboard.forEach(opp => {
      const isSelected = opp.id === _selectedOpponentId;
      const reward = WG.RaidSim.calcReward('win', opp.power, 8);
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:9px;border:1.5px solid ' + (isSelected ? '#c060ff' : '#2a1838') + ';background:' + (isSelected ? 'rgba(96,0,160,0.25)' : 'rgba(20,12,32,0.7)') + ';cursor:pointer;transition:border-color 120ms,background 120ms;margin-bottom:6px;';

      const portrait = document.createElement('div');
      portrait.style.cssText = 'width:40px;height:40px;border-radius:50%;background:#2a1840;border:1.5px solid #5a3870;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;';
      portrait.textContent = opp.portrait;

      const info = document.createElement('div');
      info.style.cssText = 'flex:1;';
      info.innerHTML = '<div style="font-size:12px;color:#e0d0f0;font-weight:700;letter-spacing:1px;">' + opp.name + '</div>' +
        '<div style="font-size:10px;color:#a090c0;margin-top:2px;">Power <span style="color:#ffd870;font-weight:700;">' + opp.power + '</span>' +
        (opp.power > myPower ? ' <span style="color:#e04040;font-size:9px;">▲ STRONGER</span>' : ' <span style="color:#60d060;font-size:9px;">▼ WEAKER</span>') + '</div>';

      const rewardEl = document.createElement('div');
      rewardEl.style.cssText = 'text-align:right;font-size:10px;color:#f0d890;';
      rewardEl.innerHTML = '<div>+' + reward.coins + '🪙</div>' + (reward.diamonds ? '<div>+' + reward.diamonds + '💎</div>' : '');

      row.appendChild(portrait);
      row.appendChild(info);
      row.appendChild(rewardEl);

      row.addEventListener('click', () => {
        _selectedOpponentId = opp.id;
        // Re-render target picker in place
        section.querySelectorAll('[data-opp]').forEach(el => {
          const sel = el.dataset.opp === opp.id;
          el.style.border = '1.5px solid ' + (sel ? '#c060ff' : '#2a1838');
          el.style.background = sel ? 'rgba(96,0,160,0.25)' : 'rgba(20,12,32,0.7)';
        });
      });
      row.dataset.opp = opp.id;
      section.appendChild(row);
    });

    // Scout button
    const scoutBtn = document.createElement('button');
    scoutBtn.style.cssText = 'width:100%;padding:9px;border-radius:8px;border:1.5px solid #5080c0;background:rgba(40,60,120,0.35);color:#80a0e0;font-size:10px;font-weight:700;letter-spacing:1.5px;cursor:pointer;margin-top:2px;';
    scoutBtn.textContent = '🔭 SCOUT BASE — ' + SCOUT_COST + ' ENERGY';
    scoutBtn.addEventListener('click', () => {
      const energy = WG.State.getEnergy ? WG.State.getEnergy().current : 0;
      if (energy < SCOUT_COST) {
        if (WG.EnergyModal && WG.EnergyModal.open) WG.EnergyModal.open({ reason: 'out-of-energy' });
        return;
      }
      if (WG.State.spendEnergy) WG.State.spendEnergy(SCOUT_COST);
      if (WG.RaidLayoutRender) WG.RaidLayoutRender.open({ readonly: true });
    });
    section.appendChild(scoutBtn);
  }

  // ── CHARACTER ROW ─────────────────────────────────────────────────────────
  function _buildCharacterRow(root) {
    const section = _section(root, '⚔ FIGHTER');
    const charId  = (WG.State.get().player && WG.State.get().player.activeCharacter) || 'lantern_acolyte';
    const card    = document.createElement('div');
    card.style.cssText = 'padding:10px;border-radius:9px;border:1.5px solid #5a4028;background:linear-gradient(135deg,#2a1808,#140a04);display:flex;align-items:center;gap:8px;';
    card.innerHTML = '<div style="font-size:28px;">⚔</div><div><div style="font-size:11px;color:#f0d890;font-weight:700;letter-spacing:1px;">' + _charDisplayName(charId) + '</div><div style="font-size:9px;color:#a89878;margin-top:2px;">Power ' + (WG.State.recomputePower ? WG.State.recomputePower() : 0) + '</div></div>';
    section.appendChild(card);
  }

  // ── SQUAD PICKER ──────────────────────────────────────────────────────────
  // 2 slot buttons (Archer, Footman). Tap → modal with stock + level info.
  // Consuming from stocks happens in _startRaid(); UI only tracks selection.
  let _squadPickerSectionRef = null;

  function _buildSquadPicker(root) {
    const section = _section(root, '🏹 SQUAD (optional — 1 each)');
    _squadPickerSectionRef = section;

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;';
    section.appendChild(grid);

    _renderSquadSlot(grid, 'archer');
    _renderSquadSlot(grid, 'footman');
  }

  function _renderSquadSlot(grid, unitType) {
    const s       = WG.State.get();
    const stock   = unitType === 'archer' ? s.forge.stocks.archer_squads : s.forge.stocks.footman_squads;
    const bldId   = unitType === 'archer' ? 'bow_range' : 'barracks';
    const bld     = s.forge.buildings.find(b => b.id === bldId);
    const level   = bld ? bld.level : 1;
    const sel     = _squadPick[unitType];
    const noStock = stock <= 0;

    const btn = document.createElement('div');
    btn.id    = 'squad-slot-' + unitType;
    btn.style.cssText = 'padding:10px 8px;border-radius:9px;border:1.5px solid ' +
      (sel ? '#88cc88' : noStock ? '#2a2030' : '#4a3868') + ';background:' +
      (sel ? 'rgba(40,100,40,0.35)' : noStock ? 'rgba(10,8,18,0.5)' : 'rgba(20,12,34,0.7)') +
      ';display:flex;flex-direction:column;align-items:center;gap:4px;cursor:' +
      (noStock ? 'default' : 'pointer') + ';transition:border-color 100ms,background 100ms;';

    const icon   = unitType === 'archer' ? '🏹' : '🛡';
    const label  = unitType === 'archer' ? 'Archer' : 'Footman';
    const sublbl = unitType === 'archer' ? 'Ranged DPS' : 'Melee Tank';

    btn.innerHTML =
      '<div style="font-size:20px;opacity:' + (noStock ? '0.25' : '1') + ';">' + icon + '</div>' +
      '<div style="font-size:10px;color:' + (sel ? '#b0f0b0' : noStock ? '#3a2850' : '#c0a0e0') + ';font-weight:700;letter-spacing:1px;">' + label + (sel ? ' ✓' : '') + '</div>' +
      '<div style="font-size:8px;color:' + (noStock ? '#3a2850' : '#806090') + ';margin-top:1px;">' + sublbl + '</div>' +
      '<div style="font-size:9px;color:' + (noStock ? '#5a3060' : '#a08080') + ';margin-top:2px;">' +
        (noStock ? 'No stock' : 'Stock: ' + stock) + ' · L' + level +
      '</div>';

    if (!noStock) {
      btn.addEventListener('click', () => _openSquadModal(unitType, stock, level, grid));
    }
    grid.appendChild(btn);
  }

  function _openSquadModal(unitType, stock, level, grid) {
    const fb       = window.WG && WG.ForgeBuildings;
    const icon     = unitType === 'archer' ? '🏹' : '🛡';
    const label    = unitType === 'archer' ? 'Archer Regiment' : 'Footman Regiment';
    const role     = unitType === 'archer' ? 'Ranged DPS — targets closest enemy. Fragile: takes 30% turret fire.' : 'Melee Tank — body-blocks traps (trigger ↓ 40%). Takes 20% turret fire.';
    const hp       = unitType === 'archer' ? (20 + level * 10) : (60 + level * 15);
    const dps      = unitType === 'archer' ? (5 + level * 1.5).toFixed(1) : (3 + level * 1.0).toFixed(1);
    const captains = fb ? (unitType === 'archer' ? fb.archerCaptainsAt(level) : fb.footmanCaptainsAt(level)) : 0;
    const capLabel = captains >= 1
      ? (unitType === 'archer' ? '⭐ Elite Captain: +25% DPS' : '⭐ Banner Captain: +20% HP & DPS')
      : 'No captain yet (L' + (unitType === 'archer' ? '15' : '10') + '+ unlocks)';

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(6,2,14,0.88);z-index:700;display:flex;align-items:center;justify-content:center;';

    const modal = document.createElement('div');
    modal.style.cssText = 'width:min(280px,86vw);background:linear-gradient(135deg,#160830,#0c0420);border:1.5px solid #7040b0;border-radius:14px;padding:20px 18px;';
    modal.innerHTML =
      '<div style="font-size:28px;text-align:center;margin-bottom:6px;">' + icon + '</div>' +
      '<div style="font-size:13px;color:#e0c8ff;font-weight:700;letter-spacing:2px;text-align:center;margin-bottom:4px;">' + label.toUpperCase() + '</div>' +
      '<div style="font-size:9px;color:#907098;text-align:center;margin-bottom:12px;">' + role + '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;">' +
        _statCell('HP', hp) + _statCell('DPS/s', dps) +
        _statCell('Stock', stock) + _statCell('Level', level) +
      '</div>' +
      '<div style="font-size:9px;color:' + (captains >= 1 ? '#f0d060' : '#605068') + ';text-align:center;margin-bottom:14px;">' + capLabel + '</div>';

    const sel = _squadPick[unitType];
    const confirmBtn = document.createElement('button');
    confirmBtn.style.cssText = 'width:100%;padding:10px;border-radius:9px;border:1.5px solid ' + (sel ? '#cc4444' : '#88cc88') + ';background:' + (sel ? 'rgba(80,20,20,0.6)' : 'rgba(20,80,20,0.6)') + ';color:' + (sel ? '#ff8080' : '#88ee88') + ';font-size:11px;font-weight:700;letter-spacing:2px;cursor:pointer;margin-bottom:6px;';
    confirmBtn.textContent = sel ? 'REMOVE FROM SQUAD' : 'ADD TO SQUAD';
    confirmBtn.addEventListener('click', () => {
      _squadPick[unitType] = !sel;
      overlay.remove();
      // Re-render both squad slots
      grid.innerHTML = '';
      _renderSquadSlot(grid, 'archer');
      _renderSquadSlot(grid, 'footman');
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.style.cssText = 'width:100%;padding:8px;border-radius:8px;border:1.5px solid #3a2850;background:rgba(20,12,30,0.6);color:#806090;font-size:10px;font-weight:700;letter-spacing:2px;cursor:pointer;';
    cancelBtn.textContent = 'CANCEL';
    cancelBtn.addEventListener('click', () => overlay.remove());

    modal.appendChild(confirmBtn);
    modal.appendChild(cancelBtn);
    overlay.appendChild(modal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  // ── PROJECTILE LOADOUT PICKER ─────────────────────────────────────────────
  function _buildLoadoutPicker(root) {
    const section = _section(root, '🎯 PROJECTILE LOADOUT (pick 3)');
    const s = WG.State.get();
    const cannB = s.forge.buildings.find(b => b.id === 'cannon_battery');
    const cannLevel = cannB ? cannB.level : 1;
    const available = WG.ForgeBuildings ? WG.ForgeBuildings.availableProjectilesAt(cannLevel) : ['stone_shot'];
    const loadout = s.forge.cannon_loadout || [null, null, null];

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px;';

    // Slot indicators
    for (let i = 0; i < 3; i++) {
      const slot = document.createElement('div');
      slot.id = 'loadout-slot-' + i;
      const pid = loadout[i];
      const def = pid && WG.ForgeBuildings ? WG.ForgeBuildings.PROJECTILE_TYPES[pid] : null;
      slot.style.cssText = 'padding:8px 4px;border-radius:8px;border:1.5px solid ' + (pid ? '#f0c060' : '#3a2818') + ';background:' + (pid ? 'rgba(60,40,8,0.5)' : 'rgba(20,12,6,0.5)') + ';text-align:center;cursor:pointer;min-height:52px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;';
      slot.innerHTML = pid
        ? '<div style="font-size:12px;color:#f0d890;font-weight:700;">' + (def ? def.name.split(' ')[0] : pid) + '</div><div style="font-size:9px;color:#c8a060;">🎯 ' + (def ? def.damage : '') + ' dmg</div>'
        : '<div style="font-size:20px;color:#5a4028;">+</div><div style="font-size:8px;color:#5a4028;letter-spacing:1px;">SLOT ' + (i+1) + '</div>';
      slot.dataset.slotIdx = i;
      slot.addEventListener('click', () => {
        const cur = s.forge.cannon_loadout[i];
        s.forge.cannon_loadout[i] = null; // clear slot
        _buildLoadoutPicker._refresh && _buildLoadoutPicker._refresh();
      });
      grid.appendChild(slot);
    }
    section.appendChild(grid);

    // Available projectiles
    const availWrap = document.createElement('div');
    availWrap.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';
    available.forEach(pid => {
      const def = WG.ForgeBuildings ? WG.ForgeBuildings.PROJECTILE_TYPES[pid] : null;
      const isLoaded = loadout.includes(pid);
      const card = document.createElement('button');
      card.style.cssText = 'padding:6px 10px;border-radius:7px;border:1.5px solid ' + (isLoaded ? '#f0c060' : '#5a4028') + ';background:' + (isLoaded ? 'rgba(60,40,8,0.6)' : 'rgba(20,12,6,0.6)') + ';color:' + (isLoaded ? '#f0d890' : '#a89878') + ';font-size:10px;font-weight:700;cursor:pointer;';
      card.textContent = (def ? def.name.split(' ')[0] : pid) + (isLoaded ? ' ✓' : '');
      card.addEventListener('click', () => {
        if (isLoaded) return;
        const emptySlot = s.forge.cannon_loadout.indexOf(null);
        if (emptySlot < 0) return; // all full
        s.forge.cannon_loadout[emptySlot] = pid;
        // Re-render section
        section.innerHTML = '';
        section.appendChild(document.createElement('div')); // placeholder
        _buildLoadoutPicker._refresh();
      });
      availWrap.appendChild(card);
    });
    section.appendChild(availWrap);
    // Refresh hook — caller replaces section content on change
    _buildLoadoutPicker._refresh = function() {
      section.parentNode && section.parentNode.removeChild(section);
      // Re-insert — find root by walking up
    };
  }
  // stub refresh (actual re-render handled by show() re-call)
  _buildLoadoutPicker._refresh = null;

  // ── ACTION ROW ────────────────────────────────────────────────────────────
  function _buildActionRow(root, onBackToSolo) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;flex-direction:column;gap:8px;padding:0 0 4px;';

    // Layout editor button
    const layoutBtn = document.createElement('button');
    layoutBtn.style.cssText = 'padding:11px;border-radius:10px;border:1.5px solid #8060a0;background:rgba(60,30,80,0.45);color:#c090e0;font-size:12px;font-weight:700;letter-spacing:2px;cursor:pointer;';
    layoutBtn.textContent = '🗺 EDIT MY BASE LAYOUT';
    layoutBtn.addEventListener('click', () => { if (WG.RaidLayoutRender) WG.RaidLayoutRender.open({}); });
    row.appendChild(layoutBtn);

    // Start raid button
    const startBtn = document.createElement('button');
    startBtn.style.cssText = 'padding:15px;border-radius:14px;border:2px solid #c060ff;background:linear-gradient(to bottom,#6020c0,#2a0860);color:#f0e0ff;font-size:16px;letter-spacing:3px;font-weight:800;cursor:pointer;box-shadow:0 4px 16px rgba(120,0,200,0.45),0 0 0 1px rgba(200,120,255,0.25) inset;text-shadow:0 1px 3px rgba(0,0,0,0.7);transition:transform 80ms ease;';
    startBtn.textContent = '⚔ START RAID';
    startBtn.addEventListener('pointerdown', () => { startBtn.style.transform = 'scale(0.96)'; });
    startBtn.addEventListener('pointerup',   () => { startBtn.style.transform = 'scale(1)'; });
    startBtn.addEventListener('pointerleave',() => { startBtn.style.transform = 'scale(1)'; });
    startBtn.addEventListener('click', () => _startRaid(root));
    row.appendChild(startBtn);

    root.appendChild(row);
  }

  // ── EXECUTE RAID ──────────────────────────────────────────────────────────
  function _startRaid(root) {
    // Consume squad stocks before sim (sim reads them to build units)
    const s = WG.State.get();
    if (_squadPick.archer  && s.forge.stocks.archer_squads  >= 1) s.forge.stocks.archer_squads  -= 1;
    if (_squadPick.footman && s.forge.stocks.footman_squads >= 1) s.forge.stocks.footman_squads -= 1;

    const run = WG.RaidSim.runVsSimOpponent(_selectedOpponentId, _squadPick);
    if (!run) return;

    // Apply rewards on win
    if (run.result.result === 'win') {
      WG.State.grant('coins', run.reward.coins);
      if (run.reward.diamonds) WG.State.grant('diamonds', run.reward.diamonds);
    }

    // Show result overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(6,2,14,0.92);z-index:600;display:flex;align-items:center;justify-content:center;';

    const win = run.result.result === 'win';
    const card = document.createElement('div');
    card.style.cssText = 'width:min(320px,88vw);background:linear-gradient(135deg,' + (win?'#1a0840,#0a0420':'#200808,#0c0404') + ');border:2px solid ' + (win?'#c060ff':'#c04040') + ';border-radius:16px;padding:24px 20px;text-align:center;';
    card.innerHTML =
      '<div style="font-size:36px;margin-bottom:8px;">' + (win ? '🏆' : '💀') + '</div>' +
      '<div style="font-size:20px;color:' + (win?'#e0b0ff':'#ff8080') + ';font-weight:800;letter-spacing:3px;margin-bottom:4px;">' + (win ? 'RAID SUCCESS' : 'RAID FAILED') + '</div>' +
      '<div style="font-size:12px;color:#a090c0;margin-bottom:16px;">vs ' + run.opponent.name + ' (Power ' + run.opponent.power + ')</div>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;">' +
        _statCell('Structures', run.result.structuresDestroyed + ' destroyed') +
        _statCell('Deaths', run.result.attackerDeaths) +
        _statCell('Damage', Math.round(run.result.damageDealt)) +
      '</div>' +
      (win ? '<div style="font-size:13px;color:#f0d890;margin-bottom:16px;">+' + run.reward.coins + ' 🪙' + (run.reward.diamonds ? '  +' + run.reward.diamonds + ' 💎' : '') + '</div>' : '') +
      '';

    // ── Squad status canvas (Concern C) ──────────────────────────────────────
    const squadResult = run.result.squadUnits || [];
    if (squadResult.length > 0) {
      const squadWrap = document.createElement('div');
      squadWrap.style.cssText = 'margin-bottom:12px;';
      const squadLbl = document.createElement('div');
      squadLbl.style.cssText = 'font-size:9px;color:#806090;letter-spacing:2px;margin-bottom:6px;';
      squadLbl.textContent = 'SQUAD';
      squadWrap.appendChild(squadLbl);

      const cvs = document.createElement('canvas');
      const CW = 240, CH = 72;
      cvs.width  = CW;  cvs.height  = CH;
      cvs.style.cssText = 'width:' + CW + 'px;height:' + CH + 'px;border-radius:6px;background:rgba(0,0,0,0.25);display:block;margin:0 auto;';
      squadWrap.appendChild(cvs);
      card.appendChild(squadWrap);

      const cvsCtx = cvs.getContext('2d');
      const spacing = CW / (squadResult.length + 1);

      // Inline mini-puff particles for dead units (separate from WG.HuntFX world-space system)
      const puffs = [];
      squadResult.forEach((u, i) => {
        const sx = spacing * (i + 1), sy = 34;
        if (!u.survived) {
          // Emit into WG.HuntFX pool (renders if a hunt canvas is active; no-op otherwise)
          if (window.WG && WG.HuntFX) WG.HuntFX.burst(0, 0, 'enemyHit', { count: 6, life: 0.3 });
          // Local puff on result canvas
          for (let p = 0; p < 8; p++) {
            const ang = Math.PI * 2 * p / 8;
            puffs.push({ x: sx, y: sy, vx: Math.cos(ang) * 36, vy: Math.sin(ang) * 36, life: 0.45, maxLife: 0.45 });
          }
        }
      });

      function drawSquadCanvas(dt) {
        cvsCtx.clearRect(0, 0, CW, CH);
        squadResult.forEach((u, i) => {
          const sx = spacing * (i + 1), sy = 34;
          WG.RaidSim.drawSquadUnit(cvsCtx, sx, sy, u.type, u.hp, u.maxHp);
          cvsCtx.font = '7px monospace';
          cvsCtx.textAlign = 'center';
          cvsCtx.fillStyle = u.survived ? '#88cc88' : '#cc6666';
          cvsCtx.fillText(u.survived ? 'ALIVE' : 'KIA', sx, sy + 24);
        });
        // Draw puffs
        for (const p of puffs) {
          if (p.life <= 0) continue;
          cvsCtx.save();
          cvsCtx.globalAlpha = p.life / p.maxLife * 0.8;
          cvsCtx.fillStyle = '#cc4444';
          cvsCtx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
          cvsCtx.restore();
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt;
        }
      }

      let _lastTs = 0, _rafId = 0;
      function _frame(ts) {
        const dt = _lastTs ? Math.min((ts - _lastTs) / 1000, 0.08) : 0;
        _lastTs = ts;
        drawSquadCanvas(dt);
        if (puffs.some(p => p.life > 0)) {
          _rafId = requestAnimationFrame(_frame);
        } else {
          drawSquadCanvas(0); // final static draw
        }
      }
      _rafId = requestAnimationFrame(_frame);
      // Cancel animation when overlay is removed
      overlay.addEventListener('click', () => { if (_rafId) cancelAnimationFrame(_rafId); }, { once: true });
    }

    // ── Trap events log (Concern C) ──────────────────────────────────────────
    // Shows telegraph+counter outcome for each trap event from the sim replayLog.
    // Real-time telegraph animation (500ms flash + 400ms COUNTER! prompt) is V2
    // frame-loop work; here we render the outcome as a post-raid beat log.
    const trapEvents = (run.result.replayLog || []).filter(
      e => e.eventType === 'trap:countered' || e.eventType === 'trap:hit'
    );
    if (trapEvents.length > 0) {
      const trapWrap = document.createElement('div');
      trapWrap.style.cssText = 'margin-bottom:12px;';
      const trapLbl = document.createElement('div');
      trapLbl.style.cssText = 'font-size:9px;color:#806090;letter-spacing:2px;margin-bottom:6px;';
      trapLbl.textContent = 'TRAP LOG';
      trapWrap.appendChild(trapLbl);

      trapEvents.forEach(function(ev) {
        const countered = ev.eventType === 'trap:countered';
        const trapDef   = WG.RaidDefenses ? WG.RaidDefenses.getTrap(ev.trapId) : null;
        const buffDef   = (countered && WG.RaidDefenses) ? WG.RaidDefenses.getCounterBuff(ev.counterRewardBuff) : null;

        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:7px;margin-bottom:4px;' +
          'background:' + (countered ? 'rgba(0,60,20,0.55)' : 'rgba(60,10,10,0.55)') + ';' +
          'border:1px solid ' + (countered ? '#2a7040' : '#7a2020') + ';';

        // Telegraph icon (mimics the 500ms tell flash in V2 frame loop)
        const tellIcon = document.createElement('div');
        tellIcon.style.cssText = 'font-size:14px;flex-shrink:0;';
        tellIcon.textContent = trapDef ? trapDef.icon : '⚠';
        row.appendChild(tellIcon);

        // Trap name + counter action
        const info = document.createElement('div');
        info.style.cssText = 'flex:1;min-width:0;';
        const trapName = trapDef ? trapDef.name : (ev.trapId || 'Trap');
        const actionLabel = ev.counterAction ? ev.counterAction.replace(/_/g, ' ').toUpperCase() : '';
        info.innerHTML =
          '<div style="font-size:9px;color:' + (countered ? '#80e8a0' : '#e88080') + ';font-weight:700;letter-spacing:0.5px;">' +
            (countered ? '⚡ COUNTERED' : '💥 HIT') + ' — ' + trapName +
          '</div>' +
          (actionLabel ? '<div style="font-size:8px;color:#806090;margin-top:1px;">' + actionLabel + '</div>' : '');
        row.appendChild(info);

        // Buff floater (shows what was earned on counter) or damage number on hit
        const outcome = document.createElement('div');
        outcome.style.cssText = 'text-align:right;flex-shrink:0;';
        if (countered && buffDef) {
          // Green "+BUFF" floater — emits into WG.HuntFX if hunt canvas is active
          if (window.WG && WG.HuntFX) WG.HuntFX.burst(0, 0, 'heal', { count: 4, life: 0.4 });
          outcome.innerHTML = '<div style="font-size:9px;color:#60e890;font-weight:700;">+' + buffDef.name.replace('Counter: ', '') + '</div>' +
            '<div style="font-size:8px;color:#40a060;">' + buffDef.desc + '</div>';
        } else if (!countered && ev.value > 0) {
          outcome.innerHTML = '<div style="font-size:11px;color:#ff7070;font-weight:700;">-' + ev.value + ' HP</div>';
        } else if (!countered) {
          // Non-damage trap (stun/root): show effect label
          const effectLabel = trapDef && trapDef.rootDurationMs ? 'ROOTED' : trapDef && trapDef.stunDurationMs ? 'STUNNED' : 'EFFECT';
          outcome.innerHTML = '<div style="font-size:9px;color:#c07070;font-weight:700;">' + effectLabel + '</div>';
        }
        row.appendChild(outcome);
        trapWrap.appendChild(row);
      });
      card.appendChild(trapWrap);
    }

    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'width:100%;padding:12px;border-radius:10px;border:1.5px solid #5a3870;background:rgba(40,20,60,0.7);color:#c090d0;font-size:12px;font-weight:700;letter-spacing:2px;cursor:pointer;';
    closeBtn.textContent = 'CONTINUE';
    closeBtn.addEventListener('click', () => { overlay.remove(); });
    card.appendChild(closeBtn);
    overlay.appendChild(card);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  function _statCell(label, value) {
    return '<div style="background:rgba(255,255,255,0.04);border-radius:7px;padding:8px 4px;"><div style="font-size:18px;color:#e0d0f0;font-weight:700;">' + value + '</div><div style="font-size:9px;color:#7a6888;letter-spacing:1px;margin-top:2px;">' + label.toUpperCase() + '</div></div>';
  }

  // ── UTILS ─────────────────────────────────────────────────────────────────
  function _section(parent, title) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'padding:0 2px;';
    const lbl = document.createElement('div');
    lbl.style.cssText = 'font-size:9px;color:#a090c0;letter-spacing:2px;font-weight:700;margin-bottom:7px;';
    lbl.textContent = title;
    wrap.appendChild(lbl);
    parent.appendChild(wrap);
    return wrap;
  }

  function _charDisplayName(id) {
    const names = {
      lantern_acolyte: 'Lantern Acolyte', sigil_student: 'Sigil Student',
      horned_oni: 'Horned Oni', paper_priest: 'Paper Priest',
      silent_seer: 'Silent Seer', scythe_widow: 'Scythe Widow',
      ash_brawler: 'Ash Brawler', fox_kabuki: 'Fox Kabuki',
      cap_apprentice: 'Cap Apprentice',
    };
    return names[id] || id;
  }

  window.WG = window.WG || {};
  window.WG.RaidPrepRender = { show };
})();
