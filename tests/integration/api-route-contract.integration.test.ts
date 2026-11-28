import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';
import {
  API_ROUTE_INVENTORY,
  parseApiRouteContract,
  validateApiRouteInventory,
} from '../../apps/api/src/route-contract.ts';

test('compiled API registers every inventoried method/path pair', async () => {
  validateApiRouteInventory();
  const directory = mkdtempSync(join(tmpdir(), 'omega-api-route-contract-'));
  const app = createApp(join(directory, 'ledger.db'), false, { allowUnsignedCycle: true });

  try {
    await app.ready();
    const missing = API_ROUTE_INVENTORY.filter((contract) => {
      const { method, path } = parseApiRouteContract(contract);
      return !app.hasRoute({ method, url: path });
    });

    assert.deepEqual(missing, [], `missing compiled routes: ${missing.join(', ')}`);
    assert.ok(API_ROUTE_INVENTORY.length > 0);
  } finally {
    await app.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('route inventory rejects malformed and duplicate method/path contracts', () => {
  assert.throws(() => parseApiRouteContract('PATCH /v1/unsupported'), /invalid API route contract/);
  assert.throws(() => parseApiRouteContract('GET v1/missing-leading-slash'), /invalid API route contract/);
  assert.throws(
    () => validateApiRouteInventory(['GET /health', 'GET /health']),
    /duplicate API route contract: GET \/health/,
  );
});

test('live reality pipeline fails closed when the DAV invariant diverges', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'omega-api-reality-pipeline-'));
  const app = createApp(join(directory, 'ledger.db'), false, { allowUnsignedCycle: true });

  try {
    await app.ready();
    const response = await app.inject({
      method: 'POST',
      url: '/v1/reality/pipeline/execute',
      payload: {
        stages: [{ toolId: 'tool-dav-tensor-validator', params: { size: 4 } }],
      },
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.success, false);
    assert.equal(body.status, 'UNKNOWN');
    assert.equal(body.completedStages, 0);
    assert.match(body.error, /DAV invariant diverged.*observed checksum 1536.*expected 57344/);
    assert.equal('execution' in body, false);
  } finally {
    await app.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('compiled API serves JavaScript and CSS assets with browser-compatible MIME types', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'omega-api-static-mime-'));
  const distDir = join(directory, 'dist');
  mkdirSync(join(distDir, 'assets'), { recursive: true });
  writeFileSync(join(distDir, 'assets', 'app.js'), 'export const verified = true;');
  writeFileSync(join(distDir, 'assets', 'app.css'), 'body { color: #000; }');
  const previousWebDist = process.env.OMEGA_WEB_DIST;
  process.env.OMEGA_WEB_DIST = distDir;
  const app = createApp(join(directory, 'api.db'), false);

  try {
    await app.ready();
    const javascript = await app.inject({ method: 'GET', url: '/assets/app.js' });
    assert.equal(javascript.statusCode, 200);
    assert.match(javascript.headers['content-type'] ?? '', /^text\/javascript(?:;|$)/);
    assert.equal(javascript.body, 'export const verified = true;');

    const stylesheet = await app.inject({ method: 'GET', url: '/assets/app.css' });
    assert.equal(stylesheet.statusCode, 200);
    assert.match(stylesheet.headers['content-type'] ?? '', /^text\/css(?:;|$)/);
    assert.equal(stylesheet.body, 'body { color: #000; }');
  } finally {
    await app.close();
    if (previousWebDist === undefined) delete process.env.OMEGA_WEB_DIST;
    else process.env.OMEGA_WEB_DIST = previousWebDist;
    rmSync(directory, { recursive: true, force: true });
  }
});

test('notion schema-sync binds observation store and fails closed on checksum mismatch', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'omega-api-notion-sync-'));
  const app = createApp(join(directory, 'ledger.db'), false, { allowUnsignedCycle: true });

  try {
    await app.ready();
    const okRes = await app.inject({
      method: 'POST',
      url: '/v1/notion/schema-sync',
      payload: { schemaName: 'omega.notion.ledger.v1' },
    });
    assert.equal(okRes.statusCode, 200);
    const okBody = okRes.json();
    assert.equal(okBody.status, 'VERIFIED');
    assert.equal(okBody.sync.observationSummary.count, 0);
    assert.equal(okBody.sync.observationSummary.latestStatus, 'UNKNOWN');
    assert.equal(okBody.sync.observationSummary.liveNotionObserved, false);

    const divRes = await app.inject({
      method: 'POST',
      url: '/v1/notion/schema-sync',
      payload: { expectedChecksum: '0'.repeat(64) },
    });
    assert.equal(divRes.statusCode, 200);
    const divBody = divRes.json();
    assert.equal(divBody.success, false);
    assert.equal(divBody.status, 'DIVERGENT');
  } finally {
    await app.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('DAV tensor export endpoint returns verified JSON/CSV slices and fails closed for unknown size', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'omega-api-tensor-export-'));
  const app = createApp(join(directory, 'ledger.db'), false, { allowUnsignedCycle: true });
  try {
    await app.ready();
    const jsonRes = await app.inject({ method: 'GET', url: '/api/tensor/4/export?format=json' });
    assert.equal(jsonRes.statusCode, 200);
    assert.match(jsonRes.headers['content-disposition'] ?? '', /dav-tensor-n4\.json/);
    const jsonBody = jsonRes.json();
    assert.equal(jsonBody.success, true);
    assert.equal(jsonBody.status, 'VERIFIED');
    assert.equal(jsonBody.invariants.checksum, 1536);

    const csvRes = await app.inject({ method: 'GET', url: '/tensor/6/export?format=csv' });
    assert.equal(csvRes.statusCode, 200);
    assert.match(csvRes.headers['content-type'] ?? '', /text\/csv/);
    assert.match(csvRes.headers['content-disposition'] ?? '', /dav-tensor-n6\.csv/);
    assert.match(csvRes.body, /# DAV Tensor N=6 \| Checksum=12960 \| SHA256=/);

    const errRes = await app.inject({ method: 'GET', url: '/api/tensor/5/export' });
    assert.equal(errRes.statusCode, 400);
    assert.equal(errRes.json().status, 'UNKNOWN');
  } finally {
    await app.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
