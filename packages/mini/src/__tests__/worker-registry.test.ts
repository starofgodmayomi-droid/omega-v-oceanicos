import { describe, expect, it } from 'vitest';
import { createOmegaWorkerRegistry, getOmegaWorker } from '../worker-registry.js';
import type { OmegaWorkerCapability } from '@oceanicos/types';

const observer: OmegaWorkerCapability = {
  id: 'observer',
  version: '1.0.0',
  role: 'observer',
  mode: 'read-only',
  description: 'Read-only normalization and observation.',
  inputSchema: 'omega.observation.input.v1',
  outputSchema: 'omega.observation.output.v1',
  authorityRequired: false,
  approvalRequired: false,
  policyRefs: ['policy.observation.v1'],
  evidenceRequired: ['observation'],
  timeoutMs: 5000,
  maxOutputBytes: 65536,
  retries: 0,
  dryRunSupported: true,
  rollbackSupported: false,
};

describe('Omega worker registry', () => {
  const mirror = { ...observer, id: 'mirror' as const, role: 'mirror', description: 'Repository-state mirror.', capabilities: ['observe:repository-state', 'reflect:change-surface'], inputSchema: 'omega.mirror.input.v1', outputSchema: 'omega.mirror.output.v1' };
  it('creates a versioned bounded registry', () => {
    const registry = createOmegaWorkerRegistry([observer, mirror]);
    expect(registry.version).toBe('omega-workers.v1');
    expect(getOmegaWorker(registry, 'observer')).toEqual(observer);
    expect(getOmegaWorker(registry, 'mirror')).toEqual(mirror);
  });

  it('rejects duplicate worker ids', () => {
    expect(() => createOmegaWorkerRegistry([observer, observer])).toThrow('Duplicate worker id: observer');
    expect(() => createOmegaWorkerRegistry([mirror, { ...mirror, id: 'repo-builder' as const, mode: 'local-mutating', approvalRequired: true, authorityRequired: true }])).not.toThrow();
  });

  it('rejects unbounded timeout/output declarations', () => {
    expect(() => createOmegaWorkerRegistry([{ ...observer, timeoutMs: 0 }])).toThrow('timeoutMs must be positive');
    expect(() => createOmegaWorkerRegistry([{ ...observer, maxOutputBytes: 0 }])).toThrow('maxOutputBytes must be positive');
  });
});
