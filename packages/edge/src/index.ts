import crypto from 'crypto';
import { Observation } from '@omega-v/types';
import { Observer } from '@omega-v/observer';

export interface EdgeNodeConfig {
  nodeId: string;
  environment?: string;
  maxBufferSize?: number;
  autoFlushThreshold?: number;
}

export interface EdgeBatch {
  batchId: string;
  nodeId: string;
  merkleRoot: string;
  observations: Observation[];
  createdAt: string;
}

export interface EdgeSyncResult {
  success: boolean;
  batchId: string;
  syncedCount: number;
  merkleRoot: string;
  syncedAt: string;
  reason?: string;
}

/**
 * EdgeObserver: Lightweight edge observation collector with offline-first
 * Merkle batching and automatic provenance synchronization.
 */
export class EdgeObserver {
  private observer: Observer;
  private buffer: Observation[] = [];
  private nodeId: string;
  private environment: string;
  private maxBufferSize: number;
  private autoFlushThreshold: number;
  private isOnline = true;

  constructor(config: EdgeNodeConfig) {
    this.nodeId = config.nodeId;
    this.environment = config.environment || 'edge-device';
    this.maxBufferSize = config.maxBufferSize || 1000;
    this.autoFlushThreshold = config.autoFlushThreshold || 50;
    this.observer = new Observer();
  }

  /**
   * Capture a new observation at the edge
   */
  public capture(
    claim: string,
    category = 'edge-event',
    metadata: Record<string, unknown> = {},
    confidence = 0.95
  ): Observation {
    if (this.buffer.length >= this.maxBufferSize) {
      throw new Error(`Edge buffer capacity exceeded (${this.maxBufferSize} items)`);
    }

    const observation = this.observer.observe({
      claim,
      category,
      source: {
        system: `edge-node:${this.nodeId}`,
        version: '1.0.0-edge',
        environment: this.environment,
      },
      observedBy: `edge-actor:${this.nodeId}`,
      metadata: {
        ...metadata,
        edgeNodeId: this.nodeId,
        bufferedAt: new Date().toISOString(),
      },
      confidence,
      confidenceReason: 'Captured locally at network edge',
    });

    this.buffer.push(observation);
    return observation;
  }

  /**
   * Compute Merkle Root of current buffered observations
   */
  public computeMerkleRoot(): string {
    if (this.buffer.length === 0) {
      return '0x0000000000000000000000000000000000000000000000000000000000000000';
    }

    let hashes = this.buffer.map((obs) =>
      crypto.createHash('sha256').update(JSON.stringify(obs)).digest('hex')
    );

    while (hashes.length > 1) {
      if (hashes.length % 2 !== 0) {
        hashes.push(hashes[hashes.length - 1]);
      }

      const nextLevel: string[] = [];
      for (let i = 0; i < hashes.length; i += 2) {
        const combined = hashes[i] + hashes[i + 1];
        nextLevel.push(crypto.createHash('sha256').update(combined).digest('hex'));
      }
      hashes = nextLevel;
    }

    return `0x${hashes[0]}`;
  }

  /**
   * Export current buffer as a signed Edge Batch
   */
  public createBatch(): EdgeBatch {
    const merkleRoot = this.computeMerkleRoot();
    const batchId = `batch-${this.nodeId}-${Date.now()}`;
    const batch: EdgeBatch = {
      batchId,
      nodeId: this.nodeId,
      merkleRoot,
      observations: [...this.buffer],
      createdAt: new Date().toISOString(),
    };
    return batch;
  }

  /**
   * Flush buffered observations to central provenance loop
   */
  public async flush(
    syncHandler?: (batch: EdgeBatch) => Promise<boolean>
  ): Promise<EdgeSyncResult> {
    if (this.buffer.length === 0) {
      return {
        success: true,
        batchId: `batch-${this.nodeId}-empty`,
        syncedCount: 0,
        merkleRoot: this.computeMerkleRoot(),
        syncedAt: new Date().toISOString(),
        reason: 'Buffer empty, nothing to flush',
      };
    }

    if (!this.isOnline) {
      return {
        success: false,
        batchId: `batch-${this.nodeId}-failed`,
        syncedCount: 0,
        merkleRoot: this.computeMerkleRoot(),
        syncedAt: new Date().toISOString(),
        reason: 'Edge node is offline',
      };
    }

    const batch = this.createBatch();
    let syncSuccess = true;

    if (syncHandler) {
      try {
        syncSuccess = await syncHandler(batch);
      } catch (err) {
        syncSuccess = false;
      }
    }

    if (syncSuccess) {
      const count = this.buffer.length;
      this.buffer = [];
      return {
        success: true,
        batchId: batch.batchId,
        syncedCount: count,
        merkleRoot: batch.merkleRoot,
        syncedAt: new Date().toISOString(),
      };
    }

    return {
      success: false,
      batchId: batch.batchId,
      syncedCount: 0,
      merkleRoot: batch.merkleRoot,
      syncedAt: new Date().toISOString(),
      reason: 'Sync handler rejected edge batch',
    };
  }

  /**
   * Network status controls
   */
  public setOnline(status: boolean): void {
    this.isOnline = status;
  }

  public getOnlineStatus(): boolean {
    return this.isOnline;
  }

  public getBufferSize(): number {
    return this.buffer.length;
  }

  public getAutoFlushThreshold(): number {
    return this.autoFlushThreshold;
  }

  public getBufferedObservations(): ReadonlyArray<Observation> {
    return [...this.buffer];
  }
}

export default EdgeObserver;
