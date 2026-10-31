import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * The web client and the API have no shared contract: the client names paths
 * as string literals and the server declares its inventory independently.
 * Nothing connects the two, and a path the client calls that the API does not
 * serve fails only when a user reaches that panel.
 *
 * This does not test the UI. It asserts the two halves agree about which
 * endpoints exist, which is the thing that silently breaks.
 *
 * History: this file used to scan `App.tsx` alone for `/api/*` literals and
 * pin the set of endpoints the client did not yet use. Both premises changed —
 * the client now calls `${API_BASE_URL}/v1/...` across panels, and the
 * inventory grew past the client on purpose — so the scan covers every client
 * source and the pin is replaced by the assertion that matters: no client path
 * is unknown to the API.
 */
describe('web/API contract', () => {
  const root = process.cwd();
  const clientDir = join(root, 'apps/web/src');
  const clientSources = readdirSync(clientDir)
    .filter((name) => /\.(tsx|ts)$/.test(name))
    .map((name) => readFileSync(join(clientDir, name), 'utf8'));
  const viteConfig = readFileSync(join(root, 'apps/web/vite.config.ts'), 'utf8');
  const routeContract = readFileSync(join(root, 'apps/api/src/route-contract.ts'), 'utf8');

  const serverRoutes = new Set(
    Array.from(routeContract.matchAll(/'[A-Z]+ ([^']+)'/g)).map((match) => match[1])
  );

  // The client builds paths from `API_BASE_URL`, so the versioned path is the
  // literal half; the host half is configuration.
  const clientPaths = Array.from(
    new Set(
      clientSources
        .flatMap((source) => Array.from(source.matchAll(/\/v1\/[a-zA-Z0-9/_-]+/g)))
        .map((match) => match[0].replace(/\/$/, ''))
    )
  ).sort();

  /** Convert a server route like `/v1/jobs/:jobId/claim` to a regex that
   *  matches client equivalents like `/v1/jobs/id/claim`. */
  const routeToPattern = (route: string): RegExp =>
    new RegExp('^' + route.replace(/:[a-zA-Z]+/g, '[a-z0-9_-]+') + '$');

  it('finds paths on both sides', () => {
    assert.ok(clientPaths.length > 5);
    assert.ok(serverRoutes.size > 10);
  });

  for (const clientPath of clientPaths) {
    it(`the API serves ${clientPath}`, () => {
      // Exact match (static routes).
      if (serverRoutes.has(clientPath)) return;
      // Parameterised match: the client uses a segment like `id` where the
      // server declares `:jobId`.
      const matched = Array.from(serverRoutes).some((route) => routeToPattern(route).test(clientPath));
      assert.equal(matched, true);
    });
  }

  it('rewrites the /api prefix the client falls back to', () => {
    // The browser calls `/api/*` when no API origin is configured, and the
    // Vite dev server strips the prefix before proxying. The production host
    // configures VITE_API_URL instead, so this rewrite is dev-only on purpose.
    assert.ok(clientSources.some((source) => source.includes("|| '/api'")));
    assert.ok(viteConfig.includes("'/api'"));
    assert.match(viteConfig, /rewrite/);
  });
});
