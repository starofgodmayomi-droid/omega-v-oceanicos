import assert from 'node:assert/strict';
import { compileOmegaIntent } from '../packages/mini/dist/compiler.js';
import { admitOmegaIR } from '../packages/mini/dist/admission-bridge.js';

const ir = compileOmegaIntent({
  intent: 'Run bounded repository verification',
  subject: 'omega-v-oceanicos',
  stateBefore: 'checked-out branch',
  evidenceRefs: [{ id: 'e-ci', kind: 'test-result', source: 'repository-ci' }],
  policyRefs: [{ id: 'policy.test.v1', version: '1', requirement: 'bounded tests allowed' }],
  workerPlan: [{
    workerId: 'tester',
    version: '1.0.0',
    capability: 'repository-test',
    mode: 'build-test',
    approvalRequired: true,
  }],
  transition: { requestedStateAfter: 'tested branch', consequence: 'produce evidence', dryRun: true },
  observation: { observerId: 'repository-verifier', targets: ['test-result'], evidenceRequired: ['test-result'] },
});

assert.equal(ir.version, 'omega-ir.v1');
assert.equal(ir.transitionSpec.subject, 'omega-v-oceanicos');

const worker = {
  id: 'tester',
  version: '1.0.0',
  role: 'tester',
  mode: 'build-test',
  description: 'Bounded repository test worker.',
  inputSchema: 'omega.test.input.v1',
  outputSchema: 'omega.test.output.v1',
  authorityRequired: true,
  approvalRequired: true,
  policyRefs: ['policy.test.v1'],
  evidenceRequired: ['test-result'],
  timeoutMs: 5000,
  maxOutputBytes: 65536,
  retries: 0,
  dryRunSupported: true,
  rollbackSupported: false,
};

const result = admitOmegaIR({
  ir,
  registry: { version: 'omega-workers.v1', workers: [worker] },
  change: {
    id: 'bridge-smoke-1',
    subject: 'omega-v-oceanicos',
    intent: ir.intent,
    stateBefore: ir.transitionSpec.stateBefore,
    evidence: ['e-ci'],
    authority: 'operator:verified',
    policy: 'policy.test.v1',
    decision: 'REVIEW',
    authorized: false,
    provenance: { source: 'bridge-smoke', observedAt: new Date().toISOString(), attributedTo: 'operator' },
    createdAt: new Date().toISOString(),
  },
  authorityVerified: true,
  policySatisfied: true,
  approvalVerified: true,
});

assert.equal(result.registryMatched, true);
assert.equal(result.policyReferencesSatisfied, true);
assert.equal(result.evidenceRequirementsSatisfied, true);
assert.equal(result.approvalRequirementSatisfied, true);
assert.equal(result.change.decision, 'ALLOW');
assert.equal(result.change.authorized, true);

console.log(JSON.stringify({
  status: 'SUPPORTED',
  bridge: 'Notion intent → ΩIR compile → admission',
  omegaIrVersion: ir.version,
  admission: result.change.decision,
  authorized: result.change.authorized,
  liveNotionSync: 'NOT_EXECUTED',
}, null, 2));
