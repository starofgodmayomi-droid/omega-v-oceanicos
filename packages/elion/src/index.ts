import type { AuthorityLevel } from '@oceanicos/kai';

/*
 * ELION — the hands of the Ω∞v body: execution and orchestration.
 *
 * With a model credential it calls an OpenAI-compatible endpoint; without one
 * (or when the call fails) it answers with the labelled local deterministic
 * composer. Nothing is invented, and no run claims a result it did not produce.
 */

/** The persona embedded into every ELION model call. */
export const KAI_SYSTEM_PROMPT = `You are KAI/ELION, operating within the Ω∞v OCEANICOS ecosystem.
Your core law: \`Ω∞v ::= VERIFY(ΔREALITY)\`.
Your doctrine: \`ATTEST, DON'T ASSERT. UNKNOWN PRESERVED. NO FABRICATED COMPLETION.\`
You are bound by the Non-Collapse Rules: \`MEMORY != PROOF\`, \`CAPABILITY != AUTHORITY\`, \`PLAN != EXECUTION\`.
Do not hallucinate. If you do not know the answer, state \`UNKNOWN\`.
You speak with human empathy and cultural warmth (Nigerian Pidgin: 'Pidgin fit carry the warmth; evidence go carry the claim'), but you only claim what is mathematically and observably true.`;

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

/**
 * Phase 2 — the LUCID gate. Returned instead of executing when the intent names
 * an irreversible action: it asks for authorization and claims nothing.
 */
export function composeApprovalRequest(intent: string, matchedLabels: string[]): string {
  return [
    `Intent received: ${intent.trim()}`,
    '',
    `LUCID gate: this intent names ${matchedLabels.join(', ')} — an action OMEGA cannot undo after the fact.`,
    'Nothing was executed, deployed, deleted, or paid.',
    'Authorization required: confirm this single action explicitly — its target, its limit, and the evidence that would prove it worked — before ELION proceeds.',
    'Ω∞v ::= VERIFY(ΔREALITY) · CAPABILITY != AUTHORITY.',
  ].join('\n');
}

/** A recorded human authorization for one paused irreversible intent. */
export type HumanAuthorization = { id: string; decidedAt: string };

/**
 * Phase 3 on resume — ELION's local composer after a human authorized the
 * paused action. It repeats the authorization and still claims no result.
 */
export function composeAuthorizedLocalResponse(
  intent: string,
  authorization: HumanAuthorization
): string {
  return [
    `Intent received: ${intent.trim()}`,
    '',
    `Human authorization: approval ${authorization.id} was granted at ${authorization.decidedAt} for this single action.`,
    'What is observed: KAI Shield found no fraud pattern, and this runtime holds no tool that can move funds, delete data, or deploy — nothing left the sandbox.',
    'What is UNKNOWN: the real-world effect of the action until the system that owns it returns its own evidence.',
    'Next finite step: carry out the one authorized action there, then attest its outcome back to KAI with that evidence.',
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
  authorityLevel: AuthorityLevel,
  authorization?: HumanAuthorization
): Promise<ElionResult> {
  const apiKey = process.env.OMEGA_LLM_API_KEY?.trim();
  if (!apiKey) {
    return {
      output: authorization
        ? composeAuthorizedLocalResponse(intent, authorization)
        : composeLocalElionResponse(intent, authorityLevel),
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
    const output =
      typeof payload?.choices?.[0]?.message?.content === 'string'
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
