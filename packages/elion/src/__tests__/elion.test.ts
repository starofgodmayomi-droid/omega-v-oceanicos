import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { executeAuthorized } from '../index.ts';

const authorization = {
  approvedBy: 'human@example.test',
  approvedAt: '2026-10-29T00:00:00.000Z',
  scope: 'unit-test',
};

describe('@oceanicos/elion — authorized execution', () => {
  it('refuses to call the handler without human authorization', async () => {
    let called = false;
    const result = await executeAuthorized({
      intent: 'write a file',
      handler: () => {
        called = true;
        return 'done';
      },
    });
    assert.equal(called, false);
    assert.equal(result.status, 'REFUSED');
    assert.equal(result.executed, false);
    assert.match(result.reason, /HUMAN_AUTHORITY_REQUIRED/);
  });

  it('executes and reconciles a matching declared expectation', async () => {
    const result = await executeAuthorized({
      intent: 'produce a record',
      authorization,
      expected: { state: 'created', count: 1 },
      handler: () => ({ count: 1, state: 'created' }),
    });
    assert.equal(result.status, 'EXECUTED');
    assert.equal(result.verified, true);
    assert.equal(result.verification?.status, 'VERIFIED');
  });

  it('reports divergence when observed output differs from expectation', async () => {
    const result = await executeAuthorized({
      intent: 'produce a record',
      authorization,
      expected: { state: 'created' },
      handler: () => ({ state: 'failed' }),
    });
    assert.equal(result.status, 'DIVERGENT');
    assert.equal(result.verified, false);
  });

  it('executes without an expectation but does not claim verification', async () => {
    const result = await executeAuthorized({
      intent: 'produce a record',
      authorization,
      handler: () => ({ state: 'created' }),
    });
    assert.equal(result.status, 'EXECUTED');
    assert.equal(result.verified, false);
    assert.equal(result.verification, null);
  });

  it('reports a throwing handler as FAILED', async () => {
    const result = await executeAuthorized({
      intent: 'produce a record',
      authorization,
      handler: () => {
        throw new Error('disk full');
      },
    });
    assert.equal(result.status, 'FAILED');
    assert.equal(result.executed, true);
    assert.match(result.reason, /disk full/);
  });
});
