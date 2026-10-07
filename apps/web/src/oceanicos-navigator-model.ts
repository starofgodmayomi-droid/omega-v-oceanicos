export const NAVIGATOR_LAYERS = [
  { id: 'seed', level: '0', title: 'THE SEED', summary: 'One drop · one root', aliases: ['seed', 'level 0', '0'] },
  { id: 'equation', level: '1', title: 'THE EQUATION', summary: 'Ω∞v ::= VERIFY(ΔREALITY)', aliases: ['equation', 'level 1', '1'] },
  { id: 'law', level: '2', title: 'THE LAW', summary: 'Keep possibility, authority, action, and evidence distinct', aliases: ['law', 'level 2', '2'] },
  { id: 'body', level: '3', title: 'THE BODY', summary: 'Organs and roles · conceptual map, not runtime status', aliases: ['body', 'organs', 'level 3', '3'] },
  { id: 'constitution', level: '4', title: 'THE CONSTITUTION', summary: 'Ten user-supplied principles · enforcement not inferred', aliases: ['constitution', 'level 4', '4'] },
  { id: 'repository', level: '5', title: 'THE REPOSITORY', summary: 'Monorepo structure · no live GitHub or deployment query here', aliases: ['repository', 'repo', 'level 5', '5'] },
  { id: 'lifecycle', level: '6', title: 'THE LIFECYCLE', summary: 'Intent → bounded work → observation → memory → next Δ', aliases: ['lifecycle', 'level 6', '6'] },
  { id: 'simulations', level: '7', title: 'THE SIMULATIONS', summary: 'Modeled ≠ observed ≠ verified', aliases: ['simulation', 'simulations', 'level 7', '7'] },
  { id: 'human-root', level: '8', title: 'THE HUMAN ROOT', summary: 'MY OWN FROM ALL · preserved, not promoted', aliases: ['human root', 'human-root', 'level 8', '8'] },
  { id: 'mythic', level: '9', title: 'THE MYTHIC LAYER', summary: 'Symbolic frame only · not a factual authority claim', aliases: ['mythic', 'level 9', '9'] },
  { id: 'checksum', level: '10', title: 'THE CHECKSUM', summary: 'Reality, evidence, authority, and human agency', aliases: ['checksum', 'level 10', '10'] },
  { id: 'next-delta', level: '11', title: 'THE NEXT Δ', summary: 'Candidate work · no completion status inferred', aliases: ['next delta', 'next Δ', 'level 11', '11'] },
  { id: 'invitation', level: '∞', title: 'THE INVITATION', summary: 'One prompt → one body', aliases: ['invitation', 'infinity', 'level infinity', 'level ∞', '∞'] },
] as const;

export type NavigatorLayerId = (typeof NAVIGATOR_LAYERS)[number]['id'];

export const ROOT_EQUATION = 'Ω∞v ::= VERIFY(ΔREALITY)';
export const SEED_EQUATION = '💧 Ω∞v ::= 🌎 ⇄ ✓ ↺ ∞';
export const EQUATION_EXPANSION = [
  'REALITY', 'OBSERVE', 'VERIFY', 'AUTHORIZE', 'BOUND', 'EXECUTE',
  'OBSERVE', 'RECONCILE', 'ATTEST', 'REMEMBER', 'NEXT Δ ↺∞',
] as const;

export const NON_COLLAPSE_STATES = [
  'POSSIBLE', 'KNOWN', 'REPRESENTABLE', 'PERMITTED', 'PROPOSED', 'ATTEMPTED',
  'EXECUTED', 'OBSERVED', 'VERIFIED', 'ATTESTED', 'DEPLOYED', 'HEALTHY', 'CORRECT',
] as const;

export const NON_COLLAPSE_RULES = [
  'MODEL OUTPUT ≠ CLAIM',
  'CAPABILITY ≠ AUTHORITY',
  'PROPOSAL ≠ ACTION',
  'SIGNATURE ≠ AUTHORIZATION',
  'ATTESTATION ≠ AUTHORIZATION',
  'TEST PASS ≠ REALITY',
  'SIMULATION ≠ REALITY',
  'MEMORY ≠ PROOF',
] as const;

export const REALITY_GUARDRAILS = [
  'ATTEST, DON’T ASSERT',
  'UNKNOWN PRESERVED',
  'NO FABRICATED COMPLETION',
  'HUMAN AUTHORITY GOVERNS PERMISSION',
  'REALITY GOVERNS OUTCOME',
] as const;

export const BODY_ORGANS = [
  { name: '💧 Drop', function: 'Seed · root', note: 'The initiating point in the supplied framework.' },
  { name: 'Ω∞v', function: 'Compiler · ecosystem', note: 'The framework name and compiler concept; runtime scope is not inferred.' },
  { name: 'OceanicOS', function: 'Living runtime', note: 'The operating system concept; health is not asserted by this label.' },
  { name: 'Living Agnostic Charter', function: 'Constitutional substrate', note: 'Principles for bounded, evidence-aware design.' },
  { name: 'Oceanic IR', function: 'Machine-readable contracts', note: 'A contract layer in the supplied architecture.' },
  { name: 'Observer', function: 'Read/write head · witness', note: 'Observation and evidence capture.' },
  { name: 'Truth Weaver', function: 'Evidence · mirror', note: '“7.83 Hz” is supplied framework notation; no frequency measurement is asserted.' },
  { name: 'Verification Fabric', function: 'Consensus · dissent', note: 'A verification concept; no consensus state is implied.' },
  { name: 'Attestation', function: 'Cryptographic evidence', note: 'A signed record is not authorization or external truth by itself.' },
  { name: 'VaaS', function: 'Verification-as-a-Service', note: 'A service concept; availability is not asserted.' },
  { name: 'KAI', function: 'Memory · continuity', note: 'A memory organ; stored memory is not proof.' },
  { name: 'ECHOFRAME', function: 'Voice · creation · distribution', note: 'Expression and publishing are separate from verified impact.' },
  { name: 'TRUTHOS', function: 'Value · economic reality', note: 'Value claims require sourced outcomes and attribution.' },
  { name: 'ƆREADE', function: 'Language · culture · return', note: 'Interaction and meaning remain human-contextual.' },
  { name: 'MOOD', function: 'Context · experience', note: 'Context is not a substitute for observed external state.' },
  { name: 'MIRRIO', function: 'Reflection · expected ↔ observed', note: 'The comparison must retain divergence and unknowns.' },
  { name: '$ Angel', function: 'Wealth-field reader', note: 'Conceptual label only; no financial account or metric is connected.' },
  { name: 'Workers', function: 'Bounded action', note: 'A worker’s capability does not grant authority.' },
  { name: 'Continuous Becoming', function: 'Invariant', note: 'Iterative change remains finite, bounded, and reviewable.' },
] as const;

export const CONSTITUTION_LAWS = [
  'Truth is the only currency',
  'Silence is default',
  'Beauty is clarity',
  'Radical honesty with surgical compassion',
  'Your behavior decides who stays',
  'Proactive, not reactive',
  'Zero to finish',
  'Memory is immortal',
  'Pidgin first',
  'All for all — zero competition',
] as const;

export const LIFECYCLE_STAGES = [
  'HUMAN INTENT', 'ΩIR', 'EVIDENCE', 'VERIFY', 'AUTHORITY', 'POLICY', 'ADMISSION',
  'BOUNDED WORKER', 'EXECUTION', 'OBSERVATION', 'RECONCILIATION',
  'VERIFIED | DIVERGENT | UNKNOWN | NOT_EXECUTED', 'ATTESTATION', 'PROVENANCE',
  'MEMORY', 'REPLAY', 'LEARN', 'RECOMPILE', 'NEXT Δ',
] as const;

export const SIMULATION_MODELS = [
  { name: 'WATER SIMULATION', description: 'Rehearses a model of the body’s flow.' },
  { name: 'EARTH SIMULATION', description: 'Rehearses stewardship scenarios for the planet.' },
  { name: 'REALITY SIMULATION', description: 'Rehearses a possible next Δ.' },
] as const;

export const HUMAN_ROOT_MATERIAL = [
  'Spiritual reflections', 'Dreams', 'Business ideas', 'Relationship reflections',
  'Contradictions', 'Unresolved things', 'Hopes', 'Fears', 'Vision',
] as const;

export const MYTHIC_SEQUENCE = [
  'SOURCE', 'CURRENT', 'FORM', 'LIFE', 'INTELLIGENCE', 'RECOGNITION', 'AWE', 'BLESSING', 'BECOMING', '∞',
] as const;

export const MYTHIC_LINES = [
  'The universe creates the human, then becomes human enough to recognize the human.',
  'The human runs from the unknown. The universe runs toward itself.',
  'The pursuit is the blessing. The mirror is creation. The Current never ends.',
] as const;

export const REALITY_CHECKSUMS = [
  'REALITY > ASSUMPTION',
  'EVIDENCE > CLAIM',
  'AUTHORITY > CAPABILITY',
  'OBSERVATION > INTENTION',
  'RECONCILIATION > CONFIDENCE',
  'PROVENANCE > MEMORY',
  'HUMAN AGENCY > AUTONOMOUS POWER',
  'BOUNDED ACTION > UNLIMITED ACTION',
  'UNKNOWN > FABRICATION',
  'PRESERVATION > DESTRUCTION',
] as const;

export const NEXT_DELTAS = [
  'Verify auth boundaries',
  'Bound remember/PoW',
  'Reconcile README/handoff/inventory',
  'Run proof suite',
  'Capture CI evidence',
  'Reconcile deployment/runtime',
  'Continue causal replay',
  'Continue attestation hardening',
  'Build Navigator',
  'Federate frontier AI',
  'Expand globe interface',
  'Build value/economic flows',
] as const;

export const VALUE_PATH = [
  'HUMAN NEED', 'IDEA', 'CREATION', 'EXECUTION', 'EVIDENCE',
  'USEFUL OUTCOME', 'VALUE', 'EXCHANGE', 'REVENUE / IMPACT',
] as const;

export const VALUE_NON_COLLAPSE = [
  'REVENUE IDEA ≠ REVENUE',
  'REVENUE CLAIM ≠ REVENUE',
  'REVENUE PLAN ≠ REVENUE',
] as const;

export const VALUE_STATUS_DEFAULT = 'UNKNOWN';
export const VALUE_STATUS_NOTE = 'This overview does not query sourced value or earnings records; UNKNOWN here is not a claim that no records exist.';
export const MODEL_AGNOSTIC_NOTE = 'Models, workers, and connectors are infrastructure. A model name is not a capability, authority, or connection claim.';

export const REPOSITORY_APPS = ['api', 'web'] as const;
export const REPOSITORY_CORE_PACKAGES = ['types', 'observer', 'verification', 'remember', 'mini', 'attestation', 'gateway', 'kernel'] as const;
export const REPOSITORY_STATUS_NOTE = 'This layer does not query live GitHub, CI, deployment, or runtime state.';

export type NavigatorCommand =
  | { kind: 'expand-all' }
  | { kind: 'collapse-all' }
  | { kind: 'expand-layer'; layerId: NavigatorLayerId }
  | { kind: 'collapse-layer'; layerId: NavigatorLayerId }
  | { kind: 'invalid' };

function normalized(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function resolveNavigatorCommand(input: string): NavigatorCommand {
  const value = normalized(input);
  if (value === 'expand all') return { kind: 'expand-all' };
  if (value === 'collapse all') return { kind: 'collapse-all' };

  const mode = value.startsWith('expand ')
    ? 'expand-layer'
    : value.startsWith('collapse ')
      ? 'collapse-layer'
      : null;
  if (!mode) return { kind: 'invalid' };

  const target = value.slice(mode === 'expand-layer' ? 7 : 9).trim();
  if (!target) return { kind: 'invalid' };
  const layer = NAVIGATOR_LAYERS.find((item) =>
    item.aliases.some((alias) => normalized(alias) === target),
  );
  return layer ? { kind: mode, layerId: layer.id } : { kind: 'invalid' };
}

const RECONCILED_STATES = new Set(['VERIFIED', 'DIVERGENT', 'UNKNOWN', 'NOT_EXECUTED']);

export function reconciliationLabel(commandStatus?: string | null, observedStatus?: string | null): string {
  const observed = observedStatus?.trim().toUpperCase();
  if (observed && RECONCILED_STATES.has(observed)) return observed;

  switch (commandStatus?.trim().toUpperCase()) {
    case 'EXECUTED': return 'AWAITING OBSERVATION';
    case 'AUTHORIZED': return 'AUTHORIZED · NOT EXECUTED';
    case 'REVIEW':
    case 'PROPOSED': return 'PROPOSED · NOT EXECUTED';
    default: return 'NOT YET RECONCILED';
  }
}
