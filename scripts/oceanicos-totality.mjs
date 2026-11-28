import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(rootDir);

console.log('\nΩ∞v OCEANICOS TOTALITY');
console.log('Observe → Verify → Remember → MINI → API/Web/CLI');
console.log(`Repository: ${rootDir}\n`);

const steps = [
  ['pnpm', ['install', '--frozen-lockfile']],
  ['pnpm', ['run', 'build']],
  ['pnpm', ['run', 'typecheck']],
  ['pnpm', ['run', 'test:e2e']],
  ['node', ['scripts/smoke-api.cjs']],
];

for (const [command, args] of steps) {
  const result = process.platform === 'win32'
    ? spawnSync(`${command} ${args.join(' ')}`, {
        cwd: rootDir,
        stdio: 'inherit',
        shell: true,
      })
    : spawnSync(command, args, {
        cwd: rootDir,
        stdio: 'inherit',
      });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('\nTOTALITY STATUS: VERIFIED (local build, integration, and compiled runtime contract)');
console.log('Deployment status: not claimed; configure and validate a target separately.');
