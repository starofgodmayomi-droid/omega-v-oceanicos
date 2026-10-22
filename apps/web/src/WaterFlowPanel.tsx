import React from 'react';
import {
  WATER_FLOW_STAGES,
  summarizeWaterFlow,
  type WaterFlowFrameView,
} from './water-flow-panel-model';

interface WaterFlowPanelProps {
  frames?: readonly WaterFlowFrameView[] | null;
}

export function WaterFlowPanel({ frames = null }: WaterFlowPanelProps) {
  const summary = summarizeWaterFlow(frames);

  return (
    <section className="water-flow-panel" aria-label="KAI bounded water-flow trace">
      <div className="water-flow-panel__header">
        <div>
          <div className="water-flow-panel__eyebrow">💧 KAI WATER-FLOW · FINITE TRACE</div>
          <p className="water-flow-panel__description">
            A provenance-aware view of a pipeline receipt. This panel does not execute a pipeline or independently verify external reality.
          </p>
        </div>
        <span className="water-flow-panel__status" data-status={summary.status} role="status">
          {summary.status}
        </span>
      </div>

      <div
        className="water-flow-panel__stages"
        role="list"
        aria-label="Canonical water-flow stages"
      >
        {WATER_FLOW_STAGES.map((stage) => {
          const observed = summary.stages.includes(stage);
          return (
            <div
              key={stage}
              className="water-flow-stage"
              data-observed={observed}
              role="listitem"
              aria-label={`${stage}: ${observed ? 'observed in trace' : 'not observed'}`}
            >
              {stage}
            </div>
          );
        })}
      </div>

      <p className="water-flow-panel__note">
        {summary.note}
      </p>
      {summary.traceId && (
        <div className="water-flow-panel__trace">
          trace: {summary.traceId} · max steps: {summary.maxSteps}
        </div>
      )}
    </section>
  );
}
