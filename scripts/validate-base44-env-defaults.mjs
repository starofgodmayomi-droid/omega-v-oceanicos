#!/usr/bin/env node
/**
 * Prevent real credentials from entering the tracked Base44 development env.
 * Only variable names and validation outcomes are ever written to output.
 */
import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const inputPath = resolve(process.argv[2] ?? '.env.base44-defaults');
const requiredCredentialNames = new Set([
  'OMEGA_SIGNING_KEY',
  'OMEGA_READ_TOKEN',
  'OMEGA_ADMIN_TOKEN',
]);
const sensitiveName = /(TOKEN|SECRET|PASSWORD|CREDENTIAL|(?:SIGNING_)?KEY|APIKEY)/i;
const explicitPlaceholder = /(?:\bplaceholder\b|\bexample\b|\bdummy\b|\bsample\b|\bdev(?:elopment)?\b|\btest\b|change[-_ ]?me|replace[-_ ]?me|your[-_ ])/i;

let source;
try {
  source = readFileSync(inputPath, 'utf8');
} catch {
  console.error(`BASE44_ENV_DEFAULTS_INVALID: cannot read ${basename(inputPath)}`);
  process.exit(1);
}

const values = new Map();
const failures = [];
for (const [index, rawLine] of source.split(/\r?\n/).entries()) {
  const line = rawLine.trim();
  if (!line || line.startsWith('#')) continue;
  const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (!match) {
    failures.push(`line ${index + 1}: invalid environment assignment`);
    continue;
  }

  const [, name, rawValue] = match;
  if (values.has(name) && sensitiveName.test(name)) {
    failures.push(`${name}: duplicate sensitive setting`);
    continue;
  }
  const value = rawValue.trim().replace(/^(?:"(.*)"|'(.*)')$/, (_, doubleQuoted, singleQuoted) => doubleQuoted ?? singleQuoted);
  values.set(name, value);
}

for (const name of requiredCredentialNames) {
  const value = values.get(name);
  if (!value) {
    failures.push(`${name}: required development placeholder is missing`);
  } else if (!explicitPlaceholder.test(value)) {
    failures.push(`${name}: value must be an explicit development placeholder`);
  }
}

for (const [name, value] of values) {
  if (!sensitiveName.test(name) || !value || requiredCredentialNames.has(name)) continue;
  if (!explicitPlaceholder.test(value)) {
    failures.push(`${name}: sensitive defaults must be empty or explicit placeholders`);
  }
}

if (failures.length > 0) {
  console.error(['BASE44_ENV_DEFAULTS_INVALID', ...failures].join('\n'));
  process.exit(1);
}

const sensitiveDefaults = [...values].filter(([name, value]) => sensitiveName.test(name) && value).length;
console.log(`validated ${requiredCredentialNames.size} required credential placeholders and ${sensitiveDefaults} non-empty sensitive defaults in ${basename(inputPath)}`);
