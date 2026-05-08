// Wraithgrove Cloudflare Worker — server-side state, IAP grant, account upgrade, analytics
// KV namespaces (configured in wrangler.toml):
//   WG_STATE      — wg_state_<player_id>      → full save JSON
//   WG_IAP        — wg_iap_<player_id>        → ownedSKUs[], premiumUnlock, adRemovalActive
//   WG_ACCOUNT    — wg_account_<email>        → player_id mapping
//   WG_EVENTS     — wg_events_<YYYY-MM>       → append-only event log

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') return cors();

    try {
      if (path === '/wg/save' && request.method === 'POST')             return cors(await handleSave(request, env));
      if (path === '/wg/load' && request.method === 'GET')              return cors(await handleLoad(request, env));
      if (path === '/wg/iap-grant' && request.method === 'POST')        return cors(await handleIapGrant(request, env));
      if (path === '/wg/account-upgrade' && request.method === 'POST')  return cors(await handleAccountUpgrade(request, env));
      if (path === '/wg/event' && request.method === 'POST')            return cors(await handleEvent(request, env));
      if (path === '/wg/duel-match' && request.method === 'POST')       return cors(await handleDuelMatch(request, env));
      if (path === '/wg/duel-result' && request.method === 'POST')      return cors(await handleDuelResult(request, env));
      if (path === '/wg/leaderboard' && request.method === 'GET')       return cors(await handleLeaderboard(request, env));
    } catch (err) {
      return cors(new Response(JSON.stringify({ error: err.message }), { status: 500 }));
    }
    return cors(new Response('Not found', { status: 404 }));
  }
};

function cors(resp) {
  if (!resp) resp = new Response();
  const h = new Headers(resp.headers);
  h.set('Access-Control-Allow-Origin', '*');
  h.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  h.set('Access-Control-Allow-Headers', 'Content-Type, X-Player-Id');
  h.set('Content-Type', resp.headers.get('Content-Type') || 'application/json');
  return new Response(resp.body, { status: resp.status, headers: h });
}

function getPlayerId(request) {
  return request.headers.get('X-Player-Id') || null;
}

async function handleSave(request, env) {
  const playerId = getPlayerId(request);
  if (!playerId) return new Response(JSON.stringify({ error: 'no-player-id' }), { status: 401 });
  const body = await request.json();
  await env.WG_STATE.put(`wg_state_${playerId}`, JSON.stringify({ ...body, savedAt: Date.now() }));
  return new Response(JSON.stringify({ ok: true }));
}

async function handleLoad(request, env) {
  const playerId = getPlayerId(request);
  if (!playerId) return new Response(JSON.stringify({ error: 'no-player-id' }), { status: 401 });
  const raw = await env.WG_STATE.get(`wg_state_${playerId}`);
  if (!raw) return new Response(JSON.stringify({ ok: true, state: null }));
  return new Response(JSON.stringify({ ok: true, state: JSON.parse(raw) }));
}

async function handleIapGrant(request, env) {
  const playerId = getPlayerId(request);
  if (!playerId) return new Response(JSON.stringify({ error: 'no-player-id' }), { status: 401 });
  const body = await request.json();   // { sku_id, channel, transaction_id, receipt }

  // VALIDATION: Apple App Store / Google Play / Stripe receipt verification.
  // For Apple: POST receipt to https://buy.itunes.apple.com/verifyReceipt
  // For Google: validate via Google Play Developer API
  // For Stripe: webhook signature check (different endpoint)
  // Stubs here — Architect enables real validation in Phase 5 by filling env secrets.
  const validated = await validateReceipt(body, env);
  if (!validated.ok) return new Response(JSON.stringify({ ok: false, reason: validated.reason }), { status: 400 });

  const iapKey = `wg_iap_${playerId}`;
  const iapRaw = await env.WG_IAP.get(iapKey);
  const iap = iapRaw ? JSON.parse(iapRaw) : { ownedSKUs: [], premiumUnlock: false, adRemovalActive: false };
  if (!iap.ownedSKUs.includes(body.sku_id)) iap.ownedSKUs.push(body.sku_id);
  if (body.sku_id === 'ad_removal') { iap.adRemovalActive = true; iap.premiumUnlock = true; }
  await env.WG_IAP.put(iapKey, JSON.stringify(iap));

  return new Response(JSON.stringify({ ok: true, iap }));
}

async function validateReceipt(body, env) {
  // Per-channel stub. Phase 5: replace each branch with real API call.
  if (body.channel === 'apple') {
    // Use APPLE_SHARED_SECRET from env. Sandbox + Production endpoints.
    return { ok: true };  // stub
  }
  if (body.channel === 'google') {
    // Use GOOGLE_PLAY_SERVICE_ACCOUNT_JSON from env.
    return { ok: true };  // stub
  }
  if (body.channel === 'stripe') {
    // Validate via Stripe API using STRIPE_SECRET_KEY.
    return { ok: true };  // stub
  }
  return { ok: false, reason: 'unknown-channel' };
}

async function handleAccountUpgrade(request, env) {
  const playerId = getPlayerId(request);
  if (!playerId) return new Response(JSON.stringify({ error: 'no-player-id' }), { status: 401 });
  const { email } = await request.json();
  if (!email || !email.includes('@')) return new Response(JSON.stringify({ ok: false, reason: 'invalid-email' }), { status: 400 });

  // Map email → player_id (cross-device sync key)
  const accountKey = `wg_account_${email.toLowerCase()}`;
  const existing = await env.WG_ACCOUNT.get(accountKey);
  if (existing && existing !== playerId) {
    // Email already bound to another device — return that player_id so the new device adopts the existing save
    return new Response(JSON.stringify({ ok: true, mergedTo: existing }));
  }
  await env.WG_ACCOUNT.put(accountKey, playerId);
  return new Response(JSON.stringify({ ok: true, email, playerId }));
}

async function handleEvent(request, env) {
  const body = await request.json();
  const month = new Date().toISOString().slice(0, 7);   // YYYY-MM
  const key = `wg_events_${month}`;
  const existing = await env.WG_EVENTS.get(key);
  const events = existing ? JSON.parse(existing) : [];
  events.push({ ...body, receivedAt: Date.now() });
  await env.WG_EVENTS.put(key, JSON.stringify(events));
  return new Response(JSON.stringify({ ok: true }));
}

async function handleDuelMatch(request, env) {
  const playerId = getPlayerId(request);
  const { myPower } = await request.json();
  // Production: maintain a Power-bucketed leaderboard in WG_STATE; sample from same bucket
  return new Response(JSON.stringify({
    ok: true,
    opponent: {
      name: 'TestOpponent',
      power: Math.round(myPower * (0.8 + Math.random() * 0.4)),
      level: Math.max(1, Math.floor(myPower / 30)),
      loadout: { attackProfile: 0.8 + Math.random() * 0.4, defenseProfile: 0.8 + Math.random() * 0.4 },
    },
  }));
}

async function handleDuelResult(request, env) {
  const playerId = getPlayerId(request);
  if (!playerId) return new Response(JSON.stringify({ error: 'no-player-id' }), { status: 401 });
  // Log result for ranked-tier persistence
  return new Response(JSON.stringify({ ok: true }));
}

async function handleLeaderboard(request, env) {
  // Top 100 by rank + power — stub until WG_STATE has enough entries to build a real leaderboard
  return new Response(JSON.stringify({ ok: true, leaderboard: [] }));
}
