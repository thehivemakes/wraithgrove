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
    // W-Monetization-V2-Energy §E — refill ladder. Refill_30 carries the
    // "Best Value!" badge (middle-anchored psychology). Stripe/StoreKit wiring
    // happens in W-N_AdMob-Wire / Phase 3 — purchase() falls through to the
    // dev stub for now.
    { id: 'refill_5',   price: 0.99,  type: 'energy', grants: { energy: 5 } },
    { id: 'refill_15',  price: 1.99,  type: 'energy', grants: { energy: 15 } },
    { id: 'refill_30',  price: 4.99,  type: 'energy', grants: { energy: 30 }, bestValue: true },
    { id: 'refill_60',  price: 9.99,  type: 'energy', grants: { energy: 60 } },
    { id: 'refill_150', price: 19.99, type: 'energy', grants: { energy: 150 } },

    // W-Monetization-V2-Whale-Ladder §A — gem packs (premium gacha currency)
    { id: 'gems_5',    price: 0.99,  type: 'gems', name: "Pocket Pouch",        display: '50 💎',               grants: { gems: 50 } },
    { id: 'gems_15',   price: 1.99,  type: 'gems', name: "Traveler's Bag",      display: '150 + 15 💎',         grants: { gems: 165 } },
    { id: 'gems_30',   price: 4.99,  type: 'gems', name: "Wandering Chest",     display: '300 + 60 💎',         grants: { gems: 360 }, bestValue: true },
    { id: 'gems_60',   price: 9.99,  type: 'gems', name: "Pilgrim's Hoard",     display: '600 + 200 💎',        grants: { gems: 800 } },
    { id: 'gems_150',  price: 19.99, type: 'gems', name: "Shrine Vault",        display: '1500 + 700 💎',       grants: { gems: 2200 } },
    { id: 'gems_500',  price: 49.99, type: 'gems', name: "Ancestral Treasury",  display: '5000 + 3000 💎',      grants: { gems: 8000 } },
    { id: 'gems_1500', price: 99.99, type: 'gems', name: "Sovereign Trove",     display: '15000 + 10000 💎',    grants: { gems: 25000 } },

    // W-Monetization-V2-Whale-Ladder §A — timed bundles
    // starter_pack: one-time only, expires 7d after install. Contents: 500 gems + 50 frags + 1 rare relic pull + 30 energy + cosmetic.
    { id: 'starter_pack',  price: 4.99,  type: 'bundle', oneTimeOnly: true, expiresAfterInstallMs: 604800000,
      name: 'Starter Pack', display: '500 💎 + 50 frags + Rare Relic + 30 ⚡ + exclusive cosmetic',
      grants: { gems: 500, craftFragments: 50, energy: 30, starterCosmeticGranted: true, pullRare: true } },
    // weekly_deal: resets every 7 days. Contents: 200 gems + 100 frags + 50 energy + 1000 XP.
    { id: 'weekly_deal',   price: 9.99,  type: 'bundle', resetMs: 604800000,
      name: 'Weekly Deal',  display: '200 💎 + 100 frags + 50 ⚡ + 1000 XP',
      grants: { gems: 200, craftFragments: 100, energy: 50, xp: 1000 } },
    // monthly_deal: resets every 28 days. Contents: 800 gems + 500 frags + 200 energy + 1 legendary relic pull.
    { id: 'monthly_deal',  price: 19.99, type: 'bundle', resetMs: 2419200000,
      name: 'Monthly Deal', display: '800 💎 + 500 frags + 200 ⚡ + Legendary Relic',
      grants: { gems: 800, craftFragments: 500, energy: 200, pullLegendary: true } },

    // W-Monetization-V2-Whale-Ladder §A — Royal Pass subscription ($14.99/mo auto-renew)
    // Apple §3.1.2 + FTC 2024: recurring billing and cancel path are clearly disclosed in the subscription paywall UI (meta-shop.js §E).
    { id: 'royal_pass_monthly', price: 14.99, type: 'subscription', period: 'P1M',
      name: 'Royal Pass', display: '2× stage rewards · +20 energy cap · +10 daily · 20% gem discount · exclusive monthly stage',
      grants: { royalPassActive: true } },
    // W-Monetization-V2-Missions-Pass §D — Season 1 battle pass premium unlock ($9.99).
    { id: 'battle_pass_s1', price: 9.99, type: 'entitlement',
      name: 'Whispering Pines Pass', display: 'Premium track unlock — 60-level Season 1 battle pass',
      grants: { battlePassPremium: 'wraithgrove_s1' } },

    // W-Special-Abilities §D — individual ability charge packs
    { id: 'ability_pack_wraith_banish',    price: 1.99, type: 'ability_pack',
      name: 'Wraith Banish Pack',     display: '5× Wraith Banish charges',
      grants: { abilityCharges: { wraith_banish: 5 } } },
    { id: 'ability_pack_lantern_pulse',    price: 1.99, type: 'ability_pack',
      name: 'Lantern Pulse Pack',     display: '5× Lantern Pulse charges',
      grants: { abilityCharges: { lantern_pulse: 5 } } },
    { id: 'ability_pack_time_slow',        price: 2.99, type: 'ability_pack',
      name: 'Time Slow Pack',         display: '3× Time Slow charges',
      grants: { abilityCharges: { time_slow: 3 } } },
    { id: 'ability_pack_soul_magnet',      price: 1.99, type: 'ability_pack',
      name: 'Soul Magnet Pack',       display: '5× Soul Magnet charges',
      grants: { abilityCharges: { soul_magnet: 5 } } },
    { id: 'ability_pack_shadow_strike',    price: 2.99, type: 'ability_pack',
      name: 'Shadow Strike Pack',     display: '3× Shadow Strike charges',
      grants: { abilityCharges: { shadow_strike: 3 } } },
    { id: 'ability_pack_paper_charm_ward', price: 4.99, type: 'ability_pack',
      name: 'Paper Charm Ward Pack',  display: '1× Paper Charm Ward charge',
      grants: { abilityCharges: { paper_charm_ward: 1 } } },
    { id: 'ability_starter_bundle',        price: 4.99, type: 'ability_pack', oneTimeOnly: true,
      name: 'Ability Starter Bundle', display: '2× charges of each common ability (6 total)',
      grants: { abilityCharges: { wraith_banish: 2, lantern_pulse: 2, soul_magnet: 2 } } },
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
    // One-time bundles: reject if already owned
    if (sku.oneTimeOnly && s.iap.ownedSKUs.includes(sku.id)) {
      return Promise.resolve({ ok: false, reason: 'already purchased' });
    }
    // Timed bundles: reject if within reset window
    if (sku.resetMs) {
      const lastMs = s.iap.bundleLastPurchased[sku.id] || 0;
      if (Date.now() - lastMs < sku.resetMs) {
        return Promise.resolve({ ok: false, reason: 'not yet reset' });
      }
    }
    const g = sku.grants;
    if (g.coins)           WG.State.grant('coins', g.coins);
    if (g.diamonds)        WG.State.grant('diamonds', g.diamonds);
    if (g.cards)           WG.State.grant('cards', g.cards);
    if (g.gems)            WG.State.grant('gems', g.gems);
    if (g.energy && WG.State.grantEnergy) WG.State.grantEnergy(g.energy, 'iap-bundle');
    if (g.craftFragments)  s.forge.craftFragments = (s.forge.craftFragments || 0) + g.craftFragments;
    if (g.xp)              s.player.xp = (s.player.xp || 0) + g.xp;
    if (g.adRemovalActive)        s.iap.adRemovalActive = true;
    if (g.premiumUnlock)          s.iap.premiumUnlock = true;
    if (g.megaBundleClaimed)      s.iap.megaBundleClaimed = true;
    if (g.starterCosmeticGranted) s.iap.starterCosmeticGranted = true;
    // Guaranteed rarity pulls (bundle rewards)
    if (g.pullRare      && window.WG.Gacha) WG.Gacha.pullTiered('standard', 'rare');
    if (g.pullLegendary && window.WG.Gacha) WG.Gacha.pullTiered('standard', 'legendary');
    // Royal Pass subscription activation
    // W-Special-Abilities: ability charge packs — WG.SpecialAbilities may not yet
    // be initialised at stub call time (e.g. during restore); guard with optional chain.
    if (g.abilityCharges) {
      for (const abilityId in g.abilityCharges) {
        if (window.WG && WG.SpecialAbilities && WG.SpecialAbilities.addCharge) {
          WG.SpecialAbilities.addCharge(abilityId, g.abilityCharges[abilityId]);
        }
      }
    }
    if (g.royalPassActive) {
      s.subscriptions.royalPass.active = true;
      s.subscriptions.royalPass.expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
      s.energy.max = WG.State.ENERGY_TUNABLES.MAX + 20; // +20 VIP cap
      WG.Engine.emit('royal-pass:activated', {});
    }
    // Track timed bundle purchase timestamp
    if (sku.resetMs) s.iap.bundleLastPurchased[sku.id] = Date.now();
    if (!s.iap.ownedSKUs.includes(sku.id)) s.iap.ownedSKUs.push(sku.id);
    WG.Engine.emit('iap:purchased', { sku, grants: g, channel: 'dev' });
    return Promise.resolve({ ok: true, sku, grants: g, channel: 'dev', transaction_id: 'dev-' + Date.now() });
  }

  // Returns true if a bundle SKU is currently purchaseable (one-time check, timed window check).
  function isAvailable(id) {
    const sku = bySKU(id);
    if (!sku) return false;
    const s = WG.State.get();
    if (sku.oneTimeOnly) {
      if (s.iap.ownedSKUs.includes(id)) return false;
      // Expires 7d after install
      if (sku.expiresAfterInstallMs && s.meta.installTimeMs) {
        if (Date.now() - s.meta.installTimeMs > sku.expiresAfterInstallMs) return false;
      }
    }
    if (sku.resetMs) {
      const lastMs = (s.iap.bundleLastPurchased && s.iap.bundleLastPurchased[id]) || 0;
      if (lastMs && Date.now() - lastMs < sku.resetMs) return false;
    }
    return true;
  }

  // Returns ms until a timed bundle resets (0 if available now).
  function bundleResetIn(id) {
    const sku = bySKU(id);
    if (!sku || !sku.resetMs) return 0;
    const s = WG.State.get();
    const lastMs = (s.iap.bundleLastPurchased && s.iap.bundleLastPurchased[id]) || 0;
    if (!lastMs) return 0;
    return Math.max(0, sku.resetMs - (Date.now() - lastMs));
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

  // Channel dispatcher — W-Compliance-Disclosure Concern A: shows confirmPurchase modal first.
  async function purchase(id) {
    const sku = bySKU(id);
    if (!sku) return { ok: false, reason: 'unknown sku' };
    if (window.WG && WG.Compliance) {
      const confirmed = await WG.Compliance.confirmPurchase(sku);
      if (!confirmed) return { ok: false, reason: 'user_cancelled' };
    }
    const ch = detectChannel();
    if (ch === 'apple')  return purchaseApple(sku);
    if (ch === 'google') return purchaseGoogle(sku);
    return purchaseStripe(sku);
  }

  // W-Ad-Removal-Cross-Device — Concern A
  // Checks local purchase record and platform receipt store for ad_removal SKU.
  // Silent on launch (ok=false/restored=false is normal for non-purchasers).
  // Stubs call platform API when Capacitor plugin is present; fall back to local check.
  // Phase 3: replace stub bodies with real receipt-validation server call POST /wg/iap-grant.

  function restoreLocal() {
    const s = WG.State.get();
    const had = s.iap.adRemovalActive;
    if (s.iap.ownedSKUs.includes('ad_removal')) {
      s.iap.adRemovalActive = true;
    }
    const restored = !had && s.iap.adRemovalActive;
    if (restored) {
      WG.Engine.emit('iap:restored', { skus: ['ad_removal'] });
      WG.Cache.save();
    }
    return Promise.resolve({ ok: true, restored, skus: restored ? ['ad_removal'] : [] });
  }

  function restoreApple() {
    // Phase 3: call plugin.restorePurchases() and validate receipts at POST /wg/iap-grant.
    const plugin = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.InAppPurchases;
    if (!plugin) return restoreLocal();
    return plugin.restorePurchases()
      .then(function(result) {
        const s = WG.State.get();
        const had = s.iap.adRemovalActive;
        let found = false;
        (result.transactions || []).forEach(function(t) {
          if (t.productId === 'ad_removal') {
            s.iap.adRemovalActive = true;
            if (!s.iap.ownedSKUs.includes('ad_removal')) s.iap.ownedSKUs.push('ad_removal');
            found = true;
          }
        });
        const restored = !had && found;
        if (restored) {
          WG.Engine.emit('iap:restored', { skus: ['ad_removal'] });
          WG.Cache.save();
        }
        return { ok: true, restored, skus: found ? ['ad_removal'] : [] };
      })
      .catch(function(err) {
        console.warn('[WG.IAP] Apple restore failed — falling back to local', err);
        return restoreLocal();
      });
  }

  function restoreGoogle() {
    // Phase 3: call plugin.restorePurchases() / queryPurchases and validate at POST /wg/iap-grant.
    const plugin = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.InAppPurchases;
    if (!plugin) return restoreLocal();
    return plugin.restorePurchases()
      .then(function(result) {
        const s = WG.State.get();
        const had = s.iap.adRemovalActive;
        let found = false;
        (result.transactions || []).forEach(function(t) {
          if (t.productId === 'ad_removal') {
            s.iap.adRemovalActive = true;
            if (!s.iap.ownedSKUs.includes('ad_removal')) s.iap.ownedSKUs.push('ad_removal');
            found = true;
          }
        });
        const restored = !had && found;
        if (restored) {
          WG.Engine.emit('iap:restored', { skus: ['ad_removal'] });
          WG.Cache.save();
        }
        return { ok: true, restored, skus: found ? ['ad_removal'] : [] };
      })
      .catch(function(err) {
        console.warn('[WG.IAP] Google restore failed — falling back to local', err);
        return restoreLocal();
      });
  }

  function restorePurchases() {
    const ch = detectChannel();
    if (ch === 'apple')  return restoreApple();
    if (ch === 'google') return restoreGoogle();
    return restoreLocal();
  }

  function init() {
    // Silent restore on launch — confirms ad_removal entitlement from platform receipt store.
    // Non-purchasers get ok=true, restored=false — that is normal and expected.
    restorePurchases().catch(function() {});
  }

  window.WG.IAP = { init, list, bySKU, purchase, isAvailable, bundleResetIn, restorePurchases, SKUS };
})();
