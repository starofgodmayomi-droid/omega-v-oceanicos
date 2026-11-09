#!/usr/bin/env node
/**
 * ΩVØØS omega gate — one next, or stop.
 *
 *   Δ* = argmax_{Δ authorized} V(Δ)·Q(Δ) / (R(Δ) + C(Δ) + ε)
 *
 * `selectAuthorizedNext` carries one value estimate, so the caller folds
 * V·Q into `evidenceBackedValue`. Every number is an estimate supplied by
 * the caller through --input; nothing here measures evidence, grants
 * authority, or executes the selection.
 *
 * Doctrine: ATTEST, DON'T ASSERT. UNKNOWN PRESERVED. Checksum 30013030.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

let selectAuthorizedNext;
try {
  ({ selectAuthorizedNext } = require(path.join(root, 'packages/mini/dist/index.js')));
} catch (error) {
  console.error('[omega] @oceanicos/mini must be built first: pnpm build');
  console.error(`[omega] ${error.message}`);
  process.exit(1);
}

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`ΩVØØS omega — Δ* = argmax V·Q / (R + C + ε)

Usage:
  pnpm run omega -- --input <candidates.json>   rank caller-supplied candidates
  pnpm run omega -- --input -                   read the same JSON from stdin
  pnpm run omega                                print the contract and STOP

Input:
  { "epsilon": 1e-9,
    "candidates": [{ "id", "authorized", "evidenceBackedValue", "risk", "cost" }] }

  evidenceBackedValue is the caller's estimate of V·Q. A selection is not
  permission: execution is always NOT_STARTED.`);
  process.exit(0);
}

const inputIndex = args.indexOf('--input');
const inputPath = inputIndex >= 0 ? args[inputIndex + 1] : undefined;

if (!inputPath) {
  const ledger = JSON.parse(readFileSync(path.join(root, 'kai_ledger.json'), 'utf8'));
  const last = ledger.entries[ledger.entries.length - 1];
  console.log(
    JSON.stringify(
      {
        protocol: ledger.protocol,
        checksum: ledger.checksum,
        formula: 'Δ* = argmax_{authorized} V·Q / (R + C + ε)',
        status: 'STOP',
        execution: 'NOT_STARTED',
        reason: 'no caller-supplied candidates; estimates are never invented here',
        last_next_delta: last ? last.next_delta : null,
      },
      null,
      2,
    ),
  );
  process.exit(2);
}

let request;
try {
  const raw = inputPath === '-' ? readFileSync(0, 'utf8') : readFileSync(inputPath, 'utf8');
  request = JSON.parse(raw);
} catch (error) {
  console.error(`[omega] could not read candidates: ${error.message}`);
  process.exit(1);
}

const selection = selectAuthorizedNext(request);
console.log(
  JSON.stringify(
    {
      protocol: 'ΩVØØS-SWARM/1',
      checksum: '30013030',
      formula: 'Δ* = argmax_{authorized} V·Q / (R + C + ε)',
      selection,
    },
    null,
    2,
  ),
);
process.exit(selection.status === 'SELECTED' ? 0 : selection.status === 'STOP' ? 2 : 1);
