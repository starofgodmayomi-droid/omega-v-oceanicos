import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';
import { apiFetch, setApiAccessTokenProvider } from '../../apps/web/src/api-client.ts';
import viteConfig from '../../apps/web/vite.config.ts';

const webApiClientPaths = [
  '../../apps/web/src/App.tsx',
  '../../apps/web/src/OreadConsole.tsx',
  '../../apps/web/src/SystemHealthPanel.tsx',
  '../../apps/web/src/RealityPanel.tsx',
  '../../apps/web/src/DependencyMapPanel.tsx',
  '../../apps/web/src/MoodCodexPanel.tsx',
  '../../apps/web/src/ConnectorPanel.tsx',
  '../../apps/web/src/InvisibleComputer.tsx',
  '../../apps/web/src/EcosystemPanel.tsx',
  '../../apps/web/src/DivergenceAlertsPanel.tsx',
  '../../apps/web/src/ValueNavigatorPanel.tsx',
  '../../apps/web/src/TransitionProvenancePanel.tsx',
  '../../apps/web/src/WorkerCoordinationPanel.tsx',
];

test('all web API clients preserve explicit VITE_API_URL, including an explicit same-origin blank', async () => {
  const { readFileSync } = await import('node:fs');
  for (const clientPath of webApiClientPaths) {
    const source = readFileSync(new URL(clientPath, import.meta.url), 'utf8');
    assert.ok(source.includes("VITE_API_URL ?? '/api'"), `${clientPath} must use the proxy fallback only when unset`);
  }
});

test('the browser API client attaches Auth0 access tokens without overwriting explicit authorization', async () => {
  const originalFetch = globalThis.fetch;
  const authorizationHeaders: Array<string | null> = [];
  globalThis.fetch = async (_input, init) => {
    authorizationHeaders.push(new Headers(init?.headers).get('Authorization'));
    return new Response('{}', { status: 200 });
  };
  setApiAccessTokenProvider(async () => 'auth0-access-token');

  try {
    await apiFetch('/v1/kernel/capabilities');
    await apiFetch('/v1/omega/connectors/approvals', {
      headers: { Authorization: 'Bearer explicitly-supplied-token' },
    });
    assert.deepEqual(authorizationHeaders, [
      'Bearer auth0-access-token',
      'Bearer explicitly-supplied-token',
    ]);
  } finally {
    setApiAccessTokenProvider(undefined);
    globalThis.fetch = originalFetch;
  }
});

test('the compiled API serves the built UI and its executable assets from one origin', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'omega-api-web-client-'));
  const assets = join(directory, 'assets');
  mkdirSync(assets, { recursive: true });
  writeFileSync(join(directory, 'index.html'), '<!doctype html><div id="root"></div>');
  writeFileSync(join(assets, 'app.js'), 'console.log("served by api");');
  const previousWebDist = process.env.OMEGA_WEB_DIST;
  const previousAuthMode = process.env.OMEGA_AUTH_MODE;
  process.env.OMEGA_WEB_DIST = directory;
  process.env.OMEGA_AUTH_MODE = 'local';
  const app = createApp(join(directory, 'runtime.db'), false, { allowUnsignedCycle: true });

  try {
    await app.ready();
    const page = await app.inject({ method: 'GET', url: '/' });
    const asset = await app.inject({ method: 'GET', url: '/assets/app.js' });
    const api = await app.inject({ method: 'GET', url: '/v1/kernel/capabilities' });

    assert.equal(page.statusCode, 200);
    assert.match(page.headers['content-type'] ?? '', /^text\/html/);
    assert.match(page.body, /<div id="root"><\/div>/);
    assert.equal(asset.statusCode, 200);
    assert.equal(asset.headers['content-type'], 'text/javascript; charset=utf-8');
    assert.equal(asset.body, 'console.log("served by api");');
    assert.equal(api.statusCode, 200);
    assert.match(api.headers['content-type'] ?? '', /^application\/json/);
  } finally {
    await app.close();
    if (previousWebDist === undefined) delete process.env.OMEGA_WEB_DIST;
    else process.env.OMEGA_WEB_DIST = previousWebDist;
    if (previousAuthMode === undefined) delete process.env.OMEGA_AUTH_MODE;
    else process.env.OMEGA_AUTH_MODE = previousAuthMode;
    rmSync(directory, { recursive: true, force: true });
  }
});

test('ConnectorPanel authenticates exact approval and observation requests', async () => {
  const { readFileSync } = await import('node:fs');
  const source = readFileSync(new URL('../../apps/web/src/ConnectorPanel.tsx', import.meta.url), 'utf8');
  assert.ok(source.includes("'/v1/omega/connectors/approvals'"), 'approval must use the protected API route');
  assert.ok(source.includes("'/v1/omega/connectors/observe'"), 'execution must use the protected API route');
  assert.ok(source.includes('Authorization: `Bearer ${token}`'), 'requests must carry the Auth0 API access token');
  assert.ok(source.includes('approvalId,'), 'observation must be bound to the returned approval');
  assert.ok(source.includes('isApprovalResponse(result)'), 'malformed approvals must fail closed');
  assert.ok(source.includes('isObservation(result)'), 'malformed observations must fail closed');
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
