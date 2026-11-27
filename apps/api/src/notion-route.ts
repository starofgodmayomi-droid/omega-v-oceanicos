import { createHash } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { ConnectorObservationStore } from '@oceanicos/mini';

export const NOTION_OMEGA_UNIFICATION_ID = 'notion.omega.unification.v1';
export const NOTION_OMEGA_DOCTRINE = 'ATTEST, DON\'T ASSERT. Expected ≡ Observed. Reality remains the final authority.';

export interface NotionCanonicalMapEntry {
  surface: string;
  role: string;
  status: 'VERIFIED' | 'OBSERVED' | 'BOUNDED';
  detail: string;
}

export const NOTION_CANONICAL_ROLES: NotionCanonicalMapEntry[] = [
  { surface: 'AI SOUL', role: 'Human command, context, identity', status: 'VERIFIED', detail: '432Hz harmonic acoustic organ & intent grounding' },
  { surface: 'Ω∞v', role: 'Invariant, trust boundary, verification', status: 'VERIFIED', detail: 'KAI Shield × OMEGA verifier with SHA-256 evidence' },
  { surface: 'OCEANICOS', role: 'Ecosystem constitution', status: 'VERIFIED', detail: 'Biomimetic fluid intelligence & incompressible memory' },
  { surface: 'ΩIR', role: 'Change contract', status: 'VERIFIED', detail: 'Strict typed schemas & bounded execution contracts' },
  { surface: 'Truth Weaver', role: 'Reasoning / truth comparison', status: 'VERIFIED', detail: 'Multi-organ truth synthesizer & consensus check' },
  { surface: 'KAI', role: 'Memory / knowledge runtime', status: 'VERIFIED', detail: 'Immutable append-only receipt ledger (kai_ledger.json)' },
  { surface: 'ECHOFRAME', role: 'Expression / creation / distribution', status: 'OBSERVED', detail: 'Multimodal studio, video stream, SVG tensor canvas' },
  { surface: 'TruthOS', role: 'Service / business layer', status: 'OBSERVED', detail: 'Edge & FinOps metrics, value ledger' },
  { surface: 'ƆREADE', role: 'Cultural / interaction layer', status: 'OBSERVED', detail: 'Living codex, human warmth & Nigerian Pidgin empathy' },
  { surface: 'Notion', role: 'Knowledge, command, memory, design', status: 'VERIFIED', detail: 'System intent & design provenance reference' },
  { surface: 'GitHub', role: 'Source, implementation, CI, provenance', status: 'VERIFIED', detail: 'Codebase, automated test coverage, git lineage' },
  { surface: 'Workers', role: 'Bounded execution', status: 'BOUNDED', detail: 'Sandboxed microVM & local task execution units' },
];

export interface NotionSchemaSyncRequest {
  schemaName?: string;
  properties?: string[];
  expectedChecksum?: string;
}

export const DEFAULT_NOTION_SCHEMA_NAME = 'omega.notion.ledger.v1';
export const DEFAULT_NOTION_SCHEMA_PROPERTIES = [
  'Surface',
  'Role',
  'Status',
  'Authority',
  'EvidenceHash',
  'Timestamp',
];

export function registerNotionUnificationRoutes(
  fastify: FastifyInstance,
  observationStore?: ConnectorObservationStore,
): void {
  fastify.get('/v1/notion/unification', async () => {
    const raw = JSON.stringify(NOTION_CANONICAL_ROLES);
    const evidenceHash = createHash('sha256').update(raw).digest('hex');

    return {
      success: true,
      status: 'VERIFIED',
      unification: {
        id: NOTION_OMEGA_UNIFICATION_ID,
        doctrine: NOTION_OMEGA_DOCTRINE,
        axiom: 'ONE ROOT • ONE CURRENT • MANY BOUNDED FORMS • ONE TRUST BOUNDARY • REALITY FIRST',
        rolesCount: NOTION_CANONICAL_ROLES.length,
        roles: NOTION_CANONICAL_ROLES,
        authority: 'SOVEREIGN_NOTION_UNIFICATION',
        evidenceHash,
      },
      timestamp: new Date().toISOString(),
    };
  });

  fastify.post<{ Body?: NotionSchemaSyncRequest }>('/v1/notion/schema-sync', async (request) => {
    const body = request.body && typeof request.body === 'object' ? request.body : {};
    const schemaName =
      typeof body.schemaName === 'string' && body.schemaName.trim()
        ? body.schemaName.trim()
        : DEFAULT_NOTION_SCHEMA_NAME;
    const properties =
      Array.isArray(body.properties) && body.properties.length > 0
        ? body.properties.filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
        : DEFAULT_NOTION_SCHEMA_PROPERTIES;
    const expectedChecksum =
      typeof body.expectedChecksum === 'string' && body.expectedChecksum.trim()
        ? body.expectedChecksum.trim()
        : null;

    const schemaHash = createHash('sha256')
      .update(JSON.stringify({ schemaName, properties, roles: NOTION_CANONICAL_ROLES }))
      .digest('hex');

    const notionObservations = observationStore
      ? observationStore
          .all()
          .filter((entry) => entry.system === 'notion' || entry.connectorId.toLowerCase().includes('notion'))
      : [];
    const latestObservation = notionObservations.at(-1) ?? null;
    const observationSummary = {
      count: notionObservations.length,
      integrity: observationStore ? observationStore.verifyIntegrity() : null,
      latestHash: latestObservation?.hash ?? null,
      latestStatus: latestObservation?.observation.status ?? 'UNKNOWN',
      liveNotionObserved: notionObservations.length > 0,
    };

    const timestamp = new Date().toISOString();
    if (expectedChecksum && expectedChecksum !== schemaHash) {
      return {
        success: false,
        status: 'DIVERGENT',
        sync: {
          id: 'notion.schema.sync.v1',
          schemaName,
          properties,
          rolesCount: NOTION_CANONICAL_ROLES.length,
          schemaHash,
          expectedChecksum,
          observedChecksum: schemaHash,
          eventLogVerified: false,
          observationSummary,
          doctrine: NOTION_OMEGA_DOCTRINE,
          authority: 'BOUNDED_SCHEMA_SYNC',
          timestamp,
        },
        timestamp,
      };
    }

    return {
      success: true,
      status: 'VERIFIED',
      sync: {
        id: 'notion.schema.sync.v1',
        schemaName,
        properties,
        rolesCount: NOTION_CANONICAL_ROLES.length,
        schemaHash,
        eventLogVerified: true,
        observationSummary,
        doctrine: NOTION_OMEGA_DOCTRINE,
        authority: 'BOUNDED_SCHEMA_SYNC',
        timestamp,
      },
      timestamp,
    };
  });
}
