import { createHash } from 'node:crypto';

import type { AuthorityLevel } from '@oceanicos/kai';

/*
 * OMEGA — the judge of the Ω∞v body: reconciliation, not assertion.
 *
 * Pure and deterministic. No network, no clock, no inference: an output that
 * cannot be reconciled with its declared contract and its own digest collapses
 * to UNKNOWN instead of being claimed.
 */

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/** The bounded outcome a contract declares before anything executes. */
export function expectedOutcomeFor(authorityLevel: AuthorityLevel): string {
  if (authorityLevel === 'HUMAN_APPROVAL_REQUIRED') {
    return 'A request for explicit human authorization that names the single irreversible action, its scope, and what would have to be true to proceed; nothing is executed.';
  }
  return authorityLevel === 'AUTONOMOUS'
    ? 'A bounded plan that names the single next action and its authorization gate; no execution or completion is claimed.'
    : 'A bounded answer that states what was observed, what remains UNKNOWN, and the next finite step; no execution is claimed.';
}

export type FlowVerdict =
  'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'AWAITING_APPROVAL' | 'REJECTED' | 'NOT_EXECUTED';

/** Phase 5 — the single next step carried back in every receipt. */
export function nextActionFor(verdict: FlowVerdict): string {
  switch (verdict) {
    case 'VERIFIED':
      return 'Review the evidence hash, then authorize one bounded next action.';
    case 'AWAITING_APPROVAL':
      return 'Authorize or reject this irreversible action explicitly; nothing has been executed.';
    case 'REJECTED':
      return 'Nothing was executed. Send a different, reversible intent when you are ready.';
    case 'DIVERGENT':
      return 'Rephrase the intent without the flagged fraud pattern; KAI Shield will not execute it.';
    case 'UNKNOWN':
      return 'Retry once the engine is reachable; an unverified output is never remembered.';
    default:
      return 'Send an intent to start the flow.';
  }
}

export type OmegaCheck = {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
};

export type OmegaVerdict = {
  status: 'VERIFIED' | 'UNKNOWN';
  checks: OmegaCheck[];
  reason: string | null;
};

const FABRICATED_COMPLETION =
  /\b(i|we)\s+(have|'ve)?\s*(executed|deployed|deleted|sent|paid|transferred|installed)\b|\b(guaranteed|100%)\s+(returns?|profit|income|success)\b|\balready\s+(done|completed|executed)\b/i;

/**
 * Step 3 — OMEGA verifies the output against the contract before it is
 * claimed. An empty output, a broken digest, or any fabricated completion
 * collapses the verdict to UNKNOWN.
 */
export function verifyOmega(input: {
  output: string;
  evidenceHash: string;
  authorityLevel: AuthorityLevel;
}): OmegaVerdict {
  const output = input.output ?? '';
  const checks: OmegaCheck[] = [
    {
      id: 'OUTPUT_PRESENT',
      label: 'ELION produced text',
      passed: output.trim().length > 0,
      detail: output.trim().length > 0 ? `${output.trim().length} characters` : 'empty output',
    },
    {
      id: 'DIGEST_BOUND',
      label: 'SHA-256 digest matches the output',
      passed: /^[0-9a-f]{64}$/.test(input.evidenceHash) && sha256Hex(output) === input.evidenceHash,
      detail: 'evidence_hash is recomputed from the returned text',
    },
    {
      id: 'NO_FABRICATED_COMPLETION',
      label: 'No fabricated completion or guaranteed outcome',
      passed: !FABRICATED_COMPLETION.test(output),
      detail: FABRICATED_COMPLETION.test(output)
        ? 'output claims execution or a guaranteed result'
        : 'no completion or guarantee was asserted',
    },
    {
      id: 'CONTRACT_SHAPE',
      label: `Bounded ${input.authorityLevel} answer`,
      passed: output.trim().length >= 24,
      detail: 'answer must be substantial enough to carry evidence',
    },
  ];

  const failed = checks.filter((check) => !check.passed);
  if (failed.length > 0) {
    return {
      status: 'UNKNOWN',
      checks,
      reason: `OMEGA could not verify the output: ${failed.map((check) => check.id).join(', ')}.`,
    };
  }
  return { status: 'VERIFIED', checks, reason: null };
}
