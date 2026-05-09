// WG.i18n — locale loader + t() helper
// init(code)       — load locale JSON; caches in localStorage wg_locale_<code>
// t(key, params)   — return localized string; {param} template interpolation
// setLocale(code)  — switch locale, persist choice, refresh [data-i18n] DOM
// Falls back to the key string itself on missing translation
(function(){'use strict';

  const CACHE_PREFIX = 'wg_locale_';
  const SETTINGS_KEY = 'wg_settings_v1';
  let _locale = 'en';
  let _strings = {};
  let _ready = false;

  async function init(code) {
    code = code || 'en';
    _locale = code;
    document.documentElement.lang = code;

    // Check localStorage cache first
    try {
      const cached = localStorage.getItem(CACHE_PREFIX + code);
      if (cached) {
        _strings = JSON.parse(cached);
        _ready = true;
        return;
      }
    } catch(e) {}

    try {
      const r = await fetch('locales/' + code + '.json?v=' + (window.WG && WG.BUILD ? WG.BUILD.version : '0'));
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      _strings = data;
      _ready = true;
      try { localStorage.setItem(CACHE_PREFIX + code, JSON.stringify(data)); } catch(e) {}
    } catch(e) {
      // Fall back to English if locale fetch failed
      if (code !== 'en') {
        console.warn('[i18n] failed to load locale "' + code + '", falling back to en');
        await init('en');
      } else {
        _strings = {};
        _ready = true;
      }
    }
  }

  function t(key, params) {
    if (!key) return '';
    let str = _strings[key];
    if (str === undefined || str === null) return key;
    if (params) {
      str = str.replace(/\{(\w+)\}/g, function(_, k) {
        return params[k] !== undefined ? String(params[k]) : '{' + k + '}';
      });
    }
    return str;
  }

  async function setLocale(code) {
    if (!code || code === _locale && _ready) { _refreshDOM(); return; }
    _ready = false;
    await init(code);
    _refreshDOM();
    // Persist language choice alongside other settings
    try {
      const cfg = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      cfg.language = code;
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(cfg));
    } catch(e) {}
  }

  function _refreshDOM() {
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) el.placeholder = t(key);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function(el) {
      const key = el.getAttribute('data-i18n-title');
      if (key) el.title = t(key);
    });
  }

  // Expose refreshDOM for post-render passes (e.g. after dynamic HTML injection)
  function refreshDOM() { _refreshDOM(); }

  function getLocale() { return _locale; }
  function isReady() { return _ready; }

  window.WG = window.WG || {};
  window.WG.i18n = { init, t, setLocale, refreshDOM, getLocale, isReady };
})();
