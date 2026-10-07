import { describe, it, expect } from '@jest/globals';
import {
  KaiLedger,
  ConstitutionSection13Violation,
  KAI_GENESIS_ID,
  KAI_GENESIS_HASH,
} from '../kai.js';

describe('Constitution Section 13: KaiLedger', () => {
  it('initializes with a valid genesis node and pristine hash-chain', () => {
    const ledger = new KaiLedger(':memory:');
    const integrity = ledger.verifyIntegrity();
    expect(integrity.valid).toBe(true);
    expect(integrity.count).toBe(1);
    expect(integrity.genesisHash).toBe(integrity.tipHash);
    expect(integrity.distinctions.VERIFIED).toBe(1);

    const tip = ledger.getTip();
    expect(tip).not.toBeNull();
    expect(tip?.id).toBe(KAI_GENESIS_ID);
    expect(tip?.previousHash).toBe(KAI_GENESIS_HASH);
  });

  it('appends records preserving append-only SHA-256 hash lineage', () => {
    const ledger = new KaiLedger(':memory:');

    const r1 = ledger.append({
      distinction: 'USER-STATED',
      statement: 'User requested maximum system upgrade',
      subject: 'user:intent',
      source: 'prompt',
      author: 'human:operator',
      policyOrAuthority: 'AGENTS.md',
    });

    const r2 = ledger.append({
      distinction: 'OBSERVED',
      statement: 'Ports 5000 and 3000 are actively listening',
      subject: 'system:ports',
      source: 'Get-NetTCPConnection',
      author: 'agent:copilot',
      evidenceRef: 'tcp-check-001',
    });

    expect(r1.index).toBe(1);
    expect(r1.previousHash).toBe(ledger.all()[0].hash);

    expect(r2.index).toBe(2);
    expect(r2.previousHash).toBe(r1.hash);

    const integrity = ledger.verifyIntegrity();
    expect(integrity.valid).toBe(true);
    expect(integrity.count).toBe(3);
    expect(integrity.distinctions['USER-STATED']).toBe(1);
    expect(integrity.distinctions.OBSERVED).toBe(1);
  });

  it('enforces Constitution §13: Never silently convert INFERRED → OBSERVED', () => {
    const ledger = new KaiLedger(':memory:');

    const inferred = ledger.append({
      distinction: 'INFERRED',
      statement: 'Docker daemon might be offline because pipe is missing',
      subject: 'system:docker',
      source: 'heuristic-analysis',
      author: 'agent:copilot',
    });

    expect(inferred.distinction).toBe('INFERRED');

    // Attempting to convert directly from inferred to observed without verification evidence fails
    expect(() => {
      ledger.append({
        distinction: 'OBSERVED',
        statement: 'Docker daemon is confirmed offline',
        subject: 'system:docker',
        source: 'inference-promotion',
        author: 'agent:copilot',
        inferredSourceId: inferred.id,
      });
    }).toThrow(ConstitutionSection13Violation);

    // Legitimate path: verify inference via verifyInference
    const verified = ledger.verifyInference({
      inferredRecordId: inferred.id,
      evidenceRef: 'docker-ps-exit-code-1',
      statement: 'Verified: docker ps returned exit code 1 with named pipe error',
      author: 'agent:copilot',
      policyOrAuthority: 'REALITY-FIRST-RULES',
    });

    expect(verified.distinction).toBe('VERIFIED');
    expect(verified.metadata?.inferredRecordId).toBe(inferred.id);

    const integrity = ledger.verifyIntegrity();
    expect(integrity.valid).toBe(true);
    expect(integrity.distinctions.INFERRED).toBe(1);
    expect(integrity.distinctions.VERIFIED).toBe(2); // genesis + verified
  });

  it('detects tampering and reports integrity failure', () => {
    const ledger = new KaiLedger(':memory:');

    ledger.append({
      distinction: 'DOCUMENTED',
      statement: 'Constitution Section 13 mandates hash chains',
      subject: 'docs:constitution',
      source: 'CONSTITUTION.md',
      author: 'system',
    });

    expect(ledger.verifyIntegrity().valid).toBe(true);

    // Tamper with record content in memory
    const records = ledger.all() as any[];
    records[1].statement = 'TAMPERED STATEMENT';

    expect(ledger.verifyIntegrity().valid).toBe(false);
  });

  it('supports querying by distinction and subject', () => {
    const ledger = new KaiLedger(':memory:');

    ledger.append({
      distinction: 'PROPOSED',
      statement: 'Upgrade KAI memory engine in @oceanicos/remember',
      subject: 'kai:upgrade',
      source: 'plan',
      author: 'copilot',
    });

    ledger.append({
      distinction: 'VERIFIED',
      statement: 'KaiLedger implementation passes all tests',
      subject: 'kai:upgrade',
      source: 'jest',
      author: 'copilot',
    });

    const proposed = ledger.query({ distinction: 'PROPOSED' });
    expect(proposed.length).toBe(1);
    expect(proposed[0].statement).toContain('Upgrade KAI memory');

    const subjectMatches = ledger.query({ subject: 'kai:upgrade' });
    expect(subjectMatches.length).toBe(2);
  });
});
