/**
 * @omega-v/reputation — Verifiable Agent Reputation & Trust Scoring Engine
 * Sybil-Resistant Feedback Attestations, Dynamic Trust Tiers, Decay Dynamics & Slashing Lineage
 *
 * Ω∞v ::= REALITY ⇄ OBSERVE ⇄ EVIDENCE ⇄ VERIFY ⇄ REMEMBER ⇄ REASON ⇄ INTEND ⇄ BUILD ⇄ TEST ⇄ ATTEST ⇄ ACT ⇄ CONSEQUENCE ⇄ LEARN ⇄ AUDIT ⇄ RECOMPILE ↺∞
 */

import { createHmac, randomUUID } from 'crypto';

/* ─── Types ─────────────────────────────────────────────────────── */

export type TrustTier = 'UNTRUSTED' | 'PROBATIONARY' | 'ESTABLISHED' | 'AUTHORITY';

export interface AgentReputation {
  agentDid: string;
  moniker: string;
  reputationScore: number; // 0 to 1000
  trustTier: TrustTier;
  positiveAttestations: number;
  negativeAttestations: number;
  slashedCount: number;
  feedbackHistoryCount: number;
  registeredAt: string;
  lastUpdated: string;
}

export interface FeedbackReceipt {
  receiptId: string;
  fromDid: string;
  targetDid: string;
  scoreDelta: number;
  newScore: number;
  reason: string;
  contextHash: string;
  feedbackProof: string;
  timestamp: string;
}

export interface SlashReceipt {
  slashId: string;
  targetDid: string;
  slashPenalty: number;
  newScore: number;
  reason: string;
  evidenceHash: string;
  slashProof: string;
  timestamp: string;
}

export interface ReputationStats {
  totalAgents: number;
  authorityAgents: number;
  establishedAgents: number;
  probationaryAgents: number;
  untrustedAgents: number;
  totalFeedbacks: number;
  totalSlashes: number;
  averageReputationScore: number;
}

/* ─── Helpers ────────────────────────────────────────────────────── */

function hmac(key: string, data: string): string {
  return '0x' + createHmac('sha256', key).update(data).digest('hex');
}

function calculateTier(score: number): TrustTier {
  if (score >= 800) return 'AUTHORITY';
  if (score >= 500) return 'ESTABLISHED';
  if (score >= 300) return 'PROBATIONARY';
  return 'UNTRUSTED';
}

/* ─── Engine ─────────────────────────────────────────────────────── */

export class OceanicosReputationEngine {
  private readonly secret: string;
  private agents: Map<string, AgentReputation> = new Map();
  private feedbacks: FeedbackReceipt[] = [];
  private slashes: SlashReceipt[] = [];

  constructor(secret = 'reputation-omega-v-secret') {
    this.secret = secret;
  }

  /* ── 1. Agent Registration ── */

  registerAgent(opts: {
    agentDid: string;
    moniker: string;
    initialScore?: number;
  }): AgentReputation {
    if (!opts.agentDid.startsWith('did:')) {
      throw new Error('agentDid must be a valid DID string');
    }
    if (this.agents.has(opts.agentDid)) {
      throw new Error(`Agent ${opts.agentDid} already registered`);
    }

    const score = Math.max(0, Math.min(1000, opts.initialScore ?? 500));
    const now = new Date().toISOString();

    const agent: AgentReputation = {
      agentDid: opts.agentDid,
      moniker: opts.moniker,
      reputationScore: score,
      trustTier: calculateTier(score),
      positiveAttestations: 0,
      negativeAttestations: 0,
      slashedCount: 0,
      feedbackHistoryCount: 0,
      registeredAt: now,
      lastUpdated: now,
    };

    this.agents.set(opts.agentDid, agent);
    return { ...agent };
  }

  getAgents(): AgentReputation[] {
    return Array.from(this.agents.values());
  }

  getAgent(agentDid: string): AgentReputation | undefined {
    return this.agents.get(agentDid);
  }

  /* ── 2. Feedback Attestation ── */

  submitFeedback(opts: {
    fromDid: string;
    targetDid: string;
    scoreDelta: number; // -100 to +100
    reason: string;
    contextHash?: string;
  }): FeedbackReceipt {
    const target = this.agents.get(opts.targetDid);
    if (!target) throw new Error(`Target agent ${opts.targetDid} not found`);
    if (opts.fromDid === opts.targetDid) throw new Error('Agents cannot submit self-feedback');
    if (opts.scoreDelta < -100 || opts.scoreDelta > 100) {
      throw new Error('scoreDelta must be between -100 and +100');
    }

    // Weight delta by evaluator's trust tier if evaluator is registered
    const evaluator = this.agents.get(opts.fromDid);
    let effectiveDelta = opts.scoreDelta;
    if (evaluator) {
      const weight = evaluator.reputationScore / 500; // e.g. score 1000 => weight 2.0
      effectiveDelta = Math.round(opts.scoreDelta * weight);
    }

    target.reputationScore = Math.max(0, Math.min(1000, target.reputationScore + effectiveDelta));
    target.trustTier = calculateTier(target.reputationScore);
    if (effectiveDelta > 0) target.positiveAttestations++;
    else if (effectiveDelta < 0) target.negativeAttestations++;
    target.feedbackHistoryCount++;
    target.lastUpdated = new Date().toISOString();

    const receiptId = `fdbk-${randomUUID().slice(0, 10)}`;
    const now = new Date().toISOString();
    const contextHash = opts.contextHash ?? hmac(this.secret, `CTX:${opts.reason}`);
    const feedbackProof = hmac(
      this.secret,
      `FEEDBACK:${receiptId}:${opts.fromDid}:${opts.targetDid}:${effectiveDelta}:${target.reputationScore}:${contextHash}:${now}`
    );

    const receipt: FeedbackReceipt = {
      receiptId,
      fromDid: opts.fromDid,
      targetDid: opts.targetDid,
      scoreDelta: effectiveDelta,
      newScore: target.reputationScore,
      reason: opts.reason,
      contextHash,
      feedbackProof,
      timestamp: now,
    };

    this.feedbacks.push(receipt);
    return receipt;
  }

  /* ── 3. Slashing ── */

  slashAgent(opts: {
    targetDid: string;
    slashPenalty: number;
    reason: string;
    evidenceHash: string;
  }): SlashReceipt {
    const target = this.agents.get(opts.targetDid);
    if (!target) throw new Error(`Target agent ${opts.targetDid} not found`);
    if (opts.slashPenalty <= 0) throw new Error('slashPenalty must be > 0');

    target.reputationScore = Math.max(0, target.reputationScore - opts.slashPenalty);
    target.trustTier = calculateTier(target.reputationScore);
    target.slashedCount++;
    target.lastUpdated = new Date().toISOString();

    const slashId = `slsh-${randomUUID().slice(0, 10)}`;
    const now = new Date().toISOString();
    const slashProof = hmac(
      this.secret,
      `SLASH:${slashId}:${opts.targetDid}:${opts.slashPenalty}:${target.reputationScore}:${opts.evidenceHash}:${now}`
    );

    const receipt: SlashReceipt = {
      slashId,
      targetDid: opts.targetDid,
      slashPenalty: opts.slashPenalty,
      newScore: target.reputationScore,
      reason: opts.reason,
      evidenceHash: opts.evidenceHash,
      slashProof,
      timestamp: now,
    };

    this.slashes.push(receipt);
    return receipt;
  }

  /* ── 4. Decay Dynamics ── */

  decayScores(decayFactor = 0.98): void {
    const baseline = 500;
    for (const agent of this.agents.values()) {
      // Score gently regresses toward baseline 500
      const diff = agent.reputationScore - baseline;
      agent.reputationScore = Math.round(baseline + diff * decayFactor);
      agent.trustTier = calculateTier(agent.reputationScore);
      agent.lastUpdated = new Date().toISOString();
    }
  }

  /* ── 5. Query & Telemetry ── */

  getFeedbacks(): FeedbackReceipt[] {
    return [...this.feedbacks];
  }

  getSlashes(): SlashReceipt[] {
    return [...this.slashes];
  }

  getStats(): ReputationStats {
    let authority = 0;
    let established = 0;
    let probationary = 0;
    let untrusted = 0;
    let sumScore = 0;

    for (const a of this.agents.values()) {
      sumScore += a.reputationScore;
      if (a.trustTier === 'AUTHORITY') authority++;
      else if (a.trustTier === 'ESTABLISHED') established++;
      else if (a.trustTier === 'PROBATIONARY') probationary++;
      else untrusted++;
    }

    const total = this.agents.size;
    return {
      totalAgents: total,
      authorityAgents: authority,
      establishedAgents: established,
      probationaryAgents: probationary,
      untrustedAgents: untrusted,
      totalFeedbacks: this.feedbacks.length,
      totalSlashes: this.slashes.length,
      averageReputationScore: total > 0 ? Math.round(sumScore / total) : 0,
    };
  }
}
