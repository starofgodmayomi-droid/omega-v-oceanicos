/**
 * @oceanicos/types - Biblical Engine & Covenant State Machine
 *
 * "One root. One current. Infinite forms."
 * "Pidgin fit carry the warmth; evidence go carry the claim."
 *
 * Invariants:
 * - Covenant status cannot advance to FULFILLED without verified physical or computational evidence.
 * - Temple Thread sanctum elevation (OUTER_COURT -> HOLY_OF_HOLIES) strictly requires Human Steward signature.
 * - Breach of covenant terms triggers instant fail-closed denial across all downstream workers.
 */

export type CovenantStatus =
  | 'PROMISED'   // Declared intent before sealing
  | 'SEALED'     // Cryptographically attested by Human Root
  | 'TESTED'     // Subordinated to wilderness/reality verification
  | 'FULFILLED'  // Verified fruit / observed reality match
  | 'BREACHED'   // Divergence from declared covenant bounds
  | 'RESTORED';  // Reconciled through atonement / clean delta

export type TempleSanctum =
  | 'OUTER_COURT'     // Layer 4: Execution / Ephemeral Transits (API, Web, Workers)
  | 'HOLY_PLACE'      // Layer 2/3: Bounded Contracts / Calculus / Policy
  | 'HOLY_OF_HOLIES'; // Layer 0/1: Sovereign Human Root / Covenant Ark (Elion Varel)

export interface TempleThreadTrace {
  /** Unique deterministic identifier of the thread lineage */
  readonly threadId: string;
  /** Sanctum layer where this thread operates */
  readonly sanctum: TempleSanctum;
  /** Sovereign DID of the steward */
  readonly stewardDid: string;
  /** 64-char SHA-256 ancestral link to the parent thread or genesis root */
  readonly parentThreadHash: string;
  /** Cryptographic state hash of the covenant body */
  readonly covenantStateHash: string;
  /** ISO-8601 UTC timestamp of thread observation or sealing */
  readonly timestamp: string;
}

export interface CovenantRecord {
  /** Canonical covenant identifier (e.g., cov-20261014-v1111) */
  readonly covenantId: string;
  /** Human-readable covenant title */
  readonly title: string;
  /** Current state within the Covenant State Machine */
  readonly status: CovenantStatus;
  /** Provenance lineage and sanctum boundary */
  readonly thread: TempleThreadTrace;
  /** Bound terms and constitutional invariants */
  readonly terms: readonly string[];
  /** Deterministic condition under which this covenant fails closed */
  readonly failClosedCondition: string;
  /** Cryptographic attestation hash once sealed or fulfilled */
  readonly attestationHash: string | null;
  /** Evidence hashes or citations proving the current status */
  readonly evidenceReceipts: readonly string[];
  /** Historical state transition log */
  readonly history: readonly CovenantTransitionLogEntry[];
}

export interface CovenantTransitionLogEntry {
  readonly fromStatus: CovenantStatus;
  readonly toStatus: CovenantStatus;
  readonly transitionBy: string;
  readonly reason: string;
  readonly evidenceHash: string;
  readonly timestamp: string;
}

export interface CovenantTransitionRequest {
  readonly covenantId: string;
  readonly targetStatus: CovenantStatus;
  readonly requestedBy: string;
  readonly reason: string;
  readonly evidenceReceipts: readonly string[];
  readonly stewardSignature?: string;
  readonly timestamp: string;
}

export interface CovenantTransitionResult {
  readonly success: boolean;
  readonly previousStatus: CovenantStatus;
  readonly newStatus: CovenantStatus;
  readonly rationale: string;
  readonly updatedCovenant?: CovenantRecord;
  readonly error?: string;
}
