import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
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
