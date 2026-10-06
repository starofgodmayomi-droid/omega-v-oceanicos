import { describe, expect, it } from 'vitest';
import { KaiContinuity } from '../kai.js';
import { captureMiniKernelCycle } from '../kai-cycle.js';

const block = {
  index: 4102,
  timestamp: '2026-10-04T00:00:01.000Z',
  observation: { source: 'mini-cycle-test' },
  evidence: { status: 'PASS' },
  previousHash: 'prev',
  hash: 'b'.repeat(64),
  nonce: 2,
} as any;

describe('KAI Mini cycle bridge', () => {
  it('captures a real MiniKernel-shaped cycle without changing authority', () => {
    const kai = new KaiContinuity();
    const kernel = { runCycle: () => block };
    const drop = captureMiniKernelCycle(kernel, kai, { source: 'mini-kernel-test' });

    expect(drop.status).toBe('VERIFIED');
    expect(drop.provenance).toContain(`remember:hash:${block.hash}`);
    expect(drop.memoryIsProof).toBe(false);
    expect(drop.authority).toBe('human_and_reality');
    expect(kai.latest()).toBe(drop);
  });
});
