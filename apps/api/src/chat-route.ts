import type { FastifyInstance } from 'fastify';

const OLLAMA_TIMEOUT_MS = 3000;
const OLLAMA_BASE_URL = () => (process.env.OLLAMA_URL?.trim() || 'http://127.0.0.1:11434').replace(/\/$/, '');
const OLLAMA_MODEL = () => process.env.OLLAMA_MODEL?.trim() || 'qwen2.5:0.5b';

export async function checkOllamaHealth(): Promise<'OBSERVED' | 'UNKNOWN'> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL()}/api/tags`, { signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS) });
    return response.ok ? 'OBSERVED' : 'UNKNOWN';
  } catch {
    return 'UNKNOWN';
  }
}

export function registerChatRoute(fastify: FastifyInstance): void {
  fastify.post('/api/chat/local', async (request, reply) => {
    const body = request.body as { prompt?: unknown } | undefined;
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt || prompt.length > 4000) {
      return reply.status(400).send({ status: 'DIVERGENT', reason: 'prompt must be a non-empty string of at most 4000 characters' });
    }

    try {
      const response = await fetch(`${OLLAMA_BASE_URL()}/api/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: OLLAMA_MODEL(), prompt, stream: false }),
        signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS),
      });
      if (!response.ok) return reply.status(503).send({ status: 'UNKNOWN', reason: `Ollama returned HTTP ${response.status}` });
      const payload = await response.json() as { response?: unknown; model?: unknown };
      if (typeof payload.response !== 'string' || !payload.response.trim()) {
        return reply.status(503).send({ status: 'UNKNOWN', reason: 'Ollama returned no usable response' });
      }
      return { status: 'OBSERVED', model: typeof payload.model === 'string' ? payload.model : OLLAMA_MODEL(), response: payload.response, evidenceBoundary: 'local Ollama response observed; not independently verified as external reality' };
    } catch (error) {
      return reply.status(503).send({ status: 'UNKNOWN', reason: `Ollama unavailable: ${error instanceof Error ? error.message : 'request failed'}` });
    }
  });
}
