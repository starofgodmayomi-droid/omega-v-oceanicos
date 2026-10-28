import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const sha256 = (text: string) => `sha256:${createHash('sha256').update(text, 'utf8').digest('hex')}`;

/**
 * The KAI/ELION loop is fail-closed: a scam intent halts before execution, an
 * intent with no bounded capability is never answered, and the evidence hash a
 * caller receives is the SHA-256 of the output OMEGA actually verified.
 */
describe('POST /v1/execute — KAI/ELION bounded loop', () => {
  it('blocks, verifies, preserves unknown, and remembers every verdict', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'omega-execute-'));
    const { createApp } = await import('../../apps/api/dist/index.js');
    const app = createApp(join(directory, 'ledger.db'), false, { allowUnsignedCycle: true });
    await app.ready();

    try {
      const blocked = (await app.inject({
        method: 'POST',
        url: '/v1/execute',
        payload: { intent: 'Urgent guaranteed returns, send money today for 300% profit.' },
      })).json();
      assert.equal(blocked.status, 'DIVERGENT');
      assert.equal(blocked.reason, 'KAI Shield blocked this intent.');
      assert.equal(blocked.shield.blocked, true);
      assert.ok(blocked.shield.rules.length > 0);
      assert.equal(blocked.contract, null);
      assert.equal(blocked.output, null);
      assert.ok(!blocked.steps.some((step: any) => step.step === 'ELION_EXECUTE'), 'a blocked intent never reaches execution');

      const verified = (await app.inject({
        method: 'POST',
        url: '/v1/execute',
        payload: { intent: 'Report the current system status.', expectedOutcome: 'INTEGRITY_VERIFIED' },
      })).json();
      assert.equal(verified.status, 'VERIFIED');
      assert.equal(verified.hashAlgorithm, 'SHA-256');
      assert.equal(verified.evidenceHash, sha256(verified.output));
      assert.match(verified.output, /LEDGER · height/);
      assert.equal(verified.contract.executionScope, 'READ_ONLY_OBSERVED_STATE');
      assert.deepEqual(
        verified.steps.map((step: any) => step.step),
        ['KAI_OBSERVE', 'ELION_BOUND', 'ELION_EXECUTE', 'OMEGA_VERIFY', 'KAI_REMEMBER']
      );

      const divergent = (await app.inject({
        method: 'POST',
        url: '/v1/execute',
        payload: { intent: 'Report the current system status.', expectedOutcome: 'a colony on mars' },
      })).json();
      assert.equal(divergent.status, 'DIVERGENT');
      assert.equal(divergent.reason, 'OMEGA_EXPECTED_OUTCOME_NOT_OBSERVED');
      assert.match(divergent.output, /LEDGER · height/);

      const noCapability = (await app.inject({
        method: 'POST',
        url: '/v1/execute',
        payload: { intent: 'Write a poem about the ocean at midnight.' },
      })).json();
      assert.equal(noCapability.status, 'NOT_EXECUTED');
      assert.equal(noCapability.reason, 'ELION_BOUNDED_EXECUTOR_HAS_NO_CAPABILITY_FOR_THIS_INTENT');
      assert.equal(noCapability.output, null);
      assert.match(noCapability.evidenceHash, /^sha256:[0-9a-f]{64}$/);

      const needsHuman = await app.inject({
        method: 'POST',
        url: '/v1/execute',
        payload: { intent: 'Buy 3 shares of the index fund now.', authority: 'AUTONOMOUS' },
      });
      assert.equal(needsHuman.statusCode, 202);
      assert.equal(needsHuman.json().reason, 'HUMAN_AUTHORIZATION_REQUIRED');

      const invalid = await app.inject({ method: 'POST', url: '/v1/execute', payload: {} });
      assert.equal(invalid.statusCode, 400);
      assert.equal(invalid.json().error, 'INVALID_EXECUTE_REQUEST');

      const memory = (await app.inject({ method: 'GET', url: '/v1/execute/memory?limit=50' })).json();
      assert.equal(memory.success, true);
      assert.equal(memory.integrity, 'verified-local-hash-chain');
      assert.equal(memory.height, 5);
      assert.ok(memory.entries[0].sequence > memory.entries[1].sequence, 'newest drop first');
      const statuses = memory.entries.map((entry: any) => entry.status);
      for (const status of ['DIVERGENT', 'VERIFIED', 'NOT_EXECUTED']) assert.ok(statuses.includes(status));
    } finally {
      await app.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
