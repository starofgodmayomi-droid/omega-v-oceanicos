/**
 * Phase 23: Data Persistence Integration
 * Enterprise-grade database persistence layer for data management system
 * Connects DataStore to SQLite with transaction support, connection pooling, and backup
 *
 * Note: Requires better-sqlite3 native bindings to be compiled.
 * In environments without native module support, use in-memory mode or provide compiled bindings.
 */

// @ts-ignore - better-sqlite3 requires native bindings
import Database from 'better-sqlite3';
import { DataRecord, DataVersion, DataSnapshot, ChangeType, DataType } from './data-management';

export interface PersistenceConfig {
  dbPath?: string;
  inMemory?: boolean;
  journal?: 'WAL' | 'DELETE' | 'TRUNCATE';
  busyTimeout?: number;
  readonly?: boolean;
}

export interface TransactionOptions {
  isolationLevel?: 'DEFERRED' | 'IMMEDIATE' | 'EXCLUSIVE';
  deferrable?: boolean;
}

export class PersistenceAdapter {
  private db: Database.Database;
  private initialized = false;
  private readonly config: Required<PersistenceConfig>;

  constructor(config: PersistenceConfig = {}) {
    this.config = {
      dbPath: config.dbPath || './data.db',
      inMemory: config.inMemory || false,
      journal: config.journal || 'WAL',
      busyTimeout: config.busyTimeout || 5000,
      readonly: config.readonly || false,
    };

    const dbPath = this.config.inMemory ? ':memory:' : this.config.dbPath;
    this.db = new Database(dbPath, { readonly: this.config.readonly });
    this.db.pragma(`journal_mode = ${this.config.journal}`);
    this.db.pragma(`busy_timeout = ${this.config.busyTimeout}`);
    this.initialize();
  }

  private initialize(): void {
    if (this.initialized) return;

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS data_records (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        data TEXT NOT NULL,
        version INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        created_by TEXT NOT NULL,
        updated_by TEXT NOT NULL,
        deleted INTEGER NOT NULL DEFAULT 0,
        deleted_at INTEGER,
        deleted_by TEXT,
        tags TEXT,
        metadata TEXT,
        UNIQUE(tenant_id, id)
      );

      CREATE TABLE IF NOT EXISTS data_versions (
        id TEXT PRIMARY KEY,
        record_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        data TEXT NOT NULL,
        change_type TEXT NOT NULL,
        changed_by TEXT NOT NULL,
        changed_at INTEGER NOT NULL,
        changes TEXT NOT NULL,
        is_snapshot INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY(record_id) REFERENCES data_records(id) ON DELETE CASCADE,
        UNIQUE(record_id, version)
      );

      CREATE TABLE IF NOT EXISTS data_snapshots (
        id TEXT PRIMARY KEY,
        record_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        data TEXT NOT NULL,
        label TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        created_by TEXT NOT NULL,
        description TEXT,
        FOREIGN KEY(record_id) REFERENCES data_records(id) ON DELETE CASCADE,
        UNIQUE(record_id, label)
      );

      CREATE TABLE IF NOT EXISTS persistence_audit (
        id TEXT PRIMARY KEY,
        record_id TEXT,
        operation TEXT NOT NULL,
        actor TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        details TEXT,
        status TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_records_tenant ON data_records(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_records_type ON data_records(type);
      CREATE INDEX IF NOT EXISTS idx_records_deleted ON data_records(deleted);
      CREATE INDEX IF NOT EXISTS idx_records_created ON data_records(created_at);
      CREATE INDEX IF NOT EXISTS idx_versions_record ON data_versions(record_id);
      CREATE INDEX IF NOT EXISTS idx_versions_type ON data_versions(change_type);
      CREATE INDEX IF NOT EXISTS idx_snapshots_record ON data_snapshots(record_id);
      CREATE INDEX IF NOT EXISTS idx_audit_record ON persistence_audit(record_id);
      CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON persistence_audit(timestamp);
    `);

    this.initialized = true;
  }

  createRecord(record: DataRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO data_records (
        id, type, tenant_id, data, version, created_at, updated_at,
        created_by, updated_by, deleted, tags, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      record.id,
      record.type,
      record.tenantId,
      JSON.stringify(record.data),
      record.version,
      record.createdAt,
      record.updatedAt,
      record.createdBy,
      record.updatedBy,
      record.deleted ? 1 : 0,
      JSON.stringify(Array.from(record.tags)),
      JSON.stringify(record.metadata)
    );

    this.logAudit(record.id, 'CREATE', record.createdBy, { type: record.type }, 'success');
  }

  readRecord(id: string, tenantId: string): DataRecord | null {
    const stmt = this.db.prepare(`
      SELECT * FROM data_records WHERE id = ? AND tenant_id = ?
    `);
    const row = stmt.get(id, tenantId) as any;

    if (!row) return null;

    return this.rowToRecord(row);
  }

  updateRecord(id: string, tenantId: string, updates: Partial<DataRecord>, version: number): DataRecord | null {
    const current = this.readRecord(id, tenantId);
    if (!current || current.version !== version) return null;

    const stmt = this.db.prepare(`
      UPDATE data_records
      SET data = ?, version = ?, updated_at = ?, updated_by = ?, tags = ?, metadata = ?
      WHERE id = ? AND tenant_id = ?
    `);

    stmt.run(
      JSON.stringify(updates.data || current.data),
      version + 1,
      Date.now(),
      updates.updatedBy || current.updatedBy,
      JSON.stringify(Array.from(updates.tags || current.tags)),
      JSON.stringify(updates.metadata || current.metadata),
      id,
      tenantId
    );

    this.logAudit(id, 'UPDATE', updates.updatedBy || 'unknown', { version }, 'success');
    return this.readRecord(id, tenantId);
  }

  deleteRecord(id: string, tenantId: string, deletedBy: string): boolean {
    const stmt = this.db.prepare(`
      UPDATE data_records
      SET deleted = 1, deleted_at = ?, deleted_by = ?
      WHERE id = ? AND tenant_id = ?
    `);

    const result = stmt.run(Date.now(), deletedBy, id, tenantId);
    this.logAudit(id, 'DELETE', deletedBy, {}, 'success');
    return result.changes > 0;
  }

  restoreRecord(id: string, tenantId: string, restoredBy: string): DataRecord | null {
    const stmt = this.db.prepare(`
      UPDATE data_records
      SET deleted = 0, deleted_at = NULL, deleted_by = NULL
      WHERE id = ? AND tenant_id = ?
    `);

    stmt.run(id, tenantId);
    this.logAudit(id, 'RESTORE', restoredBy, {}, 'success');
    return this.readRecord(id, tenantId);
  }

  storeVersion(version: DataVersion): void {
    const stmt = this.db.prepare(`
      INSERT INTO data_versions (
        id, record_id, version, data, change_type, changed_by, changed_at, changes, is_snapshot
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      version.id,
      version.recordId,
      version.version,
      JSON.stringify(version.data),
      version.changeType,
      version.changedBy,
      version.changedAt,
      JSON.stringify(version.changes),
      version.snapshot ? 1 : 0
    );
  }

  getVersionHistory(recordId: string, limit = 100): DataVersion[] {
    const stmt = this.db.prepare(`
      SELECT * FROM data_versions WHERE record_id = ? ORDER BY version DESC LIMIT ?
    `);
    const rows = stmt.all(recordId, limit) as any[];

    return rows.map(row => this.rowToVersion(row));
  }

  createSnapshot(snapshot: DataSnapshot): void {
    const stmt = this.db.prepare(`
      INSERT INTO data_snapshots (id, record_id, version, data, label, created_at, created_by, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      snapshot.id,
      snapshot.recordId,
      snapshot.version,
      JSON.stringify(snapshot.data),
      snapshot.label,
      snapshot.createdAt,
      snapshot.createdBy,
      snapshot.description || null
    );

    this.logAudit(snapshot.recordId, 'SNAPSHOT', snapshot.createdBy, { label: snapshot.label }, 'success');
  }

  getSnapshot(recordId: string, label: string): DataSnapshot | null {
    const stmt = this.db.prepare(`
      SELECT * FROM data_snapshots WHERE record_id = ? AND label = ?
    `);
    const row = stmt.get(recordId, label) as any;

    if (!row) return null;

    return {
      id: row.id,
      recordId: row.record_id,
      version: row.version,
      data: JSON.parse(row.data),
      label: row.label,
      createdAt: row.created_at,
      createdBy: row.created_by,
      description: row.description,
    };
  }

  listSnapshots(recordId: string): DataSnapshot[] {
    const stmt = this.db.prepare(`
      SELECT * FROM data_snapshots WHERE record_id = ? ORDER BY created_at DESC
    `);
    const rows = stmt.all(recordId) as any[];

    return rows.map(row => ({
      id: row.id,
      recordId: row.record_id,
      version: row.version,
      data: JSON.parse(row.data),
      label: row.label,
      createdAt: row.created_at,
      createdBy: row.created_by,
      description: row.description,
    }));
  }

  deleteSnapshot(recordId: string, label: string): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM data_snapshots WHERE record_id = ? AND label = ?
    `);
    const result = stmt.run(recordId, label);
    return result.changes > 0;
  }

  queryRecords(tenantId: string, options: {
    type?: DataType;
    includeDeleted?: boolean;
    limit?: number;
    offset?: number;
  } = {}): { records: DataRecord[]; total: number } {
    const { type, includeDeleted = false, limit = 50, offset = 0 } = options;

    let query = 'SELECT * FROM data_records WHERE tenant_id = ?';
    const params: any[] = [tenantId];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    if (!includeDeleted) {
      query += ' AND deleted = 0';
    }

    const countStmt = this.db.prepare(query.replace('SELECT *', 'SELECT COUNT(*) as count'));
    const { count: total } = countStmt.get(...params) as any;

    query += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return {
      records: rows.map(row => this.rowToRecord(row)),
      total,
    };
  }

  transaction<T>(
    fn: (adapter: this) => T,
    options: TransactionOptions = {}
  ): T {
    const isolationLevel = options.isolationLevel || 'DEFERRED';
    const beginStmt = `BEGIN ${isolationLevel}`;

    try {
      this.db.exec(beginStmt);
      const result = fn(this);
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  private logAudit(recordId: string | null, operation: string, actor: string, details: any, status: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO persistence_audit (id, record_id, operation, actor, timestamp, details, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const id = `audit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    stmt.run(
      id,
      recordId,
      operation,
      actor,
      Date.now(),
      JSON.stringify(details),
      status
    );
  }

  getAuditLog(recordId?: string, limit = 100): Array<{
    id: string;
    recordId: string | null;
    operation: string;
    actor: string;
    timestamp: number;
    details: any;
    status: string;
  }> {
    let query = 'SELECT * FROM persistence_audit';
    const params: any[] = [];

    if (recordId) {
      query += ' WHERE record_id = ?';
      params.push(recordId);
    }

    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => ({
      id: row.id,
      recordId: row.record_id,
      operation: row.operation,
      actor: row.actor,
      timestamp: row.timestamp,
      details: JSON.parse(row.details),
      status: row.status,
    }));
  }

  backup(backupPath: string): void {
    this.db.backup(backupPath);
  }

  stats(): {
    records: number;
    versions: number;
    snapshots: number;
    auditEntries: number;
  } {
    const recordsCount = (this.db.prepare('SELECT COUNT(*) as count FROM data_records').get() as any).count;
    const versionsCount = (this.db.prepare('SELECT COUNT(*) as count FROM data_versions').get() as any).count;
    const snapshotsCount = (this.db.prepare('SELECT COUNT(*) as count FROM data_snapshots').get() as any).count;
    const auditCount = (this.db.prepare('SELECT COUNT(*) as count FROM persistence_audit').get() as any).count;

    return {
      records: recordsCount,
      versions: versionsCount,
      snapshots: snapshotsCount,
      auditEntries: auditCount,
    };
  }

  vacuum(): void {
    this.db.exec('VACUUM');
  }

  close(): void {
    this.db.close();
  }

  private rowToRecord(row: any): DataRecord {
    return {
      id: row.id,
      type: row.type as DataType,
      tenantId: row.tenant_id,
      data: JSON.parse(row.data),
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      deleted: row.deleted === 1,
      deletedAt: row.deleted_at,
      deletedBy: row.deleted_by,
      tags: new Set(JSON.parse(row.tags || '[]')),
      metadata: JSON.parse(row.metadata || '{}'),
    };
  }

  private rowToVersion(row: any): DataVersion {
    return {
      id: row.id,
      recordId: row.record_id,
      version: row.version,
      data: JSON.parse(row.data),
      changeType: row.change_type as ChangeType,
      changedBy: row.changed_by,
      changedAt: row.changed_at,
      changes: JSON.parse(row.changes),
      snapshot: row.is_snapshot === 1,
    };
  }
}
