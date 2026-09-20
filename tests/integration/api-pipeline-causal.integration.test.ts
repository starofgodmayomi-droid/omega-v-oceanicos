import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const compile = {
  intent: 'advance API-persisted state',
  subject: 'api:pipeline',
  stateBefore: 'S0',
  evidenceRefs: [{ id: 'api-ev', kind: 'test-result', source: 'api-test', digest: 'sha256:api' }],
  policyRefs: [{ id: 'policy:api', version: '1', requirement: 'explicit authority' }],
  workerPlan: [],
  transition: { requestedStateAfter: 'S1', consequence: 'bounded API state change', dryRun: false },
  observation: { observerId: 'api-test', targets: ['api:pipeline'], evidenceRequired: ['state'] },
};

async function removeTemporaryDirectory(directory: string): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      rmSync(directory, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 });
      return;
    } catch (error: any) {
      if (error?.code !== 'EBUSY' && error?.code !== 'EPERM') throw error;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  rmSync(directory, { recursive: true, force: true });
}

describe('live API pipeline → durable causal memory', () => {
  it('registers POST /v1/pipeline and returns a replayable C7 record', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'omega-api-causal-'));
    const memoryPath = join(directory, 'causal.jsonl');
    const previousPath = process.env.OMEGA_CAUSAL_MEMORY_PATH;
    const previousKey = process.env.OMEGA_REALITY_ATTESTATION_KEY;
    process.env.OMEGA_CAUSAL_MEMORY_PATH = memoryPath;
    process.env.OMEGA_REALITY_ATTESTATION_KEY = 'api-causal-test-key';
    try {
      const { createApp } = await import('../../apps/api/dist/index.js');
      const { FileCausalMemory } = await import('../../packages/mini/dist/index.js');
      const app = createApp(join(directory, 'ledger.db'), false, { allowUnsignedCycle: true });
      await app.ready();
      try {
        const response = await app.inject({
          method: 'POST',
          url: '/v1/pipeline',
          payload: {
            compile,
            admission: { authorityVerified: true, policySatisfied: true },
            authority: 'human:api-test',
            policy: 'policy:api',
            handlerStateAfter: 'S1',
            observedState: 'S1',
            changeId: 'api-causal-1',
          },
        });
        assert.equal(response.statusCode, 200);
        const body = response.json();
        assert.equal(body.success, true);
        assert.equal(body.pipeline.stage, 'OBSERVE');
        assert.equal(body.pipeline.realityStatus, 'VERIFIED');
        assert.equal(body.pipeline.durableMemory, true);
        assert.equal(body.pipeline.memoryIntegrity, true);
        assert.equal(body.pipeline.realityAttestation.changeId, 'api-causal-1');

        const memory = new FileCausalMemory(memoryPath, { key: 'api-causal-test-key' });
        assert.equal(memory.verifyIntegrity(), true);
        assert.equal(memory.replay('api-causal-1')?.attestation.status, 'VERIFIED');
      } finally {
        await app.close();
      }
    } finally {
      if (previousPath === undefined) delete process.env.OMEGA_CAUSAL_MEMORY_PATH;
      else process.env.OMEGA_CAUSAL_MEMORY_PATH = previousPath;
      if (previousKey === undefined) delete process.env.OMEGA_REALITY_ATTESTATION_KEY;
      else process.env.OMEGA_REALITY_ATTESTATION_KEY = previousKey;
      await removeTemporaryDirectory(directory);
    }
  });
});
