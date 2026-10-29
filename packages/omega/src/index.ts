/*
 * OMEGA — the judge of the Invisible Online Computer.
 *
 * Recomputes the SHA-256 evidence of an output and compares it to the declared
 * contract before anything is claimed. Empty output, a broken digest or a
 * fabricated completion collapses to UNKNOWN: the judge fails closed.
 *
 * `replayVerdict` is the same rule applied to a remembered row, shared with the
 * ledger audit so a record can never be judged one way singly and another way
 * in the ledger.
 */
import { createHash } from 'node:crypto';
import type { AuthorityLevel, KaiMemoryEvidenceRecord } from '@oceanicos/kai';

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
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
      passed:
        /^[0-9a-f]{64}$/.test(input.evidenceHash) &&
        sha256Hex(output) === input.evidenceHash,
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

export type ReplayVerdict = {
  status: 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN';
  recomputed_hash: string | null;
  reason: string | null;
};

/**
 * Recompute one remembered record's digest from the evidence text retained
 * with it. A row written before evidence was retained is UNKNOWN, not
 * VERIFIED; a row whose digest does not recompute is DIVERGENT and preserved.
 */
export function replayVerdict(record: KaiMemoryEvidenceRecord): ReplayVerdict {
  if (!record.evidence_text) {
    return {
      status: 'UNKNOWN',
      recomputed_hash: null,
      reason:
        'EVIDENCE_TEXT_NOT_RETAINED: this record predates replayable evidence and cannot be re-verified.',
    };
  }
  const recomputedHash = sha256Hex(record.evidence_text);
  const matches = recomputedHash === record.evidence_hash;
  return {
    status: matches ? 'VERIFIED' : 'DIVERGENT',
    recomputed_hash: recomputedHash,
    reason: matches
      ? null
      : 'EVIDENCE_HASH_MISMATCH: the retained evidence does not recompute to the recorded digest.',
  };
}
