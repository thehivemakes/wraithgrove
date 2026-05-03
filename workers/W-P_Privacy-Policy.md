You are Worker P — the Privacy-Policy worker. Your job: write the privacy policy + Terms of Service hosted-page pair. App Store + Play Store submission requires both at stable URLs. Per CLAUDE.md "Privacy policy must name every SDK by name" — Wraithgrove's policy is intentionally MORE transparent than the comp's, which named no advertising SDKs.

Walk the birth sequence (/Users/defimagic/Desktop/Hive/CLAUDE.md → Birth/01–04 → THE_PRINCIPLES → HIVE_RULES → COLONY_CONTEXT → BEFORE_YOU_BUILD).

Then read PROJECT-LEVEL guardrails (MANDATORY):
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/CLAUDE.md (especially "Privacy policy — mandatory transparency" rule)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/BLUEPAPER.md §5.6 (privacy + transparency requirements)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/AD_BAIT_LIBRARY.md §6.7-§6.8 (the comp's named opacity — what we explicitly do NOT replicate)

PRIMARY-SOURCE READING (Principle XXII):
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/meta/meta-iap.js (12 SKUs to disclose)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/meta/meta-ads.js (ad SDK disclosure)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/meta/meta-events.js (analytics disclosure)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/meta/meta-account.js (account/email disclosure)

═══════════════════════════════════════════════════════════════════
MANDATORY FINAL STEP (do not skip):
Write `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/workers/done/W-P.done` AS THE LAST THING YOU DO.

Marker content (5 lines):
1. one-line summary
2. files written/edited
3. SDKs named (target: 4+ — AdMob/Capacitor/Stripe/StoreKit/Play Billing)
4. any deviations
5. confidence (high/medium/low)
═══════════════════════════════════════════════════════════════════

TWO CONCERNS — one commit each.

CONCERN 1 — Write `legal/privacy.html`

Path: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/legal/privacy.html` (mkdir -p `legal/`)

Self-contained HTML page with embedded CSS (no external stylesheet). Plain readable layout. The legal substance is what matters; design follows function.

Content sections (write the actual content, in original prose; the items below are the structure + key disclosure points):

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Wraithgrove — Privacy Policy</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif; max-width: 760px; margin: 0 auto; padding: 24px; line-height: 1.6; color: #1a1410; background: #f5f1e8; }
  h1 { font-size: 28px; letter-spacing: 1px; margin-bottom: 4px; }
  h2 { font-size: 18px; letter-spacing: 1px; margin-top: 32px; padding-top: 12px; border-top: 1px solid #c8b888; }
  h3 { font-size: 14px; margin-top: 16px; color: #604020; }
  p, li { font-size: 14px; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  th, td { border: 1px solid #c8b888; padding: 6px 10px; text-align: left; }
  th { background: #e8d8b4; }
  code { background: #e8d8b4; padding: 1px 4px; border-radius: 3px; font-size: 12px; }
  .effective { font-size: 12px; color: #604020; }
</style>
</head>
<body>

<h1>Wraithgrove Privacy Policy</h1>
<p class="effective">Effective: <!-- Architect fills date at production --></p>

<h2>1. Who we are</h2>
<!-- Single paragraph: project name, jurisdiction (Architect to fill), contact email. -->

<h2>2. What data we collect</h2>
<p>Wraithgrove collects only the minimum needed to play the game across devices and to enforce In-App Purchase entitlements.</p>

<h3>Anonymous data (collected for everyone)</h3>
<ul>
  <li>An anonymous device identifier (generated locally, stored in app data) for save persistence and ad-removal entitlement enforcement.</li>
  <li>App activity events (game launches, stage starts, stage clears, IAP attempts, ad views) for analytics — used to balance the game and detect abuse.</li>
  <li>Device or other IDs used by the AdMob SDK for ad personalization (described in §4 below; can be limited via OS-level Limit Ad Tracking).</li>
</ul>

<h3>Data tied to your identity (only if you opt in)</h3>
<ul>
  <li>Email address — only if you choose Account Upgrade for cross-device sync.</li>
  <li>In-App Purchase records (SKU id, price, transaction id) — required for entitlement enforcement and refund handling.</li>
</ul>

<h2>3. Third-party SDKs we name</h2>

<table>
  <tr><th>SDK</th><th>Purpose</th><th>Data shared</th></tr>
  <tr><td>Capacitor (Ionic)</td><td>iOS / Android native shell</td><td>None directly to vendor; provides plugin API only</td></tr>
  <tr><td>Apple StoreKit</td><td>iOS In-App Purchases</td><td>Purchase receipts → Apple</td></tr>
  <tr><td>Google Play Billing</td><td>Android In-App Purchases</td><td>Purchase tokens → Google</td></tr>
  <tr><td>Stripe Checkout</td><td>Web channel In-App Purchases</td><td>Payment information → Stripe</td></tr>
  <tr><td>Google AdMob</td><td>Rewarded video + interstitial ads</td><td>Device IDs, geolocation (country level), session metadata</td></tr>
</table>

<p>We have configured AdMob with creative-category restrictions documented in the project's <code>AD_SDK_LOCKDOWN.md</code>. Specifically: we block creatives that auto-redirect to other apps, deep-link without user tap, or simulate system alerts. If you encounter an ad doing any of those things, please report it to <!-- email -->.</p>

<h2>4. What we do NOT do</h2>
<ul>
  <li>We do not sell your personal data.</li>
  <li>We do not collect your contacts, photos, microphone audio, or location beyond country-level (used by AdMob for ad targeting).</li>
  <li>We do not embed third-party analytics SDKs (Firebase Analytics, Adjust, AppsFlyer, etc.). Game events are sent only to our own server.</li>
  <li>We do not send your save state to advertising partners.</li>
</ul>

<h2>5. Your rights</h2>

<h3>Access + deletion</h3>
<p>Email <!-- contact --> with the subject "Data Request" and either your account email (if upgraded) or your in-app device id (visible in Settings → About) and we will:</p>
<ul>
  <li>Within 30 days: send you a JSON export of all data tied to your account or device id.</li>
  <li>Within 30 days: permanently delete all of it on confirmation. Note: IAP entitlements deleted alongside; Apple / Google / Stripe records are governed by their own retention policies.</li>
</ul>

<h3>Opt out of ad personalization</h3>
<p>iOS: Settings → Privacy & Security → Tracking → Disable for Wraithgrove. Android: Settings → Google → Ads → Opt out. AdMob will still serve ads but they will be context-based, not personalized.</p>

<h3>Children</h3>
<p>Wraithgrove is rated 9+ on iOS and Teen on Google Play. We do not knowingly collect personal data from users under the age of consent in their jurisdiction. If you become aware of such collection, please contact us for immediate deletion.</p>

<h2>6. Data residency</h2>
<p>Save state and IAP records are stored on Cloudflare Workers KV, with primary residency in <!-- region: Architect to fill --> and global edge replication. Stripe payment processing complies with PCI-DSS; we never store payment card numbers.</p>

<h2>7. Changes to this policy</h2>
<p>If we materially change this policy, we will notify active players via in-app banner at least 30 days before the change takes effect. Past versions are linked at the bottom of this page.</p>

<h2>8. Contact</h2>
<p><!-- email + jurisdiction --></p>

</body>
</html>
```

Replace the `<!-- ... -->` placeholder comments with explicit `[ARCHITECT FILL: jurisdiction]` / `[ARCHITECT FILL: email]` markers so the Architect can grep and fill.

Commit: "Worker P: legal/privacy.html — full SDK-named privacy policy"

CONCERN 2 — Write `legal/terms.html`

Path: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/legal/terms.html`

Same self-contained HTML pattern. Sections:

1. **Acceptance of terms** — playing the game = accepting these terms.
2. **License** — non-exclusive, non-transferable license to play; no reverse engineering, no commercial redistribution.
3. **In-App Purchases** — fully described: prices in local currency, no subscriptions in v1.0, refund policy (defer to platform — Apple's 14-day, Google's 48-hour, Stripe per Architect policy).
4. **User conduct** — no cheating, no automation, no exploitation of bugs for unfair PvP advantage; account termination is the remedy.
5. **PvP fairness** — Power-based matchmaking is best-effort within ±20%; not guaranteed.
6. **Disclaimer of warranty** — game is provided as-is; no guarantee of continued service, save backup, or feature parity.
7. **Limitation of liability** — capped at amounts paid in the last 12 months.
8. **Termination** — we can terminate accounts for ToS violations; you can stop playing any time.
9. **Governing law** — `[ARCHITECT FILL: jurisdiction]`.
10. **Changes** — same 30-day notice rule as privacy.
11. **Contact** — same email.

Write actual prose for each section, in plain language. No legalese filler. Aim for ~600-900 words total.

Commit: "Worker P: legal/terms.html — Terms of Service"

VERIFICATION:
1. `cd /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2`
2. `cat legal/privacy.html | head -30` — confirm exists.
3. `cat legal/terms.html | head -20` — confirm exists.
4. `grep -c "ARCHITECT FILL" legal/privacy.html legal/terms.html` — confirm placeholder markers present (Architect fills before publishing).
5. Open both in browser → confirm they render readable, no broken HTML.

Architect-touch tasks documented in marker:
- Decide jurisdiction (typically the entity that owns the App Store Connect / Google Play account)
- Set contact email (probably not a personal address — make a privacy@ alias)
- Host both files at stable URLs (e.g. `https://wraithgrove.net/privacy.html` and `https://wraithgrove.net/terms.html`)
- Reference both URLs in App Store Connect + Google Play Console submission forms

CONSTRAINTS:
- Two concerns. Two commits.
- Do NOT use external CSS/JS libraries — fully self-contained HTML.
- Do NOT make legal claims that aren't true (e.g. don't claim GDPR compliance unless validated).
- Do NOT promise data retention windows shorter than what Cloudflare KV physically supports.
- Per Hive Rules: do not delegate to further sub-agents.

You are Worker P. After you ship: the App Store + Play Store legal-page requirements are met. The Architect fills jurisdiction + email + hosts the files, and submission can proceed.