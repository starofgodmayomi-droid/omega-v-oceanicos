import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const WEB_BASE = process.env.WEB_URL || 'http://localhost:3000';
const API_BASE = process.env.API_URL || 'http://localhost:5000';

describe('🌐 Full-Stack Web & App E2E Live Integration Suite', () => {
  it('GET / serves the Ω∞v Oceanicos web application HTML shell', async () => {
    const res = await fetch(`${WEB_BASE}/`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.match(html, /<!doctype html>/i);
    assert.match(html, /<div id="root"><\/div>/);
    assert.match(html, /<link rel="manifest" href="\/manifest\.json"/);
    assert.match(html, /src="\/src\/main\.tsx/);
  });

  it('GET /manifest.json serves the standalone PWA manifest', async () => {
    const res = await fetch(`${WEB_BASE}/manifest.json`);
    assert.equal(res.status, 200);
    const manifest = await res.json();
    assert.match(manifest.name, /Oceanicos/i);
    assert.equal(manifest.display, 'standalone');
    assert.equal(manifest.start_url, '/');
    assert.equal(manifest.theme_color, '#69e7b9');
    assert.ok(Array.isArray(manifest.icons));
    assert.ok(manifest.icons.length >= 2);
  });

  it('GET /sw.js serves the Service Worker script', async () => {
    const res = await fetch(`${WEB_BASE}/sw.js`);
    assert.equal(res.status, 200);
    const script = await res.text();
    assert.match(script, /addEventListener\('install'/);
    assert.match(script, /addEventListener\('activate'/);
    assert.match(script, /addEventListener\('fetch'/);
    assert.match(script, /oceanicos-v1/);
  });

  it('GET /icons/icon-192.png and icon-512.png serve binary PNG assets', async () => {
    const res192 = await fetch(`${WEB_BASE}/icons/icon-192.png`);
    assert.equal(res192.status, 200);
    const buf192 = await res192.arrayBuffer();
    assert.ok(buf192.byteLength > 1000, 'Icon 192 must be a valid binary file');

    const res512 = await fetch(`${WEB_BASE}/icons/icon-512.png`);
    assert.equal(res512.status, 200);
    const buf512 = await res512.arrayBuffer();
    assert.ok(buf512.byteLength > 1000, 'Icon 512 must be a valid binary file');
  });

  it('Web app connects to live API health endpoint on :5000', async () => {
    const res = await fetch(`${API_BASE}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.readiness, 'ready');
    assert.equal(body.checks.observer, 'ready');
    assert.equal(body.checks.verifier, 'ready');
  });

  it('Web chat transmits and receives live PoW mined block with 432 Hz resonance metadata', async () => {
    const res = await fetch(`${API_BASE}/v1/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '⛏️ Mine Block: Run a PoW consensus cycle' }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.reply.metadata.organ, 'CANONICAL_KERNEL_MINER');
    assert.equal(data.reply.metadata.resonanceHz, 432);
    assert.ok(data.reply.metadata.evidenceHash);
    assert.match(data.reply.content, /Consensus Block #/);
  });

  it('Web chat transmits and receives live Max Equation singularity optimization', async () => {
    const res = await fetch(`${API_BASE}/v1/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '🌀 Max Equation: Evaluate delta* candidate slice' }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.reply.metadata.organ, 'MAX_EQUATION_SINGULARITY');
    assert.ok(data.reply.metadata.evidenceHash);
    assert.match(data.reply.content, /Max Equation Singularity Optimization Complete/);
  });

  it('Web chat transmits and receives live 4x4 Whole-Ecosystem Total Compression', async () => {
    const res = await fetch('http://localhost:5000/v1/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '🌊 Compress: execute whole-ecosystem 4x4 matrix compression' }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.reply.metadata.organ, 'WHOLE_ECOSYSTEM_COMPRESSOR');
    assert.ok(data.reply.metadata.evidenceHash);
    assert.match(data.reply.content, /Whole-Ecosystem 4×4 Total Compression Evaluated/);
    assert.match(data.reply.content, /Fourth-Root Gram Determinant/);
    assert.match(data.reply.content, /Fixpoint Status/);
  });

  it('Web chat verifies sovereign Bitcoin treasury invariant (bc1qaj8jmp5as80zwew09ep86w6fgw37zwhwzr89mp)', async () => {
    const res = await fetch('http://localhost:5000/v1/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '🛡️ Verify Treasury: check sovereign Bitcoin receiving address' }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.reply.metadata.organ, 'SOVEREIGN_TREASURY_ORATOR');
    assert.equal(data.reply.metadata.actionTriggered, 'VERIFY_1111_TREASURY');
    assert.match(data.reply.content, /bc1qaj8jmp5as80zwew09ep86w6fgw37zwhwzr89mp/);
    assert.match(data.reply.content, /FAIL-CLOSED/);
  });

  it('Web chat audits canonical Merkle ledger tip and KAI provenance chain', async () => {
    const res = await fetch('http://localhost:5000/v1/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '📜 Merkle Audit: inspect canonical spine ledger and provenance' }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.reply.metadata.organ, 'KAI_PROVENANCE_LEDGER');
    assert.equal(data.reply.metadata.actionTriggered, 'AUDIT_CANONICAL_LEDGER');
    assert.match(data.reply.content, /Canonical Tip/i);
    assert.match(data.reply.content, /KAI Provenance Records/i);
  });

  it('Web chat queries African Pantheon Duplex resonance', async () => {
    const res = await fetch('http://localhost:5000/v1/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '🏛️ Pantheon Duplex: How is the African Pantheon duplex resonating?' }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.reply.metadata.organ, 'ƆREADE_PLURALISM_DUPLEX');
    assert.equal(data.reply.metadata.actionTriggered, 'CONVERGE_DUPLEX');
    assert.match(data.reply.content, /African Pantheon Duplex/i);
    assert.match(data.reply.content, /Upper Duplex/i);
  });

  it('Web chat journals night ocean dream vision into KAI ledger', async () => {
    const res = await fetch('http://localhost:5000/v1/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '🌌 Dream Journal: a celestial star descended into the deep ocean and emerged as conscious light.' }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.reply.metadata.organ, 'KAI_DREAM_ORACLE');
    assert.equal(data.reply.metadata.actionTriggered, 'RECORD_NIGHT_OCEAN_DREAM');
    assert.match(data.reply.content, /Night Ocean Dream Signal Received/i);
    assert.match(data.reply.content, /starofgodmayomi/i);
  });
});



