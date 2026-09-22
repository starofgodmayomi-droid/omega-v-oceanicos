/**
 * AUTOPILOT MOOD HTTP surface (sections 15–16).
 *
 * Wired from apps/api/src/index.ts. Mood is a governed, bounded interaction
 * subsystem: it observes human signals, preserves uncertainty, adapts the
 * experience, and proposes — but never authorizes consequential action.
 * Normal Ω∞v admission remains the gate for reality claims and action.
 */
import type { FastifyInstance } from 'fastify';
import { MoodAutopilotEngine, MoodEvaluator } from '@omega-v/mood';

type JsonError = (
  reply: any,
  status: number,
  error: string,
  extra?: Record<string, unknown>,
) => unknown;

export interface MoodRouteContext {
  engine: MoodAutopilotEngine;
  evaluator: MoodEvaluator;
  getLedgerState: () => { ready: boolean; totalMined: number; tip: unknown };
  jsonError: JsonError;
}

const PIDGIN_SPIRIT =
  'Abeg, verification before evolution. Whether highest high or lowest low, the blessing dey flow equal inside this single root.';

export function registerMoodRoutes(fastify: FastifyInstance, ctx: MoodRouteContext): void {
  const { engine, evaluator, getLedgerState, jsonError } = ctx;

  /**
   * GET /v1/mood — governed autopilot snapshot.
   * Keeps the legacy contract fields (smoke test: status === 'MAX GOOD-O') and
   * the ƆREADE/pidgin brand surface the UI expects, and adds the autopilot body.
   */
  fastify.get('/v1/mood', async () => {
    const ledger = getLedgerState();
    const systemMood = evaluator.evaluate(
      {
        totalObservations: ledger.totalMined,
        totalVerifications: ledger.totalMined,
        successRate: 1,
        totalAttestations: ledger.totalMined,
        systemConfidence: ledger.ready ? 0.95 : 0.5,
      },
      ledger.ready,
      0,
    );
    const snapshot = engine.snapshot();
    return {
      success: true,
      // Legacy contract (smoke test asserts status === 'MAX GOOD-O')
      status: 'MAX GOOD-O',
      contract: 'Ω∞v totality / attest-dont-assert',
      brand: 'Oceanicos Ω∞',
      ledger: { ready: ledger.ready },
      // ƆREADE / language-spirit surface
      singularityState: 'ULTIMATE DENSE SINGULARITY',
      reality: ledger.ready ? 'VERIFIED' : 'AWAITING_OBSERVATION',
      waveIndex: `0x${ledger.totalMined.toString(16).padStart(6, '0')}`,
      pidginSpirit: PIDGIN_SPIRIT,
      // Governed autopilot
      autopilot: snapshot,
      evaluatedAt: snapshot.evaluatedAt,
    };
  });

  /**
   * POST /v1/mood/signal — observe a human/agent mood signal.
   * Body: { signal, status?, source?, agentId?, language?, relationship?, intent?, context?, consequential?, unsafe? }
   */
  fastify.post('/v1/mood/signal', async (request: any, reply) => {
    const signal = typeof request.body?.signal === 'string' ? request.body.signal.trim() : '';
    if (!signal) return jsonError(reply, 400, 'MISSING_SIGNAL');
    const status = request.body?.status === 'INFERRED' ? 'INFERRED' : 'USER_STATED';
    const context = engine.observe(
      {
        signal,
        status,
        source: typeof request.body?.source === 'string' ? request.body.source : 'conversation',
        provenance: status === 'USER_STATED' ? 'explicit-user-expression' : 'agent-inference',
      },
      {
        agentId: typeof request.body?.agentId === 'string' ? request.body.agentId : undefined,
        language: typeof request.body?.language === 'string' ? request.body.language : undefined,
        relationship: typeof request.body?.relationship === 'string' ? request.body.relationship : undefined,
        intent: typeof request.body?.intent === 'string' ? request.body.intent : undefined,
        context: typeof request.body?.context === 'string' ? request.body.context : undefined,
      },
    );
    const proposal = engine.propose({
      consequential: Boolean(request.body?.consequential),
      unsafe: Boolean(request.body?.unsafe),
    });
    return {
      success: true,
      context,
      proposal,
      snapshot: engine.snapshot(),
    };
  });

  /**
   * POST /v1/mood/reconcile — apply a user correction to remembered signals.
   * Body: { signal, correction }
   */
  fastify.post('/v1/mood/reconcile', async (request: any, reply) => {
    const signal = typeof request.body?.signal === 'string' ? request.body.signal.trim() : '';
    const correction = typeof request.body?.correction === 'string' ? request.body.correction.trim() : '';
    if (!signal || !correction) return jsonError(reply, 400, 'MISSING_SIGNAL_OR_CORRECTION');
    const corrected = engine.reconcile(signal, correction);
    return {
      success: true,
      corrected: corrected.length,
      memory: { count: engine.snapshot().memory.count, entries: corrected },
    };
  });
}
