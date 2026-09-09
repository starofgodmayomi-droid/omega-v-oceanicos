/**
 * Replication System: Distributed persistence with conflict-free sync protocols
 * Enables multi-node data synchronization with eventual consistency guarantees
 */

export type ReplicationStrategy = 'primary-replica' | 'peer-to-peer' | 'cascade' | 'ring';
export type SyncProtocol = 'operational-transform' | 'crdt' | 'last-write-wins' | 'vector-clock';
export type ConflictResolution = 'merge' | 'discard' | 'custom' | 'fail-fast';
export type NodeRole = 'primary' | 'replica' | 'peer' | 'observer';
export type NodeStatus = 'healthy' | 'lagging' | 'disconnected' | 'catching-up';

export interface ReplicationNode {
  id: string;
  role: NodeRole;
  status: NodeStatus;
  endpoint: string;
  version: number;
  lastSyncAt: number;
  lagMs: number;
}

export interface ChangeLog {
  id: string;
  nodeId: string;
  timestamp: number;
  sequenceNumber: number;
  operation: 'insert' | 'update' | 'delete';
  resource: string;
  resourceId: string;
  oldValue?: any;
  newValue?: any;
  checksum: string;
}

export interface VectorClock {
  [nodeId: string]: number;
}

export interface ReplicatedData {
  id: string;
  data: any;
  version: number;
  vectorClock: VectorClock;
  checksum: string;
  lastModifiedBy: string;
  lastModifiedAt: number;
  tombstone?: boolean;
}

export interface SyncCheckpoint {
  nodeId: string;
  version: number;
  vectorClock: VectorClock;
  timestamp: number;
  resourcesCount: number;
}

export interface ConflictEvent {
  id: string;
  resourceId: string;
  timestamp: number;
  version1: number;
  version2: number;
  node1: string;
  node2: string;
  resolution: ConflictResolution;
  mergedValue?: any;
}

export interface ReplicationConfig {
  strategy?: ReplicationStrategy;
  protocol?: SyncProtocol;
  conflictResolution?: ConflictResolution;
  syncInterval?: number;
  maxLagMs?: number;
  batchSize?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
}

/**
 * VectorClockManager: Track causality across distributed nodes
 */
export class VectorClockManager {
  private clocks: Map<string, VectorClock> = new Map();
  private nodeIds: Set<string> = new Set();

  /**
   * Initialize vector clock for node
   */
  initialize(nodeId: string): VectorClock {
    this.nodeIds.add(nodeId);

    // Update all existing clocks to include new node
    for (const clock of this.clocks.values()) {
      if (!clock[nodeId]) {
        clock[nodeId] = 0;
      }
    }

    // Create clock for new node with all known nodes
    const clock: VectorClock = {};
    for (const id of this.nodeIds) {
      clock[id] = 0;
    }
    this.clocks.set(nodeId, clock);
    return clock;
  }

  /**
   * Increment clock for node
   */
  increment(nodeId: string): VectorClock {
    let clock = this.clocks.get(nodeId);
    if (!clock) {
      clock = this.initialize(nodeId);
    }
    clock[nodeId] = (clock[nodeId] || 0) + 1;
    return { ...clock };
  }

  /**
   * Merge clocks (take maximum of each component)
   */
  merge(clock1: VectorClock, clock2: VectorClock): VectorClock {
    const merged: VectorClock = {};
    const allIds = new Set([...Object.keys(clock1), ...Object.keys(clock2)]);

    for (const id of allIds) {
      merged[id] = Math.max(clock1[id] || 0, clock2[id] || 0);
    }

    return merged;
  }

  /**
   * Check if clock1 causally precedes clock2
   */
  happensBefore(clock1: VectorClock, clock2: VectorClock): boolean {
    const allIds = new Set([...Object.keys(clock1), ...Object.keys(clock2)]);
    let atLeastOneLess = false;

    for (const id of allIds) {
      const v1 = clock1[id] || 0;
      const v2 = clock2[id] || 0;

      if (v1 > v2) return false;
      if (v1 < v2) atLeastOneLess = true;
    }

    return atLeastOneLess;
  }

  /**
   * Check if clocks are concurrent (neither happens-before the other)
   */
  concurrent(clock1: VectorClock, clock2: VectorClock): boolean {
    const hb1 = this.happensBefore(clock1, clock2);
    const hb2 = this.happensBefore(clock2, clock1);
    // Concurrent means neither happens-before the other AND they're not identical
    return !hb1 && !hb2 && this.areEqual(clock1, clock2) === false;
  }

  /**
   * Check if two clocks are equal
   */
  private areEqual(clock1: VectorClock, clock2: VectorClock): boolean {
    const allIds = new Set([...Object.keys(clock1), ...Object.keys(clock2)]);

    for (const id of allIds) {
      if ((clock1[id] || 0) !== (clock2[id] || 0)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get clock for node
   */
  getClock(nodeId: string): VectorClock {
    return this.clocks.get(nodeId) || {};
  }
}

/**
 * ChangeLogManager: Track and manage distributed changes
 */
export class ChangeLogManager {
  private changes: ChangeLog[] = [];
  private nodeSequence: Map<string, number> = new Map();

  /**
   * Record change
   */
  recordChange(
    nodeId: string,
    operation: 'insert' | 'update' | 'delete',
    resource: string,
    resourceId: string,
    oldValue?: any,
    newValue?: any
  ): ChangeLog {
    const sequence = (this.nodeSequence.get(nodeId) || 0) + 1;
    this.nodeSequence.set(nodeId, sequence);

    const change: ChangeLog = {
      id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      nodeId,
      timestamp: Date.now(),
      sequenceNumber: sequence,
      operation,
      resource,
      resourceId,
      oldValue,
      newValue,
      checksum: this.computeChecksum(operation, resourceId, newValue),
    };

    this.changes.push(change);
    return change;
  }

  /**
   * Get changes since timestamp
   */
  getChangesSince(timestamp: number, limit?: number): ChangeLog[] {
    return this.changes
      .filter((c) => c.timestamp > timestamp)
      .slice(0, limit || 1000);
  }

  /**
   * Get changes for resource
   */
  getChangesForResource(resource: string, resourceId: string): ChangeLog[] {
    return this.changes.filter((c) => c.resource === resource && c.resourceId === resourceId);
  }

  /**
   * Get changes by node
   */
  getChangesByNode(nodeId: string, limit?: number): ChangeLog[] {
    return this.changes
      .filter((c) => c.nodeId === nodeId)
      .slice(0, limit || 1000);
  }

  /**
   * Compact changelog
   */
  compact(retentionDays: number = 30): number {
    const cutoff = Date.now() - retentionDays * 86400000;
    const original = this.changes.length;

    this.changes = this.changes.filter((c) => c.timestamp > cutoff);

    return original - this.changes.length;
  }

  private computeChecksum(operation: string, resourceId: string, value?: any): string {
    const data = JSON.stringify([operation, resourceId, value]);
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

/**
 * ReplicationManager: Coordinate data replication across nodes
 */
export class ReplicationManager {
  private nodes: Map<string, ReplicationNode> = new Map();
  private data: Map<string, ReplicatedData> = new Map();
  private vectorClocks: VectorClockManager;
  private changeLog: ChangeLogManager;
  private config: Required<ReplicationConfig>;
  private syncCheckpoints: Map<string, SyncCheckpoint> = new Map();
  private conflicts: ConflictEvent[] = [];

  constructor(config: ReplicationConfig = {}) {
    this.config = {
      strategy: config.strategy || 'primary-replica',
      protocol: config.protocol || 'crdt',
      conflictResolution: config.conflictResolution || 'merge',
      syncInterval: config.syncInterval || 5000,
      maxLagMs: config.maxLagMs || 10000,
      batchSize: config.batchSize || 100,
      retryAttempts: config.retryAttempts || 3,
      retryDelayMs: config.retryDelayMs || 1000,
    };

    this.vectorClocks = new VectorClockManager();
    this.changeLog = new ChangeLogManager();
  }

  /**
   * Register replica node
   */
  registerNode(
    nodeId: string,
    role: NodeRole,
    endpoint: string
  ): ReplicationNode {
    const node: ReplicationNode = {
      id: nodeId,
      role,
      status: 'healthy',
      endpoint,
      version: 0,
      lastSyncAt: Date.now(),
      lagMs: 0,
    };

    this.nodes.set(nodeId, node);
    this.vectorClocks.initialize(nodeId);
    return node;
  }

  /**
   * Write data to local node
   */
  write(nodeId: string, resourceId: string, value: any): ReplicatedData {
    const clock = this.vectorClocks.increment(nodeId);
    const existingData = this.data.get(resourceId);

    const replicatedData: ReplicatedData = {
      id: resourceId,
      data: value,
      version: (existingData?.version || 0) + 1,
      vectorClock: clock,
      checksum: this.computeChecksum(resourceId, value),
      lastModifiedBy: nodeId,
      lastModifiedAt: Date.now(),
    };

    this.data.set(resourceId, replicatedData);
    this.changeLog.recordChange(
      nodeId,
      existingData ? 'update' : 'insert',
      'data',
      resourceId,
      existingData?.data,
      value
    );

    return replicatedData;
  }

  /**
   * Read data
   */
  read(resourceId: string): ReplicatedData | undefined {
    return this.data.get(resourceId);
  }

  /**
   * Delete data (soft delete with tombstone)
   */
  delete(nodeId: string, resourceId: string): void {
    const existing = this.data.get(resourceId);
    if (!existing) return;

    const clock = this.vectorClocks.increment(nodeId);

    const deleted: ReplicatedData = {
      ...existing,
      tombstone: true,
      version: existing.version + 1,
      vectorClock: clock,
      lastModifiedBy: nodeId,
      lastModifiedAt: Date.now(),
    };

    this.data.set(resourceId, deleted);
    this.changeLog.recordChange(nodeId, 'delete', 'data', resourceId, existing.data);
  }

  /**
   * Merge incoming change from another node
   */
  mergeChange(change: ChangeLog): { merged: boolean; conflict?: ConflictEvent } {
    const existing = this.data.get(change.resourceId);

    if (!existing) {
      // No conflict - create new
      if (change.operation !== 'delete') {
        const replicatedData: ReplicatedData = {
          id: change.resourceId,
          data: change.newValue,
          version: 1,
          vectorClock: { [change.nodeId]: change.sequenceNumber },
          checksum: change.checksum,
          lastModifiedBy: change.nodeId,
          lastModifiedAt: change.timestamp,
        };
        this.data.set(change.resourceId, replicatedData);
      }
      return { merged: true };
    }

    // Conflict detection
    const isConflict = this.vectorClocks.concurrent(existing.vectorClock, {
      [change.nodeId]: change.sequenceNumber,
    });

    if (!isConflict) {
      // No conflict - simple update
      if (change.operation === 'delete') {
        existing.tombstone = true;
      } else {
        existing.data = change.newValue;
      }
      existing.version = Math.max(existing.version, change.sequenceNumber);
      existing.vectorClock = this.vectorClocks.merge(existing.vectorClock, {
        [change.nodeId]: change.sequenceNumber,
      });
      existing.lastModifiedBy = change.nodeId;
      existing.lastModifiedAt = change.timestamp;
      return { merged: true };
    }

    // Conflict resolution
    const conflictEvent: ConflictEvent = {
      id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      resourceId: change.resourceId,
      timestamp: Date.now(),
      version1: existing.version,
      version2: change.sequenceNumber,
      node1: existing.lastModifiedBy,
      node2: change.nodeId,
      resolution: this.config.conflictResolution,
    };

    switch (this.config.conflictResolution) {
      case 'last-write-wins':
        if (change.timestamp > existing.lastModifiedAt) {
          if (change.operation === 'delete') {
            existing.tombstone = true;
          } else {
            existing.data = change.newValue;
          }
          existing.lastModifiedBy = change.nodeId;
          existing.lastModifiedAt = change.timestamp;
        }
        break;

      case 'merge':
        if (
          typeof existing.data === 'object' &&
          typeof change.newValue === 'object'
        ) {
          existing.data = { ...existing.data, ...change.newValue };
          conflictEvent.mergedValue = existing.data;
        }
        break;

      case 'discard':
        // Keep existing, discard incoming
        break;

      case 'fail-fast':
        this.conflicts.push(conflictEvent);
        return { merged: false, conflict: conflictEvent };
    }

    existing.version = Math.max(existing.version, change.sequenceNumber);
    existing.vectorClock = this.vectorClocks.merge(existing.vectorClock, {
      [change.nodeId]: change.sequenceNumber,
    });

    this.conflicts.push(conflictEvent);
    return { merged: true, conflict: conflictEvent };
  }

  /**
   * Get sync checkpoint for node
   */
  getSyncCheckpoint(nodeId: string): SyncCheckpoint {
    const existing = this.syncCheckpoints.get(nodeId);
    if (existing) return existing;

    const checkpoint: SyncCheckpoint = {
      nodeId,
      version: 0,
      vectorClock: {},
      timestamp: Date.now(),
      resourcesCount: 0,
    };

    this.syncCheckpoints.set(nodeId, checkpoint);
    return checkpoint;
  }

  /**
   * Get changes for sync
   */
  getChangesForSync(
    nodeId: string,
    limit?: number
  ): { changes: ChangeLog[]; checkpoint: SyncCheckpoint } {
    const checkpoint = this.getSyncCheckpoint(nodeId);
    const changes = this.changeLog.getChangesSince(checkpoint.timestamp, limit);

    const newCheckpoint: SyncCheckpoint = {
      ...checkpoint,
      version: checkpoint.version + changes.length,
      timestamp: Date.now(),
      resourcesCount: this.data.size,
    };

    this.syncCheckpoints.set(nodeId, newCheckpoint);
    return { changes, checkpoint: newCheckpoint };
  }

  /**
   * Update node status
   */
  updateNodeStatus(nodeId: string, status: NodeStatus, lagMs: number = 0): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.status = status;
      node.lagMs = lagMs;
      node.lastSyncAt = Date.now();
    }
  }

  /**
   * Get replication status
   */
  getReplicationStatus(): {
    nodes: ReplicationNode[];
    totalResources: number;
    totalChanges: number;
    conflicts: number;
    maxLagMs: number;
  } {
    const nodes = Array.from(this.nodes.values());
    const maxLagMs = Math.max(...nodes.map((n) => n.lagMs), 0);

    return {
      nodes,
      totalResources: this.data.size,
      totalChanges: this.changeLog['changes'].length,
      conflicts: this.conflicts.length,
      maxLagMs,
    };
  }

  /**
   * Get conflicts
   */
  getConflicts(limit?: number): ConflictEvent[] {
    return this.conflicts.slice(-limit || 100);
  }

  /**
   * Compact replication data
   */
  compact(retentionDays?: number): { removed: number } {
    const removed = this.changeLog.compact(retentionDays);
    return { removed };
  }

  private computeChecksum(resourceId: string, value: any): string {
    const data = JSON.stringify([resourceId, value]);
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}

/**
 * SyncCoordinator: Orchestrate synchronization between nodes
 */
export class SyncCoordinator {
  private replicationManager: ReplicationManager;
  private syncQueue: Map<string, ChangeLog[]> = new Map();
  private syncInProgress: Set<string> = new Set();
  private stats = {
    syncAttempts: 0,
    syncSuccesses: 0,
    syncFailures: 0,
    changesReplicated: 0,
  };

  constructor(replicationManager: ReplicationManager) {
    this.replicationManager = replicationManager;
  }

  /**
   * Queue changes for sync to node
   */
  queueChanges(nodeId: string, changes: ChangeLog[]): void {
    if (!this.syncQueue.has(nodeId)) {
      this.syncQueue.set(nodeId, []);
    }
    this.syncQueue.get(nodeId)!.push(...changes);
  }

  /**
   * Process sync queue for node
   */
  async processSyncQueue(nodeId: string): Promise<{ synced: number; failed: number }> {
    if (this.syncInProgress.has(nodeId)) {
      return { synced: 0, failed: 0 };
    }

    this.syncInProgress.add(nodeId);
    this.stats.syncAttempts++;

    try {
      const changes = this.syncQueue.get(nodeId) || [];
      let synced = 0;
      let failed = 0;

      for (const change of changes) {
        const result = this.replicationManager.mergeChange(change);
        if (result.merged) {
          synced++;
          this.stats.changesReplicated++;
        } else {
          failed++;
        }
      }

      if (synced > 0) {
        this.syncQueue.delete(nodeId);
        this.stats.syncSuccesses++;
      } else if (failed > 0) {
        this.stats.syncFailures++;
      }

      return { synced, failed };
    } finally {
      this.syncInProgress.delete(nodeId);
    }
  }

  /**
   * Get sync statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Get queue size
   */
  getQueueSize(nodeId?: string): number {
    if (nodeId) {
      return (this.syncQueue.get(nodeId) || []).length;
    }
    return Array.from(this.syncQueue.values()).reduce((sum, arr) => sum + arr.length, 0);
  }
}

/**
 * ReplicationHub: Unified replication orchestration
 */
export class ReplicationHub {
  private replicationManager: ReplicationManager;
  private syncCoordinator: SyncCoordinator;

  constructor(config: ReplicationConfig = {}) {
    this.replicationManager = new ReplicationManager(config);
    this.syncCoordinator = new SyncCoordinator(this.replicationManager);
  }

  /**
   * Register node
   */
  registerNode(nodeId: string, role: NodeRole, endpoint: string): ReplicationNode {
    return this.replicationManager.registerNode(nodeId, role, endpoint);
  }

  /**
   * Write data
   */
  write(nodeId: string, resourceId: string, value: any): ReplicatedData {
    return this.replicationManager.write(nodeId, resourceId, value);
  }

  /**
   * Read data
   */
  read(resourceId: string): ReplicatedData | undefined {
    return this.replicationManager.read(resourceId);
  }

  /**
   * Delete data
   */
  delete(nodeId: string, resourceId: string): void {
    this.replicationManager.delete(nodeId, resourceId);
  }

  /**
   * Merge incoming change
   */
  mergeChange(change: ChangeLog): { merged: boolean; conflict?: ConflictEvent } {
    return this.replicationManager.mergeChange(change);
  }

  /**
   * Queue changes for sync
   */
  queueChanges(nodeId: string, changes: ChangeLog[]): void {
    this.syncCoordinator.queueChanges(nodeId, changes);
  }

  /**
   * Process sync queue
   */
  async processSyncQueue(nodeId: string): Promise<{ synced: number; failed: number }> {
    return this.syncCoordinator.processSyncQueue(nodeId);
  }

  /**
   * Get replication status
   */
  getReplicationStatus() {
    return this.replicationManager.getReplicationStatus();
  }

  /**
   * Get conflicts
   */
  getConflicts(limit?: number): ConflictEvent[] {
    return this.replicationManager.getConflicts(limit);
  }

  /**
   * Get sync statistics
   */
  getSyncStats() {
    return this.syncCoordinator.getStats();
  }

  /**
   * Get sync queue size
   */
  getQueueSize(nodeId?: string): number {
    return this.syncCoordinator.getQueueSize(nodeId);
  }

  /**
   * Compact data
   */
  compact(retentionDays?: number) {
    return this.replicationManager.compact(retentionDays);
  }
}
