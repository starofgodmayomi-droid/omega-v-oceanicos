import { OceanicosGovernorEngine } from '../index';

describe('@omega-v/governor — On-Chain Timelocked Decentralized Governance Engine', () => {
  let governor: OceanicosGovernorEngine;

  beforeEach(() => {
    governor = new OceanicosGovernorEngine('test-governor-secret', 50, 0);
  });

  it('should create a governance proposal with cryptographic proposalHash', () => {
    const p = governor.propose({
      proposerDid: 'did:omega:agent:dao-proposer',
      title: 'Upgrade Gas Target and Block Size',
      description: 'Increase block size from 2MB to 4MB for high throughput',
      actions: [
        {
          targetService: 'sequencer',
          actionType: 'UPDATE_CONFIG',
          parameters: { maxBlockSizeBytes: 4194304 },
        },
      ],
    });

    expect(p.proposalId).toMatch(/^gov-/);
    expect(p.status).toBe('ACTIVE');
    expect(p.proposalHash).toMatch(/^0x/);
    expect(p.actions).toHaveLength(1);
    expect(governor.getProposals()).toHaveLength(1);
  });

  it('should cast votes, track voting power tallies, and enforce single-vote per DID', () => {
    const p = governor.propose({
      proposerDid: 'did:omega:agent:dao-proposer',
      title: 'Adjust Staking Slashing Rate',
      description: 'Reduce downtime slashing penalty',
      actions: [{ targetService: 'staking', actionType: 'SET_PENALTY', parameters: { rate: 0.01 } }],
    });

    const vote1 = governor.castVote({
      proposalId: p.proposalId,
      voterDid: 'did:omega:voter:alice',
      choice: 'FOR',
      votingPower: 30,
      reason: 'Support reduced slashing risk',
    });
    expect(vote1.voteHash).toMatch(/^0x/);

    const vote2 = governor.castVote({
      proposalId: p.proposalId,
      voterDid: 'did:omega:voter:bob',
      choice: 'AGAINST',
      votingPower: 10,
    });
    expect(vote2.choice).toBe('AGAINST');

    const updated = governor.getProposal(p.proposalId)!;
    expect(updated.forVotes).toBe(30);
    expect(updated.againstVotes).toBe(10);

    // Re-vote from alice should throw
    expect(() => {
      governor.castVote({
        proposalId: p.proposalId,
        voterDid: 'did:omega:voter:alice',
        choice: 'FOR',
        votingPower: 30,
      });
    }).toThrow('already voted');
  });

  it('should transition proposal through Queue and Execution lifecycle with proof receipt', () => {
    const p = governor.propose({
      proposerDid: 'did:omega:agent:dao-proposer',
      title: 'Authorize Treasury Grant',
      description: 'Deploy 50,000 OMEGA for developer grants',
      actions: [{ targetService: 'treasury', actionType: 'DISBURSE', parameters: { amount: 50000 } }],
      quorumPower: 40,
    });

    governor.castVote({
      proposalId: p.proposalId,
      voterDid: 'did:omega:voter:whale',
      choice: 'FOR',
      votingPower: 60,
    });

    // Queue proposal
    const queued = governor.queueProposal(p.proposalId);
    expect(queued.status).toBe('QUEUED');
    expect(queued.etaExecutionTime).toBeDefined();

    // Execute proposal
    const receipt = governor.executeProposal(p.proposalId, 'did:omega:executor:relayer');
    expect(receipt.proposalId).toBe(p.proposalId);
    expect(receipt.executedActionsCount).toBe(1);
    expect(receipt.executionHash).toMatch(/^0x/);

    const executed = governor.getProposal(p.proposalId)!;
    expect(executed.status).toBe('EXECUTED');
    expect(executed.executionReceiptHash).toBe(receipt.executionHash);
  });

  it('should defeat proposals that fail quorum or majority', () => {
    const p = governor.propose({
      proposerDid: 'did:omega:agent:dao-proposer',
      title: 'Controversial Action',
      description: 'Test defeat',
      actions: [{ targetService: 'kernel', actionType: 'NOOP', parameters: {} }],
      quorumPower: 100,
    });

    governor.castVote({
      proposalId: p.proposalId,
      voterDid: 'did:omega:voter:01',
      choice: 'FOR',
      votingPower: 20,
    });

    expect(() => {
      governor.queueProposal(p.proposalId);
    }).toThrow('failed quorum');

    expect(governor.getProposal(p.proposalId)?.status).toBe('DEFEATED');
  });

  it('should track cumulative statistics', () => {
    const p = governor.propose({
      proposerDid: 'did:omega:agent:dao-proposer',
      title: 'Stats test',
      description: 'Test stats',
      actions: [{ targetService: 'test', actionType: 'TEST', parameters: {} }],
    });
    governor.castVote({ proposalId: p.proposalId, voterDid: 'did:omega:v1', choice: 'FOR', votingPower: 25 });
    governor.castVote({ proposalId: p.proposalId, voterDid: 'did:omega:v2', choice: 'FOR', votingPower: 30 });

    const stats = governor.getStats();
    expect(stats.totalProposals).toBe(1);
    expect(stats.activeProposals).toBe(1);
    expect(stats.totalVotesCast).toBe(2);
    expect(stats.cumulativeVotingPower).toBe(55);
  });
});
