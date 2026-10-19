import React, { useState } from 'react';
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
  onEvaluateMoodPipeline?: (payload: { signal: string; status?: string; consequential?: boolean }) => Promise<any>;
  keyPair: KeyPair | null;
  onGenerateWebCrypto: () => void;
  onGenerateServerKeys: () => void;
  signRequests: boolean;
  onSetSignRequests: (v: boolean) => void;
}

export function SystemControlsPanel(props: SystemControlsPanelProps) {
  const [pipelineSignal, setPipelineSignal] = useState('ecosystem-self-observation');
  const [pipelineStatus, setPipelineStatus] = useState('OBSERVED');
  const [pipelineConsequential, setPipelineConsequential] = useState(false);
  const [evaluatingPipeline, setEvaluatingPipeline] = useState(false);
  const [pipelineResult, setPipelineResult] = useState<any>(null);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
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

      {/* Proactive Mood & Matrix Fusion */}
      {props.moodData && (
        <div style={cardStyle}>
          <div style={{ ...cardTitleStyle, color: theme.accentWarm, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              {props.moodData.status === 'PROACTIVE_SELF_SENSING' || props.moodData.status === 'MAX GOOD-O'
                ? 'Proactive Self-Sensing Mood Matrix'
                : `Mood · ${props.moodData.singularityState || 'Active'}`}
            </span>
            <span style={{ fontSize: '10px', color: theme.accent, border: `1px solid ${theme.borderBright}`, padding: '2px 6px', borderRadius: '4px' }}>
              contract: {props.moodData.contract || 'v∞'}
            </span>
          </div>

          {props.moodData.moodEngine ? (
            <div style={{ fontSize: '11px', color: theme.textMuted, lineHeight: 1.6, fontFamily: theme.fontMono }}>
              <div>Context: <span style={{ color: theme.accentWarm, fontWeight: 'bold' }}>{props.moodData.moodEngine.context}</span> (Uncertainty: {(props.moodData.moodEngine.uncertainty * 100).toFixed(1)}%)</div>
              <div>Matrix Decision: <span style={{ color: props.moodData.moodMatrix?.decision === 'VERIFIED' ? theme.verified : theme.divergent, fontWeight: 'bold' }}>{props.moodData.moodMatrix?.decision || 'UNKNOWN'}</span></div>
              <div>Tensor Frobenius Norm: <span style={{ color: theme.accent }}>{props.moodData.moodMatrix?.frobeniusNorm}</span></div>
              <div>Singularity Protected: <span style={{ color: props.moodData.moodMatrix?.singularityPrevented ? theme.verified : theme.divergent }}>{props.moodData.moodMatrix?.singularityPrevented ? 'YES' : 'NO'}</span></div>
              <div>Safety Gate: <span style={{ color: props.moodData.moodEngine.safetyGate === 'ALLOW' ? theme.verified : theme.divergent }}>{props.moodData.moodEngine.safetyGate}</span></div>
              <div>Adaptation: {props.moodData.moodEngine.adaptation?.tone} · {props.moodData.moodEngine.adaptation?.pacing} · {props.moodData.moodEngine.adaptation?.density}</div>
              <div style={{ marginTop: '6px', fontSize: '10px', color: theme.textDim, wordBreak: 'break-all' }}>
                Proof Hash: {props.moodData.moodMatrix?.proofHash}
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: '12px', color: theme.textMuted, marginBottom: '8px' }}>
                Reality: {props.moodData.reality || 'Consensus'} · Wave {props.moodData.waveIndex ?? 0}
              </div>
              {props.moodData.pidginSpirit && (
                <div
                  style={{
                    padding: '10px 14px',
                    background: theme.surfaceDeep,
                    borderRadius: theme.radiusSmall,
                    fontStyle: 'italic',
                    borderLeft: `3px solid ${theme.accentWarm}`,
                    fontSize: '12px',
                    color: theme.text,
                  }}
                >
                  "{props.moodData.pidginSpirit}"
                </div>
              )}
            </>
          )}

          {/* Interactive Mood Pipeline Dispatcher */}
          {props.onEvaluateMoodPipeline && (
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: `1px dashed ${theme.borderBright}` }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: theme.text, marginBottom: '8px' }}>
                Simulate & Dispatch Mood Pipeline (POST /v1/mood/pipeline)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  value={pipelineSignal}
                  onChange={(e) => setPipelineSignal(e.target.value)}
                  placeholder="Signal identifier (e.g. USER_OVERRIDE)"
                  style={{
                    flex: '1 1 200px',
                    padding: '6px 10px',
                    background: theme.surfaceDeep,
                    border: `1px solid ${theme.borderBright}`,
                    borderRadius: theme.radiusSmall,
                    color: theme.text,
                    fontSize: '11px',
                    fontFamily: theme.fontMono,
                  }}
                />
                <select
                  value={pipelineStatus}
                  onChange={(e) => setPipelineStatus(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    background: theme.surfaceDeep,
                    border: `1px solid ${theme.borderBright}`,
                    borderRadius: theme.radiusSmall,
                    color: theme.text,
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  <option value="OBSERVED">OBSERVED</option>
                  <option value="USER_STATED">USER_STATED</option>
                  <option value="INFERRED">INFERRED</option>
                </select>
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    color: theme.textMuted,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={pipelineConsequential}
                    onChange={(e) => setPipelineConsequential(e.target.checked)}
                    style={{ accentColor: theme.accentWarm }}
                  />
                  Consequential Action (Safety Gate Invariant)
                </label>
              </div>

              {/* Quick Presets */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                <span style={{ fontSize: '10px', color: theme.textDim, alignSelf: 'center' }}>Presets:</span>
                {[
                  { label: 'Ecosystem Self-Sense', signal: 'ecosystem-self-observation', status: 'OBSERVED', consequential: false },
                  { label: 'User Stated Priority', signal: 'user-stated-priority-signal', status: 'USER_STATED', consequential: false },
                  { label: 'Uncertain Telemetry', signal: 'divergent-telemetry-fluctuation', status: 'INFERRED', consequential: false },
                  { label: 'Consequential Gate Test', signal: 'high-stakes-vault-operation', status: 'USER_STATED', consequential: true },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setPipelineSignal(preset.signal);
                      setPipelineStatus(preset.status);
                      setPipelineConsequential(preset.consequential);
                    }}
                    style={{
                      padding: '3px 7px',
                      fontSize: '10px',
                      background: theme.surfaceRaised,
                      border: `1px solid ${theme.border}`,
                      borderRadius: theme.radiusSmall,
                      color: theme.textMuted,
                      cursor: 'pointer',
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={async () => {
                    setEvaluatingPipeline(true);
                    setPipelineError(null);
                    try {
                      const res = await props.onEvaluateMoodPipeline!({
                        signal: pipelineSignal,
                        status: pipelineStatus,
                        consequential: pipelineConsequential,
                      });
                      setPipelineResult(res);
                    } catch (err: any) {
                      setPipelineError(err?.message || 'Pipeline evaluation error');
                    } finally {
                      setEvaluatingPipeline(false);
                    }
                  }}
                  disabled={evaluatingPipeline || !pipelineSignal.trim()}
                  style={btnStyle(theme.surfaceRaised, evaluatingPipeline || !pipelineSignal.trim(), theme.accentWarm)}
                >
                  {evaluatingPipeline ? 'Evaluating Pipeline…' : '⚡ Evaluate Signal Pipeline'}
                </button>
                {pipelineResult?.moodMatrix && (
                  <span style={{ fontSize: '10px', color: theme.verified, fontFamily: theme.fontMono }}>
                    ✓ Evaluated: Decision={pipelineResult.moodMatrix.decision} (Gate={pipelineResult.pipeline?.safetyGate?.admissionResult})
                  </span>
                )}
                {pipelineError && (
                  <span style={{ fontSize: '10px', color: theme.divergent }}>
                    ✗ {pipelineError}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
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
