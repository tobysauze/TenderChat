import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ink.tender.app',
  appName: 'Tender',
  // Capacitor serves the Next.js static export from this directory.
  // Run `npm run build` (which writes ./out) before `npx cap sync`.
  webDir: 'out',
  ios: {
    // Keep the web view's own background consistent with the app while
    // the splash screen hands off.
    backgroundColor: '#ffffff',
    // Let our CSS env(safe-area-inset-*) handling manage insets rather
    // than Capacitor padding the web view itself.
    contentInset: 'never',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#1B3B5B',
      showSpinner: false,
    },
  },
};

export default config;
