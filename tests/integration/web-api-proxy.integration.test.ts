import assert from 'node:assert/strict';
import { test } from 'node:test';
import viteConfig from '../../apps/web/vite.config.ts';

test('Vite proxies browser-relative API requests to the local API', () => {
  const proxy = viteConfig.server?.proxy;
  assert.ok(proxy && typeof proxy === 'object', 'Vite server proxy must be configured');

  const apiProxy = proxy['/api'];
  assert.ok(apiProxy && typeof apiProxy === 'object', 'Vite must configure the /api proxy');
  assert.equal(apiProxy.target, process.env.VITE_API_PROXY_TARGET || 'http://localhost:5000');
  assert.equal(apiProxy.changeOrigin, true);
  assert.equal(apiProxy.rewrite?.('/api/complete-loop'), '/complete-loop');
});
