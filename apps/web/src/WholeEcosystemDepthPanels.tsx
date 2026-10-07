import React from 'react';
import { boundedStatus, type RealityStatus } from './whole-ecosystem-dashboard-model';

type Props = {
  streamConnected: boolean;
  simulationMode: boolean;
  humanGateRequired: boolean;
  ledgerIntegrity: { valid: boolean; height: number } | null;
  omegaCommand: any;
  onFocusCommand: (prompt: string) => void;
};

const statusLabel = (status: RealityStatus) => status.replace('_', ' ');

function StatusPill({ status }: { status: RealityStatus }) {
  return <span className={`depth-status depth-status-${status.toLowerCase()}`}>{statusLabel(status)}</span>;
}

export function WholeEcosystemDepthPanels({
  streamConnected,
  simulationMode,
  humanGateRequired,
  ledgerIntegrity,
  omegaCommand,
  onFocusCommand,
}: Props) {
  const commandStatus = omegaCommand?.reality?.classification
    ? boundedStatus(omegaCommand.reality.classification)
    : 'NOT_EXECUTED';
  const nextAction = omegaCommand?.command?.intent || 'Verify the current GitHub ↔ runtime bridge';
  const buildStages = [
    ['Intent', omegaCommand?.command ? 'VERIFIED' : 'UNKNOWN'],
    ['Spec', 'UNKNOWN'],
    ['ΩIR', 'UNKNOWN'],
    ['Code', 'UNKNOWN'],
    ['GitHub', 'UNKNOWN'],
    ['CI', 'UNKNOWN'],
    ['Runtime', streamConnected ? 'VERIFIED' : 'UNKNOWN'],
    ['Observe', ledgerIntegrity?.valid ? 'VERIFIED' : 'UNKNOWN'],
  ] as const;
  const workerRows = [
    ['Available', 'UNKNOWN', 'No worker inventory observed by this dashboard'],
    ['Running', 'UNKNOWN', simulationMode ? 'Bounded simulation mode' : 'Runtime state not queried'],
    ['Review', humanGateRequired ? 'VERIFIED' : 'UNKNOWN', humanGateRequired ? 'Human gate required' : 'No gate reported'],
    ['Revoked', 'UNKNOWN', 'No revocation feed observed'],
  ] as const;

  return (
    <section className="whole-depth" aria-label="Whole ecosystem depth panels">
      <div className="whole-depth-grid">
        <article className="depth-card depth-value-card">
          <header><span>💎 VALUE CURRENT</span><small>FINITE VALUE CHAIN</small></header>
          <div className="depth-chain">{['Need', 'Problem', 'Solution', 'Product', 'Delivery', 'Outcome', 'Value', 'Revenue', 'Reinvestment'].map((item) => <button key={item} onClick={() => onFocusCommand(`Show evidence for ${item.toLowerCase()}.`)}>{item}</button>)}</div>
          <div className="depth-metrics"><span>Observed outcomes <b>UNKNOWN</b></span><span>Earned revenue <b>UNKNOWN</b></span><span>Verified value <b>UNKNOWN</b></span></div>
        </article>

        <article className="depth-card">
          <header><span>◈ STATE VECTOR</span><small>Ω = (R, E, A, X, V, U)</small></header>
          <div className="depth-vector">
            {[
              ['Reality', ledgerIntegrity?.valid ? 'VERIFIED' : 'UNKNOWN'],
              ['Evidence', streamConnected ? 'VERIFIED' : 'UNKNOWN'],
              ['Authority', humanGateRequired ? 'VERIFIED' : 'UNKNOWN'],
              ['Execution', commandStatus],
              ['Value', 'UNKNOWN'],
              ['Uncertainty', 'UNKNOWN'],
            ].map(([label, status]) => <div key={label}><span>{label}</span><StatusPill status={boundedStatus(status)} /></div>)}
          </div>
        </article>

        <article className="depth-card depth-next-card">
          <header><span>↺ NEXT FINITE Δ</span><small>ONE ACTION, NOT INFINITE SCOPE</small></header>
          <strong>{nextAction}</strong>
          <p>Highest useful transition remains bounded by available evidence and authority.</p>
          <div className="depth-meta"><span>WHY</span><span>Runtime and external state require observation.</span><span>AUTHORITY</span><span>{humanGateRequired ? 'Human approval required' : 'Not reported'}</span></div>
          <button className="depth-primary" onClick={() => onFocusCommand(nextAction)}>REVIEW NEXT Δ →</button>
        </article>

        <article className="depth-card">
          <header><span>⚙ WORKERS</span><small>BOUNDED INSTRUMENTS</small></header>
          <div className="depth-workers">{workerRows.map(([label, status, detail]) => <div key={label}><span>{label}</span><StatusPill status={boundedStatus(status)} /><small>{detail}</small></div>)}</div>
          <button className="depth-link" onClick={() => onFocusCommand('Show worker authority, capability, data scope, and stop conditions.')}>VIEW WORKER BOUNDARIES →</button>
        </article>
      </div>

      <div className="whole-depth-lower">
        <article className="depth-card depth-build-card">
          <header><span>⚙ BUILD PIPELINE</span><small>INTENT → SPEC → ΩIR → CODE → CI → RUNTIME → OBSERVE</small></header>
          <div className="depth-pipeline">{buildStages.map(([label, status], index) => <React.Fragment key={label}><div><StatusPill status={boundedStatus(status)} /><b>{label}</b></div>{index < buildStages.length - 1 && <i aria-hidden="true">→</i>}</React.Fragment>)}</div>
          <button className="depth-link" onClick={() => onFocusCommand('Show the build pipeline and its missing evidence.')}>OPEN BUILD EVIDENCE →</button>
        </article>

        <article className="depth-card">
          <header><span>🧬 MEMORY OCEAN</span><small>HISTORY IS NOT PROOF</small></header>
          <div className="depth-memory"><span>Decisions <b>UNKNOWN</b></span><span>Observations <b>{ledgerIntegrity?.height ?? 'UNKNOWN'}</b></span><span>Evidence <b>UNKNOWN</b></span><span>Lessons <b>UNKNOWN</b></span></div>
          <button className="depth-link" onClick={() => onFocusCommand('Show historical claims and their current reconciliation status.')}>OPEN MEMORY →</button>
        </article>

        <article className="depth-card">
          <header><span>◎ KNOWLEDGE GRAPH</span><small>CLICKABLE RELATIONSHIPS, NOT DECORATION</small></header>
          <div className="depth-graph"><b>Ω∞v</b><span>AI SOUL</span><span>MIRRIO</span><span>KAI</span><span>TRUTHOS</span><span>GITHUB</span><span>RUNTIME</span></div>
          <button className="depth-link" onClick={() => onFocusCommand('Map the ecosystem relationships and evidence paths.')}>EXPAND NEIGHBORHOOD →</button>
        </article>
      </div>
    </section>
  );
}
