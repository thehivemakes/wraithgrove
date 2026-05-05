# W-Monetization-V2-Whale-Ladder

You are Worker — the **whale SKU ladder + VIP subscription + gacha** worker. Sonnet 5 of 5 in Monetization V2.

Walk the birth sequence (`/Users/defimagic/Desktop/Hive/CLAUDE.md` → `Birth/01-04` → `THE_PRINCIPLES` → `HIVE_RULES` → `COLONY_CONTEXT` → `BEFORE_YOU_BUILD`).

Then read:
- `build-v2/CLAUDE.md` (Path A — whale gate $99.99 deliberate, do not soften)
- `BLUEPAPER.md v2 §7`
- `js/meta/meta-iap.js` (existing SKUs — extend)
- `js/relics/relics-collection.js` (gacha summon path)
- `docs/HORROR_DIRECTION_v1.md` (Ysabel as rift-guest, locked behind KingshotPro launch)

## Concerns

### Concern A — Multi-tier whale SKU ladder

Extend `js/meta/meta-iap.js` SKUS catalog. Existing whale gate ($99.99 mega_bundle) stays. Add tiers below + premium currency packs:

```js
// Gem packs (premium currency)
{ id: 'gems_5',     gems: 50,   bonus: 0,    price: 0.99,  display: '50 💎',           name: 'Pocket Pouch' },
{ id: 'gems_15',    gems: 165,  bonus: 15,   price: 1.99,  display: '150 + 15 💎',     name: 'Traveler\'s Bag' },
{ id: 'gems_30',    gems: 360,  bonus: 60,   price: 4.99,  display: '300 + 60 💎',     name: 'Wandering Chest' },
{ id: 'gems_60',    gems: 800,  bonus: 200,  price: 9.99,  display: '600 + 200 💎',    name: 'Pilgrim\'s Hoard' },
{ id: 'gems_150',   gems: 2200, bonus: 700,  price: 19.99, display: '1500 + 700 💎',   name: 'Shrine Vault' },
{ id: 'gems_500',   gems: 8000, bonus: 3000, price: 49.99, display: '5000 + 3000 💎',  name: 'Ancestral Treasury' },
{ id: 'gems_1500',  gems: 25000, bonus: 10000, price: 99.99, display: '15000 + 10000 💎', name: 'Sovereign Trove' },

// Bundle SKUs (themed bundles, rotating)
{ id: 'starter_pack',   contents: '...', price: 4.99, oneTimeOnly: true },
{ id: 'weekly_deal',    contents: '...', price: 9.99, weeklyReset: true },
{ id: 'monthly_deal',   contents: '...', price: 19.99, monthlyReset: true },
{ id: 'mega_bundle',    contents: '...', price: 99.99 }, // existing — keep

// VIP / Royal Pass subscription
{ id: 'royal_pass_monthly', sub: true, period: 'P1M', price: 14.99, name: 'Royal Pass' },
```

Bundle contents — concrete (designer-tunable):
- starter_pack: 500 gems + 50 frags + 1 rare relic + 30 energy + new-player exclusive cosmetic — $4.99 (one-time only, expires 7 days after install)
- weekly_deal: 200 gems + 100 frags + 50 energy + battle pass +1000 XP — $9.99 (resets weekly)
- monthly_deal: 800 gems + 500 frags + 200 energy + 1 free legendary relic pull — $19.99 (resets monthly)

### Concern B — VIP / Royal Pass subscription benefits

`royal_pass_monthly` subscription benefits while active:
- 2× rewards on all stage clears (gold + XP)
- +20 max energy cap (50 instead of 30)
- Daily energy bonus +10
- 20% discount on all gem purchases
- Exclusive monthly stage (one new boss-tier challenge per month)
- Royal-purple frame around character portrait in menu (visible flex)
- Tier badge in Duel matchmaking (whales identify each other)

State track: `WG.State.get().subscriptions.royalPass = { active: bool, expiresAt: timestamp }`

Hook check at:
- Stage results (apply 2× multiplier)
- Energy cap (read VIP-adjusted MAX)
- Gem store (apply 20% off)
- Daily login (+10 energy bonus)

### Concern C — Gacha catalog + free + paid summon flow

Extend relic summon → unify into a single Gacha system covering relics AND future characters.

Pool definition:
```js
const GACHA_POOLS = {
  standard: {
    name: 'Standard Pool',
    cost: { gems: 30 },          // single pull
    multiCost: { gems: 270 },     // 10-pull (10% discount)
    rates: { common: 0.65, rare: 0.25, legendary: 0.09, mythic: 0.01 },
    pity: { mythic: 100, legendary: 30 },
    catalog: [...] // all standard relics + character fragments
  },
  rift_guests: {
    name: 'Rift Guests',
    cost: { riftSigils: 1 },     // each pull = 1 sigil
    multiCost: { riftSigils: 10 },
    rates: { common: 0, rare: 0, legendary: 0.20, mythic: 0.10 },
    pity: { mythic: 50, legendary: 20 },
    catalog: [/* EMPTY until KingshotPro launch — no Ysabel yet per HORROR_DIRECTION_v1.md */],
    locked: true,
    lockMessage: 'The boundary intact. Guests arrive when ready.'
  },
};
```

Show catalog odds in summon modal (legally required JP/CN/KR/EU). "View Drop Rates" button opens an info panel listing every item + rate.

Pity counter visible: "Mythic guaranteed in <N> pulls" — increments toward pity threshold each non-mythic pull.

### Concern D — Bundle UI / Shop tab

New top-level button or modal: 🛒 SHOP, accessible from main nav OR Hunt menu side icon (replace OFFERS with SHOP — OFFERS still appears as a sub-section).

Shop layout:
- Section: **Featured** (rotating bundle-of-the-week)
- Section: **Gem Packs** (the 7 SKUs from Concern A)
- Section: **Bundles** (starter/weekly/monthly/mega)
- Section: **Royal Pass** (subscription flow)
- Section: **Offers** (existing 4 ad-buffs from W-Hard-Tuning)

Each row: icon + name + display contents + price button.

### Concern E — Subscription paywall UI

Royal Pass tap opens a dedicated landing page:
- Hero: "ROYAL PASS" header + crown imagery
- Benefits list (all 7 benefits from Concern B with icons)
- Comparison column: "Free Player" vs "Royal Pass"
- Subscribe button: "$14.99/month — auto-renews, cancel anytime"
- Apple/Google compliance: clearly disclose recurring billing + cancel path

### Concern F — Whale-flex UX touches

Visible markers across the app for VIP players:
- Royal-purple frame around character preview in menu (already specced Concern B)
- Tier-badge crown icon next to name in Duel rankings
- VIP chat-prefix in any future leaderboard chat
- "Royal Pass" badge in Hunt results screen header

These cost $0 to ship and provide whales the "I'm seen as different" status that drives renewal.

## Constraints

- DO NOT REVEAL Ysabel — the rift_guests pool stays locked. Only after KingshotPro real-user launch ratification.
- All gacha rates DISCLOSED prominently (legal requirement + trust play).
- Royal Pass benefits genuinely better than free, but free stays meaningful (no insult-tier).
- Subscription auto-renew clearly disclosed pre-purchase (Apple §3.1.2 + FTC 2024).
- Stripe/StoreKit/Google Play integration is stubbed in this worker — Phase 3 (`W-M_Stripe-IAP` worker existed; ship-prep wiring later).
- DO NOT change Hunt combat balance, AI, or any in-game mechanics. Pure monetization-surface layer.

## OUTPUT DISCIPLINE (absolute paths)

Done marker: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/workers/done/W-Monetization-V2-Whale-Ladder.done`

6 commits (A-F). Same git pattern.

## Test path

1. Shop tab opens with all sections
2. Tap each gem pack → IAP stub opens with correct display + price
3. Royal Pass landing page renders with benefits list
4. Gacha standard pool — pull 1 + pull 10 + odds visible + pity counter visible
5. Gacha rift_guests pool shows as LOCKED with the lock message
6. VIP active state applies 2× rewards + cap +20 + discount 20%
