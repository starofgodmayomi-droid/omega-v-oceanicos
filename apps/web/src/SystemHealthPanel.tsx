import { useState, useEffect, useCallback } from 'react';
import { theme, statusColor, humanStatus } from './oceanicosTheme';

/*
 * SystemHealthPanel — surfaces the /health endpoint in the UI.
 *
 * Shows observer, verifier, attester, memory, and persistence readiness
 * with evidence-bearing status — no green claim without executable evidence.
 */

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

interface HealthResponse {
  status: string;
  service: string;
  readiness: string;
  checks: {
    observer: string;
    verifier: string;
    attester: string;
    memory: { status: string; integrity: boolean; encryption: string };
    persistence: {
      mode: string;
      source: string;
      keySource: string;
      rotationPending: boolean;
      operatorAction: string;
      coverage: {
        complete: boolean;
        surfaces: { name: string; encryption: string; keySource: string; evidence: string }[];
        unverifiedSurfaces: string[];
      };
    };
  };
  policy: {
    authMode: string;
    readAuthConfigured: boolean;
    adminAuthConfigured: boolean;
    revocationEnabled: boolean;
    persistenceEncryption: string;
  };
  timestamp: string;
}

interface TherapeuticStateResponse {
  success: boolean;
  model: string;
  status: string;
  evaluatedAt: string;
  state: {
    kai: { status: string; authority: string; summary: string };
    elion: { status: string; authority: string; summary: string };
    omega: { status: string; authority: string; summary: string };
  };
  loop: string[];
}

interface OmegaCommandSummary {
  commandId: string;
  intent: string;
  requestedBy: string;
  status: string;
  createdAt: string;
  workers: string[];
  decision: string | null;
  authority: string | null;
  policy: string | null;
  execution: { stateAfter?: string; consequence?: string; attestationId?: string } | null;
  reality: { classification?: string; observedState?: string } | null;
}

interface OmegaCommandDetails {
  commandId: string;
  status: string;
  intent: string;
  requestedBy: string;
  nextAction?: string;
  execution?: { stateAfter?: string; consequence?: string; attestationId?: string } | null;
  reality?: { classification?: string; observedState?: string; evidence?: string } | null;
}

interface OmegaDivergenceAlert {
  commandId: string;
  intent: string;
  requestedBy: string;
  status: string;
  createdAt: string;
  reality: { classification?: string; observedState?: string } | null;
}

type OmegaReconciliationAction = 'accepted' | 'retried' | 'corrected' | 'closed';

export function SystemHealthPanel() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [therapeuticState, setTherapeuticState] = useState<TherapeuticStateResponse | null>(null);
  const [omegaCommands, setOmegaCommands] = useState<OmegaCommandSummary[]>([]);
  const [divergenceAlerts, setDivergenceAlerts] = useState<OmegaDivergenceAlert[]>([]);
  const [selectedCommandId, setSelectedCommandId] = useState<string | null>(null);
  const [selectedCommand, setSelectedCommand] = useState<OmegaCommandDetails | null>(null);
  const [selectedBoundary, setSelectedBoundary] = useState<Record<string, any> | null>(null);
  const [lastFlowStatus, setLastFlowStatus] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [commandAction, setCommandAction] = useState<string | null>(null);
  const [reconciliationAction, setReconciliationAction] = useState<OmegaReconciliationAction>('accepted');
  const [reconciliationNote, setReconciliationNote] = useState('');
  const [reconciliationOperator, setReconciliationOperator] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setHealth(data);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'health check unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTherapeuticState = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/v1/therapeutic/state`);
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setTherapeuticState(data);
    } catch {
      setTherapeuticState(null);
    }
  }, []);

  const runTherapeuticTransition = useCallback(async () => {
    setTransitioning(true);
    try {
      const res = await fetch(`${API_BASE_URL}/v1/therapeutic/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'Verify the local therapeutic state machine',
          requestedBy: 'dashboard-system-health',
          expectedOutcome: 'The KAI, ELION, and OMEGA loop remains ready and evidence-bound',
          observedState: 'The KAI, ELION, and OMEGA loop remains ready and evidence-bound',
        }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setTherapeuticState(data);
      setLastFlowStatus(data?.status ?? 'VERIFIED');
      const commandsRes = await fetch(`${API_BASE_URL}/v1/omega/commands`);
      const commandsText = await commandsRes.text();
      const commandsData = commandsText ? JSON.parse(commandsText) : null;
      if (commandsRes.ok && Array.isArray(commandsData?.commands)) setOmegaCommands(commandsData.commands.slice(0, 5));
      await fetchHealth();
    } catch {
      setTherapeuticState(null);
      setLastFlowStatus('FAILED');
    } finally {
      setTransitioning(false);
    }
  }, [fetchHealth]);

  const fetchOmegaCommands = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/v1/omega/commands`);
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      const commands = Array.isArray(data?.commands) ? data.commands.slice(0, 5) : [];
      setOmegaCommands(commands);
      if (!selectedCommandId && commands[0]?.commandId) {
        setSelectedCommandId(commands[0].commandId);
      }
    } catch {
      setOmegaCommands([]);
    }
  }, [selectedCommandId]);

  const fetchSelectedCommandDetails = useCallback(async (commandId: string) => {
    if (!commandId) return;
    try {
      const [commandRes, boundaryRes] = await Promise.all([
        fetch(`${API_BASE_URL}/v1/omega/commands/${encodeURIComponent(commandId)}`),
        fetch(`${API_BASE_URL}/v1/omega/commands/${encodeURIComponent(commandId)}/safety-boundary`),
      ]);
      const commandText = await commandRes.text();
      const boundaryText = await boundaryRes.text();
      const commandData = commandText ? JSON.parse(commandText) : null;
      const boundaryData = boundaryText ? JSON.parse(boundaryText) : null;
      if (!commandRes.ok || !boundaryRes.ok) throw new Error(commandData?.error || boundaryData?.error || 'command detail unavailable');
      setSelectedCommand(commandData);
      setSelectedBoundary(boundaryData?.boundary ?? null);
    } catch {
      setSelectedCommand(null);
      setSelectedBoundary(null);
    }
  }, []);

  const fetchDivergenceAlerts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/v1/omega/divergences`);
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setDivergenceAlerts(Array.isArray(data?.alerts) ? data.alerts.slice(0, 5) : []);
    } catch {
      setDivergenceAlerts([]);
    }
  }, []);

  const runOmegaLifecycle = useCallback(async () => {
    setTransitioning(true);
    setLastFlowStatus(null);
    try {
      const createBody = {
        intent: 'Verify the dashboard command lifecycle',
        requestedBy: 'dashboard-system-health',
        workers: ['planner'],
        idempotencyKey: `omega-ui-${Date.now()}`,
        context: {
          stateBefore: 'ready',
          expectedObservation: 'The KAI, ELION, and OMEGA loop remains ready and evidence-bound',
          observationKind: 'supplied-state',
        },
      };

      const createRes = await fetch(`${API_BASE_URL}/v1/omega/commands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createBody),
      });
      const createData = createRes.ok ? (await createRes.json()) : null;
      if (!createRes.ok || !createData?.command?.commandId) throw new Error(createData?.error || `HTTP ${createRes.status}`);

      const commandId = createData.command.commandId;
      const admitRes = await fetch(`${API_BASE_URL}/v1/omega/commands/${encodeURIComponent(commandId)}/admit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authority: 'dashboard:runtime-flow', policy: 'runtime-evidence-bound:v1', authorityVerified: true, policySatisfied: true }),
      });
      const admitData = admitRes.ok ? (await admitRes.json()) : null;
      if (!admitRes.ok || !admitData?.command?.commandId) throw new Error(admitData?.error || `HTTP ${admitRes.status}`);

      const executeRes = await fetch(`${API_BASE_URL}/v1/omega/commands/${encodeURIComponent(commandId)}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const executeData = executeRes.ok ? (await executeRes.json()) : null;
      if (!executeRes.ok || !executeData?.command?.commandId) throw new Error(executeData?.error || `HTTP ${executeRes.status}`);

      const observedState = executeData.command.change?.stateAfter ?? 'bounded-local-action-complete';
      const observeRes = await fetch(`${API_BASE_URL}/v1/omega/commands/${encodeURIComponent(commandId)}/observe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observedState }),
      });
      const observeData = observeRes.ok ? (await observeRes.json()) : null;
      if (!observeRes.ok || !observeData?.command?.commandId) throw new Error(observeData?.error || `HTTP ${observeRes.status}`);

      setLastFlowStatus(observeData.command.status || 'VERIFIED');
      setSelectedCommandId(commandId);
      await fetchOmegaCommands();
      await fetchSelectedCommandDetails(commandId);
      await fetchTherapeuticState();
      await fetchHealth();
    } catch (err: any) {
      setLastFlowStatus(err instanceof Error ? 'FAILED' : 'FAILED');
    } finally {
      setTransitioning(false);
    }
  }, [fetchHealth, fetchOmegaCommands, fetchTherapeuticState]);

  const runCommandAction = useCallback(async (action: 'admit' | 'approve' | 'execute' | 'observe' | 'reconcile') => {
    if (!selectedCommandId) return;
    setCommandAction(action);
    try {
      let url = `${API_BASE_URL}/v1/omega/commands/${encodeURIComponent(selectedCommandId)}`;
      let payload: Record<string, unknown> | undefined;

      switch (action) {
        case 'admit':
          url += '/admit';
          payload = { authority: 'dashboard:operator', policy: 'runtime-evidence-bound:v1', authorityVerified: true, policySatisfied: true };
          break;
        case 'approve':
          url += '/approve';
          payload = { operator: 'dashboard-operator', policy: 'human-review' };
          break;
        case 'execute':
          url += '/execute';
          break;
        case 'observe':
          url += '/observe';
          payload = { observedState: selectedCommand?.execution?.stateAfter ?? 'bounded-local-action-complete' };
          break;
        case 'reconcile':
          url += '/reconciliation';
          payload = { action: reconciliationAction, note: reconciliationNote, operator: reconciliationOperator };
          break;
        default:
          return;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload ?? {}),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setLastFlowStatus(data?.status || data?.command?.status || 'UPDATED');
      await fetchOmegaCommands();
      await fetchSelectedCommandDetails(selectedCommandId);
    } catch (err: any) {
      setLastFlowStatus(err instanceof Error ? 'FAILED' : 'FAILED');
    } finally {
      setCommandAction(null);
    }
  }, [fetchOmegaCommands, fetchSelectedCommandDetails, reconciliationAction, reconciliationNote, reconciliationOperator, selectedCommand, selectedCommandId]);

  useEffect(() => {
    fetchHealth();
    fetchTherapeuticState();
    fetchOmegaCommands();
    fetchDivergenceAlerts();
    const interval = setInterval(() => {
      fetchHealth();
      fetchTherapeuticState();
      fetchOmegaCommands();
      fetchDivergenceAlerts();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchDivergenceAlerts, fetchHealth, fetchTherapeuticState, fetchOmegaCommands]);

  useEffect(() => {
    if (selectedCommandId) {
      fetchSelectedCommandDetails(selectedCommandId);
    }
  }, [fetchSelectedCommandDetails, selectedCommandId]);

  useEffect(() => {
    setReconciliationNote('');
  }, [selectedCommandId]);

  const readinessColor = health?.readiness === 'ready' ? theme.verified : theme.warning;

  return (
    <div style={{ padding: '20px 22px', fontFamily: theme.fontSans }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: theme.accent }}>
            ⚕ System Health
          </div>
          <div style={{ fontSize: '11px', color: theme.textDim, marginTop: '3px' }}>
            Evidence-bearing readiness · auto-refresh 15s
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {health && (
            <span
              style={{
                padding: '3px 10px',
                borderRadius: theme.radiusPill,
                fontSize: '10px',
                fontWeight: 700,
                color: readinessColor,
                background: `${readinessColor}12`,
                border: `1px solid ${readinessColor}33`,
              }}
            >
              {health.readiness.toUpperCase()}
            </span>
          )}
          <button
            onClick={fetchHealth}
            disabled={loading}
            style={{
              background: theme.surfaceRaised,
              color: theme.accent,
              border: `1px solid ${theme.borderBright}`,
              borderRadius: theme.radiusSmall,
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? '…' : '↻'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ color: theme.divergent, fontSize: '11px', marginBottom: '10px' }}>
          ⚠ {error}
        </div>
      )}

      {health && (
        <>
          {/* Core checks */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginBottom: '14px' }}>
            {[
              { label: 'Observer', value: health.checks.observer },
              { label: 'Verifier', value: health.checks.verifier },
              { label: 'Attester', value: health.checks.attester },
              { label: 'Memory', value: health.checks.memory.status },
            ].map((check) => {
              const isReady = check.value === 'ready';
              const color = isReady ? theme.verified : theme.warning;
              return (
                <div
                  key={check.label}
                  style={{
                    padding: '10px 12px',
                    background: theme.surfaceDeep,
                    border: `1px solid ${color}33`,
                    borderRadius: theme.radiusSmall,
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 600, color: theme.textMuted, marginBottom: '4px' }}>
                    {check.label}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: color,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: '12px', fontWeight: 600, color }}>
                      {check.value}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Memory integrity */}
          <div style={{
            padding: '10px 14px',
            background: theme.surfaceDeep,
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radiusSmall,
            marginBottom: '10px',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: theme.textMuted, marginBottom: '4px' }}>
              Memory Integrity
            </div>
            <div style={{ fontSize: '12px', color: theme.text, display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <span>integrity: <span style={{ color: health.checks.memory.integrity ? theme.verified : theme.divergent, fontWeight: 600 }}>
                {health.checks.memory.integrity ? 'intact' : 'broken'}
              </span></span>
              <span>encryption: <span style={{ color: theme.textDim }}>{health.checks.memory.encryption}</span></span>
            </div>
          </div>

          {/* Persistence */}
          <div style={{
            padding: '10px 14px',
            background: theme.surfaceDeep,
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radiusSmall,
            marginBottom: '10px',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: theme.textMuted, marginBottom: '6px' }}>
              Persistence · {health.checks.persistence.mode}
            </div>
            <div style={{ fontSize: '11px', color: theme.textDim, display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span>source: {health.checks.persistence.source}</span>
              <span>key: {health.checks.persistence.keySource}</span>
              <span>rotation pending: {String(health.checks.persistence.rotationPending)}</span>
              {health.checks.persistence.operatorAction !== 'none' && (
                <span style={{ color: theme.warning }}>
                  ⚠ operator action: {health.checks.persistence.operatorAction}
                </span>
              )}
              {!health.checks.persistence.coverage.complete && (
                <span style={{ color: theme.unknown }}>
                  unverified: {health.checks.persistence.coverage.unverifiedSurfaces.join(', ')}
                </span>
              )}
            </div>
          </div>

          {(
            <div style={{
              padding: '10px 14px',
              background: theme.surfaceDeep,
              border: `1px solid ${theme.border}`,
              borderRadius: theme.radiusSmall,
              marginBottom: '10px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: theme.textMuted }}>
                  Therapeutic State · {therapeuticState?.model ?? 'omega.therapeutic-state-machine.v1'}
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={runTherapeuticTransition}
                    disabled={transitioning}
                    style={{
                      background: theme.surfaceRaised,
                      color: theme.accent,
                      border: `1px solid ${theme.borderBright}`,
                      borderRadius: theme.radiusSmall,
                      padding: '5px 10px',
                      fontSize: '10px',
                      fontWeight: 700,
                      cursor: transitioning ? 'wait' : 'pointer',
                      opacity: transitioning ? 0.6 : 1,
                    }}
                  >
                    {transitioning ? '…' : 'RUN'}
                  </button>
                  <button
                    type="button"
                    onClick={runOmegaLifecycle}
                    disabled={transitioning}
                    style={{
                      background: theme.surfaceRaised,
                      color: theme.accent,
                      border: `1px solid ${theme.borderBright}`,
                      borderRadius: theme.radiusSmall,
                      padding: '5px 10px',
                      fontSize: '10px',
                      fontWeight: 700,
                      cursor: transitioning ? 'wait' : 'pointer',
                      opacity: transitioning ? 0.6 : 1,
                    }}
                  >
                    {transitioning ? '…' : 'FLOW'}
                  </button>
                </div>
              </div>
              {therapeuticState && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
                    {Object.entries(therapeuticState.state).map(([role, entry]) => {
                      const isReady = entry.status === 'READY';
                      const color = isReady ? theme.verified : theme.warning;
                      return (
                        <div key={role} style={{ padding: '8px 10px', border: `1px solid ${color}33`, borderRadius: theme.radiusSmall }}>
                          <div style={{ fontSize: '10px', color: theme.textMuted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            {role}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
                            <span style={{ fontSize: '12px', fontWeight: 700, color }}>{entry.status}</span>
                          </div>
                          <div style={{ fontSize: '10px', color: theme.textDim }}>{entry.authority}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: '10px', color: theme.textDim, marginTop: '8px' }}>
                    loop: {therapeuticState.loop.join(' → ')}
                  </div>
                </>
              )}
            </div>
          )}

          {lastFlowStatus && (
            <div style={{
              padding: '10px 14px',
              background: theme.surfaceDeep,
              border: `1px solid ${lastFlowStatus === 'VERIFIED' ? theme.verified : theme.warning}33`,
              borderRadius: theme.radiusSmall,
              marginBottom: '10px',
            }}>
              <div style={{ fontSize: '11px', color: theme.textMuted, marginBottom: '4px' }}>Command Flow</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: lastFlowStatus === 'VERIFIED' ? theme.verified : theme.warning }}>
                {lastFlowStatus}
              </div>
            </div>
          )}

          <div style={{
            padding: '10px 14px',
            background: theme.surfaceDeep,
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radiusSmall,
            marginBottom: '10px',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: theme.textMuted, marginBottom: '8px' }}>
              Recent Omega Commands
            </div>
            {omegaCommands.length === 0 ? (
              <div style={{ fontSize: '11px', color: theme.textDim }}>no command evidence yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {omegaCommands.map((command) => (
                  <div
                    key={command.commandId}
                    onClick={() => setSelectedCommandId(command.commandId)}
                    style={{
                      padding: '8px 10px',
                      border: `1px solid ${selectedCommandId === command.commandId ? theme.accent : theme.border}`,
                      borderRadius: theme.radiusSmall,
                      background: theme.surfaceRaised,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                      <div style={{ fontSize: '10px', color: theme.textMuted, fontWeight: 700 }}>{command.commandId}</div>
                      <div style={{ fontSize: '10px', color: command.status === 'VERIFIED' ? theme.verified : command.status === 'DIVERGENT' ? theme.divergent : theme.warning, fontWeight: 700 }}>{command.status}</div>
                    </div>
                    <div style={{ fontSize: '11px', color: theme.text, marginBottom: '3px' }}>{command.intent}</div>
                    <div style={{ fontSize: '10px', color: theme.textDim }}>
                      by {command.requestedBy} · {command.workers.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedCommand && (
            <div style={{
              padding: '10px 14px',
              background: theme.surfaceDeep,
              border: `1px solid ${theme.border}`,
              borderRadius: theme.radiusSmall,
              marginBottom: '10px',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: theme.textMuted, marginBottom: '8px' }}>
                Selected Command Evidence · {selectedCommand.commandId}
              </div>
              <div style={{ fontSize: '11px', color: theme.textDim, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span>status: <span style={{ color: selectedCommand.status === 'VERIFIED' ? theme.verified : selectedCommand.status === 'DIVERGENT' ? theme.divergent : theme.warning, fontWeight: 700 }}>{selectedCommand.status}</span></span>
                <span>intent: {selectedCommand.intent}</span>
                <span>requestedBy: {selectedCommand.requestedBy}</span>
                <span>nextAction: {selectedCommand.nextAction ?? 'none'}</span>
                {selectedCommand.execution && (
                  <span>execution: {selectedCommand.execution.consequence ?? selectedCommand.execution.stateAfter ?? 'recorded'}</span>
                )}
                {selectedCommand.reality && (
                  <span>reality: {selectedCommand.reality.classification ?? 'unknown'} · {selectedCommand.reality.observedState ?? 'no observed state'}</span>
                )}
                {selectedBoundary && (
                  <span>boundary: {selectedBoundary.policy?.status ?? 'UNKNOWN'} / {selectedBoundary.execution?.status ?? 'NOT_EXECUTED'} / {selectedBoundary.observation?.status ?? 'UNKNOWN'}</span>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                {['admit', 'approve', 'execute', 'observe'].map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => runCommandAction(action as 'admit' | 'approve' | 'execute' | 'observe' | 'reconcile')}
                    disabled={Boolean(commandAction)}
                    style={{
                      background: theme.surfaceRaised,
                      color: theme.accent,
                      border: `1px solid ${theme.borderBright}`,
                      borderRadius: theme.radiusSmall,
                      padding: '5px 10px',
                      fontSize: '10px',
                      fontWeight: 700,
                      cursor: commandAction ? 'wait' : 'pointer',
                      opacity: commandAction ? 0.6 : 1,
                    }}
                  >
                    {commandAction === action ? '…' : action.toUpperCase()}
                  </button>
                ))}
              </div>
              {(selectedCommand.status === 'DIVERGENT' || selectedCommand.status === 'UNKNOWN') && (
                <div style={{ display: 'grid', gap: '8px', marginTop: '12px', paddingTop: '10px', borderTop: `1px solid ${theme.border}` }}>
                  <label style={{ display: 'grid', gap: '4px', fontSize: '10px', color: theme.textMuted }}>
                    Review outcome
                    <select
                      value={reconciliationAction}
                      onChange={(event) => setReconciliationAction(event.target.value as OmegaReconciliationAction)}
                      style={{ background: theme.surfaceRaised, color: theme.text, border: `1px solid ${theme.borderBright}`, borderRadius: theme.radiusSmall, padding: '7px 9px' }}
                    >
                      <option value="accepted">Accepted</option>
                      <option value="retried">Retried</option>
                      <option value="corrected">Corrected</option>
                      <option value="closed">Closed</option>
                    </select>
                  </label>
                  <label style={{ display: 'grid', gap: '4px', fontSize: '10px', color: theme.textMuted }}>
                    Operator ID (self-reported; not authenticated)
                    <input
                      value={reconciliationOperator}
                      onChange={(event) => setReconciliationOperator(event.target.value)}
                      maxLength={96}
                      required
                      placeholder="operator-id"
                      style={{ background: theme.surfaceRaised, color: theme.text, border: `1px solid ${theme.borderBright}`, borderRadius: theme.radiusSmall, padding: '7px 9px' }}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: '4px', fontSize: '10px', color: theme.textMuted }}>
                    Reconciliation note
                    <textarea
                      value={reconciliationNote}
                      onChange={(event) => setReconciliationNote(event.target.value)}
                      maxLength={2000}
                      required
                      rows={3}
                      placeholder="Record what was reviewed and the evidence or follow-up."
                      style={{ resize: 'vertical', background: theme.surfaceRaised, color: theme.text, border: `1px solid ${theme.borderBright}`, borderRadius: theme.radiusSmall, padding: '7px 9px', font: `11px ${theme.fontSans}` }}
                    />
                  </label>
                  <div style={{ fontSize: '10px', color: theme.textDim }}>
                    Records a durable review note only; it does not retry, correct, authorize, or execute the command.
                  </div>
                  <button
                    type="button"
                    onClick={() => runCommandAction('reconcile')}
                    disabled={Boolean(commandAction) || !reconciliationNote.trim() || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/.test(reconciliationOperator)}
                    style={{ justifySelf: 'start', background: theme.surfaceRaised, color: theme.accent, border: `1px solid ${theme.borderBright}`, borderRadius: theme.radiusSmall, padding: '6px 10px', fontSize: '10px', fontWeight: 700, cursor: commandAction ? 'wait' : 'pointer', opacity: commandAction || !reconciliationNote.trim() || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/.test(reconciliationOperator) ? 0.6 : 1 }}
                  >
                    {commandAction === 'reconcile' ? 'RECORDING…' : 'RECORD REVIEW'}
                  </button>
                </div>
              )}
            </div>
          )}

          <div style={{
            padding: '10px 14px',
            background: theme.surfaceDeep,
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radiusSmall,
            marginBottom: '10px',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: theme.textMuted, marginBottom: '8px' }}>
              Divergence Feed
            </div>
            {divergenceAlerts.length === 0 ? (
              <div style={{ fontSize: '11px', color: theme.textDim }}>no divergent command evidence</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {divergenceAlerts.map((alert) => (
                  <div
                    key={alert.commandId}
                    onClick={() => setSelectedCommandId(alert.commandId)}
                    style={{
                      padding: '8px 10px',
                      border: `1px solid ${theme.divergent}66`,
                      borderRadius: theme.radiusSmall,
                      background: theme.surfaceRaised,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                      <div style={{ fontSize: '10px', color: theme.textMuted, fontWeight: 700 }}>{alert.commandId}</div>
                      <div style={{ fontSize: '10px', color: theme.divergent, fontWeight: 700 }}>{alert.status}</div>
                    </div>
                    <div style={{ fontSize: '11px', color: theme.text, marginBottom: '3px' }}>{alert.intent}</div>
                    <div style={{ fontSize: '10px', color: theme.textDim }}>
                      by {alert.requestedBy} · {alert.reality?.classification ?? 'unknown'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Policy */}
          <div style={{
            padding: '10px 14px',
            background: theme.surfaceDeep,
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radiusSmall,
          }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: theme.textMuted, marginBottom: '6px' }}>
              Policy
            </div>
            <div style={{ fontSize: '11px', color: theme.textDim, display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <span>auth: <span style={{ color: theme.accent }}>{health.policy.authMode}</span></span>
              <span>revocation: <span style={{ color: health.policy.revocationEnabled ? theme.verified : theme.divergent }}>
                {health.policy.revocationEnabled ? 'enabled' : 'disabled'}
              </span></span>
              <span>encryption: <span style={{ color: theme.textDim }}>{health.policy.persistenceEncryption}</span></span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
