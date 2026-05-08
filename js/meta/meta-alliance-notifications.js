// WG.AllianceNotifications — badge state for alliance sub-system events
// Tracks five badge types; renders red-dot indicators on the Alliance nav tab
// and on relevant section headers inside the alliance panel.
(function(){'use strict';

  // ── STATE ────────────────────────────────────────────────────────────────────

  let _badges = {
    applications:    0,   // pending member applications
    warStartingIn:   false, // matchmaking phase is open
    bossActive:      false, // alliance boss event is live
    giftsToOpen:     0,   // unclaimed daily alliance gift
    warPendingResults: false, // revenge window is active (we were attacked)
  };

  // ── HELPERS ──────────────────────────────────────────────────────────────────

  function _total() {
    return _badges.applications +
           (_badges.warStartingIn    ? 1 : 0) +
           (_badges.bossActive       ? 1 : 0) +
           _badges.giftsToOpen +
           (_badges.warPendingResults ? 1 : 0);
  }

  function _refresh() {
    // Recompute stateful badges that aren't purely event-driven
    if (WG.AllianceBoss && WG.AllianceBoss.getCurrentBoss) {
      const boss = WG.AllianceBoss.getCurrentBoss();
      _badges.bossActive = !!(boss && boss.inEvent);
    }
    if (WG.AllianceWar && WG.AllianceWar.getState) {
      const ws = WG.AllianceWar.getState();
      _badges.warStartingIn = ws.phase === 'matchmaking';
    }
    if (WG.AllianceWar && WG.AllianceWar.getRevengeWindow) {
      _badges.warPendingResults = !!WG.AllianceWar.getRevengeWindow();
    }
    if (WG.Alliance && WG.Alliance.isInAlliance && WG.Alliance.isInAlliance()) {
      const a = WG.Alliance.get();
      // Gift is available if it wasn't claimed today
      const today = new Date().toDateString();
      _badges.giftsToOpen = (a.lastGiftClaimDate !== today) ? 1 : 0;
    } else {
      _badges.giftsToOpen  = 0;
      _badges.applications = 0;
    }
    _paint();
  }

  // ── PAINT ─────────────────────────────────────────────────────────────────────
  // Puts a count badge on the Alliance nav tab.

  function _paint() {
    const navTab = document.getElementById('nav-tab-alliance');
    if (!navTab) return;

    let dot = navTab.querySelector('.wg-notif-dot');
    const count = _total();

    if (count <= 0) {
      if (dot) dot.remove();
      return;
    }

    if (!dot) {
      dot = document.createElement('span');
      dot.className = 'wg-notif-dot';
      dot.style.cssText = [
        'position:absolute;top:2px;right:calc(50% - 22px);',
        'background:#e03040;border-radius:8px;',
        'font-size:8px;font-weight:700;color:#fff;',
        'min-width:14px;height:14px;line-height:14px;',
        'text-align:center;padding:0 2px;pointer-events:none;z-index:3;',
      ].join('');
      navTab.appendChild(dot);
    }
    dot.textContent = count > 9 ? '9+' : String(count);

    // Sub-section dots inside the open panel (best-effort; panel may not be rendered)
    _paintSubDots();
  }

  function _paintSubDots() {
    // Application badge on roster sub-tab button
    _setSubDot('roster', _badges.applications > 0);
    // Boss badge on boss sub-tab button
    _setSubDot('boss', _badges.bossActive);
  }

  function _setSubDot(subTabId, show) {
    const btn = document.querySelector('.wg-al-subtab[data-subtab="' + subTabId + '"]');
    if (!btn) return;
    let dot = btn.querySelector('.wg-al-subtab-dot');
    if (show) {
      if (!dot) {
        dot = document.createElement('span');
        dot.className = 'wg-al-subtab-dot';
        dot.style.cssText = [
          'display:inline-block;width:7px;height:7px;',
          'background:#e03040;border-radius:50%;',
          'margin-left:4px;vertical-align:middle;',
          'pointer-events:none;',
        ].join('');
        btn.appendChild(dot);
      }
    } else {
      if (dot) dot.remove();
    }
  }

  // ── INIT ─────────────────────────────────────────────────────────────────────

  function init() {
    // Application badge
    WG.Engine.on('recruitment:application-received', function() {
      _badges.applications++;
      _paint();
    });
    // Clear application badge when leader views/accepts
    WG.Engine.on('alliance:member-joined', function() {
      _badges.applications = Math.max(0, _badges.applications - 1);
      _paint();
    });

    // War starting (matchmaking phase)
    WG.Engine.on('allianceWar:changed', function() {
      if (WG.AllianceWar && WG.AllianceWar.getState) {
        _badges.warStartingIn = WG.AllianceWar.getState().phase === 'matchmaking';
        _paint();
      }
    });

    // Revenge window opened (we were attacked)
    WG.Engine.on('alliance-war:attacked', function() {
      _badges.warPendingResults = true;
      _paint();
    });
    WG.Engine.on('allianceWar:revengeRaid', function() {
      _badges.warPendingResults = false;
      _paint();
    });

    // Gift badge cleared when gift is claimed
    WG.Engine.on('alliance:gift-claimed', function() {
      _badges.giftsToOpen = 0;
      _paint();
    });

    // Recompute on tab switch and daily reset
    WG.Engine.on('tab:change', function(ev) {
      if (ev && ev.tab === 'alliance') _refresh();
    });
    WG.Engine.on('daily:reset', _refresh);
    WG.Engine.on('alliance:changed', _refresh);

    _refresh();
  }

  window.WG.AllianceNotifications = { init, getBadges: function() { return Object.assign({}, _badges); } };
})();
