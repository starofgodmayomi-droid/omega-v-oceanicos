/**
 * @oceanicos/authorization
 *
 * Constitution Layer: Group C — Security
 * Implements: Constitution §6 (Change Calculus), §8 (Worker Constitution), §9 (Human+AI Constitution)
 *
 * KEY ≠ AUTHORITY
 * SIGNATURE ≠ AUTHORIZATION
 * INTELLIGENCE ≠ AUTHORITY
 * MOOD ≠ AUTHORITY
 *
 * Default: FAIL CLOSED
 */

import type { ChangeDecision } from '@oceanicos/types';

/**
 * Authorization request for any consequential transition.
 */
export interface AuthorizationRequest {
  readonly subject: string;
  readonly intent: string;
  readonly isDestructive: boolean;
  readonly isFinancial: boolean;
  readonly isIrreversible: boolean;
  readonly hasDissentRecords: boolean;
  readonly requestedBy: string;
  readonly evidence: readonly string[];
  readonly timestamp: string;
}

/**
 * Authorization decision with provenance.
 */
export interface AuthorizationDecision {
  readonly decision: ChangeDecision;
  readonly rationale: string;
  readonly authorizedBy: string | null;
  readonly authorizedAt: string | null;
  readonly requiresHumanApproval: boolean;
  readonly evidence: readonly string[];
}

/**
 * Evaluate whether an action requires human authorization.
 * Implements §6 rules: DENY → never execute, REVIEW → never execute until authorized,
 * ALLOW → may execute only inside declared bounds.
 *
 * Default: FAIL CLOSED.
 */
export function evaluateAuthorization(request: AuthorizationRequest): AuthorizationDecision {
  const requiresHuman =
    request.isDestructive ||
    request.isFinancial ||
    request.isIrreversible ||
    request.hasDissentRecords;

  if (requiresHuman) {
    return {
      decision: 'REVIEW',
      rationale: requiresHuman
        ? `Action requires human steward authorization: destructive=${request.isDestructive}, financial=${request.isFinancial}, irreversible=${request.isIrreversible}, dissent=${request.hasDissentRecords}`
        : 'Review required',
      authorizedBy: null,
      authorizedAt: null,
      requiresHumanApproval: true,
      evidence: request.evidence,
    };
  }

  // Non-destructive, non-financial, reversible, no dissent → ALLOW
  return {
    decision: 'ALLOW',
    rationale: 'Non-consequential action within declared bounds',
    authorizedBy: 'system:auto',
    authorizedAt: new Date().toISOString(),
    requiresHumanApproval: false,
    evidence: request.evidence,
  };
}
