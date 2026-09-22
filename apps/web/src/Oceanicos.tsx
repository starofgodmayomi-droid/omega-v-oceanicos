import React, { useState, useEffect, useRef } from 'react';
import './Oceanicos.css';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), init);
  const text = await response.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`API returned invalid JSON (${response.status})`);
  }
  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || `API request failed (${response.status})`);
  }
  return payload as T;
}

interface KernelCapabilitySnapshot {
  contract: string;
  execution: string;
  humanAuthorizationRequired: boolean;
  capabilities: Record<string, boolean>;
  limitations: string[];
}

const VERBS = ['UNDERSTAND', 'CREATE', 'ACT', 'OBSERVE', 'VERIFY', 'REMEMBER'];
const BOUNDS = ['EVIDENCE', 'AUTHORITY', 'POLICY', 'SECURITY', 'HUMAN AGENCY'];

function statusToVerb(status: string | undefined): number {
  if (!status) return 0;
  const map: Record<string, number> = {
    PROPOSED: 1, REVIEW: 1, ADMITTED: 1,
    AUTHORIZED: 2, APPROVED: 2,
    EXECUTED: 3,
    VERIFIED: 4, DIVERGENT: 4, HALTED: 4,
    REMEMBERED: 5,
  };
  return map[status] ?? 0;
}

export function Oceanicos({ onConsole }: { onConsole: () => void }) {
  const [intent, setIntent] = useState('');
  const [tip, setTip] = useState<any>(null);
  const [streamConnected, setStreamConnected] = useState(false);
  const [kernelCaps, setKernelCaps] = useState<KernelCapabilitySnapshot | null>(null);
  const [moodData, setMoodData] = useState<any>(null);
  const [omegaCommand, setOmegaCommand] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blockCount, setBlockCount] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  const activeVerb = statusToVerb(omegaCommand?.command?.status);

  // Connect to event stream + fetch initial state
  useEffect(() => {
    let es: EventSource | null = null;
    let disposed = false;

    const fetchTip = async () => {
      try {
        const d = await apiRequest<any>('/v1/block/tip');
        if (d.tip) { setTip(d.tip); setBlockCount(d.tip.index + 1); }
      } catch { /* ignore */ }
    };

    const fetchCaps = async () => {
      try {
        const d = await apiRequest<{ success: boolean; capability?: KernelCapabilitySnapshot }>('/v1/kernel/capabilities');
        if (d.success && d.capability) setKernelCaps(d.capability);
      } catch { /* ignore */ }
    };

    fetchTip();
    fetchCaps();

    const connect = () => {
      if (disposed) return;
      es?.close();
      try {
        es = new EventSource(apiUrl('/v1/stream'));
        eventSourceRef.current = es;
        es.onopen = () => { setStreamConnected(true); setError(null); };
        es.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.block) {
              setTip(payload.block);
              setBlockCount(payload.block.index + 1);
              setHistory((prev) => {
                const exists = prev.some((b) => b.hash === payload.block.hash);
                return exists ? prev : [payload.block, ...prev.slice(0, 9)];
              });
            }
          } catch { /* ignore */ }
        };
        es.onerror = () => {
          es?.close();
          setStreamConnected(false);
          setTimeout(connect, 3000);
        };
      } catch {
        setStreamConnected(false);
      }
    };
    connect();

    return () => { disposed = true; es?.close(); };
  }, []);

  // CREATE — propose a bounded command from human intent
  const handleCreate = async () => {
    if (!intent.trim()) return;
    setLoading('create');
    setError(null);
    try {
      const data = await apiRequest<any>('/v1/omega/commands', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          intent: intent.trim(),
          requestedBy: 'oceanicos-user',
          workers: ['planner', 'tester'],
          idempotencyKey: `oceanicos-${Date.now()}`,
          context: { stateBefore: tip?.hash ?? 'unknown', observationKind: 'supplied-state' },
        }),
      });
      setOmegaCommand(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  // EXPLORE — fetch current system state
  const handleExplore = async () => {
    setLoading('explore');
    setError(null);
    try {
      const [mood, caps] = await Promise.all([
        apiRequest<any>('/v1/mood'),
        apiRequest<{ success: boolean; capability?: KernelCapabilitySnapshot }>('/v1/kernel/capabilities'),
      ]);
      setMoodData(mood);
      if (caps.success && caps.capability) setKernelCaps(caps.capability);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  // BUILD — execute an omni-cycle to produce verified evidence
  const handleBuild = async () => {
    setLoading('build');
    setError(null);
    try {
      const data = await apiRequest<any>('/v1/cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!data.success) setError(data.error || 'Cycle rejected');
      else if (data.block) setTip(data.block);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  // ACT — advance the omega command through its bounded lifecycle
  const handleAct = async () => {
    if (!omegaCommand?.command?.commandId) {
      setError('No command to act on. Use CREATE first.');
      return;
    }
    setLoading('act');
    setError(null);
    try {
      const cmdId = omegaCommand.command.commandId;
      const status = omegaCommand.command.status;
      let endpoint = '';
      if (status === 'REVIEW' || status === 'PROPOSED') {
        endpoint = `/v1/omega/commands/${cmdId}/approve`;
      } else if (status === 'AUTHORIZED' || status === 'APPROVED') {
        endpoint = `/v1/omega/commands/${cmdId}/execute`;
      } else if (status === 'EXECUTED') {
        endpoint = `/v1/omega/commands/${cmdId}/observe`;
      } else {
        setError(`No action available for status: ${status}`);
        setLoading(null);
        return;
      }
      const data = await apiRequest<any>(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: endpoint.includes('approve') ? JSON.stringify({ operator: 'oceanicos-user' }) : JSON.stringify({}),
      });
      setOmegaCommand(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  const actLabel = (() => {
    const s = omegaCommand?.command?.status;
    if (!s) return 'ACT';
    if (s === 'REVIEW' || s === 'PROPOSED') return 'APPROVE';
    if (s === 'AUTHORIZED' || s === 'APPROVED') return 'EXECUTE';
    if (s === 'EXECUTED') return 'OBSERVE';
    return 'ACT';
  })();

  return (
    <div className="oceanicos">
      {/* Hero */}
      <header className="oceanicos-hero">
        <div className="oceanicos-mark">💧</div>
        <h1 className="oceanicos-title">OCEANICOS</h1>
        <p className="oceanicos-subtitle">THE HUMAN → AI → REALITY SYSTEM</p>
        <p className="oceanicos-question">What shall we make real?</p>

        <div className="oceanicos-input-bar">
          <input
            className="oceanicos-input"
            type="text"
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Tell Oceanicos what you're trying to do"
            maxLength={2000}
          />
        </div>

        <div className="oceanicos-actions">
          <button className="action-btn action-create" onClick={handleCreate} disabled={loading !== null || !intent.trim()}>
            {loading === 'create' ? '…' : 'CREATE'}
          </button>
          <button className="action-btn action-explore" onClick={handleExplore} disabled={loading !== null}>
            {loading === 'explore' ? '…' : 'EXPLORE'}
          </button>
          <button className="action-btn action-build" onClick={handleBuild} disabled={loading !== null}>
            {loading === 'build' ? '…' : 'BUILD'}
          </button>
          <button className="action-btn action-act" onClick={handleAct} disabled={loading !== null}>
            {loading === 'act' ? '…' : actLabel}
          </button>
        </div>

        {error && <div className="oceanicos-error">⚠ {error}</div>}
      </header>

      {/* Cycle */}
      <div className="oceanicos-cycle">
        {VERBS.map((verb, i) => (
          <React.Fragment key={verb}>
            <div className={`cycle-step ${i === activeVerb ? 'active' : ''} ${i < activeVerb ? 'done' : ''}`}>
              <span className="cycle-index">{i + 1}</span>
              <span className="cycle-label">{verb}</span>
            </div>
            {i < VERBS.length - 1 && <span className="cycle-arrow">→</span>}
          </React.Fragment>
        ))}
        <span className="cycle-arrow">→</span>
        <div className="cycle-step cycle-next">
          <span className="cycle-label">NEXT Δ</span>
          <span className="cycle-loop">↺∞</span>
        </div>
      </div>

      {/* Status Panels */}
      <div className="oceanicos-panels">
        {/* REALITY */}
        <div className="oceanicos-panel panel-reality">
          <div className="panel-header">
            <span className="panel-title">REALITY</span>
            <span className={`panel-status ${tip?.evidence?.status?.toLowerCase() || 'pending'}`}>
              {tip?.evidence?.status || 'AWAITING'}
            </span>
          </div>
          <div className="panel-body">
            {tip ? (
              <>
                <div className="panel-row"><span>Block</span><strong>#{tip.index}</strong></div>
                <div className="panel-row"><span>Yield</span><strong>{Math.round(tip.observation.siliconYield * 100)}%</strong></div>
                <div className="panel-row"><span>Grid</span><strong>{tip.observation.gridLoadMegawatts} MW</strong></div>
                <div className="panel-hash"><code>{tip.hash.substring(0, 32)}…</code></div>
              </>
            ) : (
              <div className="panel-empty">No verified reality yet. Use BUILD to observe.</div>
            )}
            {kernelCaps && (
              <div className="panel-caps">
                <div className="cap-row"><span>Execution</span><strong>{kernelCaps.execution}</strong></div>
                <div className="cap-row"><span>Human Gate</span><strong>{kernelCaps.humanAuthorizationRequired ? 'REQUIRED' : 'OPEN'}</strong></div>
                <div className="cap-row"><span>Remote</span><strong>{kernelCaps.capabilities.remoteMutation ? 'ON' : 'OFF'}</strong></div>
              </div>
            )}
          </div>
        </div>

        {/* MEMORY */}
        <div className="oceanicos-panel panel-memory">
          <div className="panel-header">
            <span className="panel-title">MEMORY</span>
            <span className={`panel-status ${streamConnected ? 'live' : 'offline'}`}>
              {streamConnected ? '● LIVE' : '○ OFFLINE'}
            </span>
          </div>
          <div className="panel-body">
            <div className="panel-row"><span>Blocks</span><strong>{blockCount}</strong></div>
            <div className="panel-row"><span>Buffer</span><strong>{history.length}</strong></div>
            {history.length > 0 ? (
              <div className="memory-feed">
                {history.slice(0, 5).map((block) => (
                  <div key={block.hash} className="memory-row">
                    <span className="memory-index">#{block.index}</span>
                    <span className="memory-status" data-status={block.evidence.status}>{block.evidence.status}</span>
                    <span className="memory-time">{new Date(block.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="panel-empty">Memory is empty. BUILD to create evidence.</div>
            )}
          </div>
        </div>

        {/* ACTIVITY */}
        <div className="oceanicos-panel panel-activity">
          <div className="panel-header">
            <span className="panel-title">ACTIVITY</span>
            <span className="panel-status">{omegaCommand?.command?.status || 'IDLE'}</span>
          </div>
          <div className="panel-body">
            {omegaCommand?.command ? (
              <>
                <div className="activity-intent">{omegaCommand.command.intent || omegaCommand.command.change?.summary || '—'}</div>
                <div className="panel-row"><span>Command</span><strong>{omegaCommand.command.commandId.substring(0, 12)}…</strong></div>
                <div className="panel-row"><span>Workers</span><strong>{omegaCommand.command.workers?.join(', ') || '—'}</strong></div>
                <div className="panel-row"><span>Next</span><strong>{omegaCommand.nextAction || '—'}</strong></div>
                {omegaCommand.reality && (
                  <div className="activity-reality">
                    Reality: <strong>{omegaCommand.reality.classification}</strong>
                  </div>
                )}
              </>
            ) : moodData ? (
              <>
                <div className="activity-mood">{moodData.status}</div>
                <div className="panel-row"><span>Contract</span><strong>{moodData.contract}</strong></div>
                <div className="panel-row"><span>Brand</span><strong>{moodData.brand}</strong></div>
                <div className="panel-row"><span>Ledger</span><strong>{moodData.ledger?.ready ? 'READY' : 'EMPTY'}</strong></div>
              </>
            ) : (
              <div className="panel-empty">No activity yet. CREATE to propose intent.</div>
            )}
          </div>
        </div>
      </div>

      {/* Boundary Bar */}
      <div className="oceanicos-bounds">
        <span className="bounds-label">BOUNDED BY</span>
        <div className="bounds-items">
          {BOUNDS.map((b) => <span key={b} className="bound-item">{b}</span>)}
        </div>
        <span className="bounds-invariant">Ω∞v = VERIFY(ΔREALITY)</span>
      </div>

      {/* Console toggle */}
      <button className="console-toggle" onClick={onConsole} title="Switch to technical console">
        ⚙ CONSOLE
      </button>
    </div>
  );
}

export default Oceanicos;
