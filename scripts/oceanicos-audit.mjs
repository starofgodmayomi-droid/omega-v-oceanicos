import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const requiredFiles = [
  'README.md',
  'CHARTER.md',
  'MANIFEST.md',
  'docs/MINI.md',
  'docs/VERIFICATION_LOOP.md',
  'docs/CONSOLIDATION.md',
  'package.json',
  'pnpm-lock.yaml',
];

const failures = [];
for (const relativePath of requiredFiles) {
  try {
    await readFile(join(root, relativePath));
  } catch {
    failures.push(`missing required file: ${relativePath}`);
  }
}

const packageRoot = join(root, 'packages');
const packageDirectories = (await readdir(packageRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const packageNames = new Map();
for (const directory of packageDirectories) {
  const manifestPath = join(packageRoot, directory, 'package.json');
  try {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    if (!manifest.name) failures.push(`package has no name: packages/${directory}`);
    if (packageNames.has(manifest.name)) {
      failures.push(`duplicate package name: ${manifest.name}`);
    }
    packageNames.set(manifest.name, directory);
  } catch {
    failures.push(`package manifest missing or invalid: packages/${directory}/package.json`);
  }
}

const rootManifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
for (const script of ['build', 'test', 'typecheck', 'verify:full', 'smoke:api']) {
  if (!rootManifest.scripts?.[script]) failures.push(`missing root script: ${script}`);
}

const result = {
  status: failures.length === 0 ? 'verified' : 'failed',
  packageCount: packageDirectories.length,
  uniquePackageNames: packageNames.size,
  requiredFiles: requiredFiles.length,
  failures,
};

console.log(JSON.stringify(result, null, 2));
if (failures.length > 0) process.exitCode = 1;
