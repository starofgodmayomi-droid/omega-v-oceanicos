import React from 'react';
import {
  WATER_FLOW_STAGES,
  summarizeWaterFlow,
  type WaterFlowFrameView,
} from './water-flow-panel-model';
import {
  summarizeRuntimeObservation,
  type RuntimeObservationInput,
} from './runtime-observation-model';

interface WaterFlowPanelProps {
  frames?: readonly WaterFlowFrameView[] | null;
  runtime?: RuntimeObservationInput;
}

export function WaterFlowPanel({ frames = null, runtime }: WaterFlowPanelProps) {
  const summary = summarizeWaterFlow(frames);
  const observation = runtime ? summarizeRuntimeObservation(runtime) : null;

  return (
    <section className="water-flow-panel" aria-label="KAI bounded water-flow trace">
      <div className="water-flow-panel__header">
        <div>
          <div className="water-flow-panel__eyebrow">💧 KAI WATER-FLOW · FINITE TRACE</div>
          <p className="water-flow-panel__description">
            The local pipeline trace and live runtime observations are separate evidence surfaces. A connected stream is not proof of a verified outcome.
          </p>
        </div>
        <span className="water-flow-panel__status" data-status={summary.status} role="status">
          LOCAL TRACE · {summary.status}
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
              aria-label={`${stage}: ${observed ? 'observed in local trace' : 'not observed in local trace'}`}
            >
              {stage}
            </div>
          );
        })}
      </div>

      <p className="water-flow-panel__note">{summary.note}</p>
      {summary.traceId && (
        <div className="water-flow-panel__trace">
          trace: {summary.traceId} · max steps: {summary.maxSteps}
        </div>
      )}

      {observation && (
        <section className="water-runtime-observation" aria-label="Observed runtime receipt">
          <div className="water-runtime-observation__heading">
            <strong>RUNTIME OBSERVATION</strong>
            <span data-connected={observation.streamConnected}>
              {observation.streamConnected ? 'STREAM CONNECTED' : 'STREAM DISCONNECTED'}
            </span>
          </div>
          <dl className="water-runtime-observation__grid">
            {observation.rows.map((row) => (
              <div className="water-runtime-observation__row" key={row.label}>
                <dt>{row.label}</dt>
                <dd title={row.value}>{row.value}</dd>
              </div>
            ))}
          </dl>
          <p className="water-flow-panel__note">
            Values above are read from the dashboard's current client state. “Unavailable” means no value was observed; it is not a pass or failure verdict.
          </p>
        </section>
      )}
    </section>
  );
}
