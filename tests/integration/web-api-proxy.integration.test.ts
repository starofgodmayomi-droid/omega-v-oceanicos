import assert from 'node:assert/strict';
import { test } from 'node:test';
import viteConfig from '../../apps/web/vite.config.ts';

const webApiClientPaths = [
  '../../apps/web/src/App.tsx',
  '../../apps/web/src/OreadConsole.tsx',
  '../../apps/web/src/SystemHealthPanel.tsx',
  '../../apps/web/src/RealityPanel.tsx',
  '../../apps/web/src/DependencyMapPanel.tsx',
  '../../apps/web/src/MoodCodexPanel.tsx',
  '../../apps/web/src/ConnectorPanel.tsx',
  '../../apps/web/src/EcosystemPanel.tsx',
  '../../apps/web/src/DivergenceAlertsPanel.tsx',
  '../../apps/web/src/ValueNavigatorPanel.tsx',
  '../../apps/web/src/TransitionProvenancePanel.tsx',
];

test('all web API clients preserve VITE_API_URL and default to the /api proxy', async () => {
  const { readFileSync } = await import('node:fs');
  for (const clientPath of webApiClientPaths) {
    const source = readFileSync(new URL(clientPath, import.meta.url), 'utf8');
    assert.ok(source.includes("VITE_API_URL || '/api'"), `${clientPath} must use the proxy fallback`);
  }
});

test('ConnectorPanel reads the connector API entries envelope safely', async () => {
  const { readFileSync } = await import('node:fs');
  const source = readFileSync(new URL('../../apps/web/src/ConnectorPanel.tsx', import.meta.url), 'utf8');
  assert.ok(source.includes("request<{ entries: Observation[] }>"), 'the client type must match the API entries envelope');
  assert.ok(source.includes('Array.isArray(data.entries) ? data.entries : []'), 'a malformed list must not crash rendering');
});

test('Vite proxies browser-relative API requests to the local API', () => {
  const proxy = viteConfig.server?.proxy;
  assert.ok(proxy && typeof proxy === 'object', 'Vite server proxy must be configured');

  const apiProxy = proxy['/api'];
  assert.ok(apiProxy && typeof apiProxy === 'object', 'Vite must configure the /api proxy');
  assert.equal(apiProxy.target, process.env.VITE_API_PROXY_TARGET || 'http://localhost:5000');
  assert.equal(apiProxy.changeOrigin, true);
  assert.equal(apiProxy.rewrite?.('/api/complete-loop'), '/complete-loop');
});
