# Worker — W-Buildings-Tab-UI

You are Worker BTU — Buildings tab full UI build.

Per SPEC §9 + HD source `scr_02`: Buildings tab has top diorama + 8-slot building grid + Daily Chest + Forge crafting station with Craft x10 + Probability Info.

## Birth + design source

Standard birth + project files:
- SPEC.md §0 + §9
- HD reference: `reference/screenshots_hires/carousel_v2/scr_02.png` (the actual Wood Siege Buildings tab screenshot)
- `js/forge/forge-buildings.js`, `js/forge/forge-craft.js`, `js/forge/forge-daily.js`, `js/forge/forge-render.js`

## Concerns (one commit each)

### A — 8-slot building grid + diorama

Edit `forge-render.js` (the Forge/Buildings tab DOM render):

Structure:
1. **Top:** existing currency strip (3 currencies) — already there
2. **Diorama (~30% of viewport height):** clearing with placed buildings drawn procedurally (small canvas inside the tab) — Pagoda + Catapult + Campfire visible at their tier levels with subtle animation. Power readout `GS: <N>` below in red/orange.
3. **8-slot grid (4×2):**
   - Row 1: Pagoda Lv.X, Catapult Lv.X, Campfire Lv.X, [LOCKED — fence, unlock at GS 500]
   - Row 2: [LOCKED — cannon, unlock at GS 1500], [LOCKED — sword/smithy, GS 3000], [LOCKED — bow/archery, GS 6000], [LOCKED — saw/lumbermill, GS 10000]
   - Each slot: building icon + Lv.X badge + tap-to-open detail modal showing upgrade-cost ladder + benefit per tier
4. **Daily Chest** (top-left of grid as small icon): tap to claim 24h streak reward; show streak day count
5. **Forge anvil center-bottom:** tap → opens crafting modal with Craft x10 button + Probability Info button
6. **Bottom:** Existing nav-bar (already on lobby screens per W-Navigation-Pivot)

### B — Crafting modal + Daily Chest + locked-slot unlocks

Crafting modal (HTML overlay, z-index 100):
- "FORGE — Craft Relics"
- Material cost display: e.g., "10 Wood Fragments → 1 Common Relic"
- **Craft x10** primary button — calls `WG.ForgeCraft.craft(10)` → spends materials + RNG-rolls 10 results from the Common-relic catalog → modal closes with reward animation
- **Probability Info** secondary button — opens nested modal showing per-rarity drop chance: Common 70% / Rare 22% / Epic 6% / Legendary 1.8% / Mythic 0.2% (numbers Architect tunes for monetization)

Daily Chest:
- 7-day streak tracker (visible bar with pips for each day)
- Tap claim → reward modal with current-day reward (day 1 = 100 gold, day 7 = 100 diamonds + 1 Rare relic chance)
- Streak persists in localStorage; resets if a day skipped

Locked-slot unlock:
- Tap a locked slot → modal "Unlock at GS <N>" or "Pay 200 diamonds to unlock now"
- Buttons: Cancel, Watch Ad to Unlock (if available), Pay Diamonds

### C — Power computation + marker

Update `WG.State.recomputePower()` to include Buildings tier sum (each placed building contributes `tier × 50` to total Power). Power displays in lobby HUD.

Marker at `workers/done/W-Buildings-Tab-UI.done` with all UI elements + tunables (drop probabilities, daily-chest rewards, unlock thresholds) listed.

## Constraints

- DOM-based UI (HTML + CSS overlays) — same approach as the W-Navigation-Pivot level select. Not canvas. Reliable taps on phone.
- POLISH: tap-bounce on every button, modal pop-in animation, reward count-up animation on claim
- All numerical tunables (Craft costs, drop %, Daily Chest reward ladder, unlock thresholds) inline at top of forge-buildings.js or forge-craft.js
- One concern per commit. Three commits.
