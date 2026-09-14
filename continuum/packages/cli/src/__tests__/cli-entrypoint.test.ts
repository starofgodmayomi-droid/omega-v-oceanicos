import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `packages/cli/src/cli.ts` is the published bin. Nothing imports it, so it
 * sat at 0% statements and 0% functions: the one file users actually
 * execute was the one file no test touched.
 *
 * A broken entrypoint ships silently. That already happened once in this
 * repository — the built API could not start at all because ESM relative
 * imports lacked file extensions, and 140 passing tests never noticed,
 * because nothing ran the build output.
 *
 * These assert the source-level contract. CI additionally executes the
 * compiled `dist/cli.js` after the build step, which is the part that
 * catches a resolution failure.
 */
describe('CLI entrypoint', () => {
  const root = process.cwd();
  const source = readFileSync(join(root, 'packages/cli/src/cli.ts'), 'utf8');
  const manifest = JSON.parse(readFileSync(join(root, 'packages/cli/package.json'), 'utf8')) as {
    bin?: Record<string, string>;
  };

  it('declares a bin that the build actually produces', () => {
    expect(manifest.bin).toBeDefined();
    const target = Object.values(manifest.bin ?? {})[0];
    expect(target).toBe('dist/cli.js');
    // The compiled name must match the source that produces it.
    expect(existsSync(join(root, 'packages/cli/src/cli.ts'))).toBe(true);
  });

  it('carries a shebang, since it is executed rather than imported', () => {
    expect(source.startsWith('#!/usr/bin/env node')).toBe(true);
  });

  it('imports with an explicit .js extension so Node ESM can resolve it', () => {
    // The package is "type": "module". An extensionless relative import
    // compiles fine and fails at runtime.
    expect(source).toMatch(/from '\.\/index\.js'/);
    expect(source).not.toMatch(/from '\.\/index'/);
  });

  it('propagates the run() exit code rather than discarding it', () => {
    expect(source).toMatch(/process\.exitCode\s*=/);
  });
});
