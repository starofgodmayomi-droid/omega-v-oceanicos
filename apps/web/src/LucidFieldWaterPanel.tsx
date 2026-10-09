import React from 'react';
import {
  boundedStatus,
  summarizeLucidField,
  type LucidFieldSignal,
} from './whole-ecosystem-dashboard-model';
import {
  WATER_FLOW_STAGES,
  summarizeWaterFlow,
  type WaterFlowFrameView,
} from './water-flow-panel-model';
import './LucidFieldWater.css';

type LucidFieldWaterPanelProps = {
  /** Only the source-bound signals already gathered by this view. */
  signals: readonly LucidFieldSignal[];
  /** Optional bounded trace receipt; absence remains NOT_EXECUTED. */
  frames?: readonly WaterFlowFrameView[] | null;
  /** Prepares a human-readable review intent; it does not execute it. */
  onPlanReview: (prompt: string) => void;
};

export function LucidFieldWaterPanel({
  signals,
  frames = null,
  onPlanReview,
}: LucidFieldWaterPanelProps) {
  const field = summarizeLucidField(signals);
  const water = summarizeWaterFlow(frames);
  const nextUnresolved = field.unresolved[0];

  return (
    <section className="lucid-water-shell" aria-label="Lucid Field and Water Current">
      <header className="lucid-water-header">
        <div>
          <span className="lucid-water-eyebrow">LUCID FIELD × WATER CURRENT</span>
          <h3>See the field. Follow the evidence.</h3>
          <p>
            The field shows the source-bound signals available here. Water shows the
            finite path a receipt can describe. Neither view claims to scan all reality.
          </p>
        </div>
        <div className="lucid-water-count" aria-label={`${field.verifiedCount} of ${field.total} listed signals verified in this view`}>
          <strong>{field.verifiedCount}<span>/{field.total}</span></strong>
          <small>VERIFIED IN VIEW</small>
        </div>
      </header>

      <div className="lucid-water-columns">
        <section className="lucid-water-field" aria-labelledby="lucid-water-field-title">
          <div className="lucid-water-section-heading">
            <span className="lucid-water-index">01</span>
            <div>
              <h4 id="lucid-water-field-title">FIELD · WHAT IS VISIBLE</h4>
              <p>{field.summaryText}</p>
            </div>
          </div>

          <div className="lucid-water-signals">
            {signals.map((signal) => {
              const status = boundedStatus(signal.status);
              return (
                <article className="lucid-water-signal" key={`${signal.label}:${signal.source}`}>
                  <span className="lucid-water-signal-point" aria-hidden="true" />
                  <div className="lucid-water-signal-copy">
                    <strong>{signal.label}</strong>
                    <small>{signal.source}</small>
                  </div>
                  <span className={`lucid-water-status lucid-water-status--${status}`}>{status}</span>
                </article>
              );
            })}
          </div>

          <p className="lucid-water-footnote">
            Scope is limited to the signals listed above. Missing sources remain UNKNOWN;
            an unseen signal is never counted as healthy.
          </p>

          {nextUnresolved && (
            <button
              className="lucid-water-review"
              type="button"
              onClick={() =>
                onPlanReview(
                  `Plan a bounded review of ${nextUnresolved.label} at its stated source (${nextUnresolved.source}); preserve ${nextUnresolved.status} until new evidence supports a change.`,
                )
              }
            >
              PLAN REVIEW <span aria-hidden="true">↗</span>
            </button>
          )}
        </section>

        <section className="lucid-water-current" aria-labelledby="lucid-water-current-title">
          <div className="lucid-water-section-heading">
            <span className="lucid-water-index">02</span>
            <div>
              <h4 id="lucid-water-current-title">WATER · FINITE CURRENT</h4>
              <p>Reality → Attention → Intention → Action → Consequence → Observation → Learning → Return</p>
            </div>
          </div>

          <div className="lucid-water-flow-status">
            <span className={`lucid-water-status lucid-water-status--${water.status}`}>{water.status}</span>
            <small>TRACE STATE</small>
          </div>

          <ol className="lucid-water-stages" aria-label="Finite water-flow contract stages">
            {WATER_FLOW_STAGES.map((stage, index) => {
              const inTrace = water.stages.includes(stage);
              return (
                <li className={inTrace ? 'lucid-water-stage is-in-trace' : 'lucid-water-stage is-unobserved'} key={stage}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{stage}</strong>
                  <small>{inTrace ? 'IN TRACE' : 'NOT IN TRACE'}</small>
                </li>
              );
            })}
          </ol>

          <p className="lucid-water-footnote">{water.note}</p>
          {water.traceId && (
            <div className="lucid-water-trace-meta">
              <code>trace: {water.traceId}</code>
              <span>max steps: {water.maxSteps}</span>
            </div>
          )}
        </section>
      </div>

      <footer className="lucid-water-footer">
        <span>ONE ROOT · ONE CURRENT</span>
        <span>MODEL ≠ OBSERVATION · PLAN ≠ ACTION · ATTEST ≠ REALITY</span>
      </footer>
    </section>
  );
}

export default LucidFieldWaterPanel;
