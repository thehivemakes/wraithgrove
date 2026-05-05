// WG.EnergyModal — refill UI opened from energy chip tap or out-of-energy interrupt.
// Watch-ad row uses WG.Ads.showRewardedVideo (counts against Path A daily 50-RV cap).
// Refill SKU rows route through WG.IAP.purchase — dev stub grants instantly.
(function(){'use strict';

  const REFILL_SKUS = ['refill_5','refill_15','refill_30','refill_60','refill_150'];
  const RV_ENERGY_REWARD = 5;

  let _modalEl = null;

  function fmtCountdown(ms){
    if (ms <= 0) return 'FULL';
    const totalSec = Math.ceil(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
  }

  function refresh(){
    if (!_modalEl) return;
    const e = WG.State.getEnergy();
    const cur = _modalEl.querySelector('[data-em="cur"]');
    const max = _modalEl.querySelector('[data-em="max"]');
    const cd  = _modalEl.querySelector('[data-em="cd"]');
    const rv  = _modalEl.querySelector('[data-em="rv-remaining"]');
    if (cur) cur.textContent = String(e.current);
    if (max) max.textContent = String(e.max);
    if (cd)  cd.textContent  = e.current >= e.max ? 'FULL' : ('+1 in ' + fmtCountdown(WG.State.nextRegenMs()));
    if (rv)  rv.textContent  = String(WG.Ads.dailyRVRemaining ? WG.Ads.dailyRVRemaining() : '–');
  }

  function close(){
    if (!_modalEl) return;
    _modalEl.remove();
    _modalEl = null;
  }

  function open(opts){
    opts = opts || {};
    if (_modalEl) { refresh(); return; }
    const e = WG.State.getEnergy();
    const root = document.getElementById('modal-root');
    const wrap = document.createElement('div');
    wrap.className = 'modal-overlay show';
    wrap.id = 'energy-modal';

    const headline = opts.reason === 'out-of-energy' ? 'OUT OF ENERGY' : 'ENERGY';

    const skuRows = REFILL_SKUS.map(id => {
      const sku = WG.IAP.bySKU(id);
      if (!sku) return '';
      const amt = sku.grants && sku.grants.energy;
      const badge = sku.bestValue ? '<span style="position:absolute;top:-8px;right:8px;background:#f0c060;color:#1a1208;font-size:9px;padding:2px 6px;border-radius:4px;font-weight:700;letter-spacing:1px;">BEST VALUE</span>' : '';
      return (
        '<div data-em-row="' + sku.id + '" class="em-sku-row" style="' +
          'position:relative;display:flex;align-items:center;justify-content:space-between;' +
          'gap:10px;background:linear-gradient(135deg,#1a1208,#0a0604);' +
          'border:1.5px solid ' + (sku.bestValue ? '#f0c060' : '#5a4028') + ';border-radius:8px;' +
          'padding:9px 12px;margin-bottom:6px;cursor:pointer;">' +
          badge +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            '<span style="color:#f0c060;font-size:18px;">⚡</span>' +
            '<span style="color:#f0d890;font-weight:700;font-size:14px;">+' + amt + '</span>' +
          '</div>' +
          '<div style="color:#f0d890;font-weight:700;font-size:13px;">$' + sku.price.toFixed(2) + '</div>' +
        '</div>'
      );
    }).join('');

    wrap.innerHTML =
      '<div class="modal-card" style="min-width:300px;max-width:340px;">' +
        '<div class="modal-title" style="color:' + (opts.reason === 'out-of-energy' ? '#ff8060' : '#f0c060') + ';">' + headline + '</div>' +
        '<div class="modal-body" style="padding:0 4px;">' +
          '<div style="text-align:center;margin-bottom:12px;">' +
            '<div style="font-size:22px;color:#f0c060;font-weight:700;">' +
              '⚡ <span data-em="cur">' + e.current + '</span>' +
              '<span style="color:#806040;">/</span>' +
              '<span data-em="max" style="color:#a89060;">' + e.max + '</span>' +
            '</div>' +
            '<div style="font-size:11px;color:#a89878;margin-top:2px;" data-em="cd">' +
              (e.current >= e.max ? 'FULL' : ('+1 in ' + fmtCountdown(WG.State.nextRegenMs()))) +
            '</div>' +
          '</div>' +
          '<div style="background:linear-gradient(135deg,#0a2a1a,#041008);border:1.5px solid #6a9050;border-radius:8px;padding:10px 12px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:10px;">' +
            '<div>' +
              '<div style="font-size:12px;color:#a8d878;font-weight:700;">WATCH AD</div>' +
              '<div style="font-size:10px;color:#80a058;">+' + RV_ENERGY_REWARD + ' ⚡ · <span data-em="rv-remaining">' + (WG.Ads.dailyRVRemaining ? WG.Ads.dailyRVRemaining() : '–') + '</span> left today</div>' +
            '</div>' +
            '<button class="btn primary" id="em-watch-ad" style="background:linear-gradient(135deg,#6aa030,#3a6010);border-color:#a8d878;padding:8px 14px;font-size:11px;">+5 ⚡</button>' +
          '</div>' +
          '<div style="font-size:10px;letter-spacing:2px;color:#a89878;text-align:center;margin-bottom:6px;">REFILL</div>' +
          skuRows +
        '</div>' +
        '<div class="modal-btn-row">' +
          '<button class="btn" id="em-close">CLOSE</button>' +
        '</div>' +
      '</div>';
    root.appendChild(wrap);
    _modalEl = wrap;

    wrap.querySelector('#em-close').addEventListener('click', close);
    wrap.addEventListener('click', (ev) => { if (ev.target === wrap) close(); });

    wrap.querySelector('#em-watch-ad').addEventListener('click', async () => {
      const btn = wrap.querySelector('#em-watch-ad');
      btn.disabled = true;
      const res = await WG.Ads.showRewardedVideo({ reward: 'energy_refill_' + RV_ENERGY_REWARD });
      if (res && res.ok) WG.State.grantEnergy(RV_ENERGY_REWARD, 'rv-refill');
      btn.disabled = false;
      refresh();
    });

    REFILL_SKUS.forEach(id => {
      const row = wrap.querySelector('[data-em-row="' + id + '"]');
      if (!row) return;
      row.addEventListener('click', async () => {
        if (row.dataset.busy === '1') return;
        row.dataset.busy = '1';
        row.style.opacity = '0.6';
        const res = await WG.IAP.purchase(id);
        row.dataset.busy = '0';
        row.style.opacity = '1';
        if (res && res.ok) refresh();
      });
    });
  }

  // Auto-refresh ticking countdown while open.
  let _refreshTimer = 0;
  function startTick(){
    if (_refreshTimer) return;
    _refreshTimer = setInterval(() => { if (_modalEl) refresh(); }, 1000);
  }

  function init(){
    startTick();
    WG.Engine.on('energy:change', () => { if (_modalEl) refresh(); });
  }

  window.WG.EnergyModal = { init, open, close, refresh };
})();
