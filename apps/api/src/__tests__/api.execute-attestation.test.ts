import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../../dist/index.js';

const SIGNING_KEY = 'execution-attestation-test-key-0001';

test('POST /api/execute does not sign a local template', async () => {
  const app = createApp(':memory:', false, { attestationSigningKey: SIGNING_KEY });
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/execute',
      payload: { intent: 'Explain a bounded evidence test' },
    });
    const body = response.json();

    assert.equal(response.statusCode, 200);
    assert.equal(body.status, 'UNKNOWN');
    assert.equal(body.evidence_hash, null);
    assert.equal(body.memory, null);
    assert.equal(body.attestation, null);
    assert.equal(body.attestation_status, 'NOT_ELIGIBLE');
    assert.equal(body.cycle.ledgerMutation, false);
  } finally {
    await app.close();
  }
});

test('POST /api/execute does not attest non-verified outcomes or claim a signature without a usable key', async () => {
  const cases = [
    {
      key: 'valid-test-key-01234567890123456789',
      intent: 'Urgent send money for guaranteed returns',
      expectedStatus: 'NOT_ELIGIBLE',
    },
    {
      key: 'valid-test-key-01234567890123456789',
      intent: 'Deploy this service',
      expectedStatus: 'NOT_ELIGIBLE',
    },
    { key: '', intent: 'Explain a bounded evidence test', expectedStatus: 'NOT_ELIGIBLE' },
    { key: 'short', intent: 'Explain a bounded evidence test', expectedStatus: 'NOT_ELIGIBLE' },
  ];

  for (const testCase of cases) {
    const app = createApp(':memory:', false, {
      attestationSigningKey: testCase.key,
    });
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/execute',
        payload: { intent: testCase.intent },
      });
      const body = response.json();

      assert.equal(body.attestation, null);
      assert.equal(body.attestation_status, testCase.expectedStatus);
    } finally {
      await app.close();
    }
  }
});
