import { createServer, Server } from 'node:http';
import app from '../../apps/api/src/index';

describe('verification loop integration', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === 'string')
      throw new Error('Integration server did not start');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  });

  it('preserves evidence from observation through attestation and action', async () => {
    const loopResponse = await fetch(`${baseUrl}/complete-loop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-request-id': 'integration-1' },
      body: JSON.stringify({
        claim: 'Integration service is healthy',
        category: 'health-check',
        source: { system: 'integration-test', version: '0.1.0', environment: 'test' },
        observedBy: 'integration-suite',
        metadata: { responseTime: 42, statusCode: 200 },
        confidence: 0.95,
        confidenceReason: 'Integration evidence',
      }),
    });
    const loop = (await loopResponse.json()) as {
      data: {
        observation: { id: string };
        verification: { summary: { passed: boolean }; evidencePath: Array<{ passed: boolean }> };
        attestation: { id: string; verified: boolean };
      };
    };

    expect(loopResponse.status).toBe(201);
    expect(loopResponse.headers.get('x-request-id')).toBe('integration-1');
    expect(loop.data.observation.id).toMatch(/^obs-/);
    expect(loop.data.verification.summary.passed).toBe(true);
    expect(loop.data.verification.evidencePath.every((step) => step.passed)).toBe(true);
    expect(loop.data.attestation.verified).toBe(true);

    const attestationResponse = await fetch(`${baseUrl}/attest/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attestation: loop.data.attestation }),
    });
    const attestation = (await attestationResponse.json()) as { data: { valid: boolean } };
    expect(attestationResponse.status).toBe(200);
    expect(attestation.data.valid).toBe(true);

    const actionResponse = await fetch(`${baseUrl}/act`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attestation: loop.data.attestation }),
    });
    const action = (await actionResponse.json()) as { data: { status: string } };
    expect(actionResponse.status).toBe(201);
    expect(action.data.status).toBe('authorized');
  });

  it('keeps invalid transitions explicit at the runtime boundary', async () => {
    const requests: Array<{ path: string; body?: Record<string, unknown> }> = [
      { path: '/observe', body: {} },
      { path: '/verify', body: {} },
      { path: '/attest', body: {} },
      { path: '/attest/verify', body: {} },
      { path: '/act', body: {} },
      { path: '/act', body: { attestation: { signature: 'invalid' } } },
      { path: '/learn', body: { actionId: 'missing', outcome: 'unknown' } },
      { path: '/learn', body: { actionId: 'missing', outcome: 'success' } },
      { path: '/recompile', body: {} },
    ];

    const responses = await Promise.all(
      requests.map(({ path, body }) =>
        fetch(`${baseUrl}${path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      )
    );

    expect(responses.map((response) => response.status)).toEqual([
      400, 400, 400, 400, 400, 403, 400, 404, 404,
    ]);

    const rulesResponse = await fetch(`${baseUrl}/rules`);
    const missingResponse = await fetch(`${baseUrl}/missing`);
    expect(rulesResponse.status).toBe(200);
    expect(missingResponse.status).toBe(404);
  });
});
