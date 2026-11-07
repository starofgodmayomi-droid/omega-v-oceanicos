/**
 * Ω∞v reality gate over HTTP — the fixed point as one observable step.
 *
 *   Ω∞v := Y(λf. M_{t+1} = M_t ∪ Δ | V(Δ) = ⊤)
 *   V(Δ) ≡ (Expected ≡ Observed)
 *
 * The gate itself lives in `@oceanicos/omega`; this module only carries it to
 * the route layer. A step either appends one hash to the reality memory or
 * halts with its reason, and nothing else is executed: no repository
 * operation, no tool call, no write outside the memory chain.
 *
 * Memory is durable by default (`memoryScope: 'append-only-journal'`): the
 * chain is reloaded from its journal on boot, so a restart no longer returns
 * it to genesis. `memoryScope: 'process'` is reported when no journal backs the
 * chain. That boundary is declared in every read rather than implied — durable
 * memory survives a restart, and it is still not proof of the world.
 */
import type { FastifyInstance } from 'fastify';
import {
  createRealityMemory,
  REALITY_MEMORY_GENESIS,
  type RealityDelta,
  type RealityMemory,
} from '@oceanicos/omega';
import type { JsonError, PreHandler } from './repo-access.js';

export const REALITY_GATE_CONTRACT = 'omega-reality-gate.v1';

/** Declared authority levels, ordered by the gate (`@oceanicos/omega`). */
export const REALITY_AUTHORITY_LEVELS: readonly RealityDelta['authorityLevel'][] = ['READ_ONLY', 'AUTONOMOUS'];

export interface RealityGateRouteOptions {
  requireReadAccess: PreHandler;
  requireAdminAccess: PreHandler;
  jsonError: JsonError;
  memory?: RealityMemory;
  /** Where the chain lives, declared in every read: `process` or a journal. */
  memoryScope?: string;
  /** Extra integrity gate for a persisted chain (journal readable and re-proved). */
  verifyIntegrity?: () => boolean;
}

const MAX_FIELD_LENGTH = 400;
const MAX_MEMORY_LIST = 50;
const STEP_FIELDS = new Set(['intent', 'expected', 'observed', 'authorityLevel', 'requiredAuthority']);

const bodyObject = (body: unknown): Record<string, unknown> | null =>
  body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null;

const readText = (value: unknown): string | null =>
  typeof value === 'string' ? value.slice(0, MAX_FIELD_LENGTH) : null;

const readRequiredText = (value: unknown): string | null => {
  const text = readText(value);
  return text !== null && text.trim().length > 0 ? text : null;
};

const readAuthority = (value: unknown): RealityDelta['authorityLevel'] | null =>
  typeof value === 'string' && (REALITY_AUTHORITY_LEVELS as readonly string[]).includes(value)
    ? (value as RealityDelta['authorityLevel'])
    : null;

export function registerRealityGateRoute(fastify: FastifyInstance, options: RealityGateRouteOptions): void {
  const { requireReadAccess, requireAdminAccess, jsonError } = options;
  const memory = options.memory ?? createRealityMemory();

  const snapshot = () => {
    const intact = memory.verifyChain() && (options.verifyIntegrity?.() ?? true);
    return {
      tip: memory.tip(),
      size: memory.size(),
      integrity:
        memory.size() === 0
          ? intact
            ? ('empty' as const)
            : ('degraded' as const)
          : intact
            ? ('verified-local-hash-chain' as const)
            : ('degraded' as const),
      memoryScope: options.memoryScope ?? 'process',
    };
  };

  fastify.get('/v1/reality/gate/memory', { preHandler: requireReadAccess }, async (request: any, reply) => {
    const state = snapshot();
    if (state.integrity === 'degraded') return jsonError(reply, 503, 'REALITY_MEMORY_INTEGRITY_DEGRADED');

    const rawLimit = Number.parseInt(String(request.query?.limit ?? ''), 10);
    const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_MEMORY_LIST) : 20;
    const all = memory.entries();
    const entries = all.slice(-limit);

    return {
      success: true,
      contract: REALITY_GATE_CONTRACT,
      genesis: REALITY_MEMORY_GENESIS,
      authorityLevels: [...REALITY_AUTHORITY_LEVELS],
      entries,
      total: all.length,
      truncated: all.length > entries.length,
      ...state,
      invariants: [
        'a step appends only when V(Δ) = ⊤ (Expected ≡ Observed)',
        'halt guards run first: scam intent, no evidence, insufficient authority',
        'memory is append-only and hash-chained; it is not proof of the world',
        'memory lives in an append-only journal, so a restart reloads the chain instead of returning it to genesis',
      ],
      executed: false,
    };
  });

  fastify.post('/v1/reality/gate/step', { preHandler: requireAdminAccess }, async (request: any, reply) => {
    const body = bodyObject(request.body);
    if (!body) return jsonError(reply, 400, 'INVALID_BODY');
    if (Object.keys(body).some((field) => !STEP_FIELDS.has(field))) {
      return jsonError(reply, 400, 'UNSUPPORTED_FIELDS');
    }

    const intent = readRequiredText(body.intent);
    if (!intent) return jsonError(reply, 400, 'INTENT_REQUIRED');
    const expected = readRequiredText(body.expected);
    if (!expected) return jsonError(reply, 400, 'EXPECTED_REQUIRED');

    // An empty or absent observation is passed through as empty: the gate
    // answers UNKNOWN, which is its own declared branch, not a caller error.
    let observed: string | null = null;
    if (body.observed !== undefined && body.observed !== null) {
      observed = readText(body.observed);
      if (observed === null) return jsonError(reply, 400, 'OBSERVED_INVALID');
    }

    const authorityLevel = readAuthority(body.authorityLevel);
    if (!authorityLevel) return jsonError(reply, 400, 'AUTHORITY_LEVEL_INVALID');
    const requiredAuthority = readAuthority(body.requiredAuthority);
    if (!requiredAuthority) return jsonError(reply, 400, 'REQUIRED_AUTHORITY_INVALID');

    if (snapshot().integrity === 'degraded') {
      return jsonError(reply, 503, 'REALITY_MEMORY_INTEGRITY_DEGRADED');
    }

    const step = memory.step({ intent, expected, observed, authorityLevel, requiredAuthority });

    return {
      success: true,
      contract: REALITY_GATE_CONTRACT,
      step,
      memoryWritten: step.entry !== null,
      memory: snapshot(),
      executed: false,
      evaluatedAt: new Date().toISOString(),
    };
  });
}
