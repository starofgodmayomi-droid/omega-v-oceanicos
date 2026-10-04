import { describe, expect, it } from 'vitest';
import { KaiContinuity, kaiFromBlock, kaiUnknown } from '../kai.js';

const block = { index: 4101, timestamp: '2026-10-04T00:00:00.000Z', observation: { source: 'test' }, evidence: { status: 'PASS' }, previousHash: 'prev', hash: 'a'.repeat(64), nonce: 1 } as any;

describe('KAI continuity', () => {
  it('preserves the verification boundary', () => {
    const drop = kaiFromBlock(block, { source: 'test' });
    expect(drop.status).toBe('VERIFIED');
    expect(drop.memoryIsProof).toBe(false);
    expect(drop.authority).toBe('human_and_reality');
  });
  it('preserves UNKNOWN', () => {
    const drop = kaiUnknown('no observation', { source: 'test' });
    expect(drop.status).toBe('UNKNOWN');
    expect(drop.persisted).toBe(false);
  });
  it('appends corrections with lineage', () => {
    const kai = new KaiContinuity();
    const original = kai.capture(block, { source: 'test' });
    const corrected = kai.correct(original, { ...original, status: 'DIVERGENT', unknowns: ['later disagreement'], persisted: true });
    expect(corrected.corrects).toBe(original.id);
    expect(kai.all()).toHaveLength(2);
  });
});