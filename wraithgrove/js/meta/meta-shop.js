// WG.Shop — full-screen Shop modal: Gem Packs, Bundles, Royal Pass, Summon, Offers.
// W-Monetization-V2-Whale-Ladder §D (Shop UI) + §E (Royal Pass landing page)
//
// Entry points:
//   1. 🛒 gems chip in top strip (tapping gems count opens Shop at Gem Packs)
//   2. SHOP side icon in Hunt lobby (renamed from OFFERS — Offers is a sub-section)
//
// Navigation model: single fullscreen overlay with a section nav strip. Sub-screens
// (Royal Pass landing, Gacha pull screen) push onto a simple stack managed here.
//
// Legal compliance:
//   - All gacha rates listed via WG.Gacha.getRates() in the Summon section.
//   - Royal Pass landing: "$14.99/month · auto-renews · cancel anytime" clearly before subscribe button.
//   - Apple §3.1.2 + FTC 2024 subscription disclosure: subscription terms shown pre-purchase.
(function(){'use strict';

  let _el = null;
  let _currentSection = 'gems';  // 'gems' | 'bundles' | 'royalpass' | 'summon' | 'offers'
  let _screen = 'main';          // 'main' | 'royalpass-landing' | 'gacha-pull'
  let _gachaPool = 'standard';   // active pool for gacha sub-screen

  // ─── Utility ─────────────────────────────────────────────────────────────

  function btn(label, style, cls) {
    const b = document.createElement('button');
    b.className = 'btn' + (cls ? ' ' + cls : '');
    b.style.cssText = style || '';
    b.textContent = label;
    b.addEventListener('pointerdown', () => { b.style.transform = 'scale(0.96)'; });
    b.addEventListener('pointerup',   () => { b.style.transform = 'scale(1)'; });
    b.addEventListener('pointerleave',() => { b.style.transform = 'scale(1)'; });
    return b;
  }

  function fmtDuration(ms) {
    if (!ms) return '';
    const h = Math.floor(ms / 3600000);
    const d = Math.floor(ms / 86400000);
    if (d >= 1) return d + 'd ' + Math.floor((ms % 86400000) / 3600000) + 'h';
    return h + 'h ' + Math.floor((ms % 3600000) / 60000) + 'm';
  }

  function isVIP() { return WG.State.isRoyalPassActive && WG.State.isRoyalPassActive(); }

  // ─── Main screen sections ─────────────────────────────────────────────────

  function _sectionNav() {
    const SECTIONS = [
      { id: 'gems',       label: '💎 Gems' },
      { id: 'bundles',    label: '🎒 Bundles' },
      { id: 'royalpass',  label: '👑 Pass' },
      { id: 'summon',     label: '🔮 Summon' },
      { id: 'offers',     label: '▶ Offers' },
    ];
    const nav = document.createElement('div');
    nav.id = 'wg-shop-nav';
    nav.style.cssText = 'display:flex;gap:6px;overflow-x:auto;padding:0 2px 8px 2px;scrollbar-width:none;';
    SECTIONS.forEach(sec => {
      const pill = document.createElement('button');
      const active = _currentSection === sec.id;
      pill.dataset.sec = sec.id;
      pill.style.cssText = [
        'flex:0 0 auto;padding:7px 13px;border-radius:20px;border:1.5px solid;cursor:pointer;',
        'font-size:11px;letter-spacing:1px;font-weight:700;white-space:nowrap;transition:none;',
        active
          ? 'background:linear-gradient(to bottom,#806020,#4a2c04);border-color:#c8a040;color:#fff8e0;'
          : 'background:rgba(0,0,0,0.4);border-color:#4a3018;color:#a89878;',
      ].join('');
      pill.textContent = sec.label;
      pill.addEventListener('click', () => { _currentSection = sec.id; _renderMain(); });
      nav.appendChild(pill);
    });
    return nav;
  }

  // ── Gems section ──────────────────────────────────────────────────────────

  function _sectionGems(body) {
    const GEM_SKUS = ['gems_5','gems_15','gems_30','gems_60','gems_150','gems_500','gems_1500'];
    const vipDiscount = isVIP() ? 0.80 : 1.0;

    const header = document.createElement('div');
    header.style.cssText = 'font-size:11px;letter-spacing:2px;color:#a89878;text-align:center;margin:4px 0 10px 0;text-transform:uppercase;';
    header.textContent = 'Premium Gacha Currency' + (isVIP() ? ' · 20% OFF (Royal Pass)' : '');
    body.appendChild(header);

    GEM_SKUS.forEach(id => {
      const sku = WG.IAP.bySKU(id);
      if (!sku) return;
      const row = document.createElement('div');
      const isBest = sku.bestValue;
      row.style.cssText = [
        'position:relative;display:flex;align-items:center;justify-content:space-between;',
        'gap:10px;padding:10px 12px;border-radius:9px;margin-bottom:7px;cursor:pointer;',
        'background:linear-gradient(135deg,#1a1208,#0c0806);',
        'border:1.5px solid ' + (isBest ? '#f0c060' : '#3a2818') + ';',
      ].join('');

      if (isBest) {
        const badge = document.createElement('span');
        badge.style.cssText = 'position:absolute;top:-9px;left:50%;transform:translateX(-50%);background:#f0c060;color:#1a1208;font-size:9px;padding:2px 8px;border-radius:4px;font-weight:700;letter-spacing:1px;white-space:nowrap;';
        badge.textContent = 'BEST VALUE';
        row.appendChild(badge);
      }

      const effPrice = (sku.price * vipDiscount).toFixed(2);
      row.innerHTML += [
        '<div style="display:flex;align-items:center;gap:10px;">',
          '<span style="font-size:22px;">💎</span>',
          '<div>',
            '<div style="font-size:13px;font-weight:700;color:#f0d890;">' + sku.display + '</div>',
            '<div style="font-size:10px;color:#a89878;margin-top:1px;">' + (sku.name || '') + '</div>',
          '</div>',
        '</div>',
        '<button class="btn primary" style="min-width:64px;padding:8px 12px;font-size:12px;white-space:nowrap;">$' + effPrice + '</button>',
      ].join('');

      const buyBtn = row.querySelector('button');
      buyBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        buyBtn.disabled = true;
        const res = await WG.IAP.purchase(id);
        buyBtn.disabled = false;
        if (res && res.ok) {
          buyBtn.textContent = '✓';
          setTimeout(() => { buyBtn.textContent = '$' + effPrice; }, 1500);
          _refreshGemsChip();
        }
      });
      body.appendChild(row);
    });
  }

  // ── Bundles section ───────────────────────────────────────────────────────

  function _sectionBundles(body) {
    const BUNDLE_SKUS = ['starter_pack','weekly_deal','monthly_deal','mega_bundle'];

    const header = document.createElement('div');
    header.style.cssText = 'font-size:11px;letter-spacing:2px;color:#a89878;text-align:center;margin:4px 0 10px 0;text-transform:uppercase;';
    header.textContent = 'Value Bundles';
    body.appendChild(header);

    BUNDLE_SKUS.forEach(id => {
      const sku = WG.IAP.bySKU(id);
      if (!sku) return;
      const available = WG.IAP.isAvailable ? WG.IAP.isAvailable(id) : true;
      const resetIn   = WG.IAP.bundleResetIn ? WG.IAP.bundleResetIn(id) : 0;
      const isMega    = id === 'mega_bundle';

      const row = document.createElement('div');
      row.style.cssText = [
        'position:relative;padding:12px;border-radius:9px;margin-bottom:10px;',
        'background:linear-gradient(135deg,' + (isMega ? '#3a1a08,#1a0804' : '#1a1208,#0c0806') + ');',
        'border:1.5px solid ' + (isMega ? '#c04010' : available ? '#5a4028' : '#2a1c10') + ';',
        available ? '' : 'opacity:0.65;',
      ].join('');

      const contents = sku.display || '–';
      const priceTxt = '$' + sku.price.toFixed(2) + (sku.type === 'subscription' ? '/mo' : '');
      const unavailLbl = !available && resetIn ? ('Resets in ' + fmtDuration(resetIn)) : (!available ? 'Purchased' : '');

      row.innerHTML = [
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">',
          '<div style="flex:1;">',
            '<div style="font-size:13px;font-weight:700;color:#f0d890;margin-bottom:3px;">' + (isMega ? '🐋 ' : '') + (sku.name || id) + '</div>',
            '<div style="font-size:10px;color:#c0a870;line-height:1.4;">' + contents + '</div>',
            unavailLbl ? '<div style="font-size:10px;color:#806040;margin-top:4px;">' + unavailLbl + '</div>' : '',
          '</div>',
          '<button class="btn' + (isMega ? ' danger' : ' primary') + '" style="min-width:72px;padding:9px 12px;font-size:12px;white-space:nowrap;' + (!available ? 'opacity:0.4;cursor:not-allowed;' : '') + '">' + priceTxt + '</button>',
        '</div>',
      ].join('');

      const buyBtn = row.querySelector('button');
      if (available) {
        buyBtn.addEventListener('click', async () => {
          buyBtn.disabled = true;
          const res = await WG.IAP.purchase(id);
          buyBtn.disabled = false;
          if (res && res.ok) {
            buyBtn.textContent = '✓';
            setTimeout(() => _renderMain(), 1200);
          } else if (res && res.reason === 'not yet reset') {
            buyBtn.textContent = 'Soon';
            setTimeout(() => { buyBtn.textContent = priceTxt; }, 2000);
          }
          _refreshGemsChip();
        });
      }
      body.appendChild(row);
    });
  }

  // ── Royal Pass section (teaser card → sub-screen) ─────────────────────────

  function _sectionRoyalPass(body) {
    const active = isVIP();
    const card = document.createElement('div');
    card.style.cssText = [
      'padding:16px;border-radius:12px;margin:4px 0 0 0;cursor:' + (active ? 'default' : 'pointer') + ';',
      'background:linear-gradient(135deg,#3a1a50,#1a0a30);',
      'border:2px solid ' + (active ? '#c080ff' : '#7a3ab0') + ';',
    ].join('');

    card.innerHTML = [
      '<div style="text-align:center;margin-bottom:12px;">',
        '<div style="font-size:28px;line-height:1;">👑</div>',
        '<div style="font-size:16px;font-weight:800;letter-spacing:3px;color:#e0b8ff;margin-top:4px;">ROYAL PASS</div>',
        active ? '<div style="font-size:11px;color:#a080d0;margin-top:4px;letter-spacing:1px;">ACTIVE</div>' : '',
      '</div>',
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:14px;">',
        ['2× Stage Rewards','+20 Energy Cap','+10 Daily Energy','20% Gem Discount','Exclusive Monthly Stage','Royal Portrait Frame','VIP Duel Badge']
          .map(b => '<div style="background:rgba(120,60,200,0.2);border:1px solid #6a3a90;border-radius:6px;padding:6px 8px;font-size:10px;color:#d0a8ff;letter-spacing:0.5px;">✦ ' + b + '</div>')
          .join(''),
      '</div>',
      active
        ? '<div style="text-align:center;font-size:12px;color:#c080ff;letter-spacing:1px;padding:8px;">Subscription active · cancel in App Store</div>'
        : '<button id="wg-shop-rp-cta" class="btn primary" style="width:100%;padding:13px;font-size:13px;letter-spacing:2px;background:linear-gradient(to bottom,#7a30c0,#4a1880);border-color:#c080ff;color:#f0d8ff;">SEE DETAILS — $14.99/mo</button>',
    ].join('');

    if (!active) {
      const cta = card.querySelector('#wg-shop-rp-cta');
      if (cta) cta.addEventListener('click', () => { _screen = 'royalpass-landing'; _renderMain(); });
      card.addEventListener('click', (e) => { if (e.target !== cta) { _screen = 'royalpass-landing'; _renderMain(); } });
    }
    body.appendChild(card);
  }

  // ── Summon section (gacha) ─────────────────────────────────────────────────

  function _sectionSummon(body) {
    // W-Compliance-Disclosure Concern C — show gacha disclosure on first open.
    if (window.WG && WG.Compliance) WG.Compliance.checkGachaDisclosure();

    const gemsNow = WG.State.get().currencies.gems || 0;

    const gemsRow = document.createElement('div');
    gemsRow.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:10px;';
    gemsRow.innerHTML =
      '<span style="font-size:13px;color:#c8a0ff;font-weight:700;letter-spacing:1px;">💎 ' + gemsNow + ' Gems available</span>' +
      '<button id="wg-gacha-info-btn" aria-label="Gacha information" style="background:none;border:1.5px solid #5a3a90;border-radius:50%;width:36px;height:36px;color:#a080c0;font-size:14px;font-weight:700;cursor:pointer;line-height:1;padding:0;flex-shrink:0;" title="Gacha information">?</button>';
    body.appendChild(gemsRow);
    const infoBtn = gemsRow.querySelector('#wg-gacha-info-btn');
    if (infoBtn) infoBtn.addEventListener('click', function() { if (window.WG && WG.Compliance) WG.Compliance.showGachaDisclosure(); });

    const POOLS = [
      { id: 'standard',    label: 'Standard Pool',  icon: '🔮', poolColor: '#5a3a90', borderColor: '#8a60c0' },
      { id: 'rift_guests', label: 'Rift Guests',     icon: '🌀', poolColor: '#2a1040', borderColor: '#4a2080' },
    ];

    POOLS.forEach(spec => {
      const rates = WG.Gacha ? WG.Gacha.getRates(spec.id) : null;
      const pityTxt = WG.Gacha ? WG.Gacha.getPityDisplay(spec.id) : '';
      const card = document.createElement('div');
      card.style.cssText = [
        'padding:14px;border-radius:10px;margin-bottom:10px;',
        'background:linear-gradient(135deg,' + spec.poolColor + '40,' + spec.poolColor + '18);',
        'border:1.5px solid ' + (rates && rates.locked ? '#2a1840' : spec.borderColor) + ';',
        rates && rates.locked ? 'opacity:0.7;' : '',
      ].join('');

      if (rates && rates.locked) {
        card.innerHTML = [
          '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">',
            '<span style="font-size:28px;">' + spec.icon + '</span>',
            '<div>',
              '<div style="font-size:13px;font-weight:700;color:#a080c0;">' + spec.label + '</div>',
              '<div style="font-size:11px;color:#705088;margin-top:2px;">🔒 ' + (rates.lockMessage || 'Locked') + '</div>',
            '</div>',
          '</div>',
        ].join('');
      } else if (rates) {
        const rateLines = Object.entries(rates.rates)
          .filter(([,v]) => v > 0)
          .map(([t,v]) => '<span style="color:' + _tierColor(t) + ';">' + _tierLabel(t) + ' ' + (v * 100).toFixed(0) + '%</span>')
          .join('  ');
        card.innerHTML = [
          '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">',
            '<span style="font-size:28px;">' + spec.icon + '</span>',
            '<div style="flex:1;">',
              '<div style="font-size:13px;font-weight:700;color:#e0c8ff;">' + spec.label + '</div>',
              '<div style="font-size:10px;color:#a890c8;margin-top:2px;">' + (pityTxt || '') + '</div>',
            '</div>',
          '</div>',
          '<div id="wg-gacha-result-' + spec.id + '" style="min-height:28px;text-align:center;font-size:11px;color:#c0a8e0;margin-bottom:8px;"></div>',
          // Rate disclosure — JP/CN/KR/EU legal requirement
          '<details style="margin-bottom:10px;">',
            '<summary style="font-size:10px;color:#a080c0;cursor:pointer;letter-spacing:1px;list-style:none;">▼ VIEW DROP RATES</summary>',
            '<div style="font-size:11px;color:#c0a8e0;margin-top:6px;line-height:1.8;background:rgba(0,0,0,0.3);padding:8px;border-radius:6px;">' + rateLines + '<br>',
              '<span style="color:#806080;font-size:10px;">Mythic pity: ' + rates.pity.mythic + ' pulls · Legendary pity: ' + rates.pity.legendary + ' pulls</span>',
            '</div>',
          '</details>',
          '<div style="display:flex;gap:8px;">',
            '<button id="wg-pull1-' + spec.id + '" class="btn primary" style="flex:1;padding:11px;font-size:12px;letter-spacing:1px;background:linear-gradient(to bottom,#6a3ab0,#3a1870);border-color:#a060e0;">PULL × 1<br><span style="font-size:10px;opacity:0.8;">30 💎</span></button>',
            '<button id="wg-pull10-' + spec.id + '" class="btn primary" style="flex:1;padding:11px;font-size:12px;letter-spacing:1px;background:linear-gradient(to bottom,#8a3ab0,#4a1888);border-color:#c060e0;">PULL × 10<br><span style="font-size:10px;opacity:0.8;">270 💎 <span style="color:#a8e878;">-10%</span></span></button>',
          '</div>',
        ].join('');

        [1, 10].forEach(count => {
          const btn = card.querySelector('#wg-pull' + count + '-' + spec.id);
          const resultEl = card.querySelector('#wg-gacha-result-' + spec.id);
          if (!btn) return;
          btn.addEventListener('click', () => {
            if (!WG.Gacha) return;
            btn.disabled = true;
            // W-Compliance-Disclosure: WG.Gacha.pull now returns a Promise (age gate
            // wrapping). Promise.resolve() keeps this handler compatible whether pull
            // is sync (pre-compliance) or async (post-compliance init).
            Promise.resolve(WG.Gacha.pull(spec.id, count)).then(function(res) {
              btn.disabled = false;
              if (!res.ok) {
                if (resultEl) resultEl.innerHTML = '<span style="color:#e06060;">' + (res.reason || 'Error') + '</span>';
                return;
              }
              // Show results summary
              const byTier = {};
              (res.results || []).forEach(r => { byTier[r.tier] = (byTier[r.tier] || 0) + 1; });
              if (resultEl) {
                resultEl.innerHTML = Object.entries(byTier)
                  .map(([t,n]) => '<span style="color:' + _tierColor(t) + ';font-weight:700;">' + _tierLabel(t) + ' ×' + n + '</span>')
                  .join('  ') || 'No results';
              }
              _refreshGemsChip();
              // Refresh pity line
              const pityEl = card.querySelector('div > div[style*="font-size:10px"]');
              if (pityEl && WG.Gacha) pityEl.textContent = WG.Gacha.getPityDisplay(spec.id);
            });
          });
        });
      }
      body.appendChild(card);
    });
  }

  function _tierColor(t) {
    return { mythic:'#ff80ff', legendary:'#ffcc40', rare:'#60a0ff', common:'#a0a0a0' }[t] || '#d0d0d0';
  }
  function _tierLabel(t) {
    return { mythic:'Mythic', legendary:'Legendary', rare:'Rare', common:'Common' }[t] || t;
  }

  // ── Offers section (existing ad-buffs, presented inside Shop) ─────────────

  function _sectionOffers(body) {
    const header = document.createElement('div');
    header.style.cssText = 'font-size:11px;letter-spacing:2px;color:#a89878;text-align:center;margin:4px 0 10px 0;text-transform:uppercase;';
    header.textContent = 'Ad Offers · Watch to earn';
    body.appendChild(header);

    const BUFFS = [
      { id: 'damage_x2',      ms: 60000, title: '2× DAMAGE',       sub: '60s after watching ad' },
      { id: 'wood_x2',        ms: 90000, title: '2× WOOD',         sub: '90s after watching ad' },
      { id: 'instant_turret', ms: 0,     title: 'INSTANT TURRET',  sub: 'Free build, one use' },
      { id: 'revive',         ms: 0,     title: 'PRE-ARM REVIVE',  sub: 'One free death save' },
    ];

    BUFFS.forEach(spec => {
      const active = WG.Buffs && WG.Buffs.has && WG.Buffs.has(spec.id);
      const row = document.createElement('div');
      row.style.cssText = [
        'display:flex;align-items:center;justify-content:space-between;gap:10px;',
        'padding:10px 12px;border-radius:8px;margin-bottom:7px;',
        'background:linear-gradient(135deg,#2a1c08,#120c04);',
        'border:1.5px solid #b08820;',
      ].join('');
      row.innerHTML = [
        '<div>',
          '<div style="font-size:12px;font-weight:700;color:#f0d890;letter-spacing:1px;">' + spec.title + '</div>',
          '<div style="font-size:10px;color:#c0a060;margin-top:2px;">' + spec.sub + '</div>',
        '</div>',
        active
          ? '<span style="font-size:11px;background:#4a8030;color:#c8f090;padding:4px 10px;border-radius:6px;font-weight:700;">ON</span>'
          : '<button class="btn" id="wg-offer-' + spec.id + '" style="background:linear-gradient(135deg,#b08820,#604010);border-color:#f0c060;padding:8px 12px;font-size:11px;">▶ AD</button>',
      ].join('');

      if (!active) {
        const offerBtn = row.querySelector('#wg-offer-' + spec.id);
        if (offerBtn) {
          offerBtn.addEventListener('click', async () => {
            offerBtn.disabled = true;
            const res = await WG.Ads.showRewardedVideo({ reward: 'buff:' + spec.id });
            offerBtn.disabled = false;
            if (res && res.ok) {
              WG.Buffs && WG.Buffs.activate && WG.Buffs.activate(spec.id, spec.ms);
              _renderMain(); // refresh ON state
            }
          });
        }
      }
      body.appendChild(row);
    });
  }

  // ─── Royal Pass landing page (sub-screen) ────────────────────────────────

  function _renderRoyalPassLanding(container) {
    container.innerHTML = '';

    // Back button
    const backRow = document.createElement('div');
    backRow.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:16px;';
    const backBtn = btn('← BACK', 'padding:8px 14px;font-size:11px;', '');
    backBtn.addEventListener('click', () => { _screen = 'main'; _renderMain(); });
    backRow.appendChild(backBtn);
    const title = document.createElement('div');
    title.style.cssText = 'font-size:15px;font-weight:800;letter-spacing:3px;color:#e0b8ff;';
    title.textContent = '👑 ROYAL PASS';
    backRow.appendChild(title);
    container.appendChild(backRow);

    // Hero crown visual
    const hero = document.createElement('div');
    hero.style.cssText = 'text-align:center;padding:20px 0 14px 0;background:linear-gradient(to bottom,#3a1a50,#1a0a30);border-radius:12px;margin-bottom:16px;border:2px solid #7a3ab0;';
    hero.innerHTML = [
      '<div style="font-size:48px;line-height:1;filter:drop-shadow(0 0 16px rgba(200,100,255,0.6));">👑</div>',
      '<div style="font-size:20px;font-weight:800;letter-spacing:4px;color:#e0b8ff;margin-top:8px;">ROYAL PASS</div>',
      '<div style="font-size:12px;color:#a080c0;margin-top:4px;letter-spacing:2px;">$14.99 / month</div>',
    ].join('');
    container.appendChild(hero);

    // Benefits comparison
    const BENEFITS = [
      { label: 'Stage clear rewards', free: '1×', vip: '2×' },
      { label: 'Max energy',          free: '30', vip: '50' },
      { label: 'Daily energy bonus',  free: '—',  vip: '+10 ⚡' },
      { label: 'Gem purchase price',  free: 'Full price', vip: '20% off' },
      { label: 'Monthly stage',       free: '—',  vip: '✓ Exclusive' },
      { label: 'Character frame',     free: 'Standard', vip: 'Royal Purple' },
      { label: 'Duel badge',          free: '—',  vip: '👑 Crown' },
    ];

    const table = document.createElement('table');
    table.style.cssText = 'width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12px;';
    table.innerHTML = [
      '<thead>',
        '<tr>',
          '<th style="text-align:left;padding:8px;color:#a89878;font-weight:600;border-bottom:1px solid #3a2818;">Benefit</th>',
          '<th style="padding:8px;color:#a89878;font-weight:600;border-bottom:1px solid #3a2818;text-align:center;">Free</th>',
          '<th style="padding:8px;color:#c080ff;font-weight:700;border-bottom:1px solid #7a3ab0;text-align:center;background:rgba(120,60,200,0.15);border-radius:4px 4px 0 0;">Royal Pass</th>',
        '</tr>',
      '</thead>',
      '<tbody>',
        BENEFITS.map((b, i) => [
          '<tr style="background:' + (i % 2 === 0 ? 'rgba(0,0,0,0.2)' : 'transparent') + ';">',
            '<td style="padding:8px;color:#d0b878;">' + b.label + '</td>',
            '<td style="padding:8px;text-align:center;color:#706050;">' + b.free + '</td>',
            '<td style="padding:8px;text-align:center;color:#d0a8ff;font-weight:700;background:rgba(120,60,200,0.1);">' + b.vip + '</td>',
          '</tr>',
        ].join('')).join(''),
      '</tbody>',
    ].join('');
    container.appendChild(table);

    // Legal disclosure — REQUIRED per Apple §3.1.2 + FTC 2024 before subscribe button
    const legalBox = document.createElement('div');
    legalBox.style.cssText = 'background:rgba(0,0,0,0.4);border:1px solid #3a2818;border-radius:8px;padding:10px 12px;margin-bottom:14px;font-size:10px;color:#806050;line-height:1.6;';
    legalBox.innerHTML = [
      '<strong style="color:#a89060;">Subscription Terms</strong><br>',
      'Royal Pass is a <strong>recurring monthly subscription</strong> priced at <strong>$14.99/month</strong>. ',
      'Payment will be charged to your App Store or Google Play account at confirmation of purchase. ',
      'The subscription <strong>auto-renews</strong> unless cancelled at least 24 hours before the end of the current period. ',
      'You may <strong>cancel anytime</strong> in your device\'s App Store / Google Play subscription settings. ',
      'No partial refunds for the unused portion of an active period. ',
      'Free players retain full access to all core game content.',
    ].join('');
    container.appendChild(legalBox);

    const active = isVIP();
    if (active) {
      const activeMsg = document.createElement('div');
      activeMsg.style.cssText = 'text-align:center;padding:14px;background:rgba(120,60,200,0.2);border:2px solid #7a3ab0;border-radius:10px;color:#d0a8ff;font-size:13px;font-weight:700;letter-spacing:1px;';
      activeMsg.textContent = '✓ Royal Pass Active';
      container.appendChild(activeMsg);
    } else {
      const subBtn = btn('SUBSCRIBE — $14.99/month', 'width:100%;padding:14px;font-size:14px;letter-spacing:2px;background:linear-gradient(to bottom,#7a30c0,#4a1880);border-color:#c080ff;color:#f0d8ff;border-radius:10px;', 'primary');
      subBtn.addEventListener('click', async () => {
        subBtn.disabled = true;
        subBtn.textContent = 'Processing…';
        const res = await WG.IAP.purchase('royal_pass_monthly');
        if (res && res.ok) {
          subBtn.textContent = '✓ Welcome, Royal Member!';
          setTimeout(() => { _screen = 'main'; _currentSection = 'royalpass'; _renderMain(); }, 1500);
        } else {
          subBtn.disabled = false;
          subBtn.textContent = 'SUBSCRIBE — $14.99/month';
        }
      });
      container.appendChild(subBtn);
    }
  }

  // ─── Main render ──────────────────────────────────────────────────────────

  function _renderMain() {
    if (!_el) return;
    const container = _el.querySelector('#wg-shop-container');
    if (!container) return;
    container.innerHTML = '';

    if (_screen === 'royalpass-landing') {
      _renderRoyalPassLanding(container);
      return;
    }

    // Section nav strip
    container.appendChild(_sectionNav());

    // Section body
    const body = document.createElement('div');
    body.id = 'wg-shop-body';
    body.style.cssText = 'overflow-y:auto;flex:1 1 auto;padding-bottom:12px;';
    container.appendChild(body);

    if (_currentSection === 'gems')      _sectionGems(body);
    if (_currentSection === 'bundles')   _sectionBundles(body);
    if (_currentSection === 'royalpass') _sectionRoyalPass(body);
    if (_currentSection === 'summon')    _sectionSummon(body);
    if (_currentSection === 'offers')    _sectionOffers(body);
  }

  // ─── Open / close ─────────────────────────────────────────────────────────

  function open(opts) {
    opts = opts || {};
    if (opts.section) _currentSection = opts.section;
    _screen = 'main';
    if (_el) { _renderMain(); return; }

    const root = document.getElementById('modal-root');
    const wrap = document.createElement('div');
    wrap.id = 'wg-shop-overlay';
    wrap.style.cssText = [
      'position:absolute;inset:0;z-index:120;',
      'background:rgba(0,0,0,0.88);',
      'display:flex;flex-direction:column;',
      'padding:0;',
    ].join('');

    wrap.innerHTML = [
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px 10px 16px;background:#0e0a06;border-bottom:1px solid #3a2818;flex:0 0 auto;">',
        '<div style="font-size:14px;font-weight:800;letter-spacing:3px;color:#f0d890;">🛒 SHOP</div>',
        '<div style="display:flex;align-items:center;gap:10px;">',
          '<div style="font-size:12px;color:#c0a0ff;">💎 <span id="wg-shop-gems-display">' + (WG.State.get().currencies.gems || 0) + '</span></div>',
          '<button id="wg-shop-close" style="background:none;border:none;color:#a89878;font-size:22px;cursor:pointer;line-height:1;padding:0 4px;">✕</button>',
        '</div>',
      '</div>',
      '<div id="wg-shop-container" style="flex:1 1 auto;overflow-y:auto;padding:12px 14px 16px 14px;display:flex;flex-direction:column;"></div>',
    ].join('');

    root.appendChild(wrap);
    _el = wrap;

    wrap.querySelector('#wg-shop-close').addEventListener('click', close);

    // Listen for gems changes to update header counter
    WG.Engine.on('currency:change', () => {
      if (_el) {
        const disp = _el.querySelector('#wg-shop-gems-display');
        if (disp) disp.textContent = String(WG.State.get().currencies.gems || 0);
      }
    });

    _renderMain();
  }

  function close() {
    if (!_el) return;
    _el.remove();
    _el = null;
    _screen = 'main';
  }

  function _refreshGemsChip() {
    const chip = document.getElementById('gems-chip');
    if (chip) {
      const val = chip.querySelector('[data-bind="gems"]');
      if (val) val.textContent = String(WG.State.get().currencies.gems || 0);
    }
  }

  function init() {
    WG.Engine.on('currency:change', () => _refreshGemsChip());
    WG.Engine.on('royal-pass:activated', () => { if (_el) _renderMain(); });
  }

  window.WG.Shop = { init, open, close };
})();
