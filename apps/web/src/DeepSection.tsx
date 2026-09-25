import { theme } from './oceanicosTheme';

/*
 * DeepSection — progressive disclosure wrapper.
 *
 * The frontier surface is simple by default. Technical depths unfold on
 * demand. Each section is a collapsed accordion that expands to reveal the
 * machinery underneath — ecosystem contracts, reality vectors, provenance
 * trails, system controls, observation streams.
 *
 * Controlled by the parent's openSections state so the IntentFlow card can
 * open a specific section programmatically (e.g. "View Evidence" opens
 * the Reality Verification section).
 */

interface DeepSectionProps {
  id: string;
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}

export function DeepSection({
  id,
  title,
  subtitle,
  isOpen,
  onToggle,
  children,
}: DeepSectionProps) {
  return (
    <div
      style={{
        marginBottom: '12px',
        fontFamily: theme.fontSans,
      }}
    >
      <button
        onClick={() => onToggle(id)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          padding: '16px 22px',
          background: isOpen ? theme.surface : theme.surfaceDeep,
          border: `1px solid ${isOpen ? theme.borderBright : theme.border}`,
          borderRadius: isOpen ? `${theme.radius} ${theme.radius} 0 0` : theme.radius,
          cursor: 'pointer',
          fontFamily: theme.fontSans,
          color: theme.text,
          transition: 'border-color 0.2s, background 0.2s',
        }}
      >
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '14px', fontWeight: 600 }}>{title}</div>
          {subtitle && (
            <div
              style={{
                fontSize: '12px',
                color: theme.textMuted,
                marginTop: '2px',
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
        <span
          style={{
            fontSize: '20px',
            color: theme.accent,
            fontWeight: 300,
            lineHeight: 1,
          }}
        >
          {isOpen ? '−' : '+'}
        </span>
      </button>
      {isOpen && (
        <div
          className="omega-fade-in"
          style={{
            border: `1px solid ${theme.borderBright}`,
            borderTop: 'none',
            borderRadius: `0 0 ${theme.radius} ${theme.radius}`,
            overflow: 'hidden',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
