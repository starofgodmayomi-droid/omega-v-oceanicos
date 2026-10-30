/**
 * Ω∞v Ecosystem Body — the KAI / ELION / OMEGA surface (see ECOSYSTEM_BODY.md).
 *
 * KAI (the Mind) reports the continuity it recorded from the cycles this API
 * process minted. ELION (the Hands) reports the executor the omega command
 * routes run through. OMEGA (the Judge) reports its judgment of the durable
 * ledger.
 *
 * Nothing here grants authority or claims deployment. A VERIFIED judgment from
 * OMEGA is evidence about the local ledger, not proof of external reality.
 */
import type { FastifyInstance } from 'fastify';
import { screenIntent } from '@oceanicos/kai';
import type { KaiContinuity, KaiDrop } from '@oceanicos/kai';
import type { IMiniBlock, LedgerIntegrity } from '@oceanicos/types';

export type BodyRouteOptions = {
  kai: KaiContinuity;
  ledgerIntegrity: () => LedgerIntegrity;
  ledgerTip: () => IMiniBlock | null;
  requireReadAccess: (request: any, reply: any) => Promise<void>;
  jsonError: (reply: any, status: number, error: string, extra?: Record<string, unknown>) => unknown;
};

type JudgmentStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN';

type Judgment = {
  status: JudgmentStatus;
  evidence: string;
  height: number;
};

const recordedBlock = (drop: KaiDrop | null): { index: number | null; hash: string | null } => {
  const indexEntry = drop?.provenance.find((entry) => entry.startsWith('remember:index:'));
  const hashEntry = drop?.provenance.find((entry) => entry.startsWith('remember:hash:'));
  const index = indexEntry ? Number(indexEntry.slice('remember:index:'.length)) : NaN;
  return {
    index: Number.isInteger(index) ? index : null,
    hash: hashEntry ? hashEntry.slice('remember:hash:'.length) : null,
  };
};

/**
 * OMEGA reconciles KAI's recorded expectation against the durable ledger
 * (ECOSYSTEM_BODY.md). A valid chain is not enough: the block KAI last
 * recorded must be the ledger's tip, or the two disagree and OMEGA says so.
 */
const judgeBody = (integrity: LedgerIntegrity, latest: KaiDrop | null, tip: IMiniBlock | null): Judgment => {
  if (!integrity.valid) {
    return {
      status: 'DIVERGENT',
      evidence: `ledger chain failed verification${integrity.reason ? `: ${integrity.reason}` : ''}`,
      height: integrity.height,
    };
  }
  if (!tip) {
    return {
      status: 'UNKNOWN',
      evidence: 'ledger holds no blocks; there is nothing to reconcile yet',
      height: 0,
    };
  }
  if (!latest) {
    return {
      status: 'UNKNOWN',
      evidence: 'KAI recorded no continuity; there is no expectation to reconcile',
      height: integrity.height,
    };
  }
  const recorded = recordedBlock(latest);
  if (recorded.index === null || !recorded.hash) {
    return {
      status: 'UNKNOWN',
      evidence: 'KAI\'s last record carries no durable ledger reference',
      height: integrity.height,
    };
  }
  if (recorded.index !== tip.index || recorded.hash !== tip.hash) {
    return {
      status: 'DIVERGENT',
      evidence: `KAI's last record (index ${recorded.index}) is not the durable tip (index ${tip.index}); recorded expectation ≠ ledger`,
      height: integrity.height,
    };
  }
  return {
    status: 'VERIFIED',
    evidence: `KAI's last recorded block (index ${recorded.index}) is the durable ledger tip across ${integrity.height} block(s)`,
    height: integrity.height,
  };
};

export function registerBodyRoute(fastify: FastifyInstance, options: BodyRouteOptions): void {
  const { kai, ledgerIntegrity, ledgerTip, requireReadAccess, jsonError } = options;

  fastify.get('/v1/body', { preHandler: requireReadAccess }, async () => ({
    success: true,
    body: {
      name: 'Ω∞v Ecosystem Body',
      law: 'Ω∞v ::= VERIFY(ΔREALITY)',
      invariant: 'POSSIBLE ≠ KNOWN ≠ EXECUTED ≠ OBSERVED ≠ VERIFIED ≠ REALITY',
      source: 'ECOSYSTEM_BODY.md',
    },
    roles: {
      kai: {
        role: 'MIND',
        package: '@oceanicos/kai',
        recorded: kai.all().length,
        latest: kai.latest(),
      },
      elion: {
        role: 'HANDS',
        package: '@oceanicos/elion',
        executor: 'executeAuthorizedTransition',
        boundTo: 'the omega command routes',
        authority: 'executes only records that already carry authorization; grants none',
      },
      omega: {
        role: 'JUDGE',
        package: '@oceanicos/omega',
        reconciles: 'recorded expectation against the durable ledger',
        judgment: judgeBody(ledgerIntegrity(), kai.latest(), ledgerTip()),
      },
    },
  }));

  fastify.post('/v1/body/shield', { preHandler: requireReadAccess }, async (request: any, reply) => {
    const intent = typeof request.body?.intent === 'string' ? request.body.intent.trim() : '';
    const subject = typeof request.body?.subject === 'string' ? request.body.subject.trim() : '';
    if (!intent || !subject) return jsonError(reply, 400, 'INTENT_AND_SUBJECT_REQUIRED');
    return { success: true, screening: screenIntent({ intent, subject }) };
  });
}
