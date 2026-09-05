import { FileMemoryStore } from '../store';
import { EventLogEntry } from '@omega-v/types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

function makeSampleEntry(id: number): EventLogEntry {
  return {
    id,
    type: 'OBSERVATION',
    data: {
      id: `obs-${id}`,
      claim: { statement: `test claim ${id}`, category: 'test' },
      source: { system: 'test', version: '1.0.0', environment: 'test' },
      timestamp: new Date().toISOString(),
      observedBy: 'test',
      metadata: {},
      confidence: 0.9,
      confidenceReason: 'test',
      status: 'normalized' as const,
    },
    recordedAt: new Date().toISOString(),
    hash: crypto.createHash('sha256').update(`entry-${id}`).digest('hex'),
    previousHash: crypto.createHash('sha256').update(`prev-${id}`).digest('hex'),
  };
}

describe('FileMemoryStore', () => {
  let tmpDir: string;
  let storePath: string;
  let key: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'remember-store-test-'));
    storePath = path.join(tmpDir, 'memory.enc');
    key = crypto.randomBytes(32).toString('hex');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('load returns empty array when file does not exist', () => {
    const store = new FileMemoryStore(storePath, key);
    expect(store.load()).toEqual([]);
  });

  test('append and load roundtrips entries through encryption', () => {
    const store = new FileMemoryStore(storePath, key);

    const entry1 = makeSampleEntry(1);
    const entry2 = makeSampleEntry(2);
    store.append(entry1);
    store.append(entry2);

    // Create a new store instance to test cold-load
    const store2 = new FileMemoryStore(storePath, key);
    const loaded = store2.load();

    expect(loaded).toHaveLength(2);
    expect(loaded[0].id).toBe(1);
    expect(loaded[1].id).toBe(2);
  });

  test('encrypted file is not readable as plaintext', () => {
    const store = new FileMemoryStore(storePath, key);
    store.append(makeSampleEntry(1));

    const raw = fs.readFileSync(storePath, 'utf-8');
    // The raw file should not contain the plaintext claim
    expect(raw).not.toContain('test claim 1');
  });

  test('load with wrong key skips undecryptable lines and marks partial', () => {
    const store = new FileMemoryStore(storePath, key);
    store.append(makeSampleEntry(1));

    const wrongKey = crypto.randomBytes(32).toString('hex');
    const badStore = new FileMemoryStore(storePath, wrongKey);

    const loaded = badStore.load();
    expect(loaded).toHaveLength(0);
    expect(badStore.skipped()).toBe(1);
    expect(badStore.source()).toBe('partial');
  });

  test('key rotation: previous key can decrypt old data', () => {
    const store = new FileMemoryStore(storePath, key);
    store.append(makeSampleEntry(1));

    // "Rotate" key
    const newKey = crypto.randomBytes(32).toString('hex');
    const rotatedStore = new FileMemoryStore(storePath, newKey, key);

    const loaded = rotatedStore.load();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe(1);
  });
});
