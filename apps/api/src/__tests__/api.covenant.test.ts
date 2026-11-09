/**
 * Contract test for Biblical Engine & Covenant State Machine HTTP surface:
 * GET & POST /v1/covenant, /v1/covenant/transition, /v1/covenant/sanctum/verify.
 */
import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { createApp } from '../index.js';
import type { FastifyInstance } from 'fastify';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { CANONICAL_STEWARD_DID } from '@oceanicos/authorization';

describe('Biblical Engine HTTP Surface (/v1/covenant)', () => {
  let app: FastifyInstance;
  let dir: string;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'omega-covenant-api-'));
    app = createApp(join(dir, 'test.db'), false, { allowUnsignedCycle: true });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('GET /v1/covenant returns list including genesis covenant', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/covenant' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBeGreaterThanOrEqual(1);
    expect(body.covenants[0].covenantId).toBe('cov-genesis-1111');
    expect(body.covenants[0].thread.sanctum).toBe('HOLY_OF_HOLIES');
  });

  it('GET /v1/covenant/:id returns 404 for non-existent covenant', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/covenant/cov-unknown-999' });
    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('COVENANT_NOT_FOUND');
  });

  it('POST /v1/covenant creates a new covenant in PROMISED status', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/covenant',
      payload: {
        covenantId: 'cov-sanctuary-alpha',
        title: 'Community Sanctuary Clean Energy Initiative',
        terms: ['Local solar generation', 'Zero debt burden', 'Youth digital craftsmanship'],
        sanctum: 'HOLY_PLACE',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.covenant.status).toBe('PROMISED');
    expect(body.covenant.thread.covenantStateHash).toHaveLength(64);
  });

  it('POST /v1/covenant rejects duplicate covenant ID with 409', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/covenant',
      payload: {
        covenantId: 'cov-sanctuary-alpha',
        title: 'Duplicate attempt',
        terms: ['Test term'],
      },
    });
    expect(res.statusCode).toBe(409);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('COVENANT_ALREADY_EXISTS');
  });

  it('POST /v1/covenant/transition enforces fail-closed sealing authorization', async () => {
    // Unauthorized attempt
    const failRes = await app.inject({
      method: 'POST',
      url: '/v1/covenant/transition',
      payload: {
        covenantId: 'cov-sanctuary-alpha',
        targetStatus: 'SEALED',
        requestedBy: 'unauthorized-worker',
        reason: 'Attempt unauthorized seal',
      },
    });
    expect(failRes.statusCode).toBe(403);
    const failBody = failRes.json();
    expect(failBody.success).toBe(false);
    expect(failBody.error).toBe('UNAUTHORIZED_SEALING_ATTEMPT');

    // Authorized sealing by Human Steward
    const passRes = await app.inject({
      method: 'POST',
      url: '/v1/covenant/transition',
      payload: {
        covenantId: 'cov-sanctuary-alpha',
        targetStatus: 'SEALED',
        requestedBy: CANONICAL_STEWARD_DID,
        reason: 'Attested and sealed by Human Root',
      },
    });
    expect(passRes.statusCode).toBe(200);
    const passBody = passRes.json();
    expect(passBody.success).toBe(true);
    expect(passBody.newStatus).toBe('SEALED');
    expect(passBody.covenant.attestationHash).toHaveLength(64);
  });

  it('POST /v1/covenant/transition enforces reality evidence before FULFILLED', async () => {
    // 1. Advance to TESTED
    const testRes = await app.inject({
      method: 'POST',
      url: '/v1/covenant/transition',
      payload: {
        covenantId: 'cov-sanctuary-alpha',
        targetStatus: 'TESTED',
        requestedBy: 'operator:deployer',
        reason: 'Submitting to test',
      },
    });
    expect(testRes.statusCode).toBe(200);

    // 2. Attempt FULFILLED without evidence receipts -> 403
    const failFulfill = await app.inject({
      method: 'POST',
      url: '/v1/covenant/transition',
      payload: {
        covenantId: 'cov-sanctuary-alpha',
        targetStatus: 'FULFILLED',
        requestedBy: 'operator:deployer',
        reason: 'Empty proof claim',
        evidenceReceipts: [],
      },
    });
    expect(failFulfill.statusCode).toBe(403);
    const failBody = failFulfill.json();
    expect(failBody.error).toBe('EVIDENCE_ABSENCE_DENIAL');

    // 3. FULFILLED with verified evidence receipts -> 200
    const passFulfill = await app.inject({
      method: 'POST',
      url: '/v1/covenant/transition',
      payload: {
        covenantId: 'cov-sanctuary-alpha',
        targetStatus: 'FULFILLED',
        requestedBy: 'operator:deployer',
        reason: 'Solar equipment verified operational on site',
        evidenceReceipts: ['receipt:inverter-telemetry:kw-output-verified'],
      },
    });
    expect(passFulfill.statusCode).toBe(200);
    const passBody = passFulfill.json();
    expect(passBody.success).toBe(true);
    expect(passBody.newStatus).toBe('FULFILLED');
  });

  it('POST /v1/covenant/sanctum/verify gates access to HOLY_OF_HOLIES', async () => {
    // Unsigned attempt fails closed
    const failRes = await app.inject({
      method: 'POST',
      url: '/v1/covenant/sanctum/verify',
      payload: {
        sanctum: 'HOLY_OF_HOLIES',
        requesterDid: 'unauthorized:service',
      },
    });
    expect(failRes.statusCode).toBe(403);
    expect(failRes.json().allowed).toBe(false);

    // Signed steward attempt succeeds
    const passRes = await app.inject({
      method: 'POST',
      url: '/v1/covenant/sanctum/verify',
      payload: {
        sanctum: 'HOLY_OF_HOLIES',
        requesterDid: CANONICAL_STEWARD_DID,
        stewardSignature: 'sig-valid-steward-root',
      },
    });
    expect(passRes.statusCode).toBe(200);
    expect(passRes.json().allowed).toBe(true);

    // OUTER_COURT operational check
    const outerRes = await app.inject({
      method: 'POST',
      url: '/v1/covenant/sanctum/verify',
      payload: {
        sanctum: 'OUTER_COURT',
        requesterDid: 'service:api-router',
      },
    });
    expect(outerRes.statusCode).toBe(200);
    expect(outerRes.json().allowed).toBe(true);
  });
});
