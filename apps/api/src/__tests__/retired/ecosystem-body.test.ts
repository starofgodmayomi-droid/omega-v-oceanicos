import { createApp } from '../index';

describe('GET /v1/ecosystem/body', () => {
  const requiredLayers = ['sensory', 'verification', 'memory', 'mesh', 'kernel', 'governance', 'interface'] as const;

  it('composes every runtime layer into one verified, bounded body', async () => {
    const app = createApp(':memory:', false);
    try {
      const response = await app.inject({ method: 'GET', url: '/v1/ecosystem/body' });
      const body = response.json();

      expect(response.statusCode).toBe(200);
      expect(body).toMatchObject({
        success: true,
        bodyVersion: 'omega.fullstack.body.v1',
        status: 'VERIFIED',
        expansion: {
          appendOnly: true,
          readOnly: true,
          bounded: true,
          moduleInvariant: 'observe → verify → remember → govern → present',
        },
      });
      expect(Object.keys(body.layers)).toEqual(requiredLayers);
      expect(body.layers.sensory).toMatchObject({ status: 'OBSERVED' });
      expect(body.layers.verification).toMatchObject({ status: 'VERIFIED' });
      expect(body.layers.memory).toMatchObject({ status: 'INTEGRITY_VERIFIED', tip: null });
      expect(body.layers.mesh).toMatchObject({ status: 'CONVERGED_PLURAL', convergence: { quorumReached: true } });
      expect(body.layers.kernel).toMatchObject({ status: 'READY', capability: { capabilities: { remoteMutation: false, arbitraryShellExecution: false } } });
      expect(body.layers.governance).toMatchObject({ status: 'HUMAN_GATE_REQUIRED', failClosed: true });
      expect(body.layers.interface).toMatchObject({ status: 'READY' });
    } finally {
      await app.close();
    }
  });

  it('is read-only and does not mutate the append-only ledger between reads', async () => {
    const app = createApp(':memory:', false);
    try {
      const first = await app.inject({ method: 'GET', url: '/v1/ecosystem/body' });
      const second = await app.inject({ method: 'GET', url: '/v1/ecosystem/body' });
      const firstBody = first.json();
      const secondBody = second.json();

      expect(firstBody.layers.memory.tip).toBeNull();
      expect(secondBody.layers.memory.tip).toBeNull();
      expect(firstBody.layers.sensory.telemetry.uuid).not.toBe(secondBody.layers.sensory.telemetry.uuid);
      expect(firstBody.expansion.readOnly).toBe(true);
      expect(secondBody.expansion.appendOnly).toBe(true);
    } finally {
      await app.close();
    }
  });

  it('carries ledger integrity and a bounded tip after a verified cycle', async () => {
    const app = createApp(':memory:', false, { allowUnsignedCycle: true });
    try {
      const cycle = await app.inject({ method: 'POST', url: '/v1/cycle', payload: {} });
      expect(cycle.statusCode).toBe(200);

      const response = await app.inject({ method: 'GET', url: '/v1/ecosystem/body' });
      const body = response.json();
      expect(response.statusCode).toBe(200);
      expect(body.layers.memory.status).toBe('INTEGRITY_VERIFIED');
      expect(body.layers.memory.tip).toMatchObject({ index: expect.any(Number), hash: expect.stringMatching(/^[a-f0-9]{64}$/) });
      expect(body.layers.verification.receipt).toMatchObject({ status: 'VERIFIED' });
    } finally {
      await app.close();
    }
  });
});
