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
});
