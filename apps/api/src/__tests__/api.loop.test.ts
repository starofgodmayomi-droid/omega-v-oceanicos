import { createServer, Server } from 'node:http';
import app from '../index';

type Body<T> = { data: T; meta?: Record<string, unknown> };
type Attestation = { id: string; verified: boolean; signature: string };
type Memory = { id: string; observationId: string; verificationId: string };
type Loop = {
  observation: { id: string };
  verification: unknown;
  memory: Memory;
  attestation: Attestation;
};
type Action = { id: string; action: string; attestationId: string; status: string };
type Learning = { id: string; actionId: string; outcome: string };
type Proposal = { id: string; learningId: string; version: string; status: string };

/**
 * The back half of the loop — Act → Learn → Recompile — had never been
 * exercised end to end. Every success path in those three endpoints was
 * unreached, so the runtime lineage they enforce was unverified.
 */
describe('API loop: act, learn, recompile', () => {
  let server: Server;
  let baseUrl: string;

  const post = async (path: string, body: unknown): Promise<Response> =>
    fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  const loopInput = (claim: string, metadata: Record<string, unknown>) => ({
    claim,
    category: 'health-check',
    source: { system: 'loop-test', version: '0.1.0', environment: 'test' },
    observedBy: 'jest',
    metadata,
    confidence: 0.95,
    confidenceReason: 'loop fixture',
  });

  beforeAll(async () => {
    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server did not start');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  });

  it('carries a passing observation through act, learn and recompile', async () => {
    const loop = (await (
      await post('/complete-loop', loopInput('healthy', { statusCode: 200, responseTime: 12 }))
    ).json()) as Body<Loop>;

    expect(loop.data.attestation.verified).toBe(true);

    const actResponse = await post('/act', { attestation: loop.data.attestation });
    const act = (await actResponse.json()) as Body<Action>;

    expect(actResponse.status).toBe(201);
    expect(act.data.status).toBe('authorized');
    expect(act.data.action).toBe('record-verified-result');
    expect(act.data.attestationId).toBe(loop.data.attestation.id);

    const actions = (await (await fetch(`${baseUrl}/actions`)).json()) as Body<Action[]>;
    expect(actions.data.map((entry) => entry.id)).toContain(act.data.id);

    const learnResponse = await post('/learn', {
      actionId: act.data.id,
      outcome: 'success',
      note: 'verified end to end',
    });
    const learn = (await learnResponse.json()) as Body<Learning>;

    expect(learnResponse.status).toBe(201);
    expect(learn.data.actionId).toBe(act.data.id);

    const learning = (await (await fetch(`${baseUrl}/learning`)).json()) as Body<Learning[]>;
    expect(learning.data.map((entry) => entry.id)).toContain(learn.data.id);

    const recompileResponse = await post('/recompile', { learningId: learn.data.id });
    const recompile = (await recompileResponse.json()) as Body<Proposal>;

    expect(recompileResponse.status).toBe(201);
    expect(recompile.data.status).toBe('proposed');
    expect(recompile.data.learningId).toBe(learn.data.id);
    expect(recompile.data.version).toBe('proposal-1');

    const proposals = (await (await fetch(`${baseUrl}/recompilations`)).json()) as Body<Proposal[]>;
    expect(proposals.data.map((entry) => entry.id)).toContain(recompile.data.id);
  });

  it('accepts a named action rather than only the default', async () => {
    const loop = (await (
      await post('/complete-loop', loopInput('named action', { statusCode: 200, responseTime: 8 }))
    ).json()) as Body<Loop>;

    const act = (await (
      await post('/act', { attestation: loop.data.attestation, action: 'notify-operator' })
    ).json()) as Body<Action>;

    expect(act.data.action).toBe('notify-operator');
  });

  it('records a failure outcome without pretending it passed', async () => {
    const loop = (await (
      await post('/complete-loop', loopInput('for failure', { statusCode: 200, responseTime: 5 }))
    ).json()) as Body<Loop>;
    const act = (await (
      await post('/act', { attestation: loop.data.attestation })
    ).json()) as Body<Action>;

    const learn = (await (
      await post('/learn', { actionId: act.data.id, outcome: 'failure' })
    ).json()) as Body<Learning>;

    expect(learn.data.outcome).toBe('failure');
  });

  it('refuses an attestation with no recorded runtime lineage', async () => {
    const loop = (await (
      await post('/complete-loop', loopInput('lineage', { statusCode: 200, responseTime: 9 }))
    ).json()) as Body<Loop>;

    const detached = (await (
      await post('/attest', {
        verificationResult: {
          id: 'ver-detached',
          observationId: 'obs-detached',
          timestamp: '2026-08-15T00:00:00.000Z',
          summary: {
            passed: true,
            confidence: 0.9,
            rulesApplied: 1,
            rulesPassed: 1,
            rulesFailed: 0,
          },
          rules: [{ name: 'status-code-check', passed: true, confidence: 0.9 }],
          evidencePath: [],
          ruleVersions: { 'status-code-check': '1.0.0' },
          status: 'completed',
        },
      })
    ).json()) as Body<Attestation>;

    const response = await post('/act', { attestation: detached.data });

    expect(response.status).toBe(404);
    expect(((await response.json()) as { code: string }).code).toBe('ATTESTATION_NOT_RECORDED');
    expect(detached.data.id).not.toBe(loop.data.attestation.id);
  });

  it('refuses to act on a recorded but unverified attestation', async () => {
    const failing = (await (
      await post('/complete-loop', loopInput('unhealthy', { statusCode: 500, responseTime: 900 }))
    ).json()) as Body<Loop>;

    expect(failing.data.attestation.verified).toBe(false);

    const response = await post('/act', { attestation: failing.data.attestation });

    expect(response.status).toBe(409);
    expect(((await response.json()) as { code: string }).code).toBe('UNVERIFIED_ATTESTATION');
  });

  it('verifies and rejects attestation signatures', async () => {
    const loop = (await (
      await post('/complete-loop', loopInput('signature', { statusCode: 200, responseTime: 7 }))
    ).json()) as Body<Loop>;

    const valid = (await (
      await post('/attest/verify', { attestation: loop.data.attestation })
    ).json()) as Body<{ valid: boolean }>;
    expect(valid.data.valid).toBe(true);

    const tampered = { ...loop.data.attestation, verified: !loop.data.attestation.verified };
    const invalid = (await (
      await post('/attest/verify', { attestation: tampered })
    ).json()) as Body<{ valid: boolean }>;
    expect(invalid.data.valid).toBe(false);
  });

  it('serves the append-only log and declares how the read went', async () => {
    const response = await fetch(`${baseUrl}/log`);
    const body = (await response.json()) as Body<unknown[]>;

    expect(response.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.meta?.appendOnly).toBe(true);
    expect(['disabled', 'missing', 'restored', 'partial']).toContain(body.meta?.source);
    expect(body.meta?.skipped).toBe(0);
  });

  it('declares the bound on the recent event window', async () => {
    const body = (await (await fetch(`${baseUrl}/events`)).json()) as Body<unknown[]>;

    expect(body.meta?.window).toBe(40);
    expect(String(body.meta?.note)).toContain('/log');
  });

  it('returns a structured 404 for an unknown endpoint', async () => {
    const response = await fetch(`${baseUrl}/no-such-endpoint`);

    expect(response.status).toBe(404);
    expect(((await response.json()) as { code: string }).code).toBe('NOT_FOUND');
  });

  it('exposes the MINI kernel memory step in complete-loop response', async () => {
    const loop = (await (
      await post('/complete-loop', loopInput('memory exposed', { statusCode: 200, responseTime: 42 }))
    ).json()) as Body<Loop>;

    expect(loop.data.memory).toBeDefined();
    expect(loop.data.memory.id).toBeDefined();
    expect(loop.data.memory.observationId).toBe(loop.data.observation.id);
    expect(loop.data.memory.verificationId).toBeDefined();
  });
});
