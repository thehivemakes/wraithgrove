// WG.AllianceRecruitment — alliance browser, filter, apply, leader inbox, auto-accept
(function(){'use strict';

  var LANGUAGES = ['EN', 'JP', 'KR', 'ES'];

  function _lcg(seed) {
    var s = (seed | 0) >>> 0;
    return function() {
      s = (Math.imul(s, 1664525) + 1013904223) | 0;
      return (s >>> 0) / 0xffffffff;
    };
  }

  var _enriched = null; // cached enriched alliance list (module-scope, derived from seeds)

  function _buildEnriched() {
    if (_enriched) return _enriched;
    var alliances = (window.WG && WG.LeaderboardSeeds && WG.LeaderboardSeeds.getAlliances)
      ? WG.LeaderboardSeeds.getAlliances() : [];
    var players = (window.WG && WG.LeaderboardSeeds && WG.LeaderboardSeeds.getPlayers)
      ? WG.LeaderboardSeeds.getPlayers() : [];
    var r = _lcg(0xF1A4C3B2);

    _enriched = alliances.map(function(a, idx) {
      var members = a.memberIds.map(function(id) {
        return players.find(function(p) { return p.id === id; });
      }).filter(Boolean);

      var cumulativePower = members.reduce(function(sum, p) { return sum + (p.power || 0); }, 0);
      var avgPower = members.length ? Math.round(cumulativePower / members.length) : 0;

      var tier;
      if (avgPower < 800)       tier = 'rookie';
      else if (avgPower < 2000) tier = 'mid';
      else if (avgPower < 5000) tier = 'elite';
      else                      tier = 'whale-tier';

      var roll = r();
      var recruitThreshold;
      if (roll < 0.40) {
        recruitThreshold = { type: 'open' };
      } else if (roll < 0.80) {
        var minP = Math.max(100, Math.round(avgPower * 0.65 / 100) * 100);
        recruitThreshold = { type: 'minPower', value: minP };
      } else {
        recruitThreshold = { type: 'closed' };
      }

      return {
        id:               a.id,
        name:             a.name,
        banner:           a.banner,
        memberCount:      a.memberCount,
        memberIds:        a.memberIds.slice(),
        memberCap:        30,
        cumulativePower:  cumulativePower,
        avgPower:         avgPower,
        cumulativeDamage: a.cumulativeDamage,
        tier:             tier,
        recruitThreshold: recruitThreshold,
        language:         LANGUAGES[idx % LANGUAGES.length],
        applications:     [], // in-memory transparency log
      };
    });

    return _enriched;
  }

  function _ensureState() {
    var s = WG.State.get();
    if (!s.allianceRecruitment) {
      s.allianceRecruitment = {
        pendingApplicants:  [],  // NPCs applying to player's own alliance
        autoAcceptMinPower: 0,
        sentApplicationId:  null,
      };
    }
    return s.allianceRecruitment;
  }

  // ── Browse / filter ───────────────────────────────────────────────────────────

  function getEnrichedAlliances() { return _buildEnriched(); }

  function browse(filters) {
    var list = _buildEnriched().slice();
    filters = filters || {};

    if (filters.openOnly) {
      list = list.filter(function(a) { return a.recruitThreshold.type !== 'closed'; });
    }
    if (filters.tier) {
      list = list.filter(function(a) { return a.tier === filters.tier; });
    }
    if (filters.language) {
      list = list.filter(function(a) { return a.language === filters.language; });
    }
    if (typeof filters.minPower === 'number') {
      list = list.filter(function(a) {
        if (a.recruitThreshold.type === 'closed') return false;
        if (a.recruitThreshold.type === 'open')   return true;
        return filters.minPower >= a.recruitThreshold.value;
      });
    }
    return list;
  }

  // ── Apply ─────────────────────────────────────────────────────────────────────

  function apply(allianceId) {
    var a = WG.Alliance && WG.Alliance.get();
    if (a && a.id) return { ok: false, reason: 'already_in_alliance' };

    var target = _buildEnriched().find(function(al) { return al.id === allianceId; });
    if (!target) return { ok: false, reason: 'not_found' };
    if (target.recruitThreshold.type === 'closed') return { ok: false, reason: 'closed' };

    var myPower = (WG.State && WG.State.recomputePower) ? WG.State.recomputePower() : 0;
    if (target.recruitThreshold.type === 'minPower' && myPower < target.recruitThreshold.value) {
      return { ok: false, reason: 'power_too_low', required: target.recruitThreshold.value };
    }

    // Record on the enriched alliance (in-memory transparency log)
    target.applications.push({ applicantId: 'local', ts: Date.now(), status: 'accepted' });

    // Seed alliances auto-accept — set state directly (seed alliances use sa_NN ids, not fa_N)
    var as = WG.State.get().alliance;
    as.id         = target.id;
    as.name       = target.name;
    as.banner     = target.banner;
    as.leaderId   = target.memberIds[0] || ('seed_leader_' + target.id);
    as.officerIds = target.memberIds.slice(1, 2);
    as.memberIds  = ['local'].concat(target.memberIds.slice(0, 7));
    as.memberCap  = target.memberCap;
    as.giftPool   = Math.floor(target.memberCount * 0.5);
    as.msgOfDay   = 'Welcome to ' + target.name + '!';
    as.points     = as.points || 0;

    WG.Engine.emit('recruitment:applied', { allianceId: allianceId, name: target.name });
    WG.Engine.emit('alliance:joined',     { id: as.id, name: as.name });
    WG.Engine.emit('alliance:changed',    {});
    if (WG.Cache && WG.Cache.save) WG.Cache.save();
    return { ok: true };
  }

  // ── Leader inbox ──────────────────────────────────────────────────────────────

  function getApplications() {
    return _ensureState().pendingApplicants || [];
  }

  function acceptApplicant(applicantId) {
    var rs = _ensureState();
    var a  = WG.Alliance && WG.Alliance.get();
    if (!a || !a.id) return { ok: false, reason: 'no_alliance' };
    if ((a.memberIds || []).length >= (a.memberCap || 30)) return { ok: false, reason: 'at_capacity' };

    var idx = rs.pendingApplicants.findIndex(function(ap) { return ap.applicantId === applicantId; });
    if (idx < 0) return { ok: false, reason: 'not_found' };

    var ap = rs.pendingApplicants.splice(idx, 1)[0];
    if (!a.memberIds.includes(ap.applicantId)) a.memberIds.push(ap.applicantId);

    WG.Engine.emit('alliance:member-joined', { memberId: ap.applicantId, name: ap.name });
    WG.Engine.emit('alliance:changed', {});
    if (WG.Cache && WG.Cache.save) WG.Cache.save();
    return { ok: true, name: ap.name };
  }

  function rejectApplicant(applicantId) {
    var rs  = _ensureState();
    var idx = rs.pendingApplicants.findIndex(function(ap) { return ap.applicantId === applicantId; });
    if (idx < 0) return { ok: false, reason: 'not_found' };
    rs.pendingApplicants.splice(idx, 1);
    if (WG.Cache && WG.Cache.save) WG.Cache.save();
    return { ok: true };
  }

  // ── Auto-accept threshold ─────────────────────────────────────────────────────

  function setAutoAcceptMinPower(value) {
    var rs = _ensureState();
    rs.autoAcceptMinPower = Math.max(0, (value | 0));
    _runAutoAccept();
    if (WG.Cache && WG.Cache.save) WG.Cache.save();
  }

  function getAutoAcceptMinPower() {
    return _ensureState().autoAcceptMinPower || 0;
  }

  function _runAutoAccept() {
    var rs = _ensureState();
    if (!rs.autoAcceptMinPower) return;
    var a  = WG.Alliance && WG.Alliance.get();
    if (!a || !a.id) return;
    var myId = (window.WG && WG.Account && WG.Account.getDeviceId) ? WG.Account.getDeviceId() : 'local';
    if (a.leaderId !== myId && !(a.officerIds || []).includes(myId)) return;

    rs.pendingApplicants = rs.pendingApplicants.filter(function(ap) {
      if (ap.power >= rs.autoAcceptMinPower) {
        if ((a.memberIds || []).length < (a.memberCap || 30) && !a.memberIds.includes(ap.applicantId)) {
          a.memberIds.push(ap.applicantId);
          WG.Engine.emit('alliance:member-joined', { memberId: ap.applicantId, name: ap.name, autoAccepted: true });
          WG.Engine.emit('alliance:changed', {});
        }
        return false; // consumed
      }
      return true;
    });
  }

  // ── Simulated NPC applicants (demo) ──────────────────────────────────────────

  function _seedNPCApplicant() {
    var rs = _ensureState();
    var a  = WG.Alliance && WG.Alliance.get();
    if (!a || !a.id) return;
    var myId = (window.WG && WG.Account && WG.Account.getDeviceId) ? WG.Account.getDeviceId() : 'local';
    if (a.leaderId !== myId) return; // player must be leader
    if (rs.pendingApplicants.length >= 5) return;

    var allPlayers = (window.WG && WG.LeaderboardSeeds && WG.LeaderboardSeeds.getPlayers)
      ? WG.LeaderboardSeeds.getPlayers() : [];
    var used = rs.pendingApplicants.map(function(ap) { return ap.applicantId; });
    var pool = allPlayers.filter(function(p) {
      return !p.allianceId && !used.includes(p.id) && !a.memberIds.includes(p.id);
    });
    if (!pool.length) return;

    var p  = pool[Math.floor(Math.random() * pool.length)];
    var ap = {
      applicantId: p.id,
      name:        p.name,
      power:       p.power,
      character:   p.character,
      lastActive:  Date.now() - Math.floor(Math.random() * 7200000),
    };
    rs.pendingApplicants.push(ap);
    _runAutoAccept();
    WG.Engine.emit('recruitment:application-received', ap);
    if (WG.Cache && WG.Cache.save) WG.Cache.save();
  }

  function _isAllianceTabActive() {
    return WG.State && WG.State.get && WG.State.get().activeTab === 'alliance';
  }

  function init() {
    _ensureState();
    _buildEnriched(); // warm cache

    WG.Engine.on('alliance:created', function() {
      // Seed 2 simulated applicants for immediate demo feel
      setTimeout(function() {
        _seedNPCApplicant();
        setTimeout(_seedNPCApplicant, 3200);
      }, 900);
    });

    WG.Engine.on('recruitment:application-received', function() {
      if (_isAllianceTabActive() && window.WG && WG.AllianceRender) WG.AllianceRender.refresh();
    });
  }

  window.WG.AllianceRecruitment = {
    init, getEnrichedAlliances, browse,
    apply, getApplications, acceptApplicant, rejectApplicant,
    setAutoAcceptMinPower, getAutoAcceptMinPower,
  };
}());
