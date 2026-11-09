/**
 * Contract test for GET and POST /v1/verification/contract.
 * Verifies the shared verification contract API surface across all 4 canonical outcomes.
 */
import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { createApp } from '../index.js';
import type { FastifyInstance } from 'fastify';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('Shared Verification Contract HTTP Surface (/v1/verification/contract)', () => {
  let app: FastifyInstance;
  let dir: string;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'omega-verif-api-'));
    app = createApp(join(dir, 'test.db'), false, { allowUnsignedCycle: true });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('GET /v1/verification/contract returns probe receipt', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/verification/contract' });
    expect(res.statusCode).toBe(200);
    const body = res.json();

    expect(body.success).toBe(true);
    expect(body.receipt).toBeDefined();
    expect(body.receipt['🌊']).toBe('ƆCEANiC_OS(v∞)');
    expect(body.receipt.contract).toBe('Ω∞v-SHARED-VERIFICATION-CONTRACT-V1');
    expect(body.receipt.outcome).toBe('VERIFIED');
    expect(body.receipt.decision).toBe('ALLOW');
    expect(body.receipt.frobeniusNorm).toBe(4.0);
    expect(body.receipt.fourthRootGramDeterminant).toBeGreaterThan(1.0);
  });

  it('POST /v1/verification/contract produces VERIFIED when all invariants hold', async () => {
    const payload = {
      stateBefore: { commit: '000000', status: 'IDLE' },
      intent: 'TRANSITION_VERIFIED_API',
      expectedState: { commit: '111111', status: 'DEPLOYED' },
      authority: true,
      humanConsent: true,
      policyPassed: true,
      capabilityPresent: true,
      attempted: true,
      executed: true,
      observation: {
        observed: true,
        observedState: { commit: '111111', status: 'DEPLOYED' },
      },
      evidence: {
        claim: 'Verified via integration tests',
        observed: true,
        verified: true,
        confidence: 1.0,
      },
    };

    const res = await app.inject({
      method: 'POST',
      url: '/v1/verification/contract',
      headers: { 'Content-Type': 'application/json' },
      payload,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.receipt.outcome).toBe('VERIFIED');
    expect(body.receipt.decision).toBe('ALLOW');
    expect(body.receipt.stateAfter).toEqual(payload.expectedState);
    expect(body.receipt.invariants.noEvidenceNoClaim).toBe(true);
    expect(body.receipt.invariants.noAuthorityNoExecution).toBe(true);
  });

  it('POST /v1/verification/contract produces NOT_EXECUTED when authority is missing', async () => {
    const payload = {
      stateBefore: 'STATE_A',
      intent: 'UNAUTHORIZED_ATTEMPT',
      expectedState: 'STATE_B',
      authority: false, // NO AUTHORITY
      policyPassed: true,
      attempted: true,
      executed: true,
    };

    const res = await app.inject({
      method: 'POST',
      url: '/v1/verification/contract',
      headers: { 'Content-Type': 'application/json' },
      payload,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.receipt.outcome).toBe('NOT_EXECUTED');
    expect(body.receipt.decision).toBe('DENY');
    expect(body.receipt.reason).toContain('NO_AUTHORITY');
    expect(body.receipt.invariants.failClosedEnforced).toBe(true);
  });

  it('POST /v1/verification/contract produces DIVERGENT when observed != expected', async () => {
    const payload = {
      stateBefore: 'STATE_A',
      intent: 'DIVERGENT_TEST',
      expectedState: 'EXPECTED_ALPHA',
      authority: true,
      policyPassed: true,
      attempted: true,
      executed: true,
      observation: {
        observed: true,
        observedState: 'ACTUAL_BETA', // MISMATCH
      },
      evidence: {
        claim: 'Test claim',
        observed: true,
        verified: true,
      },
    };

    const res = await app.inject({
      method: 'POST',
      url: '/v1/verification/contract',
      headers: { 'Content-Type': 'application/json' },
      payload,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.receipt.outcome).toBe('DIVERGENT');
    expect(body.receipt.decision).toBe('REVIEW');
    expect(body.receipt.dissent.length).toBeGreaterThan(0);
  });

  it('POST /v1/verification/contract produces UNKNOWN when observation is absent', async () => {
    const payload = {
      stateBefore: 'STATE_A',
      intent: 'MISSING_OBSERVATION_TEST',
      expectedState: 'STATE_B',
      authority: true,
      policyPassed: true,
      attempted: true,
      executed: true,
      observation: null, // NO OBSERVATION
    };

    const res = await app.inject({
      method: 'POST',
      url: '/v1/verification/contract',
      headers: { 'Content-Type': 'application/json' },
      payload,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.receipt.outcome).toBe('UNKNOWN');
    expect(body.receipt.decision).toBe('REVIEW');
    expect(body.receipt.reason).toContain('MISSING_OBSERVATION');
  });
});
