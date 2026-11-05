import { createApp } from '../index';
import { ENTITY_BRAND_CHECKSUM, ENTITY_ORGANS, observeEntityBody } from '../entity-body';

/*
 * The anatomy is observed, not narrated: each of the seven organs must point at
 * a file that exists in the checkout, and a missing organ must read MISSING
 * instead of being assumed alive.
 */
describe('GET /v1/entity/body', () => {
  it('reads all seven organs from disk', () => {
    const body = observeEntityBody();

    expect(body.organs).toHaveLength(7);
    expect(body.organs.map((organ) => organ.layer)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(body.brandChecksum).toBe(ENTITY_BRAND_CHECKSUM);
    expect(body.status).toBe('ALIVE');
    expect(body.missing).toEqual([]);
    expect(body.organs.every((organ) => organ.status === 'PRESENT')).toBe(true);
    expect(body.organs.every((organ) => /^[0-9a-f]{64}$/.test(organ.digest ?? ''))).toBe(true);
    expect(body.bodyDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(body.soul).toContain('Pidgin fit carry the warmth');
  });

  it('serves the anatomy over the API', async () => {
    const app = createApp(':memory:', false);
    try {
      const response = await app.inject({ method: 'GET', url: '/v1/entity/body' });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload).toMatchObject({
        success: true,
        body: { status: 'ALIVE', brandChecksum: '30013030', law: 'Ω∞v ::= VERIFY(ΔREALITY)' },
      });
      expect(payload.body.organs.map((organ: { organ: string }) => organ.organ)).toEqual(
        ENTITY_ORGANS.map((organ) => organ.organ)
      );
    } finally {
      await app.close();
    }
  });

  it('reports a missing organ as MISSING rather than assuming it alive', () => {
    const body = observeEntityBody('/tmp/entity-body-absent-root');

    expect(body.status).toBe('INCOMPLETE');
    expect(body.missing).toEqual(ENTITY_ORGANS.map((organ) => organ.organ));
    expect(body.organs.every((organ) => organ.status === 'MISSING')).toBe(true);
    expect(body.soul).toBeNull();
  });
});
