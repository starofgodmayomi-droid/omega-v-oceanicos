/**
 * Ω∞v E2E INTEGRATION: COGNITIVE API & VERIFICATION LOOP
 * ────────────────────────────────────────────────────────
 * Validates the unified cognitive loop routes and auth helpers
 * exposed by the Fastify API (createApp).
 */

import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import {
  createApp,
  constantTimeTokenMatch,
  isAttestationExpired,
  operatorIdentityAllowed,
  revocationRegistryDigest,
  parseAuditQuery,
} from '../../apps/api/src/index.js';
import type { Attestation } from '@oceanicos/types';

describe('Fastify API — Cognitive Verification Loop & Auth Endpoints', () => {
  let app: any;

  beforeAll(async () => {
    process.env.OMEGA_SIGNING_KEY =
      process.env.OMEGA_SIGNING_KEY || 'omega-v-default-attestation-secret-key-2026';
    app = createApp(':memory:', false);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Cognitive REST endpoints', () => {
    let observationId: string;
    let observationPayload: any;

    it('POST /observe creates a normalized Observation', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/observe',
        payload: {
          claim: 'API latency nominal at 45ms',
          category: 'health-check',
          source: { system: 'api-monitor', version: '1.0.0', environment: 'production' },
          confidence: 0.95,
          confidenceReason: 'Telemetry nominal',
          metadata: { responseTime: 45, statusCode: 200 },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.observation).toBeDefined();
      expect(body.observation.id).toMatch(/^obs-/);
      expect(body.observation.claim.statement).toBe('API latency nominal at 45ms');
      expect(body.observation.status).toBe('normalized');

      observationId = body.observation.id;
      observationPayload = body.observation;
    });

    it('POST /verify verifies the observation and yields VerificationResult', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/verify',
        payload: observationPayload,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.verification).toBeDefined();
      expect(body.verification.observationId).toBe(observationId);
      expect(body.verification.summary).toBeDefined();
      expect(body.verification.status).toBe('completed');
    });

    it('POST /mini/cycle executes full Observe ➔ Verify ➔ Remember cycle', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/mini/cycle',
        payload: {
          claim: 'Database replica synchronized',
          category: 'replication',
          source: { system: 'db-monitor', version: '1.0.0', environment: 'production' },
          confidence: 0.98,
          confidenceReason: 'Zero replication lag observed',
          metadata: { lagMs: 0 },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.observation).toBeDefined();
      expect(body.verification).toBeDefined();
      expect(body.memory).toBeDefined();
      expect(body.entries).toHaveLength(3);
      expect(body.completedAt).toBeDefined();
    });

    it('GET /mini/integrity verifies memory hash chain integrity', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/mini/integrity',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.valid).toBe(true);
      expect(body.size).toBeGreaterThanOrEqual(3);
    });

    it('GET /memory returns chained memory records', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/memory',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.entries)).toBe(true);
      expect(body.entries.length).toBeGreaterThanOrEqual(3);
    });

    it('GET /rules lists registered verification rules', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/rules',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(typeof body.count).toBe('number');
      expect(Array.isArray(body.rules)).toBe(true);
    });

    it('POST /complete-loop executes full cycle with cryptographic attestation', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/complete-loop',
        payload: {
          claim: 'Production cluster telemetry nominal',
          category: 'cluster',
          source: { system: 'cluster-monitor', version: '1.0.0', environment: 'production' },
          confidence: 0.99,
          confidenceReason: 'All nodes green',
          metadata: { nodeCount: 16 },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.observation).toBeDefined();
      expect(body.verification).toBeDefined();
      expect(body.memory).toBeDefined();
      expect(body.attestation).toBeDefined();
      expect(body.attestation.signature).toBeTruthy();
      expect(body.attestation.signingAlgorithm).toBe('HMAC-SHA256');
    });
  });

  describe('Auth & governance helpers', () => {
    it('constantTimeTokenMatch matches identical tokens safely', () => {
      expect(constantTimeTokenMatch('secret-token-123', 'secret-token-123')).toBe(true);
      expect(constantTimeTokenMatch('secret-token-123', 'wrong-token')).toBe(false);
      expect(constantTimeTokenMatch('secret-token-123', 'secret-token-124')).toBe(false);
    });

    it('operatorIdentityAllowed evaluates permissions correctly', () => {
      expect(operatorIdentityAllowed(undefined, [])).toBe(true);
      expect(operatorIdentityAllowed('alice', ['alice', 'bob'])).toBe(true);
      expect(operatorIdentityAllowed('eve', ['alice', 'bob'])).toBe(false);
      expect(operatorIdentityAllowed('alice', [], true)).toBe(false);
    });

    it('revocationRegistryDigest computes deterministic sha256 digest', () => {
      const records = [
        {
          id: 'rev-1',
          attestationId: 'att-1',
          reason: 'key-rotation',
          revokedBy: 'admin',
          revokedAt: '2026-09-01T00:00:00.000Z',
        },
      ];
      const digest1 = revocationRegistryDigest(records);
      const digest2 = revocationRegistryDigest(records);
      expect(digest1).toMatch(/^sha256:[0-9a-f]{64}$/);
      expect(digest1).toBe(digest2);
    });

    it('isAttestationExpired correctly checks TTL', () => {
      const recentAttestation: Attestation = {
        id: 'att-recent',
        verificationId: 'ver-1',
        observationId: 'obs-1',
        verified: true,
        confidence: 1.0,
        signature: 'sig',
        signingKey: 'key',
        keyVersion: '1',
        signingAlgorithm: 'HMAC-SHA256',
        attestedAt: new Date().toISOString(),
        attestedBy: 'test',
        status: 'signed',
      };

      const expiredAttestation: Attestation = {
        ...recentAttestation,
        attestedAt: new Date(Date.now() - 100000).toISOString(),
      };

      expect(isAttestationExpired(recentAttestation, Date.now(), 60000)).toBe(false);
      expect(isAttestationExpired(expiredAttestation, Date.now(), 60000)).toBe(true);
      expect(isAttestationExpired(expiredAttestation, Date.now(), null)).toBe(false);
    });

    it('parseAuditQuery validates query boundaries', () => {
      const valid = parseAuditQuery({ status: 'passed', limit: '50' });
      expect('query' in valid).toBe(true);
      if ('query' in valid) {
        expect(valid.query.status).toBe('passed');
        expect(valid.query.limit).toBe(50);
      }

      const invalidStatus = parseAuditQuery({ status: 'unknown' });
      expect('error' in invalidStatus).toBe(true);

      const invalidLimit = parseAuditQuery({ limit: '9999' });
      expect('error' in invalidLimit).toBe(true);
    });
  });
});
