import { createHash, randomUUID } from 'node:crypto';
import type { RememberEngine } from '@oceanicos/remember';
import type { FastifyInstance } from 'fastify';
import { PluralisticFlowExecutor, type PluralisticFlowTask } from '@omega-v/coordination';

const HOUSE_EQUATION =
  'FIXPOINT(RECONCILE[WORLD ⊕ VERIFY(Δ(I,R)) ⊕ REMEMBER(E) ⊕ argmax_{a∈AUTHORIZED} EvidenceBackedValue(a)/(Risk(a)+Cost(a)+ε)])';
const ORGANS = new Set([
  'SOUL', 'KAI', 'MIRRIO', 'LUCID', 'TRUTH_WEAVER', 'TRUTHOS',
  'ECHOFRAME', 'OCEANICOS', 'OMEGA_V', 'DAV', 'HOUSE',
]);
const ORGAN_OBSERVATION_PATHS: Record<string, string> = {
  SOUL: '/v1/ecosystem/status',
  KAI: '/v1/omega/events',
  MIRRIO: '/v1/reality/status',
  LUCID: '/v1/kernel/capabilities',
  TRUTH_WEAVER: '/v1/omega/divergences',
  TRUTHOS: '/v1/omega/divergences',
  ECHOFRAME: '/v1/ecosystem/body',
  OCEANICOS: '/v1/ecosystem/status',
  OMEGA_V: '/v1/omega/workers',
  DAV: '/v1/value-navigator/proposals',
  HOUSE: '/v1/house/flow/status',
};

type HouseAction = 'OBSERVE_ORGAN' | 'OBSERVE_RUNTIME' | 'VERIFY_SHA256' | 'RECONCILE' | 'VERIFY_OBSERVATIONS' | 'RECONCILE_OBSERVATIONS' | 'VALUE_SCORE' | 'EXTERNAL_MUTATION';

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function requiredString(input: Record<string, unknown>, key: string, maximum = 8192): string {
  const value = input[key];
  if (typeof value !== 'string' || value.length === 0 || value.length > maximum) {
    throw new Error(`INVALID_INPUT_${key.toUpperCase()}`);
  }
  return value;
}

function requiredStringArray(input: Record<string, unknown>, key: string, maximum = 64): string[] {
  const value = input[key];
  if (!Array.isArray(value) || value.length === 0 || value.length > maximum ||
      value.some((item) => typeof item !== 'string' || item.length === 0 || item.length > 96) ||
      new Set(value).size !== value.length) {
    throw new Error(`INVALID_INPUT_${key.toUpperCase()}`);
  }
  return value as string[];
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function requiredNumber(input: Record<string, unknown>, key: string): number {
  const value = input[key];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`INVALID_INPUT_${key.toUpperCase()}`);
  }
  return value;
}

function actionRunner(action: HouseAction, input: Record<string, unknown>, organ: string, fastify: FastifyInstance, forwardedHeaders: Record<string, string>): {
  requiresApproval: boolean;
  run: PluralisticFlowTask['run'];
} {
  if (action === 'OBSERVE_ORGAN') {
    const path = ORGAN_OBSERVATION_PATHS[organ];
    if (!path) throw new Error(`NO_OBSERVATION_ROUTE_FOR_${organ}`);
    return {
      requiresApproval: false,
      run: async () => {
        const response = await fastify.inject({ method: 'GET', url: path, headers: forwardedHeaders });
        if (response.statusCode < 200 || response.statusCode >= 300) {
          throw new Error(`ORGAN_OBSERVATION_HTTP_${organ}_${response.statusCode}`);
        }
        let body: unknown;
        try {
          body = response.json();
        } catch {
          body = response.body.slice(0, 8192);
        }
        if (response.body.length > 32_768) {
          body = { truncated: true, bytes: response.body.length, preview: response.body.slice(0, 4096) };
        }
        return {
          status: 'OBSERVED',
          organ,
          route: path,
          statusCode: response.statusCode,
          body,
          evidence: 'same-process-read-only-api-observation',
        };
      },
    };
  }

  if (action === 'OBSERVE_RUNTIME') {
    return {
      requiresApproval: false,
      run: async () => ({
        status: 'OBSERVED',
        scope: 'api-process',
        evidence: 'runtime-observed',
        runtime: process.version,
        uptimeSeconds: Math.floor(process.uptime()),
        observedAt: new Date().toISOString(),
      }),
    };
  }

  if (action === 'VERIFY_SHA256') {
    const value = requiredString(input, 'value');
    const expectedSha256 = requiredString(input, 'expectedSha256', 64).toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(expectedSha256)) throw new Error('INVALID_INPUT_EXPECTEDSHA256');
    return {
      requiresApproval: false,
      run: async () => {
        const observedSha256 = createHash('sha256').update(value, 'utf8').digest('hex');
        return {
          status: observedSha256 === expectedSha256 ? 'VERIFIED' : 'DIVERGENT',
          expectedSha256,
          observedSha256,
          evidence: 'sha256-recomputed-from-supplied-value',
        };
      },
    };
  }

  if (action === 'VERIFY_OBSERVATIONS') {
    const expectedTaskIds = requiredStringArray(input, 'expectedTaskIds');
    return {
      requiresApproval: false,
      run: async ({ outputs }) => {
        const observations = expectedTaskIds.slice().sort().map((taskId) => {
          const observation = objectValue(outputs[taskId]);
          if (!observation || observation.status !== 'OBSERVED') {
            throw new Error(`OBSERVATION_MISSING_OR_UNVERIFIED_${taskId}`);
          }
          return [taskId, observation] as const;
        });
        const observationDigest = createHash('sha256').update(canonicalJson(observations), 'utf8').digest('hex');
        return {
          status: 'VERIFIED',
          observationCount: observations.length,
          taskIds: observations.map(([taskId]) => taskId),
          observationDigest,
          evidence: 'sha256-recomputed-from-fixed-allowlist-organ-observations',
        };
      },
    };
  }

  if (action === 'RECONCILE_OBSERVATIONS') {
    const expectedTaskIds = requiredStringArray(input, 'expectedTaskIds');
    const verificationTaskId = requiredString(input, 'verificationTaskId', 96);
    return {
      requiresApproval: false,
      run: async ({ outputs }) => {
        const verification = objectValue(outputs[verificationTaskId]);
        const verificationTaskIds = verification && Array.isArray(verification.taskIds)
          ? verification.taskIds.filter((taskId): taskId is string => typeof taskId === 'string')
          : null;
        if (!verification || verification.status !== 'VERIFIED' || !verificationTaskIds ||
            verificationTaskIds.length !== expectedTaskIds.length ||
            !expectedTaskIds.every((taskId) => verificationTaskIds.includes(taskId))) {
          throw new Error('OBSERVATION_VERIFICATION_RECEIPT_MISSING_OR_DIVERGENT');
        }
        const observations = expectedTaskIds.slice().sort().map((taskId) => {
          const observation = objectValue(outputs[taskId]);
          if (!observation || observation.status !== 'OBSERVED') {
            throw new Error(`OBSERVATION_RECONCILIATION_DIVERGENT_${taskId}`);
          }
          return [taskId, observation] as const;
        });
        const observedDigest = createHash('sha256').update(canonicalJson(observations), 'utf8').digest('hex');
        if (observedDigest !== verification.observationDigest) {
          throw new Error('OBSERVATION_RECONCILIATION_DIGEST_MISMATCH');
        }
        return {
          status: 'VERIFIED',
          observationCount: observations.length,
          observationDigest: observedDigest,
          verificationTaskId,
          evidence: 'independent-recomputation-matched-verification-receipt',
        };
      },
    };
  }

  if (action === 'RECONCILE') {
    const expected = requiredString(input, 'expected');
    const observed = requiredString(input, 'observed');
    return {
      requiresApproval: false,
      run: async () => ({
        status: expected === observed ? 'VERIFIED' : 'DIVERGENT',
        expected,
        observed,
        evidence: 'exact-value-comparison',
      }),
    };
  }

  if (action === 'VALUE_SCORE') {
    const benefit = requiredNumber(input, 'benefit');
    const risk = requiredNumber(input, 'risk');
    const cost = requiredNumber(input, 'cost');
    return {
      requiresApproval: false,
      run: async () => ({
        status: 'CALCULATED_NOT_VERIFIED',
        formula: 'benefit / (risk + cost + epsilon)',
        score: benefit / (risk + cost + 1e-9),
        inputsEvidence: 'caller-supplied-unverified-values',
      }),
    };
  }

  return {
    requiresApproval: true,
    run: async () => ({ status: 'NOT_EXECUTED', reason: 'HUMAN_APPROVAL_REQUIRED' }),
  };
}

export function registerHouseFlowRoutes(fastify: FastifyInstance, ledgerMemory: RememberEngine): void {
  fastify.get('/v1/house/flow/status', async () => ({
    success: true,
    house: 'ΔVRØ HOUSE',
    equation: HOUSE_EQUATION,
    invariant: 'ATTEST, DON’T ASSERT. UNKNOWN PRESERVED.',
    phases: ['OBSERVE', 'ADMIT', 'PLAN', 'DISPATCH', 'EXECUTE', 'VERIFY', 'RECONCILE', 'REMEMBER', 'VALUE'],
    scheduling: {
      model: 'dependency-aware DAG',
      independentTasks: 'bounded parallel execution',
      dependencies: 'strict prerequisite ordering',
      conflicts: 'same conflictKey is serialized',
      maxConcurrency: 16,
      maxTasks: 64,
    },
    organs: [...ORGANS].map((organ) => ({ organ, role: 'pluralistic specialist lane', status: 'REGISTERED_AS_CONTRACT' })),
    capabilities: [
      { id: 'internal-organ-observation', status: 'SUPPORTED', action: 'OBSERVE_ORGAN', evidence: 'fixed allowlist of same-process read-only API routes' },
      { id: 'runtime-observation', status: 'SUPPORTED', action: 'OBSERVE_RUNTIME' },
      { id: 'sha256-verification', status: 'SUPPORTED', action: 'VERIFY_SHA256' },
      { id: 'organ-set-verification', status: 'SUPPORTED', action: 'VERIFY_OBSERVATIONS', evidence: 'recomputes canonical digest from actual organ observation outputs' },
      { id: 'observation-reconciliation', status: 'SUPPORTED', action: 'RECONCILE_OBSERVATIONS', evidence: 'independent digest recomputation against verification receipt' },
      { id: 'state-reconciliation', status: 'SUPPORTED', action: 'RECONCILE' },
      { id: 'value-scoring', status: 'SUPPORTED', action: 'VALUE_SCORE', evidence: 'caller-supplied inputs remain unverified' },
      { id: 'external-mutation', status: 'REVIEW_REQUIRED', action: 'EXTERNAL_MUTATION' },
      { id: 'browser-automation', status: 'UNCONFIGURED', evidence: 'requires an active browser provider connection' },
      { id: 'local-computer-runner', status: 'DISABLED', evidence: 'existing local-action runner remains disabled' },
    ],
    boundaries: [
      'This API flow executes only its explicit safe built-in actions.',
      'External mutations remain unexecuted pending a separate server-side authority and adapter.',
      'A digest proves integrity of supplied bytes, not external truth or provenance.',
      'House receipts are appended to the existing Remember ledger; chain integrity is reported separately from signing and attestation.',
    ],
  }));

  fastify.post('/v1/house/flow/run', {
    config: { rateLimit: { max: 8, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const body = objectValue(request.body);
    if (!body || !Array.isArray(body.tasks) || body.tasks.length === 0) {
      return reply.code(400).send({ success: false, error: 'TASKS_ARRAY_REQUIRED' });
    }
    if (body.tasks.length > 64) {
      return reply.code(400).send({ success: false, error: 'TASK_LIMIT_EXCEEDED' });
    }

    let tasks: PluralisticFlowTask[];
    try {
      const forwardedHeaders: Record<string, string> = {};
      for (const name of ['authorization', 'x-omega-read-token', 'x-omega-admin-token', 'x-omega-operator']) {
        const value = request.headers[name];
        if (typeof value === 'string') forwardedHeaders[name] = value;
      }
      tasks = body.tasks.map((raw: unknown) => {
        const item = objectValue(raw);
        if (!item) throw new Error('TASK_OBJECT_REQUIRED');
        const id = requiredString(item, 'id', 96);
        const organ = requiredString(item, 'organ', 48);
        if (!ORGANS.has(organ)) throw new Error(`UNKNOWN_HOUSE_ORGAN_${organ}`);
        const action = requiredString(item, 'action', 40) as HouseAction;
        if (!['OBSERVE_ORGAN', 'OBSERVE_RUNTIME', 'VERIFY_SHA256', 'RECONCILE', 'VERIFY_OBSERVATIONS', 'RECONCILE_OBSERVATIONS', 'VALUE_SCORE', 'EXTERNAL_MUTATION'].includes(action)) {
          throw new Error(`ACTION_NOT_ALLOWLISTED_${action}`);
        }
        const input = objectValue(item.input) ?? {};
        if (Buffer.byteLength(JSON.stringify(input), 'utf8') > 16_384) throw new Error('TASK_INPUT_TOO_LARGE');
        const dependsOn = item.dependsOn === undefined ? [] : item.dependsOn;
        if (!Array.isArray(dependsOn) || dependsOn.some((entry) => typeof entry !== 'string')) {
          throw new Error(`INVALID_DEPENDENCIES_${id}`);
        }
        const conflictKey = item.conflictKey;
        if (conflictKey !== undefined && typeof conflictKey !== 'string') throw new Error(`INVALID_CONFLICT_KEY_${id}`);
        const runner = actionRunner(action, input, organ, fastify, forwardedHeaders);
        return {
          id,
          organ,
          title: typeof item.title === 'string' ? item.title.slice(0, 160) : action,
          dependsOn,
          ...(conflictKey ? { conflictKey } : {}),
          requiresApproval: runner.requiresApproval,
          run: runner.run,
        };
      });
      const executor = new PluralisticFlowExecutor({
        runId: typeof body.runId === 'string' ? body.runId : undefined,
        maxConcurrency: typeof body.maxConcurrency === 'number' ? body.maxConcurrency : 4,
        maxTasks: 64,
      });
      const flow = await executor.execute(tasks);
      const rememberedAt = new Date().toISOString();
      const memoryObservation = {
        schema: 'omega.house-flow-observation.v1',
        uuid: randomUUID(),
        timestamp: rememberedAt,
        source: 'delta-vro-house-flow',
        runId: flow.runId,
        state: flow.state,
        taskCounts: {
          total: flow.total,
          succeeded: flow.succeeded,
          failed: flow.failed,
          blocked: flow.blocked,
          reviewRequired: flow.reviewRequired,
        },
        taskReceipts: flow.tasks.map((task) => ({
          id: task.id,
          organ: task.organ,
          status: task.status,
          ...(task.outputDigest ? { outputDigest: task.outputDigest } : {}),
          ...(task.error ? { error: task.error } : {}),
        })),
      };
      const memoryDigest = createHash('sha256').update(canonicalJson(memoryObservation), 'utf8').digest('hex');
      let memory: Record<string, unknown>;
      try {
        const before = ledgerMemory.verifyChain();
        if (!before.valid) {
          memory = { status: 'DIVERGENT', integrity: before, evidence: 'pre-append-ledger-verification-failed' };
        } else {
          const block = ledgerMemory.append(memoryObservation, {
            schema: 'omega.house-flow-evidence.v1',
            status: flow.state === 'SUCCEEDED' ? 'PASS' : flow.state === 'FAILED' ? 'FAIL' : 'DIVERGENT',
            lawRoute: 'FIXPOINT(RECONCILE[WORLD ⊕ VERIFY(Δ(I,R)) ⊕ REMEMBER(E) ⊕ argmax AUTHORIZED_VALUE])',
            timestamp: rememberedAt,
            observationUuid: memoryObservation.uuid,
            signatureProof: 'UNSIGNED; integrity is provided by the ledger hash chain, not a signer',
            receiptDigest: memoryDigest,
            verification: 'sha256-recomputed-from-house-flow-observation',
          });
          const after = ledgerMemory.verifyChain();
          const verifiedTip = ledgerMemory.getVerifiedTip<typeof memoryObservation, {
            schema: string; status: string; lawRoute: string; timestamp: string;
            observationUuid: string; signatureProof: string; receiptDigest: string; verification: string;
          }>();
          memory = after.valid && verifiedTip?.hash === block.hash
            ? { status: 'RECORDED_CHAIN_VERIFIED', blockIndex: block.index, blockHash: block.hash, receiptDigest: memoryDigest, integrity: after }
            : { status: 'DIVERGENT', blockIndex: block.index, blockHash: block.hash, integrity: after };
        }
      } catch (memoryError) {
        memory = { status: 'NOT_REMEMBERED', error: memoryError instanceof Error ? memoryError.message.slice(0, 200) : 'MEMORY_APPEND_FAILED' };
      }
      return { success: true, flow, memory };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'HOUSE_FLOW_REJECTED';
      return reply.code(400).send({ success: false, error: message.slice(0, 240) });
    }
  });
}
