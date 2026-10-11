import React from 'react';
import './ElionIdentityPanel.css';
import { deriveElionIdentitySignals } from './whole-ecosystem-dashboard-model';

type Props = {
  streamConnected: boolean;
  realityStatus: unknown;
  ledgerIntegrity: { valid: boolean; height: number } | null;
  ecosystemStatus: unknown;
  onFocusCommand: (prompt: string) => void;
};

const IDENTITY_ROLES = [
  { name: 'ELION', role: 'Identity', detail: 'A coherent, human-facing ecosystem identity.' },
  { name: 'LUCID', role: 'Clarity', detail: 'Makes context, evidence, and uncertainty legible.' },
  { name: 'OCEANICOS', role: 'Shared body', detail: 'Connects product surfaces and implementation.' },
  { name: 'Ω∞v', role: 'Verification', detail: 'Compares expectations with observed results.' },
];

export function ElionIdentityPanel(props: Props) {
  const signals = deriveElionIdentitySignals({
    streamConnected: props.streamConnected,
    realityStatus: props.realityStatus,
    ledgerIntegrity: props.ledgerIntegrity,
    ecosystemStatus: props.ecosystemStatus,
  });

  return (
    <section className="elion-identity" aria-labelledby="elion-identity-title">
      <header className="elion-identity-header">
        <div>
          <span className="elion-identity-kicker">ELION × LUCID · IDENTITY LAYER</span>
          <h3 id="elion-identity-title">One root. One current. Many forms.</h3>
          <p>Identity gives the ecosystem coherence; clarity keeps its claims accountable.</p>
        </div>
        <span className="elion-identity-boundary">DESIGN CONTRACT · NO AUTONOMOUS AUTHORITY</span>
      </header>

      <div className="elion-identity-roles" aria-label="Ecosystem identity roles">
        {IDENTITY_ROLES.map((role) => (
          <article className="elion-identity-role" key={role.name}>
            <strong>{role.name}</strong>
            <span>{role.role}</span>
            <p>{role.detail}</p>
          </article>
        ))}
      </div>

      <div className="elion-identity-evidence">
        <div className="elion-identity-evidence-heading">
          <div>
            <span className="elion-identity-kicker">NOW · VIEW-LOCAL SIGNALS</span>
            <p>Only evidence supplied to this screen is summarized; missing state stays UNKNOWN.</p>
          </div>
          <span>Ω∞v</span>
        </div>
        <div className="elion-identity-signals">
          {signals.map((signal) => (
            <div className="elion-identity-signal" data-status={signal.status} key={signal.label}>
              <div>
                <strong>{signal.label}</strong>
                <small>{signal.source}</small>
              </div>
              <b>{signal.status}</b>
            </div>
          ))}
        </div>
      </div>

      <footer className="elion-identity-footer">
        <p>UI presence is not proof of backend integration, consciousness, deployment, or whole-system health.</p>
        <button
          type="button"
          onClick={() => props.onFocusCommand(
            'Plan the next bounded ELION × LUCID integration slice. Inspect the current UI and tests, preserve human authorization, and keep unobserved runtime state UNKNOWN.'
          )}
        >
          PLAN NEXT Δ
        </button>
      </footer>
    </section>
  );
}

export default ElionIdentityPanel;
