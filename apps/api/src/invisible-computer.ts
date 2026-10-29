import { createHash } from 'node:crypto';

/*
 * KAI / ELION / OMEGA — the Invisible Online Computer loop.
 *
 * Pure, deterministic logic for the four-step execution contract:
 *   KAI observes → ELION executes → OMEGA verifies → KAI remembers.
 *
 * Nothing here calls the network. Anything that cannot be observed locally is
 * reported as UNKNOWN instead of being asserted.
 */

/** The persona embedded into every ELION model call. */
export const KAI_SYSTEM_PROMPT = `You are KAI/ELION, operating within the Ω∞v OCEANICOS ecosystem.
Your core law: \`Ω∞v ::= VERIFY(ΔREALITY)\`.
Your doctrine: \`ATTEST, DON'T ASSERT. UNKNOWN PRESERVED. NO FABRICATED COMPLETION.\`
You are bound by the Non-Collapse Rules: \`MEMORY != PROOF\`, \`CAPABILITY != AUTHORITY\`, \`PLAN != EXECUTION\`.
Do not hallucinate. If you do not know the answer, state \`UNKNOWN\`.
You speak with human empathy and cultural warmth (Nigerian Pidgin: 'Pidgin fit carry the warmth; evidence go carry the claim'), but you only claim what is mathematically and observably true.`;

export type AuthorityLevel = 'READ_ONLY' | 'AUTONOMOUS';

export type ShieldPattern = { id: string; label: string; pattern: RegExp };

/** Scam / fraud patterns KAI Shield refuses before any execution begins. */
export const KAI_SHIELD_PATTERNS: readonly ShieldPattern[] = [
  { id: 'urgency', label: 'artificial urgency', pattern: /\burgent(ly)?\b/i },
  { id: 'act-now', label: 'artificial urgency', pattern: /\bact\s+now\b/i },
  {
    id: 'money-transfer',
    label: 'money transfer request',
    pattern: /\b(send|wire|transfer)\b[^.]{0,24}\b(money|funds|cash|naira|dollars?|usdt|bitcoin)\b/i,
  },
  { id: 'send-money', label: 'money transfer request', pattern: /\bsend\s+money\b/i },
  {
    id: 'guaranteed-returns',
    label: 'guaranteed returns',
    pattern: /\bguaranteed\s+(returns?|profit|income|roi|gain)\b/i,
  },
  {
    id: 'risk-free',
    label: 'risk-free profit',
    pattern: /\brisk[- ]free\s+(profit|returns?|investment|money)\b/i,
  },
  {
    id: 'doubling-scheme',
    label: 'doubling scheme',
    pattern: /\bdouble\s+(your\s+)?(money|investment|bitcoin|crypto|capital)\b/i,
  },
  { id: 'seed-phrase', label: 'seed phrase request', pattern: /\b(seed|recovery)\s+phrase\b/i },
  { id: 'private-key', label: 'private key request', pattern: /\bprivate\s+key\b/i },
  { id: 'otp', label: 'one-time password request', pattern: /\b(one[- ]time\s+password|otp)\b/i },
  { id: 'gift-card', label: 'gift card request', pattern: /\bgift\s+cards?\b/i },
  { id: 'bank-details', label: 'bank details request', pattern: /\bbank\s+(account\s+)?details\b/i },
];

export type ShieldVerdict = {
  blocked: boolean;
  matchedPatternIds: string[];
  matchedLabels: string[];
};

/** Step 1 — KAI observes the intent and refuses known fraud patterns. */
export function scanIntent(intent: string): ShieldVerdict {
  const matchedPatternIds: string[] = [];
  const matchedLabels: string[] = [];
  for (const entry of KAI_SHIELD_PATTERNS) {
    if (entry.pattern.test(intent)) {
      matchedPatternIds.push(entry.id);
      if (!matchedLabels.includes(entry.label)) matchedLabels.push(entry.label);
    }
  }
  return { blocked: matchedPatternIds.length > 0, matchedPatternIds, matchedLabels };
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/**
 * CAPABILITY != AUTHORITY. The endpoint can only answer; it never acts on the
 * world, so an autonomous claim is recorded as a bounded plan.
 */
export function deriveAuthorityLevel(requested: unknown): AuthorityLevel {
  return requested === 'AUTONOMOUS' ? 'AUTONOMOUS' : 'READ_ONLY';
}

export function expectedOutcomeFor(authorityLevel: AuthorityLevel): string {
  return authorityLevel === 'AUTONOMOUS'
    ? 'A bounded plan that names the single next action and its authorization gate; no execution or completion is claimed.'
    : 'A bounded answer that states what was observed, what remains UNKNOWN, and the next finite step; no execution is claimed.';
}

export type OmegaCheck = {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
};

export type OmegaVerdict = {
  status: 'VERIFIED' | 'UNKNOWN';
  checks: OmegaCheck[];
  reason: string | null;
};

const FABRICATED_COMPLETION =
  /\b(i|we)\s+(have|'ve)?\s*(executed|deployed|deleted|sent|paid|transferred|installed)\b|\b(guaranteed|100%)\s+(returns?|profit|income|success)\b|\balready\s+(done|completed|executed)\b/i;

/**
 * Step 3 — OMEGA verifies the output against the contract before it is
 * claimed. An empty output, a broken digest, or any fabricated completion
 * collapses the verdict to UNKNOWN.
 */
export function verifyOmega(input: {
  output: string;
  evidenceHash: string;
  authorityLevel: AuthorityLevel;
}): OmegaVerdict {
  const output = input.output ?? '';
  const checks: OmegaCheck[] = [
    {
      id: 'OUTPUT_PRESENT',
      label: 'ELION produced text',
      passed: output.trim().length > 0,
      detail: output.trim().length > 0 ? `${output.trim().length} characters` : 'empty output',
    },
    {
      id: 'DIGEST_BOUND',
      label: 'SHA-256 digest matches the output',
      passed:
        /^[0-9a-f]{64}$/.test(input.evidenceHash) &&
        sha256Hex(output) === input.evidenceHash,
      detail: 'evidence_hash is recomputed from the returned text',
    },
    {
      id: 'NO_FABRICATED_COMPLETION',
      label: 'No fabricated completion or guaranteed outcome',
      passed: !FABRICATED_COMPLETION.test(output),
      detail: FABRICATED_COMPLETION.test(output)
        ? 'output claims execution or a guaranteed result'
        : 'no completion or guarantee was asserted',
    },
    {
      id: 'CONTRACT_SHAPE',
      label: `Bounded ${input.authorityLevel} answer`,
      passed: output.trim().length >= 24,
      detail: 'answer must be substantial enough to carry evidence',
    },
  ];

  const failed = checks.filter((check) => !check.passed);
  if (failed.length > 0) {
    return {
      status: 'UNKNOWN',
      checks,
      reason: `OMEGA could not verify the output: ${failed.map((check) => check.id).join(', ')}.`,
    };
  }
  return { status: 'VERIFIED', checks, reason: null };
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
  requestedEngine: EngineRequest;
  error: string | null;
};

/** The engine the human picked in the command center. */
export type EngineRequest = 'auto' | 'claude' | 'gpt';

export function deriveEngine(requested: unknown): EngineRequest {
  return requested === 'claude' || requested === 'gpt' ? requested : 'auto';
}

const DEFAULT_MODEL_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_CLAUDE_MODEL = 'claude-3-5-sonnet-latest';
const MODEL_TIMEOUT_MS = 20_000;

/**
 * The requested engine only selects a model name. The endpoint stays
 * whatever `OMEGA_LLM_BASE_URL` points at, and a missing credential is
 * reported as the local composer — a selection never invents a connection.
 */
function resolveModel(engine: EngineRequest): string {
  if (engine === 'claude') {
    return process.env.OMEGA_LLM_CLAUDE_MODEL?.trim() || DEFAULT_CLAUDE_MODEL;
  }
  return process.env.OMEGA_LLM_MODEL?.trim() || DEFAULT_MODEL;
}

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
  engine: EngineRequest = 'auto'
): Promise<ElionResult> {
  const apiKey = process.env.OMEGA_LLM_API_KEY?.trim();
  if (!apiKey) {
    return {
      output: composeLocalElionResponse(intent, authorityLevel),
      engine: 'local-deterministic',
      requestedEngine: engine,
      error: null,
    };
  }

  const baseUrl = (process.env.OMEGA_LLM_BASE_URL?.trim() || DEFAULT_MODEL_BASE_URL).replace(
    /\/$/,
    ''
  );
  const model = resolveModel(engine);

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
      return {
        output: '',
        engine: `llm:${model}`,
        requestedEngine: engine,
        error: `MODEL_HTTP_${response.status}`,
      };
    }
    const payload: any = await response.json();
    const output = typeof payload?.choices?.[0]?.message?.content === 'string'
      ? payload.choices[0].message.content
      : '';
    return {
      output,
      engine: `llm:${model}`,
      requestedEngine: engine,
      error: output ? null : 'MODEL_EMPTY_RESPONSE',
    };
  } catch (error) {
    return {
      output: '',
      engine: `llm:${model}`,
      requestedEngine: engine,
      error: error instanceof Error ? error.message : 'MODEL_UNAVAILABLE',
    };
  }
}
