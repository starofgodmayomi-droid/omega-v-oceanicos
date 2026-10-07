import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
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
        assert.equal(body.pipeline.stage, 'RECONCILE');
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

  it('accepts a finite water-flow prefix and rejects invalid bounds at the API boundary', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'omega-api-water-flow-'));
    try {
      const { createApp } = await import('../../apps/api/dist/index.js');
      const app = createApp(join(directory, 'ledger.db'), false, { allowUnsignedCycle: true });
      await app.ready();
      try {
        const valid = await app.inject({
          method: 'POST',
          url: '/v1/pipeline',
          payload: {
            compile,
            admission: { authorityVerified: true, policySatisfied: true },
            authority: 'human:api-test',
            policy: 'policy:api',
            handlerStateAfter: 'S1',
            waterFlowMaxSteps: 2,
            changeId: 'api-water-flow-prefix',
          },
        });
        assert.equal(valid.statusCode, 200);
        assert.deepEqual(
          valid.json().pipeline.waterFlow.map((frame: { stage: string }) => frame.stage),
          ['REALITY', 'ATTENTION'],
        );

        const invalid = await app.inject({
          method: 'POST',
          url: '/v1/pipeline',
          payload: {
            compile,
            admission: { authorityVerified: true, policySatisfied: true },
            authority: 'human:api-test',
            policy: 'policy:api',
            waterFlowMaxSteps: 9,
          },
        });
        assert.equal(invalid.statusCode, 400);
        assert.equal(invalid.json().error, 'INVALID_WATER_FLOW_BOUNDS');
      } finally {
        await app.close();
      }
    } finally {
      await removeTemporaryDirectory(directory);
    }
  });

  it('rejects the pipeline before execution when configured causal memory is unreadable', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'omega-api-causal-unreadable-'));
    const memoryPath = join(directory, 'causal-directory');
    mkdirSync(memoryPath);
    const previousPath = process.env.OMEGA_CAUSAL_MEMORY_PATH;
    const previousKey = process.env.OMEGA_REALITY_ATTESTATION_KEY;
    process.env.OMEGA_CAUSAL_MEMORY_PATH = memoryPath;
    process.env.OMEGA_REALITY_ATTESTATION_KEY = 'api-causal-test-key';
    try {
      const { createApp } = await import('../../apps/api/dist/index.js');
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
            changeId: 'api-causal-unreadable',
          },
        });
        assert.equal(response.statusCode, 503);
        assert.equal(response.json().error, 'CAUSAL_MEMORY_INTEGRITY_DEGRADED');
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

  it('rate-limits pipeline requests within a bounded one-minute window', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'omega-api-pipeline-rate-limit-'));
    try {
      const { createApp } = await import('../../apps/api/dist/index.js');
      const app = createApp(join(directory, 'ledger.db'), false, { allowUnsignedCycle: true });
      await app.ready();
      try {
        const responses: Array<{ statusCode: number }> = [];
        for (let i = 0; i < 11; i += 1) {
          responses.push(await app.inject({ method: 'POST', url: '/v1/pipeline', payload: {} }));
        }
        assert.equal(responses.slice(0, 10).every((response) => response.statusCode === 400), true);
        assert.equal(responses[10].statusCode, 429);
      } finally {
        await app.close();
      }
    } finally {
      await removeTemporaryDirectory(directory);
    }
  });

  it('preserves the configured admin authorization boundary for the scoped pipeline route', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'omega-api-pipeline-auth-'));
    const previousMode = process.env.OMEGA_AUTH_MODE;
    const previousReadToken = process.env.OMEGA_READ_TOKEN;
    const previousAdminToken = process.env.OMEGA_ADMIN_TOKEN;
    let app: any;

    try {
      process.env.OMEGA_AUTH_MODE = 'required';
      process.env.OMEGA_READ_TOKEN = 'pipeline-read-token';
      process.env.OMEGA_ADMIN_TOKEN = 'pipeline-admin-token';
      const { createApp } = await import('../../apps/api/dist/index.js');
      app = createApp(join(directory, 'ledger.db'), false, { allowUnsignedCycle: true });
      await app.ready();

      const denied = await app.inject({ method: 'POST', url: '/v1/pipeline', payload: {} });
      assert.equal(denied.statusCode, 401);
      assert.equal(denied.json().error, 'ADMIN_ACCESS_REQUIRED');

      const authorized = await app.inject({
        method: 'POST',
        url: '/v1/pipeline',
        headers: { authorization: 'Bearer pipeline-admin-token' },
        payload: {},
      });
      assert.equal(authorized.statusCode, 400);
      assert.equal(authorized.json().error, 'MISSING_COMPILE');
    } finally {
      if (app) await app.close();
      if (previousMode === undefined) delete process.env.OMEGA_AUTH_MODE;
      else process.env.OMEGA_AUTH_MODE = previousMode;
      if (previousReadToken === undefined) delete process.env.OMEGA_READ_TOKEN;
      else process.env.OMEGA_READ_TOKEN = previousReadToken;
      if (previousAdminToken === undefined) delete process.env.OMEGA_ADMIN_TOKEN;
      else process.env.OMEGA_ADMIN_TOKEN = previousAdminToken;
      await removeTemporaryDirectory(directory);
    }
  });
});
