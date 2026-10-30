import type { FastifyInstance } from 'fastify';
import { MAX_DROP_LENGTH, MAX_DROPS, runOceanicFixpoint } from '@oceanicos/fixpoint';
import { nextActionFor } from './invisible-computer.js';
import type { KaiMemoryRecord, KaiMemoryStore } from './kai-memory.js';

type JsonError = (
  reply: any,
  status: number,
  error: string,
  extra?: Record<string, unknown>
) => unknown;

function parseObject(body: unknown): Record<string, unknown> | null {
  return body && typeof body === 'object' && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : null;
}

/**
 * POST /api/fixpoint — Reality //// Ω∞v.
 *
 *   Ω∞v := Y(λf.λx. f(Σ ∪ Hash(x)) if O(E(x)) ≡ VERIFIED, else HALT)
 *
 * Runs the body's recursion over 1..MAX_DROPS drops and reports where it
 * stopped. Σ reaches memory only through a verified delta: every VERIFIED pass
 * is written to KaiMemory here, and a halting verdict writes nothing.
 *
 * Σ₀ is the durable ledger: the run starts from the most recent `KaiMemory`
 * evidence hashes (oldest first), so a second run replays what the body already
 * remembered instead of pretending Σ began empty.
 *
 * This endpoint holds no human at the gate — an irreversible drop halts with
 * NOT_EXECUTED. The `/execute` + `/approve` pair is the path that carries a
 * person through the LUCID gate one action at a time.
 */
export function registerFixpointRoute(
  fastify: FastifyInstance,
  store: KaiMemoryStore,
  jsonError: JsonError
): void {
  const handler = async (request: any, reply: any) => {
    const body = parseObject(request.body);
    if (!body) return jsonError(reply, 400, 'INTENT_REQUIRED');

    const raw = Array.isArray(body.intents)
      ? body.intents
      : typeof body.intent === 'string'
        ? [body.intent]
        : null;
    if (!raw) return jsonError(reply, 400, 'INTENT_REQUIRED');

    const drops = raw
      .filter((drop): drop is string => typeof drop === 'string')
      .map((drop) => drop.trim())
      .filter((drop) => drop.length > 0);
    if (drops.length === 0) return jsonError(reply, 400, 'INTENT_REQUIRED');
    if (drops.length > MAX_DROPS) {
      return jsonError(reply, 400, 'TOO_MANY_DROPS', { maxDrops: MAX_DROPS });
    }
    if (drops.some((drop) => drop.length > MAX_DROP_LENGTH)) {
      return jsonError(reply, 400, 'INTENT_TOO_LONG', { maxLength: MAX_DROP_LENGTH });
    }

    const recalled = store
      .listMemory(MAX_DROPS)
      .map((row) => row.evidence_hash)
      .reverse();

    const receipt = await runOceanicFixpoint({ drops, initialMemory: recalled });

    // Only V(Δ) = ⊤ grows memory.
    const remembered: KaiMemoryRecord[] = receipt.passes
      .filter((pass) => pass.verdict === 'VERIFIED' && pass.evidenceHash !== null)
      .map((pass) =>
        store.remember({
          intent: pass.intent,
          evidenceHash: pass.evidenceHash as string,
          status: pass.verdict,
        })
      );

    return reply.status(200).send({
      success: true,
      status: receipt.status,
      halted_at: receipt.haltedAt,
      detail: receipt.detail,
      memory: receipt.memory,
      passes: receipt.passes.map((pass) => ({
        index: pass.index,
        intent: pass.intent,
        verdict: pass.verdict,
        detail: pass.detail,
        evidence_hash: pass.evidenceHash,
      })),
      remembered,
      recalled_memory: recalled.length,
      total_drops: drops.length,
      next_action: nextActionFor(receipt.status),
      evaluated_at: new Date().toISOString(),
    });
  };

  for (const path of ['/fixpoint', '/api/fixpoint']) fastify.post(path, handler);
}
