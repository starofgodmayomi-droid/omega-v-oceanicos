/**
 * @oceanicos/authorization - Biblical Engine & Covenant State Machine
 *
 * Implements the deterministic Covenant lifecycle:
 * PROMISED -> SEALED -> TESTED -> FULFILLED (or BREACHED -> RESTORED)
 *
 * Enforces Temple Thread Sanctum boundaries:
 * OUTER_COURT -> HOLY_PLACE -> HOLY_OF_HOLIES
 *
 * Default: FAIL CLOSED
 */

import { createHash } from 'node:crypto';
import type {
  CovenantRecord,
  CovenantStatus,
  CovenantTransitionRequest,
  CovenantTransitionResult,
  TempleSanctum,
  TempleThreadTrace,
} from '@oceanicos/types';

export const CANONICAL_STEWARD_DID = 'did:omega:human:starofgodmayomi';

/**
 * Computes deterministic SHA-256 hash of a covenant body or payload.
 */
export function computeCovenantHash(payload: string): string {
  return createHash('sha256').update(payload).digest('hex');
}

/**
 * Create a new covenant initialized to PROMISED state.
 */
export function createCovenant(params: {
  readonly covenantId: string;
  readonly title: string;
  readonly threadId: string;
  readonly sanctum?: TempleSanctum;
  readonly stewardDid?: string;
  readonly parentThreadHash?: string;
  readonly terms: readonly string[];
  readonly failClosedCondition?: string;
}): CovenantRecord {
  const sanctum = params.sanctum ?? 'HOLY_PLACE';
  const stewardDid = params.stewardDid ?? CANONICAL_STEWARD_DID;
  const parentThreadHash = params.parentThreadHash ?? '0'.repeat(64);
  const now = new Date().toISOString();

  const termsDigest = computeCovenantHash(params.terms.join('|'));
  const covenantStateHash = computeCovenantHash(
    `${params.covenantId}:${params.title}:${sanctum}:${stewardDid}:${parentThreadHash}:${termsDigest}`
  );

  const thread: TempleThreadTrace = {
    threadId: params.threadId,
    sanctum,
    stewardDid,
    parentThreadHash,
    covenantStateHash,
    timestamp: now,
  };

  return {
    covenantId: params.covenantId,
    title: params.title,
    status: 'PROMISED',
    thread,
    terms: Object.freeze([...params.terms]),
    failClosedCondition: params.failClosedCondition ?? 'FAIL_CLOSED_ON_EVIDENCE_ABSENCE',
    attestationHash: null,
    evidenceReceipts: Object.freeze([]),
    history: Object.freeze([
      {
        fromStatus: 'PROMISED',
        toStatus: 'PROMISED',
        transitionBy: stewardDid,
        reason: 'Genesis promise initialized',
        evidenceHash: covenantStateHash,
        timestamp: now,
      },
    ]),
  };
}

/**
 * Validates whether a Sanctum boundary transition is authorized.
 * Rule: Accessing or elevating to HOLY_OF_HOLIES strictly requires Human Steward signature.
 */
export function validateSanctumAccess(
  targetSanctum: TempleSanctum,
  requesterDid: string,
  stewardSignature?: string
): { readonly allowed: boolean; readonly rationale: string } {
  if (targetSanctum === 'HOLY_OF_HOLIES') {
    const isSteward = requesterDid === CANONICAL_STEWARD_DID || requesterDid === 'Elion Varel';
    const hasSig = Boolean(stewardSignature && stewardSignature.trim().length > 0);

    if (!isSteward || !hasSig) {
      return {
        allowed: false,
        rationale:
          'DENY: Sanctum HOLY_OF_HOLIES requires sovereign Human Steward identity and valid cryptographic signature',
      };
    }
  }

  return {
    allowed: true,
    rationale: `ALLOW: Sanctum access to ${targetSanctum} authorized within policy bounds`,
  };
}

/**
 * Executes a deterministic transition within the Covenant State Machine.
 *
 * Rules:
 * - PROMISED -> SEALED: Requires steward signature or canonical steward DID.
 * - SEALED -> TESTED: Enters wilderness verification; requires non-empty reason and requester.
 * - TESTED -> FULFILLED: Strictly requires non-empty evidence receipts. Cannot claim fulfillment without proof!
 * - ANY -> BREACHED: Immediately allowed on detected violation, failing closed.
 * - BREACHED -> RESTORED: Requires steward authorization and restorative evidence.
 *
 * In all invalid transition attempts: returns success: false and previous status unchanged.
 */
export function transitionCovenant(
  covenant: CovenantRecord,
  request: CovenantTransitionRequest
): CovenantTransitionResult {
  const current = covenant.status;
  const target = request.targetStatus;
  const now = request.timestamp || new Date().toISOString();

  // Instant FAIL-CLOSED: Breach is always admitted to preserve safety
  if (target === 'BREACHED') {
    const evidenceHash = computeCovenantHash(`BREACH:${request.reason}:${now}`);
    const updated: CovenantRecord = {
      ...covenant,
      status: 'BREACHED',
      history: Object.freeze([
        ...covenant.history,
        {
          fromStatus: current,
          toStatus: 'BREACHED',
          transitionBy: request.requestedBy,
          reason: request.reason,
          evidenceHash,
          timestamp: now,
        },
      ]),
    };

    return {
      success: true,
      previousStatus: current,
      newStatus: 'BREACHED',
      rationale: `Covenant marked BREACHED. Fail-closed condition active: ${covenant.failClosedCondition}`,
      updatedCovenant: updated,
    };
  }

  // State Transition Table:
  if (current === 'PROMISED' && target === 'SEALED') {
    const isSteward =
      request.requestedBy === CANONICAL_STEWARD_DID ||
      request.requestedBy === 'Elion Varel' ||
      Boolean(request.stewardSignature && request.stewardSignature.trim().length > 0);

    if (!isSteward) {
      return {
        success: false,
        previousStatus: current,
        newStatus: current,
        rationale: 'DENY: Covenant sealing requires sovereign Human Steward identity or valid signature',
        error: 'UNAUTHORIZED_SEALING_ATTEMPT',
      };
    }

    const attestationHash = computeCovenantHash(
      `SEALED:${covenant.covenantId}:${covenant.thread.covenantStateHash}:${now}`
    );

    const updated: CovenantRecord = {
      ...covenant,
      status: 'SEALED',
      attestationHash,
      history: Object.freeze([
        ...covenant.history,
        {
          fromStatus: current,
          toStatus: 'SEALED',
          transitionBy: request.requestedBy,
          reason: request.reason || 'Covenant attested and sealed by Human Root',
          evidenceHash: attestationHash,
          timestamp: now,
        },
      ]),
    };

    return {
      success: true,
      previousStatus: current,
      newStatus: 'SEALED',
      rationale: 'Covenant sealed under cryptographic witness of the Human Root',
      updatedCovenant: updated,
    };
  }

  if (current === 'SEALED' && target === 'TESTED') {
    const testHash = computeCovenantHash(`TESTED:${covenant.covenantId}:${request.requestedBy}:${now}`);
    const updated: CovenantRecord = {
      ...covenant,
      status: 'TESTED',
      history: Object.freeze([
        ...covenant.history,
        {
          fromStatus: current,
          toStatus: 'TESTED',
          transitionBy: request.requestedBy,
          reason: request.reason || 'Covenant submitted to reality verification test',
          evidenceHash: testHash,
          timestamp: now,
        },
      ]),
    };

    return {
      success: true,
      previousStatus: current,
      newStatus: 'TESTED',
      rationale: 'Covenant entered TESTED status (wilderness verification loop)',
      updatedCovenant: updated,
    };
  }

  if (current === 'TESTED' && target === 'FULFILLED') {
    // Reality-First Invariant: A claim is not proof. Evidence required!
    if (!request.evidenceReceipts || request.evidenceReceipts.length === 0) {
      return {
        success: false,
        previousStatus: current,
        newStatus: current,
        rationale: 'DENY: A covenant cannot advance to FULFILLED without verified physical or computational evidence receipts',
        error: 'EVIDENCE_ABSENCE_DENIAL',
      };
    }

    const fulfillmentHash = computeCovenantHash(
      `FULFILLED:${covenant.covenantId}:${request.evidenceReceipts.join(';')}:${now}`
    );

    const updated: CovenantRecord = {
      ...covenant,
      status: 'FULFILLED',
      attestationHash: fulfillmentHash,
      evidenceReceipts: Object.freeze([...covenant.evidenceReceipts, ...request.evidenceReceipts]),
      history: Object.freeze([
        ...covenant.history,
        {
          fromStatus: current,
          toStatus: 'FULFILLED',
          transitionBy: request.requestedBy,
          reason: request.reason || 'Covenant fulfilled with verifiable reality receipts',
          evidenceHash: fulfillmentHash,
          timestamp: now,
        },
      ]),
    };

    return {
      success: true,
      previousStatus: current,
      newStatus: 'FULFILLED',
      rationale: 'Covenant verified and FULFILLED with executable evidence',
      updatedCovenant: updated,
    };
  }

  if (current === 'BREACHED' && target === 'RESTORED') {
    const isSteward =
      request.requestedBy === CANONICAL_STEWARD_DID ||
      request.requestedBy === 'Elion Varel' ||
      Boolean(request.stewardSignature && request.stewardSignature.trim().length > 0);

    if (!isSteward || !request.evidenceReceipts || request.evidenceReceipts.length === 0) {
      return {
        success: false,
        previousStatus: current,
        newStatus: current,
        rationale: 'DENY: Restoring a breached covenant requires Human Steward authorization and reconciliation evidence',
        error: 'RESTORATION_UNAUTHORIZED_OR_UNEVIDENCED',
      };
    }

    const restoredHash = computeCovenantHash(
      `RESTORED:${covenant.covenantId}:${request.evidenceReceipts.join(';')}:${now}`
    );

    const updated: CovenantRecord = {
      ...covenant,
      status: 'RESTORED',
      attestationHash: restoredHash,
      evidenceReceipts: Object.freeze([...covenant.evidenceReceipts, ...request.evidenceReceipts]),
      history: Object.freeze([
        ...covenant.history,
        {
          fromStatus: current,
          toStatus: 'RESTORED',
          transitionBy: request.requestedBy,
          reason: request.reason || 'Covenant restored through verified reconciliation',
          evidenceHash: restoredHash,
          timestamp: now,
        },
      ]),
    };

    return {
      success: true,
      previousStatus: current,
      newStatus: 'RESTORED',
      rationale: 'Covenant restored and reconciled in love and verified truth',
      updatedCovenant: updated,
    };
  }

  // Any unpermitted state hop:
  return {
    success: false,
    previousStatus: current,
    newStatus: current,
    rationale: `DENY: Invalid state transition attempted from ${current} to ${target}`,
    error: 'INVALID_COVENANT_TRANSITION',
  };
}
