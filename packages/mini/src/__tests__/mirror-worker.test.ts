import { describe, expect, it } from 'vitest';
import { mirrorRepositoryState, unknownMirrorObservation } from '../mirror-worker.js';

describe('mirror worker', () => {
  it('normalizes explicit repository observation into deterministic evidence', () => {
    const result = mirrorRepositoryState({
      repository: 'starofgodmayomi-droid/omega-v-oceanicos', ref: 'refs/heads/main',
      headSha: 'abc123', clean: true, observedAt: '2026-10-01T16:00:00.000Z',
    });
    expect(result.status).toBe('OBSERVED');
    expect(result.worker).toBe('mirror');
    expect(result.evidence).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('preserves unknown instead of inventing repository state', () => {
    const result = unknownMirrorObservation('repository observer unavailable');
    expect(result.status).toBe('UNKNOWN');
    expect(result.snapshot).toBeUndefined();
  });

  it('rejects unbounded snapshot fields', () => {
    expect(() => mirrorRepositoryState({ repository: '', ref: 'main', headSha: 'abc', clean: true, observedAt: 'now' }))
      .toThrow('repository must be a non-empty bounded string');
  });
});