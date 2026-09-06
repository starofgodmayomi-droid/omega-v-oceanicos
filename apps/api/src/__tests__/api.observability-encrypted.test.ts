import { createServer, type Server } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Express } from 'express';

/**
 * The read-only observability surface (/health, /state, /observability,
 * /evidence/export, /attest/policy, /audit/events) reports two things no
 * other suite exercises together: what encryption-at-rest actually looks
 * like once it is turned on, and what the surface says before any run has
 * completed and after one event exists but no run has. Every other test
 * that flips OMEGA_PERSISTENCE_KEY on only calls the persistence admin
 * routes, never these reads, so the "encryption enabled" arm of every
 * `encrypted ? ALGORITHM : 'disabled'` display and the "no completed run
 * yet" arm of every trust ternary have never actually run.
 */

const requireFromModule = createRequire(__filename);

type ApiResponse<T> = { data: T; meta?: Record<string, unknown> };

const ENVIRONMENT_KEYS = [
  'NODE_ENV',
  'OMEGA_PERSISTENCE',
  'OMEGA_PERSISTENCE_KEY',
  'OMEGA_MEMORY_KEY',
  'OMEGA_RUNTIME_STORE_PATH',
  'OMEGA_EVENT_LOG_PATH',
  'OMEGA_MEMORY_PATH',
] as const;

const originalEnvironment = new Map<string, string | undefined>();

describe('encrypted, persisted observability and audit surface', () => {
  let dir: string;
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    for (const key of ENVIRONMENT_KEYS) originalEnvironment.set(key, process.env[key]);

    dir = mkdtempSync(join(tmpdir(), 'omega-api-observability-encrypted-'));
    process.env.NODE_ENV = 'test';
    process.env.OMEGA_PERSISTENCE = 'on';
    process.env.OMEGA_PERSISTENCE_KEY = 'observability-persistence-secret';
    process.env.OMEGA_MEMORY_KEY = 'observability-memory-secret';
    process.env.OMEGA_RUNTIME_STORE_PATH = join(dir, 'runtime.json');
    process.env.OMEGA_EVENT_LOG_PATH = join(dir, 'runtime.log.jsonl');
    process.env.OMEGA_MEMORY_PATH = join(dir, 'memory.jsonl');

    jest.resetModules();
    const { app } = requireFromModule('../index') as { app: Express };
    server = createServer(app);
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
    for (const key of ENVIRONMENT_KEYS) {
      const value = originalEnvironment.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    rmSync(dir, { recursive: true, force: true });
    jest.resetModules();
  });

  it('shows every encryption-at-rest field enabled, and every trust field null, before any run completes', async () => {
    const health = (await (await fetch(`${baseUrl}/health`)).json()) as ApiResponse<{
      checks: {
        memory: { encryption: string };
        persistence: { encryption: string };
      };
    }>;
    expect(health.data.checks.memory.encryption).toBe('aes-256-gcm');
    expect(health.data.checks.persistence.encryption).toBe('aes-256-gcm');

    const state = (await (await fetch(`${baseUrl}/state`)).json()) as ApiResponse<{
      persistenceEncryption: string;
      memoryEncryption: string;
      mode: string;
      trustBasis: { verificationCoverage: number | null; attestationValidity: number | null };
    }>;
    expect(state.data.persistenceEncryption).toBe('aes-256-gcm');
    expect(state.data.memoryEncryption).toBe('aes-256-gcm');
    expect(state.data.mode).toBe('observing');
    expect(state.data.trustBasis.verificationCoverage).toBeNull();
    expect(state.data.trustBasis.attestationValidity).toBeNull();

    const observability = (await (await fetch(`${baseUrl}/observability`)).json()) as ApiResponse<{
      runtime: { mode: string; persistenceEncryption: string; memoryEncryption: string };
      trust: { verificationCoverage: number | null; attestationValidity: number | null };
    }>;
    expect(observability.data.runtime.mode).toBe('observing');
    expect(observability.data.runtime.persistenceEncryption).toBe('aes-256-gcm');
    expect(observability.data.runtime.memoryEncryption).toBe('aes-256-gcm');
    expect(observability.data.trust.verificationCoverage).toBeNull();
    expect(observability.data.trust.attestationValidity).toBeNull();

    const evidence = (await (await fetch(`${baseUrl}/evidence/export`)).json()) as ApiResponse<{
      observability: {
        runtime: { mode: string; lastActivity: string | null };
        provenance: { lastRequestId: string | null; lastCorrelationId: string | null };
        trust: { verificationCoverage: number | null; attestationValidity: number | null };
      };
    }>;
    expect(evidence.data.observability.runtime.mode).toBe('observing');
    expect(evidence.data.observability.runtime.lastActivity).toBeNull();
    expect(evidence.data.observability.provenance.lastRequestId).toBeNull();
    expect(evidence.data.observability.provenance.lastCorrelationId).toBeNull();
    expect(evidence.data.observability.trust.verificationCoverage).toBeNull();
    expect(evidence.data.observability.trust.attestationValidity).toBeNull();

    const policy = (await (await fetch(`${baseUrl}/attest/policy`)).json()) as ApiResponse<{
      persistenceEncryption: string;
      memoryEncryption: string;
    }>;
    expect(policy.data.persistenceEncryption).toBe('aes-256-gcm');
    expect(policy.data.memoryEncryption).toBe('aes-256-gcm');

    const audit = (await (await fetch(`${baseUrl}/audit/events`)).json()) as ApiResponse<
      unknown[]
    > & {
      meta: { source: string; skipped: number; keySource: string };
    };
    expect(audit.meta.source).not.toBe('memory');
    expect(audit.meta.skipped).toBe(0);
  });

  it('carries the latest event into /state once one exists, even with no completed run', async () => {
    const invalidLoop = await fetch(`${baseUrl}/complete-loop`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ claim: '', category: '', source: {}, observedBy: '' }),
    });
    expect(invalidLoop.status).toBe(400);
    expect(((await invalidLoop.json()) as { code: string }).code).toBe('LOOP_FAILED');

    const state = (await (await fetch(`${baseUrl}/state`)).json()) as ApiResponse<{
      mode: string;
      trust: number | null;
      trustBasis: { verificationCoverage: number | null; attestationValidity: number | null };
    }>;
    expect(state.data.mode).toBe('observe');
    expect(state.data.trust).toBe(1);
    expect(state.data.trustBasis.verificationCoverage).toBeNull();
    expect(state.data.trustBasis.attestationValidity).toBeNull();
  });

  it('reports a failed completed run as zero verification coverage, not a null one', async () => {
    const failingLoop = await fetch(`${baseUrl}/complete-loop`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        claim: 'the endpoint responds quickly and cleanly',
        category: 'health-check',
        source: { system: 'observability-test', version: '0.1.0', environment: 'test' },
        observedBy: 'jest',
        metadata: { statusCode: 500, responseTime: 900 },
        confidence: 0.4,
        confidenceReason: 'deliberately failing fixture',
      }),
    });
    expect(failingLoop.status).toBe(201);
    const failingBody = (await failingLoop.json()) as ApiResponse<{
      verification: { summary: { passed: boolean } };
    }>;
    expect(failingBody.data.verification.summary.passed).toBe(false);

    const state = (await (await fetch(`${baseUrl}/state`)).json()) as ApiResponse<{
      trustBasis: { verificationCoverage: number | null };
    }>;
    expect(state.data.trustBasis.verificationCoverage).toBe(0);

    const observability = (await (await fetch(`${baseUrl}/observability`)).json()) as ApiResponse<{
      trust: { verificationCoverage: number | null };
    }>;
    expect(observability.data.trust.verificationCoverage).toBe(0);

    const evidence = (await (await fetch(`${baseUrl}/evidence/export`)).json()) as ApiResponse<{
      observability: { trust: { verificationCoverage: number | null } };
    }>;
    expect(evidence.data.observability.trust.verificationCoverage).toBe(0);
  });

  it('carries a failed learning outcome into /state trust as 0, not just null-vs-1', async () => {
    const loop = await fetch(`${baseUrl}/complete-loop`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        claim: 'the learning-outcome fixture completes cleanly',
        category: 'health-check',
        source: { system: 'observability-learn-test', version: '0.1.0', environment: 'test' },
        observedBy: 'jest',
        metadata: { statusCode: 200, responseTime: 11 },
        confidence: 0.95,
        confidenceReason: 'learning fixture',
      }),
    });
    expect(loop.status).toBe(201);
    const loopBody = (await loop.json()) as ApiResponse<{ attestation: unknown }>;

    const act = await fetch(`${baseUrl}/act`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ attestation: loopBody.data.attestation }),
    });
    expect(act.status).toBe(201);
    const actBody = (await act.json()) as ApiResponse<{ id: string }>;

    const learn = await fetch(`${baseUrl}/learn`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actionId: actBody.data.id, outcome: 'failure' }),
    });
    expect(learn.status).toBe(201);

    const state = (await (await fetch(`${baseUrl}/state`)).json()) as ApiResponse<{
      mode: string;
      trust: number | null;
    }>;
    expect(state.data.mode).toBe('learn');
    expect(state.data.trust).toBe(0);
  });

  it('filters /audit/events by a status that matches and one that does not', async () => {
    const matching = (await (
      await fetch(`${baseUrl}/audit/events?status=active&type=observation.received&stage=observe`)
    ).json()) as ApiResponse<Array<{ type: string; stage: string; status: string }>>;
    expect(matching.data.length).toBeGreaterThan(0);
    for (const event of matching.data) {
      expect(event.status).toBe('active');
      expect(event.type).toBe('observation.received');
      expect(event.stage).toBe('observe');
    }

    const nonMatching = (await (
      await fetch(`${baseUrl}/audit/events?type=no-such-event-type-anywhere`)
    ).json()) as ApiResponse<unknown[]>;
    expect(nonMatching.data).toEqual([]);

    const meta = (await (await fetch(`${baseUrl}/audit/events`)).json()) as ApiResponse<
      unknown[]
    > & { meta: { keySource: string } };
    expect(meta.meta.keySource).toBe('current');
  });
});
