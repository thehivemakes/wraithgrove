// WG.LtdEvents — limited-time event catalog, scheduler, buff stack, mission injection, UI.
// W-Event-System-Scaffold. NOTE: WG.Events is taken by meta-events.js analytics reporter;
// this module uses WG.LtdEvents. Server scheduling = Phase 4 — dates are hardcoded.
(function(){'use strict';

  // ─── Concern A: Event catalog ────────────────────────────────────────────────
  var CATALOG = Object.freeze([
    {
      id: 'wraith_moon',
      name: 'Wraith Moon Festival',
      desc: 'Banshees spawn 2× more often. Special Moon Sigil drops.',
      startDate: '2026-10-25', endDate: '2026-11-02',
      buffs: { banshee_spawn_mult: 2.0, moon_sigil_drop: true },
      missions: [
        { id: 'evt_kill_banshees',  desc: 'Defeat 5 Banshees',        target: 5,  reward: { gems: 50, frags: 20 } },
        { id: 'evt_clear_eldritch', desc: 'Clear any eldritch stage',  target: 3,  reward: { rareMat: 1 } },
      ],
      cosmetic: 'moon_lantern_skin',
    },
    {
      id: 'lunar_new_year',
      name: 'Lunar New Year',
      desc: 'Login bonus 2× during festival. Red envelope drops.',
      startDate: '2026-02-09', endDate: '2026-02-17',
      buffs: { login_bonus_mult: 2.0, red_envelope_drop: true },
      missions: [
        { id: 'evt_login_streak', desc: 'Login each day of festival', target: 7, reward: { gems: 100 } },
      ],
      cosmetic: 'lantern_red_skin',
    },
    {
      id: 'tower_anniversary',
      name: 'First Anniversary Climb',
      desc: '50% off Tower continues during anniversary week.',
      startDate: '2027-05-05', endDate: '2027-05-12',
      buffs: { tower_continue_discount: 0.5 },
      missions: [
        { id: 'evt_tower_50', desc: 'Reach Tower floor 50 once', target: 50, reward: { gems: 200, rareMat: 5 } },
      ],
    },
  ]);

  // ─── Concern B: Event scheduler + buff stack ─────────────────────────────────
  function _todayStr() {
    return WG.MetaDailyReset ? WG.MetaDailyReset.todayStr() : new Date().toISOString().slice(0, 10);
  }

  function activeEvents() {
    var today = _todayStr();
    return CATALOG.filter(function(e) {
      return today >= e.startDate && today <= e.endDate;
    });
  }

  // Merge all active event buffs into WG.State.get().eventBuffs.
  // Other systems read via WG.LtdEvents.getBuff(key, default).
  function applyBuffs() {
    var s = WG.State.get();
    if (!s.eventBuffs) s.eventBuffs = {};
    var merged = {};
    activeEvents().forEach(function(evt) {
      Object.keys(evt.buffs).forEach(function(k) { merged[k] = evt.buffs[k]; });
    });
    s.eventBuffs = merged;
    WG.Engine.emit('event:buffs-applied', { buffs: merged });
  }

  // Read a single buff key from the active buff stack.
  // Returns defaultVal if key is not active.
  function getBuff(key, defaultVal) {
    var s = WG.State.get();
    var v = s.eventBuffs && s.eventBuffs[key];
    return (v !== undefined) ? v : (defaultVal !== undefined ? defaultVal : null);
  }

  // ─── Concern D: Mission injection / deregistration ───────────────────────────
  function _registerMissions() {
    var active = activeEvents();
    var defs = [];
    active.forEach(function(evt) {
      (evt.missions || []).forEach(function(m) {
        defs.push({
          eventId:   evt.id,
          eventName: evt.name,
          id:        m.id,
          desc:      m.desc,
          target:    m.target,
          reward:    m.reward,
        });
      });
    });
    if (WG.Missions && WG.Missions.setEventMissions) WG.Missions.setEventMissions(defs);
  }

  function _deregisterMissions() {
    if (WG.Missions && WG.Missions.clearEventMissions) WG.Missions.clearEventMissions();
  }

  // ─── Concern C: Event banner UI (Hunt menu) ───────────────────────────────────
  var _bannerEl = null;

  function _countdownStr(endDateStr) {
    var end = new Date(endDateStr + 'T23:59:59');
    var ms = Math.max(0, end - Date.now());
    var days = Math.floor(ms / 86400000);
    if (days > 0) return days + 'd left';
    var hrs  = Math.floor((ms % 86400000) / 3600000);
    var mins = Math.floor((ms % 3600000) / 60000);
    return hrs + 'h ' + mins + 'm left';
  }

  function _buildBanner(evt) {
    var banner = document.createElement('div');
    banner.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 12px;background:linear-gradient(135deg,#1a1030,#2a0a10);border:1px solid #8040c0;border-radius:10px;cursor:pointer;transition:transform 80ms ease;';
    banner.addEventListener('pointerdown', function() { banner.style.transform = 'scale(0.98)'; });
    banner.addEventListener('pointerup',   function() { banner.style.transform = 'scale(1)'; });
    banner.addEventListener('pointerleave',function() { banner.style.transform = 'scale(1)'; });
    banner.addEventListener('click', function() { openEventModal(evt); });

    var badge = document.createElement('div');
    badge.style.cssText = 'flex:0 0 auto;background:linear-gradient(to bottom,#a840e0,#6010a0);color:#fff;font-size:9px;font-weight:800;letter-spacing:1px;padding:3px 7px;border-radius:6px;white-space:nowrap;';
    badge.textContent = 'EVENT';
    banner.appendChild(badge);

    var mid = document.createElement('div');
    mid.style.cssText = 'flex:1;min-width:0;';

    var nameEl = document.createElement('div');
    nameEl.style.cssText = 'font-size:12px;font-weight:700;color:#d8b0ff;letter-spacing:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    nameEl.textContent = evt.name;
    mid.appendChild(nameEl);

    var cdEl = document.createElement('div');
    cdEl.style.cssText = 'font-size:10px;color:#9878c8;margin-top:1px;';
    cdEl.textContent = _countdownStr(evt.endDate);
    mid.appendChild(cdEl);
    banner.appendChild(mid);

    var arrow = document.createElement('div');
    arrow.style.cssText = 'flex:0 0 auto;color:#a840e0;font-size:18px;line-height:1;';
    arrow.textContent = '›';
    banner.appendChild(arrow);

    return banner;
  }

  // Called by showHuntStageList() with the banner container element.
  // Stores the reference and paints current active events into it.
  function renderBanner(containerEl) {
    _bannerEl = containerEl;
    _refreshBanner();
  }

  function _refreshBanner() {
    if (!_bannerEl) return;
    _bannerEl.innerHTML = '';
    var active = activeEvents();
    if (!active.length) {
      _bannerEl.style.display = 'none';
      return;
    }
    _bannerEl.style.display = '';
    // Show first active event; future work can add a carousel for multiple
    _bannerEl.appendChild(_buildBanner(active[0]));
  }

  // ─── Event detail modal ───────────────────────────────────────────────────────
  function openEventModal(evt) {
    var existing = document.getElementById('wg-ltd-evt-modal');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

    var overlay = document.createElement('div');
    overlay.id = 'wg-ltd-evt-modal';
    overlay.className = 'modal-overlay show';
    overlay.style.cssText = 'z-index:120;';

    var card = document.createElement('div');
    card.className = 'modal-card';
    card.style.cssText = 'width:92%;max-width:360px;max-height:82vh;display:flex;flex-direction:column;padding:0;overflow:hidden;background:linear-gradient(to bottom,#1a0c30,#0c0620);border-color:#6020a0;';

    // ── Header
    var hdr = document.createElement('div');
    hdr.style.cssText = 'padding:14px 16px 10px 16px;background:linear-gradient(135deg,#2a0a40,#1a0520);border-bottom:1px solid rgba(160,64,224,0.3);';

    var evtBadge = document.createElement('div');
    evtBadge.style.cssText = 'display:inline-block;background:linear-gradient(to bottom,#a840e0,#6010a0);color:#fff;font-size:9px;font-weight:800;letter-spacing:1px;padding:3px 8px;border-radius:6px;margin-bottom:8px;';
    evtBadge.textContent = 'LIMITED EVENT';
    hdr.appendChild(evtBadge);

    var titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-size:15px;color:#d8b0ff;font-weight:700;letter-spacing:2px;';
    titleEl.textContent = evt.name;
    hdr.appendChild(titleEl);

    var datesEl = document.createElement('div');
    datesEl.style.cssText = 'font-size:10px;color:#9878c8;margin-top:4px;letter-spacing:0.5px;';
    datesEl.textContent = evt.startDate + ' – ' + evt.endDate + '  (' + _countdownStr(evt.endDate) + ')';
    hdr.appendChild(datesEl);
    card.appendChild(hdr);

    // ── Scrollable body
    var body = document.createElement('div');
    body.style.cssText = 'flex:1;overflow-y:auto;padding:14px 16px;';

    var descEl = document.createElement('div');
    descEl.style.cssText = 'font-size:12px;color:#c8a8e8;margin-bottom:14px;line-height:1.5;';
    descEl.textContent = evt.desc;
    body.appendChild(descEl);

    // Buffs
    var buffKeys = Object.keys(evt.buffs);
    if (buffKeys.length) {
      var buffHdr = document.createElement('div');
      buffHdr.style.cssText = 'font-size:10px;color:#a080c8;letter-spacing:1.5px;font-weight:700;margin-bottom:6px;';
      buffHdr.textContent = 'EVENT EFFECTS';
      body.appendChild(buffHdr);

      buffKeys.forEach(function(k) {
        var row = document.createElement('div');
        row.style.cssText = 'font-size:11px;color:#d0b0f0;padding:4px 8px;background:rgba(160,64,224,0.1);border-radius:4px;margin-bottom:4px;border:1px solid rgba(160,64,224,0.2);';
        var v = evt.buffs[k];
        var valStr = (typeof v === 'boolean')
          ? (v ? 'Active' : 'Inactive')
          : (typeof v === 'number' && v <= 1)
            ? Math.round((1 - v) * 100) + '% off'
            : v + '×';
        row.textContent = k.replace(/_/g, ' ') + ': ' + valStr;
        body.appendChild(row);
      });
    }

    // Missions
    if (evt.missions && evt.missions.length) {
      var msHdr = document.createElement('div');
      msHdr.style.cssText = 'font-size:10px;color:#a080c8;letter-spacing:1.5px;font-weight:700;margin:12px 0 6px 0;';
      msHdr.textContent = 'EVENT MISSIONS';
      body.appendChild(msHdr);

      evt.missions.forEach(function(m) {
        var progress = 0; var claimed = false;
        var s = WG.State.get();
        if (s.missions && s.missions.event && s.missions.event[m.id]) {
          progress = s.missions.event[m.id].progress || 0;
          claimed  = s.missions.event[m.id].claimed  || false;
        }
        var pct = Math.min(1, m.target > 0 ? progress / m.target : 0);

        var mRow = document.createElement('div');
        mRow.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);';

        var mMid = document.createElement('div');
        mMid.style.cssText = 'flex:1;min-width:0;';

        var mDesc = document.createElement('div');
        mDesc.style.cssText = 'font-size:12px;margin-bottom:4px;' +
          (claimed ? 'color:#604838;text-decoration:line-through;' : pct >= 1 ? 'color:#d8b0ff;' : 'color:#b898d8;');
        mDesc.textContent = m.desc;
        mMid.appendChild(mDesc);

        var barBg = document.createElement('div');
        barBg.style.cssText = 'height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;';
        var barFill = document.createElement('div');
        barFill.style.cssText = 'height:100%;border-radius:2px;width:' + Math.round(pct * 100) + '%;background:' + (pct >= 1 ? '#a840e0' : '#7020a0') + ';';
        barBg.appendChild(barFill);
        mMid.appendChild(barBg);

        var progEl = document.createElement('div');
        progEl.style.cssText = 'font-size:10px;color:#807060;margin-top:2px;';
        progEl.textContent = progress + ' / ' + m.target;
        mMid.appendChild(progEl);
        mRow.appendChild(mMid);

        // Reward
        var rwd = m.reward || {};
        var rwdParts = [];
        if (rwd.gems)    rwdParts.push('+' + rwd.gems    + '💎');
        if (rwd.coins)   rwdParts.push('+' + rwd.coins   + '🪙');
        if (rwd.frags)   rwdParts.push('+' + rwd.frags   + '🔷');
        if (rwd.rareMat) rwdParts.push('+' + rwd.rareMat + '⭐');

        var rwdEl = document.createElement('div');
        rwdEl.style.cssText = 'flex:0 0 auto;font-size:10px;color:#c8a8e8;text-align:right;min-width:50px;';
        rwdEl.textContent = rwdParts.join(' ');
        mRow.appendChild(rwdEl);
        body.appendChild(mRow);
      });

      var openMsBtn = document.createElement('button');
      openMsBtn.className = 'btn';
      openMsBtn.style.cssText = 'width:100%;margin-top:10px;padding:8px;font-size:11px;letter-spacing:1px;background:linear-gradient(to bottom,#4a1880,#2a0850);border-color:#8040c0;color:#d8b0ff;';
      openMsBtn.textContent = 'TRACK IN MISSIONS';
      openMsBtn.addEventListener('click', function() {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (WG.Missions && WG.Missions.openModal) WG.Missions.openModal('event');
      });
      body.appendChild(openMsBtn);
    }

    // Cosmetic preview
    if (evt.cosmetic) {
      var cosHdr = document.createElement('div');
      cosHdr.style.cssText = 'font-size:10px;color:#a080c8;letter-spacing:1.5px;font-weight:700;margin:14px 0 6px 0;';
      cosHdr.textContent = 'EVENT COSMETIC';
      body.appendChild(cosHdr);

      var cosEl = document.createElement('div');
      cosEl.style.cssText = 'padding:10px 12px;background:rgba(160,64,224,0.08);border:1px solid rgba(160,64,224,0.25);border-radius:6px;font-size:12px;color:#c0a0e0;';
      cosEl.textContent = '✦ ' + evt.cosmetic.replace(/_/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); }) + ' — available while event is active';
      body.appendChild(cosEl);
    }

    card.appendChild(body);

    // ── Footer
    var footer = document.createElement('div');
    footer.style.cssText = 'flex:0 0 auto;padding:10px 14px;border-top:1px solid rgba(160,64,224,0.2);display:flex;justify-content:flex-end;';
    var closeBtn = document.createElement('button');
    closeBtn.className = 'btn';
    closeBtn.style.cssText = 'padding:7px 16px;font-size:11px;';
    closeBtn.textContent = 'CLOSE';
    closeBtn.addEventListener('click', function() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    });
    footer.appendChild(closeBtn);
    card.appendChild(footer);

    overlay.appendChild(card);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    });
    (document.getElementById('modal-root') || document.body).appendChild(overlay);
  }

  // ─── Init ─────────────────────────────────────────────────────────────────────
  function init() {
    var s = WG.State.get();
    if (!s.eventBuffs) s.eventBuffs = {};

    applyBuffs();
    _registerMissions();

    // Re-evaluate once per hour while the app is open
    setInterval(function() {
      applyBuffs();
      _registerMissions();
      _refreshBanner();
    }, 3600000);
  }

  window.WG.LtdEvents = {
    CATALOG, activeEvents, applyBuffs, getBuff,
    renderBanner, openEventModal, init,
  };
})();
