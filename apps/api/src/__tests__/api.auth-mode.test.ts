import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Express } from 'express';

const requireFromModule = createRequire(__filename);

type LoadedApi = {
  app: Express;
  missingRequiredAuthTokens: (
    mode: 'local' | 'required',
    readToken?: string,
    adminToken?: string
  ) => string[];
  invalidRequiredAuthTokenConfiguration: (
    mode: 'local' | 'required',
    readToken?: string,
    adminToken?: string
  ) => string | null;
  parseAuthMode: (value?: string) => 'local' | 'required';
  constantTimeTokenMatch: (supplied: string, expected: string) => boolean;
};

type StartedApi = {
  server: Server;
  baseUrl: string;
};

const ENVIRONMENT_KEYS = [
  'NODE_ENV',
  'OMEGA_AUTH_MODE',
  'OMEGA_READ_TOKEN',
  'OMEGA_ADMIN_TOKEN',
  'OMEGA_PERSISTENCE',
  'OMEGA_RUNTIME_STORE_PATH',
  'OMEGA_EVENT_LOG_PATH',
  'OMEGA_WEB_DIST',
] as const;

const originalEnvironment = new Map<string, string | undefined>();

beforeAll(() => {
  for (const key of ENVIRONMENT_KEYS) originalEnvironment.set(key, process.env[key]);
});

afterAll(() => {
  for (const key of ENVIRONMENT_KEYS) {
    const value = originalEnvironment.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

const loadRequiredApi = (): LoadedApi => {
  process.env.NODE_ENV = 'test';
  process.env.OMEGA_AUTH_MODE = 'required';
  process.env.OMEGA_READ_TOKEN = 'read-token';
  process.env.OMEGA_ADMIN_TOKEN = 'admin-token';
  process.env.OMEGA_PERSISTENCE = 'off';
  jest.resetModules();
  return requireFromModule('../index') as LoadedApi;
};

const startApi = async (): Promise<StartedApi> => {
  const { app } = loadRequiredApi();
  const server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server did not start');
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
};

const stopApi = async (server: Server): Promise<void> => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
  jest.resetModules();
};

describe('an unconfigured token is not a token everyone knows', () => {
  /**
   * `constantTimeTokenMatch('', '')` used to return true. Both buffers are
   * zero-length, so the length check passes and timingSafeEqual compares two
   * empty buffers and agrees.
   *
   * That only matters because the auth middleware re-reads process.env on
   * every request. Startup refuses to boot required mode without both
   * tokens, but nothing carries that guarantee forward, so clearing the
   * variable on a running process left `expected` empty — and a request with
   * no Authorization header supplied an equally empty token.
   */
  it('refuses an empty expected token outright', () => {
    const { constantTimeTokenMatch } = loadRequiredApi();

    expect(constantTimeTokenMatch('', '')).toBe(false);
    expect(constantTimeTokenMatch('anything', '')).toBe(false);
    // A configured token still works exactly as before.
    expect(constantTimeTokenMatch('read-token', 'read-token')).toBe(true);
    expect(constantTimeTokenMatch('wrong', 'read-token')).toBe(false);
  });

  it('keeps read evidence closed when the token is cleared on a running server', async () => {
    const { server, baseUrl } = await startApi();
    try {
      const guarded = await fetch(`${baseUrl}/state`);
      expect(guarded.status).toBe(401);

      // The operator, a failed secret refresh, or a config reload empties it.
      delete process.env.OMEGA_READ_TOKEN;

      const afterClearing = await fetch(`${baseUrl}/state`);
      // Measured at 200 before the guard: the server answered with evidence
      // to a caller carrying no credential at all.
      expect(afterClearing.status).toBe(401);
    } finally {
      process.env.OMEGA_READ_TOKEN = 'read-token';
      await stopApi(server);
    }
  });

  it('keeps mutations closed when the admin token is cleared on a running server', async () => {
    const { server, baseUrl } = await startApi();
    try {
      delete process.env.OMEGA_ADMIN_TOKEN;

      const response = await fetch(`${baseUrl}/attest/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attestationId: 'att-whatever', reason: 'probe' }),
      });

      expect(response.status).toBe(401);
    } finally {
      process.env.OMEGA_ADMIN_TOKEN = 'admin-token';
      await stopApi(server);
    }
  });
});

describe('required API authentication profile', () => {
  it('parses only local or required mode and names missing credentials', () => {
    const { missingRequiredAuthTokens, parseAuthMode } = loadRequiredApi();
    expect(parseAuthMode()).toBe('local');
    expect(parseAuthMode('required')).toBe('required');
    expect(() => parseAuthMode('unsafe')).toThrow(/OMEGA_AUTH_MODE/);
    expect(missingRequiredAuthTokens('local')).toEqual([]);
    expect(missingRequiredAuthTokens('required')).toEqual([
      'OMEGA_READ_TOKEN',
      'OMEGA_ADMIN_TOKEN',
    ]);
    expect(missingRequiredAuthTokens('required', 'read-token')).toEqual(['OMEGA_ADMIN_TOKEN']);

    delete process.env.OMEGA_READ_TOKEN;
    delete process.env.OMEGA_ADMIN_TOKEN;
    jest.resetModules();
    expect(() => requireFromModule('../index')).toThrow(
      /OMEGA_AUTH_MODE=required needs configured bearer tokens/
    );
  });

  it('rejects identical read and admin tokens in required mode', () => {
    const { invalidRequiredAuthTokenConfiguration } = loadRequiredApi();
    expect(invalidRequiredAuthTokenConfiguration('local', 'same-token', 'same-token')).toBeNull();
    expect(
      invalidRequiredAuthTokenConfiguration('required', 'read-token', 'admin-token')
    ).toBeNull();
    expect(invalidRequiredAuthTokenConfiguration('required', ' same-token ', 'same-token')).toBe(
      'OMEGA_READ_TOKEN and OMEGA_ADMIN_TOKEN must be distinct'
    );

    process.env.OMEGA_READ_TOKEN = 'same-token';
    process.env.OMEGA_ADMIN_TOKEN = 'same-token';
    jest.resetModules();
    expect(() => requireFromModule('../index')).toThrow(
      /OMEGA_AUTH_MODE=required OMEGA_READ_TOKEN and OMEGA_ADMIN_TOKEN must be distinct/
    );
  });

  it('protects all non-health reads and separates read from admin bearer roles', async () => {
    const { server, baseUrl } = await startApi();
    try {
      const health = await fetch(`${baseUrl}/health`);
      expect(health.status).toBe(200);

      const unauthenticatedRead = await fetch(`${baseUrl}/state`);
      expect(unauthenticatedRead.status).toBe(401);
      expect((await unauthenticatedRead.json()).code).toBe('READ_ACCESS_REQUIRED');

      const adminOnRead = await fetch(`${baseUrl}/state`, {
        headers: { authorization: 'Bearer admin-token' },
      });
      expect(adminOnRead.status).toBe(401);
      expect((await adminOnRead.json()).code).toBe('READ_ACCESS_REQUIRED');

      const read = await fetch(`${baseUrl}/state`, {
        headers: { authorization: 'Bearer read-token' },
      });
      expect(read.status).toBe(200);
      expect((await read.json()).data.authMode).toBe('required');
    } finally {
      await stopApi(server);
    }
  });

  it('keeps the SPA shell and assets behind the same read boundary as API reads', async () => {
    const distDir = mkdtempSync(join(tmpdir(), 'omega-required-auth-web-dist-'));
    writeFileSync(join(distDir, 'index.html'), '<!doctype html><title>Omega required</title>');
    writeFileSync(join(distDir, 'app.js'), 'console.log("required web bundle");');
    process.env.OMEGA_WEB_DIST = distDir;

    const { server, baseUrl } = await startApi();
    try {
      const anonymousShell = await fetch(`${baseUrl}/`, {
        headers: { Accept: 'text/html' },
      });
      expect(anonymousShell.status).toBe(401);
      expect((await anonymousShell.json()).code).toBe('READ_ACCESS_REQUIRED');

      const anonymousAsset = await fetch(`${baseUrl}/app.js`);
      expect(anonymousAsset.status).toBe(401);

      const authenticatedShell = await fetch(`${baseUrl}/`, {
        headers: { Accept: 'text/html', authorization: 'Bearer read-token' },
      });
      expect(authenticatedShell.status).toBe(200);
      expect(await authenticatedShell.text()).toContain('<title>Omega required</title>');

      const authenticatedAsset = await fetch(`${baseUrl}/app.js`, {
        headers: { authorization: 'Bearer read-token' },
      });
      expect(authenticatedAsset.status).toBe(200);
      expect(await authenticatedAsset.text()).toContain('required web bundle');
    } finally {
      await stopApi(server);
      delete process.env.OMEGA_WEB_DIST;
      rmSync(distDir, { recursive: true, force: true });
    }
  });

  it('protects read-only attestation verification with the read token', async () => {
    const { server, baseUrl } = await startApi();
    try {
      const admin = await fetch(`${baseUrl}/attest/verify`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer admin-token' },
        body: JSON.stringify({}),
      });
      expect(admin.status).toBe(401);
      expect((await admin.json()).code).toBe('READ_ACCESS_REQUIRED');

      const read = await fetch(`${baseUrl}/attest/verify`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer read-token' },
        body: JSON.stringify({}),
      });
      expect(read.status).toBe(400);
      expect((await read.json()).code).toBe('MISSING_ATTESTATION');
    } finally {
      await stopApi(server);
    }
  });

  it('protects state-changing routes with the admin token', async () => {
    const { server, baseUrl } = await startApi();
    try {
      const input = {
        claim: 'required auth boundary',
        category: 'health-check',
        source: { system: 'auth-test', version: '0.1.0', environment: 'test' },
        observedBy: 'jest',
        metadata: { statusCode: 200, responseTime: 10 },
        confidence: 0.95,
        confidenceReason: 'required-auth regression test',
      };
      const read = await fetch(`${baseUrl}/complete-loop`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer read-token' },
        body: JSON.stringify(input),
      });
      expect(read.status).toBe(401);
      expect((await read.json()).code).toBe('ADMIN_ACCESS_REQUIRED');

      const admin = await fetch(`${baseUrl}/complete-loop`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer admin-token' },
        body: JSON.stringify(input),
      });
      expect(admin.status).not.toBe(401);
      expect(admin.status).not.toBe(403);
    } finally {
      await stopApi(server);
    }
  });
});
