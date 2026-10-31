import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * The web client and the API have no shared contract: the client hardcodes
 * paths as string literals and the server registers them independently.
 * Nothing connected the two, and a route that moved on one side kept being
 * called by the other.
 *
 * This does not test the UI. It asserts the two halves agree about which
 * endpoints exist, which is the thing that silently breaks. It used to read
 * only `App.tsx` and the old Express `app.get(...)` registrations; both
 * changed (the API is Fastify, the panels call the API themselves), so this
 * now reads every surface on each side.
 */

const root = process.cwd();

const sourceFiles = (directory: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(join(root, directory), { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '__tests__' || entry.name === 'dist') continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) sourceFiles(path, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(path);
  }
  return out;
};

const serverRoutes = new Set<string>();
for (const file of sourceFiles('apps/api/src')) {
  const source = readFileSync(join(root, file), 'utf8');
  for (const match of source.matchAll(/\.(get|post|put|delete)\(\s*'(\/[^']+)'/g)) {
    serverRoutes.add(match[2]);
  }
}

// The Vite dev server rewrites /api/* onto the API root, so the client's
// literals carry a prefix the server never sees.
const clientPaths = new Set<string>();
for (const file of sourceFiles('apps/web/src')) {
  const source = readFileSync(join(root, file), 'utf8');
  for (const match of source.matchAll(/['"`](\/v1\/[A-Za-z0-9/_:.-]*)/g)) {
    const path = match[1].replace(/\$\{.*$/, '');
    // A trailing slash is a base URL a panel appends an id to, not a route.
    if (path.endsWith('/')) continue;
    clientPaths.add(path);
  }
}

/** Convert a server route like `/jobs/:jobId/claim` to a regex that
 *  matches client equivalents like `/jobs/id/claim`. */
const routeToPattern = (route: string): RegExp =>
  new RegExp('^' + route.replace(/:[A-Za-z]+/g, '[A-Za-z0-9._-]+') + '$');

const servedBy = (clientPath: string): boolean =>
  serverRoutes.has(clientPath) ||
  Array.from(serverRoutes).some((route) => routeToPattern(route).test(clientPath));

describe('web/API contract', () => {
  it('finds paths on both sides', () => {
    // Guards the extraction itself: a refactor that changes how routes are
    // registered must not turn this suite into a vacuous pass.
    assert.ok(clientPaths.size > 5, `found only ${clientPaths.size} client paths`);
    assert.ok(serverRoutes.size > 10, `found only ${serverRoutes.size} server routes`);
  });

  for (const clientPath of Array.from(clientPaths).sort()) {
    it(`the API serves ${clientPath}`, () => {
      assert.ok(servedBy(clientPath), `no API route serves ${clientPath}`);
    });
  }

  it('records which endpoints the client does not yet use', (t) => {
    const unused = Array.from(serverRoutes)
      .filter((route) => !Array.from(clientPaths).some((path) => routeToPattern(route).test(path) || path === route))
      .sort();

    // Not a failure: the client is behind the API, deliberately. Reported
    // so the gap is visible, rather than pinned to an exact list that has
    // to be edited whenever the API grows a route.
    t.diagnostic(`${unused.length} API routes have no web caller: ${unused.join(', ')}`);
    assert.ok(Array.isArray(unused));
  });

  it('rewrites the /api prefix the client depends on', () => {
    const viteConfig = readFileSync(join(root, 'apps/web/vite.config.ts'), 'utf8');

    assert.ok(viteConfig.includes("'/api'"), 'vite config must proxy /api');
    assert.match(viteConfig, /rewrite/);
  });
});
