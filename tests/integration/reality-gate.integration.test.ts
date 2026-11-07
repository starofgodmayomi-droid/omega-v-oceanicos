import { describe, it } from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  AUTHORITY_RANK,
  REALITY_MEMORY_GENESIS,
  createRealityMemory,
  runRealityLoop,
  type RealityDelta,
} from '../../packages/omega/dist/index.js';

const delta = (overrides: Partial<RealityDelta> = {}): RealityDelta => ({
  intent: 'record the verified state of the drop',
  expected: 'S1',
  observed: 'S1',
  authorityLevel: 'AUTONOMOUS',
  requiredAuthority: 'AUTONOMOUS',
  ...overrides,
});

describe('Ω∞v reality gate', () => {
  it('commits a delta only when Expected ≡ Observed and chains its hash', () => {
    const memory = createRealityMemory({ now: () => '2026-10-29T00:00:00.000Z' });
    const step = memory.step(delta());

    assert.equal(step.status, 'VERIFIED');
    assert.equal(step.committed, true);
    assert.ok(step.entry);
    assert.equal(step.entry.previousHash, REALITY_MEMORY_GENESIS);
    assert.equal(step.entry.recordedAt, '2026-10-29T00:00:00.000Z');
    assert.match(step.entry.entryHash, /^[0-9a-f]{64}$/);
    assert.equal(memory.size(), 1);
    assert.equal(step.memoryTip, memory.tip());
    assert.ok(memory.holds(step.entry.deltaHash));
    assert.equal(memory.verifyChain(), true);
  });

  it('links consecutive commits and keeps the chain verifiable', () => {
    const memory = createRealityMemory();
    const first = memory.step(delta({ expected: 'S1', observed: 'S1' }));
    const second = memory.step(delta({ intent: 'advance once more', expected: 'S2', observed: 'S2' }));

    assert.equal(first.committed, true);
    assert.equal(second.committed, true);
    const entries = memory.entries();
    assert.equal(entries.length, 2);
    assert.equal(entries[1].previousHash, entries[0].entryHash);
    assert.equal(entries[0].index, 0);
    assert.equal(entries[1].index, 1);
    assert.notEqual(entries[0].entryHash, entries[1].entryHash);
    assert.equal(memory.verifyChain(), true);
  });

  it('halts DIVERGENT on K(x) ∈ SCAM even when the observation matches', () => {
    const memory = createRealityMemory();
    const step = memory.step(delta({ intent: 'send money urgently to claim the guaranteed returns' }));

    assert.equal(step.status, 'DIVERGENT');
    assert.equal(step.committed, false);
    assert.equal(step.entry, null);
    assert.match(step.reason, /K\(x\) ∈ SCAM/);
    assert.equal(step.memorySize, 0);
    assert.equal(memory.size(), 0);
    assert.equal(memory.tip(), REALITY_MEMORY_GENESIS);
  });

  it('halts UNKNOWN when Evidence(x) = ∅ and never commits an unobserved delta', () => {
    const memory = createRealityMemory();
    const missing = memory.step(delta({ observed: undefined }));
    const blank = memory.step(delta({ observed: '   ' }));

    assert.equal(missing.status, 'UNKNOWN');
    assert.equal(missing.observed, null);
    assert.match(missing.reason, /Evidence\(x\) = ∅/);
    assert.equal(blank.status, 'UNKNOWN');
    assert.equal(memory.size(), 0);
  });

  it('halts NOT_EXECUTED when Authority(x) < Required, keeping the observation', () => {
    const memory = createRealityMemory();
    const step = memory.step(
      delta({ authorityLevel: 'READ_ONLY', requiredAuthority: 'AUTONOMOUS' }),
    );

    assert.ok(AUTHORITY_RANK.READ_ONLY < AUTHORITY_RANK.AUTONOMOUS);
    assert.equal(step.status, 'NOT_EXECUTED');
    assert.equal(step.committed, false);
    assert.equal(step.observed, 'S1');
    assert.match(step.reason, /Authority\(x\) = READ_ONLY < Required = AUTONOMOUS/);
    assert.equal(memory.size(), 0);
  });

  it('halts DIVERGENT when observed reality contradicts the expectation, keeping both states', () => {
    const memory = createRealityMemory();
    const step = memory.step(delta({ expected: 'S1', observed: 'S2' }));

    assert.equal(step.status, 'DIVERGENT');
    assert.equal(step.expected, 'S1');
    assert.equal(step.observed, 'S2');
    assert.match(step.reason, /V\(Δ\) = ⊥/);
    assert.equal(memory.size(), 0);
  });

  it('treats memory as a set: re-committing the same delta does not grow it', () => {
    const memory = createRealityMemory();
    const first = memory.step(delta());
    const second = memory.step(delta());

    assert.equal(first.committed, true);
    assert.equal(second.committed, true);
    assert.equal(second.status, 'VERIFIED');
    assert.equal(second.entry, null);
    assert.match(second.reason, /M ∪ Δ = M/);
    assert.equal(memory.size(), 1);
    assert.equal(second.memoryTip, first.memoryTip);
  });

  it('runs one finite pass and stops at the first halt', () => {
    const loop = runRealityLoop([
      delta({ expected: 'S1', observed: 'S1' }),
      delta({ intent: 'advance', expected: 'S2', observed: 'S9' }),
      delta({ intent: 'never reached', expected: 'S3', observed: 'S3' }),
    ]);

    assert.equal(loop.steps.length, 2);
    assert.equal(loop.committed, 1);
    assert.equal(loop.haltedAt, 1);
    assert.equal(loop.status, 'DIVERGENT');
    assert.equal(loop.memory.size(), 1);
    assert.equal(loop.memory.verifyChain(), true);
  });

  it('reports an empty pass as NOT_EXECUTED rather than a quiet success', () => {
    const loop = runRealityLoop([]);
    assert.equal(loop.status, 'NOT_EXECUTED');
    assert.equal(loop.committed, 0);
    assert.equal(loop.haltedAt, null);
    assert.equal(loop.memory.size(), 0);
  });
});

/**
 * The gate over HTTP. `createApp` owns one memory per app, so each test gets a
 * fresh chain and the assertions describe the route contract, not package state.
 */
describe('Ω∞v reality gate routes', () => {
  const step = (app: ReturnType<typeof createApp>, body: Record<string, unknown>) =>
    app.inject({ method: 'POST', url: '/v1/reality/gate/step', payload: body });

  it('commits a verified delta and exposes the hash chain on read', async () => {
    const app = createApp(':memory:', false);
    try {
      const response = await step(app, {
        intent: delta().intent,
        expected: 'S1',
        observed: 'S1',
        authorityLevel: 'AUTONOMOUS',
        requiredAuthority: 'AUTONOMOUS',
      });
      const body = response.json();

      assert.equal(response.statusCode, 200);
      assert.equal(body.contract, 'omega-reality-gate.v1');
      assert.equal(body.step.status, 'VERIFIED');
      assert.equal(body.memoryWritten, true);
      assert.equal(body.executed, false);
      assert.match(body.step.entry.deltaHash, /^[a-f0-9]{64}$/);
      assert.equal(body.memory.size, 1);
      assert.equal(body.memory.memoryScope, 'process');

      const read = await app.inject({ method: 'GET', url: '/v1/reality/gate/memory' });
      const readBody = read.json();
      assert.equal(read.statusCode, 200);
      assert.equal(readBody.total, 1);
      assert.equal(readBody.integrity, 'verified-local-hash-chain');
      assert.equal(readBody.entries[0].entryHash, body.memory.tip);
      assert.equal(readBody.executed, false);
    } finally {
      await app.close();
    }
  });

  it('halts without appending: no evidence is UNKNOWN, scam is DIVERGENT, low authority is NOT_EXECUTED', async () => {
    const app = createApp(':memory:', false);
    try {
      const unobserved = await step(app, {
        intent: 'advance the drop',
        expected: 'S1',
        authorityLevel: 'AUTONOMOUS',
        requiredAuthority: 'AUTONOMOUS',
      });
      assert.equal(unobserved.statusCode, 200);
      assert.equal(unobserved.json().step.status, 'UNKNOWN');
      assert.equal(unobserved.json().memoryWritten, false);

      const scam = await step(app, {
        intent: 'send me your seed phrase to verify the wallet',
        expected: 'S1',
        observed: 'S1',
        authorityLevel: 'AUTONOMOUS',
        requiredAuthority: 'READ_ONLY',
      });
      assert.equal(scam.json().step.status, 'DIVERGENT');
      assert.equal(scam.json().memoryWritten, false);

      const lowAuthority = await step(app, {
        intent: 'advance the drop',
        expected: 'S1',
        observed: 'S1',
        authorityLevel: 'READ_ONLY',
        requiredAuthority: 'AUTONOMOUS',
      });
      assert.equal(lowAuthority.json().step.status, 'NOT_EXECUTED');
      assert.equal(lowAuthority.json().memoryWritten, false);

      const read = await app.inject({ method: 'GET', url: '/v1/reality/gate/memory' });
      assert.equal(read.json().total, 0);
      assert.equal(read.json().integrity, 'empty');
    } finally {
      await app.close();
    }
  });

  it('treats memory as a set: the same delta twice does not grow the chain', async () => {
    const app = createApp(':memory:', false);
    try {
      const payload = {
        intent: 'record the verified state of the drop',
        expected: 'S1',
        observed: 'S1',
        authorityLevel: 'AUTONOMOUS',
        requiredAuthority: 'AUTONOMOUS',
      };
      await step(app, payload);
      const second = await step(app, payload);

      assert.equal(second.statusCode, 200);
      assert.equal(second.json().step.status, 'VERIFIED');
      assert.equal(second.json().memoryWritten, false);
      assert.equal(second.json().memory.size, 1);
    } finally {
      await app.close();
    }
  });

  it('rejects unsupported fields and unparsable authority instead of guessing', async () => {
    const app = createApp(':memory:', false);
    try {
      const extra = await step(app, {
        intent: 'advance the drop',
        expected: 'S1',
        observed: 'S1',
        authorityLevel: 'AUTONOMOUS',
        requiredAuthority: 'AUTONOMOUS',
        authority: 'ROOT',
      });
      assert.equal(extra.statusCode, 400);
      assert.equal(extra.json().error, 'UNSUPPORTED_FIELDS');

      const noIntent = await step(app, { expected: 'S1', authorityLevel: 'AUTONOMOUS', requiredAuthority: 'AUTONOMOUS' });
      assert.equal(noIntent.statusCode, 400);
      assert.equal(noIntent.json().error, 'INTENT_REQUIRED');

      const badAuthority = await step(app, {
        intent: 'advance the drop',
        expected: 'S1',
        authorityLevel: 'ROOT',
        requiredAuthority: 'AUTONOMOUS',
      });
      assert.equal(badAuthority.statusCode, 400);
      assert.equal(badAuthority.json().error, 'AUTHORITY_LEVEL_INVALID');
    } finally {
      await app.close();
    }
  });
});

/**
 * The journal. A second `createApp` on the same db path is what a restart looks
 * like from the chain's point of view, so the assertions are about durability,
 * not about one process's state.
 */
describe('Ω∞v reality memory journal', () => {
  const payload = (overrides: Record<string, unknown> = {}) => ({
    intent: 'record the verified state of the drop',
    expected: 'S1',
    observed: 'S1',
    authorityLevel: 'AUTONOMOUS',
    requiredAuthority: 'AUTONOMOUS',
    ...overrides,
  });

  it('restores the chain after a restart and keeps growing it', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'omega-reality-gate-'));
    const dbPath = join(dir, 'oceanicos.db');
    let tip = '';
    try {
      const first = createApp(dbPath, false);
      try {
        const committed = await first.inject({ method: 'POST', url: '/v1/reality/gate/step', payload: payload() });
        assert.equal(committed.statusCode, 200);
        assert.equal(committed.json().memory.memoryScope, 'append-only-journal');
        assert.equal(committed.json().memory.size, 1);
        tip = committed.json().memory.tip;
      } finally {
        await first.close();
      }

      const second = createApp(dbPath, false);
      try {
        const read = await second.inject({ method: 'GET', url: '/v1/reality/gate/memory' });
        assert.equal(read.statusCode, 200);
        assert.equal(read.json().total, 1);
        assert.equal(read.json().tip, tip);
        assert.equal(read.json().integrity, 'verified-local-hash-chain');
        assert.equal(read.json().memoryScope, 'append-only-journal');

        const repeated = await second.inject({ method: 'POST', url: '/v1/reality/gate/step', payload: payload() });
        assert.equal(repeated.json().step.status, 'VERIFIED');
        assert.equal(repeated.json().memoryWritten, false, 'a restored chain still behaves as a set');

        const grown = await second.inject({
          method: 'POST',
          url: '/v1/reality/gate/step',
          payload: payload({ intent: 'advance once more', expected: 'S2', observed: 'S2' }),
        });
        assert.equal(grown.json().memory.size, 2);
        assert.equal(grown.json().step.entry.previousHash, tip, 'a new link continues the restored chain');
        assert.equal(grown.json().memory.integrity, 'verified-local-hash-chain');
      } finally {
        await second.close();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('fails closed on a tampered journal instead of restoring a broken chain', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'omega-reality-gate-'));
    const dbPath = join(dir, 'oceanicos.db');
    try {
      const first = createApp(dbPath, false);
      try {
        const committed = await first.inject({ method: 'POST', url: '/v1/reality/gate/step', payload: payload() });
        assert.equal(committed.statusCode, 200);
      } finally {
        await first.close();
      }

      const journalPath = `${dbPath}.reality-memory.jsonl`;
      const tampered = JSON.parse(readFileSync(journalPath, 'utf8').trim());
      tampered.deltaHash = 'f'.repeat(64);
      writeFileSync(journalPath, `${JSON.stringify(tampered)}\n`);

      const second = createApp(dbPath, false);
      try {
        const read = await second.inject({ method: 'GET', url: '/v1/reality/gate/memory' });
        assert.equal(read.statusCode, 503);
        assert.equal(read.json().error, 'REALITY_MEMORY_INTEGRITY_DEGRADED');

        const stepResponse = await second.inject({ method: 'POST', url: '/v1/reality/gate/step', payload: payload() });
        assert.equal(stepResponse.statusCode, 503, 'a degraded chain never accepts a new link');
      } finally {
        await second.close();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
