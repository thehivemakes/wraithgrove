// WG.AllianceChat — local ring-buffer chat, Phase 4 server-sync placeholder
(function(){'use strict';

  const MAX_MSGS    = 50;
  const MAX_LEN     = 200;

  // Slur/spam filter — minimal, expandable
  const _BAD_PATTERNS = [
    /\bhttps?:\/\/\S+/gi,        // URLs
    /\bwww\.\S+/gi,              // bare www
    /\bn[i1][g9]+[e3]r/gi,       // slur
    /\bf+[u*]+c+k+/gi,           // f-word variations
    /\bs+h[i1]+t+/gi,            // s-word
  ];

  // Simulated NPC members with distinct personalities + messages
  const NPC_PERSONAS = {
    npc_kira:  { name: 'KiraBlaze',  color: '#ff6040' },
    npc_sol:   { name: 'Sol_Wraith', color: '#a080ff' },
    npc_mend:  { name: 'Mendrick',   color: '#60c080' },
    npc_vex:   { name: 'VexHunter',  color: '#f0c040' },
    npc_thorn: { name: 'Thornwood',  color: '#80d0a0' },
  };

  // Seed messages seeded on alliance creation — ordered oldest→newest
  const SEED_MSGS = [
    { authorId: 'npc_thorn', text: 'Finally someone made an alliance 🌿 welcome everyone' },
    { authorId: 'npc_kira',  text: 'We did it! Lvl 12 boss finally went down 💀 lets gooo' },
    { authorId: 'npc_sol',   text: 'Anyone need wood? Farmed like 800 last run, got plenty' },
    { authorId: 'npc_mend',  text: 'Stage 8 Nightmare is rough. Anyone want to team up later?' },
    { authorId: 'npc_vex',   text: 'Nice kill counts everyone 🏹 keep pushing the missions' },
  ];

  let _msgs = [];

  function _clean(text) {
    let t = (text || '').trim().slice(0, MAX_LEN);
    for (const p of _BAD_PATTERNS) t = t.replace(p, '***');
    return t;
  }

  function _push(msg) {
    _msgs.push(msg);
    if (_msgs.length > MAX_MSGS) _msgs.splice(0, _msgs.length - MAX_MSGS);
  }

  function _myName() {
    // Use account display name if available, else fallback
    return (window.WG && WG.Account && WG.Account.getDisplayName && WG.Account.getDisplayName())
      || 'You';
  }

  function _myId() {
    return (window.WG && WG.Account && WG.Account.getDeviceId)
      ? WG.Account.getDeviceId()
      : 'local';
  }

  function send(text) {
    const a = window.WG && WG.Alliance && WG.Alliance.get();
    if (!a || !a.id) return { ok: false, reason: 'no_alliance' };
    const cleaned = _clean(text);
    if (!cleaned) return { ok: false, reason: 'empty' };
    const msg = {
      id:        Date.now() + '_' + Math.random().toString(36).slice(2,7),
      authorId:  _myId(),
      authorName: _myName(),
      authorColor: '#f0d890',
      text:      cleaned,
      ts:        Date.now(),
    };
    _push(msg);
    WG.Engine.emit('alliance:msg', msg);
    return { ok: true, msg };
  }

  function recent() { return _msgs.slice(); }

  // Seed fake history when a new alliance is created or joined
  function _seedHistory() {
    _msgs = [];
    const base = Date.now() - 3600000; // messages from ~1h ago
    SEED_MSGS.forEach(function(s, i) {
      const p = NPC_PERSONAS[s.authorId] || { name: s.authorId, color: '#c0a870' };
      _push({
        id:          'seed_' + i,
        authorId:    s.authorId,
        authorName:  p.name,
        authorColor: p.color,
        text:        s.text,
        ts:          base + i * 120000,
      });
    });
  }

  // Occasional NPC chat injection (max 1 per 5 min, only when player is in alliance)
  let _lastNpcMsg = 0;
  const NPC_INTERVAL_MS = 300000; // 5 min
  const NPC_AUTO_MSGS = [
    { authorId: 'npc_kira',  text: 'Who hit the daily mission? Almost there 💪' },
    { authorId: 'npc_sol',   text: 'Sending gift now, check the pool' },
    { authorId: 'npc_mend',  text: 'Good run everyone. Tower floor 18 personal best' },
    { authorId: 'npc_vex',   text: 'anyone wanna do stage 6 together later' },
    { authorId: 'npc_thorn', text: 'MOTD updated — boss assault this weekend!' },
    { authorId: 'npc_kira',  text: 'just cleared stage 10 on nightmare 🔥🔥🔥' },
    { authorId: 'npc_sol',   text: 'we need 8 more stage clears for the daily mission' },
    { authorId: 'npc_mend',  text: 'gifts in the pool, help yourselves' },
  ];
  let _npcMsgIdx = 0;

  function _maybeSendNpcMsg() {
    const a = window.WG && WG.Alliance && WG.Alliance.get();
    if (!a || !a.id) return;
    const now = Date.now();
    if (now - _lastNpcMsg < NPC_INTERVAL_MS) return;
    _lastNpcMsg = now;
    const spec = NPC_AUTO_MSGS[_npcMsgIdx % NPC_AUTO_MSGS.length];
    _npcMsgIdx++;
    const p = NPC_PERSONAS[spec.authorId] || { name: spec.authorId, color: '#c0a870' };
    const msg = {
      id:          'npc_' + now,
      authorId:    spec.authorId,
      authorName:  p.name,
      authorColor: p.color,
      text:        spec.text,
      ts:          now,
    };
    _push(msg);
    WG.Engine.emit('alliance:msg', msg);
  }

  function init() {
    WG.Engine.on('alliance:created', _seedHistory);
    WG.Engine.on('alliance:joined',  _seedHistory);
    // Periodic NPC message tick (every ~30s check, fires at most every 5min)
    setInterval(_maybeSendNpcMsg, 30000);
  }

  window.WG.AllianceChat = { init, send, recent };
})();
