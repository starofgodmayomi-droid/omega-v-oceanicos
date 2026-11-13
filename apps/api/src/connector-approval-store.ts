import { createHash, randomUUID } from 'node:crypto';
import type { OmegaConnectorDeclaration } from '@oceanicos/mini';
import type { VerifiedOidcIdentity } from './oidc-identity.js';
import { openDatabase, type SqliteDb } from './sqlite.js';

export const CONNECTOR_APPROVER_GROUP = 'connector-approvers';
export const CONNECTOR_APPROVAL_TTL_SECONDS = 300;

export interface ConnectorApproval {
  readonly id: string;
  readonly connectorDigest: string;
  readonly createdAt: number;
  readonly expiresAt: number;
}

export function connectorDeclarationDigest(connector: OmegaConnectorDeclaration): string {
  const canonicalDeclaration = {
    id: connector.id,
    version: connector.version,
    system: connector.system,
    capability: connector.capability,
    authRef: connector.authRef,
    scope: [...connector.scope],
    mode: connector.mode,
    policyRefs: [...connector.policyRefs],
    stopCondition: connector.stopCondition,
    expectedObservation: connector.expectedObservation,
    timeoutMs: connector.timeoutMs,
    maxAttempts: connector.maxAttempts,
    rollbackSupported: connector.rollbackSupported,
  };
  return createHash('sha256').update(JSON.stringify(canonicalDeclaration)).digest('hex');
}

export function connectorPolicyDigestsFromEnvironment(env: NodeJS.ProcessEnv = process.env): string[] {
  const raw = env.OMEGA_CONNECTOR_POLICY_DIGESTS?.trim();
  if (!raw) return [];
  return validateConnectorPolicyDigests(raw.split(','));
}

export function validateConnectorPolicyDigests(digests: readonly string[]): string[] {
  const normalized = digests.map((digest) => digest.trim().toLowerCase());
  if (normalized.some((digest) => !/^[a-f0-9]{64}$/.test(digest))) {
    throw new Error('OMEGA_CONNECTOR_POLICY_DIGESTS must contain only comma-separated SHA-256 digests');
  }
  return [...new Set(normalized)];
}

export class ConnectorApprovalStore {
  private readonly db: SqliteDb;

  constructor(path: string) {
    this.db = openDatabase(path);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ConnectorApprovals (
        id TEXT PRIMARY KEY,
        issuer TEXT NOT NULL,
        subject TEXT NOT NULL,
        connector_digest TEXT NOT NULL CHECK(length(connector_digest) = 64),
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL CHECK(expires_at > created_at),
        consumed_at INTEGER,
        revoked_at INTEGER
      )
    `);
  }

  create(identity: VerifiedOidcIdentity, connectorDigest: string, now: number): ConnectorApproval {
    const approval = {
      id: randomUUID(),
      connectorDigest,
      createdAt: now,
      expiresAt: now + CONNECTOR_APPROVAL_TTL_SECONDS,
    };
    this.db.prepare(`
      INSERT INTO ConnectorApprovals (id, issuer, subject, connector_digest, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      approval.id,
      identity.issuer,
      identity.subject,
      connectorDigest,
      approval.createdAt,
      approval.expiresAt,
    );
    return approval;
  }

  consume(
    id: string,
    identity: VerifiedOidcIdentity,
    connectorDigest: string,
    now: number,
  ): boolean {
    const result = this.db.prepare(`
      UPDATE ConnectorApprovals
      SET consumed_at = ?
      WHERE id = ?
        AND issuer = ?
        AND subject = ?
        AND connector_digest = ?
        AND expires_at > ?
        AND consumed_at IS NULL
        AND revoked_at IS NULL
    `).run(now, id, identity.issuer, identity.subject, connectorDigest, now);
    return Number(result.changes) === 1;
  }

  revoke(id: string, identity: VerifiedOidcIdentity, now: number): boolean {
    const result = this.db.prepare(`
      UPDATE ConnectorApprovals
      SET revoked_at = ?
      WHERE id = ?
        AND issuer = ?
        AND subject = ?
        AND expires_at > ?
        AND consumed_at IS NULL
        AND revoked_at IS NULL
    `).run(now, id, identity.issuer, identity.subject, now);
    return Number(result.changes) === 1;
  }

  close(): void {
    this.db.close?.();
  }
}
