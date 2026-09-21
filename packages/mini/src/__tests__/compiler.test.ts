import { describe, expect, it } from '@jest/globals';
import type { OmegaEvidenceRef, OmegaPolicyRef, OmegaWorkerPlan } from '@oceanicos/types';
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
});
