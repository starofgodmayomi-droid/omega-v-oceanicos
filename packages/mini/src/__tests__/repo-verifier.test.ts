import { describe, expect, it } from 'vitest';
import { reconcileRepositoryState } from '../repo-verifier.js';

const expected = { repository: 'starofgodmayomi-droid/omega-v-oceanicos', ref: 'refs/heads/main', headSha: 'abc', clean: true, observedAt: '2026-10-01T16:00:00.000Z' };

describe('repo verifier', () => {
  it('verifies matching observed repository state', () => {
    const result = reconcileRepositoryState(expected, expected);
    expect(result.status).toBe('VERIFIED');
    expect(result.issues).toEqual([]);
    expect(result.evidence).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
  it('preserves divergence', () => {
    const result = reconcileRepositoryState(expected, { ...expected, headSha: 'different' });
    expect(result.status).toBe('DIVERGENT');
  });
  it('preserves unknown when observation is absent', () => {
    expect(reconcileRepositoryState(expected).status).toBe('UNKNOWN');
  });
});