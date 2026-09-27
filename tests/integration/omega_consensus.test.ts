import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../apps/api/dist/index.js';

describe('Ω consensus evidence API', () => {
  const app = createApp(':memory:', false);
  before(async () => { await app.ready(); });
  after(async () => { await app.close(); });

  it('keeps a proposal at NO_QUORUM until the declared quorum is met', async () => {
    const created = await app.inject({ method: 'POST', url: '/v1/omega/consensus/proposals', payload: { proposalId: 'consensus-api-1', subject: 'bounded transition', intentDigest: 'sha256:api', term: 1, eligibleNodeIds: ['node-a', 'node-b', 'node-c'], quorum: 2, expiresAt: '2099-01-01T00:00:00.000Z' } });
    assert.equal(created.statusCode, 201);
    assert.equal(created.json().result.status, 'NO_QUORUM');
    const first = await app.inject({ method: 'POST', url: '/v1/omega/consensus/proposals/consensus-api-1/votes', payload: { nodeId: 'node-a', decision: 'AGREE', evidenceRefs: ['obs:a'] } });
    assert.equal(first.statusCode, 200);
    assert.equal(first.json().result.status, 'NO_QUORUM');
    const second = await app.inject({ method: 'POST', url: '/v1/omega/consensus/proposals/consensus-api-1/votes', payload: { nodeId: 'node-b', decision: 'AGREE', evidenceRefs: ['obs:b'] } });
    assert.equal(second.statusCode, 200);
    assert.equal(second.json().result.status, 'AGREED');
  });

  it('preserves dissent and rejects duplicate votes', async () => {
    const created = await app.inject({ method: 'POST', url: '/v1/omega/consensus/proposals', payload: { proposalId: 'consensus-api-2', subject: 'divergent transition', intentDigest: 'sha256:divergent', term: 1, eligibleNodeIds: ['node-a', 'node-b'], quorum: 2, expiresAt: '2099-01-01T00:00:00.000Z' } });
    assert.equal(created.statusCode, 201);
    const agree = await app.inject({ method: 'POST', url: '/v1/omega/consensus/proposals/consensus-api-2/votes', payload: { nodeId: 'node-a', decision: 'AGREE', evidenceRefs: ['obs:a'] } });
    assert.equal(agree.statusCode, 200);
    const dissent = await app.inject({ method: 'POST', url: '/v1/omega/consensus/proposals/consensus-api-2/votes', payload: { nodeId: 'node-b', decision: 'DISSENT', evidenceRefs: ['obs:b'], reason: 'evidence diverges' } });
    assert.equal(dissent.statusCode, 200);
    assert.equal(dissent.json().result.status, 'DIVERGENT');
    const duplicate = await app.inject({ method: 'POST', url: '/v1/omega/consensus/proposals/consensus-api-2/votes', payload: { nodeId: 'node-a', decision: 'AGREE', evidenceRefs: ['obs:a-again'] } });
    assert.equal(duplicate.statusCode, 409);
    assert.equal(duplicate.json().error, 'CONSENSUS_DUPLICATE_VOTE');
  });
});
