/**
 * Ω∞v Ecosystem Status Adapter Contract — read-only, evidence-bearing.
 *
 * Exposes the system's capability layers with explicit evidence statuses
 * (VERIFIED | SUPPORTED | UNVERIFIED | DIVERGENT | UNKNOWN) so external
 * consumers can distinguish what is observed from what is merely designed.
 *
 * This contract does not execute mutations, claim deployment, or convert
 * architecture labels into verified status. Reality is final authority.
 */
import type { FastifyInstance } from 'fastify';
import { ECOSYSTEM_BODY_EVIDENCE_BOUNDARY } from './ecosystem-evidence-boundary.js';

export type EvidenceStatus = 'VERIFIED' | 'SUPPORTED' | 'UNVERIFIED' | 'DIVERGENT' | 'UNKNOWN';

export interface EcosystemLayer {
  layer: string;
  capabilities: string[];
  evidenceStatus: EvidenceStatus;
  source: string;
  scope: string;
  policy: string;
  provenance: string;
}

export interface OneBodyStatus {
  name: 'Ω∞v Oceanicos';
  invariant: 'VERIFY(ΔREALITY)';
  stage: 'FULL STACK → ECOSYSTEM';
  evidenceStatus: 'SUPPORTED';
  evidence: 'runtime-observed';
  scope: 'local-runtime';
  evidenceBoundary: typeof ECOSYSTEM_BODY_EVIDENCE_BOUNDARY;
  organs: Array<{
    name: string;
    status: EvidenceStatus;
    source: string;
  }>;
  limitations: string[];
}

export interface EcosystemStatus {
  success: true;
  contract: {
    name: string;
    version: string;
    schemaVersion: string;
    growthLaw: string;
    currentStage: string;
    invariant: string;
    evaluatedAt: string;
  };
  layers: EcosystemLayer[];
  valueAssessment: {
    formula: string;
    verifiedBenefit: string;
    humanAgency: string;
    status: EvidenceStatus;
  };
  governance: {
    authMode: string;
    humanAuthorizationRequired: boolean;
    boundedSecurity: string;
    failClosed: boolean;
    status: EvidenceStatus;
  };
  oneBody: OneBodyStatus;
}

export function registerEcosystemRoute(
  fastify: FastifyInstance,
  authMode: string,
  attesterReady: boolean,
): void {
  fastify.get('/v1/ecosystem/status', async () => {
    const now = new Date().toISOString();

    const layers: EcosystemLayer[] = [
      {
        layer: 'Reality Observation',
        capabilities: ['observe', 'evidence', 'telemetry'],
        evidenceStatus: 'SUPPORTED',
        source: 'MINI kernel, observer engine, integration tests',
        scope: 'local-runtime',
        policy: 'read-only inspection',
        provenance: '@oceanicos/observer + integration tests',
      },
      {
        layer: 'Verification & Dissent',
        capabilities: ['verify', 'reconcile', 'dissent'],
        evidenceStatus: 'SUPPORTED',
        source: 'verification engine, hash-chained evidence, mesh convergence',
        scope: 'local-runtime',
        policy: 'fail-closed validation; preserve dissent',
        provenance: '@oceanicos/verification',
      },
      {
        layer: 'Memory & Provenance',
        capabilities: ['remember', 'lineage', 'provenance'],
        evidenceStatus: 'SUPPORTED',
        source: 'remember engine, SQLite ledger, SHA-256 hash chain',
        scope: 'local-runtime',
        policy: 'append-only; memory ≠ proof',
        provenance: '@oceanicos/remember',
      },
      {
        layer: 'Attestation',
        capabilities: ['attest', 'revoke', 'verify-signature'],
        evidenceStatus: attesterReady ? 'SUPPORTED' : 'UNVERIFIED',
        source: attesterReady
          ? 'attestation service, HMAC-SHA256 / Ed25519'
          : 'signing key not configured',
        scope: 'local-runtime',
        policy: 'signature ≠ authorization; attestation ≠ authorization',
        provenance: '@oceanicos/attestation',
      },
      {
        layer: 'API & Web Interface',
        capabilities: ['api', 'web', 'cli', 'sdk'],
        evidenceStatus: 'SUPPORTED',
        source: 'Fastify API, Vite dashboard, CLI binary, SDK package',
        scope: 'local-runtime',
        policy: `auth-mode=${authMode}`,
        provenance: 'apps/api, apps/web, packages/cli, packages/sdk',
      },
      {
        layer: 'Bounded Worker Execution',
        capabilities: ['propose', 'admit', 'execute', 'observe', 'reconcile'],
        evidenceStatus: 'SUPPORTED',
        source: 'omega command store, pipeline route, job ledger',
        scope: 'local-runtime',
        policy: 'ALLOW | DENY | REVIEW; human gate required',
        provenance: 'omega.ts, pipeline-route.ts, jobs.ts',
      },
      {
        layer: 'Governance & Trust',
        capabilities: ['governance', 'authority', 'policy', 'charter'],
        evidenceStatus: 'SUPPORTED',
        source: 'charter, manifest, kernel capability boundary',
        scope: 'design-contract',
        policy: 'human authority required for consequential action',
        provenance: 'CHARTER.md, MANIFEST.md, @omega-v/kernel',
      },
      {
        layer: 'External Connectors',
        capabilities: ['admit', 'observe', 'remember'],
        evidenceStatus: 'SUPPORTED',
        source: 'admitOmegaConnector, POST /v1/omega/connectors/observe, local hash-chained journal',
        scope: 'local-runtime',
        policy: 'admission is not execution; live GitHub/Notion remain UNKNOWN until separately observed',
        provenance: '@oceanicos/mini connector observation journal',
      },
      {
        layer: 'Distribution & Deployment',
        capabilities: ['deploy', 'edge', 'cloud', 'vaas'],
        evidenceStatus: 'UNKNOWN',
        source: 'no deployment target observed',
        scope: 'not-executed',
        policy: 'deployment requires separate bounded authority',
        provenance: 'none observed',
      },
      {
        layer: 'Community & Economy',
        capabilities: ['community', 'stewardship', 'value-loops'],
        evidenceStatus: 'UNKNOWN',
        source: 'governance intent documented; no market or community evidence',
        scope: 'design-intent',
        policy: 'value = verified benefit + human agency − harm',
        provenance: 'CHARTER.md, ECOSYSTEM-COMPRESSION.md',
      },
    ];

    const status: EcosystemStatus = {
      success: true,
      contract: {
        name: 'omega-v-oceanicos',
        version: '1.0.0',
        schemaVersion: '1',
        growthLaw: '0 → MINI → + → + → FULL STACK → ECOSYSTEM → REALITY ↺ ∞',
        currentStage: 'ECOSYSTEM',
        invariant: 'VERIFY(ΔREALITY)',
        evaluatedAt: now,
      },
      layers,
      valueAssessment: {
        formula:
          'REAL_BENEFIT + HUMAN_AGENCY + DIGNITY + KNOWLEDGE + CAPABILITY + RECOVERY + TRUST − UNCONTROLLED_HARM − FALSE_CLAIMS − UNAUTHORIZED_POWER − IRREVERSIBLE_RISK',
        verifiedBenefit: 'local verification loop, evidence chain, bounded execution, attestation',
        humanAgency: 'human gate required for all consequential action; AI is bounded capability only',
        status: 'SUPPORTED',
      },
      governance: {
        authMode,
        humanAuthorizationRequired: true,
        boundedSecurity:
          'IDENTITY + CAPABILITY + SCOPE + AUTHORITY + POLICY + EXPIRATION + RATE_LIMIT + RESOURCE_LIMIT + DATA_LIMIT + STOP_CONDITION + AUDIT + REVOCATION + RECOVERY',
        failClosed: true,
        status: 'SUPPORTED',
      },
      oneBody: {
        name: 'Ω∞v Oceanicos',
        invariant: 'VERIFY(ΔREALITY)',
        stage: 'FULL STACK → ECOSYSTEM',
        evidenceStatus: 'SUPPORTED',
        evidence: 'runtime-observed',
        scope: 'local-runtime',
        evidenceBoundary: ECOSYSTEM_BODY_EVIDENCE_BOUNDARY,
        organs: layers.map((layer) => ({
          name: layer.layer,
          status: layer.evidenceStatus,
          source: layer.provenance,
        })),
        limitations: [
          'does not prove deployment or external service availability',
          'does not prove community, economy, or real-world outcomes',
          'does not grant authority to execute consequential actions',
          'connector journal is local provenance, not live GitHub or Notion connectivity',
        ],
      },
    };

    return status;
  });
}
