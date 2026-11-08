import { pathToFileURL } from 'node:url';
import {
  OMNICOS_CHECKSUM,
  OMNICOS_ENTITY,
  OMNICOS_RECEIPT_KEYS,
  OMNICOS_SYNTHESIS,
  runOmnicos as runOmnicosReceipt,
  type OmnicosInput,
  type OmnicosReceipt,
  type OmnicosStatus,
  type OmnicosTool,
} from '../packages/mini/src/omnicos.ts';

/**
 * Root adapter for the stored OMNICOS directive in CORE/OMNICOS.md.
 *
 * The law lives once, in @oceanicos/mini (`packages/mini/src/omnicos.ts`), so
 * the API route and this script return the same receipt. This file adds only
 * the directive's local names and the CLI entry point.
 *
 * Read the mini contract's header for what the receipt refuses to claim.
 */

export const ENTITY = OMNICOS_ENTITY;
export const CHECKSUM_SYMBOL = OMNICOS_CHECKSUM;
export const SYNTHESIS = OMNICOS_SYNTHESIS;
export const RECEIPT_KEYS = OMNICOS_RECEIPT_KEYS;

export type ToolUsed = OmnicosTool;
export type ReceiptStatus = OmnicosStatus;
export type Receipt = OmnicosReceipt;
export type RunInput = OmnicosInput;

export const runOmnicos = runOmnicosReceipt;

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}

if (isDirectRun()) {
  const intent = process.argv[2] ?? '';
  const phaseT = Number(process.argv[3] ?? '0');
  const receipt = runOmnicos({ intent, phaseT: Number.isFinite(phaseT) ? phaseT : 0 });
  process.stdout.write(`${JSON.stringify(receipt)}\n`);
}
