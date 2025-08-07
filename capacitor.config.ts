import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.cbe2b28f19174504962fa4fcf0f16230',
  appName: 'DVD Scanner',
  webDir: 'dist',
  server: {
    url: 'https://cbe2b28f-1917-4504-962f-a4fcf0f16230.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  android: {
    permissions: [
      'android.permission.NFC',
      'android.permission.NFC_TRANSACTION_EVENT'
    ]
  }
};

export default config;