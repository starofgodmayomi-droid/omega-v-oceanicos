import { describe, expect, it } from '@jest/globals';
import type { NetworkGraph, OmegaEvidenceRef, OmegaPolicyRef, OmegaWorkerPlan } from '@oceanicos/types';
import { compileOmegaIntent } from '../compiler';

const evidenceRefs: readonly OmegaEvidenceRef[] = [
  { id: 'evidence-1', kind: 'test-result', source: 'ci', digest: 'sha256:abc' },
];
const policyRefs: readonly OmegaPolicyRef[] = [
  { id: 'policy-1', version: '1', requirement: 'human review required' },
];
const workerPlan: readonly OmegaWorkerPlan[] = [
  { workerId: 'tester', version: '1', capability: 'build-test', mode: 'build-test', approvalRequired: true },
];

const networkGraph: NetworkGraph = {
  version: 'network-intelligence.v1',
  nodes: [
    {
      id: 'human',
      kind: 'human',
      label: 'human root',
      state: 'OBSERVED',
      provenance: { source: 'test', observedAt: '2026-10-07T00:00:00.000Z', attributedTo: 'test', evidenceRefs: ['evidence-1'] },
    },
  ],
  edges: [],
  signals: [],
};

const input = {
  intent: '  run the bounded test suite  ',
  subject: 'repo:test',
  stateBefore: 'S0',
  evidenceRefs,
  policyRefs,
  workerPlan,
  transition: { requestedStateAfter: 'S1', consequence: 'test result recorded', dryRun: true },
  observation: {
    observerId: 'ci-observer',
    targets: ['repo:test'],
    evidenceRequired: ['exit status'],
  },
};

describe('Ω deterministic compiler', () => {
  it('produces identical IR for identical input', () => {
    expect(compileOmegaIntent(input)).toEqual(compileOmegaIntent(input));
  });

  it('normalizes intent without adding runtime state', () => {
    const ir = compileOmegaIntent(input);
    expect(ir.version).toBe('omega-ir.v1');
    expect(ir.intent).toBe('run the bounded test suite');
    expect(ir.transitionSpec.intent).toBe(ir.intent);
    expect(JSON.stringify(ir)).toBe(JSON.stringify(compileOmegaIntent(input)));
  });

  it('rejects empty required fields', () => {
    expect(() => compileOmegaIntent({ ...input, intent: '   ' })).toThrow('non-empty intent');
    expect(() => compileOmegaIntent({ ...input, subject: '   ' })).toThrow('non-empty subject');
    expect(() =>
      compileOmegaIntent({
        ...input,
        observation: { ...input.observation, observerId: '   ' },
      }),
    ).toThrow('non-empty observer id');
  });

  it('does not grant authority or embed executable content', () => {
    const ir = compileOmegaIntent(input);
    expect(Object.keys(ir)).not.toContain('authority');
    expect(Object.keys(ir)).not.toContain('execute');
    expect(JSON.stringify(ir)).not.toContain('function');
    expect(JSON.stringify(ir)).not.toContain('shell');
  });

  it('preserves source epistemic state without treating retrieval as verification', () => {
    const ir = compileOmegaIntent({
      ...input,
      sourceRefs: [{ id: 'source-1', kind: 'api', locator: 'https://example.test/data', state: 'RETRIEVED', provenance: 'user-supplied-url' }],
    });
    expect(ir.sourceRefs?.[0]).toMatchObject({ state: 'RETRIEVED', provenance: 'user-supplied-url' });
    expect(ir.sourceRefs?.[0]).not.toHaveProperty('authority');
  });

  it('carries bounded network graph context without granting authority', () => {
    const ir = compileOmegaIntent({ ...input, networkGraph });
    expect(ir.networkGraph).toEqual(networkGraph);
    expect(Object.keys(ir)).not.toContain('authority');
  });

  it('requires explicit authority and evidence for stronger source states', () => {
    expect(() => compileOmegaIntent({
      ...input,
      sourceRefs: [{ id: 'source-1', kind: 'api', locator: 'example', state: 'AUTHORIZED', provenance: 'request' }],
    })).toThrow('authorized source requires explicit source authority');
    expect(() => compileOmegaIntent({
      ...input,
      sourceRefs: [{ id: 'source-1', kind: 'api', locator: 'example', state: 'VERIFIED', provenance: 'test' }],
    })).toThrow('verified source requires an evidence reference');
  });
});
