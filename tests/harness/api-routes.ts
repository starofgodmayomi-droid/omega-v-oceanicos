/**
 * The routes the API registers and the paths the web client calls.
 *
 * Both sides used to be read out of single files (`apps/api/src/index.ts`,
 * `apps/web/src/App.tsx`), so both contract suites broke silently the moment
 * routes moved into `register*Route` modules and the client began building
 * paths through `apiRequest`. Reading the whole source tree instead keeps the
 * comparison pointed at the code that exists now.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export type ApiRoute = { method: string; path: string; file: string };

const SKIP = new Set(['__tests__', 'dist', 'node_modules', 'coverage']);

function sources(dir: string, extensions: RegExp, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sources(full, extensions, out);
    else if (extensions.test(entry)) out.push(full);
  }
  return out;
}

/** Every `fastify.get|post|put|delete|patch('/path', …)` the API registers. */
export function apiRoutes(root: string = process.cwd()): ApiRoute[] {
  const routes: ApiRoute[] = [];
  for (const file of sources(join(root, 'apps/api/src'), /\.ts$/)) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(
      /\b(?:fastify|app|scope)\.(get|post|put|delete|patch)\(\s*'([^']+)'/g
    )) {
      routes.push({
        method: match[1].toUpperCase(),
        path: match[2],
        file: file.slice(root.length + 1),
      });
    }
  }
  return routes;
}

/** Every `/v1/...` path literal the web client builds. */
export function clientPaths(root: string = process.cwd()): string[] {
  const paths = new Set<string>();
  for (const file of sources(join(root, 'apps/web/src'), /\.tsx?$/)) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/['"`](\/v1\/[a-zA-Z0-9/:_-]+)/g)) paths.add(match[1]);
  }
  return [...paths].sort();
}

/** A registered route as a pattern, so `:param` matches a concrete segment. */
export function routePattern(route: string): RegExp {
  return new RegExp('^' + route.replace(/:[a-zA-Z]+/g, '[a-zA-Z0-9._-]+') + '$');
}

/**
 * True when a client path can reach a registered route: an exact match, a
 * match against a parameterised route, or a literal prefix the client appends
 * a segment to (e.g. `/v1/omega/commands/` + id).
 */
export function isServed(clientPath: string, routes: ApiRoute[]): boolean {
  return routes.some(
    (route) =>
      route.path === clientPath ||
      routePattern(route.path).test(clientPath) ||
      clientPath.startsWith(route.path + '/')
  );
}
