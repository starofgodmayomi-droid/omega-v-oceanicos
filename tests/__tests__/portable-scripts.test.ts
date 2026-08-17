import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Every package script must run on every platform CI claims to support.
 *
 * #32 added a Windows job and replaced the root `rm -rf` with a Node
 * script. But that script delegates to each package's own `clean`, and ten
 * of eleven packages were still `rm -rf`. The wrapper was portable; what it
 * spawned was not. CI stayed green because the Windows job never invokes
 * clean, so the claim held only because it was never exercised.
 *
 * This asserts the property directly rather than relying on a job that
 * happens to run the right command.
 */
describe('package scripts are portable', () => {
  const root = process.cwd();
  const SKIP = new Set(['node_modules', '.git', 'dist', 'coverage']);

  const manifests = (from: string): string[] =>
    readdirSync(from).flatMap((entry) => {
      if (SKIP.has(entry)) return [];
      const full = join(from, entry);
      if (statSync(full).isDirectory()) return manifests(full);
      return entry === 'package.json' ? [full] : [];
    });

  // Commands that do not exist in a Windows shell, or that assume one.
  const SHELLISMS = [
    /\brm\s+-[rf]/,
    /\bcp\s+-[rR]/,
    /\bmv\s+/,
    /\bmkdir\s+-p\b/,
    /\btouch\s+/,
    /\bexport\s+\w+=/,
    /\|\s*xargs\b/,
    /\bwhich\b/,
  ];

  const files = manifests(root);

  it('finds the manifests it is meant to check', () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it.each(files.map((file) => [relative(root, file), file]))(
    '%s uses no shell-only commands',
    (_label, file) => {
      const scripts = (JSON.parse(readFileSync(file, 'utf8')).scripts ?? {}) as Record<
        string,
        string
      >;

      const offenders = Object.entries(scripts)
        .filter(([, command]) => SHELLISMS.some((pattern) => pattern.test(command)))
        .map(([name, command]) => `${name}: ${command}`);

      expect(offenders).toEqual([]);
    }
  );

  it('routes every clean script through the portable remover', () => {
    const cleaners = files
      .map((file) => JSON.parse(readFileSync(file, 'utf8')).scripts?.clean)
      .filter((command): command is string => typeof command === 'string');

    expect(cleaners.length).toBeGreaterThan(5);
    for (const command of cleaners) {
      expect(command).toMatch(/node .*scripts[/\\](rimraf|clean)\.cjs/);
    }
  });
});
