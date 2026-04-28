// WG.Ads — ad SDK shim. In production: AdMob via Capacitor plugin.
// In web preview: simulated placeholder ad with reward callback.
(function(){'use strict';
  let dailyRVCount = 0;
  let lastRVDayKey = '';

  const DAILY_RV_CAP = 50;
  const RV_PLACEHOLDER_MS = 4000;
  const INTERSTITIAL_PLACEHOLDER_MS = 3000;

  function dayKey(){ const d=new Date(); return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }
  function resetIfNewDay(){
    const k = dayKey();
    if (lastRVDayKey !== k) { dailyRVCount = 0; lastRVDayKey = k; }
  }
  function dailyRVRemaining(){ resetIfNewDay(); return Math.max(0, DAILY_RV_CAP - dailyRVCount); }
  function adRemovalActive(){ return WG.State.get().iap.adRemovalActive; }

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

  async function showInterstitial() {
    if (adRemovalActive()) {
      WG.Engine.emit('ad:bypassed', { reason: 'premium' });
      return { ok: true, bypassed: true };
    }
    const ch = detectAdChannel();
    if (ch === 'admob') return showAdMobInterstitial();
    return showPlaceholderInterstitial();
  }

  function showPlaceholderRewarded(opts) {
    return new Promise(resolve => showAdPlaceholder('REWARDED VIDEO', RV_PLACEHOLDER_MS, () => {
      dailyRVCount++;
      WG.Engine.emit('ad:rewarded', { reward: opts && opts.reward, count: dailyRVCount });
      resolve({ ok: true });
    }));
  }

  function showPlaceholderInterstitial() {
    return new Promise(resolve => showAdPlaceholder('INTERSTITIAL', INTERSTITIAL_PLACEHOLDER_MS, () => {
      WG.Engine.emit('ad:interstitial-shown', {});
      resolve({ ok: true });
    }));
  }

  async function showAdMobRewarded(opts) {
    const AdMob = window.Capacitor.Plugins.AdMob;
    if (!AdMob) {
      console.warn('[ads] AdMob plugin missing — falling back to placeholder');
      return showPlaceholderRewarded(opts);
    }
    try {
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
    // Google's official test ad unit IDs — safe to ship in dev builds, never charge advertisers
    const testIds = {
      rewarded:     { ios: 'ca-app-pub-3940256099942544/1712485313', android: 'ca-app-pub-3940256099942544/5224354917' },
      interstitial: { ios: 'ca-app-pub-3940256099942544/4411468910', android: 'ca-app-pub-3940256099942544/1033173712' },
    };
    const isDev = !(window.WG && WG.AdConfig && WG.AdConfig[kind]);
    if (isDev) {
      const platform = window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform();
      return (testIds[kind] && testIds[kind][platform]) || testIds[kind].android;
    }
    // Production: Architect sets window.WG.AdConfig via app-config.js with real unit IDs
    return WG.AdConfig[kind];
  }

  function showAdPlaceholder(label, ms, onDone) {
    const root = document.getElementById('modal-root');
    const wrap = document.createElement('div');
    wrap.className = 'modal-overlay show';
    wrap.style.zIndex = 250;
    wrap.innerHTML = `
      <div class="modal-card" style="text-align:center;background:linear-gradient(135deg,#0a2a3a,#0a0a1a);border-color:#3060a0;">
        <div style="font-size:10px;letter-spacing:3px;color:#80b0d0;">— ${label} PLACEHOLDER —</div>
        <div style="font-size:14px;color:#fff;margin:14px 0 6px 0;">[ad would play here]</div>
        <div style="font-size:11px;color:#a0c0d8;margin-bottom:10px;">SKU: production replaces with AdMob/IronSource/AppLovin</div>
        <div id="ad-countdown" style="font-size:24px;color:#fff0c0;">${Math.ceil(ms/1000)}</div>
        <div class="modal-btn-row" style="margin-top:14px;">
          <button class="btn" id="ad-skip-btn" disabled>SKIP</button>
        </div>
      </div>
    `;
    root.appendChild(wrap);
    let remaining = Math.ceil(ms / 1000);
    const cd = wrap.querySelector('#ad-countdown');
    const skipBtn = wrap.querySelector('#ad-skip-btn');
    const interval = setInterval(() => {
      remaining--;
      if (cd) cd.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(interval);
        skipBtn.disabled = false;
        skipBtn.textContent = 'CLAIM';
      }
    }, 1000);
    skipBtn.addEventListener('click', () => {
      clearInterval(interval);
      wrap.remove();
      onDone && onDone();
    });
  }

  function showInfoModal(title, body) {
    const root = document.getElementById('modal-root');
    const wrap = document.createElement('div');
    wrap.className = 'modal-overlay show';
    wrap.innerHTML = `
      <div class="modal-card">
        <div class="modal-title">${title}</div>
        <div class="modal-body">${body}</div>
        <div class="modal-btn-row"><button class="btn primary">OK</button></div>
      </div>
    `;
    root.appendChild(wrap);
    wrap.querySelector('.btn').addEventListener('click', () => wrap.remove());
  }

  function init() {}
  window.WG.Ads = { init, showRewardedVideo, showInterstitial, dailyRVRemaining };
})();
