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
import { OMEGA_WATER_FLOW_MAX_STEPS } from '@oceanicos/types';

export type PipelineAdmissionEvidence = {
  readonly authorityVerified: boolean;
  readonly policySatisfied: boolean;
};

/** Server-supplied admission evidence. Request bodies are not a source. */
export type PipelineAdmissionEvidenceResolver = () => PipelineAdmissionEvidence;

function clientSuppliedAdmissionGates(admission: object): boolean {
  return (
    Object.prototype.hasOwnProperty.call(admission, 'authorityVerified') ||
    Object.prototype.hasOwnProperty.call(admission, 'policySatisfied')
  );
}

function serverAdmissionEvidence(
  resolve: PipelineAdmissionEvidenceResolver | undefined,
): PipelineAdmissionEvidence | undefined {
  if (!resolve) return { authorityVerified: false, policySatisfied: false };
  const evidence = resolve();
  if (
    !evidence ||
    typeof evidence !== 'object' ||
    typeof evidence.authorityVerified !== 'boolean' ||
    typeof evidence.policySatisfied !== 'boolean'
  ) {
    return undefined;
  }
  return {
    authorityVerified: evidence.authorityVerified,
    policySatisfied: evidence.policySatisfied,
  };
}

type JsonError = (
  reply: any,
  status: number,
  error: string,
  extra?: Record<string, unknown>,
) => unknown;

export function registerPipelineRoute(
  fastify: FastifyInstance,
  jsonError: JsonError,
  resolveAdmissionEvidence?: PipelineAdmissionEvidenceResolver,
): void {
  fastify.post('/v1/pipeline', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request: any, reply) => {
    const body = request.body || {};
    const compile = body.compile;
    const admission = body.admission;
    const authority = typeof body.authority === 'string' ? body.authority.trim() : '';
    const policy = typeof body.policy === 'string' ? body.policy.trim() : '';
    if (!compile || typeof compile !== 'object') return jsonError(reply, 400, 'MISSING_COMPILE');
    if (!admission || typeof admission !== 'object' || Array.isArray(admission)) return jsonError(reply, 400, 'MISSING_ADMISSION');
    if (!authority) return jsonError(reply, 400, 'MISSING_AUTHORITY');
    if (!policy) return jsonError(reply, 400, 'MISSING_POLICY');
    if (clientSuppliedAdmissionGates(admission)) {
      return jsonError(reply, 400, 'PIPELINE_ADMISSION_EVIDENCE_NOT_ACCEPTED');
    }
    let admissionEvidence: PipelineAdmissionEvidence;
    try {
      const resolved = serverAdmissionEvidence(resolveAdmissionEvidence);
      if (!resolved) return jsonError(reply, 403, 'PIPELINE_ADMISSION_EVIDENCE_UNAVAILABLE');
      admissionEvidence = resolved;
    } catch {
      return jsonError(reply, 403, 'PIPELINE_ADMISSION_EVIDENCE_UNAVAILABLE');
    }
    const waterFlowMaxSteps = body.waterFlowMaxSteps;
    if (
      waterFlowMaxSteps !== undefined &&
      (!Number.isInteger(waterFlowMaxSteps) ||
        waterFlowMaxSteps < 1 ||
        waterFlowMaxSteps > OMEGA_WATER_FLOW_MAX_STEPS)
    ) {
      return jsonError(reply, 400, 'INVALID_WATER_FLOW_BOUNDS', {
        message: `waterFlowMaxSteps must be an integer from 1 to ${OMEGA_WATER_FLOW_MAX_STEPS}`,
      });
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
    if (causalMemoryPath && causalMemoryKey && !memory.verifyIntegrity()) {
      return jsonError(reply, 503, 'CAUSAL_MEMORY_INTEGRITY_DEGRADED');
    }
    try {
      const result = runOmegaChangePipeline({
        compile,
        admission: admissionEvidence,
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
        waterFlowMaxSteps,
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
          waterFlow: result.waterFlow,
          durableMemory: Boolean(causalMemoryPath && causalMemoryKey),
          memoryIntegrity: causalMemoryPath && causalMemoryKey ? memory.verifyIntegrity() : null,
          memoryAppended: memoryEntries.length,
        },
      };
    } catch (error: any) {
      return jsonError(reply, 400, 'PIPELINE_REJECTED', { message: String(error?.message ?? error) });
    }
  });
}
