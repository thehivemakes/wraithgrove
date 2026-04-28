// WG.IAP — IAP SKU table (Path A: faithful clone of comp's tier structure)
(function(){'use strict';
  // Path A: 10 SKUs from $0.99 to $19.99 + $4.99 ad-removal + $99.99 mega-bundle
  const SKUS = [
    { id: 'coin_pack_pocket',  price: 0.99,  type: 'currency', grants: { coins: 500 } },
    { id: 'coin_pack_pouch',   price: 2.99,  type: 'currency', grants: { coins: 1800,  diamonds: 5 } },
    { id: 'coin_pack_chest',   price: 4.99,  type: 'currency', grants: { coins: 3500,  diamonds: 15 } },
    { id: 'coin_pack_hoard',   price: 9.99,  type: 'currency', grants: { coins: 8000,  diamonds: 40 } },
    { id: 'coin_pack_vault',   price: 19.99, type: 'currency', grants: { coins: 18000, diamonds: 100 } },
    { id: 'diamond_starter',   price: 0.99,  type: 'currency', grants: { diamonds: 30 } },
    { id: 'card_pack_basic',   price: 2.99,  type: 'currency', grants: { cards: 10 } },
    { id: 'card_pack_premier', price: 9.99,  type: 'currency', grants: { cards: 40, diamonds: 20 } },
    { id: 'starter_bundle',    price: 4.99,  type: 'bundle',   grants: { coins: 2000, diamonds: 25, cards: 5 } },
    { id: 'champion_bundle',   price: 9.99,  type: 'bundle',   grants: { coins: 4500, diamonds: 60, cards: 12 } },
    { id: 'ad_removal',        price: 4.99,  type: 'entitlement', grants: { adRemovalActive: true, premiumUnlock: true } },
    { id: 'mega_bundle',       price: 99.99, type: 'bundle',   grants: { coins: 200000, diamonds: 1500, cards: 250, megaBundleClaimed: true } },
  ];

  function bySKU(id) { return SKUS.find(s => s.id === id); }
  function list() { return SKUS.slice(); }

  // Channel detection: Capacitor platform → apple/google, else stripe (web/PWA)
  function detectChannel() {
    if (window.Capacitor && window.Capacitor.getPlatform) {
      const p = window.Capacitor.getPlatform();
      if (p === 'ios') return 'apple';
      if (p === 'android') return 'google';
    }
    return 'stripe';
  }

  // Dev stub: simulates grant + emit without native plugin or network
  function purchaseDevStub(sku) {
    const s = WG.State.get();
    if (s.iap.ownedSKUs.includes(sku.id) && sku.type === 'entitlement') {
      return Promise.resolve({ ok: false, reason: 'already owned' });
    }
    const g = sku.grants;
    if (g.coins)    WG.State.grant('coins', g.coins);
    if (g.diamonds) WG.State.grant('diamonds', g.diamonds);
    if (g.cards)    WG.State.grant('cards', g.cards);
    if (g.adRemovalActive)   s.iap.adRemovalActive = true;
    if (g.premiumUnlock)     s.iap.premiumUnlock = true;
    if (g.megaBundleClaimed) s.iap.megaBundleClaimed = true;
    s.iap.ownedSKUs.push(sku.id);
    WG.Engine.emit('iap:purchased', { sku, grants: g, channel: 'dev' });
    return Promise.resolve({ ok: true, sku, grants: g, channel: 'dev', transaction_id: 'dev-' + Date.now() });
  }

  // Apple StoreKit via @capacitor/in-app-purchases
  // Production: npm install @capacitor/in-app-purchases && npx cap sync
  // App Store Connect: create 12 product IDs matching SKUS[].id strings
  // Server validation endpoint POST /wg/iap-grant is W-O scope
  function purchaseApple(sku) {
    const plugin = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.InAppPurchases;
    if (!plugin) {
      console.warn('[WG.IAP] InAppPurchases plugin missing — falling back to dev stub (iOS)');
      return purchaseDevStub(sku);
    }
    return plugin.purchase({ productId: sku.id })
      .then(function(result) {
        return fetch('/wg/iap-grant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform: 'apple', sku: sku.id, receipt: result.receipt }),
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (!data.ok) return { ok: false, reason: data.reason || 'server grant failed' };
          WG.Engine.emit('iap:purchased', { sku, grants: sku.grants, channel: 'apple' });
          return { ok: true, sku, grants: sku.grants, channel: 'apple', transaction_id: result.transactionId };
        });
      })
      .catch(function(err) {
        return { ok: false, reason: err.message || 'apple purchase failed' };
      });
  }

  // Google Play Billing via @capacitor/in-app-purchases
  // Production: npm install @capacitor/in-app-purchases && npx cap sync
  // Google Play Console: create 12 product IDs matching SKUS[].id strings
  // Server validation endpoint POST /wg/iap-grant is W-O scope
  function purchaseGoogle(sku) {
    const plugin = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.InAppPurchases;
    if (!plugin) {
      console.warn('[WG.IAP] InAppPurchases plugin missing — falling back to dev stub (Android)');
      return purchaseDevStub(sku);
    }
    return plugin.purchase({ productId: sku.id })
      .then(function(result) {
        return fetch('/wg/iap-grant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform: 'google', sku: sku.id, purchaseToken: result.purchaseToken }),
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (!data.ok) return { ok: false, reason: data.reason || 'server grant failed' };
          WG.Engine.emit('iap:purchased', { sku, grants: sku.grants, channel: 'google' });
          return { ok: true, sku, grants: sku.grants, channel: 'google', transaction_id: result.transactionId };
        });
      })
      .catch(function(err) {
        return { ok: false, reason: err.message || 'google purchase failed' };
      });
  }

  // Stripe web checkout (web/PWA fallback)
  // Server endpoint POST /wg/stripe-create-session returns { sessionId, publishableKey } (W-O scope)
  // Server webhook POST /wg/stripe-webhook fires /wg/iap-grant on payment_intent.succeeded
  // Client polls or refreshes state after redirect return
  function purchaseStripe(sku) {
    if (typeof Stripe === 'undefined') {
      console.warn('[WG.IAP] Stripe.js not loaded — falling back to dev stub');
      return purchaseDevStub(sku);
    }
    return fetch('/wg/stripe-create-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: sku.id }),
    })
    .then(function(r) {
      if (!r.ok) throw new Error('stripe-create-session ' + r.status);
      return r.json();
    })
    .then(function(data) {
      var stripe = Stripe(data.publishableKey);
      return stripe.redirectToCheckout({ sessionId: data.sessionId });
    })
    .catch(function(err) {
      // Server not yet live (W-O scope) — fall back to dev stub
      console.warn('[WG.IAP] Stripe checkout unavailable (' + err.message + ') — falling back to dev stub');
      return purchaseDevStub(sku);
    });
  }

  // Channel dispatcher
  function purchase(id) {
    const sku = bySKU(id);
    if (!sku) return Promise.resolve({ ok: false, reason: 'unknown sku' });
    const ch = detectChannel();
    if (ch === 'apple')  return purchaseApple(sku);
    if (ch === 'google') return purchaseGoogle(sku);
    return purchaseStripe(sku);
  }

  function init() {}
  window.WG.IAP = { init, list, bySKU, purchase, SKUS };
})();
