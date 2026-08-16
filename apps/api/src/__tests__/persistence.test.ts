import { mkdtempSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  appendEvent,
  emptySnapshot,
  loadSnapshot,
  readEventLog,
  saveSnapshot,
  SNAPSHOT_KEYS,
} from '../persistence';

type Snap = Record<(typeof SNAPSHOT_KEYS)[number], unknown[]>;

const fixture = (): Snap => ({
  events: [{ id: 'evt-1' }],
  runs: [{ correlationId: 'run-1' }],
  actions: [{ id: 'act-1' }],
  learnings: [{ id: 'learn-1' }],
  recompilations: [{ id: 'recompile-1' }],
});

describe('runtime persistence', () => {
  let dir: string;
  let storePath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'omega-persistence-'));
    storePath = join(dir, 'runtime.json');
  });

  describe('loadSnapshot', () => {
    it('returns an empty snapshot and reports disabled when persistence is off', () => {
      writeFileSync(storePath, JSON.stringify(fixture()));

      const result = loadSnapshot<Snap>(storePath, false);

      expect(result.source).toBe('disabled');
      expect(result.snapshot).toEqual(emptySnapshot());
      expect(result.reason).toBeUndefined();
    });

    it('reports missing rather than corrupt when no store exists', () => {
      const result = loadSnapshot<Snap>(join(dir, 'never-written.json'), true);

      expect(result.source).toBe('missing');
      expect(result.reason).toBeDefined();
      expect(result.snapshot).toEqual(emptySnapshot());
    });

    it('reports corrupt when the store is not valid JSON', () => {
      writeFileSync(storePath, '{ this is not json');

      const result = loadSnapshot<Snap>(storePath, true);

      expect(result.source).toBe('corrupt');
      expect(result.reason).toBeDefined();
      expect(result.snapshot).toEqual(emptySnapshot());
    });

    it('reports corrupt when a collection is missing or not an array', () => {
      writeFileSync(storePath, JSON.stringify({ ...fixture(), runs: 'not-an-array' }));
      expect(loadSnapshot<Snap>(storePath, true).source).toBe('corrupt');

      writeFileSync(storePath, JSON.stringify({ events: [] }));
      expect(loadSnapshot<Snap>(storePath, true).source).toBe('corrupt');
    });

    it('reports corrupt when the store parses to a non-object', () => {
      writeFileSync(storePath, 'null');
      expect(loadSnapshot<Snap>(storePath, true).source).toBe('corrupt');

      writeFileSync(storePath, '42');
      expect(loadSnapshot<Snap>(storePath, true).source).toBe('corrupt');
    });

    it('restores every collection from a well-formed store', () => {
      const written = fixture();
      writeFileSync(storePath, JSON.stringify(written));

      const result = loadSnapshot<Snap>(storePath, true);

      expect(result.source).toBe('restored');
      expect(result.reason).toBeUndefined();
      expect(result.snapshot).toEqual(written);
      for (const key of SNAPSHOT_KEYS) {
        expect(result.snapshot[key]).toHaveLength(1);
      }
    });

    it('fills absent-but-valid collections from the empty snapshot', () => {
      const partial = { ...fixture(), recompilations: [] };
      writeFileSync(storePath, JSON.stringify(partial));

      const result = loadSnapshot<Snap>(storePath, true);

      expect(result.source).toBe('restored');
      expect(result.snapshot.recompilations).toEqual([]);
    });
  });

  describe('saveSnapshot', () => {
    it('writes nothing and reports false when persistence is off', () => {
      expect(saveSnapshot(storePath, fixture(), false)).toBe(false);
      expect(existsSync(storePath)).toBe(false);
    });

    it('writes the snapshot and reports true when enabled', () => {
      expect(saveSnapshot(storePath, fixture(), true)).toBe(true);
      expect(JSON.parse(readFileSync(storePath, 'utf8'))).toEqual(fixture());
    });

    it('creates the parent directory when it does not exist', () => {
      const nested = join(dir, 'deep', 'nested', 'runtime.json');

      expect(saveSnapshot(nested, fixture(), true)).toBe(true);
      expect(existsSync(nested)).toBe(true);
    });

    it('leaves no temporary file behind after an atomic write', () => {
      saveSnapshot(storePath, fixture(), true);

      expect(existsSync(`${storePath}.tmp`)).toBe(false);
    });

    it('round-trips through loadSnapshot', () => {
      const written = fixture();
      saveSnapshot(storePath, written, true);

      const result = loadSnapshot<Snap>(storePath, true);

      expect(result.source).toBe('restored');
      expect(result.snapshot).toEqual(written);
    });

    it('encrypts snapshots at rest and authenticates the round trip', () => {
      const written = fixture();
      const secret = 'runtime-encryption-test-secret';

      expect(saveSnapshot(storePath, written, true, secret)).toBe(true);
      const stored = readFileSync(storePath, 'utf8');
      expect(stored.startsWith('omega-v1:')).toBe(true);
      expect(stored).not.toContain('evt-1');

      const result = loadSnapshot<Snap>(storePath, true, secret);

      expect(result.source).toBe('restored');
      expect(result.snapshot).toEqual(written);
    });

    it('reads a legacy plaintext snapshot while encryption is configured', () => {
      const written = fixture();
      saveSnapshot(storePath, written, true);

      const result = loadSnapshot<Snap>(storePath, true, 'migration-secret');

      expect(result.source).toBe('restored');
      expect(result.snapshot).toEqual(written);
    });

    it('reports encrypted snapshots as corrupt when the key is wrong', () => {
      saveSnapshot(storePath, fixture(), true, 'correct-secret');

      const result = loadSnapshot<Snap>(storePath, true, 'wrong-secret');

      expect(result.source).toBe('corrupt');
      expect(result.reason).toBeDefined();
      expect(result.snapshot).toEqual(emptySnapshot());
    });

    it('overwrites a previously written store', () => {
      saveSnapshot(storePath, fixture(), true);
      saveSnapshot(storePath, emptySnapshot(), true);

      const result = loadSnapshot<Snap>(storePath, true);

      expect(result.snapshot).toEqual(emptySnapshot());
    });

    it('surfaces a corrupt store rather than silently starting fresh', () => {
      mkdirSync(join(dir, 'sub'), { recursive: true });
      const path = join(dir, 'sub', 'runtime.json');
      saveSnapshot(path, fixture(), true);
      writeFileSync(path, readFileSync(path, 'utf8').slice(0, 12));

      const result = loadSnapshot<Snap>(path, true);

      expect(result.source).toBe('corrupt');
      expect(result.reason).toBeDefined();
    });
  });
});

describe('append-only event log', () => {
  let dir: string;
  let logPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'omega-log-'));
    logPath = join(dir, 'runtime.log.jsonl');
  });

  it('writes nothing and reports not appended when disabled', () => {
    expect(appendEvent(logPath, { id: 'evt-1' }, false).appended).toBe(false);
    expect(existsSync(logPath)).toBe(false);
  });

  it('reports missing rather than empty when no log exists', () => {
    const result = readEventLog(join(dir, 'absent.jsonl'), true);

    expect(result.source).toBe('missing');
    expect(result.entries).toEqual([]);
    expect(result.reason).toBeDefined();
  });

  it('reports disabled without touching the filesystem', () => {
    const result = readEventLog(logPath, false);

    expect(result.source).toBe('disabled');
    expect(result.skipped).toBe(0);
  });

  it('creates the parent directory on first append', () => {
    const nested = join(dir, 'deep', 'runtime.log.jsonl');

    expect(appendEvent(nested, { id: 'evt-1' }, true).appended).toBe(true);
    expect(existsSync(nested)).toBe(true);
  });

  it('appends without rewriting earlier entries', () => {
    appendEvent(logPath, { id: 'evt-1' }, true);
    const afterFirst = readFileSync(logPath, 'utf8');

    appendEvent(logPath, { id: 'evt-2' }, true);
    const afterSecond = readFileSync(logPath, 'utf8');

    expect(afterSecond.startsWith(afterFirst)).toBe(true);
  });

  it('encrypts each event line without breaking append-only order', () => {
    const secret = 'event-encryption-test-secret';

    appendEvent(logPath, { id: 'evt-1', claim: 'private event' }, true, secret);
    appendEvent(logPath, { id: 'evt-2', claim: 'second event' }, true, secret);

    const stored = readFileSync(logPath, 'utf8');
    expect(stored).toMatch(/^omega-v1:/);
    expect(stored).not.toContain('private event');

    const result = readEventLog<{ id: string }>(logPath, true, secret);

    expect(result.source).toBe('restored');
    expect(result.entries.map((entry) => entry.id)).toEqual(['evt-1', 'evt-2']);
    expect(result.skipped).toBe(0);
  });

  it('reports an encrypted line as partial when the key is wrong', () => {
    appendEvent(logPath, { id: 'evt-1' }, true, 'correct-secret');

    const result = readEventLog<{ id: string }>(logPath, true, 'wrong-secret');

    expect(result.source).toBe('partial');
    expect(result.skipped).toBe(1);
    expect(result.entries).toEqual([]);
  });

  it('preserves every entry in order, beyond the in-memory window', () => {
    for (let index = 0; index < 120; index += 1) {
      appendEvent(logPath, { id: `evt-${index}` }, true);
    }

    const result = readEventLog<{ id: string }>(logPath, true);

    expect(result.source).toBe('restored');
    expect(result.entries).toHaveLength(120);
    expect(result.entries[0].id).toBe('evt-0');
    expect(result.entries[119].id).toBe('evt-119');
    expect(result.skipped).toBe(0);
  });

  it('keeps history that the bounded runtime window would have dropped', () => {
    const window = 40;
    for (let index = 0; index < window + 5; index += 1) {
      appendEvent(logPath, { id: `evt-${index}` }, true);
    }

    const result = readEventLog<{ id: string }>(logPath, true);

    expect(result.entries).toHaveLength(window + 5);
    expect(result.entries.map((entry) => entry.id)).toContain('evt-0');
  });

  it('reports a partial read rather than silently dropping a bad line', () => {
    appendEvent(logPath, { id: 'evt-1' }, true);
    writeFileSync(logPath, `${readFileSync(logPath, 'utf8')}{ not json\n`);
    appendEvent(logPath, { id: 'evt-2' }, true);

    const result = readEventLog<{ id: string }>(logPath, true);

    expect(result.source).toBe('partial');
    expect(result.skipped).toBe(1);
    expect(result.reason).toContain('1');
    expect(result.entries.map((entry) => entry.id)).toEqual(['evt-1', 'evt-2']);
  });

  it('ignores blank lines without counting them as damage', () => {
    appendEvent(logPath, { id: 'evt-1' }, true);
    writeFileSync(logPath, `${readFileSync(logPath, 'utf8')}\n\n`);

    const result = readEventLog(logPath, true);

    expect(result.source).toBe('restored');
    expect(result.skipped).toBe(0);
    expect(result.entries).toHaveLength(1);
  });

  it('reports a reason when the append itself fails', () => {
    // A regular file where a directory is required: mkdirSync raises ENOTDIR.
    const blocker = join(dir, 'blocker');
    writeFileSync(blocker, 'not a directory');

    const outcome = appendEvent(join(blocker, 'runtime.log.jsonl'), { id: 'x' }, true);

    expect(outcome.appended).toBe(false);
    expect(outcome.reason).toBeDefined();
  });
});
