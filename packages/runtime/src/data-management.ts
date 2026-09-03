/**
 * Data Management & Versioning System
 * Enterprise-grade CRUD operations with versioning, snapshots, and audit trails
 */

export type DataType = 'document' | 'record' | 'asset' | 'config';
export type ChangeType = 'create' | 'update' | 'delete' | 'restore';
export type RetentionPolicy = 'keep-all' | 'keep-recent' | 'keep-dated';

export interface DataRecord {
  id: string;
  type: DataType;
  tenantId: string;
  data: Record<string, any>;
  version: number;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
  deleted: boolean;
  deletedAt?: number;
  deletedBy?: string;
  tags: Set<string>;
  metadata: Record<string, any>;
}

export interface DataVersion {
  id: string;
  recordId: string;
  version: number;
  data: Record<string, any>;
  changeType: ChangeType;
  changedBy: string;
  changedAt: number;
  changes: Record<string, any>;
  snapshot: boolean;
}

export interface DataSnapshot {
  id: string;
  recordId: string;
  version: number;
  data: Record<string, any>;
  label: string;
  createdAt: number;
  createdBy: string;
  description?: string;
}

export interface DataQuery {
  recordId?: string;
  type?: DataType;
  tenantId?: string;
  tags?: string[];
  createdAfter?: number;
  createdBefore?: number;
  updatedAfter?: number;
  updatedBefore?: number;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
}

export interface RetentionConfig {
  policy: RetentionPolicy;
  keepVersions?: number;
  keepDays?: number;
  autoDeleteAt?: number;
}

/**
 * DataStore: Manage CRUD operations with versioning
 */
export class DataStore {
  private records: Map<string, DataRecord> = new Map();
  private versions: Map<string, DataVersion[]> = new Map();
  private index: Map<string, Set<string>> = new Map(); // tenantId -> recordIds

  create(
    id: string,
    type: DataType,
    tenantId: string,
    data: Record<string, any>,
    userId: string,
    metadata: Record<string, any> = {},
  ): DataRecord {
    const record: DataRecord = {
      id,
      type,
      tenantId,
      data,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: userId,
      updatedBy: userId,
      deleted: false,
      tags: new Set(),
      metadata,
    };

    this.records.set(id, record);

    if (!this.index.has(tenantId)) {
      this.index.set(tenantId, new Set());
    }
    this.index.get(tenantId)!.add(id);

    this.createVersion(id, 1, data, 'create', userId, {});

    return record;
  }

  read(recordId: string): DataRecord | undefined {
    return this.records.get(recordId);
  }

  update(recordId: string, data: Record<string, any>, userId: string, changes: Record<string, any> = {}): DataRecord | undefined {
    const record = this.records.get(recordId);
    if (!record || record.deleted) return undefined;

    const oldData = record.data;
    record.data = { ...record.data, ...data };
    record.version++;
    record.updatedAt = Date.now();
    record.updatedBy = userId;

    this.createVersion(recordId, record.version, record.data, 'update', userId, changes);

    return record;
  }

  delete(recordId: string, userId: string): DataRecord | undefined {
    const record = this.records.get(recordId);
    if (!record || record.deleted) return undefined;

    record.deleted = true;
    record.deletedAt = Date.now();
    record.deletedBy = userId;
    record.version++;

    this.createVersion(recordId, record.version, record.data, 'delete', userId, {});

    return record;
  }

  restore(recordId: string, userId: string): DataRecord | undefined {
    const record = this.records.get(recordId);
    if (!record || !record.deleted) return undefined;

    record.deleted = false;
    record.deletedAt = undefined;
    record.deletedBy = undefined;
    record.version++;
    record.updatedAt = Date.now();
    record.updatedBy = userId;

    this.createVersion(recordId, record.version, record.data, 'restore', userId, {});

    return record;
  }

  private createVersion(
    recordId: string,
    version: number,
    data: Record<string, any>,
    changeType: ChangeType,
    userId: string,
    changes: Record<string, any>,
  ): void {
    const versionRecord: DataVersion = {
      id: `ver_${recordId}_${version}_${Date.now()}`,
      recordId,
      version,
      data: { ...data },
      changeType,
      changedBy: userId,
      changedAt: Date.now(),
      changes,
      snapshot: false,
    };

    if (!this.versions.has(recordId)) {
      this.versions.set(recordId, []);
    }
    this.versions.get(recordId)!.push(versionRecord);
  }

  addTag(recordId: string, tag: string): boolean {
    const record = this.records.get(recordId);
    if (!record) return false;

    record.tags.add(tag);
    return true;
  }

  removeTag(recordId: string, tag: string): boolean {
    const record = this.records.get(recordId);
    if (!record) return false;

    record.tags.delete(tag);
    return true;
  }

  getVersionHistory(recordId: string, limit: number = 100): DataVersion[] {
    const versions = this.versions.get(recordId) || [];
    return versions.slice(-limit);
  }

  async clear(): Promise<void> {
    this.records.clear();
    this.versions.clear();
    this.index.clear();
  }
}

/**
 * SnapshotManager: Create and manage point-in-time snapshots
 */
export class SnapshotManager {
  private snapshots: Map<string, DataSnapshot[]> = new Map();

  createSnapshot(
    recordId: string,
    version: number,
    data: Record<string, any>,
    label: string,
    userId: string,
    description?: string,
  ): DataSnapshot {
    const snapshot: DataSnapshot = {
      id: `snap_${recordId}_${label}_${Date.now()}`,
      recordId,
      version,
      data: { ...data },
      label,
      createdAt: Date.now(),
      createdBy: userId,
      description,
    };

    if (!this.snapshots.has(recordId)) {
      this.snapshots.set(recordId, []);
    }
    this.snapshots.get(recordId)!.push(snapshot);

    return snapshot;
  }

  getSnapshots(recordId: string): DataSnapshot[] {
    return this.snapshots.get(recordId) || [];
  }

  getSnapshot(snapshotId: string): DataSnapshot | undefined {
    for (const snapshots of this.snapshots.values()) {
      const found = snapshots.find((s) => s.id === snapshotId);
      if (found) return found;
    }
    return undefined;
  }

  deleteSnapshot(snapshotId: string): boolean {
    for (const [recordId, snapshots] of this.snapshots.entries()) {
      const index = snapshots.findIndex((s) => s.id === snapshotId);
      if (index !== -1) {
        snapshots.splice(index, 1);
        return true;
      }
    }
    return false;
  }

  async clear(): Promise<void> {
    this.snapshots.clear();
  }
}

/**
 * RetentionManager: Manage data retention policies
 */
export class RetentionManager {
  private policies: Map<string, RetentionConfig> = new Map();

  setPolicy(recordId: string, policy: RetentionConfig): void {
    this.policies.set(recordId, policy);
  }

  getPolicy(recordId: string): RetentionConfig | undefined {
    return this.policies.get(recordId);
  }

  shouldRetainVersion(recordId: string, versionAge: number, versionNumber: number, totalVersions: number): boolean {
    const policy = this.policies.get(recordId);
    if (!policy) return true;

    if (policy.policy === 'keep-all') return true;

    if (policy.policy === 'keep-recent') {
      const keepVersions = policy.keepVersions || 10;
      return totalVersions - versionNumber < keepVersions;
    }

    if (policy.policy === 'keep-dated') {
      const keepDays = policy.keepDays || 30;
      const retentionMs = keepDays * 24 * 60 * 60 * 1000;
      return versionAge < retentionMs;
    }

    return true;
  }

  pruneVersions(recordId: string, versions: DataVersion[]): DataVersion[] {
    const policy = this.policies.get(recordId);
    if (!policy || policy.policy === 'keep-all') return versions;

    const now = Date.now();
    return versions.filter((v) => this.shouldRetainVersion(recordId, now - v.changedAt, v.version, versions.length));
  }

  async clear(): Promise<void> {
    this.policies.clear();
  }
}

/**
 * DataAuditor: Track data operations and access
 */
export class DataAuditor {
  private logs: Array<{
    id: string;
    recordId: string;
    operation: string;
    userId: string;
    timestamp: number;
    tenantId: string;
  }> = [];

  logOperation(recordId: string, operation: string, userId: string, tenantId: string): void {
    this.logs.push({
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      recordId,
      operation,
      userId,
      timestamp: Date.now(),
      tenantId,
    });

    if (this.logs.length > 100000) {
      this.logs = this.logs.slice(-100000);
    }
  }

  getOperations(recordId: string, limit: number = 100): typeof this.logs {
    return this.logs
      .filter((l) => l.recordId === recordId)
      .slice(-limit);
  }

  getUserOperations(tenantId: string, userId: string, limit: number = 100): typeof this.logs {
    return this.logs
      .filter((l) => l.tenantId === tenantId && l.userId === userId)
      .slice(-limit);
  }

  getStats(tenantId: string): Record<string, any> {
    const tenantLogs = this.logs.filter((l) => l.tenantId === tenantId);
    const operationCounts = new Map<string, number>();

    for (const log of tenantLogs) {
      operationCounts.set(log.operation, (operationCounts.get(log.operation) || 0) + 1);
    }

    return {
      totalOperations: tenantLogs.length,
      uniqueUsers: new Set(tenantLogs.map((l) => l.userId)).size,
      uniqueRecords: new Set(tenantLogs.map((l) => l.recordId)).size,
      operationCounts: Object.fromEntries(operationCounts),
    };
  }

  async clear(): Promise<void> {
    this.logs = [];
  }
}

/**
 * DataHub: Unified data management orchestration
 */
export class DataHub {
  private store: DataStore;
  private snapshotManager: SnapshotManager;
  private retentionManager: RetentionManager;
  private auditor: DataAuditor;

  constructor() {
    this.store = new DataStore();
    this.snapshotManager = new SnapshotManager();
    this.retentionManager = new RetentionManager();
    this.auditor = new DataAuditor();
  }

  getStore(): DataStore {
    return this.store;
  }

  getSnapshotManager(): SnapshotManager {
    return this.snapshotManager;
  }

  getRetentionManager(): RetentionManager {
    return this.retentionManager;
  }

  getAuditor(): DataAuditor {
    return this.auditor;
  }

  create(
    id: string,
    type: DataType,
    tenantId: string,
    data: Record<string, any>,
    userId: string,
    metadata?: Record<string, any>,
  ): DataRecord {
    const record = this.store.create(id, type, tenantId, data, userId, metadata);
    this.auditor.logOperation(id, 'create', userId, tenantId);
    return record;
  }

  read(recordId: string): DataRecord | undefined {
    return this.store.read(recordId);
  }

  update(recordId: string, data: Record<string, any>, userId: string, tenantId: string, changes?: Record<string, any>): DataRecord | undefined {
    const record = this.store.update(recordId, data, userId, changes);
    if (record) {
      this.auditor.logOperation(recordId, 'update', userId, tenantId);
    }
    return record;
  }

  delete(recordId: string, userId: string, tenantId: string): DataRecord | undefined {
    const record = this.store.delete(recordId, userId);
    if (record) {
      this.auditor.logOperation(recordId, 'delete', userId, tenantId);
    }
    return record;
  }

  restore(recordId: string, userId: string, tenantId: string): DataRecord | undefined {
    const record = this.store.restore(recordId, userId);
    if (record) {
      this.auditor.logOperation(recordId, 'restore', userId, tenantId);
    }
    return record;
  }

  snapshot(recordId: string, version: number, label: string, userId: string, description?: string): DataSnapshot | undefined {
    const record = this.store.read(recordId);
    if (!record) return undefined;

    const snapshot = this.snapshotManager.createSnapshot(recordId, version, record.data, label, userId, description);
    this.auditor.logOperation(recordId, 'snapshot', userId, record.tenantId);
    return snapshot;
  }

  async clear(): Promise<void> {
    await this.store.clear();
    await this.snapshotManager.clear();
    await this.retentionManager.clear();
    await this.auditor.clear();
  }
}
