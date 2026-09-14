import { ProvenanceStore } from '../index';
import { Observation, VerificationResult, Attestation } from '@omega-v/types';

const makeObs = (id: string): Observation => ({
  id,
  claim: { statement: `Claim ${id}`, category: 'health-check' },
  source: { system: 'test', version: '1.0.0', environment: 'test' },
  timestamp: new Date().toISOString(),
  observedBy: 'test',
  metadata: { statusCode: 200, responseTime: 42 },
  confidence: 0.95,
  confidenceReason: 'test',
  status: 'normalized',
});

const makeVerification = (obsId: string, passed: boolean): VerificationResult => ({
  id: `ver-${obsId}`,
  observationId: obsId,
  timestamp: new Date().toISOString(),
  summary: {
    passed,
    confidence: 0.95,
    rulesApplied: 2,
    rulesPassed: passed ? 2 : 0,
    rulesFailed: passed ? 0 : 2,
  },
  rules: [],
  evidencePath: [],
  ruleVersions: {},
  status: 'completed',
});

const makeAttestation = (verId: string, obsId: string): Attestation => ({
  id: `att-${verId}`,
  verificationId: verId,
  observationId: obsId,
  verified: true,
  confidence: 0.95,
  signature: '0x' + 'a'.repeat(64),
  signingKey: 'test-key',
  keyVersion: '1',
  signingAlgorithm: 'HMAC-SHA256',
  attestedAt: new Date().toISOString(),
  attestedBy: 'test-attestor',
  ruleVersions: {},
  status: 'signed',
});

describe('ProvenanceStore', () => {
  let store: ProvenanceStore;

  beforeEach(() => {
    store = new ProvenanceStore();
  });

  it('should start empty', () => {
    expect(store.size()).toBe(0);
    expect(store.getLatest()).toBeUndefined();
  });

  it('should append-only record events with sequential IDs', () => {
    store.recordObservation(makeObs('obs-1'));
    store.recordObservation(makeObs('obs-2'));
    expect(store.size()).toBe(2);
    expect(store.getEntry(1)?.id).toBe(1);
    expect(store.getEntry(2)?.id).toBe(2);
  });

  it('should create a valid hash chain from genesis', () => {
    const obs = makeObs('obs-chain-1');
    const ver = makeVerification('obs-chain-1', true);
    const att = makeAttestation('ver-obs-chain-1', 'obs-chain-1');

    const e1 = store.recordObservation(obs);
    const e2 = store.recordVerification(ver);
    const e3 = store.recordAttestation(att);

    expect(e1.previousHash).toBe(ProvenanceStore.GENESIS_HASH);
    expect(e2.previousHash).toBe(e1.hash);
    expect(e3.previousHash).toBe(e2.hash);
  });

  it('should verify chain integrity', () => {
    store.recordObservation(makeObs('obs-1'));
    store.recordVerification(makeVerification('obs-1', true));
    store.recordAttestation(makeAttestation('ver-obs-1', 'obs-1'));

    const result = store.verifyChainIntegrity();
    expect(result.valid).toBe(true);
  });

  it('should query by type', () => {
    store.recordObservation(makeObs('obs-q1'));
    store.recordObservation(makeObs('obs-q2'));
    store.recordVerification(makeVerification('obs-q1', true));

    const obsResult = store.query({ type: 'OBSERVATION' });
    expect(obsResult.totalCount).toBe(2);
    expect(obsResult.events.every((e) => e.type === 'OBSERVATION')).toBe(true);

    const verResult = store.query({ type: 'VERIFICATION' });
    expect(verResult.totalCount).toBe(1);
  });

  it('should paginate results', () => {
    for (let i = 0; i < 5; i++) store.recordObservation(makeObs(`obs-p${i}`));

    const page1 = store.query({ limit: 2, offset: 0 });
    expect(page1.events).toHaveLength(2);
    expect(page1.pagination.hasMore).toBe(true);

    const page3 = store.query({ limit: 2, offset: 4 });
    expect(page3.events).toHaveLength(1);
    expect(page3.pagination.hasMore).toBe(false);
  });

  it('should compute metrics correctly', () => {
    store.recordObservation(makeObs('obs-m1'));
    store.recordVerification(makeVerification('obs-m1', true));
    store.recordAttestation(makeAttestation('ver-obs-m1', 'obs-m1'));
    store.recordObservation(makeObs('obs-m2'));
    store.recordVerification(makeVerification('obs-m2', false));

    const metrics = store.getMetrics();
    expect(metrics.totalObservations).toBe(2);
    expect(metrics.totalVerifications).toBe(2);
    expect(metrics.totalAttestations).toBe(1);
    expect(metrics.successRate).toBe(0.5);
  });
});
