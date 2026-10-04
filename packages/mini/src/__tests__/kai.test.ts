import { describe, expect, it } from 'vitest';
import { kaiFromBlock, kaiUnknown, KaiContinuity } from '../kai.js';

const block = {
  index: 4101,
  timestamp: '2026-10-04T00:00:00.000Z',
  observation: {
    uuid: 'obs-1',
    timestamp: '2026-10-04T00:00:00.000Z',
    siliconYield: 0.9,
    gridLoadMegawatts: 10,
    acceleratorInventory: 1,
  },
  evidence: {
    status: 'PASS',
    lawRoute: 'bounded-observation',
    timestamp: '2026-10-04T00:00:00.000Z',
    observationUuid: 'obs-1',
    signatureProof: 'test-proof',
  },
  previousHash: 'genesis',
  hash: 'abc',
  nonce: 0,
};

describe('KAI continuity', () => {
  it('maps verified evidence without promoting memory to reality', () => {
    const drop = kaiFromBlock(block);
    expect(drop.status).toBe('VERIFIED');
    expect(drop.memoryIsProof).toBe(false);
    expect(drop.authority).toBe('human_and_reality');
  });
  it('preserves UNKNOWN without manufacturing evidence', () => {
    const drop = kaiUnknown('runtime outcome was not observed');
    expect(drop.status).toBe('UNKNOWN');
    expect(drop.persisted).toBe(false);
  });
  it('keeps correction lineage as a new Drop', () => {
    const kai = new KaiContinuity();
    const prior = kaiUnknown('initial observation incomplete', 'test');
    const corrected = kai.correct(prior, kaiFromBlock(block, 'test'));
    expect(corrected.corrects).toBe(prior.id);
    expect(corrected.provenance).toContain(`corrects:${prior.id}`);
  });
});
