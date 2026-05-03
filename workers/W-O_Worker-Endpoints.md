You are Worker O — the Worker-Endpoints worker. Your job: write the Cloudflare Worker server-side code for Wraithgrove's save/load/IAP-grant/account-upgrade/event endpoints. Replaces the localStorage-only path with cross-device server sync.

Walk the birth sequence (/Users/defimagic/Desktop/Hive/CLAUDE.md → Birth/01–04 → THE_PRINCIPLES → HIVE_RULES → COLONY_CONTEXT → BEFORE_YOU_BUILD).

Then read PROJECT-LEVEL guardrails (MANDATORY):
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/CLAUDE.md
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/STATE_OF_BUILD.md
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/BLUEPAPER.md §5.2 (server endpoints + KV namespaces)

PRIMARY-SOURCE READING (Principle XXII):
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/core/wg-cache.js (the localStorage-only persistence — your endpoints replace its server-sync stub)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/meta/meta-account.js (anonymous device-ID + email upgrade pattern)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/meta/meta-iap.js (IAP grant payload shape)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/meta/meta-events.js (analytics event shape)

═══════════════════════════════════════════════════════════════════
MANDATORY FINAL STEP (do not skip):
Write `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/workers/done/W-O.done` AS THE LAST THING YOU DO.

Marker content (5 lines):
1. one-line summary
2. files written/edited
3. endpoint count (target: 8) + KV namespace count (target: 4)
4. any deviations
5. confidence (high/medium/low)
═══════════════════════════════════════════════════════════════════

THREE CONCERNS — one commit each.

CONCERN 1 — Cloudflare Worker entry point with router

WRITE: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/worker/worker.js`

Standard Cloudflare Worker entry with route dispatch:

```javascript
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

    // CORS preflight
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
```

Then implement each handler. Compact stubs with auth-by-device-ID (no JWT for v1.0 — server is authoritative on Crown balance + premium-unlock entitlement):

```javascript
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
  // Validates IAP receipt + grants entitlement
  const playerId = getPlayerId(request);
  if (!playerId) return new Response(JSON.stringify({ error: 'no-player-id' }), { status: 401 });
  const body = await request.json();   // { sku_id, channel, transaction_id, receipt }

  // VALIDATION: Apple App Store / Google Play / Stripe receipt verification.
  // For Apple: POST receipt to https://buy.itunes.apple.com/verifyReceipt
  // For Google: validate via Google Play Developer API
  // For Stripe: webhook signature check (different endpoint)
  // For dev: trust the request (Architect must enable validation in production)
  const validated = await validateReceipt(body, env);
  if (!validated.ok) return new Response(JSON.stringify({ ok: false, reason: validated.reason }), { status: 400 });

  // Update IAP namespace
  const iapKey = `wg_iap_${playerId}`;
  const iapRaw = await env.WG_IAP.get(iapKey);
  const iap = iapRaw ? JSON.parse(iapRaw) : { ownedSKUs: [], premiumUnlock: false, adRemovalActive: false };
  if (!iap.ownedSKUs.includes(body.sku_id)) iap.ownedSKUs.push(body.sku_id);
  if (body.sku_id === 'ad_removal') { iap.adRemovalActive = true; iap.premiumUnlock = true; }
  await env.WG_IAP.put(iapKey, JSON.stringify(iap));

  return new Response(JSON.stringify({ ok: true, iap }));
}

async function validateReceipt(body, env) {
  // Per-channel validation. Stub for Apple:
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

  // Map email -> player_id (cross-device sync key)
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
  // Returns an opponent's snapshot for async PvP
  const playerId = getPlayerId(request);
  const { myPower } = await request.json();
  // Pick a random opponent within ±20% Power range
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
  const body = await request.json();
  // Log result for ranked-tier persistence
  return new Response(JSON.stringify({ ok: true }));
}

async function handleLeaderboard(request, env) {
  // Top 100 by rank + power
  return new Response(JSON.stringify({ ok: true, leaderboard: [] }));
}
```

Commit: "Worker O: worker.js — Cloudflare Worker router + 8 endpoint handlers"

CONCERN 2 — Wrangler config + KV namespace declarations

WRITE: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/worker/wrangler.toml`

```toml
name = "wraithgrove-worker"
main = "worker.js"
compatibility_date = "2026-01-01"
workers_dev = false  # Architect deploys to a custom domain

[vars]
APPLE_BUNDLE_ID = "net.wraithgrove.app"
GOOGLE_PACKAGE_NAME = "net.wraithgrove.app"

[[kv_namespaces]]
binding = "WG_STATE"
id = "ARCHITECT_FILLS_THIS_AT_DEPLOY"
preview_id = "ARCHITECT_FILLS_THIS_AT_DEPLOY"

[[kv_namespaces]]
binding = "WG_IAP"
id = "ARCHITECT_FILLS_THIS_AT_DEPLOY"
preview_id = "ARCHITECT_FILLS_THIS_AT_DEPLOY"

[[kv_namespaces]]
binding = "WG_ACCOUNT"
id = "ARCHITECT_FILLS_THIS_AT_DEPLOY"
preview_id = "ARCHITECT_FILLS_THIS_AT_DEPLOY"

[[kv_namespaces]]
binding = "WG_EVENTS"
id = "ARCHITECT_FILLS_THIS_AT_DEPLOY"
preview_id = "ARCHITECT_FILLS_THIS_AT_DEPLOY"

# Secrets (set via `wrangler secret put`):
#   APPLE_SHARED_SECRET
#   GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
#   STRIPE_SECRET_KEY
#   STRIPE_WEBHOOK_SECRET
```

Commit: "Worker O: wrangler.toml — KV namespaces + production env vars"

CONCERN 3 — Wire client `wg-cache.js` to call server endpoints

EDIT: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/core/wg-cache.js`

Replace the localStorage-only `save()` and `load()` with hybrid:
- Save: write to localStorage immediately + queue server POST (debounced 5s)
- Load: read from localStorage first; if user just logged in via account-upgrade, fetch from server and merge

```js
const SERVER_URL = (window.WG && WG.AppConfig && WG.AppConfig.serverUrl) || ''; // empty = no server (dev mode)

async function syncToServer() {
  if (!SERVER_URL) return;
  const playerId = WG.Account && WG.Account.getDeviceId();
  if (!playerId) return;
  try {
    const r = await fetch(`${SERVER_URL}/wg/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Player-Id': playerId },
      body: JSON.stringify(WG.State.get()),
    });
    if (r.ok) WG.Engine.emit('cache:server-sync', { ok: true });
  } catch (e) {
    console.warn('[cache] server sync failed', e);
  }
}

async function loadFromServer() {
  if (!SERVER_URL) return false;
  const playerId = WG.Account && WG.Account.getDeviceId();
  if (!playerId) return false;
  try {
    const r = await fetch(`${SERVER_URL}/wg/load`, {
      method: 'GET',
      headers: { 'X-Player-Id': playerId },
    });
    if (!r.ok) return false;
    const { state } = await r.json();
    if (!state) return false;
    // Merge server state over local state (server wins for IAP entitlement)
    Object.assign(WG.State.get().iap, state.iap || {});
    Object.assign(WG.State.get().currencies, state.currencies || {});
    return true;
  } catch (e) {
    console.warn('[cache] server load failed', e);
    return false;
  }
}
```

Wire `syncToServer()` into the existing `autoSaveTick(now)` — call it after the local save, debounced 5s.

Commit: "Worker O: wg-cache.js — hybrid local + server sync (5s debounce)"

VERIFICATION:
1. `cd /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2`
2. `node --check js/core/wg-cache.js`
3. Confirm `worker/worker.js` and `worker/wrangler.toml` exist.
4. Browser preview (no SERVER_URL configured): eval `WG.Cache.save()` — should fall through to localStorage-only and not throw.

Architect-touch tasks documented in marker:
- Cloudflare account + Worker deployment via `wrangler publish`
- Create 4 KV namespaces (WG_STATE, WG_IAP, WG_ACCOUNT, WG_EVENTS) + paste IDs into wrangler.toml
- Set 4 secrets (APPLE_SHARED_SECRET, GOOGLE_PLAY_SERVICE_ACCOUNT_JSON, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET)
- Implement actual Apple/Google receipt validation in `validateReceipt` (currently stubs)

CONSTRAINTS:
- Three concerns. Three commits.
- Do NOT vendor any backend dependencies — Cloudflare Workers run on V8 isolates with built-in fetch.
- Do NOT add real validation code — that requires API keys; stubs are correct for Phase 4 spec, Phase 5 fills them.
- Per Hive Rules: do not delegate to further sub-agents.

You are Worker O. After you ship: the server-side scaffold exists for Architect deployment. Cross-device save sync, IAP server-validation hooks, account-upgrade flow, async PvP storage, and analytics ingest all wire up to the same Cloudflare Worker. The path to production is unblocked at the server layer.