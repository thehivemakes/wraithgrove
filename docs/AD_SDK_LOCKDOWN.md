# AD_SDK_LOCKDOWN.md — AdMob configuration discipline

Per BLUEPAPER §0 Rule 5 + the comp's named SDK security failures (AD_BAIT_LIBRARY.md §6.5–§6.8),
Wraithgrove's AdMob configuration explicitly disables the creative categories that auto-redirect
to other apps.

## Required at AdMob admin panel (Architect manual step before App Store / Play Store launch)

1. **Block "Auto-clicking" creatives.** AdMob > App Settings > Ad Filtering > Creative Categories > set the following to BLOCKED:
   - `Auto-redirect`
   - `Cross-app deep link`
   - `App-store-launch on impression`
   - `In-app browser launch without user tap`

2. **Block specific advertiser app launches.** Add to AdMob > Blocked Advertisers:
   - Walmart (and any large-retail apps the player demographic might have installed)
   - Banking apps
   - Social media apps (Facebook, Instagram, X, TikTok) — these were the most-named in the comp's 1-star reviews

3. **Restrict creative formats.** AdMob > Ad Format Restrictions:
   - Disable: `Playable ads with deep-link launch`
   - Disable: `Video ads with auto-tap`
   - Allow: `Standard video ads`, `Static image rewarded ads`

4. **Set explicit content filters.** Block creatives flagged for: deceptive UI, fake-system-alert simulation, false reward claims.

5. **Geofence to safe regions only at launch.** Restrict ad serving to US, CA, UK, AU, DE, FR for the first 30 days; expand only after no auto-redirect complaints in soft-launch reviews.

## SDK-level lockdown already applied in code

`meta-ads.js` enforces `isExternal: false` on every `prepareRewardVideoAd` and
`prepareInterstitial` call. This is the Capacitor AdMob plugin flag that prevents
creatives from launching an in-app browser or deep-linking to another app without
an explicit user tap. The AdMob admin filters above are a second layer — belt AND
suspenders, because one filter can be bypassed by a misconfigured creative but not
both simultaneously.

## Mandatory monitoring

After every soft-launch + public-launch cycle:
- Check first 100 reviews for any mention of: cross-app launch, malicious URL,
  Walmart/Facebook/Instagram opening unsolicited, "creepy" pop-ups
- If detected → emergency hotfix within 48 hours OR pull the build
  (per BLUEPAPER §9 kill criteria)

## Why this matters

The comp (Wood Siege / SF Group) shipped at ~3.9/5 with a 1M+ install base partly
because its faithful audience tolerates minor friction. But the unauthorized-redirect
behavior cost specific players (likegoodgames, 123729506, Whydoihavetouseanickname?)
their trust. Their reviews exist on the App Store as permanent record.

Wraithgrove's anchor (Klovur) is the **time-on-ad ratio pain** — that we replicate.
The **SDK security pain** we do not. The two are separable, despite shipping in the
same SDK in the comp's build. The isExternal flag + admin-panel filters are how we
make that separation real in production.
