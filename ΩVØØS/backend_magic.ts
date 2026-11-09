import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

/**
 * Receipt function for the stored ΩVØØS directive.
 *
 * The directive text is in CORE/ECOSYSTEM_BODY.md. This file does not treat
 * that text as a running operating system.
 *
 * A SHA-256 of a sentence this process just wrote matches that sentence by
 * construction. The repository law forbids calling that match VERIFIED.
 * This function therefore returns DIVERGENT or UNKNOWN only.
 * VERIFIED stays in the receipt type because the stored contract names it,
 * and this function does not emit it.
 *
 * It does not write a ledger, call a model, or move money.
 */

export const ENGINE = 'ΩVØØS' as const;
export const CHECKSUM_SYMBOL = '30013030';

export type PhaseName = 'SPROUT' | 'BLOOM' | 'PLATEAU' | 'WILT';
export type ReceiptStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN';

export type Receipt = {
  engine: typeof ENGINE;
  status: ReceiptStatus;
  phase_t: number;
  evidence_hash: string;
  action: string;
  reason: string;
  next_delta: string;
};

export type LedgerRow = {
  timestamp: string;
  intent: string;
  phase_t: number;
  status: ReceiptStatus;
  evidence_hash: string;
  reason: string;
  authorized: boolean;
};

const SHIELD_PHRASES = ['urgent', 'send money', 'guaranteed', 'private key'] as const;

const ABUNDANCE =
  /\b(invest|investment|donate|donation|grant|funding|sponsor|partnership|abundance)\b/i;

const BRIDGE =
  /\b(stripe|webhook|ollama|docker|live trade|wire transfer|deploy to)\b/i;

export function ease(t: number): number {
  if (!Number.isFinite(t)) return 0;
  const clamped = Math.min(1, Math.max(0, t));
  return (1 - Math.cos(clamped * Math.PI)) / 2;
}

export function phaseName(t: number): PhaseName {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0));
  if (clamped < 0.25) return 'SPROUT';
  if (clamped < 0.55) return 'BLOOM';
  if (clamped < 0.82) return 'PLATEAU';
  return 'WILT';
}

export function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

export type RunInput = {
  intent: string;
  phaseT: number;
  /** Caller-supplied text. A match does not become VERIFIED. */
  witness?: string | null;
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function shieldHits(intent: string): string[] {
  // NFKC so a compatibility homograph cannot carry a blocked phrase past the shield.
  // ASCII intent is unchanged.
  const hay = intent.normalize('NFKC').toLowerCase();
  return SHIELD_PHRASES.filter((phrase) => hay.includes(phrase));
}

function abundanceDraft(intent: string, phase: PhaseName): string {
  return [
    `Heart Opening: name one shared good already observed, before asking. Phase ${phase}.`,
    `Vision Invitation: ${intent}`,
    'Honorable Request: frame support as an investment partnership, not a loan and not a rescue.',
    'Graceful Space: no deadline pressure. Include a way to decline.',
  ].join(' ');
}

function localPlan(intent: string, phase: PhaseName, easeValue: number): string {
  const pace = `Ease ${easeValue.toFixed(3)}.`;
  if (phase === 'SPROUT') {
    return `Sprout. ${pace} One observable step for: ${intent}`;
  }
  if (phase === 'BLOOM') {
    return `Bloom. ${pace} Three ordered steps, still local, for: ${intent}`;
  }
  if (phase === 'PLATEAU') {
    return `Plateau. ${pace} Hold scope and name what would be measured for: ${intent}`;
  }
  return `Wilt. ${pace} Reduce scope and stop expansion for: ${intent}`;
}

export function runEntity(input: RunInput, now = new Date().toISOString()): {
  receipt: Receipt;
  row: LedgerRow;
} {
  const intent = typeof input.intent === 'string' ? input.intent : '';
  const phaseT = round3(
    Math.min(1, Math.max(0, Number.isFinite(input.phaseT) ? input.phaseT : 0)),
  );
  const phase = phaseName(phaseT);
  const hits = shieldHits(intent);
  let status: ReceiptStatus = 'UNKNOWN';
  let action: string;
  let reason: string;
  let next: string;

  if (intent.trim().length === 0) {
    action = 'No action.';
    reason = 'Intent was empty. UNKNOWN preserved. Nothing was executed.';
    next = 'State one observable intent.';
  } else if (hits.length > 0) {
    status = 'DIVERGENT';
    action = 'HALT ⊢ DIVERGENT';
    reason = `KAI Shield blocked this intent. Matched: ${hits.join(', ')}.`;
    next = 'Restate the intent without urgency, a money demand, a guarantee, or a secret.';
  } else if (BRIDGE.test(intent)) {
    action = 'Bridge not called.';
    reason =
      'NOT_EXECUTED. An external bridge was named and was not observed. POSSIBLE ≠ EXECUTED. Status stays UNKNOWN.';
    next = 'Do not treat this receipt as a trade, a payment, or a deployment.';
  } else if (ABUNDANCE.test(intent)) {
    action = abundanceDraft(intent.trim(), phase);
    reason =
      'ELION composed a four-layer draft. No transfer was executed. A hash of this draft is not verification.';
    next = 'A human may edit the draft. Moving money is a separate unobserved bridge.';
  } else {
    action = localPlan(intent.trim(), phase, ease(phaseT));
    reason =
      'ELION composed a local sentence at the current phase. Composition is not Expected ≡ Observed.';
    next = 'Bring back an independent observation before calling the step verified.';
  }

  const digest = sha256Hex(action);
  const witness = input.witness ?? null;
  if (status !== 'DIVERGENT' && witness != null && witness.length > 0) {
    if (witness === action && sha256Hex(witness) === digest) {
      reason +=
        ' Caller-supplied witness matched the bytes. That match stays UNKNOWN. It is not an independent observation.';
    } else {
      reason += ' Witness bytes did not match the action. Expected ≢ Observed.';
    }
  }

  const receipt: Receipt = {
    engine: ENGINE,
    status,
    phase_t: phaseT,
    evidence_hash: digest,
    action,
    reason,
    next_delta: next,
  };
  const row: LedgerRow = {
    timestamp: now,
    intent: intent.trim(),
    phase_t: phaseT,
    status,
    evidence_hash: digest,
    reason,
    authorized: false,
  };
  return { receipt, row };
}

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
