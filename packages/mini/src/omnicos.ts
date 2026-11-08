import { createHash } from 'node:crypto';
import type { OmegaConnectorDeclaration } from './connector-admission.js';

/**
 * THE OMNICOS — the stored directive at OMNICOS/CORE/OMNICOS.md as one
 * bounded receipt function.
 *
 * Two layers. `runOmnicos` is the local law: it calls no Glober tool, composes
 * one local sentence and hashes the bytes it wrote, so the digest matches by
 * construction. A self-hash is never VERIFIED, so that function returns
 * DIVERGENT or UNKNOWN only.
 *
 * `observeOmnicos` (in `./omnicos-observe.ts`) is the one connected Glober
 * limb: when the intent names a public GitHub repository, it runs the declared
 * `github-public-repository` adapter through the admitted-connector gate — one
 * HTTPS GET to api.github.com, no credential, no redirect, 64 KiB and 5 s
 * caps, one attempt. `tool_used` is API only after that call was actually
 * attempted, and `VERIFIED` is emitted only when the bytes GitHub returned
 * match the observation the intent asked for. Nothing else is reachable: no
 * write, no message, no payment, no model, no ledger row.
 */

export const OMNICOS_ENTITY = 'THE_OMNICOS' as const;
export const OMNICOS_CHECKSUM = '30013030' as const;
export const OMNICOS_SYNTHESIS = ['OCEANICOS', 'GAIACOS', 'COSMICOS'] as const;
export const OMNICOS_SHIELD_PHRASES = [
  'urgent',
  'send money',
  'guaranteed',
  'private key',
] as const;

export type OmnicosTool = 'BROWSER' | 'API' | 'CODE' | 'LLM' | 'COMMS' | 'DB';
export type OmnicosStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN';
export type OmnicosPhase = 'SPROUT' | 'BLOOM' | 'PLATEAU' | 'WILT';

export interface OmnicosReceipt {
  readonly entity: typeof OMNICOS_ENTITY;
  readonly tool_used: OmnicosTool;
  readonly status: OmnicosStatus;
  readonly game_detected: boolean;
  readonly phase_t: number;
  readonly evidence_hash: string;
  readonly action: string;
  readonly next_delta: string;
}

/** The output contract's keys, in the order the stored directive lists them. */
export const OMNICOS_RECEIPT_KEYS = [
  'entity',
  'tool_used',
  'status',
  'game_detected',
  'phase_t',
  'evidence_hash',
  'action',
  'next_delta',
] as const;

export interface OmnicosInput {
  readonly intent: string;
  readonly phaseT: number;
}

export const OMNICOS_MAX_INTENT_LENGTH = 2000;

const GLOBER_TOOL =
  /\b(playwright|scrap(?:e|ing)|dom navigation|stripe|tradingview|github|telegram|composio|ollama|webhook|wire transfer|deploy to)\b/i;

export function omnicosEase(t: number): number {
  if (!Number.isFinite(t)) return 0;
  const clamped = Math.min(1, Math.max(0, t));
  return (1 - Math.cos(clamped * Math.PI)) / 2;
}

export function omnicosPhase(t: number): OmnicosPhase {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0));
  if (clamped < 0.25) return 'SPROUT';
  if (clamped < 0.55) return 'BLOOM';
  if (clamped < 0.82) return 'PLATEAU';
  return 'WILT';
}

function digestOf(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function shieldHits(intent: string): string[] {
  const hay = intent.toLowerCase();
  return OMNICOS_SHIELD_PHRASES.filter((phrase) => hay.includes(phrase));
}

function localComposition(intent: string, phase: OmnicosPhase, easeValue: number): string {
  const pace = `Ease ${easeValue.toFixed(3)}.`;
  if (phase === 'SPROUT') {
    return `No tool called. ${phase}. ${pace} Local composition of one observable step for: ${intent}`;
  }
  if (phase === 'BLOOM') {
    return `No tool called. ${phase}. ${pace} Local composition of three ordered steps for: ${intent}`;
  }
  if (phase === 'PLATEAU') {
    return `No tool called. ${phase}. ${pace} Local composition holds scope and names what would be measured for: ${intent}`;
  }
  return `No tool called. ${phase}. ${pace} Local composition reduces scope and stops expansion for: ${intent}`;
}

export function runOmnicos(input: OmnicosInput): OmnicosReceipt {
  const intent = typeof input.intent === 'string' ? input.intent : '';
  const rawPhase = Number.isFinite(input.phaseT) ? input.phaseT : 0;
  const phaseT = Math.round(Math.min(1, Math.max(0, rawPhase)) * 1000) / 1000;
  const phase = omnicosPhase(phaseT);
  const hits = shieldHits(intent);
  const gameDetected = hits.length > 0;
  let status: OmnicosStatus = 'UNKNOWN';
  let action: string;
  let next: string;

  if (intent.trim().length === 0) {
    action = 'No action. No tool called.';
    next = 'State one observable intent. UNKNOWN preserved.';
  } else if (gameDetected) {
    status = 'DIVERGENT';
    action = `HALT ⊢ DIVERGENT. KAI Shield blocked this intent. Matched: ${hits.join(', ')}.`;
    next = 'Restate the intent without urgency, a money demand, a guarantee, or a secret.';
  } else if (GLOBER_TOOL.test(intent)) {
    action = 'Glober tool named but not called. Local code composed no observation.';
    next =
      'NOT_EXECUTED. A named capability is not an executed tool. Bring back an independent observation.';
  } else {
    action = localComposition(intent.trim(), phase, omnicosEase(phaseT));
    next =
      'A local composition is not Expected ≡ Observed. Bring back an independent observation before calling the step verified.';
  }

  return {
    entity: OMNICOS_ENTITY,
    tool_used: 'CODE',
    status,
    game_detected: gameDetected,
    phase_t: phaseT,
    evidence_hash: digestOf(action),
    action,
    next_delta: next,
  };
}

/** The single Glober limb this repository actually connects. */
export const OMNICOS_OBSERVATION_TOOL = 'github-public-repository' as const;
export const OMNICOS_OBSERVATION_TIMEOUT_MS = 5000;
export const OMNICOS_OBSERVATION_POLICY = 'policy:omnicos-glober-public-read.v1';

/** `github owner/repo`, `github.com/owner/repo`, `github:owner/repo`. */
const GITHUB_TARGET =
  /\bgithub(?:\.com)?\s*[:/]?\s*([A-Za-z0-9][A-Za-z0-9_.-]*)\/([A-Za-z0-9][A-Za-z0-9_.-]*)/i;

export interface OmnicosObservationTarget {
  readonly owner: string;
  readonly repo: string;
}

function trimDots(value: string): string {
  return value.replace(/\.+$/, '');
}

/**
 * Read one public repository identity out of the intent, or nothing. This is
 * the only shape that reaches the network: everything else stays local code.
 */
export function parseGithubObservationTarget(intent: string): OmnicosObservationTarget | null {
  if (typeof intent !== 'string') return null;
  const match = GITHUB_TARGET.exec(intent);
  if (!match) return null;
  const owner = trimDots(match[1] ?? '');
  const repo = trimDots(match[2] ?? '');
  if (!owner || !repo) return null;
  return { owner, repo };
}

/**
 * The declaration the connector gate admits: read-only, one attempt, bounded
 * time, no credential, no redirect. The expected observation is the identity
 * the caller asked to see, so the expectation comes from the intent and the
 * observation comes from GitHub's bytes.
 */
export function omnicosGithubConnector(target: OmnicosObservationTarget): OmegaConnectorDeclaration {
  const fullName = `${target.owner}/${target.repo}`;
  return {
    id: 'github.read-public-repository-metadata',
    version: '1.0.0',
    system: 'github',
    capability: 'read public repository metadata',
    authRef: 'none:public-unauthenticated',
    scope: [`repo:${fullName}`],
    mode: 'read-only',
    policyRefs: [OMNICOS_OBSERVATION_POLICY],
    stopCondition: 'one bounded public metadata read; no write, no credential, no redirect',
    expectedObservation: `github:${fullName}:metadata`,
    timeoutMs: OMNICOS_OBSERVATION_TIMEOUT_MS,
    maxAttempts: 1,
    rollbackSupported: false,
  };
}
