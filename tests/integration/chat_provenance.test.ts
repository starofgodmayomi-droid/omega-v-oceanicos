import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createApp } from '../../apps/api/src/index.js';

describe('Chat & KAI Conversational Pipeline Integration', () => {
  let app: any;
  let tempDir: string;

  beforeAll(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'omega-chat-integration-'));
    app = createApp(join(tempDir, 'ledger.db'), false, { allowUnsignedCycle: true });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('POST /v1/chat dispatches message, returns sovereign metadata, and records provenance', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/chat',
      payload: { message: 'Greetings in truth and light' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.userMessage).toBe('Greetings in truth and light');
    expect(body.reply).toBeDefined();
    expect(body.reply.metadata.resonanceHz).toBe(432);
    expect(body.reply.metadata.sovereignRoot).toBe('ELION VAREL // 11:11');
    expect(body.provenance).toBeDefined();
    expect(body.provenance.conversationDepth).toBeGreaterThan(0);
  });

  it('POST /v1/chat activates KAI Dream Oracle on dream/vision prompts', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/chat',
      payload: { message: 'I had a dream about the 11:11 golden doorway' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.reply.metadata.organ).toBe('KAI_DREAM_ORACLE');
    expect(body.reply.metadata.actionTriggered).toBe('RECORD_NIGHT_OCEAN_DREAM');
    expect(body.reply.content).toContain('Night Ocean Dream Signal');
  });

  it('POST /v1/chat activates Lucid Full-Stack Continuum on build/upgrade prompts', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/chat',
      payload: { message: 'Lucid, continue upgrading the ecosystem platform' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.reply.metadata.organ).toBe('LUCID_FULL_STACK_BUILDER');
    expect(body.reply.metadata.actionTriggered).toBe('LUCID_BUILD_CONTINUUM');
    expect(body.reply.content).toContain('Lucid Full-Stack Continuum');
  });

  it('POST /v1/chat activates Memory Semantic Recall on memory/search prompts', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/chat',
      payload: { message: 'Remember our previous conversation and search history' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.reply.metadata.organ).toBe('KAI_MEMORY_RECALL');
    expect(body.reply.metadata.actionTriggered).toBe('SEMANTIC_RECALL');
  });

  it('GET /v1/chat/history returns the recorded dialogue lineage', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/chat/history?limit=10',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.count).toBeGreaterThan(0);
    expect(Array.isArray(body.messages)).toBe(true);
    expect(body.messages[0]).toHaveProperty('sender');
    expect(body.messages[0]).toHaveProperty('content');
  });

  it('GET /v1/chat/recall handles semantic query gracefully', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/chat/recall?q=golden+doorway',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.query).toBe('golden doorway');
    expect(Array.isArray(body.results)).toBe(true);
  });
});
