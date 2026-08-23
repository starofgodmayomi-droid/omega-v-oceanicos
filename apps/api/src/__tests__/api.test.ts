import { createServer, Server } from 'node:http';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  app,
  constantTimeTokenMatch,
  isAttestationExpired,
  revocationRegistryDigest,
  revocationRegistryStatus,
  operatorIdentityAllowed,
  parseAuditQuery,
} from '../index';
import { Attestation } from '@omega-v/types';
import {
  appendEvent,
  loadSnapshot,
  readEventLog,
  reencryptionJournalPath,
  saveSnapshot,
} from '../persistence';

type ApiResponse<T> = { data: T };

type LoopPayload = {
  observation: { id: string };
  verification: { summary: { passed: boolean } };
  memory: { id: string };
  attestation: { id: string; verified: boolean };
};

describe('API runtime contracts', () => {
  it('supports optional allowlists while failing closed when allowlists are required', () => {
    expect(operatorIdentityAllowed(undefined, [])).toBe(true);
    expect(operatorIdentityAllowed('operator-a', [], true)).toBe(false);
    expect(operatorIdentityAllowed('operator-a', ['operator-a'], true)).toBe(true);
    expect(operatorIdentityAllowed('operator-b', ['operator-a'], true)).toBe(false);
  });

  it('makes revocation registry integrity states explicit', () => {
    const records = [
      {
        id: 'rev-1',
        attestationId: 'att-1',
        reason: 'review',
        revokedBy: 'test',
        revokedAt: '2026-08-16T00:00:00.000Z',
      },
    ];
    const digest = revocationRegistryDigest(records);

    expect(revocationRegistryStatus(false, undefined, digest)).toBe('disabled');
    expect(revocationRegistryStatus(true, undefined, digest)).toBe('legacy');
    expect(revocationRegistryStatus(true, digest, digest)).toBe('intact');
    expect(revocationRegistryStatus(true, digest, `${digest}-tampered`)).toBe('mismatch');
  });

  it('parses bounded audit filters and rejects unsafe temporal ranges', () => {
    expect(parseAuditQuery({ type: 'attestation.created', status: 'passed', limit: '12' })).toEqual(
      {
        query: {
          type: 'attestation.created',
          stage: undefined,
          status: 'passed',
          from: undefined,
          to: undefined,
          limit: 12,
        },
      }
    );
    expect(parseAuditQuery({ limit: '0' })).toEqual({
      error: 'limit must be an integer between 1 and 500',
    });
    expect(parseAuditQuery({ status: 'unknown' })).toEqual({
      error: 'status must be active, passed, or failed',
    });
    expect(parseAuditQuery({ from: '2026-08-17T00:00:00Z', to: '2026-08-16T00:00:00Z' })).toEqual({
      error: 'from must not be later than to',
    });
  });

  /**
   * `parseAuditQuery` validates `from` and `to` as ISO-8601 timestamps before
   * comparing them. The existing test only supplied two well-formed
   * timestamps in the wrong order, so the `Number.isNaN(Date.parse(...))`
   * guards that reject an unparseable `from` or `to` had never returned
   * their error.
   */
  it('rejects audit query timestamps that are not valid ISO-8601', () => {
    expect(parseAuditQuery({ from: 'not-a-date' })).toEqual({
      error: 'from must be an ISO-8601 timestamp',
    });
    expect(parseAuditQuery({ to: 'not-a-date' })).toEqual({
      error: 'to must be an ISO-8601 timestamp',
    });
  });

  it('allows only configured operator identities when an allowlist is present', () => {
    expect(operatorIdentityAllowed('dashboard-operator', [])).toBe(true);
    expect(operatorIdentityAllowed('dashboard-operator', ['dashboard-operator'])).toBe(true);
    expect(operatorIdentityAllowed('unknown-operator', ['dashboard-operator'])).toBe(false);
    expect(operatorIdentityAllowed(undefined, ['dashboard-operator'])).toBe(false);
  });

  it('matches bearer tokens without using ordinary string equality', () => {
    expect(constantTimeTokenMatch('same-token', 'same-token')).toBe(true);
    expect(constantTimeTokenMatch('same-token', 'same-tokeN')).toBe(false);
    expect(constantTimeTokenMatch('short', 'longer-token')).toBe(false);
  });

  it('applies an opt-in attestation TTL without changing signature semantics', () => {
    const attestation = { attestedAt: '2026-08-16T00:00:00.000Z' } as Attestation;
    const issuedAt = Date.parse(attestation.attestedAt);

    expect(isAttestationExpired(attestation, issuedAt + 999, 1000)).toBe(false);
    expect(isAttestationExpired(attestation, issuedAt + 1000, 1000)).toBe(true);
    expect(isAttestationExpired(attestation, issuedAt + 1000, null)).toBe(false);
  });

  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server did not start');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  });

  it('exposes bounded audit evidence with explicit local provenance', async () => {
    const response = await fetch(`${baseUrl}/audit/events?status=passed&limit=2`);
    const body = (await response.json()) as {
      data: Array<{ status: string }>;
      meta: {
        bounded: boolean;
        limit: number;
        total: number;
        source: string;
        keySource: string;
        filters: { status: string | null };
      };
    };

    expect(response.status).toBe(200);
    expect(body.meta.bounded).toBe(true);
    expect(body.meta.limit).toBe(2);
    expect(body.meta.total).toBeGreaterThanOrEqual(body.data.length);
    expect(body.meta.source).toBe('memory');
    expect(body.meta.keySource).toBe('none');
    expect(body.meta.filters.status).toBe('passed');
    expect(body.data.every((event) => event.status === 'passed')).toBe(true);
  });

  it('rejects invalid audit query parameters with a structured error', async () => {
    const response = await fetch(`${baseUrl}/audit/events?limit=0`);
    const body = (await response.json()) as { code: string };

    expect(response.status).toBe(400);
    expect(body.code).toBe('INVALID_AUDIT_QUERY');
  });

  it('exposes unauthenticated non-secret liveness and readiness evidence', async () => {
    const response = await fetch(`${baseUrl}/health`);
    const body = (await response.json()) as ApiResponse<{
      status: string;
      readiness: string;
      checks: {
        observer: string;
        verifier: string;
        attester: string;
        memory: { status: string; integrity: boolean; encryption: string };
        persistence: {
          mode: string;
          encryption: string;
          eventLogSource: string;
          skippedLogEntries: number;
        };
      };
      policy: {
        attestationAlgorithm: string;
        attestationTtlMs: number | null;
        readAuthConfigured: boolean;
        adminAuthConfigured: boolean;
        revocationEnabled: boolean;
      };
    }>;

    expect(response.status).toBe(200);
    expect(body.data.status).toBe('ok');
    expect(body.data.readiness).toBe('ready');
    expect(body.data.checks.observer).toBe('ready');
    expect(body.data.checks.verifier).toBe('ready');
    expect(body.data.checks.attester).toBe('ready');
    expect(body.data.checks.memory).toEqual({
      status: 'ready',
      integrity: true,
      encryption: 'disabled',
    });
    expect(body.data.checks.persistence).toEqual({
      mode: 'memory',
      encryption: 'disabled',
      keySource: 'none',
      currentKeyFingerprint: null,
      previousKeyFingerprint: null,
      previousKeyConfigured: false,
      eventLogSource: 'disabled',
      eventLogReason: null,
      eventLogKeySource: 'none',
      rotationPending: false,
      operatorAction: 'none',
      acknowledgement: null,
      reencrypt: null,
      reencryptionRecovery: { status: 'none', reason: null },
      recoveryPolicy: { mode: 'unavailable', reference: null, reason: null },
      deletionPolicy: { mode: 'unavailable', reason: null, verified: false },
      custodyPolicy: {
        mode: 'unverified-local',
        reference: null,
        reason: null,
        verified: false,
      },
      coordinationPolicy: {
        mode: 'local-single-process',
        reference: null,
        reason: null,
        verified: false,
      },
      coverage: {
        complete: false,
        surfaces: [
          {
            name: 'runtime-snapshot',
            encryption: 'disabled',
            keySource: 'none',
            evidence: 'runtime-observed',
          },
          {
            name: 'event-log',
            encryption: 'disabled',
            keySource: 'none',
            evidence: 'runtime-observed',
          },
          {
            name: 'kernel-memory',
            encryption: 'disabled',
            keySource: 'none',
            evidence: 'runtime-observed',
          },
          {
            name: 'local-job-ledger',
            encryption: 'disabled',
            keySource: 'none',
            evidence: 'runtime-observed',
          },
        ],
        unverifiedSurfaces: ['databases', 'object storage', 'backups', 'external services'],
      },
      skippedLogEntries: 0,
    });
    expect(body.data.policy).toEqual({
      attestationAlgorithm: 'HMAC-SHA256',
      attestationTtlMs: null,
      readAuthConfigured: false,
      adminAuthConfigured: false,
      adminOperatorAllowlistRequired: false,
      revocationEnabled: true,
    });
    expect(JSON.stringify(body)).not.toMatch(/token|secret|private|signing material/i);
  });

  it('propagates bounded observation parent and lineage provenance', async () => {
    const response = await fetch(`${baseUrl}/observe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claim: 'Lineage API contract',
        source: { system: 'api-test', version: '0.1.0', environment: 'test' },
        observedBy: 'jest',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'Lineage contract test',
        parentId: 'obs-parent-api',
        lineage: ['obs-root-api', 'obs-parent-api'],
      }),
    });
    const body = (await response.json()) as ApiResponse<{
      parentId?: string;
      lineage?: string[];
    }>;
    expect(response.status).toBe(201);
    expect(body.data.parentId).toBe('obs-parent-api');
    expect(body.data.lineage).toEqual(['obs-root-api', 'obs-parent-api']);

    const rejected = await fetch(`${baseUrl}/observe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claim: 'Oversized lineage API contract',
        source: { system: 'api-test', version: '0.1.0', environment: 'test' },
        observedBy: 'jest',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'Lineage contract test',
        lineage: Array.from({ length: 33 }, (_, index) => `obs-${index}`),
      }),
    });
    expect(rejected.status).toBe(400);
    expect(((await rejected.json()) as { message: string }).message).toMatch(/lineage/);
  });

  it('executes the loop and records its runtime lineage', async () => {
    const loopResponse = await fetch(`${baseUrl}/complete-loop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-request-id': 'request-contract-1' },
      body: JSON.stringify({
        claim: 'API contract test is healthy',
        category: 'health-check',
        source: { system: 'api-test', version: '0.1.0', environment: 'test' },
        observedBy: 'jest',
        metadata: { responseTime: 42, statusCode: 200 },
        confidence: 0.95,
        confidenceReason: 'Executable contract test',
      }),
    });
    const loop = (await loopResponse.json()) as ApiResponse<LoopPayload>;

    expect(loopResponse.status).toBe(201);
    expect(loopResponse.headers.get('x-request-id')).toBe('request-contract-1');
    expect(loop.data.verification.summary.passed).toBe(true);
    expect(loop.data.attestation.verified).toBe(true);

    const events = (await (await fetch(`${baseUrl}/events`)).json()) as ApiResponse<
      Array<{ correlationId?: string; requestId?: string }>
    >;
    const runs = (await (await fetch(`${baseUrl}/runs`)).json()) as ApiResponse<
      Array<{ observation: { id: string } }>
    >;
    const state = (await (await fetch(`${baseUrl}/state`)).json()) as ApiResponse<{
      readiness: 'ready' | 'degraded';
      trustBasis: {
        evidenceQuality: number | null;
        verificationCoverage: number | null;
        attestationValidity: number | null;
        serviceReadiness: number;
        recentFailures: number;
      };
    }>;

    expect(events.data).toHaveLength(6);
    expect(new Set(events.data.map((event) => event.correlationId)).size).toBe(1);
    expect(new Set(events.data.map((event) => event.requestId)).size).toBe(1);
    expect(events.data[0]?.requestId).toBe('request-contract-1');
    expect(runs.data[0]?.observation.id).toBe(loop.data.observation.id);
    expect(state.data.readiness).toBe('ready');
    expect(state.data.trustBasis.evidenceQuality).toBe(0.95);
    expect(state.data.trustBasis.verificationCoverage).toBe(1);
    expect(state.data.trustBasis.attestationValidity).toBe(1);
    expect(state.data.trustBasis.serviceReadiness).toBe(1);
  });

  /**
   * `GET /audit/events` filters `sourceEvents` with a predicate over type,
   * stage, status, and temporal bounds. The one existing audit-events test
   * ran before any loop populated events, so `sourceEvents` was always
   * empty and the filter callback body itself never executed. This test
   * runs after a completed loop (six distinct events across five stages),
   * so every predicate clause evaluates against real, non-matching and
   * matching entries.
   */
  it('filters bounded audit events by type, stage, and temporal bounds', async () => {
    const unfiltered = (await (await fetch(`${baseUrl}/audit/events?limit=500`)).json()) as {
      data: Array<{ type: string; stage: string; timestamp: string }>;
    };
    expect(unfiltered.data.length).toBeGreaterThanOrEqual(6);

    const byType = (await (
      await fetch(`${baseUrl}/audit/events?type=attestation.created&limit=500`)
    ).json()) as { data: Array<{ type: string }> };
    expect(byType.data.length).toBeGreaterThan(0);
    expect(byType.data.every((event) => event.type === 'attestation.created')).toBe(true);
    expect(byType.data.length).toBeLessThan(unfiltered.data.length);

    const byStage = (await (
      await fetch(`${baseUrl}/audit/events?stage=attest&limit=500`)
    ).json()) as { data: Array<{ stage: string }> };
    expect(byStage.data.length).toBeGreaterThan(0);
    expect(byStage.data.every((event) => event.stage === 'attest')).toBe(true);
    expect(byStage.data.length).toBeLessThan(unfiltered.data.length);

    const farPast = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const excludedByTo = (await (
      await fetch(`${baseUrl}/audit/events?to=${encodeURIComponent(farPast)}&limit=500`)
    ).json()) as { data: unknown[] };
    expect(excludedByTo.data).toHaveLength(0);

    const farFuture = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const excludedByFrom = (await (
      await fetch(`${baseUrl}/audit/events?from=${encodeURIComponent(farFuture)}&limit=500`)
    ).json()) as { data: unknown[] };
    expect(excludedByFrom.data).toHaveLength(0);

    const includedByFrom = (await (
      await fetch(`${baseUrl}/audit/events?from=${encodeURIComponent(farPast)}&limit=500`)
    ).json()) as { data: unknown[] };
    expect(includedByFrom.data.length).toBeGreaterThan(0);
  });

  it('exposes non-secret attestation policy configuration', async () => {
    const response = await fetch(`${baseUrl}/attest/policy`);
    const body = (await response.json()) as ApiResponse<{
      attestationAlgorithm: string;
      attestationTtlMs: number | null;
      readAuthConfigured: boolean;
      adminAuthConfigured: boolean;
      adminOperatorAllowlistConfigured: boolean;
      revocationEnabled: boolean;
      revocationIntegrity: string;
      revocationRevision: number;
      persistenceEncryption: string;
      persistenceEncryptionKeySource: string;
      persistencePreviousKeyConfigured: boolean;
      memoryEncryption: string;
    }>;

    expect(response.status).toBe(200);
    expect(body.data.attestationAlgorithm).toBe('HMAC-SHA256');
    expect(body.data.attestationTtlMs).toBe(null);
    expect(body.data.readAuthConfigured).toBe(false);
    expect(body.data.adminAuthConfigured).toBe(false);
    expect(body.data.adminOperatorAllowlistConfigured).toBe(false);
    expect(body.data.revocationEnabled).toBe(true);
    expect(body.data.revocationIntegrity).toBe('disabled');
    expect(body.data.revocationRevision).toBe(0);
    expect(body.data.persistenceEncryption).toBe('disabled');
    expect(body.data.persistenceEncryptionKeySource).toBe('none');
    expect(body.data.persistencePreviousKeyConfigured).toBe(false);
    expect(body.data.memoryEncryption).toBe('disabled');
    expect(JSON.stringify(body)).not.toMatch(/token|secret|private|signing material/i);
  });

  it('reports runtime provenance and memory evidence without secrets', async () => {
    await fetch(`${baseUrl}/complete-loop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-request-id': 'observability-contract-1' },
      body: JSON.stringify({
        claim: 'Observability contract test is healthy',
        category: 'health-check',
        source: { system: 'api-test', version: '0.1.0', environment: 'test' },
        observedBy: 'jest',
        metadata: { responseTime: 42, statusCode: 200 },
        confidence: 0.95,
        confidenceReason: 'Executable observability contract test',
      }),
    });

    const response = await fetch(`${baseUrl}/observability`);
    const body = (await response.json()) as ApiResponse<{
      runtime: {
        persistence: string;
        persistenceEncryption: string;
        persistenceEncryptionKeySource: string;
        persistencePreviousKeyConfigured: boolean;
        eventLogEncryptionKeySource: string;
        persistenceRotationPending: boolean;
        operatorAction: string;
        memoryEncryption: string;
        memoryEncryptionKeySource: string;
        attestationTtlMs: number | null;
        services: string[];
      };
      provenance: {
        durableEvents: number;
        completedRuns: number;
        lastRequestId: string | null;
      };
      trust: { attestationValidity: number | null };
      memory: {
        entries: number;
        intact: boolean;
        appendOnly: boolean;
        encryption: string;
        encryptionKeySource: string;
      };
    }>;

    expect(response.status).toBe(200);
    expect(body.data.runtime.persistenceEncryption).toBe('disabled');
    expect(body.data.runtime.persistenceEncryptionKeySource).toBe('none');
    expect(body.data.runtime.persistencePreviousKeyConfigured).toBe(false);
    expect(body.data.runtime.eventLogEncryptionKeySource).toBe('none');
    expect(body.data.runtime.persistenceRotationPending).toBe(false);
    expect(body.data.runtime.operatorAction).toBe('none');
    expect(body.data.runtime.memoryEncryption).toBe('disabled');
    expect(body.data.runtime.memoryEncryptionKeySource).toBe('none');
    expect(body.data.runtime.attestationTtlMs).toBe(null);
    expect(body.data.runtime.services).toEqual(['observer', 'verifier', 'attester']);
    expect(body.data.provenance.durableEvents).toBeGreaterThanOrEqual(0);
    expect(body.data.provenance.completedRuns).toBeGreaterThan(0);
    expect(body.data.provenance.lastRequestId).toBe('observability-contract-1');
    expect(body.data.trust.attestationValidity).toBe(true);
    expect(body.data.memory.entries).toBeGreaterThan(0);
    expect(body.data.memory.intact).toBe(true);
    expect(body.data.memory.appendOnly).toBe(true);
    expect(body.data.memory.encryption).toBe('disabled');
    expect(body.data.memory.encryptionKeySource).toBe('none');
    expect(JSON.stringify(body)).not.toMatch(/private|secret|seed|signing material/i);
  });

  it('exports bounded evidence without secrets', async () => {
    const response = await fetch(`${baseUrl}/evidence/export`);
    const body = (await response.json()) as {
      data: {
        observability: { memory: { intact: boolean; appendOnly: boolean } };
        events: unknown[];
        runs: unknown[];
      };
      meta: { bounded: boolean; eventWindow: number; runWindow: number };
    };

    expect(response.status).toBe(200);
    expect(body.meta).toEqual({ bounded: true, eventWindow: 40, runWindow: 10 });
    expect(body.data.observability.memory.intact).toBe(true);
    expect(body.data.observability.memory.appendOnly).toBe(true);
    expect(body.data.events.length).toBeLessThanOrEqual(40);
    expect(body.data.runs.length).toBeLessThanOrEqual(10);
    expect(JSON.stringify(body)).not.toMatch(/private|secret|seed|signing material/i);
  });

  it('verifies the attestation produced by the loop', async () => {
    const loopResponse = await fetch(`${baseUrl}/complete-loop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claim: 'API attestation contract test',
        category: 'health-check',
        source: { system: 'api-test', version: '0.1.0', environment: 'test' },
        observedBy: 'jest',
        metadata: { responseTime: 42, statusCode: 200 },
        confidence: 0.95,
        confidenceReason: 'Executable contract test',
      }),
    });
    const loop = (await loopResponse.json()) as ApiResponse<LoopPayload>;
    const verificationResponse = await fetch(`${baseUrl}/attest/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attestation: loop.data.attestation }),
    });
    const verification = (await verificationResponse.json()) as ApiResponse<{ valid: boolean }>;

    expect(verificationResponse.status).toBe(200);
    expect(verification.data.valid).toBe(true);
  });

  it('enforces the opt-in admin token boundary for revocation', async () => {
    const previousToken = process.env.OMEGA_ADMIN_TOKEN;
    process.env.OMEGA_ADMIN_TOKEN = 'contract-admin-token';
    try {
      const loopResponse = await fetch(`${baseUrl}/complete-loop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claim: 'admin revocation contract',
          category: 'health-check',
          source: { system: 'api-test', version: '0.1.0', environment: 'test' },
          observedBy: 'jest',
          metadata: { responseTime: 42, statusCode: 200 },
          confidence: 0.95,
          confidenceReason: 'Executable admin authorization test',
        }),
      });
      const loop = (await loopResponse.json()) as ApiResponse<LoopPayload>;
      const payload = { attestationId: loop.data.attestation.id, reason: 'contract review' };

      const denied = await fetch(`${baseUrl}/attest/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      expect(denied.status).toBe(401);
      expect(((await denied.json()) as { code: string }).code).toBe('ADMIN_ACCESS_REQUIRED');

      const readTokenDenied = await fetch(`${baseUrl}/attest/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer read-token' },
        body: JSON.stringify(payload),
      });
      expect(readTokenDenied.status).toBe(401);

      const allowed = await fetch(`${baseUrl}/attest/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer contract-admin-token',
        },
        body: JSON.stringify(payload),
      });
      expect(allowed.status).toBe(201);
    } finally {
      if (previousToken === undefined) delete process.env.OMEGA_ADMIN_TOKEN;
      else process.env.OMEGA_ADMIN_TOKEN = previousToken;
    }
  });

  it('enforces the opt-in read-only access token boundary', async () => {
    const previousToken = process.env.OMEGA_READ_TOKEN;
    process.env.OMEGA_READ_TOKEN = 'contract-read-token';
    try {
      const denied = await fetch(`${baseUrl}/observability`);
      const deniedBody = (await denied.json()) as { code: string; requestId: string };
      expect(denied.status).toBe(401);
      expect(deniedBody.code).toBe('READ_ACCESS_REQUIRED');

      const allowed = await fetch(`${baseUrl}/observability`, {
        headers: { Authorization: 'Bearer contract-read-token' },
      });
      expect(allowed.status).toBe(200);
    } finally {
      if (previousToken === undefined) delete process.env.OMEGA_READ_TOKEN;
      else process.env.OMEGA_READ_TOKEN = previousToken;
    }
  });

  it('sanitizes untrusted request IDs and emits baseline security headers', async () => {
    const response = await fetch(`${baseUrl}/health`, {
      headers: { 'x-request-id': 'bad id with spaces and\\ncontrol' },
    });

    const requestId = response.headers.get('x-request-id');
    expect(response.status).toBe(200);
    expect(requestId).toMatch(/^req-[0-9a-f-]{36}$/);
    expect(requestId).not.toContain(' ');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
  });

  it('includes request provenance in error responses', async () => {
    const response = await fetch(`${baseUrl}/attest/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-request-id': 'error-contract-1' },
      body: JSON.stringify({}),
    });
    const error = (await response.json()) as { code: string; requestId: string };

    expect(response.status).toBe(400);
    expect(error.code).toBe('MISSING_ATTESTATION');
    expect(error.requestId).toBe('error-contract-1');
    expect(response.headers.get('x-request-id')).toBe('error-contract-1');
  });

  /**
   * `POST /attest/verify`'s handler wraps the whole verification path in a
   * try/catch, but every prior test only ever reached its success path: a
   * missing attestation is caught earlier by an explicit guard, and a
   * well-formed-but-wrong signature makes `AttestationService.verify` return
   * false rather than throw. The catch block itself, the one that turns an
   * unexpected exception into ATTESTATION_VERIFICATION_FAILED, had never run.
   *
   * `AttestationService.verify` calls `attestation.signature.replace(...)`
   * directly, with no type guard beyond a truthiness check. A `signature`
   * that is present and truthy but not a string, here a bare number, passes
   * that guard and then throws a real TypeError from inside the service,
   * which is exactly the unexpected-exception path this route's catch
   * exists to convert into a structured error rather than a raw 500.
   */
  it('reports an unexpected verification failure rather than a raw 500', async () => {
    const response = await fetch(`${baseUrl}/attest/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attestation: {
          signature: 12345,
          verificationId: 'v-malformed',
          observationId: 'o-malformed',
          status: 'signed',
          keyVersion: '1',
        },
      }),
    });
    const body = (await response.json()) as { code: string; message: string };

    expect(response.status).toBe(400);
    expect(body.code).toBe('ATTESTATION_VERIFICATION_FAILED');
    expect(body.message).toBe('attestation.signature.replace is not a function');
  });

  it('streams a ready frame and lifecycle events over SSE', async () => {
    const streamResponse = await fetch(`${baseUrl}/events/stream`);
    expect(streamResponse.headers.get('content-type')).toContain('text/event-stream');
    if (!streamResponse.body) throw new Error('SSE response has no body');

    const reader = streamResponse.body.getReader();
    const readyChunk = await reader.read();
    expect(new TextDecoder().decode(readyChunk.value)).toContain('event: ready');

    await fetch(`${baseUrl}/complete-loop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claim: 'SSE contract test',
        category: 'health-check',
        source: { system: 'api-test', version: '0.1.0', environment: 'test' },
        observedBy: 'jest',
        metadata: { responseTime: 42, statusCode: 200 },
        confidence: 0.95,
        confidenceReason: 'Executable contract test',
      }),
    });

    const eventChunk = await Promise.race([
      reader.read(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timed out waiting for SSE lifecycle event')), 1000)
      ),
    ]);
    expect(new TextDecoder().decode(eventChunk.value)).toContain('observation.received');
    await reader.cancel();
  });

  it('authorizes an action only from a verified attestation', async () => {
    const loopResponse = await fetch(`${baseUrl}/complete-loop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claim: 'API action contract test',
        category: 'health-check',
        source: { system: 'api-test', version: '0.1.0', environment: 'test' },
        observedBy: 'jest',
        metadata: { responseTime: 42, statusCode: 200 },
        confidence: 0.95,
        confidenceReason: 'Executable contract test',
      }),
    });
    const loop = (await loopResponse.json()) as ApiResponse<LoopPayload>;
    const actionResponse = await fetch(`${baseUrl}/act`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attestation: loop.data.attestation }),
    });
    const action = (await actionResponse.json()) as ApiResponse<{ id: string; status: string }>;

    expect(actionResponse.status).toBe(201);
    expect(action.data.status).toBe('authorized');

    const standaloneObservationResponse = await fetch(`${baseUrl}/observe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claim: 'Standalone attestation must not act',
        category: 'health-check',
        source: { system: 'api-test', version: '0.1.0', environment: 'test' },
        observedBy: 'jest',
        metadata: { responseTime: 42, statusCode: 200 },
        confidence: 0.95,
        confidenceReason: 'Executable contract test',
      }),
    });
    const standaloneObservation = (
      (await standaloneObservationResponse.json()) as ApiResponse<Record<string, unknown>>
    ).data;
    const standaloneVerificationResponse = await fetch(`${baseUrl}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ observation: standaloneObservation }),
    });
    const standaloneVerification = (
      (await standaloneVerificationResponse.json()) as ApiResponse<Record<string, unknown>>
    ).data;
    const standaloneAttestationResponse = await fetch(`${baseUrl}/attest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verificationResult: standaloneVerification }),
    });
    const standaloneAttestation = (
      (await standaloneAttestationResponse.json()) as ApiResponse<{ id: string; verified: boolean }>
    ).data;
    const orphanActionResponse = await fetch(`${baseUrl}/act`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attestation: standaloneAttestation }),
    });

    expect(orphanActionResponse.status).toBe(404);

    const learningResponse = await fetch(`${baseUrl}/learn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actionId: action.data.id,
        outcome: 'success',
        note: 'The authorized record was accepted by the local runtime.',
      }),
    });
    const learning = (await learningResponse.json()) as ApiResponse<{
      actionId: string;
      outcome: string;
    }>;

    expect(learningResponse.status).toBe(201);
    expect(learning.data.actionId).toBe(action.data.id);
    expect(learning.data.outcome).toBe('success');

    const recompileResponse = await fetch(`${baseUrl}/recompile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ learningId: learning.data.actionId }),
    });
    expect(recompileResponse.status).toBe(404);

    const learningRecord = (await (await fetch(`${baseUrl}/learning`)).json()) as ApiResponse<
      Array<{ id: string }>
    >;
    const validRecompileResponse = await fetch(`${baseUrl}/recompile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ learningId: learningRecord.data[0]?.id }),
    });
    const proposal = (await validRecompileResponse.json()) as ApiResponse<{ status: string }>;

    expect(validRecompileResponse.status).toBe(201);
    expect(proposal.data.status).toBe('proposed');

    const failedLoopResponse = await fetch(`${baseUrl}/complete-loop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claim: 'API action denial contract test',
        category: 'health-check',
        source: { system: 'api-test', version: '0.1.0', environment: 'test' },
        observedBy: 'jest',
        metadata: { responseTime: 120, statusCode: 200 },
        confidence: 0.95,
        confidenceReason: 'Executable contract test',
      }),
    });
    const failedLoop = (await failedLoopResponse.json()) as ApiResponse<LoopPayload>;
    const deniedResponse = await fetch(`${baseUrl}/act`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attestation: failedLoop.data.attestation }),
    });

    expect(deniedResponse.status).toBe(409);

    const missingLearningResponse = await fetch(`${baseUrl}/learn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionId: 'act-missing', outcome: 'success' }),
    });
    expect(missingLearningResponse.status).toBe(404);
  });
});

/**
 * Every mutating route persists before it reports success: /complete-loop,
 * /act, /learn, and /recompile each update in-memory state and then call
 * `persistRuntime()`, inside the same `try`. A real disk failure there
 * (ENOSPC, EACCES, a store path that stopped being a directory) has never
 * been exercised — the four catch blocks that turn it into a 400 have run
 * zero times in the suite.
 *
 * The failure is reproduced for real rather than mocked: the runtime store's
 * directory is replaced with a plain file part-way through the test, so
 * `mkdirSync`'s own failure is what each route catches. This mirrors the
 * technique already used in `persistence.test.ts`'s "reports a reason when
 * the append itself fails" case.
 *
 * `recordEvent()` — called by every one of these routes — persists too, and
 * runs before `/complete-loop` ever creates an observation. So persistence is
 * left working for one initial `/complete-loop` call (to obtain a real,
 * verified attestation the same way every other test in this file does),
 * then broken, then exercised: a second `/complete-loop` call demonstrates
 * `LOOP_FAILED`, and the attestation from the first call is carried into
 * `/act`, whose own success updates `runtimeActions` before its persist call
 * fails — so `/learn` and, in turn, `/recompile` each still have a valid
 * precondition to react to even though every persist from this point on
 * fails.
 *
 * Node core errors constructed outside a Jest-sandboxed module realm are not
 * `instanceof` that realm's `Error` (a documented Jest quirk, confirmed by
 * direct inspection in this repository: `mkdirSync`'s thrown error has
 * `constructor.name === 'Error'` but fails `instanceof Error` here). Every
 * route's fallback branch — `error instanceof Error ? error.message :
 * '<fallback text>'` — is what actually runs as a result, so that is what
 * these assertions check. That is a faithful description of this suite's
 * behaviour; it is a weaker check than asserting the real OS error message,
 * but the alternative (asserting a message the branch never produces here)
 * would be asserting something false.
 */
describe('Runtime persistence failures reach the route handlers that trigger them', () => {
  let server: Server;
  let baseUrl: string;
  let storeDir: string;

  beforeAll(async () => {
    const dir = mkdtempSync(join(tmpdir(), 'omega-api-persist-fail-'));
    storeDir = join(dir, 'store');

    process.env.OMEGA_PERSISTENCE = 'on';
    process.env.OMEGA_RUNTIME_STORE_PATH = join(storeDir, 'runtime.json');

    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const isolated = require('../index') as { app: typeof app };
    server = createServer(isolated.app);
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
    delete process.env.OMEGA_RUNTIME_STORE_PATH;
    jest.resetModules();
  });

  it('reports LOOP_FAILED, ACTION_FAILED, LEARNING_FAILED, and RECOMPILE_FAILED once the store stops being writable', async () => {
    const workingLoopResponse = await fetch(`${baseUrl}/complete-loop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claim: 'Persistence failure contract test setup',
        category: 'health-check',
        source: { system: 'api-test', version: '0.1.0', environment: 'test' },
        observedBy: 'jest',
        metadata: { responseTime: 42, statusCode: 200 },
        confidence: 0.95,
        confidenceReason: 'Executable contract test',
      }),
    });
    const workingLoop = (await workingLoopResponse.json()) as ApiResponse<LoopPayload>;
    expect(workingLoopResponse.status).toBe(201);
    const attestation = workingLoop.data.attestation;

    rmSync(storeDir, { recursive: true, force: true });
    writeFileSync(storeDir, 'not a directory');

    const brokenLoopResponse = await fetch(`${baseUrl}/complete-loop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claim: 'Persistence failure contract test',
        category: 'health-check',
        source: { system: 'api-test', version: '0.1.0', environment: 'test' },
        observedBy: 'jest',
        metadata: { responseTime: 42, statusCode: 200 },
        confidence: 0.95,
        confidenceReason: 'Executable contract test',
      }),
    });
    const brokenLoop = (await brokenLoopResponse.json()) as { code: string; message: string };
    expect(brokenLoopResponse.status).toBe(400);
    expect(brokenLoop.code).toBe('LOOP_FAILED');
    expect(brokenLoop.message).toBe('Verification loop failed');

    const actionResponse = await fetch(`${baseUrl}/act`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attestation }),
    });
    const action = (await actionResponse.json()) as { code: string; message: string };
    expect(actionResponse.status).toBe(400);
    expect(action.code).toBe('ACTION_FAILED');
    expect(action.message).toBe('Action authorization failed');

    const actions = (await (await fetch(`${baseUrl}/actions`)).json()) as ApiResponse<
      Array<{ id: string }>
    >;
    expect(actions.data).toHaveLength(1);

    const learningResponse = await fetch(`${baseUrl}/learn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionId: actions.data[0].id, outcome: 'success' }),
    });
    const learning = (await learningResponse.json()) as { code: string; message: string };
    expect(learningResponse.status).toBe(400);
    expect(learning.code).toBe('LEARNING_FAILED');
    expect(learning.message).toBe('Learning recording failed');

    const learnings = (await (await fetch(`${baseUrl}/learning`)).json()) as ApiResponse<
      Array<{ id: string }>
    >;
    expect(learnings.data).toHaveLength(1);

    const recompileResponse = await fetch(`${baseUrl}/recompile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ learningId: learnings.data[0].id }),
    });
    const recompile = (await recompileResponse.json()) as { code: string; message: string };
    expect(recompileResponse.status).toBe(400);
    expect(recompile.code).toBe('RECOMPILE_FAILED');
    expect(recompile.message).toBe('Recompile proposal failed');
  });
});

/**
 * A partial durable log is inspectable but not production-ready: the API must
 * expose the loss at both the probe boundary and the state trust boundary.
 */
describe('partial durable-log recovery readiness', () => {
  let server: Server;
  let baseUrl: string;
  let dir: string;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'omega-api-partial-log-'));
    const storePath = join(dir, 'runtime.json');
    const logPath = join(dir, 'runtime.log.jsonl');
    writeFileSync(logPath, '{ not json\\n');

    process.env.OMEGA_PERSISTENCE = 'on';
    process.env.OMEGA_RUNTIME_STORE_PATH = storePath;
    process.env.OMEGA_EVENT_LOG_PATH = logPath;
    process.env.OMEGA_ADMIN_OPERATOR_ALLOWLIST = 'jest-operator';

    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const isolated = require('../index') as { app: typeof app };
    server = createServer(isolated.app);
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
    delete process.env.OMEGA_RUNTIME_STORE_PATH;
    delete process.env.OMEGA_EVENT_LOG_PATH;
    delete process.env.OMEGA_ADMIN_OPERATOR_ALLOWLIST;
    rmSync(dir, { recursive: true, force: true });
    jest.resetModules();
  });

  it('fails health readiness closed and carries the skipped-line evidence into state', async () => {
    const healthResponse = await fetch(`${baseUrl}/health`);
    const health = (await healthResponse.json()) as ApiResponse<{
      readiness: string;
      checks: {
        persistence: {
          eventLogSource: string;
          eventLogReason: string | null;
          eventLogKeySource: string;
          skippedLogEntries: number;
        };
      };
    }>;

    expect(healthResponse.status).toBe(503);
    expect(health.data.readiness).toBe('degraded');
    expect(health.data.checks.persistence).toMatchObject({
      eventLogSource: 'partial',
      eventLogReason: '1 line(s) could not be parsed',
      eventLogKeySource: 'none',
      skippedLogEntries: 1,
    });

    const stateResponse = await fetch(`${baseUrl}/state`);
    const state = (await stateResponse.json()) as ApiResponse<{
      readiness: 'ready' | 'degraded';
      eventLogSource: string;
      eventLogReason: string | null;
      eventLogKeySource: string;
      skippedLogEntries: number;
      trustBasis: { serviceReadiness: number };
    }>;

    expect(stateResponse.status).toBe(200);
    expect(state.data.readiness).toBe('degraded');
    expect(state.data.eventLogSource).toBe('partial');
    expect(state.data.eventLogReason).toBe('1 line(s) could not be parsed');
    expect(state.data.eventLogKeySource).toBe('none');
    expect(state.data.skippedLogEntries).toBe(1);
    expect(state.data.trustBasis.serviceReadiness).toBe(0);

    const denied = await fetch(`${baseUrl}/persistence/acknowledge`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-omega-operator-id': 'unknown' },
      body: JSON.stringify({ reason: 'Review malformed local log', operatorId: 'unknown' }),
    });
    expect(denied.status).toBe(403);

    const invalid = await fetch(`${baseUrl}/persistence/acknowledge`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-omega-operator-id': 'jest-operator' },
      body: JSON.stringify({ reason: 'short', operatorId: 'jest-operator' }),
    });
    expect(invalid.status).toBe(400);

    const acknowledged = await fetch(`${baseUrl}/persistence/acknowledge`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-omega-operator-id': 'jest-operator' },
      body: JSON.stringify({
        reason: 'Review malformed local log before repair',
        operatorId: 'jest-operator',
      }),
    });
    const acknowledgement = (await acknowledged.json()) as ApiResponse<{
      acknowledgement: { operatorId: string; action: string; reason: string };
      eventId: string;
    }>;
    expect(acknowledged.status).toBe(201);
    expect(acknowledgement.data.acknowledgement).toMatchObject({
      operatorId: 'jest-operator',
      action: 'review-partial-recovery',
      reason: 'Review malformed local log before repair',
    });
    expect(acknowledgement.data.eventId).toMatch(/^evt-/);

    const observability = (await (await fetch(`${baseUrl}/observability`)).json()) as ApiResponse<{
      runtime: { persistenceAcknowledgement: { operatorId: string; action: string } | null };
    }>;
    expect(observability.data.runtime.persistenceAcknowledgement).toMatchObject({
      operatorId: 'jest-operator',
      action: 'review-partial-recovery',
    });
  });
});

describe('persistence re-encryption boundary', () => {
  let server: Server;
  let baseUrl: string;
  let dir: string;
  let storePath: string;
  let logPath: string;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'omega-api-reencrypt-'));
    storePath = join(dir, 'runtime.json');
    logPath = join(dir, 'runtime.log.jsonl');
    const snapshot = {
      events: [],
      runs: [],
      actions: [],
      learnings: [],
      recompilations: [],
    };
    saveSnapshot(storePath, snapshot, true, 'previous-secret');
    appendEvent(logPath, { id: 'evt-previous' }, true, 'previous-secret');
    process.env.OMEGA_PERSISTENCE = 'on';
    process.env.OMEGA_PERSISTENCE_KEY = 'current-secret';
    process.env.OMEGA_PERSISTENCE_KEY_PREVIOUS = 'previous-secret';
    process.env.OMEGA_RUNTIME_STORE_PATH = storePath;
    process.env.OMEGA_EVENT_LOG_PATH = logPath;
    process.env.OMEGA_ADMIN_OPERATOR_ALLOWLIST = 'rotation-operator';

    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const isolated = require('../index') as { app: typeof app };
    server = createServer(isolated.app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
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
      'OMEGA_PERSISTENCE_KEY',
      'OMEGA_PERSISTENCE_KEY_PREVIOUS',
      'OMEGA_RUNTIME_STORE_PATH',
      'OMEGA_EVENT_LOG_PATH',
      'OMEGA_ADMIN_OPERATOR_ALLOWLIST',
    ]) {
      delete process.env[name];
    }
    rmSync(dir, { recursive: true, force: true });
    jest.resetModules();
  });

  it('re-encrypts complete previous-key evidence and emits non-secret completion metadata', async () => {
    const response = await fetch(`${baseUrl}/persistence/reencrypt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-omega-operator-id': 'rotation-operator' },
      body: JSON.stringify({
        reason: 'Rotate complete local persistence to the current key',
        operatorId: 'rotation-operator',
      }),
    });
    const body = (await response.json()) as ApiResponse<{
      reencrypted: {
        operatorId: string;
        action: string;
        snapshotRecords: number;
        eventRecords: number;
      };
      eventId: string;
    }>;
    expect(response.status).toBe(201);
    expect(body.data.reencrypted).toMatchObject({
      operatorId: 'rotation-operator',
      action: 'review-key-rotation',
      snapshotRecords: 0,
      eventRecords: 1,
    });
    expect(body.data.eventId).toMatch(/^evt-/);
    expect(loadSnapshot(storePath, true, 'current-secret').keySource).toBe('current');
    expect(readEventLog<{ id: string }>(logPath, true, 'current-secret').entries).toEqual(
      expect.arrayContaining([
        { id: 'evt-previous' },
        expect.objectContaining({ type: 'persistence.rotation.reencrypted' }),
      ])
    );
  });
});

describe('persistence re-encryption journal startup boundary', () => {
  let server: Server;
  let baseUrl: string;
  let dir: string;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'omega-api-reencrypt-journal-'));
    const storePath = join(dir, 'runtime.json');
    writeFileSync(reencryptionJournalPath(storePath), '{ malformed journal');
    process.env.OMEGA_PERSISTENCE = 'on';
    process.env.OMEGA_RUNTIME_STORE_PATH = storePath;
    process.env.OMEGA_EVENT_LOG_PATH = join(dir, 'runtime.log.jsonl');

    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const isolated = require('../index') as { app: typeof app };
    server = createServer(isolated.app);
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
    delete process.env.OMEGA_RUNTIME_STORE_PATH;
    delete process.env.OMEGA_EVENT_LOG_PATH;
    rmSync(dir, { recursive: true, force: true });
    jest.resetModules();
  });

  it('fails readiness closed and exposes blocked journal evidence', async () => {
    const response = await fetch(`${baseUrl}/health`);
    const body = (await response.json()) as ApiResponse<{
      readiness: string;
      checks: { persistence: { reencryptionRecovery: { status: string; reason: string | null } } };
    }>;
    expect(response.status).toBe(503);
    expect(body.data.readiness).toBe('degraded');
    expect(body.data.checks.persistence.reencryptionRecovery).toMatchObject({
      status: 'blocked',
      reason: 're-encryption journal is unreadable',
    });
  });
});

/**
 * The API optionally serves apps/web's production bundle: `webBuildPresent`
 * is computed once at module load from `OMEGA_WEB_DIST`, so exercising it
 * means requiring a freshly isolated copy of the module with that variable
 * pointed at a real directory, the same technique the persistence-failure
 * suite above uses for its own load-time condition.
 *
 * In every other suite in this file, `OMEGA_WEB_DIST` is unset and no build
 * exists at the default `apps/web/dist` path in a clean checkout, so
 * `webBuildPresent` is false and neither the static middleware registration
 * nor the SPA fallback in the catch-all handler ever runs. That is a real
 * coverage gap, not just an artifact of this suite's setup: a CI run that
 * executes tests before the build step (as this repo's `verify:full` does)
 * exercises the API with no production bundle in earshot.
 */
describe('static web client, when a build is present', () => {
  let server: Server;
  let baseUrl: string;
  let distDir: string;

  beforeAll(async () => {
    distDir = mkdtempSync(join(tmpdir(), 'omega-api-web-dist-'));
    writeFileSync(join(distDir, 'index.html'), '<!doctype html><title>Omega web</title>');
    writeFileSync(join(distDir, 'app.js'), 'console.log("omega web bundle");');

    process.env.OMEGA_WEB_DIST = distDir;

    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const isolated = require('../index') as { app: typeof app };
    server = createServer(isolated.app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server did not start');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
    delete process.env.OMEGA_WEB_DIST;
    rmSync(distDir, { recursive: true, force: true });
    jest.resetModules();
  });

  it('serves a built static asset directly from the bundle', async () => {
    const response = await fetch(`${baseUrl}/app.js`);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('console.log("omega web bundle");');
  });

  it('falls back to index.html for an unmatched client route the browser navigates to', async () => {
    const response = await fetch(`${baseUrl}/observe/some/client-side/route`, {
      headers: { Accept: 'text/html' },
    });

    // A single-page client owns its own routes; the API cannot know whether
    // "/observe/some/client-side/route" is real, so it hands back the shell
    // and lets the client's own router decide. Answering with a bare 404
    // here would break every deep link into the dashboard.
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('<!doctype html><title>Omega web</title>');
  });

  it('still returns a structured JSON 404 for an unmatched API-style request even when a build is present', async () => {
    const response = await fetch(`${baseUrl}/observe/some/client-side/route`, {
      headers: { Accept: 'application/json' },
    });

    // The SPA fallback is for browser navigations only. A caller that asked
    // for JSON did not get lost in the client router; it hit a route that
    // genuinely does not exist, and pretending otherwise would hide that.
    expect(response.status).toBe(404);
    expect(((await response.json()) as { code: string }).code).toBe('NOT_FOUND');
  });
});
