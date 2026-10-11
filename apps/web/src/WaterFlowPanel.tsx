import React from 'react';
import {
  WATER_FLOW_STAGES,
  summarizeWaterFlow,
  type WaterFlowFrameView,
} from './water-flow-panel-model';

interface WaterFlowPanelProps {
  frames?: readonly WaterFlowFrameView[] | null;
  loading?: boolean;
  onObserve?: () => void;
}

const STATUS_COLOR = {
  VERIFIED: '#6ee7b7',
  DIVERGENT: '#fca5a5',
  UNKNOWN: '#94a3b8',
  NOT_EXECUTED: '#facc15',
} as const;

export function WaterFlowPanel({ frames = null, loading = false, onObserve }: WaterFlowPanelProps) {
  const summary = summarizeWaterFlow(frames);
  const color = STATUS_COLOR[summary.status];

  return (
    <section
      aria-label="KAI bounded water-flow trace"
      style={{
        marginTop: '18px',
        padding: '18px',
        background: '#07121b',
        border: '1px solid #38bdf833',
        borderRadius: '6px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
        <div>
          <div style={{ color: '#6ee7b7', fontSize: '13px', fontWeight: 'bold' }}>
            💧 KAI WATER-FLOW · FINITE TRACE
          </div>
          <div style={{ color: '#94a3b8', fontSize: '11px', lineHeight: 1.5, marginTop: '4px' }}>
            A provenance-aware representation of a bounded pipeline receipt. The trace is not external reality verification.
          </div>
        </div>
        <div style={{ display: 'grid', gap: '6px', justifyItems: 'end' }}>
          <span
            style={{
              color,
              background: `${color}15`,
              border: `1px solid ${color}44`,
              borderRadius: '3px',
              padding: '3px 7px',
              fontSize: '9px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
            }}
          >
            {summary.status}
          </span>
          {onObserve && (
            <button
              type="button"
              onClick={onObserve}
              disabled={loading}
              style={{
                background: '#0a1d2e',
                color: '#6ee7b7',
                border: '1px solid #6ee7b755',
                borderRadius: '4px',
                padding: '6px 9px',
                fontSize: '9px',
                fontWeight: 'bold',
                cursor: loading ? 'wait' : 'pointer',
              }}
            >
              {loading ? 'OBSERVING...' : 'REQUEST FINITE TRACE'}
            </button>
          )}
        </div>
      </div>

      <div
        role="list"
        aria-label="Canonical water-flow stages"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', gap: '4px', marginTop: '16px' }}
      >
        {WATER_FLOW_STAGES.map((stage) => {
          const observed = summary.stages.includes(stage);
          return (
            <div
              key={stage}
              role="listitem"
              style={{
                minHeight: '48px',
                padding: '7px 5px',
                background: observed ? '#123d37' : '#03080d',
                border: `1px solid ${observed ? '#6ee7b755' : '#1e293b'}`,
                color: observed ? '#b4ffe4' : '#64748b',
                fontSize: '9px',
                lineHeight: 1.3,
                textAlign: 'center',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              {stage}
            </div>
          );
        })}
      </div>

      <div style={{ color: '#64748b', fontSize: '10px', lineHeight: 1.5, marginTop: '12px' }}>
        {summary.note}
        {summary.traceId && <div style={{ marginTop: '3px', fontFamily: 'monospace' }}>trace: {summary.traceId} · max steps: {summary.maxSteps}</div>}
      </div>
    </section>
  );
}
