import { describe, it } from 'node:test';
import assert from 'node:assert';
import { observeCandidateChange } from '../../packages/mini/dist/index.js';

describe('Ω∞v change admissibility boundary', () => {
  it('records a candidate change as REVIEW without granting authority', () => {
    const record = observeCandidateChange({
      subject: 'integration-test',
      intent: 'validate change boundary',
      stateBefore: 'known-state',
      context: { source: 'e2e' },
    });

    assert.ok(record.id.startsWith('change-'));
    assert.strictEqual(record.subject, 'integration-test');
    assert.strictEqual(record.intent, 'validate change boundary');
    assert.strictEqual(record.stateBefore, 'known-state');
    assert.ok(record.evidence.length >= 1);
    assert.strictEqual(record.authority, null);
    assert.strictEqual(record.policy, null);
    assert.strictEqual(record.decision, 'REVIEW');
    assert.strictEqual(record.authorized, false);
    assert.strictEqual(record.provenance.source, 'mini-observation');
    assert.ok(record.provenance.lineage?.length === 1);
    assert.ok(record.createdAt);
  });
});
