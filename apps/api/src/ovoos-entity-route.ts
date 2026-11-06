import type { FastifyInstance } from 'fastify';
import {
  CHECKSUM_SYMBOL,
  ENGINE,
  PHASE_THRESHOLDS,
  ovoosPhaseName,
  runEntity,
} from '@oceanicos/mini';

type JsonError = (reply: any, status: number, error: string, extra?: Record<string, unknown>) => unknown;

const MAX_INTENT_LENGTH = 2000;

function parseObject(body: unknown): Record<string, unknown> | null {
  return body && typeof body === 'object' && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : null;
}

/**
 * ΩVØØS entity receipt.
 *
 *   intent → KAI Shield → ELION compose → OMEGA hash → receipt
 *
 * The receipt is the stored output contract. It is bounded and local: no
 * ledger write, no model call, no external bridge. A blocked intent
 * (DIVERGENT) or a composed sentence (UNKNOWN) is a successful HTTP
 * response carrying a verdict, not an HTTP failure.
 */
export function registerOvoosEntityRoute(
  fastify: FastifyInstance,
  jsonError: JsonError
): void {
  const lawHandler = async () => ({
    success: true,
    engine: ENGINE,
    checksum_symbol: CHECKSUM_SYMBOL,
    statuses: ['VERIFIED', 'DIVERGENT', 'UNKNOWN'],
    emitted_statuses: ['DIVERGENT', 'UNKNOWN'],
    phases: PHASE_THRESHOLDS,
    ease_law: 'Ease(t) = (1 - cos(t * π)) / 2',
    receipt_fields: [
      'engine',
      'status',
      'phase_t',
      'evidence_hash',
      'action',
      'reason',
      'next_delta',
    ],
    ledgerMutation: false,
    limitation:
      'A hash of a locally composed sentence is not an independent observation. VERIFIED is never emitted here.',
  });

  const receiptHandler = async (request: any, reply: any) => {
    const body = parseObject(request.body);
    if (!body) return jsonError(reply, 400, 'INVALID_BODY');
    if (typeof body.intent !== 'string') return jsonError(reply, 400, 'INVALID_INTENT');
    if (body.intent.length > MAX_INTENT_LENGTH) {
      return jsonError(reply, 413, 'INTENT_TOO_LONG', { max: MAX_INTENT_LENGTH });
    }
    if (body.phaseT !== undefined && typeof body.phaseT !== 'number') {
      return jsonError(reply, 400, 'INVALID_PHASE');
    }
    if (body.witness !== undefined && body.witness !== null && typeof body.witness !== 'string') {
      return jsonError(reply, 400, 'INVALID_WITNESS');
    }

    const { receipt, row } = runEntity({
      intent: body.intent,
      phaseT: typeof body.phaseT === 'number' ? body.phaseT : 0,
      witness: typeof body.witness === 'string' ? body.witness : null,
    });

    return {
      success: true,
      receipt,
      phase: ovoosPhaseName(receipt.phase_t),
      // The row is returned, not appended: MEMORY != PROOF.
      row,
      ledgerMutation: false,
    };
  };

  for (const path of ['/v1/ovoos/entity', '/api/v1/ovoos/entity']) {
    fastify.get(path, lawHandler);
    fastify.post(path, receiptHandler);
  }
}
