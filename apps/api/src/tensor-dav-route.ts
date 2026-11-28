import type { FastifyInstance } from 'fastify';
import { createTensorDav, isTensorDavSize } from '@oceanicos/verification';

type ReplyLike = {
  header: (name: string, value: string) => ReplyLike;
  status: (code: number) => { send: (body: unknown) => unknown };
};

function resolveVerifiedTensor(rawSize: string, reply: ReplyLike) {
  const size = Number(rawSize);
  if (!/^(4|6|8)$/.test(rawSize) || !isTensorDavSize(size)) {
    return {
      errorResponse: reply.status(400).send({
        success: false,
        status: 'UNKNOWN',
        error: 'UNKNOWN_TENSOR_SIZE',
        allowedSizes: [4, 6, 8],
      }),
    };
  }

  const result = createTensorDav(size);
  if (result.status !== 'VERIFIED') {
    return {
      errorResponse: reply.status(422).send({
        success: false,
        status: 'DIVERGENT',
        error: 'TENSOR_INVARIANT_DIVERGENCE',
        issues: result.issues,
      }),
    };
  }

  return { size, result };
}

export function registerTensorDavRoutes(fastify: FastifyInstance): void {
  const handler = async (request: { params: { size: string } }, reply: ReplyLike) => {
    const resolved = resolveVerifiedTensor(request.params.size, reply);
    if ('errorResponse' in resolved) return resolved.errorResponse;
    const { result } = resolved;
    return reply.status(200).send({ success: true, status: 'VERIFIED', ...result.payload, sha256: result.sha256 });
  };

  const exportHandler = async (
    request: { params: { size: string }; query?: { format?: string } },
    reply: ReplyLike,
  ) => {
    const resolved = resolveVerifiedTensor(request.params.size, reply);
    if ('errorResponse' in resolved) return resolved.errorResponse;
    const { size, result } = resolved;
    const format = String(request.query?.format ?? 'json').toLowerCase();

    if (format === 'csv') {
      const header = `# DAV Tensor N=${size} | Checksum=${result.payload.invariants.checksum} | SHA256=${result.sha256}`;
      const rows = result.payload.values.map((row: number[]) => row.join(','));
      return reply
        .header('content-type', 'text/csv; charset=utf-8')
        .header('content-disposition', `attachment; filename="dav-tensor-n${size}.csv"`)
        .status(200)
        .send([header, ...rows].join('\n'));
    }

    return reply
      .header('content-type', 'application/json; charset=utf-8')
      .header('content-disposition', `attachment; filename="dav-tensor-n${size}.json"`)
      .status(200)
      .send({
        success: true,
        status: 'VERIFIED',
        exportedAt: new Date().toISOString(),
        formula: 'T[i,j,k,l] = i+j+k+l',
        expectedChecksumFormula: '2N^4(N-1)',
        ...result.payload,
        sha256: result.sha256,
      });
  };

  fastify.get<{ Params: { size: string } }>('/tensor/:size', handler);
  fastify.get<{ Params: { size: string } }>('/api/tensor/:size', handler);
  fastify.get<{ Params: { size: string }; Querystring: { format?: string } }>('/tensor/:size/export', exportHandler);
  fastify.get<{ Params: { size: string }; Querystring: { format?: string } }>('/api/tensor/:size/export', exportHandler);
}
