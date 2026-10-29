/**
 * Reality////Ω∞v — the continuum verdict over HTTP.
 *
 *   Reality////Ω∞v := Y(λf. (M_{t+1} = M_t ∪ Δ | V(Δ) = ⊤))
 *   V ≡ (Expected ≡ Observed)
 *
 *   HALT ⊢ VERIFIED | DIVERGENT (K(x)∈SCAM) | UNKNOWN (Evidence=∅)
 *          | NOT_EXECUTED (Authority < Required)
 *
 * The caller supplies the drops and, optionally, the memory M it already
 * holds; the endpoint returns the verdict receipt. It does not execute,
 * observe, persist, or admit anything on its own — a verdict here is the
 * operator's judgement of the supplied fields, not an independent
 * verification of reality.
 */
import type { FastifyInstance } from 'fastify';
import { runContinuum } from '@oceanicos/mini';
import type { ContinuumDrop } from '@oceanicos/mini';

const MAX_DROPS = 64;
const MAX_EVIDENCE = 16;
const MAX_REFERENCE = 512;

type RawDrop = {
  readonly delta?: unknown;
  readonly expected?: unknown;
  readonly observed?: unknown;
  readonly evidence?: unknown;
  readonly authority?: unknown;
  readonly requiredAuthority?: unknown;
  readonly scam?: unknown;
};

type RawBody = {
  readonly drops?: unknown;
  readonly memory?: unknown;
};

function normalizeDrop(raw: RawDrop, index: number): ContinuumDrop<string> {
  const label = `drops[${index}]`;
  if (typeof raw.delta !== 'string' || raw.delta.length < 1 || raw.delta.length > MAX_REFERENCE)
    throw new Error(`${label}.delta must be a non-empty string no longer than ${MAX_REFERENCE} characters`);
  if (!Array.isArray(raw.evidence) || raw.evidence.length > MAX_EVIDENCE || raw.evidence.some((entry) => typeof entry !== 'string' || entry.length > MAX_REFERENCE))
    throw new Error(`${label}.evidence must be an array of at most ${MAX_EVIDENCE} strings`);
  const authority = Number(raw.authority);
  const requiredAuthority = Number(raw.requiredAuthority ?? authority);
  if (!Number.isFinite(authority) || !Number.isFinite(requiredAuthority))
    throw new Error(`${label}.authority and ${label}.requiredAuthority must be finite numbers`);
  if (raw.scam !== undefined && typeof raw.scam !== 'boolean')
    throw new Error(`${label}.scam must be a boolean when supplied`);
  return {
    delta: raw.delta,
    expected: raw.expected ?? null,
    ...(raw.observed === undefined ? {} : { observed: raw.observed }),
    evidence: raw.evidence as string[],
    authority,
    requiredAuthority,
    ...(raw.scam === undefined ? {} : { scam: raw.scam }),
  };
}

export function registerContinuumRoute(fastify: FastifyInstance): void {
  fastify.post('/v1/omega/continuum', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const body = (request.body ?? {}) as RawBody;
    if (!Array.isArray(body.drops) || body.drops.length < 1 || body.drops.length > MAX_DROPS) {
      return reply.status(400).send({
        success: false,
        error: 'CONTINUUM_DROPS_REQUIRED',
        detail: `drops must be an array of 1..${MAX_DROPS} entries`,
      });
    }
    if (body.memory !== undefined && (!Array.isArray(body.memory) || body.memory.some((entry) => typeof entry !== 'string' || entry.length > MAX_REFERENCE))) {
      return reply.status(400).send({ success: false, error: 'CONTINUUM_MEMORY_INVALID', detail: 'memory must be an array of strings when supplied' });
    }

    let drops: ContinuumDrop<string>[];
    try {
      drops = (body.drops as RawDrop[]).map(normalizeDrop);
    } catch (error) {
      return reply.status(400).send({ success: false, error: 'CONTINUUM_DROP_INVALID', detail: (error as Error).message });
    }

    const run = runContinuum(drops, { memory: (body.memory as string[] | undefined) ?? [] });

    return {
      success: true,
      contract: {
        name: 'reality.continuum.v1',
        equation: 'Ω∞v := Y(λf. (M_{t+1} = M_t ∪ Δ | V(Δ) = ⊤))',
        memoryLaw: 'only a Δ whose observation equals its expectation is remembered',
        guards: ['VERIFIED if O(E(x)) ≡ VERIFIED', 'DIVERGENT if K(x) ∈ SCAM', 'UNKNOWN if Evidence(x) = ∅', 'NOT_EXECUTED if Authority(x) < Required'],
      },
      status: run.status,
      halted: run.halted,
      memory: run.memory,
      steps: run.steps.map((step) => ({
        index: step.index,
        delta: drops[step.index].delta,
        verdict: step.verdict,
        evidence: step.evidence,
        expected: step.expected,
        observed: step.observed,
        admitted: step.admitted,
        memory: step.memory,
      })),
      scope: 'judgement of the supplied drops; no execution, observation, or persistence was performed',
    };
  });
}
