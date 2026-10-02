export const OMEGA_CONSENSUS_VERSION = 'omega-consensus.v1' as const;

export type OmegaConsensusVoteDecision = 'AGREE' | 'DISSENT' | 'ABSTAIN';
export type OmegaConsensusStatus = 'AGREED' | 'NO_QUORUM' | 'DIVERGENT' | 'UNKNOWN';

export type OmegaConsensusNode = {
  readonly nodeId: string;
  readonly policyRefs: readonly string[];
};

export type OmegaConsensusProposal = {
  readonly version: typeof OMEGA_CONSENSUS_VERSION;
  readonly proposalId: string;
  readonly subject: string;
  readonly intentDigest: string;
  readonly term: number;
  readonly eligibleNodeIds: readonly string[];
  readonly quorum: number;
  readonly expiresAt: string;
};

export type OmegaConsensusVote = {
  readonly proposalId: string;
  readonly nodeId: string;
  readonly decision: OmegaConsensusVoteDecision;
  readonly evidenceRefs: readonly string[];
  readonly reason?: string;
  readonly votedAt: string;
};

export type OmegaConsensusResult = {
  readonly proposal: OmegaConsensusProposal;
  readonly status: OmegaConsensusStatus;
  readonly quorum: number;
  readonly eligibleCount: number;
  readonly agreeCount: number;
  readonly dissentCount: number;
  readonly abstainCount: number;
  readonly votes: readonly OmegaConsensusVote[];
  readonly dissent: readonly OmegaConsensusVote[];
  readonly evidenceRefs: readonly string[];
  readonly evaluatedAt: string;
  readonly limitations: readonly string[];
};

export function validateOmegaConsensusProposal(proposal: OmegaConsensusProposal): void {
  if (proposal.version !== OMEGA_CONSENSUS_VERSION) throw new Error('UNSUPPORTED_OMEGA_CONSENSUS_VERSION');
  if (!proposal.proposalId.trim() || !proposal.subject.trim() || !proposal.intentDigest.trim()) throw new Error('CONSENSUS_ID_SUBJECT_AND_DIGEST_REQUIRED');
  if (!Number.isInteger(proposal.term) || proposal.term < 0) throw new Error('CONSENSUS_TERM_INVALID');
  if (!Number.isInteger(proposal.quorum) || proposal.quorum < 1 || proposal.quorum > proposal.eligibleNodeIds.length) throw new Error('CONSENSUS_QUORUM_INVALID');
  if (new Set(proposal.eligibleNodeIds).size !== proposal.eligibleNodeIds.length) throw new Error('CONSENSUS_ELIGIBLE_NODES_DUPLICATED');
  if (proposal.eligibleNodeIds.some((nodeId) => !nodeId.trim())) throw new Error('CONSENSUS_NODE_ID_REQUIRED');
  if (Number.isNaN(Date.parse(proposal.expiresAt))) throw new Error('CONSENSUS_EXPIRY_INVALID');
}
