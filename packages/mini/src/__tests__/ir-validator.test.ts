import { describe, expect, it } from '@jest/globals';
import type { OmegaIR } from '@oceanicos/types';
import { validateOmegaIR } from '../ir-validator';

const validIR: OmegaIR = {
  version: 'omega-ir.v1',
  intent: 'run bounded verification',
  evidenceRefs: [{ id: 'e1', kind: 'test', source: 'ci', digest: 'abc123' }],
  policyRefs: [{ id: 'p1', version: '1', requirement: 'human-review' }],
  workerPlan: [{ workerId: 'tester', version: '1', capability: 'build-test', mode: 'build-test', approvalRequired: true }],
  transitionSpec: { subject: 'repo', intent: 'run bounded verification', stateBefore: 'clean', requestedStateAfter: 'verified', dryRun: true },
  observationSpec: { observerId: 'ci-observer', targets: ['test-results'], evidenceRequired: ['exit-code'] },
};

describe('Ω IR validator', () => {
  it('accepts a complete v1 IR', () => {
    expect(validateOmegaIR(validIR)).toEqual({ valid: true, issues: [] });
  });

  it('fails closed on malformed required fields', () => {
    const invalid = { ...validIR, intent: ' ', workerPlan: [{ ...validIR.workerPlan[0], workerId: '' }], observationSpec: { ...validIR.observationSpec, targets: [''] } } as OmegaIR;
    const result = validateOmegaIR(invalid);
    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.path)).toEqual(['intent', 'workerPlan[0].workerId', 'observationSpec.targets[0]']);
  });

  it('rejects unsupported versions and worker modes', () => {
    const invalid = { ...validIR, version: 'omega-ir.v2', workerPlan: [{ ...validIR.workerPlan[0], mode: 'arbitrary-execution' }] } as unknown as OmegaIR;
    const result = validateOmegaIR(invalid);
    expect(result.valid).toBe(false);
    expect(result.issues).toEqual([
      { path: 'version', message: 'unsupported Omega IR version' },
      { path: 'workerPlan[0].mode', message: 'unsupported worker mode' },
    ]);
  });
});
