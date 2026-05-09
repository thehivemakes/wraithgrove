// WG.Achievements — long-term achievement track (no daily reset).
// W-Achievements-UI Concerns A + B + C
(function(){'use strict';

  // ─── Concern A: Achievement catalog ───────────────────────────────────────
  const CATALOG = Object.freeze({
    // Kill milestones
    first_blood:        { name: 'First Blood',        desc: 'Defeat your first enemy',          target: 1,     reward: { gold: 50 } },
    hundred_kills:      { name: 'A Hundred Whispers', desc: 'Defeat 100 enemies total',         target: 100,   reward: { gold: 200, gems: 5 } },
    thousand_kills:     { name: 'Echoes Silenced',    desc: 'Defeat 1000 enemies total',        target: 1000,  reward: { gold: 1000, gems: 30 } },
    ten_thousand_kills: { name: 'Wraith Hunter',      desc: 'Defeat 10000 enemies total',       target: 10000, reward: { gold: 5000, gems: 100, frags: 50 } },
    // Stage progression
    stage_3_clear:      { name: 'Past the Bride',     desc: 'Clear Hollow Shrine (Stage 3)',    target: 1,     reward: { gems: 10 } },
    stage_9_clear:      { name: 'Through the Lord',   desc: 'Clear Marrow Hollow (Stage 9)',    target: 1,     reward: { gems: 25, frags: 10 } },
    stage_15_clear:     { name: 'Beyond the Mother',  desc: 'Clear Cradle of Maw (Stage 15)',   target: 1,     reward: { gems: 50, frags: 25, rareMat: 1 } },
    stage_18_clear:     { name: 'Father Felled',      desc: 'Defeat the Wraith Father',         target: 1,     reward: { gems: 200, frags: 100, rareMat: 5 } },
    // Tower Gauntlet
    tower_5:            { name: 'First Ascent',       desc: 'Reach Tower floor 5',              target: 5,     reward: { gold: 300 } },
    tower_25:           { name: 'High Climber',       desc: 'Reach Tower floor 25',             target: 25,    reward: { gems: 75 } },
    tower_50:           { name: 'Spire Walker',       desc: 'Reach Tower floor 50',             target: 50,    reward: { gems: 200, frags: 30 } },
    tower_100:          { name: 'Beyond the Sky',     desc: 'Reach Tower floor 100',            target: 100,   reward: { gems: 1000, rareMat: 10 } },
    // Combo
    combo_25:           { name: 'Drumbeat',           desc: 'Reach 25 combo in a single stage', target: 25,    reward: { gems: 15 } },
    combo_50:           { name: 'Heart of the Hunt',  desc: 'Reach 50 combo in a single stage', target: 50,    reward: { gems: 40 } },
    // Wallet
    spend_10000_gold:   { name: 'Open Coffers',       desc: 'Spend 10000 gold total',           target: 10000, reward: { gems: 20 } },
    // Roster
    unlock_3_chars:     { name: 'Trinity Bound',      desc: 'Unlock 3 characters',              target: 3,     reward: { gems: 50 } },
    unlock_9_chars:     { name: 'Whole Lineage',      desc: 'Unlock all 9 characters',          target: 9,     reward: { gems: 500, rareMat: 5 } },
    // Crafting
    craft_10_relics:    { name: 'Forge Master',       desc: 'Craft 10 relics',                  target: 10,    reward: { frags: 50 } },
    // Duel rank
    duel_rank_silver:   { name: 'Silver Tongue',      desc: 'Reach Silver rank in Duel',        target: 1,     reward: { gems: 25 } },
    duel_rank_gold:     { name: 'Gold Banner',        desc: 'Reach Gold rank in Duel',          target: 1,     reward: { gems: 75 } },
    duel_rank_master:   { name: 'Master of Duels',    desc: 'Reach Master rank',                target: 1,     reward: { gems: 500, rareMat: 3 } },

    // ── W-Content-Pack-V2 additions (+19) ─────────────────────────────────────
    // Hunt grinder — cumulative stage clears
    stage_clears_10:     { name: 'Path Worn',           desc: 'Clear Hunt stages 10 times',        target: 10,    reward: { gold: 300 } },
    stage_clears_25:     { name: 'Hollow Veteran',      desc: 'Clear Hunt stages 25 times',        target: 25,    reward: { gold: 800, gems: 20 } },
    stage_clears_50:     { name: 'The Tireless',        desc: 'Clear Hunt stages 50 times',        target: 50,    reward: { gold: 2000, gems: 75, frags: 30 } },
    // Tower climber — cumulative floors across all runs
    tower_floors_50:     { name: 'Stair Walker',        desc: 'Climb 50 total Tower floors',       target: 50,    reward: { gems: 40 } },
    tower_floors_100:    { name: 'The Long Ascent',     desc: 'Climb 100 total Tower floors',      target: 100,   reward: { gems: 100, frags: 15 } },
    tower_floors_200:    { name: 'Pillar of the Spire', desc: 'Climb 200 total Tower floors',      target: 200,   reward: { gems: 250, rareMat: 2 } },
    // Alliance loyal — consecutive days in an alliance
    alliance_days_5:     { name: 'Bonded',              desc: 'Stay in an alliance for 5 days',    target: 5,     reward: { gems: 25 } },
    alliance_days_15:    { name: 'Steadfast',           desc: 'Stay in an alliance for 15 days',   target: 15,    reward: { gems: 75, frags: 10 } },
    alliance_days_30:    { name: 'Iron Compact',        desc: 'Stay in an alliance for 30 days',   target: 30,    reward: { gems: 200, rareMat: 1 } },
    // Kill milestones (deeper)
    kills_5000:          { name: 'Harvest',             desc: 'Defeat 5,000 enemies total',        target: 5000,  reward: { gold: 2500, gems: 60 } },
    kills_25000:         { name: 'The Culling',         desc: 'Defeat 25,000 enemies total',       target: 25000, reward: { gold: 10000, gems: 250, frags: 100 } },
    // Combo
    combo_100:           { name: 'Fury Unbound',        desc: 'Reach 100 combo in a single stage', target: 100,   reward: { gems: 100, frags: 15 } },
    // Craft
    craft_50_relics:     { name: 'The Collector',       desc: 'Craft 50 relics',                   target: 50,    reward: { frags: 100, rareMat: 1 } },
    craft_100_relics:    { name: 'The Hoarder',         desc: 'Craft 100 relics',                  target: 100,   reward: { gems: 200, frags: 200, rareMat: 3 } },
    // Wallet whale-tier
    spend_50000_gold:    { name: 'Empty Coffers',       desc: 'Spend 50,000 gold total',           target: 50000, reward: { gems: 60, frags: 20 } },
    spend_250000_gold:   { name: 'Gold River',          desc: 'Spend 250,000 gold total',          target: 250000,reward: { gems: 200, rareMat: 2 } },
    // Duel milestones
    duel_wins_50:        { name: 'Duelist',             desc: 'Win 50 Duel matches',               target: 50,    reward: { gems: 50, frags: 10 } },
    duel_wins_100:       { name: 'Champion of the Arena',desc: 'Win 100 Duel matches',             target: 100,   reward: { gems: 150, rareMat: 1 } },
    duel_rank_grandmaster:{ name: 'Unbroken Crown',     desc: 'Reach Grandmaster rank',            target: 1,     reward: { gems: 1000, rareMat: 5, frags: 200 } },
  });
  // 40 achievements; catalog frozen — edit constants here only.

  function ensureState() {
    var s = WG.State.get();
    if (!s.achievements) s.achievements = {};
    var ids = Object.keys(CATALOG);
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      if (!s.achievements[id]) {
        s.achievements[id] = { progress: 0, unlockedAt: null, claimed: false };
      }
    }
  }

  function _tracker(id) {
    return WG.State.get().achievements[id];
  }

  // ─── Concern B: Tracking + state ──────────────────────────────────────────

  function _grantReward(reward) {
    if (!reward) return;
    // gold → coins currency
    if (reward.gold)    WG.State.grant('coins', reward.gold);
    if (reward.gems)    WG.State.grant('gems', reward.gems);
    if (reward.frags) {
      var s = WG.State.get();
      s.forge.craftFragments = (s.forge.craftFragments || 0) + reward.frags;
      WG.Engine.emit('currency:change', { currency: 'frags', value: s.forge.craftFragments, delta: reward.frags });
    }
    if (reward.rareMat) {
      var s2 = WG.State.get();
      s2.forge.rareMaterials = (s2.forge.rareMaterials || 0) + reward.rareMat;
    }
  }

  function _showToast(name) {
    var existing = document.getElementById('wg-ach-toast');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

    var t = document.createElement('div');
    t.id = 'wg-ach-toast';
    t.textContent = '🏆 ACHIEVEMENT: ' + name;
    t.style.cssText = [
      'position:fixed;bottom:80px;left:50%;transform:translateX(-50%)',
      'background:linear-gradient(to bottom,#3a2808,#1a1004)',
      'border:1px solid #c8a030;border-radius:8px',
      'color:#f0d870;font-size:12px;font-weight:700;letter-spacing:1.5px',
      'padding:10px 18px;z-index:250;white-space:nowrap',
      'box-shadow:0 4px 16px rgba(0,0,0,0.7),0 0 12px rgba(200,160,48,0.3)',
      'animation:wgAchToast 3.2s ease-out forwards',
      'pointer-events:none',
    ].join(';');

    if (!document.getElementById('wg-ach-style')) {
      var st = document.createElement('style');
      st.id = 'wg-ach-style';
      st.textContent = [
        '@keyframes wgAchToast{',
        '0%{opacity:0;transform:translateX(-50%) translateY(12px)}',
        '15%{opacity:1;transform:translateX(-50%) translateY(0)}',
        '70%{opacity:1}',
        '100%{opacity:0;transform:translateX(-50%) translateY(-8px)}',
        '}',
        '@keyframes wgAchClaim{0%,100%{box-shadow:0 0 4px #c8d87880;}50%{box-shadow:0 0 10px #c8d878cc;}}',
      ].join('');
      document.head.appendChild(st);
    }

    (document.getElementById('modal-root') || document.body).appendChild(t);
    setTimeout(function() { if (t.parentNode) t.parentNode.removeChild(t); }, 3300);
  }

  // Mark an achievement reached (progress at target, timestamp set).
  // Does NOT grant reward — player must tap CLAIM.
  function _unlock(id) {
    var t = _tracker(id);
    if (!t || t.unlockedAt) return; // already unlocked
    t.unlockedAt = Date.now();
    WG.Engine.emit('achievement:unlocked', { id: id, name: CATALOG[id].name });
    _showToast(CATALOG[id].name);
  }

  // Add `amount` to a cumulative achievement, cap at target, unlock if complete.
  function _add(id, amount) {
    ensureState();
    var t = _tracker(id);
    if (!t || t.unlockedAt) return; // already done
    var def = CATALOG[id];
    var prev = t.progress;
    t.progress = Math.min(t.progress + (amount || 1), def.target);
    if (t.progress !== prev && t.progress >= def.target) _unlock(id);
  }

  // Set progress to at least `val` (for peak-based: floor reached, combo hit, char count).
  function _setAtLeast(id, val) {
    ensureState();
    var t = _tracker(id);
    if (!t || t.unlockedAt) return;
    var def = CATALOG[id];
    if (val > t.progress) {
      t.progress = Math.min(val, def.target);
      if (t.progress >= def.target) _unlock(id);
    }
  }

  function claim(id) {
    ensureState();
    var t = _tracker(id);
    if (!t) return false;
    if (!t.unlockedAt) return false;
    if (t.claimed) return false;
    t.claimed = true;
    _grantReward(CATALOG[id].reward);
    WG.Engine.emit('achievement:claimed', { id: id, reward: CATALOG[id].reward });
    return true;
  }

  // Seed achievements from current state on first init (for players already past thresholds).
  function _checkOnInit() {
    var s = WG.State.get();
    var p = s.player;

    // Stage clears — highestStageCleared records the highest stageId cleared
    var hsc = p.highestStageCleared || 0;
    if (hsc >= 3)  _setAtLeast('stage_3_clear', 1);
    if (hsc >= 9)  _setAtLeast('stage_9_clear', 1);
    if (hsc >= 15) _setAtLeast('stage_15_clear', 1);
    if (hsc >= 18) _setAtLeast('stage_18_clear', 1);

    // Tower peak floor
    var peak = (s.towerProgress && s.towerProgress.peakFloor) || 0;
    _setAtLeast('tower_5',   Math.min(peak, 5));
    _setAtLeast('tower_25',  Math.min(peak, 25));
    _setAtLeast('tower_50',  Math.min(peak, 50));
    _setAtLeast('tower_100', Math.min(peak, 100));

    // Character count
    var ownedCount = (p.ownedCharacters || []).length;
    _setAtLeast('unlock_3_chars', Math.min(ownedCount, 3));
    _setAtLeast('unlock_9_chars', Math.min(ownedCount, 9));

    // Duel rank
    var RANK_ORDER = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster'];
    var rankIdx = RANK_ORDER.indexOf(s.duel.rank || 'bronze');
    if (rankIdx >= 1) _setAtLeast('duel_rank_silver', 1);
    if (rankIdx >= 2) _setAtLeast('duel_rank_gold', 1);
    if (rankIdx >= 5) _setAtLeast('duel_rank_master', 1);
    if (rankIdx >= 6) _setAtLeast('duel_rank_grandmaster', 1);

    // Tower cumulative floors (seed from saved total if present)
    var totalFloors = (s.towerProgress && s.towerProgress.totalFloors) || 0;
    _setAtLeast('tower_floors_50',  Math.min(totalFloors, 50));
    _setAtLeast('tower_floors_100', Math.min(totalFloors, 100));
    _setAtLeast('tower_floors_200', Math.min(totalFloors, 200));
  }

  function _wireEvents() {
    var eng = WG.Engine;

    // Kill milestones
    eng.on('enemy:killed', function() {
      _add('first_blood', 1);
      _add('hundred_kills', 1);
      _add('thousand_kills', 1);
      _add('ten_thousand_kills', 1);
      _add('kills_5000', 1);
      _add('kills_25000', 1);
    });

    // Stage clear — check specific stageId from event payload
    eng.on('hunt:stage-cleared', function(e) {
      var id = e && e.stageId;
      if (!id) return;
      if (id >= 3)  _setAtLeast('stage_3_clear', 1);
      if (id >= 9)  _setAtLeast('stage_9_clear', 1);
      if (id >= 15) _setAtLeast('stage_15_clear', 1);
      if (id >= 18) _setAtLeast('stage_18_clear', 1);
      // cumulative stage clear counter
      _add('stage_clears_10', 1);
      _add('stage_clears_25', 1);
      _add('stage_clears_50', 1);
    });

    // Tower floor — check peak floor in this run vs achievement targets
    eng.on('tower:floor-start', function(e) {
      var floor = e && e.floor;
      if (!floor) return;
      _setAtLeast('tower_5',   Math.min(floor, 5));
      _setAtLeast('tower_25',  Math.min(floor, 25));
      _setAtLeast('tower_50',  Math.min(floor, 50));
      _setAtLeast('tower_100', Math.min(floor, 100));
      // cumulative floor climbed (each floor-start = 1 floor entered)
      _add('tower_floors_50',  1);
      _add('tower_floors_100', 1);
      _add('tower_floors_200', 1);
    });

    // Combo — combo:step payload is { count } (current in-run combo length)
    eng.on('combo:step', function(e) {
      var count = e && e.count;
      if (!count) return;
      _setAtLeast('combo_25',  Math.min(count, 25));
      _setAtLeast('combo_50',  Math.min(count, 50));
      _setAtLeast('combo_100', Math.min(count, 100));
    });

    // Gold (coins) spent — currency:change emits negative delta on spend
    eng.on('currency:change', function(e) {
      if (e && e.currency === 'coins' && e.delta < 0) {
        _add('spend_10000_gold',  -e.delta);
        _add('spend_50000_gold',  -e.delta);
        _add('spend_250000_gold', -e.delta);
      }
    });

    // Character unlocked — read ownedCharacters.length from state
    eng.on('character:unlocked', function() {
      var owned = (WG.State.get().player.ownedCharacters || []).length;
      _setAtLeast('unlock_3_chars', Math.min(owned, 3));
      _setAtLeast('unlock_9_chars', Math.min(owned, 9));
    });

    // Craft — each forge:craft-batch = 10 crafts
    eng.on('forge:craft-batch', function() {
      _add('craft_10_relics',  10);
      _add('craft_50_relics',  10);
      _add('craft_100_relics', 10);
    });

    // Duel rank tier reached
    eng.on('duel:rank-change', function(e) {
      var rankId = e && e.rank && e.rank.id;
      var RANK_ORDER = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster'];
      var idx = RANK_ORDER.indexOf(rankId);
      if (idx >= 1) _setAtLeast('duel_rank_silver', 1);
      if (idx >= 2) _setAtLeast('duel_rank_gold', 1);
      if (idx >= 5) _setAtLeast('duel_rank_master', 1);
      if (idx >= 6) _setAtLeast('duel_rank_grandmaster', 1);
    });

    // Duel wins
    eng.on('duel:match-result', function(e) {
      if (e && e.won) {
        _add('duel_wins_50',  1);
        _add('duel_wins_100', 1);
      }
    });

    // Alliance membership days — fires daily while in an alliance
    eng.on('alliance:day-counted', function() {
      _add('alliance_days_5',  1);
      _add('alliance_days_15', 1);
      _add('alliance_days_30', 1);
    });
  }

  // ─── Concern C: Achievements modal ────────────────────────────────────────

  function _rewardLine(reward) {
    var parts = [];
    if (reward.gold)    parts.push('+' + reward.gold + '🪙');
    if (reward.gems)    parts.push('+' + reward.gems + '💜');
    if (reward.frags)   parts.push('+' + reward.frags + '🔷');
    if (reward.rareMat) parts.push('+' + reward.rareMat + '⭐');
    return parts.join('  ');
  }

  function _categoryIcon(id) {
    if (id.indexOf('kill') !== -1 || id === 'first_blood' || id.indexOf('kills_') === 0) return '⚔';
    if (id.indexOf('stage') !== -1) return '🏆';
    if (id.indexOf('tower') !== -1) return '🗼';
    if (id.indexOf('combo') !== -1) return '🔥';
    if (id.indexOf('spend') !== -1) return '💰';
    if (id.indexOf('unlock') !== -1 || id.indexOf('char') !== -1) return '👤';
    if (id.indexOf('craft') !== -1) return '🔨';
    if (id.indexOf('duel') !== -1) return '🥊';
    if (id.indexOf('alliance') !== -1) return '🤝';
    return '📋';
  }

  function openModal() {
    var existing = document.getElementById('wg-ach-modal');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

    ensureState();

    var overlay = document.createElement('div');
    overlay.id = 'wg-ach-modal';
    overlay.className = 'modal-overlay show';
    overlay.style.cssText = 'z-index:120;';

    function render() {
      overlay.innerHTML = '';
      var card = document.createElement('div');
      card.className = 'modal-card';
      card.style.cssText = 'width:92%;max-width:380px;max-height:84vh;display:flex;flex-direction:column;padding:0;overflow:hidden;';

      // ── Header
      var ids = Object.keys(CATALOG);
      var unlocked = ids.filter(function(id) { return !!_tracker(id) && !!_tracker(id).unlockedAt; }).length;
      var claimable = ids.filter(function(id) { var t = _tracker(id); return t && t.unlockedAt && !t.claimed; }).length;

      var hdr = document.createElement('div');
      hdr.style.cssText = 'padding:14px 16px 10px 16px;flex:0 0 auto;border-bottom:1px solid rgba(255,255,255,0.07);';

      var titleRow = document.createElement('div');
      titleRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';
      var title = document.createElement('div');
      title.style.cssText = 'font-size:15px;color:#f0d890;font-weight:700;letter-spacing:2px;';
      title.textContent = 'ACHIEVEMENTS';
      var counter = document.createElement('div');
      counter.style.cssText = 'font-size:11px;color:#a08858;';
      counter.textContent = unlocked + ' / ' + ids.length + ' unlocked';
      titleRow.appendChild(title);
      titleRow.appendChild(counter);
      hdr.appendChild(titleRow);

      if (claimable > 0) {
        var claimBanner = document.createElement('div');
        claimBanner.style.cssText = 'margin-top:8px;font-size:10px;color:#a8d878;letter-spacing:1px;';
        claimBanner.textContent = claimable + ' reward' + (claimable > 1 ? 's' : '') + ' ready to claim';
        hdr.appendChild(claimBanner);
      }
      card.appendChild(hdr);

      // ── List
      var list = document.createElement('div');
      list.style.cssText = 'flex:1;overflow-y:auto;padding:4px 10px 8px 10px;';

      ids.forEach(function(id) {
        var def = CATALOG[id];
        var t = _tracker(id) || { progress: 0, unlockedAt: null, claimed: false };
        var pct = Math.min(1, t.progress / def.target);
        var isUnlocked = !!t.unlockedAt;
        var isClaimed = t.claimed;

        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 2px;border-bottom:1px solid rgba(255,255,255,0.05);';

        // Icon
        var icon = document.createElement('div');
        icon.style.cssText = [
          'flex:0 0 34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;',
          isUnlocked ? 'background:rgba(168,216,120,0.12);border:1px solid rgba(168,216,120,0.3);'
                     : 'background:rgba(255,255,255,0.04);border:1px solid #2a1c10;',
        ].join('');
        icon.textContent = _categoryIcon(id);
        row.appendChild(icon);

        // Middle: name + desc + bar + progress
        var mid = document.createElement('div');
        mid.style.cssText = 'flex:1;min-width:0;';

        var nameEl = document.createElement('div');
        nameEl.style.cssText = 'font-size:12px;font-weight:700;letter-spacing:0.5px;margin-bottom:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;' +
          (isClaimed ? 'color:#5a4a30;' : isUnlocked ? 'color:#f0d890;' : 'color:#c0a868;');
        nameEl.textContent = def.name;
        mid.appendChild(nameEl);

        var descEl = document.createElement('div');
        descEl.style.cssText = 'font-size:10px;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;' +
          (isClaimed ? 'color:#4a3820;' : 'color:#806848;');
        descEl.textContent = def.desc;
        mid.appendChild(descEl);

        var barBg = document.createElement('div');
        barBg.style.cssText = 'height:3px;background:rgba(255,255,255,0.07);border-radius:2px;overflow:hidden;';
        var barFill = document.createElement('div');
        barFill.style.cssText = 'height:100%;border-radius:2px;width:' + Math.round(pct * 100) + '%;' +
          (isClaimed ? 'background:#5a4a30;'
                     : isUnlocked ? 'background:#a8d878;box-shadow:0 0 4px #a8d87880;'
                                  : 'background:#806020;');
        barBg.appendChild(barFill);
        mid.appendChild(barBg);

        var progEl = document.createElement('div');
        progEl.style.cssText = 'font-size:9px;color:#6a5840;margin-top:2px;';
        if (def.target === 1) {
          progEl.textContent = isUnlocked ? 'Complete' : 'Incomplete';
        } else {
          progEl.textContent = Math.min(t.progress, def.target).toLocaleString() + ' / ' + def.target.toLocaleString();
        }
        mid.appendChild(progEl);
        row.appendChild(mid);

        // Right: reward + claim
        var right = document.createElement('div');
        right.style.cssText = 'flex:0 0 auto;display:flex;flex-direction:column;align-items:flex-end;gap:4px;min-width:54px;';

        var rwdEl = document.createElement('div');
        rwdEl.style.cssText = 'font-size:9px;color:#c8a868;text-align:right;line-height:1.5;white-space:nowrap;';
        rwdEl.textContent = _rewardLine(def.reward);
        right.appendChild(rwdEl);

        if (isClaimed) {
          var done = document.createElement('div');
          done.style.cssText = 'font-size:13px;color:#5a8040;font-weight:700;padding:2px 4px;';
          done.textContent = '✓';
          right.appendChild(done);
        } else if (isUnlocked) {
          var btn = document.createElement('button');
          btn.textContent = 'CLAIM';
          btn.style.cssText = 'padding:5px 8px;border-radius:5px;font-size:9px;font-weight:700;letter-spacing:0.5px;border:none;cursor:pointer;' +
            'background:linear-gradient(to bottom,#a8d878,#5a9030);color:#0a1808;animation:wgAchClaim 1.8s infinite;';
          btn.addEventListener('click', function() {
            if (claim(id)) render();
          });
          right.appendChild(btn);
        } else {
          var locked = document.createElement('div');
          locked.style.cssText = 'font-size:10px;color:#4a3820;padding:4px 2px;';
          locked.textContent = '🔒';
          right.appendChild(locked);
        }

        row.appendChild(right);
        list.appendChild(row);
      });

      card.appendChild(list);

      // ── Footer
      var footer = document.createElement('div');
      footer.style.cssText = 'flex:0 0 auto;padding:10px 14px;display:flex;justify-content:flex-end;border-top:1px solid rgba(255,255,255,0.06);';
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
    }

    render();
    (document.getElementById('modal-root') || document.body).appendChild(overlay);
  }

  // ─── Init ──────────────────────────────────────────────────────────────────

  function init() {
    ensureState();
    _checkOnInit();
    _wireEvents();
  }

  window.WG.Achievements = {
    CATALOG,
    init,
    claim,
    openModal,
    ensureState,
  };
})();
