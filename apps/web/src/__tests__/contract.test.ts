import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The web client and the API have no shared contract: the client hardcodes
 * paths as string literals and the server registers them independently.
 * Nothing connected the two, and apps/web has no test of any kind.
 *
 * This does not test the UI. It asserts the two halves agree about which
 * endpoints exist, which is the thing that silently breaks.
 */
describe('web/API contract', () => {
  const root = process.cwd();
  const client = readFileSync(join(root, 'apps/web/src/App.tsx'), 'utf8');
  const server = readFileSync(join(root, 'apps/api/src/index.ts'), 'utf8');
  const viteConfig = readFileSync(join(root, 'apps/web/vite.config.ts'), 'utf8');

  const serverRoutes = new Set(
    Array.from(server.matchAll(/app\.(get|post)\('([^']+)'/g)).map((match) => match[2])
  );

  // The dev server rewrites /api/* onto the API root, so the client's
  // literals carry a prefix the server never sees.
  const clientPaths = Array.from(
    new Set(
      Array.from(client.matchAll(/['"`](\/api\/[a-z0-9/-]+)(?:\?[^'"`]+)?['"`]/g)).map((m) => m[1])
    )
  ).sort();

  it('finds paths on both sides', () => {
    expect(clientPaths.length).toBeGreaterThan(5);
    expect(serverRoutes.size).toBeGreaterThan(10);
  });

  it.each(clientPaths)('the API serves %s', (clientPath) => {
    expect(serverRoutes).toContain(clientPath.replace(/^\/api/, ''));
  });

  it('rewrites the /api prefix the client depends on, in dev and in production', () => {
    // Development: the Vite dev server rewrites it.
    expect(viteConfig).toContain("'/api'");
    expect(viteConfig).toMatch(/rewrite/);

    // Production: there is no dev server, so the API strips it itself.
    // Without this the built bundle calls /api/* and nothing answers.
    expect(server).toMatch(/req\.url\.startsWith\('\/api\/'\)/);
    expect(server).toMatch(/req\.url\.slice\(4\)/);
  });

  it('records which endpoints the client does not yet use', () => {
    const used = new Set(clientPaths.map((path) => path.replace(/^\/api/, '')));
    const unused = Array.from(serverRoutes)
      .filter((route) => !used.has(route))
      .sort();

    // Not a failure: the client is behind the API, deliberately. This
    // pins the gap so it is visible and shrinks on purpose rather than
    // drifting further without anyone noticing.
    expect(unused).toEqual([
      '/actions',
      '/attest',
      '/events',
      '/evidence/export',
      '/log',
      '/memory',
      '/memory/integrity',
      '/observability',
      '/observe',
      '/persistence/acknowledge',
      '/recompilations',
      '/rules',
      '/verify',
    ]);
  });
});
