/**
 * Shared type definitions for Ω∞v Oceanicos
 * This package defines the core data structures that flow through the verification loop
 */

/**
 * An observation is a claim about the state of the system
 * It includes metadata that makes it verifiable and traceable
 */
export interface Observation {
  /** Unique identifier for this observation */
  id: string;

  /** The claim being made */
  claim: {
    statement: string;
    category: string;
  };

  /** Information about where this observation came from */
  source: {
    system: string;
    version: string;
    environment: string;
  };

  /** When was this observed? */
  timestamp: string;
  observedBy: string;

  /** Additional data supporting the observation */
  metadata: Record<string, unknown>;

  /** How confident are we in this observation? (0-1) */
  confidence: number;
  confidenceReason: string;

  /** Status of the observation */
  status: 'normalized' | 'verified' | 'failed';
}

/**
 * A verification rule defines how to test an observation
 */
export interface VerificationRule {
  /** Unique name of this rule */
  name: string;

  /** Version for tracking rule evolution */
  version: string;

  /** Which observation categories does this apply to? */
  appliesTo: string[];

  /** The rule definition (high-level) */
  definition: string;

  /** Compiled bytecode (if applicable) */
  bytecode?: string;

  /** Human-readable description */
  description: string;

  /** When was this rule created? */
  createdAt: string;

  /** Is this rule currently active? */
  active: boolean;
}

/**
 * A single step in the evidence path showing how verification was done
 */
export interface EvidenceStep {
  /** Step number in the verification sequence */
  step: number;

  /** Which rule produced this step? */
  rule: string;

  /** The condition being tested */
  condition: string;

  /** What was the actual value? */
  value: unknown;

  /** What was expected? */
  expected?: unknown;

  /** Did this step pass? */
  passed: boolean;

  /** Human-readable explanation */
  reasoning: string;

  /** How severe is a failure? (if failed) */
  severity?: 'info' | 'warning' | 'critical';
}

/**
 * A verification result shows whether an observation is true
 * It includes the evidence path that proves or disproves the claim
 */
export interface VerificationResult {
  /** Unique identifier for this verification */
  id: string;

  /** Which observation did we verify? */
  observationId: string;

  /** When was this verification performed? */
  timestamp: string;

  /** Summary of the result */
  summary: {
    passed: boolean;
    confidence: number;
    rulesApplied: number;
    rulesPassed: number;
    rulesFailed: number;
  };

  /** Results from each rule */
  rules: Array<{
    name: string;
    passed: boolean;
    confidence: number;
    details?: string;
  }>;

  /** Complete evidence showing the reasoning */
  evidencePath: EvidenceStep[];

  /** Which rule versions were used? */
  ruleVersions: Record<string, string>;

  /** Status of this verification */
  status: 'pending' | 'completed' | 'failed';
}

/**
 * An attestation is a cryptographically signed verification result
 * It creates unforgeable proof that a verification happened at a specific time
 */
export interface Attestation {
  /** Unique identifier for this attestation */
  id: string;

  /** Which verification result is being attested? */
  verificationId: string;

  /** Which observation is being attested? */
  observationId: string;

  /** Was the verification successful? */
  verified: boolean;

  /** Confidence in the verification */
  confidence: number;

  /** The cryptographic signature */
  signature: string;

  /** Which key signed this? */
  signingKey: string;

  /** Version of the signing key */
  keyVersion: string;

  /** Algorithm used for signing */
  signingAlgorithm: string;

  /** When was this signed? */
  attestedAt: string;

  /** Which service performed the attestation? */
  attestedBy: string;

  /** Rule versions used at time of attestation */
  ruleVersions: Record<string, string>;

  /** Public key for verification */
  verifyingPublicKey?: string;

  /** Status of the attestation */
  status: 'signed' | 'revoked' | 'expired';
}

/**
 * A recorded event in the immutable event log
 * The system maintains an append-only log of all observations, verifications, and attestations
 *
 * In the MINI kernel (Observe → Verify → Remember), memory entries are
 * OBSERVATION and VERIFICATION only. ATTESTATION is an earned expansion.
 */
export interface EventLogEntry {
  /** Sequential ID in the event log */
  id: number;

  /** Type of event */
  type: 'OBSERVATION' | 'VERIFICATION' | 'ATTESTATION' | 'MEMORY';

  /** The actual data */
  data: Observation | VerificationResult | Attestation | MemoryRecord;

  /** When was this recorded? */
  recordedAt: string;

  /** Immutable hash for integrity checking */
  hash: string;

  /** Hash of the previous entry (creating a chain) */
  previousHash: string;
}

/**
 * A memory record is what the MINI kernel 🧠 stores after observe + verify.
 * It is the smallest durable unit of verified experience.
 */
export interface MemoryRecord {
  /** Unique identifier for this memory */
  id: string;

  /** Linked observation id */
  observationId: string;

  /** Linked verification id */
  verificationId: string;

  /** Did verification pass? */
  verified: boolean;

  /** Confidence carried from verification */
  confidence: number;

  /** Optional human-readable summary */
  summary?: string;

  /** When this memory was formed */
  rememberedAt: string;
}

/**
 * Result of one MINI kernel cycle: Observe → Verify → Remember
 */
export interface MiniCycleResult {
  /** Normalized observation */
  observation: Observation;

  /** Verification evidence */
  verification: VerificationResult;

  /** Durable memory of the cycle */
  memory: MemoryRecord;

  /** Append-only log entries written during this cycle */
  entries: EventLogEntry[];
}

/**
 * A query result from the event store
 * Allows temporal and categorical searches through the verification history
 */
export interface QueryResult {
  /** Events matching the query */
  events: EventLogEntry[];

  /** Total count of matching events */
  totalCount: number;

  /** Pagination information */
  pagination: {
    offset: number;
    limit: number;
    hasMore: boolean;
  };

  /** When was this query executed? */
  queriedAt: string;
}

/**
 * Configuration for the verification engine
 */
export interface VerificationConfig {
  /** Rules to apply */
  rules: VerificationRule[];

  /** Observation categories to process */
  categories: string[];

  /** Enable caching of verification results */
  enableCache: boolean;

  /** Cache TTL in milliseconds */
  cacheTtl: number;

  /** Maximum number of parallel verifications */
  maxConcurrency: number;

  /** Enable learning from verification results */
  enableLearning: boolean;
}

/**
 * Options for attestation
 */
export interface AttestationOptions {
  /** The verification result to attest */
  verificationResult: VerificationResult;

  /** Signing key to use */
  signingKey?: string;

  /** Identity of the attestor */
  attestedBy: string;

  /** Algorithm for signing */
  algorithm?: string;
}

/**
 * Learning insight extracted from verification history
 */
export interface LearningInsight {
  /** What was learned? */
  description: string;

  /** Confidence in this learning (0-1) */
  confidence: number;

  /** Which rule does this apply to? */
  affectedRule?: string;

  /** Recommended action */
  recommendation?: string;

  /** When was this learned? */
  learnedAt: string;
}

/**
 * System health and metrics
 */
export interface SystemMetrics {
  /** Total observations processed */
  totalObservations: number;

  /** Total verifications performed */
  totalVerifications: number;

  /** Average verification time (ms) */
  avgVerificationTime: number;

  /** Verification success rate (0-1) */
  successRate: number;

  /** Total attestations created */
  totalAttestations: number;

  /** Current system confidence */
  systemConfidence: number;

  /** When were these metrics last updated? */
  lastUpdated: string;
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  /** Error code for categorization */
  code: string;

  /** Human-readable error message */
  message: string;

  /** Additional context */
  details?: Record<string, unknown>;

  /** When did the error occur? */
  timestamp: string;

  /** Request ID for tracing */
  requestId?: string;
}

/**
 * Success response structure
 */
export interface SuccessResponse<T> {
  /** The returned data */
  data: T;

  /** Additional metadata */
  meta?: Record<string, unknown>;

  /** When was this created? */
  timestamp: string;
}
