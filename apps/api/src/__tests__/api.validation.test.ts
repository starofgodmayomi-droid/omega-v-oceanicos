import { createServer, Server } from 'node:http';
import app from '../index';

type ErrorBody = { code: string; message: string; timestamp: string };

/**
 * The API's rejection paths were entirely untested: every guard that returns
 * 400/403/404 was dead weight as far as CI was concerned. A verification-first
 * service that has never proven it refuses bad input is asserting, not
 * attesting.
 */
describe('API validation guards', () => {
  let server: Server;
  let baseUrl: string;

  const post = async (path: string, body: unknown): Promise<Response> =>
    fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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

  it('serves health and the empty runtime collections', async () => {
    const health = await fetch(`${baseUrl}/health`);
    expect(health.status).toBe(200);
    expect(((await health.json()) as { data: { status: string } }).data.status).toBe('ok');

    for (const path of ['/actions', '/learning', '/recompilations']) {
      const response = await fetch(`${baseUrl}${path}`);
      expect(response.status).toBe(200);
      expect(Array.isArray(((await response.json()) as { data: unknown[] }).data)).toBe(true);
    }
  });

  it('rejects /verify without an observation', async () => {
    const response = await post('/verify', {});
    expect(response.status).toBe(400);
    expect(((await response.json()) as ErrorBody).code).toBe('MISSING_OBSERVATION');
  });

  it('rejects /attest without a verification result', async () => {
    const response = await post('/attest', {});
    expect(response.status).toBe(400);
    expect(((await response.json()) as ErrorBody).code).toBe('MISSING_VERIFICATION');
  });

  it('rejects /act without an attestation', async () => {
    const response = await post('/act', {});
    expect(response.status).toBe(400);
    expect(((await response.json()) as ErrorBody).code).toBe('MISSING_ATTESTATION');
  });

  it('denies /act when the attestation signature does not verify', async () => {
    const forged = {
      id: 'att-forged-1',
      verificationId: 'ver-forged-1',
      observationId: 'obs-forged-1',
      verified: true,
      confidence: 1,
      signature: `0x${'0'.repeat(64)}`,
      signingKey: 'sha256:0000000000000000',
      keyVersion: '1',
      signingAlgorithm: 'HMAC-SHA256',
      attestedAt: '2026-08-14T00:00:00.000Z',
      attestedBy: 'forger',
      ruleVersions: {},
      status: 'signed',
    };

    const response = await post('/act', { attestation: forged });
    expect(response.status).toBe(403);
    expect(((await response.json()) as ErrorBody).code).toBe('INVALID_ATTESTATION');
  });

  it('rejects /learn without an actionId or outcome', async () => {
    const response = await post('/learn', {});
    expect(response.status).toBe(400);
    expect(((await response.json()) as ErrorBody).code).toBe('INVALID_LEARNING');
  });

  it('rejects /learn with an outcome outside the allowed set', async () => {
    const response = await post('/learn', { actionId: 'act-1', outcome: 'maybe' });
    expect(response.status).toBe(400);
    expect(((await response.json()) as ErrorBody).code).toBe('INVALID_LEARNING');
  });

  it('rejects /learn referencing an unknown action', async () => {
    const response = await post('/learn', { actionId: 'act-does-not-exist', outcome: 'success' });
    expect(response.status).toBe(404);
    expect(((await response.json()) as ErrorBody).code).toBe('ACTION_NOT_FOUND');
  });

  it('rejects /recompile referencing an unknown learning', async () => {
    const response = await post('/recompile', { learningId: 'learn-does-not-exist' });
    expect(response.status).toBe(404);
    expect(((await response.json()) as ErrorBody).code).toBe('LEARNING_NOT_FOUND');
  });

  it('rejects /recompile with no learningId at all', async () => {
    const response = await post('/recompile', {});
    expect(response.status).toBe(404);
    expect(((await response.json()) as ErrorBody).code).toBe('LEARNING_NOT_FOUND');
  });

  describe('GET /rules', () => {
    type RulesBody = {
      data: {
        count: number;
        registered: number;
        category: string | null;
        rules: Array<{ name: string; appliesTo: string[] }>;
      };
    };

    it('reports the rules that are actually registered', async () => {
      const response = await fetch(`${baseUrl}/rules`);
      const body = (await response.json()) as RulesBody;

      expect(response.status).toBe(200);
      expect(body.data.count).toBeGreaterThan(0);
      expect(body.data.count).toBe(body.data.registered);
      expect(body.data.category).toBeNull();
      expect(body.data.rules.map((r) => r.name).sort()).toEqual([
        'response-time-threshold',
        'status-code-check',
      ]);
    });

    it('filters to the rules applying to a given category', async () => {
      const response = await fetch(`${baseUrl}/rules?category=health-check`);
      const body = (await response.json()) as RulesBody;

      expect(body.data.category).toBe('health-check');
      expect(body.data.count).toBe(2);
      expect(body.data.registered).toBe(2);
    });

    it('returns no rules for a category nothing applies to', async () => {
      const response = await fetch(`${baseUrl}/rules?category=nothing-matches-this`);
      const body = (await response.json()) as RulesBody;

      expect(body.data.count).toBe(0);
      expect(body.data.rules).toEqual([]);
      expect(body.data.registered).toBe(2);
    });
  });

  /**
   * These four never ran under test. The three POST catch blocks exist to
   * turn a thrown validation error from the underlying observer, verification,
   * or attestation package into a structured 400 rather than an unhandled
   * exception — a guarantee this service makes and had never demonstrated.
   * The Ed25519 discovery endpoint's failure mode (asked for a public key
   * this server is not configured to have) was covered only in its success
   * form, under the Ed25519-specific test file.
   */
  it('reports Ed25519 trust as unavailable when the configured algorithm is HMAC', async () => {
    const response = await fetch(`${baseUrl}/attest/public-key`);
    expect(response.status).toBe(503);
    expect(((await response.json()) as ErrorBody).code).toBe('ED25519_TRUST_UNAVAILABLE');
  });

  it('reports a structured error when an observation fails validation', async () => {
    const response = await post('/observe', {
      claim: 'malformed confidence type',
      source: { system: 'validation-test', version: '0.1.0', environment: 'test' },
      observedBy: 'jest',
      metadata: {},
      confidence: 'not-a-number',
      confidenceReason: 'exercising the observation validation catch branch',
    });
    expect(response.status).toBe(400);
    expect(((await response.json()) as ErrorBody).code).toBe('OBSERVATION_FAILED');
  });

  it('reports a structured error when verification is given an observation with no claim', async () => {
    const response = await post('/verify', { observation: { id: 'obs-malformed' } });
    expect(response.status).toBe(400);
    expect(((await response.json()) as ErrorBody).code).toBe('VERIFICATION_FAILED');
  });

  it('reports a structured error when attestation is given a verification result with no summary', async () => {
    const response = await post('/attest', { verificationResult: { id: 'ver-malformed' } });
    expect(response.status).toBe(400);
    expect(((await response.json()) as ErrorBody).code).toBe('ATTESTATION_FAILED');
  });

  describe('POST /attest/revoke validation', () => {
    const originalAllowlist = process.env.OMEGA_ADMIN_OPERATOR_ALLOWLIST;

    afterEach(() => {
      if (originalAllowlist === undefined) {
        delete process.env.OMEGA_ADMIN_OPERATOR_ALLOWLIST;
      } else {
        process.env.OMEGA_ADMIN_OPERATOR_ALLOWLIST = originalAllowlist;
      }
    });

    it('rejects a revocation from an operator outside the configured allowlist', async () => {
      process.env.OMEGA_ADMIN_OPERATOR_ALLOWLIST = 'trusted-operator';

      const response = await post('/attest/revoke', {
        attestationId: 'att-1',
        reason: 'operator not on the allowlist',
        operatorId: 'untrusted-operator',
      });
      const body = (await response.json()) as ErrorBody;

      expect(response.status).toBe(403);
      expect(body.code).toBe('ADMIN_OPERATOR_NOT_ALLOWED');
    });

    it('rejects a revocation missing attestationId or reason', async () => {
      const response = await post('/attest/revoke', {});
      const body = (await response.json()) as ErrorBody;

      expect(response.status).toBe(400);
      expect(body.code).toBe('MISSING_REVOCATION_DETAILS');
    });

    it('rejects revoking an attestation with no recorded runtime lineage', async () => {
      const response = await post('/attest/revoke', {
        attestationId: 'att-never-completed-a-run',
        reason: 'attestation was never part of a completed run',
      });
      const body = (await response.json()) as ErrorBody;

      expect(response.status).toBe(404);
      expect(body.code).toBe('ATTESTATION_NOT_RECORDED');
    });
  });
});
