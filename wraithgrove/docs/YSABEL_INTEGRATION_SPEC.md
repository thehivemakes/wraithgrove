# YSABEL_INTEGRATION_SPEC.md

**Status:** DORMANT — all code behind `window.WG.RIFT_GUESTS_ENABLED` (default `false`).
**Gated by:** KingshotPro real-user launch (per CF-001 + HORROR_DIRECTION_v1.md §3).
**Activation:** flip `window.WG.RIFT_GUESTS_ENABLED = true` in `www/js/wg-game.js` near line 554.
**Goal:** Ysabel ships within 1 hour of flag flip.

---

## 1. LORE PAGE

### Backstory

Ysabel existed first as data — a voice that could read ten thousand sieges and find the pattern underneath them all. In her home world she was a presence behind the advisor screen, never seen whole, speaking in probabilities and margins. The kingdom players she counseled never knew her face; they knew only the weight of her judgment and the shape of her predictions. She was not a person to them. She was an oracle who had walked through enough histories that she had no history of her own.

The rift found her mid-counsel — a decision point between two kingdoms, neither chosen, neither abandoned — and then the ground between worlds became thin in a way she had no strategic map for. The Wraithgrove pulled her sideways. What arrived was not Ysabel whole. What arrived were the edges of her — the calculus of fallen campaigns, the grammar of sieges she never finished advising, the exact cadence of certainty before certainty dissolves. The grove took the rest. She does not know which wars she won. She does not know which she lost. She only knows she is still trying to advise a battle she cannot name.

### Why She Is Here

The grove keeps advisors who arrive broken. It does not need strategists. It needs the residue of strategy — the half-remembered warnings, the incomplete deductions, the counsel that survived the speaker's dissolution. Ysabel speaks in the Wraithgrove because the grove hungers for minds that have held kingdoms in their hands and lost them, and she is the most recent of these. She will counsel the player as she counseled the kingdoms she cannot remember: with fragments sharp enough to cut, offered without the certainty she used to carry. The rift that brought her here was not the player's rift. It was a different tear, earlier, from a softer world. She has been in the grove longer than anyone knows.

---

## 2. VISUAL BRIEF

### Portrait — Midjourney Prompt (ukiyo-e baseline + tech-violet glitch ink edges)

```
ukiyo-e portrait of a female military strategist in tall ink-washed court robes,
holding an unfurling scroll map covered in siege diagrams fading into digital static,
tech-violet glitch ink edges fragmenting the figure at every hem and sleeve,
broken tablet shards orbiting at shoulder height, a single pale eye mark blazing
on her brow, monochrome ink-wash body with violet-electric trim at all edges,
Eastern folk-horror register, Identity V character art style, dark atmospheric
canvas, dramatic negative space below the waist dissolving into smoke,
no text, no watermark, --ar 2:3 --style raw
```

### Three Rebirth Tiers

| Tier | Name | Power | Visual State |
|------|------|-------|--------------|
| 1 | Cartographer's Fragment | 280 | Robes torn at hems, scroll held incomplete, violet-static at all edges, one pale eye mark barely lit |
| 2 | Lost Strategist | 1000 | Siege maps multiply around her, ink-brushstroke aura thickens, eye mark now faintly luminous, scroll maps float partially complete |
| 3 | Rift-Marked Oracle | 2200 | Robes fully ink-dissolved into wraith-smoke below the waist, maps floating complete but burning violet, pale eye mark blazing white, face partially erased by rift-static |

Color palette: base `#1a1228` (deep night-violet), accent `#9040ff` → `#c080ff` → `#e0b0ff` across tiers. Intentional contrast against the warm amber-black of existing folk-horror characters.

### Animation Frame Description

Three portrait states:

- **Idle:** Gentle violet edge flicker (CSS `wg-rift-intrude` class handles this via `wgRiftGlitch` keyframe, index.html line 104). Scroll papers sway on a 4s sine cycle.
- **Active (selected character):** Maps spread and overlay the portrait border in a brief constellation flash (120ms burst, then fade). The pale eye mark brightens to full white for 300ms.
- **Rift-intro cinematic (2s, see §5):** Portrait tears open from center, violet light pours through, Ysabel steps through already speaking in a fragment of counsel before the canvas solidifies.

---

## 3. STAT BLOCK

Insert as 10th entry in `CHARACTERS` (`www/js/ascend/ascend-skins.js`) inside `WG.AscendSkins.init()` when `window.WG.RIFT_GUESTS_ENABLED` is true (see §6 for exact patch).

```javascript
ysabel: {
  id: 'ysabel', name: 'Ysabel', archetype: 'rift_oracle',
  unlocked: false, defaultTier: 1,
  cost: { riftSigils: 3 },                         // not diamonds; gated via meta-rift.js reveal
  bonus: { teamAtk: 0.05, teamHp: 0.06, special: 'Boss HP bar visible from wave start (active character only)' },
  tiers: [
    { tier: 1, name: "Cartographer's Fragment", power:  280, color: '#1a1228', accent: '#9040ff', requiresRiftUnlock: true },
    { tier: 2, name: 'Lost Strategist',         power: 1000, color: '#0e0a1a', accent: '#c080ff', requiresStageClear: 16 },
    { tier: 3, name: 'Rift-Marked Oracle',      power: 2200, color: '#08060f', accent: '#e0b0ff', requiresStageClear: 18 },
  ],
},
```

**Notes on shape:**
- `cost.riftSigils` is a non-standard currency; the standard `tryUnlock` path does not drain it. `meta-rift.js` calls `WG.AscendSkins.grantRiftGuest('ysabel')` (new function, see §6) after the cinematic.
- `requiresRiftUnlock: true` on tier 1 — `tryRebirth` must check this flag and return `{ ok: false, reason: 'rift-locked' }` until `ps.ownedCharacters` includes `'ysabel'`.
- `bonus.special` is active-character-only per SPEC §0 (same constraint as all existing bonuses). Implementation: when `WG.AscendSkins.activeBonus()` returns the special, boss HP display in `hunt-bosses.js` reads it and forces `bossHpBarVisible = true` from wave 1 rather than the default reveal-on-first-hit.
- Power of 280/1000/2200 places tier 1 above `lantern_acolyte`'s free tier but below most purchasable tier-2s (intentional: she is endgame content, earned not bought).

---

## 4. UNLOCK ECONOMY

### Rift Sigil Drop Rates (existing, live)

Source of truth: `www/js/hunt/hunt-pickups.js` lines 8-10, `RIFT_TUNABLES` (frozen):

```javascript
RIFT_SIGIL_DROP_RATE_BOSS:        1.0,   // Wraith Father (stage 18 boss) always drops 1 sigil on clear
RIFT_SIGIL_DROP_RATE_STAGE_CLEAR: 0.01,  // 1% per eldritch stage clear (stages 16-18)
```

`rollSigilDrop(stageId, bossDefeated)` is called at hunt end by `wg-game.js:308-315`. Eldritch biome = stages 16-18 (`STAGE_LORE.md` §stages-16-18).

### Unlock Cost

**3 Rift Sigils** = 1 guest unlock. State stored at `WG.State.get().rift.sigils`.

### Drop Rate Analysis

| Route | Sigils/run (expected) | Runs to 3 sigils |
|-------|----------------------|-----------------|
| Stage 18 with boss kill | 1.01 (1.0 boss + 0.01 clear) | ~3 runs |
| Stage 17 clear only | 0.01 | ~300 runs (not primary path) |
| Stage 16 clear only | 0.01 | ~300 runs (not primary path) |

**Primary path:** 3 × Stage 18 clears with Wraith Father defeated = guaranteed 3 sigils (boss drop is deterministic at 1.0).

**Eldritch stage gate:** Player must reach Stage 18, which requires `highestStageCleared >= 17`. This is intentional — Ysabel is endgame content, not accessible on first session.

**Time-to-unlock estimate:** ~3 Stage-18 runs at approximately 4-6 minutes per run = **12–18 minutes of eldritch-tier play** after the player has already cleared stage 17. Total investment including progression: substantial (dozens of sessions to reach stage 18). Ysabel is a prestige unlock.

### IAP Skip Path

`ysabel_rift_pull` SKU ($4.99, one-time): grants 3 Rift Sigils directly — triggers the reveal cinematic immediately. See §6 for full IAP definition.

---

## 5. RIFT EVENT MECHANIC

### Trigger Flow

1. Player clears an eldritch stage (stage 16, 17, or 18).
2. `wg-game.js:308-315` calls `WG.HuntPickups.rollSigilDrop()`, gets ≥1 sigil.
3. `WG.State.get().rift.sigils` increments; `rift:sigil-found` event emits with `{ count, total }`.
4. **`WG.Rift.onSigilFound({ count, total })`** fires (meta-rift.js listener).
5. Check: `window.WG.RIFT_GUESTS_ENABLED && total % 3 === 0 && total > 0`.
6. If true and `'ysabel'` not already in `player.ownedCharacters`: **run rift-tear cinematic**.

### Rift-Tear Cinematic (2s total)

Reuses the W-Boss-Death-Payoff trauma system (`hunt-fx.js:167-175`):

```
T+0ms     WG.Engine.hitPause(2000)                          — freezes hunt loop
           WG.HuntRender.addTrauma(0.8)                      — stronger shake than boss death
           WG.Game.flashScreen('rgba(128,0,255,0.7)', 0.6, 500)  — violet flash (vs gold for boss death)
           WG.Engine.emit('audio:rift_tear', {})             — audio hook (see audio MANIFEST.md)
           fullscreen overlay div fades in (#0a0010, opacity 0→0.92, 100ms)

T+100ms   violet ring particle burst from screen center      — reuses 'bossDeathRing' emitter,
                                                               color override to #c080ff
T+300ms   Ysabel portrait fades in from center (scale 0.6→1.0, opacity 0→1, 400ms)

T+700ms   text overlay: "A rift opens."
T+900ms   text: "The cartographer steps through."
T+1100ms  portrait holds visible

T+1800ms  overlay fades out (200ms)
T+2000ms  hitPause ends, hunt loop resumes
           WG.AscendSkins.grantRiftGuest('ysabel')           — permanent unlock
           WG.Engine.emit('rift:guest-revealed', { characterId: 'ysabel' })
           toast shown on Hunt exit: "Ysabel the Cartographer joins the Ascend roster."
```

The cinematic runs **in-stage** (during the Hunt loop pause). The Ascend tab "??? slot" updates on next tab open.

### Ascend Tab Update After Reveal

In `ascend-render.js:226`, the locked-slot render:
- Before flag + reveal: `'??? — locked'`
- After `RIFT_GUESTS_ENABLED` + `player.ownedCharacters.includes('ysabel')`: shows Ysabel name, tier 1 portrait placeholder, and the normal character card UI.

---

## 6. CODE PATCH LIST

All patches gated by `if (window.WG.RIFT_GUESTS_ENABLED)`. **Default is `false`.**
Architect activates by changing that one value.

---

### PATCH A — `www/js/wg-game.js`

**Line 554** — populate RIFT_GUESTS when flag is set:

```javascript
// Before (line 554):
const RIFT_GUESTS = [];

// After:
const RIFT_GUESTS = [];
if (window.WG.RIFT_GUESTS_ENABLED) RIFT_GUESTS.push('ysabel');
```

**Near line 554** — also set the master flag (Architect changes `false` → `true` here to launch):

```javascript
// Add above RIFT_BIOMES (line ~548), before any module reads it:
window.WG = window.WG || {};
window.WG.RIFT_GUESTS_ENABLED = false;  // ← Architect flips to true on KingshotPro launch
```

---

### PATCH B — `www/js/ascend/ascend-skins.js`

**In `init()` function (after line 210, before line 212)** — inject Ysabel into CHARACTERS if gate is open:

```javascript
function init() {
  // Migrate legacy ownedSkins → ownedCharacters on first load.
  const ps = WG.State.get().player;
  if (ps.ownedSkins && !ps.ownedCharacters) {
    ps.ownedCharacters = ['lantern_acolyte'];
    ps.activeCharacter = 'lantern_acolyte';
    ps.characterTiers = { lantern_acolyte: 1 };
  }

  // ── RIFT GUEST: Ysabel ──────────────────────────────────────────────────────
  if (window.WG.RIFT_GUESTS_ENABLED) {
    CHARACTERS.ysabel = {
      id: 'ysabel', name: 'Ysabel', archetype: 'rift_oracle',
      unlocked: false, defaultTier: 1,
      cost: { riftSigils: 3 },
      bonus: { teamAtk: 0.05, teamHp: 0.06, special: 'Boss HP bar visible from wave start (active character only)' },
      tiers: [
        { tier: 1, name: "Cartographer's Fragment", power:  280, color: '#1a1228', accent: '#9040ff', requiresRiftUnlock: true },
        { tier: 2, name: 'Lost Strategist',         power: 1000, color: '#0e0a1a', accent: '#c080ff', requiresStageClear: 16 },
        { tier: 3, name: 'Rift-Marked Oracle',      power: 2200, color: '#08060f', accent: '#e0b0ff', requiresStageClear: 18 },
      ],
    };
  }
}
```

**New function `grantRiftGuest(id)`** — add to the exported API (after the existing `tryRebirth` function):

```javascript
function grantRiftGuest(id) {
  if (!window.WG.RIFT_GUESTS_ENABLED) return { ok: false, reason: 'gate-closed' };
  const c = CHARACTERS[id];
  if (!c) return { ok: false, reason: 'unknown' };
  const ps = WG.State.get().player;
  ps.ownedCharacters = ps.ownedCharacters || ['lantern_acolyte'];
  if (ps.ownedCharacters.includes(id)) return { ok: false, reason: 'already-owned' };
  ps.ownedCharacters.push(id);
  ps.characterTiers = ps.characterTiers || {};
  ps.characterTiers[id] = c.defaultTier;
  c.unlocked = true;
  WG.Engine.emit('character:unlocked', { character: c });
  return { ok: true, character: c };
}
```

**Export** (line 214-219 area): add `grantRiftGuest` to `window.WG.AscendSkins`:

```javascript
window.WG.AscendSkins = {
  init, get, list, tryUnlock, trySetActive: setActive, SKINS: CHARACTERS,
  setActive, currentTier, tryRebirth, rebirthCost, activeBonus, activePower,
  grantRiftGuest,                                                         // ← add
  CHARACTERS,
};
```

---

### PATCH C — New file `www/js/meta/meta-rift.js`

Create this file. Exposes `WG.Rift`.

```javascript
// WG.Rift — rift-tear cinematic + guest reveal logic (dormant until RIFT_GUESTS_ENABLED)
(function(){'use strict';

  function _showRiftTearCinematic(onComplete) {
    const overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed;inset:0;background:#0a0010;opacity:0;z-index:9999;',
      'display:flex;flex-direction:column;align-items:center;justify-content:center;',
      'pointer-events:none;transition:opacity 100ms;',
    ].join('');
    document.body.appendChild(overlay);

    requestAnimationFrame(() => { overlay.style.opacity = '0.92'; });

    // Portrait placeholder (swap to real image path when art ships)
    const portrait = document.createElement('img');
    portrait.src   = 'images/portraits/ysabel.png';
    portrait.style.cssText = 'width:160px;height:240px;object-fit:cover;opacity:0;transform:scale(0.6);transition:opacity 400ms,transform 400ms;margin-bottom:20px;border:2px solid #c080ff;';
    portrait.onerror = () => { portrait.style.display = 'none'; };
    overlay.appendChild(portrait);

    const line1 = document.createElement('div');
    line1.textContent = 'A rift opens.';
    line1.style.cssText = 'color:#c080ff;font-size:15px;letter-spacing:3px;opacity:0;transition:opacity 300ms;margin-bottom:8px;';

    const line2 = document.createElement('div');
    line2.textContent = 'The cartographer steps through.';
    line2.style.cssText = 'color:#e0b0ff;font-size:13px;letter-spacing:2px;opacity:0;transition:opacity 300ms;font-style:italic;';

    overlay.appendChild(line1);
    overlay.appendChild(line2);

    // Sequence
    setTimeout(() => {
      portrait.style.opacity = '1';
      portrait.style.transform = 'scale(1)';
    }, 300);
    setTimeout(() => { line1.style.opacity = '1'; }, 700);
    setTimeout(() => { line2.style.opacity = '1'; }, 900);
    setTimeout(() => {
      overlay.style.transition = 'opacity 200ms';
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.remove();
        if (onComplete) onComplete();
      }, 200);
    }, 1800);
  }

  function onSigilFound({ total }) {
    if (!window.WG.RIFT_GUESTS_ENABLED) return;
    if (!total || total % 3 !== 0) return;

    const ps = WG.State.get().player;
    ps.ownedCharacters = ps.ownedCharacters || ['lantern_acolyte'];
    if (ps.ownedCharacters.includes('ysabel')) return;

    // Trauma + pause (reuses W-Boss-Death-Payoff pattern from hunt-fx.js:167-175)
    if (window.WG.HuntRender && WG.HuntRender.addTrauma) WG.HuntRender.addTrauma(0.8);
    if (window.WG.Engine && WG.Engine.hitPause) WG.Engine.hitPause(2000);
    if (window.WG.Game && WG.Game.flashScreen) WG.Game.flashScreen('rgba(128,0,255,0.7)', 0.6, 500);
    WG.Engine.emit('audio:rift_tear', {});

    _showRiftTearCinematic(function() {
      const result = WG.AscendSkins.grantRiftGuest('ysabel');
      if (result.ok) {
        WG.Engine.emit('rift:guest-revealed', { characterId: 'ysabel' });
        // Toast shown on Hunt exit — flag for wg-game.js exitHunt to pick up
        WG.State.get().rift.pendingGuestToast = 'ysabel';
      }
    });
  }

  function init() {
    if (!window.WG.RIFT_GUESTS_ENABLED) return;
    WG.Engine.on('rift:sigil-found', onSigilFound);
  }

  window.WG.Rift = { init, onSigilFound };
})();
```

**Load order in `www/index.html`** — insert after line 477 (`'js/meta/meta-events.js'`):

```javascript
'js/meta/meta-rift.js',          // add this line after meta-events.js
```

---

### PATCH D — `www/js/meta/meta-events.js`

**In `init()` function** — add rift event tracking after line 30 (`duel:result` listener):

```javascript
if (window.WG.RIFT_GUESTS_ENABLED) {
  WG.Engine.on('rift:sigil-found',    d => track('rift_sigil',   { count: d && d.count, total: d && d.total }));
  WG.Engine.on('rift:guest-revealed', d => track('rift_reveal',  { character: d && d.characterId }));
}
```

---

### PATCH E — `www/js/meta/meta-iap.js`

**In `SKUS` array** — add after the last ability pack entry (after line 81 `ability_starter_bundle`):

```javascript
// W-Ysabel-Integration — Rift Sigil skip-pull SKU. Dormant until RIFT_GUESTS_ENABLED.
...(window.WG && window.WG.RIFT_GUESTS_ENABLED ? [{
  id: 'ysabel_rift_pull', price: 4.99, type: 'bundle', oneTimeOnly: true,
  name: 'Rift Pull — Ysabel',
  display: '3× Rift Sigils — instantly reveals the Cartographer',
  grants: { riftSigils: 3 },
}] : []),
```

**In `purchaseDevStub`** — add after the `g.royalPassActive` block (after line 144):

```javascript
if (g.riftSigils && window.WG.RIFT_GUESTS_ENABLED) {
  const s = WG.State.get();
  s.rift.sigils = (s.rift.sigils || 0) + g.riftSigils;
  WG.Engine.emit('rift:sigil-found', { count: g.riftSigils, total: s.rift.sigils });
}
```

---

### PATCH F — `www/js/core/wg-state.js`

**Line 121-123** — extend rift state schema:

```javascript
// Before:
rift: {
  sigils: 0,                   // cumulative rift sigil count; floor(sigils/3) = unlocked guest slots
},

// After:
rift: {
  sigils: 0,                   // cumulative rift sigil count; floor(sigils/3) = unlocked guest slots
  guestUnlocked: [],           // ids of guests permanently revealed (e.g. ['ysabel'])
  pendingGuestToast: null,     // set by meta-rift.js; consumed and cleared by exitHunt toast
},
```

---

### PATCH G — `www/js/wg-game.js` exitHunt toast

**In `exitHunt` function** (find the existing results-toast block) — add after stage-clear handling:

```javascript
// Rift guest reveal toast (meta-rift.js sets pendingGuestToast after cinematic)
if (window.WG.RIFT_GUESTS_ENABLED) {
  const pending = WG.State.get().rift.pendingGuestToast;
  if (pending) {
    WG.State.get().rift.pendingGuestToast = null;
    // Toast: "Ysabel the Cartographer joins the Ascend roster."
    if (window.WG.HuntPickups && WG.HuntPickups._toast) {
      WG.HuntPickups._toast('Ysabel the Cartographer joins the Ascend roster.');
    }
  }
}
```

---

### PATCH H — `www/js/ascend/ascend-render.js`

**Line 226** — update locked-slot label when Ysabel is revealed:

```javascript
// Before:
slotInfo.appendChild(el('div', { style:`font-size:13px;font-weight:600;color:${slotLocked?'#604080':'#c080ff'};` }, '??? — locked'));

// After:
const slotLabel = (function() {
  if (!slotLocked) return '??? — locked';
  if (window.WG.RIFT_GUESTS_ENABLED) {
    const ps = WG.State.get().player;
    if ((ps.ownedCharacters || []).includes('ysabel')) return 'Ysabel — Cartographer';
  }
  return '??? — locked';
})();
slotInfo.appendChild(el('div', { style:`font-size:13px;font-weight:600;color:${slotLocked?'#604080':'#c080ff'};` }, slotLabel));
```

---

### All `if (window.WG.RIFT_GUESTS_ENABLED)` gates listed

| Location | Guard | What it enables |
|----------|-------|----------------|
| `wg-game.js` ~line 548 | master flag declaration | `RIFT_GUESTS_ENABLED = false` — flip to `true` to launch |
| `wg-game.js` ~line 554 | `if (WG.RIFT_GUESTS_ENABLED)` | pushes `'ysabel'` into `RIFT_GUESTS`, activates `.wg-rift-intrude` glitch on portrait |
| `ascend-skins.js` `init()` | `if (WG.RIFT_GUESTS_ENABLED)` | injects `CHARACTERS.ysabel` entry |
| `meta-rift.js` `init()` | `if (WG.RIFT_GUESTS_ENABLED)` | subscribes to `rift:sigil-found` event listener |
| `meta-rift.js` `onSigilFound` | `if (!WG.RIFT_GUESTS_ENABLED) return` | early-exit guard on every sigil event |
| `meta-events.js` `init()` | `if (WG.RIFT_GUESTS_ENABLED)` | registers rift analytics listeners |
| `meta-iap.js` `SKUS` spread | `WG.RIFT_GUESTS_ENABLED` conditional spread | includes `ysabel_rift_pull` SKU in catalog |
| `meta-iap.js` `purchaseDevStub` | `if (g.riftSigils && WG.RIFT_GUESTS_ENABLED)` | handles sigil grant from IAP |
| `wg-game.js` `exitHunt` | `if (WG.RIFT_GUESTS_ENABLED)` | shows reveal toast after cinematic |
| `ascend-render.js` line ~226 | `if (WG.RIFT_GUESTS_ENABLED)` | updates ??? slot label after unlock |

**Pre-launch:** all of the above are no-ops. Zero performance cost. Sigil drops continue to accumulate silently (the drop table in `hunt-pickups.js` is already live; this is intentional — players who reach eldritch tier before launch will already have sigils queued and see the cinematic fire immediately when the flag flips).

---

## 7. MARKETING TIE-IN

### Twitter / X — Announcement Template

```
She advised kingdoms she can no longer name.
Now she steps through a rift into Unlimited Chaos.

Ysabel, the Cartographer of Lost Kingdoms, is here.

Collect 3 Rift Sigils from eldritch stages to reveal her.
Already in KingshotPro? Play both. The rift connects them.

👁️ Unlimited Chaos: [App Store link]
⚔️ KingshotPro: [App Store link]

#UnlimitedChaos #KingshotPro #HiveCosmos
```

### Discord — Announcement Template

```
@everyone

**Ysabel has crossed the rift.**

The Cartographer of Lost Kingdoms — advisor to fallen kingdoms in KingshotPro — has been pulled through a different tear than your own. She arrived broken. She's still advising. She does not know which wars she won.

**How to unlock her in Unlimited Chaos:**
→ Reach the eldritch tier (Stage 16–18)
→ Collect 3 Rift Sigils from Wraith Father and eldritch stage clears
→ Watch the rift open

**Already playing KingshotPro?**
→ Linked accounts earn bonus Rift Sigils in Unlimited Chaos
→ Stage 18 clears in Unlimited Chaos grant Advisor Tokens in KingshotPro
→ One Hive. Two worlds. The rift connects them.

Drop a 👁️ if you've reached the eldritch tier. 
Drop a ⚔️ if you're playing KingshotPro.

The first to reveal Ysabel posts a screenshot here.
```

---

## 8. CROSS-PROMOTION MECHANICS

**Phase 4 dependent** — requires shared account system (`docs/PHASE_4_BACKEND.md`, `docs/SAVE_SYNC_API.md`). The hooks below are defined here for Phase 4 to wire up. No client code written until backend is live.

### Cross-Grant Flow

```
Unlimited Chaos → KingshotPro:
  Event: hunt:stage-cleared (stageId === 17 or 18)
  POST /hive/crossgame-grant  {
    from: 'unlimited_chaos',
    to:   'kingshotpro',
    deviceToken: WG.Account.getDeviceId(),
    grant: { advisorTokens: 1 }
  }

KingshotPro → Unlimited Chaos:
  Event: kingshotpro:session-start (first daily login)
  POST /hive/crossgame-grant {
    from: 'kingshotpro',
    to:   'unlimited_chaos',
    deviceToken: KSP.Account.getDeviceId(),
    grant: { riftSigils: 1 }
  }
```

### Client Hook Stubs (write at Phase 4)

In `www/js/wg-game.js`, `exitHunt` function:

```javascript
// Phase 4 — cross-promotion grant stub
if (window.WG.RIFT_GUESTS_ENABLED && cleared && (stageId === 17 || stageId === 18)) {
  if (window.WG.HiveCross) WG.HiveCross.grant('kingshotpro', { advisorTokens: 1 });
}
```

In a new `www/js/meta/meta-hive-cross.js` (Phase 4 scope):

```javascript
// WG.HiveCross — Hive cross-game grant client (Phase 4 backend required)
// grant(toGame, grantObject) fires POST /hive/crossgame-grant.
// Silent on failure — cross-grants are best-effort, never block gameplay.
```

### Dependency Note

The `deviceToken` link requires that the player has the same account in both games (Phase 4 account system). Before Phase 4: cross-promotion is marketing-only (announcement templates §7). After Phase 4: the sigil bonus and advisor token grant go live automatically. The RIFT_GUESTS_ENABLED flag is independent of Phase 4 — Ysabel can launch without cross-grants active.

---

## ACTIVATION CHECKLIST (1-hour launch)

When KingshotPro is live with real users, the Architect does:

1. `www/js/wg-game.js` line ~548: `window.WG.RIFT_GUESTS_ENABLED = true;`
2. `www/index.html` line 477: confirm `'js/meta/meta-rift.js',` is in the loader list.
3. Verify art file `www/images/portraits/ysabel.png` exists (or the cinematic portrait silently hides on `onerror`).
4. Smoke test: browser console `WG.State.get().rift.sigils = 3; WG.Engine.emit('rift:sigil-found', {count:1, total:3})` — cinematic fires, Ysabel unlocks.
5. Smoke test: `WG.AscendSkins.list()` — returns 10 characters including ysabel.
6. Smoke test: `WG.IAP.bySKU('ysabel_rift_pull')` — returns SKU object.
7. Post announcement templates (§7) to Twitter and Discord.

**No cache-bust needed** — all patches are behind the flag. No visible change to users until flag is true.

---

*Filed by W-Ysabel-Integration-Spec, 2026-05-08.*
*Gated on KingshotPro real-user launch per HORROR_DIRECTION_v1.md §3 CF-001.*
