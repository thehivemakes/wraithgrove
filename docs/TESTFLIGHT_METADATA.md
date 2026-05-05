# TestFlight Metadata — Wraithgrove v0.23.0

> Internal beta notes for TestFlight submission. Paste relevant sections into App Store Connect
> beta build fields. Updated each build. Do NOT use this as the production App Store listing
> (see docs/ASO_PACKAGE_v1.md for that).

---

## Build Info

| Field | Value |
|---|---|
| Bundle ID | com.thehivemakes.wraithgrove |
| Version | 0.23.0 |
| Build number | 1 (increment each submission) |
| Platform | iOS 14+ |
| Device | iPhone + iPad |
| Capacitor | 5.7.x |
| Xcode target | Release |

---

## "What to Test" (TestFlight internal notes field — 4000 char max)

```
Wraithgrove v0.23.0 — Internal Beta

WHAT THIS IS
Top-down auto-attack survival arena with Eastern folk-horror theme.
5 tabs: Hunt (arena), Ascend (character RPG), Forge (idle base + crafting),
Relics (gear collection), Duel (async PvP).

WHAT'S REAL IN THIS BUILD
- Hunt: all 18 stages, 6 biomes, 5 enemy types, 6 bosses
- Full weapon system (14 weapons), relic equip/collect (48 relics)
- Ascend: character leveling, skin system, stat upgrades
- Forge: building grid, crafting, 7-day streak rewards
- Duel: power-based async matchmaking
- Audio: 25 CC0 sfx/ambient tracks, mute/volume persistence
- Day/Night Mode + torch mechanic
- Haptic feedback on player damage + boss defeat (native iOS)
- Save/load via localStorage (survives app restart)

WHAT'S STUB / NOT REAL
- IAP: All purchase buttons show a modal but NO real charge occurs.
  Apple StoreKit wiring not yet complete.
- Ads: Rewarded video + interstitial show a placeholder modal only.
  AdMob not yet wired (will add before public release).
- Account: Anonymous device ID only. No server sync, no login.
- Analytics: Events fired locally but not sent to any server.

KNOWN LIMITATIONS
- First load on older iPhones may take 2-3s (JS initialisation).
- No offline asset caching (PWA). Requires local network or localhost.
- Portrait preferred; landscape supported but HUD spacing unoptimised.
- Stage 18 boss (Wraith Father) sigil mechanic is functional but
  visual feedback is minimal — enhancement planned.
- No accessibility support yet (VoiceOver, Dynamic Type).

FOCUS AREAS FOR TESTERS
1. Hunt loop: 3 stages across different biomes. Does it feel good?
2. Day/Night transition: trigger at stage 7+. Torch mechanic clear?
3. Forge tab: daily streak — does day progression feel rewarding?
4. Performance: frame rate during boss fights on your device model.
5. Save persistence: quit app mid-stage, reopen — is save intact?

BUG REPORTS
Note: device model, iOS version, which tab/stage you were in,
and whether a crash or a logic bug. Screenshots welcome.
```

---

## App Store Connect Beta Info Fields

### Beta App Description (up to 4000 chars)
```
Survive the darkness. Descend through 18 haunted stages in a top-down
auto-attack arena. Hunt creatures of Eastern folk-horror, build your
camp, forge relics, and rise through ranked duels.

Wraithgrove is an internally-developed beta. Features and content
are subject to change before public release.
```

### Feedback Email
*(Set in App Store Connect — use Architect's developer account email)*

### Marketing URL
*(Leave blank for internal beta)*

### Privacy Policy URL
*(Required even for internal beta — link to a placeholder privacy page on thehivemakes.com)*

---

## Pre-Submission Checklist

Before sending TestFlight invites:

- [ ] Apple Developer account enrolled + team ID obtained
- [ ] Provisioning profile created for com.thehivemakes.wraithgrove
- [ ] Signing certificate installed in Keychain
- [ ] CocoaPods installed + `pod install` run in ios/App/
- [ ] `ios/scripts/ExportOptions.plist` — REPLACE_WITH_TEAM_ID filled in
- [ ] `build_testflight.sh` executed without errors
- [ ] IPA uploaded via Transporter or altool
- [ ] App Store Connect: Internal Tester group created
- [ ] Privacy policy URL live on thehivemakes.com
- [ ] TestFlight "What to Test" text pasted (see above)
- [ ] ATT / AdMob NOT wired — confirm no real ad calls in this build

---

## Known Architect Tasks (not worker scope)

| Task | Priority | Notes |
|---|---|---|
| Apple Developer enrollment | P0 — blocker | $99/yr at developer.apple.com |
| Create App Store Connect record | P0 — blocker | Bundle ID: com.thehivemakes.wraithgrove |
| Sign cert + provisioning profile | P0 — blocker | Required before archive |
| Fill in ExportOptions.plist teamID | P0 — blocker | 10-char Team ID from developer portal |
| Privacy policy page (thehivemakes.com) | P1 | Required for TestFlight |
| AdMob App ID (GADApplicationIdentifier) | P2 — before public | Wire after internal beta passes |
| ATT pre-prompt + NSUserTrackingUsageDescription | P2 — before AdMob | Per BLUEPAPER §0 Rule 5 |
| Stripe webhook endpoint | P2 — before IAP | Server-side order validation |

---

*Last updated: 2026-05-05 by W-Capacitor-iOS-Shell*
