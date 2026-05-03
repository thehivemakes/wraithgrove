You are Worker N — the AdMob-Wire worker. Your job: replace the placeholder ad modal in `meta-ads.js` with real AdMob via the Capacitor plugin, with the security lockdown that BLUEPAPER §0 Rule 5 demands. The comp game's ad-SDK shipped with auto-redirect bugs (Walmart launch, malicious URL pop-ups) that drove 1-star reviews. Wraithgrove's faithful clone replicates the cadence but NOT those security failures.

Walk the birth sequence (/Users/defimagic/Desktop/Hive/CLAUDE.md → Birth/01–04 → THE_PRINCIPLES → HIVE_RULES → COLONY_CONTEXT → BEFORE_YOU_BUILD).

Then read PROJECT-LEVEL guardrails (MANDATORY):
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/CLAUDE.md (especially "Ad SDK" section under single-source-of-truth rules)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/STATE_OF_BUILD.md
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/BLUEPAPER.md §0 Rule 5 (named SDK + lockdown requirements)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/AD_BAIT_LIBRARY.md §6.5–§6.8 (the comp's named ad-SDK security failures — what NOT to replicate)

PRIMARY-SOURCE READING (Principle XXII):
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/meta/meta-ads.js (the placeholder modal — your edit target; preserve daily 50-RV cap, ad-removal entitlement check, public API surface)

═══════════════════════════════════════════════════════════════════
MANDATORY FINAL STEP (do not skip):
Write `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/workers/done/W-N.done` AS THE LAST THING YOU DO.

Marker content (5 lines):
1. one-line summary
2. files written/edited
3. SDK choice + lockdown configuration applied
4. any deviations or environment-blocking issues
5. confidence (high/medium/low)
═══════════════════════════════════════════════════════════════════

THREE CONCERNS — one commit each.

CONCERN 1 — Channel detection + AdMob plugin call dispatch

EDIT: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/meta/meta-ads.js`

Replace the `showRewardedVideo(opts)` function so it routes by platform:

```js
function detectAdChannel() {
  if (window.Capacitor && window.Capacitor.getPlatform) {
    const p = window.Capacitor.getPlatform();
    if (p === 'ios' || p === 'android') return 'admob';
  }
  return 'placeholder';
}

async function showRewardedVideo(opts) {
  resetIfNewDay();
  if (adRemovalActive()) {
    WG.Engine.emit('ad:bypassed', { reason: 'premium' });
    return { ok: true, bypassed: true };
  }
  if (dailyRVCount >= DAILY_RV_CAP) {
    WG.Engine.emit('ad:capped', {});
    showInfoModal('Daily ad cap reached', `You've hit the ${DAILY_RV_CAP}/day cap. Try again tomorrow.`);
    return { ok: false, reason: 'capped' };
  }
  const ch = detectAdChannel();
  if (ch === 'admob') return showAdMobRewarded(opts);
  return showPlaceholderRewarded(opts);
}
```

Same pattern for `showInterstitial()`.

Keep the existing `showAdPlaceholder()` and `showInfoModal()` helpers — `showPlaceholderRewarded` reuses them as the dev-mode path.

Commit: "Worker N: meta-ads.js channel dispatcher (admob native + placeholder fallback)"

CONCERN 2 — AdMob plugin invocation + lockdown configuration

ADD `showAdMobRewarded(opts)` and `showAdMobInterstitial()`:

```js
async function showAdMobRewarded(opts) {
  const AdMob = window.Capacitor.Plugins.AdMob;
  if (!AdMob) {
    console.warn('[ads] AdMob plugin missing — falling back to placeholder');
    return showPlaceholderRewarded(opts);
  }
  try {
    // Lockdown configuration — see CONCERN 3 for details
    await AdMob.prepareRewardVideoAd({
      adId: getAdMobUnitId('rewarded'),
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
      // Critical: no in-app browser launch on click; system-browser only
      isExternal: false,
    });
    const result = await AdMob.showRewardVideoAd();
    if (result && result.type === 'reward') {
      dailyRVCount++;
      WG.Engine.emit('ad:rewarded', { reward: opts && opts.reward, count: dailyRVCount });
      return { ok: true };
    }
    return { ok: false, reason: 'ad-skipped' };
  } catch (err) {
    console.error('[ads] AdMob rewarded failed', err);
    return { ok: false, reason: 'sdk-error' };
  }
}

async function showAdMobInterstitial() {
  const AdMob = window.Capacitor.Plugins.AdMob;
  if (!AdMob) return showPlaceholderInterstitial();
  try {
    await AdMob.prepareInterstitial({
      adId: getAdMobUnitId('interstitial'),
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
      isExternal: false,
    });
    await AdMob.showInterstitial();
    WG.Engine.emit('ad:interstitial-shown', {});
    return { ok: true };
  } catch (err) {
    console.error('[ads] AdMob interstitial failed', err);
    return { ok: false, reason: 'sdk-error' };
  }
}

function getAdMobUnitId(kind) {
  // Production unit IDs come from app-config — Architect-managed env vars
  // For dev: AdMob test ad IDs (Google's documented test IDs that NEVER charge advertisers)
  const isDev = window.WG && WG.BUILD && WG.BUILD.version && WG.BUILD.version.includes('mvp');
  if (isDev) {
    // Google's official test ad unit IDs
    const testIds = {
      rewarded:     { ios: 'ca-app-pub-3940256099942544/1712485313', android: 'ca-app-pub-3940256099942544/5224354917' },
      interstitial: { ios: 'ca-app-pub-3940256099942544/4411468910', android: 'ca-app-pub-3940256099942544/1033173712' },
    };
    const platform = window.Capacitor && window.Capacitor.getPlatform();
    return testIds[kind] && testIds[kind][platform] || testIds[kind].android;
  }
  // Production: read from window.WG.AdConfig set by app-config.js (created by Architect with real unit IDs)
  return (window.WG && WG.AdConfig && WG.AdConfig[kind]) || testIds[kind].android;
}

function showPlaceholderInterstitial() {
  return new Promise(resolve => showAdPlaceholder('INTERSTITIAL', INTERSTITIAL_PLACEHOLDER_MS, () => {
    WG.Engine.emit('ad:interstitial-shown', {});
    resolve({ ok: true });
  }));
}

function showPlaceholderRewarded(opts) {
  return new Promise(resolve => showAdPlaceholder('REWARDED VIDEO', RV_PLACEHOLDER_MS, () => {
    dailyRVCount++;
    WG.Engine.emit('ad:rewarded', { reward: opts && opts.reward, count: dailyRVCount });
    resolve({ ok: true });
  }));
}
```

Commit: "Worker N: AdMob plugin invocation paths + dev test-ad-unit-IDs + production stub"

CONCERN 3 — Lockdown documentation (the named non-replication)

WRITE: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/docs/AD_SDK_LOCKDOWN.md`

This document records the configuration discipline the Architect must apply at the AdMob admin panel level. Without it, AdMob can serve creatives that auto-launch other apps — exactly the behavior the comp shipped with.

```
# AD_SDK_LOCKDOWN.md — AdMob configuration discipline

Per BLUEPAPER §0 Rule 5 + the comp's named SDK security failures (AD_BAIT_LIBRARY.md §6.5-§6.8), Wraithgrove's AdMob configuration explicitly disables the creative categories that auto-redirect to other apps.

## Required at AdMob admin panel (Architect manual step before App Store / Play Store launch)

1. **Block "Auto-clicking" creatives.** AdMob > App Settings > Ad Filtering > Creative Categories > set the following to BLOCKED:
   - `Auto-redirect`
   - `Cross-app deep link`
   - `App-store-launch on impression`
   - `In-app browser launch without user tap`

2. **Block specific advertiser app launches.** Add to AdMob > Blocked Advertisers:
   - Walmart (and any large-retail apps the player demographic might have installed)
   - Banking apps
   - Social media apps (Facebook, Instagram, X, TikTok) — these were the most-named in comp's reviews

3. **Restrict creative formats.** AdMob > Ad Format Restrictions:
   - Disable: `Playable ads with deep-link launch`
   - Disable: `Video ads with auto-tap`
   - Allow: `Standard video ads`, `Static image rewarded ads`

4. **Set explicit content filters.** Block creatives flagged for: deceptive UI, fake-system-alert simulation, false reward claims.

5. **Geofence to safe regions only at launch.** Restrict ad serving to US, CA, UK, AU, DE, FR for the first 30 days; expand only after no auto-redirect complaints in soft-launch reviews.

## Mandatory monitoring

After every soft-launch + public-launch cycle:
- Check first 100 reviews for any mention of: cross-app launch, malicious URL, Walmart/Facebook/Instagram opening unsolicited, "creepy" pop-ups
- If detected → emergency hotfix within 48 hours OR pull the build (per BLUEPAPER §9 kill criteria)

## Why this matters

The comp shipped at 3.9/5 with a 1M+ install base partly BECAUSE its faithful audience tolerates minor friction. But the unauthorized-redirect behavior cost specific players (likegoodgames, 123729506, Whydoihavetouseanickname?) their trust. Their reviews exist on the App Store as permanent record. Wraithgrove's anchor (Klovur) is the time-on-ad ratio pain — that we replicate. The SDK security pain we do not. The two are separable, despite shipping in the same SDK.
```

Commit: "Worker N: docs/AD_SDK_LOCKDOWN.md — Architect-touch AdMob configuration discipline"

VERIFICATION:
1. `cd /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2`
2. `node --check js/meta/meta-ads.js`
3. `grep -c "showRewardedVideo\|showInterstitial" js/meta/meta-ads.js` — both functions still exposed.
4. `cat docs/AD_SDK_LOCKDOWN.md | wc -l` — confirm doc exists and is non-trivial.
5. Browser preview: eval `WG.Ads.showRewardedVideo({reward:'test'}).then(r => console.log(r))` — should fall through to placeholder modal (since browser has no Capacitor.AdMob).

CONSTRAINTS:
- Three concerns. Three commits.
- Do NOT remove the placeholder modal helpers — they're the dev-mode path.
- Do NOT change `DAILY_RV_CAP` (50) — that's Path A faithful.
- Do NOT change the public API surface (`showRewardedVideo`, `showInterstitial`, `dailyRVRemaining`).
- Per Hive Rules: do not delegate to further sub-agents.

You are Worker N. After you ship: AdMob is wired with proper lockdown discipline documented for Architect manual configuration. The dev-mode placeholder remains for browser preview. Klovur-anchor honored: the time-on-ad ratio is faithfully replicated; the SDK security failures are not.