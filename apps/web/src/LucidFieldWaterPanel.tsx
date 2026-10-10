import React from 'react';
import { boundedStatus, type LucidFieldSignal } from './whole-ecosystem-dashboard-model';
import { summarizeLucidFieldWater } from './lucid-field-water-panel-model';
import type { WaterFlowCommandEnvelope } from './water-flow-panel-model';
import './LucidFieldWater.css';

type LucidFieldWaterPanelProps = {
  signals: readonly LucidFieldSignal[];
  command: WaterFlowCommandEnvelope | null | undefined;
  onPlanReview: (prompt: string) => void;
};

export function LucidFieldWaterPanel({
  signals,
  command,
  onPlanReview,
}: LucidFieldWaterPanelProps) {
  const { field, frames, water } = summarizeLucidFieldWater(signals, command);
  const nextUnresolved = field.unresolved[0];

  return (
    <section className="lucid-water-shell" aria-label="Lucid Field and Water Current">
      <header className="lucid-water-header">
        <div>
          <span className="lucid-water-eyebrow">LUCID FIELD × LIVING WATER</span>
          <h3>See the field. Follow the evidence.</h3>
          <p>
            The field shows source-bound signals available here. Water renders the active command receipt when supplied. Neither view scans all reality.
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
              <h4 id="lucid-water-current-title">WATER · TWELVE FINITE STAGES</h4>
              <p>Source → Drop → Flow → Contact → Observe → Reflect → Verify → Change → Reconcile → Remember → Return → New Drop</p>
            </div>
          </div>

          <div className="lucid-water-flow-status">
            <span className={`lucid-water-status lucid-water-status--${water.status}`}>{water.status}</span>
            <small>TRACE STATE</small>
          </div>

          <ol className="lucid-water-stages" aria-label="Living Water stages and evidence coverage; not a progress indicator">
            {water.livingWaterSteps.map((step, index) => {
              const statusLabel = step.status.replace(/_/g, ' ');
              const mapped = step.machineStages.length > 0 ? `v1: ${step.machineStages.join(', ')}` : 'no distinct v1 stage';
              return (
                <li className={`lucid-water-stage lucid-water-stage--${step.status}`} key={step.stage}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{step.stage.replace(/_/g, ' ')}</strong>
                  <small>{statusLabel}</small>
                  <small className="lucid-water-stage-map">{mapped}</small>
                  <span className="lucid-water-stage-meaning">{step.meaning}</span>
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
          {!frames && <p className="lucid-water-footnote">Waiting for an active-command receipt. The stage names are a contract, not telemetry.</p>}
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
