import { createServer, Server } from 'node:http';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import Remember, { FileMemoryStore } from '@omega-v/remember';
import { Observation, VerificationResult } from '@omega-v/types';

type ApiApp = { app: import('express').Express };
type ApiResponse<T> = { data: T };

const observation = (): Observation => ({
  id: 'obs-1',
  claim: { statement: 'service responded', category: 'health-check' },
  source: { system: 'memory-degraded-test', version: '1.0.0', environment: 'test' },
  timestamp: '2026-08-15T00:00:00.000Z',
  observedBy: 'memory-degraded-test',
  metadata: { statusCode: 200 },
  confidence: 0.9,
  confidenceReason: 'fixture',
  status: 'normalized',
});

const verification = (): VerificationResult => ({
  id: 'ver-1',
  observationId: 'obs-1',
  timestamp: '2026-08-15T00:00:00.000Z',
  summary: { passed: true, confidence: 0.9, rulesApplied: 1, rulesPassed: 1, rulesFailed: 0 },
  rules: [{ name: 'status-code-check', passed: true, confidence: 0.9 }],
  evidencePath: [],
  ruleVersions: { 'status-code-check': '1.0.0' },
  status: 'completed',
});

/**
 * `GET /memory/integrity` (and the `memoryIntact`-driven `degraded`
 * readiness it feeds into `/health` and `/state`) only ever gets exercised
 * with an intact chain in `api.memory.test.ts`. Every existing "degraded"
 * test reaches that state through a corrupted/partial *event log*, a
 * different code path from a broken *kernel memory* hash chain. This forces
 * a genuine chain break -- the kernel's own `FileMemoryStore` writes a real
 * chain, then one recorded payload is altered on disk exactly as
 * `packages/remember`'s own store tests do -- and boots the API against it.
 */
describe('memory integrity degraded readiness', () => {
  let dir: string;
  let memoryPath: string;
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'omega-api-memory-degraded-'));
    memoryPath = join(dir, 'memory.jsonl');

    // Write a real, currently-valid three-entry chain via the kernel's own
    // store, then tamper one payload in place. This breaks the hash chain
    // without breaking JSON parsing, so the file is fully readable
    // ('restored') and the corruption is purely an integrity failure.
    new Remember(new FileMemoryStore(memoryPath)).remember(observation(), verification());
    const lines = readFileSync(memoryPath, 'utf8').trim().split('\n');
    const tampered = JSON.parse(lines[0]) as { data: { confidence: number } };
    tampered.data.confidence = 0.01;
    lines[0] = JSON.stringify(tampered);
    writeFileSync(memoryPath, `${lines.join('\n')}\n`);

    process.env.NODE_ENV = 'test';
    process.env.OMEGA_PERSISTENCE = 'on';
    process.env.OMEGA_MEMORY_PATH = memoryPath;
    process.env.OMEGA_RUNTIME_STORE_PATH = join(dir, 'runtime.json');
    process.env.OMEGA_EVENT_LOG_PATH = join(dir, 'runtime.log.jsonl');

    jest.resetModules();
    const isolated = require('../index') as ApiApp;
    server = createServer(isolated.app);
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server did not start');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
    for (const name of [
      'OMEGA_PERSISTENCE',
      'OMEGA_MEMORY_PATH',
      'OMEGA_RUNTIME_STORE_PATH',
      'OMEGA_EVENT_LOG_PATH',
    ]) {
      delete process.env[name];
    }
    rmSync(dir, { recursive: true, force: true });
    jest.resetModules();
  });

  it('reports 409 with intact: false on a genuinely broken hash chain, and still returns the entry count', async () => {
    const response = await fetch(`${baseUrl}/memory/integrity`);
    const body = (await response.json()) as ApiResponse<{ intact: boolean; entries: number }>;

    expect(response.status).toBe(409);
    expect(body.data.intact).toBe(false);
    expect(body.data.entries).toBe(3);
  });

  it('drives /health and /state readiness to degraded specifically via the memory check, not via persistence', async () => {
    const healthResponse = await fetch(`${baseUrl}/health`);
    const health = (await healthResponse.json()) as ApiResponse<{
      readiness: string;
      checks: {
        memory: { status: string; integrity: boolean };
        persistence: { eventLogSource: string };
      };
    }>;

    expect(healthResponse.status).toBe(503);
    expect(health.data.readiness).toBe('degraded');
    expect(health.data.checks.memory).toMatchObject({ status: 'degraded', integrity: false });
    // The event log itself is a clean cold start: this degradation is not a
    // repeat of the existing partial-log-driven degraded test.
    expect(health.data.checks.persistence.eventLogSource).toBe('missing');

    const stateResponse = await fetch(`${baseUrl}/state`);
    const state = (await stateResponse.json()) as ApiResponse<{
      readiness: string;
      eventLogSource: string;
      trustBasis: { serviceReadiness: number };
    }>;
    expect(stateResponse.status).toBe(200);
    expect(state.data.readiness).toBe('degraded');
    expect(state.data.eventLogSource).toBe('missing');
    expect(state.data.trustBasis.serviceReadiness).toBe(0);
  });
});
