import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createApp } from '../index.js';

describe('Ecosystem Body Route - Living Body Metaphor Contract', () => {
  let directory: string;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    directory = mkdtempSync(join(tmpdir(), 'omega-api-ecosystem-body-test-'));
    app = createApp(join(directory, 'ledger.db'), false, { allowUnsignedCycle: true });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('serves GET /v1/ecosystem/body with 10 living organs including Deconstruction and Compass', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/ecosystem/body',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.identity.product).toBe('OceanicOS');
    expect(body.body).toHaveLength(10);

    const organs = body.body.map((b: any) => b.organ);
    expect(organs).toContain('Mind');
    expect(organs).toContain('Eyes');
    expect(organs).toContain('Memory');
    expect(organs).toContain('Hands');
    expect(organs).toContain('Heart');
    expect(organs).toContain('Nervous System');
    expect(organs).toContain('Immune System');
    expect(organs).toContain('Growth System');
    expect(organs).toContain('Deconstruction');
    expect(organs).toContain('Compass');

    const reaOrgan = body.body.find((b: any) => b.organ === 'Deconstruction');
    expect(reaOrgan.role).toBe('Reverse Engineering (REA)');
    expect(reaOrgan.status).toBe('IMPLEMENTED');
    expect(reaOrgan.capabilities).toContain('sovereign-synthesis');
    expect(reaOrgan.capabilities).toContain('protocol-reconstruction');

    const compassOrgan = body.body.find((b: any) => b.organ === 'Compass');
    expect(compassOrgan.role).toBe('World Signals & Holographic AI Compression');
    expect(compassOrgan.status).toBe('IMPLEMENTED');
    expect(compassOrgan.capabilities).toContain('holographic-compression');
    expect(compassOrgan.capabilities).toContain('multi-world-vectors');
  });

  it('computes correct implementation truth metrics and exposes 11 topological layers', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/ecosystem/body',
    });

    const body = JSON.parse(res.payload);
    expect(body.implementationTruth.totalParts).toBe(36);
    expect(body.implementationTruth.implemented).toBeGreaterThanOrEqual(20);
    expect(body.implementationTruth.completionRatio).toBeGreaterThan(0.5);

    expect(Array.isArray(body.topologicalLayers)).toBe(true);
    expect(body.topologicalLayers).toHaveLength(11);
    expect(body.topologicalLayers[0].symbol).toBe('L1');
    expect(body.topologicalLayers[0].domain).toBe('Experience Surface');
    expect(body.topologicalLayers[10].symbol).toBe('L11');
    expect(body.topologicalLayers[10].domain).toBe('Continuous Evolution');
  });
});
