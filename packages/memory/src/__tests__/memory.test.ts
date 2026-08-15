import { Memory, GENESIS_HASH } from '@omega-v/memory';
import { Observation, VerificationResult, Attestation } from '@omega-v/types';

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

const makeAttestation = (
  id: string,
  verificationId: string,
  observationId: string
): Attestation => ({
  id,
  verificationId,
  observationId,
  verified: true,
  confidence: 0.95,
  signature: '0xabc123',
  signingKey: 'key-2026-08-production-v1',
  keyVersion: '1',
  signingAlgorithm: 'HMAC-SHA256',
  attestedAt: new Date().toISOString(),
  attestedBy: 'attestation-service',
  ruleVersions: { 'status-code-check': '1.2.0' },
  status: 'signed',
});

describe('Memory', () => {
  let memory: Memory;

  beforeEach(() => {
    memory = new Memory();
  });

  describe('Recording', () => {
    it('records the mini kernel loop: observation, verification, attestation', () => {
      const observation = makeObservation('obs-1');
      const verification = makeVerification('ver-1', 'obs-1');
      const attestation = makeAttestation('att-1', 'ver-1', 'obs-1');

      memory.record('OBSERVATION', observation);
      memory.record('VERIFICATION', verification);
      memory.record('ATTESTATION', attestation);

      expect(memory.size()).toBe(3);
      expect(memory.query().map((entry) => entry.type)).toEqual([
        'OBSERVATION',
        'VERIFICATION',
        'ATTESTATION',
      ]);
    });

    it('assigns sequential ids starting at 1', () => {
      memory.record('OBSERVATION', makeObservation('obs-1'));
      memory.record('OBSERVATION', makeObservation('obs-2'));

      expect(memory.query().map((entry) => entry.id)).toEqual([1, 2]);
    });

    it('anchors the first entry to the genesis hash', () => {
      const entry = memory.record('OBSERVATION', makeObservation('obs-1'));
      expect(entry.previousHash).toBe(GENESIS_HASH);
    });

    it('chains each entry to the hash of its predecessor', () => {
      const first = memory.record('OBSERVATION', makeObservation('obs-1'));
      const second = memory.record('VERIFICATION', makeVerification('ver-1', 'obs-1'));

      expect(second.previousHash).toBe(first.hash);
    });
  });

  describe('Integrity', () => {
    it('verifies an intact chain', () => {
      memory.record('OBSERVATION', makeObservation('obs-1'));
      memory.record('VERIFICATION', makeVerification('ver-1', 'obs-1'));
      memory.record('ATTESTATION', makeAttestation('att-1', 'ver-1', 'obs-1'));

      expect(memory.verifyIntegrity()).toBe(true);
    });

    it('detects tampered entry data', () => {
      memory.record('OBSERVATION', makeObservation('obs-1'));
      memory.record('VERIFICATION', makeVerification('ver-1', 'obs-1'));

      const entries = memory.query();
      const tampered = {
        ...entries[0],
        data: { ...(entries[0].data as Observation), confidence: 0.1 },
      };

      expect(Memory.verifyChain([tampered, entries[1]])).toBe(false);
    });

    it('detects a broken link in the chain', () => {
      memory.record('OBSERVATION', makeObservation('obs-1'));
      memory.record('VERIFICATION', makeVerification('ver-1', 'obs-1'));

      const entries = memory.query();
      const relinked = { ...entries[1], previousHash: GENESIS_HASH };

      expect(Memory.verifyChain([entries[0], relinked])).toBe(false);
    });

    it('detects a removed entry', () => {
      memory.record('OBSERVATION', makeObservation('obs-1'));
      memory.record('VERIFICATION', makeVerification('ver-1', 'obs-1'));

      const [, second] = memory.query();

      expect(Memory.verifyChain([second])).toBe(false);
    });

    it('refuses to load a corrupted history', () => {
      memory.record('OBSERVATION', makeObservation('obs-1'));
      const entries = memory.query();
      entries[0] = { ...entries[0], hash: 'forged' };

      expect(() => new Memory(entries)).toThrow('integrity check failed');
    });

    it('rehydrates from previously recorded entries', () => {
      memory.record('OBSERVATION', makeObservation('obs-1'));
      const restored = new Memory(memory.query());

      expect(restored.size()).toBe(1);
      expect(restored.verifyIntegrity()).toBe(true);

      const continued = restored.record('VERIFICATION', makeVerification('ver-1', 'obs-1'));
      expect(continued.id).toBe(2);
      expect(restored.verifyIntegrity()).toBe(true);
    });
  });

  describe('Querying', () => {
    it('filters entries by event type', () => {
      memory.record('OBSERVATION', makeObservation('obs-1'));
      memory.record('VERIFICATION', makeVerification('ver-1', 'obs-1'));
      memory.record('ATTESTATION', makeAttestation('att-1', 'ver-1', 'obs-1'));

      const verifications = memory.query('VERIFICATION');
      expect(verifications).toHaveLength(1);
      expect((verifications[0].data as VerificationResult).id).toBe('ver-1');
    });

    it('returns the latest entry', () => {
      memory.record('OBSERVATION', makeObservation('obs-1'));
      const second = memory.record('OBSERVATION', makeObservation('obs-2'));

      expect(memory.latest()?.hash).toBe(second.hash);
    });

    it('returns undefined latest when empty', () => {
      expect(memory.latest()).toBeUndefined();
    });

    it('returns copies so callers cannot mutate recorded history', () => {
      memory.record('OBSERVATION', makeObservation('obs-1'));

      const entries = memory.query();
      entries.pop();
      entries[0] = { ...entries[0], hash: 'forged' };

      expect(memory.size()).toBe(1);
      expect(memory.verifyIntegrity()).toBe(true);
    });
  });
});
