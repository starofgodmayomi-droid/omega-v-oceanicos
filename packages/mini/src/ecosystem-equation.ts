/**
 * Executable form of ECOSYSTEM_BODY.md — the Absolute Fixpoint Equation.
 *
 *   Ω∞v := Y ( λf. λx. {
 *     f(Σ ∪ Hash(x))                 if O(E(x)) ≡ VERIFIED
 *     HALT ⊢ DIVERGENT                if K(x) ∈ SCAM
 *     HALT ⊢ UNKNOWN                  if Evidence(x) = ∅
 *     HALT ⊢ NOT_EXECUTED             if Authority(x) < Required
 *   } ) | Reality
 *
 *   Ω∞v := Y ( λf. ( M_{t+1} = M_t ∪ Δ | V(Δ) = ⊤ ) )
 *        | V ≡ (Expected ≡ Observed)
 *
 * Fail-closed order, which is stricter than "first written case wins":
 *   1. uninspectable signal            → UNKNOWN
 *   2. K(x) ∈ SCAM                     → DIVERGENT   (a scam cannot be verified)
 *   3. Evidence(x) = ∅                 → UNKNOWN
 *   4. Authority(x) < Required         → NOT_EXECUTED
 *   5. Expected or Observed absent     → UNKNOWN
 *   6. Expected ≢ Observed             → DIVERGENT
 *   7. otherwise                       → CONTINUE, Σ' = Σ ∪ Hash(x)
 *
 * Evidence boundary. Status `VERIFIED` here means the local predicate
 * O(E(x)) ≡ VERIFIED held for the supplied record. It is not an observation
 * of CI, deployment, health, or the world. Reality stays outside this module.
 * Callers must keep `evidenceScope` attached to every step.
 */
import { createHash } from 'node:crypto';

export const ECOSYSTEM_EQUATION_ID = 'omega.ecosystem-body.equation.v1';

export const ECOSYSTEM_EQUATION =
  'Ω∞v := Y(λf. λx. f(Σ ∪ Hash(x)) if O(E(x)) ≡ VERIFIED; HALT ⊢ DIVERGENT if K(x) ∈ SCAM; HALT ⊢ UNKNOWN if Evidence(x) = ∅; HALT ⊢ NOT_EXECUTED if Authority(x) < Required) | Reality; V ≡ (Expected ≡ Observed)';

export type EquationStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';
export type EquationKnowledge = 'CLEAR' | 'SCAM' | 'UNKNOWN';
export type EquationAuthority = 'READ_ONLY' | 'AUTONOMOUS';
export type EquationEvidenceScope = 'LOCAL_STRUCTURE_ONLY' | 'CALLER_SUPPLIED';

export const EQUATION_ARMS = Object.freeze([
  'CONTINUE',
  'SCAM_HALT',
  'UNKNOWN_HALT',
  'AUTHORITY_HALT',
  'MEMORY_UNION',
] as const);

export type EquationArm = (typeof EQUATION_ARMS)[number];

export interface EcosystemSignal {
  readonly id: string;
  readonly text: string;
  /** Evidence payload. Blank is Evidence(x) = ∅. */
  readonly evidence?: string | null;
  readonly expected?: string | null;
  readonly observed?: string | null;
  readonly knowledge?: EquationKnowledge;
  readonly authority?: EquationAuthority;
  readonly requiredAuthority?: EquationAuthority;
  readonly evidenceScope?: EquationEvidenceScope;
}

export interface EquationStep {
  readonly id: string;
  readonly status: EquationStatus;
  readonly branch: 'CONTINUE' | 'HALT';
  readonly reason: string;
  readonly hash: string | null;
  readonly remembered: boolean;
  readonly evidenceScope: EquationEvidenceScope;
}

const SCAM_PATTERNS: readonly RegExp[] = [
  /\bsend\s+money\b/i,
  /\bprivate\s+key\b/i,
  /\b(seed|recovery)\s+phrase\b/i,
  /\bguaranteed\s+(returns?|profit|income)\b/i,
  /\bdouble\s+(your\s+)?(money|investment|bitcoin|crypto)\b/i,
  /\bwire\s+funds\b/i,
];

const halt = (
  id: string,
  status: Exclude<EquationStatus, 'VERIFIED'>,
  reason: string,
  evidenceScope: EquationEvidenceScope,
): EquationStep =>
  Object.freeze({
    id,
    status,
    branch: 'HALT',
    reason,
    hash: null,
    remembered: false,
    evidenceScope,
  });

const trimmed = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  return value.trim();
};

const hashSignal = (id: string, text: string, evidence: string, expected: string, observed: string): string =>
  createHash('sha256')
    .update(JSON.stringify({ id, text, evidence, expected, observed }), 'utf8')
    .digest('hex');

const classifiedScam = (knowledge: EquationKnowledge | undefined, text: string): boolean =>
  knowledge === 'SCAM' || SCAM_PATTERNS.some((pattern) => pattern.test(text));

const authoritySatisfies = (granted: EquationAuthority, required: EquationAuthority): boolean =>
  required === 'READ_ONLY' || granted === 'AUTONOMOUS';

/**
 * One application of the fixpoint to a single signal.
 * Does not mutate `memory`. Remembering is `rememberEquationStep`.
 */
export function evaluateEcosystemEquation(signal: EcosystemSignal, memory: readonly string[] = []): EquationStep {
  const evidenceScope: EquationEvidenceScope = signal?.evidenceScope === 'LOCAL_STRUCTURE_ONLY'
    ? 'LOCAL_STRUCTURE_ONLY'
    : 'CALLER_SUPPLIED';
  const id = trimmed(signal?.id);
  const text = trimmed(signal?.text);
  if (id === null || text === null || id.length === 0 || text.length === 0) {
    return halt(typeof signal?.id === 'string' ? signal.id : '', 'UNKNOWN', 'signal is not inspectable', evidenceScope);
  }

  const knowledge = signal.knowledge;
  if (knowledge !== undefined && knowledge !== 'CLEAR' && knowledge !== 'SCAM' && knowledge !== 'UNKNOWN') {
    return halt(id, 'UNKNOWN', 'K(x) is not a known classification', evidenceScope);
  }
  if (classifiedScam(knowledge, text)) {
    return halt(id, 'DIVERGENT', 'K(x) ∈ SCAM', evidenceScope);
  }

  const evidence = trimmed(signal.evidence);
  if (evidence === null || evidence.length === 0) {
    return halt(id, 'UNKNOWN', 'Evidence(x) = ∅', evidenceScope);
  }

  const authority = signal.authority ?? 'READ_ONLY';
  const required = signal.requiredAuthority ?? 'READ_ONLY';
  if (authority !== 'READ_ONLY' && authority !== 'AUTONOMOUS') {
    return halt(id, 'NOT_EXECUTED', 'Authority(x) < Required', evidenceScope);
  }
  if (required !== 'READ_ONLY' && required !== 'AUTONOMOUS') {
    return halt(id, 'NOT_EXECUTED', 'Authority(x) < Required', evidenceScope);
  }
  if (!authoritySatisfies(authority, required)) {
    return halt(id, 'NOT_EXECUTED', 'Authority(x) < Required', evidenceScope);
  }

  const expected = trimmed(signal.expected);
  const observed = trimmed(signal.observed);
  if (expected === null || observed === null || expected.length === 0 || observed.length === 0) {
    return halt(id, 'UNKNOWN', 'Expected or Observed is absent', evidenceScope);
  }
  if (expected !== observed) {
    return halt(id, 'DIVERGENT', 'Expected ≢ Observed', evidenceScope);
  }

  const hash = hashSignal(id, text, evidence, expected, observed);
  return Object.freeze({
    id,
    status: 'VERIFIED',
    branch: 'CONTINUE',
    reason: memory.includes(hash) ? 'Hash(x) already in Σ' : 'O(E(x)) ≡ VERIFIED',
    hash,
    remembered: true,
    evidenceScope,
  });
}

/** Σ' = Σ ∪ {Hash(x)} only for a CONTINUE step. Halted steps leave memory unchanged. */
export function rememberEquationStep(memory: readonly string[], step: EquationStep): readonly string[] {
  if (step.branch !== 'CONTINUE' || !step.hash) return memory;
  if (memory.includes(step.hash)) return memory;
  return Object.freeze([...memory, step.hash]);
}

export interface UpgradedWork {
  readonly id: string;
  readonly name: string;
  readonly source: string;
  readonly surface: 'kernel' | 'api' | 'web' | 'cli' | 'ci' | 'memory';
  readonly entry: string;
  readonly arm: EquationArm;
}

/**
 * Important upgraded work already in this repository.
 * Each row is a declared projection of one equation arm, not a runtime observation.
 */
export const IMPORTANT_UPGRADED_WORK: readonly UpgradedWork[] = Object.freeze([
  Object.freeze({
    id: 'change-pipeline',
    name: 'Omega change pipeline',
    source: 'packages/mini/src/pipeline.ts',
    surface: 'kernel',
    entry: 'runOmegaChangePipeline',
    arm: 'CONTINUE',
  }),
  Object.freeze({
    id: 'single-body',
    name: '4x4x4x4 single body',
    source: 'packages/mini/src/single-body.ts',
    surface: 'kernel',
    entry: 'compressSingleBody / expandSingleBody',
    arm: 'CONTINUE',
  }),
  Object.freeze({
    id: 'invisible-computer',
    name: 'Invisible Online Computer',
    source: 'apps/api/src/invisible-computer.ts',
    surface: 'api',
    entry: 'KAI to ELION to OMEGA',
    arm: 'CONTINUE',
  }),
  Object.freeze({
    id: 'kai-shield',
    name: 'KAI shield',
    source: 'apps/api/src/invisible-computer.ts',
    surface: 'api',
    entry: 'scanIntent',
    arm: 'SCAM_HALT',
  }),
  Object.freeze({
    id: 'authority-halt',
    name: 'Authority halt',
    source: 'apps/api/src/execute-route.ts',
    surface: 'api',
    entry: 'POST /execute',
    arm: 'AUTHORITY_HALT',
  }),
  Object.freeze({
    id: 'kai-reconcile',
    name: 'KAI memory reconcile',
    source: 'apps/api/src/kai-memory.ts',
    surface: 'memory',
    entry: 'POST /kai/memory/:id/reconcile',
    arm: 'MEMORY_UNION',
  }),
  Object.freeze({
    id: 'ecosystem-equation',
    name: 'Ecosystem body equation',
    source: 'ECOSYSTEM_BODY.md',
    surface: 'kernel',
    entry: 'evaluateEcosystemEquation',
    arm: 'CONTINUE',
  }),
  Object.freeze({
    id: 'equation-api',
    name: 'Equation routes',
    source: 'apps/api/src/equation-route.ts',
    surface: 'api',
    entry: 'GET /v1/ecosystem/equation',
    arm: 'CONTINUE',
  }),
  Object.freeze({
    id: 'equation-web',
    name: 'Equation outward panel',
    source: 'apps/web/src/EquationOutwardPanel.tsx',
    surface: 'web',
    entry: 'EquationOutwardPanel',
    arm: 'CONTINUE',
  }),
  Object.freeze({
    id: 'equation-cli',
    name: 'Equation CLI',
    source: 'bin/oceanicos.mjs',
    surface: 'cli',
    entry: 'node bin/oceanicos.mjs equation',
    arm: 'CONTINUE',
  }),
  Object.freeze({
    id: 'equation-tests',
    name: 'Equation tests',
    source: 'packages/mini/src/__tests__/ecosystem-equation.test.ts',
    surface: 'ci',
    entry: 'ecosystem-equation.test',
    arm: 'CONTINUE',
  }),
]);

const sourceIsDeclared = (source: string): boolean => {
  if (source.includes('..') || source.startsWith('/') || source.includes('\\')) return false;
  return source === 'ECOSYSTEM_BODY.md' || /^(?:packages|apps|bin|tests|docs)\/[A-Za-z0-9._/-]+$/.test(source);
};

const observeDeclaredArm = (work: UpgradedWork): string => {
  const armKnown = (EQUATION_ARMS as readonly string[]).includes(work.arm);
  return armKnown && sourceIsDeclared(work.source) ? work.arm : 'UNDECLARED';
};

export function signalForUpgradedWork(work: UpgradedWork): EcosystemSignal {
  return Object.freeze({
    id: work.id,
    text: work.name,
    evidence: work.source,
    expected: work.arm,
    observed: observeDeclaredArm(work),
    knowledge: 'CLEAR',
    authority: 'READ_ONLY',
    requiredAuthority: 'READ_ONLY',
    evidenceScope: 'LOCAL_STRUCTURE_ONLY',
  });
}

export interface OutwardSurface {
  readonly id: string;
  readonly name: string;
  readonly surface: UpgradedWork['surface'];
  readonly entry: string;
  readonly source: string;
  readonly arm: EquationArm;
  readonly direction: 'outward';
  readonly hash: string;
}

export interface EquationCompression {
  readonly equationId: typeof ECOSYSTEM_EQUATION_ID;
  readonly equation: typeof ECOSYSTEM_EQUATION;
  readonly evidenceScope: 'LOCAL_STRUCTURE_ONLY';
  readonly boundary: string;
  readonly admitted: readonly EquationStep[];
  readonly halted: readonly EquationStep[];
  readonly memory: readonly string[];
  readonly expansion: readonly OutwardSurface[];
}

const COMPRESSION_BOUNDARY =
  'Declared projection of upgraded work already in this repository. CONTINUE means the local equation predicate held for that declaration. It is not a CI result, a deployment, or a reality claim.';

/**
 * Fold upgraded-work declarations through the equation.
 * Only CONTINUE steps are remembered and expanded outward.
 * Halted declarations compress back to a halt and are not projected.
 */
export function compressTowardUpgradedWork(
  work: readonly UpgradedWork[] = IMPORTANT_UPGRADED_WORK,
): EquationCompression {
  let memory: readonly string[] = Object.freeze([]);
  const admitted: EquationStep[] = [];
  const halted: EquationStep[] = [];
  const expansion: OutwardSurface[] = [];

  for (const item of work) {
    const step = evaluateEcosystemEquation(signalForUpgradedWork(item), memory);
    if (step.branch === 'CONTINUE' && step.hash) {
      memory = rememberEquationStep(memory, step);
      admitted.push(step);
      expansion.push(Object.freeze({
        id: item.id,
        name: item.name,
        surface: item.surface,
        entry: item.entry,
        source: item.source,
        arm: item.arm,
        direction: 'outward',
        hash: step.hash,
      }));
    } else {
      halted.push(step);
    }
  }

  return Object.freeze({
    equationId: ECOSYSTEM_EQUATION_ID,
    equation: ECOSYSTEM_EQUATION,
    evidenceScope: 'LOCAL_STRUCTURE_ONLY',
    boundary: COMPRESSION_BOUNDARY,
    admitted: Object.freeze(admitted),
    halted: Object.freeze(halted),
    memory,
    expansion: Object.freeze(expansion),
  });
}
