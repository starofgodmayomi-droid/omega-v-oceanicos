/**
 * Deep-agent → Φ adapter.
 *
 * One adapter, one direction, one phi object. The adapter is a boundary:
 * it never merges the deep-agent runtime into the core, and it never adds
 * adapter-specific keys inside phi. Only the phi-flow contract is shared.
 *
 * Status is OBSERVED. Mapping an observation is not verifying it.
 */
import {
  assertPhiFlow,
  hashPhiObservation,
  type PhiFlow,
  type PhiFlowRecord,
} from './phi-flow-contract.js';

export const DEEPAGENTS_ADAPTER = 'deepagents';

export interface DeepAgentObservation {
  /** What the run was trying to make real. */
  readonly intent: string;
  /** Ordered transitions the run actually reported. */
  readonly steps: readonly string[];
  /** Self-checks the run reported, if any. Absence is preserved as empty. */
  readonly reflections?: readonly string[];
  /** Raw evidence carried by the run. Hashed into F4, never summarised. */
  readonly evidence?: unknown;
}

/**
 * Map one deep-agent observation onto the four Φ laws.
 * Throws PhiFlowContractError when the observation cannot carry all four
 * laws — no partial phi is returned.
 */
export function deepAgentObservationToPhi(observation: DeepAgentObservation): PhiFlow {
  const phi: PhiFlow = Object.freeze({
    F1: observation.intent.trim(),
    F2: Object.freeze([...observation.steps]),
    F3: Object.freeze([...(observation.reflections ?? [])]),
    F4: hashPhiObservation(observation),
  });

  assertPhiFlow(phi);
  return phi;
}

/** OBSERVED-only record: one adapter name, one status, one phi object. */
export function adaptDeepAgentObservation(observation: DeepAgentObservation): PhiFlowRecord {
  return Object.freeze({
    adapter: DEEPAGENTS_ADAPTER,
    status: 'OBSERVED',
    observedAt: new Date().toISOString(),
    phi: deepAgentObservationToPhi(observation),
  });
}
