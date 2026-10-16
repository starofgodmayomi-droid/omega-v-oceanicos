/**
 * Contract test for ECHOFRAME HTTP surface (/v1/echoframe).
 * Verifies template listing, component synthesis, simulation, and health checks.
 */
import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { createApp } from '../index.js';
import type { FastifyInstance } from 'fastify';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('ECHOFRAME HTTP Surface (/v1/echoframe)', () => {
  let app: FastifyInstance;
  let dir: string;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'omega-echoframe-api-'));
    app = createApp(join(dir, 'test.db'), false, { allowUnsignedCycle: true });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('GET /v1/echoframe returns active service status', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/echoframe' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.service).toBe('ECHOFRAME');
    expect(body.primitive).toBe('Expression & Creation');
    expect(body.templatesAvailable).toBe(4);
  });

  it('GET /v1/echoframe/templates returns template listing', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/echoframe/templates' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.templates)).toBe(true);
    expect(body.templates.length).toBe(4);
  });

  it('POST /v1/echoframe/generate synthesizes a verified primitive', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/echoframe/generate',
      payload: {
        type: 'primitive',
        name: 'QuantumMesh',
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.artifact.name).toBe('QuantumMesh');
    expect(body.artifact.type).toBe('primitive');
    expect(body.artifact.digest).toMatch(/^[0-9a-f]{64}$/);
    expect(body.artifact.code).toContain('class QuantumMeshPrimitive');
  });

  it('POST /v1/echoframe/simulate evaluates concept transition', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/echoframe/simulate',
      payload: {
        concept: 'High-Dimensional Tensor Wave',
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.simulation.concept).toBe('High-Dimensional Tensor Wave');
    expect(body.simulation.harmonicResonanceHz).toBe(432.1);
  });

  it('GET /health includes echoframe: ready check', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.checks.echoframe).toBe('ready');
  });
});
