import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Remember, FileMemoryStore } from '../index';
import { Observation, VerificationResult } from '@omega-v/types';

const observation = (id = 'obs-1'): Observation => ({
  id,
  claim: { statement: 'service responded', category: 'health-check' },
  source: { system: 'test', version: '1.0.0', environment: 'test' },
  timestamp: '2026-08-15T00:00:00.000Z',
  observedBy: 'store-test',
  metadata: { statusCode: 200 },
  confidence: 0.9,
  confidenceReason: 'fixture',
  status: 'normalized',
});

const verification = (id = 'ver-1'): VerificationResult => ({
  id,
  observationId: 'obs-1',
  timestamp: '2026-08-15T00:00:00.000Z',
  summary: { passed: true, confidence: 0.9, rulesApplied: 1, rulesPassed: 1, rulesFailed: 0 },
  rules: [{ name: 'status-code-check', passed: true, confidence: 0.9 }],
  evidencePath: [],
  ruleVersions: { 'status-code-check': '1.0.0' },
  status: 'completed',
});

describe('FileMemoryStore', () => {
  let dir: string;
  let path: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'omega-remember-'));
    path = join(dir, 'chain.jsonl');
  });

  it('reports missing instead of throwing on a chain never written', () => {
    const store = new FileMemoryStore(path);

    expect(() => store.load()).not.toThrow();
    expect(store.load()).toEqual([]);
    expect(store.source()).toBe('missing');
    expect(store.skipped()).toBe(0);
  });

  it('creates the parent directory on first append', () => {
    const nested = new FileMemoryStore(join(dir, 'deep', 'chain.jsonl'));
    new Remember(nested).remember(observation(), verification());

    expect(existsSync(join(dir, 'deep', 'chain.jsonl'))).toBe(true);
  });

  it('reports a partial load and keeps the entries it could read', () => {
    new Remember(new FileMemoryStore(path)).remember(observation(), verification());
    writeFileSync(path, `${readFileSync(path, 'utf8')}{ not json\n`);

    const store = new FileMemoryStore(path);
    const loaded = store.load();

    expect(store.source()).toBe('partial');
    expect(store.skipped()).toBe(1);
    expect(loaded).toHaveLength(3);
  });
});

describe('Remember with durable backing', () => {
  let dir: string;
  let path: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'omega-remember-'));
    path = join(dir, 'chain.jsonl');
  });

  it('is in-process only when constructed without a store', () => {
    const first = new Remember();
    first.remember(observation(), verification());

    expect(first.size()).toBe(3);
    expect(new Remember().size()).toBe(0);
  });

  it('restores the chain across instances', () => {
    const first = new Remember(new FileMemoryStore(path));
    first.remember(observation(), verification());
    expect(first.size()).toBe(3);

    const second = new Remember(new FileMemoryStore(path));

    expect(second.size()).toBe(3);
    expect(second.all().map((entry) => entry.hash)).toEqual(first.all().map((e) => e.hash));
  });

  it('keeps the restored chain verifiable', () => {
    new Remember(new FileMemoryStore(path)).remember(observation(), verification());

    expect(new Remember(new FileMemoryStore(path)).verifyIntegrity()).toBe(true);
  });

  it('continues the hash chain rather than restarting it', () => {
    const first = new Remember(new FileMemoryStore(path));
    first.remember(observation('obs-1'), verification('ver-1'));
    const lastHash = first.all()[first.size() - 1].hash;

    const second = new Remember(new FileMemoryStore(path));
    const appended = second.append({ type: 'OBSERVATION', data: observation('obs-2') });

    expect(appended.previousHash).toBe(lastHash);
    expect(appended.id).toBe(4);
    expect(second.verifyIntegrity()).toBe(true);
  });

  it('does not reissue memory ids after a restore', () => {
    const first = new Remember(new FileMemoryStore(path));
    const firstMemory = first.remember(observation('obs-1'), verification('ver-1'));

    const second = new Remember(new FileMemoryStore(path));
    const secondMemory = second.remember(observation('obs-2'), verification('ver-2'));

    expect(secondMemory.id).not.toBe(firstMemory.id);
    expect(second.recallMemory(firstMemory.id)).toBeDefined();
  });

  it('detects tampering with the chain on disk', () => {
    new Remember(new FileMemoryStore(path)).remember(observation(), verification());

    const lines = readFileSync(path, 'utf8').trim().split('\n');
    const tampered = JSON.parse(lines[0]);
    tampered.data.confidence = 0.1;
    lines[0] = JSON.stringify(tampered);
    writeFileSync(path, `${lines.join('\n')}\n`);

    const reloaded = new Remember(new FileMemoryStore(path));

    expect(reloaded.size()).toBe(3);
    expect(reloaded.verifyIntegrity()).toBe(false);
  });

  it('detects a deleted entry, since the chain no longer links', () => {
    new Remember(new FileMemoryStore(path)).remember(observation(), verification());

    const lines = readFileSync(path, 'utf8').trim().split('\n');
    writeFileSync(path, `${[lines[0], lines[2]].join('\n')}\n`);

    expect(new Remember(new FileMemoryStore(path)).verifyIntegrity()).toBe(false);
  });
});
