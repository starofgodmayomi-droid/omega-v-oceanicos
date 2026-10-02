import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { admitOmegaConnector, executeAdmittedConnector, FileConnectorObservationStore } from '../../packages/mini/dist/index.js';

const connector = {
  id: 'github.read-repository',
  version: '1.0.0',
  system: 'github',
  capability: 'read repository metadata',
  authRef: 'secret-ref:github-readonly',
  scope: ['repo:starofgodmayomi-droid/omega-v-oceanicos'],
  mode: 'read-only' as const,
  policyRefs: ['policy:connector-read.v1'],
  stopCondition: 'stop after one bounded repository read',
  expectedObservation: 'github:starofgodmayomi-droid/omega-v-oceanicos:metadata',
  timeoutMs: 5000,
  maxAttempts: 1,
  rollbackSupported: false,
};

describe('Ω connector observation path', () => {
  it('proves admit → explicit handler → observed match without hidden network', async () => {
    const verified = await executeAdmittedConnector({
      connector,
      authorityVerified: true,
      policySatisfied: true,
      approvalVerified: false,
      handler: () => ({
        attempted: true,
        executed: true,
        actualObservation: connector.expectedObservation,
      }),
    });

    assert.equal(verified.admission.decision, 'ADMIT');
    assert.equal(verified.status, 'VERIFIED');
    assert.equal(verified.verificationScope, 'admitted-connector-observation-only');
    assert.match(verified.evidence, /^sha256:[a-f0-9]{64}$/);
  });

  it('refuses unverified client status claims and remembers observations on a local hash chain', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'omega-connector-observation-'));
    const { createApp } = await import('../../apps/api/dist/index.js');
    const app = createApp(join(directory, 'ledger.db'), false, { allowUnsignedCycle: true });
    await app.ready();

    try {
      const claimed = await app.inject({
        method: 'POST',
        url: '/v1/omega/connectors/observe',
        payload: {
          connector,
          authorityVerified: true,
          policySatisfied: true,
          approvalVerified: false,
          status: 'VERIFIED',
        },
      });
      assert.equal(claimed.statusCode, 400);
      assert.equal(claimed.json().error, 'CONNECTOR_OBSERVATION_CANNOT_SET_STATUS');

      const hiddenHandler = await app.inject({
        method: 'POST',
        url: '/v1/omega/connectors/observe',
        payload: {
          connector,
          authorityVerified: true,
          policySatisfied: true,
          approvalVerified: false,
          handler: { kind: 'network' },
        },
      });
      assert.equal(hiddenHandler.statusCode, 400);
      assert.equal(hiddenHandler.json().error, 'CONNECTOR_HANDLER_NOT_ACCEPTED');

      const admittedOnly = await app.inject({
        method: 'POST',
        url: '/v1/omega/connectors/observe',
        payload: {
          connector,
          authorityVerified: true,
          policySatisfied: true,
          approvalVerified: false,
        },
      });
      assert.equal(admittedOnly.statusCode, 200);
      assert.equal(admittedOnly.json().admission.admitted, true);
      assert.equal(admittedOnly.json().status, 'NOT_EXECUTED');
      assert.equal(admittedOnly.json().executed, false);
      assert.equal(admittedOnly.json().remembered, true);
      assert.equal(admittedOnly.json().journal.sequence, 1);
      assert.match(admittedOnly.json().journal.hash, /^[a-f0-9]{64}$/);

      const denied = await app.inject({
        method: 'POST',
        url: '/v1/omega/connectors/observe',
        payload: {
          connector,
          authorityVerified: false,
          policySatisfied: true,
          approvalVerified: true,
          execution: {
            attempted: true,
            executed: true,
            actualObservation: connector.expectedObservation,
          },
        },
      });
      assert.equal(denied.statusCode, 200);
      assert.equal(denied.json().status, 'NOT_EXECUTED');
      assert.equal(denied.json().executed, false);
      assert.equal(denied.json().actualObservation, undefined);
      assert.equal(denied.json().remembered, true);
      assert.equal(denied.json().journal.sequence, 2);

      const observed = await app.inject({
        method: 'POST',
        url: '/v1/omega/connectors/observe',
        payload: {
          connector,
          authorityVerified: true,
          policySatisfied: true,
          approvalVerified: false,
          execution: {
            attempted: true,
            executed: true,
            actualObservation: connector.expectedObservation,
          },
        },
      });
      assert.equal(observed.statusCode, 200);
      assert.equal(observed.json().status, 'VERIFIED');
      assert.equal(observed.json().authorized, true);
      assert.equal(observed.json().executed, true);
      assert.equal(observed.json().observed, true);
      assert.match(observed.json().evidence, /^sha256:[a-f0-9]{64}$/);
      assert.equal(observed.json().limitation.includes('not deployment'), true);
      assert.equal(observed.json().remembered, true);
      assert.equal(observed.json().journal.sequence, 3);
      assert.equal(observed.json().journal.previousHash, denied.json().journal.hash);

      const memory = await app.inject({
        method: 'GET',
        url: '/v1/omega/connectors/observations',
      });
      assert.equal(memory.statusCode, 200);
      assert.equal(memory.json().success, true);
      assert.equal(memory.json().total, 3);
      assert.equal(memory.json().integrity, 'verified-local-hash-chain');
      assert.equal(memory.json().entries[0].observation.status, 'NOT_EXECUTED');
      assert.equal(memory.json().entries[2].observation.status, 'VERIFIED');
      assert.equal(memory.json().entries[2].hash, observed.json().journal.hash);
      assert.equal(memory.json().limitation.includes('not live GitHub'), true);
    } finally {
      await app.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('fails closed when the connector journal hash chain is tampered', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'omega-connector-journal-'));
    const journalPath = join(directory, 'connectors.jsonl');
    writeFileSync(journalPath, '{"kind":"OMEGA_CONNECTOR_OBSERVATION","hash":"deadbeef"}\n');
    const store = new FileConnectorObservationStore(journalPath);
    assert.equal(store.verifyIntegrity(), false);

    const { createApp } = await import('../../apps/api/dist/index.js');
    const app = createApp(join(directory, 'ledger.db'), false, {
      allowUnsignedCycle: true,
      connectorObservationPath: journalPath,
    });
    await app.ready();
    try {
      const listed = await app.inject({ method: 'GET', url: '/v1/omega/connectors/observations' });
      assert.equal(listed.statusCode, 503);
      assert.equal(listed.json().error, 'CONNECTOR_OBSERVATION_JOURNAL_INTEGRITY_DEGRADED');

      const observe = await app.inject({
        method: 'POST',
        url: '/v1/omega/connectors/observe',
        payload: {
          connector,
          authorityVerified: true,
          policySatisfied: true,
          approvalVerified: false,
        },
      });
      assert.equal(observe.statusCode, 503);
      assert.equal(observe.json().error, 'CONNECTOR_OBSERVATION_JOURNAL_INTEGRITY_DEGRADED');
    } finally {
      await app.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('keeps admitOmegaConnector a non-executing boundary', () => {
    const admission = admitOmegaConnector({
      connector,
      authorityVerified: true,
      policySatisfied: true,
      approvalVerified: false,
    });
    assert.deepEqual(admission, { decision: 'ADMIT', admitted: true, issues: [] });
  });
});
