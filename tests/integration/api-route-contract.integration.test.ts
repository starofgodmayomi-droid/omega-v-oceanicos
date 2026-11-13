import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
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

test('local action surface answers fail-closed instead of 404', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'omega-local-actions-'));
  const app = createApp(join(directory, 'ledger.db'), false, { allowUnsignedCycle: true });

  try {
    await app.ready();
    const list = await app.inject({ method: 'GET', url: '/v1/local-actions' });
    assert.equal(list.statusCode, 200);
    const listBody = list.json();
    assert.equal(listBody.enabled, false);
    assert.deepEqual(listBody.actions, []);
    assert.equal(listBody.execution, 'NOT_EXECUTED');

    const runs = await app.inject({ method: 'GET', url: '/v1/local-actions/runs' });
    assert.equal(runs.statusCode, 200);
    assert.deepEqual(runs.json().runs, []);

    // No run endpoint exists: a caller cannot execute a local action.
    assert.equal(app.hasRoute({ method: 'POST', url: '/v1/local-actions/:actionId/run' }), false);
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
