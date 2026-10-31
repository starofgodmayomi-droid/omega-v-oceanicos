/**
 * KAI — the Mind of the Ω∞v body.
 *
 * KAI carries memory, context, and the shield. The continuity implementation
 * lives once in `@oceanicos/mini` and is re-exported here so the body has one
 * KAI, not two. KAI records; it does not authorize, execute, or manufacture
 * evidence.
 */
export {
  KAI_VERSION,
  KaiContinuity,
  captureMiniKernelCycle,
  kaiFromBlock,
  kaiUnknown,
} from '@oceanicos/mini';
export type { KaiDrop, KaiSource, KaiStatus } from '@oceanicos/mini';

export { evaluateIntent, shieldAllows } from './shield.js';
export type {
  ShieldCategory,
  ShieldDecision,
  ShieldFinding,
  ShieldStatus,
} from './shield.js';
