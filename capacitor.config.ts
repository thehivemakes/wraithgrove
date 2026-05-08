import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.thehivemakes.wraithgrove',
  appName: 'Unlimited Chaos',
  webDir: 'www',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
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
