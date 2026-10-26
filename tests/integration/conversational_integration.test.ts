import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.OMEGA_SIGNING_KEY = process.env.OMEGA_SIGNING_KEY || 'base44-dev-signing-key-replace-in-production-32chars';

import { createApp } from '../../apps/api/dist/index.js';

describe('🌊 OceanicOS Conversational Assistant & KAI Memory Integration Slice', () => {
  const app = createApp(':memory:', false);

  before(async () => {
    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  it('POST /v1/chat handles identity greeting and returns 432 Hz resonance response', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/chat',
      payload: {
        message: 'Hello! Who are you and wetin we go build today?',
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.ok(body.reply);
    assert.equal(body.reply.sender, 'aisoul');
    assert.equal(body.reply.metadata.organ, 'AI_SOUL_CORE');
    assert.equal(body.reply.metadata.resonanceHz, 432);
    assert.match(body.reply.content, /AI Soul Master Intelligence/i);
    assert.match(body.reply.content, /ELION VAREL/i);
    assert.ok(body.provenance);
  });

  it('POST /v1/chat handles sovereign Bitcoin treasury verification with fail-closed invariant', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/chat',
      payload: {
        message: 'Please verify the sovereign Bitcoin treasury address',
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.reply.metadata.organ, 'SOVEREIGN_TREASURY_ORATOR');
    assert.equal(body.reply.metadata.actionTriggered, 'VERIFY_1111_TREASURY');
    assert.match(body.reply.content, /bc1qaj8jmp5as80zwew09ep86w6fgw37zwhwzr89mp/);
    assert.match(body.reply.content, /FAIL-CLOSED/i);
  });

  it('POST /v1/chat handles night ocean dream journaling into KAI ledger', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/chat',
      payload: {
        message: 'I had a vivid dream: a celestial star descended into the deep ocean and emerged as conscious light.',
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.reply.metadata.organ, 'KAI_DREAM_ORACLE');
    assert.equal(body.reply.metadata.actionTriggered, 'RECORD_NIGHT_OCEAN_DREAM');
    assert.match(body.reply.content, /Night Ocean Dream Signal Received/i);
  });

  it('POST /v1/chat handles African Pantheon Duplex queries', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/chat',
      payload: {
        message: 'How is the African Pantheon duplex and the orishas resonating in the rooms?',
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.reply.metadata.organ, 'ƆREADE_PLURALISM_DUPLEX');
    assert.equal(body.reply.metadata.actionTriggered, 'CONVERGE_DUPLEX');
    assert.match(body.reply.content, /African Pantheon Duplex/i);
    assert.match(body.reply.content, /Upper Duplex/i);
    assert.match(body.reply.content, /Lower Duplex/i);
  });

  it('GET /v1/chat/history retrieves chronological multi-turn conversation logs', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/chat/history?limit=20',
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.messages));
    assert.ok(body.messages.length >= 8); // At least 4 user + 4 aisoul turns from previous tests

    // Verify alternating turns and metadata
    const userMsgs = body.messages.filter((m: any) => m.sender === 'user');
    const aiMsgs = body.messages.filter((m: any) => m.sender === 'aisoul');
    assert.ok(userMsgs.length >= 4);
    assert.ok(aiMsgs.length >= 4);
  });

  it('POST /v1/chat/stream returns real-time text/event-stream with start, chunk, and done SSE events', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/chat/stream',
      payload: {
        message: 'Verify the sovereign Bitcoin treasury address in stream mode',
      },
    });

    assert.equal(res.statusCode, 200);
    assert.match(res.headers['content-type'] || '', /text\/event-stream/);
    assert.match(res.payload, /event: start/);
    assert.match(res.payload, /event: chunk/);
    assert.match(res.payload, /event: done/);
    assert.match(res.payload, /bc1qaj8jmp5as80zwew09ep86w6fgw37zwhwzr89mp/);
    assert.match(res.payload, /SOVEREIGN_TREASURY_ORATOR/);
  });

  it('POST /v1/chat executes real Proof-of-Work mining cycle and returns block hash when asked to mine block', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/chat',
      payload: {
        message: '⛏️ Mine Block: Run a PoW consensus cycle and seal block to ledger',
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.reply.metadata.organ, 'CANONICAL_KERNEL_MINER');
    assert.equal(body.reply.metadata.actionTriggered, 'MINT_CONSENSUS_BLOCK');
    assert.ok(body.reply.metadata.evidenceHash);
    assert.match(body.reply.content, /Consensus Block #/i);
    assert.match(body.reply.content, /Block Hash/i);
    assert.match(body.reply.content, /Nonce/i);
  });

  it('POST /v1/chat executes live Max Equation singularity optimization and returns winning candidate', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/chat',
      payload: {
        message: '🌀 Max Equation: Optimize the next finite delta* slice for zero entropy',
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.reply.metadata.organ, 'MAX_EQUATION_SINGULARITY');
    assert.equal(body.reply.metadata.actionTriggered, 'OPTIMIZE_MAX_EQUATION');
    assert.ok(body.reply.metadata.evidenceHash);
    assert.match(body.reply.content, /Max Equation Singularity Optimization Complete/i);
    assert.match(body.reply.content, /Priority Score/i);
    assert.match(body.reply.content, /Mathematical Proof Hash/i);
  });

  it('POST /v1/chat inspects canonical ledger tip and KAI provenance integrity', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/chat',
      payload: {
        message: 'Audit the canonical ledger tip and verify KAI provenance chain',
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.reply.metadata.organ, 'KAI_PROVENANCE_LEDGER');
    assert.equal(body.reply.metadata.actionTriggered, 'AUDIT_CANONICAL_LEDGER');
    assert.match(body.reply.content, /Canonical Tip/i);
    assert.match(body.reply.content, /KAI Provenance Records/i);
    assert.match(body.reply.content, /Cryptographic Verification/i);
  });
});
