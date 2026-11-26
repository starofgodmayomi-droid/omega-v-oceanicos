import React from 'react';
import { theme } from '../oceanicosTheme';

/*
 * PanelGroup — one calm fold in the background workspace.
 *
 * The frontier surface is one face: a group header carries the meaning, and the
 * machinery underneath stays collapsed until it is asked for. Groups are
 * controlled by the parent so the whole set can open or close together.
 */

interface PanelGroupProps {
  id: string;
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}

export function PanelGroup({ id, title, subtitle, isOpen, onToggle, children }: PanelGroupProps) {
  return (
    <div style={{ marginBottom: '10px', fontFamily: theme.fontSans }}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={`panel-group-${id}`}
        onClick={() => onToggle(id)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          width: '100%',
          padding: '14px 18px',
          background: isOpen ? theme.surface : theme.surfaceDeep,
          border: `1px solid ${isOpen ? theme.borderBright : theme.border}`,
          borderRadius: isOpen ? `${theme.radiusSmall} ${theme.radiusSmall} 0 0` : theme.radiusSmall,
          color: theme.text,
          fontFamily: theme.fontSans,
          textAlign: 'left',
          transition: 'border-color 0.2s, background 0.2s',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: theme.accent }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '3px' }}>{subtitle}</div>
          )}
        </div>
        <span aria-hidden="true" style={{ fontSize: '18px', color: theme.accent, fontWeight: 300, lineHeight: 1 }}>
          {isOpen ? '−' : '+'}
        </span>
      </button>
      {isOpen && (
        <div
          id={`panel-group-${id}`}
          className="omega-fade-in"
          style={{
            border: `1px solid ${theme.borderBright}`,
            borderTop: 'none',
            borderRadius: `0 0 ${theme.radiusSmall} ${theme.radiusSmall}`,
            overflow: 'hidden',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
