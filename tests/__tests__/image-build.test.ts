import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The image must build the packages it claims to build.
 *
 * The published container shipped unable to start: `docker run` failed with
 * `Cannot find module '/app/apps/api/dist/index.js'`, and every smoke
 * assertion failed with it.
 *
 * Nothing was wrong with the code. The Dockerfile's `pnpm --filter <name>
 * build` steps named packages that did not exist under those names, and pnpm
 * treats a filter matching nothing as a no-op rather than an error. Every
 * build step "succeeded", compiled nothing, and produced an image with no
 * entrypoint.
 *
 * That is the same failure this repository has met before at a different
 * layer: a green pipeline proving the source satisfies itself while the
 * artifact could not run. A filter that matches nothing is a claim about a
 * package that is not there.
 */
describe('the image builds the packages it names', () => {
  const root = process.cwd();
  const dockerfile = readFileSync(join(root, 'apps/api/Dockerfile'), 'utf8');

  /** Every package name declared in the workspace. */
  const declared = new Set<string>();
  for (const dir of ['packages', 'apps']) {
    const base = join(root, dir);
    if (!existsSync(base)) continue;
    for (const entry of readdirSync(base)) {
      const manifest = join(base, entry, 'package.json');
      if (!existsSync(manifest)) continue;
      const name = (JSON.parse(readFileSync(manifest, 'utf8')) as { name?: string }).name;
      if (name) declared.add(name);
    }
  }

  const filtered = Array.from(dockerfile.matchAll(/--filter\s+(\S+)\s+build/g)).map(
    (match) => match[1]
  );

  it('finds a workspace and a set of build filters to check', () => {
    expect(declared.size).toBeGreaterThan(5);
    expect(filtered.length).toBeGreaterThan(0);
  });

  it.each(filtered)('--filter %s matches a package that exists', (name) => {
    // pnpm exits 0 when a filter matches nothing, so a typo here is silent
    // at build time and only surfaces as a container that cannot start.
    expect(declared.has(name)).toBe(true);
  });

  it('builds the application the CMD actually runs', () => {
    const command = dockerfile.match(/CMD\s+\[([^\]]+)\]/)?.[1] ?? '';
    const entry = command.match(/(apps\/[a-z-]+)\/dist/)?.[1];

    expect(entry).toBeTruthy();

    const manifest = JSON.parse(
      readFileSync(join(root, entry as string, 'package.json'), 'utf8')
    ) as { name?: string };

    // If the CMD runs apps/api/dist/index.js, some filter must build the
    // package that produces it. Otherwise the image ships without one.
    expect(filtered).toContain(manifest.name);
  });

  it('builds every workspace dependency the application declares', () => {
    const command = dockerfile.match(/CMD\s+\[([^\]]+)\]/)?.[1] ?? '';
    const entry = command.match(/(apps\/[a-z-]+)\/dist/)?.[1] as string;
    const deps = Object.keys(
      (
        JSON.parse(readFileSync(join(root, entry, 'package.json'), 'utf8')) as {
          dependencies?: Record<string, string>;
        }
      ).dependencies ?? {}
    ).filter((name) => declared.has(name));

    // A workspace dependency that is never built has no dist/ for the
    // application to import at runtime.
    expect(deps.filter((name) => !filtered.includes(name))).toEqual([]);
  });
});
