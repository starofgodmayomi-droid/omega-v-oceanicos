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
    verified: boolean;
    note: string;
  };
}

export interface WaterFlowSummary {
  status: WaterFlowStatus;
  stages: readonly WaterFlowStage[];
  traceId: string | null;
  maxSteps: number;
  note: string;
}

const KNOWN_STAGES = new Set<string>(WATER_FLOW_STAGES);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const boundedText = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= max;

/**
 * Admit one local water-flow receipt from a command body.
 * A missing receipt stays absent. A forged or reordered receipt is refused
 * rather than painted as a trace. `verified: true` is kept so the summary
 * can stay DIVERGENT instead of being relabeled UNKNOWN.
 */
export function projectCommandWaterFlow(command: unknown): readonly WaterFlowFrameView[] | null {
  if (!isRecord(command) || !('waterFlow' in command)) return null;
  return projectWaterFlowFrames(command.waterFlow);
}

export function projectWaterFlowFrames(value: unknown): readonly WaterFlowFrameView[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > WATER_FLOW_STAGES.length) return null;

  const frames: WaterFlowFrameView[] = [];
  let traceId: string | null = null;
  for (let index = 0; index < value.length; index += 1) {
    const frame = value[index];
    if (!isRecord(frame)) return null;
    if (frame.stage !== WATER_FLOW_STAGES[index]) return null;
    if (frame.sequence !== index) return null;
    if (frame.deterministic !== true) return null;
    if (!boundedText(frame.state, 240) || !boundedText(frame.transition, 240)) return null;
    if (!boundedText(frame.traceId, 80)) return null;
    if (traceId === null) traceId = frame.traceId;
    if (frame.traceId !== traceId) return null;
    if (!isRecord(frame.bounds) || frame.bounds.maxSteps !== value.length) return null;
    if (!isRecord(frame.provenance)) return null;
    if (frame.provenance.source !== 'local-water-flow') return null;
    if (typeof frame.provenance.verified !== 'boolean') return null;
    if (!boundedText(frame.provenance.note, 240)) return null;
    frames.push({
      stage: WATER_FLOW_STAGES[index],
      sequence: index,
      state: frame.state,
      transition: frame.transition,
      traceId: frame.traceId,
      deterministic: true,
      bounds: { maxSteps: value.length },
      provenance: {
        source: 'local-water-flow',
        verified: frame.provenance.verified,
        note: frame.provenance.note,
      },
    });
  }
  return frames;
}

export function summarizeWaterFlow(frames: readonly WaterFlowFrameView[] | null | undefined): WaterFlowSummary {
  if (!frames || frames.length === 0) {
    return {
      status: 'NOT_EXECUTED',
      stages: [],
      traceId: null,
      maxSteps: 0,
      note: 'No pipeline receipt supplied; this surface is a contract view, not a runtime claim.',
    };
  }

  const validFrames = frames.filter((frame) => KNOWN_STAGES.has(frame.stage));
  const first = validFrames[0];
  const allUnverified = validFrames.every((frame) => frame.provenance.verified === false);
  const maxSteps = first?.bounds.maxSteps ?? 0;

  return {
    status: allUnverified && validFrames.length > 0 ? 'UNKNOWN' : 'DIVERGENT',
    stages: validFrames.map((frame) => frame.stage),
    traceId: first?.traceId ?? null,
    maxSteps,
    note: allUnverified
      ? 'Frames are deterministic local representations; provenance.verified remains false.'
      : 'Frame provenance did not match the bounded local-water-flow contract.',
  };
}
