# LEADERBOARD_API.md — Tower Gauntlet Server Contract

**Status:** Phase 4 stub — client implemented, no backend yet.
**Intended host:** Cloudflare Worker at `WG.Config.SERVER_BASE_URL`
**Stub location:** `js/meta/meta-leaderboard.js`

---

## Auth

Every request carries a signed user token in the `Authorization` header:

```
Authorization: Bearer <signed-jwt>
```

Token payload:
```json
{ "userId": "<device_id>", "iat": <unix_ts>, "sig": "<hmac_sha256>" }
```

- `userId` — device ID from `WG.Account.getDeviceId()`, persisted in `localStorage.wg_device_id`
- `iat` — issued-at timestamp; server rejects tokens older than 5 minutes
- `sig` — HMAC-SHA256(`userId` + `|` + `iat`, server secret)

In Phase 4 stub mode `WG.Config.SERVER_BASE_URL` is `null`. All requests short-circuit at the client and return cached fake data.

---

## Rate limits

| Endpoint | Limit | Window |
|---|---|---|
| `POST /leaderboard/tower/submit` | 1 per completed run | enforced per `userId`; server rejects duplicate within 60 s |
| `GET /leaderboard/tower/top` | 30 requests | per minute per IP |
| `GET /leaderboard/tower/me` | 30 requests | per minute per IP |
| `GET /leaderboard/tower/around/:userId` | 30 requests | per minute per IP |

---

## Endpoints

### POST /leaderboard/tower/submit

Submit a completed tower run score.

**Request body:**
```json
{
  "userId":         "dev_abc123_xyz",
  "peakFloor":      23,
  "runDuration":    418.7,
  "charactersUsed": ["wraith_wanderer"],
  "signature":      "<hmac — see Auth>"
}
```

| Field | Type | Notes |
|---|---|---|
| `userId` | string | device ID, must match token `userId` |
| `peakFloor` | integer ≥ 1 | highest floor reached before death/exit |
| `runDuration` | float | total elapsed seconds (`rt.totalElapsed`) |
| `charactersUsed` | string[] | equipped skin IDs; at least one element |
| `signature` | string | see Auth — server validates against userId+iat |

**Anti-cheat validation (server-side):**
- `peakFloor` reachable check: minimum time per floor = `FLOOR_DURATION_MIN` (45 s). Server rejects if `runDuration < peakFloor * 45 * 0.6`.
- Impossible score cap: server caps at configured `MAX_FLOOR` (currently 999).
- Duplicate suppression: second submit from same `userId` within 60 s is silently discarded (returns 200 `{ ok: true, duplicate: true }`).

**Success response (200):**
```json
{
  "ok":   true,
  "rank": 14,
  "previousBest": 19,
  "improved": true
}
```

**Error response (400/429):**
```json
{ "ok": false, "error": "impossible_score" }
```

Error codes: `invalid_signature`, `token_expired`, `impossible_score`, `rate_limited`, `invalid_payload`.

---

### GET /leaderboard/tower/top?limit=100

Fetch the global top-N scores. `limit` default 100, max 500.

**Response (200):**
```json
[
  {
    "rank":        1,
    "userId":      "dev_wr4ith_abc",
    "displayName": "Wraithwalker",
    "peakFloor":   47,
    "submittedAt": 1746700000
  },
  ...
]
```

---

### GET /leaderboard/tower/me

Fetch the authenticated user's current rank and best floor.

**Response (200):**
```json
{
  "rank":        14,
  "userId":      "dev_abc123_xyz",
  "displayName": "YOU",
  "peakFloor":   23,
  "submittedAt": 1746700100
}
```

Returns `404 { "ok": false, "error": "not_found" }` if user has no submitted score yet.

---

### GET /leaderboard/tower/around/:userId

Fetch the 10 entries surrounding a given user — 4 above, the user's own row, 5 below (or fewer at the edges of the board).

**URL param:** `:userId` — device ID of the player.

**Response (200):**
```json
{
  "total": 841,
  "rows": [
    { "rank": 11, "userId": "dev_...", "displayName": "Bonecaller", "peakFloor": 27, "submittedAt": 1746699000 },
    { "rank": 12, "userId": "dev_...", "displayName": "Hollow",     "peakFloor": 26, "submittedAt": 1746699100 },
    { "rank": 13, "userId": "dev_...", "displayName": "Ashcaller",  "peakFloor": 24, "submittedAt": 1746699200 },
    { "rank": 14, "userId": "dev_abc123_xyz", "displayName": "YOU", "peakFloor": 23, "submittedAt": 1746700100, "isPlayer": true },
    { "rank": 15, "userId": "dev_...", "displayName": "Galewarden", "peakFloor": 19, "submittedAt": 1746699300 }
  ]
}
```

`total` = total number of entries on the leaderboard at query time.

Returns `404 { "ok": false, "error": "not_found" }` if userId has no score entry.
Client falls back to local-only display on any non-200 response (see `meta-leaderboard.js`).

---

## Phase 4 integration notes

1. Replace `WG.Config.SERVER_BASE_URL = null` with the deployed Cloudflare Worker URL.
2. Wire `WG.Account.getDeviceId()` into the JWT signing flow — current device ID becomes the `userId` claim.
3. The client is already structured to swap: stub short-circuits on `!BASE_URL`; real fetch paths are already written and tested for graceful failure.
4. `displayName` in stub = `'YOU'`; Phase 4: user-chosen display name from account upgrade flow (`meta-account.js#upgradeAccount`).
