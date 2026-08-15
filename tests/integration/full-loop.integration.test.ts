import { createServer, Server } from 'node:http';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Remember, FileMemoryStore } from '@omega-v/remember';
import { AttestationService } from '@omega-v/attestation';
import { Observer } from '@omega-v/observer';
import { VerificationEngine } from '@omega-v/verification';

/**
 * Cross-package integration.
 *
 * Every suite until now tested one package, or the API with its state held
 * in process. This runs the API with durability switched on, drives it over
 * HTTP, and then reads what it wrote back out using the packages directly —
 * not the API's own accessors.
 *
 * The distinction matters: a system can agree with itself and still be
 * wrong. Here the writer and the reader are different code paths.
 */
describe('full loop, written by the API and read back by the packages', () => {
  const signingKey = 'integration-key-not-for-production';
  let directory: string;
  let memoryPath: string;
  let logPath: string;
  let server: Server;
  let baseUrl: string;
  let app: { (...args: unknown[]): unknown };

  const loop = async (claim: string, metadata: Record<string, unknown>) =>
    fetch(`${baseUrl}/complete-loop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claim,
        category: 'health-check',
        source: { system: 'integration', version: '1.0.0', environment: 'test' },
        observedBy: 'integration-suite',
        metadata,
        confidence: 0.95,
        confidenceReason: 'integration fixture',
      }),
    });

  beforeAll(async () => {
    directory = mkdtempSync(join(tmpdir(), 'omega-integration-'));
    memoryPath = join(directory, 'memory.jsonl');
    logPath = join(directory, 'events.log.jsonl');

    process.env.OMEGA_PERSISTENCE = 'on';
    process.env.OMEGA_SIGNING_KEY = signingKey;
    process.env.OMEGA_MEMORY_PATH = memoryPath;
    process.env.OMEGA_EVENT_LOG_PATH = logPath;
    process.env.OMEGA_RUNTIME_STORE_PATH = join(directory, 'runtime.json');

    jest.resetModules();
    const module = await import('../../apps/api/src/index');
    app = module.default as typeof app;

    server = createServer(app as never);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server did not start');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
    delete process.env.OMEGA_PERSISTENCE;
    delete process.env.OMEGA_MEMORY_PATH;
    delete process.env.OMEGA_EVENT_LOG_PATH;
    delete process.env.OMEGA_RUNTIME_STORE_PATH;
  });

  it('writes a chain that packages/remember can read and verify independently', async () => {
    const first = await loop('service healthy', { statusCode: 200, responseTime: 12 });
    expect(first.status).toBe(201);

    const reader = new Remember(new FileMemoryStore(memoryPath));

    expect(reader.size()).toBe(3);
    expect(reader.verifyIntegrity()).toBe(true);
    expect(reader.all().map((entry) => entry.type)).toEqual([
      'OBSERVATION',
      'VERIFICATION',
      'MEMORY',
    ]);
  });

  it('extends the same chain rather than starting a new one', async () => {
    await loop('still healthy', { statusCode: 200, responseTime: 15 });

    const reader = new Remember(new FileMemoryStore(memoryPath));

    expect(reader.size()).toBe(6);
    expect(reader.verifyIntegrity()).toBe(true);
    expect(reader.all()[3].previousHash).toBe(reader.all()[2].hash);
  });

  it('produces attestations a separately constructed service can verify', async () => {
    const response = await loop('signed properly', { statusCode: 200, responseTime: 9 });
    const body = (await response.json()) as { data: { attestation: Record<string, unknown> } };

    const independent = new AttestationService(signingKey, '1');

    expect(independent.verify(body.data.attestation as never)).toBe(true);

    const tampered = { ...body.data.attestation, verified: false };
    expect(independent.verify(tampered as never)).toBe(false);
  });

  it('rejects an attestation signed with a different key', async () => {
    const response = await loop('wrong key', { statusCode: 200, responseTime: 7 });
    const body = (await response.json()) as { data: { attestation: Record<string, unknown> } };

    const stranger = new AttestationService('a-different-key-entirely', '1');

    expect(stranger.verify(body.data.attestation as never)).toBe(false);
  });

  it('reaches the same verdict as a kernel assembled from the packages directly', async () => {
    const response = await loop('cross-checked', { statusCode: 500, responseTime: 1200 });
    const body = (await response.json()) as {
      data: {
        observation: { metadata: Record<string, unknown> };
        verification: { summary: { passed: boolean } };
      };
    };

    const observer = new Observer();
    const engine = new VerificationEngine();
    const rulesResponse = await fetch(`${baseUrl}/rules`);
    const rules = (await rulesResponse.json()) as { data: { rules: Array<never> } };
    rules.data.rules.forEach((rule) => engine.registerRule(rule));

    const independent = engine.verify(
      observer.observe({
        claim: 'cross-checked',
        category: 'health-check',
        source: { system: 'integration', version: '1.0.0', environment: 'test' },
        observedBy: 'integration-suite',
        metadata: body.data.observation.metadata,
        confidence: 0.95,
        confidenceReason: 'integration fixture',
      })
    );

    expect(body.data.verification.summary.passed).toBe(false);
    expect(independent.summary.passed).toBe(body.data.verification.summary.passed);
  });

  it('records every loop in the append-only log as well as the chain', async () => {
    const response = await fetch(`${baseUrl}/log`);
    const body = (await response.json()) as {
      data: unknown[];
      meta: { source: string; skipped: number; appendOnly: boolean };
    };

    expect(body.meta.appendOnly).toBe(true);
    expect(body.meta.source).toBe('restored');
    expect(body.meta.skipped).toBe(0);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('reports its own chain intact through the endpoint too', async () => {
    const response = await fetch(`${baseUrl}/memory/integrity`);
    const body = (await response.json()) as { data: { intact: boolean; entries: number } };

    const reader = new Remember(new FileMemoryStore(memoryPath));

    expect(response.status).toBe(200);
    expect(body.data.intact).toBe(true);
    expect(body.data.entries).toBe(reader.size());
  });
});
