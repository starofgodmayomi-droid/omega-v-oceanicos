import { createServer, Server } from 'node:http';
import app from '../index';

type Body<T> = { data: T; meta?: Record<string, unknown> };
type Recorded = {
  id: string;
  verdict: 'AGREED' | 'SPLIT' | 'UNKNOWN';
  routing: 'AUTO' | 'HUMAN';
  dissenting: Array<{ verifierId: string }>;
};
type Action = {
  id: string;
  status: string;
  dissensusId: string | null;
  requiresHumanReview: boolean;
  dissent: { verdict: string; dissenting: Array<{ verifierId: string }> } | null;
};

const opinion = (over: Record<string, unknown> = {}) => ({
  verifierId: 'rules',
  verifierVersion: '1.0.0',
  passed: true,
  confidence: 0.95,
  reason: 'fixture',
  ...over,
});

/**
 * A split does not stop the loop; it rides along with the action.
 *
 * Blocking would force resolution before evidence exists. Erasing the
 * objection would let the record claim the action was uncontested. These
 * assert the third option: proceed, and carry the disagreement.
 */
describe('API dissensus', () => {
  let server: Server;
  let baseUrl: string;

  const post = async (path: string, body: unknown): Promise<Response> =>
    fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  const loop = async (claim: string): Promise<{ attestation: { id: string } }> => {
    const response = await post('/complete-loop', {
      claim,
      category: 'health-check',
      source: { system: 'dissensus-test', version: '0.1.0', environment: 'test' },
      observedBy: 'jest',
      metadata: { statusCode: 200, responseTime: 10 },
      confidence: 0.95,
      confidenceReason: 'fixture',
    });
    return ((await response.json()) as Body<{ attestation: { id: string } }>).data;
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

  it('records agreement and routes it automatically', async () => {
    const response = await post('/dissensus', {
      opinions: [opinion(), opinion({ verifierId: 'model', confidence: 0.9 })],
    });
    const body = (await response.json()) as Body<Recorded>;

    expect(response.status).toBe(201);
    expect(body.data.verdict).toBe('AGREED');
    expect(body.data.routing).toBe('AUTO');
  });

  it('records a split without choosing a side', async () => {
    const body = (await (
      await post('/dissensus', {
        opinions: [
          opinion({ verifierId: 'rules', passed: true }),
          opinion({ verifierId: 'model', passed: true }),
          opinion({ verifierId: 'second-model', passed: false, reason: 'contradicted' }),
        ],
      })
    ).json()) as Body<Recorded>;

    // 2-1 is not a decision.
    expect(body.data.verdict).toBe('SPLIT');
    expect(body.data.routing).toBe('HUMAN');
    expect(body.data.dissenting.map((entry) => entry.verifierId)).toEqual(['second-model']);
  });

  it('rejects a body without opinions', async () => {
    const response = await post('/dissensus', {});

    expect(response.status).toBe(400);
    expect(((await response.json()) as { code: string }).code).toBe('MISSING_OPINIONS');
  });

  it('lists reconciliations and counts the unresolved ones', async () => {
    const body = (await (await fetch(`${baseUrl}/dissensus`)).json()) as Body<Recorded[]>;

    expect(body.data.length).toBeGreaterThanOrEqual(2);
    expect(body.meta?.unresolved).toBeGreaterThanOrEqual(1);
  });

  it('authorizes an action over recorded dissent, carrying the objection', async () => {
    const run = await loop('contested claim');
    const dissensus = (await (
      await post('/dissensus', {
        opinions: [
          opinion({ verifierId: 'rules', passed: true }),
          opinion({ verifierId: 'model', passed: false, reason: 'source unreachable' }),
        ],
      })
    ).json()) as Body<Recorded>;

    const response = await post('/act', {
      attestation: run.attestation,
      dissensusId: dissensus.data.id,
    });
    const action = (await response.json()) as Body<Action>;

    expect(response.status).toBe(201);
    expect(action.data.status).toBe('authorized-with-dissent');
    expect(action.data.dissensusId).toBe(dissensus.data.id);
    expect(action.data.requiresHumanReview).toBe(true);
    expect(action.data.dissent?.dissenting.map((entry) => entry.verifierId)).toContain('model');
  });

  it('records a plain authorization when the verifiers agreed', async () => {
    const run = await loop('uncontested claim');
    const dissensus = (await (
      await post('/dissensus', {
        opinions: [opinion(), opinion({ verifierId: 'model' })],
      })
    ).json()) as Body<Recorded>;

    const action = (await (
      await post('/act', { attestation: run.attestation, dissensusId: dissensus.data.id })
    ).json()) as Body<Action>;

    expect(action.data.status).toBe('authorized');
    expect(action.data.requiresHumanReview).toBe(false);
  });

  it('still authorizes when no reconciliation is referenced at all', async () => {
    const run = await loop('unreconciled claim');

    const action = (await (
      await post('/act', { attestation: run.attestation })
    ).json()) as Body<Action>;

    expect(action.data.status).toBe('authorized');
    expect(action.data.dissensusId).toBeNull();
    expect(action.data.dissent).toBeNull();
  });

  it('refuses a dissensusId with no recorded lineage', async () => {
    const run = await loop('phantom reconciliation');

    const response = await post('/act', {
      attestation: run.attestation,
      dissensusId: 'dis-never-recorded',
    });

    // Same discipline as an attestation without lineage: a reference to
    // something that was never recorded is not evidence of review.
    expect(response.status).toBe(404);
    expect(((await response.json()) as { code: string }).code).toBe('DISSENSUS_NOT_RECORDED');
  });
});
