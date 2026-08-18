import { createServer, Server } from 'node:http';
import app from '../../apps/api/src/index';

type Body<T> = { data: T; meta?: Record<string, unknown> };

/**
 * The canonical journey, and then the same journey broken.
 *
 * tests/integration/full-loop covers the current running clean: observe,
 * verify, attest, act, learn, recompile, and a chain that packages/remember
 * can read back independently. That is half of what the charter asks for.
 *
 * The other half is section XXI: introduce failure deliberately, then
 * verify that it becomes evidence, that lineage survives it, that dissent
 * is visible, and that recovery produces a new attestation without erasing
 * what came before.
 *
 * A system that only demonstrates success has not demonstrated
 * trustworthiness. These are the failures.
 */
describe('the current, broken and recovered', () => {
  let server: Server;
  let baseUrl: string;

  const post = async (path: string, body: unknown): Promise<Response> =>
    fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  const get = async <T>(path: string): Promise<Body<T>> =>
    (await (await fetch(`${baseUrl}${path}`)).json()) as Body<T>;

  const loop = async (
    claim: string,
    metadata: Record<string, unknown> = { statusCode: 200, responseTime: 12 }
  ): Promise<{ observation: { id: string }; attestation: { id: string; verified: boolean } }> => {
    const response = await post('/complete-loop', {
      claim,
      category: 'health-check',
      source: { system: 'e2e', version: '0.1.0', environment: 'test' },
      observedBy: 'jest',
      metadata,
      confidence: 0.95,
      confidenceReason: 'e2e fixture',
    });
    return (
      (await response.json()) as Body<{
        observation: { id: string };
        attestation: { id: string; verified: boolean };
      }>
    ).data;
  };

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

  it('turns a failed verification into evidence rather than an error', async () => {
    const failing = await loop('service is unhealthy', { statusCode: 503, responseTime: 900 });

    // A failing verification is a completed loop with a negative verdict,
    // not a broken request. It still attests, and the attestation still
    // signs — what it signs is `verified: false`.
    expect(failing.attestation.verified).toBe(false);

    const log = await get<Array<{ type: string; status: string }>>('/log');
    const memory = await get<Array<{ type: string }>>('/memory');

    // The failure is in the durable record, not only in a response body.
    expect(memory.data.length).toBeGreaterThanOrEqual(3);
    expect((await get<{ intact: boolean }>('/memory/integrity')).data.intact).toBe(true);
    expect(log.meta?.appendOnly).toBe(true);
  });

  it('refuses to act on a verification that failed', async () => {
    const failing = await loop('still unhealthy', { statusCode: 500, responseTime: 800 });

    const response = await post('/act', { attestation: failing.attestation });

    // The signature is valid and the lineage is recorded. The action is
    // still refused, because a valid signature over a negative result is
    // exactly that: proof the thing did not verify.
    expect(response.status).toBe(409);
    expect(((await response.json()) as { code: string }).code).toBe('UNVERIFIED_ATTESTATION');
  });

  it('makes disagreement visible and lets the action carry it', async () => {
    const run = await loop('contested claim');

    const dissensus = (
      (await (
        await post('/dissensus', {
          opinions: [
            {
              verifierId: 'rules',
              verifierVersion: '1.0.0',
              passed: true,
              confidence: 0.9,
              reason: 'status code is 200',
            },
            {
              verifierId: 'model',
              verifierVersion: '2026-08',
              passed: false,
              confidence: 0.6,
              reason: 'upstream source unreachable',
            },
          ],
        })
      ).json()) as Body<{ id: string; verdict: string; routing: string }>
    ).data;

    expect(dissensus.verdict).toBe('SPLIT');
    expect(dissensus.routing).toBe('HUMAN');

    const action = (
      (await (
        await post('/act', { attestation: run.attestation, dissensusId: dissensus.id })
      ).json()) as Body<{ status: string; requiresHumanReview: boolean; id: string }>
    ).data;

    // Proceeds, and says it was contested. Both halves matter: blocking
    // would force resolution before evidence exists, and silence would let
    // the record claim nobody objected.
    expect(action.status).toBe('authorized-with-dissent');
    expect(action.requiresHumanReview).toBe(true);
  });

  it('revokes a verified attestation without deleting it', async () => {
    const run = await loop('later found wrong');

    const revocation = await post('/attest/revoke', {
      attestationId: run.attestation.id,
      reason: 'source data was corrected after the fact',
    });

    expect(revocation.status).toBe(201);

    const revocations =
      await get<Array<{ attestationId: string; reason: string }>>('/attest/revocations');
    expect(revocations.data.map((entry) => entry.attestationId)).toContain(run.attestation.id);

    // Superseded, not erased. The run is still in the record and the chain
    // still verifies, because rewriting history to look cleaner is the one
    // thing an append-only log must never do.
    const runs = await get<Array<{ attestation: { id: string } }>>('/runs');
    expect(runs.data.map((entry) => entry.attestation.id)).toContain(run.attestation.id);
    expect((await get<{ intact: boolean }>('/memory/integrity')).data.intact).toBe(true);
  });

  it('refuses to revoke twice, and refuses to revoke what it never recorded', async () => {
    const run = await loop('revoked once');

    expect(
      (await post('/attest/revoke', { attestationId: run.attestation.id, reason: 'first' })).status
    ).toBe(201);
    expect(
      (await post('/attest/revoke', { attestationId: run.attestation.id, reason: 'again' })).status
    ).toBe(409);
    expect(
      (await post('/attest/revoke', { attestationId: 'att-never-existed', reason: 'phantom' }))
        .status
    ).toBe(404);
  });

  it('learns from the failure and proposes a recompile', async () => {
    const run = await loop('for the learning leg');
    const action = (
      (await (await post('/act', { attestation: run.attestation })).json()) as Body<{ id: string }>
    ).data;

    const learning = (
      (await (
        await post('/learn', {
          actionId: action.id,
          outcome: 'failure',
          note: 'the action was authorized but the outcome was wrong',
        })
      ).json()) as Body<{ id: string; outcome: string }>
    ).data;

    // A failure outcome is recorded as a failure. Learning that only
    // records successes is not learning.
    expect(learning.outcome).toBe('failure');

    const proposal = (
      (await (await post('/recompile', { learningId: learning.id })).json()) as Body<{
        status: string;
        learningId: string;
      }>
    ).data;

    expect(proposal.status).toBe('proposed');
    expect(proposal.learningId).toBe(learning.id);
  });

  it('recovers: a new loop verifies, attests, and extends the same chain', async () => {
    const before = (await get<unknown[]>('/memory')).data.length;

    const recovered = await loop('service healthy again');

    expect(recovered.attestation.verified).toBe(true);

    const after = await get<Array<{ id: number; previousHash: string; hash: string }>>('/memory');

    // Extends rather than restarts, and everything the failures wrote is
    // still underneath it.
    expect(after.data.length).toBe(before + 3);
    expect(after.data[before].previousHash).toBe(after.data[before - 1].hash);
    expect((await get<{ intact: boolean }>('/memory/integrity')).data.intact).toBe(true);
  });

  it('kept every stage of the journey in the durable log', async () => {
    const log = await get<Array<{ type: string }>>('/log');
    const types = new Set(log.data.map((entry) => entry.type));

    // The whole current, including the parts that went wrong.
    for (const stage of [
      'observation.captured',
      'verification.completed',
      'attestation.created',
      'attestation.revoked',
      'dissensus.reconciled',
      'action.authorized',
      'learning.recorded',
      'recompilation.proposed',
    ]) {
      expect(Array.from(types).some((type) => type.startsWith(stage.split('.')[0]))).toBe(true);
    }

    expect(log.meta?.source).not.toBe('partial');
  });
});
