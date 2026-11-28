import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { RememberEngine } from '@oceanicos/remember';

const BANNED_BRAND_TERMS = ['guarantee', 'miracle', 'cure', 'free money'] as const;
const MARKET_PATTERN = /^[A-Z]{2}$/;
const IDENTIFIER_PATTERN = /^[a-z0-9][a-z0-9_-]{2,63}$/;
const MAX_CANDIDATE_TEXT = 4_000;
const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434';
const DEFAULT_OLLAMA_MODEL = 'qwen2.5:0.5b';

type EntitySyncRequest = {
  product_id: string;
  target_market: string;
  brand_dna_id: string;
  candidate_text?: string;
};

type Reply = {
  status: (code: number) => { send: (body: unknown) => unknown };
  send: (body: unknown) => unknown;
};

type OllamaFetch = typeof fetch;

type OllamaResult =
  | { ok: true; text: string; model: string; endpoint: string }
  | { ok: false; error: string; code: 'OLLAMA_UNAVAILABLE' | 'OLLAMA_INVALID_RESPONSE' | 'OLLAMA_OUTPUT_INVALID' };

function sha256(value: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validateRequest(body: unknown): { request?: EntitySyncRequest; error?: string } {
  if (!isRecord(body)) return { error: 'REQUEST_BODY_MUST_BE_AN_OBJECT' };
  const allowed = new Set(['product_id', 'target_market', 'brand_dna_id', 'candidate_text']);
  const unknown = Object.keys(body).find((key) => !allowed.has(key));
  if (unknown) return { error: `UNKNOWN_FIELD:${unknown}` };

  for (const field of ['product_id', 'target_market', 'brand_dna_id']) {
    if (typeof body[field] !== 'string' || body[field].trim() === '') return { error: `INVALID_REQUIRED_FIELD:${field}` };
  }
  if (body.candidate_text !== undefined && typeof body.candidate_text !== 'string') {
    return { error: 'INVALID_OPTIONAL_FIELD:candidate_text' };
  }

  const request = {
    product_id: body.product_id as string,
    target_market: body.target_market as string,
    brand_dna_id: body.brand_dna_id as string,
    ...(body.candidate_text === undefined ? {} : { candidate_text: body.candidate_text as string }),
  };
  if (!MARKET_PATTERN.test(request.target_market)) return { error: 'INVALID_TARGET_MARKET' };
  if (!IDENTIFIER_PATTERN.test(request.product_id)) return { error: 'INVALID_PRODUCT_ID' };
  if (!IDENTIFIER_PATTERN.test(request.brand_dna_id)) return { error: 'INVALID_BRAND_DNA_ID' };
  if (request.candidate_text && request.candidate_text.length > MAX_CANDIDATE_TEXT) return { error: 'CANDIDATE_TEXT_TOO_LONG' };
  return { request };
}

function findBannedTerm(text: string): string | undefined {
  const normalized = text.toLocaleLowerCase('en-US');
  return BANNED_BRAND_TERMS.find((term) => normalized.includes(term));
}

async function runOllama(
  input: EntitySyncRequest,
  ollamaFetch: OllamaFetch,
  ollamaBaseUrl: string,
  ollamaModel: string,
): Promise<OllamaResult> {
  const endpoint = `${ollamaBaseUrl.replace(/\/$/, '')}/api/generate`;
  const prompt = [
    'Return only localized product copy, with no analysis or markup.',
    `Product ID: ${input.product_id}`,
    `Target market: ${input.target_market}`,
    `Brand DNA ID: ${input.brand_dna_id}`,
    input.candidate_text ? `Source copy: ${input.candidate_text}` : 'Source copy: Prepare a concise local draft.',
  ].join('\n');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await ollamaFetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: ollamaModel, prompt, stream: false }),
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, code: 'OLLAMA_UNAVAILABLE', error: `Ollama returned HTTP ${response.status}` };
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return { ok: false, code: 'OLLAMA_INVALID_RESPONSE', error: 'Ollama response was not valid JSON' };
    }
    if (!isRecord(body) || typeof body.response !== 'string') {
      return { ok: false, code: 'OLLAMA_INVALID_RESPONSE', error: 'Ollama response did not contain a text response' };
    }
    const text = body.response.trim();
    if (!text || text.length > MAX_CANDIDATE_TEXT) {
      return { ok: false, code: 'OLLAMA_OUTPUT_INVALID', error: 'Ollama output was empty or exceeded the bounded text limit' };
    }
    return { ok: true, text, model: ollamaModel, endpoint };
  } catch (error) {
    return { ok: false, code: 'OLLAMA_UNAVAILABLE', error: error instanceof Error ? error.message : 'Ollama request failed' };
  } finally {
    clearTimeout(timeout);
  }
}

export function registerEntitySyncRoutes(
  fastify: FastifyInstance,
  ledgerMemory: RememberEngine,
  options: { ollamaFetch?: OllamaFetch; ollamaBaseUrl?: string; ollamaModel?: string } = {},
): void {
  const ollamaFetch = options.ollamaFetch ?? fetch;
  const ollamaBaseUrl = options.ollamaBaseUrl ?? process.env.OLLAMA_BASE_URL ?? DEFAULT_OLLAMA_URL;
  const ollamaModel = options.ollamaModel ?? process.env.OLLAMA_MODEL ?? DEFAULT_OLLAMA_MODEL;

  fastify.post<{ Body: EntitySyncRequest }>('/v1/entity/sync', async (request, reply: Reply) => {
    const validated = validateRequest(request.body);
    if (!validated.request) {
      return reply.status(400).send({ success: false, status: 'UNKNOWN', error: validated.error, executed: false, ledgerMutation: false });
    }

    const input = validated.request;
    const generated = await runOllama(input, ollamaFetch, ollamaBaseUrl, ollamaModel);
    if (!generated.ok) {
      return reply.status(503).send({
        success: false,
        status: 'UNKNOWN',
        error: generated.code,
        detail: generated.error,
        executed: false,
        ledgerMutation: false,
        externalServicesCalled: [],
        limitation: 'Local Ollama execution was unavailable or did not produce a bounded response.',
      });
    }

    const bannedTerm = findBannedTerm(generated.text);
    const verification = {
      rule: 'LOCAL_BRAND_COPY_BANNED_TERMS',
      status: bannedTerm ? 'DIVERGENT' : 'VERIFIED',
      bannedTerm: bannedTerm ?? null,
      evidence: `sha256:${sha256({ text: generated.text, brandDnaId: input.brand_dna_id, rule: 'LOCAL_BRAND_COPY_BANNED_TERMS' })}`,
    } as const;

    if (bannedTerm) {
      return reply.status(422).send({
        success: false,
        status: 'DIVERGENT',
        error: 'BRAND_RULE_VIOLATION',
        verification,
        executed: true,
        ledgerMutation: false,
        externalServicesCalled: [generated.endpoint],
      });
    }

    const receiptPayload = {
      schema: 'omega.entity-sync.receipt.v1',
      request: input,
      generatedText: generated.text,
      model: generated.model,
      endpoint: generated.endpoint,
      verification,
      executed: true,
    };
    let receipt;
    try {
      receipt = ledgerMemory.appendEntityReceipt(receiptPayload);
    } catch (error) {
      return reply.status(503).send({
        success: false,
        status: 'UNKNOWN',
        error: 'ENTITY_RECEIPT_NOT_WRITTEN',
        detail: error instanceof Error ? error.message : 'entity receipt append failed',
        executed: true,
        ledgerMutation: false,
        externalServicesCalled: [generated.endpoint],
      });
    }

    return reply.status(200).send({
      success: true,
      status: 'VERIFIED',
      product_id: input.product_id,
      target_market: input.target_market,
      brand_dna_id: input.brand_dna_id,
      localized_text: generated.text,
      model: generated.model,
      verification,
      receipt: { index: receipt.index, hash: receipt.hash, previousHash: receipt.previousHash },
      executed: true,
      externalServicesCalled: [generated.endpoint],
      ledgerMutation: true,
      receiptStore: 'remember.entity_receipts',
      limitation: 'Local Ollama execution only; no commerce platform, webhook, deployment, or external cloud service was invoked.',
    });
  });
}
