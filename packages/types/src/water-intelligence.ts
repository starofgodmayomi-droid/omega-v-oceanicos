/**
 * Water is the interface language. It is not a success animation.
 *
 * A behavior is shown only when the supplied reality status and counts
 * support it. UNKNOWN stays unknown. NOT_EXECUTED stays held.
 * A verified glow is legal only for VERIFIED.
 */
export type WaterIntelligenceStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';

export const OMEGA_WATER_INTELLIGENCE_VERSION = 'omega.water-intelligence.v1' as const;

export const WATER_BEHAVIORS = [
  'FLOW',
  'CONFLUENCE',
  'DEPTH',
  'TRANSPARENCY',
  'TIDES',
  'RIPPLES',
  'CURRENTS',
  'STILL',
  'TURBULENCE',
  'FILTRATION',
  'CONTAINMENT',
  'REFLECTION',
] as const;

export type WaterBehavior = (typeof WATER_BEHAVIORS)[number];
export type WaterBehaviorClaim = 'shown' | 'withheld';
export type WaterVisualClaim = 'verified-glow' | 'divergence' | 'unknown' | 'held';

export const WATER_BEHAVIOR_MEANING: Record<WaterBehavior, string> = {
  FLOW: 'A request was routed. Not shown when nothing executed.',
  CONFLUENCE: 'Two or more sources were actually combined.',
  DEPTH: 'At least one source is attached.',
  TRANSPARENCY: 'The evidence state is visible, including absence.',
  TIDES: 'A workload change was observed. Not inferred from decoration.',
  RIPPLES: 'A downstream event was counted on an observed transition.',
  CURRENTS: 'A dependency was declared on an observed transition.',
  STILL: 'The transition is VERIFIED and stable. Not a synonym for idle.',
  TURBULENCE: 'Observed result conflicts with expectation.',
  FILTRATION: 'A filtration receipt exists. This contract does not invent one.',
  CONTAINMENT: 'Security boundary stays visible. It is not a success claim.',
  REFLECTION: 'Intent and observed outcome are both present and compared.',
};

export interface WaterIntelligenceInput {
  readonly status: WaterIntelligenceStatus;
  readonly sourceCount?: number;
  readonly eventCount?: number;
  readonly dependencyCount?: number;
  readonly workloadObserved?: boolean;
  readonly filtrationReceipt?: boolean;
  readonly intent?: string | null;
  readonly observedOutcome?: string | null;
}

export interface WaterIntelligenceSkin {
  readonly version: typeof OMEGA_WATER_INTELLIGENCE_VERSION;
  readonly status: WaterIntelligenceStatus;
  readonly visualClaim: WaterVisualClaim;
  readonly behaviors: Record<WaterBehavior, WaterBehaviorClaim>;
  readonly note: string;
}

const withheld = (): Record<WaterBehavior, WaterBehaviorClaim> => ({
  FLOW: 'withheld',
  CONFLUENCE: 'withheld',
  DEPTH: 'withheld',
  TRANSPARENCY: 'shown',
  TIDES: 'withheld',
  RIPPLES: 'withheld',
  CURRENTS: 'withheld',
  STILL: 'withheld',
  TURBULENCE: 'withheld',
  FILTRATION: 'withheld',
  CONTAINMENT: 'shown',
  REFLECTION: 'withheld',
});

const count = (value: number | undefined): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;

const text = (value: string | null | undefined): string => value?.trim() ?? '';

/**
 * Bind water metaphors to a reality status. Missing counts withhold the
 * behavior. Filtration stays withheld unless a receipt is explicit.
 */
export function deriveWaterIntelligence(input: WaterIntelligenceInput): WaterIntelligenceSkin {
  const status = input.status;
  const behaviors = withheld();
  const observed = status === 'VERIFIED' || status === 'DIVERGENT';
  const sources = count(input.sourceCount);
  const events = count(input.eventCount);
  const dependencies = count(input.dependencyCount);

  if (observed) behaviors.FLOW = 'shown';
  if (observed && sources >= 2) behaviors.CONFLUENCE = 'shown';
  if (observed && sources >= 1) behaviors.DEPTH = 'shown';
  if (input.workloadObserved === true && observed) behaviors.TIDES = 'shown';
  if (observed && events >= 1) behaviors.RIPPLES = 'shown';
  if (observed && dependencies >= 1) behaviors.CURRENTS = 'shown';
  if (status === 'VERIFIED') behaviors.STILL = 'shown';
  if (status === 'DIVERGENT') behaviors.TURBULENCE = 'shown';
  if (input.filtrationReceipt === true && observed) behaviors.FILTRATION = 'shown';
  if (observed && text(input.intent) && text(input.observedOutcome)) behaviors.REFLECTION = 'shown';

  const visualClaim: WaterVisualClaim =
    status === 'VERIFIED'
      ? 'verified-glow'
      : status === 'DIVERGENT'
        ? 'divergence'
        : status === 'UNKNOWN'
          ? 'unknown'
          : 'held';

  return {
    version: OMEGA_WATER_INTELLIGENCE_VERSION,
    status,
    visualClaim,
    behaviors,
    note:
      status === 'VERIFIED'
        ? 'Verified glow is bound to VERIFIED. It is not decoration.'
        : status === 'DIVERGENT'
          ? 'Turbulence is the conflict. It is not upgraded to success.'
          : status === 'UNKNOWN'
            ? 'Unknown stays unknown. No still water and no success glow.'
            : 'Not executed. Flow, ripples, and success glow stay withheld.',
  };
}
