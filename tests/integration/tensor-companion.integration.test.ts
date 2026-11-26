import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';

function listen(payload: unknown, status = 200): Promise<{ url: string; close: () => Promise<void> }> {
  const server = createServer((req, res) => {
    if (!req.url?.startsWith('/tensor/')) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(payload));
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = address && typeof address !== 'string' ? address.port : 0;
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
}

function matrix(n: number, tamper = false): number[][] {
  return Array.from({ length: n * n }, (_, row) =>
    Array.from({ length: n * n }, (_, column) => {
      const i = Math.floor(row / n);
      const j = row % n;
      const k = Math.floor(column / n);
      const l = column % n;
      const value = i + j + k + l;
      return tamper && row === 0 && column === 0 ? 99 : value;
    }),
  );
}

test('companion tensor proxy verifies, rejects tamper, and fails closed', async () => {
  const ledgerPath = join(process.cwd(), 'kai_ledger.json');
  const before = readFileSync(ledgerPath, 'utf8');
  const previous = process.env.OMEGA_COMPANION_URL;
  const good = await listen({
    success: true,
    status: 'VERIFIED',
    size: 4,
    values: matrix(4),
    invariants: { checksum: 1536 },
    sha256: 'good',
  });
  const bad = await listen({
    success: true,
    status: 'VERIFIED',
    size: 4,
    values: matrix(4, true),
    invariants: { checksum: 1536 },
    sha256: 'bad',
  });
  const directory = mkdtempSync(join(tmpdir(), 'tensor-proxy-'));
  const app = createApp(join(directory, 'api.db'), false);
  try {
    await app.ready();
    process.env.OMEGA_COMPANION_URL = good.url;
    const live = await app.inject({ method: 'GET', url: '/api/v1/companion/tensor/4' });
    assert.equal(live.statusCode, 200);
    assert.equal(live.json().size, 4);
    assert.equal(live.json().invariants.checksum, 1536);

    process.env.OMEGA_COMPANION_URL = bad.url;
    const divergent = await app.inject({ method: 'GET', url: '/v1/companion/tensor/4' });
    assert.equal(divergent.statusCode, 422);
    assert.equal(divergent.json().status, 'DIVERGENT');

    process.env.OMEGA_COMPANION_URL = 'http://127.0.0.1:9';
    const down = await app.inject({ method: 'GET', url: '/companion/tensor/8' });
    assert.equal(down.statusCode, 503);
    assert.equal(down.json().status, 'UNKNOWN');

    const unknown = await app.inject({ method: 'GET', url: '/api/v1/companion/tensor/5' });
    assert.equal(unknown.statusCode, 400);
    assert.equal(unknown.json().status, 'UNKNOWN');

    const local = await app.inject({ method: 'GET', url: '/api/tensor/8' });
    assert.equal(local.statusCode, 200);
    assert.equal(local.json().invariants.checksum, 57344);
    assert.equal(readFileSync(ledgerPath, 'utf8'), before);
  } finally {
    if (previous === undefined) delete process.env.OMEGA_COMPANION_URL;
    else process.env.OMEGA_COMPANION_URL = previous;
    await good.close();
    await bad.close();
    await app.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
