/**
 * Ω∞v Single Body — bounded 4×4×4×4 compression and expansion.
 *
 * The body is addressed by four axes with four coordinates each:
 *
 *   layer    reality | system | evidence | authority
 *   organ    sense   | verify | remember | express
 *   form     runtime | contract | intent   | boundary
 *   evidence VERIFIED | SUPPORTED | UNVERIFIED | UNKNOWN
 *
 * 4×4×4×4 = 256 addressable cells. Compression folds an ordered list of
 * body records into those cells; expansion restores every record, in its
 * original order, with its raw status preserved. Nothing is truncated: a
 * body that needs more than 256 cells is refused, never silently reduced.
 *
 * Evidence boundary. `VERIFIED` from this module means one local round trip
 * matched: compress → expand returned the same records and the same digest.
 * It is a statement about this representation only. It does not prove
 * deployment, external availability, or any real-world outcome.
 */
import { createHash } from 'node:crypto';

export const SINGLE_BODY_NOTATION = '4×4×4×4';
export const SINGLE_BODY_RANK = 4;
export const SINGLE_BODY_SHAPE = Object.freeze([4, 4, 4, 4] as const);
export const SINGLE_BODY_CAPACITY = 256;

export const SINGLE_BODY_AXES = Object.freeze({
  layer: Object.freeze(['reality', 'system', 'evidence', 'authority'] as const),
  organ: Object.freeze(['sense', 'verify', 'remember', 'express'] as const),
  form: Object.freeze(['runtime', 'contract', 'intent', 'boundary'] as const),
  evidence: Object.freeze(['VERIFIED', 'SUPPORTED', 'UNVERIFIED', 'UNKNOWN'] as const),
});

export type SingleBodyAxis = keyof typeof SINGLE_BODY_AXES;
export type SingleBodyLayer = (typeof SINGLE_BODY_AXES)['layer'][number];
export type SingleBodyOrgan = (typeof SINGLE_BODY_AXES)['organ'][number];
export type SingleBodyForm = (typeof SINGLE_BODY_AXES)['form'][number];
export type SingleBodyEvidence = (typeof SINGLE_BODY_AXES)['evidence'][number];

export type SingleBodyAddress = readonly [number, number, number, number];

export interface SingleBodyEntry {
  readonly id: string;
  readonly name: string;
  readonly source: string;
  /** Raw record status, preserved verbatim through the round trip. */
  readonly status: string;
  readonly layer: SingleBodyLayer;
  readonly organ: SingleBodyOrgan;
  readonly form: SingleBodyForm;
  readonly evidence: SingleBodyEvidence;
}

export interface SingleBodySpace {
  readonly notation: string;
  readonly rank: number;
  readonly shape: readonly number[];
  readonly capacity: number;
}

export interface SingleBodyCellEntry {
  /** Original position in the body, preserved so expansion restores order. */
  readonly index: number;
  readonly id: string;
  readonly name: string;
  readonly source: string;
  readonly status: string;
}

export interface SingleBodyCell {
  readonly address: SingleBodyAddress;
  readonly key: string;
  readonly entries: readonly SingleBodyCellEntry[];
  readonly digest: string;
}

export interface CompressedSingleBody {
  readonly space: SingleBodySpace;
  readonly count: number;
  readonly filled: number;
  readonly empty: number;
  readonly cells: readonly SingleBodyCell[];
  readonly digest: string;
  readonly evidence: 'LOCAL_REPRESENTATION';
}

export type SingleBodyIssueCode =
  | 'INVALID_BODY_INPUT'
  | 'ENTRY_NOT_OBJECT'
  | 'UNSUPPORTED_ENTRY_FIELD'
  | 'INVALID_ENTRY_ID'
  | 'DUPLICATE_ENTRY_ID'
  | 'INVALID_ENTRY_TEXT'
  | 'UNKNOWN_COORDINATE'
  | 'BODY_OVER_CAPACITY'
  | 'INVALID_COMPRESSED_BODY'
  | 'DIGEST_MISMATCH'
  | 'BODY_INSPECTION_FAILED';

export interface SingleBodyIssue {
  readonly code: SingleBodyIssueCode;
  readonly field: string;
  readonly message: string;
}

export type SingleBodyCompression =
  | {
      readonly status: 'COMPRESSED';
      readonly body: CompressedSingleBody;
      readonly issues: readonly [];
    }
  | {
      readonly status: 'INVALID';
      readonly body: null;
      readonly issues: readonly SingleBodyIssue[];
    };

export type SingleBodyExpansion =
  | {
      readonly status: 'EXPANDED';
      readonly entries: readonly SingleBodyEntry[];
      readonly bodyDigest: string;
      readonly digestMatches: true;
      readonly evidence: 'LOCAL_ROUND_TRIP_ONLY';
      readonly issues: readonly [];
    }
  | {
      readonly status: 'INVALID';
      readonly entries: readonly [];
      readonly bodyDigest: null;
      readonly digestMatches: false;
      readonly evidence: 'LOCAL_ROUND_TRIP_ONLY';
      readonly issues: readonly SingleBodyIssue[];
    };

export type SingleBodyRoundTrip =
  | {
      readonly status: 'VERIFIED';
      readonly entries: number;
      readonly filled: number;
      readonly digest: string;
      readonly lossless: true;
      readonly evidence: 'LOCAL_ROUND_TRIP_ONLY';
      readonly issues: readonly [];
    }
  | {
      readonly status: 'DIVERGENT';
      readonly entries: number;
      readonly filled: number;
      readonly digest: string | null;
      readonly lossless: false;
      readonly evidence: 'LOCAL_ROUND_TRIP_ONLY';
      readonly mismatches: readonly string[];
      readonly issues: readonly SingleBodyIssue[];
    }
  | {
      readonly status: 'INVALID';
      readonly entries: number;
      readonly filled: number;
      readonly digest: null;
      readonly lossless: false;
      readonly evidence: 'LOCAL_ROUND_TRIP_ONLY';
      readonly issues: readonly SingleBodyIssue[];
    };

const AXIS_ORDER = ['layer', 'organ', 'form', 'evidence'] as const;
const ENTRY_FIELDS = new Set(['id', 'name', 'source', 'status', 'layer', 'organ', 'form', 'evidence']);
const ENTRY_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const MAX_ENTRY_TEXT = 512;

const axisValues = (axis: SingleBodyAxis): readonly string[] => SINGLE_BODY_AXES[axis];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const canonical = (value: unknown): string => JSON.stringify(value);

const sha256 = (value: string): string =>
  createHash('sha256').update(value, 'utf8').digest('hex');

const invalid = (issues: readonly SingleBodyIssue[]): { status: 'INVALID'; issues: readonly SingleBodyIssue[] } => ({
  status: 'INVALID',
  issues: Object.freeze([...issues]),
});

const addressFromCoordinates = (entry: SingleBodyEntry): SingleBodyAddress =>
  AXIS_ORDER.map((axis) => axisValues(axis).indexOf(entry[axis])) as unknown as SingleBodyAddress;

const keyFromAddress = (address: SingleBodyAddress): string =>
  address.map((index, axis) => axisValues(AXIS_ORDER[axis])[index]).join('/');

const coordinateFromAddress = (address: SingleBodyAddress, axis: SingleBodyAxis): string =>
  axisValues(axis)[address[AXIS_ORDER.indexOf(axis)]];

const entryFromCell = (address: SingleBodyAddress, entry: SingleBodyCellEntry): SingleBodyEntry => ({
  id: entry.id,
  name: entry.name,
  source: entry.source,
  status: entry.status,
  layer: coordinateFromAddress(address, 'layer') as SingleBodyLayer,
  organ: coordinateFromAddress(address, 'organ') as SingleBodyOrgan,
  form: coordinateFromAddress(address, 'form') as SingleBodyForm,
  evidence: coordinateFromAddress(address, 'evidence') as SingleBodyEvidence,
});

type NormalizedEntries =
  | { readonly status: 'VALID'; readonly entries: readonly SingleBodyEntry[] }
  | { readonly status: 'INVALID'; readonly issues: readonly SingleBodyIssue[] };

function normalizeEntries(input: unknown): NormalizedEntries {
  if (!Array.isArray(input)) {
    return invalid([{ code: 'INVALID_BODY_INPUT', field: '$', message: 'body entries must be an array' }]);
  }
  if (input.length > SINGLE_BODY_CAPACITY) {
    return invalid([
      {
        code: 'BODY_OVER_CAPACITY',
        field: '$',
        message: `body holds ${input.length} records; the 4×4×4×4 space addresses ${SINGLE_BODY_CAPACITY}`,
      },
    ]);
  }

  const issues: SingleBodyIssue[] = [];
  const ids = new Set<string>();
  const entries: SingleBodyEntry[] = [];

  input.forEach((candidate, index) => {
    const field = `[${index}]`;
    if (!isRecord(candidate)) {
      issues.push({ code: 'ENTRY_NOT_OBJECT', field, message: 'entry must be a non-null object' });
      return;
    }

    for (const key of Object.keys(candidate)) {
      if (!ENTRY_FIELDS.has(key)) {
        issues.push({ code: 'UNSUPPORTED_ENTRY_FIELD', field: `${field}.${key}`, message: `field ${key} is outside the single-body record contract` });
      }
    }

    const readText = (name: 'id' | 'name' | 'source' | 'status'): string => {
      const value = candidate[name];
      if (typeof value !== 'string' || value.length === 0 || value.length > MAX_ENTRY_TEXT) {
        issues.push({
          code: name === 'id' ? 'INVALID_ENTRY_ID' : 'INVALID_ENTRY_TEXT',
          field: `${field}.${name}`,
          message: `${name} must be a non-empty string of at most ${MAX_ENTRY_TEXT} characters`,
        });
        return '';
      }
      return value;
    };

    const id = readText('id');
    if (id && !ENTRY_ID_PATTERN.test(id)) {
      issues.push({ code: 'INVALID_ENTRY_ID', field: `${field}.id`, message: 'id must be 1-128 safe ASCII characters' });
    } else if (id) {
      if (ids.has(id)) {
        issues.push({ code: 'DUPLICATE_ENTRY_ID', field: `${field}.id`, message: `id ${id} appears more than once` });
      }
      ids.add(id);
    }

    const name = readText('name');
    const source = readText('source');
    const status = readText('status');

    const coordinates: Partial<Record<SingleBodyAxis, string>> = {};
    for (const axis of AXIS_ORDER) {
      const value = candidate[axis];
      if (typeof value !== 'string' || !axisValues(axis).includes(value)) {
        issues.push({
          code: 'UNKNOWN_COORDINATE',
          field: `${field}.${axis}`,
          message: `${axis} must be one of ${axisValues(axis).join(' | ')}`,
        });
        continue;
      }
      coordinates[axis] = value;
    }

    if (
      id && name && source && status &&
      coordinates.layer && coordinates.organ && coordinates.form && coordinates.evidence
    ) {
      entries.push({
        id,
        name,
        source,
        status,
        layer: coordinates.layer as SingleBodyLayer,
        organ: coordinates.organ as SingleBodyOrgan,
        form: coordinates.form as SingleBodyForm,
        evidence: coordinates.evidence as SingleBodyEvidence,
      });
    }
  });

  if (issues.length) return invalid(issues);
  return { status: 'VALID', entries: Object.freeze(entries) };
}

const SINGLE_BODY_SPACE: SingleBodySpace = Object.freeze({
  notation: SINGLE_BODY_NOTATION,
  rank: SINGLE_BODY_RANK,
  shape: SINGLE_BODY_SHAPE,
  capacity: SINGLE_BODY_CAPACITY,
});

export function compressSingleBody(input: unknown): SingleBodyCompression {
  const normalized = normalizeEntries(input);
  if (normalized.status === 'INVALID') {
    return { status: 'INVALID', body: null, issues: normalized.issues };
  }

  const cells = new Map<string, { address: SingleBodyAddress; entries: SingleBodyCellEntry[] }>();
  normalized.entries.forEach((entry, index) => {
    const address = addressFromCoordinates(entry);
    const key = keyFromAddress(address);
    const cell = cells.get(key) ?? { address, entries: [] };
    cell.entries.push(Object.freeze({ index, id: entry.id, name: entry.name, source: entry.source, status: entry.status }));
    cells.set(key, cell);
  });

  const sorted = [...cells.values()].sort((left, right) => {
    for (let axis = 0; axis < SINGLE_BODY_RANK; axis += 1) {
      if (left.address[axis] !== right.address[axis]) return left.address[axis] - right.address[axis];
    }
    return 0;
  });

  const bodyCells: SingleBodyCell[] = sorted.map((cell) => {
    const key = keyFromAddress(cell.address);
    const entries = Object.freeze(cell.entries);
    return Object.freeze({
      address: Object.freeze([...cell.address]) as SingleBodyAddress,
      key,
      entries,
      digest: sha256(canonical({ key, entries })),
    });
  });

  const body: CompressedSingleBody = Object.freeze({
    space: SINGLE_BODY_SPACE,
    count: normalized.entries.length,
    filled: bodyCells.length,
    empty: SINGLE_BODY_CAPACITY - bodyCells.length,
    cells: Object.freeze(bodyCells),
    digest: sha256(canonical(bodyCells.map(({ address, key, entries }) => ({ address, key, entries })))),
    evidence: 'LOCAL_REPRESENTATION',
  });

  return { status: 'COMPRESSED', body, issues: Object.freeze([]) };
}

function readAddress(value: unknown): SingleBodyAddress | null {
  if (!Array.isArray(value) || value.length !== SINGLE_BODY_RANK) return null;
  const digits: number[] = [];
  for (const candidate of value) {
    if (typeof candidate !== 'number' || !Number.isInteger(candidate) || candidate < 0 || candidate >= 4) return null;
    digits.push(candidate);
  }
  return Object.freeze(digits) as unknown as SingleBodyAddress;
}

export function expandSingleBody(input: unknown): SingleBodyExpansion {
  if (!isRecord(input)) {
    return { status: 'INVALID', entries: [], bodyDigest: null, digestMatches: false, evidence: 'LOCAL_ROUND_TRIP_ONLY', issues: [{ code: 'INVALID_COMPRESSED_BODY', field: '$', message: 'compressed body must be a non-null object' }] };
  }

  const issues: SingleBodyIssue[] = [];
  const space = input.space;
  const cells = input.cells;

  if (
    !isRecord(space) ||
    space.notation !== SINGLE_BODY_NOTATION ||
    space.rank !== SINGLE_BODY_RANK ||
    space.capacity !== SINGLE_BODY_CAPACITY ||
    !Array.isArray(space.shape) ||
    space.shape.length !== SINGLE_BODY_RANK ||
    space.shape.some((digit, axis) => digit !== SINGLE_BODY_SHAPE[axis])
  ) {
    issues.push({ code: 'INVALID_COMPRESSED_BODY', field: '$.space', message: `space must declare ${SINGLE_BODY_NOTATION} with capacity ${SINGLE_BODY_CAPACITY}` });
  }
  if (!Array.isArray(cells) || cells.length > SINGLE_BODY_CAPACITY) {
    issues.push({ code: 'INVALID_COMPRESSED_BODY', field: '$.cells', message: `cells must be an array of at most ${SINGLE_BODY_CAPACITY} occupied cells` });
  }
  if (issues.length) return { status: 'INVALID', entries: [], bodyDigest: null, digestMatches: false, evidence: 'LOCAL_ROUND_TRIP_ONLY', issues: Object.freeze(issues) };

  const addresses = new Set<string>();
  const ids = new Set<string>();
  const indexed: Array<{ index: number; address: SingleBodyAddress; entry: SingleBodyCellEntry }> = [];
  const rebuiltCells: Array<{ address: SingleBodyAddress; key: string; entries: readonly SingleBodyCellEntry[] }> = [];

  (cells as unknown[]).forEach((candidate, cellIndex) => {
    const field = `$.cells[${cellIndex}]`;
    if (!isRecord(candidate)) {
      issues.push({ code: 'INVALID_COMPRESSED_BODY', field, message: 'cell must be a non-null object' });
      return;
    }
    const address = readAddress(candidate.address);
    if (!address) {
      issues.push({ code: 'INVALID_COMPRESSED_BODY', field: `${field}.address`, message: 'address must be four integers in 0..3' });
      return;
    }
    const key = keyFromAddress(address);
    if (candidate.key !== undefined && candidate.key !== key) {
      issues.push({ code: 'INVALID_COMPRESSED_BODY', field: `${field}.key`, message: `key does not match its address (${key})` });
      return;
    }
    if (addresses.has(key)) {
      issues.push({ code: 'INVALID_COMPRESSED_BODY', field: `${field}.address`, message: `address ${key} appears more than once` });
      return;
    }
    addresses.add(key);

    if (!Array.isArray(candidate.entries) || candidate.entries.length === 0) {
      issues.push({ code: 'INVALID_COMPRESSED_BODY', field: `${field}.entries`, message: 'cell must hold at least one entry' });
      return;
    }

    const cellEntries: SingleBodyCellEntry[] = [];
    (candidate.entries as unknown[]).forEach((rawEntry, entryIndex) => {
      const entryField = `${field}.entries[${entryIndex}]`;
      if (!isRecord(rawEntry)) {
        issues.push({ code: 'INVALID_COMPRESSED_BODY', field: entryField, message: 'entry must be a non-null object' });
        return;
      }
      const index = rawEntry.index;
      const id = rawEntry.id;
      const name = rawEntry.name;
      const source = rawEntry.source;
      const status = rawEntry.status;
      if (typeof index !== 'number' || !Number.isInteger(index) || index < 0) {
        issues.push({ code: 'INVALID_COMPRESSED_BODY', field: `${entryField}.index`, message: 'index must be a non-negative integer' });
        return;
      }
      if (typeof id !== 'string' || !ENTRY_ID_PATTERN.test(id)) {
        issues.push({ code: 'INVALID_COMPRESSED_BODY', field: `${entryField}.id`, message: 'id must be 1-128 safe ASCII characters' });
        return;
      }
      if (ids.has(id)) {
        issues.push({ code: 'INVALID_COMPRESSED_BODY', field: `${entryField}.id`, message: `id ${id} appears more than once` });
        return;
      }
      ids.add(id);
      if (
        typeof name !== 'string' || name.length === 0 || name.length > MAX_ENTRY_TEXT ||
        typeof source !== 'string' || source.length === 0 || source.length > MAX_ENTRY_TEXT ||
        typeof status !== 'string' || status.length === 0 || status.length > MAX_ENTRY_TEXT
      ) {
        issues.push({ code: 'INVALID_COMPRESSED_BODY', field: entryField, message: 'entry text fields must be non-empty strings' });
        return;
      }

      const entry = Object.freeze({ index, id, name, source, status });
      cellEntries.push(entry);
      indexed.push({ index, address, entry });
    });

    cellEntries.sort((left, right) => left.index - right.index);
    rebuiltCells.push({ address, key, entries: Object.freeze(cellEntries) });

    const expectedDigest = sha256(canonical({ key, entries: cellEntries }));
    if (typeof candidate.digest !== 'string' || candidate.digest !== expectedDigest) {
      issues.push({ code: 'DIGEST_MISMATCH', field: `${field}.digest`, message: 'cell digest does not match its contents' });
    }
  });

  if (issues.length) return { status: 'INVALID', entries: [], bodyDigest: null, digestMatches: false, evidence: 'LOCAL_ROUND_TRIP_ONLY', issues: Object.freeze(issues) };

  indexed.sort((left, right) => left.index - right.index);
  const contiguous = indexed.every((item, position) => item.index === position);
  if (!contiguous) {
    return {
      status: 'INVALID',
      entries: [],
      bodyDigest: null,
      digestMatches: false,
      evidence: 'LOCAL_ROUND_TRIP_ONLY',
      issues: [{ code: 'INVALID_COMPRESSED_BODY', field: '$.cells', message: 'entry indexes must be contiguous from 0 so expansion preserves order' }],
    };
  }

  const expectedBodyDigest = sha256(canonical(rebuiltCells.map(({ address, key, entries }) => ({ address, key, entries }))));
  if (typeof input.digest !== 'string' || input.digest !== expectedBodyDigest) {
    return {
      status: 'INVALID',
      entries: [],
      bodyDigest: null,
      digestMatches: false,
      evidence: 'LOCAL_ROUND_TRIP_ONLY',
      issues: [{ code: 'DIGEST_MISMATCH', field: '$.digest', message: 'body digest does not match its contents' }],
    };
  }

  return {
    status: 'EXPANDED',
    entries: Object.freeze(indexed.map(({ address, entry }) => entryFromCell(address, entry))),
    bodyDigest: expectedBodyDigest,
    digestMatches: true,
    evidence: 'LOCAL_ROUND_TRIP_ONLY',
    issues: Object.freeze([]),
  };
}

export function verifySingleBodyRoundTrip(input: unknown): SingleBodyRoundTrip {
  const compression = compressSingleBody(input);
  if (compression.status !== 'COMPRESSED') {
    return {
      status: 'INVALID',
      entries: 0,
      filled: 0,
      digest: null,
      lossless: false,
      evidence: 'LOCAL_ROUND_TRIP_ONLY',
      issues: compression.issues,
    };
  }

  const expansion = expandSingleBody(compression.body);
  if (expansion.status !== 'EXPANDED' || expansion.bodyDigest !== compression.body.digest) {
    return {
      status: 'DIVERGENT',
      entries: compression.body.count,
      filled: compression.body.filled,
      digest: compression.body.digest,
      lossless: false,
      evidence: 'LOCAL_ROUND_TRIP_ONLY',
      mismatches: ['body-digest'],
      issues: expansion.status === 'INVALID' ? expansion.issues : Object.freeze([]),
    };
  }

  const normalized = normalizeEntries(input);
  const expected = normalized.status === 'VALID' ? canonical(normalized.entries) : '';
  const actual = canonical(expansion.entries);
  if (expected !== actual) {
    return {
      status: 'DIVERGENT',
      entries: compression.body.count,
      filled: compression.body.filled,
      digest: compression.body.digest,
      lossless: false,
      evidence: 'LOCAL_ROUND_TRIP_ONLY',
      mismatches: ['entry-order-or-content'],
      issues: Object.freeze([]),
    };
  }

  return {
    status: 'VERIFIED',
    entries: expansion.entries.length,
    filled: compression.body.filled,
    digest: compression.body.digest,
    lossless: true,
    evidence: 'LOCAL_ROUND_TRIP_ONLY',
    issues: Object.freeze([]),
  };
}
