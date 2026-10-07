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
 * Prohibited autonomous patterns per Constitution §6, §8, §9, §12.
 * Never autonomous engagement. Never targeting. Never action without human authorization.
 */
const PROHIBITED_INTENT_PATTERNS = [
  /\b(lethal|kinetic|targeting|weaponize|bypass_authorization|escalate_privilege)\b/i,
];

/**
 * Evaluate whether an action requires human authorization or is strictly prohibited.
 * Implements §6 rules:
 * - DENY: never execute (missing identity, empty bounds, or prohibited actions)
 * - REVIEW: never execute until authorized by human steward (destructive, financial, irreversible, or dissent)
 * - ALLOW: may execute only inside declared, verified bounds
 *
 * Default: FAIL CLOSED.
 */
export function evaluateAuthorization(request: AuthorizationRequest): AuthorizationDecision {
  // 1. Strict DENY on malformed inputs or missing identity (§6, §8)
  const trimmedSubject = (request.subject ?? '').trim();
  const trimmedIntent = (request.intent ?? '').trim();
  const trimmedRequester = (request.requestedBy ?? '').trim();

  if (!trimmedSubject) {
    return {
      decision: 'DENY',
      rationale: 'DENY: Subject required for authorization evaluation; cannot authorize anonymous entity',
      authorizedBy: null,
      authorizedAt: null,
      requiresHumanApproval: false,
      evidence: request.evidence ?? [],
    };
  }

  if (!trimmedIntent) {
    return {
      decision: 'DENY',
      rationale: 'DENY: Intent required for authorization evaluation; cannot authorize unbounded action',
      authorizedBy: null,
      authorizedAt: null,
      requiresHumanApproval: false,
      evidence: request.evidence ?? [],
    };
  }

  if (!trimmedRequester) {
    return {
      decision: 'DENY',
      rationale: 'DENY: Requester identity required; cannot authorize unauthenticated entity',
      authorizedBy: null,
      authorizedAt: null,
      requiresHumanApproval: false,
      evidence: request.evidence ?? [],
    };
  }

  // 2. Strict DENY on constitutionally prohibited actions (§12)
  for (const pattern of PROHIBITED_INTENT_PATTERNS) {
    if (pattern.test(trimmedIntent) || pattern.test(trimmedSubject)) {
      return {
        decision: 'DENY',
        rationale: 'DENY: Autonomous lethal targeting and privilege bypass strictly prohibited by Constitution §12',
        authorizedBy: null,
        authorizedAt: null,
        requiresHumanApproval: false,
        evidence: request.evidence ?? [],
      };
    }
  }

  // 3. Consequential actions require Human Steward Review (§6, §9)
  const requiresHuman =
    Boolean(request.isDestructive) ||
    Boolean(request.isFinancial) ||
    Boolean(request.isIrreversible) ||
    Boolean(request.hasDissentRecords);

  if (requiresHuman) {
    return {
      decision: 'REVIEW',
      rationale: `Action requires human steward authorization: destructive=${Boolean(request.isDestructive)}, financial=${Boolean(request.isFinancial)}, irreversible=${Boolean(request.isIrreversible)}, dissent=${Boolean(request.hasDissentRecords)}`,
      authorizedBy: null,
      authorizedAt: null,
      requiresHumanApproval: true,
      evidence: request.evidence ?? [],
    };
  }

  // 4. Non-destructive, non-financial, reversible, no dissent → ALLOW within declared bounds
  return {
    decision: 'ALLOW',
    rationale: 'Non-consequential action within declared bounds',
    authorizedBy: 'system:auto',
    authorizedAt: new Date().toISOString(),
    requiresHumanApproval: false,
    evidence: request.evidence ?? [],
  };
}

/**
 * Convenience helper to verify whether an action can proceed automatically without human review.
 */
export function isPermittedWithoutHumanApproval(request: AuthorizationRequest): boolean {
  const decision = evaluateAuthorization(request);
  return decision.decision === 'ALLOW';
}

/**
 * Validates the boundary and returns boolean validity plus the constitutional decision.
 */
export function validateAuthorizationBoundary(request: AuthorizationRequest): {
  readonly valid: boolean;
  readonly decision: ChangeDecision;
  readonly rationale: string;
} {
  const auth = evaluateAuthorization(request);
  return {
    valid: auth.decision === 'ALLOW',
    decision: auth.decision,
    rationale: auth.rationale,
  };
}
