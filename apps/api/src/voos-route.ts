import type { FastifyInstance } from 'fastify';
import { runVoos, type VoosLedgerStore } from './voos.js';

type JsonError = (
  reply: any,
  status: number,
  error: string,
  extra?: Record<string, unknown>
) => unknown;

const MAX_INTENT_LENGTH = 2000;
const MAX_OBSERVATION_LENGTH = 4000;

function parseObject(body: unknown): Record<string, unknown> | null {
  return body && typeof body === 'object' && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : null;
}

/**
 * ΩVØØS routes.
 *
 * POST /v1/voos/execute — run the four-step loop and append the receipt to the
 * KAI Ledger. A DIVERGENT or UNKNOWN verdict is a successful HTTP response
 * carrying a verdict, never an HTTP failure.
 * GET /v1/voos/ledger — the append-only ledger plus its hash-chain integrity.
 */
export function registerVoosRoute(
  fastify: FastifyInstance,
  ledger: VoosLedgerStore,
  jsonError: JsonError
): void {
  fastify.post('/v1/voos/execute', async (request: any, reply) => {
    const body = parseObject(request.body);
    if (!body) return jsonError(reply, 400, 'INVALID_VOOS_INTENT');

    const intent = typeof body.intent === 'string' ? body.intent.trim() : '';
    if (!intent) return jsonError(reply, 400, 'INTENT_REQUIRED');
    if (intent.length > MAX_INTENT_LENGTH) {
      return jsonError(reply, 400, 'INTENT_TOO_LONG', { maxLength: MAX_INTENT_LENGTH });
    }
    if (body.phaseT !== undefined && (typeof body.phaseT !== 'number' || !Number.isFinite(body.phaseT))) {
      return jsonError(reply, 400, 'INVALID_PHASE_T', { message: 'phaseT must be a finite number' });
    }
    if (body.observed !== undefined && typeof body.observed !== 'string') {
      return jsonError(reply, 400, 'INVALID_VOOS_OBSERVATION');
    }
    if (typeof body.observed === 'string' && body.observed.length > MAX_OBSERVATION_LENGTH) {
      return jsonError(reply, 400, 'OBSERVATION_TOO_LONG', { maxLength: MAX_OBSERVATION_LENGTH });
    }
    if (body.source !== undefined && typeof body.source !== 'string') {
      return jsonError(reply, 400, 'INVALID_VOOS_OBSERVATION');
    }

    const run = runVoos({
      intent,
      phaseT: typeof body.phaseT === 'number' ? body.phaseT : 0,
      observed: typeof body.observed === 'string' ? body.observed : null,
      source: typeof body.source === 'string' ? body.source : null,
    });
    const row = ledger.append(run.row);

    return {
      success: true,
      receipt: run.receipt,
      ledger: row,
      integrity: ledger.verifyIntegrity(),
    };
  });

  fastify.get('/v1/voos/ledger', async (request: any) => {
    const rawLimit = Number(request.query?.limit);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 50;
    const entries = ledger.recent(limit);
    return {
      success: true,
      entries,
      total: ledger.count(),
      integrity: ledger.verifyIntegrity(),
    };
  });
}
