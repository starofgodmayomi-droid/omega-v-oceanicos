import { summarizeLucidField, type LucidFieldSignal, type LucidFieldSummary } from './whole-ecosystem-dashboard-model.ts';
import { summarizeWaterFlow, waterFlowFramesFromCommand, type WaterFlowCommandEnvelope, type WaterFlowFrameView, type WaterFlowSummary } from './water-flow-panel-model.ts';

export interface LucidFieldWaterSummary {
  readonly field: LucidFieldSummary;
  readonly frames: readonly WaterFlowFrameView[] | null;
  readonly water: WaterFlowSummary;
}

/** Compose only the source-bound signals and command receipt supplied by this view. */
export function summarizeLucidFieldWater(
  signals: readonly LucidFieldSignal[],
  command: WaterFlowCommandEnvelope | null | undefined,
): LucidFieldWaterSummary {
  const frames = waterFlowFramesFromCommand(command);
  return { field: summarizeLucidField(signals), frames, water: summarizeWaterFlow(frames) };
}
