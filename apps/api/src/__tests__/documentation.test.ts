import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Documentation drift is a correctness problem, not a cosmetic one.
 *
 * GET /log shipped without ever reaching this README, and the documented
 * attestation example published `key-2026-08-production-v1` — a signing key
 * that was removed for being forgeable — long after it stopped existing.
 * Both were found by reading, which does not scale and does not run in CI.
 *
 * This asserts the README describes every route the API actually serves.
 */
describe('API documentation', () => {
  const root = process.cwd();
  const source = readFileSync(join(root, 'apps/api/src/index.ts'), 'utf8');
  const readme = readFileSync(join(root, 'apps/api/README.md'), 'utf8');

  const routes = Array.from(source.matchAll(/app\.(get|post)\('([^']+)'/g)).map((match) => ({
    method: match[1].toUpperCase(),
    path: match[2],
  }));

  it('finds the routes it is meant to check', () => {
    expect(routes.length).toBeGreaterThan(10);
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
