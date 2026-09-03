import {
  DataStore,
  SnapshotManager,
  RetentionManager,
  DataAuditor,
  DataHub,
  DataType,
  ChangeType,
  RetentionPolicy,
} from '../data-management';

describe('DataStore', () => {
  let store: DataStore;

  beforeEach(() => {
    store = new DataStore();
  });

  test('should create a record with initial version', () => {
    const record = store.create('doc1', 'document', 'tenant1', { title: 'Test' }, 'user1');

    expect(record).toBeDefined();
    expect(record.id).toBe('doc1');
    expect(record.type).toBe('document');
    expect(record.tenantId).toBe('tenant1');
    expect(record.version).toBe(1);
    expect(record.createdBy).toBe('user1');
    expect(record.deleted).toBe(false);
    expect(record.tags.size).toBe(0);
  });

  test('should read an existing record', () => {
    store.create('doc1', 'document', 'tenant1', { title: 'Test' }, 'user1');
    const record = store.read('doc1');

    expect(record).toBeDefined();
    expect(record?.id).toBe('doc1');
  });

  test('should return undefined for non-existent record', () => {
    const record = store.read('nonexistent');
    expect(record).toBeUndefined();
  });

  test('should update a record and increment version', () => {
    store.create('doc1', 'document', 'tenant1', { title: 'Test' }, 'user1');
    const updated = store.update('doc1', { title: 'Updated' }, 'user2');

    expect(updated).toBeDefined();
    expect(updated?.version).toBe(2);
    expect(updated?.data.title).toBe('Updated');
    expect(updated?.updatedBy).toBe('user2');
  });

  test('should not update a deleted record', () => {
    store.create('doc1', 'document', 'tenant1', { title: 'Test' }, 'user1');
    store.delete('doc1', 'user1');
    const updated = store.update('doc1', { title: 'Updated' }, 'user2');

    expect(updated).toBeUndefined();
  });

  test('should soft delete a record', () => {
    store.create('doc1', 'document', 'tenant1', { title: 'Test' }, 'user1');
    const deleted = store.delete('doc1', 'user2');

    expect(deleted).toBeDefined();
    expect(deleted?.deleted).toBe(true);
    expect(deleted?.deletedBy).toBe('user2');
    expect(deleted?.deletedAt).toBeDefined();
  });

  test('should restore a deleted record', () => {
    store.create('doc1', 'document', 'tenant1', { title: 'Test' }, 'user1');
    store.delete('doc1', 'user2');
    const restored = store.restore('doc1', 'user3');

    expect(restored).toBeDefined();
    expect(restored?.deleted).toBe(false);
    expect(restored?.deletedAt).toBeUndefined();
    expect(restored?.deletedBy).toBeUndefined();
  });

  test('should not restore a non-deleted record', () => {
    store.create('doc1', 'document', 'tenant1', { title: 'Test' }, 'user1');
    const restored = store.restore('doc1', 'user2');

    expect(restored).toBeUndefined();
  });

  test('should add and remove tags', () => {
    store.create('doc1', 'document', 'tenant1', { title: 'Test' }, 'user1');

    const addResult = store.addTag('doc1', 'important');
    expect(addResult).toBe(true);

    let record = store.read('doc1');
    expect(record?.tags.has('important')).toBe(true);

    const removeResult = store.removeTag('doc1', 'important');
    expect(removeResult).toBe(true);

    record = store.read('doc1');
    expect(record?.tags.has('important')).toBe(false);
  });

  test('should get version history with limit', () => {
    store.create('doc1', 'document', 'tenant1', { count: 1 }, 'user1');
    store.update('doc1', { count: 2 }, 'user1');
    store.update('doc1', { count: 3 }, 'user1');

    const history = store.getVersionHistory('doc1', 2);
    expect(history.length).toBe(2);
    expect(history[0].version).toBe(2);
    expect(history[1].version).toBe(3);
  });

  test('should clear all data', async () => {
    store.create('doc1', 'document', 'tenant1', { title: 'Test' }, 'user1');
    await store.clear();

    expect(store.read('doc1')).toBeUndefined();
  });
});

describe('SnapshotManager', () => {
  let manager: SnapshotManager;

  beforeEach(() => {
    manager = new SnapshotManager();
  });

  test('should create a snapshot', () => {
    const snapshot = manager.createSnapshot('doc1', 1, { title: 'Test' }, 'v1.0', 'user1');

    expect(snapshot).toBeDefined();
    expect(snapshot.recordId).toBe('doc1');
    expect(snapshot.version).toBe(1);
    expect(snapshot.label).toBe('v1.0');
    expect(snapshot.createdBy).toBe('user1');
  });

  test('should get all snapshots for a record', () => {
    manager.createSnapshot('doc1', 1, { title: 'Test' }, 'v1.0', 'user1');
    manager.createSnapshot('doc1', 2, { title: 'Updated' }, 'v1.1', 'user1');
    manager.createSnapshot('doc2', 1, { title: 'Other' }, 'v1.0', 'user1');

    const snapshots = manager.getSnapshots('doc1');
    expect(snapshots.length).toBe(2);
    expect(snapshots[0].label).toBe('v1.0');
    expect(snapshots[1].label).toBe('v1.1');
  });

  test('should get a specific snapshot by id', () => {
    const snapshot1 = manager.createSnapshot('doc1', 1, { title: 'Test' }, 'v1.0', 'user1');
    const snapshot2 = manager.createSnapshot('doc1', 2, { title: 'Updated' }, 'v1.1', 'user1');

    const found = manager.getSnapshot(snapshot2.id);
    expect(found).toBeDefined();
    expect(found?.label).toBe('v1.1');
  });

  test('should delete a snapshot', () => {
    const snapshot = manager.createSnapshot('doc1', 1, { title: 'Test' }, 'v1.0', 'user1');
    const deleted = manager.deleteSnapshot(snapshot.id);

    expect(deleted).toBe(true);
    expect(manager.getSnapshot(snapshot.id)).toBeUndefined();
  });

  test('should return false when deleting non-existent snapshot', () => {
    const deleted = manager.deleteSnapshot('nonexistent');
    expect(deleted).toBe(false);
  });

  test('should clear all snapshots', async () => {
    manager.createSnapshot('doc1', 1, { title: 'Test' }, 'v1.0', 'user1');
    await manager.clear();

    expect(manager.getSnapshots('doc1').length).toBe(0);
  });
});

describe('RetentionManager', () => {
  let manager: RetentionManager;

  beforeEach(() => {
    manager = new RetentionManager();
  });

  test('should set and get a policy', () => {
    manager.setPolicy('doc1', { policy: 'keep-all' });
    const policy = manager.getPolicy('doc1');

    expect(policy).toBeDefined();
    expect(policy?.policy).toBe('keep-all');
  });

  test('should retain all versions with keep-all policy', () => {
    manager.setPolicy('doc1', { policy: 'keep-all' });

    const result = manager.shouldRetainVersion('doc1', 1000000, 1, 100);
    expect(result).toBe(true);
  });

  test('should retain recent versions with keep-recent policy', () => {
    manager.setPolicy('doc1', { policy: 'keep-recent', keepVersions: 5 });

    expect(manager.shouldRetainVersion('doc1', 1000000, 96, 100)).toBe(true); // recent (100-96=4 < 5)
    expect(manager.shouldRetainVersion('doc1', 1000000, 94, 100)).toBe(false); // old (100-94=6 >= 5)
  });

  test('should retain dated versions with keep-dated policy', () => {
    manager.setPolicy('doc1', { policy: 'keep-dated', keepDays: 30 });
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    expect(manager.shouldRetainVersion('doc1', thirtyDays - 1000, 1, 100)).toBe(true); // within 30 days
    expect(manager.shouldRetainVersion('doc1', thirtyDays + 1000, 1, 100)).toBe(false); // older than 30 days
  });

  test('should return true for record with no policy', () => {
    const result = manager.shouldRetainVersion('doc1', 1000000, 1, 100);
    expect(result).toBe(true);
  });

  test('should prune versions according to policy', () => {
    manager.setPolicy('doc1', { policy: 'keep-recent', keepVersions: 2 });

    const versions = [
      { id: 'v1', recordId: 'doc1', version: 1, data: {}, changeType: 'create' as ChangeType, changedBy: 'user1', changedAt: Date.now(), changes: {}, snapshot: false },
      { id: 'v2', recordId: 'doc1', version: 2, data: {}, changeType: 'update' as ChangeType, changedBy: 'user1', changedAt: Date.now(), changes: {}, snapshot: false },
      { id: 'v3', recordId: 'doc1', version: 3, data: {}, changeType: 'update' as ChangeType, changedBy: 'user1', changedAt: Date.now(), changes: {}, snapshot: false },
    ];

    const pruned = manager.pruneVersions('doc1', versions);
    expect(pruned.length).toBe(2);
    expect(pruned[0].version).toBe(2);
    expect(pruned[1].version).toBe(3);
  });

  test('should clear all policies', async () => {
    manager.setPolicy('doc1', { policy: 'keep-all' });
    await manager.clear();

    expect(manager.getPolicy('doc1')).toBeUndefined();
  });
});

describe('DataAuditor', () => {
  let auditor: DataAuditor;

  beforeEach(() => {
    auditor = new DataAuditor();
  });

  test('should log an operation', () => {
    auditor.logOperation('doc1', 'create', 'user1', 'tenant1');
    const ops = auditor.getOperations('doc1');

    expect(ops.length).toBe(1);
    expect(ops[0].operation).toBe('create');
    expect(ops[0].userId).toBe('user1');
  });

  test('should get operations for a record', () => {
    auditor.logOperation('doc1', 'create', 'user1', 'tenant1');
    auditor.logOperation('doc1', 'update', 'user2', 'tenant1');
    auditor.logOperation('doc2', 'create', 'user1', 'tenant1');

    const ops = auditor.getOperations('doc1');
    expect(ops.length).toBe(2);
  });

  test('should get operations for a user within tenant', () => {
    auditor.logOperation('doc1', 'create', 'user1', 'tenant1');
    auditor.logOperation('doc2', 'update', 'user1', 'tenant1');
    auditor.logOperation('doc3', 'create', 'user2', 'tenant1');

    const ops = auditor.getUserOperations('tenant1', 'user1');
    expect(ops.length).toBe(2);
    expect(ops.every((op) => op.userId === 'user1')).toBe(true);
  });

  test('should respect limit on operation retrieval', () => {
    for (let i = 0; i < 150; i++) {
      auditor.logOperation('doc1', 'update', 'user1', 'tenant1');
    }

    const ops = auditor.getOperations('doc1', 50);
    expect(ops.length).toBe(50);
  });

  test('should calculate stats for a tenant', () => {
    auditor.logOperation('doc1', 'create', 'user1', 'tenant1');
    auditor.logOperation('doc1', 'update', 'user2', 'tenant1');
    auditor.logOperation('doc2', 'create', 'user1', 'tenant1');

    const stats = auditor.getStats('tenant1');
    expect(stats.totalOperations).toBe(3);
    expect(stats.uniqueUsers).toBe(2);
    expect(stats.uniqueRecords).toBe(2);
    expect(stats.operationCounts.create).toBe(2);
    expect(stats.operationCounts.update).toBe(1);
  });

  test('should handle large log volumes', () => {
    for (let i = 0; i < 150000; i++) {
      auditor.logOperation(`doc${i % 100}`, 'update', `user${i % 50}`, 'tenant1');
    }

    const stats = auditor.getStats('tenant1');
    expect(stats.totalOperations).toBe(100000); // trimmed to last 100000
  });

  test('should clear all logs', async () => {
    auditor.logOperation('doc1', 'create', 'user1', 'tenant1');
    await auditor.clear();

    expect(auditor.getOperations('doc1').length).toBe(0);
  });
});

describe('DataHub', () => {
  let hub: DataHub;

  beforeEach(() => {
    hub = new DataHub();
  });

  test('should create a record with audit logging', () => {
    const record = hub.create('doc1', 'document', 'tenant1', { title: 'Test' }, 'user1');

    expect(record).toBeDefined();
    expect(record.id).toBe('doc1');

    const ops = hub.getAuditor().getOperations('doc1');
    expect(ops.some((op) => op.operation === 'create')).toBe(true);
  });

  test('should read a record', () => {
    hub.create('doc1', 'document', 'tenant1', { title: 'Test' }, 'user1');
    const record = hub.read('doc1');

    expect(record).toBeDefined();
    expect(record?.id).toBe('doc1');
  });

  test('should update a record with audit logging', () => {
    hub.create('doc1', 'document', 'tenant1', { title: 'Test' }, 'user1');
    const updated = hub.update('doc1', { title: 'Updated' }, 'user2', 'tenant1');

    expect(updated).toBeDefined();

    const ops = hub.getAuditor().getOperations('doc1');
    expect(ops.some((op) => op.operation === 'update')).toBe(true);
  });

  test('should delete a record with audit logging', () => {
    hub.create('doc1', 'document', 'tenant1', { title: 'Test' }, 'user1');
    const deleted = hub.delete('doc1', 'user2', 'tenant1');

    expect(deleted?.deleted).toBe(true);

    const ops = hub.getAuditor().getOperations('doc1');
    expect(ops.some((op) => op.operation === 'delete')).toBe(true);
  });

  test('should restore a record with audit logging', () => {
    hub.create('doc1', 'document', 'tenant1', { title: 'Test' }, 'user1');
    hub.delete('doc1', 'user2', 'tenant1');
    const restored = hub.restore('doc1', 'user3', 'tenant1');

    expect(restored?.deleted).toBe(false);

    const ops = hub.getAuditor().getOperations('doc1');
    expect(ops.some((op) => op.operation === 'restore')).toBe(true);
  });

  test('should create a snapshot with audit logging', () => {
    hub.create('doc1', 'document', 'tenant1', { title: 'Test' }, 'user1');
    const snapshot = hub.snapshot('doc1', 1, 'v1.0', 'user2');

    expect(snapshot).toBeDefined();
    expect(snapshot?.label).toBe('v1.0');

    const ops = hub.getAuditor().getOperations('doc1');
    expect(ops.some((op) => op.operation === 'snapshot')).toBe(true);
  });

  test('should return undefined when snapshotting non-existent record', () => {
    const snapshot = hub.snapshot('nonexistent', 1, 'v1.0', 'user1');
    expect(snapshot).toBeUndefined();
  });

  test('should provide access to all managers', () => {
    expect(hub.getStore()).toBeDefined();
    expect(hub.getSnapshotManager()).toBeDefined();
    expect(hub.getRetentionManager()).toBeDefined();
    expect(hub.getAuditor()).toBeDefined();
  });

  test('should handle full CRUD workflow with audit trail', () => {
    // Create
    hub.create('doc1', 'document', 'tenant1', { title: 'Initial' }, 'user1');

    // Update
    hub.update('doc1', { title: 'Updated' }, 'user2', 'tenant1');

    // Snapshot
    hub.snapshot('doc1', 2, 'v1.0', 'user3');

    // Delete
    hub.delete('doc1', 'user4', 'tenant1');

    // Restore
    hub.restore('doc1', 'user5', 'tenant1');

    // Verify audit trail
    const ops = hub.getAuditor().getOperations('doc1');
    expect(ops.length).toBe(5);
    expect(ops.map((op) => op.operation)).toEqual(['create', 'update', 'snapshot', 'delete', 'restore']);
  });

  test('should clear all managers', async () => {
    hub.create('doc1', 'document', 'tenant1', { title: 'Test' }, 'user1');
    await hub.clear();

    expect(hub.read('doc1')).toBeUndefined();
    expect(hub.getAuditor().getOperations('doc1').length).toBe(0);
  });
});

describe('Data Management Integration', () => {
  let hub: DataHub;

  beforeEach(() => {
    hub = new DataHub();
  });

  test('should manage multiple records with independent version histories', () => {
    hub.create('doc1', 'document', 'tenant1', { count: 1 }, 'user1');
    hub.create('doc2', 'document', 'tenant1', { count: 1 }, 'user1');

    hub.update('doc1', { count: 2 }, 'user2', 'tenant1');
    hub.update('doc1', { count: 3 }, 'user3', 'tenant1');
    hub.update('doc2', { count: 2 }, 'user2', 'tenant1');

    const record1 = hub.read('doc1');
    const record2 = hub.read('doc2');

    expect(record1?.version).toBe(3);
    expect(record2?.version).toBe(2);
  });

  test('should support multi-tenant isolation in audit logs', () => {
    hub.create('doc1', 'document', 'tenant1', { title: 'Test' }, 'user1');
    hub.create('doc2', 'record', 'tenant2', { title: 'Test' }, 'user2');

    const tenant1Ops = hub.getAuditor().getUserOperations('tenant1', 'user1');
    const tenant2Ops = hub.getAuditor().getUserOperations('tenant2', 'user2');

    expect(tenant1Ops.length).toBe(1);
    expect(tenant2Ops.length).toBe(1);
    expect(tenant1Ops[0].recordId).toBe('doc1');
    expect(tenant2Ops[0].recordId).toBe('doc2');
  });

  test('should track complex data type changes', () => {
    const initialData = {
      title: 'Document',
      tags: ['important', 'urgent'],
      metadata: { created: '2024-01-01' },
    };

    hub.create('doc1', 'document', 'tenant1', initialData, 'user1');

    const updatedData = {
      title: 'Updated Document',
      tags: ['important', 'urgent', 'reviewed'],
      metadata: { created: '2024-01-01', reviewed: '2024-01-02' },
    };

    hub.update('doc1', updatedData, 'user2', 'tenant1');

    const record = hub.read('doc1');
    expect(record?.data.title).toBe('Updated Document');
    expect(record?.data.tags.length).toBe(3);
    expect(record?.data.metadata.reviewed).toBe('2024-01-02');
  });

  test('should maintain data consistency across delete and restore', () => {
    const originalData = { title: 'Test', value: 42 };
    hub.create('doc1', 'document', 'tenant1', originalData, 'user1');

    hub.delete('doc1', 'user2', 'tenant1');
    let record = hub.read('doc1');
    expect(record?.deleted).toBe(true);
    expect(record?.data).toEqual(originalData);

    hub.restore('doc1', 'user3', 'tenant1');
    record = hub.read('doc1');
    expect(record?.deleted).toBe(false);
    expect(record?.data).toEqual(originalData);
  });

  test('should support snapshot and version management workflow', () => {
    hub.create('doc1', 'document', 'tenant1', { version: 'v1' }, 'user1');
    hub.snapshot('doc1', 1, 'stable-v1', 'user1', 'Stable release');

    hub.update('doc1', { version: 'v2' }, 'user2', 'tenant1');
    hub.snapshot('doc1', 2, 'stable-v2', 'user1', 'Stable release 2');

    hub.update('doc1', { version: 'v3-beta' }, 'user3', 'tenant1');

    const snapshots = hub.getSnapshotManager().getSnapshots('doc1');
    expect(snapshots.length).toBe(2);
    expect(snapshots[0].label).toBe('stable-v1');
    expect(snapshots[1].label).toBe('stable-v2');
  });

  test('should apply retention policies to version history', () => {
    hub.create('doc1', 'document', 'tenant1', { count: 1 }, 'user1');

    for (let i = 2; i <= 15; i++) {
      hub.update('doc1', { count: i }, 'user1', 'tenant1');
    }

    // Set retention to keep only last 5 versions
    hub.getRetentionManager().setPolicy('doc1', {
      policy: 'keep-recent',
      keepVersions: 5,
    });

    const history = hub.getStore().getVersionHistory('doc1', 100);
    const pruned = hub.getRetentionManager().pruneVersions('doc1', history);

    expect(pruned.length).toBeLessThanOrEqual(5);
  });
});
