import { pathToFileURL } from 'node:url';
import {
  OMNICOS_CHECKSUM,
  OMNICOS_ENTITY,
  OMNICOS_OBSERVATION_POLICY,
  OMNICOS_OBSERVATION_TIMEOUT_MS,
  OMNICOS_OBSERVATION_TOOL,
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
 * The one connected Glober limb (a bounded public GitHub metadata read) lives
 * in `packages/mini/src/omnicos-observe.ts`. It imports sibling modules with
 * `.js` specifiers, which Node's type stripping does not resolve, so this
 * adapter loads the built copy (`packages/mini/dist`) for that path only. Run
 * `pnpm --filter @oceanicos/mini run build` before observing from the CLI.
 *
 * Read the mini contract's header for what the receipt refuses to claim.
 */

export const ENTITY = OMNICOS_ENTITY;
export const CHECKSUM_SYMBOL = OMNICOS_CHECKSUM;
export const SYNTHESIS = OMNICOS_SYNTHESIS;
export const RECEIPT_KEYS = OMNICOS_RECEIPT_KEYS;
export const OBSERVATION_TOOL = OMNICOS_OBSERVATION_TOOL;
export const OBSERVATION_TIMEOUT_MS = OMNICOS_OBSERVATION_TIMEOUT_MS;
export const OBSERVATION_POLICY = OMNICOS_OBSERVATION_POLICY;

export type ToolUsed = OmnicosTool;
export type ReceiptStatus = OmnicosStatus;
export type Receipt = OmnicosReceipt;
export type RunInput = OmnicosInput;

export const runOmnicos = runOmnicosReceipt;

/** Same receipt as the API, through the built @oceanicos/mini observation law. */
export async function observeOmnicos(
  input: OmnicosInput,
  options: { readonly fetchImpl?: typeof fetch } = {},
): Promise<OmnicosReceipt> {
  const built = await import('../packages/mini/dist/omnicos-observe.js');
  return built.observeOmnicos(input, options);
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}

if (isDirectRun()) {
  const intent = process.argv[2] ?? '';
  const phaseT = Number(process.argv[3] ?? '0');
  const receipt = await observeOmnicos({ intent, phaseT: Number.isFinite(phaseT) ? phaseT : 0 });
  process.stdout.write(`${JSON.stringify(receipt)}\n`);
}
