/**
 * Ω∞v C0→C6 pipeline HTTP surface.
 * Wired from apps/api/src/index.ts — fail-closed, evidence-bound.
 */
import type { FastifyInstance } from 'fastify';
import { runOmegaChangePipeline, createOmegaWorkerRegistry } from '@oceanicos/mini';

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
        memory: { append: (record) => memoryEntries.push(record) },
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
          memoryAppended: memoryEntries.length,
        },
      };
    } catch (error: any) {
      return jsonError(reply, 400, 'PIPELINE_REJECTED', { message: String(error?.message ?? error) });
    }
  });
}
