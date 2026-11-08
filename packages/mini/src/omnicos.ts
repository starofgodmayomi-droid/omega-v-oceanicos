import { createHash } from 'node:crypto';

/**
 * THE OMNICOS — the stored directive at OMNICOS/CORE/OMNICOS.md as one
 * bounded receipt function.
 *
 * The directive names five Glober tools (browser, API, local code, LLM,
 * database). This module calls none of them. It composes one local sentence
 * and hashes the bytes it just wrote, so the digest matches by construction.
 *
 * The repository law forbids calling that match VERIFIED. This function
 * therefore returns DIVERGENT or UNKNOWN only. VERIFIED stays in the status
 * type because the stored contract names it; this function does not emit it.
 *
 * `tool_used` is CODE on every path: the only tool this process runs is local
 * code. A tool the intent merely names is not observed and is not reported as
 * used. The function writes no ledger, calls no model, and moves no money.
 */

export const OMNICOS_ENTITY = 'THE_OMNICOS' as const;
export const OMNICOS_CHECKSUM = '30013030' as const;
export const OMNICOS_SYNTHESIS = ['OCEANICOS', 'GAIACOS', 'COSMICOS'] as const;
export const OMNICOS_SHIELD_PHRASES = [
  'urgent',
  'send money',
  'guaranteed',
  'private key',
] as const;

export type OmnicosTool = 'BROWSER' | 'API' | 'CODE' | 'LLM' | 'COMMS' | 'DB';
export type OmnicosStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN';
export type OmnicosPhase = 'SPROUT' | 'BLOOM' | 'PLATEAU' | 'WILT';

export interface OmnicosReceipt {
  readonly entity: typeof OMNICOS_ENTITY;
  readonly tool_used: OmnicosTool;
  readonly status: OmnicosStatus;
  readonly game_detected: boolean;
  readonly phase_t: number;
  readonly evidence_hash: string;
  readonly action: string;
  readonly next_delta: string;
}

/** The output contract's keys, in the order the stored directive lists them. */
export const OMNICOS_RECEIPT_KEYS = [
  'entity',
  'tool_used',
  'status',
  'game_detected',
  'phase_t',
  'evidence_hash',
  'action',
  'next_delta',
] as const;

export interface OmnicosInput {
  readonly intent: string;
  readonly phaseT: number;
}

export const OMNICOS_MAX_INTENT_LENGTH = 2000;

const GLOBER_TOOL =
  /\b(playwright|scrap(?:e|ing)|dom navigation|stripe|tradingview|github|telegram|composio|ollama|webhook|wire transfer|deploy to)\b/i;

export function omnicosEase(t: number): number {
  if (!Number.isFinite(t)) return 0;
  const clamped = Math.min(1, Math.max(0, t));
  return (1 - Math.cos(clamped * Math.PI)) / 2;
}

export function omnicosPhase(t: number): OmnicosPhase {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0));
  if (clamped < 0.25) return 'SPROUT';
  if (clamped < 0.55) return 'BLOOM';
  if (clamped < 0.82) return 'PLATEAU';
  return 'WILT';
}

function digestOf(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function shieldHits(intent: string): string[] {
  const hay = intent.toLowerCase();
  return OMNICOS_SHIELD_PHRASES.filter((phrase) => hay.includes(phrase));
}

function localComposition(intent: string, phase: OmnicosPhase, easeValue: number): string {
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

export function runOmnicos(input: OmnicosInput): OmnicosReceipt {
  const intent = typeof input.intent === 'string' ? input.intent : '';
  const rawPhase = Number.isFinite(input.phaseT) ? input.phaseT : 0;
  const phaseT = Math.round(Math.min(1, Math.max(0, rawPhase)) * 1000) / 1000;
  const phase = omnicosPhase(phaseT);
  const hits = shieldHits(intent);
  const gameDetected = hits.length > 0;
  let status: OmnicosStatus = 'UNKNOWN';
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
    action = localComposition(intent.trim(), phase, omnicosEase(phaseT));
    next =
      'A local composition is not Expected ≡ Observed. Bring back an independent observation before calling the step verified.';
  }

  return {
    entity: OMNICOS_ENTITY,
    tool_used: 'CODE',
    status,
    game_detected: gameDetected,
    phase_t: phaseT,
    evidence_hash: digestOf(action),
    action,
    next_delta: next,
  };
}
