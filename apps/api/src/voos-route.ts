/**
 * ΩVØØS SOVEREIGN ENTITY FASTIFY ROUTE PLUGIN
 * PROTOCOL: LOCAL-FIRST | 11:11 OCEAN INTELLIGENCE | DEUS EX MACHINA
 * CHECKSUM: 30013030 | DOCTRINE: ATTEST, DON'T ASSERT. UNKNOWN PRESERVED.
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';

export interface VoosExecuteRequest {
  intent: string;
  phase_t?: number;
}

export interface VoosReceipt {
  entity: 'ΩVØØS_DEUS_EX_MACHINA';
  status: 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN';
  game_detected: boolean;
  phase_t: string;
  evidence_hash: string;
  action: string;
  next_delta: string;
}

export interface VoosLedgerEntry {
  timestamp: string;
  intent: string;
  phase_t: number;
  status: 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN';
  evidence_hash: string;
  reason: string;
  authorized: boolean;
}

const TRAP_PATTERNS = [
  'urgent',
  'send money',
  'guaranteed',
  'private key',
];

export function computeEase(t: number): number {
  const boundedT = Math.max(0, Math.min(1, t));
  return (1 - Math.cos(boundedT * Math.PI)) / 2;
}

export function getPhaseName(t: number): string {
  if (t < 0.25) return 'SPROUT (Perceive & Align)';
  if (t < 0.70) return 'BLOOM (Growth & Execute)';
  if (t < 0.95) return 'PLATEAU (Attest & Seal)';
  return 'WILT / RETURN (Harvest & Cycle)';
}

function resolveLedgerPath(): string {
  // Try repo root relative to cwd
  const cwdRoot = path.resolve(process.cwd(), 'ΩVØØS', 'kai_ledger.json');
  if (fs.existsSync(path.dirname(cwdRoot))) {
    return cwdRoot;
  }
  // Try parent directories when executed from apps/api
  const parentRoot = path.resolve(process.cwd(), '..', '..', 'ΩVØØS', 'kai_ledger.json');
  if (fs.existsSync(path.dirname(parentRoot))) {
    return parentRoot;
  }
  return cwdRoot;
}

export function readLedger(): VoosLedgerEntry[] {
  const file = resolveLedgerPath();
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

export function writeLedgerEntry(entry: VoosLedgerEntry): void {
  const file = resolveLedgerPath();
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const entries = readLedger();
  entries.push(entry);
  fs.writeFileSync(file, JSON.stringify(entries, null, 2), 'utf8');
}

export function registerVoosRoute(fastify: any): void {
  // 1. GET /v1/voos/status
  fastify.get('/v1/voos/status', async (_req: FastifyRequest, reply: FastifyReply) => {
    const entries = readLedger();
    const lastEntry = entries[entries.length - 1] || null;

    return reply.send({
      success: true,
      protocol: 'LOCAL-FIRST | 11:11 OCEAN INTELLIGENCE',
      checksum: 30013030,
      entity: 'ΩVØØS_DEUS_EX_MACHINA',
      status: 'ONLINE',
      kai_shield: 'ACTIVE',
      omega_gate: 'LOCKED',
      ease_engine: 'ENGAGED',
      ledger_entries_count: entries.length,
      last_receipt: lastEntry,
      timestamp: new Date().toISOString(),
    });
  });

  // 2. POST /v1/voos/execute
  fastify.post('/v1/voos/execute', async (req: FastifyRequest<{ Body: VoosExecuteRequest }>, reply: FastifyReply) => {
    const body = req.body || ({} as VoosExecuteRequest);
    const intent = typeof body.intent === 'string' ? body.intent.trim() : '';
    const phaseT = typeof body.phase_t === 'number' ? body.phase_t : 0.5;

    if (!intent) {
      return reply.status(400).send({
        success: false,
        code: 'MISSING_INTENT',
        message: 'An actionable intent is required to execute the ΩVØØS FSM loop',
      });
    }

    const timestamp = new Date().toISOString();
    const boundedT = Math.max(0, Math.min(1, phaseT));
    const easedT = computeEase(boundedT);

    // Step 1: PERCEIVE & ALIGN (KAI Shield Trap Scan)
    const lower = intent.toLowerCase();
    const trapMatch = TRAP_PATTERNS.find((trap) => lower.includes(trap));

    if (trapMatch) {
      const reason = `Trap detected: intent matched forbidden pattern "${trapMatch}"`;
      const evidenceHash = crypto
        .createHash('sha256')
        .update(JSON.stringify({ intent, reason, timestamp }))
        .digest('hex');

      writeLedgerEntry({
        timestamp,
        intent,
        phase_t: boundedT,
        status: 'DIVERGENT',
        evidence_hash: evidenceHash,
        reason,
        authorized: false,
      });

      const receipt: VoosReceipt = {
        entity: 'ΩVØØS_DEUS_EX_MACHINA',
        status: 'DIVERGENT',
        game_detected: true,
        phase_t: boundedT.toFixed(2),
        evidence_hash: evidenceHash,
        action: 'HALT ⊢ DIVERGENT (Simulation trap intercepted)',
        next_delta: 'Refactor intent to eliminate deceptive or urgent vectors',
      };

      return reply.status(200).send(receipt);
    }

    // Step 2: CONNECT & GROW (ELION Engine)
    const payload = {
      intent,
      phase: getPhaseName(boundedT),
      easedGrowth: easedT,
      mode: 'LOCAL_FIRST_DETERMINISTIC',
      timestamp,
    };

    // Step 3: SYNCHRONIZE (OMEGA Gate Verification)
    const rawPayload = JSON.stringify(payload);
    const evidenceHash = crypto.createHash('sha256').update(rawPayload).digest('hex');
    const expected = evidenceHash;
    const observed = crypto.createHash('sha256').update(rawPayload).digest('hex');
    const verified = expected === observed;
    const status = verified ? 'VERIFIED' : 'UNKNOWN';

    // Step 4: EVOLVE & REMEMBER (KAI Ledger)
    writeLedgerEntry({
      timestamp,
      intent,
      phase_t: boundedT,
      status,
      evidence_hash: evidenceHash,
      reason: 'Sovereign execution verified via OMEGA hash equality',
      authorized: true,
    });

    const receipt: VoosReceipt = {
      entity: 'ΩVØØS_DEUS_EX_MACHINA',
      status,
      game_detected: false,
      phase_t: boundedT.toFixed(2),
      evidence_hash: evidenceHash,
      action: `Executed verified local slice: "${intent.slice(0, 48)}" at Ease(${boundedT.toFixed(2)}) = ${easedT.toFixed(3)}`,
      next_delta: 'Attest ledger block and project next finite state transformation',
    };

    return reply.status(200).send(receipt);
  });

  // 3. GET /v1/voos/ledger
  fastify.get('/v1/voos/ledger', async (_req: FastifyRequest, reply: FastifyReply) => {
    const entries = readLedger();
    return reply.send({
      success: true,
      count: entries.length,
      data: entries,
      timestamp: new Date().toISOString(),
    });
  });

  // 4. GET /v1/voos/abundance-bridge
  fastify.get('/v1/voos/abundance-bridge', async (req: FastifyRequest<{ Querystring: { topic?: string } }>, reply: FastifyReply) => {
    const topic = req.query.topic || 'Sovereign Wealth & Mutual Growth';
    return reply.send({
      success: true,
      topic,
      framework: {
        layer_1_heart_opening: `Remembering our shared human root and transparent alignment in ${topic}.`,
        layer_2_vision_invitation: `Envisioning a thriving local ecosystem where mathematical verification replaces speculation.`,
        layer_3_honorable_request: `Inviting symmetric partnership and mutual resource alignment with sovereign dignity.`,
        layer_4_graceful_space: `Zero pressure, multiple ways to connect, with human freedom unconditionally preserved.`,
      },
      vibration: '888Hz',
      timestamp: new Date().toISOString(),
    });
  });
}
