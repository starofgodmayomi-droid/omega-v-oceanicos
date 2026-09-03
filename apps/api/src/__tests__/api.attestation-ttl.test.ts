import { createServer, Server } from 'node:http';

/**
 * `/act` refuses to authorize an action against an attestation that has
 * expired under the configured TTL — a real freshness guarantee, not just a
 * signature check. Nothing in the suite ever configured a TTL, so this
 * branch had never run: every other test either leaves the TTL unset
 * (`isAttestationExpired` short-circuits to `false`) or checks the pure
 * `isAttestationExpired` function directly rather than the live endpoint.
 * A TTL of 1ms means a freshly attested loop is already expired by the time
 * the follow-up `/act` request lands, without needing to tamper the
 * attestation (which would just fail signature verification instead).
 */
describe('API attestation TTL enforcement', () => {
  let app: Parameters<typeof createServer>[0];
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.OMEGA_PERSISTENCE = 'off';
    process.env.OMEGA_ATTESTATION_TTL_MS = '1';
    delete process.env.OMEGA_ATTESTATION_ALGORITHM;

    app = (await import('../server')).default;
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

  it('refuses to authorize an action against an attestation older than the configured TTL', async () => {
    const loopResponse = await fetch(`${baseUrl}/complete-loop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claim: 'attestation TTL enforcement is executable',
        category: 'health-check',
        source: { system: 'ttl-test', version: '0.1.0', environment: 'test' },
        observedBy: 'jest',
        metadata: { responseTime: 42, statusCode: 200 },
        confidence: 0.99,
        confidenceReason: 'Executable attestation TTL test',
      }),
    });
    const loopBody = (await loopResponse.json()) as {
      data: { attestation: Record<string, unknown> };
    };
    expect(loopResponse.status).toBe(201);

    // 1ms TTL: by the time this second request is made and handled, the
    // attestation signed above is already older than the configured window.
    await new Promise((resolve) => setTimeout(resolve, 10));

    const actResponse = await fetch(`${baseUrl}/act`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attestation: loopBody.data.attestation }),
    });
    const actBody = (await actResponse.json()) as { code: string };

    expect(actResponse.status).toBe(409);
    expect(actBody.code).toBe('EXPIRED_ATTESTATION');
  });

  it('treats a malformed TTL as unbounded rather than as an immediate expiry', async () => {
    // configuredAttestationTtlMs() re-reads OMEGA_ATTESTATION_TTL_MS on every
    // call rather than caching it at boot, so mutating it here for a single
    // request is genuine coverage of the live route, not a stale fixture.
    const loopResponse = await fetch(`${baseUrl}/complete-loop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claim: 'invalid TTL falls back to unbounded',
        category: 'health-check',
        source: { system: 'ttl-test', version: '0.1.0', environment: 'test' },
        observedBy: 'jest',
        metadata: { responseTime: 42, statusCode: 200 },
        confidence: 0.99,
        confidenceReason: 'Executable invalid-TTL fallback test',
      }),
    });
    const loopBody = (await loopResponse.json()) as {
      data: { attestation: Record<string, unknown> };
    };
    expect(loopResponse.status).toBe(201);

    await new Promise((resolve) => setTimeout(resolve, 10));

    const previousTtl = process.env.OMEGA_ATTESTATION_TTL_MS;
    for (const invalidValue of ['not-a-number', '0', '-5']) {
      process.env.OMEGA_ATTESTATION_TTL_MS = invalidValue;
      try {
        const policyResponse = await fetch(`${baseUrl}/attest/policy`);
        const policy = (await policyResponse.json()) as {
          data: { attestationTtlMs: number | null };
        };
        expect(policyResponse.status).toBe(200);
        expect(policy.data.attestationTtlMs).toBeNull();

        const actResponse = await fetch(`${baseUrl}/act`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attestation: loopBody.data.attestation }),
        });
        const actBody = (await actResponse.json()) as { data?: { status: string }; code?: string };

        expect(actBody.code).not.toBe('EXPIRED_ATTESTATION');
        expect(actResponse.status).toBe(201);
        expect(actBody.data?.status).toBe('authorized');
      } finally {
        process.env.OMEGA_ATTESTATION_TTL_MS = previousTtl;
      }
    }
  });
});
