import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { createHmac } from 'node:crypto';
import { expectedKaiChecksum, verifyAndAttestDav, KaiDivergenceError } from '../../packages/verification/src/kaiShield.ts';

function candidate(n: 4 | 6 | 8) {
  const values = Array.from({ length: n * n }, (_, row) => Array.from({ length: n * n }, (_, column) => {
    const i = Math.floor(row / n);
    const j = row % n;
    const k = Math.floor(column / n);
    const l = column % n;
    return i + j + k + l;
  }));
  return { success: true, status: 'VERIFIED', size: n, values, invariants: { checksum: expectedKaiChecksum(n) } };
}

test('KAI Shield independently verifies N=4, 6, and 8 and appends HMAC receipts', () => {
  const directory = mkdtempSync(join(tmpdir(), 'dvro-house-ledger-'));
  const ledgerPath = join(directory, 'kai_ledger.json');
  writeFileSync(ledgerPath, JSON.stringify({ append_only: true, entries: [] }));
  try {
    for (const n of [4, 6, 8] as const) {
      const result = verifyAndAttestDav(candidate(n), {
        ledgerPath,
        secret: 'test-secret',
        now: () => `2026-11-20T13:15:0${n}Z`,
      });
      assert.equal(result.status, 'VERIFIED');
      assert.equal(result.checksum, expectedKaiChecksum(n));
      assert.match(result.receipt.hash, /^[a-f0-9]{64}$/);
      const unsigned = JSON.stringify([result.receipt.timestamp, result.receipt.n, result.receipt.checksum, result.receipt.status]);
      assert.equal(result.receipt.hash, createHmac('sha256', 'test-secret').update(unsigned).digest('hex'));
    }
    const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8')) as { entries: unknown[] };
    assert.equal(ledger.entries.length, 3);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('KAI Shield rejects a tampered matrix as DIVERGENT without a receipt', () => {
  const directory = mkdtempSync(join(tmpdir(), 'dvro-house-tamper-'));
  const ledgerPath = join(directory, 'kai_ledger.json');
  writeFileSync(ledgerPath, JSON.stringify({ append_only: true, entries: [] }));
  const tampered = candidate(4);
  tampered.values[0]![0] = 99;
  try {
    assert.throws(() => verifyAndAttestDav(tampered, { ledgerPath }), (error: unknown) => {
      assert.ok(error instanceof KaiDivergenceError);
      return true;
    });
    assert.equal((JSON.parse(readFileSync(ledgerPath, 'utf8')) as { entries: unknown[] }).entries.length, 0);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('Fastify returns 400 UNKNOWN for unsupported size and 503 UNKNOWN when companion is offline', async () => {
  const { createApp } = await import('../../apps/api/dist/index.js');
  const directory = mkdtempSync(join(tmpdir(), 'dvro-house-api-'));
  const previous = process.env.KAI_COMPANION_URL;
  process.env.KAI_COMPANION_URL = 'http://127.0.0.1:1';
  const app = createApp(join(directory, 'api.db'), false);
  try {
    await app.ready();
    const unsupported = await app.inject({ method: 'GET', url: '/api/tensor/5' });
    assert.equal(unsupported.statusCode, 400);
    assert.equal(unsupported.json().status, 'UNKNOWN');
    const offline = await app.inject({ method: 'GET', url: '/api/tensor/8' });
    assert.equal(offline.statusCode, 503);
    assert.equal(offline.json().status, 'UNKNOWN');
  } finally {
    await app.close();
    if (previous === undefined) delete process.env.KAI_COMPANION_URL;
    else process.env.KAI_COMPANION_URL = previous;
    rmSync(directory, { recursive: true, force: true });
  }
});
