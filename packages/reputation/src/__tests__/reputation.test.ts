import { OceanicosReputationEngine } from '../index';

describe('@omega-v/reputation — Verifiable Agent Reputation Engine', () => {
  let rep: OceanicosReputationEngine;

  beforeEach(() => {
    rep = new OceanicosReputationEngine('test-rep-secret');
  });

  it('should register agents with trust tiers', () => {
    const agent = rep.registerAgent({
      agentDid: 'did:omega:agent:worker-01',
      moniker: 'Worker Agent 01',
      initialScore: 600,
    });

    expect(agent.agentDid).toBe('did:omega:agent:worker-01');
    expect(agent.reputationScore).toBe(600);
    expect(agent.trustTier).toBe('ESTABLISHED');
    expect(rep.getAgents()).toHaveLength(1);
  });

  it('should submit feedback attestations and update scores with cryptographic proofs', () => {
    rep.registerAgent({
      agentDid: 'did:omega:agent:alice',
      moniker: 'Alice',
      initialScore: 800, // AUTHORITY (weight = 1.6)
    });
    rep.registerAgent({
      agentDid: 'did:omega:agent:bob',
      moniker: 'Bob',
      initialScore: 500,
    });

    const receipt = rep.submitFeedback({
      fromDid: 'did:omega:agent:alice',
      targetDid: 'did:omega:agent:bob',
      scoreDelta: 50,
      reason: 'Accurate and fast task execution',
    });

    expect(receipt.receiptId).toMatch(/^fdbk-/);
    expect(receipt.newScore).toBe(580); // 500 + 50 * 1.6 = 580
    expect(receipt.feedbackProof).toMatch(/^0x/);

    const bob = rep.getAgent('did:omega:agent:bob')!;
    expect(bob.positiveAttestations).toBe(1);
    expect(bob.trustTier).toBe('ESTABLISHED');
  });

  it('should slash misbehaving agents and update trust tier to UNTRUSTED', () => {
    rep.registerAgent({
      agentDid: 'did:omega:agent:malicious-worker',
      moniker: 'Malicious Worker',
      initialScore: 400,
    });

    const slash = rep.slashAgent({
      targetDid: 'did:omega:agent:malicious-worker',
      slashPenalty: 250,
      reason: 'Submitted invalid cryptographic witness proof',
      evidenceHash: '0xinvalid_witness_hash_7788',
    });

    expect(slash.slashId).toMatch(/^slsh-/);
    expect(slash.newScore).toBe(150);
    expect(slash.slashProof).toMatch(/^0x/);

    const badAgent = rep.getAgent('did:omega:agent:malicious-worker')!;
    expect(badAgent.trustTier).toBe('UNTRUSTED');
    expect(badAgent.slashedCount).toBe(1);
  });

  it('should decay scores toward baseline', () => {
    rep.registerAgent({
      agentDid: 'did:omega:agent:high-score',
      moniker: 'High Scorer',
      initialScore: 900,
    });

    rep.decayScores(0.9); // diff = 400 * 0.9 = 360 => score = 860
    const decayed = rep.getAgent('did:omega:agent:high-score')!;
    expect(decayed.reputationScore).toBe(860);
  });

  it('should calculate global reputation metrics and tier distributions', () => {
    rep.registerAgent({ agentDid: 'did:omega:agent:a1', moniker: 'A1', initialScore: 850 });
    rep.registerAgent({ agentDid: 'did:omega:agent:a2', moniker: 'A2', initialScore: 200 });

    const stats = rep.getStats();
    expect(stats.totalAgents).toBe(2);
    expect(stats.authorityAgents).toBe(1);
    expect(stats.untrustedAgents).toBe(1);
    expect(stats.averageReputationScore).toBe(525);
  });
});
