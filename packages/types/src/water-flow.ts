/**
 * Canonical stages for the grounded KAI/Oceanicos water-flow metaphor.
 * This is a finite software contract, not a claim about physical reality.
 */
export type OmegaWaterFlowStage =
  | 'REALITY'
  | 'ATTENTION'
  | 'INTENTION'
  | 'ACTION'
  | 'CONSEQUENCE'
  | 'OBSERVATION'
  | 'LEARNING'
  | 'RETURN';

export const OMEGA_WATER_FLOW_VERSION = 'omega.water-flow.v1' as const;
export const OMEGA_WATER_FLOW_MAX_STEPS = 8 as const;

export interface OmegaWaterFlowFrame {
  readonly flowVersion: typeof OMEGA_WATER_FLOW_VERSION;
  readonly sequence: number;
  readonly stage: OmegaWaterFlowStage;
  readonly state: string;
  readonly transition: string;
  readonly traceId: string;
  readonly deterministic: true;
  readonly bounds: {
    readonly maxSteps: number;
  };
  readonly provenance: {
    readonly source: 'local-water-flow';
    readonly verified: false;
    readonly note: string;
  };
}
