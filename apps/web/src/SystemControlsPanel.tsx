import { useState } from 'react';
import { theme, statusColor, humanStatus, KeyPair, MeshConvergenceReceipt } from './oceanicosTheme';

/*
 * SystemControlsPanel — the machinery, one level deeper.
 *
 * This is the "System Controls" deep section: mining, mesh consensus,
 * attestation, mood, cryptographic identity. These are the primitives the
 * frontier surface hides. They remain fully functional — just not on the
 * home screen.
 */

interface SystemControlsPanelProps {
  onCycle: () => void;
  cycleLoading: boolean;
  minerActive: boolean;
  minerInterval: number;
  onToggleMiner: () => void;
  onSetMinerInterval: (v: number) => void;
  meshSimulation: MeshConvergenceReceipt | null;
  meshLoading: boolean;
  onRunMesh: () => void;
  attestationData: any;
  attestLoading: boolean;
  onRequestAttestation: () => void;
  moodData: any;
  onFetchMood: () => void;
  onSubmitMoodSignal: (signal: string) => Promise<any>;
  keyPair: KeyPair | null;
  onGenerateWebCrypto: () => void;
  onGenerateServerKeys: () => void;
  signRequests: boolean;
  onSetSignRequests: (v: boolean) => void;
}

export function SystemControlsPanel(props: SystemControlsPanelProps) {
  return (
    <div
      style={{
        padding: '20px 22px',
        fontFamily: theme.fontSans,
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* Control buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        <button
          onClick={props.onCycle}
          disabled={props.cycleLoading}
          style={btnStyle(theme.accent, props.cycleLoading)}
        >
          {props.cycleLoading ? 'Mining…' : '⚡ Execute cycle'}
        </button>
        <button
          onClick={props.onToggleMiner}
          style={btnStyle(props.minerActive ? theme.warning : theme.surfaceRaised, false, props.minerActive ? theme.warning : theme.accent)}
        >
          {props.minerActive ? '⏹ Stop auto-miner' : '▶ Start auto-miner'}
          {props.minerActive && (
            <span style={{ fontSize: '10px', marginLeft: '4px', opacity: 0.7 }}>
              ({props.minerInterval / 1000}s)
            </span>
          )}
        </button>
        {!props.minerActive && (
          <select
            value={props.minerInterval}
            onChange={(e) => props.onSetMinerInterval(Number(e.target.value))}
            style={selectStyle}
          >
            <option value={2000}>2.0s</option>
            <option value={5000}>5.0s</option>
            <option value={10000}>10.0s</option>
          </select>
        )}
        <button
          onClick={props.onRunMesh}
          disabled={props.meshLoading}
          style={btnStyle(theme.surfaceRaised, props.meshLoading, '#38bdf8')}
        >
          {props.meshLoading ? 'Converging…' : '🌐 Mesh consensus'}
        </button>
        <button
          onClick={props.onRequestAttestation}
          disabled={props.attestLoading}
          style={btnStyle(theme.surfaceRaised, props.attestLoading, '#c084fc')}
        >
          {props.attestLoading ? 'Attesting…' : '📜 Attestation'}
        </button>
        <button
          onClick={props.onFetchMood}
          style={btnStyle(theme.surfaceRaised, false, theme.accentWarm)}
        >
          ✨ Mood
        </button>
        <button
          onClick={props.onGenerateWebCrypto}
          style={btnStyle(theme.surfaceRaised, false, '#86efac')}
        >
          🛡 WebCrypto key
        </button>
        <button
          onClick={props.onGenerateServerKeys}
          style={btnStyle(theme.surfaceRaised, false, theme.accent)}
        >
          🔑 Ed25519 key
        </button>
      </div>

      {/* Asymmetric seal toggle */}
      {props.keyPair && (
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: theme.accent,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={props.signRequests}
            onChange={(e) => props.onSetSignRequests(e.target.checked)}
            style={{ accentColor: theme.accent }}
          />
          Asymmetric seal active
        </label>
      )}

      {/* Key info */}
      {props.keyPair && (
        <div style={cardStyle}>
          <div style={cardTitleStyle}>Identity · {props.keyPair.type}</div>
          <pre
            style={{
              margin: '8px 0 0',
              padding: '10px',
              background: theme.surfaceDeep,
              border: `1px solid ${theme.border}`,
              borderRadius: theme.radiusSmall,
              fontSize: '9px',
              fontFamily: theme.fontMono,
              color: theme.textDim,
              overflowX: 'auto',
              maxHeight: '80px',
            }}
          >
            {props.keyPair.publicKey}
          </pre>
        </div>
      )}

      {/* Mesh convergence results */}
      {props.meshSimulation && (
        <div style={cardStyle}>
          <div style={{ ...cardTitleStyle, color: '#38bdf8' }}>
            Mesh convergence · {humanStatus(props.meshSimulation.effectiveStatus)}
          </div>
          <div style={{ fontSize: '11px', color: theme.textMuted, marginBottom: '10px' }}>
            Quorum: {props.meshSimulation.quorumReached ? 'reached' : 'not reached'} ·{' '}
            {props.meshSimulation.participatingNodes} nodes
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '8px',
            }}
          >
            {props.meshSimulation.votes.map((vote) => {
              const c = statusColor(vote.verdict);
              return (
                <div
                  key={vote.nodeId}
                  style={{
                    padding: '8px 10px',
                    background: theme.surfaceDeep,
                    border: `1px solid ${c}33`,
                    borderRadius: theme.radiusSmall,
                    fontSize: '11px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ color: theme.text }}>{vote.nodeId}</strong>
                    <span style={{ color: c, fontWeight: 700 }}>{vote.verdict}</span>
                  </div>
                  <div style={{ color: theme.textDim, fontSize: '10px', marginTop: '2px' }}>
                    {vote.region} · {vote.latencyMs}ms
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Attestation receipt */}
      {props.attestationData && (
        <div style={cardStyle}>
          <div style={{ ...cardTitleStyle, color: '#c084fc' }}>
            Attestation receipt · {props.attestationData.signingAlgorithm}
          </div>
          <div style={{ fontSize: '11px', color: theme.textMuted, lineHeight: 1.6, fontFamily: theme.fontMono }}>
            <div>Verified: <span style={{ color: props.attestationData.verified ? theme.verified : theme.divergent }}>{props.attestationData.verified ? 'YES' : 'NO'}</span></div>
            <div>Confidence: {(props.attestationData.confidence * 100).toFixed(0)}%</div>
            <div style={{ marginTop: '6px', wordBreak: 'break-all', color: theme.textDim }}>
              {props.attestationData.signature}
            </div>
          </div>
        </div>
      )}

      {/* Mood — governed autopilot (MOOD → EXPERIENCE, Ω∞v → REALITY, AUTHORITY → ACTION) */}
      {props.moodData && (
        <MoodCard moodData={props.moodData} onSubmit={props.onSubmitMoodSignal} />
      )}
    </div>
  );
}

/* ── Mood — governed autopilot card (section 15) ── */

function MoodCard({ moodData, onSubmit }: { moodData: any; onSubmit: (signal: string) => Promise<any> }) {
  const [signalText, setSignalText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const ap = moodData.autopilot;
  const memoryEntries = ap?.memory?.entries ?? [];
  const latestSignal = memoryEntries[memoryEntries.length - 1];

  const handleSubmit = async () => {
    if (!signalText.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(signalText);
      setSignalText('');
    } finally {
      setSubmitting(false);
    }
  };

  const lawBadges = [
    { label: 'MOOD ≠ AUTHORITY', ok: ap?.coreLaw?.moodNotAuthority },
    { label: 'MOOD ≠ TRUTH', ok: ap?.coreLaw?.moodNotTruth },
    { label: 'INFERENCE ≠ FACT', ok: ap?.coreLaw?.inferenceNotFact },
  ];

  return (
    <div style={cardStyle}>
      <div style={{ ...cardTitleStyle, color: theme.accentWarm }}>
        🔥 Mood · AUTO L{ap?.level ?? 0} · {ap?.levelLabel ?? 'PASSIVE'} · {ap?.state ?? 'UNKNOWN'}
      </div>
      <div style={{ fontSize: '12px', color: theme.textMuted, marginBottom: '10px' }}>
        {moodData.reality} · Wave {moodData.waveIndex} · Memory {ap?.memory?.count ?? 0}
        {ap?.multiAgent?.dissent ? ' · Dissent preserved' : ''}
      </div>

      {/* Core law — mood never becomes authority */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
        {lawBadges.map((badge) => (
          <span
            key={badge.label}
            style={{
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              padding: '3px 7px',
              borderRadius: '4px',
              background: badge.ok ? `${theme.verified}14` : `${theme.divergent}14`,
              color: badge.ok ? theme.verified : theme.divergent,
              border: `1px solid ${badge.ok ? theme.verified : theme.divergent}33`,
            }}
          >
            {badge.label}
          </span>
        ))}
      </div>

      {/* Latest observed signal + bounded proposal */}
      {latestSignal && (
        <div
          style={{
            padding: '10px 12px',
            background: theme.surfaceDeep,
            borderRadius: theme.radiusSmall,
            borderLeft: `3px solid ${theme.accentWarm}`,
            fontSize: '11px',
            color: theme.text,
            marginBottom: '10px',
            lineHeight: 1.6,
          }}
        >
          <div style={{ color: theme.textDim, fontSize: '10px', marginBottom: '4px' }}>
            Signal · {latestSignal.status} · {latestSignal.source}
          </div>
          <div style={{ marginBottom: '6px' }}>"{latestSignal.signal}"</div>
          <div style={{ color: theme.textMuted, fontSize: '10px' }}>
            Adaptation: <span style={{ color: theme.accentWarm }}>{ap.proposal.adaptation.replace(/_/g, ' ')}</span>
            {' · '}Authority: <span style={{ color: theme.verified }}>unchanged</span>
          </div>
          {latestSignal.userCorrection && (
            <div style={{ color: theme.divergent, fontSize: '10px', marginTop: '4px' }}>
              Corrected: {latestSignal.userCorrection}
            </div>
          )}
        </div>
      )}

      {/* ƆREADE / language-spirit */}
      <div
        style={{
          padding: '10px 14px',
          background: theme.surfaceDeep,
          borderRadius: theme.radiusSmall,
          fontStyle: 'italic',
          borderLeft: `3px solid ${theme.accentDim}`,
          fontSize: '12px',
          color: theme.textMuted,
          marginBottom: '12px',
        }}
      >
        "{moodData.pidginSpirit}"
      </div>

      {/* Observe a USER_STATED mood signal (bounded: experience only) */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          value={signalText}
          onChange={(e) => setSignalText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          placeholder="Tell the system how to respond (e.g. keep it short)…"
          style={{
            flex: 1,
            padding: '9px 12px',
            background: theme.surfaceDeep,
            border: `1px solid ${theme.borderBright}`,
            borderRadius: theme.radiusSmall,
            color: theme.text,
            fontFamily: theme.fontSans,
            fontSize: '12px',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={submitting || !signalText.trim()}
          style={btnStyle(theme.accentWarm, submitting || !signalText.trim(), theme.surfaceDeep)}
        >
          {submitting ? 'Observing…' : 'Observe'}
        </button>
      </div>
    </div>
  );
}

/* ── Styles ── */

const btnStyle = (
  bg: string,
  disabled: boolean,
  text?: string
): React.CSSProperties => ({
  padding: '9px 16px',
  borderRadius: theme.radiusSmall,
  border: `1px solid ${theme.borderBright}`,
  background: bg,
  color: text || theme.text,
  fontFamily: theme.fontSans,
  fontSize: '12px',
  fontWeight: 600,
  cursor: disabled ? 'wait' : 'pointer',
  opacity: disabled ? 0.5 : 1,
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  transition: 'opacity 0.2s',
});

const selectStyle: React.CSSProperties = {
  background: theme.surfaceDeep,
  color: theme.textMuted,
  border: `1px solid ${theme.borderBright}`,
  borderRadius: theme.radiusSmall,
  padding: '8px 10px',
  fontSize: '12px',
  fontFamily: theme.fontSans,
  cursor: 'pointer',
};

const cardStyle: React.CSSProperties = {
  padding: '14px 16px',
  background: theme.surfaceDeep,
  border: `1px solid ${theme.border}`,
  borderRadius: theme.radiusSmall,
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 700,
  marginBottom: '8px',
};
