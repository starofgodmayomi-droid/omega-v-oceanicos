import { RememberEngine } from '../index';
import { IEvidence, IObservation } from '@oceanicos/types';

const observation: IObservation = {
  uuid: 'obs-1',
  timestamp: '2026-09-28T12:00:00.000Z',
  siliconYield: 0.98,
  gridLoadMegawatts: 120,
  acceleratorInventory: 12,
};

const evidence: IEvidence = {
  status: 'PASS',
  lawRoute: 'TEST_ROUTE',
  timestamp: '2026-09-28T12:00:01.000Z',
  observationUuid: observation.uuid,
  signatureProof: 'test-proof',
};

describe('RememberEngine SQLite hash chain', () => {
  test('accepts a valid persisted chain', () => {
    const engine = new RememberEngine();
    engine.append(observation, evidence);

    expect(engine.verifyIntegrity()).toBe(true);
    engine.close();
  });

  test('detects tampering with persisted payload', () => {
    const engine = new RememberEngine();
    engine.append(observation, evidence);
    const database = (engine as unknown as { db: { prepare(sql: string): { run(...params: unknown[]): void } } }).db;

    database.prepare('UPDATE ledger SET observation_json = ? WHERE id_index = ?').run('{"uuid":"tampered"}', 4101);
    expect(engine.verifyIntegrity()).toBe(false);

    engine.close();
  });

  test('detects a broken predecessor link', () => {
    const engine = new RememberEngine();
    engine.append(observation, evidence);
    engine.append({ ...observation, uuid: 'obs-2' }, { ...evidence, observationUuid: 'obs-2' });
    const database = (engine as unknown as { db: { prepare(sql: string): { run(...params: unknown[]): void } } }).db;

    database.prepare('UPDATE ledger SET previous_hash = ? WHERE id_index = ?').run('not-the-tip', 4102);
    expect(engine.verifyIntegrity()).toBe(false);

    engine.close();
  });
});
