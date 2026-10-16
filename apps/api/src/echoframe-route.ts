/**
 * 🎨 ECHOFRAME API Route Contract — Expression & Creation Engine.
 *
 * Exposes active workspace template synthesis and concept transition simulation.
 * Invariant: Every generated artifact must be verifiable under Ω∞v ::= VERIFY(ΔREALITY)
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { EchoframeWorkspace, type EchoframeTemplateType, type TemplateOptions } from '@oceanicos/generative';

export function registerEchoframeRoute(fastify: FastifyInstance): void {
  const workspace = new EchoframeWorkspace();

  // GET /v1/echoframe — status contract
  fastify.get('/v1/echoframe', async () => {
    return {
      success: true,
      service: 'ECHOFRAME',
      primitive: 'Expression & Creation',
      status: 'active',
      sanctum: 'HOLY_PLACE',
      equation: 'Ω∞v ::= VERIFY(ΔREALITY)',
      templatesAvailable: workspace.listTemplates().length,
      evaluatedAt: new Date().toISOString(),
    };
  });

  // GET /v1/echoframe/templates — list available templates
  fastify.get('/v1/echoframe/templates', async () => {
    return {
      success: true,
      templates: workspace.listTemplates(),
    };
  });

  // POST /v1/echoframe/generate — synthesize code artifact
  fastify.post('/v1/echoframe/generate', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as {
      type?: EchoframeTemplateType;
      name?: string;
      options?: TemplateOptions;
    }) || {};

    const type = body.type || 'primitive';
    const name = body.name || 'NewComponent';

    const validTypes: EchoframeTemplateType[] = ['primitive', 'route', 'agent', 'contract'];
    if (!validTypes.includes(type)) {
      reply.status(400);
      return {
        success: false,
        error: 'INVALID_TEMPLATE_TYPE',
        message: `Template type '${type}' is invalid. Allowed: ${validTypes.join(', ')}`,
      };
    }

    const artifact = workspace.synthesizeTemplate(type, name, body.options);

    reply.header('x-echoframe-digest', artifact.digest);
    reply.header('x-omega-gate', 'VERIFY_DELTA_REALITY');

    return {
      success: true,
      artifact,
    };
  });

  // POST /v1/echoframe/simulate — simulate concept transition
  fastify.post('/v1/echoframe/simulate', async (request: FastifyRequest) => {
    const body = (request.body as { concept?: string }) || {};
    const concept = body.concept || 'Continuous Fluid-State Matrix Tensor Loop';
    const simulation = workspace.simulateTransition(concept);

    return {
      success: true,
      simulation,
    };
  });
}
