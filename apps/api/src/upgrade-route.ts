/**
 * Ω∞v V1111 Singularity Self-Upgrade Route.
 *
 * Exposes the cryptographic WholeEcosystemUpgradeCore and OceanicosKernel
 * transition bridge over HTTP with strict fail-closed admission and provenance tracking.
 */
import type { FastifyInstance } from 'fastify';
import { OceanicosKernel } from '@oceanicos/mini';

type JsonError = (
  reply: any,
  status: number,
  error: string,
  extra?: Record<string, unknown>,
) => unknown;

export function registerUpgradeRoute(
  fastify: FastifyInstance,
  jsonError: JsonError,
  kernel: OceanicosKernel,
): void {
  /**
   * POST /v1/upgrade
   * Commit a V1111 whole-ecosystem upgrade transition.
   * Fails closed if observation is not AUTHORIZED.
   */
  fastify.post('/v1/upgrade', async (request: any, reply) => {
    const body = request.body || {};
    const claim = typeof body.claim === 'string' ? body.claim.trim() : '';
    const observation = body.observation;
    const provenanceHash =
      typeof body.provenanceHash === 'string' ? body.provenanceHash.trim() : '';
    const actors = Array.isArray(body.actors) ? body.actors : undefined;

    if (!claim) {
      return jsonError(reply, 400, 'MISSING_CLAIM');
    }
    if (!observation || typeof observation !== 'object') {
      return jsonError(reply, 400, 'MISSING_OBSERVATION');
    }
    if (!provenanceHash) {
      return jsonError(reply, 400, 'MISSING_PROVENANCE_HASH');
    }

    try {
      const { canonicalState, upgradeResult } = await kernel.upgradeTransition({
        claim,
        observation: {
          status: String(observation.status || 'UNKNOWN'),
          uuid: observation.uuid ? String(observation.uuid) : undefined,
        },
        provenanceHash,
        actors,
      });

      if (upgradeResult.status !== 'VERIFIED') {
        return reply.status(403).send({
          success: false,
          status: upgradeResult.status,
          reason: 'FAIL_CLOSED_UNAUTHORIZED',
          evidencePath: upgradeResult.evidencePath,
          chainLength: upgradeResult.chainLength,
          tipHash: upgradeResult.tipHash,
        });
      }

      return reply.status(200).send({
        success: true,
        status: 'VERIFIED',
        upgrade: {
          chainLength: upgradeResult.chainLength,
          tipHash: upgradeResult.tipHash,
          evidencePath: upgradeResult.evidencePath,
          status: upgradeResult.status,
        },
        canonicalState: {
          stateId: canonicalState.stateId,
          stateIndex: canonicalState.stateIndex,
          verificationStatus: canonicalState.verificationStatus,
          parentStateHash: canonicalState.parentStateHash,
          stateDeltaHash: canonicalState.stateDeltaHash,
          attestationSignature: canonicalState.attestationSignature,
          createdAt: canonicalState.createdAt,
        },
      });
    } catch (err: any) {
      return jsonError(reply, 500, 'UPGRADE_TRANSITION_FAILED', {
        message: String(err?.message ?? err),
      });
    }
  });

  /**
   * GET /v1/upgrade
   * Read the current self-upgrade chain state, tip hash, and kernel stats.
   */
  fastify.get('/v1/upgrade', async () => {
    const core = kernel.getUpgradeCore();
    const stats = kernel.getStats();

    return {
      success: true,
      active: Boolean(core),
      chainLength: core ? core.getChain().length : 0,
      tipHash: core ? core.getTip() : null,
      stats,
      contract: 'Ω∞v-V1111-UPGRADE',
      invariants: {
        failClosed: true,
        humanConsentRequired: true,
        realityAsFinalAuthority: true,
      },
    };
  });
}
