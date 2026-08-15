import { mkdtempSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { emptySnapshot, loadSnapshot, saveSnapshot, SNAPSHOT_KEYS } from '../persistence';

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
