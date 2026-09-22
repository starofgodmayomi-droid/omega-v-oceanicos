import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/health': 'http://api:5000',
      '/v1': 'http://api:5000',
      '/jobs': 'http://api:5000',
      '/attest': 'http://api:5000',
      '/persistence': 'http://api:5000',
    },
  },
  preview: {
    allowedHosts: process.env.VITE_ALLOWED_HOST
      ? [process.env.VITE_ALLOWED_HOST]
      : ['3000-iscjvtugzf1ft862z9fi7-08dbc251.us4.manus.computer'],
  },
});
