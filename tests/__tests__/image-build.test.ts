import assert from 'node:assert/strict';
import { each } from './node-test-each.ts';
import { describe, it } from 'node:test';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

describe('the image builds the packages it names', () => {
  const root = process.cwd();
  const dockerfile = readFileSync(join(root, 'apps/api/Dockerfile'), 'utf8');

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

  it('finds a workspace and build filters to check', () => {
    assert.ok(declared.size > 5);
    assert.ok(filtered.length > 0);
  });

  each(filtered)('--filter %s matches a declared workspace package', (name) => {
    assert.equal(declared.has(name), true);
  });

  it('builds the application executed by the container', () => {
    const command = dockerfile.match(/CMD\s+\[([^\]]+)\]/)?.[1] ?? '';
    const entry = command.match(/(apps\/[a-z-]+)\/dist/)?.[1];
    assert.ok(entry);

    const manifest = JSON.parse(
      readFileSync(join(root, entry as string, 'package.json'), 'utf8')
    ) as { name?: string };

    assert.ok(filtered.includes(manifest.name));
  });

  it('builds every workspace dependency declared by the container application', () => {
    const command = dockerfile.match(/CMD\s+\[([^\]]+)\]/)?.[1] ?? '';
    const entry = command.match(/(apps\/[a-z-]+)\/dist/)?.[1] as string;
    const deps = Object.keys(
      (
        JSON.parse(readFileSync(join(root, entry, 'package.json'), 'utf8')) as {
          dependencies?: Record<string, string>;
        }
      ).dependencies ?? {}
    ).filter((name) => declared.has(name));

    assert.deepEqual(deps.filter((name) => !filtered.includes(name)), []);
  });
});
