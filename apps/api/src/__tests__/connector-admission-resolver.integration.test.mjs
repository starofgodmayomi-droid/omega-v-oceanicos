import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../../dist/index.js';

const connector = {
  id: 'github.read-repository',
  version: '1.0.0',
  system: 'github',
  capability: 'read repository metadata',
  authRef: 'secret-ref:github-readonly',
  scope: ['repo:starofgodmayomi-droid/omega-v-oceanicos'],
  mode: 'read-only',
  policyRefs: ['policy:connector-read.v1'],
  stopCondition: 'stop after one bounded repository read',
  expectedObservation: 'github:starofgodmayomi-droid/omega-v-oceanicos:metadata',
  timeoutMs: 5000,
  maxAttempts: 1,
  rollbackSupported: false,
};

test('connector observation fails closed before adapter execution or journaling on resolver errors', async () => {
  let fetchCalls = 0;
  const apps = [
    {
      app: createApp(':memory:', false, {
        connectorAdmissionEvidence: async () => {
          throw new Error('evidence provider unavailable');
        },
        githubFetch: async () => {
          fetchCalls += 1;
          return new Response('{}', { status: 200 });
        },
      }),
      expectedError: 'CONNECTOR_ADMISSION_EVIDENCE_UNAVAILABLE',
    },
    {
      app: createApp(':memory:', false, {
        connectorAdmissionEvidence: () => ({
          authorityVerified: true,
          policySatisfied: 'true',
          approvalVerified: false,
        }),
        githubFetch: async () => {
          fetchCalls += 1;
          return new Response('{}', { status: 200 });
        },
      }),
      expectedError: 'CONNECTOR_ADMISSION_EVIDENCE_INVALID',
    },
  ];

  try {
    for (const { app, expectedError } of apps) {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/omega/connectors/observe',
        payload: {
          connector,
          liveAdapter: 'github-public-repository',
        },
      });
      assert.equal(response.statusCode, 503);
      assert.equal(response.json().error, expectedError);

      const journal = await app.inject({
        method: 'GET',
        url: '/v1/omega/connectors/observations',
      });
      assert.equal(journal.json().total, 0);
    }
    assert.equal(fetchCalls, 0);
  } finally {
    await Promise.all(apps.map(({ app }) => app.close()));
  }
});
