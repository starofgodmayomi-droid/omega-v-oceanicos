import type { ChangeDecision, OmegaChangeRecord } from '@oceanicos/types';

export interface OmegaAdmissionEvidence {
  /** Explicitly verified authority evidence; this function does not establish it. */
  readonly authorityVerified: boolean;
  /** Explicitly verified policy satisfaction; this function does not establish it. */
  readonly policySatisfied: boolean;
}

/**
 * Resolve an already-observed change at the authority/policy boundary.
 *
 * This is a fail-closed gate, not an authority or policy engine. It never
 * discovers, grants, or delegates authority. ALLOW requires explicit evidence
 * from both upstream gates plus a non-empty evidence trail and references to
 * the authority and policy that were evaluated.
 */
export function resolveChangeAdmission(
  record: OmegaChangeRecord,
  gates: OmegaAdmissionEvidence,
): OmegaChangeRecord {
  const hasEvidence = record.evidence.length > 0;
  const hasAuthorityReference = Boolean(record.authority?.trim());
  const hasPolicyReference = Boolean(record.policy?.trim());
  let decision: ChangeDecision = 'REVIEW';
  let authorized = false;

  if (!gates.authorityVerified || !gates.policySatisfied) {
    decision = 'DENY';
  } else if (hasEvidence && hasAuthorityReference && hasPolicyReference) {
    decision = 'ALLOW';
    authorized = true;
  }

  return { ...record, decision, authorized };
}
