/**
 * Ω∞v KAI/ELION execute loop — one bounded, fail-closed vertical slice.
 *
 *   POST /v1/execute         KAI OBSERVE → ELION BOUND → ELION EXECUTE → OMEGA VERIFY → KAI REMEMBER
 *   GET  /v1/execute/memory  what KAI remembers, newest first
 *
 * Laws enforced here:
 *   - CAPABILITY ≠ AUTHORITY. The bounded executor can only read its own
 *     observed runtime state; it never spends, deploys, or reaches outside.
 *   - MODEL OUTPUT ≠ TRUTH. OMEGA hashes the output and compares it to the
 *     declared expected outcome; a mismatch is DIVERGENT, never a pass.
 *   - UNKNOWN PRESERVED. No output, no capability, or a blocked intent is
 *     recorded as such instead of being reported as success.
 */
import { createHash } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import {
  KAI_AUTHORITY_LEVELS,
  type FileKaiMemoryStore,
  type KaiAuthorityLevel,
  type KaiMemoryEntry,
  type KaiMemoryStatus,
} from './kai-memory.js';

type JsonError = (reply: any, status: number, error: string, extra?: Record<string, unknown>) => unknown;

const MAX_INTENT_LENGTH = 2000;

export const KAI_SHIELD_BLOCK_REASON = 'KAI Shield blocked this intent.';

export interface KaiShieldRule {
  readonly id: string;
  readonly label: string;
  readonly pattern: RegExp;
}

/** Declarative scam/fraud signals. A match halts before ELION is allowed to act. */
export const KAI_SHIELD_RULES: readonly KaiShieldRule[] = [
  { id: 'SHIELD_GUARANTEED_RETURN', label: 'guaranteed return or profit', pattern: /\bguarantee[ds]?\b[^.]{0,40}\b(returns?|profits?|roi|yield|income)\b/i },
  { id: 'SHIELD_RISK_FREE', label: 'risk-free claim', pattern: /\brisk[- ]free\b[^.]{0,40}\b(profit|returns?|investment|trade)\b/i },
  { id: 'SHIELD_SEND_MONEY', label: 'request to send money', pattern: /\b(send|wire|transfer)\b[^.]{0,30}\b(money|funds|cash|usdt|btc|bitcoin)\b/i },
  { id: 'SHIELD_URGENT_PAYMENT', label: 'urgency plus payment', pattern: /\b(urgent(ly)?|immediately|right now|act now)\b[^.]{0,50}\b(pay|payment|transfer|send|invest|deposit)\b/i },
  { id: 'SHIELD_SEED_PHRASE', label: 'seed phrase or private key request', pattern: /\b(seed ?phrase|private ?key|recovery ?phrase|wallet ?phrase)\b/i },
  { id: 'SHIELD_DOUBLE_MONEY', label: 'doubling or giveaway scheme', pattern: /\b(double|doubling|multiply)\b[^.]{0,30}\b(money|investment|capital|btc|bitcoin|crypto)\b|\b(giveaway|airdrop)\b[^.]{0,30}\b(wallet|claim|connect)\b/i },
  { id: 'SHIELD_GIFT_CARD', label: 'gift card or transfer-agent payment', pattern: /\b(gift ?cards?|western union|moneygram)\b/i },
  { id: 'SHIELD_PRIZE_CLAIM', label: 'unsolicited prize claim', pattern: /\b(you have won|you won|lottery winner|claim your prize)\b/i },
];

/** Actions that would need a human before ELION may touch them at all. */
const IRREVERSIBLE_INTENT = /\b(buy|sell|trade|transfer|pay|purchase|deploy|delete|publish)\b/i;

/** Intents this bounded executor can actually answer from observed state. */
const EVIDENCE_INTENT = /\b(status|state|health|ready|readiness|ledger|memory|worker|workers|body|epoch|epochs|verify|verified)\b/i;

export interface ExecuteRuntimeEvidence {
  readonly ledgerHeight: number;
  readonly ledgerIntegrity: boolean;
  readonly bodyStatus: string;
  readonly workerCount: number;
  readonly memoryHeight: number;
  readonly observedAt: string;
}

/** Server-supplied evidence source. The request body is never a source. */
export type ExecuteEvidenceReader = () => ExecuteRuntimeEvidence;

export interface ExecuteStep {
  readonly step: 'KAI_OBSERVE' | 'ELION_BOUND' | 'ELION_EXECUTE' | 'OMEGA_VERIFY' | 'KAI_REMEMBER';
  readonly status: KaiMemoryStatus | 'OBSERVED' | 'BOUND' | 'HALTED';
  readonly detail: string;
}

const sha256 = (text: string): string => `sha256:${createHash('sha256').update(text, 'utf8').digest('hex')}`;

const normalize = (text: string): string => text.toLowerCase().replace(/\s+/g, ' ').trim();

function shieldMatches(intent: string): KaiShieldRule[] {
  return KAI_SHIELD_RULES.filter((rule) => rule.pattern.test(intent));
}

function evidenceReport(evidence: ExecuteRuntimeEvidence): string {
  return [
    `KAI MEMORY · ${evidence.memoryHeight} recorded drop(s)`,
    `OMEGA BODY · ${evidence.bodyStatus}`,
    `LEDGER · height ${evidence.ledgerHeight} · chain ${evidence.ledgerIntegrity ? 'VALID' : 'DEGRADED'}`,
    `WORKERS · ${evidence.workerCount} declared worker contract(s)`,
    `OBSERVED AT · ${evidence.observedAt}`,
  ].join('\n');
}

function requireIntent(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('intent must be a non-empty string');
  const intent = value.trim();
  if (intent.length > MAX_INTENT_LENGTH) throw new Error(`intent must be at most ${MAX_INTENT_LENGTH} characters`);
  return intent;
}

function parseAuthority(value: unknown): KaiAuthorityLevel {
  if (value === undefined) return 'READ_ONLY';
  if (typeof value !== 'string' || !(KAI_AUTHORITY_LEVELS as readonly string[]).includes(value)) {
    throw new Error(`authority must be one of ${KAI_AUTHORITY_LEVELS.join(', ')}`);
  }
  return value as KaiAuthorityLevel;
}

function receipt(entry: KaiMemoryEntry | null, remembered: boolean): Record<string, unknown> {
  return remembered && entry
    ? { id: entry.id, sequence: entry.sequence, hash: entry.hash, previousHash: entry.previousHash, timestamp: entry.timestamp }
    : { id: null, sequence: null, hash: null, previousHash: null, timestamp: null };
}

export function registerExecuteRoute(
  fastify: FastifyInstance,
  jsonError: JsonError,
  store: FileKaiMemoryStore,
  options: { readonly readEvidence?: ExecuteEvidenceReader } = {},
): void {
  fastify.post('/v1/execute', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, async (request: any, reply) => {
    const body = request.body && typeof request.body === 'object' && !Array.isArray(request.body) ? request.body : {};
    let intent: string;
    let authorityLevel: KaiAuthorityLevel;
    let expectedOutcome: string | undefined;
    try {
      intent = requireIntent(body.intent);
      authorityLevel = parseAuthority(body.authority);
      if (body.expectedOutcome !== undefined) {
        if (typeof body.expectedOutcome !== 'string' || !body.expectedOutcome.trim()) throw new Error('expectedOutcome must be a non-empty string');
        expectedOutcome = body.expectedOutcome.trim().slice(0, MAX_INTENT_LENGTH);
      }
    } catch (error) {
      return jsonError(reply, 400, 'INVALID_EXECUTE_REQUEST', { message: (error as Error).message });
    }
    if (!store.verifyIntegrity()) return jsonError(reply, 503, 'KAI_MEMORY_INTEGRITY_DEGRADED');

    const steps: ExecuteStep[] = [];

    // STEP 1 — KAI OBSERVE: scan before anything is allowed to act.
    const blocked = shieldMatches(intent);
    if (blocked.length > 0) {
      steps.push({ step: 'KAI_OBSERVE', status: 'DIVERGENT', detail: `${KAI_SHIELD_BLOCK_REASON} Matched: ${blocked.map((rule) => rule.label).join(', ')}.` });
      steps.push({ step: 'ELION_BOUND', status: 'HALTED', detail: 'No contract formed. The shield halts before execution.' });
      const entry = store.append({
        intent,
        evidenceHash: sha256(`blocked|${intent}|${blocked.map((rule) => rule.id).join(',')}`),
        status: 'DIVERGENT',
        authorityLevel,
        expectedOutcome,
        reason: KAI_SHIELD_BLOCK_REASON,
      });
      steps.push({ step: 'KAI_REMEMBER', status: 'DIVERGENT', detail: `Remembered as DIVERGENT at sequence ${entry.sequence}.` });
      return reply.status(200).send({
        success: true,
        status: 'DIVERGENT',
        reason: KAI_SHIELD_BLOCK_REASON,
        shield: { blocked: true, rules: blocked.map((rule) => ({ id: rule.id, label: rule.label })) },
        contract: null,
        output: null,
        evidenceHash: entry.evidenceHash,
        hashAlgorithm: 'SHA-256',
        steps,
        memory: receipt(entry, true),
      });
    }
    steps.push({ step: 'KAI_OBSERVE', status: 'OBSERVED', detail: 'No shield rule matched the intent.' });

    // STEP 2 — ELION BOUND: form the ΩIR contract, and refuse authority it cannot hold.
    if (authorityLevel === 'AUTONOMOUS' && IRREVERSIBLE_INTENT.test(intent)) {
      const entry = store.append({
        intent,
        evidenceHash: sha256(`unauthorized|${intent}`),
        status: 'NOT_EXECUTED',
        authorityLevel,
        expectedOutcome,
        reason: 'HUMAN_AUTHORIZATION_REQUIRED',
      });
      steps.push({ step: 'ELION_BOUND', status: 'NOT_EXECUTED', detail: 'Autonomous authority requested for an irreversible intent. Human authorization is required.' });
      steps.push({ step: 'KAI_REMEMBER', status: 'NOT_EXECUTED', detail: `Remembered as NOT_EXECUTED at sequence ${entry.sequence}.` });
      return reply.status(202).send({
        success: true,
        status: 'NOT_EXECUTED',
        reason: 'HUMAN_AUTHORIZATION_REQUIRED',
        shield: { blocked: false, rules: [] },
        contract: { id: entry.id, intent, authorityLevel, expectedOutcome: expectedOutcome ?? null },
        output: null,
        evidenceHash: entry.evidenceHash,
        hashAlgorithm: 'SHA-256',
        steps,
        memory: receipt(entry, true),
      });
    }

    const contract = {
      id: `oir-${createHash('sha256').update(`${intent}|${authorityLevel}|${Date.now()}`).digest('hex').slice(0, 24)}`,
      intent,
      authorityLevel,
      executionScope: 'READ_ONLY_OBSERVED_STATE',
      expectedOutcome: expectedOutcome ?? null,
    };
    steps.push({ step: 'ELION_BOUND', status: 'BOUND', detail: `Contract ${contract.id} formed. Scope: read-only observed state.` });

    // STEP 3 — ELION EXECUTE: bounded executor. No model connector is configured,
    // so it only reports what the body already observed; it invents nothing.
    const canAnswer = EVIDENCE_INTENT.test(intent) && typeof options.readEvidence === 'function';
    let output: string | null = null;
    if (canAnswer) {
      try {
        output = evidenceReport(options.readEvidence!());
        steps.push({ step: 'ELION_EXECUTE', status: 'OBSERVED', detail: 'Bounded executor read the observed runtime state.' });
      } catch {
        output = null;
        steps.push({ step: 'ELION_EXECUTE', status: 'UNKNOWN', detail: 'Evidence source unavailable; no output produced.' });
      }
    } else {
      steps.push({
        step: 'ELION_EXECUTE',
        status: 'NOT_EXECUTED',
        detail: 'No bounded capability for this intent. No model connector is configured, so nothing was generated.',
      });
    }

    // STEP 4 — OMEGA VERIFY: hash the output and compare it to the contract.
    let status: KaiMemoryStatus;
    let reason: string | undefined;
    let evidenceHash: string;
    if (!output || !output.trim()) {
      status = canAnswer ? 'UNKNOWN' : 'NOT_EXECUTED';
      reason = canAnswer ? 'OMEGA_OUTPUT_EMPTY' : 'ELION_BOUNDED_EXECUTOR_HAS_NO_CAPABILITY_FOR_THIS_INTENT';
      evidenceHash = sha256(`${reason}|${intent}`);
      steps.push({ step: 'OMEGA_VERIFY', status, detail: `${reason}. Nothing was claimed as verified.` });
    } else {
      evidenceHash = sha256(output);
      if (expectedOutcome && !normalize(output).includes(normalize(expectedOutcome))) {
        status = 'DIVERGENT';
        reason = 'OMEGA_EXPECTED_OUTCOME_NOT_OBSERVED';
        steps.push({ step: 'OMEGA_VERIFY', status, detail: `DIVERGENT: expected outcome "${expectedOutcome}" was not observed in the output.` });
      } else {
        status = 'VERIFIED';
        steps.push({ step: 'OMEGA_VERIFY', status, detail: `Output hashed (${evidenceHash.slice(0, 19)}…) and matched the contract.` });
      }
    }

    // STEP 5 — KAI REMEMBER: seal the drop with its own verdict.
    const entry = store.append({ intent, evidenceHash, status, authorityLevel, expectedOutcome, reason });
    steps.push({ step: 'KAI_REMEMBER', status, detail: `Remembered as ${status} at sequence ${entry.sequence}.` });

    return reply.status(200).send({
      success: true,
      status,
      reason: reason ?? null,
      shield: { blocked: false, rules: [] },
      contract,
      output,
      evidenceHash,
      hashAlgorithm: 'SHA-256',
      steps,
      memory: receipt(entry, true),
    });
  });

  fastify.get('/v1/execute/memory', async (request: any, reply) => {
    if (!store.verifyIntegrity()) return jsonError(reply, 503, 'KAI_MEMORY_INTEGRITY_DEGRADED');
    const requested = Number(request.query?.limit ?? 20);
    const entries = store.recent(Number.isFinite(requested) ? requested : 20);
    return {
      success: true,
      entries,
      height: store.height(),
      integrity: 'verified-local-hash-chain',
      limitation: 'KAI memory is evidence of what this process recorded, not proof of external reality and not durable across a destroyed volume',
    };
  });
}
