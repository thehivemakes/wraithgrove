// WG.Compliance — pre-purchase confirmation, age gate, gacha disclosure.
// W-Compliance-Disclosure: Concerns A (confirmPurchase), B (age gate), C (gacha disclosure).
(function(){'use strict';

  const STORAGE_KEY = 'wg_compliance_v1';

  function _load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch(e) { return {}; }
  }
  function _save(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e) {}
  }

  // ── Concern A — Pre-purchase confirmation modal ────────────────────────────
  // Returns Promise<boolean>: true = user tapped CONFIRM, false = CANCEL.

  function confirmPurchase(sku) {
    return new Promise(function(resolve) {
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.82);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;';

      const isSubscription = sku.type === 'subscription';
      const priceStr = '$' + sku.price.toFixed(2);
      const displayName = sku.name || sku.id.replace(/_/g,' ').replace(/\b\w/g, function(c){return c.toUpperCase();});

      const g = sku.grants || {};
      const lines = [];
      if (g.coins)            lines.push(g.coins.toLocaleString() + ' Coins');
      if (g.diamonds)         lines.push(g.diamonds + ' Diamonds');
      if (g.gems)             lines.push(g.gems.toLocaleString() + ' Gems');
      if (g.cards)            lines.push(g.cards + ' Cards');
      if (g.energy)           lines.push(g.energy + ' Energy');
      if (g.craftFragments)   lines.push(g.craftFragments + ' Craft Fragments');
      if (g.adRemovalActive)  lines.push('Remove Ads (all devices)');
      if (g.royalPassActive)  lines.push('Royal Pass benefits');
      if (g.battlePassPremium) lines.push('Premium Battle Pass track');
      if (g.megaBundleClaimed) lines.push('Full Vault Bundle');
      if (g.starterCosmeticGranted) lines.push('Exclusive cosmetic');
      if (g.pullRare)         lines.push('1 Rare Relic (guaranteed)');
      if (g.pullLegendary)    lines.push('1 Legendary Relic (guaranteed)');

      const bulHtml = lines.length
        ? '<ul style="list-style:disc;text-align:left;font-size:12px;color:#d4c49a;padding-left:18px;margin:4px 0 8px;">' +
          lines.map(function(l){return '<li style="margin:2px 0;">' + l + '</li>';}).join('') + '</ul>'
        : '';

      const subHtml = isSubscription
        ? '<div style="font-weight:700;color:#f0d890;font-size:11px;margin-top:10px;padding:8px;background:#1a1208;border:1px solid #7a5030;border-radius:6px;">This subscription auto-renews monthly at ' + priceStr + '. Cancel anytime in App Store / Play Store settings.</div>'
        : '';

      overlay.innerHTML =
        '<div style="width:100%;max-width:320px;background:linear-gradient(to bottom,#1a1208,#0a0604);border:2px solid #a06028;border-radius:14px;padding:20px 18px;text-align:center;">' +
        '<div style="font-size:14px;color:#f0d890;font-weight:700;letter-spacing:2px;margin-bottom:4px;">CONFIRM PURCHASE</div>' +
        '<div style="font-size:20px;color:#f0d890;font-weight:700;margin:8px 0 2px;">' + priceStr + '</div>' +
        '<div style="font-size:12px;color:#c8a060;margin-bottom:10px;">' + displayName + '</div>' +
        bulHtml + subHtml +
        '<div style="display:flex;gap:10px;margin-top:14px;">' +
        '<button id="wg-cp-cancel"  style="flex:1;padding:11px;border-radius:9px;border:1.5px solid #5a4028;background:#1a1208;color:#a89878;font-size:12px;font-weight:700;letter-spacing:1px;cursor:pointer;">CANCEL</button>' +
        '<button id="wg-cp-confirm" style="flex:1;padding:11px;border-radius:9px;border:1.5px solid #a06028;background:linear-gradient(to bottom,#6a3010,#3a1800);color:#f0d890;font-size:12px;font-weight:700;letter-spacing:1px;cursor:pointer;">CONFIRM</button>' +
        '</div>' +
        '</div>';

      document.body.appendChild(overlay);
      overlay.querySelector('#wg-cp-confirm').addEventListener('click', function(){ overlay.remove(); resolve(true); });
      overlay.querySelector('#wg-cp-cancel').addEventListener('click',  function(){ overlay.remove(); resolve(false); });
    });
  }

  // ── Concern B — Age gate ──────────────────────────────────────────────────
  // Returns Promise<boolean>: true = age confirmed (proceed), false = rejected (block pull).
  // Persists to STORAGE_KEY.ageVerified13Plus; never shown again after YES.

  function checkAgeGate() {
    const data = _load();
    if (data.ageVerified13Plus) {
      WG.State.ageVerified13Plus = true;
      return Promise.resolve(true);
    }
    return new Promise(function(resolve) {
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9100;display:flex;align-items:center;justify-content:center;padding:16px;';

      overlay.innerHTML =
        '<div style="width:100%;max-width:300px;background:linear-gradient(to bottom,#1a1208,#0a0604);border:2px solid #a06028;border-radius:14px;padding:20px 18px;text-align:center;">' +
        '<div style="font-size:24px;margin-bottom:10px;">⚠</div>' +
        '<div style="font-size:13px;color:#f0d890;font-weight:700;letter-spacing:1.5px;margin-bottom:10px;">AGE VERIFICATION</div>' +
        '<div style="font-size:12px;color:#d4c49a;line-height:1.65;margin-bottom:14px;">This game contains randomized purchases (gacha). You must be at least <strong>13 years old</strong> to use this feature.<br><br>Are you 13 or older?</div>' +
        '<div style="display:flex;gap:10px;">' +
        '<button id="wg-age-no"  style="flex:1;padding:11px;border-radius:9px;border:1.5px solid #5a4028;background:#1a1208;color:#a89878;font-size:11px;font-weight:700;letter-spacing:1px;cursor:pointer;">NO, GO BACK</button>' +
        '<button id="wg-age-yes" style="flex:1;padding:11px;border-radius:9px;border:1.5px solid #3a6028;background:linear-gradient(to bottom,#1a3810,#0a1804);color:#a8d878;font-size:11px;font-weight:700;letter-spacing:1px;cursor:pointer;">YES, I\'M 13+</button>' +
        '</div>' +
        '</div>';

      document.body.appendChild(overlay);

      overlay.querySelector('#wg-age-yes').addEventListener('click', function() {
        const d = _load();
        d.ageVerified13Plus = true;
        _save(d);
        WG.State.ageVerified13Plus = true;
        overlay.remove();
        resolve(true);
      });
      overlay.querySelector('#wg-age-no').addEventListener('click', function() {
        overlay.remove();
        resolve(false);
      });
    });
  }

  // ── Concern C — Gambling-style transparency disclosure ─────────────────────
  // showGachaDisclosure(): always shows the bottom-sheet (for "?" icon).
  // checkGachaDisclosure(): shows only on first open; marks seen in storage.

  function showGachaDisclosure() {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:8900;display:flex;align-items:flex-end;justify-content:center;';

    overlay.innerHTML =
      '<div style="width:100%;max-width:480px;background:linear-gradient(to bottom,#1a1208,#0c0a08);border-top:2px solid #a06028;border-left:1px solid #5a4028;border-right:1px solid #5a4028;border-radius:16px 16px 0 0;padding:20px 18px 32px;margin:0 auto;">' +
      '<div style="font-size:13px;color:#f0d890;font-weight:700;letter-spacing:2px;text-align:center;margin-bottom:12px;">GACHA RATES &amp; INFORMATION</div>' +
      '<div style="font-size:12px;color:#d4c49a;line-height:1.75;margin-bottom:10px;">' +
        '<div style="margin-bottom:5px;"><strong style="color:#a8e878;">Drop rates:</strong> Common 65% · Rare 25% · Legendary 9% · Mythic 1%</div>' +
        '<div style="margin-bottom:5px;"><strong style="color:#a8e878;">Pity:</strong> Mythic guaranteed at 100 pulls; Legendary at 30</div>' +
        '<div style="margin-bottom:10px;">Items obtained are random; no guarantees on specific items outside pity.</div>' +
        '<div style="padding:9px 11px;background:#1a0c08;border:1px solid #7a3818;border-left:3px solid #c85020;border-radius:0 6px 6px 0;font-size:11px;color:#e4b090;line-height:1.6;">' +
          'If you feel compelled to spend money you cannot afford, please seek help:<br>' +
          '<a href="https://www.begambleaware.org" target="_blank" rel="noopener" style="color:#f0c070;">BeGambleAware.org</a>' +
          ' &nbsp;·&nbsp; 1-800-GAMBLER (1-800-522-4700)' +
        '</div>' +
      '</div>' +
      '<button id="wg-disc-ok" style="width:100%;padding:11px;border-radius:9px;border:1.5px solid #5a4028;background:#1a1208;color:#a89878;font-size:12px;font-weight:700;letter-spacing:1.5px;cursor:pointer;margin-top:4px;">GOT IT</button>' +
      '</div>';

    document.body.appendChild(overlay);
    overlay.querySelector('#wg-disc-ok').addEventListener('click', function(){ overlay.remove(); });
    overlay.addEventListener('click', function(e){ if (e.target === overlay) overlay.remove(); });
  }

  function checkGachaDisclosure() {
    const data = _load();
    if (data.gachaDisclosureSeen) return;
    const d = _load();
    d.gachaDisclosureSeen = true;
    _save(d);
    // Small delay so the section renders before the overlay appears.
    setTimeout(showGachaDisclosure, 100);
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  // Must be called after WG.Gacha.init() so the pull wrapper takes effect before
  // any pull button is wired. Wrapping makes WG.Gacha.pull() always return a
  // Promise — callers must use .then() or await.

  function init() {
    const data = _load();
    if (data.ageVerified13Plus) WG.State.ageVerified13Plus = true;

    if (window.WG && WG.Gacha) {
      const _orig = WG.Gacha.pull;
      WG.Gacha.pull = function(poolId, count) {
        return checkAgeGate().then(function(ok) {
          if (!ok) return { ok: false, reason: 'age_gate_rejected' };
          return _orig(poolId, count);
        });
      };
    }
  }

  window.WG.Compliance = { init, confirmPurchase, checkAgeGate, showGachaDisclosure, checkGachaDisclosure };
})();
