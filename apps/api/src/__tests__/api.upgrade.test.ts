/**
 * Contract test for GET & POST /v1/upgrade.
 * Verifies fail-closed admission, cryptographic chain progression, and HTTP surface.
 */
import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { createApp } from '../index.js';
import type { FastifyInstance } from 'fastify';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('V1111 Upgrade HTTP Surface (/v1/upgrade)', () => {
  let app: FastifyInstance;
  let dir: string;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'omega-upgrade-api-'));
    app = createApp(join(dir, 'test.db'), false, { allowUnsignedCycle: true });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('GET /v1/upgrade returns active status and baseline invariants', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/upgrade' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.active).toBe(true);
    expect(body.contract).toBe('Ω∞v-V1111-UPGRADE');
    expect(body.invariants.failClosed).toBe(true);
    expect(body.invariants.humanConsentRequired).toBe(true);
  });

  it('POST /v1/upgrade rejects missing required fields with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/upgrade',
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('MISSING_CLAIM');
  });

  it('POST /v1/upgrade fails closed with 403 when observation is not AUTHORIZED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/upgrade',
      payload: {
        claim: 'Autonomous upgrade attempt without authorization',
        observation: { status: 'UNVERIFIED', uuid: 'obs-001' },
        provenanceHash: '0x1111222233334444',
      },
    });
    expect(res.statusCode).toBe(403);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.status).toBe('UNKNOWN');
    expect(body.reason).toBe('FAIL_CLOSED_UNAUTHORIZED');
    expect(body.evidencePath).toContain('upgrade.missing_human_signature');
  });

  it('POST /v1/upgrade succeeds and appends to hash chain when AUTHORIZED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/upgrade',
      payload: {
        claim: 'V1111 Canonical System Convergence Transition',
        observation: { status: 'AUTHORIZED', uuid: 'obs-auth-001' },
        provenanceHash: '0xdeadbeef11112222333344445555666677778888',
        actors: ['human:elion-varel', 'agent:omega-v'],
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.status).toBe('VERIFIED');
    expect(body.upgrade.chainLength).toBeGreaterThanOrEqual(1);
    expect(body.upgrade.tipHash).toMatch(/^[0-9a-f]{64}$/);
    expect(body.canonicalState.verificationStatus).toBe('VERIFIED');
    expect(body.canonicalState.stateId).toBeDefined();

    // Verify GET /v1/upgrade now reflects the progression
    const getRes = await app.inject({ method: 'GET', url: '/v1/upgrade' });
    const getBody = getRes.json();
    expect(getBody.chainLength).toBe(body.upgrade.chainLength);
    expect(getBody.tipHash).toBe(body.upgrade.tipHash);
  });
});
