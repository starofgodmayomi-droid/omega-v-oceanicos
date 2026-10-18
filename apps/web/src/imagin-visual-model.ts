import { boundedStatus, type LucidFieldSignal, type RealityStatus } from './whole-ecosystem-dashboard-model';

export const MAX_IMAGIN_SIGNALS = 12;

export interface ImaginVisualNode {
  id: string;
  label: string;
  status: RealityStatus;
  source: string;
  x: number;
  y: number;
  labelX: number;
  labelY: number;
  anchor: 'start' | 'middle' | 'end';
}

export interface ImaginVisualModel {
  mode: 'VIEW_LOCAL';
  topology: 'PRESENTATION_ONLY';
  center: { x: number; y: number };
  nodes: ImaginVisualNode[];
  omittedCount: number;
  caption: string;
}

/**
 * Create a bounded presentation model from the signals already supplied to a view.
 * Visual anchors express layout, not causal graph edges or runtime topology.
 */
export function buildImaginVisualModel(signals: readonly LucidFieldSignal[]): ImaginVisualModel {
  const visibleSignals = signals.slice(0, MAX_IMAGIN_SIGNALS);
  const divisor = Math.max(visibleSignals.length, 1);
  const center = { x: 260, y: 132 };

  const nodes = visibleSignals.map((signal, index): ImaginVisualNode => {
    const angle = -Math.PI / 2 + ((2 * Math.PI) / divisor) * index;
    const x = Math.round(center.x + 145 * Math.cos(angle));
    const y = Math.round(center.y + 76 * Math.sin(angle));
    const centered = Math.abs(x - center.x) < 40;
    const anchor: ImaginVisualNode['anchor'] = centered ? 'middle' : x < center.x ? 'end' : 'start';

    return {
      id: 'signal-' + index,
      label: signal.label,
      status: boundedStatus(signal.status),
      source: signal.source,
      x,
      y,
      labelX: centered ? x : x + (x < center.x ? -22 : 22),
      labelY: centered ? y + (y < center.y ? -20 : 29) : y + 4,
      anchor,
    };
  });

  const omittedCount = Math.max(0, signals.length - visibleSignals.length);
  const caption = visibleSignals.length === 0
    ? 'No signals supplied; no nodes drawn. Visual anchors are not causal edges.'
    : 'Showing ' + visibleSignals.length + ' of ' + signals.length + ' supplied signals'
      + (omittedCount > 0 ? '; ' + omittedCount + ' not rendered by the bounded view' : '')
      + '. Visual anchors are layout only, not causal edges.';

  return {
    mode: 'VIEW_LOCAL',
    topology: 'PRESENTATION_ONLY',
    center,
    nodes,
    omittedCount,
    caption,
  };
}
