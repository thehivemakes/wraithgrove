// WG.BattlePass — Season battle pass engine + UI.
// W-Monetization-V2-Missions-Pass Concerns D (engine) + E (UI)
// CONFIG-driven: new seasons ship without code edits — just add to SEASONS map.
(function(){'use strict';

  // ─── Concern D: Season config ──────────────────────────────────────────────
  function _buildFreeTrack() {
    // 20 milestones, one every 3 levels (levels 3, 6, 9, ... 60).
    var rewards = [
      { coins: 100 },      { energy: 20 },      { diamonds: 30 },    { coins: 250 },
      { frags: 5 },        { diamonds: 50 },     { energy: 50 },      { coins: 500 },
      { diamonds: 80 },    { frags: 15 },        { energy: 100 },     { diamonds: 120 },
      { coins: 1000 },     { frags: 25 },        { diamonds: 150 },   { energy: 150 },
      { coins: 1500 },     { frags: 30 },        { diamonds: 200 },   { coins: 2000, diamonds: 50 },
    ];
    var track = [];
    for (var i = 0; i < 20; i++) track.push({ level: (i + 1) * 3, reward: rewards[i] });
    return track;
  }

  function _buildPremiumTrack() {
    // Full 60 entries — premium tier rewards every level.
    var track = [];
    for (var i = 1; i <= 60; i++) {
      var reward;
      if      (i % 15 === 0) reward = { diamonds: 500, frags: 20 };
      else if (i % 10 === 0) reward = { diamonds: 200, coins: 1000 };
      else if (i % 5  === 0) reward = { diamonds: 100, energy: 30 };
      else if (i % 3  === 0) reward = { frags: 10 };
      else if (i % 2  === 0) reward = { coins: 400 };
      else                    reward = { diamonds: 30 };
      track.push({ level: i, reward: reward });
    }
    return track;
  }

  var SEASONS = {
    unlimited_chaos_s1: {
      id:          'unlimited_chaos_s1',
      name:        'Whispering Pines',
      startDate:   '2026-05-15',
      endDate:     '2026-06-15',
      premiumSku:  'battle_pass_s1',   // $9.99 in meta-iap.js
      levels:      60,
      xpPerLevel:  100,
      freeTrack:   _buildFreeTrack(),
      premiumTrack: _buildPremiumTrack(),
    }
  };

  Object.freeze(SEASONS.unlimited_chaos_s1);

  var ACTIVE_SEASON_ID = 'unlimited_chaos_s1';

  function getSeason() { return SEASONS[ACTIVE_SEASON_ID]; }

  function ensureState() {
    var s = WG.State.get();
    if (!s.battlePass) {
      s.battlePass = {
        season:         ACTIVE_SEASON_ID,
        xp:             0,
        level:          1,
        premium:        false,
        claimedFree:    [],
        claimedPremium: [],
      };
    }
  }

  function isExpired() {
    var season = getSeason();
    if (!season) return true;
    var today = WG.MetaDailyReset ? WG.MetaDailyReset.todayStr() : new Date().toISOString().slice(0,10);
    return today > season.endDate;
  }

  function timeRemaining() {
    var season = getSeason();
    if (!season || isExpired()) return 0;
    var end = new Date(season.endDate + 'T23:59:59');
    return Math.max(0, end - Date.now());
  }

  // XP needed to reach a given level (1-indexed, level 1 = xp 0)
  function _levelFromXP(xp) {
    var season = getSeason();
    if (!season) return 1;
    return Math.min(season.levels, Math.floor(xp / season.xpPerLevel) + 1);
  }

  function addXP(amount, source) {
    ensureState();
    var bp = WG.State.get().battlePass;
    var season = getSeason();
    if (!season || isExpired()) return;
    bp.xp += amount;
    var newLevel = _levelFromXP(bp.xp);
    if (newLevel > bp.level) {
      bp.level = newLevel;
      WG.Engine.emit('battlepass:level-up', { level: bp.level, season: bp.season });
    }
    WG.Engine.emit('battlepass:xp', { xp: bp.xp, level: bp.level, delta: amount, source: source });
  }

  function setPremium(seasonId) {
    ensureState();
    var bp = WG.State.get().battlePass;
    if (bp.season === seasonId) {
      bp.premium = true;
      WG.Engine.emit('battlepass:premium-activated', { season: seasonId });
    }
  }

  function claimFree(level) {
    ensureState();
    var bp = WG.State.get().battlePass;
    var season = getSeason();
    if (!season) return false;
    if (bp.level < level) return false;
    if (bp.claimedFree.indexOf(level) !== -1) return false;
    var entry = season.freeTrack.find(function(e) { return e.level === level; });
    if (!entry) return false;
    bp.claimedFree.push(level);
    _grantReward(entry.reward);
    WG.Engine.emit('battlepass:claimed', { level: level, track: 'free', reward: entry.reward });
    return true;
  }

  function claimPremium(level) {
    ensureState();
    var bp = WG.State.get().battlePass;
    var season = getSeason();
    if (!season) return false;
    if (!bp.premium) return false;
    if (bp.level < level) return false;
    if (bp.claimedPremium.indexOf(level) !== -1) return false;
    var entry = season.premiumTrack.find(function(e) { return e.level === level; });
    if (!entry) return false;
    bp.claimedPremium.push(level);
    _grantReward(entry.reward);
    WG.Engine.emit('battlepass:claimed', { level: level, track: 'premium', reward: entry.reward });
    return true;
  }

  function _grantReward(reward) {
    if (!reward) return;
    if (reward.coins)    WG.State.grant('coins', reward.coins);
    if (reward.diamonds) WG.State.grant('diamonds', reward.diamonds);
    if (reward.energy && WG.State.grantEnergy) WG.State.grantEnergy(reward.energy, 'pass-reward');
    if (reward.frags) {
      var s = WG.State.get();
      s.forge.craftFragments = (s.forge.craftFragments || 0) + reward.frags;
      WG.Engine.emit('currency:change', { currency: 'frags', value: s.forge.craftFragments, delta: reward.frags });
    }
  }

  // ─── Concern E: Battle Pass Modal UI ──────────────────────────────────────
  function _rewardIcon(reward) {
    if (!reward) return '';
    if (reward.diamonds) return '💎' + reward.diamonds;
    if (reward.coins)    return '🪙' + reward.coins;
    if (reward.energy)   return '⚡' + reward.energy;
    if (reward.frags)    return '🔷' + reward.frags;
    return '🎁';
  }

  function _injectPassStyle() {
    if (document.getElementById('wg-pass-style')) return;
    var s = document.createElement('style');
    s.id = 'wg-pass-style';
    s.textContent = [
      '@keyframes passCellPulse{0%,100%{box-shadow:0 0 3px rgba(200,160,80,0.4);}50%{box-shadow:0 0 8px rgba(200,160,80,0.8);}}',
      '@keyframes passLevelUp{0%{transform:scale(1);}50%{transform:scale(1.12);}100%{transform:scale(1);}}'
    ].join('');
    document.head.appendChild(s);
  }

  function openModal() {
    _injectPassStyle();
    var existing = document.getElementById('wg-pass-modal');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

    var overlay = document.createElement('div');
    overlay.id = 'wg-pass-modal';
    overlay.className = 'modal-overlay show';
    overlay.style.cssText = 'z-index:120;';

    function render() {
      overlay.innerHTML = '';
      ensureState();
      var bp = WG.State.get().battlePass;
      var season = getSeason();

      var card = document.createElement('div');
      card.className = 'modal-card';
      card.style.cssText = 'width:96%;max-width:400px;max-height:82vh;display:flex;flex-direction:column;padding:0;overflow:hidden;';

      // ── Season banner
      var banner = document.createElement('div');
      banner.style.cssText = 'padding:14px 16px 10px 16px;background:linear-gradient(135deg,#1a0c30,#0c0620);flex:0 0 auto;';

      var seasonTitle = document.createElement('div');
      seasonTitle.style.cssText = 'font-size:16px;color:#c0a8f0;font-weight:800;letter-spacing:2px;text-align:center;';
      seasonTitle.textContent = '🎟 ' + (season ? season.name.toUpperCase() : 'BATTLE PASS');
      banner.appendChild(seasonTitle);

      // Countdown + season dates
      var ms = timeRemaining();
      var daysLeft = Math.ceil(ms / 86400000);
      var subLine = document.createElement('div');
      subLine.style.cssText = 'font-size:10px;color:#8878a8;text-align:center;margin-top:3px;letter-spacing:1px;';
      subLine.textContent = isExpired() ? 'SEASON ENDED' :
        (season ? (season.startDate + ' – ' + season.endDate + '  (' + daysLeft + ' day' + (daysLeft!==1?'s':'') + ' left)') : '');
      banner.appendChild(subLine);

      // XP progress bar
      var xp = bp.xp;
      var lvl = bp.level;
      var xpPerLevel = season ? season.xpPerLevel : 100;
      var maxLevels  = season ? season.levels : 60;
      var xpInLevel  = xp - (lvl - 1) * xpPerLevel;
      var xpPct      = lvl >= maxLevels ? 100 : Math.round((xpInLevel / xpPerLevel) * 100);

      var xpRow = document.createElement('div');
      xpRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:10px;';

      var lvlBadge = document.createElement('div');
      lvlBadge.style.cssText = 'flex:0 0 auto;font-size:12px;font-weight:700;color:#c0a8f0;min-width:28px;text-align:center;';
      lvlBadge.textContent = 'Lv.' + lvl;
      xpRow.appendChild(lvlBadge);

      var xpBarBg = document.createElement('div');
      xpBarBg.style.cssText = 'flex:1;height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;';
      var xpBarFill = document.createElement('div');
      xpBarFill.style.cssText = 'height:100%;border-radius:3px;width:' + xpPct + '%;background:linear-gradient(to right,#7040c0,#c080ff);';
      xpBarBg.appendChild(xpBarFill);
      xpRow.appendChild(xpBarBg);

      var xpLabel = document.createElement('div');
      xpLabel.style.cssText = 'flex:0 0 auto;font-size:10px;color:#8878a8;min-width:60px;text-align:right;';
      xpLabel.textContent = lvl >= maxLevels ? 'MAX' : xpInLevel + ' / ' + xpPerLevel + ' XP';
      xpRow.appendChild(xpLabel);
      banner.appendChild(xpRow);

      card.appendChild(banner);

      // ── Reward track scroll area
      var trackWrap = document.createElement('div');
      trackWrap.style.cssText = 'flex:1;overflow-y:auto;padding:10px 12px 8px 12px;';

      // Track header row
      var trackHdr = document.createElement('div');
      trackHdr.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;align-items:center;';
      var freeLabel = document.createElement('div');
      freeLabel.style.cssText = 'font-size:10px;color:#a89868;letter-spacing:1.5px;font-weight:700;flex:1;';
      freeLabel.textContent = 'FREE';
      var premLabel = document.createElement('div');
      premLabel.style.cssText = 'font-size:10px;letter-spacing:1.5px;font-weight:700;flex:1;text-align:right;' +
        (bp.premium ? 'color:#c080ff;' : 'color:#604888;');
      premLabel.textContent = bp.premium ? 'PREMIUM ✓' : 'PREMIUM (locked)';
      trackHdr.appendChild(freeLabel);
      trackHdr.appendChild(premLabel);
      trackWrap.appendChild(trackHdr);

      if (!season) {
        var noSeason = document.createElement('div');
        noSeason.style.cssText = 'text-align:center;color:#806040;font-size:12px;padding:20px;';
        noSeason.textContent = 'No active season.';
        trackWrap.appendChild(noSeason);
      } else {
        // Build fast-lookup sets
        var freeMap = {};
        season.freeTrack.forEach(function(e) { freeMap[e.level] = e.reward; });
        var premMap = {};
        season.premiumTrack.forEach(function(e) { premMap[e.level] = e.reward; });

        // Render 60 level cells in 6 rows of 10
        var grid = document.createElement('div');
        grid.style.cssText = 'display:grid;grid-template-columns:repeat(10,1fr);gap:4px;';

        for (var lv = 1; lv <= season.levels; lv++) {
          var cell = _buildCell(lv, bp, freeMap, premMap, season);
          grid.appendChild(cell);
        }
        trackWrap.appendChild(grid);
      }
      card.appendChild(trackWrap);

      // ── Premium CTA or footer
      var footer = document.createElement('div');
      footer.style.cssText = 'flex:0 0 auto;padding:10px 14px;border-top:1px solid rgba(255,255,255,0.07);';

      if (!bp.premium && !isExpired()) {
        var ctaBtn = document.createElement('button');
        ctaBtn.style.cssText = 'width:100%;padding:12px;border-radius:8px;border:none;font-size:13px;font-weight:700;letter-spacing:1px;cursor:pointer;background:linear-gradient(135deg,#5030a0,#2a1060);color:#e0c8ff;box-shadow:0 2px 8px rgba(80,48,160,0.5);';
        ctaBtn.textContent = '🔓 UNLOCK PREMIUM TRACK — $9.99';
        ctaBtn.addEventListener('click', function() {
          WG.IAP.purchase('battle_pass_s1').then(function() { render(); });
        });
        footer.appendChild(ctaBtn);
      } else {
        var closeRow = document.createElement('div');
        closeRow.style.cssText = 'display:flex;justify-content:flex-end;';
        var closeBtn = document.createElement('button');
        closeBtn.className = 'btn';
        closeBtn.style.cssText = 'padding:7px 16px;font-size:11px;';
        closeBtn.textContent = 'CLOSE';
        closeBtn.addEventListener('click', function() {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        });
        closeRow.appendChild(closeBtn);
        footer.appendChild(closeRow);
      }
      // Always show close link if premium CTA is showing
      if (!bp.premium && !isExpired()) {
        var closeLink = document.createElement('button');
        closeLink.style.cssText = 'width:100%;margin-top:8px;background:none;border:none;color:#806040;font-size:11px;cursor:pointer;letter-spacing:1px;';
        closeLink.textContent = 'CLOSE';
        closeLink.addEventListener('click', function() {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        });
        footer.appendChild(closeLink);
      }
      card.appendChild(footer);

      overlay.appendChild(card);
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }
      });
    }

    render();
    (document.getElementById('modal-root') || document.body).appendChild(overlay);
  }

  function _buildCell(lv, bp, freeMap, premMap, season) {
    var reached   = bp.level >= lv;
    var freeRwd   = freeMap[lv];
    var premRwd   = premMap[lv];
    var freeClaimed = bp.claimedFree.indexOf(lv) !== -1;
    var premClaimed = bp.claimedPremium.indexOf(lv) !== -1;
    var isCurrentLv = bp.level === lv;

    var cell = document.createElement('div');
    cell.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:1px;padding:2px 1px;border-radius:4px;' +
      (isCurrentLv ? 'border:1px solid #c080ff;background:rgba(192,128,255,0.08);animation:passLevelUp 0.5s ease-out;'
                   : reached ? 'border:1px solid #4a3060;background:rgba(80,48,128,0.2);'
                              : 'border:1px solid #2a1a2a;background:rgba(255,255,255,0.02);');

    var lvLabel = document.createElement('div');
    lvLabel.style.cssText = 'font-size:11px;color:' + (reached ? '#c0a8f0' : '#4a3858') + ';font-weight:700;line-height:1;margin-bottom:1px;';
    lvLabel.textContent = lv;
    cell.appendChild(lvLabel);

    // Free slot
    if (freeRwd) {
      var freeSlot = _buildRewardSlot(freeRwd, reached, freeClaimed, false, function() {
        if (WG.BattlePass.claimFree(lv)) render();
      });
      cell.appendChild(freeSlot);
    } else {
      var freeBlank = document.createElement('div');
      freeBlank.style.cssText = 'width:100%;height:14px;';
      cell.appendChild(freeBlank);
    }

    // Premium slot
    if (premRwd) {
      var canPrem = reached && bp.premium;
      var premSlot = _buildRewardSlot(premRwd, canPrem, premClaimed, !bp.premium, function() {
        if (WG.BattlePass.claimPremium(lv)) render();
      });
      premSlot.style.opacity = bp.premium ? '1' : '0.3';
      cell.appendChild(premSlot);
    } else {
      var premBlank = document.createElement('div');
      premBlank.style.cssText = 'width:100%;height:14px;';
      cell.appendChild(premBlank);
    }

    return cell;
  }

  function _buildRewardSlot(reward, reached, claimed, locked, onClaim) {
    var slot = document.createElement('div');
    slot.style.cssText = 'width:100%;min-height:14px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:11px;cursor:' + (reached && !claimed && !locked ? 'pointer' : 'default') + ';' +
      (claimed  ? 'background:rgba(90,128,64,0.2);color:#5a8040;'
      : reached && !locked ? 'background:rgba(200,160,80,0.15);color:#e0c870;animation:passCellPulse 2s infinite;'
      : 'background:rgba(255,255,255,0.03);color:#3a2840;');
    slot.textContent = claimed ? '✓' : _rewardIcon(reward);
    slot.title = _rewardDesc(reward);
    if (reached && !claimed && !locked) {
      slot.addEventListener('click', function(e) { e.stopPropagation(); onClaim(); });
    }
    return slot;
  }

  function _rewardDesc(reward) {
    if (!reward) return '';
    var parts = [];
    if (reward.coins)    parts.push(reward.coins + ' coins');
    if (reward.diamonds) parts.push(reward.diamonds + ' diamonds');
    if (reward.energy)   parts.push(reward.energy + ' energy');
    if (reward.frags)    parts.push(reward.frags + ' frags');
    return parts.join(', ');
  }

  // Defined here so render() closure in openModal can call it
  var render; // forward reference resolved in openModal scope

  function init() {
    ensureState();
    // Wire iap:purchased to activate premium
    WG.Engine.on('iap:purchased', function(e) {
      if (e && e.sku && e.sku.id === 'battle_pass_s1') {
        var seasonId = e.sku.grants && e.sku.grants.battlePassPremium;
        if (seasonId) setPremium(seasonId);
      }
    });
  }

  window.WG.BattlePass = {
    init, ensureState, addXP, setPremium,
    claimFree, claimPremium, isExpired, timeRemaining, getSeason,
    openModal,
  };
})();
