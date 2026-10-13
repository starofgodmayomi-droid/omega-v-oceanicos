import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { test } from 'node:test';
import {
  apiTargetUrl,
  buildReadOnlyUpstreamHeaders,
  createWebGateway,
  isReadOnlyProxyMethod,
} from '../../apps/web/server.mjs';

async function listen(server: ReturnType<typeof createServer>) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('test server did not bind to TCP');
  return `http://127.0.0.1:${address.port}`;
}

async function close(server: ReturnType<typeof createServer>) {
  server.close();
  await once(server, 'close');
}

test('production web gateway keeps the service read token server-side and blocks mutations', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'omega-web-gateway-'));
  writeFileSync(join(directory, 'index.html'), '<!doctype html><title>Oceanicos</title><script src="/app.js"></script>');
  writeFileSync(join(directory, 'app.js'), 'window.OCEANICOS_WEB = true;');

  const observed: Array<{ method?: string; url?: string; authorization?: string }> = [];
  const api = createServer((request, reply) => {
    observed.push({
      method: request.method,
      url: request.url,
      authorization: typeof request.headers.authorization === 'string' ? request.headers.authorization : undefined,
    });
    if (request.url?.startsWith('/v1/stream')) {
      reply.writeHead(200, { 'content-type': 'text/event-stream' });
      reply.end('data: {"ok":true}\n\n');
      return;
    }
    reply.writeHead(200, { 'content-type': 'application/json' });
    reply.end(JSON.stringify({ success: true, path: request.url }));
  });
  const apiBase = await listen(api);

  const gateway = createWebGateway({
    distDir: directory,
    apiBaseUrl: apiBase,
    readToken: 'server-read-secret',
  });
  const webBase = await listen(gateway);

  try {
    const html = await fetch(`${webBase}/`);
    assert.equal(html.status, 200);
    assert.match(await html.text(), /Oceanicos/);

    const asset = await fetch(`${webBase}/app.js`);
    const assetText = await asset.text();
    assert.equal(asset.status, 200);
    assert.doesNotMatch(assetText, /server-read-secret/);

    const read = await fetch(`${webBase}/api/v1/block/tip?limit=1`, {
      headers: { authorization: 'Bearer browser-supplied-token' },
    });
    assert.equal(read.status, 200);
    assert.deepEqual(await read.json(), { success: true, path: '/v1/block/tip?limit=1' });
    assert.equal(observed.at(-1)?.authorization, 'Bearer server-read-secret');

    const stream = await fetch(`${webBase}/api/v1/stream`);
    assert.equal(stream.status, 200);
    assert.match(await stream.text(), /"ok":true/);
    assert.equal(observed.at(-1)?.authorization, 'Bearer server-read-secret');

    const beforeMutation = observed.length;
    const mutation = await fetch(`${webBase}/api/v1/omega/commands`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer browser-admin-attempt',
      },
      body: JSON.stringify({ intent: 'must not reach API' }),
    });
    assert.equal(mutation.status, 403);
    assert.equal((await mutation.json()).error, 'WEB_SESSION_REQUIRED');
    assert.equal(observed.length, beforeMutation);
  } finally {
    await close(gateway);
    await close(api);
    rmSync(directory, { recursive: true, force: true });
  }
});

test('gateway helper contract is fail-closed and preserves API query paths', () => {
  assert.equal(isReadOnlyProxyMethod('GET'), true);
  assert.equal(isReadOnlyProxyMethod('HEAD'), true);
  assert.equal(isReadOnlyProxyMethod('POST'), false);
  assert.equal(isReadOnlyProxyMethod('DELETE'), false);

  const headers = buildReadOnlyUpstreamHeaders({
    authorization: 'Bearer browser-token',
    cookie: 'session=browser',
    accept: 'application/json',
  }, 'server-read-token');
  assert.equal(headers.get('authorization'), 'Bearer server-read-token');
  assert.equal(headers.get('cookie'), null);
  assert.equal(headers.get('x-oceanicos-web-gateway'), 'read-only-v1');

  const target = apiTargetUrl('/api/v1/stream?since=7', 'http://api:5000');
  assert.equal(target.toString(), 'http://api:5000/v1/stream?since=7');

  assert.throws(
    () => createWebGateway({ readToken: '', apiBaseUrl: 'http://api:5000' }),
    /OMEGA_READ_TOKEN is required/,
  );
});
