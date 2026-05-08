// WG.RaidBossAttack — 60s solo boss attack: pick char → deal damage → record to AllianceBoss
(function(){'use strict';

  const ATTACK_DURATION_MS = 60000;
  const ENERGY_COST        = 5;

  const BOSS_CONFIG = {
    wraith_father: { name: 'Wraith Father', emoji: '👻', color: '#b060e0' },
    frozen_crone:  { name: 'Frozen Crone',  emoji: '❄',  color: '#60b8e8' },
    samurai_lord:  { name: 'Samurai Lord',  emoji: '⚔',  color: '#d0a030' },
    void_emperor:  { name: 'Void Emperor',  emoji: '🌑', color: '#6040d0' },
  };

  let _running      = false;
  let _attackEl     = null;
  let _startMs      = 0;
  let _totalDamage  = 0;
  let _timerHandle  = 0;
  let _rafId        = 0;

  function _esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function _fmt(n){ return Math.floor(n).toLocaleString(); }

  // ── Styles ──────────────────────────────────────────────────────────────────
  function _ensureStyles() {
    if (document.getElementById('wg-boss-atk-style')) return;
    const s = document.createElement('style');
    s.id = 'wg-boss-atk-style';
    s.textContent = [
      '@keyframes wgBossAtkFloat{',
        '0%{opacity:1;transform:translateX(-50%) translateY(0) scale(1);}',
        '100%{opacity:0;transform:translateX(-50%) translateY(-72px) scale(0.85);}',
      '}',
      '@keyframes wgBossAtkShake{',
        '0%,100%{transform:translateX(0) scale(1);}',
        '20%,60%{transform:translateX(-5px) scale(1.04);}',
        '40%,80%{transform:translateX(5px) scale(1.04);}',
      '}',
    ].join('');
    document.head.appendChild(s);
  }

  // ── Damage loop ─────────────────────────────────────────────────────────────
  function _playerAttack() {
    if (!_running) return;
    const p    = WG.State.get().player;
    const atk  = p.stats ? (p.stats.attack || 5) : 5;
    const base = atk * 45 + Math.floor(Math.random() * atk * 35);
    const isCrit = Math.random() < ((p.stats && p.stats.critRate) || 0.05) * 2 + 0.08;
    const enchMul = _enchantMul();
    const dmg  = Math.floor(base * (isCrit ? 2.5 : 1) * enchMul);
    _totalDamage += dmg;
    _spawnFloat(dmg, isCrit);
    if (WG.AllianceBoss && WG.AllianceBoss.recordDamage) WG.AllianceBoss.recordDamage(dmg);
    // Shake boss portrait on crit
    if (isCrit && _attackEl) {
      const portrait = _attackEl.querySelector('#wg-boss-atk-portrait');
      if (portrait) {
        portrait.classList.remove('wg-boss-atk-shakecls');
        void portrait.offsetWidth;
        portrait.style.animation = 'wgBossAtkShake 0.25s ease-out';
        setTimeout(function(){ if (portrait) portrait.style.animation = ''; }, 260);
      }
    }
    const delay = 420 + Math.floor(Math.random() * 360);
    if (_running) _timerHandle = setTimeout(_playerAttack, delay);
  }

  function _enchantMul() {
    const f  = WG.State.get().forge;
    const eq = f && f.equippedEnchantment;
    return (eq && eq.type) ? 1.3 : 1;
  }

  function _spawnFloat(dmg, isCrit) {
    if (!_attackEl) return;
    const feed = _attackEl.querySelector('#wg-boss-atk-feed');
    if (!feed) return;
    const el = document.createElement('div');
    const txt = isCrit ? '+' + _fmt(dmg) + ' CRIT!' : '+' + _fmt(dmg);
    const leftPct = 20 + Math.floor(Math.random() * 60);
    const topPct  = 10 + Math.floor(Math.random() * 50);
    el.style.cssText = [
      'position:absolute;',
      'left:' + leftPct + '%;',
      'top:'  + topPct  + '%;',
      'transform:translateX(-50%);',
      'font-size:' + (isCrit ? '19' : '14') + 'px;',
      'color:'    + (isCrit ? '#ff9020' : '#f0e880') + ';',
      'font-weight:700;letter-spacing:0.5px;pointer-events:none;',
      'animation:wgBossAtkFloat 1.1s ease-out forwards;',
    ].join('');
    el.textContent = txt;
    feed.appendChild(el);
    setTimeout(function(){ if (el.parentNode) el.parentNode.removeChild(el); }, 1200);
  }

  // ── UI build ─────────────────────────────────────────────────────────────────
  function _buildUI(boss) {
    const cfg = BOSS_CONFIG[boss.bossId] || { name: boss.bossId, emoji: '👿', color: '#a040a0' };
    const hpPct = Math.max(0, Math.round((boss.hpRemaining / boss.hpMax) * 100));
    const overlay = document.createElement('div');
    overlay.id = 'wg-boss-atk-overlay';
    overlay.style.cssText = [
      'position:fixed;inset:0;z-index:300;',
      'background:radial-gradient(ellipse at center,rgba(18,6,28,0.98) 0%,rgba(4,2,8,0.99) 80%);',
      'display:flex;flex-direction:column;align-items:center;',
    ].join('');

    overlay.innerHTML = [
      // timer progress bar
      '<div id="wg-boss-atk-timerbar" style="',
        'position:absolute;top:0;left:0;height:5px;',
        'background:linear-gradient(to right,' + _esc(cfg.color) + ',#e080ff);',
        'width:100%;pointer-events:none;"></div>',

      // Boss portrait + name + HP
      '<div style="margin-top:50px;display:flex;flex-direction:column;align-items:center;gap:6px;">',
        '<div id="wg-boss-atk-portrait" style="font-size:64px;line-height:1;">',
          _esc(cfg.emoji),
        '</div>',
        '<div style="font-size:16px;color:' + _esc(cfg.color) + ';',
          'letter-spacing:3px;text-transform:uppercase;font-weight:700;margin-top:4px;">',
          _esc(cfg.name),
        '</div>',
        '<div style="width:240px;height:10px;background:#180a10;border-radius:5px;',
          'overflow:hidden;border:1px solid #3a1828;margin-top:2px;">',
          '<div id="wg-boss-atk-hpfill" style="height:100%;border-radius:5px;',
            'background:linear-gradient(to right,#b02040,#e03060);',
            'width:' + hpPct + '%;transition:width 300ms;"></div>',
        '</div>',
        '<div id="wg-boss-atk-hplbl" style="font-size:9px;color:#60504a;letter-spacing:0.5px;">',
          _fmt(boss.hpRemaining) + ' / ' + _fmt(boss.hpMax),
        '</div>',
      '</div>',

      // Scrolling damage feed (absolute positioned within a relative container)
      '<div id="wg-boss-atk-feed" style="',
        'position:relative;flex:1;width:100%;max-width:420px;overflow:hidden;',
        'pointer-events:none;">',
      '</div>',

      // Countdown + total damage
      '<div style="display:flex;flex-direction:column;align-items:center;',
        'gap:4px;margin-bottom:56px;">',
        '<div id="wg-boss-atk-countdown" style="font-size:34px;color:#f0d890;',
          'font-weight:700;letter-spacing:3px;">60s</div>',
        '<div style="font-size:9px;color:#605040;letter-spacing:1.5px;',
          'text-transform:uppercase;">time remaining</div>',
        '<div style="margin-top:10px;font-size:12px;color:#907858;letter-spacing:1px;">',
          'Damage Dealt: <span id="wg-boss-atk-total" style="color:#f0e890;font-weight:700;">0</span>',
        '</div>',
      '</div>',
    ].join('');

    document.body.appendChild(overlay);
    _attackEl = overlay;

    // Animate timer bar width to 0 over ATTACK_DURATION_MS
    requestAnimationFrame(function(){
      const bar = overlay.querySelector('#wg-boss-atk-timerbar');
      if (!bar) return;
      bar.style.transition = 'width ' + (ATTACK_DURATION_MS / 1000) + 's linear';
      requestAnimationFrame(function(){ bar.style.width = '0'; });
    });
  }

  // ── Tick loop ────────────────────────────────────────────────────────────────
  function _tick() {
    if (!_running) return;
    const elapsed   = Date.now() - _startMs;
    const remaining = Math.max(0, ATTACK_DURATION_MS - elapsed);
    const secs      = Math.ceil(remaining / 1000);

    if (_attackEl) {
      const cd = _attackEl.querySelector('#wg-boss-atk-countdown');
      if (cd) cd.textContent = secs + 's';
      const tot = _attackEl.querySelector('#wg-boss-atk-total');
      if (tot) tot.textContent = _fmt(_totalDamage);
      // Live HP from boss state
      const boss = WG.AllianceBoss && WG.AllianceBoss.getCurrentBoss();
      if (boss) {
        const pct = Math.max(0, Math.round((boss.hpRemaining / boss.hpMax) * 100));
        const fill = _attackEl.querySelector('#wg-boss-atk-hpfill');
        if (fill) fill.style.width = pct + '%';
        const lbl = _attackEl.querySelector('#wg-boss-atk-hplbl');
        if (lbl) lbl.textContent = _fmt(boss.hpRemaining) + ' / ' + _fmt(boss.hpMax);
      }
    }

    if (elapsed >= ATTACK_DURATION_MS) { _endAttack(); return; }
    _rafId = requestAnimationFrame(_tick);
  }

  function _endAttack() {
    _running = false;
    if (_timerHandle) { clearTimeout(_timerHandle); _timerHandle = 0; }
    if (_rafId) { cancelAnimationFrame(_rafId); _rafId = 0; }
    setTimeout(_showResults, 350);
  }

  function _showResults() {
    const dmg = _totalDamage;
    if (_attackEl) { _attackEl.remove(); _attackEl = null; }

    const wrap = document.createElement('div');
    wrap.className = 'modal-overlay show';
    wrap.innerHTML = [
      '<div class="modal-card" style="min-width:300px;max-width:90%;text-align:center;">',
        '<div class="modal-title">Attack Complete!</div>',
        '<div style="font-size:36px;font-weight:700;color:#f0d890;margin:12px 0;">',
          '+' + _fmt(dmg),
        '</div>',
        '<div style="font-size:11px;color:#907858;letter-spacing:1px;margin-bottom:16px;">',
          'damage dealt to the boss',
        '</div>',
        '<div class="modal-btn-row">',
          '<button id="wg-boss-atk-done" class="btn primary">Done</button>',
        '</div>',
      '</div>',
    ].join('');
    document.getElementById('modal-root').appendChild(wrap);
    wrap.querySelector('#wg-boss-atk-done').addEventListener('click', function(){
      wrap.remove();
      // Refresh the alliance Boss tab
      if (WG.AllianceRender && WG.AllianceRender.refresh) WG.AllianceRender.refresh();
    });
  }

  function _toast(msg) {
    const t = document.createElement('div');
    t.style.cssText = [
      'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);',
      'background:rgba(20,12,4,0.92);border:1px solid #604020;border-radius:8px;',
      'padding:10px 18px;color:#f0d890;font-size:12px;letter-spacing:1px;',
      'z-index:500;pointer-events:none;white-space:nowrap;',
    ].join('');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function(){ t.style.opacity='0'; t.style.transition='opacity 400ms'; }, 2200);
    setTimeout(function(){ if(t.parentNode) t.parentNode.removeChild(t); }, 2700);
  }

  // ── Public ───────────────────────────────────────────────────────────────────
  function open() {
    if (_running) return;
    if (!WG.AllianceBoss) return;
    const boss = WG.AllianceBoss.getCurrentBoss();
    if (!boss || !boss.inEvent) { _toast('No active boss event right now.'); return; }
    if (!WG.Alliance || !WG.Alliance.isInAlliance || !WG.Alliance.isInAlliance()) {
      _toast('Join an alliance to attack the boss!'); return;
    }
    if (!WG.State.spendEnergy(ENERGY_COST)) {
      _toast('Not enough energy (needs ' + ENERGY_COST + ')');
      if (WG.EnergyModal && WG.EnergyModal.show) WG.EnergyModal.show();
      return;
    }
    _ensureStyles();
    _totalDamage = 0;
    _buildUI(boss);
    _running  = true;
    _startMs  = Date.now();
    _playerAttack();
    _rafId = requestAnimationFrame(_tick);
  }

  function init() {
    WG.Engine.on('allianceBoss:defeated', function() {
      if (WG.Alliance && WG.Alliance.isInAlliance && WG.Alliance.isInAlliance()) {
        _toast('🏆 Boss defeated! Claim your reward in Alliance → Boss!');
      }
    });
  }

  window.WG.RaidBossAttack = { init, open, BOSS_CONFIG, ENERGY_COST, ATTACK_DURATION_MS };
})();
