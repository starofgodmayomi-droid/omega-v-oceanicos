/**
 * Read-only projection of the ECOSYSTEM_BODY.md fixpoint.
 *
 * GET returns the compression of important upgraded work and its outward
 * expansion. POST evaluates one caller-supplied signal against an empty
 * memory and writes nothing. Neither route observes CI, deployment, or reality.
 */
import type { FastifyInstance } from 'fastify';
import {
  compressTowardUpgradedWork,
  evaluateEcosystemEquation,
  type EcosystemSignal,
  type EquationAuthority,
  type EquationKnowledge,
} from '@oceanicos/mini';

const EQUATION_BOUNDARY =
  'Local equation evaluation only. VERIFIED means the supplied record satisfied O(E(x)) ≡ VERIFIED. It does not authorize action and it is not a reality claim.';

const KNOWLEDGE = new Set(['CLEAR', 'SCAM', 'UNKNOWN']);
const AUTHORITY = new Set(['READ_ONLY', 'AUTONOMOUS']);

const allowedFields = new Set([
  'id',
  'text',
  'evidence',
  'expected',
  'observed',
  'knowledge',
  'authority',
  'requiredAuthority',
]);

export function registerEquationRoute(
  fastify: FastifyInstance,
  jsonError: (reply: any, status: number, error: string, extra?: Record<string, unknown>) => unknown,
): void {
  fastify.get('/v1/ecosystem/equation', async () => {
    const fixpoint = compressTowardUpgradedWork();
    return {
      success: true,
      source: 'ECOSYSTEM_BODY.md',
      equationId: fixpoint.equationId,
      equation: fixpoint.equation,
      evidenceScope: fixpoint.evidenceScope,
      boundary: fixpoint.boundary,
      admitted: fixpoint.admitted.length,
      halted: fixpoint.halted.length,
      memory: fixpoint.memory,
      expansion: fixpoint.expansion,
      halts: fixpoint.halted,
    };
  });

  fastify.post('/v1/ecosystem/equation', async (request, reply) => {
    const body = request.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return jsonError(reply, 400, 'EQUATION_SIGNAL_INVALID');
    }
    const record = body as Record<string, unknown>;
    const unsupported = Object.keys(record).filter((field) => !allowedFields.has(field));
    if (unsupported.length > 0) {
      return jsonError(reply, 400, 'EQUATION_SIGNAL_INVALID', { unsupported });
    }
    if (typeof record.id !== 'string' || typeof record.text !== 'string') {
      return jsonError(reply, 400, 'EQUATION_SIGNAL_INVALID');
    }
    if (record.id.length > 128 || record.text.length > 2000) {
      return jsonError(reply, 400, 'EQUATION_SIGNAL_INVALID');
    }
    for (const field of ['evidence', 'expected', 'observed'] as const) {
      const value = record[field];
      if (value !== undefined && (typeof value !== 'string' || value.length > 2000)) {
        return jsonError(reply, 400, 'EQUATION_SIGNAL_INVALID', { field });
      }
    }
    if (record.knowledge !== undefined && !KNOWLEDGE.has(String(record.knowledge))) {
      return jsonError(reply, 400, 'EQUATION_SIGNAL_INVALID', { field: 'knowledge' });
    }
    if (record.authority !== undefined && !AUTHORITY.has(String(record.authority))) {
      return jsonError(reply, 400, 'EQUATION_SIGNAL_INVALID', { field: 'authority' });
    }
    if (record.requiredAuthority !== undefined && !AUTHORITY.has(String(record.requiredAuthority))) {
      return jsonError(reply, 400, 'EQUATION_SIGNAL_INVALID', { field: 'requiredAuthority' });
    }

    const signal: EcosystemSignal = {
      id: record.id,
      text: record.text,
      evidence: typeof record.evidence === 'string' ? record.evidence : undefined,
      expected: typeof record.expected === 'string' ? record.expected : undefined,
      observed: typeof record.observed === 'string' ? record.observed : undefined,
      knowledge: record.knowledge as EquationKnowledge | undefined,
      authority: record.authority as EquationAuthority | undefined,
      requiredAuthority: record.requiredAuthority as EquationAuthority | undefined,
      evidenceScope: 'CALLER_SUPPLIED',
    };
    const step = evaluateEcosystemEquation(signal, []);
    return {
      success: true,
      step,
      memory: step.hash ? [step.hash] : [],
      evidenceScope: 'CALLER_SUPPLIED',
      boundary: EQUATION_BOUNDARY,
    };
  });
}
