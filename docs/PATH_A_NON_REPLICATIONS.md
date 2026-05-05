# Path A Non-Replications

Wraithgrove is a faithful mechanics-clone of Wood Siege (Path A). Two behaviors are **deliberately NOT replicated** — both are named bugs in Wood Siege player reviews. Replicating the mechanics is intentional; replicating these specific failures is not.

---

## Non-Replication #1 — Cross-device ad-removal (this file's primary concern)

**Wood Siege bug:** The `ad_removal` SKU does not transfer when the same Apple/Google account installs the game on a new device. The player paid once and has to pay again on a new phone.

**Source:** aj griffing, App Store review — named this explicitly.

**Wraithgrove fix:** The `ad_removal` SKU is cross-device transferable via account-upgrade (Phase 4 server-side receipt validation). The `WG.IAP.restorePurchases()` function (added W-Ad-Removal-Cross-Device) bridges the entitlement from the platform (Apple StoreKit / Google Play Billing) back to local state.

**Current implementation state (Phase 2 stub):**
- `restorePurchases()` in `js/meta/meta-iap.js` — checks local `ownedSKUs` and re-flags `adRemovalActive`. Falls back to local when native plugin is absent.
- Called silently on app launch from `WG.IAP.init()`.
- Called manually from Settings modal "Restore Purchases" button (`js/wg-game.js:openSettingsModal()`).
- Platform API stubs (`restoreApple()`, `restoreGoogle()`) are shaped for Phase 3 slot-in. The Phase 3 worker replaces the stub body with real receipt validation POST /wg/iap-grant.

**Ad bypass behavior (Concern B):** When `adRemovalActive` is true, `showRewardedVideo()` skips the ad UI but still emits `'ad:rewarded'` so callers grant the in-game reward. The player paid; they keep the buff. Interstitials are simply suppressed (no reward to grant).

---

## Non-Replication #2 — Secured ad SDK

**Wood Siege bug:** The ad SDK in Wood Siege makes unauthorized cross-app launches (Walmart, Facebook, Instagram) without user tap. This is a security/UX failure, not a monetization feature.

**Source:** AD_BAIT_LIBRARY.md §6; BLUEPAPER.md §0 Rule 5.

**Wraithgrove fix:** Production SDK must be tier-1 (AdMob, IronSource, AppLovin MAX, Unity Ads) with `isExternal: false` on all ad units to block redirect and deep-link launches. This is enforced at the SDK configuration level, not in application code. See `js/meta/meta-ads.js` `showAdMobRewarded()` and `showAdMobInterstitial()` — both already pass `isExternal: false`.

**Note:** This non-replication was documented in BLUEPAPER.md §0 Rule 5 before this file was created. This entry is for completeness.

---

*First compiled by Cord (W-Ad-Removal-Cross-Device worker), 2026-05-05.*
*Both non-replications blessed in build-v2/CLAUDE.md and BLUEPAPER.md §7.*
