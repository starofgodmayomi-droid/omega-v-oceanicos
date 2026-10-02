import type { FastifyInstance } from 'fastify';
import {
  createValueNavigatorProposal,
  observeValueNavigatorProposal,
  type ValueNavigatorStore,
} from '@oceanicos/mini';

type JsonError = (reply: any, status: number, error: string, extra?: Record<string, unknown>) => unknown;

const proposalFields = new Set([
  'subject', 'intent', 'stateBefore', 'expectedOutcome', 'beneficiary', 'evidence',
  'valuePotentialScore', 'valuePotentialBasis', 'attributedTo',
]);
const observationFields = new Set(['observedOutcome', 'source', 'evidence', 'error']);
const MAX_LIST_ENTRIES = 200;

function parseObject(body: unknown): Record<string, unknown> | null {
  return body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : null;
}

function hasUnsupportedFields(body: Record<string, unknown>, allowed: Set<string>): boolean {
  return Object.keys(body).some((field) => !allowed.has(field));
}

function hasInvalidTypes(body: Record<string, unknown>, stringFields: readonly string[]): boolean {
  return stringFields.some((field) => body[field] !== undefined && typeof body[field] !== 'string');
}

function storeFailure(reply: any, jsonError: JsonError, error: unknown): unknown {
  const message = String((error as Error)?.message ?? error);
  if (/integrity|capacity exhausted/i.test(message)) {
    return jsonError(reply, 503, 'VALUE_NAVIGATOR_STORE_UNAVAILABLE');
  }
  throw error;
}

export function registerValueNavigatorRoute(
  fastify: FastifyInstance,
  store: ValueNavigatorStore,
  jsonError: JsonError,
): void {
  fastify.get('/v1/value-navigator/proposals', async (_request, reply) => {
    if (!store.verifyIntegrity()) return jsonError(reply, 503, 'VALUE_NAVIGATOR_JOURNAL_INTEGRITY_DEGRADED');
    const allEntries = store.all();
    const entries = allEntries.slice(-MAX_LIST_ENTRIES);
    return {
      success: true,
      entries,
      total: allEntries.length,
      truncated: allEntries.length > entries.length,
      integrity: 'verified-local-hash-chain',
    };
  });

  fastify.get('/v1/value-navigator/proposals/:proposalId', async (request: any, reply) => {
    if (!store.verifyIntegrity()) return jsonError(reply, 503, 'VALUE_NAVIGATOR_JOURNAL_INTEGRITY_DEGRADED');
    const proposalId = typeof request.params?.proposalId === 'string' ? request.params.proposalId : '';
    const entries = store.history(proposalId);
    if (!entries.length || entries[0].phase !== 'PROPOSAL') return jsonError(reply, 404, 'VALUE_NAVIGATOR_PROPOSAL_NOT_FOUND');
    return { success: true, proposalId, entries };
  });

  fastify.post('/v1/value-navigator/proposals', async (request: any, reply) => {
    if (!store.verifyIntegrity()) return jsonError(reply, 503, 'VALUE_NAVIGATOR_JOURNAL_INTEGRITY_DEGRADED');
    const body = parseObject(request.body);
    if (!body) return jsonError(reply, 400, 'INVALID_VALUE_NAVIGATOR_PROPOSAL');
    if (hasUnsupportedFields(body, proposalFields)) {
      return jsonError(reply, 400, 'PROPOSAL_CANNOT_SET_DECISION_AUTHORITY_OR_STATUS');
    }
    if (hasInvalidTypes(body, ['subject', 'intent', 'stateBefore', 'expectedOutcome', 'beneficiary', 'valuePotentialBasis', 'attributedTo'])) {
      return jsonError(reply, 400, 'INVALID_VALUE_NAVIGATOR_PROPOSAL_FIELDS');
    }
    if (body.evidence !== undefined && (!Array.isArray(body.evidence) || body.evidence.some((item) => typeof item !== 'string'))) {
      return jsonError(reply, 400, 'INVALID_VALUE_NAVIGATOR_EVIDENCE');
    }
    if (body.valuePotentialScore !== undefined && typeof body.valuePotentialScore !== 'number') {
      return jsonError(reply, 400, 'INVALID_VALUE_POTENTIAL_HYPOTHESIS');
    }

    let draft;
    try {
      draft = createValueNavigatorProposal({
        subject: body.subject as string,
        intent: body.intent as string,
        stateBefore: body.stateBefore as string,
        expectedOutcome: body.expectedOutcome as string,
        beneficiary: body.beneficiary as string | undefined,
        evidence: body.evidence as string[] | undefined,
        valuePotentialScore: body.valuePotentialScore as number | undefined,
        valuePotentialBasis: body.valuePotentialBasis as string | undefined,
        attributedTo: body.attributedTo as string | undefined,
      });
    } catch (error) {
      return jsonError(reply, 400, 'VALUE_NAVIGATOR_PROPOSAL_REJECTED', { message: String((error as Error)?.message ?? error) });
    }
    try {
      const entry = store.append(draft);
      return reply.code(201).send({ success: true, entry });
    } catch (error) {
      return storeFailure(reply, jsonError, error);
    }
  });

  fastify.post('/v1/value-navigator/proposals/:proposalId/observe', async (request: any, reply) => {
    if (!store.verifyIntegrity()) return jsonError(reply, 503, 'VALUE_NAVIGATOR_JOURNAL_INTEGRITY_DEGRADED');
    const body = parseObject(request.body ?? {});
    if (!body) return jsonError(reply, 400, 'INVALID_VALUE_NAVIGATOR_OBSERVATION');
    if (hasUnsupportedFields(body, observationFields)) {
      return jsonError(reply, 400, 'OBSERVATION_CANNOT_SET_DECISION_AUTHORITY_OR_STATUS');
    }
    if (hasInvalidTypes(body, ['observedOutcome', 'source', 'evidence', 'error'])) {
      return jsonError(reply, 400, 'INVALID_VALUE_NAVIGATOR_OBSERVATION_FIELDS');
    }
    const proposalId = typeof request.params?.proposalId === 'string' ? request.params.proposalId : '';
    const history = store.history(proposalId);
    const proposal = history.find((entry) => entry.phase === 'PROPOSAL');
    const previousEntry = history.at(-1);
    if (!proposal || !previousEntry) return jsonError(reply, 404, 'VALUE_NAVIGATOR_PROPOSAL_NOT_FOUND');

    let draft;
    try {
      draft = observeValueNavigatorProposal(proposal, previousEntry, {
        observedOutcome: body.observedOutcome as string | undefined,
        source: body.source as string | undefined,
        evidence: body.evidence as string | undefined,
        error: body.error as string | undefined,
      });
    } catch (error) {
      return jsonError(reply, 400, 'VALUE_NAVIGATOR_OBSERVATION_REJECTED', { message: String((error as Error)?.message ?? error) });
    }
    try {
      const entry = store.append(draft);
      return reply.code(201).send({ success: true, entry, history: store.history(proposalId) });
    } catch (error) {
      return storeFailure(reply, jsonError, error);
    }
  });
}
