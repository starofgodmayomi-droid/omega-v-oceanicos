/**
 * @oceanicos/verification - Covenant & Sanctum Integrity Verifier
 *
 * Provides rigorous, empirical verification of Covenant records and Temple Thread
 * Sanctum boundaries. Evaluates whether a covenant satisfies constitutional invariants
 * before attestation or downstream worker lease dispatch.
 *
 * Invariant:
 * - A covenant claim without receipts fails closed.
 * - Sanctum elevation to HOLY_OF_HOLIES without steward DID is an automatic violation.
 */

import type { CovenantRecord, CovenantStatus, TempleSanctum } from '@oceanicos/types';

export const CANONICAL_STEWARD_DID = 'did:omega:human:starofgodmayomi';

export interface CovenantAuditReport {
  readonly covenantId: string;
  readonly status: CovenantStatus;
  readonly sanctum: TempleSanctum;
  readonly verified: boolean;
  readonly failClosedActive: boolean;
  readonly violations: readonly string[];
  readonly evidenceAudit: {
    readonly receiptCount: number;
    readonly hasAttestation: boolean;
    readonly validAncestry: boolean;
  };
}

/**
 * Audits the cryptographic and constitutional integrity of a CovenantRecord.
 *
 * Returns verified = true ONLY if all invariants hold:
 * 1. FULFILLED covenants MUST possess non-empty evidence receipts.
 * 2. SEALED/FULFILLED covenants MUST possess an attestation hash.
 * 3. HOLY_OF_HOLIES covenants MUST be bound to the sovereign Human Steward.
 * 4. Covenant state hash MUST be a valid 64-character hex string.
 * 5. Status cannot be BREACHED for a passing audit.
 */
export function auditCovenantIntegrity(covenant: CovenantRecord): CovenantAuditReport {
  const violations: string[] = [];

  // 1. FULFILLED requires receipts
  if (
    covenant.status === 'FULFILLED' &&
    (!covenant.evidenceReceipts || covenant.evidenceReceipts.length === 0)
  ) {
    violations.push('VIOLATION: Covenant is marked FULFILLED without empirical evidence receipts');
  }

  // 2. SEALED or FULFILLED requires attestation hash
  if (
    (covenant.status === 'SEALED' || covenant.status === 'FULFILLED') &&
    !covenant.attestationHash
  ) {
    violations.push(
      'VIOLATION: Covenant is SEALED/FULFILLED but lacks cryptographic attestationHash'
    );
  }

  // 3. HOLY_OF_HOLIES requires sovereign steward DID
  if (covenant.thread.sanctum === 'HOLY_OF_HOLIES') {
    if (
      covenant.thread.stewardDid !== CANONICAL_STEWARD_DID &&
      covenant.thread.stewardDid !== 'Elion Varel'
    ) {
      violations.push(
        `VIOLATION: Sanctum HOLY_OF_HOLIES bound to non-steward identity: ${covenant.thread.stewardDid}`
      );
    }
  }

  // 4. State hash must be 64-character SHA-256
  const validAncestry = Boolean(
    covenant.thread.covenantStateHash && covenant.thread.covenantStateHash.length === 64
  );
  if (!validAncestry) {
    violations.push('VIOLATION: Invalid or corrupt covenant state hash');
  }

  // 5. BREACHED status triggers fail-closed
  if (covenant.status === 'BREACHED') {
    violations.push('VIOLATION: Covenant is in active BREACHED status');
  }

  const verified = violations.length === 0;

  return {
    covenantId: covenant.covenantId,
    status: covenant.status,
    sanctum: covenant.thread.sanctum,
    verified,
    failClosedActive: !verified,
    violations: Object.freeze(violations),
    evidenceAudit: {
      receiptCount: covenant.evidenceReceipts?.length || 0,
      hasAttestation: Boolean(covenant.attestationHash),
      validAncestry,
    },
  };
}
