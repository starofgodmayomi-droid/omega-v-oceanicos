import type { FastifyInstance } from 'fastify';
import {
  OMEGA_FIXPOINT_OPERATOR,
  createOmegaFixpointState,
  evaluateOmegaOperator,
  iterateOmegaFixpoint,
  type OmegaDelta,
  type OmegaFixpointState,
  type OmegaHaltReason,
  type OmegaOperatorResult,
  type OmegaVerdict,
} from '@oceanicos/mini';

const MAX_TEXT = 512;
const MAX_EVIDENCE = 16;
const MAX_EVIDENCE_REF = 256;
const MAX_CONSEQUENCE = 200;
const MAX_AUTHORITY = 1_000_000;
const MAX_BATCH = 64;
const HISTORY_WINDOW = 24;

const MAX_LIMITS = {
  expected: MAX_TEXT,
  evidence: MAX_EVIDENCE,
  batch: MAX_BATCH,
};

type VerdictCounts = Record<OmegaVerdict, number>;

const emptyVerdicts = (): VerdictCounts => ({ VERIFIED: 0, DIVERGENT: 0, UNKNOWN: 0, NOT_EXECUTED: 0 });

const text = (value: unknown, max: number): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= max ? trimmed : null;
};

const authorityValue = (value: unknown): number | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > MAX_AUTHORITY) return NaN;
  return value;
};

function parseDelta(value: unknown): OmegaDelta | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;

  const expected = text(body.expected, MAX_TEXT);
  if (!expected) return null;

  let observed: string | undefined;
  if (body.observed !== undefined && body.observed !== null) {
    const parsedObserved = text(body.observed, MAX_TEXT);
    if (!parsedObserved) return null;
    observed = parsedObserved;
  }

  let evidence: string[] | undefined;
  if (body.evidence !== undefined && body.evidence !== null) {
    if (!Array.isArray(body.evidence) || body.evidence.length > MAX_EVIDENCE) return null;
    evidence = [];
    for (const ref of body.evidence) {
      if (typeof ref !== 'string' || ref.length > MAX_EVIDENCE_REF) return null;
      if (ref.trim()) evidence.push(ref.trim());
    }
  }

  if (body.knownScam !== undefined && typeof body.knownScam !== 'boolean') return null;

  const held = authorityValue(body.authority);
  const required = authorityValue(body.requiredAuthority);
  if (Number.isNaN(held) || Number.isNaN(required)) return null;

  let consequence: string | undefined;
  if (body.consequence !== undefined && body.consequence !== null) {
    const parsed = text(body.consequence, MAX_CONSEQUENCE);
    if (!parsed) return null;
    consequence = parsed;
  }

  return {
    expected,
    ...(observed !== undefined ? { observed } : {}),
    ...(evidence !== undefined ? { evidence } : {}),
    ...(body.knownScam === true ? { knownScam: true } : {}),
    ...(held !== undefined ? { authority: held } : {}),
    ...(required !== undefined ? { requiredAuthority: required } : {}),
    ...(consequence !== undefined ? { consequence } : {}),
  };
}

function parseBatch(value: unknown): OmegaDelta[] | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const list = (value as Record<string, unknown>).deltas;
  if (!Array.isArray(list) || list.length === 0 || list.length > MAX_BATCH) return null;
  const deltas: OmegaDelta[] = [];
  for (const entry of list) {
    const delta = parseDelta(entry);
    if (!delta) return null;
    deltas.push(delta);
  }
  return deltas;
}

const summariseState = (state: OmegaFixpointState) => ({ root: state.root, size: state.size });

const serialiseStep = (step: OmegaOperatorResult) => ({
  verdict: step.verdict,
  halted: step.halted,
  haltReason: step.haltReason ?? null,
  committed: step.committed,
  deltaHash: step.deltaHash,
  expected: step.expected,
  observed: step.observed ?? null,
  evidence: step.evidence,
  consequence: step.consequence,
  evaluatedAt: step.evaluatedAt,
  state: summariseState(step.state),
});

export interface OmegaRealitySnapshot {
  readonly operator: readonly string[];
  readonly law: string;
  readonly state: { root: string; size: number };
  readonly entries: readonly {
    sequence: number;
    deltaHash: string;
    root: string;
    consequence: string;
    committedAt: string;
  }[];
  readonly verdicts: VerdictCounts;
  readonly last: ReturnType<typeof serialiseStep> | null;
  readonly history: readonly ReturnType<typeof serialiseStep>[];
}

/**
 * In-process Ω∞v loop.
 *
 * `Σ` is monotone: only deltas whose observed state equals their expected
 * state are committed, and committed entries are never removed or rewritten.
 * Restarting the process starts from the empty axiom (`Ø`), which is honest —
 * this loop holds no durable memory of its own.
 */
export class OmegaRealityLoop {
  private state: OmegaFixpointState = createOmegaFixpointState();
  private readonly history: OmegaOperatorResult[] = [];
  private readonly verdicts: VerdictCounts = emptyVerdicts();

  step(delta: OmegaDelta): OmegaOperatorResult {
    const result = evaluateOmegaOperator(delta, this.state);
    this.state = result.state;
    this.verdicts[result.verdict] += 1;
    this.record(result);
    return result;
  }

  run(deltas: readonly OmegaDelta[]): {
    steps: OmegaOperatorResult[];
    halted: boolean;
    haltReason: OmegaHaltReason;
    verdicts: VerdictCounts;
  } {
    const queue = [...deltas];
    const run = iterateOmegaFixpoint(() => queue.shift(), {
      state: this.state,
      maxSteps: deltas.length,
    });
    this.state = run.state;
    for (const step of run.steps) {
      this.verdicts[step.verdict] += 1;
      this.record(step);
    }
    return {
      steps: [...run.steps],
      halted: run.halted,
      haltReason: run.haltReason,
      verdicts: run.verdicts,
    };
  }

  snapshot(): OmegaRealitySnapshot {
    return {
      operator: OMEGA_FIXPOINT_OPERATOR,
      law: 'Mₜ₊₁ = Mₜ ∪ Δ ⟺ Expected ≡ Observed',
      state: summariseState(this.state),
      entries: this.state.entries.map((entry) => ({
        sequence: entry.sequence,
        deltaHash: entry.deltaHash,
        root: entry.root,
        consequence: entry.consequence,
        committedAt: entry.committedAt,
      })),
      verdicts: { ...this.verdicts },
      last: this.history.length > 0 ? serialiseStep(this.history[this.history.length - 1]) : null,
      history: this.history.slice(-8).map(serialiseStep),
    };
  }

  private record(result: OmegaOperatorResult): void {
    this.history.push(result);
    if (this.history.length > HISTORY_WINDOW) this.history.shift();
  }
}

function bodyOf(request: any): Record<string, unknown> {
  return request.body && typeof request.body === 'object' && !Array.isArray(request.body)
    ? (request.body as Record<string, unknown>)
    : {};
}

export function registerRealityRoutes(fastify: FastifyInstance, loop: OmegaRealityLoop): void {
  fastify.get('/v1/reality/state', async () => ({ success: true, ...loop.snapshot() }));

  fastify.post('/v1/reality/step', async (request, reply) => {
    const delta = parseDelta(bodyOf(request));
    if (!delta) {
      return reply.status(400).send({ success: false, error: 'INVALID_OMEGA_DELTA', limits: MAX_LIMITS });
    }
    const result = loop.step(delta);
    return reply.status(201).send({
      success: true,
      step: serialiseStep(result),
      state: summariseState(result.state),
      verdicts: loop.snapshot().verdicts,
    });
  });

  fastify.post('/v1/reality/run', async (request, reply) => {
    const deltas = parseBatch(bodyOf(request));
    if (!deltas) {
      return reply.status(400).send({ success: false, error: 'INVALID_OMEGA_DELTA_BATCH', limits: MAX_LIMITS });
    }
    const run = loop.run(deltas);
    return reply.status(201).send({
      success: true,
      halted: run.halted,
      haltReason: run.haltReason,
      steps: run.steps.map(serialiseStep),
      verdicts: run.verdicts,
      state: loop.snapshot().state,
    });
  });
}
