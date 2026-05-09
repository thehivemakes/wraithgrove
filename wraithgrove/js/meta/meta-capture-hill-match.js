// WG.CaptureHillMatch — async match flow for capture-the-hill Mode 2.
// Manages seed pool, prep screen, result ranking, and reward grant.
// Opponent hold-times are pre-seeded; no server needed (Phase 4 can swap in real data).
(function(){'use strict';

  // ─── Seed pool — 12 opponent ghost runs (hold-time in seconds) ────────────
  const OPPONENT_POOL = Object.freeze([
    { id:'op_1',  name:'Kira Voss',   holdTime: 42 },
    { id:'op_2',  name:'Dusk Marrow', holdTime: 51 },
    { id:'op_3',  name:'Ash Fell',    holdTime: 38 },
    { id:'op_4',  name:'Linh Shade',  holdTime: 55 },
    { id:'op_5',  name:'Torq Brenn',  holdTime: 33 },
    { id:'op_6',  name:'Ysel Mire',   holdTime: 46 },
    { id:'op_7',  name:'Cass Wren',   holdTime: 31 },
    { id:'op_8',  name:'Vale Dross',  holdTime: 48 },
    { id:'op_9',  name:'Holt Finn',   holdTime: 39 },
    { id:'op_10', name:'Sable Cross', holdTime: 53 },
    { id:'op_11', name:'Pex Cairn',   holdTime: 36 },
    { id:'op_12', name:'Nyrr Asch',   holdTime: 44 },
  ]);

  // ─── Reward tiers: gold/silver/bronze/consolation ─────────────────────────
  const REWARD_TIERS = Object.freeze([
    { label:'🥇 GOLD',   rank:1, coins:100, gems:5 },
    { label:'🥈 SILVER', rank:2, coins: 60, gems:3 },
    { label:'🥉 BRONZE', rank:3, coins: 30, gems:1 },
    { label:'4th Place', rank:4, coins: 10, gems:0 },
  ]);

  const MATCH_SIZE = 4;  // 1 player + 3 opponents

  let _currentMatch = null;  // { opponents: [...] }

  // ─── showMatchQueue ───────────────────────────────────────────────────────
  // Renders the prep screen into `container`.
  // `backFn` returns to the solo/raid lobby view.
  function showMatchQueue(container, backFn) {
    const opponents = _pickOpponents(MATCH_SIZE - 1);
    _currentMatch = { opponents };

    container.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;height:100%;padding:0;';
    container.appendChild(wrap);

    // ── Header ────────────────────────────────────────────────────────────
    const hdr = document.createElement('div');
    hdr.style.cssText = 'flex:0 0 auto;text-align:center;padding:14px 0 8px 0;';
    hdr.innerHTML = [
      '<div style="font-family:Georgia,serif;font-size:16px;font-weight:800;',
      'color:#60d8ff;letter-spacing:3px;text-shadow:0 0 12px rgba(96,216,255,0.4);">',
      '⛰ HILL CONTROL</div>',
      '<div style="font-size:11px;color:#4080a0;margin-top:3px;letter-spacing:1px;">',
      'HOLD THE HILL LONGER THAN YOUR RIVALS</div>',
    ].join('');
    wrap.appendChild(hdr);

    // ── Opponent list ─────────────────────────────────────────────────────
    const opsList = document.createElement('div');
    opsList.style.cssText = 'flex:1 1 auto;overflow-y:auto;padding:0 2px;';
    wrap.appendChild(opsList);

    opsList.appendChild(_opRow('YOU', '—', true));
    for (const op of opponents) {
      opsList.appendChild(_opRow(op.name, op.holdTime.toFixed(1) + 's', false));
    }

    // ── Bar to beat ───────────────────────────────────────────────────────
    const best = opponents.reduce(function(a, b) { return b.holdTime > a.holdTime ? b : a; });
    const beatLine = document.createElement('div');
    beatLine.style.cssText = 'flex:0 0 auto;text-align:center;padding:6px 0;font-size:11px;color:#406880;letter-spacing:0.5px;';
    beatLine.innerHTML = 'Beat <span style="color:#60d8ff;font-weight:700;">' + best.name +
      '</span> (' + best.holdTime.toFixed(1) + 's) for gold';
    wrap.appendChild(beatLine);

    // ── Action buttons ────────────────────────────────────────────────────
    const btnsRow = document.createElement('div');
    btnsRow.style.cssText = 'flex:0 0 auto;display:flex;gap:8px;padding:8px 0 4px 0;';
    wrap.appendChild(btnsRow);

    const backBtn = document.createElement('button');
    backBtn.style.cssText = [
      'flex:0 0 auto;padding:12px 14px;border-radius:24px;',
      'border:1.5px solid #223344;background:#04080e;',
      'color:#4070a0;font-size:12px;font-weight:700;letter-spacing:1px;',
      'cursor:pointer;transition:transform 80ms ease;',
    ].join('');
    backBtn.textContent = '◀ BACK';
    backBtn.addEventListener('pointerdown', function() { backBtn.style.transform = 'scale(0.95)'; });
    backBtn.addEventListener('pointerup',   function() { backBtn.style.transform = 'scale(1)'; });
    backBtn.addEventListener('pointerleave',function() { backBtn.style.transform = 'scale(1)'; });
    backBtn.addEventListener('click', function() { if (backFn) backFn(); });
    btnsRow.appendChild(backBtn);

    const attackBtn = document.createElement('button');
    attackBtn.style.cssText = [
      'flex:1;padding:14px 0;border-radius:28px;',
      'border:2px solid #1898c8;',
      'background:linear-gradient(to bottom,#0c68a0,#042840);',
      'color:#90d8f8;font-size:15px;font-weight:800;letter-spacing:3px;cursor:pointer;',
      'box-shadow:0 4px 12px rgba(12,104,160,0.45);transition:transform 80ms ease;',
    ].join('');
    attackBtn.textContent = '⛰ ATTACK';
    attackBtn.addEventListener('pointerdown', function() { attackBtn.style.transform = 'scale(0.96)'; });
    attackBtn.addEventListener('pointerup',   function() { attackBtn.style.transform = 'scale(1)'; });
    attackBtn.addEventListener('pointerleave',function() { attackBtn.style.transform = 'scale(1)'; });
    attackBtn.addEventListener('click', function() {
      const cost = window.WG.HuntCaptureHill ? WG.HuntCaptureHill.TUNABLES.ENERGY_COST : 5;
      if (WG.State.getEnergy().current < cost) {
        if (window.WG.EnergyModal && WG.EnergyModal.open) WG.EnergyModal.open({ reason: 'out-of-energy' });
        return;
      }
      WG.State.spendEnergy(cost);
      if (window.WG.Game && WG.Game.startCaptureHillRun) {
        WG.Game.startCaptureHillRun(opponents);
      }
    });
    btnsRow.appendChild(attackBtn);
  }

  // ─── Opponent row helper ──────────────────────────────────────────────────
  function _opRow(name, holdStr, isYou) {
    const row = document.createElement('div');
    row.style.cssText = [
      'display:flex;align-items:center;gap:10px;padding:10px 8px;margin-bottom:6px;border-radius:10px;',
      isYou ? 'background:rgba(8,80,130,0.25);border:1px solid rgba(24,152,200,0.35);'
            : 'background:#040a10;border:1px solid #101e2c;',
    ].join('');
    row.innerHTML = [
      '<span style="font-size:20px;opacity:0.8;">' + (isYou ? '⚔' : '👤') + '</span>',
      '<span style="flex:1;font-size:13px;font-weight:700;letter-spacing:0.5px;color:' +
        (isYou ? '#60d8ff' : '#7098b8') + ';">' + name + '</span>',
      '<span style="font-size:13px;font-weight:800;color:' +
        (isYou ? '#a0e8ff' : '#405870') + ';">' + holdStr + '</span>',
    ].join('');
    return row;
  }

  // ─── Pick opponents ───────────────────────────────────────────────────────
  function _pickOpponents(n) {
    const pool = OPPONENT_POOL.slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
    }
    return pool.slice(0, n);
  }

  // ─── onRunComplete ────────────────────────────────────────────────────────
  // Called by hunt-capture-hill.js after the 60s match ends.
  function onRunComplete(playerHoldTime) {
    if (!_currentMatch) return;
    const opponents = _currentMatch.opponents;
    _currentMatch = null;
    _showResults(playerHoldTime, opponents);
  }

  // ─── Results modal ────────────────────────────────────────────────────────
  function _showResults(playerHoldTime, opponents) {
    // Rank player among all 4 entries
    const entries = opponents.map(function(o) {
      return { name: o.name, holdTime: o.holdTime, isPlayer: false };
    });
    entries.push({ name: 'YOU', holdTime: playerHoldTime, isPlayer: true });
    entries.sort(function(a, b) { return b.holdTime - a.holdTime; });
    const playerRank = entries.findIndex(function(e) { return e.isPlayer; }) + 1;
    const tier = REWARD_TIERS[Math.min(playerRank - 1, REWARD_TIERS.length - 1)];

    WG.State.grant('coins', tier.coins);
    if (tier.gems > 0) WG.State.grant('diamonds', tier.gems);

    const medals = ['🥇', '🥈', '🥉'];
    const rowsHtml = entries.map(function(e, i) {
      const medal = i < 3 ? medals[i] : (i + 1) + '.';
      const hi = e.isPlayer ? 'background:#040c18;' : '';
      const nc = e.isPlayer ? '#60d8ff' : '#507090';
      const fw = e.isPlayer ? 700 : 400;
      return '<div style="display:flex;align-items:center;gap:8px;padding:5px 8px;' +
        'border-radius:6px;' + hi + '">' +
        '<span style="width:22px;font-size:13px;text-align:center;">' + medal + '</span>' +
        '<span style="flex:1;font-size:12px;color:' + nc + ';font-weight:' + fw + ';">' + e.name + '</span>' +
        '<span style="font-size:12px;color:#80c8e0;font-weight:700;">' + e.holdTime.toFixed(1) + 's</span>' +
        '</div>';
    }).join('');

    const gemsLine = tier.gems > 0 ? '<div>+ ' + tier.gems + ' 💎</div>' : '';

    const overlay = document.createElement('div');
    overlay.id = 'wg-ch-results';
    overlay.style.cssText = [
      'position:fixed;inset:0;z-index:2400;display:flex;align-items:center;justify-content:center;',
      'background:rgba(0,0,0,0.90);',
    ].join('');
    overlay.innerHTML = [
      '<div style="background:linear-gradient(145deg,#020c18,#04121e);border:2px solid #0c5888;',
      'border-radius:16px;padding:24px 20px;max-width:300px;width:88%;text-align:center;',
      'box-shadow:0 0 40px rgba(12,88,136,0.4),0 8px 32px rgba(0,0,0,0.8);">',
      '<div style="font-size:11px;color:#206888;letter-spacing:2px;margin-bottom:4px;">HILL CONTROL</div>',
      '<div style="font-family:Georgia,serif;font-size:26px;font-weight:800;color:#60d8ff;',
      'letter-spacing:2px;margin-bottom:4px;">' + tier.label + '</div>',
      '<div style="font-size:12px;color:#306888;margin-bottom:14px;">',
      'Hold: <span style="color:#80d8f0;font-weight:700;">' + playerHoldTime.toFixed(1) + 's</span>',
      ' / 60s &nbsp;·&nbsp; Rank ' + playerRank + '/4</div>',
      '<div style="background:#020810;border-radius:10px;padding:8px;margin-bottom:14px;text-align:left;">',
      rowsHtml,
      '</div>',
      '<div style="font-size:13px;color:#70b8d0;margin-bottom:16px;line-height:1.9;">',
      '<div>+ ' + tier.coins + ' 🪙</div>' + gemsLine,
      '</div>',
      '<button id="wg-ch-ok" style="width:200px;padding:13px 0;border-radius:28px;',
      'border:2px solid #1490c0;background:linear-gradient(to bottom,#0860a0,#022030);',
      'color:#80d8f8;font-size:14px;font-weight:800;letter-spacing:2px;cursor:pointer;',
      'box-shadow:0 4px 12px rgba(8,96,160,0.4);transition:transform 80ms ease;">LOBBY</button>',
      '</div>',
    ].join('');
    document.body.appendChild(overlay);

    const okBtn = document.getElementById('wg-ch-ok');
    if (okBtn) {
      okBtn.addEventListener('pointerdown', function() { okBtn.style.transform = 'scale(0.95)'; });
      okBtn.addEventListener('pointerup',   function() { okBtn.style.transform = 'scale(1)'; });
      okBtn.addEventListener('click', function() {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (window.WG.Game && WG.Game.exitHunt) WG.Game.exitHunt();
      });
    }

    WG.Engine.emit('capture-hill:result', {
      rank: playerRank, tier: tier.label, holdTime: playerHoldTime,
    });
  }

  function init() {}

  window.WG.CaptureHillMatch = { init, showMatchQueue, onRunComplete };
})();
