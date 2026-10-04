#!/usr/bin/env node
/**
 * Keep the repository's GitHub Actions dependency and install contracts
 * aligned. This is source validation, not proof that hosted CI or deployment
 * is healthy.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const workflowsDir = join(process.cwd(), '.github', 'workflows');
const workflowFiles = readdirSync(workflowsDir)
  .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
  .sort();

if (workflowFiles.length === 0) {
  throw new Error('CI_CONTRACT_INVALID: no workflow files found');
}

const expectedActions = new Map([
  ['actions/checkout', 'v7'],
  ['actions/setup-node', 'v7'],
  ['pnpm/action-setup', 'v6'],
]);
const failures = [];
const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
if (packageJson.packageManager !== 'pnpm@10.34.5') {
  failures.push(
    `package.json: packageManager must pin pnpm@10.34.5, found ${packageJson.packageManager ?? 'unset'}`,
  );
}
if (packageJson.engines?.pnpm !== '10.34.5') {
  failures.push(
    `package.json: engines.pnpm must pin 10.34.5, found ${packageJson.engines?.pnpm ?? 'unset'}`,
  );
}

for (const file of workflowFiles) {
  const source = readFileSync(join(workflowsDir, file), 'utf8');
  for (const match of source.matchAll(/uses:\s*([^\s#]+)/g)) {
    const [, action] = match;
    const at = action.lastIndexOf('@');
    if (at === -1) continue;
    const name = action.slice(0, at);
    const version = action.slice(at + 1);
    const expected = expectedActions.get(name);
    if (expected && version !== expected) {
      failures.push(`${file}: ${name} must use ${expected}, found ${version}`);
    }
  }

  for (const [lineNumber, line] of source.split('\n').entries()) {
    if (/\bpnpm install\b/.test(line) && !/--frozen-lockfile\b/.test(line)) {
      failures.push(`${file}:${lineNumber + 1}: pnpm installs must use --frozen-lockfile`);
    }
  }

  const hasPinnedPnpmVersion =
    source.includes('version: 10.34.5') || source.includes('PNPM_VERSION: 10.34.5');
  if (source.includes('pnpm/action-setup@v6') && !hasPinnedPnpmVersion) {
    failures.push(`${file}: pnpm/action-setup@v6 must pin pnpm 10.34.5`);
  }

  if (source.includes('pnpm install') && !/\bpnpm audit\b/.test(source)) {
    failures.push(`${file}: dependency-installing workflows must run pnpm audit`);
  }
}

if (failures.length > 0) {
  console.error(['CI_CONTRACT_INVALID', ...failures].join('\n'));
  process.exitCode = 1;
} else {
  console.log(`validated CI contracts across ${workflowFiles.length} workflow files`);
}
