import React, { useMemo } from 'react';
import { theme, humanStatus } from './oceanicosTheme';
import { boundedStatus, statusCounts, STATUS_ORDER, type RealityStatus } from './whole-ecosystem-dashboard-model';

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

export function WholeEcosystemDashboard(props: Props) {
  const counts = useMemo(() => statusCounts(props.history, props.realityStatus), [props.history, props.realityStatus]);
  const evidence = [
    { label: 'Implementation', status: props.ecosystemBody?.status === 'VERIFIED' ? 'VERIFIED' : 'UNKNOWN', source: 'ecosystem body endpoint' },
    { label: 'Ledger', status: props.ledgerIntegrity?.valid ? 'VERIFIED' : 'UNKNOWN', source: props.ledgerIntegrity ? `height ${props.ledgerIntegrity.height}` : 'no tip observed' },
    { label: 'Runtime stream', status: props.streamConnected ? 'VERIFIED' : 'UNKNOWN', source: props.streamConnected ? 'SSE connection observed' : 'not connected' },
    { label: 'CI', status: 'UNKNOWN', source: 'hosted CI is not queried by this screen' },
    { label: 'External systems', status: 'UNKNOWN', source: 'no external authority inferred' },
  ] as const;
  const verifiedEvidence = evidence.filter((item) => item.status === 'VERIFIED').length;
  const evidenceCoverage = Math.round((verifiedEvidence / evidence.length) * 100);
  const currentTransition = props.omegaCommand?.command?.intent || 'Select one useful, finite transition';
  const commandStatus = props.omegaCommand?.reality?.classification
    ? boundedStatus(props.omegaCommand.reality.classification)
    : 'NOT_EXECUTED';

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
          <div className="whole-drop" aria-hidden="true">💧</div>
          <p className="whole-question">WHAT MATTERS NOW?</p>
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
          <span className="whole-ecosystem-label">REALITY STATUS</span>
          <div className="whole-status-list">
            {STATUS_ORDER.map((status) => <div key={status}><span style={{ color: STATUS_COLOR[status] }}>● {status.replace('_', ' ')}</span><strong>{counts[status]}</strong></div>)}
          </div>
          <span className="whole-ecosystem-label whole-evidence-title">EVIDENCE COVERAGE</span>
          <div className="whole-evidence-meter" aria-label={`Evidence coverage ${evidenceCoverage}%`}><span style={{ width: `${evidenceCoverage}%` }} /></div>
          <strong className="whole-evidence-number">{evidenceCoverage}%</strong>
          <div className="whole-evidence-list">
            {evidence.map((item) => <div key={item.label}><span>{item.label}</span><b style={{ color: STATUS_COLOR[boundedStatus(item.status)] }}>{item.status}</b><small>{item.source}</small></div>)}
          </div>
          <div className="whole-trust-boundary">DOCUMENTED ≠ VERIFIED<br />CAPABILITY ≠ AUTHORITY<br />PLAN ≠ EXECUTION</div>
        </aside>
      </div>

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
