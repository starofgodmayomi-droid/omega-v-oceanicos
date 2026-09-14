/**
 * @omega-v/governor — On-Chain Timelocked Decentralized Autonomous Governance
 * Proposal Lifecycles, Verifiable Vote Aggregations, Timelock Queues & Execution Proofs
 *
 * Ω∞v ::= REALITY ⇄ OBSERVE ⇄ EVIDENCE ⇄ VERIFY ⇄ REMEMBER ⇄ REASON ⇄ INTEND ⇄ BUILD ⇄ TEST ⇄ ATTEST ⇄ ACT ⇄ CONSEQUENCE ⇄ LEARN ⇄ AUDIT ⇄ RECOMPILE ↺∞
 */

import { createHmac, randomUUID } from 'crypto';

/* ─── Types ─────────────────────────────────────────────────────── */

export type ProposalStatus =
  'PENDING' | 'ACTIVE' | 'DEFEATED' | 'SUCCEEDED' | 'QUEUED' | 'EXECUTED' | 'CANCELLED';

export type VoteChoice = 'FOR' | 'AGAINST' | 'ABSTAIN';

export interface GovernanceAction {
  targetService: string;
  actionType: string;
  parameters: Record<string, unknown>;
}

export interface GovernanceVote {
  voterDid: string;
  choice: VoteChoice;
  votingPower: number;
  reason?: string;
  voteHash: string;
  timestamp: string;
}

export interface GovernanceProposal {
  proposalId: string;
  proposerDid: string;
  title: string;
  description: string;
  actions: GovernanceAction[];
  status: ProposalStatus;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  quorumPower: number;
  votes: Map<string, GovernanceVote>;
  proposalHash: string;
  votingStartsAt: string;
  votingEndsAt: string;
  timelockDelayMs: number;
  etaExecutionTime?: string;
  executedAt?: string;
  executionReceiptHash?: string;
  createdAt: string;
}

export interface ExecutionReceipt {
  proposalId: string;
  executorDid: string;
  executedActionsCount: number;
  executionHash: string;
  executedAt: string;
}

export interface GovernorStats {
  totalProposals: number;
  activeProposals: number;
  queuedProposals: number;
  executedProposals: number;
  defeatedProposals: number;
  totalVotesCast: number;
  cumulativeVotingPower: number;
}

/* ─── Helpers ────────────────────────────────────────────────────── */

function hmac(key: string, data: string): string {
  return '0x' + createHmac('sha256', key).update(data).digest('hex');
}

/* ─── Engine ─────────────────────────────────────────────────────── */

export class OceanicosGovernorEngine {
  private readonly secret: string;
  private proposals: Map<string, GovernanceProposal> = new Map();
  private defaultQuorumPower: number;
  private defaultTimelockDelayMs: number;

  constructor(
    secret = 'governor-omega-v-secret',
    defaultQuorumPower = 100,
    defaultTimelockDelayMs = 0
  ) {
    this.secret = secret;
    this.defaultQuorumPower = defaultQuorumPower;
    this.defaultTimelockDelayMs = defaultTimelockDelayMs;
  }

  /* ── 1. Create Proposal ── */

  propose(opts: {
    proposerDid: string;
    title: string;
    description: string;
    actions: GovernanceAction[];
    votingPeriodMs?: number;
    timelockDelayMs?: number;
    quorumPower?: number;
  }): GovernanceProposal {
    if (!opts.proposerDid.startsWith('did:')) {
      throw new Error('proposerDid must be a valid DID');
    }
    if (!opts.title.trim() || !opts.description.trim()) {
      throw new Error('Proposal title and description are required');
    }
    if (!Array.isArray(opts.actions) || opts.actions.length === 0) {
      throw new Error('Proposal must include at least one governance action');
    }

    const proposalId = `gov-${randomUUID().slice(0, 10)}`;
    const now = new Date();
    const votingPeriodMs = opts.votingPeriodMs ?? 3600000; // 1 hour default
    const timelockDelayMs = opts.timelockDelayMs ?? this.defaultTimelockDelayMs;
    const quorumPower = opts.quorumPower ?? this.defaultQuorumPower;

    const votingStartsAt = now.toISOString();
    const votingEndsAt = new Date(now.getTime() + votingPeriodMs).toISOString();

    const proposalHash = hmac(
      this.secret,
      `PROPOSAL:${proposalId}:${opts.proposerDid}:${opts.title}:${JSON.stringify(opts.actions)}:${votingStartsAt}`
    );

    const proposal: GovernanceProposal = {
      proposalId,
      proposerDid: opts.proposerDid,
      title: opts.title,
      description: opts.description,
      actions: opts.actions,
      status: 'ACTIVE',
      forVotes: 0,
      againstVotes: 0,
      abstainVotes: 0,
      quorumPower,
      votes: new Map(),
      proposalHash,
      votingStartsAt,
      votingEndsAt,
      timelockDelayMs,
      createdAt: now.toISOString(),
    };

    this.proposals.set(proposalId, proposal);
    return { ...proposal };
  }

  /* ── 2. Cast Vote ── */

  castVote(opts: {
    proposalId: string;
    voterDid: string;
    choice: VoteChoice;
    votingPower: number;
    reason?: string;
  }): GovernanceVote {
    const proposal = this.proposals.get(opts.proposalId);
    if (!proposal) {
      throw new Error(`Proposal ${opts.proposalId} not found`);
    }
    if (proposal.status !== 'ACTIVE') {
      throw new Error(`Proposal ${opts.proposalId} is not active (status: ${proposal.status})`);
    }
    if (opts.votingPower <= 0) {
      throw new Error('Voting power must be greater than zero');
    }
    if (proposal.votes.has(opts.voterDid)) {
      throw new Error(`Voter ${opts.voterDid} has already voted on proposal ${opts.proposalId}`);
    }

    const now = new Date().toISOString();
    const voteHash = hmac(
      this.secret,
      `VOTE:${proposal.proposalId}:${opts.voterDid}:${opts.choice}:${opts.votingPower}:${now}`
    );

    const vote: GovernanceVote = {
      voterDid: opts.voterDid,
      choice: opts.choice,
      votingPower: opts.votingPower,
      reason: opts.reason,
      voteHash,
      timestamp: now,
    };

    proposal.votes.set(opts.voterDid, vote);

    if (opts.choice === 'FOR') proposal.forVotes += opts.votingPower;
    else if (opts.choice === 'AGAINST') proposal.againstVotes += opts.votingPower;
    else if (opts.choice === 'ABSTAIN') proposal.abstainVotes += opts.votingPower;

    return vote;
  }

  /* ── 3. Queue Proposal (Timelock) ── */

  queueProposal(proposalId: string): GovernanceProposal {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal ${proposalId} not found`);
    }
    if (proposal.status !== 'ACTIVE') {
      throw new Error(`Cannot queue proposal in status ${proposal.status}`);
    }

    const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
    if (totalVotes < proposal.quorumPower) {
      proposal.status = 'DEFEATED';
      throw new Error(
        `Proposal ${proposalId} failed quorum: ${totalVotes}/${proposal.quorumPower} power`
      );
    }

    if (proposal.forVotes <= proposal.againstVotes) {
      proposal.status = 'DEFEATED';
      throw new Error(
        `Proposal ${proposalId} defeated: FOR (${proposal.forVotes}) <= AGAINST (${proposal.againstVotes})`
      );
    }

    const now = new Date();
    proposal.status = 'QUEUED';
    proposal.etaExecutionTime = new Date(now.getTime() + proposal.timelockDelayMs).toISOString();

    return { ...proposal };
  }

  /* ── 4. Execute Proposal ── */

  executeProposal(proposalId: string, executorDid: string): ExecutionReceipt {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal ${proposalId} not found`);
    }
    if (proposal.status !== 'QUEUED') {
      throw new Error(
        `Proposal ${proposalId} must be QUEUED to execute (current status: ${proposal.status})`
      );
    }

    const now = new Date();
    if (proposal.etaExecutionTime && new Date(proposal.etaExecutionTime) > now) {
      throw new Error(
        `Proposal ${proposalId} is still timelocked until ${proposal.etaExecutionTime}`
      );
    }

    const executedAt = now.toISOString();
    const executionHash = hmac(
      this.secret,
      `EXEC:${proposal.proposalId}:${executorDid}:${proposal.actions.length}:${executedAt}`
    );

    proposal.status = 'EXECUTED';
    proposal.executedAt = executedAt;
    proposal.executionReceiptHash = executionHash;

    return {
      proposalId: proposal.proposalId,
      executorDid,
      executedActionsCount: proposal.actions.length,
      executionHash,
      executedAt,
    };
  }

  /* ── 5. Cancel Proposal ── */

  cancelProposal(proposalId: string, callerDid: string): GovernanceProposal {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal ${proposalId} not found`);
    }
    if (proposal.status === 'EXECUTED' || proposal.status === 'CANCELLED') {
      throw new Error(`Cannot cancel proposal ${proposalId} with status ${proposal.status}`);
    }
    if (proposal.proposerDid !== callerDid && callerDid !== 'did:omega:gov:emergency-guardian') {
      throw new Error('Only the proposer or emergency guardian can cancel a proposal');
    }

    proposal.status = 'CANCELLED';
    return { ...proposal };
  }

  /* ── 6. Query & Telemetry ── */

  getProposals(filterStatus?: ProposalStatus): GovernanceProposal[] {
    const list = Array.from(this.proposals.values());
    if (filterStatus) {
      return list.filter((p) => p.status === filterStatus);
    }
    return list;
  }

  getProposal(proposalId: string): GovernanceProposal | undefined {
    return this.proposals.get(proposalId);
  }

  getStats(): GovernorStats {
    const list = Array.from(this.proposals.values());
    let totalVotes = 0;
    let cumulativePower = 0;

    for (const p of list) {
      totalVotes += p.votes.size;
      cumulativePower += p.forVotes + p.againstVotes + p.abstainVotes;
    }

    return {
      totalProposals: list.length,
      activeProposals: list.filter((p) => p.status === 'ACTIVE').length,
      queuedProposals: list.filter((p) => p.status === 'QUEUED').length,
      executedProposals: list.filter((p) => p.status === 'EXECUTED').length,
      defeatedProposals: list.filter((p) => p.status === 'DEFEATED').length,
      totalVotesCast: totalVotes,
      cumulativeVotingPower: cumulativePower,
    };
  }
}
