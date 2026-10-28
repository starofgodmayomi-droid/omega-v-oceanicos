/**
 * Ω∞v Knowledge Envelope Route
 * ─────────────────────────────────────────────────────────────
 * Exposes the fail-closed cross-system knowledge envelope validator
 * and schema parameters across Notion, GitHub, runtime, and human boundaries.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  validateKnowledgeEnvelope,
  KNOWLEDGE_KINDS,
  KNOWLEDGE_STATES,
  KNOWLEDGE_VISIBILITIES,
  type KnowledgeEnvelope,
  type KnowledgeEnvelopeResult,
} from '@oceanicos/mini';

export interface KnowledgeEnvelopeSchemaResponse {
  success: true;
  contract: 'Ω∞v-KNOWLEDGE-ENVELOPE-V4';
  steward: 'did:omega:human:starofgodmayomi';
  kinds: readonly string[];
  states: readonly string[];
  visibilities: readonly string[];
  invariants: {
    failClosed: true;
    forbidsRawSourceLeaks: true;
    forbidsAuthorityShapedFields: true;
    freezesArrays: true;
    structureAndDisclosureOnly: true;
  };
}

export function registerKnowledgeRoute(fastify: FastifyInstance): void {
  // 1. GET /v1/knowledge/envelope/schema
  fastify.get('/v1/knowledge/envelope/schema', async () => {
    const response: KnowledgeEnvelopeSchemaResponse = {
      success: true,
      contract: 'Ω∞v-KNOWLEDGE-ENVELOPE-V4',
      steward: 'did:omega:human:starofgodmayomi',
      kinds: KNOWLEDGE_KINDS,
      states: KNOWLEDGE_STATES,
      visibilities: KNOWLEDGE_VISIBILITIES,
      invariants: {
        failClosed: true,
        forbidsRawSourceLeaks: true,
        forbidsAuthorityShapedFields: true,
        freezesArrays: true,
        structureAndDisclosureOnly: true,
      },
    };
    return response;
  });

  // 2. POST /v1/knowledge/envelope/validate
  fastify.post('/v1/knowledge/envelope/validate', async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = request.body;
    const result: KnowledgeEnvelopeResult = validateKnowledgeEnvelope(payload);

    if (result.validation === 'INVALID') {
      return reply.status(400).send({
        success: false,
        validation: result.validation,
        publicExportAllowed: result.publicExportAllowed,
        evidence: result.evidence,
        issues: result.issues,
      });
    }

    return {
      success: true,
      validation: result.validation,
      publicExportAllowed: result.publicExportAllowed,
      evidence: result.evidence,
      envelope: result.envelope,
      issues: result.issues,
    };
  });
}
