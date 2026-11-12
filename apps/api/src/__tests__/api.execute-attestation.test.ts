import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { AttestationService } from '@oceanicos/attestation';
import { createApp } from '../../dist/index.js';

const SIGNING_KEY = 'execution-attestation-test-key-0001';

test('POST /api/execute signs the API-computed response digest and execution contract', async () => {
  const app = createApp(':memory:', false, { attestationSigningKey: SIGNING_KEY });
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/execute',
      payload: { intent: 'Explain a bounded evidence test' },
    });
    const body = response.json();

    assert.equal(response.statusCode, 200);
    assert.equal(body.status, 'VERIFIED');
    assert.match(body.evidence_hash, /^[0-9a-f]{64}$/);
    assert.equal(body.evidence_hash, createHash('sha256').update(body.response, 'utf8').digest('hex'));
    assert.equal(body.attestation_status, 'SIGNED');
    assert.deepEqual(body.attestation, {
      ...body.attestation,
      verificationId: body.contract.id,
      observationId: body.evidence_hash,
      verified: true,
      status: 'signed',
    });
    assert.equal(
      new AttestationService({
        signingKey: SIGNING_KEY,
        algorithm: 'HMAC-SHA256',
      }).verify(body.attestation),
      true
    );
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
    { key: '', intent: 'Explain a bounded evidence test', expectedStatus: 'NOT_CONFIGURED' },
    { key: 'short', intent: 'Explain a bounded evidence test', expectedStatus: 'KEY_TOO_WEAK' },
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
