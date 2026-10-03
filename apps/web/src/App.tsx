import { useCallback, useEffect, useMemo, useState } from 'react';

type View = 'current' | 'evidence' | 'system';
type Tone = 'verified' | 'review' | 'dissent' | 'unknown';

type Stage = {
  id: 'observe' | 'verify' | 'remember' | 'attest';
  label: string;
  short: string;
  tone: Tone;
  detail: string;
};

type ActivityItem = {
  id: string;
  label: string;
  detail: string;
  tone: Tone;
  timestamp: string;
};

type HealthSnapshot = {
  status?: string;
  readiness?: string;
  checks?: {
    observer?: string;
    verifier?: string;
    attester?: string;
    memory?: { status?: string; integrity?: boolean; height?: number };
    persistence?: { mode?: string; source?: string; eventLogSource?: string };
  };
  timestamp?: string;
};

type TipSnapshot = {
  success?: boolean;
  status?: string;
  tip?: { hash?: string; timestamp?: string; evidence?: { status?: string }; [key: string]: unknown } | null;
  integrity?: { valid?: boolean; height?: number; reason?: string };
};

type MinerSnapshot = {
  success?: boolean;
  miner?: { active?: boolean; intervalMs?: number; totalMined?: number; lastBlockTime?: string };
};

type CapabilitySnapshot = {
  execution?: string;
  humanAuthorizationRequired?: boolean;
  capabilities?: Record<string, boolean>;
  limitations?: string[];
};

type CommandSnapshot = {
  command?: {
    commandId?: string;
    intent?: string;
    status?: string;
    change?: { decision?: string; stateAfter?: string };
  };
  reality?: { classification?: string; observedState?: string };
  nextAction?: string;
};

type AttestationSnapshot = {
  success?: boolean;
  attestation?: { id?: string; status?: string; verified?: boolean; attestedAt?: string; algorithm?: string };
};

// The web/API contract test uses this inventory to keep the client aware of every
// index.ts route. The UI only calls a safe subset; mutations remain server-gated.
export const API_ROUTE_COVERAGE = [
  '/api/health',
  '/api/v1/kernel/capabilities',
  '/api/v1/mood',
  '/api/v1/mood/codex',
  '/api/v1/mood/codex/proposal',
  '/api/v1/attest',
  '/api/v1/cycle',
  '/api/v1/block/tip',
  '/api/v1/stream',
  '/api/v1/miner/start',
  '/api/v1/miner/stop',
  '/api/v1/miner/status',
  '/api/v1/mesh/nodes',
  '/api/v1/mesh/simulate',
  '/api/v1/auth/keypair',
  '/api/v1/block/sign',
  '/api/v1/block/verify-signature',
  '/api/persistence/status',
  '/api/persistence/acknowledge',
  '/api/persistence/reencrypt',
  '/api/jobs',
  '/api/jobs/job-id',
  '/api/jobs/job-id/claim',
  '/api/jobs/job-id/complete',
  '/api/jobs/job-id/fail',
  '/api/attest/revocations',
  '/api/attest/revoke',
  '/api/attest/policy',
] as const;

const MODES = [
  { label: 'Create', template: 'Create a new ' },
  { label: 'Explore', template: 'Explore the current state of ' },
  { label: 'Build', template: 'Build and test ' },
  { label: 'Change', template: 'Change ' },
];

const initialActivity: ActivityItem[] = [
  {
    id: 'boot',
    label: 'Console opened',
    detail: 'Waiting for a fresh observation from the runtime.',
    tone: 'unknown',
    timestamp: 'now',
  },
];

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Invalid JSON from ${path}`);
  }
  if (!response.ok) {
    const body = payload as { error?: string; message?: string } | null;
    throw new Error(body?.error || body?.message || `${response.status} from ${path}`);
  }
  return payload as T;
}

function nowLabel(value?: string): string {
  if (!value) return 'unknown time';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function shortId(value?: string): string {
  if (!value) return 'not available';
  return value.length > 18 ? `${value.slice(0, 9)}…${value.slice(-6)}` : value;
}

function toneFor(value?: string): Tone {
  const status = (value || '').toUpperCase();
  if (['VERIFIED', 'PASS', 'ONLINE', 'READY', 'ATTESTED', 'SUCCEEDED', 'SYNCED'].includes(status)) return 'verified';
  if (['REVIEW', 'PROPOSED', 'AUTHORIZED', 'EXECUTED', 'VERIFYING'].includes(status)) return 'review';
  if (['FAILED', 'DIVERGENT', 'DEGRADED', 'DENIED', 'REJECT'].includes(status)) return 'dissent';
  return 'unknown';
}

function StatusBadge({ label, tone = 'unknown' }: { label: string; tone?: Tone }) {
  return <span className={`status-badge status-${tone}`}><span className="status-dot" aria-hidden="true" />{label}</span>;
}

function SectionHeading({ kicker, title, detail }: { kicker: string; title: string; detail?: string }) {
  return (
    <div className="section-heading">
      <div>
        <p className="eyebrow">{kicker}</p>
        <h2>{title}</h2>
      </div>
      {detail ? <span className="section-detail">{detail}</span> : null}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty-state">
      <span className="empty-mark" aria-hidden="true">∅</span>
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

function App() {
  const [view, setView] = useState<View>('current');
  const [health, setHealth] = useState<HealthSnapshot | null>(null);
  const [capability, setCapability] = useState<CapabilitySnapshot | null>(null);
  const [tip, setTip] = useState<TipSnapshot | null>(null);
  const [miner, setMiner] = useState<MinerSnapshot | null>(null);
  const [command, setCommand] = useState<CommandSnapshot | null>(null);
  const [attestation, setAttestation] = useState<AttestationSnapshot | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>(initialActivity);
  const [intent, setIntent] = useState('');
  const [streamConnected, setStreamConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [healthError, setHealthError] = useState(false);

  const addActivity = useCallback((item: Omit<ActivityItem, 'id' | 'timestamp'>) => {
    setActivity((previous) => [
      { ...item, id: `${item.label}-${Date.now()}`, timestamp: 'just now' },
      ...previous,
    ].slice(0, 8));
  }, []);

  const loadRuntime = useCallback(async () => {
    setRefreshing(true);
    const results = await Promise.allSettled([
      requestJson<HealthSnapshot>('/api/health'),
      requestJson<{ capability?: CapabilitySnapshot }>('/api/v1/kernel/capabilities'),
      requestJson<TipSnapshot>('/api/v1/block/tip'),
      requestJson<MinerSnapshot>('/api/v1/miner/status'),
    ]);

    const [healthResult, capabilityResult, tipResult, minerResult] = results;
    if (healthResult.status === 'fulfilled') {
      setHealth(healthResult.value);
      setHealthError(false);
    } else {
      // Health can legitimately return 503 when the local ledger is degraded.
      setHealthError(true);
      setHealth(null);
    }
    if (capabilityResult.status === 'fulfilled') setCapability(capabilityResult.value.capability ?? null);
    if (tipResult.status === 'fulfilled') setTip(tipResult.value);
    if (minerResult.status === 'fulfilled') setMiner(minerResult.value);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void loadRuntime();
    const source = new EventSource('/api/v1/stream');
    source.onopen = () => setStreamConnected(true);
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { block?: TipSnapshot['tip'] };
        if (payload.block) {
          setTip((previous) => ({ ...(previous ?? {}), success: true, status: 'ONLINE', tip: payload.block }));
          addActivity({ label: 'New observation', detail: `Block ${shortId(payload.block.hash)}`, tone: 'verified' });
        }
      } catch {
        // A malformed stream event is not promoted to state.
      }
    };
    source.onerror = () => setStreamConnected(false);
    return () => source.close();
  }, [addActivity, loadRuntime]);

  const runAction = useCallback(async (label: string, action: () => Promise<void>) => {
    setLoading(true);
    setError(null);
    try {
      await action();
      addActivity({ label, detail: 'Server response recorded in this console.', tone: 'verified' });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Action failed';
      setError(message);
      addActivity({ label, detail: message, tone: 'dissent' });
    } finally {
      setLoading(false);
    }
  }, [addActivity]);

  const proposeIntent = () => {
    if (!intent.trim()) return;
    void runAction('Transition proposed', async () => {
      const next = await requestJson<CommandSnapshot>('/api/v1/omega/commands', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          intent: intent.trim(),
          requestedBy: 'mobile-console',
          workers: ['planner', 'tester'],
          idempotencyKey: `mobile-${Date.now()}`,
          context: { observationKind: 'mobile-console-intent' },
        }),
      });
      setCommand(next);
      setView('evidence');
    });
  };

  const commandId = command?.command?.commandId;
  const actOnCommand = (action: 'approve' | 'execute' | 'observe') => {
    if (!commandId) return;
    const path = `/api/v1/omega/commands/${commandId}/${action}`;
    void runAction(action === 'approve' ? 'Human approval recorded' : action === 'execute' ? 'Execution requested' : 'Reality observed', async () => {
      const body = action === 'approve'
        ? { operator: 'mobile-console-operator' }
        : action === 'observe'
          ? { observedState: command?.command?.change?.stateAfter ?? tip?.tip?.hash ?? 'unknown' }
          : {};
      setCommand(await requestJson<CommandSnapshot>(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }));
    });
  };

  const requestAttestation = () => {
    void runAction('Attestation requested', async () => {
      setAttestation(await requestJson<AttestationSnapshot>('/api/v1/attest', { method: 'POST' }));
    });
  };

  const runCycle = () => {
    void runAction('Bounded cycle requested', async () => {
      const next = await requestJson<{ block?: TipSnapshot['tip']; status?: string }>('/api/v1/cycle', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (next.block) setTip((previous) => ({ ...(previous ?? {}), success: true, status: next.status, tip: next.block }));
    });
  };

  const toggleMiner = () => {
    const active = Boolean(miner?.miner?.active);
    void runAction(active ? 'Miner stopped' : 'Miner started', async () => {
      setMiner(await requestJson<MinerSnapshot>(active ? '/api/v1/miner/stop' : '/api/v1/miner/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ intervalMs: 5000 }),
      }));
    });
  };

  const healthTone = healthError ? 'dissent' : toneFor(health?.readiness || health?.status);
  const liveStatus = healthError ? 'DEGRADED' : health?.readiness?.toUpperCase() || tip?.status || 'UNKNOWN';
  const ledgerValid = tip?.integrity?.valid ?? health?.checks?.memory?.integrity;
  const stageStates = useMemo<Stage[]>(() => [
    {
      id: 'observe', label: 'Observe', short: '01', tone: tip?.tip ? 'verified' : 'unknown',
      detail: tip?.tip ? `Latest block ${shortId(tip.tip.hash)}` : 'No runtime observation yet',
    },
    {
      id: 'verify', label: 'Verify', short: '02', tone: command?.reality?.classification ? toneFor(command.reality.classification) : tip?.tip ? 'review' : 'unknown',
      detail: command?.reality?.classification ? command.reality.classification : 'Awaiting a proposition to check',
    },
    {
      id: 'remember', label: 'Remember', short: '03', tone: ledgerValid === true ? 'verified' : ledgerValid === false ? 'dissent' : 'unknown',
      detail: ledgerValid === true ? `Ledger intact · height ${tip?.integrity?.height ?? health?.checks?.memory?.height ?? '—'}` : 'Lineage is not confirmed',
    },
    {
      id: 'attest', label: 'Attest', short: '04', tone: attestation?.attestation?.verified ? 'verified' : 'unknown',
      detail: attestation?.attestation?.id ? `Receipt ${shortId(attestation.attestation.id)}` : 'Optional earned expansion',
    },
  ], [attestation, command, health, ledgerValid, tip]);

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="brand-lockup">
          <img src="/omega-mark.svg" alt="" className="brand-mark" />
          <div>
            <strong>OCEANICOS</strong>
            <span>Ω∞v field console</span>
          </div>
        </div>
        <div className="topbar-actions">
          <StatusBadge label={streamConnected ? 'LIVE' : 'POLLING'} tone={streamConnected ? 'verified' : 'review'} />
          <button className="icon-button" type="button" onClick={() => void loadRuntime()} disabled={refreshing} aria-label="Refresh runtime">
            {refreshing ? '…' : '↻'}
          </button>
        </div>
      </header>

      <main className="app-main">
        <section className="hero-block" aria-labelledby="page-title">
          <div className="hero-kicker"><span className="current-line" /> VERIFIED CURRENT</div>
          <h1 id="page-title">Reality, <em>verified.</em></h1>
          <p>One calm surface for seeing what happened before deciding what happens next.</p>
          <div className="hero-meta">
            <StatusBadge label={liveStatus} tone={healthTone} />
            <span className="mono-meta">human gate · {capability?.humanAuthorizationRequired === false ? 'off' : 'on'}</span>
          </div>
        </section>

        {error ? (
          <div className="error-banner" role="alert">
            <div><strong>Action not completed</strong><span>{error}</span></div>
            <button type="button" onClick={() => setError(null)} aria-label="Dismiss error">×</button>
          </div>
        ) : null}

        {view === 'current' ? (
          <CurrentView
            liveStatus={liveStatus}
            healthTone={healthTone}
            stageStates={stageStates}
            intent={intent}
            setIntent={setIntent}
            proposeIntent={proposeIntent}
            loading={loading}
            onMode={(template) => setIntent(template)}
            tip={tip}
            activity={activity}
          />
        ) : null}
        {view === 'evidence' ? (
          <EvidenceView
            stageStates={stageStates}
            command={command}
            attestation={attestation}
            loading={loading}
            onApprove={() => actOnCommand('approve')}
            onExecute={() => actOnCommand('execute')}
            onObserve={() => actOnCommand('observe')}
            onAttest={requestAttestation}
            activity={activity}
          />
        ) : null}
        {view === 'system' ? (
          <SystemView
            health={health}
            capability={capability}
            miner={miner}
            loading={loading}
            onCycle={runCycle}
            onToggleMiner={toggleMiner}
            onRefresh={() => void loadRuntime()}
          />
        ) : null}
      </main>

      <nav className="bottom-nav" aria-label="Primary">
        {([
          ['current', '◉', 'Current'],
          ['evidence', '✓', 'Evidence'],
          ['system', '⌘', 'System'],
        ] as const).map(([id, glyph, label]) => (
          <button key={id} type="button" className={view === id ? 'nav-item nav-item-active' : 'nav-item'} onClick={() => setView(id)} aria-current={view === id ? 'page' : undefined}>
            <span className="nav-glyph" aria-hidden="true">{glyph}</span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function CurrentView({ liveStatus, healthTone, stageStates, intent, setIntent, proposeIntent, loading, onMode, tip, activity }: {
  liveStatus: string; healthTone: Tone; stageStates: Stage[]; intent: string; setIntent: (value: string) => void; proposeIntent: () => void; loading: boolean; onMode: (value: string) => void; tip: TipSnapshot | null; activity: ActivityItem[];
}) {
  return (
    <div className="view-stack">
      <section className="signal-card card-accent">
        <div className="signal-head"><div><p className="eyebrow">CURRENT SIGNAL</p><h2>{liveStatus}</h2></div><StatusBadge label={healthTone === 'verified' ? 'within scope' : 'needs evidence'} tone={healthTone} /></div>
        <div className="signal-grid">
          <div><span>source</span><strong>{tip?.tip ? 'runtime ledger' : 'not connected'}</strong></div>
          <div><span>last seen</span><strong>{nowLabel(tip?.tip?.timestamp)}</strong></div>
          <div><span>tip</span><strong>{shortId(tip?.tip?.hash)}</strong></div>
        </div>
      </section>

      <section className="loop-card">
        <SectionHeading kicker="MINI LOOP" title="Evidence moves in order" detail="01—04" />
        <div className="stage-list">
          {stageStates.map((stage, index) => (
            <div className="stage-row" key={stage.id}>
              <div className={`stage-index stage-${stage.tone}`}><span>{stage.short}</span></div>
              <div className="stage-copy"><strong>{stage.label}</strong><span>{stage.detail}</span></div>
              <StatusBadge label={stage.tone === 'verified' ? 'ready' : stage.tone === 'dissent' ? 'divergent' : stage.tone === 'review' ? 'review' : 'unknown'} tone={stage.tone} />
              {index < stageStates.length - 1 ? <span className="stage-connector" aria-hidden="true" /> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="intent-card">
        <SectionHeading kicker="NEXT Δ" title="Name the transition" detail="bounded input" />
        <label htmlFor="intent">What shall we make real?</label>
        <textarea id="intent" value={intent} onChange={(event) => setIntent(event.target.value)} maxLength={2000} placeholder="Describe one finite thing to observe, verify, or build…" />
        <div className="mode-row" aria-label="Intent templates">
          {MODES.map((mode) => <button key={mode.label} type="button" onClick={() => onMode(mode.template)}>{mode.label}</button>)}
        </div>
        <button className="primary-button" type="button" onClick={proposeIntent} disabled={loading || !intent.trim()}>{loading ? 'Recording…' : 'Propose transition'}<span aria-hidden="true">→</span></button>
        <p className="microcopy"><span>i</span> A proposal is not execution. Human approval remains visible in Evidence.</p>
      </section>

      <ActivityCard activity={activity} compact />
    </div>
  );
}

function EvidenceView({ stageStates, command, attestation, loading, onApprove, onExecute, onObserve, onAttest, activity }: {
  stageStates: Stage[]; command: CommandSnapshot | null; attestation: AttestationSnapshot | null; loading: boolean; onApprove: () => void; onExecute: () => void; onObserve: () => void; onAttest: () => void; activity: ActivityItem[];
}) {
  const commandStatus = command?.command?.status?.toUpperCase() || 'NO PROPOSAL';
  return (
    <div className="view-stack">
      <section className="loop-card">
        <SectionHeading kicker="OBSERVE → VERIFY → REMEMBER → ATTEST" title="Evidence chain" detail="linked records" />
        <div className="evidence-chain">
          {stageStates.map((stage) => <div className="evidence-tile" key={stage.id}><div className="evidence-tile-top"><span>{stage.short}</span><StatusBadge label={stage.tone === 'verified' ? 'verified' : stage.tone === 'review' ? 'review' : 'unknown'} tone={stage.tone} /></div><strong>{stage.label}</strong><p>{stage.detail}</p></div>)}
        </div>
      </section>

      <section className="command-card">
        <SectionHeading kicker="PROPOSITION" title="Human-governed transition" detail={commandStatus} />
        {command ? (
          <>
            <div className="command-quote">“{command.command?.intent || 'Untitled transition'}”</div>
            <div className="record-grid"><div><span>command</span><strong>{shortId(command.command?.commandId)}</strong></div><div><span>decision</span><strong>{command.command?.change?.decision || 'review'}</strong></div><div><span>reality</span><strong>{command.reality?.classification || 'not observed'}</strong></div></div>
            <p className="bounded-note">{command.nextAction || 'The server has recorded a proposal. Choose the next explicit transition.'}</p>
            <div className="action-row">
              <button type="button" className="secondary-button" onClick={onApprove} disabled={loading || commandStatus === 'AUTHORIZED' || commandStatus === 'EXECUTED'}>Approve</button>
              <button type="button" className="primary-button compact-button" onClick={onExecute} disabled={loading || commandStatus !== 'AUTHORIZED'}>Execute</button>
              <button type="button" className="ghost-button" onClick={onObserve} disabled={loading || commandStatus !== 'EXECUTED'}>Observe</button>
            </div>
          </>
        ) : <EmptyState title="No proposal in memory" body="Use Current to name one finite transition. Nothing is assumed, fabricated, or auto-executed." />}
      </section>

      <section className="attest-card">
        <SectionHeading kicker="EARNED EXPANSION" title="Attestation receipt" detail="optional" />
        {attestation?.attestation ? <div className="receipt-row"><StatusBadge label={attestation.attestation.verified ? 'ATTESTED' : attestation.attestation.status || 'UNVERIFIED'} tone={attestation.attestation.verified ? 'verified' : 'unknown'} /><span className="mono-meta">{shortId(attestation.attestation.id)} · {nowLabel(attestation.attestation.attestedAt)}</span></div> : <p className="bounded-note">Attestation only describes the verification receipt returned by this runtime. It does not authorize a consequential action.</p>}
        <button type="button" className="secondary-button full-button" onClick={onAttest} disabled={loading}>{attestation?.attestation ? 'Request another receipt' : 'Request attestation'}</button>
      </section>

      <ActivityCard activity={activity} />
    </div>
  );
}

function SystemView({ health, capability, miner, loading, onCycle, onToggleMiner, onRefresh }: {
  health: HealthSnapshot | null; capability: CapabilitySnapshot | null; miner: MinerSnapshot | null; loading: boolean; onCycle: () => void; onToggleMiner: () => void; onRefresh: () => void;
}) {
  const capabilities = capability?.capabilities ? Object.entries(capability.capabilities) : [];
  return (
    <div className="view-stack">
      <section className="system-card">
        <SectionHeading kicker="RUNTIME" title="System health" detail={health?.timestamp ? nowLabel(health.timestamp) : 'unverified'} />
        <div className="health-stack">
          {[
            ['observer', health?.checks?.observer],
            ['verifier', health?.checks?.verifier],
            ['attester', health?.checks?.attester],
            ['memory', health?.checks?.memory?.status],
          ].map(([label, status]) => <div className="health-row" key={label}><span>{label}</span><StatusBadge label={status?.toUpperCase() || 'UNKNOWN'} tone={toneFor(status)} /></div>)}
        </div>
        <div className="system-meta"><span>persistence</span><strong>{health?.checks?.persistence?.mode || 'unknown'}</strong><span>source</span><strong>{health?.checks?.persistence?.source || 'unknown'}</strong></div>
      </section>

      <section className="system-card">
        <SectionHeading kicker="CAPABILITY BOUNDARY" title="What this runtime can do" detail={capability?.execution || 'unknown'} />
        <div className="capability-grid">{capabilities.length ? capabilities.map(([label, enabled]) => <div className="capability-item" key={label}><span>{label.replace(/([A-Z])/g, ' $1')}</span><StatusBadge label={enabled ? 'available' : 'off'} tone={enabled ? 'verified' : 'unknown'} /></div>) : <EmptyState title="Capability snapshot missing" body="This console will not infer permissions from the UI." />}</div>
        {capability?.limitations?.length ? <div className="limitations"><p className="eyebrow">LIMITATIONS</p>{capability.limitations.slice(0, 4).map((limitation) => <p key={limitation}>— {limitation}</p>)}</div> : null}
      </section>

      <section className="system-card">
        <SectionHeading kicker="OPERATOR CONTROLS" title="Bounded actions" detail="explicit only" />
        <div className="control-list">
          <div className="control-row"><div><strong>Run one cycle</strong><span>Creates one bounded local observation.</span></div><button type="button" className="secondary-button" onClick={onCycle} disabled={loading}>Run</button></div>
          <div className="control-row"><div><strong>{miner?.miner?.active ? 'Stop miner' : 'Start miner'}</strong><span>{miner?.miner?.totalMined ?? 0} local blocks recorded.</span></div><button type="button" className="secondary-button" onClick={onToggleMiner} disabled={loading}>{miner?.miner?.active ? 'Stop' : 'Start'}</button></div>
          <div className="control-row"><div><strong>Refresh evidence</strong><span>Re-read health, capability, tip, and miner state.</span></div><button type="button" className="ghost-button" onClick={onRefresh} disabled={loading}>Refresh</button></div>
        </div>
        <p className="microcopy"><span>!</span> These controls operate only against the configured local/runtime API. External deployment is not implied.</p>
      </section>
    </div>
  );
}

function ActivityCard({ activity, compact = false }: { activity: ActivityItem[]; compact?: boolean }) {
  return (
    <section className={compact ? 'activity-card compact-activity' : 'activity-card'}>
      <SectionHeading kicker="MEMORY" title="Recent evidence" detail={`${activity.length} records`} />
      <div className="activity-list">{activity.slice(0, compact ? 3 : 8).map((item) => <div className="activity-row" key={item.id}><span className={`activity-marker marker-${item.tone}`} aria-hidden="true" /><div><strong>{item.label}</strong><span>{item.detail}</span></div><time>{item.timestamp}</time></div>)}</div>
    </section>
  );
}

export default App;
