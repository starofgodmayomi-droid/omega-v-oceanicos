import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The governance document must describe the surface that exists.
 *
 * Before this document, the authorization model was: every GET gated behind
 * OMEGA_READ_TOKEN when set, POST /attest/revoke gated by admin token and
 * operator allowlist, and every other write — observe, verify, attest, act,
 * learn, recompile, complete-loop, dissensus — open to anyone who could
 * reach the port. That may be correct for a service behind a gateway. It
 * was written down nowhere, which is the part that was not.
 *
 * A governance document listing only the controls that exist would describe
 * a stricter system than the one that runs, so these check both directions:
 * every unauthenticated write is named, and nothing is claimed as gated
 * that the middleware does not gate.
 */
describe('governance describes the real surface', () => {
  const root = process.cwd();
  const source = readFileSync(join(root, 'apps/api/src/index.ts'), 'utf8');
  const governance = readFileSync(join(root, 'docs/GOVERNANCE.md'), 'utf8');

  const routes = Array.from(source.matchAll(/app\.(get|post)\('([^']+)'/g)).map((match) => ({
    method: match[1].toUpperCase(),
    path: match[2],
  }));

  const writes = routes.filter((route) => route.method === 'POST');

  // The middleware gates these writes, by path.
  const ADMIN_GATED = ['/attest/revoke', '/persistence/acknowledge'];

  it('finds the surface it is meant to describe', () => {
    expect(writes.length).toBeGreaterThanOrEqual(8);
    expect(writes.map((route) => route.path)).toEqual(expect.arrayContaining(ADMIN_GATED));
  });

  it.each(writes.filter((route) => !ADMIN_GATED.includes(route.path)).map((route) => route.path))(
    'names %s among the writes that are not gated',
    (path) => {
      expect(governance).toContain(`POST ${path}`);
    }
  );

  it('names the admin-gated writes as gated', () => {
    for (const path of ADMIN_GATED) expect(governance).toContain(path);
    expect(governance).toMatch(/Admin-gated/);
  });

  it('claims no control the system does not implement', () => {
    // Scoped to every module that reads configuration, not only the API.
    // OMEGA_SIGNING_KEY is enforced in packages/attestation and the
    // dissensus policy variables in packages/dissensus; checking the API
    // file alone would flag a control that genuinely exists.
    const modules = [
      'apps/api/src/index.ts',
      'packages/attestation/src/index.ts',
      'packages/dissensus/src/index.ts',
    ]
      .map((path) => readFileSync(join(root, path), 'utf8'))
      .join('\n');

    const named = Array.from(governance.matchAll(/`(OMEGA_[A-Z_]+)`/g)).map((match) => match[1]);
    const implemented = new Set(Array.from(modules.matchAll(/OMEGA_[A-Z_]+/g)).map((m) => m[0]));

    expect(named.length).toBeGreaterThan(0);
    expect(named.filter((variable) => !implemented.has(variable))).toEqual([]);
  });

  it('states plainly that the defaults are open', () => {
    // The failure mode this document exists to prevent is a reader assuming
    // the service authenticates because it talks about tokens.
    expect(governance).toMatch(/default to \*\*off\*\*|defaults are open/i);
    expect(governance).toMatch(/Do not expose this API directly/i);
  });

  it('records what does not exist', () => {
    // Absent controls are part of the model. Listing only what is present
    // would describe a stricter system than the one that runs.
    for (const absent of ['no user accounts', 'no roles', 'no rate limiting']) {
      expect(governance.toLowerCase()).toContain(absent);
    }
  });

  it('keeps the constraints that hold without any token configured', () => {
    // Authorization is not the only control, and the document should not
    // leave a reader thinking an open write surface is an unconstrained one.
    for (const code of ['403', '404', '409']) {
      expect(governance).toContain(code);
    }
    expect(governance).toContain('OMEGA_SIGNING_KEY');
  });
});
