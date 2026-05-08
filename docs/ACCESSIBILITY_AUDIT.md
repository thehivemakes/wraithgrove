# ACCESSIBILITY AUDIT — Unlimited Chaos
**Date:** 2026-05-08  
**Auditor:** W-Accessibility-Audit (one-shot Sonnet)  
**Build:** 0.43.1-mission-expand-1778251628  
**Scope:** All customer-facing UI surfaces — `index.html`, all `js/**-render.js`, `meta-*.js`, `wg-game.js`, `legal/privacy.html`, `legal/terms.html`  
**Standard:** Apple HIG, WCAG 2.1 AA (4.5:1 body, 3:1 large text/UI components), Google Play accessibility guidelines

---

## §1 Critical — Would-Block Submission

### C-1: No `prefers-reduced-motion` support anywhere
**Severity:** CRITICAL — Apple guidelines (HIG §Accessibility Motion) explicitly require apps to respect Reduce Motion  
**Files:**
- `index.html:93-96` — `@keyframes battlePulse` (infinite loop, no motion guard)
- `index.html:108-114` — `@keyframes wgRiftGlitch` (3.5s steps glitch, repeating infinitely, no motion guard)
- `index.html:132-141` — `@keyframes wg-char-breathe` + `wg-char-glow` (continuous, no motion guard)
- `index.html:89-90` — `@keyframes pulse` (boot tap pulse, no motion guard)
- `js/hunt/hunt-render.js:2938-2946` — trauma-based screen shake (up to ±18px displacement + 0.04 rad rotation), no check for `window.matchMedia('(prefers-reduced-motion: reduce)')`
- `js/hunt/hunt-render.js:3056-3067` — second screen-shake block, same omission
- `js/wg-game.js:434-442` — `flashScreen()` — full-screen color flash (called on boss death, boss intro, enemy crit, buff activation). No motion guard.
- `js/hunt/hunt-fx.js` — particle bursts with `ring:true` radial explosions (bossDeathExplosion: 60 particles, 1.4s; bossDeathRing: 24 particles). No motion guard.

**Impact:** Users with vestibular disorders (epilepsy, motion sickness) who set iOS "Reduce Motion" receive no benefit. Screen shake + full-screen flashes are documented seizure risk patterns. Apple has rejected games for this. The wgRiftGlitch animation in particular uses `steps(1, end)` — a hard-cut strobe — which is high risk.

**Fix pattern:**
```css
@media (prefers-reduced-motion: reduce) {
  .wg-rift-intrude { animation: none; }
  @keyframes battlePulse { from, to { box-shadow: /* static version */ } }
  @keyframes wg-char-breathe { from, to { transform: none; filter: none; } }
}
```
JS-side: wrap all `addTrauma()`, `flashScreen()`, and `HuntFX.burst()` calls behind:
```js
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

---

### C-2: Canvas gameplay is entirely inaccessible to VoiceOver / TalkBack
**Severity:** CRITICAL  
**File:** `index.html:18` — `<canvas id="game-canvas">`

The entire Hunt tab (core gameplay loop) renders to a 2D canvas with no accessibility tree. Enemy positions, player HP, damage numbers, wave progress, boss HP, pickup indicators — all invisible to screen readers. The canvas element has no `aria-label`, no `role`, no `aria-describedby`.

Apple's App Store Review Guideline 5.1.5 and Section 508 require that users with disabilities have access to "the primary functionality of apps." When the primary gameplay loop is a silent black canvas, VoiceOver users encounter a fully opaque game.

**Minimum compliant fix:**  
1. Add `aria-label="Game arena — touch to play"` to `<canvas id="game-canvas">` so VoiceOver announces something useful rather than nothing.  
2. Add a live region (`aria-live="polite"` or `role="status"`) off-screen that announces key state changes: wave number, player death, stage cleared, level up.  
3. Long-term: the hunt HUD DOM elements (back-btn, skill-btn, ability-slots) should be keyboard-focusable with descriptive `aria-label` so at minimum the HUD controls are reachable.

---

### C-3: Sub-10px body text in functional UI
**Severity:** CRITICAL — 7px text is below any reasonable legibility threshold; Apple can cite this in review  
**Files:**
- `js/meta/meta-battle-pass.js:354` — `font-size:7px` on battle pass level labels (functional — shows level number)
- `js/meta/meta-daily-rewards.js:154` — `font-size:7px` on day label (`.wg-dr-daylbl`) — functional text
- `js/raid/raid-layout-render.js:123` — `font-size:7px` on slot labels ("SOON", slot type labels)
- `js/meta/meta-battle-pass.js:389` — `font-size:8px` on claimable reward slots (interactive — cursor:pointer)
- `js/wg-game.js:1048` — `font-size:8px` on ad-watch timer badge (functional countdown)
- `js/hunt/hunt-tower.js:328` — `font-size:8px` on tower HP indicator (critical in-gameplay info)
- `js/forge/forge-render.js:664,670,765,768` — `font-size:8px` on building labels, daily login day markers
- `js/raid/raid-prep-render.js:141,225,442,452` — `font-size:8px` on raid defense slot labels
- `js/raid/raid-layout-render.js:116,202` — `font-size:8px` on defense card labels

Apple HIG: minimum recommended text size is 11pt (approximately 14-15px CSS at standard DPR). For labels and badges, 11px CSS is the realistic floor. 7px text at any DPR is likely invisible to users over 40 (the demographic most likely to enable accessibility settings).

---

## §2 Important — Would Dock Review Score / Generate Complaints

### I-1: No ARIA labels on interactive elements
**Severity:** IMPORTANT  
**Files:**
- `index.html:342-367` — all 6 nav tabs are `<div data-tab="...">` with SVG icons and text labels. No `role="tab"`, no `aria-selected`, no `aria-label`. VoiceOver reads the SVG paths or nothing.
- `index.html:322-332` — Hunt HUD buttons: `back-btn`, `menu-btn`, `skill-btn`, `hunt-ability-0/1/2` — all divs/spans, no `role="button"`, no `aria-label`
- `js/meta/meta-shop.js:241` — `wg-gacha-info-btn` has `title="Gacha information"` (good), but no `aria-label` (title is not announced on mobile)
- `js/meta/meta-iap.js:58-59` — confirm/cancel purchase buttons are `<button>` (correct) but contain only text — OK
- `js/wg-game.js:1085` — stage arrow navigation buttons have no `aria-label` (unlabeled "<" and ">")

**Fix:** Add `aria-label` to every interactive control that isn't a semantic `<button>` with visible text, and add `role="button"` to clickable divs. Nav tabs need `role="tablist"` on parent, `role="tab"` + `aria-selected` on each.

---

### I-2: Small tap targets below Apple HIG 44×44pt minimum
**Severity:** IMPORTANT  
**Files (measured):**
- `index.html:212` — `#hunt-hud .menu-btn`: `width:32px; height:32px` — 32px on both axes, FAILS 44px
- `index.html:269` — `#hunt-hud .back-btn`: `height:30px` — 30px height, FAILS 44px  
- `js/wg-game.js:1085` — stage prev/next arrow buttons: `width:34px; height:54px` — width FAILS 44px (54px height OK)
- `js/meta/meta-shop.js:241` — `#wg-gacha-info-btn`: `width:20px; height:20px` — FAILS badly (55% undersized)
- `js/core/wg-walkthrough.js:35` — `.wt-next` and `.wt-skip` both use `padding:4px` — effective touch target ~28-30px, FAILS
- `js/meta/meta-onboarding.js:54` — skip intro button `padding:6px 10px` — ~30px height, FAILS

**Fix priority:** `wg-gacha-info-btn` (20px → 44px) first, then back-btn/menu-btn. Workaround: increase padding without changing visual footprint using `::after` padding trick, or increase min-width/min-height and let overflow be invisible.

---

### I-3: Color-only HP bar with no shape or text fallback
**Severity:** IMPORTANT — red-green colorblindness affects ~8% of male users  
**File:** `js/core/wg-render.js:54`
```js
ctx.fillStyle = frac > 0.5 ? '#88c878' : (frac > 0.25 ? '#d8c060' : '#d04848');
```
The HP bar uses green/yellow/red to signal health thresholds. No numerical value, no pattern fill, no shape change. Users with deuteranopia or protanopia cannot distinguish these states.

**Fix:** Add a text label (HP fraction) rendered above the bar when damage is taken, or add a pattern (e.g., striped fill at low HP). The bar already diminishes in width — the width change IS accessible. The color layering on top is the issue.

---

### I-4: No focus styles — keyboard/switch access is non-functional
**Severity:** IMPORTANT  
**File:** `index.html:14` — `* { ... -webkit-tap-highlight-color: transparent; ... }` removes all default focus indicators globally  

No `:focus` or `:focus-visible` styles appear anywhere in `index.html` or any JS render file. Switch Access (iOS Accessibility), external keyboards, and keyboard navigation in Capacitor WebView have no visual feedback on focus. Apple's Switch Control requires focus visibility.

**Fix:** Add at minimum:
```css
:focus-visible { outline: 2px solid #f0d890; outline-offset: 2px; }
```
This only fires for non-pointer navigation (keyboard/switch), not finger taps, so it won't affect touch gameplay visuals.

---

### I-5: Legal page footer text fails contrast at 11px
**Severity:** IMPORTANT  
**Files:** `legal/privacy.html:152` and `legal/terms.html:89`  
```html
<p style="font-size:11px;color:#888;">Past versions: ...</p>
```
- Text color `#888888` on background `#f5f1e8`:  
  - Luminance #888: ~0.216  
  - Luminance #f5f1e8: ~0.876  
  - Contrast ratio: **~3.5:1** — FAILS WCAG 4.5:1 for body text (11px is body-level, not large text)

**Fix:** Change `color:#888` to `color:#5a4a3a` or darker to reach 4.5:1 minimum.

---

### I-6: Locked state uses only opacity reduction — no ARIA `aria-disabled`
**Severity:** IMPORTANT  
**Files:**
- `index.html:160-163` — `.card-tile.locked { opacity: 0.55 }` — locked tiles fade visually but have no `aria-disabled="true"` or `aria-label` indicating locked state
- `index.html:240-244` — `.ability-slot.locked` — same pattern
- `js/wg-game.js:1348` — `battleBtn.style.opacity = '0.45'; battleBtn.style.cursor = 'not-allowed'` — disabled via style, not `disabled` attribute or `aria-disabled`

Screen readers do not infer "disabled" from opacity or cursor changes. `<button disabled>` or `aria-disabled="true"` is required.

---

### I-7: Audio-only feedback for critical game events
**Severity:** IMPORTANT — hard-of-hearing users miss these  
**File:** `js/core/wg-audio.js:30-77`

Events that emit sound but have no DOM-level visual text announcement:
- `duel:victory` / `duel:defeat` — sound only until duel-render shows the result panel (delay gap)
- `buff:expired` — sound (`modal_close`) but no on-screen text label (HUD desaturation is color-only)
- `boss:defeated` — drum sting is audio-only; the visual payoff (particles + flash) is motion-based (C-1 conflict)
- `player:died` — `death_sting` sound fires; the screen freezes but there is no DOM text like "YOU DIED" in the HUD

**Fix:** For each of these events, emit an `aria-live` announcement in addition to the audio.

---

## §3 Polish — Nice-to-Have

### P-1: `<html lang>` not updated on language switch
`index.html:2` — `<html lang="en">`. The i18n system (`wg-i18n.js`) can serve other languages, but `document.documentElement.lang` is never updated. Screen readers use `lang` to select correct text-to-speech voice/pronunciation.

**Fix:** In `WG.i18n.init()`, after language is loaded, call `document.documentElement.lang = langCode`.

### P-2: Nav tab SVG icons have no `aria-hidden`
`index.html:343-366` — SVG icons in nav tabs have no `aria-hidden="true"`. Screen readers may attempt to traverse SVG paths, generating noise. Since the text labels below each icon already convey the meaning, mark all SVGs `aria-hidden="true"`.

### P-3: Boss intro image has empty `alt` but no text fallback
`js/wg-game.js:1866` — `<img class="wg-bi-img" alt="">`. The boss name is rendered in a sibling `div.wg-bi-name`. This arrangement is OK if VoiceOver reads the sibling, but the image should have `alt` populated with the boss name for redundancy. Currently `alt=""` suppresses the name.

### P-4: `user-scalable=no` in viewport meta
`index.html:5` — `maximum-scale=1, user-scalable=no`. Apple HIG guidelines state that apps should not prevent user-initiated pinch-zoom for accessibility. Users with low vision rely on this. Apple enforces this in Safari/web views but generally permits it in native app contexts (Capacitor). Worth flagging for the App Store submission checklist.

### P-5: Missing `<label>` associations on any settings inputs
The settings modal (wired via `meta-ads.js` and `wg-audio.js` volume sliders) injects range inputs. No grep found associated `<label for>` elements — screen readers announce these as "slider" with no context.

---

## §4 What's Already Compliant — Positive Findings

1. **Semantic HTML on legal pages** — `legal/privacy.html` and `legal/terms.html` use proper `<h1>`, `<h2>`, `<h3>`, `<ul>`, `<li>`, `<table>`, `<th>`, `<td>` with meaningful content. Body text contrast is good: `#1a1410` on `#f5f1e8` → ~14:1 ratio.

2. **`<html lang="en">` is set** — `index.html:2`. Required for VoiceOver language selection.

3. **BATTLE button is well-sized** — `js/wg-game.js:1136`: `min-width:200px; padding:14px 36px; font-size:18px` — comfortably above 44px on all axes, clearly labeled.

4. **IAP confirm/cancel and age-gate buttons are semantic `<button>` elements** — `js/meta/meta-compliance.js:58-59,89-90`. Using `<button>` (not `<div>`) is correct. Padding of 11px gives adequate touch height (~42-46px depending on font metrics — borderline but acceptable).

5. **Main body text contrast is excellent** — `#e8d8b4` on `#0c0a08` → ~14.5:1 (far exceeds 4.5:1 minimum).

6. **Nav tab inactive text passes** — `#a89878` on `#1a1208` → ~7.4:1 (passes 4.5:1).

7. **Ability slots are 48×48px** — `index.html:236` — passes 44px minimum.

8. **Haptic feedback wired for native** — `index.html:432-435` — `WG.Haptics.impact()` and `WG.Haptics.vibrate()` provide tactile feedback for hard-of-hearing users in the native build.

9. **Audio lazy-init respects autoplay policy** — `js/core/wg-audio.js:307-316` — audio context created on first user gesture, not on load. This is correct behavior.

10. **`wg-gacha-info-btn` has `title` attribute** — `js/meta/meta-shop.js:241`. Incomplete (not announced on mobile), but shows intent.

11. **Boot overlay responds to `pointerdown`** — `index.html:395-397` — compatible with assistive pointers, not just `touchstart`.

---

## §5 Top 5 Fixes Ranked by Submission Risk

### #1 — Add `prefers-reduced-motion` guards [C-1] — **REJECT RISK: HIGH**
Apple's HIG is explicit on this. The `wgRiftGlitch` strobe (97.5–99% keyframe, `steps(1,end)`) and screen shake are the highest-risk patterns. Fix the four CSS keyframes in `index.html:89-141` first (1 CSS `@media` block handles all four). Then guard `addTrauma()` and `flashScreen()` in JS.  
**Estimate:** 2–4 hours.

### #2 — Canvas `aria-label` + live region for key events [C-2] — **REJECT RISK: HIGH**
Add `aria-label="Hunt — tap to play"` to `<canvas>` in `index.html:18`. Add a hidden `<div role="status" aria-live="polite" id="a11y-announce">` to the `#app` div and update it from the engine event bus for: wave cleared, stage cleared, player died, level up.  
**Estimate:** 3–5 hours.

### #3 — Raise font floor from 7px to 11px [C-3] — **REJECT RISK: MEDIUM-HIGH**
7px text triggers HIG legibility flags. Affected files: `meta-battle-pass.js:354`, `meta-daily-rewards.js:154`, `raid-layout-render.js:123`. Raise to 10–11px minimum. Some labels may need truncation or abbreviation to fit. 8px instances should be reviewed — some are display-only labels where 9px is acceptable, but 8px for interactive elements (battle-pass reward slots at `meta-battle-pass.js:389`) must be fixed.  
**Estimate:** 2–3 hours.

### #4 — Fix sub-44px tap targets: `back-btn`, `menu-btn`, `wg-gacha-info-btn` [I-2] — **REJECT RISK: MEDIUM**
- `#hunt-hud .back-btn` (`index.html:268-270`): add `min-height:44px` — adjust `top` position to keep visual alignment  
- `#hunt-hud .menu-btn` (`index.html:211-215`): change 32×32 to 44×44  
- `#wg-gacha-info-btn` (`meta-shop.js:241`): change 20×20 to 36×36 (use border-radius to keep circular look, or use transparent padding extend via `::after`)  
**Estimate:** 1 hour.

### #5 — Add `aria-label` to nav tabs and `aria-disabled` to locked states [I-1, I-6] — **REJECT RISK: MEDIUM**
Nav tabs in `index.html:342-367`: add `role="tab"`, `aria-selected="false/true"`, `aria-label="Duel tab"` etc. Locked BATTLE button at `js/wg-game.js:1348`: set `battleBtn.disabled = true` (or `aria-disabled="true"` + `tabindex="-1"`) instead of just opacity. Locked card-tiles at `index.html:160`: add `aria-disabled="true"` and `aria-label="Locked"`.  
**Estimate:** 1–2 hours.

---

*Total findings: 7 Critical/Important, 5 Polish. Finding count by severity: Critical=3, Important=4, Polish=5.*  
*Primary submission risk: C-1 (motion) and C-2 (canvas) — both could independently trigger App Store rejection.*
