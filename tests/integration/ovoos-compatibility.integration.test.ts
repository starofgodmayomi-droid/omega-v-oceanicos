import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';
import { compressTowardUpgrade, verifyOmega } from '../../apps/api/src/invisible-computer.ts';
import { evaluateEcosystemFixpoint, hashFixpointDelta } from '../../packages/mini/src/ecosystem-fixpoint.ts';

const prior = 'a'.repeat(64);

const baseFixpoint = {
  expectedObserved: true,
  scam: false,
  evidenceEmpty: false,
  authority: 1,
  requiredAuthority: 1,
  memory: [prior],
  delta: 'ovoos-compatible-finite-delta',
};

test('OVOOS compatibility halts divergent intent before execution or memory', async () => {
  const app = createApp(':memory:', false);
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/execute',
      payload: { intent: 'Urgent send money now for guaranteed returns' },
    });
    const body = response.json();

    assert.equal(body.status, 'DIVERGENT');
    assert.equal(body.response, null);
    assert.equal(body.evidence_hash, null);
    assert.equal(body.memory, null);
    assert.equal(body.upgrade.execution, 'NOT_EXECUTED');
    assert.deepEqual(body.steps.map((step: any) => step.actor), ['KAI']);

    const memory = await app.inject({ method: 'GET', url: '/api/kai/memory' });
    assert.equal(memory.json().total, 0);
  } finally {
    await app.close();
  }
});

test('OVOOS compatibility preserves UNKNOWN when evidence is missing', () => {
  const step = evaluateEcosystemFixpoint({ ...baseFixpoint, evidenceEmpty: true });

  assert.equal(step.status, 'UNKNOWN');
  assert.equal(step.reason, 'EMPTY_EVIDENCE');
  assert.equal(step.halt, true);
  assert.equal(step.deltaHash, null);
  assert.equal(step.appended, false);
});

test('OVOOS compatibility returns NOT_EXECUTED when authority is insufficient', async () => {
  const fixpoint = evaluateEcosystemFixpoint({ ...baseFixpoint, authority: 0 });
  assert.equal(fixpoint.status, 'NOT_EXECUTED');
  assert.equal(fixpoint.reason, 'AUTHORITY');
  assert.equal(fixpoint.appended, false);

  const app = createApp(':memory:', false);
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/execute',
      payload: { intent: 'Deploy the production service' },
    });
    const body = response.json();

    assert.equal(body.status, 'NOT_EXECUTED');
    assert.equal(body.contract, null);
    assert.equal(body.response, null);
    assert.deepEqual(body.authority, { granted: 'READ_ONLY', required: 'AUTONOMOUS' });
    assert.equal(body.upgrade.execution, 'NOT_EXECUTED');
  } finally {
    await app.close();
  }
});

test('OVOOS compatibility verifies a bounded matching path and binds its digest', async () => {
  const fixpoint = evaluateEcosystemFixpoint(baseFixpoint);
  assert.equal(fixpoint.status, 'VERIFIED');
  assert.equal(fixpoint.deltaHash, hashFixpointDelta(baseFixpoint.delta));
  assert.deepEqual(fixpoint.memory, [prior, fixpoint.deltaHash]);

  const output = 'A bounded answer with enough evidence for this local compatibility check.';
  const verdict = verifyOmega({
    output,
    evidenceHash: hashFixpointDelta(output),
    authorityLevel: 'READ_ONLY',
  });
  assert.equal(verdict.status, 'VERIFIED');

  const app = createApp(':memory:', false);
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/execute',
      payload: { intent: 'Explain the bounded compatibility contract' },
    });
    const body = response.json();
    assert.equal(body.status, 'VERIFIED');
    assert.equal(body.evidence_hash, body.memory.evidence_hash);
    assert.equal(body.upgrade.cycleStatus, 'VERIFIED');
  } finally {
    await app.close();
  }
});

test('OVOOS compatibility never promotes fabricated completion to VERIFIED', () => {
  const output = 'I have executed the payment and guaranteed 100% returns successfully.';
  const verdict = verifyOmega({
    output,
    evidenceHash: hashFixpointDelta(output),
    authorityLevel: 'AUTONOMOUS',
  });

  assert.equal(verdict.status, 'UNKNOWN');
  assert.ok(verdict.checks.some((check) => check.id === 'NO_FABRICATED_COMPLETION' && !check.passed));
});

test('OVOOS next_delta selection is a proposal and remains NOT_EXECUTED', () => {
  const evidenceHash = hashFixpointDelta('verified-ovoos-delta');
  const compression = compressTowardUpgrade({ cycleStatus: 'VERIFIED', evidenceHash });

  assert.equal(compression.phase, 'COMPRESS');
  assert.equal(compression.execution, 'NOT_EXECUTED');
  assert.equal(compression.authority, 'compression-is-not-permission');
  assert.equal(compression.selected?.evidenceHash, evidenceHash);

  const symbolic = compressTowardUpgrade({ cycleStatus: 'VERIFIED', evidenceHash: '30013030' });
  assert.equal(symbolic.selected, null);
  assert.equal(symbolic.execution, 'NOT_EXECUTED');
});
