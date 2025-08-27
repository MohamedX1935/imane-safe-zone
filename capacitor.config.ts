import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.0bf52ad6aa5c422bb500e6271dd0b1c5',
  appName: 'ImaneSafety',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    url: 'https://0bf52ad6-aa5c-422b-b500-e6271dd0b1c5.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};

export default config;