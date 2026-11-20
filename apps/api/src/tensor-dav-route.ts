import type { FastifyInstance } from 'fastify';
import { createTensorDav, isTensorDavSize } from '@oceanicos/verification';

export function registerTensorDavRoutes(fastify: FastifyInstance): void {
  const handler = async (request: { params: { size: string } }, reply: { status: (code: number) => { send: (body: unknown) => unknown } }) => {
    const size = Number(request.params.size);
    if (!/^(4|6|8)$/.test(request.params.size) || !isTensorDavSize(size)) {
      return reply.status(400).send({
        success: false,
        status: 'UNKNOWN',
        error: 'UNKNOWN_TENSOR_SIZE',
        allowedSizes: [4, 6, 8],
      });
    }

    const result = createTensorDav(size);
    if (result.status !== 'VERIFIED') {
      return reply.status(422).send({
        success: false,
        status: 'DIVERGENT',
        error: 'TENSOR_INVARIANT_DIVERGENCE',
        issues: result.issues,
      });
    }

    return reply.status(200).send({ success: true, status: 'VERIFIED', ...result.payload, sha256: result.sha256 });
  };

  fastify.get<{ Params: { size: string } }>('/tensor/:size', handler);
}
