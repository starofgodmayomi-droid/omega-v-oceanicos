import assert from 'node:assert/strict';
import test from 'node:test';
import { createTensorDav, verifyTensorDav, type TensorDavPayload } from '../../packages/verification/src/tensor-dav.ts';

const checksums = new Map([[4, 1536], [6, 12960], [8, 57344]]);

for (const size of [4, 6, 8] as const) {
  test(`tensor DAV ${size} produces verified ${size ** 2}×${size ** 2} projection`, () => {
    const result = createTensorDav(size);
    assert.equal(result.status, 'VERIFIED');
    if (result.status !== 'VERIFIED') return;
    assert.equal(result.payload.values.length, size ** 2);
    assert.ok(result.payload.values.every((row) => row.length === size ** 2));
    assert.deepEqual(result.payload.invariants, {
      min: 0,
      max: 4 * (size - 1),
      mean: 2 * (size - 1),
      checksum: checksums.get(size),
    });
    assert.match(result.sha256, /^[a-f0-9]{64}$/);
    assert.equal(verifyTensorDav(result.payload).status, 'VERIFIED');
  });
}

test('tensor DAV rejects a divergent cell without issuing a verified receipt', () => {
  const result = createTensorDav(4);
  assert.equal(result.status, 'VERIFIED');
  if (result.status !== 'VERIFIED') return;
  const candidate: TensorDavPayload = structuredClone(result.payload);
  candidate.values[0]![0] = 99;
  const verification = verifyTensorDav(candidate);
  assert.equal(verification.status, 'DIVERGENT');
  if (verification.status === 'DIVERGENT') {
    assert.ok(verification.issues.includes('tensor values diverge from i + j + k + l'));
  }
});

test('tensor DAV rejects a divergent invariant', () => {
  const result = createTensorDav(6);
  assert.equal(result.status, 'VERIFIED');
  if (result.status !== 'VERIFIED') return;
  const candidate: TensorDavPayload = structuredClone(result.payload);
  candidate.invariants.checksum += 1;
  assert.equal(verifyTensorDav(candidate).status, 'DIVERGENT');
});

test('Fastify fails closed when the companion is unavailable and rejects unknown sizes', async () => {
  const { mkdtempSync, readFileSync, rmSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { tmpdir } = await import('node:os');
  const { createApp } = await import('../../apps/api/dist/index.js');
  const directory = mkdtempSync(join(tmpdir(), 'tensor-dav-api-'));
  const ledgerPath = join(process.cwd(), 'kai_ledger.json');
  const before = readFileSync(ledgerPath, 'utf8');
  const previousCompanionUrl = process.env.KAI_COMPANION_URL;
  process.env.KAI_COMPANION_URL = 'http://127.0.0.1:1';
  const app = createApp(join(directory, 'api.db'), false);
  try {
    await app.ready();
    const offline = await app.inject({ method: 'GET', url: '/tensor/4' });
    assert.equal(offline.statusCode, 503);
    assert.equal(offline.json().status, 'UNKNOWN');
    const invalid = await app.inject({ method: 'GET', url: '/tensor/5' });
    assert.equal(invalid.statusCode, 400);
    assert.equal(invalid.json().status, 'UNKNOWN');
    assert.equal(readFileSync(ledgerPath, 'utf8'), before, 'ordinary GET requests must not mutate the KAI ledger');
  } finally {
    await app.close();
    if (previousCompanionUrl === undefined) delete process.env.KAI_COMPANION_URL;
    else process.env.KAI_COMPANION_URL = previousCompanionUrl;
    rmSync(directory, { recursive: true, force: true });
  }
});
