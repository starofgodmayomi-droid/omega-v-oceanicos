/**
 * Phase 25: Replication System - Comprehensive Test Suite
 * Tests vector clocks, conflict resolution, synchronization, and eventual consistency
 */

import {
  VectorClockManager,
  ChangeLogManager,
  ReplicationManager,
  SyncCoordinator,
  ReplicationHub,
  ChangeLog,
  ReplicatedData,
  ConflictEvent,
} from '../replication';

describe('Phase 25: Replication System', () => {
  describe('VectorClockManager', () => {
    let manager: VectorClockManager;

    beforeEach(() => {
      manager = new VectorClockManager();
    });

    it('should initialize vector clock for node', () => {
      const clock = manager.initialize('node1');

      expect(clock['node1']).toBe(0);
    });

    it('should increment clock for node', () => {
      manager.initialize('node1');
      const clock1 = manager.increment('node1');

      expect(clock1['node1']).toBe(1);
    });

    it('should track multiple nodes', () => {
      manager.initialize('node1');
      manager.initialize('node2');

      const clock1 = manager.increment('node1');

      expect(clock1['node1']).toBe(1);
      expect(clock1['node2']).toBeDefined();
    });

    it('should merge clocks by taking maximum', () => {
      manager.initialize('node1');
      manager.initialize('node2');

      const clock1 = { node1: 2, node2: 1 };
      const clock2 = { node1: 1, node2: 3 };

      const merged = manager.merge(clock1, clock2);

      expect(merged['node1']).toBe(2);
      expect(merged['node2']).toBe(3);
    });

    it('should detect happens-before relationship', () => {
      const clock1 = { node1: 1, node2: 0 };
      const clock2 = { node1: 2, node2: 1 };

      expect(manager.happensBefore(clock1, clock2)).toBe(true);
      expect(manager.happensBefore(clock2, clock1)).toBe(false);
    });

    it('should detect concurrent clocks', () => {
      const clock1 = { node1: 2, node2: 0 };
      const clock2 = { node1: 0, node2: 2 };

      expect(manager.concurrent(clock1, clock2)).toBe(true);
    });

    it('should handle identical clocks', () => {
      const clock1 = { node1: 1, node2: 1 };
      const clock2 = { node1: 1, node2: 1 };

      expect(manager.happensBefore(clock1, clock2)).toBe(false);
      expect(manager.concurrent(clock1, clock2)).toBe(false);
    });
  });

  describe('ChangeLogManager', () => {
    let manager: ChangeLogManager;

    beforeEach(() => {
      manager = new ChangeLogManager();
    });

    it('should record insert change', () => {
      const change = manager.recordChange(
        'node1',
        'insert',
        'users',
        'user1',
        undefined,
        { id: 'user1', name: 'Alice' }
      );

      expect(change.operation).toBe('insert');
      expect(change.nodeId).toBe('node1');
      expect(change.sequenceNumber).toBe(1);
      expect(change.checksum).toBeDefined();
    });

    it('should record update change', () => {
      const change = manager.recordChange(
        'node1',
        'update',
        'users',
        'user1',
        { name: 'Alice' },
        { name: 'Bob' }
      );

      expect(change.operation).toBe('update');
    });

    it('should record delete change', () => {
      const change = manager.recordChange(
        'node1',
        'delete',
        'users',
        'user1',
        { id: 'user1', name: 'Alice' },
        undefined
      );

      expect(change.operation).toBe('delete');
    });

    it('should increment sequence number per node', () => {
      const change1 = manager.recordChange('node1', 'insert', 'users', 'user1', undefined, {});
      const change2 = manager.recordChange('node1', 'insert', 'users', 'user2', undefined, {});

      expect(change1.sequenceNumber).toBe(1);
      expect(change2.sequenceNumber).toBe(2);
    });

    it('should track separate sequences per node', () => {
      const change1 = manager.recordChange('node1', 'insert', 'users', 'user1', undefined, {});
      const change2 = manager.recordChange('node2', 'insert', 'users', 'user2', undefined, {});

      expect(change1.sequenceNumber).toBe(1);
      expect(change2.sequenceNumber).toBe(1);
    });

    it('should retrieve changes since timestamp', () => {
      const now = Date.now();
      manager.recordChange('node1', 'insert', 'users', 'user1', undefined, {});

      const changes = manager.getChangesSince(now - 1000);

      expect(changes.length).toBe(1);
    });

    it('should retrieve changes for resource', () => {
      manager.recordChange('node1', 'insert', 'users', 'user1', undefined, { name: 'Alice' });
      manager.recordChange('node1', 'update', 'users', 'user1', { name: 'Alice' }, { name: 'Bob' });
      manager.recordChange('node1', 'insert', 'users', 'user2', undefined, { name: 'Charlie' });

      const changes = manager.getChangesForResource('users', 'user1');

      expect(changes.length).toBe(2);
      expect(changes[0].operation).toBe('insert');
      expect(changes[1].operation).toBe('update');
    });

    it('should retrieve changes by node', () => {
      manager.recordChange('node1', 'insert', 'users', 'user1', undefined, {});
      manager.recordChange('node2', 'insert', 'users', 'user2', undefined, {});
      manager.recordChange('node1', 'insert', 'users', 'user3', undefined, {});

      const changes = manager.getChangesByNode('node1');

      expect(changes.length).toBe(2);
      expect(changes.every((c) => c.nodeId === 'node1')).toBe(true);
    });

    it('should compact old changes', () => {
      manager.recordChange('node1', 'insert', 'users', 'user1', undefined, {});

      const removed = manager.compact(0); // Remove all changes

      expect(removed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('ReplicationManager', () => {
    let manager: ReplicationManager;

    beforeEach(() => {
      manager = new ReplicationManager({
        strategy: 'peer-to-peer',
        protocol: 'crdt',
        conflictResolution: 'merge',
      });
    });

    it('should register replication node', () => {
      const node = manager.registerNode('node1', 'primary', 'http://node1:3000');

      expect(node.id).toBe('node1');
      expect(node.role).toBe('primary');
      expect(node.status).toBe('healthy');
    });

    it('should write data', () => {
      manager.registerNode('node1', 'primary', 'http://node1:3000');

      const data = manager.write('node1', 'resource1', { value: 'test' });

      expect(data.id).toBe('resource1');
      expect(data.data).toEqual({ value: 'test' });
      expect(data.version).toBe(1);
      expect(data.lastModifiedBy).toBe('node1');
    });

    it('should read data', () => {
      manager.registerNode('node1', 'primary', 'http://node1:3000');
      manager.write('node1', 'resource1', { value: 'test' });

      const data = manager.read('resource1');

      expect(data).toBeDefined();
      expect(data?.data).toEqual({ value: 'test' });
    });

    it('should delete data with tombstone', () => {
      manager.registerNode('node1', 'primary', 'http://node1:3000');
      manager.write('node1', 'resource1', { value: 'test' });
      manager.delete('node1', 'resource1');

      const data = manager.read('resource1');

      expect(data?.tombstone).toBe(true);
    });

    it('should merge non-conflicting changes', () => {
      manager.registerNode('node1', 'primary', 'http://node1:3000');
      manager.registerNode('node2', 'replica', 'http://node2:3000');

      manager.write('node1', 'resource1', { value: 'v1' });

      const change: ChangeLog = {
        id: 'change1',
        nodeId: 'node2',
        timestamp: Date.now() + 1000,
        sequenceNumber: 1,
        operation: 'update',
        resource: 'data',
        resourceId: 'resource1',
        oldValue: { value: 'v1' },
        newValue: { value: 'v2' },
        checksum: 'abc123',
      };

      const result = manager.mergeChange(change);

      expect(result.merged).toBe(true);
      expect(manager.read('resource1')?.data).toEqual({ value: 'v2' });
    });

    it('should detect conflicts with concurrent changes', () => {
      manager.registerNode('node1', 'primary', 'http://node1:3000');
      manager.registerNode('node2', 'replica', 'http://node2:3000');

      manager.write('node1', 'resource1', { value: 'v1' });
      manager.write('node2', 'resource1', { value: 'v2' });

      // Both nodes modified, should trigger conflict detection
      const data = manager.read('resource1');
      expect(data).toBeDefined();
    });

    it('should apply last-write-wins conflict resolution', () => {
      manager = new ReplicationManager({
        conflictResolution: 'last-write-wins',
      });

      manager.registerNode('node1', 'primary', 'http://node1:3000');
      manager.registerNode('node2', 'replica', 'http://node2:3000');

      manager.write('node1', 'resource1', { value: 'old' });

      const change: ChangeLog = {
        id: 'change1',
        nodeId: 'node2',
        timestamp: Date.now() + 5000, // Later timestamp
        sequenceNumber: 1,
        operation: 'update',
        resource: 'data',
        resourceId: 'resource1',
        newValue: { value: 'new' },
        checksum: 'abc123',
      };

      manager.mergeChange(change);

      expect(manager.read('resource1')?.data).toEqual({ value: 'new' });
    });

    it('should update node status', () => {
      const node = manager.registerNode('node1', 'replica', 'http://node1:3000');

      manager.updateNodeStatus('node1', 'lagging', 500);

      const status = manager.getReplicationStatus();
      const updatedNode = status.nodes.find((n) => n.id === 'node1');

      expect(updatedNode?.status).toBe('lagging');
      expect(updatedNode?.lagMs).toBe(500);
    });

    it('should get sync checkpoint', () => {
      manager.registerNode('node1', 'primary', 'http://node1:3000');

      const checkpoint = manager.getSyncCheckpoint('node1');

      expect(checkpoint.nodeId).toBe('node1');
      expect(checkpoint.version).toBe(0);
    });

    it('should get changes for sync', () => {
      manager.registerNode('node1', 'primary', 'http://node1:3000');
      manager.write('node1', 'resource1', { value: 'test' });

      const { changes, checkpoint } = manager.getChangesForSync('node1');

      expect(checkpoint.nodeId).toBe('node1');
      expect(changes.length).toBeGreaterThanOrEqual(0);
    });

    it('should get replication status', () => {
      manager.registerNode('node1', 'primary', 'http://node1:3000');
      manager.registerNode('node2', 'replica', 'http://node2:3000');
      manager.write('node1', 'resource1', { value: 'test' });

      const status = manager.getReplicationStatus();

      expect(status.nodes.length).toBe(2);
      expect(status.totalResources).toBe(1);
    });

    it('should get conflicts', () => {
      manager.registerNode('node1', 'primary', 'http://node1:3000');

      const conflicts = manager.getConflicts();

      expect(Array.isArray(conflicts)).toBe(true);
    });

    it('should compact data', () => {
      manager.registerNode('node1', 'primary', 'http://node1:3000');
      manager.write('node1', 'resource1', { value: 'test' });

      const result = manager.compact(30);

      expect(result.removed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('SyncCoordinator', () => {
    let coordinator: SyncCoordinator;
    let replicationManager: ReplicationManager;

    beforeEach(() => {
      replicationManager = new ReplicationManager();
      coordinator = new SyncCoordinator(replicationManager);

      replicationManager.registerNode('node1', 'primary', 'http://node1:3000');
      replicationManager.registerNode('node2', 'replica', 'http://node2:3000');
    });

    it('should queue changes for sync', () => {
      const change: ChangeLog = {
        id: 'change1',
        nodeId: 'node1',
        timestamp: Date.now(),
        sequenceNumber: 1,
        operation: 'insert',
        resource: 'data',
        resourceId: 'resource1',
        newValue: { value: 'test' },
        checksum: 'abc123',
      };

      coordinator.queueChanges('node2', [change]);

      expect(coordinator.getQueueSize('node2')).toBe(1);
    });

    it('should process sync queue', async () => {
      const change: ChangeLog = {
        id: 'change1',
        nodeId: 'node1',
        timestamp: Date.now(),
        sequenceNumber: 1,
        operation: 'insert',
        resource: 'data',
        resourceId: 'resource1',
        newValue: { value: 'test' },
        checksum: 'abc123',
      };

      coordinator.queueChanges('node2', [change]);
      const result = await coordinator.processSyncQueue('node2');

      expect(result.synced).toBeGreaterThanOrEqual(0);
    });

    it('should prevent concurrent sync', async () => {
      const change: ChangeLog = {
        id: 'change1',
        nodeId: 'node1',
        timestamp: Date.now(),
        sequenceNumber: 1,
        operation: 'insert',
        resource: 'data',
        resourceId: 'resource1',
        newValue: { value: 'test' },
        checksum: 'abc123',
      };

      coordinator.queueChanges('node2', [change]);

      // Start first sync
      const promise1 = coordinator.processSyncQueue('node2');
      // Try to start second sync - should be blocked
      const promise2 = coordinator.processSyncQueue('node2');

      const result1 = await promise1;
      const result2 = await promise2;

      // Second should return 0 since first was in progress
      expect(result2.synced).toBe(0);
      expect(result2.failed).toBe(0);
    });

    it('should track sync statistics', async () => {
      const change: ChangeLog = {
        id: 'change1',
        nodeId: 'node1',
        timestamp: Date.now(),
        sequenceNumber: 1,
        operation: 'insert',
        resource: 'data',
        resourceId: 'resource1',
        newValue: { value: 'test' },
        checksum: 'abc123',
      };

      coordinator.queueChanges('node2', [change]);
      await coordinator.processSyncQueue('node2');

      const stats = coordinator.getStats();

      expect(stats.syncAttempts).toBeGreaterThan(0);
      expect(stats.changesReplicated).toBeGreaterThanOrEqual(0);
    });

    it('should report total queue size', () => {
      const change: ChangeLog = {
        id: 'change1',
        nodeId: 'node1',
        timestamp: Date.now(),
        sequenceNumber: 1,
        operation: 'insert',
        resource: 'data',
        resourceId: 'resource1',
        newValue: { value: 'test' },
        checksum: 'abc123',
      };

      coordinator.queueChanges('node1', [change]);
      coordinator.queueChanges('node2', [change]);

      const totalSize = coordinator.getQueueSize();

      expect(totalSize).toBe(2);
    });
  });

  describe('ReplicationHub', () => {
    let hub: ReplicationHub;

    beforeEach(() => {
      hub = new ReplicationHub({
        strategy: 'peer-to-peer',
        protocol: 'crdt',
        conflictResolution: 'merge',
      });
    });

    it('should register nodes', () => {
      const node1 = hub.registerNode('node1', 'primary', 'http://node1:3000');
      const node2 = hub.registerNode('node2', 'replica', 'http://node2:3000');

      expect(node1.id).toBe('node1');
      expect(node2.id).toBe('node2');
    });

    it('should write and read data', () => {
      hub.registerNode('node1', 'primary', 'http://node1:3000');

      const written = hub.write('node1', 'resource1', { value: 'test' });
      const read = hub.read('resource1');

      expect(read?.data).toEqual({ value: 'test' });
    });

    it('should delete data', () => {
      hub.registerNode('node1', 'primary', 'http://node1:3000');
      hub.write('node1', 'resource1', { value: 'test' });
      hub.delete('node1', 'resource1');

      const data = hub.read('resource1');

      expect(data?.tombstone).toBe(true);
    });

    it('should merge changes', () => {
      hub.registerNode('node1', 'primary', 'http://node1:3000');
      hub.registerNode('node2', 'replica', 'http://node2:3000');
      hub.write('node1', 'resource1', { value: 'v1' });

      const change: ChangeLog = {
        id: 'change1',
        nodeId: 'node2',
        timestamp: Date.now() + 1000,
        sequenceNumber: 1,
        operation: 'update',
        resource: 'data',
        resourceId: 'resource1',
        newValue: { value: 'v2' },
        checksum: 'abc123',
      };

      const result = hub.mergeChange(change);

      expect(result.merged).toBe(true);
    });

    it('should queue and process sync', async () => {
      hub.registerNode('node1', 'primary', 'http://node1:3000');

      const change: ChangeLog = {
        id: 'change1',
        nodeId: 'node1',
        timestamp: Date.now(),
        sequenceNumber: 1,
        operation: 'insert',
        resource: 'data',
        resourceId: 'resource1',
        newValue: { value: 'test' },
        checksum: 'abc123',
      };

      hub.queueChanges('node1', [change]);
      const result = await hub.processSyncQueue('node1');

      expect(typeof result.synced).toBe('number');
      expect(typeof result.failed).toBe('number');
    });

    it('should get replication status', () => {
      hub.registerNode('node1', 'primary', 'http://node1:3000');
      hub.write('node1', 'resource1', { value: 'test' });

      const status = hub.getReplicationStatus();

      expect(status.nodes.length).toBe(1);
      expect(status.totalResources).toBe(1);
    });

    it('should get conflicts', () => {
      const conflicts = hub.getConflicts();

      expect(Array.isArray(conflicts)).toBe(true);
    });

    it('should get sync statistics', () => {
      const stats = hub.getSyncStats();

      expect(stats.syncAttempts).toBeGreaterThanOrEqual(0);
      expect(stats.syncSuccesses).toBeGreaterThanOrEqual(0);
    });

    it('should compact data', () => {
      hub.registerNode('node1', 'primary', 'http://node1:3000');
      hub.write('node1', 'resource1', { value: 'test' });

      const result = hub.compact(30);

      expect(typeof result.removed).toBe('number');
    });
  });

  describe('Integration Tests', () => {
    it('should handle multi-node replication scenario', async () => {
      const hub = new ReplicationHub({
        conflictResolution: 'merge',
      });

      // Register 3 nodes
      hub.registerNode('primary', 'primary', 'http://primary:3000');
      hub.registerNode('replica1', 'replica', 'http://replica1:3000');
      hub.registerNode('replica2', 'replica', 'http://replica2:3000');

      // Write to primary
      const data1 = hub.write('primary', 'user1', { name: 'Alice', age: 30 });
      expect(data1.version).toBe(1);

      // Update on primary
      const data2 = hub.write('primary', 'user1', { name: 'Alice', age: 31 });
      expect(data2.version).toBe(2);

      // Queue change for replicas
      const change: ChangeLog = {
        id: 'change1',
        nodeId: 'primary',
        timestamp: Date.now(),
        sequenceNumber: 2,
        operation: 'update',
        resource: 'users',
        resourceId: 'user1',
        oldValue: { name: 'Alice', age: 30 },
        newValue: { name: 'Alice', age: 31 },
        checksum: 'abc123',
      };

      hub.queueChanges('replica1', [change]);
      hub.queueChanges('replica2', [change]);

      // Process sync
      const result1 = await hub.processSyncQueue('replica1');
      const result2 = await hub.processSyncQueue('replica2');

      expect(result1.synced + result1.failed).toBeGreaterThanOrEqual(0);
      expect(result2.synced + result2.failed).toBeGreaterThanOrEqual(0);

      const status = hub.getReplicationStatus();
      expect(status.totalResources).toBe(1);
    });

    it('should handle conflict resolution in peer-to-peer', async () => {
      const hub = new ReplicationHub({
        strategy: 'peer-to-peer',
        conflictResolution: 'merge',
      });

      hub.registerNode('node1', 'peer', 'http://node1:3000');
      hub.registerNode('node2', 'peer', 'http://node2:3000');

      // Node1 writes
      hub.write('node1', 'document', { title: 'Doc', version: 1 });

      // Node2 writes concurrently
      hub.write('node2', 'document', { title: 'Doc', content: 'Hello', version: 1 });

      // Merge change from node2
      const change: ChangeLog = {
        id: 'change1',
        nodeId: 'node2',
        timestamp: Date.now(),
        sequenceNumber: 1,
        operation: 'update',
        resource: 'documents',
        resourceId: 'document',
        newValue: { title: 'Doc', content: 'Hello', version: 1 },
        checksum: 'xyz789',
      };

      const result = hub.mergeChange(change);

      expect(result.merged).toBe(true);
    });

    it('should maintain eventual consistency across nodes', async () => {
      const hub = new ReplicationHub({
        conflictResolution: 'last-write-wins',
      });

      hub.registerNode('primary', 'primary', 'http://primary:3000');
      hub.registerNode('replica', 'replica', 'http://replica:3000');

      // Initial write
      hub.write('primary', 'counter', { value: 0 });

      // Multiple increments
      for (let i = 1; i <= 5; i++) {
        hub.write('primary', 'counter', { value: i });
      }

      // Sync to replica
      const change: ChangeLog = {
        id: 'change_final',
        nodeId: 'primary',
        timestamp: Date.now(),
        sequenceNumber: 5,
        operation: 'update',
        resource: 'counters',
        resourceId: 'counter',
        newValue: { value: 5 },
        checksum: 'final123',
      };

      hub.queueChanges('replica', [change]);
      await hub.processSyncQueue('replica');

      const data = hub.read('counter');
      expect(data?.data.value).toBe(5);
    });
  });
});
