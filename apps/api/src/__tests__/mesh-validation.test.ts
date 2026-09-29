import { createApp } from '../index';

describe('GET /v1/mesh/validate', () => {
  it('returns bounded regional evidence and local ledger integrity', async () => {
    const app = createApp(':memory:', false);
    const response = await app.inject({
      method: 'GET',
      url: '/v1/mesh/validate?siliconYield=0.95&gridLoadMegawatts=1250&acceleratorInventory=600000',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.validation.ledger).toEqual({ intact: true, scope: 'local SQLite hash-chain recomputation' });
    expect(body.validation.mesh.quorumReached).toBe(true);
    expect(body.validation.receipt).toMatchObject({ status: 'VERIFIED', observationId: body.telemetry.uuid });
    expect(body.validation.receipt.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(body.evidenceBoundary).toContain('not external consensus');
    await app.close();
  });

  it('rejects missing or out-of-range telemetry without running convergence', async () => {
    const app = createApp(':memory:', false);
    const response = await app.inject({ method: 'GET', url: '/v1/mesh/validate?siliconYield=1.4&gridLoadMegawatts=1250' });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ success: false, error: 'INVALID_MESH_TELEMETRY' });
    await app.close();
  });
});
