/**
 * Ω∞v local-action surface — fail-closed.
 *
 * `apps/web/src/InvisibleComputer.tsx` reads this contract before it offers the
 * allowlisted local actions (repo status, web build, web tests). No local runner
 * process is configured in this runtime, so the surface reports that honestly
 * instead of answering 404 and leaving the UI with "access failed".
 *
 * Nothing here executes a command: `enabled` is false, `actions` is empty and
 * every response carries `execution: NOT_EXECUTED`. Capability is not authority.
 */
import type { FastifyInstance } from 'fastify';

export function registerLocalActionsRoute(fastify: FastifyInstance): void {
  fastify.get('/v1/local-actions', async () => ({
    success: true,
    enabled: false,
    actions: [],
    reason: 'No local action runner is configured in this runtime.',
    execution: 'NOT_EXECUTED',
  }));

  fastify.get('/v1/local-actions/runs', async () => ({
    success: true,
    runs: [],
    reason: 'No local action runner is configured in this runtime.',
    execution: 'NOT_EXECUTED',
  }));
}
