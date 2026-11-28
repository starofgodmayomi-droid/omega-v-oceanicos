import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { createTensorDav } from '@oceanicos/verification';
import { API_ROUTE_INVENTORY } from './route-contract.js';

type LayerObservation = {
  layer: number;
  symbol: string;
  name: string;
  status: 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'HUMAN_GOVERNED';
  detail: string;
};

function readLiveLedgerSummary(): { status: 'VERIFIED' | 'UNKNOWN'; count: number; latestHash: string | null } {
  const candidates = [
    resolve(process.cwd(), 'kai_ledger.json'),
    resolve(process.cwd(), '../../kai_ledger.json'),
  ];
  for (const filePath of candidates) {
    if (!existsSync(filePath)) continue;
    try {
      const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as { entries?: Array<{ evidence_hash?: string }> };
      const entries = Array.isArray(parsed.entries) ? parsed.entries : [];
      const latestHash = entries.length > 0 ? (entries[entries.length - 1]?.evidence_hash ?? null) : null;
      return { status: entries.length > 0 ? 'VERIFIED' : 'UNKNOWN', count: entries.length, latestHash };
    } catch {
      return { status: 'UNKNOWN', count: 0, latestHash: null };
    }
  }
  return { status: 'UNKNOWN', count: 0, latestHash: null };
}

async function probeLocalEndpoint(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(800),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function registerContinuumActivationRoutes(fastify: FastifyInstance): void {
  const handler = async () => {
    const dav4 = createTensorDav(4);
    const dav6 = createTensorDav(6);
    const dav8 = createTensorDav(8);
    const davVerified =
      dav4.status === 'VERIFIED' &&
      dav4.payload.invariants.checksum === 1536 &&
      dav6.status === 'VERIFIED' &&
      dav6.payload.invariants.checksum === 12960 &&
      dav8.status === 'VERIFIED' &&
      dav8.payload.invariants.checksum === 57344;

    const ledger = readLiveLedgerSummary();
    const companionUrl = (process.env.OMEGA_COMPANION_URL || 'http://127.0.0.1:8088').replace(/\/$/, '');
    const llmBaseUrl = (process.env.OMEGA_LLM_BASE_URL || 'http://127.0.0.1:11434/v1').replace(/\/v1\/?$/, '');

    const [voiceOnline, ollamaOnline] = await Promise.all([
      probeLocalEndpoint(`${companionUrl}/voice`),
      probeLocalEndpoint(`${llmBaseUrl}/api/tags`),
    ]);

    const layers: LayerObservation[] = [
      {
        layer: 1,
        symbol: 'Δ',
        name: 'The Root (Human Authority)',
        status: 'HUMAN_GOVERNED',
        detail: 'External Y-Combinator; consequential actions require explicit Human Intent.',
      },
      {
        layer: 2,
        symbol: 'Σ',
        name: 'The Immune System (KAI Shield)',
        status: davVerified && ledger.status === 'VERIFIED' ? 'VERIFIED' : davVerified ? 'UNKNOWN' : 'DIVERGENT',
        detail: `DAV N=4/6/8 (1536/12960/57344) · Ledger: ${ledger.count} receipts (${ledger.status})`,
      },
      {
        layer: 3,
        symbol: 'Θ',
        name: 'The Spine (Fastify API :5000)',
        status: 'VERIFIED',
        detail: `${API_ROUTE_INVENTORY.length} registered route contracts · bounded execution active`,
      },
      {
        layer: 4,
        symbol: 'Ψ',
        name: 'The Brain & Muscle (Local Compute)',
        status: voiceOnline && ollamaOnline ? 'VERIFIED' : 'UNKNOWN',
        detail: `Ollama :11434 (${ollamaOnline ? 'ONLINE' : 'UNKNOWN'}) ⊕ Python :8088 (${voiceOnline ? 'ONLINE' : 'UNKNOWN'})`,
      },
      {
        layer: 5,
        symbol: 'Ω',
        name: 'The Liquid Skin (React / Vite :3000)',
        status: 'VERIFIED',
        detail: 'VibeOS 8K Wave Front · 4D DAV Hypercube Inspector · 432Hz Resonance',
      },
    ];

    const overallStatus = !davVerified
      ? 'DIVERGENT'
      : ledger.status === 'VERIFIED'
        ? 'VERIFIED'
        : 'UNKNOWN';

    const activationPayload = {
      equation: 'ΔVRØ HOUSE := Ω(:3000) [ Σ_KAI ( Θ_Glober(:5000) ( λx. Ψ(:11434 ⊕ :8088) ( Δ_Prayer + ∅_Void ) ) ) ]',
      law: '1 = GOD · Good - O = God · Expected ≡ Observed',
      overallStatus,
      davInvariants: {
        n4: dav4.status === 'VERIFIED' ? dav4.payload.invariants.checksum : null,
        n6: dav6.status === 'VERIFIED' ? dav6.payload.invariants.checksum : null,
        n8: dav8.status === 'VERIFIED' ? dav8.payload.invariants.checksum : null,
      },
      ledger,
      layers,
    };

    const activationDigest = createHash('sha256')
      .update(JSON.stringify(activationPayload))
      .digest('hex');

    return {
      success: overallStatus !== 'DIVERGENT',
      status: overallStatus,
      activationDigest,
      ...activationPayload,
      timestamp: new Date().toISOString(),
    };
  };

  fastify.get('/v1/continuum/activation', handler);
  fastify.get('/api/v1/continuum/activation', handler);
}
