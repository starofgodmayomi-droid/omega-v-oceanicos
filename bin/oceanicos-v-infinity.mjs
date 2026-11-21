#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const supportedFlags = new Set([
  '--now',
  '--local-first',
  '--stateless',
  '--offline',
  '--pidgin',
]);
const requiredFlags = ['--local-first', '--stateless', '--offline'];
const suppliedFlags = process.argv.slice(2);
const unsupportedFlags = suppliedFlags.filter((flag) => !supportedFlags.has(flag));

function reject(message) {
  console.error(`[BOOT:DENY] ${message}`);
  console.error(
    'Usage: pnpm run oceanicos:v_infinity -- --now --local-first --stateless --offline [--pidgin]',
  );
  process.exitCode = 2;
}

if (unsupportedFlags.length > 0) {
  reject(`Unsupported mode flag(s): ${unsupportedFlags.join(', ')}`);
} else {
  const missingFlags = requiredFlags.filter((flag) => !suppliedFlags.includes(flag));
  if (missingFlags.length > 0) {
    reject(`Missing required mode flag(s): ${missingFlags.join(', ')}`);
  } else {
    const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const env = { ...process.env };
    if (suppliedFlags.includes('--pidgin')) env.PIDGIN_ENGINE = 'ON';

    console.log('[BOOT] Mode contract accepted: LOCAL-FIRST, STATELESS, OFFLINE');
    console.log(
      '[BOOT] Running the existing MINI offline path; no API request or durable ledger file is requested.',
    );
    const result = spawnSync(process.execPath, [path.join(rootDir, 'bin/oceanicos.mjs'), 'offline'], {
      cwd: rootDir,
      env,
      stdio: 'inherit',
    });

    if (result.error) {
      console.error(`[BOOT:ERROR] Could not launch MINI offline path: ${result.error.message}`);
      process.exitCode = 1;
    } else if (typeof result.status === 'number') {
      process.exitCode = result.status;
    } else {
      console.error(
        `[BOOT:ERROR] MINI offline path ended without an exit status (signal: ${result.signal ?? 'unknown'}).`,
      );
      process.exitCode = 1;
    }
  }
}
