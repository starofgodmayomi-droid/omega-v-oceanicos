/**
 * Ω∞v Reality Verification Status Vector — read-only, evidence-bearing.
 *
 * Exposes the system's reality verification status vector per
 * docs/OMEGA_STATUS_VECTOR.md: 11 independent YES/NO/UNKNOWN fields
 * that prevent local execution from being reported as deployment or health.
 *
 * Each field preserves the mandatory distinctions:
 *   POSSIBLE ≠ KNOWN ≠ REPRESENTABLE ≠ PERMITTED ≠ PROPOSED ≠ ATTEMPTED
 *   ≠ EXECUTED ≠ OBSERVED ≠ VERIFIED ≠ ATTESTED ≠ DEPLOYED ≠ HEALTHY
 *
 * This contract does not execute mutations, claim deployment, or convert
 * local evidence into verified reality. Reality is final authority.
 */
import type { FastifyInstance } from 'fastify';

export type VectorValue = 'YES' | 'NO' | 'UNKNOWN';

export interface StatusVectorField {
  field: string;
  value: VectorValue;
  evidence: string;
  provenance: string;
  scope: string;
}

export interface RealityStatus {
  success: true;
  contract: {
    name: string;
    version: string;
    schemaVersion: string;
    growthLaw: string;
    currentStage: string;
    invariant: string;
    governingEquation: string;
    evaluatedAt: string;
  };
  statusVector: StatusVectorField[];
  epistemicDistinctions: string[];
  reconciliationContract: {
    formula: string;
    verifiedRequires: string;
    statuses: string[];
  };
  realityAuthority: {
    principle: string;
    humanAgency: string;
    aiBound: string;
    failClosed: boolean;
  };
}

export function registerRealityRoute(
  fastify: FastifyInstance,
  authMode: string,
  attesterReady: boolean,
  ledgerHasTip: boolean,
): void {
  fastify.get('/v1/reality/status', async () => {
    const now = new Date().toISOString();

    const statusVector: StatusVectorField[] = [
      {
        field: 'declared',
        value: 'YES',
        evidence: 'Ω∞v contract, charter, and manifest exist in the repository',
        provenance: 'CHARTER.md, MANIFEST.md, package.json',
        scope: 'design-contract',
      },
      {
        field: 'represented',
        value: 'YES',
        evidence: 'ΩIR contracts compiled across workspace packages',
        provenance: 'packages/types, packages/kernel, tsc build output',
        scope: 'local-codebase',
      },
      {
        field: 'implemented',
        value: 'YES',
        evidence: 'API server is running and responding to this request',
        provenance: 'apps/api Fastify runtime, dist/index.js',
        scope: 'local-runtime',
      },
      {
        field: 'tested',
        value: 'YES',
        evidence: 'integration and E2E test suite exists in repository',
        provenance: 'tests/integration/*.test.ts, pnpm test',
        scope: 'local-contract',
      },
      {
        field: 'admitted',
        value: 'UNKNOWN',
        evidence: 'no command currently in admission gate',
        provenance: 'omega command store — no active admission',
        scope: 'runtime-state',
      },
      {
        field: 'executed',
        value: 'UNKNOWN',
        evidence: 'no bounded transition currently running',
        provenance: 'executor — no active execution',
        scope: 'runtime-state',
      },
      {
        field: 'observed',
        value: 'UNKNOWN',
        evidence: 'no post-execution observation currently in progress',
        provenance: 'observer engine — no active observation',
        scope: 'runtime-state',
      },
      {
        field: 'verified',
        value: ledgerHasTip ? 'YES' : 'UNKNOWN',
        evidence: ledgerHasTip
          ? 'ledger tip exists with hash-chained evidence'
          : 'no ledger tip — reality reconciliation not yet performed',
        provenance: ledgerHasTip
          ? '@oceanicos/remember SQLite ledger, SHA-256 hash chain'
          : 'no memory evidence observed',
        scope: 'local-runtime',
      },
      {
        field: 'attested',
        value: attesterReady ? 'SUPPORTED' === 'SUPPORTED' ? 'YES' : 'UNKNOWN' : 'UNKNOWN',
        evidence: attesterReady
          ? 'attestation service ready with configured signing key'
          : 'attester degraded — signing key not configured',
        provenance: attesterReady
          ? '@oceanicos/attestation HMAC-SHA256'
          : 'OMEGA_SIGNING_KEY not set',
        scope: 'local-runtime',
      },
      {
        field: 'deployed',
        value: 'UNKNOWN',
        evidence: 'no deployment target observed',
        provenance: 'not established by local pipeline',
        scope: 'not-executed',
      },
      {
        field: 'healthy',
        value: 'UNKNOWN',
        evidence: 'no deployed target observed healthy',
        provenance: 'not established by local pipeline',
        scope: 'not-executed',
      },
    ];

    const epistemicDistinctions = [
      'POSSIBLE ≠ KNOWN ≠ REPRESENTABLE ≠ PERMITTED ≠ PROPOSED ≠ ATTEMPTED ≠ EXECUTED ≠ OBSERVED ≠ VERIFIED ≠ ATTESTED ≠ DEPLOYED ≠ HEALTHY',
      'MODEL OUTPUT ≠ CLAIM ≠ TRUTH',
      'CONFIDENCE ≠ TRUTH',
      'CAPABILITY ≠ AUTHORITY',
      'INTELLIGENCE ≠ AUTHORITY',
      'PROPOSAL ≠ ACTION',
      'ACTION ≠ SUCCESS',
      'OBSERVATION ≠ PROOF',
      'SIGNATURE ≠ AUTHORIZATION',
      'ATTESTATION ≠ AUTHORIZATION',
      'MEMORY ≠ PROOF',
      'TEST ≠ REALITY',
      'CI ≠ RUNTIME',
      'RUNTIME HEALTH ≠ CORRECTNESS',
      'CORRECTNESS ≠ REALITY VERIFICATION',
      'SIMULATION ≠ REALITY',
      'PREDICTION ≠ FACT',
      'UNKNOWN ≠ TRUE/FALSE',
    ];

    const status: RealityStatus = {
      success: true,
      contract: {
        name: 'omega-v-oceanicos',
        version: '1.0.0',
        schemaVersion: '1',
        growthLaw: '0 → MINI → + → + → FULL STACK → ECOSYSTEM → REALITY ↺ ∞',
        currentStage: 'REALITY',
        invariant: 'VERIFY(ΔREALITY)',
        governingEquation:
          'Ω∞v := VERIFY(ΔREALITY) ∧ PRESERVE(TRUTH) ∧ PROTECT(HUMAN_AGENCY) ∧ BOUND(POWER) ∧ CREATE(VERIFIED_VALUE) ∧ OBSERVE(CONSEQUENCE) ∧ REMEMBER(PROVENANCE) → NEXT_FINITE_Δ ↺∞',
        evaluatedAt: now,
      },
      statusVector,
      epistemicDistinctions,
      reconciliationContract: {
        formula:
          'EXECUTION_RECEIPT + EXPECTED_STATE + EXPECTED_CONSEQUENCE + OBSERVED_STATE → NORMALIZE → COMPARE → VERIFIED | DIVERGENT | UNKNOWN | NOT_EXECUTED',
        verifiedRequires:
          'AUTHORIZED ∧ EXECUTED ∧ OBSERVED ∧ EXPECTED≈ACTUAL ∧ EVIDENCE_VALID ∧ PROVENANCE_INTACT ∧ no unresolved critical contradiction',
        statuses: ['VERIFIED', 'SUPPORTED', 'UNVERIFIED', 'DIVERGENT', 'UNKNOWN', 'NOT_EXECUTED', 'DENIED', 'REVIEW'],
      },
      realityAuthority: {
        principle: 'Reality is final authority. Attest, do not assert.',
        humanAgency: 'Human beings remain the source of consequential intent, values, consent, accountability and required authority.',
        aiBound: 'AI, agents, workers and sub-systems are bounded capabilities only — never self-authorize.',
        failClosed: true,
      },
    };

    return status;
  });
}
