import React, { useMemo } from 'react';
import { theme, humanStatus } from './oceanicosTheme';
import { boundedStatus, statusCounts, STATUS_ORDER, summarizeLucidField, type RealityStatus } from './whole-ecosystem-dashboard-model';
import { AgentSafetyBoundaryPanel } from './AgentSafetyBoundaryPanel';

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

function EcosystemMap() {
  return (
    <div className="whole-map-wrap">
      <svg
        className="whole-map"
        viewBox="0 0 520 260"
        role="img"
        aria-labelledby="whole-map-title whole-map-description"
      >
        <title id="whole-map-title">Conceptual OCEANICOS system map</title>
        <desc id="whole-map-description">
          A central Ω∞v mark is connected to Reality, Memory, Value, Observation, and Action. The map shows conceptual relationships, not live system topology or telemetry.
        </desc>
        <defs>
          <radialGradient id="whole-map-glow" cx="50%" cy="48%" r="58%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="whole-map-drop" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a5f3fc" />
            <stop offset="52%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <radialGradient id="whole-map-world" cx="35%" cy="28%" r="72%">
            <stop offset="0%" stopColor="#164e63" />
            <stop offset="100%" stopColor="#071827" />
          </radialGradient>
        </defs>

        <ellipse className="whole-map-halo" cx="260" cy="132" rx="220" ry="112" />
        <ellipse className="whole-map-orbit" cx="260" cy="132" rx="196" ry="72" />
        <ellipse className="whole-map-orbit whole-map-orbit-inner" cx="260" cy="132" rx="132" ry="48" transform="rotate(-24 260 132)" />
        <circle cx="260" cy="132" r="105" fill="url(#whole-map-glow)" />

        <g className="whole-map-links" aria-hidden="true">
          <path d="M260 105 L260 38 M230 122 L112 91 M290 122 L408 91 M233 157 L151 205 M287 157 L369 205" />
          <path d="M112 91 Q260 14 408 91 M151 205 Q260 250 369 205" />
        </g>

        <g className="whole-map-core">
          <circle cx="260" cy="132" r="37" className="whole-map-core-aura" />
          <circle cx="260" cy="143" r="20" fill="url(#whole-map-world)" className="whole-map-world" />
          <path d="M253 135l6-4 5 2 4 6-4 4-1 7-6 1-4-7-5-2 1-5z" className="whole-map-land" />
          <path d="M260 82c-7 11-21 28-21 42a21 21 0 0 0 42 0c0-14-14-31-21-42z" fill="none" stroke="url(#whole-map-drop)" strokeWidth="2.5" />
          <text x="260" y="148" className="whole-map-mark" textAnchor="middle">Ω∞v</text>
        </g>

        <g className="whole-map-node" transform="translate(260 31)">
          <circle r="14" /><text y="4" textAnchor="middle">◎</text><text className="whole-map-label" y="32" textAnchor="middle">REALITY</text>
        </g>
        <g className="whole-map-node" transform="translate(101 88)">
          <circle r="13" /><text y="4" textAnchor="middle">◉</text><text className="whole-map-label" x="-8" y="30" textAnchor="end">MEMORY</text>
        </g>
        <g className="whole-map-node" transform="translate(419 88)">
          <circle r="13" /><text y="4" textAnchor="middle">◇</text><text className="whole-map-label" x="8" y="30" textAnchor="start">VALUE</text>
        </g>
        <g className="whole-map-node" transform="translate(143 211)">
          <circle r="13" /><text y="4" textAnchor="middle">◉</text><text className="whole-map-label" y="30" textAnchor="middle">OBSERVATION</text>
        </g>
        <g className="whole-map-node" transform="translate(377 211)">
          <circle r="13" /><text y="4" textAnchor="middle">▶</text><text className="whole-map-label" y="30" textAnchor="middle">ACTION</text>
        </g>
      </svg>
      <p className="whole-map-caption">CONCEPT MAP · relationships shown, not live topology</p>
      <div className="whole-provider-currents">
        <span className="whole-ecosystem-label">INTERCHANGEABLE CURRENTS · EXAMPLES ONLY</span>
        <div className="whole-provider-chips">
          {['ChatGPT', 'Grok', 'Manus', 'Codex', 'Composio'].map((provider) => <span className="whole-provider-chip" key={provider}>{provider}</span>)}
        </div>
        <small>Connection and availability are not queried by this screen.</small>
      </div>
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
          <button className="whole-organ active" onClick={() => props.onFocusCommand('Show what matters now.')}>⌂ <span>NOW</span></button>
          {ORGANS.map(([glyph, label]) => <button className="whole-organ" key={label} onClick={() => props.onFocusCommand(`Map ${label}.`)}><b>{glyph}</b><span>{label}</span></button>)}
        </nav>

        <article className="whole-current-card">
          <span className="whole-ecosystem-label">MIRROR-WATER · CURRENT STATE</span>
          <EcosystemMap />
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
