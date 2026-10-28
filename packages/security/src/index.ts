import crypto from 'crypto';
import {
  IdentitySubject,
  SecurityPermission,
  SecurityToken,
  AuthorizationResult,
} from '@oceanicos/types';

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

  constructor(secretKey?: string) {
    const configuredSecret = secretKey ?? process.env.OMEGA_SECURITY_KEY;
    if (!configuredSecret || configuredSecret.length < 32) {
      throw new Error('OMEGA_SECURITY_KEY must be configured with at least 32 characters');
    }
    this.secretKey = configuredSecret;
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
    const expiresAt = new Date(token.expiresAt).getTime();
    if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

    const payload = `${token.subjectId}:${token.permissions.sort().join(',')}:${token.expiresAt}`;
    const expectedSig = crypto.createHmac('sha256', this.secretKey).update(payload).digest('hex');
    const actual = Buffer.from(token.signature, 'hex');
    const expected = Buffer.from(expectedSig, 'hex');
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  }

  /** Authorize a subject for a specific action permission */
  public authorize(
    subject: IdentitySubject,
    requiredPermission: SecurityPermission,
    token?: SecurityToken
  ): AuthorizationResult {
    const timestamp = new Date().toISOString();

    // 1. Every protected authorization decision requires a valid token.
    if (!token || !this.verifyToken(token)) {
        const res: AuthorizationResult = {
          allowed: false,
          subjectId: subject.id,
          requiredPermission,
          reason: 'Security token is required, invalid, or expired',
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
