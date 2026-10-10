import { defineConfig } from 'vite';

const proxyConfig = {
  '/v1': {
    target: 'http://localhost:5000',
    changeOrigin: true,
  },
  '/health': {
    target: 'http://localhost:5000',
    changeOrigin: true,
  },
  '/api': {
    target: 'http://localhost:5000',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api/, ''),
  },
};

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  server: {
    port: 3000,
    host: true,
    allowedHosts: true,
    proxy: proxyConfig,
  },
  preview: {
    port: 3001,
    host: true,
    allowedHosts: true,
    proxy: proxyConfig,
  },
});
