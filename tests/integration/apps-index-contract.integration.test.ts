import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import viteConfig from '../../apps/web/vite.config.ts';

const root = process.cwd();
const read = (path: string): string => readFileSync(join(root, path), 'utf8');
const index = read('apps/README.md');
const rootPackage = JSON.parse(read('package.json')) as {
  engines: { node: string; pnpm: string };
  scripts: Record<string, string>;
};
const apiPackage = JSON.parse(read('apps/api/package.json')) as { name: string };
const webPackage = JSON.parse(read('apps/web/package.json')) as { name: string };
const apiSource = read('apps/api/src/index.ts');
const devServer = read('bin/dev-server.mjs');

test('applications index describes the actual app packages and canonical guides', () => {
  assert.equal(apiPackage.name, 'api');
  assert.equal(webPackage.name, 'web');
  assert.ok(
    index.includes(
      '| `apps/api` | Fastify HTTP API | `http://localhost:5000` | [API README](api/README.md) |'
    )
  );
  assert.ok(
    index.includes(
      '| `apps/web` | React dashboard served by Vite | `http://localhost:3000` | [Web README](web/README.md) |'
    )
  );
  assert.doesNotMatch(index, /Express/);
});

test('documented app URLs and API proxy match source configuration', () => {
  assert.match(apiSource, /process\.env\.PORT\s*\?\?\s*process\.env\.API_PORT\s*\?\?\s*5000/);
  assert.equal(viteConfig.server?.port, 3000);
  assert.equal(
    viteConfig.server?.proxy?.['/api']?.target,
    process.env.VITE_API_PROXY_TARGET || 'http://localhost:5000'
  );
  assert.match(index, /`VITE_API_PROXY_TARGET`/);
  assert.match(devServer, /API server on http:\/\/localhost:5000/);
  assert.match(devServer, /Web dev server on http:\/\/localhost:3000/);
});

test('documented root setup commands exist and stale setup claims stay out', () => {
  assert.match(rootPackage.engines.node, />=22/);
  assert.equal(rootPackage.engines.pnpm, '10.34.5');
  for (const command of ['dev', 'build', 'test', 'verify:full']) {
    assert.ok(rootPackage.scripts[command], `root script ${command} must exist`);
  }
  assert.match(index, /pnpm install --frozen-lockfile/);
  assert.match(index, /pnpm dev\b/);
  assert.match(index, /pnpm build\b/);
  assert.match(index, /pnpm test\b/);
  assert.match(index, /pnpm verify:full\b/);
  assert.doesNotMatch(index, /\bnpm (?:install|run)|\bJest\b|localhost:3001|API_PORT=3000/);
});
