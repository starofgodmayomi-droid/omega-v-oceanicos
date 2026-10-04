import { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { RememberEngine } from '@oceanicos/remember';
import { DeclarativeVerificationEngine, MultiRegionMeshConvergence } from '@oceanicos/verification';

type MeshValidationQuery = {
  siliconYield?: string;
  gridLoadMegawatts?: string;
  acceleratorInventory?: string;
};

const parseBoundedNumber = (value: unknown, minimum: number, maximum: number, integer = false): number | null => {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum || (integer && !Number.isInteger(parsed))) return null;
  return parsed;
};

const declarativeVerification = new DeclarativeVerificationEngine();

/** Read-only validation boundary: evidence is returned, never persisted or promoted to truth. */
export function registerMeshValidationRoute(
  fastify: FastifyInstance,
  ledgerMemory: RememberEngine,
  requireReadAccess: (request: any, reply: any) => Promise<any> | any,
  jsonError: (reply: any, status: number, error: string, extra?: Record<string, unknown>) => any,
): void {
  fastify.get('/v1/mesh/validate', { preHandler: requireReadAccess }, async (request: any, reply) => {
    const query = (request.query ?? {}) as MeshValidationQuery;
    const siliconYield = parseBoundedNumber(query.siliconYield, 0, 1);
    const gridLoadMegawatts = parseBoundedNumber(query.gridLoadMegawatts, 0, 1_000_000);
    const acceleratorInventory = parseBoundedNumber(query.acceleratorInventory, 0, 10_000_000, true);
    if (siliconYield === null || gridLoadMegawatts === null || acceleratorInventory === null) {
      return jsonError(reply, 400, 'INVALID_MESH_TELEMETRY', {
        message: 'siliconYield [0,1], gridLoadMegawatts [0,1000000], and integer acceleratorInventory [0,10000000] are required',
      });
    }

    const telemetry = { uuid: randomUUID(), timestamp: new Date().toISOString(), siliconYield, gridLoadMegawatts, acceleratorInventory };
    const convergence = MultiRegionMeshConvergence.simulateConvergence(telemetry);
    const receipt = await declarativeVerification.evaluateObservation({
      id: telemetry.uuid,
      timestamp: telemetry.timestamp,
      subject: 'mesh-validation',
      payload: telemetry,
      confidence: 1,
      provenanceSignature: 'local://mesh-validation',
    });
    const ledgerIntact = ledgerMemory.verifyIntegrity();
    return {
      success: true,
      telemetry,
      validation: {
        ledger: { intact: ledgerIntact, scope: 'local SQLite hash-chain recomputation' },
        mesh: {
          effectiveStatus: convergence.effectiveStatus,
          quorumReached: convergence.quorumReached,
          participatingNodes: convergence.participatingNodes,
          pluralismTriggered: convergence.pluralismTriggered,
        },
        receipt,
      },
      evidenceBoundary: 'regional convergence is simulated local evidence; it is not external consensus, deployment proof, or truth attestation',
      convergence,
    };
  });
}
