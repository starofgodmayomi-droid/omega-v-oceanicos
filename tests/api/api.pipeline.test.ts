import '../helpers/node-env.ts';
/**
 * Contract smoke for POST /v1/pipeline.
 * Full C0→C6 logic is covered by packages/mini + integration tests;
 * this proves the HTTP surface is registered and fail-closed on bad input.
 */
import { describe, expect, it, beforeAll, afterAll } from '../helpers/expect.ts';
import { createApp } from '../../apps/api/dist/index.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const verifiedCompile = {
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
};

describe('POST /v1/pipeline', () => {
  let app: ReturnType<typeof createApp>;
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

  it('rejects caller-supplied admission gates before execution', async () => {
    const calls: string[] = [];
    const accepting = createApp(join(dir, 'accepting.db'), false, {
      allowUnsignedCycle: true,
      pipelineAdmissionEvidence: () => {
        calls.push('resolver');
        return { authorityVerified: true, policySatisfied: true };
      },
    });
    await accepting.ready();
    try {
      const res = await accepting.inject({
        method: 'POST',
        url: '/v1/pipeline',
        payload: {
          compile: verifiedCompile,
          admission: { authorityVerified: true, policySatisfied: true },
          authority: 'human:api-test',
          policy: 'policy:api',
          handlerStateAfter: 'S1',
          observedState: 'S1',
          changeId: 'change-api-pipeline-client-gates',
        },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe('PIPELINE_ADMISSION_EVIDENCE_NOT_ACCEPTED');
      expect(calls).toEqual([]);
    } finally {
      await accepting.close();
    }
  });

  it('halts at admission when the server has no admission evidence', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/pipeline',
      payload: {
        compile: verifiedCompile,
        admission: {},
        authority: 'human:api-test',
        policy: 'policy:api',
        handlerStateAfter: 'S1',
        observedState: 'S1',
        changeId: 'change-api-pipeline-unverified',
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.pipeline.stage).toBe('ADMIT');
    expect(body.pipeline.halted).toBe(true);
    expect(body.pipeline.haltReason).toBe('DENIED');
    expect(body.pipeline.decision).toBe('DENY');
    expect(body.pipeline.authorized).toBe(false);
    expect(body.pipeline.executionStatus).toBeNull();
    expect(body.pipeline.realityStatus).toBeNull();
    expect(body.pipeline.waterFlow.length).toBeGreaterThan(0);
  });

  it('runs the pipeline to VERIFIED only when the server supplies admission evidence', async () => {
    const accepting = createApp(join(dir, 'verified.db'), false, {
      allowUnsignedCycle: true,
      pipelineAdmissionEvidence: () => ({ authorityVerified: true, policySatisfied: true }),
    });
    await accepting.ready();
    try {
      const res = await accepting.inject({
        method: 'POST',
        url: '/v1/pipeline',
        payload: {
          compile: verifiedCompile,
          admission: {},
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
      // The C0→C6 run ends at reconcile, which is where reality is compared.
      expect(body.pipeline.stage).toBe('RECONCILE');
      expect(body.pipeline.realityStatus).toBe('VERIFIED');
      expect(body.pipeline.halted).toBe(false);
      expect(body.pipeline.provenanceRoot).toMatch(/^prov-root-[a-f0-9]{64}$/);
    } finally {
      await accepting.close();
    }
  });
});
