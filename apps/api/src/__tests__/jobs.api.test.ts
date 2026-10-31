import { createServer, type Server } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';

const requireFromModule = createRequire(__filename);

type ApiApp = { app: import('fastify').FastifyInstance };

type TestServer = {
  server: Server;
  baseUrl: string;
  cleanup: () => void;
};

type StartOptions = { enabled: boolean; ledgerToken?: string };

const startServer = async ({ enabled, ledgerToken }: StartOptions): Promise<TestServer> => {
  const directory = mkdtempSync(join(tmpdir(), 'omega-local-jobs-'));
  process.env.OMEGA_AUTH_MODE = 'local';
  process.env.OMEGA_LOCAL_JOB_LEDGER = enabled ? 'on' : '';
  if (ledgerToken === undefined) delete process.env.OMEGA_LOCAL_JOB_LEDGER_TOKEN;
  else process.env.OMEGA_LOCAL_JOB_LEDGER_TOKEN = ledgerToken;
  process.env.OMEGA_PERSISTENCE = 'off';
  process.env.OMEGA_RUNTIME_STORE_PATH = join(directory, 'runtime.json');
  process.env.OMEGA_EVENT_LOG_PATH = join(directory, 'events.jsonl');
  jest.resetModules();
  const isolated = requireFromModule('../index') as ApiApp;
  const server = createServer(isolated.app as never);
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
  'x-omega-operator-id': 'integration-operator',
  'x-correlation-id': 'integration-correlation',
};

const jobBody = (idempotencyKey: string) => ({
  kind: 'synthetic-observe',
  idempotencyKey,
  actor: 'integration-operator',
  sourceUri: 'local://fixture/integration',
});

type JobShape = { id: string; state: string; workerId: string | null };

describe('local job ledger HTTP contract', () => {
  const original = { ...process.env };
  afterEach(() => {
    for (const key of [
      'OMEGA_AUTH_MODE',
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

  it('fails closed with 503 when the ledger is disabled', async () => {
    const runtime = await startServer({ enabled: false });
    try {
      const list = await fetch(`${runtime.baseUrl}/jobs`);
      expect(list.status).toBe(503);
      expect(await list.json()).toMatchObject({ success: false, error: 'LOCAL_JOB_LEDGER_DISABLED' });

      const create = await fetch(`${runtime.baseUrl}/jobs`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(jobBody('disabled-ledger')),
      });
      expect(create.status).toBe(503);
      expect(await create.json()).toMatchObject({ success: false, error: 'LOCAL_JOB_LEDGER_DISABLED' });
    } finally {
      runtime.cleanup();
    }
  });

  it('requires the dedicated ledger token on every job route when configured', async () => {
    const runtime = await startServer({ enabled: true, ledgerToken: 'ledger-token' });
    try {
      const missing = await fetch(`${runtime.baseUrl}/jobs`);
      expect(missing.status).toBe(401);
      expect(await missing.json()).toMatchObject({ success: false, error: 'JOB_ACCESS_REQUIRED' });

      const wrong = await fetch(`${runtime.baseUrl}/jobs`, {
        headers: { authorization: 'Bearer not-the-token' },
      });
      expect(wrong.status).toBe(401);

      const allowed = await fetch(`${runtime.baseUrl}/jobs`, {
        headers: { authorization: 'Bearer ledger-token' },
      });
      expect(allowed.status).toBe(200);
      expect(await allowed.json()).toMatchObject({ success: true, jobs: [] });
    } finally {
      runtime.cleanup();
    }
  });

  it('runs a job through create, claim, and completion', async () => {
    const runtime = await startServer({ enabled: true });
    try {
      const createResponse = await fetch(`${runtime.baseUrl}/jobs`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(jobBody('integration-job-1')),
      });
      expect(createResponse.status).toBe(201);
      const created = (await createResponse.json()) as { success: boolean; job: JobShape };
      expect(created.success).toBe(true);
      expect(created.job.state).toBe('queued');
      expect(created.job.workerId).toBeNull();

      const duplicate = await fetch(`${runtime.baseUrl}/jobs`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(jobBody('integration-job-1')),
      });
      expect(duplicate.status).toBe(409);
      expect(await duplicate.json()).toMatchObject({ success: false, error: 'JOB_DUPLICATE' });

      const claim = await fetch(`${runtime.baseUrl}/jobs/${created.job.id}/claim`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ workerId: 'worker-integration' }),
      });
      expect(claim.status).toBe(200);
      expect(((await claim.json()) as { job: JobShape }).job.state).toBe('running');

      const list = await fetch(`${runtime.baseUrl}/jobs`);
      expect(list.status).toBe(200);
      const listed = (await list.json()) as { jobs: JobShape[]; ledger: { counts: Record<string, number> } };
      expect(listed.jobs.map((job) => job.id)).toContain(created.job.id);
      expect(listed.ledger.counts.running).toBe(1);

      const complete = await fetch(`${runtime.baseUrl}/jobs/${created.job.id}/complete`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ workerId: 'worker-integration', resultSummary: 'Synthetic observation completed' }),
      });
      expect(complete.status).toBe(200);
      expect(((await complete.json()) as { job: JobShape }).job.state).toBe('succeeded');

      const detail = await fetch(`${runtime.baseUrl}/jobs/${created.job.id}`);
      expect(detail.status).toBe(200);
      const detailBody = (await detail.json()) as {
        job: JobShape;
        // The route returns the most recent events first; `sequence` is the
        // chronological ordering contract.
        events: { type: string; sequence: number }[];
      };
      expect(detailBody.job.state).toBe('succeeded');
      const lifecycle = [...detailBody.events].sort((a, b) => a.sequence - b.sequence);
      expect(lifecycle.map((event) => event.type)).toEqual(['created', 'started', 'completed']);
    } finally {
      runtime.cleanup();
    }
  });

  it('rejects a terminal transition and an unclaimed worker', async () => {
    const runtime = await startServer({ enabled: true });
    try {
      const createResponse = await fetch(`${runtime.baseUrl}/jobs`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(jobBody('integration-job-terminal')),
      });
      const created = (await createResponse.json()) as { job: JobShape };

      const unclaimed = await fetch(`${runtime.baseUrl}/jobs/${created.job.id}/complete`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ workerId: 'worker-integration', resultSummary: 'Too early' }),
      });
      expect(unclaimed.status).toBe(400);
      expect(await unclaimed.json()).toMatchObject({ success: false, error: 'JOB_CLAIM_REQUIRED' });

      const claim = await fetch(`${runtime.baseUrl}/jobs/${created.job.id}/claim`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ workerId: 'worker-integration' }),
      });
      expect(claim.status).toBe(200);

      const fail = await fetch(`${runtime.baseUrl}/jobs/${created.job.id}/fail`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ workerId: 'worker-integration', errorClass: 'synthetic_failure' }),
      });
      expect(fail.status).toBe(200);
      expect(((await fail.json()) as { job: JobShape }).job.state).toBe('failed');

      const afterTerminal = await fetch(`${runtime.baseUrl}/jobs/${created.job.id}/complete`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ workerId: 'worker-integration', resultSummary: 'Too late' }),
      });
      expect(afterTerminal.status).toBe(400);
      expect(await afterTerminal.json()).toMatchObject({ success: false, error: 'JOB_TERMINAL' });
    } finally {
      runtime.cleanup();
    }
  });

  it('maps a reused idempotency key with a different payload to a conflict', async () => {
    const runtime = await startServer({ enabled: true });
    try {
      const first = await fetch(`${runtime.baseUrl}/jobs`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(jobBody('integration-job-conflict')),
      });
      expect(first.status).toBe(201);

      const changed = { ...jobBody('integration-job-conflict'), sourceUri: 'local://fixture/other' };
      const conflict = await fetch(`${runtime.baseUrl}/jobs`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(changed),
      });
      expect(conflict.status).toBe(409);
      expect(await conflict.json()).toMatchObject({ success: false, error: 'JOB_IDEMPOTENCY_CONFLICT' });
    } finally {
      runtime.cleanup();
    }
  });

  it('answers a malformed create body with a validation error instead of a 500', async () => {
    const runtime = await startServer({ enabled: true });
    try {
      const missingActor = await fetch(`${runtime.baseUrl}/jobs`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ kind: 'synthetic-observe', idempotencyKey: 'no-actor', sourceUri: 'local://fixture/x' }),
      });
      expect(missingActor.status).toBe(400);
      expect(await missingActor.json()).toMatchObject({ success: false, error: 'JOB_INVALID' });

      const badUri = await fetch(`${runtime.baseUrl}/jobs`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ ...jobBody('bad-uri'), sourceUri: 'https://example.com/x' }),
      });
      expect(badUri.status).toBe(400);
      expect(await badUri.json()).toMatchObject({ success: false, error: 'JOB_INVALID' });
    } finally {
      runtime.cleanup();
    }
  });

  it('bounds the list window and reports unknown jobs as 404', async () => {
    const runtime = await startServer({ enabled: true });
    try {
      const tooSmall = await fetch(`${runtime.baseUrl}/jobs?limit=0`);
      expect(tooSmall.status).toBe(400);
      expect(await tooSmall.json()).toMatchObject({ success: false, error: 'JOB_INVALID' });

      const tooLarge = await fetch(`${runtime.baseUrl}/jobs?limit=41`);
      expect(tooLarge.status).toBe(400);

      const unknown = await fetch(`${runtime.baseUrl}/jobs/job-missing`);
      expect(unknown.status).toBe(404);
      expect(await unknown.json()).toMatchObject({ success: false, error: 'JOB_NOT_FOUND' });
    } finally {
      runtime.cleanup();
    }
  });
});
