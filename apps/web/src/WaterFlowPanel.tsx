import React from 'react';

type WaterFlowFrame = {
  sequence: number;
  stage: string;
  transition: string;
  traceId: string;
  deterministic: boolean;
  bounds: { maxSteps: number };
  provenance: { source: string; verified: boolean; note: string };
};

export function WaterFlowPanel({ frames }: { frames?: readonly WaterFlowFrame[] }) {
  if (!frames?.length) return null;
  const active = frames[frames.length - 1];

  return (
    <section
      aria-label="Bounded KAI water flow"
      style={{
        marginTop: '16px',
        padding: '14px',
        borderRadius: '8px',
        border: '1px solid #38bdf855',
        background: '#07121b',
      }}
    >
      <div style={{ color: '#38bdf8', fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em' }}>
        KAI WATER FLOW · BOUNDED LOCAL TRACE
      </div>
      <div style={{ color: '#94a3b8', fontSize: '10px', marginTop: '5px', lineHeight: 1.5 }}>
        Symbolic transition evidence only · no external execution or physical-world observation
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center', marginTop: '12px' }}>
        {frames.map((frame, index) => (
          <React.Fragment key={`${frame.traceId}-${frame.sequence}`}>
            <span
              style={{
                color: frame === active ? '#6ee7b7' : '#cbd5e1',
                border: `1px solid ${frame === active ? '#6ee7b766' : '#334155'}`,
                background: frame === active ? '#6ee7b711' : 'transparent',
                borderRadius: '4px',
                padding: '4px 7px',
                fontSize: '10px',
                fontWeight: frame === active ? 800 : 500,
              }}
            >
              {frame.stage}
            </span>
            {index < frames.length - 1 && <span style={{ color: '#475569', fontSize: '11px' }}>→</span>}
          </React.Fragment>
        ))}
      </div>
      <div style={{ color: '#64748b', fontSize: '9px', marginTop: '10px', lineHeight: 1.5 }}>
        trace: {active.traceId} · max steps: {active.bounds.maxSteps} · deterministic: {String(active.deterministic)} · verified: {String(active.provenance.verified)}
      </div>
    </section>
  );
}
