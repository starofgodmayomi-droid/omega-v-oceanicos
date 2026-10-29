import type { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import {
  OCEANICOS_CONSTITUTION,
  SCAM_PATTERNS,
  screenIntent,
  type AuthorityLimit,
  type KaiStatus,
} from '@oceanicos/kai';
import { completeWithConfiguredProvider, resolveLlmProvider, type LlmCompletion } from '@oceanicos/elion';
import { hashEvidence, verifyResponseIntegrity } from '@oceanicos/omega';
import type { KaiMemoryStore } from './kai-memory.js';

/**
 * Ω∞v OCEANICOS — the invisible online computer.
 *
 * KAI observes, ELION executes, OMEGA verifies. Nothing leaves this endpoint
 * claiming success without a hash it can point at, and every outcome — even
 * DIVERGENT and UNKNOWN — is written to KaiMemory.
 *
 * The three actors live in their own workspace packages (`@oceanicos/kai`,
 * `@oceanicos/elion`, `@oceanicos/omega`) and are re-exported here so existing
 * importers of this module keep working.
 */

export { OCEANICOS_CONSTITUTION, SCAM_PATTERNS, screenIntent, hashEvidence, resolveLlmProvider };
export type { LlmCompletion };

const MAX_INTENT_LENGTH = 2_000;

export type ExecuteStatus = KaiStatus | 'NOT_EXECUTED';

export type ExecuteStep = {
  actor: 'KAI' | 'ELION' | 'OMEGA';
  step: string;
  status: ExecuteStatus | 'SKIPPED';
  detail: string;
};

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
        const integrity = verifyResponseIntegrity(text);
        if (!integrity.valid) {
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
