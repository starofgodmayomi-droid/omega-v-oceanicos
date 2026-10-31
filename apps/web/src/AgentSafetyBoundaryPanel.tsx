import React from 'react';
import { boundedStatus, type RealityStatus } from './whole-ecosystem-dashboard-model';
import { humanStatus, theme } from './oceanicosTheme';

type SafetyStatus = RealityStatus | 'RECORDED';

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
  RECORDED: theme.warning,
};

function yesNoStatus(value: boolean, fallback: SafetyStatus = 'UNKNOWN'): SafetyStatus {
  return value ? 'VERIFIED' : fallback;
}

export function AgentSafetyBoundaryPanel(props: Props) {
  const controls: SafetyControl[] = [
    {
      label: 'Capability',
      status: props.capabilityObserved ? 'RECORDED' : 'UNKNOWN',
      evidence: props.capabilityObserved ? 'capability snapshot recorded; a snapshot is not independent verification' : 'capability snapshot unavailable',
    },
    {
      label: 'Policy',
      status: props.policySatisfied ? 'RECORDED' : 'UNKNOWN',
      evidence: props.policySatisfied ? 'command policy string recorded; a string is not independent verification' : 'policy satisfaction not observed',
    },
    {
      label: 'Authority',
      status: props.humanGateRequired ? 'NOT_EXECUTED' : 'UNKNOWN',
      evidence: props.humanGateRequired ? 'human approval remains required' : 'authority boundary not reported',
    },
    {
      label: 'Lease',
      status: props.leaseObserved ? 'RECORDED' : 'NOT_EXECUTED',
      evidence: props.leaseObserved ? 'bounded lease recorded; a lease is not independent verification' : 'no execution lease observed',
    },
    {
      label: 'Execution',
      status: yesNoStatus(props.executed, 'NOT_EXECUTED'),
      evidence: props.executed ? 'execution result observed' : 'no execution observed',
    },
    {
      label: 'Observation',
      status: boundedStatus(props.observedStatus),
      evidence: props.observedStatus ? 'reality classification observed' : 'no reality observation recorded',
    },
    {
      label: 'Revocation',
      status: props.revocationObserved ? 'RECORDED' : 'NOT_EXECUTED',
      evidence: props.revocationObserved ? 'revocation record recorded; a record is not independent verification' : 'no revocation event observed',
    },
    {
      label: 'Reconciliation',
      status: boundedStatus(props.reconciliationStatus),
      evidence: props.reconciliationStatus ? 'reconciliation evidence observed' : 'no reconciliation evidence observed',
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
        MODEL OUTPUT ≠ AUTHORITY · CAPABILITY ≠ PERMISSION · TEST ≠ RUNTIME · MEMORY ≠ PROOF
      </div>
    </section>
  );
}
