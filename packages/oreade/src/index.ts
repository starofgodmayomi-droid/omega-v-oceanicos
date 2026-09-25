export const SYMBOLIC_MODES = ['WORLDVIEW', 'BUILD'] as const;
export type SymbolicMode = (typeof SYMBOLIC_MODES)[number];

export const DROP_KINDS = [
  'OBSERVATION',
  'PROPOSAL',
  'AUTHORIZATION',
  'EXECUTION',
  'EVIDENCE_PROBE',
  'RECONCILIATION',
] as const;
export type DropKind = (typeof DROP_KINDS)[number];

export interface SymbolicDropInput {
  symbolicIntent: string;
  requestedBy: string;
  targetScope: string[];
  idempotencyKey: string;
  stopCondition: string;
  expectedObservation: string;
  mode?: SymbolicMode;
  context?: Record<string, string>;
}

export interface OceanicosDrop {
  dropId: string;
  kind: DropKind;
  mode: SymbolicMode;
  intent: string;
  requestedBy: string;
  targetScope: string[];
  idempotencyKey: string;
  authority: 'MUST_BE_SUPPLIED_BY_RUNTIME';
  admission: 'NOT_GRANTED_BY_TRANSLATION';
  stopCondition: string;
  expectedObservation: string;
  evidenceBoundary: string;
  context: Record<string, string>;
  createdAt: string;
}

const KIND_PATTERNS: ReadonlyArray<readonly [DropKind, RegExp]> = [
  ['RECONCILIATION', /reconcile|compare|verify reality|observe result/i],
  ['EVIDENCE_PROBE', /evidence|attest|audit|inspect|prove/i],
  ['AUTHORIZATION', /authorize|approve|consent|permission/i],
  ['EXECUTION', /execute|run|change|write|deploy|activate/i],
  ['OBSERVATION', /observe|read|inspect|check|status/i],
];

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/;
const MAX_INTENT_LENGTH = 2000;
const MAX_FIELD_LENGTH = 512;
const MAX_SCOPE_ITEMS = 16;
const MAX_SCOPE_ITEM_LENGTH = 128;
const MAX_CONTEXT_ENTRIES = 16;
const MAX_CONTEXT_KEY_LENGTH = 96;

function requireText(value: string, field: string, maxLength = MAX_FIELD_LENGTH): string {
  if (typeof value !== 'string') throw new Error(`${field} must be a string`);
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} must not be empty`);
  if (normalized.length > maxLength) throw new Error(`${field} must be no longer than ${maxLength} characters`);
  return normalized;
}

function requireScope(scope: string[]): string[] {
  if (!Array.isArray(scope) || scope.length === 0) {
    throw new Error('targetScope must contain at least one bounded target');
  }
  if (scope.length > MAX_SCOPE_ITEMS) throw new Error(`targetScope must contain no more than ${MAX_SCOPE_ITEMS} targets`);
  const normalized = scope.map((item) => requireText(item, 'targetScope item', MAX_SCOPE_ITEM_LENGTH));
  return [...new Set(normalized)];
}

function requireIdentifier(value: string, field: string): string {
  const normalized = requireText(value, field, 96);
  if (!IDENTIFIER.test(normalized)) throw new Error(`${field} must be a bounded identifier`);
  return normalized;
}

function requireContext(context: Record<string, string> | undefined): Record<string, string> {
  if (context === undefined) return {};
  if (!context || typeof context !== 'object' || Array.isArray(context)) throw new Error('context must be a bounded string map');
  const entries = Object.entries(context);
  if (entries.length > MAX_CONTEXT_ENTRIES) throw new Error(`context must contain no more than ${MAX_CONTEXT_ENTRIES} entries`);
  const result: Record<string, string> = {};
  for (const [key, value] of entries) {
    if (!IDENTIFIER.test(key) || key.length > MAX_CONTEXT_KEY_LENGTH) throw new Error('context keys must be bounded identifiers');
    result[key] = requireText(value, `context.${key}`);
  }
  return result;
}

export function classifySymbolicIntent(intent: string): DropKind {
  const normalized = requireText(intent, 'symbolicIntent');
  for (const [kind, pattern] of KIND_PATTERNS) {
    if (pattern.test(normalized)) return kind;
  }
  return 'PROPOSAL';
}

export function buildSymbolicDrop(input: SymbolicDropInput, now = new Date()): OceanicosDrop {
  const intent = requireText(input.symbolicIntent, 'symbolicIntent', MAX_INTENT_LENGTH);
  const requestedBy = requireIdentifier(input.requestedBy, 'requestedBy');
  const idempotencyKey = requireIdentifier(input.idempotencyKey, 'idempotencyKey');
  const stopCondition = requireText(input.stopCondition, 'stopCondition');
  const expectedObservation = requireText(input.expectedObservation, 'expectedObservation');
  const targetScope = requireScope(input.targetScope);
  const context = requireContext(input.context);
  const createdAt = now.toISOString();
  const digestSource = `${requestedBy}\n${idempotencyKey}\n${targetScope.join('|')}`;
  const dropId = `drop:oreade:${stableDigest(digestSource)}`;

  return {
    dropId,
    kind: classifySymbolicIntent(intent),
    mode: input.mode ?? 'BUILD',
    intent,
    requestedBy,
    targetScope,
    idempotencyKey,
    authority: 'MUST_BE_SUPPLIED_BY_RUNTIME',
    admission: 'NOT_GRANTED_BY_TRANSLATION',
    stopCondition,
    expectedObservation,
    evidenceBoundary:
      'Symbolic meaning is preserved as intent only; translation does not prove supernatural agency, authorize side effects, or verify external reality.',
    context,
    createdAt,
  };
}

function stableDigest(value: string): string {
  // Deterministic, dependency-free identifier: identity, scope, and retry key
  // remain linkable without pretending this is a cryptographic attestation.
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function renderPidginBoundary(drop: OceanicosDrop): string {
  return `Meaning fit guide this Drop, but e no be proof. Runtime still must authorize, execute, observe, and reconcile am. Stop: ${drop.stopCondition}`;
}
