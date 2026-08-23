import { useState, useEffect, useCallback } from 'react';
import './App.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EvidenceStep {
  step: number;
  rule: string;
  passed: boolean;
  reasoning: string;
  value?: unknown;
}

interface LogEntry {
  id: number;
  type: 'OBSERVATION' | 'VERIFICATION' | 'ATTESTATION';
  recordedAt: string;
  hash: string;
  previousHash: string;
  data: {
    // Observation fields
    claim?: { statement: string; category: string };
    confidence?: number;
    // Verification fields
    summary?: { passed: boolean; rulesApplied: number; rulesPassed: number };
    evidencePath?: EvidenceStep[];
    // Attestation fields
    verified?: boolean;
    signature?: string;
    signingAlgorithm?: string;
    attestedAt?: string;
  };
}

interface Metrics {
  totalObservations: number;
  totalVerifications: number;
  totalAttestations: number;
  successRate: number;
  systemConfidence: number;
}

interface MoodData {
  state: string;
  confidence: number;
  uncertainty: number;
  verificationHealth: number;
  evidenceQuality: number;
  errorRate: number;
  dissentCount: number;
  description: string;
  evaluatedAt: string;
}

interface FrictionItem {
  id: string;
  category: string;
  source: string;
  description: string;
  severity: string;
  status: string;
  recordedAt: string;
}

interface DissentItem {
  id: string;
  claimId: string;
  status: string;
  recordedAt: string;
  interpretations: { position: string; source: string; confidence: number }[];
}

interface GreenData {
  isGreen: boolean;
  allChecksPassed: boolean;
  evidenceExists: boolean;
  lineageExists: boolean;
  attestationExists: boolean;
  noCriticalFailures: boolean;
  reason: string;
  evaluatedAt: string;
}

interface GovernanceData {
  rules: {
    id: string;
    action: string;
    requiresHumanApproval: boolean;
    minimumConfidenceThreshold: number;
    maximumRiskThreshold: number;
    active: boolean;
  }[];
  failClosed: boolean;
}

interface LearningData {
  insights: { description: string; confidence: number; learnedAt: string }[];
  historyCount: number;
}

const MOOD_ICONS: Record<string, string> = {
  OPTIMAL_FLOW: '🌊',
  HIGH_INTEGRITY: '💎',
  EVIDENCE_SEARCH: '🔍',
  FRICTION_DETECTED: '⚡',
  RECOMPILING: '🔄',
};

const MOOD_COLORS: Record<string, string> = {
  OPTIMAL_FLOW: '#38b2ac',
  HIGH_INTEGRITY: '#9f7aea',
  EVIDENCE_SEARCH: '#ed8936',
  FRICTION_DETECTED: '#fc8181',
  RECOMPILING: '#63b3ed',
};

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = 'http://localhost:3000';
const POLL_INTERVAL = 3000;

// ─── Components ───────────────────────────────────────────────────────────────

function EntryIcon({ type, data }: { type: string; data: LogEntry['data'] }) {
  if (type === 'OBSERVATION') return <div className="entry-icon observation">👁</div>;
  if (type === 'VERIFICATION')
    return (
      <div
        className={`entry-icon ${data.summary?.passed ? 'verification-pass' : 'verification-fail'}`}
      >
        {data.summary?.passed ? '✓' : '✗'}
      </div>
    );
  return <div className="entry-icon attestation">🔏</div>;
}

function TimelineEntry({ entry }: { entry: LogEntry }) {
  const time = new Date(entry.recordedAt).toLocaleTimeString();
  const isFailed = entry.type === 'VERIFICATION' && !entry.data.summary?.passed;

  return (
    <div className="timeline-entry">
      <EntryIcon type={entry.type} data={entry.data} />
      <div className="entry-body">
        <div className="entry-header">
          <span className={`entry-type ${entry.type}${isFailed ? ' failed' : ''}`}>
            {entry.type}
          </span>
          <span className="entry-id">#{entry.id}</span>
          <span className="entry-timestamp">{time}</span>
        </div>

        {entry.type === 'OBSERVATION' && entry.data.claim && (
          <>
            <div className="entry-claim">{entry.data.claim.statement}</div>
            <div className="entry-details">
              <span className="entry-detail">
                <strong>Category:</strong> {entry.data.claim.category}
              </span>
              <span className="entry-detail">
                <strong>Confidence:</strong> {((entry.data.confidence ?? 0) * 100).toFixed(0)}%
              </span>
            </div>
          </>
        )}

        {entry.type === 'VERIFICATION' && entry.data.summary && (
          <>
            <div className="entry-claim">
              {entry.data.summary.passed ? 'Verification PASSED' : 'Verification FAILED'}
            </div>
            <div className="entry-details">
              <span className="entry-detail">
                <strong>Rules:</strong> {entry.data.summary.rulesPassed}/
                {entry.data.summary.rulesApplied} passed
              </span>
            </div>
            {entry.data.evidencePath && (
              <div className="evidence-pills">
                {entry.data.evidencePath.map((s: EvidenceStep, i: number) => (
                  <span key={i} className={`evidence-pill ${s.passed ? 'pass' : 'fail'}`}>
                    {s.passed ? '✓' : '✗'} {s.rule}
                  </span>
                ))}
              </div>
            )}
          </>
        )}

        {entry.type === 'ATTESTATION' && (
          <>
            <div className="entry-claim">
              {entry.data.verified ? 'Attested & Signed' : 'Attestation Rejected'}
            </div>
            <div className="entry-details">
              <span className="entry-detail">
                <strong>Algorithm:</strong> {entry.data.signingAlgorithm}
              </span>
            </div>
            {entry.data.signature && <span className="signature-chip">{entry.data.signature}</span>}
          </>
        )}

        <div className="entry-detail" style={{ marginTop: 4 }}>
          <strong>Hash:</strong>&nbsp;
          <span
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.68rem',
              color: '#475569',
            }}
          >
            {entry.hash.slice(0, 18)}…
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export function App(): JSX.Element {
  const [claim, setClaim] = useState('Ω∞v Oceanicos core loop is operational');
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [chainIntegrity, setChainIntegrity] = useState<{ valid: boolean } | null>(null);
  const [apiOnline, setApiOnline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mood, setMood] = useState<MoodData | null>(null);
  const [frictionList, setFrictionList] = useState<FrictionItem[]>([]);
  const [dissentList, setDissentList] = useState<DissentItem[]>([]);
  const [greenState, setGreenState] = useState<GreenData | null>(null);
  const [governanceData, setGovernanceData] = useState<GovernanceData | null>(null);
  const [learningData, setLearningData] = useState<LearningData | null>(null);

  // ── Poll log + metrics ──
  const fetchState = useCallback(async () => {
    try {
      const [logRes, metricsRes, moodRes, frictionRes, dissentRes, greenRes, govRes, learnRes] =
        await Promise.all([
          fetch(`${API_BASE}/log?limit=30`),
          fetch(`${API_BASE}/metrics`),
          fetch(`${API_BASE}/mood`),
          fetch(`${API_BASE}/friction`),
          fetch(`${API_BASE}/dissent`),
          fetch(`${API_BASE}/green`),
          fetch(`${API_BASE}/governance`),
          fetch(`${API_BASE}/learning`),
        ]);
      if (!logRes.ok || !metricsRes.ok) throw new Error('API error');

      const logData = await logRes.json();
      const metricsData = await metricsRes.json();

      // Reverse so newest is on top
      setLog([...(logData.data.events as LogEntry[])].reverse());
      setMetrics(metricsData.data.metrics as Metrics);
      setChainIntegrity(logData.data.integrity);
      setApiOnline(true);
      setError(null);

      if (moodRes.ok) setMood((await moodRes.json()).data as MoodData);
      if (frictionRes.ok) setFrictionList((await frictionRes.json()).data.events as FrictionItem[]);
      if (dissentRes.ok) setDissentList((await dissentRes.json()).data.records as DissentItem[]);
      if (greenRes.ok) setGreenState((await greenRes.json()).data as GreenData);
      if (govRes.ok) setGovernanceData((await govRes.json()).data as GovernanceData);
      if (learnRes.ok) setLearningData((await learnRes.json()).data as LearningData);
    } catch {
      setApiOnline(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
    const id = setInterval(fetchState, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchState]);

  // ── Execute loop ──
  const [swarmLoading, setSwarmLoading] = useState(false);
  const [swarmResult, setSwarmResult] = useState<any | null>(null);

  const runLoop = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/complete-loop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claim,
          category: 'health-check',
          source: { system: 'web-dashboard', version: '0.1.0', environment: 'production' },
          observedBy: 'user',
          metadata: { statusCode: 200, responseTime: Math.round(20 + Math.random() * 60) },
          confidence: 0.97,
          confidenceReason: 'Manual verification via dashboard',
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reach API');
    } finally {
      setLoading(false);
    }
  };

  const runSwarm = async () => {
    setSwarmLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/swarm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claim,
          ruleName: 'dashboard-swarm-rule',
          ruleDefinition: 'responseTime < 100',
          metadata: { responseTime: Math.round(15 + Math.random() * 40) },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSwarmResult(data.data);
      await fetchState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute Swarm');
    } finally {
      setSwarmLoading(false);
    }
  };

  const successPct = metrics ? (metrics.successRate * 100).toFixed(0) : '—';
  const confPct = metrics ? (metrics.systemConfidence * 100).toFixed(0) : '—';

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-brand">
          <div>
            <div className="header-logo">Ω∞v Oceanicos</div>
            <div className="header-subtitle">Verification-First Intelligence Platform</div>
          </div>
        </div>
        <div className="header-status">
          <span
            className={`status-dot${apiOnline ? '' : ' offline'}`}
            style={!apiOnline ? { background: '#fc8181', boxShadow: '0 0 8px #fc8181' } : {}}
          />
          {apiOnline ? 'API Online' : 'API Offline'}
        </div>
      </header>

      {/* ── Main ── */}
      <main className="main">
        {/* Control Panel */}
        <aside className="panel">
          <div>
            <div className="panel-title">Verification Loop</div>
            <div className="loop-indicator" style={{ marginTop: 12 }}>
              <div>Observe</div>
              <div className="arrow"> ↓</div>
              <div>Verify</div>
              <div className="arrow"> ↓</div>
              <div>Attest</div>
              <div className="arrow"> ↓</div>
              <div>Record</div>
              <div className="arrow"> ↓</div>
              <div>Learn → ∞</div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="claim-input">
              Claim to Observe
            </label>
            <input
              id="claim-input"
              className="form-input"
              type="text"
              value={claim}
              onChange={(e) => setClaim(e.target.value)}
              placeholder="Enter a claim to verify…"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              id="run-loop-btn"
              className={`btn-run${loading ? ' running' : ''}`}
              onClick={runLoop}
              disabled={loading || swarmLoading || !apiOnline || !claim.trim()}
            >
              {loading ? '⟳  Executing Loop…' : '▶  Run Single Verification'}
            </button>

            <button
              id="run-swarm-btn"
              className={`btn-run${swarmLoading ? ' running' : ''}`}
              style={{ background: 'linear-gradient(135deg, var(--accent-secondary), #805ad5)' }}
              onClick={runSwarm}
              disabled={loading || swarmLoading || !apiOnline || !claim.trim()}
            >
              {swarmLoading ? '⚡ Executing 5-Agent Swarm…' : '🐝 Run Formless Swarm (5-Agent)'}
            </button>
          </div>

          {error && (
            <div
              style={{
                fontSize: '0.8rem',
                color: 'var(--accent-red)',
                padding: '10px 14px',
                background: 'rgba(252,129,129,0.06)',
                border: '1px solid rgba(252,129,129,0.2)',
                borderRadius: 8,
              }}
            >
              ✗ {error}
            </div>
          )}

          {chainIntegrity && (
            <div className="integrity-bar">
              <span className="dot" />
              Chain integrity: {chainIntegrity.valid ? 'VALID' : 'BROKEN'}
            </div>
          )}
        </aside>

        {/* Right Column */}
        <section>
          {/* Metrics */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">Observations</div>
              <div className="metric-value">{metrics?.totalObservations ?? '—'}</div>
              <div className="metric-sub">Total captured</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Verifications</div>
              <div className="metric-value">{metrics?.totalVerifications ?? '—'}</div>
              <div className="metric-sub">Rules executed</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Success Rate</div>
              <div className="metric-value">{successPct}%</div>
              <div className="metric-sub">Passed verifications</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Confidence</div>
              <div className="metric-value">{confPct}%</div>
              <div className="metric-sub">System confidence</div>
            </div>
          </div>

          {/* ── Mood Indicator (Pillar 19) ── */}
          {mood && (
            <div
              className="mood-card"
              style={{ borderColor: MOOD_COLORS[mood.state] || '#38b2ac' }}
            >
              <div className="mood-header">
                <span className="mood-icon">{MOOD_ICONS[mood.state] || '💧'}</span>
                <span
                  className="mood-state"
                  style={{ color: MOOD_COLORS[mood.state] || '#38b2ac' }}
                >
                  {mood.state.replace(/_/g, ' ')}
                </span>
                <span className="mood-confidence">
                  {(mood.confidence * 100).toFixed(0)}% confidence
                </span>
              </div>
              <div className="mood-desc">{mood.description}</div>
              <div className="mood-dims">
                <span>Health: {(mood.verificationHealth * 100).toFixed(0)}%</span>
                <span>Evidence: {(mood.evidenceQuality * 100).toFixed(0)}%</span>
                <span>Error: {(mood.errorRate * 100).toFixed(1)}%</span>
                <span>Uncertainty: {(mood.uncertainty * 100).toFixed(0)}%</span>
                {mood.dissentCount > 0 && (
                  <span style={{ color: '#ed8936' }}>Dissent: {mood.dissentCount}</span>
                )}
              </div>
            </div>
          )}

          {/* ── GREEN Rule Evaluation Banner (Pillar 25) ── */}
          {greenState && (
            <div
              style={{
                background: greenState.isGreen
                  ? 'rgba(56, 178, 172, 0.08)'
                  : 'rgba(237, 137, 54, 0.08)',
                border: `1px solid ${greenState.isGreen ? 'var(--accent-green)' : 'var(--accent-amber)'}`,
                borderRadius: 'var(--radius)',
                padding: 16,
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    color: greenState.isGreen ? 'var(--accent-green)' : 'var(--accent-amber)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span>
                    {greenState.isGreen
                      ? '🟢 SYSTEM STATE: GREEN (Pillar 25 Verified)'
                      : '🟠 SYSTEM STATE: UNVERIFIED / INITIALIZING'}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                  {greenState.reason}
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <span
                  style={{
                    padding: '4px 8px',
                    background: greenState.allChecksPassed
                      ? 'rgba(56, 178, 172, 0.2)'
                      : 'rgba(237, 137, 54, 0.2)',
                    borderRadius: 4,
                  }}
                >
                  Checks: {greenState.allChecksPassed ? 'PASS' : 'PENDING'}
                </span>
                <span
                  style={{
                    padding: '4px 8px',
                    background: greenState.lineageExists
                      ? 'rgba(56, 178, 172, 0.2)'
                      : 'rgba(237, 137, 54, 0.2)',
                    borderRadius: 4,
                  }}
                >
                  Lineage: {greenState.lineageExists ? 'INTACT' : 'BROKEN'}
                </span>
                <span
                  style={{
                    padding: '4px 8px',
                    background: greenState.attestationExists
                      ? 'rgba(56, 178, 172, 0.2)'
                      : 'rgba(237, 137, 54, 0.2)',
                    borderRadius: 4,
                  }}
                >
                  Attest: {greenState.attestationExists ? 'SIGNED' : 'MISSING'}
                </span>
              </div>
            </div>
          )}

          {/* ── Governance & Learning Engines (Pillars 26 & 29) ── */}
          {(governanceData || learningData) && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 16,
                marginBottom: 24,
              }}
            >
              {governanceData && (
                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: 16,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      color: 'var(--text-primary)',
                      marginBottom: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span>⚖ Governance Engine (Pillar 29)</span>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        background: 'rgba(99, 179, 237, 0.15)',
                        color: '#63b3ed',
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}
                    >
                      FAIL-CLOSED
                    </span>
                  </div>
                  {governanceData.rules.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        fontSize: '0.78rem',
                        borderBottom: '1px solid var(--border-subtle)',
                        padding: '6px 0',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>
                        <strong>{r.action}</strong> (
                        {r.requiresHumanApproval ? 'Human Required' : 'Auto'})
                      </span>
                      <span style={{ color: 'var(--accent-green)' }}>Active</span>
                    </div>
                  ))}
                </div>
              )}

              {learningData && (
                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: 16,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      color: 'var(--text-primary)',
                      marginBottom: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span>🧠 Learning Engine (Pillar 26)</span>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        background: 'rgba(159, 122, 234, 0.15)',
                        color: '#9f7aea',
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}
                    >
                      CLOSED-LOOP
                    </span>
                  </div>
                  {learningData.insights.map((ins, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: '0.78rem',
                        padding: '4px 0',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      💡 {ins.description}{' '}
                      <span style={{ color: 'var(--accent-green)' }}>
                        ({(ins.confidence * 100).toFixed(0)}%)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {swarmResult && (
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--accent-secondary)',
                borderRadius: 'var(--radius)',
                padding: 20,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 14,
                }}
              >
                <span
                  style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--accent-secondary)' }}
                >
                  🐝 Formless Swarm Execution Complete ({swarmResult.agentResults.length} Agents
                  Verified)
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    background: 'rgba(159, 122, 234, 0.15)',
                    color: 'var(--accent-secondary)',
                    padding: '4px 8px',
                    borderRadius: 6,
                  }}
                >
                  {swarmResult.fullLoopResult.attestation.signature.slice(0, 20)}…
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: 10,
                }}
              >
                {swarmResult.agentResults.map((agent: any, idx: number) => {
                  const roleIcons: Record<string, string> = {
                    Observer: '👁',
                    Verifier: '⚡',
                    Security: '🛡',
                    Governance: '⚖',
                    Learning: '🧠',
                    Human: '👤',
                  };
                  return (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: 12,
                      }}
                    >
                      <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>
                        {roleIcons[agent.agentRole] || '🤖'}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        {agent.agentRole} Agent
                      </div>
                      <div
                        style={{ fontSize: '0.72rem', color: 'var(--accent-green)', marginTop: 4 }}
                      >
                        ✓ {agent.action}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Friction & Dissent Ledger (Pillars 20-21) ── */}
          {(frictionList.length > 0 || dissentList.length > 0) && (
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: 20,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  color: 'var(--accent-amber)',
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>⚡ Friction & Dissent Ledger (Pillars 20–21)</span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    background: 'rgba(237,137,54,0.15)',
                    color: 'var(--accent-amber)',
                    padding: '2px 8px',
                    borderRadius: 4,
                  }}
                >
                  {frictionList.length} Friction | {dissentList.length} Dissent
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: 12,
                }}
              >
                {frictionList.map((f) => (
                  <div
                    key={f.id}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: 12,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.75rem',
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ fontWeight: 600, color: 'var(--accent-red)' }}>
                        ⚡ {f.category}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {f.status}
                      </span>
                    </div>
                    <div
                      style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: 4 }}
                    >
                      {f.description}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Source: {f.source}
                    </div>
                  </div>
                ))}
                {dissentList.map((d) => (
                  <div
                    key={d.id}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid rgba(159,122,234,0.3)',
                      borderRadius: 'var(--radius-sm)',
                      padding: 12,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.75rem',
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ fontWeight: 600, color: 'var(--accent-secondary)' }}>
                        ⚖ DISSENT ({d.interpretations.length} Views)
                      </span>
                      <span
                        style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-secondary)' }}
                      >
                        {d.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Claim: {d.claimId}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="timeline-section">
            <div className="section-header">
              <div className="section-title">Provenance Log</div>
              <span className="section-badge">{log.length} entries</span>
            </div>

            <div className="timeline">
              {log.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📋</div>
                  <div className="empty-state-title">No events recorded yet</div>
                  <div className="empty-state-text">
                    Run the verification loop to observe the first event.
                  </div>
                </div>
              ) : (
                log.map((entry) => (
                  <TimelineEntry key={`${entry.type}-${entry.id}`} entry={entry} />
                ))
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        Attest, don't assert. Evidence before trust. Verification before evolution. — Ω∞v Oceanicos
        v0.1.0
      </footer>
    </div>
  );
}

export default App;
