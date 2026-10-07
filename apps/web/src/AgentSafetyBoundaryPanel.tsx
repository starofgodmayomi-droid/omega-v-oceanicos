import React from 'react';
import { boundedStatus, type RealityStatus } from './whole-ecosystem-dashboard-model';
import { theme, humanStatus } from './oceanicosTheme';

type SafetyStatus = RealityStatus;

type SafetyControl = {
  label: string;
  status: SafetyStatus;
  evidence: string;
};

type Props = {
  capabilityObserved: boolean;
  policySatisfied: boolean;
  humanGateRequired: boolean;
  leaseObserved: boolean;
  executed: boolean;
  observedStatus: unknown;
  revocationObserved: boolean;
  reconciliationStatus: unknown;
};

const STATUS_COLOR: Record<SafetyStatus, string> = {
  VERIFIED: theme.verified,
  UNKNOWN: theme.unknown,
  DIVERGENT: theme.divergent,
  NOT_EXECUTED: theme.warning,
};

function yesNoStatus(value: boolean, fallback: SafetyStatus = 'UNKNOWN'): SafetyStatus {
  return value ? 'VERIFIED' : fallback;
}

export function AgentSafetyBoundaryPanel(props: Props) {
  const controls: SafetyControl[] = [
    {
      label: 'Capability',
      status: yesNoStatus(props.capabilityObserved),
      evidence: props.capabilityObserved ? 'ecosystem capability snapshot observed' : 'capability snapshot unavailable',
    },
    {
      label: 'Policy',
      status: yesNoStatus(props.policySatisfied),
      evidence: props.policySatisfied ? 'command policy evidence reports satisfied' : 'policy satisfaction not observed',
    },
    {
      label: 'Authority',
      status: props.humanGateRequired ? 'NOT_EXECUTED' : 'UNKNOWN',
      evidence: props.humanGateRequired ? 'human approval still required' : 'authority boundary not reported',
    },
    {
      label: 'Lease',
      status: yesNoStatus(props.leaseObserved, 'NOT_EXECUTED'),
      evidence: props.leaseObserved ? 'bounded lease observed' : 'no execution lease observed',
    },
    {
      label: 'Execution',
      status: yesNoStatus(props.executed, 'NOT_EXECUTED'),
      evidence: props.executed ? 'execution flag observed' : 'no execution observed',
    },
    {
      label: 'Observation',
      status: boundedStatus(props.observedStatus),
      evidence: props.observedStatus ? 'reality classification observed' : 'no reality observation recorded',
    },
    {
      label: 'Revocation',
      status: yesNoStatus(props.revocationObserved, 'NOT_EXECUTED'),
      evidence: props.revocationObserved ? 'revocation evidence observed' : 'no revocation event observed',
    },
    {
      label: 'Reconciliation',
      status: boundedStatus(props.reconciliationStatus),
      evidence: props.reconciliationStatus ? 'command/result reconciliation observed' : 'reconciliation not executed',
    },
  ];
  const verified = controls.filter((control) => control.status === 'VERIFIED').length;

  return (
    <section className="agent-safety-panel" aria-label="Agent safety boundary">
      <div className="agent-safety-heading">
        <div>
          <span className="whole-ecosystem-label">AGENT SAFETY BOUNDARY</span>
          <strong>outside the model · inside observable runtime</strong>
        </div>
        <span className="agent-safety-ratio">{verified}/{controls.length} verified</span>
      </div>
      <p className="agent-safety-subtitle">
        Capability → policy → authority → lease → execution → observation → revocation → reconciliation
      </p>
      <div className="agent-safety-grid">
        {controls.map((control) => (
          <div className="agent-safety-control" key={control.label}>
            <div className="agent-safety-control-top">
              <span>{control.label}</span>
              <b style={{ color: STATUS_COLOR[control.status] }}>{humanStatus(control.status)}</b>
            </div>
            <small>{control.evidence}</small>
          </div>
        ))}
      </div>
      <div className="agent-safety-boundary-note">
        MODEL OUTPUT ≠ AUTHORITY · TEST ≠ RUNTIME · MEMORY ≠ PROOF · external safety platforms not connected
      </div>
    </section>
  );
}
