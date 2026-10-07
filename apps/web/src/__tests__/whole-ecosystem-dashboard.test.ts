import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boundedStatus, statusCounts, summarizeLucidField } from '../whole-ecosystem-dashboard-model.ts';

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

test('Lucid field summary is limited to supplied signals and preserves non-verified states', () => {
  const summary = summarizeLucidField([
    { label: 'Runtime stream', status: 'verified', source: 'SSE connection observed' },
    { label: 'CI', status: 'not queried', source: 'hosted CI is not queried by this screen' },
    { label: 'Ledger', status: 'DIVERGENT', source: 'local ledger check' },
  ]);

  assert.equal(summary.total, 3);
  assert.equal(summary.verifiedCount, 1);
  assert.match(summary.summaryText, /1 of 3 listed signals are marked VERIFIED in this view/);
  assert.deepEqual(summary.unresolved.map(({ label, status }) => ({ label, status })), [
    { label: 'CI', status: 'UNKNOWN' },
    { label: 'Ledger', status: 'DIVERGENT' },
  ]);
});

test('Lucid field summary labels an empty view instead of implying completeness', () => {
  const summary = summarizeLucidField([]);
  assert.equal(summary.total, 0);
  assert.equal(summary.verifiedCount, 0);
  assert.deepEqual(summary.unresolved, []);
  assert.equal(summary.summaryText, 'No signals are available in this view.');
});
