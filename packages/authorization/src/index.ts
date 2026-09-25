import { createHash } from 'node:crypto';

/**
 * Ω∞v Authorization Engine
 *
 * The authority/permission model that produces the `authorityVerified` and
 * `policySatisfied` evidence consumed by the C4 admission gate.
 *
 * Constitutional invariants:
 *   - FAIL CLOSED: no matching grant → DENY. Always.
 *   - Capability ≠ Authority: having a capability does not mean you can
 *     self-authorize. Authority must be explicitly granted.
 *   - Signature ≠ Authorization: a signed request is evidence, not permission.
 *   - Grants expire, are revocable, and are scoped.
 *   - The engine never grants authority to itself.
 */

export type AuthorizationScope = string;

export interface AuthorityGrant {
  readonly id: string;
  /** Who holds this authority (DID, role, or human identifier). */
  readonly subject: string;
  /** What this grant covers (e.g. 'oceanicos:*', 'worker:test'). */
  readonly scope: AuthorizationScope;
  /** Policy references this grant operates under. */
  readonly policyRefs: readonly string[];
  /** Who granted this authority (must differ from subject — no self-grant). */
  readonly grantedBy: string;
  readonly grantedAt: string;
  /** Optional expiry timestamp; absent means no expiry. */
  readonly expiresAt?: string;
  revoked: boolean;
  revokedBy?: string;
  revokedAt?: string;
}

export interface AuthorizationRequest {
  readonly changeId: string;
  /** Who is requesting authorization. */
  readonly subject: string;
  /** What scope they want to authorize. */
  readonly scope: AuthorizationScope;
  /** Policy references that must be satisfied. */
  readonly policyRefs: readonly string[];
  /** Evidence supporting the request (e.g. attestation ids, observation refs). */
  readonly evidence: readonly string[];
}

export interface AuthorizationResult {
  readonly authorized: boolean;
  readonly authorityVerified: boolean;
  readonly policySatisfied: boolean;
  readonly reason: string;
  readonly grantId?: string;
  readonly evaluatedAt: string;
}

const sha256 = (payload: string): string => createHash('sha256').update(payload).digest('hex');

const isExpired = (grant: AuthorityGrant, now: string): boolean => {
  if (!grant.expiresAt) return false;
  return now >= grant.expiresAt;
};

const scopeMatches = (grantScope: AuthorizationScope, requestScope: AuthorizationScope): boolean => {
  if (grantScope === requestScope) return true;
  // Wildcard: 'oceanicos:*' matches 'oceanicos:worker:test'
  if (grantScope.endsWith(':*')) {
    const prefix = grantScope.slice(0, -1); // 'oceanicos:'
    return requestScope.startsWith(prefix);
  }
  return false;
};

const policiesSatisfied = (grantPolicies: readonly string[], requiredPolicies: readonly string[]): boolean => {
  if (requiredPolicies.length === 0) return true;
  const grantSet = new Set(grantPolicies);
  return requiredPolicies.every((policy) => grantSet.has(policy));
};

/**
 * Fail-closed authorization engine.
 *
 * Grants are explicitly created via `grant()`. A request is authorized only
 * if a non-expired, non-revoked grant exists whose subject matches the
 * requester, whose scope covers the request, and whose policies satisfy all
 * required policy references. Otherwise the result is DENY.
 */
export class AuthorizationEngine {
  private readonly grants: Map<string, AuthorityGrant> = new Map();

  /**
   * Grant authority to a subject. The grantor must differ from the subject —
   * no self-authorization.
   */
  grant(input: {
    readonly subject: string;
    readonly scope: AuthorizationScope;
    readonly policyRefs?: readonly string[];
    readonly grantedBy: string;
    readonly expiresAt?: string;
    readonly now?: () => string;
  }): AuthorityGrant {
    if (!input.subject.trim()) throw new Error('subject must be non-empty');
    if (!input.scope.trim()) throw new Error('scope must be non-empty');
    if (!input.grantedBy.trim()) throw new Error('grantedBy must be non-empty');
    if (input.subject === input.grantedBy) {
      throw new Error('self-authorization is forbidden: grantedBy must differ from subject');
    }

    const now = input.now ?? (() => new Date().toISOString());
    const grantedAt = now();
    const id = `grant-${sha256(`${input.subject}:${input.scope}:${grantedAt}`).slice(0, 24)}`;

    const grant: AuthorityGrant = {
      id,
      subject: input.subject,
      scope: input.scope,
      policyRefs: input.policyRefs ?? [],
      grantedBy: input.grantedBy,
      grantedAt,
      expiresAt: input.expiresAt,
      revoked: false,
    };

    this.grants.set(id, grant);
    return grant;
  }

  /**
   * Revoke a grant. Revocation is immediate and irreversible.
   */
  revoke(grantId: string, revokedBy: string, now: () => string = () => new Date().toISOString()): void {
    const grant = this.grants.get(grantId);
    if (!grant) throw new Error(`grant '${grantId}' not found`);
    if (grant.revoked) throw new Error(`grant '${grantId}' is already revoked`);
    grant.revoked = true;
    grant.revokedBy = revokedBy;
    grant.revokedAt = now();
  }

  /**
   * Evaluate an authorization request. Fail-closed: no matching grant → DENY.
   */
  evaluate(request: AuthorizationRequest, now: () => string = () => new Date().toISOString()): AuthorizationResult {
    const evaluatedAt = now();

    if (!request.subject.trim()) {
      return { authorized: false, authorityVerified: false, policySatisfied: false, reason: 'subject is empty', evaluatedAt };
    }

    if (request.evidence.length === 0) {
      return { authorized: false, authorityVerified: false, policySatisfied: false, reason: 'no evidence supplied', evaluatedAt };
    }

    // Find a matching, non-expired, non-revoked grant.
    let matchingGrant: AuthorityGrant | undefined;
    let policyOk = false;

    for (const grant of this.grants.values()) {
      if (grant.revoked) continue;
      if (grant.subject !== request.subject) continue;
      if (isExpired(grant, evaluatedAt)) continue;
      if (!scopeMatches(grant.scope, request.scope)) continue;

      const policiesOk = policiesSatisfied(grant.policyRefs, request.policyRefs);
      if (policiesOk) {
        matchingGrant = grant;
        policyOk = true;
        break;
      }
    }

    if (!matchingGrant) {
      // Check if any grant matched scope but not policy, for a more precise reason.
      const scopeMatch = [...this.grants.values()].find(
        (g) => !g.revoked && g.subject === request.subject && !isExpired(g, evaluatedAt) && scopeMatches(g.scope, request.scope),
      );
      if (scopeMatch) {
        return {
          authorized: false,
          authorityVerified: true,
          policySatisfied: false,
          reason: 'authority exists but required policies are not satisfied by any grant',
          evaluatedAt,
        };
      }
      return {
        authorized: false,
        authorityVerified: false,
        policySatisfied: false,
        reason: 'no non-expired, non-revoked grant matches subject and scope',
        evaluatedAt,
      };
    }

    return {
      authorized: true,
      authorityVerified: true,
      policySatisfied: policyOk,
      reason: 'authorized by explicit non-revoked grant',
      grantId: matchingGrant.id,
      evaluatedAt,
    };
  }

  getGrant(grantId: string): AuthorityGrant | undefined {
    return this.grants.get(grantId);
  }

  getAllGrants(): readonly AuthorityGrant[] {
    return [...this.grants.values()];
  }

  get activeGrantCount(): number {
    return [...this.grants.values()].filter((g) => !g.revoked).length;
  }
}
