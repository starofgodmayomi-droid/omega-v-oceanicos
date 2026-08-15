import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileMemoryStore, GENESIS_HASH, Memory } from '@omega-v/memory';
import { Observation, VerificationResult } from '@omega-v/types';

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

const makeVerification = (id: string, observationId: string): VerificationResult => ({
  id,
  observationId,
  timestamp: new Date().toISOString(),
  summary: { passed: true, confidence: 0.95, rulesApplied: 1, rulesPassed: 1, rulesFailed: 0 },
  rules: [{ name: 'status-code-check', passed: true, confidence: 0.98 }],
  evidencePath: [
    {
      step: 1,
      rule: 'status-code-check',
      condition: 'statusCode === 200',
      value: 200,
      expected: 200,
      passed: true,
      reasoning: 'Status code is 200 (expected)',
    },
  ],
  ruleVersions: { 'status-code-check': '1.2.0' },
  status: 'completed',
});

describe('Memory persistence (FileMemoryStore)', () => {
  let directory: string;
  let persistPath: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'omega-memory-'));
    persistPath = join(directory, 'memory.jsonl');
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it('starts empty when no chain has been persisted yet', () => {
    const memory = new Memory({ persistPath });

    expect(memory.size()).toBe(0);
    expect(memory.verifyIntegrity()).toBe(true);
  });

  it('persists every recorded entry and rehydrates it after a restart', () => {
    const first = new Memory({ persistPath });
    first.record('OBSERVATION', makeObservation('obs-1'));
    first.record('VERIFICATION', makeVerification('ver-1', 'obs-1'));

    const restarted = new Memory({ persistPath });

    expect(restarted.size()).toBe(2);
    expect(restarted.verifyIntegrity()).toBe(true);
    expect(restarted.export()).toEqual(first.export());
  });

  it('continues the chain from the persisted tail after a restart', () => {
    const first = new Memory({ persistPath });
    first.record('OBSERVATION', makeObservation('obs-1'));

    const restarted = new Memory({ persistPath });
    const continued = restarted.record('VERIFICATION', makeVerification('ver-1', 'obs-1'));

    expect(continued.id).toBe(2);
    expect(continued.previousHash).toBe(first.latest()?.hash);
    expect(restarted.verifyIntegrity()).toBe(true);
  });

  it('anchors a fresh chain to the genesis hash', () => {
    const memory = new Memory({ persistPath });
    const entry = memory.record('OBSERVATION', makeObservation('obs-1'));

    expect(entry.previousHash).toBe(GENESIS_HASH);
  });

  it('refuses to load a chain whose data was tampered with on disk', () => {
    const memory = new Memory({ persistPath });
    memory.record('OBSERVATION', makeObservation('obs-1'));

    const [entry] = memory.export();
    const tampered = {
      ...entry,
      data: { ...(entry.data as Observation), confidence: 0.1 },
    };
    writeFileSync(persistPath, `${JSON.stringify(tampered)}\n`);

    expect(() => new Memory({ persistPath })).toThrow('integrity check failed');
  });

  it('refuses to load a truncated chain (entry removed from disk)', () => {
    const memory = new Memory({ persistPath });
    memory.record('OBSERVATION', makeObservation('obs-1'));
    memory.record('VERIFICATION', makeVerification('ver-1', 'obs-1'));

    const [, second] = memory.export();
    writeFileSync(persistPath, `${JSON.stringify(second)}\n`);

    expect(() => new Memory({ persistPath })).toThrow('integrity check failed');
  });

  it('throws when the persisted file cannot be parsed at all', () => {
    writeFileSync(persistPath, 'this is not json\n');

    expect(() => new Memory({ persistPath })).toThrow();
  });

  it('prefers explicit existing entries over the persisted file', () => {
    const persisted = new Memory({ persistPath });
    persisted.record('OBSERVATION', makeObservation('obs-persisted'));

    const memory = new Memory({
      existingEntries: [],
      persistPath,
    });

    expect(memory.size()).toBe(0);
  });

  it('writes one JSON object per line', () => {
    const memory = new Memory({ persistPath });
    memory.record('OBSERVATION', makeObservation('obs-1'));
    memory.record('VERIFICATION', makeVerification('ver-1', 'obs-1'));

    const lines = readFileSync(persistPath, 'utf8').trim().split('\n');

    expect(lines).toHaveLength(2);
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });

  it('round-trips through the store directly', () => {
    const memory = new Memory();
    memory.record('OBSERVATION', makeObservation('obs-1'));

    const store = new FileMemoryStore(persistPath);
    store.save(memory.export());

    expect(store.path).toBe(persistPath);
    expect(store.load()).toEqual(memory.export());
    expect(Memory.verifyChain(store.load())).toBe(true);
  });

  it('saving an empty chain produces a file that loads as empty', () => {
    const store = new FileMemoryStore(persistPath);
    store.save([]);

    expect(store.load()).toEqual([]);
  });

  it('keeps the constructor array overload working with no persistence', () => {
    const source = new Memory({ persistPath });
    source.record('OBSERVATION', makeObservation('obs-1'));

    const memory = new Memory(source.export());
    const entry = memory.record('VERIFICATION', makeVerification('ver-1', 'obs-1'));

    expect(entry.id).toBe(2);
    expect(memory.verifyIntegrity()).toBe(true);
    expect(readFileSync(persistPath, 'utf8').trim().split('\n')).toHaveLength(1);
  });

  it('export returns copies so callers cannot mutate recorded history', () => {
    const memory = new Memory({ persistPath });
    memory.record('OBSERVATION', makeObservation('obs-1'));

    const exported = memory.export();
    exported.pop();

    expect(memory.size()).toBe(1);
    expect(memory.verifyIntegrity()).toBe(true);
  });
});
