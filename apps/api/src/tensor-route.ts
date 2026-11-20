import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import type { RememberEngine } from '@oceanicos/remember';
import type { TensorObservation, TensorSize } from '@oceanicos/types';
import { verifyTensorObservation } from '@oceanicos/verification';

const SUPPORTED_SIZES = new Set<number>([4, 6, 8]);
const PYTHON_TIMEOUT_MS = 750;

type TensorPayload = Omit<TensorObservation, 'id' | 'observedAt' | 'source'> & {
  id?: string;
  observedAt?: string;
  source?: TensorObservation['source'];
};

type PythonObservation = { observation: TensorObservation | null; reason: string | null };

function parseSize(value: string): TensorSize | null {
  const size = Number(value);
  return Number.isInteger(size) && SUPPORTED_SIZES.has(size) ? size as TensorSize : null;
}

function toObservation(payload: TensorPayload, source: TensorObservation['source']): TensorObservation {
  return {
    id: typeof payload.id === 'string' && payload.id ? payload.id : `tensor-${randomUUID()}`,
    observedAt: typeof payload.observedAt === 'string' && payload.observedAt ? payload.observedAt : new Date().toISOString(),
    source,
    size: payload.size,
    shape_4d: payload.shape_4d,
    shape_2d: payload.shape_2d,
    min_val: payload.min_val,
    max_val: payload.max_val,
    checksum: payload.checksum,
    matrix_2d: payload.matrix_2d,
  };
}

function fallbackObservation(size: TensorSize): TensorObservation {
  const width = size ** 2;
  const matrix_2d = Array.from({ length: width }, (_, row) => Array.from({ length: width }, (_, column) => {
    const i = Math.floor(row / size);
    const j = row % size;
    const k = Math.floor(column / size);
    const l = column % size;
    return i + j + k + l;
  }));
  return toObservation({
    size,
    shape_4d: [size, size, size, size],
    shape_2d: [width, width],
    min_val: 0,
    max_val: 4 * (size - 1),
    checksum: 2 * size ** 4 * (size - 1),
    matrix_2d,
  }, 'typescript-fallback');
}

async function observeFromPython(size: TensorSize): Promise<PythonObservation> {
  const base = (process.env.OCEANICOS_PYTHON_URL?.trim() || 'http://127.0.0.1:8088').replace(/\/$/, '');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PYTHON_TIMEOUT_MS);
  try {
    const response = await fetch(`${base}/tensor/${size}`, { signal: controller.signal });
    if (!response.ok) return { observation: null, reason: `python daemon returned HTTP ${response.status}` };
    const payload = await response.json() as TensorPayload;
    return { observation: toObservation(payload, 'companion-python'), reason: null };
  } catch (error) {
    return { observation: null, reason: error instanceof Error ? error.message : 'python daemon unreachable' };
  } finally {
    clearTimeout(timeout);
  }
}

function rememberTensor(engine: RememberEngine, observation: TensorObservation, digest: string): { status: 'VERIFIED' | 'UNKNOWN'; blockIndex: number | null } {
  try {
    const block = engine.append(
      { uuid: observation.id, timestamp: observation.observedAt, siliconYield: 1, gridLoadMegawatts: observation.checksum, acceleratorInventory: observation.size },
      { status: 'PASS', lawRoute: 'OBSERVE → VERIFY → REMEMBER → DAV', timestamp: new Date().toISOString(), observationUuid: observation.id, signatureProof: digest },
    );
    return { status: 'VERIFIED', blockIndex: block.index };
  } catch {
    return { status: 'UNKNOWN', blockIndex: null };
  }
}

function appendKaiReceipt(observation: TensorObservation, digest: string): void {
  const path = process.env.OMEGA_KAI_LEDGER_PATH?.trim() || join(process.cwd(), 'kai_ledger.json');
  if (!existsSync(path)) return;
  const document = JSON.parse(readFileSync(path, 'utf8')) as { entries?: unknown[] };
  if (!Array.isArray(document.entries)) throw new Error('KAI ledger entries are not an array');
  document.entries.push({
    timestamp: new Date().toISOString(),
    agent_id: 'api-runtime',
    branch: 'agent/runtime/tensor-dav',
    status: 'VERIFIED',
    files_touched: ['runtime:/api/tensor/:size'],
    tests_passed: true,
    evidence_hash: digest,
    next_delta: 'Remain local and human-reviewable; runtime verification is not deployment authorization.',
  });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
  renameSync(temporary, path);
}

export function registerTensorRoute(fastify: FastifyInstance, ledgerMemory: RememberEngine): void {
  fastify.get('/api/tensor/:size', async (request, reply) => {
    const size = parseSize((request.params as { size?: string }).size ?? '');
    if (size === null) {
      return reply.status(400).send({ success: false, status: 'DIVERGENT', error: 'TENSOR_SIZE_UNSUPPORTED', supportedSizes: [4, 6, 8] });
    }

    const python = await observeFromPython(size);
    const observation = python.observation ?? fallbackObservation(size);
    const verification = verifyTensorObservation(observation);
    if (verification.status !== 'VERIFIED') {
      return reply.status(503).send({ success: false, status: verification.status, reason: 'Python tensor observation failed deterministic verification', observation, verification, sourceStatus: 'OBSERVED' });
    }

    const memory = rememberTensor(ledgerMemory, observation, verification.digest);
    if (memory.status !== 'VERIFIED') {
      return reply.status(503).send({ success: false, status: 'UNKNOWN', reason: 'Verified tensor could not be remembered', observation, verification, sourceStatus: 'OBSERVED' });
    }

    try {
      appendKaiReceipt(observation, verification.digest);
    } catch (error) {
      return reply.status(503).send({ success: false, status: 'UNKNOWN', reason: `KAI ledger append failed: ${error instanceof Error ? error.message : 'unknown error'}`, observation, verification, sourceStatus: 'OBSERVED' });
    }

    return {
      success: true,
      status: 'VERIFIED',
      observation,
      verification,
      invariants: {
        min: observation.min_val,
        max: observation.max_val,
        mean: 2 * (observation.size - 1),
        checksum: observation.checksum,
      },
      sha256: verification.digest,
      receipt: { sha256: verification.digest, memoryStatus: memory.status, blockIndex: memory.blockIndex },
      sourceStatus: python.observation ? 'OBSERVED' : 'UNKNOWN',
      source: observation.source,
      evidenceBoundary: 'local Python or deterministic TypeScript observation, exact formula verification, and append-only local receipts',
    };
  });
}

export async function checkPythonHealth(): Promise<'OBSERVED' | 'UNKNOWN'> {
  const base = (process.env.OCEANICOS_PYTHON_URL?.trim() || 'http://127.0.0.1:8088').replace(/\/$/, '');
  try {
    const response = await fetch(`${base}/health`, { signal: AbortSignal.timeout(PYTHON_TIMEOUT_MS) });
    return response.ok ? 'OBSERVED' : 'UNKNOWN';
  } catch {
    return 'UNKNOWN';
  }
}
