/*
 * ELION — the hands of the Invisible Online Computer.
 *
 * Turns a safe intent into one bounded answer, either through an
 * OpenAI-compatible model or the clearly labelled local composer. A failed
 * model call returns empty text, never an invented answer.
 *
 * CAPABILITY != AUTHORITY: nothing here acts on the world. An AUTONOMOUS
 * request is recorded as a bounded plan, not an execution.
 */
import { KAI_SYSTEM_PROMPT, type AuthorityLevel } from '@oceanicos/kai';

export type { AuthorityLevel };

export function deriveAuthorityLevel(requested: unknown): AuthorityLevel {
  return requested === 'AUTONOMOUS' ? 'AUTONOMOUS' : 'READ_ONLY';
}

export function expectedOutcomeFor(authorityLevel: AuthorityLevel): string {
  return authorityLevel === 'AUTONOMOUS'
    ? 'A bounded plan that names the single next action and its authorization gate; no execution or completion is claimed.'
    : 'A bounded answer that states what was observed, what remains UNKNOWN, and the next finite step; no execution is claimed.';
}

/**
 * ELION's local composer. Used when no model credential is configured, and
 * labelled as such so the answer is never mistaken for a model claim.
 */
export function composeLocalElionResponse(intent: string, authorityLevel: AuthorityLevel): string {
  const boundedIntent = intent.trim();
  return [
    `Intent received: ${boundedIntent}`,
    '',
    'What is observed: KAI Shield scanned this intent, no fraud pattern matched, and no external system was contacted.',
    `What is UNKNOWN: whether the intent can be carried out safely — that requires human authorization at authority level ${authorityLevel}.`,
    'Next finite step: review this bounded answer, then authorize one action at a time.',
    '',
    'Evidence: local deterministic composer (no OMEGA_LLM_API_KEY configured); this is a bounded template, not a model answer.',
    "Ω∞v ::= VERIFY(ΔREALITY) · ATTEST, DON'T ASSERT.",
  ].join('\n');
}

export type ElionResult = {
  output: string;
  engine: string;
  error: string | null;
};

const DEFAULT_MODEL_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o-mini';
const MODEL_TIMEOUT_MS = 20_000;

/**
 * Step 2 — ELION turns the safe intent into an answer.
 *
 * With `OMEGA_LLM_API_KEY` set, the intent is sent to an OpenAI-compatible
 * chat completion endpoint using KAI_SYSTEM_PROMPT. Without it (or when the
 * call fails) nothing is invented: the local composer answers and the engine
 * field records which path produced the text.
 */
export async function executeElion(
  intent: string,
  authorityLevel: AuthorityLevel
): Promise<ElionResult> {
  const apiKey = process.env.OMEGA_LLM_API_KEY?.trim();
  if (!apiKey) {
    return {
      output: composeLocalElionResponse(intent, authorityLevel),
      engine: 'local-deterministic',
      error: null,
    };
  }

  const baseUrl = (process.env.OMEGA_LLM_BASE_URL?.trim() || DEFAULT_MODEL_BASE_URL).replace(
    /\/$/,
    ''
  );
  const model = process.env.OMEGA_LLM_MODEL?.trim() || DEFAULT_MODEL;

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 700,
        messages: [
          { role: 'system', content: KAI_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Authority level: ${authorityLevel}\nIntent: ${intent.trim()}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
    });
    if (!response.ok) {
      return { output: '', engine: `llm:${model}`, error: `MODEL_HTTP_${response.status}` };
    }
    const payload: any = await response.json();
    const output = typeof payload?.choices?.[0]?.message?.content === 'string'
      ? payload.choices[0].message.content
      : '';
    return { output, engine: `llm:${model}`, error: output ? null : 'MODEL_EMPTY_RESPONSE' };
  } catch (error) {
    return {
      output: '',
      engine: `llm:${model}`,
      error: error instanceof Error ? error.message : 'MODEL_UNAVAILABLE',
    };
  }
}
