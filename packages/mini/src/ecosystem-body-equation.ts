import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';

/**
 * Executable form of the fixpoint in ECOSYSTEM_BODY.md.
 *
 * Ω∞v := Y(λf. λx.
 *   f(Σ ∪ Hash(x))            if O(E(x)) ≡ VERIFIED
 *   HALT ⊢ DIVERGENT          if K(x) ∈ SCAM
 *   HALT ⊢ UNKNOWN            if Evidence(x) = ∅
 *   HALT ⊢ NOT_EXECUTED       if Authority(x) < Required
 * ) | Reality
 *
 * Memory advances only as M[t+1] = M[t] ∪ Δ when Expected ≡ Observed.
 * A compressed upgrade candidate is never executed by this module.
 */
export const ECOSYSTEM_BODY_EQUATION_ID = 'omega.ecosystem-body.y.v1' as const;
export const ECOSYSTEM_BODY_EQUATION_SOURCE = 'ECOSYSTEM_BODY.md' as const;
export const ECOSYSTEM_BODY_REALITY = 'Expected ≡ Observed' as const;
export const MAX_EQUATION_SURFACES = 64;
export const MAX_OBSERVED_FILE_BYTES = 256 * 1024;

export const EQUATION_TEXT =
  'Omega := Y(lambda f. lambda x. f(Sigma union Hash(x)) if O(E(x)) ≡ VERIFIED; HALT ⊢ DIVERGENT if K(x) in SCAM; HALT ⊢ UNKNOWN if Evidence(x) = empty; HALT ⊢ NOT_EXECUTED if Authority(x) < Required) | Reality';

export const REPO_OUTWARD_ROLES = [
  'contract',
  'kernel',
  'api',
  'web',
  'cli',
  'docs',
  'skill',
  'test',
] as const;

export type RepoOutwardRole = (typeof REPO_OUTWARD_ROLES)[number];
export type EquationHaltVerdict = 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';

export type OutwardSurface = {
  readonly id: string;
  readonly path: string;
  readonly role: RepoOutwardRole;
};

export type RepoSurfaceObservation = OutwardSurface & {
  readonly evidence: string | null;
  readonly scam: boolean;
  readonly authority: number;
  readonly required: number;
  readonly expected: string;
  readonly observed: string;
};

export type EquationMemoryEntry = {
  readonly index: number;
  readonly id: string;
  readonly path: string;
  readonly role: RepoOutwardRole;
  readonly evidence: string;
  readonly expected: string;
  readonly observed: string;
  readonly authority: number;
  readonly required: number;
  readonly hash: string;
};

export type EquationHalt = {
  readonly verdict: EquationHaltVerdict;
  readonly id: string;
  readonly path: string;
  readonly reason: string;
};

export type EquationBody = {
  readonly law: typeof ECOSYSTEM_BODY_EQUATION_ID;
  readonly source: typeof ECOSYSTEM_BODY_EQUATION_SOURCE;
  readonly reality: typeof ECOSYSTEM_BODY_REALITY;
  readonly status: 'COMPRESSED' | 'HALTED';
  readonly memory: readonly EquationMemoryEntry[];
  readonly halt: EquationHalt | null;
  readonly digest: string;
};

export type EquationIssueCode =
  | 'INVALID_INPUT'
  | 'EMPTY_BODY'
  | 'BODY_OVER_CAPACITY'
  | 'DUPLICATE_ID'
  | 'INVALID_ID'
  | 'INVALID_PATH'
  | 'INVALID_ROLE'
  | 'INVALID_EVIDENCE'
  | 'INVALID_AUTHORITY'
  | 'INVALID_REQUIRED'
  | 'INVALID_TEXT'
  | 'INVALID_SCAM'
  | 'UNKNOWN_FIELD'
  | 'INVALID_COMPRESSED_BODY'
  | 'DIGEST_MISMATCH'
  | 'UNKNOWN_LAW'
  | 'MEMORY_GAP'
  | 'HALT_MISMATCH'
  | 'PATH_ESCAPE';

export type EquationIssue = {
  readonly code: EquationIssueCode;
  readonly field: string;
  readonly message: string;
};

export type UpgradeCandidate = {
  readonly id: string;
  readonly kind: 'review-verified-repo';
  readonly evidenceHash: string;
};

export type RepoUpgradeCompression = {
  readonly law: typeof ECOSYSTEM_BODY_EQUATION_ID;
  readonly phase: 'COMPRESS';
  readonly execution: 'NOT_EXECUTED';
  readonly authority: 'compression-is-not-permission';
  readonly selected: UpgradeCandidate | null;
  readonly reason: string;
};

export type EquationCompression =
  | {
      readonly status: 'COMPRESSED' | 'HALTED';
      readonly body: EquationBody;
      readonly upgrade: RepoUpgradeCompression;
      readonly issues: readonly [];
    }
  | {
      readonly status: 'INVALID';
      readonly body: null;
      readonly upgrade: RepoUpgradeCompression;
      readonly issues: readonly EquationIssue[];
    };

export type EquationExpansion =
  | {
      readonly status: 'EXPANDED';
      readonly entries: readonly EquationMemoryEntry[];
      readonly halt: EquationHalt | null;
      readonly digest: string;
      readonly digestMatches: true;
      readonly evidence: 'LOCAL_ROUND_TRIP_ONLY';
      readonly issues: readonly [];
    }
  | {
      readonly status: 'INVALID';
      readonly entries: readonly [];
      readonly halt: null;
      readonly digest: null;
      readonly digestMatches: false;
      readonly evidence: 'LOCAL_ROUND_TRIP_ONLY';
      readonly issues: readonly EquationIssue[];
    };

export type OutwardReconciliation = {
  readonly status: 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'INVALID';
  readonly compared: number;
  readonly issues: readonly EquationIssue[];
};

const ROLE_SET = new Set<string>(REPO_OUTWARD_ROLES);
const SURFACE_FIELDS = new Set([
  'id',
  'path',
  'role',
  'evidence',
  'scam',
  'authority',
  'required',
  'expected',
  'observed',
]);

const sha256 = (value: string | Buffer): string =>
  createHash('sha256').update(value).digest('hex');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const issue = (code: EquationIssueCode, field: string, message: string): EquationIssue => ({
  code,
  field,
  message,
});

const safeId = (value: string): boolean => /^[a-z0-9][a-z0-9._-]{0,63}$/.test(value);

const safePath = (value: string): boolean => {
  if (!value || value.length > 240) return false;
  if (value.startsWith('/') || value.includes('\\') || value.includes('\0')) return false;
  if (value.split('/').some((part) => part === '' || part === '.' || part === '..')) return false;
  return true;
};

const boundedText = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length <= max;

const safeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000;

const noUpgrade = (reason: string): RepoUpgradeCompression =>
  Object.freeze({
    law: ECOSYSTEM_BODY_EQUATION_ID,
    phase: 'COMPRESS',
    execution: 'NOT_EXECUTED',
    authority: 'compression-is-not-permission',
    selected: null,
    reason,
  });

const entryHash = (entry: Omit<EquationMemoryEntry, 'index' | 'hash'>): string =>
  sha256(
    JSON.stringify({
      authority: entry.authority,
      evidence: entry.evidence,
      expected: entry.expected,
      id: entry.id,
      observed: entry.observed,
      path: entry.path,
      required: entry.required,
      role: entry.role,
    }),
  );

const bodyDigest = (memory: readonly EquationMemoryEntry[], halt: EquationHalt | null): string =>
  sha256(
    JSON.stringify({
      halt,
      law: ECOSYSTEM_BODY_EQUATION_ID,
      memory: memory.map((entry) => entry.hash),
    }),
  );

const freezeBody = (
  status: EquationBody['status'],
  memory: readonly EquationMemoryEntry[],
  halt: EquationHalt | null,
): EquationBody =>
  Object.freeze({
    law: ECOSYSTEM_BODY_EQUATION_ID,
    source: ECOSYSTEM_BODY_EQUATION_SOURCE,
    reality: ECOSYSTEM_BODY_REALITY,
    status,
    memory: Object.freeze([...memory]),
    halt: halt ? Object.freeze({ ...halt }) : null,
    digest: bodyDigest(memory, halt),
  });

/**
 * One verified memory names one review candidate. The candidate is not run.
 * A halt, or an invalid body, selects nothing.
 */
export function compressRepoTowardUpgrade(body: EquationBody | null): RepoUpgradeCompression {
  if (!body || body.status !== 'COMPRESSED' || body.memory.length === 0 || body.halt) {
    return noUpgrade(
      body?.status === 'HALTED'
        ? `Fold halted ${body.halt?.verdict ?? 'UNKNOWN'}; compression does not invent an upgrade.`
        : 'No verified memory, so no upgrade candidate is compressed.',
    );
  }
  return Object.freeze({
    law: ECOSYSTEM_BODY_EQUATION_ID,
    phase: 'COMPRESS',
    execution: 'NOT_EXECUTED',
    authority: 'compression-is-not-permission',
    selected: Object.freeze({
      id: `upgrade.${body.digest.slice(0, 16)}`,
      kind: 'review-verified-repo',
      evidenceHash: body.digest,
    }),
    reason:
      'Verified repo memory compressed to one unexecuted upgrade candidate. Selection is not permission and nothing was upgraded.',
  });
}

const parseSurface = (
  value: unknown,
  index: number,
): { surface: RepoSurfaceObservation } | { issues: EquationIssue[] } => {
  const field = `$[${index}]`;
  if (!isRecord(value)) {
    return { issues: [issue('INVALID_INPUT', field, 'surface must be an object')] };
  }
  const issues: EquationIssue[] = [];
  for (const key of Object.keys(value)) {
    if (!SURFACE_FIELDS.has(key)) {
      issues.push(issue('UNKNOWN_FIELD', `${field}.${key}`, 'field is outside the equation'));
    }
  }
  if (typeof value.id !== 'string' || !safeId(value.id)) {
    issues.push(issue('INVALID_ID', `${field}.id`, 'id must be 1-64 lowercase safe characters'));
  }
  if (typeof value.path !== 'string' || !safePath(value.path)) {
    issues.push(issue('INVALID_PATH', `${field}.path`, 'path must be a relative repo path without ..'));
  }
  if (typeof value.role !== 'string' || !ROLE_SET.has(value.role)) {
    issues.push(issue('INVALID_ROLE', `${field}.role`, 'role is not on the outward ring'));
  }
  if (!(value.evidence === null || (typeof value.evidence === 'string' && value.evidence.length <= 240))) {
    issues.push(issue('INVALID_EVIDENCE', `${field}.evidence`, 'evidence must be null or a string of at most 240 characters'));
  }
  if (typeof value.scam !== 'boolean') {
    issues.push(issue('INVALID_SCAM', `${field}.scam`, 'scam must be boolean'));
  }
  if (!safeInteger(value.authority)) {
    issues.push(issue('INVALID_AUTHORITY', `${field}.authority`, 'authority must be a non-negative safe integer'));
  }
  if (!safeInteger(value.required)) {
    issues.push(issue('INVALID_REQUIRED', `${field}.required`, 'required authority must be a non-negative safe integer'));
  }
  if (!boundedText(value.expected, 512) || !boundedText(value.observed, 512)) {
    issues.push(issue('INVALID_TEXT', `${field}.expected`, 'expected and observed must be strings of at most 512 characters'));
  }
  if (issues.length) return { issues };
  return {
    surface: {
      id: value.id as string,
      path: value.path as string,
      role: value.role as RepoOutwardRole,
      evidence: value.evidence as string | null,
      scam: value.scam as boolean,
      authority: value.authority as number,
      required: value.required as number,
      expected: value.expected as string,
      observed: value.observed as string,
    },
  };
};

const classify = (
  surface: RepoSurfaceObservation,
): { verdict: 'VERIFIED' } | { verdict: EquationHaltVerdict; reason: string } => {
  const evidence = surface.evidence?.trim() ?? '';
  const verified =
    evidence.length > 0 &&
    surface.scam === false &&
    surface.authority >= surface.required &&
    surface.expected === surface.observed;
  if (verified) return { verdict: 'VERIFIED' };
  if (surface.scam) {
    return { verdict: 'DIVERGENT', reason: 'K(x) ∈ SCAM; the fold halts divergent.' };
  }
  if (evidence.length === 0) {
    return { verdict: 'UNKNOWN', reason: 'Evidence(x) = ∅; the fold halts unknown.' };
  }
  if (surface.authority < surface.required) {
    return {
      verdict: 'NOT_EXECUTED',
      reason: 'Authority(x) < Required; the fold halts not executed.',
    };
  }
  return { verdict: 'DIVERGENT', reason: 'Expected ≢ Observed; reality refused the union.' };
};

/**
 * Fold surfaces through the ECOSYSTEM_BODY equation.
 * Shape errors refuse the whole input. A semantic halt keeps the verified prefix
 * and does not name an upgrade.
 */
export function compressRepoEquation(input: unknown): EquationCompression {
  if (!Array.isArray(input)) {
    return {
      status: 'INVALID',
      body: null,
      upgrade: noUpgrade('Input was not a surface list, so nothing was compressed.'),
      issues: Object.freeze([issue('INVALID_INPUT', '$', 'surfaces must be an array')]),
    };
  }
  if (input.length === 0) {
    return {
      status: 'INVALID',
      body: null,
      upgrade: noUpgrade('Empty input is not a verified memory.'),
      issues: Object.freeze([issue('EMPTY_BODY', '$', 'at least one surface is required')]),
    };
  }
  if (input.length > MAX_EQUATION_SURFACES) {
    return {
      status: 'INVALID',
      body: null,
      upgrade: noUpgrade('Over-capacity input was refused, not truncated.'),
      issues: Object.freeze([
        issue(
          'BODY_OVER_CAPACITY',
          '$',
          `at most ${MAX_EQUATION_SURFACES} surfaces can enter one fold`,
        ),
      ]),
    };
  }

  const issues: EquationIssue[] = [];
  const surfaces: RepoSurfaceObservation[] = [];
  const seen = new Set<string>();
  input.forEach((value, index) => {
    const parsed = parseSurface(value, index);
    if ('issues' in parsed) {
      issues.push(...parsed.issues);
      return;
    }
    if (seen.has(parsed.surface.id)) {
      issues.push(issue('DUPLICATE_ID', `$[${index}].id`, 'surface ids must be unique'));
      return;
    }
    seen.add(parsed.surface.id);
    surfaces.push(parsed.surface);
  });
  if (issues.length) {
    return {
      status: 'INVALID',
      body: null,
      upgrade: noUpgrade('Invalid surfaces were refused before the fold.'),
      issues: Object.freeze(issues),
    };
  }

  const memory: EquationMemoryEntry[] = [];
  for (const surface of surfaces) {
    const verdict = classify(surface);
    if (verdict.verdict !== 'VERIFIED') {
      const halt: EquationHalt = {
        verdict: verdict.verdict,
        id: surface.id,
        path: surface.path,
        reason: verdict.reason,
      };
      const body = freezeBody('HALTED', memory, halt);
      return {
        status: 'HALTED',
        body,
        upgrade: compressRepoTowardUpgrade(body),
        issues: Object.freeze([]),
      };
    }
    const stored = {
      id: surface.id,
      path: surface.path,
      role: surface.role,
      evidence: surface.evidence!.trim(),
      expected: surface.expected,
      observed: surface.observed,
      authority: surface.authority,
      required: surface.required,
    };
    memory.push(
      Object.freeze({
        index: memory.length,
        ...stored,
        hash: entryHash(stored),
      }),
    );
  }

  const body = freezeBody('COMPRESSED', memory, null);
  return {
    status: 'COMPRESSED',
    body,
    upgrade: compressRepoTowardUpgrade(body),
    issues: Object.freeze([]),
  };
}

const invalidExpansion = (issues: EquationIssue[]): EquationExpansion => ({
  status: 'INVALID',
  entries: Object.freeze([]),
  halt: null,
  digest: null,
  digestMatches: false,
  evidence: 'LOCAL_ROUND_TRIP_ONLY',
  issues: Object.freeze(issues),
});

const unwrapBody = (input: unknown): unknown => {
  if (!isRecord(input)) return input;
  if (isRecord(input.compression) && Array.isArray((input.compression as { memory?: unknown }).memory)) {
    return input.compression;
  }
  if (isRecord(input.body) && Array.isArray((input.body as { memory?: unknown }).memory)) {
    return input.body;
  }
  return input;
};

/** Restore remembered surfaces. A digest or hash mismatch is refused. */
export function expandRepoEquation(input: unknown): EquationExpansion {
  const candidate = unwrapBody(input);
  if (!isRecord(candidate)) {
    return invalidExpansion([
      issue('INVALID_COMPRESSED_BODY', '$', 'compressed body must be an object'),
    ]);
  }
  if (candidate.law !== ECOSYSTEM_BODY_EQUATION_ID) {
    return invalidExpansion([
      issue('UNKNOWN_LAW', '$.law', `law must be ${ECOSYSTEM_BODY_EQUATION_ID}`),
    ]);
  }
  if (candidate.source !== ECOSYSTEM_BODY_EQUATION_SOURCE || candidate.reality !== ECOSYSTEM_BODY_REALITY) {
    return invalidExpansion([
      issue('INVALID_COMPRESSED_BODY', '$.source', 'source and reality must match ECOSYSTEM_BODY.md'),
    ]);
  }
  if (!Array.isArray(candidate.memory)) {
    return invalidExpansion([
      issue('INVALID_COMPRESSED_BODY', '$.memory', 'memory must be an array'),
    ]);
  }

  const issues: EquationIssue[] = [];
  const memory: EquationMemoryEntry[] = [];
  candidate.memory.forEach((value, index) => {
    if (!isRecord(value)) {
      issues.push(issue('INVALID_COMPRESSED_BODY', `$.memory[${index}]`, 'memory entry must be an object'));
      return;
    }
    const parsed = parseSurface(
      {
        id: value.id,
        path: value.path,
        role: value.role,
        evidence: value.evidence,
        scam: false,
        authority: value.authority,
        required: value.required,
        expected: value.expected,
        observed: value.observed,
      },
      index,
    );
    if ('issues' in parsed) {
      issues.push(...parsed.issues.map((item) => ({ ...item, field: `$.memory[${index}]` })));
      return;
    }
    if (value.index !== index) {
      issues.push(issue('MEMORY_GAP', `$.memory[${index}].index`, 'memory indexes must be contiguous from 0'));
      return;
    }
    if (parsed.surface.evidence === null || parsed.surface.evidence.trim() === '') {
      issues.push(issue('INVALID_EVIDENCE', `$.memory[${index}].evidence`, 'remembered evidence cannot be empty'));
      return;
    }
    const stored = {
      id: parsed.surface.id,
      path: parsed.surface.path,
      role: parsed.surface.role,
      evidence: parsed.surface.evidence.trim(),
      expected: parsed.surface.expected,
      observed: parsed.surface.observed,
      authority: parsed.surface.authority,
      required: parsed.surface.required,
    };
    const hash = entryHash(stored);
    if (value.hash !== hash) {
      issues.push(issue('DIGEST_MISMATCH', `$.memory[${index}].hash`, 'memory entry hash does not match its fields'));
      return;
    }
    memory.push(Object.freeze({ index, ...stored, hash }));
  });

  let halt: EquationHalt | null = null;
  if (candidate.halt === null) {
    halt = null;
  } else if (
    isRecord(candidate.halt) &&
    (candidate.halt.verdict === 'DIVERGENT' ||
      candidate.halt.verdict === 'UNKNOWN' ||
      candidate.halt.verdict === 'NOT_EXECUTED') &&
    typeof candidate.halt.id === 'string' &&
    typeof candidate.halt.path === 'string' &&
    typeof candidate.halt.reason === 'string'
  ) {
    halt = {
      verdict: candidate.halt.verdict,
      id: candidate.halt.id,
      path: candidate.halt.path,
      reason: candidate.halt.reason,
    };
  } else {
    issues.push(issue('HALT_MISMATCH', '$.halt', 'halt must be null or a DIVERGENT | UNKNOWN | NOT_EXECUTED record'));
  }

  const statusAgrees =
    (candidate.status === 'COMPRESSED' && halt === null) ||
    (candidate.status === 'HALTED' && halt !== null);
  if (!statusAgrees) {
    issues.push(issue('HALT_MISMATCH', '$.status', 'status must agree with halt'));
  }
  if (issues.length) return invalidExpansion(issues);

  const digest = bodyDigest(memory, halt);
  if (candidate.digest !== digest) {
    return invalidExpansion([
      issue('DIGEST_MISMATCH', '$.digest', 'body digest does not match memory and halt'),
    ]);
  }
  return {
    status: 'EXPANDED',
    entries: Object.freeze(memory),
    halt,
    digest,
    digestMatches: true,
    evidence: 'LOCAL_ROUND_TRIP_ONLY',
    issues: Object.freeze([]),
  };
}

const readInside = (root: string, relPath: string): Buffer | null => {
  if (!safePath(relPath)) return null;
  let rootReal: string;
  try {
    rootReal = realpathSync(root);
  } catch {
    return null;
  }
  const target = resolve(rootReal, relPath);
  const rel = relative(rootReal, target);
  if (rel.startsWith(`..${sep}`) || rel === '..' || isAbsolute(rel)) return null;
  let real: string;
  try {
    real = realpathSync(target);
  } catch {
    return null;
  }
  const relReal = relative(rootReal, real);
  if (relReal.startsWith(`..${sep}`) || relReal === '..' || isAbsolute(relReal)) return null;
  let info: ReturnType<typeof statSync>;
  try {
    info = statSync(real);
  } catch {
    return null;
  }
  if (!info.isFile() || info.size < 1 || info.size > MAX_OBSERVED_FILE_BYTES) return null;
  return readFileSync(real);
};

/**
 * Read each declared path once. A missing, empty, escaping, or oversized file
 * becomes Evidence = ∅ so the equation can halt UNKNOWN. This does not write.
 */
export function observeOutwardFiles(
  root: string,
  ring: readonly OutwardSurface[],
): { readonly surfaces: readonly RepoSurfaceObservation[] } {
  const surfaces = ring.map((surface) => {
    const bytes = readInside(root, surface.path);
    if (!bytes) {
      return Object.freeze({
        ...surface,
        evidence: null,
        scam: false,
        authority: 1,
        required: 1,
        expected: '',
        observed: '',
      });
    }
    const hash = sha256(bytes);
    return Object.freeze({
      ...surface,
      evidence: `filesystem:${bytes.length}`,
      scam: false,
      authority: 1,
      required: 1,
      expected: hash,
      observed: hash,
    });
  });
  return { surfaces: Object.freeze(surfaces) };
}

/**
 * Re-read expanded paths and compare their current bytes to the remembered hash.
 * VERIFIED here means this process read those files and the hashes matched.
 */
export function reconcileOutwardExpansion(
  root: string,
  expansion: EquationExpansion,
): OutwardReconciliation {
  if (expansion.status !== 'EXPANDED') {
    return {
      status: 'INVALID',
      compared: 0,
      issues: Object.freeze([
        issue('INVALID_COMPRESSED_BODY', '$', 'only an expanded body can be reconciled'),
      ]),
    };
  }
  const issues: EquationIssue[] = [];
  let compared = 0;
  for (const entry of expansion.entries) {
    const bytes = readInside(root, entry.path);
    if (!bytes) {
      issues.push(issue('INVALID_PATH', entry.path, 'path could not be read inside the repo root'));
      continue;
    }
    compared += 1;
    const hash = sha256(bytes);
    if (hash !== entry.observed) {
      issues.push(issue('DIGEST_MISMATCH', entry.path, 'file bytes no longer match the remembered hash'));
    }
  }
  const missing = issues.some((item) => item.code === 'INVALID_PATH');
  const divergent = issues.some((item) => item.code === 'DIGEST_MISMATCH');
  const status = divergent ? 'DIVERGENT' : missing ? 'UNKNOWN' : 'VERIFIED';
  return { status, compared, issues: Object.freeze(issues) };
}

/** In-process law. Expected ≡ Observed because both sides are this constant, not a disk read. */
export const EQUATION_LAW_OBSERVATION: RepoSurfaceObservation = Object.freeze({
  id: 'ecosystem-body-equation',
  path: 'ECOSYSTEM_BODY.md',
  role: 'contract',
  evidence: 'in-process constant; not a filesystem read',
  scam: false,
  authority: 1,
  required: 1,
  expected: 'Y(M[t+1]=M[t] union Delta | Expected≡Observed)',
  observed: 'Y(M[t+1]=M[t] union Delta | Expected≡Observed)',
});

/** Paths this repository may expand outward. Admission is observation, not the list. */
export const REPO_OUTWARD_RING: readonly OutwardSurface[] = Object.freeze([
  Object.freeze({ id: 'equation', path: 'ECOSYSTEM_BODY.md', role: 'contract' as const }),
  Object.freeze({ id: 'upgrade-contract', path: 'OMEGA_UPGRADE_MAX_COMPRESS.md', role: 'contract' as const }),
  Object.freeze({ id: 'charter', path: 'CHARTER.md', role: 'contract' as const }),
  Object.freeze({ id: 'agents', path: 'AGENTS.md', role: 'docs' as const }),
  Object.freeze({ id: 'readme', path: 'README.md', role: 'docs' as const }),
  Object.freeze({ id: 'equation-kernel', path: 'packages/mini/src/ecosystem-body-equation.ts', role: 'kernel' as const }),
  Object.freeze({ id: 'kernel', path: 'packages/mini/src/index.ts', role: 'kernel' as const }),
  Object.freeze({ id: 'single-body', path: 'packages/mini/src/single-body.ts', role: 'kernel' as const }),
  Object.freeze({ id: 'api-contract', path: 'apps/api/src/route-contract.ts', role: 'api' as const }),
  Object.freeze({ id: 'api', path: 'apps/api/src/index.ts', role: 'api' as const }),
  Object.freeze({ id: 'web-body', path: 'apps/web/src/SingleBodyPanel.tsx', role: 'web' as const }),
  Object.freeze({ id: 'cli', path: 'bin/oceanicos.mjs', role: 'cli' as const }),
  Object.freeze({ id: 'equation-cli', path: 'scripts/compress-repo-equation.ts', role: 'cli' as const }),
  Object.freeze({ id: 'equation-doc', path: 'docs/ECOSYSTEM-BODY-EQUATION.md', role: 'docs' as const }),
  Object.freeze({ id: 'body-doc', path: 'docs/SINGLE-BODY-4X4X4X4.md', role: 'docs' as const }),
  Object.freeze({ id: 'verified-upgrade-skill', path: 'skills/oceanicos-verified-upgrade/SKILL.md', role: 'skill' as const }),
]);
