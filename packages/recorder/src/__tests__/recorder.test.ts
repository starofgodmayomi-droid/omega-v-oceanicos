import { EventLog } from '@omega-v/recorder';
import { Observation, VerificationResult, Attestation } from '@omega-v/types';

describe('EventLog', () => {
  let eventLog: EventLog;

  beforeEach(() => {
    eventLog = new EventLog();
  });

  describe('Recording Events', () => {
    it('should record an observation', () => {
      const observation: Observation = {
        id: 'obs-1',
        claim: { statement: 'Test', category: 'health-check' },
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'Test',
        status: 'normalized',
      };

      const entry = eventLog.recordObservation(observation);

      expect(entry).toBeDefined();
      expect(entry.id).toBe(0);
      expect(entry.type).toBe('OBSERVATION');
      expect(entry.data).toEqual(observation);
      expect(entry.hash).toBeDefined();
    });

    it('should record a verification result', () => {
      const verification: VerificationResult = {
        id: 'ver-1',
        observationId: 'obs-1',
        timestamp: new Date().toISOString(),
        summary: { passed: true, confidence: 0.95, rulesApplied: 1, rulesPassed: 1, rulesFailed: 0 },
        rules: [],
        evidencePath: [],
        ruleVersions: {},
        status: 'completed',
      };

      const entry = eventLog.recordVerification(verification);

      expect(entry).toBeDefined();
      expect(entry.type).toBe('VERIFICATION');
      expect((entry.data as VerificationResult).id).toBe('ver-1');
    });

    it('should record an attestation', () => {
      const attestation: Attestation = {
        id: 'att-1',
        verificationId: 'ver-1',
        observationId: 'obs-1',
        verified: true,
        confidence: 0.95,
        signature: '0x123',
        signingKey: 'key',
        keyVersion: '1',
        signingAlgorithm: 'HMAC-SHA256',
        attestedAt: new Date().toISOString(),
        attestedBy: 'service',
        ruleVersions: {},
        status: 'signed',
      };

      const entry = eventLog.recordAttestation(attestation);

      expect(entry).toBeDefined();
      expect(entry.type).toBe('ATTESTATION');
      expect((entry.data as Attestation).id).toBe('att-1');
    });

    it('should assign sequential IDs to events', () => {
      const observation1: Observation = {
        id: 'obs-1',
        claim: { statement: 'Test 1', category: 'health-check' },
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'Test',
        status: 'normalized',
      };

      const observation2: Observation = {
        id: 'obs-2',
        claim: { statement: 'Test 2', category: 'health-check' },
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'Test',
        status: 'normalized',
      };

      const entry1 = eventLog.recordObservation(observation1);
      const entry2 = eventLog.recordObservation(observation2);

      expect(entry1.id).toBe(0);
      expect(entry2.id).toBe(1);
    });
  });

  describe('Hash Chain Integrity', () => {
    it('should create hash for each event', () => {
      const observation: Observation = {
        id: 'obs-1',
        claim: { statement: 'Test', category: 'health-check' },
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'Test',
        status: 'normalized',
      };

      const entry = eventLog.recordObservation(observation);

      expect(entry.hash).toBeDefined();
      expect(entry.hash.length).toBeGreaterThan(0);
    });

    it('should link events in chain with previousHash', () => {
      const observation1: Observation = {
        id: 'obs-1',
        claim: { statement: 'Test 1', category: 'health-check' },
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'Test',
        status: 'normalized',
      };

      const observation2: Observation = {
        id: 'obs-2',
        claim: { statement: 'Test 2', category: 'health-check' },
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'Test',
        status: 'normalized',
      };

      const entry1 = eventLog.recordObservation(observation1);
      const entry2 = eventLog.recordObservation(observation2);

      expect(entry2.previousHash).toBe(entry1.hash);
    });

    it('should have genesis block hash for first event', () => {
      const observation: Observation = {
        id: 'obs-1',
        claim: { statement: 'Test', category: 'health-check' },
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'Test',
        status: 'normalized',
      };

      const entry = eventLog.recordObservation(observation);

      expect(entry.previousHash).toBe('0'.repeat(64));
    });
  });

  describe('Querying', () => {
    beforeEach(() => {
      for (let i = 0; i < 5; i++) {
        const observation: Observation = {
          id: `obs-${i}`,
          claim: { statement: `Test ${i}`, category: 'health-check' },
          source: { system: 'test', version: '1.0.0', environment: 'test' },
          timestamp: new Date().toISOString(),
          observedBy: 'test',
          metadata: {},
          confidence: 0.9,
          confidenceReason: 'Test',
          status: 'normalized',
        };
        eventLog.recordObservation(observation);
      }
    });

    it('should query events by type', () => {
      const result = eventLog.queryByType('OBSERVATION');

      expect(result.events.length).toBe(5);
      expect(result.totalCount).toBe(5);
    });

    it('should support pagination', () => {
      const page1 = eventLog.queryByType('OBSERVATION', { limit: 2, offset: 0 });
      const page2 = eventLog.queryByType('OBSERVATION', { limit: 2, offset: 2 });

      expect(page1.events.length).toBe(2);
      expect(page2.events.length).toBe(2);
      expect(page1.pagination.hasMore).toBe(true);
      expect(page2.pagination.hasMore).toBe(true);
    });

    it('should indicate when there are no more pages', () => {
      const lastPage = eventLog.queryByType('OBSERVATION', { limit: 10, offset: 0 });

      expect(lastPage.events.length).toBe(5);
      expect(lastPage.pagination.hasMore).toBe(false);
    });

    it('should query event by ID', () => {
      const result = eventLog.queryById('obs-2');

      expect(result).toBeDefined();
      expect((result?.data as Observation).claim.statement).toContain('Test 2');
    });

    it('should return null for non-existent ID', () => {
      const result = eventLog.queryById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('Trace Retrieval', () => {
    it('should get complete trace for observation', () => {
      const observation: Observation = {
        id: 'obs-1',
        claim: { statement: 'Test', category: 'health-check' },
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'Test',
        status: 'normalized',
      };

      const verification: VerificationResult = {
        id: 'ver-1',
        observationId: 'obs-1',
        timestamp: new Date().toISOString(),
        summary: { passed: true, confidence: 0.95, rulesApplied: 1, rulesPassed: 1, rulesFailed: 0 },
        rules: [],
        evidencePath: [],
        ruleVersions: {},
        status: 'completed',
      };

      const attestation: Attestation = {
        id: 'att-1',
        verificationId: 'ver-1',
        observationId: 'obs-1',
        verified: true,
        confidence: 0.95,
        signature: '0x123',
        signingKey: 'key',
        keyVersion: '1',
        signingAlgorithm: 'HMAC-SHA256',
        attestedAt: new Date().toISOString(),
        attestedBy: 'service',
        ruleVersions: {},
        status: 'signed',
      };

      eventLog.recordObservation(observation);
      eventLog.recordVerification(verification);
      eventLog.recordAttestation(attestation);

      const trace = eventLog.getTraceForObservation('obs-1');

      expect(trace.observation).toBeDefined();
      expect(trace.verifications.length).toBe(1);
      expect(trace.attestations.length).toBe(1);
    });

    it('should return empty trace for non-existent observation', () => {
      const trace = eventLog.getTraceForObservation('nonexistent');

      expect(trace.observation).toBeNull();
      expect(trace.verifications.length).toBe(0);
      expect(trace.attestations.length).toBe(0);
    });
  });

  describe('Integrity Verification', () => {
    it('should verify integrity of valid log', () => {
      const observation: Observation = {
        id: 'obs-1',
        claim: { statement: 'Test', category: 'health-check' },
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'Test',
        status: 'normalized',
      };

      eventLog.recordObservation(observation);

      const integrity = eventLog.verifyIntegrity();

      expect(integrity.valid).toBe(true);
      expect(integrity.brokenAt).toBeUndefined();
    });

    it('should detect when log is empty', () => {
      const integrity = eventLog.verifyIntegrity();

      expect(integrity.valid).toBe(true);
    });

    it('should maintain integrity across multiple events', () => {
      for (let i = 0; i < 5; i++) {
        const observation: Observation = {
          id: `obs-${i}`,
          claim: { statement: `Test ${i}`, category: 'health-check' },
          source: { system: 'test', version: '1.0.0', environment: 'test' },
          timestamp: new Date().toISOString(),
          observedBy: 'test',
          metadata: {},
          confidence: 0.9,
          confidenceReason: 'Test',
          status: 'normalized',
        };
        eventLog.recordObservation(observation);
      }

      const integrity = eventLog.verifyIntegrity();

      expect(integrity.valid).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should report empty stats', () => {
      const stats = eventLog.getStats();

      expect(stats.totalEvents).toBe(0);
      expect(stats.observations).toBe(0);
      expect(stats.verifications).toBe(0);
      expect(stats.attestations).toBe(0);
    });

    it('should report event counts by type', () => {
      const observation: Observation = {
        id: 'obs-1',
        claim: { statement: 'Test', category: 'health-check' },
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'Test',
        status: 'normalized',
      };

      const verification: VerificationResult = {
        id: 'ver-1',
        observationId: 'obs-1',
        timestamp: new Date().toISOString(),
        summary: { passed: true, confidence: 0.95, rulesApplied: 1, rulesPassed: 1, rulesFailed: 0 },
        rules: [],
        evidencePath: [],
        ruleVersions: {},
        status: 'completed',
      };

      const attestation: Attestation = {
        id: 'att-1',
        verificationId: 'ver-1',
        observationId: 'obs-1',
        verified: true,
        confidence: 0.95,
        signature: '0x123',
        signingKey: 'key',
        keyVersion: '1',
        signingAlgorithm: 'HMAC-SHA256',
        attestedAt: new Date().toISOString(),
        attestedBy: 'service',
        ruleVersions: {},
        status: 'signed',
      };

      eventLog.recordObservation(observation);
      eventLog.recordVerification(verification);
      eventLog.recordAttestation(attestation);

      const stats = eventLog.getStats();

      expect(stats.totalEvents).toBe(3);
      expect(stats.observations).toBe(1);
      expect(stats.verifications).toBe(1);
      expect(stats.attestations).toBe(1);
    });
  });

  describe('Export', () => {
    it('should export complete event log', () => {
      const observation: Observation = {
        id: 'obs-1',
        claim: { statement: 'Test', category: 'health-check' },
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'Test',
        status: 'normalized',
      };

      eventLog.recordObservation(observation);

      const exported = eventLog.exportEventLog();

      expect(exported.length).toBe(1);
      expect(exported[0].type).toBe('OBSERVATION');
    });

    it('should maintain integrity in exported log', () => {
      for (let i = 0; i < 3; i++) {
        const observation: Observation = {
          id: `obs-${i}`,
          claim: { statement: `Test ${i}`, category: 'health-check' },
          source: { system: 'test', version: '1.0.0', environment: 'test' },
          timestamp: new Date().toISOString(),
          observedBy: 'test',
          metadata: {},
          confidence: 0.9,
          confidenceReason: 'Test',
          status: 'normalized',
        };
        eventLog.recordObservation(observation);
      }

      const exported = eventLog.exportEventLog();

      expect(exported.length).toBe(3);
      expect(exported[0].previousHash).toBe('0'.repeat(64));
      expect(exported[1].previousHash).toBe(exported[0].hash);
      expect(exported[2].previousHash).toBe(exported[1].hash);
    });
  });
});
