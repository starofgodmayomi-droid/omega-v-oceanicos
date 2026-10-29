/**
 * ELION — the hands: bounded execution against a model provider.
 *
 * ELION does not decide whether an answer is true and it does not remember
 * anything. It produces one completion, or it throws, and the caller decides
 * what an absent completion means (the Invisible Computer answers UNKNOWN).
 */
import type { LlmCompletion } from './types.js';

export type { LlmCompletion };

export type ProviderConfig = {
  provider: 'anthropic' | 'openai';
  key: string;
  url: string;
  model: string;
};

export function resolveLlmProvider(env: NodeJS.ProcessEnv = process.env): ProviderConfig | null {
  const preferred = (env.OMEGA_LLM_PROVIDER ?? '').trim().toLowerCase();
  const anthropicKey = env.ANTHROPIC_API_KEY?.trim();
  const openaiKey = env.OPENAI_API_KEY?.trim();
  const anthropic: ProviderConfig | null = anthropicKey
    ? {
        provider: 'anthropic',
        key: anthropicKey,
        url: 'https://api.anthropic.com/v1/messages',
        model: env.OMEGA_LLM_MODEL?.trim() || 'claude-sonnet-4-20250514',
      }
    : null;
  const openai: ProviderConfig | null = openaiKey
    ? {
        provider: 'openai',
        key: openaiKey,
        url: 'https://api.openai.com/v1/chat/completions',
        model: env.OMEGA_LLM_MODEL?.trim() || 'gpt-4o-mini',
      }
    : null;
  if (preferred === 'anthropic') return anthropic;
  if (preferred === 'openai') return openai;
  return anthropic ?? openai;
}

export async function completeWithConfiguredProvider(
  input: { intent: string; constitution: string },
  fetchImpl: typeof fetch = fetch
): Promise<{ text: string; provider: string }> {
  const config = resolveLlmProvider();
  if (!config) throw new Error('LLM_NOT_CONFIGURED');

  const timeoutMs = Number(process.env.OMEGA_LLM_TIMEOUT_MS ?? 20_000);
  const anthropic = config.provider === 'anthropic';
  const response = await fetchImpl(config.url, {
    method: 'POST',
    headers: anthropic
      ? {
          'content-type': 'application/json',
          'x-api-key': config.key,
          'anthropic-version': '2023-06-01',
        }
      : {
          'content-type': 'application/json',
          authorization: `Bearer ${config.key}`,
        },
    body: JSON.stringify(
      anthropic
        ? {
            model: config.model,
            max_tokens: 1_024,
            system: input.constitution,
            messages: [{ role: 'user', content: input.intent }],
          }
        : {
            model: config.model,
            messages: [
              { role: 'system', content: input.constitution },
              { role: 'user', content: input.intent },
            ],
          }
    ),
    signal: AbortSignal.timeout(Number.isFinite(timeoutMs) ? timeoutMs : 20_000),
  });

  if (!response.ok) throw new Error(`LLM_HTTP_${response.status}`);
  const payload: any = await response.json();
  const text = anthropic
    ? Array.isArray(payload?.content)
      ? payload.content
          .filter((block: any) => block?.type === 'text' && typeof block.text === 'string')
          .map((block: any) => block.text)
          .join('\n')
      : ''
    : typeof payload?.choices?.[0]?.message?.content === 'string'
      ? payload.choices[0].message.content
      : '';
  if (!text.trim()) throw new Error('LLM_EMPTY_RESPONSE');
  return { text, provider: config.provider };
}
