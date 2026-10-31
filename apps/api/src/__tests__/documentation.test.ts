import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { API_ROUTE_INVENTORY } from '../route-contract';

/**
 * Documentation drift is a correctness problem, not a cosmetic one.
 *
 * An endpoint that ships without reaching this README is invisible to the
 * operator reading it, and a documented example that no longer exists —
 * such as the removed production signing key — is worse than no example.
 * Both were found by reading, which does not scale and does not run in CI.
 *
 * This asserts the README describes every route the API actually serves.
 */
describe('API documentation', () => {
  const root = process.cwd();
  const readme = readFileSync(join(root, 'apps/api/README.md'), 'utf8');

  it('finds a route inventory to check', () => {
    expect(API_ROUTE_INVENTORY.length).toBeGreaterThan(20);
    expect(API_ROUTE_INVENTORY).toContain('GET /health');
  });

  it.each(API_ROUTE_INVENTORY.map((contract) => contract.split(' ', 2)[1]))(
    'documents %s',
    (path) => {
      expect(readme).toContain(path);
    }
  );

  it('documents each route with its method and path', () => {
    const undocumented = API_ROUTE_INVENTORY.filter((contract) => {
      const [method, path] = contract.split(' ', 2);
      return !new RegExp(`${method}\\s+${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(readme);
    });

    expect(undocumented).toEqual([]);
  });

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
      'OMEGA_AUTH_MODE',
      'OMEGA_WEB_DIST',
    ]) {
      expect(readme).toContain(variable);
    }
  });
});
