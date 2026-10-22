import React from 'react';
import { WATER_BEHAVIOR_MEANING, WATER_BEHAVIORS } from '../../../packages/types/src/water-intelligence.ts';
import {
  WATER_FLOW_STAGES,
  summarizeWaterFlow,
  type WaterFlowFrameView,
} from './water-flow-panel-model';

interface WaterFlowPanelProps {
  frames?: readonly WaterFlowFrameView[] | null;
}

const CLAIM_COLOR = {
  'verified-glow': '#6ee7b7',
  divergence: '#fca5a5',
  unknown: '#94a3b8',
  held: '#facc15',
} as const;

export function WaterFlowPanel({ frames = null }: WaterFlowPanelProps) {
  const summary = summarizeWaterFlow(frames);
  const color = CLAIM_COLOR[summary.skin.visualClaim];
  const glow = summary.skin.visualClaim === 'verified-glow';

  return (
    <section
      aria-label="KAI bounded water-flow trace"
      style={{
        marginTop: '18px',
        padding: '18px',
        background: '#07121b',
        border: `1px solid ${glow ? '#38bdf833' : '#1e293b'}`,
        borderRadius: '6px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
        <div>
          <div style={{ color: glow ? '#6ee7b7' : '#cbd5e1', fontSize: '13px', fontWeight: 'bold' }}>
            💧 WATER INTELLIGENCE · BOUND TO EVIDENCE
          </div>
          <div style={{ color: '#94a3b8', fontSize: '11px', lineHeight: 1.5, marginTop: '4px' }}>
            Water names are claims about this receipt. A glow appears only when the status is VERIFIED.
            This panel does not execute a pipeline or verify external reality.
          </div>
        </div>
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

      <div
        role="list"
        aria-label="Water behaviors bound to evidence"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '6px', marginTop: '14px' }}
      >
        {WATER_BEHAVIORS.map((behavior) => {
          const claim = summary.skin.behaviors[behavior];
          const shown = claim === 'shown';
          return (
            <div
              key={behavior}
              role="listitem"
              title={WATER_BEHAVIOR_MEANING[behavior]}
              style={{
                padding: '8px',
                background: '#03080d',
                border: `1px solid ${shown ? '#334155' : '#0f172a'}`,
                color: shown ? '#e2e8f0' : '#475569',
                fontSize: '10px',
                lineHeight: 1.35,
              }}
            >
              <div style={{ fontWeight: 'bold' }}>{behavior}</div>
              <div>{shown ? 'shown' : 'withheld'}</div>
            </div>
          );
        })}
      </div>

      <div style={{ color: '#64748b', fontSize: '10px', lineHeight: 1.5, marginTop: '12px' }}>
        {summary.note}
        <div style={{ marginTop: '3px' }}>{summary.skin.note}</div>
        {summary.traceId && <div style={{ marginTop: '3px', fontFamily: 'monospace' }}>trace: {summary.traceId} · max steps: {summary.maxSteps}</div>}
      </div>
    </section>
  );
}
