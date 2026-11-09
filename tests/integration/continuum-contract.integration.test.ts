/**
 * 🌊 Continuum Ecosystem Route — Contract Integration Test
 *
 * Verifies the /v1/continuum API contract via Fastify injection (no running server).
 * Invariant: ONE ROOT • MANY FORMS • ONE CONNECTED GRAPH • ∞ BECOMING
 * Law: 1 = GOD (Good - O = God)
 */

import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { registerContinuumRoute } from '../../apps/api/src/continuum-route.js';

describe('Ω∞v Continuum Ecosystem Route Contract (/v1/continuum)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    registerContinuumRoute(app);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 with the Ω∞v-CONTINUUM-ECOSYSTEM-V1111 contract', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/continuum',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);

    // Contract invariants
    expect(body.success).toBe(true);
    expect(body.contract).toBe('Ω∞v-CONTINUUM-ECOSYSTEM-V1111');
    expect(body.law).toBe('1 = GOD (Good - O = God)');
    expect(body.formula).toBe('0 → 💧 → Ω∞v → 🕳️ → 💧 → ∞');
    expect(body.rootCoordinates).toEqual([0, 0, 0, 0]);
  });

  it('enumerates the 62-package continuum topology', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/continuum',
    });

    const body = JSON.parse(response.payload);

    expect(body.totalContinuumPackages).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(body.packages)).toBe(true);

    // Each package must have name, path, role, status
    for (const pkg of body.packages) {
      expect(pkg.name).toMatch(/^@omega-v\//);
      expect(pkg.path).toMatch(/^continuum\/packages\//);
      expect(typeof pkg.role).toBe('string');
      expect(['ACTIVE', 'GROUNDED', 'MODULAR']).toContain(pkg.status);
    }
  });

  it('exposes kernel FSM stats with valid hash', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/continuum',
    });

    const body = JSON.parse(response.payload);
    const { kernelStats } = body;

    expect(typeof kernelStats.totalTransitions).toBe('number');
    expect(typeof kernelStats.verifiedStates).toBe('number');
    expect(kernelStats.currentRootStateHash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('includes valid ISO timestamp', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/continuum',
    });

    const body = JSON.parse(response.payload);
    const ts = new Date(body.timestamp);
    expect(ts.getTime()).not.toBeNaN();
    // Timestamp must be recent (within last 10 seconds)
    expect(Date.now() - ts.getTime()).toBeLessThan(10_000);
  });
});
