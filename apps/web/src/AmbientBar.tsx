import { theme, statusColor, humanStatus } from './oceanicosTheme';

/*
 * Ambient status strip — the quiet hum of the system.
 *
 * Replaces "SSE RETRYING: 16" with "Reconnecting…"
 * Replaces "ED25519 KEYPAIR" with "Identity · Protected"
 * Replaces "LOCAL-SIMULATION-ONLY" with "Simulation · Nothing can affect external systems"
 *
 * Progressive disclosure: these are the human-readable summaries.
 * The cryptographic details live one level deeper.
 */

interface AmbientBarProps {
  connected: boolean;
  restActive?: boolean;
  reconnectAttempt: number;
  simulationMode: boolean;
  identityActive: boolean;
  realityStatus: string | null;
  epochsRemembered: number;
  miningActive: boolean;
  mood?: {
    status?: string;
    uncertainty?: number;
    context?: string;
    decision?: string;
  } | null;
}

interface Indicator {
  label: string;
  value: string;
  color: string;
  pulse?: boolean;
}

export function AmbientBar(props: AmbientBarProps) {
  const isHealthy = props.connected || props.restActive;

  const indicators: Indicator[] = [
    {
      label: 'Connection',
      value: props.connected
        ? 'Connected'
        : props.restActive
          ? 'Active (REST)'
          : props.reconnectAttempt > 0
            ? 'Reconnecting…'
            : 'Offline',
      color: isHealthy
        ? theme.verified
        : props.reconnectAttempt > 0
          ? theme.warning
          : theme.divergent,
      pulse: !isHealthy,
    },
    {
      label: 'Mode',
      value: props.simulationMode
        ? 'Simulation · Nothing can affect external systems'
        : 'Live mode',
      color: props.simulationMode ? theme.accent : theme.warning,
    },
    {
      label: 'Identity',
      value: props.identityActive ? 'Protected' : 'Not mounted',
      color: props.identityActive ? theme.verified : theme.unknown,
    },
    {
      label: 'Reality',
      value: props.realityStatus
        ? humanStatus(props.realityStatus)
        : 'Awaiting observation',
      color: props.realityStatus ? statusColor(props.realityStatus) : theme.unknown,
    },
    {
      label: 'Memory',
      value: `${props.epochsRemembered} epoch${props.epochsRemembered === 1 ? '' : 's'}`,
      color: theme.accentDim,
    },
    {
      label: 'Activity',
      value: props.miningActive ? 'Autonomous mining' : 'Idle',
      color: props.miningActive ? theme.warning : theme.unknown,
    },
    ...(props.mood?.status ? [{
      label: 'Mood',
      value: `${props.mood.status} · ${Math.round((1 - (props.mood.uncertainty ?? 0.1)) * 100)}% flow`,
      color: props.mood.status === 'OPTIMAL_FLOW' || props.mood.status === 'HIGH_INTEGRITY' || props.mood.decision === 'ALLOW' ? theme.verified : theme.accent,
    }] : []),
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px 22px',
        padding: '10px 28px',
        borderBottom: `1px solid ${theme.borderSubtle}`,
        fontFamily: theme.fontSans,
        fontSize: '11px',
        alignItems: 'center',
      }}
    >
      {indicators.map((ind) => (
        <div key={ind.label} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span
            className={ind.pulse ? 'omega-pulse' : undefined}
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: ind.color,
              boxShadow: ind.pulse ? `0 0 8px ${ind.color}` : 'none',
              opacity: ind.pulse ? 1 : 0.5,
              flexShrink: 0,
            }}
          />
          <span style={{ color: theme.textDim, fontWeight: 500 }}>{ind.label}</span>
          <span style={{ color: ind.color, fontWeight: 600 }}>{ind.value}</span>
        </div>
      ))}
    </div>
  );
}
