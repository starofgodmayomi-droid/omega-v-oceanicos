import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';
import { parseNavigatorEvidenceSnapshot } from '../../packages/types/dist/index.js';

test('Navigator evidence API serves a read-only, provenance-bearing snapshot', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'omega-navigator-api-'));
  const app = createApp(join(directory, 'ledger.db'), false, { allowUnsignedCycle: true });

  try {
    const response = await app.inject({ method: 'GET', url: '/v1/navigator/evidence' });
    assert.equal(response.statusCode, 200);

    const snapshot = parseNavigatorEvidenceSnapshot(response.json());
    assert.equal(snapshot.readOnly, true);
    assert.equal(snapshot.contract, 'omega-navigator-evidence.v1');
    assert.equal(snapshot.overallStatus, 'SUPPORTED');
    assert.equal(snapshot.source.repository, 'starofgodmayomi-droid/omega-v-oceanicos');
    assert.deepEqual(snapshot.evidence.map((item) => item.status), ['SUPPORTED', 'UNKNOWN']);
  } finally {
    await app.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('Navigator evidence API has no mutation method', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'omega-navigator-api-'));
  const app = createApp(join(directory, 'ledger.db'), false, { allowUnsignedCycle: true });

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/navigator/evidence',
      payload: {},
    });
    assert.equal(response.statusCode, 404);
  } finally {
    await app.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
