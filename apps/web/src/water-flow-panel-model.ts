import {
  deriveWaterIntelligence,
  type WaterIntelligenceSkin,
} from '../../../packages/types/src/water-intelligence.ts';

export const WATER_FLOW_STAGES = [
  'REALITY',
  'ATTENTION',
  'INTENTION',
  'ACTION',
  'CONSEQUENCE',
  'OBSERVATION',
  'LEARNING',
  'RETURN',
] as const;

export type WaterFlowStage = (typeof WATER_FLOW_STAGES)[number];
export type WaterFlowStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';

export interface WaterFlowFrameView {
  stage: WaterFlowStage;
  sequence: number;
  state: string;
  transition: string;
  traceId: string;
  deterministic: true;
  bounds: { maxSteps: number };
  provenance: {
    source: 'local-water-flow';
    verified: false;
    note: string;
  };
}

export interface WaterFlowSummary {
  status: WaterFlowStatus;
  stages: readonly WaterFlowStage[];
  traceId: string | null;
  maxSteps: number;
  note: string;
  skin: WaterIntelligenceSkin;
}

const KNOWN_STAGES = new Set<string>(WATER_FLOW_STAGES);

export function summarizeWaterFlow(frames: readonly WaterFlowFrameView[] | null | undefined): WaterFlowSummary {
  if (!frames || frames.length === 0) {
    const status = 'NOT_EXECUTED' as const;
    return {
      status,
      stages: [],
      traceId: null,
      maxSteps: 0,
      note: 'No pipeline receipt supplied; this surface is a contract view, not a runtime claim.',
      skin: deriveWaterIntelligence({ status }),
    };
  }

  const validFrames = frames.filter((frame) => KNOWN_STAGES.has(frame.stage));
  const first = validFrames[0];
  const allUnverified = validFrames.every((frame) => frame.provenance.verified === false);
  const maxSteps = first?.bounds.maxSteps ?? 0;

  const status: WaterFlowStatus = allUnverified && validFrames.length > 0 ? 'UNKNOWN' : 'DIVERGENT';

  return {
    status,
    stages: validFrames.map((frame) => frame.stage),
    traceId: first?.traceId ?? null,
    maxSteps,
    note: allUnverified
      ? 'Frames are deterministic local representations; provenance.verified remains false.'
      : 'Frame provenance did not match the bounded local-water-flow contract.',
    skin: deriveWaterIntelligence({ status }),
  };
}
