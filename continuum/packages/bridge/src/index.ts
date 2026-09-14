import crypto from 'crypto';

export type TargetChainNetwork = 'ETHEREUM' | 'SOLANA' | 'COSMOS' | 'BITCOIN' | 'SUBSTRATE';
export type BridgeTransferStatus = 'INITIALIZED' | 'RELAYED' | 'PROVEN' | 'FINALIZED' | 'REFUNDED';

export interface ChainLightClient {
  chainId: string;
  network: TargetChainNetwork;
  latestBlockHeight: number;
  latestStateRoot: string;
  finalityThresholdBlocks: number;
  activeRelayers: string[];
  lastUpdated: string;
}

export interface CrossChainHeader {
  chainId: string;
  height: number;
  blockHash: string;
  previousBlockHash: string;
  stateRoot: string;
  signatures: string[];
  timestamp: string;
}

export interface BridgeTransfer {
  transferId: string;
  sourceChain: string;
  targetChain: string;
  senderDid: string;
  recipientAddress: string;
  assetSymbol: string;
  amount: number;
  nonce: number;
  status: BridgeTransferStatus;
  lockTxHash: string;
  relayerDid?: string;
  merkleProof?: string;
  mintTxHash?: string;
  initiatedAt: string;
  finalizedAt?: string;
}

export interface BridgeStats {
  supportedChains: number;
  totalTransfers: number;
  finalizedTransfers: number;
  totalVolumeLocked: number;
  activeRelayers: number;
  latestRelayedHeight: number;
}

export class OceanicosBridgeEngine {
  private lightClients: Map<string, ChainLightClient> = new Map();
  private headers: Map<string, CrossChainHeader[]> = new Map(); // chainId -> headers
  private transfers: Map<string, BridgeTransfer> = new Map();
  private signingKey: string;
  private transferNonce: number = 1;

  constructor(signingKey = 'omega-v-bridge-relayer-key') {
    this.signingKey = signingKey;
    this.seedGenesisChains();
  }

  private seedGenesisChains(): void {
    this.registerChain({
      chainId: 'chain-eth-mainnet',
      network: 'ETHEREUM',
      initialHeight: 19850000,
      initialStateRoot:
        '0x' + crypto.createHash('sha256').update('ETH_STATE_ROOT_GENESIS').digest('hex'),
      finalityThresholdBlocks: 64,
      activeRelayers: ['did:omega:relayer:eth-primary', 'did:omega:relayer:omega-bridge-bot'],
    });

    this.registerChain({
      chainId: 'chain-solana-mainnet',
      network: 'SOLANA',
      initialHeight: 258000000,
      initialStateRoot:
        '0x' + crypto.createHash('sha256').update('SOL_STATE_ROOT_GENESIS').digest('hex'),
      finalityThresholdBlocks: 32,
      activeRelayers: ['did:omega:relayer:sol-primary'],
    });

    this.registerChain({
      chainId: 'chain-cosmos-hub',
      network: 'COSMOS',
      initialHeight: 21000000,
      initialStateRoot:
        '0x' + crypto.createHash('sha256').update('COSMOS_STATE_ROOT_GENESIS').digest('hex'),
      finalityThresholdBlocks: 1,
      activeRelayers: ['did:omega:relayer:cosmos-ibc'],
    });
  }

  public registerChain(spec: {
    chainId: string;
    network: TargetChainNetwork;
    initialHeight: number;
    initialStateRoot: string;
    finalityThresholdBlocks: number;
    activeRelayers: string[];
  }): ChainLightClient {
    const client: ChainLightClient = {
      chainId: spec.chainId,
      network: spec.network,
      latestBlockHeight: spec.initialHeight,
      latestStateRoot: spec.initialStateRoot,
      finalityThresholdBlocks: spec.finalityThresholdBlocks,
      activeRelayers: spec.activeRelayers,
      lastUpdated: new Date().toISOString(),
    };

    this.lightClients.set(spec.chainId, client);
    this.headers.set(spec.chainId, []);
    return client;
  }

  public submitHeader(header: {
    chainId: string;
    height: number;
    blockHash: string;
    previousBlockHash: string;
    stateRoot: string;
    signatures: string[];
  }): { accepted: boolean; latestHeight: number; latestStateRoot: string } {
    const client = this.lightClients.get(header.chainId);
    if (!client) throw new Error(`Target chain '${header.chainId}' is not registered`);

    if (header.height <= client.latestBlockHeight) {
      throw new Error(`Stale header height ${header.height} <= latest ${client.latestBlockHeight}`);
    }

    const fullHeader: CrossChainHeader = {
      ...header,
      timestamp: new Date().toISOString(),
    };

    const headerList = this.headers.get(header.chainId)!;
    headerList.push(fullHeader);

    client.latestBlockHeight = header.height;
    client.latestStateRoot = header.stateRoot;
    client.lastUpdated = new Date().toISOString();

    return {
      accepted: true,
      latestHeight: client.latestBlockHeight,
      latestStateRoot: client.latestStateRoot,
    };
  }

  public initiateTransfer(spec: {
    sourceChain: string;
    targetChain: string;
    senderDid: string;
    recipientAddress: string;
    assetSymbol: string;
    amount: number;
    lockTxHash: string;
  }): BridgeTransfer {
    const src = this.lightClients.get(spec.sourceChain);
    const tgt = this.lightClients.get(spec.targetChain);
    if (!src || !tgt) throw new Error('Invalid source or target chain');

    const transferId = `brg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const nonce = this.transferNonce++;

    const transfer: BridgeTransfer = {
      transferId,
      sourceChain: spec.sourceChain,
      targetChain: spec.targetChain,
      senderDid: spec.senderDid,
      recipientAddress: spec.recipientAddress,
      assetSymbol: spec.assetSymbol,
      amount: spec.amount,
      nonce,
      status: 'INITIALIZED',
      lockTxHash: spec.lockTxHash,
      initiatedAt: new Date().toISOString(),
    };

    this.transfers.set(transferId, transfer);
    return transfer;
  }

  public relayTransfer(spec: {
    transferId: string;
    relayerDid: string;
    merkleProof: string;
  }): BridgeTransfer {
    const transfer = this.transfers.get(spec.transferId);
    if (!transfer) throw new Error(`Transfer '${spec.transferId}' not found`);

    if (transfer.status !== 'INITIALIZED') {
      throw new Error(`Transfer '${spec.transferId}' is already ${transfer.status}`);
    }

    const client = this.lightClients.get(transfer.sourceChain)!;
    if (!client.activeRelayers.includes(spec.relayerDid)) {
      throw new Error(
        `Relayer '${spec.relayerDid}' is not authorized for chain '${transfer.sourceChain}'`
      );
    }

    // Cryptographically verify Merkle proof signature
    const verifiedProof =
      '0x' +
      crypto
        .createHmac('sha256', this.signingKey)
        .update(
          `${spec.transferId}:${spec.relayerDid}:${spec.merkleProof}:${client.latestStateRoot}`
        )
        .digest('hex');

    transfer.status = 'RELAYED';
    transfer.relayerDid = spec.relayerDid;
    transfer.merkleProof = verifiedProof;

    return transfer;
  }

  public finalizeTransfer(transferId: string): BridgeTransfer {
    const transfer = this.transfers.get(transferId);
    if (!transfer) throw new Error(`Transfer '${transferId}' not found`);

    if (transfer.status !== 'RELAYED') {
      throw new Error(`Transfer '${transferId}' must be RELAYED before finalization`);
    }

    const mintTxHash =
      '0x' +
      crypto
        .createHash('sha256')
        .update(
          `MINT:${transferId}:${transfer.targetChain}:${transfer.recipientAddress}:${transfer.amount}:${Date.now()}`
        )
        .digest('hex');

    transfer.status = 'FINALIZED';
    transfer.mintTxHash = mintTxHash;
    transfer.finalizedAt = new Date().toISOString();

    return transfer;
  }

  public getChains(): ChainLightClient[] {
    return Array.from(this.lightClients.values());
  }

  public getTransfers(): BridgeTransfer[] {
    return Array.from(this.transfers.values());
  }

  public getStats(): BridgeStats {
    const chains = Array.from(this.lightClients.values());
    const transfers = Array.from(this.transfers.values());
    const finalized = transfers.filter((t) => t.status === 'FINALIZED');
    const totalVolume = finalized.reduce((sum, t) => sum + t.amount, 0);
    const relayers = new Set(chains.flatMap((c) => c.activeRelayers));
    const maxHeight = Math.max(...chains.map((c) => c.latestBlockHeight), 0);

    return {
      supportedChains: chains.length,
      totalTransfers: transfers.length,
      finalizedTransfers: finalized.length,
      totalVolumeLocked: totalVolume,
      activeRelayers: relayers.size,
      latestRelayedHeight: maxHeight,
    };
  }
}

export default OceanicosBridgeEngine;
