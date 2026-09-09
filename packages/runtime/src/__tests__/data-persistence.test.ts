import { PersistenceAdapter, PersistenceConfig } from '../data-persistence';
import { DataRecord, DataVersion, DataSnapshot, DataType } from '../data-management';
import fs from 'fs';
import path from 'path';

describe('Phase 23: Data Persistence Integration', () => {
  let adapter: PersistenceAdapter;
  const testDbPath = path.join(__dirname, 'test-persistence.db');

  beforeEach(() => {
    adapter = new PersistenceAdapter({ inMemory: true });
  });

  afterEach(() => {
    adapter.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('PersistenceAdapter', () => {
    describe('Record Operations', () => {
      it('should create and persist a record', () => {
        const record: DataRecord = {
          id: 'doc-1',
          type: 'document' as DataType,
          tenantId: 'tenant-1',
          data: { title: 'Test Doc', content: 'Hello World' },
          version: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: 'user-1',
          updatedBy: 'user-1',
          deleted: false,
          tags: new Set(['important', 'draft']),
          metadata: { color: 'blue' },
        };

        adapter.createRecord(record);
        const retrieved = adapter.readRecord('doc-1', 'tenant-1');

        expect(retrieved).toBeDefined();
        expect(retrieved?.title).toEqual(record.data.title);
        expect(retrieved?.version).toBe(1);
      });

      it('should handle record not found', () => {
        const result = adapter.readRecord('non-existent', 'tenant-1');
        expect(result).toBeNull();
      });

      it('should update a record with version control', () => {
        const record: DataRecord = {
          id: 'doc-2',
          type: 'record' as DataType,
          tenantId: 'tenant-1',
          data: { name: 'Original' },
          version: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: 'user-1',
          updatedBy: 'user-1',
          deleted: false,
          tags: new Set(),
          metadata: {},
        };

        adapter.createRecord(record);
        const updated = adapter.updateRecord(
          'doc-2',
          'tenant-1',
          { ...record, data: { name: 'Updated' }, updatedBy: 'user-2' },
          1
        );

        expect(updated).toBeDefined();
        expect(updated?.version).toBe(2);
        expect(updated?.data.name).toBe('Updated');
      });

      it('should fail update on version mismatch', () => {
        const record: DataRecord = {
          id: 'doc-3',
          type: 'document' as DataType,
          tenantId: 'tenant-1',
          data: { name: 'Test' },
          version: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: 'user-1',
          updatedBy: 'user-1',
          deleted: false,
          tags: new Set(),
          metadata: {},
        };

        adapter.createRecord(record);
        const result = adapter.updateRecord(
          'doc-3',
          'tenant-1',
          { ...record, data: { name: 'New' } },
          999
        );

        expect(result).toBeNull();
      });

      it('should soft delete a record', () => {
        const record: DataRecord = {
          id: 'doc-4',
          type: 'document' as DataType,
          tenantId: 'tenant-1',
          data: { content: 'To delete' },
          version: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: 'user-1',
          updatedBy: 'user-1',
          deleted: false,
          tags: new Set(),
          metadata: {},
        };

        adapter.createRecord(record);
        const deleted = adapter.deleteRecord('doc-4', 'tenant-1', 'user-1');

        expect(deleted).toBe(true);
        const retrieved = adapter.readRecord('doc-4', 'tenant-1');
        expect(retrieved?.deleted).toBe(true);
        expect(retrieved?.deletedBy).toBe('user-1');
      });

      it('should restore a deleted record', () => {
        const record: DataRecord = {
          id: 'doc-5',
          type: 'document' as DataType,
          tenantId: 'tenant-1',
          data: { content: 'Restored' },
          version: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: 'user-1',
          updatedBy: 'user-1',
          deleted: false,
          tags: new Set(),
          metadata: {},
        };

        adapter.createRecord(record);
        adapter.deleteRecord('doc-5', 'tenant-1', 'user-1');
        const restored = adapter.restoreRecord('doc-5', 'tenant-1', 'user-1');

        expect(restored).toBeDefined();
        expect(restored?.deleted).toBe(false);
        expect(restored?.deletedAt).toBeUndefined();
      });

      it('should handle tenant isolation', () => {
        const record1: DataRecord = {
          id: 'shared-doc',
          type: 'document' as DataType,
          tenantId: 'tenant-1',
          data: { content: 'Tenant 1' },
          version: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: 'user-1',
          updatedBy: 'user-1',
          deleted: false,
          tags: new Set(),
          metadata: {},
        };

        const record2: DataRecord = {
          id: 'shared-doc',
          type: 'document' as DataType,
          tenantId: 'tenant-2',
          data: { content: 'Tenant 2' },
          version: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: 'user-2',
          updatedBy: 'user-2',
          deleted: false,
          tags: new Set(),
          metadata: {},
        };

        adapter.createRecord(record1);
        adapter.createRecord(record2);

        const retrieved1 = adapter.readRecord('shared-doc', 'tenant-1');
        const retrieved2 = adapter.readRecord('shared-doc', 'tenant-2');

        expect(retrieved1?.data.content).toBe('Tenant 1');
        expect(retrieved2?.data.content).toBe('Tenant 2');
      });
    });

    describe('Version Management', () => {
      it('should store and retrieve version history', () => {
        const version1: DataVersion = {
          id: 'v-1',
          recordId: 'doc-6',
          version: 1,
          data: { content: 'Version 1' },
          changeType: 'create',
          changedBy: 'user-1',
          changedAt: Date.now(),
          changes: {},
          snapshot: false,
        };

        const version2: DataVersion = {
          id: 'v-2',
          recordId: 'doc-6',
          version: 2,
          data: { content: 'Version 2' },
          changeType: 'update',
          changedBy: 'user-2',
          changedAt: Date.now() + 1000,
          changes: { content: ['Version 1', 'Version 2'] },
          snapshot: false,
        };

        adapter.storeVersion(version1);
        adapter.storeVersion(version2);

        const history = adapter.getVersionHistory('doc-6');
        expect(history.length).toBe(2);
        expect(history[0].version).toBe(2);
        expect(history[1].version).toBe(1);
      });

      it('should respect version history limit', () => {
        for (let i = 1; i <= 150; i++) {
          const version: DataVersion = {
            id: `v-${i}`,
            recordId: 'doc-7',
            version: i,
            data: { iteration: i },
            changeType: 'update',
            changedBy: 'user-1',
            changedAt: Date.now() + i * 1000,
            changes: {},
            snapshot: false,
          };
          adapter.storeVersion(version);
        }

        const history = adapter.getVersionHistory('doc-7', 100);
        expect(history.length).toBe(100);
      });

      it('should mark snapshot versions', () => {
        const version: DataVersion = {
          id: 'v-snap-1',
          recordId: 'doc-8',
          version: 1,
          data: { snapshot: true },
          changeType: 'update',
          changedBy: 'user-1',
          changedAt: Date.now(),
          changes: {},
          snapshot: true,
        };

        adapter.storeVersion(version);
        const history = adapter.getVersionHistory('doc-8');

        expect(history[0].snapshot).toBe(true);
      });
    });

    describe('Snapshot Management', () => {
      it('should create and retrieve snapshots', () => {
        const snapshot: DataSnapshot = {
          id: 'snap-1',
          recordId: 'doc-9',
          version: 5,
          data: { state: 'stable' },
          label: 'production-release',
          createdAt: Date.now(),
          createdBy: 'admin',
          description: 'Production snapshot',
        };

        adapter.createSnapshot(snapshot);
        const retrieved = adapter.getSnapshot('doc-9', 'production-release');

        expect(retrieved).toBeDefined();
        expect(retrieved?.version).toBe(5);
        expect(retrieved?.description).toBe('Production snapshot');
      });

      it('should list all snapshots for a record', () => {
        const recordId = 'doc-10';

        for (let i = 1; i <= 3; i++) {
          const snapshot: DataSnapshot = {
            id: `snap-${i}`,
            recordId,
            version: i * 5,
            data: { checkpoint: i },
            label: `checkpoint-${i}`,
            createdAt: Date.now() + i * 1000,
            createdBy: 'user-1',
          };
          adapter.createSnapshot(snapshot);
        }

        const snapshots = adapter.listSnapshots(recordId);
        expect(snapshots.length).toBe(3);
        expect(snapshots[0].label).toBe('checkpoint-3');
      });

      it('should delete snapshots', () => {
        const snapshot: DataSnapshot = {
          id: 'snap-del',
          recordId: 'doc-11',
          version: 1,
          data: {},
          label: 'to-delete',
          createdAt: Date.now(),
          createdBy: 'user-1',
        };

        adapter.createSnapshot(snapshot);
        const deleted = adapter.deleteSnapshot('doc-11', 'to-delete');

        expect(deleted).toBe(true);
        const retrieved = adapter.getSnapshot('doc-11', 'to-delete');
        expect(retrieved).toBeNull();
      });

      it('should enforce unique snapshot labels per record', () => {
        const snapshot1: DataSnapshot = {
          id: 'snap-dup-1',
          recordId: 'doc-12',
          version: 1,
          data: { version: 1 },
          label: 'same-label',
          createdAt: Date.now(),
          createdBy: 'user-1',
        };

        const snapshot2: DataSnapshot = {
          id: 'snap-dup-2',
          recordId: 'doc-12',
          version: 2,
          data: { version: 2 },
          label: 'same-label',
          createdAt: Date.now(),
          createdBy: 'user-1',
        };

        adapter.createSnapshot(snapshot1);
        expect(() => adapter.createSnapshot(snapshot2)).toThrow();
      });
    });

    describe('Record Querying', () => {
      beforeEach(() => {
        const types: DataType[] = ['document', 'record', 'asset', 'config'];
        for (let i = 0; i < 10; i++) {
          const record: DataRecord = {
            id: `query-doc-${i}`,
            type: types[i % 4],
            tenantId: 'tenant-query',
            data: { index: i },
            version: 1,
            createdAt: Date.now() - i * 1000,
            updatedAt: Date.now() - i * 1000,
            createdBy: 'user-1',
            updatedBy: 'user-1',
            deleted: i > 7,
            tags: new Set(),
            metadata: {},
          };
          adapter.createRecord(record);
        }
      });

      it('should query all records by tenant', () => {
        const result = adapter.queryRecords('tenant-query');
        expect(result.total).toBe(10);
        expect(result.records.length).toBeGreaterThan(0);
      });

      it('should filter by type', () => {
        const result = adapter.queryRecords('tenant-query', { type: 'document' });
        expect(result.records.every(r => r.type === 'document')).toBe(true);
      });

      it('should exclude deleted records by default', () => {
        const result = adapter.queryRecords('tenant-query');
        expect(result.records.every(r => !r.deleted)).toBe(true);
      });

      it('should include deleted records when requested', () => {
        const result = adapter.queryRecords('tenant-query', { includeDeleted: true });
        const hasDeleted = result.records.some(r => r.deleted);
        expect(hasDeleted).toBe(true);
      });

      it('should support pagination', () => {
        const page1 = adapter.queryRecords('tenant-query', { limit: 3, offset: 0 });
        const page2 = adapter.queryRecords('tenant-query', { limit: 3, offset: 3 });

        expect(page1.records.length).toBe(3);
        expect(page2.records.length).toBe(3);
        expect(page1.records[0].id).not.toBe(page2.records[0].id);
      });
    });

    describe('Transaction Support', () => {
      it('should execute transaction and commit', () => {
        const result = adapter.transaction((tx) => {
          const record: DataRecord = {
            id: 'trans-1',
            type: 'document' as DataType,
            tenantId: 'tenant-trans',
            data: { transactional: true },
            version: 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            createdBy: 'user-1',
            updatedBy: 'user-1',
            deleted: false,
            tags: new Set(),
            metadata: {},
          };
          tx.createRecord(record);
          return 'committed';
        });

        expect(result).toBe('committed');
        const retrieved = adapter.readRecord('trans-1', 'tenant-trans');
        expect(retrieved).toBeDefined();
      });

      it('should rollback on transaction error', () => {
        try {
          adapter.transaction((tx) => {
            const record: DataRecord = {
              id: 'trans-2',
              type: 'document' as DataType,
              tenantId: 'tenant-trans',
              data: { willFail: true },
              version: 1,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              createdBy: 'user-1',
              updatedBy: 'user-1',
              deleted: false,
              tags: new Set(),
              metadata: {},
            };
            tx.createRecord(record);
            throw new Error('Intentional error');
          });
        } catch (e) {
          // Expected
        }

        const retrieved = adapter.readRecord('trans-2', 'tenant-trans');
        expect(retrieved).toBeNull();
      });

      it('should support atomic multi-record operations', () => {
        adapter.transaction((tx) => {
          for (let i = 0; i < 5; i++) {
            const record: DataRecord = {
              id: `atomic-${i}`,
              type: 'document' as DataType,
              tenantId: 'tenant-atomic',
              data: { index: i },
              version: 1,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              createdBy: 'user-1',
              updatedBy: 'user-1',
              deleted: false,
              tags: new Set(),
              metadata: {},
            };
            tx.createRecord(record);
          }
        });

        const result = adapter.queryRecords('tenant-atomic');
        expect(result.total).toBe(5);
      });
    });

    describe('Audit Logging', () => {
      it('should log record creation', () => {
        const record: DataRecord = {
          id: 'audit-1',
          type: 'document' as DataType,
          tenantId: 'tenant-audit',
          data: {},
          version: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: 'auditor',
          updatedBy: 'auditor',
          deleted: false,
          tags: new Set(),
          metadata: {},
        };

        adapter.createRecord(record);
        const logs = adapter.getAuditLog('audit-1');

        expect(logs.length).toBeGreaterThan(0);
        expect(logs[0].operation).toBe('CREATE');
        expect(logs[0].actor).toBe('auditor');
      });

      it('should log record deletion', () => {
        const record: DataRecord = {
          id: 'audit-2',
          type: 'document' as DataType,
          tenantId: 'tenant-audit',
          data: {},
          version: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: 'user-1',
          updatedBy: 'user-1',
          deleted: false,
          tags: new Set(),
          metadata: {},
        };

        adapter.createRecord(record);
        adapter.deleteRecord('audit-2', 'tenant-audit', 'deleter');
        const logs = adapter.getAuditLog('audit-2');

        const deleteLog = logs.find(l => l.operation === 'DELETE');
        expect(deleteLog).toBeDefined();
        expect(deleteLog?.actor).toBe('deleter');
      });

      it('should retrieve audit logs with pagination', () => {
        const record: DataRecord = {
          id: 'audit-3',
          type: 'document' as DataType,
          tenantId: 'tenant-audit',
          data: {},
          version: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: 'user-1',
          updatedBy: 'user-1',
          deleted: false,
          tags: new Set(),
          metadata: {},
        };

        adapter.createRecord(record);
        const logs = adapter.getAuditLog('audit-3', 10);

        expect(logs.length).toBeGreaterThan(0);
        expect(logs[0].timestamp).toBeGreaterThan(0);
      });
    });

    describe('Persistence Across Connections', () => {
      it('should persist data to file and recover on reconnect', () => {
        const fileAdapter = new PersistenceAdapter({ dbPath: testDbPath });

        const record: DataRecord = {
          id: 'persist-1',
          type: 'document' as DataType,
          tenantId: 'persist-tenant',
          data: { important: 'data' },
          version: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: 'user-1',
          updatedBy: 'user-1',
          deleted: false,
          tags: new Set(['persistent']),
          metadata: { saved: true },
        };

        fileAdapter.createRecord(record);
        fileAdapter.close();

        expect(fs.existsSync(testDbPath)).toBe(true);

        const newAdapter = new PersistenceAdapter({ dbPath: testDbPath });
        const retrieved = newAdapter.readRecord('persist-1', 'persist-tenant');

        expect(retrieved).toBeDefined();
        expect(retrieved?.data.important).toBe('data');
        expect(retrieved?.tags.has('persistent')).toBe(true);

        newAdapter.close();
      });
    });

    describe('Database Operations', () => {
      it('should provide statistics', () => {
        const record: DataRecord = {
          id: 'stat-1',
          type: 'document' as DataType,
          tenantId: 'stat-tenant',
          data: {},
          version: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: 'user-1',
          updatedBy: 'user-1',
          deleted: false,
          tags: new Set(),
          metadata: {},
        };

        adapter.createRecord(record);

        const version: DataVersion = {
          id: 'v-stat-1',
          recordId: 'stat-1',
          version: 1,
          data: {},
          changeType: 'create',
          changedBy: 'user-1',
          changedAt: Date.now(),
          changes: {},
          snapshot: false,
        };
        adapter.storeVersion(version);

        const stats = adapter.stats();
        expect(stats.records).toBeGreaterThan(0);
        expect(stats.versions).toBeGreaterThan(0);
        expect(stats.auditEntries).toBeGreaterThan(0);
      });

      it('should support backup', () => {
        const backupPath = path.join(__dirname, 'test-backup.db');

        const record: DataRecord = {
          id: 'backup-1',
          type: 'document' as DataType,
          tenantId: 'backup-tenant',
          data: { backup: true },
          version: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: 'user-1',
          updatedBy: 'user-1',
          deleted: false,
          tags: new Set(),
          metadata: {},
        };

        adapter.createRecord(record);
        adapter.backup(backupPath);

        expect(fs.existsSync(backupPath)).toBe(true);

        fs.unlinkSync(backupPath);
      });

      it('should vacuum database', () => {
        const record: DataRecord = {
          id: 'vacuum-1',
          type: 'document' as DataType,
          tenantId: 'vacuum-tenant',
          data: {},
          version: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: 'user-1',
          updatedBy: 'user-1',
          deleted: false,
          tags: new Set(),
          metadata: {},
        };

        adapter.createRecord(record);
        adapter.deleteRecord('vacuum-1', 'vacuum-tenant', 'user-1');

        expect(() => adapter.vacuum()).not.toThrow();
      });
    });

    describe('Error Handling', () => {
      it('should handle readonly database', () => {
        const readonlyAdapter = new PersistenceAdapter({
          inMemory: true,
          readonly: true,
        });

        const record: DataRecord = {
          id: 'readonly-1',
          type: 'document' as DataType,
          tenantId: 'tenant-1',
          data: {},
          version: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: 'user-1',
          updatedBy: 'user-1',
          deleted: false,
          tags: new Set(),
          metadata: {},
        };

        expect(() => readonlyAdapter.createRecord(record)).toThrow();
        readonlyAdapter.close();
      });

      it('should handle concurrent operations safely', () => {
        const adapters = Array.from({ length: 3 }, () =>
          new PersistenceAdapter({ inMemory: false, dbPath: testDbPath })
        );

        adapters.forEach((a, i) => {
          const record: DataRecord = {
            id: `concurrent-${i}`,
            type: 'document' as DataType,
            tenantId: 'concurrent-tenant',
            data: { index: i },
            version: 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            createdBy: 'user-1',
            updatedBy: 'user-1',
            deleted: false,
            tags: new Set(),
            metadata: {},
          };
          a.createRecord(record);
        });

        adapters.forEach(a => a.close());

        const finalAdapter = new PersistenceAdapter({ dbPath: testDbPath });
        const result = finalAdapter.queryRecords('concurrent-tenant');
        expect(result.total).toBe(3);
        finalAdapter.close();
      });
    });

    describe('Integration with Data Management', () => {
      it('should maintain data consistency across CRUD operations', () => {
        const recordId = 'integration-1';
        const tenantId = 'integration-tenant';

        const record: DataRecord = {
          id: recordId,
          type: 'document' as DataType,
          tenantId,
          data: { version: 1 },
          version: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: 'user-1',
          updatedBy: 'user-1',
          deleted: false,
          tags: new Set(['v1']),
          metadata: { iteration: 1 },
        };

        adapter.createRecord(record);
        const version1: DataVersion = {
          id: 'v1',
          recordId,
          version: 1,
          data: record.data,
          changeType: 'create',
          changedBy: 'user-1',
          changedAt: record.createdAt,
          changes: {},
          snapshot: false,
        };
        adapter.storeVersion(version1);

        const updated = adapter.updateRecord(
          recordId,
          tenantId,
          { ...record, data: { version: 2 }, updatedBy: 'user-2', tags: new Set(['v2']) },
          1
        );

        const version2: DataVersion = {
          id: 'v2',
          recordId,
          version: 2,
          data: updated!.data,
          changeType: 'update',
          changedBy: 'user-2',
          changedAt: updated!.updatedAt,
          changes: { version: [1, 2] },
          snapshot: false,
        };
        adapter.storeVersion(version2);

        const snapshot: DataSnapshot = {
          id: 'snap-integration',
          recordId,
          version: 2,
          data: updated!.data,
          label: 'v2-stable',
          createdAt: Date.now(),
          createdBy: 'admin',
        };
        adapter.createSnapshot(snapshot);

        const history = adapter.getVersionHistory(recordId);
        expect(history.length).toBe(2);
        expect(history[0].version).toBe(2);

        const snap = adapter.getSnapshot(recordId, 'v2-stable');
        expect(snap?.version).toBe(2);

        const final = adapter.readRecord(recordId, tenantId);
        expect(final?.version).toBe(2);
        expect(final?.data.version).toBe(2);
      });
    });
  });
});
