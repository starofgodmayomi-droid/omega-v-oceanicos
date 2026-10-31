import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The web client and the API have no shared contract: the client hardcodes
 * paths as string literals and the server registers them independently.
 * Nothing connected the two.
 *
 * This does not test the UI. It asserts the two halves agree about which
 * endpoints exist and how the client reaches them, which is the thing that
 * silently breaks.
 *
 * The wiring is single-origin: the client calls `/v1/...` on its own origin
 * and the Vite dev server proxies those prefixes to the API. There is no
 * `/api` rewrite, so a client literal is a server path verbatim.
 */
describe('web/API contract', () => {
  const root = process.cwd();
  const apiSourceDir = join(root, 'apps/api/src');
  const webSourceDir = join(root, 'apps/web/src');

  const apiSource = readdirSync(apiSourceDir)
    .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'))
    .map((file) => readFileSync(join(apiSourceDir, file), 'utf8'))
    .join('\n');

  const client = readdirSync(webSourceDir)
    .filter((file) => /\.tsx?$/.test(file) && !file.endsWith('.test.ts'))
    .map((file) => readFileSync(join(webSourceDir, file), 'utf8'))
    .join('\n');

  const viteConfig = readFileSync(join(root, 'apps/web/vite.config.ts'), 'utf8');

  const serverRoutes = new Set(
    Array.from(apiSource.matchAll(/(?:fastify|app)\.(get|post|put|delete|patch)\('([^']+)'/g)).map(
      (match) => match[2]
    )
  );

  // A template literal like `/v1/omega/commands/${id}/approve` yields the
  // `/v1/omega/commands/` prefix here; the suffix is a route parameter.
  const clientPaths = Array.from(
    new Set(
      Array.from(
        client.matchAll(/['"`](\/(?:v1|health|jobs|attest|persistence)[a-z0-9/-]*)/g)
      ).map((match) => match[1].replace(/\/$/, ''))
    )
  ).sort();

  /** Convert a server route like `/jobs/:jobId/claim` to a regex that
   *  matches client equivalents like `/jobs/id/claim`. */
  const routeToPattern = (route: string): RegExp =>
    new RegExp('^' + route.replace(/:[a-zA-Z]+/g, '[a-z0-9-]+').replace(/\*/g, '[^/]+') + '$');

  const isServed = (clientPath: string): boolean => {
    if (serverRoutes.has(clientPath)) return true;
    if (Array.from(serverRoutes).some((route) => routeToPattern(route).test(clientPath))) {
      return true;
    }
    // `clientPath` may be the truncated prefix of a template literal whose
    // remaining segments are parameterised on the server.
    const prefix = clientPath + '/';
    return Array.from(serverRoutes).some(
      (route) => route.startsWith(prefix) || route.split('/:')[0].startsWith(prefix)
    );
  };

  it('finds paths on both sides', () => {
    expect(clientPaths.length).toBeGreaterThan(5);
    expect(serverRoutes.size).toBeGreaterThan(10);
  });

  it.each(clientPaths)('the API serves %s', (clientPath) => {
    expect(isServed(clientPath)).toBe(true);
  });

  it('proxies every client prefix to the API in development', () => {
    const prefixes = Array.from(
      new Set(clientPaths.map((clientPath) => '/' + clientPath.split('/')[1]))
    );
    for (const prefix of prefixes) {
      expect(viteConfig).toContain(`'${prefix}'`);
    }
  });

  it('keeps the client same-origin unless a base URL is configured', () => {
    const api = readFileSync(join(webSourceDir, 'api.ts'), 'utf8');
    // The base URL is optional and empty by default, so requests stay
    // same-origin and ride the dev-server proxy (and, in production, the
    // API's own static hosting).
    expect(api).toMatch(/VITE_API_URL\s*\|\|\s*''/);
    expect(api).not.toMatch(/https?:\/\//);
  });
});
