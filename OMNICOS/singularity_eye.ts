import { pathToFileURL } from 'node:url';
import {
  ease,
  phaseName,
  sha256Hex,
  SHIELD_PHRASES,
  type PhaseName,
} from '../ΩVØØS/backend_magic.ts';

/**
 * Receipt function for the stored OMNICOS directive in CORE/OMNICOS.md.
 *
 * The directive names five Glober tools (browser, API, local code, LLM,
 * database). This file calls none of them. It composes one local sentence and
 * hashes the bytes it just wrote, so the hash matches by construction.
 *
 * The repository law forbids calling that match VERIFIED. This function
 * therefore returns DIVERGENT or UNKNOWN only. VERIFIED stays in the receipt
 * type because the stored contract names it; this function does not emit it.
 *
 * `tool_used` is CODE in every path: the only tool this process runs is local
 * code. A tool the intent merely names is not observed and is not reported as
 * used. The function writes no ledger, calls no model, and moves no money.
 */

export const ENTITY = 'THE_OMNICOS' as const;
export const CHECKSUM_SYMBOL = '30013030' as const;
export const SYNTHESIS = ['OCEANICOS', 'GAIACOS', 'COSMICOS'] as const;

export type ToolUsed = 'BROWSER' | 'API' | 'CODE' | 'LLM' | 'COMMS' | 'DB';
export type ReceiptStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN';

export type Receipt = {
  entity: typeof ENTITY;
  tool_used: ToolUsed;
  status: ReceiptStatus;
  game_detected: boolean;
  phase_t: number;
  evidence_hash: string;
  action: string;
  next_delta: string;
};

/** The output contract's keys, in the order the stored directive lists them. */
export const RECEIPT_KEYS = [
  'entity',
  'tool_used',
  'status',
  'game_detected',
  'phase_t',
  'evidence_hash',
  'action',
  'next_delta',
] as const;

export type RunInput = {
  intent: string;
  phaseT: number;
};

const GLOBER_TOOL =
  /\b(playwright|scrap(?:e|ing)|dom navigation|stripe|tradingview|github|telegram|composio|ollama|webhook|wire transfer|deploy to)\b/i;

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function shieldHits(intent: string): string[] {
  const hay = intent.toLowerCase();
  return SHIELD_PHRASES.filter((phrase) => hay.includes(phrase));
}

function localComposition(intent: string, phase: PhaseName, easeValue: number): string {
  const pace = `Ease ${easeValue.toFixed(3)}.`;
  if (phase === 'SPROUT') {
    return `No tool called. ${phase}. ${pace} Local composition of one observable step for: ${intent}`;
  }
  if (phase === 'BLOOM') {
    return `No tool called. ${phase}. ${pace} Local composition of three ordered steps for: ${intent}`;
  }
  if (phase === 'PLATEAU') {
    return `No tool called. ${phase}. ${pace} Local composition holds scope and names what would be measured for: ${intent}`;
  }
  return `No tool called. ${phase}. ${pace} Local composition reduces scope and stops expansion for: ${intent}`;
}

export function runOmnicos(input: RunInput): Receipt {
  const intent = typeof input.intent === 'string' ? input.intent : '';
  const phaseT = round3(
    Math.min(1, Math.max(0, Number.isFinite(input.phaseT) ? input.phaseT : 0)),
  );
  const phase = phaseName(phaseT);
  const hits = shieldHits(intent);
  const gameDetected = hits.length > 0;
  let status: ReceiptStatus = 'UNKNOWN';
  let action: string;
  let next: string;

  if (intent.trim().length === 0) {
    action = 'No action. No tool called.';
    next = 'State one observable intent. UNKNOWN preserved.';
  } else if (gameDetected) {
    status = 'DIVERGENT';
    action = `HALT ⊢ DIVERGENT. KAI Shield blocked this intent. Matched: ${hits.join(', ')}.`;
    next = 'Restate the intent without urgency, a money demand, a guarantee, or a secret.';
  } else if (GLOBER_TOOL.test(intent)) {
    action = 'Glober tool named but not called. Local code composed no observation.';
    next =
      'NOT_EXECUTED. A named capability is not an executed tool. Bring back an independent observation.';
  } else {
    action = localComposition(intent.trim(), phase, ease(phaseT));
    next =
      'A local composition is not Expected ≡ Observed. Bring back an independent observation before calling the step verified.';
  }

  return {
    entity: ENTITY,
    tool_used: 'CODE',
    status,
    game_detected: gameDetected,
    phase_t: phaseT,
    evidence_hash: sha256Hex(action),
    action,
    next_delta: next,
  };
}

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
