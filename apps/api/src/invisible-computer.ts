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

/**
 * CAPABILITY != AUTHORITY. An intent that directs the system to act needs
 * AUTONOMOUS authority. The endpoint grants READ_ONLY unless the request
 * carries AUTONOMOUS, so a directive at READ_ONLY halts as NOT_EXECUTED before
 * anything is executed, contracted, or remembered.
 */
export type RequiredAuthority = AuthorityLevel;

const DIRECTIVE_ACTION =
  /^(?:(?:please|kindly|now|go|just)\s+)*(?:(?:can|could|would|will)\s+you\s+|i\s+(?:want|need)\s+you\s+to\s+|i\s+(?:want|need)\s+to\s+)?(?:send|transfer|wire|pay|withdraw|deploy|publish|delete|remove|install|sign|submit|launch|mint|bridge|approve|buy|sell|trade|execute)\b/i;

export function requiredAuthorityFor(intent: string): RequiredAuthority {
  return DIRECTIVE_ACTION.test(intent.trim()) ? 'AUTONOMOUS' : 'READ_ONLY';
}

export function authoritySatisfies(
  granted: AuthorityLevel,
  required: RequiredAuthority
): boolean {
  return required === 'READ_ONLY' || granted === 'AUTONOMOUS';
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

export type ReconciliationVerdict = {
  status: 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN';
  checks: OmegaCheck[];
  reason: string | null;
};

/**
 * `V ≡ (Expected ≡ Observed)`, checked after the fact.
 *
 * MEMORY != PROOF: a memory row keeps the digest, not the text. Re-verifying
 * therefore needs the preimage supplied again; the recomputed digest must
 * match the remembered one and the contract that carried the expectation must
 * still exist. A missing preimage or a missing contract is UNKNOWN, never a
 * green verdict.
 */
export function reconcileEvidence(input: {
  output: string | null | undefined;
  evidenceHash: string;
  expectedOutcome: string | null;
}): ReconciliationVerdict {
  const output = input.output ?? '';
  const supplied = output.trim().length > 0;
  const checks: OmegaCheck[] = [
    {
      id: 'PREIMAGE_SUPPLIED',
      label: 'The observed output was supplied for recomputation',
      passed: supplied,
      detail: supplied ? `${output.trim().length} characters` : 'no output supplied',
    },
    {
      id: 'DIGEST_MATCHES',
      label: 'SHA-256 of the output matches the remembered digest',
      passed:
        supplied &&
        /^[0-9a-f]{64}$/.test(input.evidenceHash) &&
        sha256Hex(output) === input.evidenceHash,
      detail: supplied ? 'digest recomputed from the supplied output' : 'cannot recompute without the output',
    },
    {
      id: 'CONTRACT_BOUND',
      label: 'The expectation the digest was verified against still exists',
      passed: typeof input.expectedOutcome === 'string' && input.expectedOutcome.length > 0,
      detail: input.expectedOutcome ? 'contract present' : 'no contract bound to this memory row',
    },
  ];

  if (!supplied) {
    return {
      status: 'UNKNOWN',
      checks,
      reason:
        'No preimage supplied; the remembered digest cannot be recomputed (MEMORY != PROOF).',
    };
  }
  if (!checks[1].passed) {
    return {
      status: 'DIVERGENT',
      checks,
      reason: 'The supplied output does not reproduce the remembered digest.',
    };
  }
  if (!checks[2].passed) {
    return {
      status: 'UNKNOWN',
      checks,
      reason: 'The output matches its digest, but no contract records the expectation.',
    };
  }
  return { status: 'VERIFIED', checks, reason: null };
}

/**
 * ELION's local composer. Used when no model credential is configured, and
 * labelled as such so the answer is never mistaken for a model claim.
 */
export function composeLocalElionResponse(
  intent: string,
  authorityLevel: AuthorityLevel,
  engine: EngineId = 'gpt'
): string {
  const boundedIntent = intent.trim();
  return [
    `Intent received: ${boundedIntent}`,
    '',
    'What is observed: KAI Shield scanned this intent, no fraud pattern matched, and no external system was contacted.',
    `What is UNKNOWN: whether the intent can be carried out safely — that requires human authorization at authority level ${authorityLevel}.`,
    'Next finite step: review this bounded answer, then authorize one action at a time.',
    '',
    `Evidence: local deterministic composer (no ${ENGINE_KEY[engine]} configured for the ${engine} engine); this is a bounded template, not a model answer.`,
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
const DEFAULT_CLAUDE_BASE_URL = 'https://api.anthropic.com/v1';
const DEFAULT_CLAUDE_MODEL = 'claude-sonnet-4-5';
const ANTHROPIC_VERSION = '2023-06-01';
const MODEL_TIMEOUT_MS = 20_000;

/** The frontier engines a human may pick from the console. */
export type EngineId = 'gpt' | 'claude';

/** Which credential each engine reads. `gpt` keeps OMEGA_LLM_API_KEY as a fallback. */
export const ENGINE_KEY: Record<EngineId, string> = {
  gpt: 'OPENAI_API_KEY',
  claude: 'ANTHROPIC_API_KEY',
};

/** An unknown or absent engine resolves to `gpt`, the pre-existing default. */
export function deriveEngine(requested: unknown): EngineId {
  return requested === 'claude' ? 'claude' : 'gpt';
}

/**
 * Step 2 — ELION turns the safe intent into an answer.
 *
 * The human picks the engine (`gpt` or `claude`). `gpt` calls an
 * OpenAI-compatible chat completion endpoint with `OPENAI_API_KEY` (or the
 * older `OMEGA_LLM_API_KEY`); `claude` calls Anthropic's Messages API with
 * `ANTHROPIC_API_KEY`. Both carry KAI_SYSTEM_PROMPT. Without the selected
 * engine's credential (or when the call fails) nothing is invented: the local
 * composer answers and the engine field records which path produced the text.
 */
export async function executeElion(
  intent: string,
  authorityLevel: AuthorityLevel,
  engine: EngineId = 'gpt'
): Promise<ElionResult> {
  const credential = engine === 'claude' ? process.env.ANTHROPIC_API_KEY?.trim() : (process.env.OPENAI_API_KEY?.trim() || process.env.OMEGA_LLM_API_KEY?.trim());
  if (!credential) {
    return {
      output: composeLocalElionResponse(intent, authorityLevel, engine),
      engine: 'local-deterministic',
      error: null,
    };
  }

  if (engine === 'claude') {
    return executeClaude(intent, authorityLevel, credential);
  }

  const apiKey = credential;
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

/**
 * ELION's Claude path — Anthropic's Messages API, same KAI_SYSTEM_PROMPT law.
 * A non-2xx response or empty text is returned as an error so OMEGA collapses
 * the verdict to UNKNOWN instead of an invented answer.
 */
async function executeClaude(
  intent: string,
  authorityLevel: AuthorityLevel,
  apiKey: string
): Promise<ElionResult> {
  const baseUrl = (process.env.OMEGA_CLAUDE_BASE_URL?.trim() || DEFAULT_CLAUDE_BASE_URL).replace(
    /\/$/,
    ''
  );
  const model = process.env.OMEGA_CLAUDE_MODEL?.trim() || DEFAULT_CLAUDE_MODEL;

  try {
    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model,
        max_tokens: 700,
        temperature: 0.2,
        system: KAI_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Authority level: ${authorityLevel}\nIntent: ${intent.trim()}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
    });
    if (!response.ok) {
      return { output: '', engine: `claude:${model}`, error: `MODEL_HTTP_${response.status}` };
    }
    const payload: any = await response.json();
    const output = Array.isArray(payload?.content)
      ? payload.content
          .filter((block: any) => block?.type === 'text' && typeof block.text === 'string')
          .map((block: any) => block.text)
          .join('\n')
          .trim()
      : '';
    return { output, engine: `claude:${model}`, error: output ? null : 'MODEL_EMPTY_RESPONSE' };
  } catch (error) {
    return {
      output: '',
      engine: `claude:${model}`,
      error: error instanceof Error ? error.message : 'MODEL_UNAVAILABLE',
    };
  }
}
