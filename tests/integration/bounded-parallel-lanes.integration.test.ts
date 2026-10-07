import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runBoundedParallel } from '../../packages/mini/dist/index.js';

describe('bounded parallel lanes', () => {
  it('caps active lanes and preserves input order after explicit admission', async () => {
    let active = 0;
    let peak = 0;
    const results = await runBoundedParallel(
      [1, 2, 3, 4].map((id) => ({
        id: String(id),
        admit: () => 'ALLOW' as const,
        run: async () => {
          active += 1;
          peak = Math.max(peak, active);
          await new Promise((resolve) => setTimeout(resolve, id === 1 ? 10 : 1));
          active -= 1;
          return id * 2;
        },
      })),
      { maxConcurrency: 2 },
    );

    assert.equal(peak, 2);
    assert.deepEqual(results.map((result) => result.id), ['1', '2', '3', '4']);
    assert.deepEqual(results.map((result) => result.admission), ['ALLOW', 'ALLOW', 'ALLOW', 'ALLOW']);
    assert.deepEqual(results.map((result) => result.value), [2, 4, 6, 8]);
  });

  it('fails closed per lane for DENY and REVIEW without executing those lanes', async () => {
    const executed: string[] = [];
    const results = await runBoundedParallel(
      [
        { id: 'allowed', admit: () => 'ALLOW' as const, run: async () => { executed.push('allowed'); return 'ok'; } },
        { id: 'denied', admit: () => 'DENY' as const, run: async () => { executed.push('denied'); return 'bad'; } },
        { id: 'review', admit: () => 'REVIEW' as const, run: async () => { executed.push('review'); return 'unknown'; } },
      ],
      { maxConcurrency: 3 },
    );

    assert.deepEqual(executed, ['allowed']);
    assert.equal(results[0].status, 'FULFILLED');
    assert.equal(results[1].status, 'DENIED');
    assert.equal(results[2].status, 'REVIEW_REQUIRED');
  });

  it('keeps execution rejection local after admission', async () => {
    const results = await runBoundedParallel(
      [
        { id: 'good', admit: () => 'ALLOW' as const, run: async () => 'ok' },
        { id: 'bad', admit: () => 'ALLOW' as const, run: async () => { throw new Error('lane failed'); } },
        { id: 'also-good', admit: () => 'ALLOW' as const, run: async () => 'still ok' },
      ],
      { maxConcurrency: 3 },
    );

    assert.equal(results[0].status, 'FULFILLED');
    assert.equal(results[1].status, 'REJECTED');
    assert.equal(results[2].status, 'FULFILLED');
  });

  it('treats admission failures as review-required rather than executing', async () => {
    let executed = false;
    const results = await runBoundedParallel(
      [{
        id: 'uncertain',
        admit: () => { throw new Error('missing authority evidence'); },
        run: async () => { executed = true; return 'unsafe'; },
      }],
      { maxConcurrency: 1 },
    );

    assert.equal(executed, false);
    assert.equal(results[0].admission, 'REVIEW');
    assert.equal(results[0].status, 'REVIEW_REQUIRED');
    assert.match(String(results[0].error), /missing authority evidence/);
  });

  it('fails closed on an invalid concurrency bound', async () => {
    await assert.rejects(
      runBoundedParallel([], { maxConcurrency: 0 }),
      /maxConcurrency must be a positive integer/,
    );
  });
});
