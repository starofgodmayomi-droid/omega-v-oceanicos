/**
 * Ω∞v E2E INTEGRATION: LIVE INTELLIGENCE LAYER
 * ──────────────────────────────────────────────
 * Tests T21-T25: Validates the inference, vector memory,
 * and enriched cycle integration paths.
 *
 * All tests run in OFFLINE/STUB mode — no Docker services required.
 * Zero-friction: identical behavior whether Ollama/Qdrant are running or not.
 */

import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { InferenceClient, type InferenceResult, type InferenceStatus } from '@oceanicos/inference';
import { VectorMemory, type SimilarBlock, type VectorMemoryStatus } from '@oceanicos/vector';
import { ObserverEngine } from '@oceanicos/observer';
import { createApp } from '../../apps/api/src/index.js';

// Ensure signing key is present for verification engine throughout tests
beforeAll(() => {
  process.env.OMEGA_SIGNING_KEY = process.env.OMEGA_SIGNING_KEY || 'omega-v-test-secret-key-e2e-2026';
});

// ─── T21: InferenceClient — Deterministic Stub When Ollama Is Offline ─────

describe('T21: @oceanicos/inference — InferenceClient stub mode', () => {
  let client: InferenceClient;

  beforeAll(() => {
    // Point at a host that won't respond — forces stub fallback
    client = new InferenceClient({
      host: 'http://127.0.0.1:19999',
      model: 'phi3:mini',
      fallbackToStub: true,
      timeoutMs: 1000,
    });
  });

  it('should report unavailable when Ollama is not running', async () => {
    const available = await client.isAvailable();
    expect(available).toBe(false);
  });

  it('should return a deterministic stub result when analyzing an observation', async () => {
    const observation = ObserverEngine.generateTelemetry();
    const result: InferenceResult = await client.analyzeObservation(observation);

    expect(result).toBeDefined();
    expect(result.source).toBe('STUB');
    expect(result.observationId).toBe(observation.uuid);
    expect(result.model).toBe('phi3:mini');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(result.riskLevel);
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.proof).toMatch(/^0xΩ[0-9a-f]{64}$/);
    expect(result.assessment).toContain('Telemetry analysis complete');
  });

  it('should return status with host and model info', async () => {
    const status: InferenceStatus = await client.getStatus();

    expect(status.available).toBe(false);
    expect(status.host).toBe('http://127.0.0.1:19999');
    expect(status.model).toBe('phi3:mini');
    expect(status.loadedModels).toEqual([]);
    expect(status.lastChecked).toBeTruthy();
  });

  it('should cache health check results for performance', async () => {
    // First call populates cache
    const first = await client.isAvailable();
    // Second call should use cache (no network call)
    const second = await client.isAvailable();
    expect(first).toBe(second);
  });

  it('should throw when fallbackToStub is false and Ollama is offline', async () => {
    const strictClient = new InferenceClient({
      host: 'http://127.0.0.1:19999',
      fallbackToStub: false,
      timeoutMs: 1000,
    });
    const observation = ObserverEngine.generateTelemetry();

    await expect(strictClient.analyzeObservation(observation)).rejects.toThrow('Inference engine unavailable');
  });
});

// ─── T22: VectorMemory — Empty Results When Qdrant Is Offline ─────────────

describe('T22: @oceanicos/vector — VectorMemory stub mode', () => {
  let vectorMemory: VectorMemory;

  beforeAll(() => {
    // Point at a host that won't respond — forces empty fallback
    vectorMemory = new VectorMemory({
      url: 'http://127.0.0.1:19998',
      collectionName: 'test_blocks',
      fallbackToEmpty: true,
      timeoutMs: 1000,
    });
  });

  it('should report unavailable when Qdrant is not running', async () => {
    const available = await vectorMemory.isAvailable();
    expect(available).toBe(false);
  });

  it('should return empty array when recalling from offline Qdrant', async () => {
    const embedding = VectorMemory.generateSimpleEmbedding('test query');
    const results: SimilarBlock[] = await vectorMemory.recall(embedding, 5);

    expect(results).toEqual([]);
  });

  it('should return false when storing to offline Qdrant', async () => {
    const embedding = VectorMemory.generateSimpleEmbedding('test block');
    const stored = await vectorMemory.store('abc123hash', embedding, { test: true });

    expect(stored).toBe(false);
  });

  it('should return status with url and collection info', async () => {
    const status: VectorMemoryStatus = await vectorMemory.getStatus();

    expect(status.available).toBe(false);
    expect(status.url).toBe('http://127.0.0.1:19998');
    expect(status.collectionName).toBe('test_blocks');
    expect(status.vectorCount).toBe(0);
    expect(status.lastChecked).toBeTruthy();
  });

  it('should generate deterministic simple embeddings', () => {
    const emb1 = VectorMemory.generateSimpleEmbedding('hello world');
    const emb2 = VectorMemory.generateSimpleEmbedding('hello world');
    const emb3 = VectorMemory.generateSimpleEmbedding('different text');

    expect(emb1).toEqual(emb2); // Deterministic
    expect(emb1).not.toEqual(emb3); // Different inputs → different embeddings
    expect(emb1.length).toBe(384); // Default dimension
  });

  it('should generate L2-normalized embeddings', () => {
    const embedding = VectorMemory.generateSimpleEmbedding('normalize test');
    const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    expect(norm).toBeCloseTo(1.0, 3);
  });
});

// ─── T23: Fastify API — GET /v1/inference/status ──────────────────────────

describe('T23: Fastify API — GET /v1/inference/status', () => {
  let app: any;

  beforeAll(async () => {
    app = createApp(':memory:', false);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return inference status with availability info', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/inference/status',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.inference).toBeDefined();
    expect(typeof body.inference.available).toBe('boolean');
    expect(body.inference.host).toBeTruthy();
    expect(body.inference.model).toBeTruthy();
    expect(body.inference.lastChecked).toBeTruthy();
  });
});

// ─── T24: Fastify API — GET /v1/memory/status ────────────────────────────

describe('T24: Fastify API — GET /v1/memory/status', () => {
  let app: any;

  beforeAll(async () => {
    app = createApp(':memory:', false);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return memory status with availability info', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/memory/status',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.memory).toBeDefined();
    expect(typeof body.memory.available).toBe('boolean');
    expect(body.memory.url).toBeTruthy();
    expect(body.memory.collectionName).toBeTruthy();
    expect(body.memory.lastChecked).toBeTruthy();
  });
});

// ─── T25: Enriched MINI Cycle — aiInsight Field (Stub Mode) ──────────────

describe('T25: Enriched MINI cycle includes aiInsight field', () => {
  let app: any;

  beforeAll(async () => {
    app = createApp(':memory:', false);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return a cycle result with an aiInsight stub when Ollama is offline', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/cycle',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.block).toBeDefined();
    expect(body.block.hash).toBeTruthy();
    expect(body.block.observation).toBeDefined();
    expect(body.block.evidence).toBeDefined();

    // AI insight should be present (from stub fallback)
    expect(body.aiInsight).toBeDefined();
    expect(body.aiInsight.source).toBe('STUB');
    expect(body.aiInsight.observationId).toBe(body.block.observation.uuid);
    expect(body.aiInsight.proof).toMatch(/^0xΩ/);
    expect(body.aiInsight.assessment).toContain('Telemetry analysis complete');
  });

  it('should include confidence and risk level in AI insight', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/cycle',
    });

    const body = JSON.parse(response.payload);
    expect(body.aiInsight.confidence).toBeGreaterThan(0);
    expect(body.aiInsight.confidence).toBeLessThanOrEqual(1);
    expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(body.aiInsight.riskLevel);
    expect(body.aiInsight.recommendations.length).toBeGreaterThan(0);
  });
});
