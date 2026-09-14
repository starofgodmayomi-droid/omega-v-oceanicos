import { describe, expect, it, afterAll } from '@jest/globals';
import { fastify } from '../../apps/api/src/index.js';

describe('Oceanicos fail-closed attestation', () => {
  afterAll(async () => {
    await fastify.close();
  });

  it('rejects a cycle when the signing key is absent', async () => {
    const original = process.env.OMEGA_SIGNING_KEY;
    delete process.env.OMEGA_SIGNING_KEY;
    try {
      await fastify.ready();
      const response = await fastify.inject({
        method: 'POST',
        url: '/v1/cycle',
        payload: { io: 'TEST_MUTATION' },
      });
      expect(response.statusCode).toBe(503);
      expect(JSON.parse(response.body).error).toBe('ATTESTATION_SIGNING_KEY_REQUIRED');
    } finally {
      if (original === undefined) delete process.env.OMEGA_SIGNING_KEY;
      else process.env.OMEGA_SIGNING_KEY = original;
    }
  });
});
