import { createServer, type Server } from 'node:http';
import { createRequire } from 'node:module';
import type { Express } from 'express';

const requireFromModule = createRequire(__filename);

type LoadedApi = {
  app: Express;
  missingRequiredAuthTokens: (
    mode: 'local' | 'required',
    readToken?: string,
    adminToken?: string
  ) => string[];
  parseAuthMode: (value?: string) => 'local' | 'required';
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
