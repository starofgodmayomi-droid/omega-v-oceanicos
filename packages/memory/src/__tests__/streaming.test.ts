import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileMemoryStore, Memory, MemoryStore } from '@omega-v/memory';
import { EventLogEntry, Observation } from '@omega-v/types';

const makeObservation = (id: string): Observation => ({
  id,
  claim: { statement: `Claim ${id}`, category: 'health-check' },
  source: { system: 'test-system', version: '1.0.0', environment: 'test' },
  timestamp: new Date().toISOString(),
  observedBy: 'jest',
  metadata: {},
  confidence: 0.95,
  confidenceReason: 'Executable test evidence',
  status: 'normalized',
});

const makeObservationRow = (id: number): EventLogEntry => ({
  id,
  type: 'OBSERVATION',
  data: makeObservation(`obs-${id}`),
  recordedAt: new Date().toISOString(),
  previousHash: '0'.repeat(64),
  hash: '0'.repeat(64),
});

const collect = async (memory: Memory): Promise<EventLogEntry[]> => {
  const entries: EventLogEntry[] = [];
  for await (const entry of memory.stream()) {
    entries.push(entry);
  }
  return entries;
};

describe('Memory streaming reads', () => {
  let directory: string;
  let persistPath: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'omega-stream-'));
    persistPath = join(directory, 'memory.jsonl');
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it('streams an empty chain without error', async () => {
    const memory = new Memory({ persistPath });

    await expect(collect(memory)).resolves.toEqual([]);
  });

  it('streams the in-process chain when nothing is persisted', async () => {
    const memory = new Memory();
    memory.record('OBSERVATION', makeObservation('obs-1'));
    memory.record('OBSERVATION', makeObservation('obs-2'));

    const entries = await collect(memory);

    expect(entries.map((entry) => entry.id)).toEqual([1, 2]);
  });

  it('streams a persisted chain oldest first without loading it eagerly', async () => {
    const memory = new Memory({ persistPath });
    for (let index = 1; index <= 5; index++) {
      memory.record('OBSERVATION', makeObservation(`obs-${index}`));
    }

    // Restart so streaming reads come from disk, not the live array.
    const restarted = new Memory({ persistPath });
    const entries = await collect(restarted);

    expect(entries.map((entry) => (entry.data as Observation).id)).toEqual([
      'obs-1',
      'obs-2',
      'obs-3',
      'obs-4',
      'obs-5',
    ]);
    expect(entries.map((entry) => entry.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it('verifies the hash chain incrementally while streaming', async () => {
    const memory = new Memory({ persistPath });
    memory.record('OBSERVATION', makeObservation('obs-1'));
    memory.record('OBSERVATION', makeObservation('obs-2'));

    const entries = memory.export();
    const tampered = {
      ...entries[0],
      data: { ...(entries[0].data as Observation), confidence: 0.1 },
    };
    writeFileSync(
      persistPath,
      `${JSON.stringify(tampered)}\n${JSON.stringify(entries[1])}\n`
    );

    await expect(collect(new Memory({ existingEntries: [], persistPath }))).rejects.toThrow(
      /Streaming halted at entry 1: entry hash does not match/
    );
  });

  it('stops streaming at a broken chain link', async () => {
    const memory = new Memory({ persistPath });
    memory.record('OBSERVATION', makeObservation('obs-1'));
    memory.record('OBSERVATION', makeObservation('obs-2'));

    const [first, second] = memory.export();
    const relinked = { ...second, previousHash: first.previousHash };
    writeFileSync(persistPath, `${JSON.stringify(first)}\n${JSON.stringify(relinked)}\n`);

    const store = new FileMemoryStore(persistPath);
    const streamed: EventLogEntry[] = [];
    await expect(async () => {
      let expectedPrevious = first.previousHash;
      for await (const entry of store.stream()) {
        if (entry.previousHash !== expectedPrevious) {
          throw new Error('link broken');
        }
        expectedPrevious = entry.hash;
        streamed.push(entry);
      }
    }).rejects.toThrow('link broken');
    expect(streamed).toHaveLength(1);
  });

  it('surfaces the line number when a persisted row is corrupted', async () => {
    writeFileSync(persistPath, `${JSON.stringify(makeObservationRow(1))}\nnot-json\n`);

    const store = new FileMemoryStore(persistPath);
    const iterator = store.stream()[Symbol.asyncIterator]();

    await iterator.next(); // first row parses
    await expect(iterator.next()).rejects.toThrow(/line 2 is not valid JSON/);
  });
});

describe('Pluggable MemoryStore backends', () => {
  class InMemoryStore implements MemoryStore {
    public appends = 0;
    private entries: EventLogEntry[] = [];

    public load(): EventLogEntry[] {
      return this.entries.map((entry) => ({ ...entry }));
    }

    public async *stream(): AsyncIterable<EventLogEntry> {
      for (const entry of this.entries) {
        yield { ...entry };
      }
    }

    public append(entry: EventLogEntry): void {
      this.appends += 1;
      this.entries.push({ ...entry });
    }

    public save(entries: EventLogEntry[]): void {
      this.entries = entries.map((entry) => ({ ...entry }));
    }
  }

  it('accepts a custom backend and appends each recorded entry once', () => {
    const store = new InMemoryStore();
    const memory = new Memory({ store });

    memory.record('OBSERVATION', makeObservation('obs-1'));
    memory.record('OBSERVATION', makeObservation('obs-2'));

    expect(store.appends).toBe(2);
    expect(memory.size()).toBe(2);
    expect(memory.verifyIntegrity()).toBe(true);
    expect(store.load()).toEqual(memory.export());
  });

  it('rehydrates from a custom backend and continues the chain', async () => {
    const store = new InMemoryStore();
    const first = new Memory({ store });
    first.record('OBSERVATION', makeObservation('obs-1'));

    const restarted = new Memory({ store });
    const continued = restarted.record('OBSERVATION', makeObservation('obs-2'));

    expect(continued.id).toBe(2);
    expect(continued.previousHash).toBe(first.latest()?.hash);

    const streamed: EventLogEntry[] = [];
    for await (const entry of restarted.stream()) {
      streamed.push(entry);
    }
    expect(streamed.map((entry) => entry.id)).toEqual([1, 2]);
  });

  it('rejects a custom backend whose history fails integrity', () => {
    const store = new InMemoryStore();
    store.save([
      {
        id: 1,
        type: 'OBSERVATION',
        data: makeObservation('obs-forged'),
        recordedAt: new Date().toISOString(),
        previousHash: '0'.repeat(64),
        hash: 'forged',
      },
    ]);

    expect(() => new Memory({ store })).toThrow('integrity check failed');
  });

  it('prefers an explicit store over persistPath', () => {
    const directory = mkdtempSync(join(tmpdir(), 'omega-preference-'));
    try {
      const persistPath = join(directory, 'memory.jsonl');
      const store = new InMemoryStore();
      const memory = new Memory({ store, persistPath });

      memory.record('OBSERVATION', makeObservation('obs-1'));

      expect(store.appends).toBe(1);
      expect(readFileSync(persistPath, 'utf8')).toBeUndefined;
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
