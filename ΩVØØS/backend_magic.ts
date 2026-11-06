#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import { runEntity } from '../packages/mini/src/ovoos-entity.ts';

/**
 * Command-line surface for the ΩVØØS receipt law.
 *
 * The law itself lives in `@oceanicos/mini` (`packages/mini/src/ovoos-entity.ts`)
 * so the API and this CLI return the same receipt. The directive text is in
 * CORE/ECOSYSTEM_BODY.md; this file does not treat that text as a running
 * operating system.
 *
 * It does not write a ledger, call a model, or move money.
 */

export * from '../packages/mini/src/ovoos-entity.ts';

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}

if (isDirectRun()) {
  const intent = process.argv[2] ?? '';
  const phaseT = Number(process.argv[3] ?? '0');
  const { receipt } = runEntity({ intent, phaseT: Number.isFinite(phaseT) ? phaseT : 0 });
  process.stdout.write(`${JSON.stringify(receipt)}\n`);
}
