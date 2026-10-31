#!/usr/bin/env node
/**
 * Portable coverage entry point.
 *
 * `NODE_V8_COVERAGE=coverage/raw node ...` is a POSIX shell idiom; Windows
 * `cmd` cannot set an inline environment variable. The same run is expressed
 * here so every platform collects coverage identically.
 */
const { spawnSync } = require('node:child_process');
const { rmSync } = require('node:fs');
const { join } = require('node:path');

rmSync('coverage', { recursive: true, force: true });

const result = spawnSync(process.execPath, ['scripts/run-node-suite.mjs'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_V8_COVERAGE: join('coverage', 'raw') },
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
