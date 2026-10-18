import React, { useMemo } from 'react';
import { theme, humanStatus } from './oceanicosTheme';
import { boundedStatus, statusCounts, STATUS_ORDER, summarizeLucidField, type LucidFieldSignal, type RealityStatus } from './whole-ecosystem-dashboard-model';
import { buildImaginVisualModel } from './imagin-visual-model';
import { AgentSafetyBoundaryPanel } from './AgentSafetyBoundaryPanel';
import { WorkerCoordinationPanel } from './WorkerCoordinationPanel';

type Props = {
  streamConnected: boolean;
  simulationMode: boolean;
  humanGateRequired: boolean;
  realityStatus: string | null | undefined;
  ledgerIntegrity: { valid: boolean; height: number } | null;
  history: Array<{ evidence?: { status?: string } }>;
  ecosystemBody: any;
  omegaCommand: any;
  onFocusCommand: (prompt: string) => void;
};

const ORGANS = [
  ['🧠', 'AI SOUL'], ['🪞', 'MIRRIO'], ['🧬', 'KAI'], ['🗣', 'ƆREADE'],
  ['💎', 'TRUTHOS'], ['🎨', 'ECHOFRAME'], ['🌊', 'OCEANICOS'], ['Ω', 'Ω∞v'],
  ['Δ', 'ΩIR'], ['⚙', 'WORKERS'], ['🐙', 'GITHUB'], ['📚', 'NOTION'],
];

const STATUS_COLOR: Record<RealityStatus, string> = {
  VERIFIED: theme.verified,
  UNKNOWN: theme.unknown,
  DIVERGENT: theme.divergent,
  NOT_EXECUTED: theme.warning,
};

const CORE_STEPS = ['ASK', 'THINK', 'DISTINGUISH', 'AUTHORIZE', 'BOUND', 'ACT', 'OBSERVE', 'VERIFY', 'RECONCILE', 'VALUE', 'REMEMBER', 'NEXT Δ'];

function ImaginEvidenceMap({ signals }: { signals: readonly LucidFieldSignal[] }) {
  const model = buildImaginVisualModel(signals);
  const usedStatuses = Array.from(new Set(model.nodes.map((node) => node.status)));

  return (
    <div className="whole-map-wrap" aria-label="IMAGIN visual layer">
      <span className="whole-ecosystem-label" style={{ textAlign: 'center', marginBottom: '5px' }}>
        IMAGIN · SOURCE-BOUND VISUALIZATION
      </span>
      <svg
        className="whole-map"
        viewBox="0 0 520 280"
        role="img"
        aria-labelledby="imagin-map-title imagin-map-description"
      >
        <title id="imagin-map-title">IMAGIN view-local evidence map</title>
        <desc id="imagin-map-description">
          Shows {model.nodes.length} of {signals.length} signals supplied to this dashboard view. Each node retains its bounded status and source. Lines are visual anchors only, not causal edges, live topology, or whole-reality telemetry.
        </desc>
        <defs>
          <radialGradient id="imagin-map-glow" cx="50%" cy="48%" r="58%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="imagin-map-current" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a5f3fc" />
            <stop offset="52%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <radialGradient id="imagin-map-world" cx="35%" cy="28%" r="72%">
            <stop offset="0%" stopColor="#164e63" />
            <stop offset="100%" stopColor="#071827" />
          </radialGradient>
        </defs>
        <ellipse className="whole-map-halo" cx="260" cy="132" rx="218" ry="112" />
        <ellipse className="whole-map-orbit" cx="260" cy="132" rx="196" ry="72" />
        <ellipse className="whole-map-orbit whole-map-orbit-inner" cx="260" cy="132" rx="132" ry="48" transform="rotate(-24 260 132)" />
        <circle cx="260" cy="132" r="105" fill="url(#imagin-map-glow)" />
        <g className="whole-map-links" aria-hidden="true">
          {model.nodes.map((node) => (
            <line
              key={'visual-anchor-' + node.id}
              x1={model.center.x}
              y1={model.center.y}
              x2={node.x}
              y2={node.y}
              stroke="rgba(103, 232, 249, 0.36)"
              strokeWidth="1"
              strokeDasharray="2 5"
            />
          ))}
        </g>
        <g className="whole-map-core">
          <circle cx="260" cy="132" r="37" className="whole-map-core-aura" />
          <circle cx="260" cy="132" r="20" fill="url(#imagin-map-world)" className="whole-map-world" />
          <path d="M260 113c-5 8-11 15-11 22a11 11 0 0 0 22 0c0-7-6-14-11-22z" fill="none" stroke="url(#imagin-map-current)" strokeWidth="1.5" />
          <text x="260" y="145" className="whole-map-mark" textAnchor="middle">Ω∞v</text>
        </g>
        {model.nodes.map((node) => (
          <g
            key={node.id}
            className="whole-map-node"
            aria-label={node.label + ': ' + node.status + '; source: ' + node.source}
            data-evidence-status={node.status}
          >
            <title>{node.label + ' — ' + node.status + ' — Source: ' + node.source}</title>
            <circle cx={node.x} cy={node.y} r="13" style={{ stroke: STATUS_COLOR[node.status] }} />
            <text x={node.x} y={node.y + 4} textAnchor="middle" style={{ fill: STATUS_COLOR[node.status] }}>
              {node.status === 'VERIFIED' ? '✓' : node.status === 'DIVERGENT' ? '!' : node.status === 'NOT_EXECUTED' ? '–' : '?'}
            </text>
            <text
              className="whole-map-label"
              x={node.labelX}
              y={node.labelY}
              textAnchor={node.anchor}
              style={{ fill: STATUS_COLOR[node.status] }}
            >
              {node.label.toUpperCase()}
            </text>
          </g>
        ))}
      </svg>
      <ul className="imagin-visually-hidden" aria-label="Evidence signal details">
        {model.nodes.map((node) => (
          <li key={'signal-detail-' + node.id}>
            {`${node.label}: ${node.status}; source: ${node.source}`}
          </li>
        ))}
        {model.omittedCount > 0 && (
          <li>{model.omittedCount} additional signals omitted by the bounded view.</li>
        )}
      </ul>
      <p className="whole-map-caption">{model.caption}</p>
      {usedStatuses.length > 0 && (
        <div aria-label="Evidence status legend" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', margin: '4px 0 8px', fontSize: '9px', fontFamily: theme.fontMono }}>
          {usedStatuses.map((status) => (
            <span key={status} style={{ color: STATUS_COLOR[status] }}>
              ● {humanStatus(status)}
            </span>
          ))}
        </div>
      )}
      <small style={{ display: 'block', color: theme.textDim, fontSize: '9px', lineHeight: 1.45, textAlign: 'center' }}>
        This layer visualizes only supplied signals. Image creation is separate; this map does not execute image generation or assert that a provider is connected.
      </small>
    </div>
  );
}
export function WholeEcosystemDashboard(props: Props) {
  const counts = useMemo(() => statusCounts(props.history, props.realityStatus), [props.history, props.realityStatus]);
  const evidence = [
    { label: 'Implementation', status: props.ecosystemBody?.status === 'VERIFIED' ? 'VERIFIED' : 'UNKNOWN', source: 'ecosystem body endpoint' },
    { label: 'Ledger', status: props.ledgerIntegrity?.valid ? 'VERIFIED' : 'UNKNOWN', source: props.ledgerIntegrity ? `height ${props.ledgerIntegrity.height}` : 'no tip observed' },
    { label: 'Runtime stream', status: props.streamConnected ? 'VERIFIED' : 'UNKNOWN', source: props.streamConnected ? 'SSE connection observed' : 'not connected' },
    { label: 'CI', status: 'UNKNOWN', source: 'hosted CI is not queried by this screen' },
    { label: 'External systems', status: 'UNKNOWN', source: 'no external authority inferred' },
  ] as const;
  const observedSignals = evidence.filter((item) => item.status === 'VERIFIED').length;
  const observedSignalRatio = observedSignals / evidence.length;
  const currentTransition = props.omegaCommand?.command?.intent || 'Select one useful, finite transition';
  const commandStatus = props.omegaCommand?.reality?.classification
    ? boundedStatus(props.omegaCommand.reality.classification)
    : 'NOT_EXECUTED';
  const lucidSummary = summarizeLucidField(evidence);
  const nextUnresolved = lucidSummary.unresolved[0];

  return (
    <section className="whole-ecosystem" aria-label="Whole ecosystem command surface">
      <header className="whole-ecosystem-header">
        <div>
          <span className="whole-ecosystem-kicker">💧 Ω∞v OCEANICOS · ONE BODY · ONE CURRENT</span>
          <h2>Whole ecosystem command surface</h2>
        </div>
        <span className="whole-ecosystem-state"><i className="status-dot" /> {props.simulationMode ? 'BOUNDED SIMULATION' : 'LIVE STATE'}</span>
      </header>

      <div className="whole-ecosystem-grid">
        <nav className="whole-ecosystem-organs" aria-label="Ecosystem organs">
          <span className="whole-ecosystem-label">ECOSYSTEM</span>
          <small className="whole-organ-guidance">Select an organ to draft a mapping prompt; submitting is a separate action.</small>
          <button className="whole-organ active" onClick={() => props.onFocusCommand('Show what matters now.')}>⌂ <span>NOW</span></button>
          {ORGANS.map(([glyph, label]) => <button className="whole-organ" key={label} onClick={() => props.onFocusCommand(`Map ${label}.`)}><b>{glyph}</b><span>{label}</span></button>)}
        </nav>

        <article className="whole-current-card">
          <span className="whole-ecosystem-label">IMAGIN · VIEW-LOCAL EVIDENCE</span>
          <ImaginEvidenceMap signals={evidence} />
          <p className="whole-question">WHAT MATTERS NOW?</p>
          <div className="whole-core-heading">
            <span className="whole-ecosystem-label">ONE GOVERNANCE SPINE</span>
            <small>Operating design · not live stage status</small>
          </div>
          <ol className="whole-operating-loop" aria-label="Reality-bound operating cycle">
            {CORE_STEPS.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, '0')}</span>{step}</li>)}
          </ol>
          <div className="whole-transition">
            <span>ONE FINITE Δ</span>
            <strong>{currentTransition}</strong>
            <small>{props.humanGateRequired ? 'Human approval remains required for consequential action.' : 'No human gate reported by the capability snapshot.'}</small>
          </div>
          <div className="whole-current-actions">
            <button onClick={() => props.onFocusCommand('Map the highest-value next finite transition.')}>MAP</button>
            <button onClick={() => props.onFocusCommand('Verify the current state with observable evidence.')}>VERIFY</button>
            <button onClick={() => props.onFocusCommand('Build the smallest complete vertical slice.')}>BUILD</button>
            <button title="Drafts a visual brief only; it does not run image generation" onClick={() => props.onFocusCommand('Draft an IMAGIN visual brief from these supplied signals. Keep evidence statuses and source links distinct; label concept art illustrative and do not claim image-provider execution without an observable receipt.')}>IMAGIN</button>
          </div>
          <div className="whole-command-status" style={{ color: STATUS_COLOR[commandStatus] }}>
            {humanStatus(commandStatus)} · command result is not proof of external reality
          </div>
        </article>

        <aside className="whole-reality-panel">
          <span className="whole-ecosystem-label">REALITY STATUS · CURRENT + HISTORY</span>
          <div className="whole-status-list">
            {STATUS_ORDER.map((status) => <div key={status}><span style={{ color: STATUS_COLOR[status] }}>● {status.replace('_', ' ')}</span><strong>{counts[status]}</strong></div>)}
          </div>
          <small className="whole-metric-note">Current signal plus retained history; not a whole-system total.</small>
          <section className="lucid-field" aria-labelledby="lucid-field-heading">
            <div className="lucid-field-header">
              <span className="whole-ecosystem-label" id="lucid-field-heading">LUCID FIELD · VIEW-LOCAL</span>
              <strong>{lucidSummary.verifiedCount}/{lucidSummary.total}</strong>
            </div>
            <p className="lucid-field-summary" role="status" aria-live="polite">{lucidSummary.summaryText}</p>
            <small className="lucid-field-note">Only signals listed on this screen; not an all-channel or whole-reality scan.</small>
            {nextUnresolved && (
              <button
                className="lucid-field-action"
                type="button"
                onClick={() => props.onFocusCommand(`Plan a bounded review of ${nextUnresolved.label} at its stated source (${nextUnresolved.source}); preserve ${nextUnresolved.status} until new evidence supports a change.`)}
              >
                PLAN REVIEW
              </button>
            )}
          </section>
          <span className="whole-ecosystem-label whole-evidence-title">OBSERVED SIGNALS</span>
          <div className="whole-evidence-meter" role="img" aria-label={`${observedSignals} of ${evidence.length} observed signals`}><span style={{ width: `${observedSignalRatio * 100}%` }} /></div>
          <strong className="whole-evidence-number">{observedSignals} / {evidence.length}</strong>
          <div className="whole-evidence-list">
            {evidence.map((item) => <div key={item.label}><span>{item.label}</span><b style={{ color: STATUS_COLOR[boundedStatus(item.status)] }}>{item.status}</b><small>{item.source}</small></div>)}
          </div>
          <div className="whole-trust-boundary">DOCUMENTED ≠ VERIFIED<br />CAPABILITY ≠ AUTHORITY<br />PLAN ≠ EXECUTION</div>
        </aside>
      </div>

      <AgentSafetyBoundaryPanel
        capabilityObserved={props.ecosystemBody?.status === 'VERIFIED'}
        policySatisfied={props.omegaCommand?.command?.policy?.satisfied === true}
        humanGateRequired={props.humanGateRequired}
        leaseObserved={Boolean(props.omegaCommand?.execution?.leaseId)}
        executed={props.omegaCommand?.execution?.executed === true}
        observedStatus={props.omegaCommand?.reality?.classification ?? props.realityStatus}
        revocationObserved={props.omegaCommand?.revocation?.observed === true}
        reconciliationStatus={props.omegaCommand?.reality?.classification}
      />

      <WorkerCoordinationPanel />

      <div className="whole-value-current">
        <div><span className="whole-ecosystem-label">VALUE CURRENT</span><strong>Need → Problem → Solution → Delivery → Observed outcome → Earned value</strong></div>
        <div className="whole-value-unknown"><b>OBSERVED VALUE</b><span>UNKNOWN · no value observation supplied</span></div>
        <button onClick={() => props.onFocusCommand('Show me what actually produced value.')}>SEE VALUE PATH</button>
      </div>

      <footer className="whole-bottom-current" aria-label="Whole ecosystem views">
        {['REALITY', 'THINK', 'MIRROR', 'BUILD', 'ACT', 'VERIFY', 'VALUE', 'REMEMBER', 'NEXT'].map((item) => <button key={item} onClick={() => props.onFocusCommand(`Open ${item.toLowerCase()} view.`)}>{item}</button>)}
      </footer>
    </section>
  );
}
