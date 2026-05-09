# SAVE_SYNC_API.md — Cross-Device Save Sync Server Contract

**Status:** Phase 4 stub — client implemented, no backend yet.
**Intended host:** Cloudflare Worker at `WG.Config.SERVER_BASE_URL`
**Stub location:** `js/meta/meta-savesync.js`

---

## Overview

Save sync allows a player's progress to follow them across devices. The client serializes
`WG.State.get()` as a JSON blob (Phase 4: gzip + base64), uploads on each local save, and
downloads on cold-load to merge any progress made on another device.

Local save (`localStorage.wg_save_v2`) is always the fallback. Every network call degrades
gracefully to local-only on failure.

---

## Auth

Every request carries a signed user token in the `Authorization` header:

```
Authorization: Bearer <signed-jwt>
```

Token payload:
```json
{ "userId": "<device_id>", "saveVersion": 2, "iat": <unix_ts>, "sig": "<hmac_sha256>" }
```

- `userId` — device ID from `WG.Account.getDeviceId()`, persisted in `localStorage.wg_device_id`
- `saveVersion` — schema version (currently `2`, matches `wg_save_v2`)
- `iat` — issued-at timestamp; server rejects tokens older than 5 minutes
- `sig` — HMAC-SHA256(`userId` + `|` + `saveVersion` + `|` + `iat`, server secret)

In Phase 4 stub mode `WG.Config.SERVER_BASE_URL` is `null`. All requests short-circuit at
the client and return safe defaults.

---

## Save blob format

The save blob is the serialized game state, excluding transient runtime values:

```
base64( gzip( JSON.stringify( WG.State.get() minus runtime fields ) ) )
```

**Runtime fields excluded from blob** (Phase 4 server-side strip list):
- `player.stats.hp` — current HP (resets on stage start; `hpMax` is kept)
- Any key prefixed `_rt` (runtime annotations added in future)

**Phase 4 stub:** blob is `JSON.stringify(WG.State.get())` — no gzip, no base64, no field stripping.
The server contract below documents the target; the stub short-circuits before encoding.

---

## Conflict merge policy

Server applies merge rules on upload when the server blob and upload blob diverge:

| Field | Rule |
|---|---|
| `currencies.*` | MAX (higher wallet wins) |
| `player.level`, `player.xp` | MAX |
| `player.ascendTier` | MAX |
| `huntProgress.highestUnlocked` | MAX |
| `huntProgress.bestWaves` | per-stage MAX |
| `towerProgress.peakFloor` | MAX |
| `forge.buildings[*].level` | per-building MAX |
| `relics.owned` | union (MAX count + level per relicId) |
| `iap.*` | server-wins (entitlement source of truth) |
| `settings.*` | newer-timestamp wins (`meta.lastSaveMs`) |
| `meta.sessionsCount` | SUM |

**Big diverge threshold:** if `abs(local.meta.lastSaveMs - server.meta.lastSaveMs) > 7 days`,
server flags response with `{ conflict: "major" }` and client shows user-choice prompt.
(Phase 4 UI: `meta-savesync.js#resolve()` receives both blobs and calls the prompt flow.)

---

## Rate limits

| Endpoint | Limit | Window |
|---|---|---|
| `POST /save/upload` | 60 requests | per hour per `userId` |
| `GET /save/latest` | 30 requests | per minute per IP |
| `POST /save/conflict-resolve` | 10 requests | per hour per `userId` |
| `DELETE /save` | 5 requests | per day per `userId` |

---

## Endpoints

### POST /save/upload

Upload the current save blob. Server merges with any existing server save using the
conflict merge policy above.

**Request body:**
```json
{
  "userId":      "dev_abc123_xyz",
  "saveBlob":    "<base64-gzip-json>",
  "saveVersion": 2,
  "signature":   "<hmac — see Auth>"
}
```

| Field | Type | Notes |
|---|---|---|
| `userId` | string | must match token `userId` |
| `saveBlob` | string | base64( gzip( JSON ) ) — Phase 4 only; stub POSTs raw JSON |
| `saveVersion` | integer | must be `2`; server rejects mismatched schemas |
| `signature` | string | see Auth |

**Success response (200):**
```json
{
  "ok":           true,
  "serverSaveMs": 1746700000000,
  "conflict":     null
}
```

`conflict` is `null` on clean merge, `"major"` if the big-diverge threshold was hit (client
must then call `POST /save/conflict-resolve`).

**Error response (400/429):**
```json
{ "ok": false, "error": "invalid_signature" }
```

Error codes: `invalid_signature`, `token_expired`, `schema_mismatch`, `rate_limited`, `invalid_payload`.

---

### GET /save/latest

Fetch the most recent server-merged save for the authenticated user.

**Response (200):**
```json
{
  "ok":        true,
  "saveBlob":  "<base64-gzip-json>",
  "savedAt":   1746700000000,
  "saveVersion": 2
}
```

Returns `404 { "ok": false, "error": "not_found" }` if the user has no server save yet.
Client falls back to local-only save on any non-200 response.

---

### POST /save/conflict-resolve

Submit the player's chosen blob when a major conflict was flagged. Server replaces its
stored save with the chosen blob, discarding the other.

**Request body:**
```json
{
  "userId":     "dev_abc123_xyz",
  "chosenBlob": "<base64-gzip-json>",
  "saveVersion": 2,
  "signature":  "<hmac>"
}
```

**Success response (200):**
```json
{ "ok": true, "savedAt": 1746700000000 }
```

---

### DELETE /save

Delete all server-side save data for the authenticated user. Called as part of the
in-game "Delete Save" flow (settings modal) immediately before clearing local storage.

**Request body:**
```json
{
  "userId":    "dev_abc123_xyz",
  "signature": "<hmac>"
}
```

**Success response (200):**
```json
{ "ok": true }
```

Idempotent — returns 200 even if no server save existed.

---

## Phase 4 integration notes

1. Replace `WG.Config.SERVER_BASE_URL = null` with the deployed Cloudflare Worker URL.
2. Wire `WG.Account.getDeviceId()` into the JWT signing flow.
3. Implement gzip + base64 encoding in `meta-savesync.js#_serializeBlob()`.
4. Wire the conflict-resolve UI prompt into `meta-savesync.js#resolve()`.
5. The client is already structured to swap: every stub short-circuits on `!BASE_URL`.
   Real fetch paths are already written with graceful failure — only the URL and encoding
   need to activate.
6. Server merge logic (conflict policy table above) should live in a shared util function
   so the same rules apply to both `POST /save/upload` server-side and the client-side
   `resolve()` stub.
