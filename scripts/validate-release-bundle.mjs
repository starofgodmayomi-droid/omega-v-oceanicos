#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const releaseDir = path.resolve(process.argv[2] || 'release');
const expectedCommit = process.argv[3] || process.env.GITHUB_SHA || '';

function fail(message) {
  console.error(`release validation failed: ${message}`);
  process.exit(1);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`cannot read JSON ${path.relative(process.cwd(), file)}: ${error.message}`);
  }
}

function requireFile(relativePath) {
  const file = path.join(releaseDir, relativePath);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    fail(`required file is missing: ${relativePath}`);
  }
}

function requireDirectory(relativePath) {
  const directory = path.join(releaseDir, relativePath);
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    fail(`required directory is missing: ${relativePath}`);
  }
}

if (!fs.existsSync(releaseDir) || !fs.statSync(releaseDir).isDirectory()) {
  fail(`release directory does not exist: ${releaseDir}`);
}

const manifestPath = path.join(releaseDir, 'release-manifest.json');
const manifest = readJson(manifestPath);

if (!/^[0-9a-f]{7,64}$/i.test(manifest.commit || '')) {
  fail('manifest.commit must be a hexadecimal commit identifier');
}
if (expectedCommit && manifest.commit !== expectedCommit) {
  fail(`manifest.commit ${manifest.commit} does not match expected commit ${expectedCommit}`);
}
if (!['staging', 'production'].includes(manifest.environment)) {
  fail(`manifest.environment must be staging or production, received ${manifest.environment}`);
}
if (manifest.status !== 'VERIFIED') {
  fail(`manifest.status must be VERIFIED, received ${manifest.status}`);
}
if (manifest.deployment !== 'STAGED_ONLY') {
  fail(`manifest.deployment must remain STAGED_ONLY, received ${manifest.deployment}`);
}
if (!Array.isArray(manifest.limitations) || manifest.limitations.length === 0) {
  fail('manifest.limitations must preserve explicit non-empty boundaries');
}
if (typeof manifest.builtAt !== 'string' || Number.isNaN(Date.parse(manifest.builtAt))) {
  fail('manifest.builtAt must be an ISO-parseable timestamp');
}

for (const file of [
  'release-manifest.json',
  'api/package.json',
  'web/package.json',
  'package.json',
  'pnpm-lock.yaml',
  'docs/OREADE-OCEANICOS-HARMONIZER.md',
]) {
  requireFile(file);
}
for (const directory of ['api/dist', 'web/dist']) {
  requireDirectory(directory);
}

console.log(
  JSON.stringify(
    {
      status: 'VERIFIED',
      releaseDir,
      commit: manifest.commit,
      environment: manifest.environment,
      deployment: manifest.deployment,
      requiredFiles: 6,
      requiredDirectories: 2,
      limitations: manifest.limitations.length,
    },
    null,
    2,
  ),
);
