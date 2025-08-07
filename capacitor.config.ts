import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.cbe2b28f19174504962fa4fcf0f16230',
  appName: 'Flicks Finder',
  webDir: 'dist',
  server: {
    url: 'https://cbe2b28f-1917-4504-962f-a4fcf0f16230.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    // Disable all plugins to prevent auto-loading issues
  }
};

export default config;