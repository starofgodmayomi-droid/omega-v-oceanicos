import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { OmegaConsensusSession, evaluateOmegaConsensus } from '../../dist/consensus.js';
import type { OmegaConsensusProposal, OmegaConsensusVote } from '@oceanicos/types';

const proposal: OmegaConsensusProposal = {
  version: 'omega-consensus.v1',
  proposalId: 'p-1',
  subject: 'bounded-evidence',
  intentDigest: 'sha256:abc',
  term: 1,
  eligibleNodeIds: ['a', 'b', 'c'],
  quorum: 2,
  expiresAt: '2099-01-01T00:00:00.000Z',
};
const vote = (nodeId: string, decision: OmegaConsensusVote['decision']): OmegaConsensusVote => ({
  proposalId: proposal.proposalId,
  nodeId,
  decision,
  evidenceRefs: [`evidence:${nodeId}`],
  votedAt: '2026-09-21T00:00:00.000Z',
});

describe('Ω bounded consensus evidence', () => {
  it('reports agreement only after declared quorum', () => {
    assert.equal(evaluateOmegaConsensus(proposal, [vote('a', 'AGREE')]).status, 'NO_QUORUM');
    assert.equal(evaluateOmegaConsensus(proposal, [vote('a', 'AGREE'), vote('b', 'AGREE')]).status, 'AGREED');
  });
  it('preserves divergent dissent', () => {
    const result = evaluateOmegaConsensus(proposal, [vote('a', 'AGREE'), vote('b', 'DISSENT')]);
    assert.equal(result.status, 'DIVERGENT');
    assert.equal(result.dissent.length, 1);
  });
  it('rejects duplicate votes and invalid evidence', () => {
    const session = new OmegaConsensusSession(proposal);
    session.addVote(vote('a', 'AGREE'));
    assert.throws(() => session.addVote(vote('a', 'AGREE')), /CONSENSUS_DUPLICATE_VOTE/);
    assert.doesNotThrow(() => session.addVote(vote('b', 'ABSTAIN')));
  });
  it('reports unknown after expiry without quorum', () => {
    const expired = { ...proposal, expiresAt: '2020-01-01T00:00:00.000Z' };
    assert.equal(evaluateOmegaConsensus(expired, [], '2026-09-21T00:00:00.000Z').status, 'UNKNOWN');
  });
});
