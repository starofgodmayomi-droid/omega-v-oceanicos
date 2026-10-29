import { theme } from './oceanicosTheme';

/*
 * The human side of the LUCID gate. A paused irreversible intent carries a
 * pending approval id; this panel is the only place that decides it, and the
 * API records the decision once.
 */

export type ApprovalView = {
  id: string;
  status: 'PENDING' | 'AUTHORIZED' | 'REJECTED';
  gate: string;
  decided_at: string | null;
};

type Props = {
  approval: ApprovalView;
  busy: boolean;
  onDecision: (decision: 'AUTHORIZE' | 'REJECT') => void;
};

const DECISION_TONE: Record<ApprovalView['status'], string> = {
  PENDING: '#f97316',
  AUTHORIZED: '#22c55e',
  REJECTED: '#64748b',
};

export function ApprovalGate({ approval, busy, onDecision }: Props) {
  const pending = approval.status === 'PENDING';
  const tone = DECISION_TONE[approval.status];

  const button = (label: string, decision: 'AUTHORIZE' | 'REJECT', accent: string) => (
    <button
      type="button"
      onClick={() => onDecision(decision)}
      disabled={busy}
      style={{
        padding: '9px 16px',
        borderRadius: theme.radiusSmall,
        border: `1px solid ${accent}66`,
        background: `${accent}1f`,
        color: accent,
        fontFamily: theme.fontMono,
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.14em',
        cursor: busy ? 'not-allowed' : 'pointer',
        opacity: busy ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      data-approval-state={approval.status}
      style={{
        marginTop: '14px',
        padding: '14px 16px',
        border: `1px solid ${tone}55`,
        borderRadius: theme.radiusSmall,
        background: `${tone}0f`,
      }}
    >
      <div
        style={{
          fontFamily: theme.fontMono,
          fontSize: '10px',
          letterSpacing: '0.18em',
          color: tone,
          marginBottom: '8px',
        }}
      >
        LUCID GATE · {approval.gate.toUpperCase()} · {approval.status}
      </div>
      <div
        style={{
          fontFamily: theme.fontMono,
          fontSize: '10.5px',
          color: theme.textDim,
          marginBottom: pending ? '12px' : 0,
          wordBreak: 'break-all',
        }}
      >
        APPROVAL · {approval.id}
        {approval.decided_at ? ` · decided ${approval.decided_at}` : ''}
      </div>
      {pending && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {button(busy ? 'DECIDING' : 'AUTHORIZE', 'AUTHORIZE', '#22c55e')}
          {button('REJECT', 'REJECT', '#ef4444')}
        </div>
      )}
    </div>
  );
}
