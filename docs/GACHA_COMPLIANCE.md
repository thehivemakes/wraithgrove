# GACHA_COMPLIANCE.md — JP/KR/EU gacha disclosure requirements

**Status:** DRAFT — Architect ratification required before App Store / Play Store submission.  
**Author:** W-Legal-ASO-Compliance-Drafts (2026-05-08).  
**Scope:** Japan loot box ordinance, Korea Game Industry Promotion Act, EU consumer protection (Belgium specifically).  
**Rates reference:** `js/meta/meta-gacha.js` GACHA_POOLS.standard.rates + .pity (ground truth; update this doc if rates change).

---

## Current Standard Pool rates

| Tier | Rate | Pity guarantee |
|------|------|----------------|
| Mythic | 1.0% | Hard pity at 100 pulls |
| Legendary | 9.0% | Soft pity at 30 pulls |
| Rare | 25.0% | — |
| Common | 65.0% | — |

Pull cost: 30 Gems (×1) · 270 Gems (×10, 10% discount).  
rift_guests pool: LOCKED until KingshotPro real-user launch. No disclosure needed until it opens.

---

## §1 — Japan

### Legal basis
Japan Online Game Association (JOGA) industry guidelines (2012, updated 2016):  
- Disclose exact probability for every rarity tier before a player can pull.  
- "Complete gacha" (コンプガチャ) — collecting item sets to receive a prize — is prohibited. Unlimited Chaos does NOT use complete gacha.  
- Pity guarantees must be disclosed alongside rates.

Consumer Affairs Agency interpretation (2012 letter): undisclosed probability = misleading representation under Premiums and Representations Act.

### Required placement
**Summon screen, before Pull button.** Must be visible without additional tap. The existing `WG.Compliance.showGachaDisclosure()` modal satisfies this; the jurisdiction text below should appear when `WG.Gacha.getJurisdictionDisclosure('ja')` is called (see §4).

### Exact disclosure text (JP)
```
【確率型アイテム情報】
ミシック: 1.0%（100回以内に確定）
レジェンダリー: 9.0%（30回以内に確定）
レア: 25.0% ／ コモン: 65.0%
ゲームアイテムに現金価値はありません。
コンプリートガチャは採用していません。
```

### App Store / Play Store description addition (JP store listing)
Add to localised description (Japanese):
```
■ 確率型アイテムの排出確率
ミシック 1.0%（100回以内確定）／ レジェンダリー 9.0%（30回以内確定）／ レア 25.0% ／ コモン 65.0%
```

---

## §2 — Korea

### Legal basis
Game Industry Promotion Act (게임산업진흥에 관한 법률) Article 33 (amended November 2021):  
- Game companies must disclose probability of obtaining each probability-based item type.  
- Disclosure must appear: (a) in-game before purchase, (b) on the official website, (c) in app store description.  
- Korea Creative Content Agency (KOCCA) enforcement began 2022. Failure = operating license revocation risk.

Game Rating and Administration Committee (GRAC) requires rating certificate for apps distributed in Korea. Probability disclosure is part of the certification checklist.

### Required placement
**Summon screen, before Pull button** (same as JP) + **official website gacha information page** + **Korean Play Store listing description**.

### Exact disclosure text (KR)
```
【확률형 아이템 확률 공개】
게임산업진흥에 관한 법률 제33조에 따른 의무 공개

신화 등급: 1.0% (100회 이내 보장)
전설 등급: 9.0% (30회 이내 보장)
희귀 등급: 25.0% ／ 일반 등급: 65.0%

게임 아이템에는 현금 가치가 없습니다.
```

### App Store / Play Store description addition (KR store listing)
```
■ 확률형 아이템 정보 (법 제33조)
신화 1.0%(100회 보장) / 전설 9.0%(30회 보장) / 희귀 25.0% / 일반 65.0%
```

---

## §3 — EU / Belgium

### Legal basis

**Belgium — Gaming Act (Kansspelwet / Loi sur les jeux de hasard):**  
Royal Decree of 24 May 2019: Belgian Gaming Commission (BGC) found that paid loot boxes (randomized rewards funded by real money, directly or indirectly) constitute games of chance requiring a Class IV gaming licence. Enforcement actions against EA FIFA (FUT packs), 2K NBA2K, and others confirmed this position.

**Unlimited Chaos exposure:** The Standard Pool uses Gems (Diamonds). Gems are purchasable via IAP (SKU `diamond_starter` $0.99, bundled with coin packs). This is the indirect purchase → gacha chain Belgium targeted. Even though each IAP delivers a fixed Gem amount (not randomized), the downstream use of those Gems in gacha pulls creates regulatory exposure.

**Recommended posture (ARCHITECT DECISION REQUIRED):**  
Option A — Disclose prominently + proceed (disclosure-only compliance). This is the approach used by most global games. Belgian players can self-select out.  
Option B — Geo-gate gacha for Belgian IP addresses. Safest. More complex. KingshotPro may have stronger Belgium exposure.  
This doc implements Option A text. Override with Option B if required.

**EU General — DSA (Digital Services Act) + Consumer Rights Directive 2011/83/EU:**  
- Rates must be disclosed before payment (satisfied by in-game disclosure).  
- Right of withdrawal (14 days) for digital content: inapplicable once content is downloaded/used (Art. 16(m)).  
- Unfair commercial practices: must not mislead about nature or probability of items.

**Germany — Jugendschutzgesetz / JuSchG (Youth Protection Act):**  
Probability purchases accessible to minors require additional age verification (16+ for in-app spending). Unlimited Chaos age gate is 13+ currently. Architect should confirm target German rating with USK before German store submission.

### Required placement
**In-game summon screen + Privacy Policy §4a (see §5 below) + Terms §3a (see §5).**

### Exact disclosure text (EU / English)
```
Gacha probability disclosure — EU / EEA players
Mythic: 1.0% (guaranteed within 100 pulls)
Legendary: 9.0% (guaranteed within 30 pulls)
Rare: 25.0% · Common: 65.0%

Virtual items have no real-world monetary value and cannot be
redeemed for cash. Belgian players: consult Privacy Policy §4a
for additional regional disclosures.

BeGambleAware.org · 1-800-522-4700 (US) · GamCare.org.uk (EU)
```

### App Store / Play Store description addition (EU store listing)
```
Gacha rates: Mythic 1% (pity 100) · Legendary 9% (pity 30) · Rare 25% · Common 65%.
Virtual items hold no real-world value. See Privacy Policy for EU/Belgium disclosures.
```

---

## §4 — meta-gacha.js placement code

`WG.Gacha.getJurisdictionDisclosure(jurisdiction)` is added by this worker (see `js/meta/meta-gacha.js`).

**API:**
```javascript
WG.Gacha.getJurisdictionDisclosure('ja')  // returns string[] for JP overlay
WG.Gacha.getJurisdictionDisclosure('ko')  // returns string[] for KR overlay
WG.Gacha.getJurisdictionDisclosure('eu')  // returns string[] for EU/BE overlay
// returns null for any other locale — compliance overlay falls back to standard EN rates
```

**Trigger:** Called by `WG.Compliance.showGachaDisclosure()` when `navigator.language` starts with 'ja', 'ko', or when IP geolocation (Phase 4 backend) returns an EU country. The locale detection is intentionally conservative — show jurisdiction text if locale MATCHES, fall back to EN if not detected.

**Placement:** Bottom-sheet modal, triggered before first pull via `checkGachaDisclosure()`. Always accessible via "?" button in shop summon section header. Rates table visible without scroll.

---

## §5 — privacy.html + terms.html additions

Section `§4a` is added to `legal/privacy.html` after the IAP SKU table (§4).  
Section `§3a` is added to `legal/terms.html` after the IAP section (§3).

See those files for the actual HTML. Both sections marked `<!-- ARCHITECT REVIEW — auto-drafted, override as needed -->`.

---

## §6 — App Store Connect + Play Console checklist

Before submission:

- [ ] App Store Connect: "Privacy Policy URL" field → `https://[domain]/legal/privacy.html`
- [ ] App Store Connect: Confirm "Gambling or Contests" is **not** checked (no real-money gambling)
- [ ] App Store Connect description (JP locale): add §1 rates line
- [ ] Play Console: "Contains in-game purchases" disclosure enabled
- [ ] Play Console (KR): add §2 rates line to Korean description
- [ ] Play Console: confirm IARC questionnaire does not trigger "random items" classification without disclosure
- [ ] Belgium posture decision: Option A (disclose) or Option B (geo-gate) — Architect call required
- [ ] Germany: confirm USK rating before German store submission (age-gate implications)

---

*Rates in this doc mirror `js/meta/meta-gacha.js:21-28` (GACHA_POOLS.standard.rates + .pity). If rates change, update both files together.*
