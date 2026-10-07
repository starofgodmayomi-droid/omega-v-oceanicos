import { createHash } from 'node:crypto';
import type {
  OmegaWaterFlowFrame,
  OmegaWaterFlowStage,
} from '@oceanicos/types';
import {
  OMEGA_WATER_FLOW_MAX_STEPS,
  OMEGA_WATER_FLOW_VERSION,
} from '@oceanicos/types';

const FLOW_STAGES: readonly OmegaWaterFlowStage[] = [
  'REALITY',
  'ATTENTION',
  'INTENTION',
  'ACTION',
  'CONSEQUENCE',
  'OBSERVATION',
  'LEARNING',
  'RETURN',
];

export interface OmegaWaterFlowInput {
  readonly state: string;
  readonly intent: string;
  readonly traceId?: string;
  readonly maxSteps?: number;
}

const boundedSteps = (maxSteps: number | undefined): number => {
  if (maxSteps === undefined) return OMEGA_WATER_FLOW_MAX_STEPS;
  if (!Number.isInteger(maxSteps) || maxSteps < 1 || maxSteps > OMEGA_WATER_FLOW_MAX_STEPS) {
    throw new Error(`water-flow maxSteps must be an integer from 1 to ${OMEGA_WATER_FLOW_MAX_STEPS}`);
  }
  return maxSteps;
};

/**
 * Build a finite, deterministic local trace for the KAI water-of-reality loop.
 * It models a transition; it does not execute external actions or observe the
 * physical world.
 */
export function buildOmegaWaterFlow(input: OmegaWaterFlowInput): readonly OmegaWaterFlowFrame[] {
  const state = input.state.trim();
  const intent = input.intent.trim();
  if (!state) throw new Error('water-flow state is required');
  if (!intent) throw new Error('water-flow intent is required');

  const maxSteps = boundedSteps(input.maxSteps);
  const traceId = input.traceId?.trim() || `flow-${createHash('sha256').update(`${state}:${intent}`).digest('hex').slice(0, 24)}`;
  const stages = FLOW_STAGES.slice(0, maxSteps);

  return stages.map((stage, sequence) => ({
    flowVersion: OMEGA_WATER_FLOW_VERSION,
    sequence,
    stage,
    state,
    transition: stage === 'REALITY' ? `observe:${state}` : `${stage.toLowerCase()}:${intent}`,
    traceId,
    deterministic: true,
    bounds: { maxSteps },
    provenance: {
      source: 'local-water-flow',
      verified: false,
      note: 'Bounded symbolic local-simulation evidence; not physical-world observation or external execution.',
    },
  }));
}
