import { createServer, request as httpRequest, type RequestOptions, type Server } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';

const requireFroMModule = createRequire(__filename);

/**
 * A raw node:http request, used only where fetch() cannot express the
 * scenario under test: binding a specific local source address (to prove
 * loopbackAddress rejects a real non-loopback peer) or connecting over a
 * Unix domain socket (where remoteAddress is genuinely undefined).
 */
const rawRequest = (
  options: RequestOptions,
  body?: string
): Promise<{ status: number; json: unknown }> =>
  new Promise((resolve, reject) => {
    const req = httpRequest(options, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => {
        data += chunk.toString('utf8');
      });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode ?? 0, json: data ? JSON.parse(data) : undefined });
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });

type ApiApp = { app: import('express').Express };

type TestServer = {
  server: Server;
  baseUrl: string;
  cleanup: () => void;
};

const startServer = async (
  enabled: boolean,
  authMode: 'local' | 'required' = 'local'
): Promise<TestServer> => {
  const directory = mkdtempSync(join(tmpdir(), 'omega-local-jobs-'));
  process.env.OMEGA_AUTH_MODE = authMode;
  if (authMode === 'required') {
    process.env.OMEGA_READ_TOKEN = 'read-token';
    process.env.OMEGA_ADMIN_TOKEN = 'admin-token';
  }
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

type UnixTestServer = {
  socketPath: string;
  cleanup: () => void;
};

/** Same runtime wiring as startServer, but bound to a Unix domain socket
 * instead of a TCP port so a connecting peer has no remoteAddress at all. */
const startUnixServer = async (): Promise<UnixTestServer> => {
  const directory = mkdtempSync(join(tmpdir(), 'omega-local-jobs-uds-'));
  process.env.OMEGA_AUTH_MODE = 'local';
  process.env.OMEGA_LOCAL_JOB_LEDGER = 'on';
  process.env.OMEGA_LOCAL_JOB_LEDGER_TOKEN = 'job-test-token';
  process.env.OMEGA_PERSISTENCE = 'off';
  process.env.OMEGA_RUNTIME_STORE_PATH = join(directory, 'runtime.json');
  process.env.OMEGA_EVENT_LOG_PATH = join(directory, 'events.jsonl');
  jest.resetModules();
  const isolated = requireFromModule('../index') as ApiApp;
  const server = createServer(isolated.app);
  const socketPath = join(directory, 'api.sock');
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(socketPath, () => resolve());
  });
  return {
    socketPath,
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
      'OMEGA_AUTH_MODE',
      'OMEGA_READ_TOKEN',
      'OMEGA_ADMIN_TOKEN',
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
      expect(await duplicateResponse.json()).toMatchObject(