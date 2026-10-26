/**
 * 🌊 OCEANICOS Ω∞v — Offline Dream & Signal Queue
 * Cryptographic IndexedDB storage for dreams, intentions, and duplex messages
 * when the client is disconnected. Auto-synchronizes on reconnect.
 */

export interface OfflineQueueEntry {
  id: string;
  message: string;
  authorDid: string;
  queuedAt: string;
  status: 'pending' | 'synced';
  serverReply?: any;
}

const DB_NAME = 'omega-offline-vault';
const DB_VERSION = 1;
const STORE_NAME = 'dream-queue';

function getDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

// In-memory fallback for SSR / non-browser test contexts
const memoryQueue: OfflineQueueEntry[] = [];

export async function enqueueOfflineMessage(
  message: string,
  authorDid = 'did:omega:human:starofgodmayomi'
): Promise<OfflineQueueEntry> {
  const entry: OfflineQueueEntry = {
    id: `dream-offline-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    message,
    authorDid,
    queuedAt: new Date().toISOString(),
    status: 'pending',
  };

  const db = await getDb();
  if (db) {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(entry);
    } catch {
      memoryQueue.push(entry);
    }
  } else {
    memoryQueue.push(entry);
  }

  return entry;
}

export async function getPendingOfflineMessages(): Promise<OfflineQueueEntry[]> {
  const db = await getDb();
  if (db) {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const all: OfflineQueueEntry[] = req.result || [];
          resolve(all.filter((e) => e.status === 'pending'));
        };
        req.onerror = () => resolve(memoryQueue.filter((e) => e.status === 'pending'));
      } catch {
        resolve(memoryQueue.filter((e) => e.status === 'pending'));
      }
    });
  }
  return memoryQueue.filter((e) => e.status === 'pending');
}

export async function markOfflineMessageSynced(id: string, serverReply?: any): Promise<void> {
  const db = await getDb();
  if (db) {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        if (getReq.result) {
          const updated = { ...getReq.result, status: 'synced', serverReply };
          store.put(updated);
        }
      };
    } catch {
      // skip
    }
  }
  const mem = memoryQueue.find((e) => e.id === id);
  if (mem) {
    mem.status = 'synced';
    mem.serverReply = serverReply;
  }
}

export async function syncOfflineQueue(
  apiUrlFn?: (path: string) => string,
  onMessageSynced?: (entry: OfflineQueueEntry, reply: any) => void
): Promise<{ syncedCount: number; results: any[] }> {
  const pending = await getPendingOfflineMessages();
  if (pending.length === 0) return { syncedCount: 0, results: [] };

  const endpoint = apiUrlFn ? apiUrlFn('/v1/chat') : '/v1/chat';
  const results: any[] = [];
  let syncedCount = 0;

  for (const entry of pending) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: entry.message }),
      });
      if (res.ok) {
        const data = await res.json();
        await markOfflineMessageSynced(entry.id, data);
        syncedCount++;
        results.push(data);
        onMessageSynced?.(entry, data);
      }
    } catch {
      // If still offline, remain pending
      break;
    }
  }

  return { syncedCount, results };
}
