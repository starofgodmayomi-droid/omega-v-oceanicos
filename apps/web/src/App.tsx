import { useEffect, useRef, useState } from 'react';
import './App.css';

type RuntimeEvent = { id: string; type: string; stage: string; message: string; status: 'active' | 'passed' | 'failed'; timestamp: string; correlationId?: string; details?: Record<string, unknown> };
type LoopResult = { observation: { id: string; claim: { statement: string }; confidence: number }; verification: { id: string; summary: { passed: boolean; rulesApplied: number; rulesPassed: number; confidence: number }; evidencePath: Array<{ rule: string; passed: boolean; reasoning: string }> }; attestation: { id: string; verified: boolean; signature: string; attestedAt: string } };

const stages = ['observe', 'evidence', 'verify', 'attest', 'act', 'learn', 'recompile'];
const navGroups = [
  { label: 'Core', items: ['Current', 'Observe', 'Evidence', 'Verify', 'Attest', 'Act'] },
  { label: 'Intelligence', items: ['AI', 'Agents', 'Knowledge', 'Memory'] },
  { label: 'System', items: ['API', 'Data', 'Runtime', 'Security', 'Governance'] },
];

const timeLabel = (value: string) => new Date(value).toLocaleTimeString([], { hour12: false });

export function App(): JSX.Element {
  const [claim, setClaim] = useState('Service X is healthy');
  const [responseTime, setResponseTime] = useState('42');
  const [statusCode, setStatusCode] = useState('200');
  const [events, setEvents] = useState<RuntimeEvent[]>([]);
  const [result, setResult] = useState<LoopResult | null>(null);
  const [mode, setMode] = useState('observe');
  const [trust, setTrust] = useState<number | null>(null);
  const [serviceHealth, setServiceHealth] = useState({ ready: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeNav, setActiveNav] = useState('Current');
  const [selectedEvent, setSelectedEvent] = useState<RuntimeEvent | null>(null);
  const [attestationStatus, setAttestationStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [commandOpen, setCommandOpen] = useState(false);
  const claimInputRef = useRef<HTMLTextAreaElement>(null);

  const refreshRuntime = async () => {
    try {
      const [stateResponse, eventsResponse, runsResponse] = await Promise.all([fetch('/api/state'), fetch('/api/events'), fetch('/api/runs')]);
      if (!stateResponse.ok || !eventsResponse.ok || !runsResponse.ok) throw new Error('Runtime unavailable');
      const state = (await stateResponse.json()) as { data: { mode: string; trust: number | null; services: Array<{ status: string }> } };
      const eventData = (await eventsResponse.json()) as { data: RuntimeEvent[] };
      const runData = (await runsResponse.json()) as { data: LoopResult[] };
      const readyServices = state.data.services.filter((service) => service.status === 'ready').length;
      setMode(state.data.mode); setTrust(state.data.trust); setServiceHealth({ ready: readyServices, total: state.data.services.length }); setEvents(eventData.data); setResult((current) => current ?? runData.data[0] ?? null); setSelectedEvent((current) => current ? eventData.data.find((event) => event.id === current.id) ?? current : null); setError('');
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Runtime unavailable'); }
  };

  useEffect(() => { void refreshRuntime(); }, []);

  useEffect(() => {
    const stream = new EventSource('/api/events/stream');
    stream.onmessage = (message) => {
      const incoming = JSON.parse(message.data) as RuntimeEvent;
      setEvents((current) => [incoming, ...current.filter((event) => event.id !== incoming.id)].slice(0, 40));
      setMode(incoming.stage);
      if (incoming.status === 'passed' || incoming.status === 'failed') setTrust(incoming.status === 'passed' ? 1 : 0);
    };
    stream.onerror = () => stream.close();
    return () => stream.close();
  }, []);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
      if (event.key === 'Escape') setCommandOpen(false);
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  const executeLoop = async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/complete-loop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ claim, category: 'health-check', source: { system: 'current-console', version: '0.1.0', environment: 'local' }, observedBy: 'operator', metadata: { responseTime: Number(responseTime), statusCode: Number(statusCode) }, confidence: 0.95, confidenceReason: 'Operator initiated health observation' }) });
      if (!response.ok) throw new Error('The verification loop failed');
      const payload = (await response.json()) as { data: LoopResult }; setResult(payload.data); await refreshRuntime();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'The loop failed'); } finally { setLoading(false); }
  };

  const verifyAttestation = async () => {
    if (!result) return;
    setAttestationStatus('checking');
    try {
      const response = await fetch('/api/attest/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attestation: result.attestation }) });
      if (!response.ok) throw new Error('Attestation check failed');
      const payload = (await response.json()) as { data: { valid: boolean } };
      setAttestationStatus(payload.data.valid ? 'valid' : 'invalid');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Attestation check failed');
      setAttestationStatus('invalid');
    }
  };

  const activeStage = stages.includes(mode) ? mode : 'observe';
  const runCommand = (command: () => void) => { command(); setCommandOpen(false); };
  return <div className="os-shell">
    <aside className="sidebar"><div className="brand"><span className="brand-mark">Ω∞v</span><span>ECOSYSTEMOS</span></div><div className="side-status"><span className="status-dot" /> Runtime active</div><nav aria-label="Primary navigation">{navGroups.map((group) => <div className="nav-group" key={group.label}><span className="nav-label">{group.label}</span>{group.items.map((item) => <button className={activeNav === item ? 'nav-item active' : 'nav-item'} key={item} onClick={() => setActiveNav(item)}><span className="nav-glyph">{item === 'Current' ? '◈' : '·'}</span>{item}</button>)}</div>)}</nav><div className="sidebar-foot"><span>LOCAL ENVIRONMENT</span><strong>v0.1.0</strong></div></aside>
    <main className="workspace"><header className="topbar"><div><span className="eyebrow">Current / {activeNav}</span><h1>One root. Infinite forms.</h1></div><div className="top-meta"><span className="mode-pill"><span className="status-dot" /> {mode.toUpperCase()}</span><span className="trust">TRUST <strong>{trust === null ? 'UNKNOWN' : `${(trust * 100).toFixed(1)}%`}</strong></span><button className="command" onClick={() => setCommandOpen(true)}>⌘ K</button></div></header>
      {commandOpen && <div className="command-backdrop" onClick={() => setCommandOpen(false)}><div className="command-palette" role="dialog" aria-label="Command palette" onClick={(event) => event.stopPropagation()}><div className="command-search">⌘ <span>What do you want to do?</span><kbd>ESC</kbd></div><button onClick={() => runCommand(() => claimInputRef.current?.focus())}><strong>Observe</strong><span>Focus operator input</span></button><button onClick={() => runCommand(() => void executeLoop())}><strong>Run verification</strong><span>Enter a real observation into the current</span></button><button onClick={() => runCommand(() => void refreshRuntime())}><strong>Refresh runtime</strong><span>Read the latest API state and event ledger</span></button><button onClick={() => runCommand(() => void verifyAttestation())} disabled={!result}><strong>Verify attestation</strong><span>{result ? 'Execute the signature check' : 'Available after a completed run'}</span></button></div></div>}
      {error && <div className="error-banner" role="alert"><strong>Runtime boundary</strong><span>{error}. UI is showing the last known state.</span></div>}
      <section className="hero-grid"><div className="current-panel"><div className="section-kicker">ACTIVE CURRENT <span>LIVE</span></div><div className="current-orbit"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="core"><span>Ω∞v</span><small>CORE</small></div></div><p className="current-caption">The current is the system. Every form returns to evidence.</p><div className="stage-flow">{stages.map((stage, index) => <button className={activeStage === stage ? 'stage active' : 'stage'} key={stage} onClick={() => setMode(stage)}><span>{String(index + 1).padStart(2, '0')}</span>{stage}</button>)}</div></div>
        <div className="intent-panel"><div className="section-kicker">CREATE AN OBSERVATION <span>OPERATOR INPUT</span></div><label htmlFor="claim">What should enter the current?</label><textarea ref={claimInputRef} id="claim" value={claim} onChange={(event) => setClaim(event.target.value)} rows={3} /><div className="input-controls"><label htmlFor="response-time">Response ms<input id="response-time" type="number" min="0" value={responseTime} onChange={(event) => setResponseTime(event.target.value)} /></label><label htmlFor="status-code">Status code<input id="status-code" type="number" min="100" value={statusCode} onChange={(event) => setStatusCode(event.target.value)} /></label></div><div className="input-meta"><span>health-check / local</span><button className="run-button" onClick={executeLoop} disabled={loading || !claim.trim()}>{loading ? 'Running current...' : 'Run verification'} <span>↗</span></button></div><div className="truth-note"><span>⊙</span> Checks use the values you submit. Failures remain visible as evidence.</div></div></section>
      <section className="metrics-row"><div><span>EVENTS RECORDED</span><strong>{events.length.toString().padStart(2, '0')}</strong></div><div><span>VERIFICATION</span><strong className="green">{result ? (result.verification.summary.passed ? 'PASSED' : 'FAILED') : 'READY'}</strong></div><div><span>SERVICES</span><strong>{serviceHealth.total ? `${String(serviceHealth.ready).padStart(2, '0')} / ${String(serviceHealth.total).padStart(2, '0')}` : 'UNKNOWN'}</strong></div><div><span>ENVIRONMENT</span><strong>LOCAL</strong></div></section>
      <section className="lower-grid"><div className="stream-panel"><div className="panel-heading"><div><span className="section-kicker">UNIVERSAL EVENT STREAM</span><h2>What is happening</h2></div><span className="live-tag">● LIVE</span></div><div className="event-list">{events.length === 0 ? <div className="empty">No observations have entered the current yet.</div> : events.map((event) => <button className={selectedEvent?.id === event.id ? 'event-row selected' : 'event-row'} key={event.id} onClick={() => setSelectedEvent(event)}><span className={`event-marker ${event.status}`} /><time>{timeLabel(event.timestamp)}</time><div><strong>{event.type.replace('.', ' / ').toUpperCase()}</strong><p>{event.message}</p></div><span className="event-stage">{event.stage}</span></button>)}</div></div>
        <div className="evidence-panel"><div className="panel-heading"><div><span className="section-kicker">EVENT INSPECTOR</span><h2>{selectedEvent ? selectedEvent.type : 'Evidence chain'}</h2></div><span className="seal">◉</span></div>{selectedEvent ? <div className="event-inspector"><div><span>EVENT ID</span><code>{selectedEvent.id}</code></div><div><span>CORRELATION</span><code>{selectedEvent.correlationId ?? 'not assigned'}</code></div><div><span>PAYLOAD</span><pre>{JSON.stringify(selectedEvent.details ?? {}, null, 2)}</pre></div></div> : result ? <div className="chain"><div className="chain-item"><span className="chain-line" /><div><span>OBSERVATION</span><code>{result.observation.id}</code></div></div><div className="chain-item"><span className="chain-line" /><div><span>VERIFICATION / EVIDENCE</span><code>{result.verification.id}</code>{result.verification.evidencePath.map((step) => <p className={step.passed ? 'evidence-pass' : 'evidence-fail'} key={step.rule}>{step.passed ? 'PASS' : 'FAIL'} / {step.reasoning}</p>)}</div></div><div className="chain-item"><span className="chain-line" /><div><span>ATTESTATION</span><code>{result.attestation.id}</code><button className="verify-button" onClick={verifyAttestation} disabled={attestationStatus === 'checking'}>{attestationStatus === 'checking' ? 'Checking...' : 'Verify signature'}</button>{attestationStatus !== 'idle' && <small className={attestationStatus === 'valid' ? 'attestation-valid' : 'attestation-invalid'}>{attestationStatus.toUpperCase()}</small>}</div></div></div> : <div className="empty evidence-empty">Run the loop to generate a traceable evidence chain.</div>}<div className="panel-foot">ATTEST ≠ ASSERT <span>Evidence before trust</span></div></div></section>
    </main></div>;
}

export default App;
