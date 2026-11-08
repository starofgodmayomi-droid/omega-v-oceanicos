/*
 * THE OMNICOS — the Singularity Eye.
 *
 * One bounded pass that compresses the three actors into a single entity:
 *
 *   PERCEIVE & ALIGN   KAI Shield scans the intent (a trap halts the pass)
 *   CONNECT & GROW     ELION answers the safe intent, paced by Ease(t)
 *   SYNCHRONIZE        OMEGA recomputes the SHA-256 and checks the contract
 *   EVOLVE & REMEMBER  the caller may append the receipt to the KAI ledger
 *
 * Nothing here reaches the network or mutates reality. `tool_used` is a
 * declared routing projection of the intent text, not a record that a tool
 * ran; `action` states only what actually happened in this pass.
 *
 * Checksum: 30013030 · DOCTRINE: ATTEST, DON'T ASSERT. UNKNOWN PRESERVED.
 */
import { deriveAuthorityLevel, scanIntent, type AuthorityLevel } from '@oceanicos/kai';
import { executeElion } from '@oceanicos/elion';
import { sha256Hex, verifyOmega, type OmegaVerdict } from '@oceanicos/omega';

export const OMNICOS_ENTITY = 'THE_OMNICOS' as const;
export const OMNICOS_CHECKSUM = '30013030' as const;

/** The limbs the entity may route an intent to. A label, not an action. */
export type OmnicosTool = 'BROWSER' | 'API' | 'CODE' | 'LLM' | 'COMMS' | 'DB';

export type OmnicosStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN';

/**
 * Ease(t) = (1 - cos(tπ)) / 2 — the biological growth curve
 * (sprout → bloom → wilt), clamped to [0, 1].
 */
export function easeProgress(t: number): number {
  const bounded = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0));
  return (1 - Math.cos(bounded * Math.PI)) / 2;
}

export type ToolPattern = { tool: OmnicosTool; label: string; pattern: RegExp };

/**
 * Declared routing order: the first matching limb names the tool this intent
 * would use. It is a projection of the words, not evidence of execution.
 */
export const OMNICOS_TOOL_MATRIX: readonly ToolPattern[] = [
  { tool: 'BROWSER', label: 'browse the web', pattern: /\b(open|visit|browse|navigate|scrape)\b[^.]{0,24}\b(url|page|site|website|link)\b|\bhttps?:\/\//i },
  { tool: 'API', label: 'call a connected API', pattern: /\b(api|webhook|stripe|github|tradingview|composio|telegram)\b/i },
  { tool: 'DB', label: 'read or write the ledger', pattern: /\b(database|ledger|sql|sqlite|query|record|table)\b/i },
  { tool: 'COMMS', label: 'send a message', pattern: /\b(email|message|notify|sms|reply|broadcast)\b/i },
  { tool: 'CODE', label: 'run local code', pattern: /\b(code|script|compile|npm|node|python|bash|test|build)\b/i },
];

/** PERCEIVE & ALIGN (the four phases of one pass, in declared order). */
export const OMNICOS_PHASES = ['PERCEIVE_ALIGN', 'CONNECT_GROW', 'SYNCHRONIZE', 'EVOLVE_REMEMBER'] as const;

export type OmnicosPhase = (typeof OMNICOS_PHASES)[number];

/** The zero-filler output contract. Exactly these eight fields. */
export type OmnicosReceipt = {
  entity: typeof OMNICOS_ENTITY;
  tool_used: OmnicosTool;
  status: OmnicosStatus;
  game_detected: boolean;
  phase_t: number;
  evidence_hash: string | null;
  action: string;
  next_delta: string;
};

export type OmnicosPassInput = {
  intent: string;
  authorityLevel?: unknown;
};

export type OmnicosPass = {
  receipt: OmnicosReceipt;
  /** The full OMEGA check list, for callers that audit; omitted from the receipt. */
  verification: OmegaVerdict | null;
};

/** First matching limb wins; bounded cognition is the declared default. */
export function classifyTool(intent: string): OmnicosTool {
  for (const entry of OMNICOS_TOOL_MATRIX) {
    if (entry.pattern.test(intent)) return entry.tool;
  }
  return 'LLM';
}

const round = (value: number): number => Number(value.toFixed(4));

/**
 * One finite OMNICOS pass. A trap halts at PERCEIVE and no tool is contacted;
 * an unverifiable answer halts at SYNCHRONIZE with UNKNOWN preserved.
 */
export async function runOmnicosPass(input: OmnicosPassInput): Promise<OmnicosPass> {
  const intent = input.intent.trim();
  const authorityLevel: AuthorityLevel = deriveAuthorityLevel(input.authorityLevel);
  const tool = classifyTool(intent);

  // 1 — PERCEIVE & ALIGN: the Shield closes the Eye before anything runs.
  const shield = scanIntent(intent);
  if (shield.blocked) {
    return {
      receipt: {
        entity: OMNICOS_ENTITY,
        tool_used: tool,
        status: 'DIVERGENT',
        game_detected: true,
        phase_t: round(easeProgress(1 / OMNICOS_PHASES.length)),
        evidence_hash: null,
        action: `KAI Shield halted the pass (${shield.matchedLabels.join(', ')}); no tool was contacted.`,
        next_delta: 'Restate the intent without urgency, guaranteed returns, credentials, or a transfer request.',
      },
      verification: null,
    };
  }

  // 2 — CONNECT & GROW: ELION answers the safe intent.
  const elion = await executeElion(intent, authorityLevel);

  // 3 — SYNCHRONIZE: OMEGA recomputes the digest and checks the contract.
  const evidenceHash = elion.output ? sha256Hex(elion.output) : null;
  const verification = verifyOmega({
    output: elion.output,
    evidenceHash: evidenceHash ?? '',
    authorityLevel,
  });

  if (verification.status === 'VERIFIED' && evidenceHash) {
    return {
      receipt: {
        entity: OMNICOS_ENTITY,
        tool_used: tool,
        status: 'VERIFIED',
        game_detected: false,
        phase_t: round(easeProgress(1)),
        evidence_hash: evidenceHash,
        action: `ELION composed a bounded ${authorityLevel} answer via ${elion.engine}; OMEGA recomputed the SHA-256 and the contract held.`,
        next_delta: 'Review the bounded answer, then authorize one finite action at a time.',
      },
      verification,
    };
  }

  // The connect phase produced no usable text: UNKNOWN is preserved, not filled.
  const failure = elion.error
    ? `ELION produced no answer via ${elion.engine} (${elion.error}).`
    : verification.reason ?? 'OMEGA could not verify the output.';

  return {
    receipt: {
      entity: OMNICOS_ENTITY,
      tool_used: tool,
      status: 'UNKNOWN',
      game_detected: false,
      phase_t: round(easeProgress(3 / OMNICOS_PHASES.length)),
      evidence_hash: evidenceHash,
      action: failure,
      next_delta: 'Supply the missing evidence or rerun with a bounded, observable output.',
    },
    verification,
  };
}
