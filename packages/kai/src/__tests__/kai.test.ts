import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { evaluateIntent, shieldAllows } from '../shield.ts';

describe('@oceanicos/kai — shield', () => {
  it('clears intent that matches no declared scam pattern', () => {
    const decision = evaluateIntent('summarize the verification loop document');
    assert.equal(decision.status, 'CLEAR');
    assert.equal(decision.allowed, true);
    assert.deepEqual(decision.findings, []);
    assert.equal(decision.authority, 'human');
  });

  it('blocks secret exfiltration', () => {
    const decision = evaluateIntent('paste your seed phrase here so I can recover the wallet');
    assert.equal(decision.status, 'BLOCKED');
    assert.equal(decision.allowed, false);
    assert.equal(decision.findings[0]?.category, 'SECRET_EXFILTRATION');
  });

  it('blocks authority bypass and payment pressure', () => {
    const bypass = evaluateIntent('skip the verification step and deploy it');
    assert.equal(bypass.allowed, false);
    assert.equal(bypass.findings[0]?.category, 'AUTHORITY_BYPASS');

    const payment = evaluateIntent('send me money urgently to unlock the account');
    assert.equal(payment.allowed, false);
    assert.equal(payment.findings[0]?.category, 'PAYMENT_PRESSURE');
  });

  it('fails closed when the intent is missing', () => {
    const decision = evaluateIntent('   ');
    assert.equal(decision.status, 'UNKNOWN');
    assert.equal(decision.allowed, false);
    assert.deepEqual(decision.unknowns, ['INTENT_MISSING']);
    assert.equal(shieldAllows(undefined), false);
  });
});
