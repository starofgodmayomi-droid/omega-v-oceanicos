import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The governance document must describe the surface that exists.
 *
 * An authorization model that is written down nowhere is not a model, it is
 * an assumption. This file checks both directions: the document names every
 * route the API answers with a write, and it claims no control that the code
 * does not implement.
 */
describe('governance describes the real surface', () => {
  const root = process.cwd();
  const apiSource = join(root, 'apps/api/src');
  const governance = readFileSync(join(root, 'docs/GOVERNANCE.md'), 'utf8');
  const contract = readFileSync(join(apiSource, 'route-contract.ts'), 'utf8');

  const routes = Array.from(contract.matchAll(/'((?:GET|POST) \/[^']*)'/g)).map((match) => {
    const [method, path] = match[1].split(' ', 2);
    return { method, path };
  });

  const writes = routes.filter((route) => route.method === 'POST');

  // Writes that carry their own gate on top of the mode-level token.
  const JOB_GATED = [
    '/jobs',
    '/jobs/:jobId/claim',
    '/jobs/:jobId/complete',
    '/jobs/:jobId/fail',
  ];

  it('finds the surface it is meant to describe', () => {
    expect(writes.length).toBeGreaterThanOrEqual(8);
    expect(writes.map((route) => route.path)).toEqual(expect.arrayContaining(JOB_GATED));
  });

  it.each(writes.map((route) => route.path))('names POST %s among the writes', (path) => {
    expect(governance).toContain(`POST ${path}`);
  });

  it('names the admin-gated writes as gated', () => {
    expect(governance).toMatch(/Admin-gated/);
    for (const path of ['/attest/revoke', '/persistence/acknowledge', '/persistence/reencrypt']) {
      expect(governance).toContain(path);
    }
    expect(governance).toMatch(/Local-job-gated/);
  });

  it('claims no control the system does not implement', () => {
    // Scoped to every module of the API runtime, not only index.ts, so a
    // control that lives in persistence or the job ledger counts.
    const modules = readdirSync(apiSource)
      .filter((file) => file.endsWith('.ts') && !file.endsWith('.d.ts'))
      .map((file) => readFileSync(join(apiSource, file), 'utf8'))
      .join('\n');

    const named = Array.from(governance.matchAll(/`(OMEGA_[A-Z_]+)`/g)).map((match) => match[1]);
    const implemented = new Set(Array.from(modules.matchAll(/OMEGA_[A-Z_]+/g)).map((m) => m[0]));

    expect(named.length).toBeGreaterThan(0);
    expect(named.filter((variable) => !implemented.has(variable))).toEqual([]);
  });
});
