/**
 * Ω∞v C0→C6 pipeline HTTP surface.
 * Wired from apps/api/src/index.ts — fail-closed, evidence-bound.
 */
import type { FastifyInstance } from 'fastify';
import {
  FileCausalMemory,
  runOmegaChangePipeline,
  createOmegaWorkerRegistry,
} from '@oceanicos/mini';

type JsonError = (
  reply: any,
  status: number,
  error: string,
  extra?: Record<string, unknown>,
) => unknown;

export function registerPipelineRoute(
  fastify: FastifyInstance,
  jsonError: JsonError,
): void {
  fastify.post('/v1/pipeline', async (request: any, reply) => {
    const body = request.body || {};
    const compile = body.compile;
    const admission = body.admission;
    const authority = typeof body.authority === 'string' ? body.authority.trim() : '';
    const policy = typeof body.policy === 'string' ? body.policy.trim() : '';
    if (!compile || typeof compile !== 'object') return jsonError(reply, 400, 'MISSING_COMPILE');
    if (!admission || typeof admission !== 'object') return jsonError(reply, 400, 'MISSING_ADMISSION');
    if (!authority) return jsonError(reply, 400, 'MISSING_AUTHORITY');
    if (!policy) return jsonError(reply, 400, 'MISSING_POLICY');
    if (typeof admission.authorityVerified !== 'boolean' || typeof admission.policySatisfied !== 'boolean') {
      return jsonError(reply, 400, 'INVALID_ADMISSION_GATES');
    }

    const observedState =
      typeof body.observedState === 'string' && body.observedState.trim()
        ? body.observedState.trim()
        : undefined;
    const requestedAfter =
      typeof compile?.transition?.requestedStateAfter === 'string'
        ? compile.transition.requestedStateAfter
        : undefined;

    let registry;
    try {
      if (Array.isArray(body.workers) && body.workers.length > 0) {
        registry = createOmegaWorkerRegistry(body.workers);
      }
    } catch (error: any) {
      return jsonError(reply, 400, 'INVALID_WORKER_REGISTRY', { message: String(error?.message ?? error) });
    }

    const memoryEntries: unknown[] = [];
    const causalMemoryPath = process.env.OMEGA_CAUSAL_MEMORY_PATH?.trim();
    const causalMemoryKey = process.env.OMEGA_REALITY_ATTESTATION_KEY?.trim();
    if (causalMemoryPath && !causalMemoryKey) {
      return jsonError(reply, 503, 'CAUSAL_MEMORY_KEY_REQUIRED');
    }
    const memory: any = causalMemoryPath && causalMemoryKey
      ? new FileCausalMemory(causalMemoryPath, {
          key: causalMemoryKey,
          signerId: process.env.OMEGA_REALITY_ATTESTATION_SIGNER,
          keyVersion: process.env.OMEGA_REALITY_ATTESTATION_KEY_VERSION,
        })
      : { append: (record: unknown) => memoryEntries.push(record) };
    try {
      const result = runOmegaChangePipeline({
        compile,
        admission: {
          authorityVerified: admission.authorityVerified,
          policySatisfied: admission.policySatisfied,
        },
        authority,
        policy,
        registry,
        workerId: typeof body.workerId === 'string' ? body.workerId : undefined,
        changeId: typeof body.changeId === 'string' ? body.changeId : undefined,
        handler:
          body.handlerStateAfter && typeof body.handlerStateAfter === 'string'
            ? () => ({
                stateAfter: String(body.handlerStateAfter).trim(),
                consequence: typeof body.handlerConsequence === 'string' ? body.handlerConsequence : undefined,
              })
            : undefined,
        observeState: observedState ? () => observedState : undefined,
        memory,
        realityAttestationKey: causalMemoryKey,
        realityAttestationSignerId: process.env.OMEGA_REALITY_ATTESTATION_SIGNER,
        realityAttestationKeyVersion: process.env.OMEGA_REALITY_ATTESTATION_KEY_VERSION,
      });

      return {
        success: true,
        pipeline: {
          stage: result.stage,
          halted: result.halted,
          haltReason: result.haltReason ?? null,
          provenanceRoot: result.provenanceRoot,
          lineage: result.lineage,
          validation: result.validation
            ? { valid: result.validation.valid, issueCount: result.validation.issues.length, issues: result.validation.issues }
            : null,
          decision: result.record?.decision ?? null,
          authorized: result.record?.authorized ?? false,
          executionStatus: result.execution?.status ?? null,
          attestationId: result.execution?.attestationId ?? result.record?.attestationId ?? null,
          realityStatus: result.reality?.status ?? null,
          expectedState: result.reality?.expectedState ?? result.record?.stateAfter ?? requestedAfter ?? null,
          observedState: result.reality?.observedState ?? observedState ?? null,
          realityEvidence: result.reality?.evidence ?? null,
          realityAttestation: result.realityAttestation ?? null,
          durableMemory: Boolean(causalMemoryPath && causalMemoryKey),
          memoryIntegrity: causalMemoryPath && causalMemoryKey ? memory.verifyIntegrity() : null,
          memoryAppended: memoryEntries.length,
        },
      };
    } catch (error: any) {
      return jsonError(reply, 400, 'PIPELINE_REJECTED', { message: String(error?.message ?? error) });
    }
  });

  fastify.get('/v1/pipeline/:changeId', async (request: any, reply) => {
    const changeId = typeof request.params?.changeId === 'string' ? request.params.changeId.trim() : '';
    if (!changeId || changeId.length > 256) return jsonError(reply, 400, 'INVALID_CHANGE_ID');

    const causalMemoryPath = process.env.OMEGA_CAUSAL_MEMORY_PATH?.trim();
    const causalMemoryKey = process.env.OMEGA_REALITY_ATTESTATION_KEY?.trim();
    if (!causalMemoryPath || !causalMemoryKey) return jsonError(reply, 503, 'CAUSAL_MEMORY_UNAVAILABLE');

    try {
      const memory = new FileCausalMemory(causalMemoryPath, {
        key: causalMemoryKey,
        signerId: process.env.OMEGA_REALITY_ATTESTATION_SIGNER,
        keyVersion: process.env.OMEGA_REALITY_ATTESTATION_KEY_VERSION,
      });
      if (!memory.verifyIntegrity()) return jsonError(reply, 503, 'CAUSAL_MEMORY_INTEGRITY_DEGRADED');
      const entry = memory.replay(changeId);
      if (!entry) return jsonError(reply, 404, 'CAUSAL_RECORD_NOT_FOUND');
      return {
        success: true,
        memoryIntegrity: true,
        replay: entry,
      };
    } catch (error: any) {
      return jsonError(reply, 503, 'CAUSAL_MEMORY_UNAVAILABLE', { message: String(error?.message ?? error) });
    }
  });
}
