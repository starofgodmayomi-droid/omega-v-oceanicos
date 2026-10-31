import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { API_ROUTE_INVENTORY } from '../../apps/api/src/route-contract.ts';

/**
 * Replaces apps/api/src/__tests__/documentation.test.ts, which scanned
 * `apps/api/src/index.ts` for the Express-style `app.get('...')` registration
 * that the Fastify runtime no longer uses, so it silently checked nothing.
 *
 * This asserts the direction that matters for drift: the README must not
 * advertise a route the API does not serve. (It does not require every
 * served route to be documented — that gap is tracked, not pretended away.)
 */
describe('API documentation drift', () => {
  const readme = readFileSync(join(process.cwd(), 'apps/api/README.md'), 'utf8');
  const served = new Set(API_ROUTE_INVENTORY);
  const advertised = Array.from(readme.matchAll(/\b(GET|POST)\s+(\/[A-Za-z0-9_\-/:.*]*)/g)).map(
    (match) => `${match[1]} ${match[2]}`,
  );

  it('advertises only routes the executable contract serves', () => {
    assert.ok(advertised.length > 20, `README advertises only ${advertised.length} routes`);
    const phantom = advertised.filter((route) => !served.has(route));
    assert.deepEqual(phantom, [], `README advertises routes that are not served: ${phantom.join(', ')}`);
  });

  it('does not advertise a signing key value', () => {
    assert.ok(!readme.includes('key-2026-08-production-v1'));
    assert.ok(!/"signingKey"\s*:\s*"(?!sha256:)/i.test(readme));
  });
});
