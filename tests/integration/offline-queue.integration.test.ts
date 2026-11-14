import test from 'node:test';
import assert from 'node:assert/strict';
import {
  enqueueOfflineMessage,
  getPendingOfflineMessages,
  markOfflineMessageSynced,
  syncOfflineQueue,
} from '../../apps/web/src/offlineQueue.js';

test('Offline Queue & Sync Tool Integration Suite', async (t) => {
  await t.test('enqueues messages into local memory queue when disconnected', async () => {
    const entry = await enqueueOfflineMessage('Test offline dream thought');
    assert.ok(entry.id.startsWith('dream-offline-'));
    assert.equal(entry.message, 'Test offline dream thought');
    assert.equal(entry.status, 'pending');

    const pending = await getPendingOfflineMessages();
    assert.ok(pending.some((p) => p.id === entry.id));
  });

  await t.test('marks offline messages as synced with server payload', async () => {
    const entry = await enqueueOfflineMessage('Another dream requiring sync');
    await markOfflineMessageSynced(entry.id, { success: true, simulatedReply: 'Sealed' });

    const pending = await getPendingOfflineMessages();
    assert.ok(!pending.some((p) => p.id === entry.id));
  });

  await t.test('syncOfflineQueue drains pending queue when mock network responds', async () => {
    const testMsg = `Offline batch item ${Date.now()}`;
    const enq = await enqueueOfflineMessage(testMsg);

    const mockApiUrl = () => 'http://localhost:5000/v1/chat';
    
    // Execute real sync against live Fastify backend on port 5000
    const result = await syncOfflineQueue(mockApiUrl);
    assert.ok(result.syncedCount >= 1);
    assert.ok(result.results.length >= 1);

    const pendingAfter = await getPendingOfflineMessages();
    assert.ok(!pendingAfter.some((p) => p.id === enq.id));
  });
});
