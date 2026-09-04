import { SQLiteEventLog } from '../index';
import { Observation, Verification, Attestation } from '@omega-v/types';

describe('SQLiteEventLog', () => {
  let log: SQLiteEventLog;

  beforeEach(() => {
    log = new SQLiteEventLog({ inMemory: true });
  });

  afterEach(() => {
    log.close();
  });

  describe('Recording Events', () => {
    it('should record observations to database', () => {
      const observation: Observation = {
        id: 'obs-1',
        claim: { statement: 'Test claim', category: 'test' },
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        observedBy: 'test',
        metadata: { key: 'value' },
        confidence: 0.95,
        confidenceReason: 'Test',
        status: 'normalized',
      };

      const entry = log.recordObservation(observation);

      expect(entry).toBeDefined();
      expect(entry.type).toBe('OBSERVATION');
      expect(entry.hash).toBeDefined();
      expect(entry.previousHash).toBe('');
    });

    it('should record verifications to database', () => {
      const verification: Verification = {
        id: 'ver-1',
        observationId: 'obs-1',
        summary: { passed: true, rulesApplied: 1, rulesPassed: 1 },
        evidencePath: [{ passed: true, rule: 'test-rule', reasoning: 'Test' }],
        status: 'verified',
      };

      const entry = log.recordVerification(verification);

      expect(entry.type).toBe('VERIFICATION');
      expect(entry.hash).toBeDefined();
    });

    it('should record attestations to database', () => {
      const attestation: Attestation = {
        id: 'att-1',
        observationId: 'obs-1',
        verificationId: 'ver-1',
        verified: true,
        signature: 'test-signature',
        keyVersion: 1,
        attestedAt: new Date().toISOString(),
        status: 'signed',
      };

      const entry = log.recordAttestation(attestation);

      expect(entry.type).toBe('ATTESTATION');
      expect(entry.hash).toBeDefined();
    });
  });

  describe('Hash Chain Integrity', () => {
    it('should maintain hash chain across events', () => {
      const obs: Observation = {
        id: 'obs-1',
        claim: { statement: 'Test', category: 'test' },
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'Test',
        status: 'normalized',
      };

      const ver: Verification = {
        id: 'ver-1',
        observationId: 'obs-1',
        summary: { passed: true, rulesApplied: 1, rulesPassed: 1 },
        evidencePath: [{ passed: true, rule: 'rule1', reasoning: 'Test' }],
        status: 'verified',
      };

      const entry1 = log.recordObservation(obs);
      const entry2 = log.recordVerification(ver);

      expect(entry2.previousHash).toBe(entry1.hash);
    });

    it('should verify integrity of hash chain', () => {
      const obs: Observation = {
        id: 'obs-1',
        claim: { statement: 'Test', category: 'test' },
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'Test',
        status: 'normalized',
      };

      log.recordObservation(obs);
      log.recordObservation({ ...obs, id: 'obs-2' });

      const integrity = log.verifyIntegrity();
      expect(integrity.valid).toBe(true);
      expect(integrity.brokenAt).toBeUndefined();
    });
  });

  describe('Querying Events', () => {
    beforeEach(() => {
      for (let i = 0; i < 5; i++) {
        log.recordObservation({
          id: `obs-${i}`,
          claim: { statement: `Claim ${i}`, category: 'test' },
          source: { system: 'test', version: '1.0.0', environment: 'test' },
          observedBy: 'test',
          metadata: {},
          confidence: 0.9,
          confidenceReason: 'Test',
          status: 'normalized',
        });
      }
    });

    it('should query events by type with pagination', () => {
      const result = log.queryByType('OBSERVATION', 2, 0);

      expect(result.events.length).toBe(2);
      expect(result.totalCount).toBe(5);
      expect(result.pagination.hasMore).toBe(true);
    });

    it('should query event by ID', () => {
      const entry = log.queryById(1);

      expect(entry).toBeDefined();
      expect(entry?.type).toBe('OBSERVATION');
    });

    it('should return null for non-existent event', () => {
      const entry = log.queryById(999);
      expect(entry).toBeNull();
    });
  });

  describe('Event Tracing', () => {
    it('should retrieve complete trace for observation', () => {
      const obs: Observation = {
        id: 'obs-trace-1',
        claim: { statement: 'Test', category: 'test' },
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'Test',
        status: 'normalized',
      };

      const ver: Verification = {
        id: 'ver-trace-1',
        observationId: 'obs-trace-1',
        summary: { passed: true, rulesApplied: 1, rulesPassed: 1 },
        evidencePath: [{ passed: true, rule: 'rule1', reasoning: 'Test' }],
        status: 'verified',
      };

      const att: Attestation = {
        id: 'att-trace-1',
        observationId: 'obs-trace-1',
        verificationId: 'ver-trace-1',
        verified: true,
        signature: 'test-sig',
        keyVersion: 1,
        attestedAt: new Date().toISOString(),
        status: 'signed',
      };

      log.recordObservation(obs);
      log.recordVerification(ver);
      log.recordAttestation(att);

      const trace = log.getTraceForObservation('obs-trace-1');

      expect(trace.observation).toBeDefined();
      expect(trace.verifications.length).toBe(1);
      expect(trace.attestations.length).toBe(1);
    });

    it('should return empty trace for non-existent observation', () => {
      const trace = log.getTraceForObservation('non-existent');

      expect(trace.observation).toBeNull();
      expect(trace.verifications.length).toBe(0);
      expect(trace.attestations.length).toBe(0);
    });
  });

  describe('Event Export', () => {
    it('should export complete event log', () => {
      log.recordObservation({
        id: 'obs-1',
        claim: { statement: 'Test', category: 'test' },
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'Test',
        status: 'normalized',
      });

      const exported = log.exportEventLog();

      expect(exported.length).toBeGreaterThanOrEqual(1);
      expect(exported[0].type).toBe('OBSERVATION');
      expect(exported[0].hash).toBeDefined();
    });
  });

  describe('Statistics', () => {
    it('should provide event statistics', () => {
      log.recordObservation({
        id: 'obs-1',
        claim: { statement: 'Test', category: 'test' },
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'Test',
        status: 'normalized',
      });

      const stats = log.getStats();

      expect(stats.totalEvents).toBe(1);
      expect(stats.byType['OBSERVATION']).toBe(1);
    });
  });

  describe('Persistence Across Instances', () => {
    it('should persist data to file and recover on restart', () => {
      const dbPath = `/tmp/test-omega-events-${Date.now()}.db`;

      const log1 = new SQLiteEventLog({ dbPath });
      log1.recordObservation({
        id: 'persistent-obs-1',
        claim: { statement: 'Persistent claim', category: 'test' },
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'Test',
        status: 'normalized',
      });
      log1.close();

      const log2 = new SQLiteEventLog({ dbPath });
      const result = log2.queryByType('OBSERVATION');
      log2.close();

      expect(result.totalCount).toBe(1);
      expect(result.events[0].data.id).toBe('persistent-obs-1');
    });
  });
});
