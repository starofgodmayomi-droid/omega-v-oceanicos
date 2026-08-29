import { createServer, request as httpRequest, type RequestOptions, type Server } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';

const requireFromModule = createRequire(__filename);

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
        encryption: 'disabled',
        counts: { succeeded: 1 },
      });
    } finally {
      runtime.cleanup();
    }
  });

  it('accepts a dedicated local token alongside required global auth', async () => {
    const runtime = await startServer(true, 'required');
    try {
      const missingDedicatedToken = await fetch(`${runtime.baseUrl}/jobs`, {
        method: 'POST',
        headers: { ...jsonHeaders, authorization: 'Bearer admin-token' },
        body: JSON.stringify({
          kind: 'synthetic-observe',
          idempotencyKey: 'required-job-missing-local-token',
          sourceUri: 'local://fixture/required-missing-token',
        }),
      });
      expect(missingDedicatedToken.status).toBe(401);
      expect(await missingDedicatedToken.json()).toMatchObject({
        code: 'LOCAL_JOB_ACCESS_REQUIRED',
      });

      const createResponse = await fetch(`${runtime.baseUrl}/jobs`, {
        method: 'POST',
        headers: {
          ...jsonHeaders,
          authorization: 'Bearer admin-token',
          'x-omega-local-job-token': 'job-test-token',
        },
        body: JSON.stringify({
          kind: 'synthetic-observe',
          idempotencyKey: 'required-job-1',
          sourceUri: 'local://fixture/required',
        }),
      });
      expect(createResponse.status).toBe(201);
      const created = (await createResponse.json()) as { data: { job: { id: string } } };

      const readResponse = await fetch(`${runtime.baseUrl}/jobs/${created.data.job.id}`, {
        headers: {
          authorization: 'Bearer read-token',
          'x-omega-local-job-token': 'job-test-token',
        },
      });
      expect(readResponse.status).toBe(200);
      expect((await readResponse.json()).data.job.id).toBe(created.data.job.id);
    } finally {
      runtime.cleanup();
    }
  });

  it('runs the bounded scene equation and preserves its non-cosmological boundary', async () => {
    const runtime = await startServer(false);
    try {
      const response = await fetch(`${runtime.baseUrl}/scene/simulate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ seed: 'api-scene', steps: 4, branches: 3 }),
      });
      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        data: {
          states: string[];
          terminalState: string;
          branches: Array<{ perspective: string; states: string[] }>;
          branchCount: number;
          continuation: string;
          provenance: { deterministic: boolean; verified: boolean };
        };
      };
      expect(body.data.states).toEqual(['darkness', 'possibility', 'ocean', 'star']);
      expect(body.data.terminalState).toBe('star');
      expect(body.data.branchCount).toBe(3);
      expect(body.data.continuation).toBe('bounded-sample-of-infinite-potential');
      expect(body.data.branches).toHaveLength(3);
      expect(body.data.branches[0].states).toEqual(body.data.states);
      expect(body.data.provenance).toEqual({
        source: 'local-simulation',
        ruleVersion: 'scene-equation.v2',
        deterministic: true,
        verified: false,
        note: 'Bounded symbolic perspectives only; this is not a claim about physical multiverses, cosmology, or consciousness.',
      });
    } finally {
      runtime.cleanup();
    }
  });

  it('defaults steps to the full bounded sequence when the field is omitted', async () => {
    const runtime = await startServer(false);
    try {
      const response = await fetch(`${runtime.baseUrl}/scene/simulate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ seed: 'api-scene-default-steps' }),
      });
      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        data: { states: string[]; terminalState: string; branchCount: number };
      };
      // 13 is the full length of the bounded scene-state sequence: with no
      // `steps` field at all, the handler must pass `undefined` through
      // rather than coercing a missing field to some other falsy default.
      expect(body.data.states).toHaveLength(13);
      expect(body.data.terminalState).toBe('return');
      expect(body.data.branchCount).toBe(1);
    } finally {
      runtime.cleanup();
    }
  });

  it('rejects unsafe scene bounds without creating a claim of execution', async () => {
    const runtime = await startServer(false);
    try {
      const response = await fetch(`${runtime.baseUrl}/scene/simulate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ steps: 0 }),
      });
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ code: 'SCENE_INVALID' });
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

  it('rejects a real non-loopback TCP peer', async () => {
    const runtime = await startServer(true);
    try {
      const address = runtime.server.address();
      if (!address || typeof address === 'string') throw new Error('expected a TCP address');
      const nonLoopback = await rawRequest({
        host: '127.0.0.1',
        port: address.port,
        localAddress: '127.0.0.2',
        path: '/jobs',
        method: 'GET',
        headers: { authorization: 'Bearer job-test-token' },
      });
      expect(nonLoopback.status).toBe(403);
      expect(nonLoopback.json).toMatchObject({ code: 'LOCAL_JOB_LOOPBACK_ONLY' });
    } finally {
      runtime.cleanup();
    }
  });

  // Unix domain sockets are a POSIX concept: Windows would need a distinct
  // named-pipe-based server to exercise the same "no remoteAddress at all"
  // code path, so this is skipped there rather than run unverified.
  (process.platform === 'win32' ? it.skip : it)(
    'rejects a peer with no socket address at all',
    async () => {
      const unix = await startUnixServer();
      try {
        const noAddress = await rawRequest({
          socketPath: unix.socketPath,
          path: '/jobs',
          method: 'GET',
          headers: { authorization: 'Bearer job-test-token' },
        });
        expect(noAddress.status).toBe(403);
        expect(noAddress.json).toMatchObject({ code: 'LOCAL_JOB_LOOPBACK_ONLY' });
      } finally {
        unix.cleanup();
      }
    }
  );

  it('requires ledger authorization independently on every job-scoped route', async () => {
    const runtime = await startServer(true);
    try {
      const readResponse = await fetch(`${runtime.baseUrl}/jobs/anything`);
      expect(readResponse.status).toBe(401);
      expect(await readResponse.json()).toMatchObject({ code: 'LOCAL_JOB_ACCESS_REQUIRED' });

      for (const action of ['claim', 'complete', 'fail']) {
        const response = await fetch(`${runtime.baseUrl}/jobs/anything/${action}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{}',
        });
        expect(response.status).toBe(401);
        expect(await response.json()).toMatchObject({ code: 'LOCAL_JOB_ACCESS_REQUIRED' });
      }
    } finally {
      runtime.cleanup();
    }
  });

  it('lists jobs with and without explicit limit and state query parameters', async () => {
    const runtime = await startServer(true);
    try {
      await fetch(`${runtime.baseUrl}/jobs`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
          kind: 'synthetic-observe',
          idempotencyKey: 'list-job-1',
          sourceUri: 'local://fixture/list',
        }),
      });

      const defaultQuery = await fetch(`${runtime.baseUrl}/jobs`, { headers: jsonHeaders });
      expect(defaultQuery.status).toBe(200);
      const defaultBody = (await defaultQuery.json()) as { data: { jobs: unknown[] } };
      expect(defaultBody.data.jobs).toHaveLength(1);

      const filteredQuery = await fetch(`${runtime.baseUrl}/jobs?limit=5&state=queued`, {
        headers: jsonHeaders,
      });
      expect(filteredQuery.status).toBe(200);
      const filteredBody = (await filteredQuery.json()) as { data: { jobs: unknown[] } };
      expect(filteredBody.data.jobs).toHaveLength(1);

      const emptyFilteredQuery = await fetch(`${runtime.baseUrl}/jobs?state=failed`, {
        headers: jsonHeaders,
      });
      expect((await emptyFilteredQuery.json()).data.jobs).toHaveLength(0);
    } finally {
      runtime.cleanup();
    }
  });

  it('reports 404 for an unknown job on both the read route and a mutation route', async () => {
    const runtime = await startServer(true);
    try {
      const readResponse = await fetch(`${runtime.baseUrl}/jobs/does-not-exist`, {
        headers: jsonHeaders,
      });
      expect(readResponse.status).toBe(404);
      expect(await readResponse.json()).toMatchObject({ code: 'JOB_NOT_FOUND' });

      const claimResponse = await fetch(`${runtime.baseUrl}/jobs/does-not-exist/claim`, {
        method: 'POST',
        headers: { ...jsonHeaders, 'x-omega-worker-id': 'worker-unknown' },
        body: '{}',
      });
      expect(claimResponse.status).toBe(404);
      expect(await claimResponse.json()).toMatchObject({ code: 'JOB_NOT_FOUND' });
    } finally {
      runtime.cleanup();
    }
  });

  it('falls back to a null actor when the operator header is omitted, and rejects it', async () => {
    const runtime = await startServer(true);
    try {
      const response = await fetch(`${runtime.baseUrl}/jobs`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer job-test-token',
        },
        body: JSON.stringify({
          kind: 'synthetic-observe',
          idempotencyKey: 'no-actor-job',
          sourceUri: 'local://fixture/no-actor',
        }),
      });
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ code: 'JOB_INVALID' });
    } finally {
      runtime.cleanup();
    }
  });

  it('records a job event with no correlation id when the header is omitted', async () => {
    const runtime = await startServer(true);
    try {
      const response = await fetch(`${runtime.baseUrl}/jobs`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer job-test-token',
          'x-omega-operator-id': 'integration-operator',
        },
        body: JSON.stringify({
          kind: 'synthetic-observe',
          idempotencyKey: 'no-correlation-job',
          sourceUri: 'local://fixture/no-correlation',
        }),
      });
      expect(response.status).toBe(201);
      const created = (await response.json()) as { data: { job: { id: string } } };
      expect(created.data.job.id).toMatch(/^job-/);
    } finally {
      runtime.cleanup();
    }
  });

  it('falls back to an empty worker id on claim, complete, and fail when the header is omitted', async () => {
    const runtime = await startServer(true);
    try {
      const createClaimable = async (idempotencyKey: string) => {
        const response = await fetch(`${runtime.baseUrl}/jobs`, {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({
            kind: 'synthetic-observe',
            idempotencyKey,
            sourceUri: 'local://fixture/no-worker',
          }),
        });
        return ((await response.json()) as { data: { job: { id: string } } }).data.job.id;
      };

      const unclaimedJobId = await createClaimable('no-worker-claim');
      const claimResponse = await fetch(`${runtime.baseUrl}/jobs/${unclaimedJobId}/claim`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer job-test-token',
        },
        body: '{}',
      });
      expect(claimResponse.status).toBe(400);
      expect(await claimResponse.json()).toMatchObject({ code: 'JOB_INVALID' });

      const runningJobId = await createClaimable('no-worker-complete');
      await fetch(`${runtime.baseUrl}/jobs/${runningJobId}/claim`, {
        method: 'POST',
        headers: { ...jsonHeaders, 'x-omega-worker-id': 'worker-owner' },
        body: '{}',
      });
      const completeResponse = await fetch(`${runtime.baseUrl}/jobs/${runningJobId}/complete`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer job-test-token',
        },
        body: JSON.stringify({ resultSummary: 'ignored, no matching claim' }),
      });
      expect(completeResponse.status).toBe(400);
      expect(await completeResponse.json()).toMatchObject({ code: 'JOB_CLAIM_REQUIRED' });

      const failableJobId = await createClaimable('no-worker-fail');
      await fetch(`${runtime.baseUrl}/jobs/${failableJobId}/claim`, {
        method: 'POST',
        headers: { ...jsonHeaders, 'x-omega-worker-id': 'worker-owner' },
        body: '{}',
      });
      const failResponse = await fetch(`${runtime.baseUrl}/jobs/${failableJobId}/fail`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer job-test-token',
        },
        body: JSON.stringify({ errorClass: 'ignored_no_matching_claim' }),
      });
      expect(failResponse.status).toBe(400);
      expect(await failResponse.json()).toMatchObject({ code: 'JOB_CLAIM_REQUIRED' });
    } finally {
      runtime.cleanup();
    }
  });

  it('records a failed job lifecycle event alongside a succeeded one', async () => {
    const runtime = await startServer(true);
    try {
      const createResponse = await fetch(`${runtime.baseUrl}/jobs`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
          kind: 'synthetic-observe',
          idempotencyKey: 'failing-job',
          sourceUri: 'local://fixture/failing',
        }),
      });
      const created = (await createResponse.json()) as { data: { job: { id: string } } };

      await fetch(`${runtime.baseUrl}/jobs/${created.data.job.id}/claim`, {
        method: 'POST',
        headers: { ...jsonHeaders, 'x-omega-worker-id': 'worker-failing' },
        body: '{}',
      });

      const failResponse = await fetch(`${runtime.baseUrl}/jobs/${created.data.job.id}/fail`, {
        method: 'POST',
        headers: { ...jsonHeaders, 'x-omega-worker-id': 'worker-failing' },
        body: JSON.stringify({ errorClass: 'synthetic_failure' }),
      });
      expect(failResponse.status).toBe(200);
      expect((await failResponse.json()).data.job.state).toBe('failed');

      const statusResponse = await fetch(`${runtime.baseUrl}/observability`, {
        headers: { authorization: 'Bearer job-test-token' },
      });
      expect((await statusResponse.json()).data.jobs).toMatchObject({
        counts: { failed: 1 },
      });
    } finally {
      runtime.cleanup();
    }
  });

  it('maps a repeated idempotency key with a different payload to a 409 conflict', async () => {
    const runtime = await startServer(true);
    try {
      const first = await fetch(`${runtime.baseUrl}/jobs`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
          kind: 'synthetic-observe',
          idempotencyKey: 'conflicting-key',
          sourceUri: 'local://fixture/conflict-a',
        }),
      });
      expect(first.status).toBe(201);

      const second = await fetch(`${runtime.baseUrl}/jobs`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
          kind: 'synthetic-observe',
          idempotencyKey: 'conflicting-key',
          sourceUri: 'local://fixture/conflict-b',
        }),
      });
      expect(second.status).toBe(409);
      expect(await second.json()).toMatchObject({ code: 'JOB_IDEMPOTENCY_CONFLICT' });
    } finally {
      runtime.cleanup();
    }
  });

  it('maps an unexpected non-ledger error to the generic invalid-job response', async () => {
    const runtime = await startServer(true);
    try {
      const createResponse = await fetch(`${runtime.baseUrl}/jobs`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
          kind: 'synthetic-observe',
          idempotencyKey: 'malformed-complete-job',
          sourceUri: 'local://fixture/malformed',
        }),
      });
      const created = (await createResponse.json()) as { data: { job: { id: string } } };
      await fetch(`${runtime.baseUrl}/jobs/${created.data.job.id}/claim`, {
        method: 'POST',
        headers: { ...jsonHeaders, 'x-omega-worker-id': 'worker-malformed' },
        body: '{}',
      });

      // Omitting resultSummary entirely makes the ledger's complete() call
      // `.trim()` on undefined, throwing a raw TypeError rather than a
      // LocalJobError, which must fall through to the generic mapping.
      const completeResponse = await fetch(
        `${runtime.baseUrl}/jobs/${created.data.job.id}/complete`,
        {
          method: 'POST',
          headers: { ...jsonHeaders, 'x-omega-worker-id': 'worker-malformed' },
          body: '{}',
        }
      );
      expect(completeResponse.status).toBe(400);
      expect(await completeResponse.json()).toMatchObject({
        code: 'JOB_INVALID',
        message: 'The local job request could not be processed',
      });
    } finally {
      runtime.cleanup();
    }
  });
});
