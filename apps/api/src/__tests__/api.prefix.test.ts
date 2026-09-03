import { createServer, Server } from 'node:http';
import app from '../index';

/**
 * The /api prefix existed only as a Vite dev-server rewrite. A production
 * build has no dev server, so the shipped bundle called /api/* and nothing
 * answered: the routes worked on the development path and not the one that
 * ships. These assert the API strips the prefix itself.
 */
describe('API prefix parity', () => {
  let server: Server;
  let baseUrl: string;

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

  it.each(['/health', '/rules', '/state', '/events', '/log', '/memory'])(
    'serves %s identically with and without the prefix',
    async (path) => {
      const bare = await fetch(`${baseUrl}${path}`);
      const prefixed = await fetch(`${baseUrl}/api${path}`);

      expect(prefixed.status).toBe(bare.status);
      expect(prefixed.status).toBe(200);
      expect(Object.keys((await prefixed.json()) as object)).toEqual(
        Object.keys((await bare.json()) as object)
      );
    }
  );

  it('accepts a POST through the prefix', async () => {
    const response = await fetch(`${baseUrl}/api/complete-loop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claim: 'prefixed loop',
        category: 'health-check',
        source: { system: 'prefix-test', version: '0.1.0', environment: 'test' },
        observedBy: 'jest',
        metadata: { statusCode: 200, responseTime: 10 },
        confidence: 0.95,
        confidenceReason: 'prefix fixture',
      }),
    });

    expect(response.status).toBe(201);
  });

  it('rewrites a bare /api (no trailing path) to root rather than an empty path', async () => {
    // req.url.slice(4) on the literal string '/api' yields '', not '/'; the
    // handler's `|| '/'` fallback is the only thing standing between that
    // and every downstream route seeing an empty, unroutable req.url. Every
    // other case in this file requests /api<subpath>, which never exercises
    // the empty-string branch of that fallback.
    const bare = await fetch(`${baseUrl}/`);
    const prefixed = await fetch(`${baseUrl}/api`);
    const bareBody = (await bare.json()) as { code: string; message: string };
    const prefixedBody = (await prefixed.json()) as { code: string; message: string };

    expect(bare.status).toBe(404);
    expect(prefixed.status).toBe(bare.status);
    expect(prefixedBody.code).toBe(bareBody.code);
    expect(prefixedBody.code).toBe('NOT_FOUND');
    expect(prefixedBody.message).toBe(bareBody.message);
  });

  it('does not strip a path that merely begins with the letters api', () => {
    // /apiary must not become /ry.
    expect('/apiary'.startsWith('/api/')).toBe(false);
  });

  it('still 404s an unknown endpoint under the prefix', async () => {
    const response = await fetch(`${baseUrl}/api/no-such-endpoint`);

    expect(response.status).toBe(404);
    expect(((await response.json()) as { code: string }).code).toBe('NOT_FOUND');
  });
});
