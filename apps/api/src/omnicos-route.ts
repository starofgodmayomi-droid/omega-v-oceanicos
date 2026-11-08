import type { FastifyInstance } from 'fastify';
import { OMNICOS_MAX_INTENT_LENGTH, runOmnicos } from '@oceanicos/mini';

type JsonError = (
  reply: any,
  status: number,
  error: string,
  extra?: Record<string, unknown>
) => unknown;

function parseObject(body: unknown): Record<string, unknown> | null {
  return body && typeof body === 'object' && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : null;
}

/**
 * POST /api/omnicos (alias POST /omnicos, the Vite proxy's rewritten target)
 * returns the OMNICOS receipt from the stored directive.
 *
 * The receipt is the whole response: `entity`, `tool_used`, `status`,
 * `game_detected`, `phase_t`, `evidence_hash`, `action`, `next_delta`. A
 * shield match (DIVERGENT) or a local composition (UNKNOWN) is a successful
 * HTTP response carrying a verdict, not an HTTP failure.
 */
export function registerOmnicosRoute(fastify: FastifyInstance, jsonError: JsonError): void {
  const handler = async (request: any, reply: any) => {
    const body = parseObject(request.body);
    if (!body) return jsonError(reply, 400, 'INTENT_REQUIRED');
    const intent = typeof body.intent === 'string' ? body.intent.trim() : '';
    if (!intent) return jsonError(reply, 400, 'INTENT_REQUIRED');
    if (intent.length > OMNICOS_MAX_INTENT_LENGTH) {
      return jsonError(reply, 400, 'INTENT_TOO_LONG', {
        maxLength: OMNICOS_MAX_INTENT_LENGTH,
      });
    }
    const phaseT = typeof body.phaseT === 'number' ? body.phaseT : 0;
    return reply.status(200).send(runOmnicos({ intent, phaseT }));
  };

  fastify.post('/api/omnicos', handler);
  fastify.post('/omnicos', handler);
}
