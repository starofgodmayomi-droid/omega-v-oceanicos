import { useCallback, useEffect, useMemo, useState } from 'react';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const REFRESH_MS = 15_000;

type CommandSummary = {
  commandId: string;
  intent: string;
  requestedBy: string;
  status: string;
  createdAt: string;
  reality?: {
    observedState?: string;
    evidence?: string;
    observedAt?: string;
    classification?: string;
  } | null;
};

function isDivergent(command: CommandSummary): boolean {
  return command.status === 'DIVERGENT' || command.reality?.classification === 'DIVERGENT';
}

export function DivergenceAlertsPanel() {
  const [commands, setCommands] = useState<CommandSummary[]>([]);
  const [acknowledged, setAcknowledged] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const fetchCommands = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/v1/omega/divergences?limit=50`);
      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      if (!response.ok) throw new Error(data?.error || `Alert check failed (${response.status})`);
      setCommands(Array.isArray(data?.alerts) ? data.alerts : []);
      setLastChecked(new Date().toISOString());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Divergence alert check failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCommands();
    const timer = window.setInterval(fetchCommands, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [fetchCommands]);

  const divergent = useMemo(() => commands.filter(isDivergent), [commands]);
  const active = divergent.filter((command) => !acknowledged.includes(command.commandId));

  const acknowledge = (commandId: string) => {
    setAcknowledged((current) => current.includes(commandId) ? current : [...current, commandId]);
  };

  return (
    <section aria-label="Automated divergence alerts" style={{ marginBottom: '22px', border: `1px solid ${active.length > 0 ? '#e09a61' : '#285048'}`, borderRadius: '6px', background: active.length > 0 ? 'linear-gradient(135deg, #2a1c14, #111614)' : '#0b1d1a', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <div>
          <div style={{ color: active.length > 0 ? '#ffc28f' : '#8ce8c8', fontSize: '13px', fontWeight: 700 }}>⚠ DIVERGENCE ALERTS</div>
          <div style={{ color: '#87aaa2', fontSize: '11px', marginTop: '4px' }}>{active.length > 0 ? `${active.length} observed result${active.length === 1 ? '' : 's'} differ from expectation.` : 'No unacknowledged divergent observations.'}</div>
        </div>
        <button onClick={fetchCommands} disabled={loading} style={{ border: '1px solid #547b74', background: 'transparent', color: '#b6d4cd', borderRadius: '4px', padding: '6px 9px', fontSize: '10px' }}>{loading ? 'CHECKING…' : 'REFRESH'}</button>
      </div>
      {error && <div role="alert" style={{ color: '#ffaaa0', fontSize: '11px', marginTop: '10px' }}>⚠ {error}</div>}
      {active.length > 0 && <div style={{ display: 'grid', gap: '8px', marginTop: '12px' }}>{active.map((command) => <article key={command.commandId} style={{ border: '1px solid #9d6546', borderRadius: '4px', background: '#17130f', padding: '10px' }}>
        <div style={{ color: '#ffe0bc', fontSize: '11px', fontWeight: 700 }}>{command.intent}</div>
        <div style={{ color: '#b9a88a', font: '10px DM Mono, monospace', marginTop: '4px' }}>{command.commandId} · by {command.requestedBy}</div>
        <div style={{ color: '#ffc28f', fontSize: '11px', marginTop: '7px' }}>Observed: {command.reality?.observedState ?? 'unknown'}</div>
        <div style={{ color: '#b9a88a', fontSize: '10px', lineHeight: 1.5, marginTop: '4px' }}>{command.reality?.evidence ?? 'No divergence evidence text supplied.'}</div>
        <button onClick={() => acknowledge(command.commandId)} style={{ marginTop: '8px', border: '1px solid #9d6546', background: 'transparent', color: '#ffc28f', borderRadius: '4px', padding: '5px 8px', fontSize: '10px' }}>ACKNOWLEDGE VIEWED</button>
      </article>)}</div>}
      <div style={{ color: '#547b74', font: '10px DM Mono, monospace', marginTop: '10px' }}>Automatic check every 15s · acknowledgement is local UI state only · divergence remains in ledger</div>
      {lastChecked && <div style={{ color: '#547b74', font: '10px DM Mono, monospace', marginTop: '3px' }}>Last checked {new Date(lastChecked).toLocaleTimeString()}</div>}
    </section>
  );
}
