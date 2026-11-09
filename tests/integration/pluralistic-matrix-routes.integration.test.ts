/**
 * 🌊 Pluralistic Matrix & Continuum Compression Routes — Contract Integration Test
 *
 * Verifies:
 * - GET /v1/pluralism/matrix/continuum-compression
 * - POST /v1/pluralism/matrix/continuum-compression
 */

import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { executeContinuumCompressionTransition, executeMatrixTransition, evaluateOmegaLambda } from '@oceanicos/pluralism';

describe('🌊 Pluralism Matrix & Continuum Compression Endpoints Contract', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });

    // Register pluralism matrix routes directly
    app.get('/v1/pluralism/matrix', async () => {
      const transition = executeMatrixTransition(0, [], undefined, true, true);
      return {
        success: true,
        contract: 'Ω∞v-MASTER-MATRIX-V1111',
        sampleTransition: transition,
      };
    });

    app.get('/v1/pluralism/matrix/continuum-compression', async () => {
      const receipt = executeContinuumCompressionTransition();
      return { success: receipt.success, receipt };
    });

    app.post('/v1/pluralism/matrix/continuum-compression', async (request: any) => {
      const body = request.body || {};
      const attributedHuman = typeof body.attributedHuman === 'string' ? body.attributedHuman : undefined;
      const isEvidenceVerified = body.isEvidenceVerified !== undefined ? Boolean(body.isEvidenceVerified) : true;
      const receipt = executeContinuumCompressionTransition(attributedHuman, isEvidenceVerified);
      return { success: receipt.success, receipt };
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /v1/pluralism/matrix/continuum-compression returns 200 with valid compression receipt', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/pluralism/matrix/continuum-compression',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.receipt.contract).toBe('Ω∞v-CONTINUUM-MATRIX-V1111');
    expect(body.receipt.continuumPackagesCount).toBe(62);
    expect(body.receipt.sovereignOrgansCount).toBe(20);
    expect(body.receipt.singularityStatus).toBe('PREVENTED_VERIFIED');
    expect(body.receipt.frobeniusNorm).toBeGreaterThan(0);
  });

  it('POST /v1/pluralism/matrix/continuum-compression enforces fail-closed on unverified evidence', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/pluralism/matrix/continuum-compression',
      payload: {
        isEvidenceVerified: false,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(false);
    expect(body.receipt.singularityStatus).toBe('SINGULARITY_COLLAPSE');
    expect(body.receipt.frobeniusNorm).toBe(0);
  });

  it('POST /v1/pluralism/matrix/continuum-compression enforces fail-closed on unauthorized human root', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/pluralism/matrix/continuum-compression',
      payload: {
        attributedHuman: 'did:unauthorized:actor',
        isEvidenceVerified: true,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(false);
    expect(body.receipt.singularityStatus).toBe('SINGULARITY_COLLAPSE');
    expect(body.receipt.frobeniusNorm).toBe(0);
  });
});
