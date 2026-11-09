/**
 * THE OMNICOS over HTTP — one intent in, one receipt out.
 *
 *   POST /v1/omnios/intent   { intent, authorityLevel? }
 *
 * The answer is exactly the zero-filler receipt declared by the entity:
 * entity, tool_used, status, game_detected, phase_t, evidence_hash, action,
 * next_delta. A trap intent answers 200 with `DIVERGENT` — a verdict, not an
 * HTTP failure. Only a VERIFIED receipt is appended to the KAI ledger, and
 * the pass never executes a repository operation. A BROWSER intent is the one
 * network read: the omnios package fetches the public URL named in the intent.
 */
import type { FastifyInstance } from 'fastify';
import { OMNICOS_ENTITY, runOmnicosPass, type OmnicosReceipt } from '@oceanicos/omnios';
import type { KaiMemoryStore } from './kai-memory.js';
import type { JsonError, PreHandler } from './repo-access.js';

export const OMNICOS_ROUTE_CONTRACT = 'omnios-intent.v1';

const MAX_INTENT_LENGTH = 2000;
const BODY_FIELDS = new Set(['intent', 'authorityLevel']);

export interface OmnicosRouteOptions {
  requireReadAccess: PreHandler;
  jsonError: JsonError;
  store: KaiMemoryStore;
}

const bodyObject = (body: unknown): Record<string, unknown> | null =>
  body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null;

export function registerOmnicosRoute(fastify: FastifyInstance, options: OmnicosRouteOptions): void {
  const handler = async (request: any, reply: any) => {
    const body = bodyObject(request.body);
    if (!body) return options.jsonError(reply, 400, 'INTENT_REQUIRED');

    const unknownField = Object.keys(body).find((key) => !BODY_FIELDS.has(key));
    if (unknownField) return options.jsonError(reply, 400, 'UNSUPPORTED_FIELDS', { field: unknownField });

    const intent = typeof body.intent === 'string' ? body.intent.trim() : '';
    if (!intent) return options.jsonError(reply, 400, 'INTENT_REQUIRED');
    if (intent.length > MAX_INTENT_LENGTH) {
      return options.jsonError(reply, 400, 'INTENT_TOO_LONG', { maxLength: MAX_INTENT_LENGTH });
    }

    const pass = await runOmnicosPass({ intent, authorityLevel: body.authorityLevel });
    const receipt: OmnicosReceipt = pass.receipt;

    // 4 — EVOLVE & REMEMBER: only what OMEGA verified enters the KAI ledger.
    if (receipt.status === 'VERIFIED' && receipt.evidence_hash) {
      options.store.remember({ intent, evidenceHash: receipt.evidence_hash, status: receipt.status });
    }

    return reply.status(200).send(receipt);
  };

  // `/api/*` is the Vite proxy path (it strips the prefix); `/v1/*` is the
  // published contract; the bare `/omnios/intent` mirrors `/execute`.
  for (const path of ['/v1/omnios/intent', '/api/omnios/intent', '/omnios/intent']) {
    fastify.post(path, { preHandler: options.requireReadAccess }, handler);
  }
}

export const OMNICOS_CONTRACT = { entity: OMNICOS_ENTITY, route: OMNICOS_ROUTE_CONTRACT };
