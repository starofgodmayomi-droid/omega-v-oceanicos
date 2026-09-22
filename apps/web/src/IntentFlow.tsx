import { theme, statusColor, humanStatus } from './oceanicosTheme';

/*
 * IntentFlow — the ASK → UNDERSTAND → PROPOSE → AUTHORIZE → PROVE card.
 *
 * This is the frontier surface's core interaction. The human states what
 * they want; the system shows what it found, what it plans, and asks
 * permission. After execution, it proves what actually happened.
 *
 * The five human concepts:
 *   1. ASK       — "What shall we make real?"
 *   2. UNDERSTAND — "What does the system know?"
 *   3. PROPOSE    — "Here is what I recommend and why."
 *   4. AUTHORIZE  — "Here is exactly what will happen if you approve."
 *   5. PROVE      — "Here is what actually happened."
 */

interface IntentFlowProps {
  command: any;
  loading: boolean;
  onApprove: () => void;
  onExecute: () => void;
  onObserve: () => void;
  onViewEvidence: () => void;
  onViewTimeline: () => void;
  onDismiss: () => void;
  simulationMode: boolean;
  humanGateRequired: boolean;
}

const PLAN_STEPS = [
  { label: 'Inspect', desc: 'examine current state' },
  { label: 'Simulate', desc: 'model the change' },
  { label: 'Verify', desc: 'check evidence' },
  { label: 'Ask permission', desc: 'human gate' },
  { label: 'Execute within bounds', desc: 'bounded action' },
];

export function IntentFlow({
  command,
  loading,
  onApprove,
  onExecute,
  onObserve,
  onViewEvidence,
  onViewTimeline,
  onDismiss,
  simulationMode,
  humanGateRequired,
}: IntentFlowProps) {
  if (!command?.command) return null;

  const cmd = command.command;
  const status: string = cmd.status;
  const reality = command.reality;

  const isReview = status === 'REVIEW' || status === 'PROPOSED';
  const isAuthorized = status === 'AUTHORIZED';
  const isExecuted = status === 'EXECUTED';
  const isReconciled = ['VERIFIED', 'DIVERGENT', 'UNKNOWN'].includes(status);

  // Determine plan step progress
  const stepProgress = PLAN_STEPS.map((step, i) => {
    if (i < 3) return { ...step, done: true, current: false };
    if (i === 3) {
      return {
        ...step,
        done: isAuthorized || isExecuted || isReconciled,
        current: isReview,
      };
    }
    return {
      ...step,
      done: isReconciled,
      current: isAuthorized || isExecuted,
    };
  });

  const phaseLabel = isReview
    ? '◇ UNDERSTAND'
    : isAuthorized
      ? '⚙ READY'
      : isExecuted
        ? '👁 OBSERVING'
        : status === 'VERIFIED'
          ? '✓ RECONCILED'
          : status === 'DIVERGENT'
            ? '⚠ DIVERGENT'
            : '? UNKNOWN';

  const phaseColor = statusColor(status);

  return (
    <div
      className="omega-fade-in"
      style={{
        marginTop: '24px',
        background: theme.surface,
        border: `1px solid ${theme.borderBright}`,
        borderRadius: theme.radius,
        padding: '24px',
        fontFamily: theme.fontSans,
      }}
    >
      {/* Phase indicator */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          borderRadius: theme.radiusPill,
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.06em',
          color: phaseColor,
          background: `${phaseColor}15`,
          border: `1px solid ${phaseColor}44`,
          marginBottom: '18px',
        }}
      >
        {phaseLabel}
      </div>

      {/* Intent */}
      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: theme.textDim,
            marginBottom: '6px',
          }}
        >
          YOUR INTENT
        </div>
        <div style={{ fontSize: '17px', color: theme.text, lineHeight: 1.4 }}>
          {cmd.intent}
        </div>
      </div>

      {/* Understanding */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '10px',
          marginBottom: '20px',
        }}
      >
        <UnderstandingItem
          label="Evidence"
          value={cmd.change?.evidence ?? 'gathering…'}
        />
        <UnderstandingItem
          label="Authority"
          value={humanGateRequired ? 'Human approval required' : 'Autonomous'}
        />
        <UnderstandingItem
          label="Risk"
          value={simulationMode ? 'Low — simulation only' : 'Medium — live'}
        />
        <UnderstandingItem
          label="Mode"
          value={simulationMode ? 'Simulation' : 'Live'}
        />
      </div>

      {/* Workers (if any) */}
      {cmd.workers?.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: theme.textDim,
              marginBottom: '6px',
            }}
          >
            WORKERS
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {cmd.workers.map((w: string) => (
              <span
                key={w}
                style={{
                  fontSize: '11px',
                  padding: '3px 10px',
                  borderRadius: theme.radiusPill,
                  color: theme.accent,
                  background: `${theme.accent}12`,
                  border: `1px solid ${theme.accent}33`,
                }}
              >
                {w}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Plan */}
      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: theme.textDim,
            marginBottom: '12px',
          }}
        >
          PLAN
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {stepProgress.map((step, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: '12px',
                paddingBottom: i < stepProgress.length - 1 ? '14px' : '0',
                position: 'relative',
              }}
            >
              {/* Connector line */}
              {i < stepProgress.length - 1 && (
                <div
                  style={{
                    position: 'absolute',
                    left: '11px',
                    top: '24px',
                    bottom: '0',
                    width: '1px',
                    background: step.done ? theme.accent : theme.borderSubtle,
                    opacity: step.done ? 0.4 : 0.3,
                  }}
                />
              )}
              {/* Circle */}
              <div
                className={step.current ? 'omega-pulse' : undefined}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  flexShrink: 0,
                  background: step.done
                    ? theme.accent
                    : step.current
                      ? `${theme.warning}22`
                      : theme.surfaceDeep,
                  color: step.done
                    ? theme.bg
                    : step.current
                      ? theme.warning
                      : theme.textDim,
                  border: step.done
                    ? 'none'
                    : `1px solid ${step.current ? theme.warning : theme.borderSubtle}`,
                  zIndex: 1,
                }}
              >
                {step.done ? '✓' : i + 1}
              </div>
              {/* Label */}
              <div style={{ paddingTop: '2px' }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: step.current ? 600 : 500,
                    color: step.done
                      ? theme.text
                      : step.current
                        ? theme.warning
                        : theme.textDim,
                  }}
                >
                  {step.label}
                </div>
                <div style={{ fontSize: '11px', color: theme.textDim, marginTop: '1px' }}>
                  {step.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {isReview && (
          <button
            onClick={onApprove}
            disabled={loading}
            style={actionBtnStyle(theme.warning, loading)}
          >
            {loading ? 'Authorizing…' : 'Authorize'}
          </button>
        )}
        {isAuthorized && (
          <button
            onClick={onExecute}
            disabled={loading}
            style={actionBtnStyle(theme.accent, loading)}
          >
            {loading ? 'Executing…' : 'Execute bounded action'}
          </button>
        )}
        {isExecuted && (
          <button
            onClick={onObserve}
            disabled={loading}
            style={actionBtnStyle(theme.accent, loading)}
          >
            {loading ? 'Observing…' : 'Observe & verify reality'}
          </button>
        )}
      </div>

      {/* Prove card */}
      {isReconciled && (
        <div
          className="omega-fade-in"
          style={{
            marginTop: '20px',
            padding: '18px',
            borderRadius: theme.radiusSmall,
            background: `${phaseColor}0a`,
            border: `1px solid ${phaseColor}33`,
          }}
        >
          <div
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: phaseColor,
              marginBottom: '14px',
            }}
          >
            {status === 'VERIFIED'
              ? '✓ Change reconciled'
              : status === 'DIVERGENT'
                ? '⚠ Change divergent'
                : '? Change unknown'}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '10px',
              marginBottom: '14px',
            }}
          >
            <ProveItem
              label="Expected"
              value={cmd.change?.stateAfter ?? cmd.execution?.stateAfter ?? '—'}
            />
            <ProveItem
              label="Observed"
              value={reality?.observedState ?? '—'}
            />
            <ProveItem
              label="Evidence"
              value={reality?.evidence ?? '—'}
            />
            <ProveItem label="Provenance" value="intact" />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: phaseColor,
              }}
            >
              STATUS: {humanStatus(status).toUpperCase()}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={onViewEvidence} style={linkBtnStyle}>
                View Evidence
              </button>
              <button onClick={onViewTimeline} style={linkBtnStyle}>
                View Timeline
              </button>
              <button
                onClick={onDismiss}
                style={{
                  ...linkBtnStyle,
                  color: theme.accent,
                  borderColor: `${theme.accent}44`,
                }}
              >
                New Intent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Command ID (subtle footnote) */}
      <div
        style={{
          marginTop: '16px',
          fontSize: '10px',
          fontFamily: theme.fontMono,
          color: theme.textDim,
          opacity: 0.6,
        }}
      >
        {cmd.commandId}
      </div>
    </div>
  );
}

function UnderstandingItem({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: '10px 12px',
        borderRadius: theme.radiusSmall,
        background: theme.surfaceDeep,
        border: `1px solid ${theme.border}`,
      }}
    >
      <div
        style={{
          fontSize: '9px',
          fontWeight: 700,
          letterSpacing: '0.1em',
          color: theme.textDim,
          marginBottom: '4px',
        }}
      >
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: '12px', color: theme.textMuted, lineHeight: 1.3 }}>
        {value}
      </div>
    </div>
  );
}

function ProveItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: '9px',
          fontWeight: 700,
          letterSpacing: '0.1em',
          color: theme.textDim,
          marginBottom: '3px',
        }}
      >
        {label.toUpperCase()}
      </div>
      <div
        style={{
          fontSize: '12px',
          color: theme.text,
          fontFamily: theme.fontMono,
          wordBreak: 'break-word',
        }}
      >
        {value}
      </div>
    </div>
  );
}

const actionBtnStyle = (color: string, loading: boolean): React.CSSProperties => ({
  padding: '11px 22px',
  borderRadius: theme.radiusPill,
  border: 'none',
  background: loading ? `${color}88` : color,
  color: theme.bg,
  fontFamily: theme.fontSans,
  fontSize: '13px',
  fontWeight: 700,
  cursor: loading ? 'wait' : 'pointer',
  opacity: loading ? 0.7 : 1,
  transition: 'opacity 0.2s',
});

const linkBtnStyle: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: theme.radiusPill,
  border: `1px solid ${theme.borderBright}`,
  background: 'transparent',
  color: theme.textMuted,
  fontFamily: theme.fontSans,
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
};
