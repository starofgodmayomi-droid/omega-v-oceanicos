import React from 'react';
import {
  summarizeWaterFlow,
  type WaterFlowFrameView,
  type LivingWaterStageStatus,
} from './water-flow-panel-model';

interface WaterFlowPanelProps {
  frames?: readonly WaterFlowFrameView[] | null;
}

const STATUS_COLOR: Record<LivingWaterStageStatus | 'VERIFIED', string> = {
  VERIFIED: '#6ee7b7',
  MODEL_ONLY: '#7dd3fc',
  DIVERGENT: '#fca5a5',
  UNKNOWN: '#94a3b8',
  NOT_EXECUTED: '#facc15',
};

export function WaterFlowPanel({ frames = null }: WaterFlowPanelProps) {
  const summary = summarizeWaterFlow(frames);
  const color = STATUS_COLOR[summary.status];

  return (
    <section
      aria-label="Living Water evidence trace"
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
            💧 LIVING WATER · REALITY-BOUND TRACE
          </div>
          <div style={{ color: '#94a3b8', fontSize: '11px', lineHeight: 1.5, marginTop: '4px' }}>
            {summary.traceId
              ? 'Showing the active command receipt. MODEL ONLY means a v1 symbolic frame exists; UNKNOWN means this flow has no distinct evidence for that step. Neither means verified reality.'
              : 'Waiting for an active command receipt; no lifecycle step is claimed as executed.'}
          </div>
        </div>
        <span
          aria-label={`Overall trace status: ${summary.status}`}
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
      </div>
      <div
        role="list"
        aria-label="Living Water lifecycle stages and evidence coverage; not a progress indicator"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(82px, 1fr))', gap: '6px', marginTop: '16px' }}
      >
        {summary.livingWaterSteps.map((step) => {
          const stepColor = STATUS_COLOR[step.status];
          const evidenceLabel = step.status.replace(/_/g, ' ');
          const mapped = step.machineStages.length > 0 ? `v1: ${step.machineStages.join(', ')}` : 'no distinct v1 stage';
          return (
            <div
              key={step.stage}
              role="listitem"
              aria-label={`${step.stage}: ${evidenceLabel}. ${mapped}. ${step.meaning}`}
              title={step.meaning}
              style={{
                minHeight: '60px',
                padding: '7px 5px',
                background: step.status === 'MODEL_ONLY' ? '#0b2738' : '#03080d',
                border: `1px solid ${step.status === 'MODEL_ONLY' ? '#38bdf855' : `${stepColor}55`}`,
                color: stepColor,
                fontSize: '9px',
                lineHeight: 1.3,
                textAlign: 'center',
                display: 'grid',
                alignContent: 'center',
                gap: '3px',
              }}
            >
              <strong>{step.stage}</strong>
              <span>{evidenceLabel}</span>
              <span style={{ color: '#64748b', fontSize: '8px' }}>{mapped}</span>
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
