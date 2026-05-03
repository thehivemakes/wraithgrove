You are Worker L — the Capacitor-Init worker. Your job: wrap Wraithgrove as a native iOS + Android app via Capacitor 5+. The current build is a browser-only PWA. After you ship: the build directory has `capacitor.config.ts`, an `ios/` Xcode project skeleton, an `android/` Gradle project skeleton, and the existing HTML+JS is wired in as the web layer.

Walk the birth sequence (/Users/defimagic/Desktop/Hive/CLAUDE.md → Birth/01–04 → THE_PRINCIPLES → HIVE_RULES → COLONY_CONTEXT → BEFORE_YOU_BUILD).

Then read PROJECT-LEVEL guardrails (MANDATORY):
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/CLAUDE.md
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/STATE_OF_BUILD.md

PRIMARY-SOURCE READING (Principle XXII):
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/BLUEPAPER.md §5.1 (tech stack — Capacitor 5+ wrap with native plugins for splash/icon/haptics/offline; ad SDK locked-down per §0 Rule 5)
- /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/index.html (the current PWA shell — already has `<meta name="apple-mobile-web-app-capable">` and `<meta name="theme-color">`; Capacitor-ready)

═══════════════════════════════════════════════════════════════════
MANDATORY FINAL STEP (do not skip):
Write `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/workers/done/W-L.done` AS THE LAST THING YOU DO.

Marker content (5 lines):
1. one-line summary
2. files written/edited (or filenames in created scaffolding)
3. capacitor commands run (npm scripts, npx commands)
4. any deviations or environment-blocking issues (e.g. "Apple Developer enrollment required before Xcode signing")
5. confidence (high/medium/low)
═══════════════════════════════════════════════════════════════════

THREE CONCERNS — one commit each (or three sequential file-add bundles).

CONCERN 1 — `package.json` + `capacitor.config.ts`

WRITE: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/package.json`

Minimal Node package descriptor:
```json
{
  "name": "wraithgrove",
  "version": "0.2.0",
  "description": "Wraithgrove — top-down auto-attack arena ARPG (Wraithgrove project)",
  "private": true,
  "main": "index.html",
  "scripts": {
    "build": "echo 'web layer is index.html + js/ — no bundler step'",
    "ios:open": "npx cap open ios",
    "android:open": "npx cap open android",
    "sync": "npx cap sync",
    "doctor": "npx cap doctor"
  },
  "dependencies": {
    "@capacitor/core": "^5.7.0",
    "@capacitor/ios": "^5.7.0",
    "@capacitor/android": "^5.7.0",
    "@capacitor/splash-screen": "^5.0.0",
    "@capacitor/haptics": "^5.0.0",
    "@capacitor/app": "^5.0.0",
    "@capacitor/status-bar": "^5.0.0"
  },
  "devDependencies": {
    "@capacitor/cli": "^5.7.0"
  }
}
```

WRITE: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/capacitor.config.ts`

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'net.wraithgrove.app',
  appName: 'Wraithgrove',
  webDir: '.',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#0c0a08',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0c0a08',
      overlaysWebView: true,
    },
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#0c0a08',
  },
  android: {
    backgroundColor: '#0c0a08',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
```

Note: `webDir: '.'` — Capacitor copies the entire build-v2 folder as the web payload. For production, exclude `workers/`, `art/MIDJOURNEY_BRIEFS.md` files (text), and `docs/` via a `.capignore` if Capacitor supports it (newer versions do).

Add `.capignore`:
```
workers/
docs/
*.md
sonnet-outputs/
```

Commit: "Worker L: package.json + capacitor.config.ts + .capignore"

CONCERN 2 — Initialize iOS + Android scaffolding

This requires running CLI commands. The Sonnet executing this worker SHOULD run them; if blocked by network/permission issues, write what would have happened and continue.

```bash
cd /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2
npm install   # installs Capacitor + plugins; may take 1-3 minutes
npx cap init Wraithgrove net.wraithgrove.app --web-dir=. --skip-appid-validation
npx cap add ios
npx cap add android
npx cap sync
```

If any step fails, write the failing step + error to the marker file and stop.

After successful sync:
- `ios/App/` directory exists with Xcode project
- `android/app/` directory exists with Gradle project
- Both reference the web payload (`index.html` + `js/`)

Commit: "Worker L: iOS + Android Capacitor scaffolding initialized"

CONCERN 3 — Native splash + status-bar wiring + offline-mode confirm

EDIT: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/index.html`

After the existing `WG.Boot = (...)` block, add:

```javascript
// Capacitor lifecycle wiring (no-op in browser preview; active in native wrap)
if (window.Capacitor && window.Capacitor.Plugins) {
  const { SplashScreen, StatusBar, Haptics, App } = window.Capacitor.Plugins;

  // Hide splash after boot is ready
  WG.Boot._origReady = WG.Boot.ready;
  WG.Boot.ready = function () {
    WG.Boot._origReady();
    if (SplashScreen) SplashScreen.hide().catch(() => {});
    if (StatusBar) StatusBar.setBackgroundColor({ color: '#0c0a08' }).catch(() => {});
  };

  // Pause game on app background; resume on foreground
  if (App) {
    App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive && WG.Engine) WG.Engine.pause();
      else if (isActive && WG.Engine) WG.Engine.resume();
    });
  }

  // Haptic helpers (called from hunt-render for hit feedback in native)
  WG.Haptics = {
    impact: (style = 'medium') => Haptics && Haptics.impact({ style }).catch(() => {}),
    vibrate: (duration = 50) => Haptics && Haptics.vibrate({ duration }).catch(() => {}),
  };
}
```

Wire haptic calls in `js/hunt/hunt-render.js`'s player:damaged event handler:

EDIT: `/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/js/hunt/hunt-render.js`
- In `setupEvents()` (or wherever the engine event listeners are registered), find the existing `eng.on('player:damaged', ...)` handler.
- Add at the end of that handler: `if (WG.Haptics) WG.Haptics.impact('medium');`
- Also add to the `eng.on('boss:defeated', ...)` handler: `if (WG.Haptics) WG.Haptics.impact('heavy');`

Confirm offline mode:
- All assets in `index.html` + `js/**/*.js` are served from same origin.
- localStorage save/load works without network.
- No `fetch()` calls except the Capacitor lifecycle setup.

Commit: "Worker L: native splash + status-bar + haptic wiring + offline confirm"

VERIFICATION:
1. `cd /Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2`
2. `node --check js/hunt/hunt-render.js` — must exit 0.
3. `cat capacitor.config.ts | head -20` — confirm config exists.
4. `ls ios/ android/` — confirm both scaffolding directories exist (skip if `npx cap` failed; note in marker).
5. Confirm `index.html` opens in browser without console errors (Capacitor APIs are no-ops there; no errors expected).

Architect-touch tasks documented in marker:
- Apple Developer Program enrollment ($99/yr — required before Xcode signing)
- Generate iOS app icon set (1024×1024 → all required sizes via icongenerator tool)
- Generate Android app icon (mipmap-anydpi-v26 + adaptive layers)
- Configure signing certificates in Xcode + Android Studio
- TestFlight + Closed Testing track creation

CONSTRAINTS:
- Three concerns; three commits (or three sequential file-add bundles).
- Do NOT touch any module outside the listed targets.
- Do NOT vendor Capacitor binaries — use npm install per package.json.
- If `npm install` fails (network, permissions): note in marker, save to disk what's possible, ask the Architect.
- Per project CLAUDE.md "Single source of truth": IAP / ad SDK / server endpoint changes are W-M / W-N / W-O scope, NOT this worker's. You wire the Capacitor lifecycle only.
- Per Hive Rules: do not delegate to further sub-agents.

You are Worker L. After you ship: Wraithgrove can be opened in Xcode + Android Studio for native build, the splash + status-bar work natively, and haptic feedback fires on key combat events. The path to App Store + Play Store submission opens.