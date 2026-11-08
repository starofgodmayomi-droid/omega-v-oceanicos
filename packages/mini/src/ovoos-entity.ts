/**
 * ΩVØØS Entity Architecture — one bounded compress / expand / upgrade pass.
 *
 * The supplied image is the declaration this contract encodes, not a
 * measurement. Its five regions are the entity's star topology:
 *
 *   center  VØØS orchestrator — one runtime commands the star
 *   gate    OMEGA rings       — SHA-256 evidence digest admits or rejects
 *   threads KAI threads       — every external call is tethered and filtered
 *   glober  the surrounding   — users, APIs, streams and markets, observed
 *   void    VØ                — local-first store, no cloud required
 *
 * Compression folds the caller's region records into their regions and hashes
 * the fold. Expansion restores every record in its original order and proves
 * the digest still matches. `summarizeOvoosEntity` reports `VERIFIED` only
 * when every region is present, the OMEGA gate is active, the KAI threads are
 * secured, and the local round trip matched — a statement about this
 * representation only. It does not prove deployment, a live network, or any
 * real-world outcome, and it never names an executed upgrade.
 */
import { createHash } from 'node:crypto';

export const OVOOS_ENTITY_CONTRACT = 'ovoos.entity.architecture.v1';
export const OVOOS_ENTITY_NAME = 'ΩVØØS_CYBERNETIC_SQUID';
export const OVOOS_NODE_TOPOLOGY = 'STAR';
export const OVOOS_REGION_ORDER = ['center', 'gate', 'threads', 'glober', 'void'] as const;
export const OVOOS_REGION_CAPACITY = 8;
export const OVOOS_CAPACITY = OVOOS_REGION_ORDER.length * OVOOS_REGION_CAPACITY;
export const OVOOS_EVIDENCE_ORDER = ['VERIFIED', 'SUPPORTED', 'UNVERIFIED', 'UNKNOWN'] as const;

export const OVOOS_EVIDENCE_BOUNDARY =
  'The five regions, the OMEGA rings, the KAI threads and the VØ are a declared projection of the supplied entity image. '
  + 'The compression digest, region evidence, gate, connections and status are computed from this process\' observations. '
  + 'Phase T, topology labels and region names are declared, not measured. Compression is not permission.';

export type OvoosRegion = (typeof OVOOS_REGION_ORDER)[number];
export type OvoosEvidence = (typeof OVOOS_EVIDENCE_ORDER)[number];

export const OVOOS_REGION_MEANING: Readonly<Record<OvoosRegion, string>> = Object.freeze({
  center: 'VØØS orchestrator — one runtime commands the star',
  gate: 'OMEGA rings — SHA-256 evidence digest admits or rejects',
  threads: 'KAI threads — every external call is tethered and filtered',
  glober: 'Glober — users, APIs, streams and markets observed around the center',
  void: 'VØ — local-first void, sovereign file store, no cloud required',
});

export interface OvoosRegionRecord {
  readonly id: string;
  readonly name: string;
  readonly region: OvoosRegion;
  /** What the region means in code, kept verbatim through the round trip. */
  readonly role: string;
  readonly source: string;
  readonly status: string;
  readonly evidence: OvoosEvidence;
}

export interface OvoosRegionCellEntry {
  /** Original position in the entity, preserved so expansion restores order. */
  readonly index: number;
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly source: string;
  readonly status: string;
  readonly evidence: OvoosEvidence;
}

export interface OvoosRegionCell {
  readonly region: OvoosRegion;
  readonly meaning: string;
  readonly entries: readonly OvoosRegionCellEntry[];
  readonly digest: string;
}

export interface CompressedOvoosEntity {
  readonly contract: typeof OVOOS_ENTITY_CONTRACT;
  readonly entity: typeof OVOOS_ENTITY_NAME;
  readonly nodeTopology: typeof OVOOS_NODE_TOPOLOGY;
  readonly capacity: number;
  readonly count: number;
  readonly filled: number;
  readonly regions: readonly OvoosRegionCell[];
  readonly digest: string;
  readonly evidence: 'LOCAL_REPRESENTATION';
}

export type OvoosIssueCode =
  | 'INVALID_ENTITY_INPUT'
  | 'RECORD_NOT_OBJECT'
  | 'INVALID_RECORD_ID'
  | 'DUPLICATE_RECORD_ID'
  | 'INVALID_RECORD_TEXT'
  | 'UNKNOWN_REGION'
  | 'UNKNOWN_EVIDENCE'
  | 'REGION_OVER_CAPACITY'
  | 'ENTITY_OVER_CAPACITY'
  | 'INVALID_COMPRESSED_ENTITY'
  | 'DIGEST_MISMATCH';

export interface OvoosIssue {
  readonly code: OvoosIssueCode;
  readonly field: string;
  readonly message: string;
}

export type OvoosCompression =
  | { readonly status: 'COMPRESSED'; readonly entity: CompressedOvoosEntity; readonly issues: readonly [] }
  | { readonly status: 'INVALID'; readonly entity: null; readonly issues: readonly OvoosIssue[] };

export type OvoosExpansion =
  | {
      readonly status: 'EXPANDED';
      readonly records: readonly OvoosRegionRecord[];
      readonly digest: string;
      readonly digestMatches: true;
      readonly evidence: 'LOCAL_ROUND_TRIP_ONLY';
      readonly issues: readonly [];
    }
  | {
      readonly status: 'DIVERGENT';
      readonly records: readonly OvoosRegionRecord[];
      readonly digest: string;
      readonly digestMatches: false;
      readonly evidence: 'LOCAL_ROUND_TRIP_ONLY';
      readonly issues: readonly OvoosIssue[];
    }
  | {
      readonly status: 'INVALID';
      readonly records: readonly [];
      readonly digest: null;
      readonly digestMatches: false;
      readonly evidence: 'LOCAL_ROUND_TRIP_ONLY';
      readonly issues: readonly OvoosIssue[];
    };

export interface OvoosRegionView {
  readonly region: OvoosRegion;
  readonly meaning: string;
  readonly status: OvoosEvidence | 'ABSENT';
  readonly records: readonly OvoosRegionCellEntry[];
}

export interface OvoosEntitySummary {
  readonly contract: typeof OVOOS_ENTITY_CONTRACT;
  readonly entity: typeof OVOOS_ENTITY_NAME;
  readonly nodeTopology: typeof OVOOS_NODE_TOPOLOGY;
  readonly status: 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN';
  readonly gameDetected: false;
  readonly gate: 'OMEGA_RINGS_ACTIVE' | 'OMEGA_RINGS_DEGRADED';
  readonly connections: 'KAI_THREADS_SECURED' | 'KAI_THREADS_DEGRADED';
  readonly phaseT: 'BLOOM (0.5)';
  readonly evidenceHash: string | null;
  /** Percent of the five regions whose every record is VERIFIED. */
  readonly synchrony: number;
  readonly action: string;
  readonly nextDelta: 'AWAITING INTENT' | 'AWAITING EVIDENCE';
  readonly regions: readonly OvoosRegionView[];
  readonly upgrade: {
    readonly execution: 'NOT_EXECUTED';
    readonly candidate: { readonly action: 'review-verified-entity'; readonly contract: string; readonly digest: string } | null;
  };
  readonly evidenceBoundary: string;
}

const RECORD_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const MAX_RECORD_TEXT = 512;
const EVIDENCE_RANK: Readonly<Record<OvoosEvidence, number>> = Object.freeze({
  VERIFIED: 0,
  SUPPORTED: 1,
  UNVERIFIED: 2,
  UNKNOWN: 3,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const canonical = (value: unknown): string => JSON.stringify(value);
const sha256 = (value: string): string => createHash('sha256').update(value, 'utf8').digest('hex');

const regionIndex = (region: OvoosRegion): number => OVOOS_REGION_ORDER.indexOf(region);

const isEvidence = (value: unknown): value is OvoosEvidence =>
  typeof value === 'string' && (OVOOS_EVIDENCE_ORDER as readonly string[]).includes(value);

const isRegion = (value: unknown): value is OvoosRegion =>
  typeof value === 'string' && (OVOOS_REGION_ORDER as readonly string[]).includes(value);

const cellPayload = (cell: OvoosRegionCell) => ({ region: cell.region, entries: cell.entries });

const digestOfCells = (cells: readonly OvoosRegionCell[]): string =>
  sha256(canonical(cells.map(cellPayload)));

type NormalizedRecords =
  | { readonly status: 'VALID'; readonly records: readonly OvoosRegionRecord[] }
  | { readonly status: 'INVALID'; readonly issues: readonly OvoosIssue[] };

function normalizeRecords(input: unknown): NormalizedRecords {
  if (!Array.isArray(input)) {
    return {
      status: 'INVALID',
      issues: [{ code: 'INVALID_ENTITY_INPUT', field: '$', message: 'entity records must be an array' }],
    };
  }
  if (input.length > OVOOS_CAPACITY) {
    return {
      status: 'INVALID',
      issues: [{
        code: 'ENTITY_OVER_CAPACITY',
        field: '$',
        message: `entity holds ${input.length} records; five regions address ${OVOOS_CAPACITY}`,
      }],
    };
  }

  const issues: OvoosIssue[] = [];
  const ids = new Set<string>();
  const perRegion = new Map<OvoosRegion, number>();
  const records: OvoosRegionRecord[] = [];

  input.forEach((candidate, position) => {
    const field = `$[${position}]`;
    if (!isRecord(candidate)) {
      issues.push({ code: 'RECORD_NOT_OBJECT', field, message: 'record must be a non-null object' });
      return;
    }

    const id = candidate.id;
    if (typeof id !== 'string' || !RECORD_ID_PATTERN.test(id)) {
      issues.push({ code: 'INVALID_RECORD_ID', field: `${field}.id`, message: 'id must be 1-128 safe ASCII characters' });
    } else if (ids.has(id)) {
      issues.push({ code: 'DUPLICATE_RECORD_ID', field: `${field}.id`, message: `id ${id} appears more than once` });
    } else {
      ids.add(id);
    }

    const texts: Record<'name' | 'role' | 'source' | 'status', string> = { name: '', role: '', source: '', status: '' };
    for (const key of ['name', 'role', 'source', 'status'] as const) {
      const value = candidate[key];
      if (typeof value !== 'string' || value.length === 0 || value.length > MAX_RECORD_TEXT) {
        issues.push({ code: 'INVALID_RECORD_TEXT', field: `${field}.${key}`, message: `${key} must be 1-${MAX_RECORD_TEXT} characters` });
        continue;
      }
      texts[key] = value;
    }

    const region = candidate.region;
    if (!isRegion(region)) {
      issues.push({ code: 'UNKNOWN_REGION', field: `${field}.region`, message: `region must be one of ${OVOOS_REGION_ORDER.join(' | ')}` });
    } else {
      const count = (perRegion.get(region) ?? 0) + 1;
      perRegion.set(region, count);
      if (count > OVOOS_REGION_CAPACITY) {
        issues.push({ code: 'REGION_OVER_CAPACITY', field: `${field}.region`, message: `region ${region} holds more than ${OVOOS_REGION_CAPACITY} records` });
      }
    }

    const evidence = candidate.evidence;
    if (!isEvidence(evidence)) {
      issues.push({ code: 'UNKNOWN_EVIDENCE', field: `${field}.evidence`, message: `evidence must be one of ${OVOOS_EVIDENCE_ORDER.join(' | ')}` });
    }

    if (typeof id === 'string' && isRegion(region) && isEvidence(evidence) && texts.name && texts.role && texts.source && texts.status) {
      records.push({
        id,
        name: texts.name,
        region,
        role: texts.role,
        source: texts.source,
        status: texts.status,
        evidence,
      });
    }
  });

  if (issues.length) return { status: 'INVALID', issues: Object.freeze(issues) };
  return { status: 'VALID', records: Object.freeze(records) };
}

export function compressOvoosEntity(input: unknown): OvoosCompression {
  const normalized = normalizeRecords(input);
  if (normalized.status === 'INVALID') {
    return { status: 'INVALID', entity: null, issues: normalized.issues };
  }

  const byRegion = new Map<OvoosRegion, OvoosRegionCellEntry[]>();
  normalized.records.forEach((record, index) => {
    const entries = byRegion.get(record.region) ?? [];
    entries.push(Object.freeze({
      index,
      id: record.id,
      name: record.name,
      role: record.role,
      source: record.source,
      status: record.status,
      evidence: record.evidence,
    }));
    byRegion.set(record.region, entries);
  });

  const cells: OvoosRegionCell[] = OVOOS_REGION_ORDER
    .filter((region) => (byRegion.get(region)?.length ?? 0) > 0)
    .map((region) => {
      const entries = Object.freeze(byRegion.get(region) ?? []);
      return Object.freeze({
        region,
        meaning: OVOOS_REGION_MEANING[region],
        entries,
        digest: sha256(canonical({ region, entries })),
      });
    });

  const entity: CompressedOvoosEntity = Object.freeze({
    contract: OVOOS_ENTITY_CONTRACT,
    entity: OVOOS_ENTITY_NAME,
    nodeTopology: OVOOS_NODE_TOPOLOGY,
    capacity: OVOOS_CAPACITY,
    count: normalized.records.length,
    filled: cells.length,
    regions: Object.freeze(cells),
    digest: digestOfCells(cells),
    evidence: 'LOCAL_REPRESENTATION',
  });

  return { status: 'COMPRESSED', entity, issues: Object.freeze([]) };
}

type RebuiltCells =
  | { readonly status: 'VALID'; readonly cells: readonly OvoosRegionCell[] }
  | { readonly status: 'INVALID'; readonly issues: readonly OvoosIssue[] };

function rebuildCells(input: Record<string, unknown>): RebuiltCells {
  const issues: OvoosIssue[] = [];
  const rawRegions = input.regions;

  if (!Array.isArray(rawRegions) || rawRegions.length > OVOOS_REGION_ORDER.length) {
    return {
      status: 'INVALID',
      issues: [{
        code: 'INVALID_COMPRESSED_ENTITY',
        field: '$.regions',
        message: `regions must be an array of at most ${OVOOS_REGION_ORDER.length} occupied regions`,
      }],
    };
  }

  const seen = new Set<OvoosRegion>();
  const ids = new Set<string>();
  const cells: OvoosRegionCell[] = [];

  rawRegions.forEach((candidate, position) => {
    const field = `$.regions[${position}]`;
    if (!isRecord(candidate)) {
      issues.push({ code: 'INVALID_COMPRESSED_ENTITY', field, message: 'region must be a non-null object' });
      return;
    }
    if (!isRegion(candidate.region)) {
      issues.push({ code: 'INVALID_COMPRESSED_ENTITY', field: `${field}.region`, message: 'region is not part of the star' });
      return;
    }
    const regionValue = candidate.region;
    if (seen.has(regionValue)) {
      issues.push({ code: 'INVALID_COMPRESSED_ENTITY', field: `${field}.region`, message: `region ${regionValue} appears more than once` });
      return;
    }
    seen.add(regionValue);

    if (!Array.isArray(candidate.entries) || candidate.entries.length === 0 || candidate.entries.length > OVOOS_REGION_CAPACITY) {
      issues.push({ code: 'INVALID_COMPRESSED_ENTITY', field: `${field}.entries`, message: `region must hold 1-${OVOOS_REGION_CAPACITY} entries` });
      return;
    }

    const entries: OvoosRegionCellEntry[] = [];
    let regionUsable = true;
    (candidate.entries as unknown[]).forEach((rawEntry, entryPosition) => {
      const entryField = `${field}.entries[${entryPosition}]`;
      if (!isRecord(rawEntry)) {
        issues.push({ code: 'INVALID_COMPRESSED_ENTITY', field: entryField, message: 'entry must be a non-null object' });
        regionUsable = false;
        return;
      }
      const index = rawEntry.index;
      if (typeof index !== 'number' || !Number.isInteger(index) || index < 0) {
        issues.push({ code: 'INVALID_COMPRESSED_ENTITY', field: `${entryField}.index`, message: 'index must be a non-negative integer' });
        regionUsable = false;
        return;
      }
      const id = rawEntry.id;
      if (typeof id !== 'string' || !RECORD_ID_PATTERN.test(id)) {
        issues.push({ code: 'INVALID_COMPRESSED_ENTITY', field: `${entryField}.id`, message: 'id must be 1-128 safe ASCII characters' });
        regionUsable = false;
        return;
      }
      if (ids.has(id)) {
        issues.push({ code: 'INVALID_COMPRESSED_ENTITY', field: `${entryField}.id`, message: `id ${id} appears more than once` });
        regionUsable = false;
        return;
      }
      ids.add(id);

      const texts: Record<'name' | 'role' | 'source' | 'status', string> = { name: '', role: '', source: '', status: '' };
      let textOk = true;
      for (const key of ['name', 'role', 'source', 'status'] as const) {
        const value = rawEntry[key];
        if (typeof value !== 'string' || value.length === 0 || value.length > MAX_RECORD_TEXT) {
          issues.push({ code: 'INVALID_COMPRESSED_ENTITY', field: `${entryField}.${key}`, message: `${key} must be 1-${MAX_RECORD_TEXT} characters` });
          textOk = false;
          continue;
        }
        texts[key] = value;
      }
      if (!isEvidence(rawEntry.evidence)) {
        issues.push({ code: 'INVALID_COMPRESSED_ENTITY', field: `${entryField}.evidence`, message: 'evidence is not on the evidence axis' });
        textOk = false;
      }
      if (!textOk) {
        regionUsable = false;
        return;
      }

      entries.push(Object.freeze({
        index,
        id,
        name: texts.name,
        role: texts.role,
        source: texts.source,
        status: texts.status,
        evidence: rawEntry.evidence as OvoosEvidence,
      }));
    });

    if (!regionUsable || entries.length === 0) {
      if (regionUsable) {
        issues.push({ code: 'INVALID_COMPRESSED_ENTITY', field: `${field}.entries`, message: 'region holds no usable entry' });
      }
      return;
    }

    cells.push(Object.freeze({
      region: regionValue,
      meaning: OVOOS_REGION_MEANING[regionValue],
      entries: Object.freeze(entries),
      digest: sha256(canonical({ region: regionValue, entries })),
    }));
  });

  if (issues.length) return { status: 'INVALID', issues: Object.freeze(issues) };

  const ordered = [...cells].sort((left, right) => regionIndex(left.region) - regionIndex(right.region));
  return { status: 'VALID', cells: Object.freeze(ordered) };
}

export function expandOvoosEntity(input: unknown): OvoosExpansion {
  if (!isRecord(input)) {
    return {
      status: 'INVALID',
      records: [],
      digest: null,
      digestMatches: false,
      evidence: 'LOCAL_ROUND_TRIP_ONLY',
      issues: [{ code: 'INVALID_COMPRESSED_ENTITY', field: '$', message: 'compressed entity must be a non-null object' }],
    };
  }

  if (
    (input.contract !== undefined && input.contract !== OVOOS_ENTITY_CONTRACT) ||
    (input.entity !== undefined && input.entity !== OVOOS_ENTITY_NAME) ||
    (input.nodeTopology !== undefined && input.nodeTopology !== OVOOS_NODE_TOPOLOGY)
  ) {
    return {
      status: 'INVALID',
      records: [],
      digest: null,
      digestMatches: false,
      evidence: 'LOCAL_ROUND_TRIP_ONLY',
      issues: [{ code: 'INVALID_COMPRESSED_ENTITY', field: '$', message: `compressed entity must declare ${OVOOS_ENTITY_CONTRACT}` }],
    };
  }

  const rebuilt = rebuildCells(input);
  if (rebuilt.status === 'INVALID') {
    return {
      status: 'INVALID',
      records: [],
      digest: null,
      digestMatches: false,
      evidence: 'LOCAL_ROUND_TRIP_ONLY',
      issues: rebuilt.issues,
    };
  }

  const records = rebuilt.cells
    .flatMap((cell) => cell.entries.map((entry) => ({ entry, region: cell.region })))
    .sort((left, right) => left.entry.index - right.entry.index)
    .map(({ entry, region }) => Object.freeze({
      id: entry.id,
      name: entry.name,
      region,
      role: entry.role,
      source: entry.source,
      status: entry.status,
      evidence: entry.evidence,
    }));

  const digest = digestOfCells(rebuilt.cells);
  const declaredDigest = typeof input.digest === 'string' ? input.digest : null;

  if (declaredDigest === null || declaredDigest !== digest) {
    return {
      status: 'DIVERGENT',
      records: Object.freeze(records),
      digest,
      digestMatches: false,
      evidence: 'LOCAL_ROUND_TRIP_ONLY',
      issues: [{
        code: 'DIGEST_MISMATCH',
        field: '$.digest',
        message: declaredDigest === null ? 'compressed entity carries no digest' : 'declared digest does not match the restored regions',
      }],
    };
  }

  return {
    status: 'EXPANDED',
    records: Object.freeze(records),
    digest,
    digestMatches: true,
    evidence: 'LOCAL_ROUND_TRIP_ONLY',
    issues: Object.freeze([]),
  };
}

export type OvoosRoundTrip =
  | {
      readonly status: 'VERIFIED';
      readonly count: number;
      readonly filled: number;
      readonly digest: string;
      readonly lossless: true;
      readonly evidence: 'LOCAL_ROUND_TRIP_ONLY';
      readonly issues: readonly [];
    }
  | {
      readonly status: 'DIVERGENT';
      readonly count: number;
      readonly filled: number;
      readonly digest: string | null;
      readonly lossless: false;
      readonly mismatches: readonly string[];
      readonly issues: readonly OvoosIssue[];
    }
  | {
      readonly status: 'INVALID';
      readonly count: number;
      readonly filled: number;
      readonly digest: null;
      readonly lossless: false;
      readonly issues: readonly OvoosIssue[];
    };

export function verifyOvoosRoundTrip(input: unknown): OvoosRoundTrip {
  const compression = compressOvoosEntity(input);
  if (compression.status !== 'COMPRESSED') {
    return {
      status: 'INVALID',
      count: 0,
      filled: 0,
      digest: null,
      lossless: false,
      issues: compression.issues,
    };
  }

  const expansion = expandOvoosEntity(compression.entity);
  if (expansion.status !== 'EXPANDED') {
    return {
      status: 'DIVERGENT',
      count: compression.entity.count,
      filled: compression.entity.filled,
      digest: compression.entity.digest,
      lossless: false,
      mismatches: Object.freeze(['entity-digest']),
      issues: expansion.issues,
    };
  }

  const normalized = normalizeRecords(input);
  const expected = normalized.status === 'VALID' ? canonical(normalized.records) : '';
  const actual = canonical(expansion.records);
  if (expected !== actual) {
    return {
      status: 'DIVERGENT',
      count: compression.entity.count,
      filled: compression.entity.filled,
      digest: compression.entity.digest,
      lossless: false,
      mismatches: Object.freeze(['record-order-or-content']),
      issues: Object.freeze([]),
    };
  }

  return {
    status: 'VERIFIED',
    count: expansion.records.length,
    filled: compression.entity.filled,
    digest: compression.entity.digest,
    lossless: true,
    evidence: 'LOCAL_ROUND_TRIP_ONLY',
    issues: Object.freeze([]),
  };
}

const weakestEvidence = (view: readonly OvoosRegionCellEntry[]): OvoosEvidence | 'ABSENT' => {
  if (view.length === 0) return 'ABSENT';
  return view.reduce<OvoosEvidence>(
    (weakest, entry) => (EVIDENCE_RANK[entry.evidence] > EVIDENCE_RANK[weakest] ? entry.evidence : weakest),
    'VERIFIED',
  );
};

export function summarizeOvoosEntity(input: {
  compression: CompressedOvoosEntity | null;
  expansion: OvoosExpansion | null;
}): OvoosEntitySummary {
  const { compression, expansion } = input;
  const cells = compression?.regions ?? [];

  const regions: OvoosRegionView[] = OVOOS_REGION_ORDER.map((region) => {
    const cell = cells.find((candidate) => candidate.region === region);
    return Object.freeze({
      region,
      meaning: OVOOS_REGION_MEANING[region],
      status: weakestEvidence(cell?.entries ?? []),
      records: cell?.entries ?? Object.freeze([]),
    });
  });

  const gateCell = regions.find((view) => view.region === 'gate');
  const threadCell = regions.find((view) => view.region === 'threads');
  const gateActive = gateCell?.status === 'VERIFIED';
  const connectionsSecured =
    threadCell !== undefined
    && threadCell.status !== 'ABSENT'
    && (threadCell.status === 'VERIFIED' || threadCell.status === 'SUPPORTED');
  const everyRegionPresent = regions.every((view) => view.status !== 'ABSENT');
  const roundTripMatched = expansion?.status === 'EXPANDED';
  const anyDivergence = regions.some((view) => view.records.some((entry) => entry.status.toUpperCase() === 'DIVERGENT'));

  const status: OvoosEntitySummary['status'] =
    everyRegionPresent && gateActive && connectionsSecured && roundTripMatched
      ? 'VERIFIED'
      : anyDivergence
        ? 'DIVERGENT'
        : 'UNKNOWN';

  const verifiedRegions = regions.filter(
    (view) => view.status !== 'ABSENT' && view.records.every((entry) => entry.evidence === 'VERIFIED'),
  ).length;

  const evidenceHash = compression?.digest ?? null;

  return Object.freeze({
    contract: OVOOS_ENTITY_CONTRACT,
    entity: OVOOS_ENTITY_NAME,
    nodeTopology: OVOOS_NODE_TOPOLOGY,
    status,
    gameDetected: false as const,
    gate: gateActive ? 'OMEGA_RINGS_ACTIVE' as const : 'OMEGA_RINGS_DEGRADED' as const,
    connections: connectionsSecured ? 'KAI_THREADS_SECURED' as const : 'KAI_THREADS_DEGRADED' as const,
    phaseT: 'BLOOM (0.5)' as const,
    evidenceHash,
    synchrony: Math.round((verifiedRegions / OVOOS_REGION_ORDER.length) * 100),
    action:
      status === 'VERIFIED'
        ? 'Observing the Glober, filtering the sharks, flowing with the ocean.'
        : 'Holding at the OMEGA gate until every ring verifies.',
    nextDelta: status === 'VERIFIED' ? 'AWAITING INTENT' as const : 'AWAITING EVIDENCE' as const,
    regions: Object.freeze(regions),
    upgrade: Object.freeze({
      execution: 'NOT_EXECUTED' as const,
      candidate:
        status === 'VERIFIED' && evidenceHash
          ? Object.freeze({ action: 'review-verified-entity' as const, contract: OVOOS_ENTITY_CONTRACT, digest: evidenceHash })
          : null,
    }),
    evidenceBoundary: OVOOS_EVIDENCE_BOUNDARY,
  });
}
