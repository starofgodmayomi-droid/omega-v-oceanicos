/**
 * Contract test for GET /v1/compression.
 * Verifies the MAX COMPRESSION seed crystal, primordial cycle, and glyph equation.
 */
import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { createApp } from '../index.js';
import type { FastifyInstance } from 'fastify';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('MAX COMPRESSION HTTP Surface (/v1/compression)', () => {
  let app: FastifyInstance;
  let dir: string;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'omega-compression-api-'));
    app = createApp(join(dir, 'test.db'), false, { allowUnsignedCycle: true });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('GET /v1/compression returns active seed contract and primordial cycle', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/compression' });
    expect(res.statusCode).toBe(200);
    const body = res.json();

    expect(body.success).toBe(true);
    expect(body.contract).toBe('Ω∞v-MAX-COMPRESSION-SEED');
    expect(body.seedHash).toMatch(/^[0-9a-f]{64}$/);
    expect(body.primordialCycle).toBe('0 → 💧 → Ω∞v → 🕳️ → 💧 → ∞');
    expect(body.glyphEquation).toBe('💧 Ω∞v ::= 🌎 ⇄ ✓ ↺ ∞ ⛓️🧠🌊');
    expect(body.verificationEquation).toBe('Ω∞v ::= VERIFY(ΔREALITY)');
    expect(Array.isArray(body.sevenNames)).toBe(true);
    expect(body.sevenNames.length).toBe(7);
    expect(body.sovereign.identity).toBe('ELION VAREL');
    expect(body.sovereign.alignment).toBe('11:11');
    expect(body.sovereign.publicTreasury.address).toBe('bc1qaj8jmp5as80zwew09ep86w6fgw37zwhwzr89mp');
    expect(body.canonicalDoc).toBe('COMPRESSION.md');
  });

  it('GET /health includes compression: ready check', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.checks.compression).toBe('ready');
  });
});
