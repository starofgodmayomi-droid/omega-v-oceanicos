import * as crypto from 'crypto';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DisputeStatus =
  'CHALLENGE_OPEN' | 'JURY_DELIBERATION' | 'UPHELD' | 'OVERTURNED' | 'DISMISSED';

export type JuryVoteChoice = 'UPHOLD_ATTESTATION' | 'OVERTURN_ATTESTATION' | 'DISMISS';

export interface CounterEvidence {
  evidenceId: string;
  submitterDid: string;
  evidenceType: 'LOG_TRACE' | 'OBSERVATION_DIFF' | 'ZK_PROOF' | 'CONTRACT_VIOLATION';
  description: string;
  contentHash: string;
  signature: string;
  submittedAt: string;
}

export interface JuryVote {
  jurorDid: string;
  choice: JuryVoteChoice;
  weight: number;
  rationale: string;
  signature: string;
  votedAt: string;
}

export interface DisputeCase {
  caseId: string;
  targetEventHash: string;
  claimantDid: string;
  challengerDid: string;
  stakeAmount: number;
  reason: string;
  status: DisputeStatus;
  evidenceDossier: CounterEvidence[];
  juryVotes: JuryVote[];
  challengeExpiresAt: string;
  ruling?: {
    outcome: DisputeStatus;
    upholdWeight: number;
    overturnWeight: number;
    dismissWeight: number;
    resolvedAt: string;
    rulingReceiptHash: string;
  };
  createdAt: string;
}

export interface DisputeStats {
  totalCases: number;
  activeChallenges: number;
  upheldCases: number;
  overturnedCases: number;
  dismissedCases: number;
  totalStaked: number;
}

/**
 * OceanicosDisputeEngine: Verifiable Decentralized Dispute Resolution & Jury Arbitration
 *
 * ```
 * 💧 Ω∞v ::= Challenged Attestation → Evidence Dossier → Stake Escrow → Jury Quorum Vote → Cryptographic Ruling
 * ```
 *
 * Features:
 *   - Challenge window lifecycle with staked escrow
 *   - Cryptographic counter-evidence dossier attachment
 *   - Weighted multi-juror arbitration voting
 *   - Deterministic quorum calculation and tamper-evident ruling receipts
 */
export class OceanicosDisputeEngine {
  private cases: Map<string, DisputeCase> = new Map();
  private signingKey: string;

  constructor(signingKey?: string) {
    this.signingKey = signingKey || 'Ω∞v-DISPUTE-ARBITRATION-SECRET-v1';
    this.bootstrapCanonicalCases();
  }

  private bootstrapCanonicalCases(): void {
    const caseId = 'disp-latency-sla-001';
    const timestamp = new Date().toISOString();
    const expiry = new Date(Date.now() + 86400000).toISOString(); // +24h

    this.cases.set(caseId, {
      caseId,
      targetEventHash:
        '0x' + crypto.createHash('sha256').update('sample-attestation-sla').digest('hex'),
      claimantDid: 'did:omega:agent:node-primary',
      challengerDid: 'did:omega:auditor:sentinel-1',
      stakeAmount: 500,
      reason:
        'Claimed response latency (<50ms) contradicted by distributed edge observer telemetry',
      status: 'CHALLENGE_OPEN',
      evidenceDossier: [
        {
          evidenceId: 'ev-001',
          submitterDid: 'did:omega:auditor:sentinel-1',
          evidenceType: 'OBSERVATION_DIFF',
          description:
            'Edge observation logs recorded p99 latency at 180ms during verification interval',
          contentHash: crypto.createHash('sha256').update('edge-obs-p99-180ms').digest('hex'),
          signature: '0x' + crypto.randomBytes(32).toString('hex'),
          submittedAt: timestamp,
        },
      ],
      juryVotes: [],
      challengeExpiresAt: expiry,
      createdAt: timestamp,
    });
  }

  /** Raise a formal dispute challenge on an event hash */
  public raiseDispute(params: {
    targetEventHash: string;
    claimantDid: string;
    challengerDid: string;
    stakeAmount: number;
    reason: string;
    challengeDurationMs?: number;
  }): DisputeCase {
    const caseId = `disp-${crypto.randomBytes(6).toString('hex')}`;
    const timestamp = new Date().toISOString();
    const duration = params.challengeDurationMs || 86400000; // default 24h
    const challengeExpiresAt = new Date(Date.now() + duration).toISOString();

    const newCase: DisputeCase = {
      caseId,
      targetEventHash: params.targetEventHash,
      claimantDid: params.claimantDid,
      challengerDid: params.challengerDid,
      stakeAmount: params.stakeAmount,
      reason: params.reason,
      status: 'CHALLENGE_OPEN',
      evidenceDossier: [],
      juryVotes: [],
      challengeExpiresAt,
      createdAt: timestamp,
    };

    this.cases.set(caseId, newCase);
    return newCase;
  }

  /** Submit counter-evidence into a dispute dossier */
  public submitEvidence(
    caseId: string,
    evidence: Omit<CounterEvidence, 'evidenceId' | 'submittedAt'>
  ): CounterEvidence {
    const dispute = this.cases.get(caseId);
    if (!dispute) {
      throw new Error(`Dispute case '${caseId}' not found`);
    }

    if (dispute.status !== 'CHALLENGE_OPEN' && dispute.status !== 'JURY_DELIBERATION') {
      throw new Error(
        `Cannot submit evidence: case '${caseId}' is already resolved (${dispute.status})`
      );
    }

    const evidenceId = `ev-${crypto.randomBytes(4).toString('hex')}`;
    const submittedAt = new Date().toISOString();

    const fullEvidence: CounterEvidence = {
      evidenceId,
      submitterDid: evidence.submitterDid,
      evidenceType: evidence.evidenceType,
      description: evidence.description,
      contentHash: evidence.contentHash,
      signature: evidence.signature,
      submittedAt,
    };

    dispute.evidenceDossier.push(fullEvidence);
    return fullEvidence;
  }

  /** Cast a juror vote on a dispute case */
  public castVote(caseId: string, vote: Omit<JuryVote, 'votedAt'>): DisputeCase {
    const dispute = this.cases.get(caseId);
    if (!dispute) {
      throw new Error(`Dispute case '${caseId}' not found`);
    }

    if (
      dispute.status === 'UPHELD' ||
      dispute.status === 'OVERTURNED' ||
      dispute.status === 'DISMISSED'
    ) {
      throw new Error(`Dispute '${caseId}' is already resolved`);
    }

    // Check duplicate vote
    if (dispute.juryVotes.some((v) => v.jurorDid === vote.jurorDid)) {
      throw new Error(`Juror '${vote.jurorDid}' has already voted on this case`);
    }

    const votedAt = new Date().toISOString();
    dispute.juryVotes.push({
      ...vote,
      votedAt,
    });

    dispute.status = 'JURY_DELIBERATION';

    // If quorum reached (>= 3 votes), compute ruling automatically
    if (dispute.juryVotes.length >= 3) {
      this.resolveDispute(caseId);
    }

    return dispute;
  }

  /** Resolve dispute and compute final arbitration ruling */
  public resolveDispute(caseId: string): DisputeCase {
    const dispute = this.cases.get(caseId);
    if (!dispute) {
      throw new Error(`Dispute case '${caseId}' not found`);
    }

    let upholdWeight = 0;
    let overturnWeight = 0;
    let dismissWeight = 0;

    for (const v of dispute.juryVotes) {
      if (v.choice === 'UPHOLD_ATTESTATION') upholdWeight += v.weight;
      else if (v.choice === 'OVERTURN_ATTESTATION') overturnWeight += v.weight;
      else if (v.choice === 'DISMISS') dismissWeight += v.weight;
    }

    let outcome: DisputeStatus = 'DISMISSED';
    if (overturnWeight > upholdWeight && overturnWeight > dismissWeight) {
      outcome = 'OVERTURNED';
    } else if (upholdWeight >= overturnWeight && upholdWeight > dismissWeight) {
      outcome = 'UPHELD';
    }

    const resolvedAt = new Date().toISOString();
    const rulingPayload = `${caseId}:${outcome}:${upholdWeight}:${overturnWeight}:${dismissWeight}:${resolvedAt}`;
    const rulingReceiptHash = `0x${crypto
      .createHmac('sha256', this.signingKey)
      .update(rulingPayload)
      .digest('hex')}`;

    dispute.status = outcome;
    dispute.ruling = {
      outcome,
      upholdWeight,
      overturnWeight,
      dismissWeight,
      resolvedAt,
      rulingReceiptHash,
    };

    return dispute;
  }

  /** Get all dispute cases */
  public getCases(): DisputeCase[] {
    return Array.from(this.cases.values()).reverse();
  }

  /** Get dispute case by ID */
  public getCase(caseId: string): DisputeCase | undefined {
    return this.cases.get(caseId);
  }

  /** Get dispute resolution statistics */
  public getStats(): DisputeStats {
    const all = Array.from(this.cases.values());
    const totalStaked = all.reduce((acc, c) => acc + c.stakeAmount, 0);

    return {
      totalCases: all.length,
      activeChallenges: all.filter(
        (c) => c.status === 'CHALLENGE_OPEN' || c.status === 'JURY_DELIBERATION'
      ).length,
      upheldCases: all.filter((c) => c.status === 'UPHELD').length,
      overturnedCases: all.filter((c) => c.status === 'OVERTURNED').length,
      dismissedCases: all.filter((c) => c.status === 'DISMISSED').length,
      totalStaked,
    };
  }
}

export default OceanicosDisputeEngine;
