import React from 'react';

type LayerSnapshot = { status?: string };
type BodySnapshot = {
  bodyVersion?: string;
  status?: string;
  layers?: Record<string, LayerSnapshot>;
  expansion?: {
    bounded?: boolean;
    readOnly?: boolean;
    appendOnly?: boolean;
  };
};

type Props = {
  body: BodySnapshot | null;
  apiReachable: boolean | null;
  streamConnected: boolean;
  ledgerIntegrity: { valid: boolean; height: number } | null;
  miningActive: boolean;
  moodStatus: string;
  humanGateRequired: boolean;
  backgroundWorkspaceOpen: boolean;
  onToggleBackgroundWorkspace: () => void;
};

function observedLabel(value: string | undefined): string {
  return value?.trim() || 'UNKNOWN';
}

export function FrontierOverview({
  body,
  apiReachable,
  streamConnected,
  ledgerIntegrity,
  miningActive,
  moodStatus,
  humanGateRequired,
  backgroundWorkspaceOpen,
  onToggleBackgroundWorkspace,
}: Props) {
  const layers = Object.entries(body?.layers ?? {});
  const bodyStatus = observedLabel(body?.status);
  const connection = streamConnected
    ? 'Stream connected'
    : apiReachable === true
      ? 'REST reachable · SSE pending'
      : apiReachable === false
        ? 'API route unavailable'
        : 'Checking';
  const connectionNote = streamConnected
    ? 'Event stream observed'
    : apiReachable === true
      ? 'REST route seen; stream not observed'
      : 'Current route state';
  const ledgerValue = ledgerIntegrity ? `Height ${ledgerIntegrity.height}` : 'Awaiting observation';
  const ledgerNote = ledgerIntegrity
    ? ledgerIntegrity.valid ? 'Integrity check passed' : 'Integrity needs review'
    : 'Ledger state not yet observed';
  const bodyBounds = body?.expansion?.bounded && body.expansion.readOnly && body.expansion.appendOnly
    ? 'bounded · read-only · append-only'
    : 'body limits UNKNOWN';

  return (
    <section className="frontier-overview" aria-label="Compressed whole ecosystem front view">
      <header className="frontier-overview-header">
        <div className="frontier-title">
          <span className="frontier-kicker">FRONTIER VIEW · OCEAN / BACKEND</span>
          <h2>Whole ecosystem · current signals</h2>
          <p className="frontier-governance">
            Mood {observedLabel(moodStatus)} · {humanGateRequired ? 'human gate required' : 'authority state unknown'}
          </p>
        </div>
        <div className="frontier-actions">
          <span className="frontier-body-status" data-status={bodyStatus}>
            BODY · {bodyStatus}
          </span>
          <button
            type="button"
            className="frontier-background-toggle"
            aria-expanded={backgroundWorkspaceOpen}
            aria-controls="background-full-stack-workspace"
            onClick={onToggleBackgroundWorkspace}
          >
            {backgroundWorkspaceOpen ? 'Close background full-stack' : 'Open background full-stack'}
          </button>
        </div>
      </header>

      <div className="frontier-readouts" aria-label="Current API observations">
        <div className="frontier-readout">
          <span>CONNECTION</span>
          <strong>{connection}</strong>
          <small>{connectionNote}</small>
        </div>
        <div className="frontier-readout">
          <span>BODY</span>
          <strong>{layers.length ? `${layers.length} layers` : 'Not observed'}</strong>
          <small>{body?.bodyVersion ?? 'Awaiting body snapshot'}</small>
        </div>
        <div className="frontier-readout">
          <span>MEMORY · LEDGER</span>
          <strong>{ledgerValue}</strong>
          <small>{ledgerNote}</small>
        </div>
        <div className="frontier-readout">
          <span>BACKGROUND · MINER</span>
          <strong>{miningActive ? 'Active' : 'Idle'}</strong>
          <small>{miningActive ? 'Runtime reports mining active' : 'No mining task observed as active'}</small>
        </div>
      </div>

      <div className="frontier-layer-row" aria-label="API-reported body layers">
        {layers.length > 0 ? layers.map(([name, layer]) => (
          <span className="frontier-layer-chip" key={name} title={`${name}: ${observedLabel(layer.status)}`}>
            {name}
          </span>
        )) : <span className="frontier-layer-empty">Layer map unavailable · status remains UNKNOWN</span>}
      </div>

      <p className="frontier-boundary-note">
        API signals only · not an external-world scan · {bodyBounds}
      </p>
    </section>
  );
}
