import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';
import { API_ROUTE_INVENTORY } from '../../apps/api/src/route-contract.ts';

test('compiled API registers every inventoried method/path pair', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'omega-api-route-contract-'));
  const app = createApp(join(directory, 'ledger.db'), false, { allowUnsignedCycle: true });

  try {
    await app.ready();
    const missing = API_ROUTE_INVENTORY.filter((contract) => {
      const [method, path] = contract.split(' ', 2) as ['GET' | 'POST', string];
      return !app.hasRoute({ method, url: path });
    });

    assert.deepEqual(missing, [], `missing compiled routes: ${missing.join(', ')}`);
    assert.equal(API_ROUTE_INVENTORY.length, 64);
  } finally {
    await app.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
