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

/**
 * The startup banner is the first thing an operator reads, and it is a
 * documentation surface with no guard.
 *
 * It has now drifted twice. GET /log was added in one change and reached
 * the banner only later; by this commit the banner advertised 16 of the
 * 27 routes the server actually registers, omitting /attest/verify,
 * /attest/public-key, /attest/revocations and /observability — four
 * endpoints the CLI itself calls. An operator reading the banner would
 * conclude they do not exist.
 *
 * documentation.test.ts already asserts the README describes every route.
 * This applies the same rule to the banner, so the two cannot diverge
 * again without failing here.
 */
describe('startup banner', () => {
  const root = process.cwd();
  const source = readFileSync(join(root, 'apps/api/src/index.ts'), 'utf8');

  const registered = Array.from(source.matchAll(/app\.(get|post)\('([^']+)'/g)).map((match) => ({
    method: match[1].toUpperCase(),
    path: match[2],
  }));

  const banner = source.slice(
    source.indexOf('Available endpoints:'),
    source.indexOf("].join('\\n')", source.indexOf('Available endpoints:'))
  );

  it('finds a banner to check', () => {
    expect(banner).toContain('Available endpoints:');
    expect(registered.length).toBeGreaterThan(20);
  });

  it.each(registered.map((route) => [`${route.method} ${route.path}`, route.method, route.path]))(
    'advertises %s',
    (_label, method, path) => {
      expect(banner).toMatch(new RegExp(`${method}\\s+${path.replace(/\//g, '\\/')}(\\s|')`));
    }
  );

  it('advertises nothing the server does not serve', () => {
    const advertised = Array.from(banner.matchAll(/(GET|POST)\s+(\/[a-zA-Z0-9:/-]*)/g)).map(
      (match) => `${match[1]} ${match[2]}`
    );
    const real = new Set(registered.map((route) => `${route.method} ${route.path}`));

    expect(advertised.filter((entry) => !real.has(entry))).toEqual([]);
  });
});
