import type { FastifyInstance } from 'fastify';
import { runEntity } from '@oceanicos/ovoos';

export function registerOvoosRoute(fastify: FastifyInstance, requireReadAccess: unknown): void {
  fastify.post('/v1/ovoos/receipt', { preHandler: requireReadAccess as any }, async (request: any, reply) => {
    const body = request.body && typeof request.body === 'object' && !Array.isArray(request.body) ? request.body : null;
    const intent = typeof body?.intent === 'string' ? body.intent.trim() : '';
    const phaseT = typeof body?.phaseT === 'number' ? body.phaseT : 0;
    if (intent.length > 2000) return reply.status(400).send({ success: false, error: 'OVOOS_INTENT_TOO_LONG', maxLength: 2000 });
    if (!Number.isFinite(phaseT)) return reply.status(400).send({ success: false, error: 'OVOOS_PHASE_INVALID' });
    const result = runEntity({ intent, phaseT, witness: typeof body?.witness === 'string' ? body.witness : null });
    return { success: true, receipt: result.receipt, row: result.row, execution: 'NOT_EXECUTED', verified: false, timestamp: new Date().toISOString() };
  });
}
