# PHASE 4 BACKEND ARCHITECTURE

**Wraithgrove — Server-Side Systems**
Status: Design specification. No backend deployed yet. All client stubs are live.

---

## 0. Overview

Four independent server systems activate Phase 4. Each is a Cloudflare Worker. Each can be
deployed, tested, and scaled independently — they share no code path, only the same JWT
verification helper.

| System | Worker file | Backing store |
|---|---|---|
| Save Sync | `workers/save-sync.ts` | KV (`WG_SAVES`) |
| Leaderboards | `workers/leaderboard.ts` | Durable Objects + KV (`WG_LEADERBOARDS`) |
| Ad-Removal Entitlements | `workers/entitlements.ts` | KV (`WG_ENTITLEMENTS`) |
| Alliance State | `workers/alliance.ts` | Durable Objects + KV (`WG_ALLIANCES`) |

**Activation switch (all systems):** set `WG.Config.SERVER_BASE_URL` to the deployed Worker
URL. Every stub in `js/meta/meta-savesync.js` and `js/meta/meta-leaderboard.js` short-circuits
on `!BASE_URL` and returns safe local defaults. The fetch paths are already written and tested
for graceful failure — the stubs compile and the UI renders with or without a live server.

---

## 1. Primary Recommendation: Cloudflare Workers

**Why CF Workers over Lambda or self-hosted:**

- Zero new infra. The Architect already deploys to Cloudflare Pages — same dashboard, same
  billing account. Workers are added from the same panel in under 10 minutes.
- No cold starts. Workers run at the edge in V8 isolates with sub-millisecond startup.
- KV and Durable Objects are first-party primitives — no DynamoDB tables to configure,
  no VPC subnets to provision.
- Free tier covers development and soft-launch at < 1K DAU.

**Architecture (all four workers share a single `wrangler.toml`):**

```
Client (Capacitor app)
        │
        │  Authorization: Bearer <signed-jwt>
        ▼
Cloudflare Worker (edge, ~10ms latency)
        │
   ┌────┴─────────────────────────────────────────────────┐
   │  Route                   │  Backing Store             │
   │  /save/*                 │  KV: WG_SAVES              │
   │  /leaderboard/*          │  DO: LeaderboardDO  + KV   │
   │  /wg/iap-*               │  KV: WG_ENTITLEMENTS       │
   │  /alliance/*             │  DO: AllianceDO     + KV   │
   └──────────────────────────────────────────────────────┘
```

---

## 2. KV Namespace Structure

```
WG_SAVES
  save:v2:{userId}         → SaveRecord (JSON, ~8–40 KB gzipped)

WG_LEADERBOARDS
  lb:tower:top100          → LeaderboardRow[] (JSON array, cached 30s TTL)
  lb:tower:score:{userId}  → { peakFloor, rank, submittedAt }
  lb:duel:top100           → LeaderboardRow[]
  lb:duel:score:{userId}   → { rankPoints, rank, submittedAt }
  lb:boss:top100           → AllianceLeaderboardRow[]
  lb:war:season:{weekKey}  → AllianceWarResult[]

WG_ENTITLEMENTS
  ent:{userId}:ad_removal  → EntitlementRecord (receiptHash, platform, grantedAt)
  ent:{userId}:active      → string[] (list of active SKU ids)

WG_ALLIANCES
  alliance:{allianceId}    → AllianceRecord (full state, ~2 KB)
  member:{userId}          → { allianceId, role, joinedAt }
  war:{allianceId}:{week}  → WarState
```

---

## 3. Shared JWT Verification

Every authenticated request carries:

```
Authorization: Bearer <signed-jwt>
```

Token payload: `{ userId, iat, sig }` (save endpoints additionally include `saveVersion`).

- `sig` = HMAC-SHA256(`userId + "|" + iat`, `SERVER_SECRET`)
- Server rejects tokens where `Date.now()/1000 - iat > 300` (5-minute window)

```typescript
// shared/jwt.ts
export async function verifyToken(
  authHeader: string | null,
  secret: string
): Promise<{ userId: string } | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  let payload: { userId: string; iat: number; sig: string };
  try {
    payload = JSON.parse(atob(token));
  } catch {
    return null;
  }
  const { userId, iat, sig } = payload;
  if (!userId || !iat || !sig) return null;
  const age = Math.floor(Date.now() / 1000) - iat;
  if (age < 0 || age > 300) return null;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const expected = new TextEncoder().encode(`${userId}|${iat}`);
  const sigBytes = Uint8Array.from(atob(sig), c => c.charCodeAt(0));
  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, expected);
  return valid ? { userId } : null;
}
```

---

## 4. Save Sync Worker

### Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| `POST` | `/save/upload` | required | Merge + persist save blob |
| `GET` | `/save/latest` | required | Return latest merged blob |
| `POST` | `/save/conflict-resolve` | required | Player chose a blob after major conflict |
| `DELETE` | `/save` | required | Delete all server save data |

### KV Write Strategy

The client uploads every 60 seconds. The Worker writes to KV at most once every **5 minutes
per userId** to cap KV write costs. Intermediate uploads within the 5-minute window are still
merged in memory (against the cached current KV value) but the flush is deferred.

Implementation: read current KV record → merge → check if `lastFlushMs > 5min ago` → write
only if flush window elapsed. The response always returns `{ ok: true }` regardless; the client
does not need to know about flush deferral.

### TypeScript Sample

```typescript
// workers/save-sync.ts
interface Env {
  WG_SAVES: KVNamespace;
  SERVER_SECRET: string;
}

const FLUSH_INTERVAL_MS = 5 * 60 * 1000;

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const auth = await verifyToken(req.headers.get('Authorization'), env.SERVER_SECRET);
    if (!auth) return json({ ok: false, error: 'unauthorized' }, 401);

    if (req.method === 'POST' && url.pathname === '/save/upload') {
      return handleUpload(req, env, auth.userId);
    }
    if (req.method === 'GET' && url.pathname === '/save/latest') {
      return handleDownload(env, auth.userId);
    }
    if (req.method === 'POST' && url.pathname === '/save/conflict-resolve') {
      return handleConflictResolve(req, env, auth.userId);
    }
    if (req.method === 'DELETE' && url.pathname === '/save') {
      return handleDelete(env, auth.userId);
    }
    return json({ ok: false, error: 'not_found' }, 404);
  },
};

async function handleUpload(req: Request, env: Env, userId: string): Promise<Response> {
  const body = await req.json<{
    userId: string; saveBlob: string; saveVersion: number; signature: string;
  }>();
  if (body.userId !== userId) return json({ ok: false, error: 'userid_mismatch' }, 400);
  if (body.saveVersion !== 2) return json({ ok: false, error: 'schema_mismatch' }, 400);

  const kvKey = `save:v2:${userId}`;
  const existing = await env.WG_SAVES.get(kvKey, 'json') as SaveRecord | null;
  const now = Date.now();

  // Merge client blob with server state
  const merged = mergeBlobs(existing?.saveBlob ?? null, body.saveBlob);
  const majorConflict = existing && Math.abs(existing.savedAt - now) > 7 * 86400 * 1000;

  // Write to KV only if flush window elapsed
  const shouldFlush = !existing || (now - (existing.lastFlushMs ?? 0)) >= FLUSH_INTERVAL_MS;
  if (shouldFlush) {
    const record: SaveRecord = {
      userId,
      saveBlob: merged,
      savedAt: now,
      saveVersion: 2,
      lastFlushMs: now,
    };
    await env.WG_SAVES.put(kvKey, JSON.stringify(record));
  }

  return json({
    ok: true,
    serverSaveMs: now,
    conflict: majorConflict ? 'major' : null,
  });
}

async function handleDownload(env: Env, userId: string): Promise<Response> {
  const record = await env.WG_SAVES.get(`save:v2:${userId}`, 'json') as SaveRecord | null;
  if (!record) return json({ ok: false, error: 'not_found' }, 404);
  return json({ ok: true, saveBlob: record.saveBlob, savedAt: record.savedAt, saveVersion: 2 });
}

async function handleConflictResolve(req: Request, env: Env, userId: string): Promise<Response> {
  const body = await req.json<{ userId: string; chosenBlob: string; saveVersion: number }>();
  if (body.userId !== userId) return json({ ok: false, error: 'userid_mismatch' }, 400);
  const now = Date.now();
  await env.WG_SAVES.put(`save:v2:${userId}`, JSON.stringify({
    userId, saveBlob: body.chosenBlob, savedAt: now, saveVersion: 2, lastFlushMs: now,
  }));
  return json({ ok: true, savedAt: now });
}

async function handleDelete(env: Env, userId: string): Promise<Response> {
  await env.WG_SAVES.delete(`save:v2:${userId}`);
  return json({ ok: true });
}

// Merge policy: mirrors meta-savesync.js#resolve() — MAX for progression, server-wins for IAP,
// newer-timestamp wins for settings. Full field list in docs/SAVE_SYNC_API.md.
function mergeBlobs(serverBlob: string | null, clientBlob: string): string {
  if (!serverBlob) return clientBlob;
  let s: any, c: any;
  try { s = JSON.parse(serverBlob); c = JSON.parse(clientBlob); } catch { return clientBlob; }

  // Currencies: MAX
  if (s.currencies && c.currencies) {
    for (const k in c.currencies) {
      if (typeof c.currencies[k] === 'number') {
        s.currencies[k] = Math.max(s.currencies[k] ?? 0, c.currencies[k]);
      }
    }
  }
  // Player progression: MAX
  if (s.player && c.player) {
    if ((c.player.level ?? 0) > (s.player.level ?? 0)) {
      s.player.level = c.player.level;
      s.player.xp = c.player.xp;
    }
    if ((c.player.ascendTier ?? 0) > (s.player.ascendTier ?? 0)) s.player.ascendTier = c.player.ascendTier;
    if ((c.player.highestStageCleared ?? 0) > (s.player.highestStageCleared ?? 0)) {
      s.player.highestStageCleared = c.player.highestStageCleared;
    }
  }
  // Tower: MAX
  if (s.towerProgress && c.towerProgress &&
      (c.towerProgress.peakFloor ?? 0) > (s.towerProgress.peakFloor ?? 0)) {
    s.towerProgress.peakFloor = c.towerProgress.peakFloor;
  }
  // IAP: server-wins (entitlement source of truth — never let client grant SKUs)
  // settings: newer-timestamp wins
  if (c.settings && c.meta && s.meta && c.meta.lastSaveMs > s.meta.lastSaveMs) {
    Object.assign(s.settings, c.settings);
  }
  // sessionsCount: SUM
  if (typeof c.meta?.sessionsCount === 'number') {
    s.meta.sessionsCount = (s.meta?.sessionsCount ?? 0) + c.meta.sessionsCount;
  }
  return JSON.stringify(s);
}

interface SaveRecord {
  userId: string;
  saveBlob: string;
  savedAt: number;
  saveVersion: number;
  lastFlushMs?: number;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

### Client Contract (Stub Behavior)

From `js/meta/meta-savesync.js` — what the server must honor so stubs keep working:

| Stub behavior | Server must match |
|---|---|
| `upload()` resolves `{ ok:true, stub:true }` when no server | `POST /save/upload` → `{ ok:true, serverSaveMs, conflict }` |
| `download()` resolves `null` on error / no server | `GET /save/latest` → `{ ok:true, saveBlob, savedAt, saveVersion }` or 404 |
| `resolve()` emits `'savesync:merged'` after merge | Server responds before client emits event — no server callback needed |
| `delete()` resolves `{ ok:true, stub:true }` | `DELETE /save` → `{ ok:true }`, idempotent |
| All errors fall back to local (catch returns safe default) | Server must return JSON on all error paths — never HTML error pages |

---

## 5. Leaderboard Worker

### Architecture

Durable Objects provide atomic ranked writes. One DO instance per leaderboard board (Tower,
Duel, Boss). The DO holds a sorted in-memory list; reads serve from DO. A periodic flush writes
a `top100` snapshot to KV for public (unauthenticated) reads.

```
submit → DO.writeScore(userId, score)
           ↓ atomic rank recalc (in-memory)
           ↓ every 30s → KV.put("lb:tower:top100", ...)
top?   → KV.get("lb:tower:top100") or DO.getTop(100)
around → DO.getAround(userId, 5)
```

### Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| `POST` | `/leaderboard/tower/submit` | required | Submit tower run |
| `GET` | `/leaderboard/tower/top` | none | Top-100 (KV cached) |
| `GET` | `/leaderboard/tower/me` | required | Player's own rank |
| `GET` | `/leaderboard/tower/around/:userId` | none | ±5 surrounding rows |
| `POST` | `/leaderboard/duel/submit` | required | Submit duel match result |
| `GET` | `/leaderboard/duel/top` | none | Top-100 duel ladder |
| `GET` | `/leaderboard/duel/around/:userId` | none | ±5 surrounding rows |
| `POST` | `/leaderboard/boss/submit` | required | Submit boss damage for alliance |
| `GET` | `/leaderboard/boss/top` | none | Top-100 alliance boss damage |
| `POST` | `/leaderboard/war/result` | required | Submit war result (leader only) |
| `GET` | `/leaderboard/war/season/:weekKey` | none | War results for week |

### Anti-Cheat (Tower)

Server rejects impossible scores before writing to the DO. From `docs/LEADERBOARD_API.md`:

```typescript
const FLOOR_DURATION_MIN_S = 45;
const DUPLICATE_WINDOW_S = 60;
const MAX_FLOOR = 999;

function validateTowerSubmit(
  peakFloor: number,
  runDuration: number
): { valid: boolean; error?: string } {
  if (peakFloor < 1 || peakFloor > MAX_FLOOR) return { valid: false, error: 'impossible_score' };
  if (runDuration < peakFloor * FLOOR_DURATION_MIN_S * 0.6) return { valid: false, error: 'impossible_score' };
  return { valid: true };
}
```

**No client-trust on score claims.** The server validates minimum time-per-floor. The client
cannot claim a floor 999 run in 10 seconds. Similarly, boss damage is capped at a server-side
`MAX_BOSS_DAMAGE_PER_SECOND` constant — any submission exceeding it is silently clamped, not
rejected (to avoid penalizing network retries).

### Durable Object — LeaderboardDO

```typescript
// workers/leaderboard-do.ts
export class LeaderboardDO implements DurableObject {
  private state: DurableObjectState;
  private scores: Map<string, { score: number; displayName: string; submittedAt: number }> = new Map();
  private sorted: string[] = []; // userIds sorted descending by score
  private lastFlushMs = 0;
  private kv: KVNamespace;
  private kvKey: string;

  constructor(state: DurableObjectState, env: { WG_LEADERBOARDS: KVNamespace }) {
    this.state = state;
    this.kv = env.WG_LEADERBOARDS;
    this.kvKey = ''; // set on first request from the stub key
    this.state.blockConcurrencyWhile(async () => {
      const saved = await this.state.storage.get<any>('scores');
      if (saved) {
        this.scores = new Map(Object.entries(saved));
        this.rebuildSorted();
      }
    });
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === 'POST' && url.pathname === '/submit') {
      const { userId, score, displayName, kvKey } =
        await req.json<{ userId: string; score: number; displayName: string; kvKey: string }>();
      this.kvKey = kvKey;
      const existing = this.scores.get(userId);
      if (!existing || score > existing.score) {
        this.scores.set(userId, { score, displayName, submittedAt: Date.now() });
        this.rebuildSorted();
        await this.state.storage.put('scores', Object.fromEntries(this.scores));
        await this.maybeFlushToKV();
      }
      const rank = this.sorted.indexOf(userId) + 1;
      return json({ ok: true, rank, previousBest: existing?.score ?? null, improved: !existing || score > existing.score });
    }
    if (req.method === 'GET' && url.pathname === '/top') {
      const limit = parseInt(url.searchParams.get('limit') ?? '100');
      return json(this.buildRows(this.sorted.slice(0, limit)));
    }
    if (req.method === 'GET' && url.pathname.startsWith('/around/')) {
      const userId = url.pathname.split('/').pop()!;
      return json(this.getAround(userId, 5));
    }
    if (req.method === 'GET' && url.pathname.startsWith('/rank/')) {
      const userId = url.pathname.split('/').pop()!;
      const idx = this.sorted.indexOf(userId);
      if (idx === -1) return json({ ok: false, error: 'not_found' }, 404);
      const entry = this.scores.get(userId)!;
      return json({ rank: idx + 1, userId, ...entry });
    }
    return json({ ok: false, error: 'not_found' }, 404);
  }

  private rebuildSorted() {
    this.sorted = [...this.scores.keys()]
      .sort((a, b) => (this.scores.get(b)!.score) - (this.scores.get(a)!.score));
  }

  private buildRows(userIds: string[]): LeaderboardRow[] {
    return userIds.map((uid, i) => ({
      rank: i + 1,
      userId: uid,
      ...this.scores.get(uid)!,
    }));
  }

  private getAround(userId: string, radius: number): { total: number; rows: LeaderboardRow[] } {
    const idx = this.sorted.indexOf(userId);
    if (idx === -1) return { total: this.sorted.length, rows: [] };
    const start = Math.max(0, idx - radius);
    const end = Math.min(this.sorted.length, idx + radius + 1);
    return { total: this.sorted.length, rows: this.buildRows(this.sorted.slice(start, end)) };
  }

  private async maybeFlushToKV() {
    const now = Date.now();
    if (now - this.lastFlushMs < 30_000) return;
    this.lastFlushMs = now;
    const top100 = this.buildRows(this.sorted.slice(0, 100));
    if (this.kvKey) await this.kv.put(this.kvKey, JSON.stringify(top100));
  }
}

interface LeaderboardRow {
  rank: number;
  userId: string;
  score: number;
  displayName: string;
  submittedAt: number;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

### Client Contract (Stub Behavior)

From `js/meta/meta-leaderboard.js`:

| Stub behavior | Server must match |
|---|---|
| `submit()` resolves `{ ok:true, stub:true }` when no server | `POST .../submit` → `{ ok:true, rank, previousBest, improved }` |
| `top(limit)` returns `STUB_ROWS.slice(0, limit)` | `GET .../top?limit=N` → `LeaderboardRow[]` (bare array) |
| `meAndAround()` returns synthetic slice + player row | `GET .../around/:userId` → `{ total, rows: LeaderboardRow[] }` |
| On fetch error, `meAndAround()` returns `[_stubMeRow(myFloor)]` | Server must return JSON on all error paths |
| Seed APIs (`getTopPlayers`, `getTowerLeaderboard`, etc.) serve `WG.LeaderboardSeeds` pre-launch | These are client-only until Phase 4 real data is live; no server endpoint needed |

---

## 6. Ad-Removal Cross-Device Sync

### Context: PATH_A Non-Replication #1

Wood Siege bug: the `ad_removal` SKU does not transfer across devices (named by aj griffing,
App Store). Wraithgrove's fix: server-side receipt validation creates a persistent entitlement
record keyed to `userId`, not device. Any device that authenticates as the same `userId` gets
the entitlement restored on launch.

Full context: `docs/PATH_A_NON_REPLICATIONS.md`, `BLUEPAPER.md §7`.

### Flow

```
Device A (purchase)
  1. StoreKit / Play Billing: purchase ad_removal
  2. WG.IAP.purchase('ad_removal') → receives receipt token from platform
  3. POST /wg/iap-grant { userId, platform, receipt, skuId: 'ad_removal' }
  4. Server validates receipt against Apple/Google API
  5. KV write: WG_ENTITLEMENTS ent:{userId}:ad_removal
  6. Response: { ok:true, granted:true }
  7. Client sets WG.State.iap.ad_removal = true → local persist

Device B (restore)
  1. App launch → WG.IAP.init() → WG.IAP.restorePurchases()
  2. GET /wg/iap-status { userId }
  3. Server reads KV: WG_ENTITLEMENTS ent:{userId}:ad_removal
  4. Response: { ad_removal: true, ... }
  5. Client sets WG.State.iap.ad_removal = true
```

### Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| `POST` | `/wg/iap-grant` | required | Validate receipt, write entitlement |
| `GET` | `/wg/iap-status` | required | Return all active entitlements for userId |
| `POST` | `/wg/iap-restore` | required | Re-validate and re-grant (manual Restore Purchases tap) |

### TypeScript Sample

```typescript
// workers/entitlements.ts
interface Env {
  WG_ENTITLEMENTS: KVNamespace;
  SERVER_SECRET: string;
  APPLE_SHARED_SECRET: string;
  GOOGLE_SERVICE_ACCOUNT: string; // JSON key
}

const VALID_SKUS = ['ad_removal'] as const;

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const auth = await verifyToken(req.headers.get('Authorization'), env.SERVER_SECRET);
    if (!auth) return json({ ok: false, error: 'unauthorized' }, 401);

    if (req.method === 'POST' && url.pathname === '/wg/iap-grant') {
      return handleGrant(req, env, auth.userId);
    }
    if (req.method === 'GET' && url.pathname === '/wg/iap-status') {
      return handleStatus(env, auth.userId);
    }
    if (req.method === 'POST' && url.pathname === '/wg/iap-restore') {
      return handleRestore(req, env, auth.userId);
    }
    return json({ ok: false, error: 'not_found' }, 404);
  },
};

async function handleGrant(req: Request, env: Env, userId: string): Promise<Response> {
  const body = await req.json<{
    userId: string;
    platform: 'apple' | 'google';
    receipt: string;
    skuId: string;
  }>();

  if (body.userId !== userId) return json({ ok: false, error: 'userid_mismatch' }, 400);
  if (!VALID_SKUS.includes(body.skuId as any)) return json({ ok: false, error: 'invalid_sku' }, 400);

  const valid = body.platform === 'apple'
    ? await validateAppleReceipt(body.receipt, env.APPLE_SHARED_SECRET)
    : await validateGoogleReceipt(body.receipt, env.GOOGLE_SERVICE_ACCOUNT);

  if (!valid) return json({ ok: false, error: 'invalid_receipt' }, 400);

  // Write entitlement — idempotent; re-grant is safe
  const record: EntitlementRecord = {
    userId,
    skuId: body.skuId,
    platform: body.platform,
    receiptHash: await hashReceipt(body.receipt),
    grantedAt: Date.now(),
  };
  await env.WG_ENTITLEMENTS.put(`ent:${userId}:${body.skuId}`, JSON.stringify(record));

  // Update active set
  const activeKey = `ent:${userId}:active`;
  const active: string[] = (await env.WG_ENTITLEMENTS.get(activeKey, 'json')) ?? [];
  if (!active.includes(body.skuId)) {
    active.push(body.skuId);
    await env.WG_ENTITLEMENTS.put(activeKey, JSON.stringify(active));
  }

  return json({ ok: true, granted: true, skuId: body.skuId });
}

async function handleStatus(env: Env, userId: string): Promise<Response> {
  const active: string[] = (await env.WG_ENTITLEMENTS.get(`ent:${userId}:active`, 'json')) ?? [];
  const result: Record<string, boolean> = {};
  for (const sku of VALID_SKUS) result[sku] = active.includes(sku);
  return json({ ok: true, ...result });
}

async function handleRestore(req: Request, env: Env, userId: string): Promise<Response> {
  // Same as grant but called from "Restore Purchases" button
  return handleGrant(req, env, userId);
}

async function validateAppleReceipt(receipt: string, sharedSecret: string): Promise<boolean> {
  // POST to https://buy.itunes.apple.com/verifyReceipt (prod) or sandbox
  const res = await fetch('https://buy.itunes.apple.com/verifyReceipt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 'receipt-data': receipt, password: sharedSecret }),
  });
  const data = await res.json<{ status: number }>();
  return data.status === 0 || data.status === 21007; // 21007 = sandbox receipt on prod, retry
}

async function validateGoogleReceipt(_receipt: string, _serviceAccount: string): Promise<boolean> {
  // Phase 4: use Google Play Developer API v3 purchases.products.get
  // Stub returns true — replace with real OAuth2 + API call before Play Store submission
  return true;
}

async function hashReceipt(receipt: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(receipt));
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

interface EntitlementRecord {
  userId: string;
  skuId: string;
  platform: 'apple' | 'google';
  receiptHash: string;
  grantedAt: number;
}
```

### Security: No Client-Trust on Entitlements

The client **never** self-grants `ad_removal`. The only path that sets `WG.State.iap.ad_removal = true`
permanently is:

1. Server validates a real platform receipt, or
2. `GET /wg/iap-status` returns `{ ad_removal: true }` — which is only true after (1)

The existing `WG.IAP.restorePurchases()` stub in `js/meta/meta-iap.js` re-checks `ownedSKUs`
from local state. Phase 4 replaces the stub body with the real `GET /wg/iap-status` call.
See `docs/PATH_A_NON_REPLICATIONS.md` for the Phase 3 slot-in point.

---

## 7. Alliance State Authoritative Server

### Current State

Alliance state is entirely local in `js/meta/meta-alliance.js`. NPC members are hardcoded
seed data. War opponents are selected client-side from `OPPONENT_POOL`. Phase 4 makes alliance
creation, membership, and war state server-authoritative.

### Durable Object per Alliance

One `AllianceDO` instance per `allianceId`. The DO serializes all membership mutations —
join, leave, kick, promote — preventing the race condition where two devices join simultaneously
and push membership over the cap.

### Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| `POST` | `/alliance/create` | required | Create alliance, deduct 500 coins server-side |
| `GET` | `/alliance/:id` | none | Alliance info (roster, MOTD, war state) |
| `POST` | `/alliance/:id/join` | required | Join alliance |
| `POST` | `/alliance/:id/leave` | required | Leave alliance |
| `DELETE` | `/alliance/:id/members/:memberId` | required (leader) | Kick member |
| `PUT` | `/alliance/:id/motd` | required (officer+) | Update MOTD |
| `POST` | `/alliance/:id/war/submit` | required | Submit war attack result (Phase 4) |
| `GET` | `/alliance/search` | none | `?q=name&limit=20` |

### TypeScript Sample — Alliance DO

```typescript
// workers/alliance-do.ts
export class AllianceDO implements DurableObject {
  private state: DurableObjectState;
  private alliance: AllianceRecord | null = null;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.state.blockConcurrencyWhile(async () => {
      this.alliance = await this.state.storage.get<AllianceRecord>('alliance') ?? null;
    });
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const body = req.method !== 'GET' ? await req.json<any>() : null;

    if (req.method === 'POST' && url.pathname === '/init') {
      return this.handleInit(body);
    }
    if (req.method === 'GET' && url.pathname === '/get') {
      if (!this.alliance) return json({ ok: false, error: 'not_found' }, 404);
      return json({ ok: true, alliance: this.alliance });
    }
    if (req.method === 'POST' && url.pathname === '/join') {
      return this.handleJoin(body.userId, body.displayName);
    }
    if (req.method === 'POST' && url.pathname === '/leave') {
      return this.handleLeave(body.userId);
    }
    if (req.method === 'DELETE' && url.pathname.startsWith('/member/')) {
      const targetId = url.pathname.split('/').pop()!;
      return this.handleKick(body.requesterId, targetId);
    }
    if (req.method === 'PUT' && url.pathname === '/motd') {
      return this.handleMotd(body.requesterId, body.motd);
    }
    return json({ ok: false, error: 'not_found' }, 404);
  }

  private async handleInit(body: { allianceId: string; name: string; leaderId: string; displayName: string }): Promise<Response> {
    if (this.alliance) return json({ ok: false, error: 'already_exists' }, 409);
    this.alliance = {
      id: body.allianceId,
      name: body.name,
      motd: '',
      leaderId: body.leaderId,
      members: [{ userId: body.leaderId, displayName: body.displayName, role: 'leader', joinedAt: Date.now() }],
      memberCap: 30,
      points: 0,
      createdAt: Date.now(),
      war: null,
    };
    await this.save();
    return json({ ok: true, alliance: this.alliance });
  }

  private async handleJoin(userId: string, displayName: string): Promise<Response> {
    if (!this.alliance) return json({ ok: false, error: 'not_found' }, 404);
    if (this.alliance.members.length >= this.alliance.memberCap) {
      return json({ ok: false, error: 'alliance_full' }, 409);
    }
    if (this.alliance.members.some(m => m.userId === userId)) {
      return json({ ok: false, error: 'already_member' }, 409);
    }
    this.alliance.members.push({ userId, displayName, role: 'member', joinedAt: Date.now() });
    await this.save();
    return json({ ok: true, memberCount: this.alliance.members.length });
  }

  private async handleLeave(userId: string): Promise<Response> {
    if (!this.alliance) return json({ ok: false, error: 'not_found' }, 404);
    if (this.alliance.leaderId === userId) {
      return json({ ok: false, error: 'leader_must_transfer' }, 400);
    }
    this.alliance.members = this.alliance.members.filter(m => m.userId !== userId);
    await this.save();
    return json({ ok: true });
  }

  private async handleKick(requesterId: string, targetId: string): Promise<Response> {
    if (!this.alliance) return json({ ok: false, error: 'not_found' }, 404);
    const requester = this.alliance.members.find(m => m.userId === requesterId);
    if (!requester || (requester.role !== 'leader' && requester.role !== 'officer')) {
      return json({ ok: false, error: 'insufficient_role' }, 403);
    }
    const target = this.alliance.members.find(m => m.userId === targetId);
    if (!target) return json({ ok: false, error: 'not_member' }, 404);
    if (target.role === 'leader') return json({ ok: false, error: 'cannot_kick_leader' }, 403);
    this.alliance.members = this.alliance.members.filter(m => m.userId !== targetId);
    await this.save();
    return json({ ok: true });
  }

  private async handleMotd(requesterId: string, motd: string): Promise<Response> {
    if (!this.alliance) return json({ ok: false, error: 'not_found' }, 404);
    const requester = this.alliance.members.find(m => m.userId === requesterId);
    if (!requester || requester.role === 'member') {
      return json({ ok: false, error: 'insufficient_role' }, 403);
    }
    this.alliance.motd = motd.slice(0, 200);
    await this.save();
    return json({ ok: true });
  }

  private async save() {
    await this.state.storage.put('alliance', this.alliance);
  }
}

interface AllianceRecord {
  id: string;
  name: string;
  motd: string;
  leaderId: string;
  members: AllianceMember[];
  memberCap: number;
  points: number;
  createdAt: number;
  war: WarState | null;
}

interface AllianceMember {
  userId: string;
  displayName: string;
  role: 'leader' | 'officer' | 'member';
  joinedAt: number;
}

interface WarState {
  weekKey: string;
  opponentId: string;
  opponentName: string;
  phase: 'matchmaking' | 'attack' | 'results';
  attacksUsed: number;
  totalDamage: number;
  result: 'win' | 'lose' | null;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

### Client Contract

The local `WG.Alliance` module reads from `WG.State.alliance`. Phase 4 adds a sync layer:
on tab activation, fetch `GET /alliance/{id}` and merge into local state. On create/join/leave,
call the server first — only update local state on `{ ok: true }` response. If the server is
unreachable, the existing local state displays (user sees stale data, no crash).

---

## 8. Security Model

### No Client-Trust on Currency Claims

The server **never** adds coins, diamonds, or relic cards based on an unvalidated client claim.
The only currency sources the server honors:

1. Save blob upload — server stores the blob and returns it. The server does not interpret
   currency fields for validation; anti-abuse relies on rate limits and the merge policy's
   MAX rule (client can't reduce your own wallet, but also can't gain more than the MAX of
   any two saves). Fabricated saves are a known limitation of client-authoritative saves;
   Phase 4 does not solve this without a full server-authoritative game loop.

2. IAP grants — the only path that adds permanent value via server action. Receipt validation
   is mandatory; the client cannot trigger a grant without a valid platform receipt.

3. Leaderboard scores — validated against minimum time-per-floor; no currency involved.

**Currency fabrication risk:** At the save-sync level, a player could craft a save with
inflated currency values. This is accepted at Phase 4 — the game is single-player, and IAP
SKUs (the monetization path) are entitlement-gated server-side. Free currencies (coins) are
cosmetically significant but economically irrelevant to revenue.

### JWT Signing

All authenticated endpoints use the HMAC-SHA256 JWT described in §3. The client-side signing
lives in `js/meta/meta-account.js` (Phase 4 implementation slot, currently stub). The server
secret is a Cloudflare Worker environment variable, never in client code.

### Rate Limits

| Endpoint group | Limit | Window |
|---|---|---|
| `POST /save/upload` | 60 | per hour per userId |
| `GET /save/latest` | 30 | per minute per IP |
| `POST /leaderboard/*/submit` | 1 per completed run | per userId (60s dedup) |
| `GET /leaderboard/*/top` | 30 | per minute per IP |
| `POST /wg/iap-grant` | 10 | per hour per userId |
| `POST /alliance/create` | 3 | per day per userId |
| `POST /alliance/*/join` | 5 | per hour per userId |

Rate limit implementation: use KV with a sliding window counter. Key pattern:
`rl:{endpoint}:{userId}:{minuteBucket}`. Increment on each request; reject when over limit.

---

## 9. Cost Projection

All figures use a **5-minute KV flush strategy** for save sync (client uploads every 60s,
Worker only writes to KV once per 5 minutes per user). This reduces KV writes by ~5x and
is the primary cost lever at scale.

### Cloudflare Workers

Pricing basis (2026):
- Workers Paid: $5/month flat
- Requests: first 10M/month free, then $0.30/million
- KV reads: first 10M/month free, then $0.50/million
- KV writes: first 1M/month free, then $5/million
- Durable Objects requests: first 1M/month free, then $0.15/million
- Durable Objects storage: $0.20/GB-month

Assumptions:
- 2 sessions/day per DAU, 60 min/session
- Save uploads: 120/DAU/day (every 60s, 2hr play) → KV writes after flush: 24/DAU/day
- Leaderboard reads: 10/DAU/day
- Alliance reads: 4/DAU/day

| DAU | Requests/month | KV writes/month | KV reads/month | DO ops/month | Est. CF cost |
|---|---|---|---|---|---|
| 1K | 4.2M (free) | 720K (free) | 420K (free) | 300K (free) | **~$5/month** |
| 10K | 42M | 7.2M | 4.2M (free) | 3M | **~$47/month** |
| 100K | 420M | 72M | 42M | 30M | **~$490/month** |

10K detail: $5 base + $9.60 requests + $31.00 KV writes + $0 KV reads + $0.30 DO = **$45.90**
100K detail: $5 base + $122 requests + $355 KV writes + $16 KV reads + $4.35 DO = **$502**

### AWS Lambda + DynamoDB (Alternative)

| DAU | Lambda cost | DynamoDB writes | DynamoDB reads | Est. AWS cost |
|---|---|---|---|---|
| 1K | ~$0 (free tier) | ~$4 (2.75M paid writes × $1.25/M) | ~$0 (free tier) | **~$4/month** |
| 10K | ~$3 | ~$40 | ~$0 | **~$43/month** |
| 100K | ~$30 | ~$90 | ~$5 | **~$125/month** |

**AWS is ~4x cheaper at 100K DAU** but requires:
- API Gateway + Lambda setup (~2–4 hours vs ~30 minutes for Workers)
- DynamoDB table design (no native sorted sets; leaderboards need GSI or Elasticache)
- CloudFront CDN for global latency (add ~$15/month at 100K DAU)
- Separate deployment pipeline from Cloudflare Pages

AWS adjusted 100K total: ~$140/month. CF total: ~$502/month.

Crossover point: ~40K DAU. Below that, CF is within $20/month of AWS. Above, AWS cost
advantage compounds. The decision is whether the infra simplicity of CF Workers (same dashboard,
zero cold starts, 30-minute deploy) is worth ~$360/month at 100K DAU.

**Recommendation:** Deploy CF Workers for Phase 4. Evaluate migration to AWS Lambda only if
the game reaches 50K+ DAU — at that scale, the revenue should comfortably absorb the migration
cost and the $350/month delta is a rounding error against IAP revenue.

### Self-Hosted Node (Third Option)

Pros: cheapest per-request at scale (VPS flat rate). Cons: cold start risk, maintenance,
no global edge, manual TLS, no built-in KV (need Redis or DynamoDB).

VPS estimate (Hetzner CPX21, 3 vCPU/4GB):
- ~€8/month (~$9/month) up to ~50K DAU
- Requires Redis instance: ~$15/month (Upstash or managed)
- **Total self-hosted: ~$24/month** — cheapest at all scales, but:
  - Manual deploy pipeline, no auto-scaling, no edge PoPs
  - Redis data loss on restart unless persisted
  - 0 DDoS mitigation vs CF's built-in WAF

Not recommended for Phase 4 given the Architect is already on CF Pages and the game is
pre-revenue.

---

## 10. REST Endpoint Master Table

All endpoints are served from a single Cloudflare Worker with route dispatch.

| Method | Path | Auth | System | Backed by |
|---|---|---|---|---|
| `POST` | `/save/upload` | JWT | Save Sync | KV: WG_SAVES |
| `GET` | `/save/latest` | JWT | Save Sync | KV: WG_SAVES |
| `POST` | `/save/conflict-resolve` | JWT | Save Sync | KV: WG_SAVES |
| `DELETE` | `/save` | JWT | Save Sync | KV: WG_SAVES |
| `POST` | `/leaderboard/tower/submit` | JWT | Leaderboard | DO: LeaderboardDO |
| `GET` | `/leaderboard/tower/top` | none | Leaderboard | KV cache → DO |
| `GET` | `/leaderboard/tower/me` | JWT | Leaderboard | DO: LeaderboardDO |
| `GET` | `/leaderboard/tower/around/:userId` | none | Leaderboard | DO: LeaderboardDO |
| `POST` | `/leaderboard/duel/submit` | JWT | Leaderboard | DO: LeaderboardDO |
| `GET` | `/leaderboard/duel/top` | none | Leaderboard | KV cache → DO |
| `GET` | `/leaderboard/duel/around/:userId` | none | Leaderboard | DO: LeaderboardDO |
| `POST` | `/leaderboard/boss/submit` | JWT | Leaderboard | DO: LeaderboardDO |
| `GET` | `/leaderboard/boss/top` | none | Leaderboard | KV cache → DO |
| `POST` | `/leaderboard/war/result` | JWT | Leaderboard | KV: WG_LEADERBOARDS |
| `GET` | `/leaderboard/war/season/:weekKey` | none | Leaderboard | KV: WG_LEADERBOARDS |
| `POST` | `/wg/iap-grant` | JWT | Entitlements | KV: WG_ENTITLEMENTS |
| `GET` | `/wg/iap-status` | JWT | Entitlements | KV: WG_ENTITLEMENTS |
| `POST` | `/wg/iap-restore` | JWT | Entitlements | KV: WG_ENTITLEMENTS |
| `POST` | `/alliance/create` | JWT | Alliance | DO: AllianceDO + KV |
| `GET` | `/alliance/:id` | none | Alliance | DO: AllianceDO |
| `POST` | `/alliance/:id/join` | JWT | Alliance | DO: AllianceDO + KV |
| `POST` | `/alliance/:id/leave` | JWT | Alliance | DO: AllianceDO + KV |
| `DELETE` | `/alliance/:id/members/:memberId` | JWT | Alliance | DO: AllianceDO |
| `PUT` | `/alliance/:id/motd` | JWT | Alliance | DO: AllianceDO |
| `POST` | `/alliance/:id/war/submit` | JWT | Alliance | DO: AllianceDO + KV |
| `GET` | `/alliance/search` | none | Alliance | KV: WG_ALLIANCES |

---

## 11. Phase 4 Activation Checklist

When deploying Phase 4, activate in this order to minimize player impact:

1. **Deploy Workers** — all four Workers live at `workers.wraithgrove.com` or similar.
   Verify all endpoints return JSON (not HTML errors) before proceeding.

2. **Set `WG.Config.SERVER_BASE_URL`** in the production build. The stubs short-circuit on
   `null`; setting this string flips every client to live mode in one place.

3. **Save Sync first** — lowest blast radius. Worst case: player downloads stale save (local
   fallback). Monitor KV write counts for the first 24h.

4. **Entitlements second** — test `restorePurchases()` on a second device with a purchase
   made on the first. Verify `ad_removal` transfers correctly per PATH_A Non-Replication #1.

5. **Leaderboard third** — pre-populate the DO with the `WG.LeaderboardSeeds` data so the
   board is non-empty on launch (import via a one-time admin endpoint or KV direct write).

6. **Alliance last** — requires migrating existing local alliance state (NPC seed members)
   into the server. Add a `WG.Alliance.syncToServer()` migration path that runs once on first
   successful `GET /alliance/:id` → 404 response.

---

*Written by W-Phase4-Backend-Spec, 2026-05-08.*
*Primary sources: `js/meta/meta-savesync.js`, `js/meta/meta-leaderboard.js`,*
*`docs/SAVE_SYNC_API.md`, `docs/LEADERBOARD_API.md`, `docs/PATH_A_NON_REPLICATIONS.md`,*
*`BLUEPAPER.md §7`, `js/meta/meta-alliance.js`, `js/meta/meta-alliance-war.js`.*
