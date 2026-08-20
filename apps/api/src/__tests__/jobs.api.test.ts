import { createServer, type Server } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';

const requireFromModule = createRequire(__filename);

type ApiApp = { app: import('express').Express };

type TestServer = {
  server: Server;
  baseUrl: string;
  cleanup: () => void;
};

const startServer = async (enabled: boolean): Promise<TestServer> => {
  const directory = mkdtempSync(join(tmpdir(), 'omega-local-jobs-'));
  process.env.OMEGA_LOCAL_JOB_LEDGER = enabled ? 'on' : '';
  process.env.OMEGA_LOCAL_JOB_LEDGER_TOKEN = 'job-test-token';
  process.env.OMEGA_PERSISTENCE = 'off';
  process.env.OMEGA_RUNTIME_STORE_PATH = join(directory, 'runtime.json');
  process.env.OMEGA_EVENT_LOG_PATH = join(directory, 'events.jsonl');
  jest.resetModules();
  const isolated = requireFromModule('../index') as ApiApp;
  const server = createServer(isolated.app);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server did not start');
  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
    cleanup: () => {
      server.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
};

const jsonHeaders = {
  'content-type': 'application/json',
  authorization: 'Bearer job-test-token',
  'x-omega-operator-id': 'integration-operator',
  'x-correlation-id': 'integration-correlation',
};

describe('local job ledger HTTP contract', () => {
  const original = { ...process.env };
  afterEach(() => {
    for (const key of [
      'OMEGA_LOCAL_JOB_LEDGER',
      'OMEGA_LOCAL_JOB_LEDGER_TOKEN',
      'OMEGA_PERSISTENCE',
      'OMEGA_RUNTIME_STORE_PATH',
      'OMEGA_EVENT_LOG_PATH',
    ]) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
    jest.resetModules();
  });

  it('fails closed and creates no job when disabled', async () => {
    const runtime = await startServer(false);
    try {
      const response = await fetch(`${runtime.baseUrl}/jobs`, { headers: jsonHeaders });
      expect(response.status).toBe(404);
      expect(await response.json()).toMatchObject({ code: 'LOCAL_JOB_DISABLED' });
    } finally {
      runtime.cleanup();
    }
  });

  it('runs an authenticated local-only job through claim and completion', async () => {
    const runtime = await startServer(true);
    try {
      const createResponse = await fetch(`${runtime.baseUrl}/jobs`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
          kind: 'synthetic-observe',
          idempotencyKey: 'integration-job-1',
          sourceUri: 'local://fixture/integration',
        }),
      });
      expect(createResponse.status).toBe(201);
      const created = (await createResponse.json()) as {
        data: { job: { id: string; state: string } };
      };
      expect(created.data.job.state).toBe('queued');

      const duplicateResponse = await fetch(`${runtime.baseUrl}/jobs`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
          kind: 'synthetic-observe',
          idempotencyKey: 'integration-job-1',
          sourceUri: 'local://fixture/integration',
        }),
      });
      expect(duplicateResponse.status).toBe(409);
      expect(await duplicateResponse.json()).toMatchObject({ code: 'JOB_DUPLICATE' });

      const claimResponse = await fetch(`${runtime.baseUrl}/jobs/${created.data.job.id}/claim`, {
        method: 'POST',
        headers: { ...jsonHeaders, 'x-omega-worker-id': 'worker-integration' },
        body: '{}',
      });
      expect(claimResponse.status).toBe(200);
      expect((await claimResponse.json()).data.job.state).toBe('running');

      const completeResponse = await fetch(
        `${runtime.baseUrl}/jobs/${created.data.job.id}/complete`,
        {
          method: 'POST',
          headers: { ...jsonHeaders, 'x-omega-worker-id': 'worker-integration' },
          body: JSON.stringify({ resultSummary: 'Synthetic observation completed' }),
        }
      );
      expect(completeResponse.status).toBe(200);
      expect((await completeResponse.json()).data.job.state).toBe('succeeded');

      const terminalResponse = await fetch(`${runtime.baseUrl}/jobs/${created.data.job.id}/fail`, {
        method: 'POST',
        headers: { ...jsonHeaders, 'x-omega-worker-id': 'worker-integration' },
        body: JSON.stringify({ errorClass: 'late_failure' }),
      });
      expect(terminalResponse.status).toBe(400);
      expect(await terminalResponse.json()).toMatchObject({ code: 'JOB_TERMINAL' });

      const statusResponse = await fetch(`${runtime.baseUrl}/observability`, {
        headers: { authorization: 'Bearer job-test-token' },
      });
      expect(statusResponse.status).toBe(200);
      expect((await statusResponse.json()).data.jobs).toMatchObject({
        enabled: true,
        durable: false,
        source: 'memory',
        counts: { succeeded: 1 },
      });
    } finally {
      runtime.cleanup();
    }
  });

  it('rejects invalid input and unauthorized mutation without creating work', async () => {
    const runtime = await startServer(true);
    try {
      const unauthorized = await fetch(`${runtime.baseUrl}/jobs`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind: 'synthetic-observe' }),
      });
      expect(unauthorized.status).toBe(401);
      expect(await unauthorized.json()).toMatchObject({ code: 'LOCAL_JOB_ACCESS_REQUIRED' });

      const invalid = await fetch(`${runtime.baseUrl}/jobs`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
          kind: 'synthetic-observe',
          idempotencyKey: 'invalid-job',
          sourceUri: 'https://example.com',
        }),
      });
      expect(invalid.status).toBe(400);
      expect(await invalid.json()).toMatchObject({ code: 'JOB_INVALID' });
    } finally {
      runtime.cleanup();
    }
  });
});
