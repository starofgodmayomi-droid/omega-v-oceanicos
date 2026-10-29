import { describe, expect, it } from '@jest/globals';
import {
  OMEGA_EMPTY_ROOT,
  createOmegaFixpointState,
  evaluateOmegaOperator,
  iterateOmegaFixpoint,
  omegaDeltaHash,
  omegaY,
  type OmegaDelta,
} from '../fixpoint';

const verified: OmegaDelta = {
  expected: 'state:A',
  observed: 'state:A',
  evidence: ['observation:1'],
  authority: 1,
  requiredAuthority: 1,
  consequence: 'state advanced to A',
};

describe('Ω∞v fixed point operator', () => {
  it('commits a verified delta and grows Σ monotonically', () => {
    const empty = createOmegaFixpointState();
    const first = evaluateOmegaOperator(verified, empty);
    expect(first.verdict).toBe('VERIFIED');
    expect(first.committed).toBe(true);
    expect(first.halted).toBe(false);
    expect(first.state.size).toBe(1);
    expect(first.state.root).not.toBe(OMEGA_EMPTY_ROOT);
    expect(first.state.entries[0].previousRoot).toBe(OMEGA_EMPTY_ROOT);

    const second = evaluateOmegaOperator({ ...verified, expected: 'state:B', observed: 'state:B' }, first.state);
    expect(second.state.size).toBe(2);
    expect(second.state.entries[1].previousRoot).toBe(first.state.root);
    expect(second.state.entries.map((entry) => entry.deltaHash)).toContain(omegaDeltaHash(verified));
  });

  it('halts at the fixed point when Hash(x) is already in Σ', () => {
    const first = evaluateOmegaOperator(verified, createOmegaFixpointState());
    const again = evaluateOmegaOperator(verified, first.state);
    expect(again.verdict).toBe('VERIFIED');
    expect(again.halted).toBe(true);
    expect(again.haltReason).toBe('FIXED_POINT');
    expect(again.committed).toBe(false);
    expect(again.state.size).toBe(first.state.size);
    expect(again.state.root).toBe(first.state.root);
  });

  it('halts DIVERGENT for a known scam without touching Σ', () => {
    const empty = createOmegaFixpointState();
    const result = evaluateOmegaOperator({ ...verified, knownScam: true }, empty);
    expect(result.verdict).toBe('DIVERGENT');
    expect(result.haltReason).toBe('KNOWN_SCAM');
    expect(result.committed).toBe(false);
    expect(result.state.size).toBe(0);
  });

  it('halts UNKNOWN when Evidence(x) = ∅', () => {
    const result = evaluateOmegaOperator({ ...verified, evidence: [] }, createOmegaFixpointState());
    expect(result.verdict).toBe('UNKNOWN');
    expect(result.haltReason).toBe('EMPTY_EVIDENCE');
    expect(result.state.size).toBe(0);
  });

  it('halts NOT_EXECUTED when Authority(x) < Required', () => {
    const result = evaluateOmegaOperator(
      { expected: 'state:A', evidence: ['observation:1'], authority: 0, requiredAuthority: 1 },
      createOmegaFixpointState(),
    );
    expect(result.verdict).toBe('NOT_EXECUTED');
    expect(result.haltReason).toBe('INSUFFICIENT_AUTHORITY');
    expect(result.state.size).toBe(0);
  });

  it('halts DIVERGENT when Expected ≠ Observed', () => {
    const result = evaluateOmegaOperator({ ...verified, observed: 'state:B' }, createOmegaFixpointState());
    expect(result.verdict).toBe('DIVERGENT');
    expect(result.haltReason).toBe('OBSERVATION_MISMATCH');
    expect(result.state.size).toBe(0);
  });

  it('iterates until the first halt and tallies verdicts', () => {
    const deltas: OmegaDelta[] = [
      verified,
      { ...verified, expected: 'state:C', observed: 'state:C', evidence: ['observation:2'] },
      { ...verified, observed: 'state:drift' },
    ];
    let index = 0;
    const run = iterateOmegaFixpoint(() => deltas[index++], { maxSteps: 8 });
    expect(run.steps).toHaveLength(3);
    expect(run.halted).toBe(true);
    expect(run.haltReason).toBe('OBSERVATION_MISMATCH');
    expect(run.verdicts).toEqual({ VERIFIED: 2, DIVERGENT: 1, UNKNOWN: 0, NOT_EXECUTED: 0 });
    expect(run.state.size).toBe(2);
  });

  it('reports DEPTH_EXHAUSTED instead of diverging', () => {
    let tick = 0;
    const run = iterateOmegaFixpoint(
      () => {
        const state = `state:${tick++}`;
        return { ...verified, expected: state, observed: state };
      },
      { maxSteps: 2 },
    );
    expect(run.halted).toBe(true);
    expect(run.haltReason).toBe('DEPTH_EXHAUSTED');
    expect(run.state.size).toBe(2);
  });

  it('Y computes a recursion without naming it', () => {
    const factorial = omegaY<number, number>((self) => (n) => (n <= 1 ? 1 : n * self(n - 1)));
    expect(factorial(5)).toBe(120);
  });
});
