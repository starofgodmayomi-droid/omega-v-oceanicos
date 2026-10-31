import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { API_ROUTE_INVENTORY } from '../route-contract';

/**
 * Documentation drift is a correctness problem, not a cosmetic one.
 *
 * GET /log shipped without ever reaching this README, and the documented
 * attestation example published `key-2026-08-production-v1` — a signing key
 * that was removed for being forgeable — long after it stopped existing.
 * Both were found by reading, which does not scale and does not run in CI.
 *
 * The route list this checks is `src/route-contract.ts`. The startup banner it
 * used to check no longer exists: the Express generation printed an
 * "Available endpoints" list, the Fastify runtime replaced it with the route
 * contract plus `app.printRoutes()`, and the old assertion was left matching a
 * string that had been deleted. Reading the contract instead means a route
 * added to the inventory and the README together stays documented, and a route
 * removed from both stays absent.
 */
describe('API documentation', () => {
  const root = process.cwd();
  const readme = readFileSync(join(root, 'apps/api/README.md'), 'utf8');

  const routes = API_ROUTE_INVENTORY.map((entry) => {
    const [method, path] = entry.split(' ');
    return { method, path };
  });

  it('reads the route contract it is meant to check', () => {
    expect(routes.length).toBeGreaterThan(20);
    expect(routes.map((route) => route.path)).toContain('/health');
  });

  it.each(routes.map((route) => [`${route.method} ${route.path}`, route.path]))(
    'documents %s',
    (_label, path) => {
      expect(readme).toContain(path);
    }
  );

  it('does not advertise a signing key value', () => {
    expect(readme).not.toContain('key-2026-08-production-v1');
    expect(readme.toLowerCase()).not.toMatch(/"signingkey":\s*"(?!sha256:)/);
  });

  it('documents the environment variables the API depends on', () => {
    for (const variable of [
      'OMEGA_SIGNING_KEY',
      'OMEGA_RUNTIME_STORE_PATH',
      'OMEGA_EVENT_LOG_PATH',
      'OMEGA_PERSISTENCE',
    ]) {
      expect(readme).toContain(variable);
    }
  });
});

/**
 * The other direction: the README must not teach an operator a route the
 * server does not answer. Every documented `METHOD /path` line therefore has
 * to appear in the inventory that the route-contract test proves is registered.
 */
describe('documented routes', () => {
  const root = process.cwd();
  const readme = readFileSync(join(root, 'apps/api/README.md'), 'utf8');
  const inventory = new Set<string>(API_ROUTE_INVENTORY);

  it('documents no route the contract does not serve', () => {
    const documented = Array.from(readme.matchAll(/^(GET|POST)\s+(\/\S*)$/gm)).map(
      (match) => `${match[1]} ${match[2]}`
    );

    expect(documented.length).toBeGreaterThan(20);
    expect(documented.filter((entry) => !inventory.has(entry))).toEqual([]);
  });
});
