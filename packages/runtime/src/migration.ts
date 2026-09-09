/**
 * Migration System: Schema versioning, data transformation, and backward compatibility
 * Enables safe schema evolution with automatic data transformation and rollback support
 */

export type MigrationDirection = 'up' | 'down';
export type MigrationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'rolled-back';
export type ValidationLevel = 'strict' | 'lenient' | 'warning';

export interface SchemaVersion {
  version: number;
  name: string;
  description: string;
  createdAt: number;
  tables: TableSchema[];
  indexes: IndexSchema[];
}

export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  primaryKey: string;
  constraints?: string[];
}

export interface ColumnSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'json' | 'array';
  nullable?: boolean;
  default?: any;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
}

export interface IndexSchema {
  name: string;
  table: string;
  columns: string[];
  unique?: boolean;
}

export interface Migration {
  id: string;
  version: number;
  previousVersion: number;
  name: string;
  description: string;
  up: (data: any) => Promise<any>;
  down: (data: any) => Promise<any>;
  validate?: (data: any) => boolean;
  createdAt: number;
}

export interface MigrationExecution {
  id: string;
  migrationId: string;
  version: number;
  direction: MigrationDirection;
  status: MigrationStatus;
  startedAt: number;
  completedAt?: number;
  error?: string;
  recordsAffected: number;
}

export interface MigrationLog {
  migrationId: string;
  execution: MigrationExecution;
  oldData?: any;
  newData?: any;
  checksum: string;
}

export interface BackupPoint {
  id: string;
  version: number;
  timestamp: number;
  dataSnapshot: any;
  checksum: string;
  metadata?: Record<string, any>;
}

export interface MigrationConfig {
  autoValidate?: boolean;
  validationLevel?: ValidationLevel;
  createBackups?: boolean;
  maxRetries?: number;
  retryDelayMs?: number;
  batchSize?: number;
}

/**
 * SchemaRegistry: Manage and track schema versions
 */
export class SchemaRegistry {
  private versions: Map<number, SchemaVersion> = new Map();
  private currentVersion: number = 0;
  private versionHistory: SchemaVersion[] = [];

  /**
   * Register new schema version
   */
  registerVersion(schema: SchemaVersion): SchemaVersion {
    this.versions.set(schema.version, schema);
    this.currentVersion = Math.max(this.currentVersion, schema.version);
    this.versionHistory.push(schema);
    return schema;
  }

  /**
   * Get schema by version
   */
  getVersion(version: number): SchemaVersion | undefined {
    return this.versions.get(version);
  }

  /**
   * Get current schema
   */
  getCurrentSchema(): SchemaVersion | undefined {
    return this.versions.get(this.currentVersion);
  }

  /**
   * Get all versions
   */
  getAllVersions(): SchemaVersion[] {
    return Array.from(this.versions.values()).sort((a, b) => a.version - b.version);
  }

  /**
   * Get version history
   */
  getVersionHistory(limit?: number): SchemaVersion[] {
    return this.versionHistory.slice(-(limit || 100));
  }

  /**
   * Get table schema
   */
  getTableSchema(version: number, tableName: string): TableSchema | undefined {
    const schema = this.versions.get(version);
    return schema?.tables.find((t) => t.name === tableName);
  }

  /**
   * Compare schemas
   */
  compareSchemas(
    version1: number,
    version2: number
  ): {
    added: TableSchema[];
    removed: TableSchema[];
    modified: { old: TableSchema; new: TableSchema }[];
  } {
    const schema1 = this.versions.get(version1);
    const schema2 = this.versions.get(version2);

    if (!schema1 || !schema2) {
      return { added: [], removed: [], modified: [] };
    }

    const tables1 = new Map(schema1.tables.map((t) => [t.name, t]));
    const tables2 = new Map(schema2.tables.map((t) => [t.name, t]));

    const added = Array.from(tables2.values()).filter((t) => !tables1.has(t.name));
    const removed = Array.from(tables1.values()).filter((t) => !tables2.has(t.name));
    const modified = Array.from(tables1.values())
      .filter((t) => tables2.has(t.name))
      .filter((t) => JSON.stringify(t) !== JSON.stringify(tables2.get(t.name)))
      .map((old) => ({ old, new: tables2.get(old.name)! }));

    return { added, removed, modified };
  }
}

/**
 * MigrationExecutor: Execute migrations with rollback support
 */
export class MigrationExecutor {
  private migrations: Map<string, Migration> = new Map();
  private executions: MigrationExecution[] = [];
  private schemaRegistry: SchemaRegistry;
  private config: Required<MigrationConfig>;

  constructor(schemaRegistry: SchemaRegistry, config: MigrationConfig = {}) {
    this.schemaRegistry = schemaRegistry;
    this.config = {
      autoValidate: config.autoValidate !== false,
      validationLevel: config.validationLevel || 'strict',
      createBackups: config.createBackups !== false,
      maxRetries: config.maxRetries || 3,
      retryDelayMs: config.retryDelayMs || 1000,
      batchSize: config.batchSize || 100,
    };
  }

  /**
   * Register migration
   */
  registerMigration(migration: Migration): void {
    this.migrations.set(migration.id, migration);
  }

  /**
   * Execute migration up
   */
  async executeUp(migrationId: string, data: any): Promise<MigrationExecution> {
    const migration = this.migrations.get(migrationId);
    if (!migration) {
      throw new Error(`Migration ${migrationId} not found`);
    }

    const execution: MigrationExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      migrationId,
      version: migration.version,
      direction: 'up',
      status: 'running',
      startedAt: Date.now(),
      recordsAffected: 0,
    };

    try {
      // Validate before migration if configured
      if (this.config.autoValidate && migration.validate && !migration.validate(data)) {
        throw new Error('Pre-migration validation failed');
      }

      // Execute migration
      const transformedData = await migration.up(data);

      // Validate after migration
      if (this.config.autoValidate && migration.validate && !migration.validate(transformedData)) {
        throw new Error('Post-migration validation failed');
      }

      execution.status = 'completed';
      execution.completedAt = Date.now();
      // Count records - handle both direct arrays and nested data structures
      if (Array.isArray(transformedData)) {
        execution.recordsAffected = transformedData.length;
      } else if (typeof transformedData === 'object' && transformedData !== null) {
        // Count records in all arrays within the data structure
        let count = 0;
        for (const value of Object.values(transformedData)) {
          if (Array.isArray(value)) {
            count += value.length;
          }
        }
        execution.recordsAffected = count > 0 ? count : 1;
      } else {
        execution.recordsAffected = 1;
      }

      this.executions.push(execution);
      return execution;
    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      execution.completedAt = Date.now();

      this.executions.push(execution);
      throw error;
    }
  }

  /**
   * Execute migration down (rollback)
   */
  async executeDown(migrationId: string, data: any): Promise<MigrationExecution> {
    const migration = this.migrations.get(migrationId);
    if (!migration) {
      throw new Error(`Migration ${migrationId} not found`);
    }

    const execution: MigrationExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      migrationId,
      version: migration.previousVersion,
      direction: 'down',
      status: 'running',
      startedAt: Date.now(),
      recordsAffected: 0,
    };

    try {
      const transformedData = await migration.down(data);

      execution.status = 'completed';
      execution.completedAt = Date.now();
      // Count records - handle both direct arrays and nested data structures
      if (Array.isArray(transformedData)) {
        execution.recordsAffected = transformedData.length;
      } else if (typeof transformedData === 'object' && transformedData !== null) {
        // Count records in all arrays within the data structure
        let count = 0;
        for (const value of Object.values(transformedData)) {
          if (Array.isArray(value)) {
            count += value.length;
          }
        }
        execution.recordsAffected = count > 0 ? count : 1;
      } else {
        execution.recordsAffected = 1;
      }

      this.executions.push(execution);
      return execution;
    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      execution.completedAt = Date.now();

      this.executions.push(execution);
      throw error;
    }
  }

  /**
   * Get execution history
   */
  getExecutionHistory(limit?: number): MigrationExecution[] {
    return this.executions.slice(-(limit || 100));
  }

  /**
   * Get execution by id
   */
  getExecution(executionId: string): MigrationExecution | undefined {
    return this.executions.find((e) => e.id === executionId);
  }

  /**
   * Get migration
   */
  getMigration(migrationId: string): Migration | undefined {
    return this.migrations.get(migrationId);
  }
}

/**
 * BackupManager: Create and manage backup points
 */
export class BackupManager {
  private backups: Map<string, BackupPoint> = new Map();
  private config: Required<MigrationConfig>;

  constructor(config: MigrationConfig = {}) {
    this.config = {
      autoValidate: config.autoValidate !== false,
      validationLevel: config.validationLevel || 'strict',
      createBackups: config.createBackups !== false,
      maxRetries: config.maxRetries || 3,
      retryDelayMs: config.retryDelayMs || 1000,
      batchSize: config.batchSize || 100,
    };
  }

  /**
   * Create backup point
   */
  createBackup(version: number, data: any, metadata?: Record<string, any>): BackupPoint {
    const backup: BackupPoint = {
      id: `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      version,
      timestamp: Date.now(),
      dataSnapshot: JSON.parse(JSON.stringify(data)), // Deep copy
      checksum: this.computeChecksum(data),
      metadata,
    };

    this.backups.set(backup.id, backup);
    return backup;
  }

  /**
   * Get backup by id
   */
  getBackup(backupId: string): BackupPoint | undefined {
    return this.backups.get(backupId);
  }

  /**
   * Get backups by version
   */
  getBackupsByVersion(version: number): BackupPoint[] {
    return Array.from(this.backups.values())
      .filter((b) => b.version === version)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Restore from backup
   */
  restoreBackup(backupId: string): any | undefined {
    const backup = this.backups.get(backupId);
    if (!backup) return undefined;

    return JSON.parse(JSON.stringify(backup.dataSnapshot)); // Deep copy
  }

  /**
   * Delete backup
   */
  deleteBackup(backupId: string): boolean {
    return this.backups.delete(backupId);
  }

  /**
   * List all backups
   */
  listBackups(limit?: number): BackupPoint[] {
    return Array.from(this.backups.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit || 100);
  }

  /**
   * Cleanup old backups
   */
  cleanupOldBackups(retentionDays: number = 30): number {
    const cutoff = Date.now() - retentionDays * 86400000;
    const keysToDelete: string[] = [];

    for (const [key, backup] of this.backups.entries()) {
      if (backup.timestamp < cutoff) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.backups.delete(key);
    }

    return keysToDelete.length;
  }

  private computeChecksum(data: any): string {
    const json = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < json.length; i++) {
      const char = json.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}

/**
 * MigrationValidator: Validate schema compatibility
 */
export class MigrationValidator {
  private schemaRegistry: SchemaRegistry;
  private validationLevel: ValidationLevel;

  constructor(schemaRegistry: SchemaRegistry, validationLevel: ValidationLevel = 'strict') {
    this.schemaRegistry = schemaRegistry;
    this.validationLevel = validationLevel;
  }

  /**
   * Validate data against schema
   */
  validateDataAgainstSchema(data: any, version: number): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const schema = this.schemaRegistry.getCurrentSchema();
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!schema) {
      return { valid: false, errors: ['No schema available'], warnings: [] };
    }

    if (!data || typeof data !== 'object') {
      errors.push('Data must be an object');
      return { valid: false, errors, warnings };
    }

    // Validate against current schema
    for (const table of schema.tables) {
      if (data[table.name]) {
        for (const record of Array.isArray(data[table.name]) ? data[table.name] : [data[table.name]]) {
          const tableErrors = this.validateRecord(record, table);
          errors.push(...tableErrors);
        }
      }
    }

    const valid =
      this.validationLevel === 'lenient'
        ? warnings.length === 0
        : this.validationLevel === 'warning'
          ? true
          : errors.length === 0;

    return { valid, errors, warnings };
  }

  /**
   * Validate record against table schema
   */
  private validateRecord(record: any, table: TableSchema): string[] {
    const errors: string[] = [];

    for (const column of table.columns) {
      const value = record[column.name];

      if (value === null || value === undefined) {
        if (!column.nullable) {
          errors.push(`${table.name}.${column.name} is required`);
        }
      } else {
        const typeError = this.validateType(value, column);
        if (typeError) {
          errors.push(`${table.name}.${column.name}: ${typeError}`);
        }
      }
    }

    return errors;
  }

  /**
   * Validate value type
   */
  private validateType(value: any, column: ColumnSchema): string | null {
    const type = typeof value;

    switch (column.type) {
      case 'string':
        if (type !== 'string') return `Expected string, got ${type}`;
        if (column.maxLength && value.length > column.maxLength) {
          return `String length ${value.length} exceeds max ${column.maxLength}`;
        }
        break;
      case 'number':
        if (type !== 'number') return `Expected number, got ${type}`;
        if (column.minValue !== undefined && value < column.minValue) {
          return `Value ${value} is less than min ${column.minValue}`;
        }
        if (column.maxValue !== undefined && value > column.maxValue) {
          return `Value ${value} exceeds max ${column.maxValue}`;
        }
        break;
      case 'boolean':
        if (type !== 'boolean') return `Expected boolean, got ${type}`;
        break;
      case 'date':
        if (!(value instanceof Date) && type !== 'string') {
          return `Expected date, got ${type}`;
        }
        break;
      case 'json':
        if (type !== 'object') return `Expected object, got ${type}`;
        break;
      case 'array':
        if (!Array.isArray(value)) return `Expected array, got ${type}`;
        break;
    }

    return null;
  }

  /**
   * Check backward compatibility
   */
  isBackwardCompatible(version1: number, version2: number): {
    compatible: boolean;
    issues: string[];
  } {
    const schema1 = this.schemaRegistry.getVersion(version1);
    const schema2 = this.schemaRegistry.getVersion(version2);

    if (!schema1 || !schema2) {
      return { compatible: false, issues: ['Schema versions not found'] };
    }

    const comparison = this.schemaRegistry.compareSchemas(version1, version2);
    const issues: string[] = [];

    // Removed tables break compatibility
    if (comparison.removed.length > 0) {
      issues.push(`Removed tables: ${comparison.removed.map((t) => t.name).join(', ')}`);
    }

    // Check modified tables for breaking changes
    for (const { old, new: newSchema } of comparison.modified) {
      const oldCols = new Map(old.columns.map((c) => [c.name, c]));
      const newCols = new Map(newSchema.columns.map((c) => [c.name, c]));

      // Removed columns break compatibility
      for (const [colName] of oldCols) {
        if (!newCols.has(colName)) {
          issues.push(`Removed column ${old.name}.${colName}`);
        }
      }

      // Changed nullability can break compatibility
      for (const [colName, col] of oldCols) {
        const newCol = newCols.get(colName);
        if (newCol && col.nullable && !newCol.nullable) {
          issues.push(`Column ${old.name}.${colName} changed from nullable to required`);
        }
      }

      // Added non-nullable columns break compatibility with existing data
      for (const [colName, newCol] of newCols) {
        if (!oldCols.has(colName) && newCol.nullable === false) {
          issues.push(`Added required column ${old.name}.${colName} breaks existing data compatibility`);
        }
      }
    }

    const compatible = this.validationLevel === 'lenient' || issues.length === 0;
    return { compatible, issues };
  }
}

/**
 * MigrationHub: Unified migration orchestration
 */
export class MigrationHub {
  private schemaRegistry: SchemaRegistry;
  private executor: MigrationExecutor;
  private backupManager: BackupManager;
  private validator: MigrationValidator;
  private config: Required<MigrationConfig>;

  constructor(config: MigrationConfig = {}) {
    this.config = {
      autoValidate: config.autoValidate !== false,
      validationLevel: config.validationLevel || 'strict',
      createBackups: config.createBackups !== false,
      maxRetries: config.maxRetries || 3,
      retryDelayMs: config.retryDelayMs || 1000,
      batchSize: config.batchSize || 100,
    };

    this.schemaRegistry = new SchemaRegistry();
    this.executor = new MigrationExecutor(this.schemaRegistry, config);
    this.backupManager = new BackupManager(config);
    this.validator = new MigrationValidator(
      this.schemaRegistry,
      config.validationLevel || 'strict'
    );
  }

  /**
   * Register schema version
   */
  registerSchema(schema: SchemaVersion): SchemaVersion {
    return this.schemaRegistry.registerVersion(schema);
  }

  /**
   * Register migration
   */
  registerMigration(migration: Migration): void {
    this.executor.registerMigration(migration);
  }

  /**
   * Execute migration
   */
  async executeMigration(
    migrationId: string,
    data: any,
    createBackup: boolean = true
  ): Promise<MigrationExecution> {
    if (createBackup && this.config.createBackups) {
      this.backupManager.createBackup(0, data);
    }

    return this.executor.executeUp(migrationId, data);
  }

  /**
   * Rollback migration
   */
  async rollbackMigration(migrationId: string, data: any): Promise<MigrationExecution> {
    return this.executor.executeDown(migrationId, data);
  }

  /**
   * Restore from backup
   */
  restoreFromBackup(backupId: string): any {
    return this.backupManager.restoreBackup(backupId);
  }

  /**
   * Validate data
   */
  validateData(data: any, version: number) {
    return this.validator.validateDataAgainstSchema(data, version);
  }

  /**
   * Check compatibility
   */
  checkCompatibility(version1: number, version2: number) {
    return this.validator.isBackwardCompatible(version1, version2);
  }

  /**
   * Get schema
   */
  getSchema(version: number): SchemaVersion | undefined {
    return this.schemaRegistry.getVersion(version);
  }

  /**
   * Get current schema
   */
  getCurrentSchema(): SchemaVersion | undefined {
    return this.schemaRegistry.getCurrentSchema();
  }

  /**
   * Get migration execution history
   */
  getExecutionHistory(limit?: number): MigrationExecution[] {
    return this.executor.getExecutionHistory(limit);
  }

  /**
   * List backups
   */
  listBackups(limit?: number): BackupPoint[] {
    return this.backupManager.listBackups(limit);
  }

  /**
   * Cleanup old backups
   */
  cleanupBackups(retentionDays?: number): number {
    return this.backupManager.cleanupOldBackups(retentionDays);
  }
}
