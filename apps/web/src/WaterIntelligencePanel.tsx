import React, { useMemo, useState } from 'react';
import {
  WATER_BEHAVIORS,
  readWaterIntelligence,
  type WaterBehavior,
  type WaterIntelligenceInput,
} from './water-intelligence';

export interface WaterIntelligencePanelProps {
  reportedStatus?: string | null;
  expected?: string | null;
  actual?: string | null;
  verified?: boolean;
  conflict?: string | null;
  sources?: number;
}

const STATUS_COLOR = {
  VERIFIED: '#8ce8c8',
  DIVERGENT: '#ed9986',
  UNKNOWN: '#7f9e97',
  NOT_EXECUTED: '#8fb3a8',
} as const;

export function WaterIntelligencePanel({
  reportedStatus = null,
  expected = null,
  actual = null,
  verified = false,
  conflict = null,
  sources = 0,
}: WaterIntelligencePanelProps) {
  const [intent, setIntent] = useState('');
  const [carried, setCarried] = useState('');
  const [route, setRoute] = useState<string | null>(null);
  const [focus, setFocus] = useState<WaterBehavior>('REFLECTION');
  const [events, setEvents] = useState(0);
  const [filter, setFilter] = useState('');

  const input: WaterIntelligenceInput = useMemo(
    () => ({
      intent: carried,
      route,
      sources,
      depthOpen: focus === 'DEPTH' || focus === 'REFLECTION',
      sourceShown: Boolean(reportedStatus || actual),
      tide: 0,
      events,
      current: route,
      filter,
      reportedStatus,
      expected,
      actual,
      verified,
      conflict,
    }),
    [actual, carried, conflict, events, expected, filter, focus, reportedStatus, route, sources, verified],
  );

  const view = readWaterIntelligence(input);
  const selected = view.readings.find((reading) => reading.behavior === focus) ?? view.readings[0];
  const coreColor = STATUS_COLOR[view.core];

  return (
    <section
      aria-label="Water intelligence language"
      style={{
        marginTop: '18px',
        padding: '18px',
        background: '#071312',
        border: '1px solid #1b3b35',
        borderRadius: '6px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
        <div>
          <div style={{ color: '#8ce8c8', fontSize: '13px', fontWeight: 'bold' }}>WATER INTELLIGENCE · SKIN</div>
          <div style={{ color: '#c5e6db', fontSize: '11px', lineHeight: 1.5, marginTop: '4px' }}>
            Water is the interaction language. It is not execution, and it cannot verify itself.
          </div>
        </div>
        <span
          style={{
            color: coreColor,
            border: `1px solid ${coreColor}`,
            borderRadius: '3px',
            padding: '3px 7px',
            fontSize: '9px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
          }}
        >
          OCEAN {view.core}
        </span>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setCarried(intent.trim());
          setEvents((count) => count + 1);
        }}
        style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}
      >
        <label htmlFor="water-intelligence-intent" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden' }}>
          Intent
        </label>
        <input
          id="water-intelligence-intent"
          value={intent}
          onChange={(event) => setIntent(event.target.value)}
          placeholder="Name one intent. The surface carries it. It does not execute it."
          style={{
            flex: '1 1 220px',
            minHeight: '40px',
            background: '#0c1c19',
            color: '#ebfaf4',
            border: '1px solid #1b3b35',
            borderRadius: '4px',
            padding: '0 10px',
          }}
        />
        <button
          type="submit"
          style={{
            minHeight: '40px',
            background: 'transparent',
            color: '#8ce8c8',
            border: '1px solid #8ce8c8',
            borderRadius: '999px',
            padding: '0 14px',
            cursor: 'pointer',
          }}
        >
          Set the surface
        </button>
      </form>

      <p role="status" style={{ color: '#c5e6db', fontSize: '11px', lineHeight: 1.5, marginTop: '12px' }}>
        Claim {view.claim}. {view.law}
      </p>

      <div role="list" aria-label="Water behaviors" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '6px', marginTop: '12px' }}>
        {WATER_BEHAVIORS.map((behavior) => {
          const reading = view.readings.find((item) => item.behavior === behavior);
          const color = STATUS_COLOR[reading?.status ?? 'NOT_EXECUTED'];
          const pressed = focus === behavior;
          return (
            <button
              key={behavior}
              type="button"
              role="listitem"
              aria-pressed={pressed}
              onClick={() => {
                setFocus(behavior);
                if (behavior === 'FLOW') setRoute('REALITY');
                if (behavior === 'CURRENTS') setRoute((value) => value ?? 'REALITY');
                setEvents((count) => count + 1);
              }}
              style={{
                minHeight: '48px',
                textAlign: 'left',
                background: pressed ? '#0c1c19' : '#071312',
                color: '#ebfaf4',
                border: `1px solid ${pressed ? '#8ce8c8' : '#1b3b35'}`,
                borderRadius: '4px',
                padding: '8px',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: '11px' }}>{behavior}</div>
              <div style={{ color, fontSize: '9px', marginTop: '4px' }}>
                {reading?.active ? 'IN VIEW' : 'QUIET'} · {reading?.status}
              </div>
            </button>
          );
        })}
      </div>

      {selected ? (
        <div style={{ marginTop: '12px', color: '#c5e6db', fontSize: '12px', lineHeight: 1.5 }}>
          <strong style={{ color: '#ebfaf4' }}>{selected.behavior}.</strong> {selected.meaning} {selected.evidence}
        </div>
      ) : null}

      <label style={{ display: 'block', marginTop: '12px', color: '#8fb3a8', fontSize: '10px' }}>
        Filter the note
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          style={{
            display: 'block',
            width: '100%',
            marginTop: '4px',
            minHeight: '36px',
            background: 'transparent',
            color: '#ebfaf4',
            border: 'none',
            borderBottom: '1px solid #1b3b35',
          }}
        />
      </label>
    </section>
  );
}
