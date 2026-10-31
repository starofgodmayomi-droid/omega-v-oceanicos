import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const requireFromModule = createRequire(__filename);

type FastifyApp = import('fastify').FastifyInstance;

const boot = (): { app: FastifyApp; cleanup: () => void } => {
  const directory = mkdtempSync(join(tmpdir(), 'omega-auth-mode-'));
  process.env.OMEGA_PERSISTENCE = 'off';
  process.env.OMEGA_ALLOW_UNSIGNED_CYCLE = 'true';
  process.env.OMEGA_RUNTIME_STORE_PATH = join(directory, 'runtime.json');
  process.env.OMEGA_EVENT_LOG_PATH = join(directory, 'events.jsonl');
  jest.resetModules();
  const isolated = requireFromModule('../index') as { createApp: () => FastifyApp };
  const app = isolated.createApp();
  return {
    app,
    cleanup: () => {
      void app.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
};

describe('OMEGA_AUTH_MODE boundary', () => {
  const original = { ...process.env };
  afterEach(() => {
    for (const key of [
      'OMEGA_AUTH_MODE',
      'OMEGA_READ_TOKEN',
      'OMEGA_ADMIN_TOKEN',
      'OMEGA_PERSISTENCE',
      'OMEGA_ALLOW_UNSIGNED_CYCLE',
      'OMEGA_RUNTIME_STORE_PATH',
      'OMEGA_EVENT_LOG_PATH',
    ]) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
    jest.resetModules();
  });

  it('local mode leaves reads and writes open', async () => {
    process.env.OMEGA_AUTH_MODE = 'local';
    delete process.env.OMEGA_READ_TOKEN;
    delete process.env.OMEGA_ADMIN_TOKEN;
    const { app, cleanup } = boot();
    try {
      const health = await app.inject({ method: 'GET', url: '/health' });
      expect(health.statusCode).toBe(200);

      const mood = await app.inject({ method: 'GET', url: '/v1/mood' });
      expect(mood.statusCode).toBe(200);

      const cycle = await app.inject({ method: 'POST', url: '/v1/cycle' });
      expect(cycle.statusCode).toBe(200);
    } finally {
      cleanup();
    }
  });

  it('required mode gates reads on the read token and writes on the admin token', async () => {
    process.env.OMEGA_AUTH_MODE = 'required';
    process.env.OMEGA_READ_TOKEN = 'read-token';
    process.env.OMEGA_ADMIN_TOKEN = 'admin-token';
    const { app, cleanup } = boot();
    try {
      const health = await app.inject({ method: 'GET', url: '/health' });
      expect(health.statusCode).toBe(200);

      const anonymousRead = await app.inject({ method: 'GET', url: '/v1/mood' });
      expect(anonymousRead.statusCode).toBe(401);
      expect(anonymousRead.json()).toMatchObject({ success: false, error: 'READ_ACCESS_REQUIRED' });

      const authorisedRead = await app.inject({
        method: 'GET',
        url: '/v1/mood',
        headers: { authorization: 'Bearer read-token' },
      });
      expect(authorisedRead.statusCode).toBe(200);

      const readTokenWrite = await app.inject({
        method: 'POST',
        url: '/v1/cycle',
        headers: { authorization: 'Bearer read-token' },
      });
      expect(readTokenWrite.statusCode).toBe(401);
      expect(readTokenWrite.json()).toMatchObject({ success: false, error: 'ADMIN_ACCESS_REQUIRED' });

      const adminWrite = await app.inject({
        method: 'POST',
        url: '/v1/cycle',
        headers: { authorization: 'Bearer admin-token' },
      });
      expect(adminWrite.statusCode).toBe(200);
    } finally {
      cleanup();
    }
  });

  it('required mode refuses to boot without distinct configured tokens', async () => {
    process.env.OMEGA_AUTH_MODE = 'required';
    delete process.env.OMEGA_READ_TOKEN;
    delete process.env.OMEGA_ADMIN_TOKEN;
    const directory = mkdtempSync(join(tmpdir(), 'omega-auth-mode-boot-'));
    process.env.OMEGA_PERSISTENCE = 'off';
    process.env.OMEGA_RUNTIME_STORE_PATH = join(directory, 'runtime.json');
    process.env.OMEGA_EVENT_LOG_PATH = join(directory, 'events.jsonl');
    jest.resetModules();
    // The module boots its default app on import, so a misconfigured process
    // fails at load rather than after it starts serving.
    try {
      expect(() => requireFromModule('../index')).toThrow(/OMEGA_AUTH_MODE=required/);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('rejects an unknown auth mode instead of silently defaulting', async () => {
    process.env.OMEGA_AUTH_MODE = 'permissive';
    process.env.OMEGA_PERSISTENCE = 'off';
    jest.resetModules();
    expect(() => requireFromModule('../index')).toThrow(/OMEGA_AUTH_MODE/);
  });
});
