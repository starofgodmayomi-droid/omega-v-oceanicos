import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from '../../../../tests/harness/jest-compat.ts';
import { apiRoutes, clientPaths, isServed } from '../../../../tests/harness/api-routes.ts';

/**
 * The web client and the API share no types: the client builds `/v1/...`
 * strings and the server registers them independently. Nothing connects the
 * two, so a renamed route is a 404 nobody sees until someone loads the panel
 * that calls it.
 *
 * This does not test the UI. It asserts that every path the client builds is
 * one the API registers, which is the part that silently breaks.
 */
describe('web/API contract', () => {
  const root = process.cwd();
  const viteConfig = readFileSync(join(root, 'apps/web/vite.config.ts'), 'utf8');
  const routes = apiRoutes(root);
  const paths = clientPaths(root);

  it('finds paths on both sides', () => {
    expect(routes.length).toBeGreaterThan(20);
    expect(paths.length).toBeGreaterThan(5);
  });

  it.each(paths)('the API serves %s', (clientPath) => {
    expect(isServed(clientPath, routes)).toBe(true);
  });

  it('rewrites the /api prefix the client depends on', () => {
    // The client defaults to `/api` as its base (VITE_API_URL overrides it for
    // a separately hosted API). The dev server rewrites that prefix onto the
    // API root; the API itself registers no /api routes, so the rewrite is the
    // only thing making the default base work in development.
    expect(viteConfig).toContain("'/api'");
    expect(viteConfig).toMatch(/rewrite:\s*\(path\)\s*=>\s*path\.replace\(\/\^\\\/api\//);
  });

  it('registers no route under the /api prefix', () => {
    // If the server ever served /api itself, the dev rewrite would double it.
    // Keeping the two halves separate is what makes one proxy config enough.
    expect(routes.filter((route) => route.path.startsWith('/api'))).toEqual([]);
  });
});
