# Privacy Nutrition Labels — Wraithgrove

> App Store Connect requires privacy labels before first TestFlight external or App Store submission.
> Complete this doc before submitting. Answers here → paste into App Store Connect privacy questionnaire.

---

## Data Not Collected

Wraithgrove DOES NOT collect any of the following that would require disclosure:

| Data Type | Status | Notes |
|---|---|---|
| Name | Not collected | Anonymous device-ID only (`meta-account.js`) |
| Email | Not collected unless user upgrades to named account (stub) |
| Phone number | Not collected | |
| Physical address | Not collected | |
| Payment info | Processed by Apple StoreKit / not seen by app | |
| Health & fitness | Not collected | |
| Financial info | Not collected | |
| Location (precise) | Not collected | |
| Location (coarse) | Not collected | |
| Contacts | Not collected | |
| User content (messages, photos, etc.) | Not collected | |
| Browsing history | Not collected | |
| Search history | Not collected | |
| Crash data | Not collected currently (add Crashlytics before public launch) |

---

## Data Collected (or may be collected via SDKs)

### Device Identifiers
- **What**: Anonymous device ID (`WG.Account.deviceId`) stored in `localStorage`
- **Why**: Enables cross-session save continuity without requiring account creation
- **Linked to user**: No — anonymous UUID
- **Used for tracking**: No
- **App Store label**: "Device ID — Not Linked to You — App Functionality"

### Usage Data (via AdMob — when wired)
- **What**: Ad interaction metrics, impression data
- **Why**: Ad revenue (Path A monetization)
- **Linked to user**: Per AdMob policy — may link to advertising ID (IDFA)
- **IDFA**: App MUST request ATT (App Tracking Transparency) permission before accessing IDFA
  - `NSUserTrackingUsageDescription` key REQUIRED in Info.plist before AdMob production wiring
  - Current status: AdMob is a STUB — ATT prompt not yet wired
- **App Store label**: "Usage Data — Third-Party Advertising — Linked to You (if ATT granted)"

### Purchase History (via StoreKit — when wired)
- **What**: Which IAP SKUs the user has purchased
- **Why**: Entitlement checks (ad-removal, currency packs)
- **Linked to user**: Managed by Apple, not Wraithgrove servers
- **App Store label**: "Purchases — App Functionality — Not Linked to You"

---

## Required Info.plist Keys (add before production wiring)

```xml
<!-- Add when AdMob is wired -->
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX</string>

<!-- Add when ATT prompt is implemented -->
<key>NSUserTrackingUsageDescription</key>
<string>Wraithgrove uses this identifier to show you relevant ads. Declining does not affect gameplay.</string>
```

---

## ATT Pre-Prompt Strategy (TestFlight note)

Per BLUEPAPER §0 Rule 5: ad SDK must not auto-launch apps or open malicious URLs.
Before production AdMob wiring:
1. Implement ATT pre-prompt ("Allow tracking to see fewer irrelevant ads")
2. Use Google's UMP SDK for GDPR/CCPA compliance (EU + California users)
3. Confirm AdMob mediation groups exclude any SDK violating §0 Rule 5

---

## Stripe Notes

- Stripe.js/mobile SDK handles PCI compliance — Wraithgrove never sees raw card data
- Only tokenized payment intent IDs pass through the app
- No separate payment card industry data disclosure required in privacy labels

---

*Last updated: 2026-05-05 by W-Capacitor-iOS-Shell*
*Next review: Before first external TestFlight or App Store submission*
