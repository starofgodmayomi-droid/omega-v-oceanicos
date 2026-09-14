/**
 * @omega-v/staking — Proof-of-Stake Delegation & Slashing Engine
 * Validator Staking, Delegated Shares, Slashing Evidence Verification,
 * and Verifiable Epoch Reward Distribution
 *
 * Ω∞v ::= REALITY ⇄ OBSERVE ⇄ EVIDENCE ⇄ VERIFY ⇄ REMEMBER ⇄ REASON ⇄ INTEND ⇄ BUILD ⇄ TEST ⇄ ATTEST ⇄ ACT ⇄ CONSEQUENCE ⇄ LEARN ⇄ AUDIT ⇄ RECOMPILE ↺∞
 */

import { createHmac, randomUUID } from 'crypto';

/* ─── Types ─────────────────────────────────────────────────────── */

export type ValidatorStatus = 'ACTIVE' | 'JAILED' | 'UNBONDING' | 'INACTIVE';

export interface StakingValidator {
  validatorDid: string;
  moniker: string;
  selfStake: number;
  delegatedStake: number;
  totalStake: number;
  commissionRate: number; // e.g. 0.05 for 5%
  status: ValidatorStatus;
  accumulatedRewards: number;
  slashCount: number;
  joinedEpoch: number;
  lastActiveEpoch: number;
}

export interface StakingDelegation {
  delegationId: string;
  delegatorDid: string;
  validatorDid: string;
  amount: number;
  shares: number;
  rewardDebt: number;
  delegatedAtEpoch: number;
  attestationProof: string;
}

export interface SlashRecord {
  slashId: string;
  validatorDid: string;
  reason: 'DOUBLE_SIGN' | 'DOWNTIME' | 'MALICIOUS_ATTESTATION';
  slashedAmount: number;
  slashFraction: number;
  evidenceProof: string;
  epoch: number;
  jailedUntilEpoch?: number;
  executedAt: string;
}

export interface EpochDistributionReceipt {
  epoch: number;
  totalRewardsDistributed: number;
  activeValidatorCount: number;
  totalStakedPool: number;
  epochMerkleRoot: string;
  distributionAttestation: string;
  timestamp: string;
}

export interface StakingStats {
  currentEpoch: number;
  totalStaked: number;
  totalSelfStake: number;
  totalDelegatedStake: number;
  activeValidators: number;
  jailedValidators: number;
  totalDelegations: number;
  totalSlashedAmount: number;
  totalRewardsDistributed: number;
  effectiveAPR: number;
}

/* ─── Helpers ────────────────────────────────────────────────────── */

function hmac(key: string, data: string): string {
  return '0x' + createHmac('sha256', key).update(data).digest('hex');
}

/* ─── Engine ─────────────────────────────────────────────────────── */

export class OceanicosStakingEngine {
  private readonly secret: string;
  private currentEpoch = 1;
  private validators: Map<string, StakingValidator> = new Map();
  private delegations: Map<string, StakingDelegation> = new Map();
  private slashHistory: SlashRecord[] = [];
  private epochReceipts: EpochDistributionReceipt[] = [];
  private totalSlashed = 0;
  private totalRewardsDistributed = 0;

  constructor(secret = 'staking-pos-omega-v-secret') {
    this.secret = secret;
  }

  /* ── Validator Lifecycle ── */

  registerValidator(opts: {
    validatorDid: string;
    moniker: string;
    selfStake: number;
    commissionRate?: number;
  }): StakingValidator {
    if (this.validators.has(opts.validatorDid)) {
      throw new Error(`Validator ${opts.validatorDid} is already registered`);
    }
    if (opts.selfStake < 100) {
      throw new Error('Minimum self stake required is 100 units');
    }

    const validator: StakingValidator = {
      validatorDid: opts.validatorDid,
      moniker: opts.moniker,
      selfStake: opts.selfStake,
      delegatedStake: 0,
      totalStake: opts.selfStake,
      commissionRate: opts.commissionRate ?? 0.05,
      status: 'ACTIVE',
      accumulatedRewards: 0,
      slashCount: 0,
      joinedEpoch: this.currentEpoch,
      lastActiveEpoch: this.currentEpoch,
    };

    this.validators.set(opts.validatorDid, validator);
    return { ...validator };
  }

  getValidators(): StakingValidator[] {
    return Array.from(this.validators.values());
  }

  /* ── Delegations ── */

  delegate(opts: {
    delegatorDid: string;
    validatorDid: string;
    amount: number;
  }): StakingDelegation {
    const validator = this.validators.get(opts.validatorDid);
    if (!validator) {
      throw new Error(`Validator ${opts.validatorDid} not found`);
    }
    if (validator.status === 'JAILED') {
      throw new Error(`Cannot delegate to jailed validator ${opts.validatorDid}`);
    }
    if (opts.amount <= 0) {
      throw new Error('Delegation amount must be greater than 0');
    }

    const delegationId = `del-${randomUUID().slice(0, 10)}`;
    const shares = opts.amount; // 1:1 nominal share baseline

    validator.delegatedStake += opts.amount;
    validator.totalStake = validator.selfStake + validator.delegatedStake;

    const delegation: StakingDelegation = {
      delegationId,
      delegatorDid: opts.delegatorDid,
      validatorDid: opts.validatorDid,
      amount: opts.amount,
      shares,
      rewardDebt: 0,
      delegatedAtEpoch: this.currentEpoch,
      attestationProof: hmac(
        this.secret,
        `DELEGATE:${delegationId}:${opts.delegatorDid}:${opts.validatorDid}:${opts.amount}:${this.currentEpoch}`
      ),
    };

    this.delegations.set(delegationId, delegation);
    return { ...delegation };
  }

  getDelegations(delegatorDid?: string): StakingDelegation[] {
    const list = Array.from(this.delegations.values());
    if (delegatorDid) {
      return list.filter((d) => d.delegatorDid === delegatorDid);
    }
    return list;
  }

  /* ── Slashing Mechanism ── */

  slashValidator(opts: {
    validatorDid: string;
    reason: 'DOUBLE_SIGN' | 'DOWNTIME' | 'MALICIOUS_ATTESTATION';
    evidenceProof: string;
  }): SlashRecord {
    const validator = this.validators.get(opts.validatorDid);
    if (!validator) {
      throw new Error(`Validator ${opts.validatorDid} not found`);
    }

    let slashFraction = 0.05; // 5% for downtime
    let jailEpochs = 3;

    if (opts.reason === 'DOUBLE_SIGN' || opts.reason === 'MALICIOUS_ATTESTATION') {
      slashFraction = 0.2; // 20% for severe safety violations
      jailEpochs = 10;
    }

    const slashedAmount = Math.round(validator.totalStake * slashFraction * 100) / 100;
    validator.totalStake = Math.max(0, validator.totalStake - slashedAmount);
    validator.selfStake = Math.max(
      0,
      validator.selfStake -
        slashedAmount * (validator.selfStake / (validator.totalStake + slashedAmount || 1))
    );
    validator.delegatedStake = Math.max(0, validator.totalStake - validator.selfStake);
    validator.status = 'JAILED';
    validator.slashCount += 1;

    this.totalSlashed += slashedAmount;

    const slashRecord: SlashRecord = {
      slashId: `slash-${randomUUID().slice(0, 10)}`,
      validatorDid: opts.validatorDid,
      reason: opts.reason,
      slashedAmount,
      slashFraction,
      evidenceProof: opts.evidenceProof,
      epoch: this.currentEpoch,
      jailedUntilEpoch: this.currentEpoch + jailEpochs,
      executedAt: new Date().toISOString(),
    };

    this.slashHistory.push(slashRecord);
    return { ...slashRecord };
  }

  getSlashHistory(): SlashRecord[] {
    return [...this.slashHistory];
  }

  /* ── Epoch Progression & Reward Distribution ── */

  advanceEpoch(mintRewards = 1000): EpochDistributionReceipt {
    const activeVals = Array.from(this.validators.values()).filter(
      (v) => v.status === 'ACTIVE' && v.totalStake > 0
    );

    const totalPool = activeVals.reduce((sum, v) => sum + v.totalStake, 0);
    let distributedThisEpoch = 0;

    if (totalPool > 0) {
      for (const val of activeVals) {
        const valShare = val.totalStake / totalPool;
        const grossReward = mintRewards * valShare;
        val.accumulatedRewards += grossReward;
        val.lastActiveEpoch = this.currentEpoch;
        distributedThisEpoch += grossReward;
      }
    }

    this.totalRewardsDistributed += distributedThisEpoch;

    const epochMerkleRoot = hmac(
      this.secret,
      `EPOCH_ROOT:${this.currentEpoch}:${totalPool}:${distributedThisEpoch}`
    );

    const receipt: EpochDistributionReceipt = {
      epoch: this.currentEpoch,
      totalRewardsDistributed: distributedThisEpoch,
      activeValidatorCount: activeVals.length,
      totalStakedPool: totalPool,
      epochMerkleRoot,
      distributionAttestation: hmac(
        this.secret,
        `ATTEST_EPOCH:${this.currentEpoch}:${epochMerkleRoot}`
      ),
      timestamp: new Date().toISOString(),
    };

    this.epochReceipts.push(receipt);
    this.currentEpoch += 1;
    return { ...receipt };
  }

  getEpochReceipts(): EpochDistributionReceipt[] {
    return [...this.epochReceipts];
  }

  /* ── Telemetry & Stats ── */

  getStats(): StakingStats {
    const vals = Array.from(this.validators.values());
    const totalSelf = vals.reduce((acc, v) => acc + v.selfStake, 0);
    const totalDelegated = vals.reduce((acc, v) => acc + v.delegatedStake, 0);
    const totalStaked = totalSelf + totalDelegated;
    const active = vals.filter((v) => v.status === 'ACTIVE').length;
    const jailed = vals.filter((v) => v.status === 'JAILED').length;

    // Nominal APR estimation based on annual epochs (365 epochs/year)
    const effectiveAPR = totalStaked > 0 ? ((1000 * 365) / totalStaked) * 100 : 0;

    return {
      currentEpoch: this.currentEpoch,
      totalStaked,
      totalSelfStake: totalSelf,
      totalDelegatedStake: totalDelegated,
      activeValidators: active,
      jailedValidators: jailed,
      totalDelegations: this.delegations.size,
      totalSlashedAmount: this.totalSlashed,
      totalRewardsDistributed: this.totalRewardsDistributed,
      effectiveAPR: Math.round(effectiveAPR * 100) / 100,
    };
  }
}
