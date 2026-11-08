/**
 * ΩVØØS Entity route — read-only compress / expand of the entity architecture.
 *
 * The five regions of the supplied image are projected onto this runtime's own
 * observations (verification receipt, ledger integrity, kernel authority, mesh
 * convergence, persistence mode). Nothing is invented: a record's evidence is
 * `VERIFIED` only when this process observed the matching condition. The
 * summary's `status` describes the local round trip, not deployment or a
 * real-world outcome, and the upgrade candidate is always `NOT_EXECUTED`.
 */
import type { FastifyInstance } from 'fastify';
import {
  compressOvoosEntity,
  expandOvoosEntity,
  summarizeOvoosEntity,
  summarizeOvoosManifest,
  verifyOvoosRoundTrip,
} from '@oceanicos/mini';
import type { OvoosRegionRecord } from '@oceanicos/mini';

export interface OvoosEntityObservation {
  verificationStatus: string;
  ledgerIntact: boolean;
  quorumReached: boolean;
  meshStatus: string;
  humanGateRequired: boolean;
  persistenceMode: 'file' | 'memory';
  remoteMutation: boolean;
  arbitraryShellExecution: boolean;
}

type ReadAccessHandler = (request: any, reply: any) => Promise<void>;

export interface OvoosEntityRouteDeps {
  requireReadAccess: ReadAccessHandler;
  observe: () => Promise<OvoosEntityObservation>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function buildOvoosEntityRecords(observation: OvoosEntityObservation): OvoosRegionRecord[] {
  const verificationVerified = observation.verificationStatus === 'VERIFIED';
  const shieldBounded = !observation.remoteMutation && !observation.arbitraryShellExecution;

  return [
    {
      id: 'voos-orchestrator',
      name: 'VØØS orchestrator',
      region: 'center',
      role: 'one runtime commands the star; the center holds no cloud dependency',
      source: 'api-runtime',
      status: 'READY',
      evidence: 'SUPPORTED',
    },
    {
      id: 'expected-observed',
      name: 'Expected ≡ Observed',
      region: 'center',
      role: 'verification inside the center: a receipt, not an assertion',
      source: 'declarative-verification',
      status: observation.verificationStatus,
      evidence: verificationVerified ? 'VERIFIED' : 'UNVERIFIED',
    },
    {
      id: 'sha256-evidence',
      name: 'SHA-256 evidence digest',
      region: 'gate',
      role: 'every packet entering or leaving carries a digest the rings recheck',
      source: 'sha256-evidence-digest',
      status: verificationVerified ? 'ADMITTED' : 'HELD',
      evidence: verificationVerified ? 'VERIFIED' : 'UNVERIFIED',
    },
    {
      id: 'append-only-ledger',
      name: 'Append-only ledger',
      region: 'gate',
      role: 'remember only what verified; a broken chain is rejected, never rewritten',
      source: 'remember-engine',
      status: observation.ledgerIntact ? 'INTEGRITY_VERIFIED' : 'DIVERGENT',
      evidence: observation.ledgerIntact ? 'VERIFIED' : 'UNVERIFIED',
    },
    {
      id: 'kai-shield',
      name: 'KAI Shield',
      region: 'threads',
      role: 'a diverging intent is cut at the thread before it can bite',
      source: 'invisible-computer.intent-scan',
      status: shieldBounded ? 'BOUNDED' : 'UNBOUNDED',
      evidence: shieldBounded ? 'SUPPORTED' : 'UNVERIFIED',
    },
    {
      id: 'authority-gate',
      name: 'Human authority gate',
      region: 'threads',
      role: 'capability is not authority; a thread may observe without executing',
      source: 'kernel-governance',
      status: observation.humanGateRequired ? 'HUMAN_GATE_REQUIRED' : 'BOUNDED',
      evidence: 'SUPPORTED',
    },
    {
      id: 'mesh-convergence',
      name: 'Multi-region convergence',
      region: 'threads',
      role: 'every external call is a tethered observation, never a silent mutation',
      source: 'mesh-convergence',
      status: observation.meshStatus,
      evidence: observation.quorumReached ? 'VERIFIED' : 'UNVERIFIED',
    },
    {
      id: 'public-interface',
      name: 'Public interface',
      region: 'glober',
      role: 'users, APIs, streams and markets attach at the rim, observed not trusted',
      source: 'api-web-cli-sdk',
      status: 'READY',
      evidence: 'SUPPORTED',
    },
    {
      id: 'sovereign-store',
      name: 'Sovereign store',
      region: 'void',
      role: 'VØ: the runtime and its SQLite files live on this machine, no cloud required',
      source: 'omega-persistence',
      status: observation.persistenceMode === 'file' ? 'FILE_BACKED' : 'IN_MEMORY',
      evidence: observation.persistenceMode === 'file' ? 'SUPPORTED' : 'UNVERIFIED',
    },
  ];
}

export function registerOvoosEntityRoute(fastify: FastifyInstance, deps: OvoosEntityRouteDeps): void {
  fastify.get('/v1/entity/ovoos', async () => {
    const evaluatedAt = new Date().toISOString();
    const observation = await deps.observe();
    const records = buildOvoosEntityRecords(observation);
    const compression = compressOvoosEntity(records);
    const compressed = compression.status === 'COMPRESSED' ? compression.entity : null;
    const expansion = compressed ? expandOvoosEntity(compressed) : null;
    const roundTrip = verifyOvoosRoundTrip(records);
    const summary = summarizeOvoosEntity({ compression: compressed, expansion });
    const tethers = summary.regions
      .filter((region) => region.region === 'threads' || region.region === 'glober')
      .flatMap((region) => region.records.map((record) => ({
        id: record.id,
        evidence: record.evidence,
        status: record.status,
      })));
    const manifest = summarizeOvoosManifest({
      verificationStatus: observation.verificationStatus,
      ledgerIntact: observation.ledgerIntact,
      quorumReached: observation.quorumReached,
      meshStatus: observation.meshStatus,
      remoteMutation: observation.remoteMutation,
      evidenceHash: summary.evidenceHash,
      tethers,
    });

    return {
      success: compression.status === 'COMPRESSED',
      evaluatedAt,
      ...summary,
      manifest,
      observation,
      compression: compressed ?? { status: 'INVALID', issues: compression.issues },
      expansion: expansion
        ? {
            status: expansion.status,
            records: expansion.status === 'INVALID' ? [] : expansion.records,
            digest: expansion.digest,
            digestMatches: expansion.digestMatches,
            evidence: expansion.evidence,
            issues: expansion.issues,
          }
        : null,
      roundTrip,
      ledgerMutation: false,
    };
  });

  fastify.post('/v1/entity/ovoos/expand', { preHandler: deps.requireReadAccess }, async (request: any, reply) => {
    const body = isRecord(request.body) ? request.body : {};
    const expanded = expandOvoosEntity(body.compression ?? body);
    if (expanded.status !== 'EXPANDED') {
      return reply.status(400).send({
        success: false,
        status: expanded.status,
        records: expanded.records,
        issues: expanded.issues,
        evidence: expanded.evidence,
      });
    }
    return {
      success: true,
      status: 'EXPANDED',
      records: expanded.records,
      digest: expanded.digest,
      digestMatches: expanded.digestMatches,
      evidence: expanded.evidence,
    };
  });
}
