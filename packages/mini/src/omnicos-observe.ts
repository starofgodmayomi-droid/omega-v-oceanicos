import { createHash } from 'node:crypto';
import { executeAdmittedConnector } from './connector-observation.js';
import { createGithubPublicRepositoryHandler } from './github-public-repository.js';
import {
  OMNICOS_ENTITY,
  omnicosGithubConnector,
  parseGithubObservationTarget,
  runOmnicos,
  type OmnicosInput,
  type OmnicosReceipt,
  type OmnicosStatus,
  type OmnicosTool,
} from './omnicos.js';

/**
 * THE OMNICOS — the one connected Glober limb.
 *
 * `runOmnicos` (./omnicos.ts) is the local law and stays offline. This module
 * adds the single capability the repository actually connects: a read-only
 * public GitHub repository metadata read, driven through the same
 * admitted-connector gate as every other Ω connector. The adapter fixes the
 * request to `https://api.github.com/repos/{owner}/{repo}`, refuses redirects,
 * sends no credential and stops at 64 KiB or 5 s after one attempt.
 *
 * Honesty rules kept here:
 * - `tool_used` is API only after the network call was attempted; otherwise CODE.
 * - `VERIFIED` is emitted only from a real observation whose bytes matched the
 *   identity the intent asked for. A self-hash still never becomes VERIFIED.
 * - A mismatch or a failed call stays UNKNOWN with `next_delta` naming
 *   NOT_EXECUTED. DIVERGENT keeps its shield-only meaning: game_detected.
 * - Nothing is written: no ledger row, no message, no payment, no model call.
 */

export interface OmnicosObserveOptions {
  /** Injected network seam for tests; production uses the global fetch. */
  readonly fetchImpl?: typeof fetch;
}

function digestOf(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * The only authority this receipt claims. The caller named one public
 * repository and asked the eye to look; that grant covers one read-only public
 * metadata call and nothing else. It is declared here rather than widened from
 * intent text.
 */
function omnicosReadAuthority(): { authorityVerified: boolean; policySatisfied: boolean } {
  return { authorityVerified: true, policySatisfied: true };
}

function observationReceipt(
  phaseT: number,
  fields: {
    readonly toolUsed: OmnicosTool;
    readonly status: OmnicosStatus;
    readonly evidenceHash: string;
    readonly action: string;
    readonly nextDelta: string;
  },
): OmnicosReceipt {
  return {
    entity: OMNICOS_ENTITY,
    tool_used: fields.toolUsed,
    status: fields.status,
    game_detected: false,
    phase_t: phaseT,
    evidence_hash: fields.evidenceHash,
    action: fields.action,
    next_delta: fields.nextDelta,
  };
}

/**
 * Observe one intent. A shield hit, an empty intent, or an intent that names
 * no repository stays exactly what `runOmnicos` returned: local code, no
 * network. Only a named public GitHub repository opens the one bounded read.
 */
export async function observeOmnicos(
  input: OmnicosInput,
  options: OmnicosObserveOptions = {},
): Promise<OmnicosReceipt> {
  const local = runOmnicos(input);
  if (local.game_detected || local.status === 'DIVERGENT') return local;

  const intent = typeof input.intent === 'string' ? input.intent : '';
  const target = parseGithubObservationTarget(intent);
  if (!target) return local;

  const connector = omnicosGithubConnector(target);
  const fullName = `${target.owner}/${target.repo}`;
  const read = createGithubPublicRepositoryHandler(connector, options.fetchImpl);
  let attempted = false;
  const outcome = await executeAdmittedConnector({
    connector,
    ...omnicosReadAuthority(),
    approvalVerified: false,
    handler: () => {
      attempted = true;
      return read();
    },
  });
  const toolUsed: OmnicosTool = attempted ? 'API' : 'CODE';

  if (outcome.status === 'VERIFIED') {
    return observationReceipt(local.phase_t, {
      toolUsed,
      status: 'VERIFIED',
      evidenceHash: outcome.evidence.replace(/^sha256:/, ''),
      action: `API github-public-repository observed ${outcome.actualObservation} at ${outcome.observedAt}. Expected ≡ Observed for ${fullName}.`,
      nextDelta:
        'NOT_EXECUTED. One bounded public read is complete; changing anything still needs its own authorization.',
    });
  }

  if (outcome.status === 'DIVERGENT') {
    return observationReceipt(local.phase_t, {
      toolUsed,
      status: 'UNKNOWN',
      evidenceHash: digestOf(outcome.evidence),
      action: `Expected ${outcome.expectedObservation} ≠ Observed ${outcome.actualObservation ?? 'nothing'}. The reading is refused; UNKNOWN preserved.`,
      nextDelta:
        'NOT_EXECUTED. Do not use this reading. Restate the repository and observe again.',
    });
  }

  const reason = outcome.issues.join('; ') || 'no issue recorded';
  return observationReceipt(local.phase_t, {
    toolUsed,
    status: 'UNKNOWN',
    evidenceHash: digestOf(`observation refused: ${reason}`),
    action: `API call ${attempted ? 'attempted' : 'refused'} for ${fullName}; no observation. ${reason}.`,
    nextDelta:
      'NOT_EXECUTED. UNKNOWN preserved. Check the repository name or connectivity, then observe again.',
  });
}
