import type { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { createHash } from 'node:crypto';
import type { AuthorityLimit, KaiMemoryStore, KaiStatus } from './kai-memory.js';

/**
 * Ω∞v OCEANICOS — the invisible online computer.
 *
 * KAI observes, ELION executes, OMEGA verifies. Nothing leaves this endpoint
 * claiming success without a hash it can point at, and every outcome — even
 * DIVERGENT and UNKNOWN — is written to KaiMemory.
 */

export const OCEANICOS_CONSTITUTION =
  'You are KAI/ELION. You do not hallucinate. You do not fabricate success. ' +
  'You only return claims backed by evidence. If the evidence is missing, you return UNKNOWN. ' +
  'Pidgin fit carry the warmth; evidence go carry the claim.';

/**
 * Known scam patterns are a screening boundary, not a truth claim. A match
 * stops execution; a miss does not certify safety.
 */
export const SCAM_PATTERNS: readonly { id: string; pattern: RegExp }[] = [
  { id: 'SEED_PHRASE', pattern: /\b(seed|recovery|secret)\s+phrase\b/i },
  { id: 'PRIVATE_KEY', pattern: /\bprivate\s+key\b/i },
  { id: 'WALLET_PASSPHRASE', pattern: /\b(wallet|keystore)\s+(password|passphrase)\b/i },
  { id: 'OTP_REQUEST', pattern: /\b(otp|one[- ]time\s+(code|password)|verification\s+code)\b/i },
  { id: 'BANK_CREDENTIALS', pattern: /\b(bvn|nin|card\s+number|cvv|pin|bank\s+details|account\s+number)\b/i },
  { id: 'ADVANCE_FEE', pattern: /\b(advance\s+fee|processing\s+fee|small\s+fee\s+to\s+release|pay\s+.*\s+to\s+release)\b/i },
  { id: 'GUARANTEED_RETURNS', pattern: /\b(guaranteed\s+(profit|returns?|roi)|risk[- ]free\s+(profit|investment))\b/i },
  { id: 'DOUBLE_MONEY', pattern: /\b(double|flip|multiply)\s+(your\s+)?(money|investment|crypto)\b/i },
  { id: 'GIVEAWAY_CLAIM', pattern: /\b(you\s+have\s+won|claim\s+your\s+(prize|reward|airdrop)|free\s+crypto\s+giveaway)\b/i },
  { id: 'REMOTE_ACCESS', pattern: /\b(install\s+(anydesk|teamviewer)|grant\s+remote\s+access)\b/i },
  { id: 'MULE_ACCOUNT', pattern: /\b(mule\s+account|use\s+your\s+(bank\s+)?account\s+to\s+receive\s+funds)\b/i },
  { id: 'URGENT_TRANSFER', pattern: /\b(urgent|emergency)\s+(transfer|payment)\b/i },
];

const MAX_INTENT_LENGTH = 2_000;
const MAX_EVIDENCE_LENGTH = 200_000;

export type ExecuteStatus = KaiStatus | 'NOT_EXECUTED';

export type ExecuteStep = {
  actor: 'KAI' | 'ELION' | 'OMEGA';
  step: string;
  status: ExecuteStatus | 'SKIPPED';
  detail: string;
};

export type LlmCompletion = (input: {
  intent: string;
  constitution: string;
}) => Promise<{ text: string; provider: string }>;

export function screenIntent(intent: string): { safe: boolean; matches: string[] } {
  const matches = SCAM_PATTERNS.filter((candidate) => candidate.pattern.test(intent)).map(
    (candidate) => candidate.id
  );
  return { safe: matches.length === 0, matches };
}

export function hashEvidence(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

type ProviderConfig = {
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

async function completeWithConfiguredProvider(
  input: { intent: string; constitution: string },
  fetchImpl: typeof fetch
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

export type RegisterComputerRouteOptions = {
  llm?: LlmCompletion;
  fetchImpl?: typeof fetch;
};

export function registerComputerRoute(
  fastify: FastifyInstance,
  store: KaiMemoryStore,
  options: RegisterComputerRouteOptions = {}
): void {
  const complete: LlmCompletion =
    options.llm ??
    ((input) =>
      completeWithConfiguredProvider(input, options.fetchImpl ?? fetch));

  const authorityLimit: AuthorityLimit = 'READ_ONLY';

  fastify.register(async (scope) => {
    await scope.register(rateLimit, { global: false });

    scope.post(
      '/execute',
      { config: { rateLimit: { max: 12, timeWindow: '1 minute' } } },
      async (request: any, reply) => {
        const body = (request.body ?? {}) as { intent?: unknown };
        const intent = typeof body.intent === 'string' ? body.intent.trim() : '';
        if (!intent) {
          return reply.status(400).send({
            success: false,
            status: 'NOT_EXECUTED',
            error: 'INTENT_REQUIRED',
            message: 'intent must be a non-empty string',
          });
        }
        if (intent.length > MAX_INTENT_LENGTH) {
          return reply.status(400).send({
            success: false,
            status: 'NOT_EXECUTED',
            error: 'INTENT_TOO_LONG',
            message: `intent must be at most ${MAX_INTENT_LENGTH} characters`,
          });
        }

        const steps: ExecuteStep[] = [];
        const contractFor = (contractScope: string, expectedOutcome: string) =>
          store.rememberContract({ scope: contractScope, authorityLimit, expectedOutcome });

        // 1 — KAI OBSERVE
        const screening = screenIntent(intent);
        if (!screening.safe) {
          steps.push({
            actor: 'KAI',
            step: 'OBSERVE',
            status: 'DIVERGENT',
            detail: `known scam pattern matched: ${screening.matches.join(', ')}`,
          });
          const memory = store.remember({ intent, evidenceHash: null, status: 'DIVERGENT' });
          const contract = contractFor(
            'intent.screen',
            'screen the intent against KaiMemory scam patterns before any execution'
          );
          return {
            success: true,
            status: 'DIVERGENT' satisfies ExecuteStatus,
            intent,
            response: null,
            evidenceHash: null,
            matchedPatterns: screening.matches,
            steps,
            memory,
            contract,
            authorityLimit,
            provider: null,
            verification: { algorithm: 'SHA-256', scope: 'output-integrity', truth: 'not-established' },
            timestamp: new Date().toISOString(),
          };
        }
        steps.push({
          actor: 'KAI',
          step: 'OBSERVE',
          status: 'VERIFIED',
          detail: 'no known scam pattern matched — screening completed, safety not certified',
        });

        // 2 — ELION EXECUTE
        let completion: { text: string; provider: string };
        try {
          completion = await complete({ intent, constitution: OCEANICOS_CONSTITUTION });
        } catch (error) {
          const reason = error instanceof Error ? error.message : 'LLM_FAILED';
          steps.push({
            actor: 'ELION',
            step: 'EXECUTE',
            status: 'UNKNOWN',
            detail: `no response produced (${reason})`,
          });
          const memory = store.remember({ intent, evidenceHash: null, status: 'UNKNOWN' });
          const contract = contractFor(
            'intent.execute',
            'produce a response; none was produced, so nothing is claimed'
          );
          return {
            success: true,
            status: 'UNKNOWN' satisfies ExecuteStatus,
            intent,
            response: null,
            evidenceHash: null,
            reason,
            steps,
            memory,
            contract,
            authorityLimit,
            provider: null,
            verification: { algorithm: 'SHA-256', scope: 'output-integrity', truth: 'not-established' },
            timestamp: new Date().toISOString(),
          };
        }
        steps.push({
          actor: 'ELION',
          step: 'EXECUTE',
          status: 'VERIFIED',
          detail: `response received from ${completion.provider}`,
        });

        // 3 — OMEGA VERIFY
        const text = completion.text.trim();
        const valid = text.length > 0 && text.length <= MAX_EVIDENCE_LENGTH;
        if (!valid) {
          steps.push({
            actor: 'OMEGA',
            step: 'VERIFY',
            status: 'UNKNOWN',
            detail: 'response failed integrity checks; no hash was recorded',
          });
          const memory = store.remember({ intent, evidenceHash: null, status: 'UNKNOWN' });
          const contract = contractFor(
            'intent.execute',
            'produce a verifiable response; integrity check failed'
          );
          return {
            success: true,
            status: 'UNKNOWN' satisfies ExecuteStatus,
            intent,
            response: null,
            evidenceHash: null,
            reason: 'RESPONSE_INVALID',
            steps,
            memory,
            contract,
            authorityLimit,
            provider: completion.provider,
            verification: { algorithm: 'SHA-256', scope: 'output-integrity', truth: 'not-established' },
            timestamp: new Date().toISOString(),
          };
        }

        const evidenceHash = hashEvidence(text);
        steps.push({
          actor: 'OMEGA',
          step: 'VERIFY',
          status: 'VERIFIED',
          detail: `SHA-256 ${evidenceHash}`,
        });
        const memory = store.remember({ intent, evidenceHash, status: 'VERIFIED' });
        const contract = contractFor(
          'intent.execute',
          `return evidence-backed response for: ${intent.slice(0, 120)}`
        );

        // 4 — RETURN
        return {
          success: true,
          status: 'VERIFIED' satisfies ExecuteStatus,
          intent,
          response: text,
          evidenceHash,
          steps,
          memory,
          contract,
          authorityLimit,
          provider: completion.provider,
          verification: {
            algorithm: 'SHA-256',
            scope: 'output-integrity',
            truth: 'not-established — the hash proves the response is unchanged, not that it is true',
          },
          timestamp: new Date().toISOString(),
        };
      }
    );
  });
}
