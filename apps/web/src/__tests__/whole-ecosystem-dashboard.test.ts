import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  boundedStatus,
  HUMAN_PRINCIPLES,
  NON_COLLAPSE_DISTINCTIONS,
  runtimeModeLabel,
  statusCounts,
} from '../whole-ecosystem-dashboard-model.ts';

test('unknown values never become verified dashboard status', () => {
  assert.equal(boundedStatus('healthy'), 'UNKNOWN');
  assert.equal(boundedStatus('verified'), 'VERIFIED');
  assert.equal(boundedStatus('not executed'), 'NOT_EXECUTED');
});

test('status counts preserve current evidence and historical observations', () => {
  assert.deepEqual(statusCounts([
    { evidence: { status: 'DIVERGENT' } },
    { evidence: { status: 'untrusted-label' } },
  ], 'VERIFIED'), {
    VERIFIED: 1,
    UNKNOWN: 1,
    DIVERGENT: 1,
    NOT_EXECUTED: 0,
  });
});

test('empty state is explicitly unknown rather than complete', () => {
  assert.deepEqual(statusCounts([], null), {
    VERIFIED: 0,
    UNKNOWN: 1,
    DIVERGENT: 0,
    NOT_EXECUTED: 0,
  });
});

test('dashboard preserves all ten human-centered charter principles', () => {
  assert.equal(HUMAN_PRINCIPLES.length, 10);
  assert.ok(HUMAN_PRINCIPLES.includes('Humans remain accountable'));
  assert.ok(HUMAN_PRINCIPLES.includes('Respect dignity, privacy, and consent'));
  assert.ok(HUMAN_PRINCIPLES.includes('Steward for future generations'));
});

test('dashboard distinguishes the lifecycle states instead of collapsing them', () => {
  assert.ok(NON_COLLAPSE_DISTINCTIONS.includes('CAPABILITY ≠ AUTHORITY'));
  assert.ok(NON_COLLAPSE_DISTINCTIONS.includes('EXECUTED ≠ OBSERVED'));
  assert.ok(NON_COLLAPSE_DISTINCTIONS.includes('OBSERVED ≠ VERIFIED'));
  assert.ok(NON_COLLAPSE_DISTINCTIONS.includes('DEPLOYED ≠ HEALTHY'));
});

test('dashboard does not present a mode as verified live reality', () => {
  assert.equal(runtimeModeLabel(true, false), 'BOUNDED SIMULATION');
  assert.equal(runtimeModeLabel(false, false), 'AWAITING OBSERVATION');
  assert.equal(runtimeModeLabel(false, true), 'STREAM CONNECTED · REALITY UNVERIFIED');
});
