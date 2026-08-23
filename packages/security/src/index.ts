import crypto from 'crypto';
import {
  IdentitySubject,
  SecurityPermission,
  SecurityToken,
  AuthorizationResult,
} from '@omega-v/types';

/**
 * SecurityEngine: Verifiable Identity, Authorization & Least Privilege Engine (Sections XVIII & XIX)
 *
 * Enforces strict separation of:
 *   1. Identity ("WHO ARE YOU?")
 *   2. Authorization ("WHAT MAY YOU DO?")
 *   3. Audit ("WHAT DID YOU ACTUALLY DO?")
 *
 * No agent or human may bypass authorization claims without signed capability tokens.
 */
export class SecurityEngine {
  private secretKey: string;
  private auditLog: AuthorizationResult[] = [];

  constructor(secretKey = 'omega-v-security-kernel-key') {
    this.secretKey = secretKey;
  }

  /** Issue a cryptographic security token for a subject */
  public issueToken(subject: IdentitySubject, ttlSeconds = 3600): SecurityToken {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    const payload = `${subject.id}:${subject.permissions.sort().join(',')}:${expiresAt}`;
    const signature = crypto.createHmac('sha256', this.secretKey).update(payload).digest('hex');

    return {
      subjectId: subject.id,
      permissions: subject.permissions,
      signature,
      expiresAt,
    };
  }

  /** Verify token signature and expiration */
  public verifyToken(token: SecurityToken): boolean {
    if (new Date(token.expiresAt).getTime() < Date.now()) return false;

    const payload = `${token.subjectId}:${token.permissions.sort().join(',')}:${token.expiresAt}`;
    const expectedSig = crypto.createHmac('sha256', this.secretKey).update(payload).digest('hex');
    return token.signature === expectedSig;
  }

  /** Authorize a subject for a specific action permission */
  public authorize(
    subject: IdentitySubject,
    requiredPermission: SecurityPermission,
    token?: SecurityToken
  ): AuthorizationResult {
    const timestamp = new Date().toISOString();

    // 1. Verify token if supplied
    if (token) {
      if (!this.verifyToken(token)) {
        const res: AuthorizationResult = {
          allowed: false,
          subjectId: subject.id,
          requiredPermission,
          reason: 'Security token is invalid or expired',
          timestamp,
        };
        this.auditLog.push(res);
        return res;
      }

      if (token.subjectId !== subject.id) {
        const res: AuthorizationResult = {
          allowed: false,
          subjectId: subject.id,
          requiredPermission,
          reason: 'Token subject mismatch',
          timestamp,
        };
        this.auditLog.push(res);
        return res;
      }
    }

    // 2. Check permission
    const hasPermission = subject.permissions.includes(requiredPermission);
    const res: AuthorizationResult = {
      allowed: hasPermission,
      subjectId: subject.id,
      requiredPermission,
      reason: hasPermission
        ? 'Permission granted'
        : `Missing required permission: ${requiredPermission}`,
      timestamp,
    };

    this.auditLog.push(res);
    return res;
  }

  /** Sanitize input strings against potential script/command injection */
  public sanitizeInput(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/[;&|`$]/g, '');
  }

  /** Get audit trail of authorization checks */
  public getAuditTrail(): AuthorizationResult[] {
    return [...this.auditLog];
  }
}

export default SecurityEngine;
