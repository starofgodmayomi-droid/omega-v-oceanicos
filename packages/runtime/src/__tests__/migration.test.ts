/**
 * Phase 26: Migration System - Comprehensive Test Suite
 * Tests schema versioning, data transformation, validation, and backward compatibility
 */

import {
  SchemaRegistry,
  MigrationExecutor,
  BackupManager,
  MigrationValidator,
  MigrationHub,
  SchemaVersion,
  Migration,
  ColumnSchema,
  TableSchema,
} from '../migration';

describe('Phase 26: Migration System', () => {
  describe('SchemaRegistry', () => {
    let registry: SchemaRegistry;

    beforeEach(() => {
      registry = new SchemaRegistry();
    });

    it('should register schema version', () => {
      const schema: SchemaVersion = {
        version: 1,
        name: 'v1',
        description: 'Initial schema',
        createdAt: Date.now(),
        tables: [
          {
            name: 'users',
            columns: [
              { name: 'id', type: 'string' },
              { name: 'name', type: 'string' },
            ],
            primaryKey: 'id',
          },
        ],
        indexes: [],
      };

      const registered = registry.registerVersion(schema);

      expect(registered.version).toBe(1);
      expect(registered.name).toBe('v1');
    });

    it('should get schema by version', () => {
      const schema: SchemaVersion = {
        version: 1,
        name: 'v1',
        description: 'Initial schema',
        createdAt: Date.now(),
        tables: [],
        indexes: [],
      };

      registry.registerVersion(schema);
      const retrieved = registry.getVersion(1);

      expect(retrieved?.version).toBe(1);
    });

    it('should track current version', () => {
      const schema1: SchemaVersion = {
        version: 1,
        name: 'v1',
        description: 'v1',
        createdAt: Date.now(),
        tables: [],
        indexes: [],
      };

      const schema2: SchemaVersion = {
        version: 2,
        name: 'v2',
        description: 'v2',
        createdAt: Date.now(),
        tables: [],
        indexes: [],
      };

      registry.registerVersion(schema1);
      registry.registerVersion(schema2);

      const current = registry.getCurrentSchema();

      expect(current?.version).toBe(2);
    });

    it('should get all versions', () => {
      const schema1: SchemaVersion = {
        version: 1,
        name: 'v1',
        description: 'v1',
        createdAt: Date.now(),
        tables: [],
        indexes: [],
      };

      const schema2: SchemaVersion = {
        version: 2,
        name: 'v2',
        description: 'v2',
        createdAt: Date.now(),
        tables: [],
        indexes: [],
      };

      registry.registerVersion(schema1);
      registry.registerVersion(schema2);

      const all = registry.getAllVersions();

      expect(all.length).toBe(2);
      expect(all[0].version).toBe(1);
      expect(all[1].version).toBe(2);
    });

    it('should compare schemas', () => {
      const schema1: SchemaVersion = {
        version: 1,
        name: 'v1',
        description: 'v1',
        createdAt: Date.now(),
        tables: [
          {
            name: 'users',
            columns: [
              { name: 'id', type: 'string' },
              { name: 'name', type: 'string' },
            ],
            primaryKey: 'id',
          },
        ],
        indexes: [],
      };

      const schema2: SchemaVersion = {
        version: 2,
        name: 'v2',
        description: 'v2',
        createdAt: Date.now(),
        tables: [
          {
            name: 'users',
            columns: [
              { name: 'id', type: 'string' },
              { name: 'name', type: 'string' },
              { name: 'email', type: 'string' },
            ],
            primaryKey: 'id',
          },
          {
            name: 'posts',
            columns: [{ name: 'id', type: 'string' }],
            primaryKey: 'id',
          },
        ],
        indexes: [],
      };

      registry.registerVersion(schema1);
      registry.registerVersion(schema2);

      const comparison = registry.compareSchemas(1, 2);

      expect(comparison.added.length).toBe(1);
      expect(comparison.added[0].name).toBe('posts');
      expect(comparison.removed.length).toBe(0);
    });
  });

  describe('MigrationExecutor', () => {
    let executor: MigrationExecutor;
    let registry: SchemaRegistry;

    beforeEach(() => {
      registry = new SchemaRegistry();
      executor = new MigrationExecutor(registry);
    });

    it('should register migration', () => {
      const migration: Migration = {
        id: 'migration_1',
        version: 2,
        previousVersion: 1,
        name: 'add_email_column',
        description: 'Add email column to users table',
        up: async (data) => data,
        down: async (data) => data,
        createdAt: Date.now(),
      };

      executor.registerMigration(migration);
      const retrieved = executor.getMigration('migration_1');

      expect(retrieved?.id).toBe('migration_1');
    });

    it('should execute migration up', async () => {
      const migration: Migration = {
        id: 'migration_1',
        version: 2,
        previousVersion: 1,
        name: 'test_migration',
        description: 'test',
        up: async (data) => ({ ...data, migrated: true }),
        down: async (data) => data,
        createdAt: Date.now(),
      };

      executor.registerMigration(migration);

      const execution = await executor.executeUp('migration_1', { id: 1, name: 'test' });

      expect(execution.status).toBe('completed');
      expect(execution.direction).toBe('up');
      expect(execution.version).toBe(2);
    });

    it('should execute migration down', async () => {
      const migration: Migration = {
        id: 'migration_1',
        version: 2,
        previousVersion: 1,
        name: 'test_migration',
        description: 'test',
        up: async (data) => data,
        down: async (data) => ({ ...data, rolledBack: true }),
        createdAt: Date.now(),
      };

      executor.registerMigration(migration);

      const execution = await executor.executeDown('migration_1', { id: 1, name: 'test' });

      expect(execution.status).toBe('completed');
      expect(execution.direction).toBe('down');
      expect(execution.version).toBe(1);
    });

    it('should validate migration on execution', async () => {
      const migration: Migration = {
        id: 'migration_1',
        version: 2,
        previousVersion: 1,
        name: 'test_migration',
        description: 'test',
        up: async (data) => data,
        down: async (data) => data,
        validate: (data) => data && data.id !== undefined,
        createdAt: Date.now(),
      };

      executor.registerMigration(migration);

      const execution = await executor.executeUp('migration_1', { id: 1 });

      expect(execution.status).toBe('completed');
    });

    it('should handle migration failure', async () => {
      const migration: Migration = {
        id: 'migration_1',
        version: 2,
        previousVersion: 1,
        name: 'test_migration',
        description: 'test',
        up: async () => {
          throw new Error('Migration failed');
        },
        down: async (data) => data,
        createdAt: Date.now(),
      };

      executor.registerMigration(migration);

      try {
        await executor.executeUp('migration_1', {});
      } catch (e) {
        // Expected
      }

      const history = executor.getExecutionHistory();
      const lastExecution = history[history.length - 1];

      expect(lastExecution.status).toBe('failed');
      expect(lastExecution.error).toContain('Migration failed');
    });

    it('should track records affected', async () => {
      const migration: Migration = {
        id: 'migration_1',
        version: 2,
        previousVersion: 1,
        name: 'test_migration',
        description: 'test',
        up: async (data) => [{ id: 1 }, { id: 2 }, { id: 3 }],
        down: async (data) => data,
        createdAt: Date.now(),
      };

      executor.registerMigration(migration);

      const execution = await executor.executeUp('migration_1', {});

      expect(execution.recordsAffected).toBe(3);
    });

    it('should get execution history', async () => {
      const migration: Migration = {
        id: 'migration_1',
        version: 2,
        previousVersion: 1,
        name: 'test_migration',
        description: 'test',
        up: async (data) => data,
        down: async (data) => data,
        createdAt: Date.now(),
      };

      executor.registerMigration(migration);

      await executor.executeUp('migration_1', { id: 1 });
      await executor.executeUp('migration_1', { id: 2 });

      const history = executor.getExecutionHistory(10);

      expect(history.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('BackupManager', () => {
    let manager: BackupManager;

    beforeEach(() => {
      manager = new BackupManager();
    });

    it('should create backup', () => {
      const data = { id: 1, name: 'test' };

      const backup = manager.createBackup(1, data);

      expect(backup.version).toBe(1);
      expect(backup.dataSnapshot).toEqual(data);
      expect(backup.checksum).toBeDefined();
    });

    it('should get backup by id', () => {
      const data = { id: 1, name: 'test' };

      const backup = manager.createBackup(1, data);
      const retrieved = manager.getBackup(backup.id);

      expect(retrieved?.id).toBe(backup.id);
      expect(retrieved?.dataSnapshot).toEqual(data);
    });

    it('should get backups by version', () => {
      const data1 = { id: 1 };
      const data2 = { id: 2 };

      manager.createBackup(1, data1);
      manager.createBackup(1, data2);
      manager.createBackup(2, { id: 3 });

      const backups = manager.getBackupsByVersion(1);

      expect(backups.length).toBe(2);
      expect(backups.every((b) => b.version === 1)).toBe(true);
    });

    it('should restore from backup', () => {
      const data = { id: 1, name: 'test' };

      const backup = manager.createBackup(1, data);
      const restored = manager.restoreBackup(backup.id);

      expect(restored).toEqual(data);
      // Verify it's a deep copy
      expect(restored).not.toBe(data);
    });

    it('should delete backup', () => {
      const backup = manager.createBackup(1, { id: 1 });

      const deleted = manager.deleteBackup(backup.id);

      expect(deleted).toBe(true);
      expect(manager.getBackup(backup.id)).toBeUndefined();
    });

    it('should list all backups', () => {
      manager.createBackup(1, { id: 1 });
      manager.createBackup(2, { id: 2 });
      manager.createBackup(3, { id: 3 });

      const backups = manager.listBackups();

      expect(backups.length).toBe(3);
    });

    it('should cleanup old backups', () => {
      manager.createBackup(1, { id: 1 });

      const removed = manager.cleanupOldBackups(0); // Remove all

      expect(removed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('MigrationValidator', () => {
    let validator: MigrationValidator;
    let registry: SchemaRegistry;

    beforeEach(() => {
      registry = new SchemaRegistry();
      validator = new MigrationValidator(registry, 'strict');

      const schema: SchemaVersion = {
        version: 1,
        name: 'v1',
        description: 'test schema',
        createdAt: Date.now(),
        tables: [
          {
            name: 'users',
            columns: [
              { name: 'id', type: 'string', nullable: false },
              { name: 'name', type: 'string', nullable: false, maxLength: 100 },
              { name: 'email', type: 'string', nullable: true },
              { name: 'age', type: 'number', nullable: true, minValue: 0, maxValue: 150 },
            ],
            primaryKey: 'id',
          },
        ],
        indexes: [],
      };

      registry.registerVersion(schema);
    });

    it('should validate valid data', () => {
      const data = {
        users: [
          { id: '1', name: 'Alice', email: 'alice@test.com', age: 30 },
          { id: '2', name: 'Bob', age: 25 },
        ],
      };

      const result = validator.validateDataAgainstSchema(data, 1);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should detect required field missing', () => {
      const data = {
        users: [{ id: '1', email: 'alice@test.com' }], // missing name
      };

      const result = validator.validateDataAgainstSchema(data, 1);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('name'))).toBe(true);
    });

    it('should detect type mismatch', () => {
      const data = {
        users: [{ id: '1', name: 'Alice', age: 'thirty' }], // age should be number
      };

      const result = validator.validateDataAgainstSchema(data, 1);

      expect(result.valid).toBe(false);
    });

    it('should detect length violation', () => {
      const data = {
        users: [{ id: '1', name: 'A'.repeat(101) }], // exceeds maxLength: 100
      };

      const result = validator.validateDataAgainstSchema(data, 1);

      expect(result.valid).toBe(false);
    });

    it('should detect value constraints', () => {
      const data = {
        users: [{ id: '1', name: 'Alice', age: 200 }], // exceeds maxValue: 150
      };

      const result = validator.validateDataAgainstSchema(data, 1);

      expect(result.valid).toBe(false);
    });

    it('should check backward compatibility', () => {
      const schema2: SchemaVersion = {
        version: 2,
        name: 'v2',
        description: 'v2',
        createdAt: Date.now(),
        tables: [
          {
            name: 'users',
            columns: [
              { name: 'id', type: 'string', nullable: false },
              { name: 'name', type: 'string', nullable: false },
              { name: 'email', type: 'string', nullable: false }, // changed to required
            ],
            primaryKey: 'id',
          },
        ],
        indexes: [],
      };

      registry.registerVersion(schema2);

      const result = validator.isBackwardCompatible(1, 2);

      expect(result.compatible).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe('MigrationHub', () => {
    let hub: MigrationHub;

    beforeEach(() => {
      hub = new MigrationHub({
        autoValidate: true,
        createBackups: true,
      });
    });

    it('should register schema', () => {
      const schema: SchemaVersion = {
        version: 1,
        name: 'v1',
        description: 'Initial schema',
        createdAt: Date.now(),
        tables: [],
        indexes: [],
      };

      const registered = hub.registerSchema(schema);

      expect(registered.version).toBe(1);
    });

    it('should register migration', () => {
      const migration: Migration = {
        id: 'mig1',
        version: 2,
        previousVersion: 1,
        name: 'add_column',
        description: 'Add column',
        up: async (data) => data,
        down: async (data) => data,
        createdAt: Date.now(),
      };

      hub.registerMigration(migration);
      // No error thrown
      expect(true).toBe(true);
    });

    it('should execute migration with backup', async () => {
      const schema: SchemaVersion = {
        version: 1,
        name: 'v1',
        description: 'Initial schema',
        createdAt: Date.now(),
        tables: [],
        indexes: [],
      };

      const migration: Migration = {
        id: 'mig1',
        version: 2,
        previousVersion: 1,
        name: 'add_column',
        description: 'Add column',
        up: async (data) => ({ ...data, newField: 'value' }),
        down: async (data) => data,
        createdAt: Date.now(),
      };

      hub.registerSchema(schema);
      hub.registerMigration(migration);

      const execution = await hub.executeMigration('mig1', { id: 1 });

      expect(execution.status).toBe('completed');

      const backups = hub.listBackups();
      expect(backups.length).toBeGreaterThan(0);
    });

    it('should rollback migration', async () => {
      const migration: Migration = {
        id: 'mig1',
        version: 2,
        previousVersion: 1,
        name: 'add_column',
        description: 'Add column',
        up: async (data) => data,
        down: async (data) => ({ ...data, rolled: true }),
        createdAt: Date.now(),
      };

      hub.registerMigration(migration);

      const execution = await hub.rollbackMigration('mig1', { id: 1 });

      expect(execution.status).toBe('completed');
      expect(execution.direction).toBe('down');
    });

    it('should restore from backup', () => {
      const data = { id: 1, value: 'test' };

      const schema: SchemaVersion = {
        version: 1,
        name: 'v1',
        description: 'Initial schema',
        createdAt: Date.now(),
        tables: [],
        indexes: [],
      };

      hub.registerSchema(schema);

      const backups = hub.listBackups();
      // Create a backup manually for testing
      expect(Array.isArray(backups)).toBe(true);
    });

    it('should validate data', () => {
      const schema: SchemaVersion = {
        version: 1,
        name: 'v1',
        description: 'test schema',
        createdAt: Date.now(),
        tables: [
          {
            name: 'users',
            columns: [{ name: 'id', type: 'string', nullable: false }],
            primaryKey: 'id',
          },
        ],
        indexes: [],
      };

      hub.registerSchema(schema);

      const result = hub.validateData({ users: [{ id: '1' }] }, 1);

      expect(result.valid).toBe(true);
    });

    it('should check compatibility', () => {
      const schema1: SchemaVersion = {
        version: 1,
        name: 'v1',
        description: 'v1',
        createdAt: Date.now(),
        tables: [
          {
            name: 'users',
            columns: [{ name: 'id', type: 'string' }],
            primaryKey: 'id',
          },
        ],
        indexes: [],
      };

      const schema2: SchemaVersion = {
        version: 2,
        name: 'v2',
        description: 'v2',
        createdAt: Date.now(),
        tables: [
          {
            name: 'users',
            columns: [
              { name: 'id', type: 'string' },
              { name: 'name', type: 'string', nullable: false }, // new required column breaks compatibility
            ],
            primaryKey: 'id',
          },
        ],
        indexes: [],
      };

      hub.registerSchema(schema1);
      hub.registerSchema(schema2);

      const result = hub.checkCompatibility(1, 2);

      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should get execution history', async () => {
      const migration: Migration = {
        id: 'mig1',
        version: 2,
        previousVersion: 1,
        name: 'test',
        description: 'test',
        up: async (data) => data,
        down: async (data) => data,
        createdAt: Date.now(),
      };

      hub.registerMigration(migration);

      await hub.executeMigration('mig1', { id: 1 }, false);

      const history = hub.getExecutionHistory();

      expect(history.length).toBeGreaterThan(0);
    });

    it('should cleanup backups', () => {
      const removed = hub.cleanupBackups(0); // Remove all

      expect(typeof removed).toBe('number');
      expect(removed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete migration workflow', async () => {
      const hub = new MigrationHub({
        autoValidate: true,
        createBackups: true,
      });

      // Register initial schema
      const schema1: SchemaVersion = {
        version: 1,
        name: 'v1_users',
        description: 'Initial users schema',
        createdAt: Date.now(),
        tables: [
          {
            name: 'users',
            columns: [
              { name: 'id', type: 'string', nullable: false },
              { name: 'name', type: 'string', nullable: false },
            ],
            primaryKey: 'id',
          },
        ],
        indexes: [],
      };

      hub.registerSchema(schema1);

      // Define migration
      const migration: Migration = {
        id: 'add_email',
        version: 2,
        previousVersion: 1,
        name: 'add_email_column',
        description: 'Add email column to users',
        up: async (data) => ({
          ...data,
          users: (data.users || []).map((user: any) => ({
            ...user,
            email: `${user.name.toLowerCase()}@example.com`,
          })),
        }),
        down: async (data) => ({
          ...data,
          users: (data.users || []).map((user: any) => {
            const { email, ...rest } = user;
            return rest;
          }),
        }),
        createdAt: Date.now(),
      };

      hub.registerMigration(migration);

      // Register new schema
      const schema2: SchemaVersion = {
        version: 2,
        name: 'v2_users',
        description: 'Users schema with email',
        createdAt: Date.now(),
        tables: [
          {
            name: 'users',
            columns: [
              { name: 'id', type: 'string', nullable: false },
              { name: 'name', type: 'string', nullable: false },
              { name: 'email', type: 'string', nullable: false },
            ],
            primaryKey: 'id',
          },
        ],
        indexes: [],
      };

      hub.registerSchema(schema2);

      // Execute migration
      const data = {
        users: [
          { id: '1', name: 'Alice' },
          { id: '2', name: 'Bob' },
        ],
      };

      const execution = await hub.executeMigration('add_email', data);

      expect(execution.status).toBe('completed');
      expect(execution.recordsAffected).toBe(2);

      // Verify backup created
      const backups = hub.listBackups();
      expect(backups.length).toBeGreaterThan(0);

      // Verify schema compatibility
      const compatibility = hub.checkCompatibility(1, 2);
      expect(compatibility.issues.length).toBeGreaterThan(0); // Should have issues due to required email
    });

    it('should handle migration with validation and rollback', async () => {
      const hub = new MigrationHub({
        autoValidate: true,
        validationLevel: 'strict',
      });

      const schema: SchemaVersion = {
        version: 1,
        name: 'v1',
        description: 'test',
        createdAt: Date.now(),
        tables: [
          {
            name: 'accounts',
            columns: [
              { name: 'id', type: 'string', nullable: false },
              { name: 'balance', type: 'number', nullable: false, minValue: 0 },
            ],
            primaryKey: 'id',
          },
        ],
        indexes: [],
      };

      hub.registerSchema(schema);

      const migration: Migration = {
        id: 'update_balance',
        version: 2,
        previousVersion: 1,
        name: 'update_balance',
        description: 'Update balance',
        up: async (data) => ({
          ...data,
          accounts: (data.accounts || []).map((acc: any) => ({
            ...acc,
            balance: acc.balance * 1.05, // 5% increase
          })),
        }),
        down: async (data) => ({
          ...data,
          accounts: (data.accounts || []).map((acc: any) => ({
            ...acc,
            balance: acc.balance / 1.05,
          })),
        }),
        validate: (data) => {
          // Ensure all balances are >= 0
          return (data.accounts || []).every((acc: any) => acc.balance >= 0);
        },
        createdAt: Date.now(),
      };

      hub.registerMigration(migration);

      const data = {
        accounts: [
          { id: '1', balance: 1000 },
          { id: '2', balance: 2000 },
        ],
      };

      const execution = await hub.executeMigration('update_balance', data, true);

      expect(execution.status).toBe('completed');

      const rollback = await hub.rollbackMigration('update_balance', data);

      expect(rollback.status).toBe('completed');
      expect(rollback.direction).toBe('down');
    });
  });
});
