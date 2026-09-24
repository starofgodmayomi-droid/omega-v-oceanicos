import React, { useState, useEffect } from 'react';
import { theme, statusColor, humanStatus } from './oceanicosTheme';

/*
 * LifecycleFlow — the mirror-water command surface.
 *
 * Replaces the conventional collapsible-accordion pattern with a spatial,
 * always-visible pipeline flow. The full Ω∞v lifecycle is exposed as a
 * continuous current:
 *
 *   INTENT → EVIDENCE → AUTHORITY → ADMIT → EXECUTE
 *         → OBSERVE → VERIFY → REMEMBER → NEXT Δ ↺∞
 *
 * Each stage is always visible with its current state. Stages with detail
 * panels expand inline. Water-like flowing connections animate between
 * stages, making the interface feel alive and continuous.
 *
 * Section 8 of the constitution: "The interface is a mirror-water command
 * surface rather than a conventional dashboard."
 */

export type StageState = 'dormant' | 'active' | 'done' | 'denied' | 'divergent' | 'available';

export interface LifecycleStage {
  id: string;
  icon: string;
  label: string;
  subtitle: string;
  state: StageState;
  detail?: React.ReactNode;
}

interface LifecycleFlowProps {
  stages: LifecycleStage[];
  openStageId?: string | null;
  onStageToggle?: (id: string) => void;
}

const STATE_COLORS: Record<StageState, string> = {
  dormant: theme.unknown,
  active: theme.warning,
  done: theme.verified,
  denied: theme.divergent,
  divergent: theme.divergent,
  available: theme.accentDim,
};

const STATE_LABELS: Record<StageState, string> = {
  dormant: 'Pending',
  active: 'Active',
  done: 'Complete',
  denied: 'Denied',
  divergent: 'Divergent',
  available: 'Available',
};

export function LifecycleFlow({ stages, openStageId, onStageToggle }: LifecycleFlowProps) {
  const [internalOpen, setInternalOpen] = useState<string | null>(null);

  // External control (from IntentFlow "View Evidence" etc.)
  useEffect(() => {
    if (openStageId) {
      setInternalOpen(openStageId);
    }
  }, [openStageId]);

  const toggle = (id: string) => {
    const next = internalOpen === id ? null : id;
    setInternalOpen(next);
    onStageToggle?.(next ?? '');
  };

  return (
    <div style={{ fontFamily: theme.fontSans }}>
      {stages.map((stage, i) => {
        const isOpen = internalOpen === stage.id;
        const color = STATE_COLORS[stage.state];
        const isLast = i === stages.length - 1;
        const hasDetail = !!stage.detail;
        const isActive = stage.state === 'active';

        return (
          <div key={stage.id} style={{ position: 'relative' }}>
            {/* Flowing connection to next stage */}
            {!isLast && (
              <div
                style={{
                  position: 'absolute',
                  left: '27px',
                  top: '48px',
                  bottom: '-12px',
                  width: '2px',
                  overflow: 'hidden',
                  zIndex: 0,
                }}
              >
                <div
                  className={
                    stage.state === 'done' ? 'omega-flow-line' : 'omega-flow-line-dormant'
                  }
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: stage.state === 'dormant' ? 0.3 : 0.7,
                  }}
                />
              </div>
            )}

            {/* Stage row */}
            <div
              style={{
                display: 'flex',
                gap: '16px',
                alignItems: 'flex-start',
                paddingBottom: isLast ? 0 : '12px',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {/* Node */}
              <div
                style={{
                  position: 'relative',
                  width: '56px',
                  height: '56px',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isActive && (
                  <div
                    className="omega-ripple"
                    style={{
                      position: 'absolute',
                      width: '48px',
                      height: '48px',
                      color,
                      opacity: 0.4,
                    }}
                  />
                )}
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    background:
                      stage.state === 'dormant'
                        ? theme.surfaceDeep
                        : `${color}15`,
                    border: `2px solid ${
                      stage.state === 'dormant'
                        ? theme.borderSubtle
                        : color
                    }`,
                    boxShadow:
                      isActive || stage.state === 'done'
                        ? `0 0 16px ${color}33`
                        : 'none',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  {stage.state === 'done' ? (
                    <span style={{ color, fontSize: '18px' }}>✓</span>
                  ) : (
                    <span style={{ opacity: stage.state === 'dormant' ? 0.4 : 1 }}>
                      {stage.icon}
                    </span>
                  )}
                </div>
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0, paddingTop: '4px' }}>
                <div
                  onClick={() => hasDetail && toggle(stage.id)}
                  style={{
                    cursor: hasDetail ? 'pointer' : 'default',
                    paddingBottom: hasDetail ? '8px' : '0',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '15px',
                        fontWeight: 600,
                        color: stage.state === 'dormant' ? theme.textMuted : theme.text,
                      }}
                    >
                      {stage.label}
                    </span>
                    <span
                      style={{
                        padding: '2px 10px',
                        borderRadius: theme.radiusPill,
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        color,
                        background: `${color}12`,
                        border: `1px solid ${color}33`,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {STATE_LABELS[stage.state]}
                    </span>
                    {hasDetail && (
                      <span
                        style={{
                          fontSize: '14px',
                          color: theme.textDim,
                          marginLeft: 'auto',
                          transition: 'transform 0.2s',
                          display: 'inline-block',
                          transform: isOpen ? 'rotate(180deg)' : 'none',
                        }}
                      >
                        ⌄
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: theme.textDim,
                      marginTop: '3px',
                    }}
                  >
                    {stage.subtitle}
                  </div>
                </div>

                {/* Expanded detail panel */}
                {isOpen && hasDetail && (
                  <div
                    className="omega-fade-in"
                    style={{
                      marginTop: '12px',
                      marginBottom: '8px',
                      border: `1px solid ${theme.border}`,
                      borderRadius: theme.radiusSmall,
                      overflow: 'hidden',
                      background: theme.surfaceDeep,
                    }}
                  >
                    {stage.detail}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/*
 * Derive lifecycle stage states from the current Omega command.
 *
 * Maps the command's status to the 9 pipeline stages, respecting the
 * non-collapse law: each stage's state is evidence-backed, not assumed.
 */
export function deriveStageStates(command: any): Record<string, StageState> {
  const dormant: Record<string, StageState> = {
    intent: 'dormant',
    evidence: 'dormant',
    authority: 'dormant',
    admit: 'dormant',
    execute: 'dormant',
    observe: 'dormant',
    verify: 'dormant',
    remember: 'dormant',
    next: 'dormant',
  };

  if (!command?.command) return dormant;

  const status: string = (command.command.status || '').toUpperCase();
  const decision = command.command.change?.decision?.toUpperCase();

  // INTENT is done as soon as a command exists
  const states: Record<string, StageState> = {
    ...dormant,
    intent: 'done',
    evidence: 'done',
  };

  // AUTHORITY — active when awaiting approval, done when authorized+
  if (['AUTHORIZED', 'EXECUTED', 'VERIFIED', 'DIVERGENT', 'UNKNOWN'].includes(status)) {
    states.authority = 'done';
  } else {
    states.authority = 'active';
  }

  // ADMIT — done when decision is ALLOW, denied when DENY, active when REVIEW
  if (decision === 'ALLOW' || ['AUTHORIZED', 'EXECUTED', 'VERIFIED', 'DIVERGENT', 'UNKNOWN'].includes(status)) {
    states.admit = 'done';
  } else if (decision === 'DENY') {
    states.admit = 'denied';
  } else {
    states.admit = 'active';
  }

  // EXECUTE — done when executed+
  if (['EXECUTED', 'VERIFIED', 'DIVERGENT', 'UNKNOWN'].includes(status)) {
    states.execute = 'done';
  } else if (status === 'AUTHORIZED') {
    states.execute = 'active';
  }

  // OBSERVE — done when reality data exists
  if (['VERIFIED', 'DIVERGENT', 'UNKNOWN'].includes(status)) {
    states.observe = 'done';
  } else if (status === 'EXECUTED') {
    states.observe = 'active';
  }

  // VERIFY — done when verified, divergent when divergent
  if (status === 'VERIFIED') {
    states.verify = 'done';
  } else if (status === 'DIVERGENT') {
    states.verify = 'divergent';
  } else if (status === 'UNKNOWN') {
    states.verify = 'done';
  }

  // REMEMBER — done when the cycle is reconciled
  if (['VERIFIED', 'DIVERGENT', 'UNKNOWN'].includes(status)) {
    states.remember = 'done';
  }

  // NEXT Δ — always pending (the next transition)
  states.next = 'dormant';

  return states;
}
