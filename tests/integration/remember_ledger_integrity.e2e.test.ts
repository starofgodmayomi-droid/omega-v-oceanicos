import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { ObserverEngine } from '../../packages/observer/dist/index.js';
import { VerificationEngine } from '../../packages/verification/dist/index.js';
import { PluralisticHashChain, RememberEngine } from '../../packages/remember/dist/index.js';
import { MiniKernel } from '../../packages/mini/dist/index.js';
import { createApp } from '../../apps/api/dist/index.js';

function sampleObservation() {
  return ObserverEngine.generateTelemetry();
}

function sampleEvidence(observation: ReturnType<typeof sampleObservation>) {
  return VerificationEngine.evaluate(observation);
}

describe('RememberEngine SHA-256 ledger tip lock', () => {
  it('empty ledger is valid and has no tip', () => {
    const engine = new RememberEngine(':memory:');
    try {
      const integrity = engine.verifyChain();
      assert.strictEqual(integrity.valid, true);
      assert.strictEqual(integrity.height, 0);
      assert.strictEqual(engine.getTip(), null);
      assert.strictEqual(engine.getVerifiedTip(), null);
    } finally {
      engine.close();
    }
  });

  it('append locks a SHA-256 tip that verifyChain accepts', () => {
    const engine = new RememberEngine(':memory:');
    try {
      const observation = sampleObservation();
      const minted = engine.append(observation, sampleEvidence(observation));
      const integrity = engine.verifyChain();
      assert.strictEqual(integrity.valid, true);
      assert.strictEqual(integrity.height, 1);
      assert.strictEqual(integrity.tipHash, minted.hash);
      assert.ok(minted.hash.startsWith('00'));
      assert.strictEqual(engine.getVerifiedTip()?.hash, minted.hash);
    } finally {
      engine.close();
    }
  });

  it('keeps observation of a tampered row distinct from verification', () => {
    const directory = mkdtempSync(join(tmpdir(), 'omega-ledger-integrity-'));
    const dbPath = join(directory, 'ledger.db');
    const engine = new RememberEngine(dbPath);
    const minted = engine.append(sampleObservation(), sampleEvidence(sampleObservation()));
    engine.close();

    const db = new DatabaseSync(dbPath);
    db.prepare('UPDATE ledger SET hash = ? WHERE id_index = ?').run('deadbeef', minted.index);
    db.close();

    const tampered = new RememberEngine(dbPath);
    try {
      const observed = tampered.getTip();
      assert.ok(observed);
      assert.strictEqual(observed?.hash, 'deadbeef');

      const integrity = tampered.verifyChain();
      assert.strictEqual(integrity.valid, false);
      assert.strictEqual(integrity.reason, 'HASH_MISMATCH');
      assert.strictEqual(integrity.brokenAt, minted.index);

      assert.throws(() => tampered.getVerifiedTip(), /ledger integrity degraded/);
      assert.throws(
        () => tampered.append(sampleObservation(), sampleEvidence(sampleObservation())),
        /ledger integrity degraded/,
      );
    } finally {
      tampered.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('detects previous-hash breaks and refuses MiniKernel execution', () => {
    const directory = mkdtempSync(join(tmpdir(), 'omega-ledger-prev-'));
    const dbPath = join(directory, 'ledger.db');
    const engine = new RememberEngine(dbPath);
    engine.append(sampleObservation(), sampleEvidence(sampleObservation()));
    engine.append(sampleObservation(), sampleEvidence(sampleObservation()));
    engine.close();

    const db = new DatabaseSync(dbPath);
    db.prepare('UPDATE ledger SET previous_hash = ? WHERE id_index = ?').run('forged-previous', 4102);
    db.close();

    const tampered = new RememberEngine(dbPath);
    const kernel = new MiniKernel(tampered);
    try {
      const integrity = kernel.verifyLedger();
      assert.strictEqual(integrity.valid, false);
      assert.strictEqual(integrity.reason, 'PREVIOUS_HASH_MISMATCH');
      assert.throws(() => kernel.runCycle(), /ledger integrity degraded/);
    } finally {
      tampered.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('PluralisticHashChain verifyChain detects in-memory hash drift', () => {
    const chain = new PluralisticHashChain();
    assert.strictEqual(chain.verifyChain().valid, true);
    const blocks = chain.getFullChain();
    blocks[0].hash = 'tampered-genesis-hash';
    const integrity = chain.verifyChain();
    assert.strictEqual(integrity.valid, false);
    assert.strictEqual(integrity.reason, 'HASH_MISMATCH');
    assert.throws(() => chain.commitState({
      status: 'PASS',
      lawRoute: 'TEST',
      assertions: [],
      evidencePath: 'test',
    } as any), /ledger integrity degraded/);
  });
});

describe('API fail-closed ledger integrity', () => {
  it('GET /v1/block/tip reports integrity and POST /v1/cycle refuses a degraded ledger', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'omega-api-ledger-'));
    const dbPath = join(directory, 'ledger.db');
    const app = createApp(dbPath, false, {
      allowUnsignedCycle: true,
      attestationSigningKey: 'integration-attestation-key-2026-strong',
    });
    await app.ready();
    try {
      const minted = await app.inject({ method: 'POST', url: '/v1/cycle' });
      assert.strictEqual(minted.statusCode, 200);
      const healthyTip = JSON.parse((await app.inject({ method: 'GET', url: '/v1/block/tip' })).body);
      assert.strictEqual(healthyTip.status, 'ONLINE');
      assert.strictEqual(healthyTip.integrity.valid, true);
      assert.ok(healthyTip.tip.hash.startsWith('00'));
    } finally {
      await app.close();
    }

    const db = new DatabaseSync(dbPath);
    db.prepare('UPDATE ledger SET hash = ? WHERE id_index = ?').run('00forgedhash0000000000000000000000000000000000000000000000000000', 4101);
    db.close();

    const degraded = createApp(dbPath, false, {
      allowUnsignedCycle: true,
      attestationSigningKey: 'integration-attestation-key-2026-strong',
    });
    await degraded.ready();
    try {
      const tip = JSON.parse((await degraded.inject({ method: 'GET', url: '/v1/block/tip' })).body);
      assert.strictEqual(tip.status, 'DEGRADED');
      assert.strictEqual(tip.integrity.valid, false);
      assert.strictEqual(tip.integrity.reason, 'HASH_MISMATCH');
      assert.ok(tip.tip, 'observation of the last row remains available');

      const cycle = await degraded.inject({ method: 'POST', url: '/v1/cycle' });
      assert.strictEqual(cycle.statusCode, 409);
      assert.strictEqual(JSON.parse(cycle.body).error, 'LEDGER_INTEGRITY_DEGRADED');

      const health = await degraded.inject({ method: 'GET', url: '/health' });
      assert.strictEqual(health.statusCode, 503);
      const healthBody = JSON.parse(health.body);
      assert.strictEqual(healthBody.readiness, 'degraded');
      assert.strictEqual(healthBody.checks.memory.integrity, false);
    } finally {
      await degraded.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
