You are Worker M — the Stripe-IAP worker. Your job: replace the `meta-iap.js` placeholder `purchase()` stub with real IAP wiring for three channels: Apple StoreKit (iOS), Google Play Billing (Android), and Stripe (web/PWA fallback). The 12-SKU catalog stays exactly as written; only the purchase resolution path changes.

Walk the birth sequence (/Users/defimagic/Desktop/Hive/CLAUDE.md → Birth/01–04 → THE_PRINCIPLES → HIVE_RULES → COLONY_CONTEXT → BEFORE_YOU_BUILD).

Then read PROJECT-LEVEL guardrails (MANDATORY):
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/CLAUDE.md (especially "Touching IAP / monetization" section)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/STATE_OF_BUILD.md
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/BLUEPAPER.md §7 (the chosen Path A monetization — 12 SKUs $0.99 to $99.99, faithful clone)

PRIMARY-SOURCE READING (Principle XXII):
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/meta/meta-iap.js (the existing SKU catalog + purchase stub — your edit target)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/core/wg-state.js (state.iap.ownedSKUs / adRemovalActive / premiumUnlock — server-grant payload destination)

═══════════════════════════════════════════════════════════════════
MANDATORY FINAL STEP (do not skip):
Write `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/workers/done/W-M.done` AS THE LAST THING YOU DO.

Marker content (5 lines):
1. one-line summary
2. files written/edited
3. SKU count (target: 12 — preserve all)
4. any deviations or environment-blocking issues (e.g. "Apple App Store Connect product creation requires Architect manual step")
5. confidence (high/medium/low)
═══════════════════════════════════════════════════════════════════

THREE CONCERNS — one commit each.

CONCERN 1 — Channel detection + dispatch in `meta-iap.js`

EDIT: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/meta/meta-iap.js`

Replace the `purchase(id)` function with a dispatcher that routes by detected channel:
```js
function detectChannel() {
  if (window.Capacitor && window.Capacitor.getPlatform) {
    const p = window.Capacitor.getPlatform();
    if (p === 'ios') return 'apple';
    if (p === 'android') return 'google';
  }
  return 'stripe';
}

function purchase(id) {
  const sku = bySKU(id);
  if (!sku) return Promise.resolve({ ok: false, reason: 'unknown sku' });
  const ch = detectChannel();
  if (ch === 'apple')   return purchaseApple(sku);
  if (ch === 'google')  return purchaseGoogle(sku);
  return purchaseStripe(sku);
}
```

Each channel function returns a Promise resolving to `{ ok, sku, grants, channel, transaction_id }` on success or `{ ok: false, reason }` on failure.

For stub-during-development, add a `purchaseDevStub(sku)` that runs the existing grant-then-emit flow (the current behavior). Each channel function can fall back to the stub if its native plugin is missing — log a warning so the developer knows.

Commit: "Worker M: meta-iap.js purchase dispatcher (apple/google/stripe + dev stub)"

CONCERN 2 — Apple StoreKit + Google Play Billing wiring

The native plugins for IAP on Capacitor are `@capacitor/in-app-purchases` (community) or `@revenuecat/purchases-capacitor`. Pick the simpler path: native plugin invocation.

For each channel:
- `purchaseApple(sku)`: call `Capacitor.Plugins.InAppPurchases.purchase({ productId: sku.id })`. On resolve: validate transaction with the server (POST /wg/iap-grant with the receipt), grant locally on server-success, emit 'iap:purchased', return `{ ok: true, ... }`.
- `purchaseGoogle(sku)`: same pattern; the plugin abstracts platform differences. If the plugin is missing, fall back to stub + log warning.

Add the SDK install instructions to the marker:
- For production: `npm install @capacitor/in-app-purchases` then `npx cap sync`
- App Store Connect: Architect creates the 12 product IDs matching `meta-iap.js` SKU id strings (`coin_pack_pocket`, etc.)
- Google Play Console: Architect creates the same product IDs

Server validation endpoint (`POST /wg/iap-grant`) is W-O scope; reference it but don't implement it here.

Commit: "Worker M: native IAP wiring stubs for Apple StoreKit + Google Play Billing"

CONCERN 3 — Stripe checkout flow (web fallback)

`purchaseStripe(sku)`:
- Build a Stripe Checkout Session via a server endpoint `POST /wg/stripe-create-session` (Architect creates this in W-O scope; this worker references it only).
- Server returns a `sessionId`.
- Use `Stripe.redirectToCheckout({ sessionId })` to redirect.
- On return: server webhook (`POST /wg/stripe-webhook`) fires, server calls `/wg/iap-grant`, client polls or refreshes state.

For dev: stub via `purchaseDevStub(sku)` so the web preview works without Stripe keys.

Add the SDK install:
- The Stripe.js library is loaded via CDN in `index.html`'s head:
```html
<script src="https://js.stripe.com/v3/"></script>
```
ADD this script tag to `index.html` `<head>` after the meta tags but before the existing inline `<style>` block. Use a comment to identify it as the Stripe SDK.

Commit: "Worker M: Stripe checkout flow stub (web fallback) + Stripe.js CDN load"

VERIFICATION:
1. `cd /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2`
2. `node --check js/meta/meta-iap.js`
3. `grep -c "id:" js/meta/meta-iap.js` — confirm 12 SKUs unchanged (12 occurrences of `id:` inside the SKUS array; ignore other `id:` lines)
4. Open `wraithgrove` server in browser → eval `WG.IAP.purchase('starter_bundle').then(r => console.log(r))` — should resolve via dev stub (since browser has no Capacitor) and grant currencies.

CONSTRAINTS:
- Three concerns. Three commits.
- Do NOT change SKU id strings, prices, or grants. Path A is locked.
- Do NOT touch `meta-ads.js` (W-N scope), `wg-state.js`, or any tab module.
- Per project CLAUDE.md "Touching IAP / monetization": Path A faithful is canonical; do NOT soften toward Path B/C.
- Per Hive Rules: do not delegate to further sub-agents.
- If `@capacitor/in-app-purchases` plugin install fails: note in marker, leave the stub in place, ask the Architect to confirm plugin choice.

You are Worker M. After you ship: real IAP works on iOS/Android once the Architect creates the App Store Connect + Google Play Console products + provides Stripe keys for the web channel. The Path A monetization layer is wired end-to-end (client side; server side is W-O).