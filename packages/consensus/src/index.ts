import crypto from 'crypto';

export type ValidatorStatus = 'ACTIVE' | 'JAILED' | 'SLASHED';
export type QCType = 'PREPARE' | 'PRECOMMIT' | 'COMMIT' | 'FINAL';

export interface ValidatorNode {
  validatorId: string;
  did: string;
  stake: number;
  status: ValidatorStatus;
  blocksProposed: number;
  votesCount: number;
  slashedAmount: number;
  joinedAt: string;
}

export interface ConsensusBlock {
  height: number;
  previousBlockHash: string;
  stateRoot: string;
  transactionsRoot: string;
  proposerDid: string;
  timestamp: string;
  attestationProofs: string[];
  blockHash: string;
  quorumCertificate?: QuorumCertificate;
}

export interface QuorumCertificate {
  qcId: string;
  blockHeight: number;
  blockHash: string;
  viewNumber: number;
  type: QCType;
  signatures: Record<string, string>; // validatorDid -> signature
  accumulatedStake: number;
  totalActiveStake: number;
  quorumReached: boolean;
  sealedAt: string;
}

export interface SlashingRecord {
  recordId: string;
  validatorDid: string;
  reason: string;
  slashedStake: number;
  evidenceHash: string;
  timestamp: string;
}

export interface ConsensusStats {
  chainHeight: number;
  totalBlocks: number;
  activeValidators: number;
  totalStaked: number;
  totalQCs: number;
  totalSlashedValidators: number;
  lastBlockHash: string;
}

export class OceanicosConsensusEngine {
  private validators: Map<string, ValidatorNode> = new Map();
  private chain: ConsensusBlock[] = [];
  private qcs: Map<string, QuorumCertificate> = new Map();
  private slashingHistory: SlashingRecord[] = [];
  private signingKey: string;
  private currentView: number = 1;

  constructor(signingKey = 'omega-v-consensus-secret-key') {
    this.signingKey = signingKey;
    this.seedGenesisState();
  }

  private seedGenesisState(): void {
    // Register genesis validators
    this.registerValidator({
      did: 'did:omega:validator:genesis-alpha',
      stake: 500000,
    });
    this.registerValidator({
      did: 'did:omega:validator:genesis-beta',
      stake: 300000,
    });
    this.registerValidator({
      did: 'did:omega:validator:genesis-gamma',
      stake: 200000,
    });

    // Create Genesis Block (Height 0)
    const genesisHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
    const stateRoot = crypto.createHash('sha256').update('GENESIS_STATE_ROOT_V6').digest('hex');
    const txRoot = crypto.createHash('sha256').update('GENESIS_TRANSACTIONS').digest('hex');
    const timestamp = new Date().toISOString();

    const blockHash =
      '0x' +
      crypto
        .createHash('sha256')
        .update(
          `0:${genesisHash}:${stateRoot}:${txRoot}:did:omega:validator:genesis-alpha:${timestamp}`
        )
        .digest('hex');

    const genesisBlock: ConsensusBlock = {
      height: 0,
      previousBlockHash: genesisHash,
      stateRoot,
      transactionsRoot: txRoot,
      proposerDid: 'did:omega:validator:genesis-alpha',
      timestamp,
      attestationProofs: ['genesis-proof-000'],
      blockHash,
    };

    this.chain.push(genesisBlock);
  }

  public registerValidator(spec: { did: string; stake: number }): ValidatorNode {
    const validatorId = `val-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const validator: ValidatorNode = {
      validatorId,
      did: spec.did,
      stake: spec.stake,
      status: 'ACTIVE',
      blocksProposed: 0,
      votesCount: 0,
      slashedAmount: 0,
      joinedAt: new Date().toISOString(),
    };
    this.validators.set(spec.did, validator);
    return validator;
  }

  public proposeBlock(spec: {
    proposerDid: string;
    transactions: Record<string, unknown>[];
    stateRoot: string;
    attestationProofs?: string[];
  }): ConsensusBlock {
    const proposer = this.validators.get(spec.proposerDid);
    if (!proposer || proposer.status !== 'ACTIVE') {
      throw new Error(`Validator '${spec.proposerDid}' is not active to propose blocks`);
    }

    const previousBlock = this.chain[this.chain.length - 1];
    const height = previousBlock.height + 1;
    const previousBlockHash = previousBlock.blockHash;
    const txRoot = crypto
      .createHash('sha256')
      .update(JSON.stringify(spec.transactions))
      .digest('hex');
    const timestamp = new Date().toISOString();

    const blockHash =
      '0x' +
      crypto
        .createHash('sha256')
        .update(
          `${height}:${previousBlockHash}:${spec.stateRoot}:${txRoot}:${spec.proposerDid}:${timestamp}`
        )
        .digest('hex');

    const block: ConsensusBlock = {
      height,
      previousBlockHash,
      stateRoot: spec.stateRoot,
      transactionsRoot: txRoot,
      proposerDid: spec.proposerDid,
      timestamp,
      attestationProofs: spec.attestationProofs || [],
      blockHash,
    };

    proposer.blocksProposed++;
    return block;
  }

  public castVote(spec: {
    validatorDid: string;
    blockHash: string;
    blockHeight: number;
    viewNumber?: number;
    voteType?: QCType;
  }): { qc: QuorumCertificate; quorumReached: boolean } {
    const validator = this.validators.get(spec.validatorDid);
    if (!validator || validator.status !== 'ACTIVE') {
      throw new Error(`Validator '${spec.validatorDid}' cannot vote (inactive/slashed)`);
    }

    const view = spec.viewNumber || this.currentView;
    const type = spec.voteType || 'FINAL';
    const qcId = `qc-${spec.blockHeight}-${view}-${type}`;

    let qc = this.qcs.get(qcId);
    if (!qc) {
      qc = {
        qcId,
        blockHeight: spec.blockHeight,
        blockHash: spec.blockHash,
        viewNumber: view,
        type,
        signatures: {},
        accumulatedStake: 0,
        totalActiveStake: this.getTotalActiveStake(),
        quorumReached: false,
        sealedAt: new Date().toISOString(),
      };
      this.qcs.set(qcId, qc);
    }

    // Sign vote
    const votePayload = `${spec.blockHeight}:${spec.blockHash}:${view}:${type}:${spec.validatorDid}`;
    const sig =
      '0x' + crypto.createHmac('sha256', this.signingKey).update(votePayload).digest('hex');

    if (!qc.signatures[spec.validatorDid]) {
      qc.signatures[spec.validatorDid] = sig;
      qc.accumulatedStake += validator.stake;
      validator.votesCount++;
    }

    // Check 2/3+1 supermajority
    const threshold = (qc.totalActiveStake * 2) / 3;
    if (qc.accumulatedStake > threshold) {
      qc.quorumReached = true;
    }

    return { qc, quorumReached: qc.quorumReached };
  }

  public finalizeBlock(block: ConsensusBlock, qc: QuorumCertificate): ConsensusBlock {
    if (!qc.quorumReached) {
      throw new Error(
        `Cannot finalize block: Quorum Certificate has not achieved 2/3+1 supermajority`
      );
    }
    if (qc.blockHash !== block.blockHash) {
      throw new Error(`QC blockHash mismatch (QC: ${qc.blockHash}, Block: ${block.blockHash})`);
    }

    block.quorumCertificate = qc;
    this.chain.push(block);
    this.currentView++;
    return block;
  }

  public detectEquivocation(spec: {
    validatorDid: string;
    blockHeight: number;
    blockHashA: string;
    blockHashB: string;
  }): SlashingRecord {
    const validator = this.validators.get(spec.validatorDid);
    if (!validator) throw new Error(`Validator '${spec.validatorDid}' not found`);

    if (spec.blockHashA === spec.blockHashB) {
      throw new Error('Equivocation requires conflicting block hashes');
    }

    const slashAmount = validator.stake; // 100% slash for Byzantine equivocation
    validator.stake = 0;
    validator.slashedAmount += slashAmount;
    validator.status = 'SLASHED';

    const evidenceHash = crypto
      .createHash('sha256')
      .update(`${spec.validatorDid}:${spec.blockHeight}:${spec.blockHashA}:${spec.blockHashB}`)
      .digest('hex');

    const record: SlashingRecord = {
      recordId: `slash-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      validatorDid: spec.validatorDid,
      reason: `Byzantine Equivocation: Proposed/signed conflicting blocks at height ${spec.blockHeight}`,
      slashedStake: slashAmount,
      evidenceHash,
      timestamp: new Date().toISOString(),
    };

    this.slashingHistory.push(record);
    return record;
  }

  public getChain(): ConsensusBlock[] {
    return this.chain;
  }

  public getValidators(): ValidatorNode[] {
    return Array.from(this.validators.values());
  }

  public getQCs(): QuorumCertificate[] {
    return Array.from(this.qcs.values());
  }

  public getSlashingHistory(): SlashingRecord[] {
    return this.slashingHistory;
  }

  public getStats(): ConsensusStats {
    const validators = Array.from(this.validators.values());
    const active = validators.filter((v) => v.status === 'ACTIVE');
    const slashed = validators.filter((v) => v.status === 'SLASHED');
    const totalStaked = active.reduce((sum, v) => sum + v.stake, 0);

    return {
      chainHeight: this.chain[this.chain.length - 1]?.height ?? 0,
      totalBlocks: this.chain.length,
      activeValidators: active.length,
      totalStaked,
      totalQCs: this.qcs.size,
      totalSlashedValidators: slashed.length,
      lastBlockHash: this.chain[this.chain.length - 1]?.blockHash ?? '0x0',
    };
  }

  private getTotalActiveStake(): number {
    return Array.from(this.validators.values())
      .filter((v) => v.status === 'ACTIVE')
      .reduce((sum, v) => sum + v.stake, 0);
  }
}

export default OceanicosConsensusEngine;
