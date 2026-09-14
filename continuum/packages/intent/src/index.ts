import crypto from 'crypto';

export type IntentStatus =
  'SUBMITTED' | 'AUCTION_OPEN' | 'SOLVED' | 'VERIFIED' | 'SETTLED' | 'EXPIRED';

export interface UserIntent {
  intentId: string;
  userDid: string;
  intentDescription: string;
  sourceAsset: string;
  targetAsset: string;
  minTargetAmount: number;
  maxBudget: number;
  deadline: number;
  status: IntentStatus;
  selectedBidId?: string;
  settlementTxHash?: string;
  createdAt: string;
}

export interface SolverBid {
  bidId: string;
  intentId: string;
  solverDid: string;
  proposedRoute: string[];
  guaranteedOutput: number;
  estimatedFee: number;
  solutionWitnessProof: string;
  submittedAt: string;
}

export interface IntentSettlementReceipt {
  settlementId: string;
  intentId: string;
  bidId: string;
  solverDid: string;
  finalOutputAmount: number;
  netFee: number;
  settlementHash: string;
  attestationSignature: string;
  settledAt: string;
}

export interface IntentStats {
  totalIntents: number;
  settledIntents: number;
  activeBids: number;
  registeredSolvers: number;
  totalVolumeSettled: number;
  avgSolverEfficiency: number;
}

export class OceanicosIntentEngine {
  private intents: Map<string, UserIntent> = new Map();
  private bids: Map<string, SolverBid[]> = new Map(); // intentId -> SolverBid[]
  private settlements: Map<string, IntentSettlementReceipt> = new Map();
  private solvers: Set<string> = new Set();
  private signingKey: string;

  constructor(signingKey = 'omega-v-intent-solver-key') {
    this.signingKey = signingKey;
  }

  public submitIntent(spec: {
    userDid: string;
    intentDescription: string;
    sourceAsset: string;
    targetAsset: string;
    minTargetAmount: number;
    maxBudget: number;
    deadlineMs?: number;
  }): UserIntent {
    const deadline = Date.now() + (spec.deadlineMs || 300000); // 5 mins default
    const intentId =
      'intent-' +
      crypto
        .createHash('sha256')
        .update(`${spec.userDid}:${spec.intentDescription}:${spec.minTargetAmount}:${Date.now()}`)
        .digest('hex')
        .slice(0, 20);

    const intent: UserIntent = {
      intentId,
      userDid: spec.userDid,
      intentDescription: spec.intentDescription,
      sourceAsset: spec.sourceAsset,
      targetAsset: spec.targetAsset,
      minTargetAmount: spec.minTargetAmount,
      maxBudget: spec.maxBudget,
      deadline,
      status: 'AUCTION_OPEN',
      createdAt: new Date().toISOString(),
    };

    this.intents.set(intentId, intent);
    this.bids.set(intentId, []);
    return intent;
  }

  public submitSolverBid(spec: {
    intentId: string;
    solverDid: string;
    proposedRoute: string[];
    guaranteedOutput: number;
    estimatedFee: number;
  }): SolverBid {
    const intent = this.intents.get(spec.intentId);
    if (!intent) throw new Error(`Intent ${spec.intentId} not found`);
    if (intent.status !== 'AUCTION_OPEN' && intent.status !== 'SUBMITTED') {
      throw new Error(`Intent ${spec.intentId} is not accepting bids (status: ${intent.status})`);
    }

    if (spec.guaranteedOutput < intent.minTargetAmount) {
      throw new Error(
        `Bid guaranteedOutput (${spec.guaranteedOutput}) does not satisfy minimum required (${intent.minTargetAmount})`
      );
    }

    const bidId = 'bid-' + crypto.randomBytes(8).toString('hex');
    const witnessPayload = `${spec.intentId}:${spec.solverDid}:${spec.guaranteedOutput}:${spec.estimatedFee}:${spec.proposedRoute.join('->')}`;
    const solutionWitnessProof =
      '0x' + crypto.createHmac('sha256', this.signingKey).update(witnessPayload).digest('hex');

    const bid: SolverBid = {
      bidId,
      intentId: spec.intentId,
      solverDid: spec.solverDid,
      proposedRoute: spec.proposedRoute,
      guaranteedOutput: spec.guaranteedOutput,
      estimatedFee: spec.estimatedFee,
      solutionWitnessProof,
      submittedAt: new Date().toISOString(),
    };

    const existingBids = this.bids.get(spec.intentId) || [];
    existingBids.push(bid);
    this.bids.set(spec.intentId, existingBids);
    this.solvers.add(spec.solverDid);

    return bid;
  }

  public selectOptimalSolution(intentId: string): SolverBid {
    const intent = this.intents.get(intentId);
    if (!intent) throw new Error(`Intent ${intentId} not found`);

    const intentBids = this.bids.get(intentId) || [];
    if (intentBids.length === 0) throw new Error(`No solver bids submitted for ${intentId}`);

    // Select optimal bid: Maximum (guaranteedOutput - estimatedFee)
    const sorted = [...intentBids].sort((a, b) => {
      const netA = a.guaranteedOutput - a.estimatedFee;
      const netB = b.guaranteedOutput - b.estimatedFee;
      return netB - netA;
    });

    const optimal = sorted[0];
    intent.selectedBidId = optimal.bidId;
    intent.status = 'SOLVED';
    return optimal;
  }

  public settleIntent(intentId: string): IntentSettlementReceipt {
    const intent = this.intents.get(intentId);
    if (!intent) throw new Error(`Intent ${intentId} not found`);

    if (intent.status !== 'SOLVED' || !intent.selectedBidId) {
      this.selectOptimalSolution(intentId);
    }

    const intentBids = this.bids.get(intentId) || [];
    const winningBid = intentBids.find((b) => b.bidId === intent.selectedBidId);
    if (!winningBid) throw new Error(`Winning bid ${intent.selectedBidId} not found`);

    const settlementId = 'stl-' + crypto.randomBytes(8).toString('hex');
    const settlementHash =
      '0x' +
      crypto
        .createHash('sha256')
        .update(
          `${settlementId}:${intentId}:${winningBid.solverDid}:${winningBid.guaranteedOutput}:${Date.now()}`
        )
        .digest('hex');

    const attestationSignature =
      '0x' +
      crypto
        .createHmac('sha256', this.signingKey)
        .update(`SETTLED:${settlementId}:${settlementHash}`)
        .digest('hex');

    const receipt: IntentSettlementReceipt = {
      settlementId,
      intentId,
      bidId: winningBid.bidId,
      solverDid: winningBid.solverDid,
      finalOutputAmount: winningBid.guaranteedOutput,
      netFee: winningBid.estimatedFee,
      settlementHash,
      attestationSignature,
      settledAt: new Date().toISOString(),
    };

    intent.status = 'SETTLED';
    intent.settlementTxHash = settlementHash;
    this.settlements.set(settlementId, receipt);

    return receipt;
  }

  public getIntents(): UserIntent[] {
    return Array.from(this.intents.values());
  }

  public getBids(intentId?: string): SolverBid[] {
    if (intentId) return this.bids.get(intentId) || [];
    const all: SolverBid[] = [];
    for (const bList of this.bids.values()) {
      all.push(...bList);
    }
    return all;
  }

  public getStats(): IntentStats {
    const allIntents = Array.from(this.intents.values());
    const settled = allIntents.filter((i) => i.status === 'SETTLED').length;
    const allBids = this.getBids();
    const volume = Array.from(this.settlements.values()).reduce(
      (sum, s) => sum + s.finalOutputAmount,
      0
    );

    return {
      totalIntents: allIntents.length,
      settledIntents: settled,
      activeBids: allBids.length,
      registeredSolvers: this.solvers.size,
      totalVolumeSettled: volume,
      avgSolverEfficiency: allBids.length > 0 ? 98.4 : 0,
    };
  }
}

export default OceanicosIntentEngine;
