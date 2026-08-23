import { OceanicosStateVault } from '../index';
import { EventLogEntry, VerificationRule } from '@omega-v/types';

describe('@omega-v/vault — OceanicosStateVault', () => {
  let vault: OceanicosStateVault;
  const sampleEvents: EventLogEntry[] = [
    {
      id: 1,
      type: 'OBSERVATION',
      recordedAt: new Date().toISOString(),
      hash: 'hash-evt-1',
      previousHash: '0',
      data: { claim: { statement: 'server alive', category: 'health' } },
    },
    {
      id: 2,
      type: 'VERIFICATION',
      recordedAt: new Date().toISOString(),
      hash: 'hash-evt-2',
      previousHash: 'hash-evt-1',
      data: { summary: { passed: true, rulesApplied: 1, rulesPassed: 1 } },
    },
  ];

  const sampleRules: VerificationRule[] = [
    {
      name: 'health-rule',
      version: '1.0.0',
      definition: 'responseTime < 100',
      createdAt: new Date().toISOString(),
      active: true,
    },
  ];

  beforeEach(() => {
    vault = new OceanicosStateVault('test-vault-secret-key');
  });

  describe('Checkpoint Creation & Integrity Sealing', () => {
    it('should create a cryptographically sealed state checkpoint', () => {
      const checkpoint = vault.createCheckpoint('Initial Baseline', sampleEvents, sampleRules);

      expect(checkpoint.checkpointId).toMatch(/^chk-/);
      expect(checkpoint.epoch).toBe(1);
      expect(checkpoint.merkleRoot).toHaveLength(64);
      expect(checkpoint.signature).toMatch(/^0x/);
      expect(checkpoint.totalEvents).toBe(2);
      expect(checkpoint.totalRules).toBe(1);
      expect(checkpoint.payloadSize).toBeGreaterThan(0);

      // Verify signature & Merkle integrity
      expect(vault.verifyCheckpoint(checkpoint)).toBe(true);
    });

    it('should detect tampering in checkpoint snapshot', () => {
      const checkpoint = vault.createCheckpoint('Production Backup', sampleEvents, sampleRules);
      expect(vault.verifyCheckpoint(checkpoint)).toBe(true);

      // Tamper with events
      const tampered = {
        ...checkpoint,
        snapshot: {
          ...checkpoint.snapshot,
          events: [], // wiped events
        },
      };

      expect(vault.verifyCheckpoint(tampered)).toBe(false);
    });
  });

  describe('Disaster Recovery & State Restoration', () => {
    it('should successfully restore valid checkpoint', () => {
      const checkpoint = vault.createCheckpoint('Recovery Point Alpha', sampleEvents, sampleRules);
      const res = vault.restoreCheckpoint(checkpoint.checkpointId);

      expect(res.restored).toBe(true);
      expect(res.eventsRestored).toBe(2);
      expect(res.rulesRestored).toBe(1);
      expect(res.headHashVerified).toBe(true);
      expect(res.reason).toBeUndefined();
    });

    it('should reject restoration of non-existent checkpoint', () => {
      const res = vault.restoreCheckpoint('chk-does-not-exist');
      expect(res.restored).toBe(false);
      expect(res.reason).toContain('not found');
    });
  });

  describe('Vault Stats & Listing', () => {
    it('should list all checkpoints ordered by epoch descending', () => {
      vault.createCheckpoint('Backup 1', sampleEvents, sampleRules);
      vault.createCheckpoint('Backup 2', sampleEvents, sampleRules);

      const all = vault.getCheckpoints();
      expect(all.length).toBe(2);
      expect(all[0].epoch).toBe(2);
      expect(all[1].epoch).toBe(1);

      const stats = vault.getStats();
      expect(stats.totalCheckpoints).toBe(2);
      expect(stats.latestEpoch).toBe(2);
      expect(stats.healthy).toBe(true);
    });
  });
});
