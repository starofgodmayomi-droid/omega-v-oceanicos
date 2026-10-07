import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runBoundedParallel } from '../../packages/mini/dist/index.js';

describe('bounded parallel lanes', () => {
  it('caps active lanes and preserves input order', async () => {
    let active = 0;
    let peak = 0;
    const results = await runBoundedParallel(
      [1, 2, 3, 4].map((id) => ({
        id: String(id),
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
    assert.deepEqual(results.map((result) => result.value), [2, 4, 6, 8]);
  });

  it('keeps rejection local and does not convert it into sibling success', async () => {
    const results = await runBoundedParallel(
      [
        { id: 'good', run: async () => 'ok' },
        { id: 'bad', run: async () => { throw new Error('lane failed'); } },
        { id: 'also-good', run: async () => 'still ok' },
      ],
      { maxConcurrency: 3 },
    );

    assert.equal(results[0].status, 'FULFILLED');
    assert.equal(results[1].status, 'REJECTED');
    assert.equal(results[2].status, 'FULFILLED');
  });

  it('fails closed on an invalid concurrency bound', async () => {
    await assert.rejects(
      runBoundedParallel([], { maxConcurrency: 0 }),
      /maxConcurrency must be a positive integer/,
    );
  });
});
