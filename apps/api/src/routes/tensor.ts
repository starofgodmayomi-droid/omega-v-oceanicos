import type { FastifyInstance } from 'fastify';
import {
  KaiDivergenceError,
  KaiUnknownError,
  KAI_TENSOR_SIZES,
  isKaiTensorSize,
  verifyAndAttestDav,
  type KaiTensorCandidate,
} from '@oceanicos/verification';

const companionBaseUrl = () => (process.env.KAI_COMPANION_URL || 'http://127.0.0.1:8088').replace(/\/$/, '');

type TensorParams = { size: string };

type ReplyLike = { status: (code: number) => { send: (body: unknown) => unknown } };

function errorBody(status: 'UNKNOWN' | 'DIVERGENT', error: string, extra: Record<string, unknown> = {}) {
  return { success: false, status, error, ...extra };
}

async function fetchCompanion(size: number): Promise<KaiTensorCandidate> {
  const response = await fetch(`${companionBaseUrl()}/tensor/${size}`, {
    signal: AbortSignal.timeout(Number(process.env.KAI_COMPANION_TIMEOUT_MS || 3_000)),
    headers: { accept: 'application/json' },
  });
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new KaiUnknownError('companion returned invalid JSON');
  }
  if (!response.ok) {
    const status = body && typeof body === 'object' ? (body as Record<string, unknown>).status : undefined;
    if (status === 'DIVERGENT') throw new KaiDivergenceError(['companion reported checksum divergence']);
    throw new KaiUnknownError(`companion returned HTTP ${response.status}`);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new KaiUnknownError('companion evidence is not an object');
  return body as KaiTensorCandidate;
}

export function registerTensorRoutes(fastify: FastifyInstance): void {
  const handler = async (request: { params: TensorParams }, reply: ReplyLike) => {
    const rawSize = request.params.size;
    const size = Number(rawSize);
    if (!/^(4|6|8)$/.test(rawSize) || !isKaiTensorSize(size)) {
      return reply.status(400).send(errorBody('UNKNOWN', 'UNKNOWN_TENSOR_SIZE', { allowedSizes: [...KAI_TENSOR_SIZES] }));
    }

    let candidate: KaiTensorCandidate;
    try {
      candidate = await fetchCompanion(size);
    } catch (error) {
      if (error instanceof KaiDivergenceError) {
        return reply.status(422).send(errorBody('DIVERGENT', 'COMPANION_TENSOR_DIVERGENT', { issues: error.issues }));
      }
      return reply.status(503).send(errorBody('UNKNOWN', 'COMPANION_OFFLINE', {
        message: error instanceof Error ? error.message : 'companion evidence unavailable',
      }));
    }

    try {
      const verified = verifyAndAttestDav(candidate);
      return reply.status(200).send({
        success: true,
        status: 'VERIFIED',
        schema: 'omega.tensor-dav.v1',
        size: verified.size,
        projection: {
          rows: size ** 2,
          columns: size ** 2,
          rowCoordinate: 'i * N + j',
          columnCoordinate: 'k * N + l',
        },
        values: verified.values,
        invariants: {
          min: 0,
          max: 4 * (size - 1),
          mean: 2 * (size - 1),
          checksum: verified.checksum,
        },
        checksum: verified.checksum,
        sha256: verified.sha256,
        receipt: verified.receipt,
      });
    } catch (error) {
      if (error instanceof KaiDivergenceError) {
        return reply.status(422).send(errorBody('DIVERGENT', 'TENSOR_VERIFICATION_FAILED', { issues: error.issues }));
      }
      return reply.status(503).send(errorBody('UNKNOWN', 'ATTESTATION_UNAVAILABLE', {
        message: error instanceof Error ? error.message : 'receipt could not be written',
      }));
    }
  };

  fastify.get<{ Params: TensorParams }>('/tensor/:size', handler);
  fastify.get<{ Params: TensorParams }>('/api/tensor/:size', handler);
}
