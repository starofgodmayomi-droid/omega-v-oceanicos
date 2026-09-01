import { OceanicosStakingEngine } from '../index';

describe('@omega-v/staking — Proof-of-Stake Delegation & Slashing Engine', () => {
  let engine: OceanicosStakingEngine;

  beforeEach(() => {
    engine = new OceanicosStakingEngine('test-staking-secret');
  });

  it('should register validators with initial self stake', () => {
    const val = engine.registerValidator({
      validatorDid: 'did:omega:val:alpha',
      moniker: 'Alpha Sentinel',
      selfStake: 500,
      commissionRate: 0.05,
    });

    expect(val.validatorDid).toBe('did:omega:val:alpha');
    expect(val.selfStake).toBe(500);
    expect(val.totalStake).toBe(500);
    expect(val.status).toBe('ACTIVE');
    expect(engine.getValidators()).toHaveLength(1);
  });

  it('should reject validator registration with insufficient self stake', () => {
    expect(() => {
      engine.registerValidator({
        validatorDid: 'did:omega:val:poor',
        moniker: 'Underfunded Node',
        selfStake: 50,
      });
    }).toThrow('Minimum self stake required is 100 units');
  });

  it('should allow delegators to delegate stake with cryptographic attestation', () => {
    engine.registerValidator({
      validatorDid: 'did:omega:val:alpha',
      moniker: 'Alpha Sentinel',
      selfStake: 500,
    });

    const delegation = engine.delegate({
      delegatorDid: 'did:omega:user:alice',
      validatorDid: 'did:omega:val:alpha',
      amount: 250,
    });

    expect(delegation.delegationId).toMatch(/^del-/);
    expect(delegation.amount).toBe(250);
    expect(delegation.attestationProof).toMatch(/^0x/);

    const val = engine.getValidators()[0];
    expect(val.delegatedStake).toBe(250);
    expect(val.totalStake).toBe(750);
  });

  it('should slash misbehaving validators and jail them', () => {
    engine.registerValidator({
      validatorDid: 'did:omega:val:bad',
      moniker: 'Byzantine Node',
      selfStake: 1000,
    });

    const slash = engine.slashValidator({
      validatorDid: 'did:omega:val:bad',
      reason: 'DOUBLE_SIGN',
      evidenceProof: '0xdouble_sign_block_headers_evidence',
    });

    expect(slash.slashId).toMatch(/^slash-/);
    expect(slash.slashFraction).toBe(0.20);
    expect(slash.slashedAmount).toBe(200);

    const val = engine.getValidators()[0];
    expect(val.status).toBe('JAILED');
    expect(val.slashCount).toBe(1);
    expect(val.totalStake).toBe(800);

    // Ensure cannot delegate to jailed validator
    expect(() => {
      engine.delegate({
        delegatorDid: 'did:omega:user:bob',
        validatorDid: 'did:omega:val:bad',
        amount: 100,
      });
    }).toThrow('Cannot delegate to jailed validator');
  });

  it('should advance epoch, distribute staking rewards, and calculate verifiable receipts & stats', () => {
    engine.registerValidator({
      validatorDid: 'did:omega:val:v1',
      moniker: 'Node 1',
      selfStake: 600,
    });
    engine.registerValidator({
      validatorDid: 'did:omega:val:v2',
      moniker: 'Node 2',
      selfStake: 400,
    });

    const receipt = engine.advanceEpoch(1000);
    expect(receipt.epoch).toBe(1);
    expect(receipt.totalRewardsDistributed).toBe(1000);
    expect(receipt.activeValidatorCount).toBe(2);
    expect(receipt.epochMerkleRoot).toMatch(/^0x/);
    expect(receipt.distributionAttestation).toMatch(/^0x/);

    const vals = engine.getValidators();
    expect(vals[0].accumulatedRewards).toBe(600); // 60% of 1000
    expect(vals[1].accumulatedRewards).toBe(400); // 40% of 1000

    const stats = engine.getStats();
    expect(stats.currentEpoch).toBe(2);
    expect(stats.totalStaked).toBe(1000);
    expect(stats.activeValidators).toBe(2);
    expect(stats.totalRewardsDistributed).toBe(1000);
  });
});
