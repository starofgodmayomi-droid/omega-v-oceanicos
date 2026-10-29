/**
 * Ω∞v organs inside the running API — KAI (mind), ELION (hands), OMEGA (judge).
 *
 * These packages existed on disk and passed their own unit tests while the API never
 * imported them, so the body's organ claim was a package surface, not a runtime fact.
 * Running them per request makes the claim observable:
 *
 * ```text
 * KAI    remembers the verification evidence it was handed, then recalls it
 * ELION  refuses: a read-only status request carries no human authorization
 * OMEGA  reconciles the expected receipt status against the observed one
 * ```
 *
 * None of these outputs is authority. KAI memory is not proof, ELION execution is not
 * verification, and an OMEGA verdict is bounded to the comparison it made.
 */
import { KAI_VERSION, KaiMind } from '@oceanicos/kai';
import { executeBoundedAction } from '@oceanicos/elion';
import { reconcile } from '@oceanicos/omega';

export interface OrganObservationInput {
  /** Identifier of the observation the body was built from. */
  id: string;
  /** Subject under observation, used as the KAI recall needle. */
  subject: string;
  /** Verification receipt status actually reported by this request. */
  receiptStatus: string;
  /** Ledger integrity as observed by this request. */
  ledgerIntact: boolean;
}

export interface OrganLayer {
  status: 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';
  failClosed: boolean;
  evaluatedAt: string;
  mind: {
    version: typeof KAI_VERSION;
    status: string;
    drops: number;
    recalled: number;
    memoryIsProof: false;
    source: string;
  };
  hands: {
    status: string;
    reason?: string;
    verification: string;
  };
  judge: {
    verdict: string;
    allow: boolean;
    differences: readonly string[];
    reasons: readonly string[];
  };
}

export async function observeOrgans(input: OrganObservationInput): Promise<OrganLayer> {
  const evaluatedAt = new Date().toISOString();

  // KAI — the Mind. One bounded drop per request, recalled by the subject it names.
  const mind = new KaiMind();
  const drop = mind.remember({
    claim: `${input.subject} verification receipt reported ${input.receiptStatus}`,
    evidence: { status: input.receiptStatus, source: 'local://declarative-verification' },
    provenance: [`observation:${input.id}`],
  });
  const recalled = mind.recall(input.subject);

  // ELION — the Hands. This read request names no human authority, so the hands refuse.
  const hands = await executeBoundedAction(
    {
      id: 'ecosystem-body-read',
      description: 'compose the read-only ecosystem body snapshot',
      run: () => 'read-only snapshot',
    },
    { authorizedBy: '', admitted: false, scope: 'read-only:ecosystem-body' }
  );

  // OMEGA — the Judge. Expected vs. observed, failing closed on any mismatch.
  const judgment = reconcile(
    { receipt: 'VERIFIED', ledgerIntact: true },
    {
      value: { receipt: input.receiptStatus, ledgerIntact: input.ledgerIntact },
      source: 'local://declarative-verification',
      observedAt: evaluatedAt,
    }
  );

  return {
    status: judgment.verdict,
    failClosed: true,
    evaluatedAt,
    mind: {
      version: KAI_VERSION,
      status: drop.status,
      drops: mind.recorded().length,
      recalled: recalled.length,
      memoryIsProof: drop.memoryIsProof,
      source: drop.source,
    },
    hands: {
      status: hands.status,
      reason: hands.reason,
      verification: hands.verification,
    },
    judge: {
      verdict: judgment.verdict,
      allow: judgment.allow,
      differences: judgment.differences,
      reasons: judgment.reasons,
    },
  };
}
