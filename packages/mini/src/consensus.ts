import type {
  OmegaConsensusProposal,
  OmegaConsensusResult,
  OmegaConsensusVote,
} from '@oceanicos/types';
import { validateOmegaConsensusProposal } from '@oceanicos/types';

const LIMITATIONS = [
  'consensus is agreement evidence under a declared policy, not truth or authority',
  'no Byzantine fault tolerance, cross-host transport, or execution permission is provided',
  'dissent and insufficient evidence remain visible in the result',
] as const;

export class OmegaConsensusSession {
  private readonly votes = new Map<string, OmegaConsensusVote>();

  constructor(readonly proposal: OmegaConsensusProposal) {
    validateOmegaConsensusProposal(proposal);
  }

  addVote(vote: OmegaConsensusVote): OmegaConsensusVote {
    if (vote.proposalId !== this.proposal.proposalId) throw new Error('CONSENSUS_PROPOSAL_MISMATCH');
    if (!this.proposal.eligibleNodeIds.includes(vote.nodeId)) throw new Error('CONSENSUS_NODE_NOT_ELIGIBLE');
    if (this.votes.has(vote.nodeId)) throw new Error('CONSENSUS_DUPLICATE_VOTE');
    if (!['AGREE', 'DISSENT', 'ABSTAIN'].includes(vote.decision)) throw new Error('CONSENSUS_DECISION_INVALID');
    if (!vote.evidenceRefs.length) throw new Error('CONSENSUS_EVIDENCE_REQUIRED');
    if (vote.evidenceRefs.some((reference) => !reference.trim()) || Number.isNaN(Date.parse(vote.votedAt))) throw new Error('CONSENSUS_VOTE_EVIDENCE_INVALID');
    this.votes.set(vote.nodeId, { ...vote, evidenceRefs: [...vote.evidenceRefs] });
    return vote;
  }

  result(now = new Date().toISOString()): OmegaConsensusResult {
    const votes = [...this.votes.values()];
    const agreeCount = votes.filter((vote) => vote.decision === 'AGREE').length;
    const dissent = votes.filter((vote) => vote.decision === 'DISSENT');
    const abstainCount = votes.filter((vote) => vote.decision === 'ABSTAIN').length;
    const expired = Date.parse(this.proposal.expiresAt) <= Date.parse(now);
    const status = dissent.length > 0 && agreeCount > 0
      ? 'DIVERGENT'
      : agreeCount >= this.proposal.quorum
        ? 'AGREED'
        : expired
          ? 'UNKNOWN'
          : 'NO_QUORUM';
    const evidenceRefs = [...new Set(votes.flatMap((vote) => vote.evidenceRefs))];
    return {
      proposal: this.proposal,
      status,
      quorum: this.proposal.quorum,
      eligibleCount: this.proposal.eligibleNodeIds.length,
      agreeCount,
      dissentCount: dissent.length,
      abstainCount,
      votes,
      dissent,
      evidenceRefs,
      evaluatedAt: now,
      limitations: [...LIMITATIONS],
    };
  }
}

export function evaluateOmegaConsensus(
  proposal: OmegaConsensusProposal,
  votes: readonly OmegaConsensusVote[],
  now?: string,
): OmegaConsensusResult {
  const session = new OmegaConsensusSession(proposal);
  for (const vote of votes) session.addVote(vote);
  return session.result(now);
}
