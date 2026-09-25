/**
 * Contract smoke for POST /v1/pipeline.
 * Full C0→C6 logic is covered by packages/mini + integration tests;
 * this proves the HTTP surface is registered and fail-closed on bad input.
 */
import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { createApp } from '../index';
import type { FastifyInstance } from 'fastify';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('POST /v1/pipeline', () => {
  let app: FastifyInstance;
  let dir: string;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'omega-pipeline-api-'));
    app = createApp(join(dir, 'test.db'), false, { allowUnsignedCycle: true });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('rejects missing compile body', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/pipeline', payload: {} });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('MISSING_COMPILE');
  });

  it('runs full pipeline to VERIFIED when gates and observation align', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/pipeline',
      payload: {
        compile: {
          intent: 'api pipeline test',
          subject: 'api:test',
          stateBefore: 'S0',
          evidenceRefs: [{ id: 'e1', kind: 'test', source: 'jest', digest: 'sha256:api' }],
          policyRefs: [{ id: 'policy:api', version: '1', requirement: 'gates' }],
          workerPlan: [{
            workerId: 'api-worker',
            version: '1.0.0',
            capability: 'local-state',
            mode: 'local-mutating',
            approvalRequired: false,
          }],
          transition: { requestedStateAfter: 'S1', consequence: 'ok', dryRun: false },
          observation: { observerId: 'api-obs', targets: ['api:test'], evidenceRequired: ['state'] },
        },
        admission: { authorityVerified: true, policySatisfied: true },
        authority: 'human:api-test',
        policy: 'policy:api',
        handlerStateAfter: 'S1',
        observedState: 'S1',
        changeId: 'change-api-pipeline-1',
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.pipeline.stage).toBe('OBSERVE');
    expect(body.pipeline.realityStatus).toBe('VERIFIED');
    expect(body.pipeline.halted).toBe(false);
    expect(body.pipeline.provenanceRoot).toMatch(/^prov-root-[a-f0-9]{64}$/);
  });
});
