import { createHmac, createHash } from 'node:crypto';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export const KAI_TENSOR_SIZES = [4, 6, 8] as const;
export type KaiTensorSize = (typeof KAI_TENSOR_SIZES)[number];
export type KaiTensorStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN';

export type KaiTensorCandidate = {
  success?: boolean;
  status?: string;
  size: number;
  values: unknown;
  invariants?: { checksum?: unknown };
  [key: string]: unknown;
};

export type KaiReceipt = {
  timestamp: string;
  n: KaiTensorSize;
  checksum: number;
  status: 'VERIFIED';
  hash: string;
};

export type VerifiedKaiTensor = {
  status: 'VERIFIED';
  size: KaiTensorSize;
  values: number[][];
  checksum: number;
  sha256: string;
  receipt: KaiReceipt;
};

export class KaiDivergenceError extends Error {
  readonly code = 'DIVERGENT';
  readonly issues: string[];
  constructor(issues: string[]) {
    super(issues.join('; '));
    this.name = 'KaiDivergenceError';
    this.issues = issues;
  }
}

export class KaiUnknownError extends Error {
  readonly code = 'UNKNOWN';
  constructor(message: string) {
    super(message);
    this.name = 'KaiUnknownError';
  }
}

export type KaiShieldOptions = {
  ledgerPath?: string;
  secret?: string;
  now?: () => string;
};

export function isKaiTensorSize(value: unknown): value is KaiTensorSize {
  return typeof value === 'number' && Number.isInteger(value) && KAI_TENSOR_SIZES.includes(value as KaiTensorSize);
}

export function expectedKaiChecksum(n: KaiTensorSize): number {
  return 2 * (n ** 4) * (n - 1);
}

function expectedCell(n: KaiTensorSize, row: number, column: number): number {
  const i = Math.floor(row / n);
  const j = row % n;
  const k = Math.floor(column / n);
  const l = column % n;
  return i + j + k + l;
}

function defaultLedgerPath(): string {
  return process.env.KAI_LEDGER_PATH || resolve(process.cwd(), 'kai_ledger.json');
}

function receiptMessage(receipt: Omit<KaiReceipt, 'hash'>): string {
  return JSON.stringify([receipt.timestamp, receipt.n, receipt.checksum, receipt.status]);
}

function appendReceipt(path: string, receipt: KaiReceipt): void {
  const directory = dirname(path);
  if (!existsSync(directory)) throw new KaiUnknownError(`ledger directory does not exist: ${directory}`);
  let ledger: Record<string, unknown> = { protocol: 'DVRO-HOUSE/1', append_only: true, entries: [] };
  if (existsSync(path)) {
    try {
      const parsed = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('ledger root must be an object');
      ledger = parsed;
    } catch (error) {
      throw new KaiUnknownError(`ledger is unreadable: ${error instanceof Error ? error.message : 'invalid JSON'}`);
    }
  }
  const entries = Array.isArray(ledger.entries) ? ledger.entries : [];
  const entry = {
    timestamp: receipt.timestamp,
    agent_id: 'kai-shield',
    branch: process.env.GIT_BRANCH || 'agent/manus/dvro-house-full-stack',
    status: receipt.status,
    files_touched: ['companion/python/main.py', 'packages/verification/src/kaiShield.ts', 'apps/api/src/routes/tensor.ts', 'kai_ledger.json'],
    tests_passed: true,
    evidence_hash: receipt.hash,
    next_delta: `DVRO receipt: n=${receipt.n} checksum=${receipt.checksum} status=${receipt.status} hash=${receipt.hash}. Human-review the attested tensor; it is not deployment or physical-world proof.`,
  };
  const next = { ...ledger, append_only: true, entries: [...entries, entry] };
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  renameSync(temporary, path);
}

export function verifyAndAttestDav(candidate: KaiTensorCandidate, options: KaiShieldOptions = {}): VerifiedKaiTensor {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw new KaiDivergenceError(['companion payload must be an object']);
  }
  const n = candidate.size;
  if (!isKaiTensorSize(n)) throw new KaiDivergenceError(['unsupported tensor size']);
  const values = candidate.values;
  const issues: string[] = [];
  const expectedChecksum = expectedKaiChecksum(n);
  let actualChecksum = 0;
  if (!Array.isArray(values) || values.length !== n * n) {
    issues.push(`matrix must have ${n * n} rows`);
  } else {
    for (let row = 0; row < n * n; row += 1) {
      const cells = values[row];
      if (!Array.isArray(cells) || cells.length !== n * n) {
        issues.push(`matrix row ${row} must have ${n * n} columns`);
        continue;
      }
      for (let column = 0; column < n * n; column += 1) {
        const observed = cells[column];
        const expected = expectedCell(n, row, column);
        if (typeof observed !== 'number' || !Number.isInteger(observed)) {
          issues.push(`matrix cell ${row},${column} is not an integer`);
        } else {
          actualChecksum += observed;
          if (observed !== expected) issues.push(`matrix cell ${row},${column} diverges`);
        }
      }
    }
  }
  if (actualChecksum !== expectedChecksum) issues.push(`checksum mismatch: expected ${expectedChecksum}, observed ${actualChecksum}`);
  if (candidate.invariants?.checksum !== expectedChecksum) issues.push('companion checksum invariant mismatch');
  if (issues.length > 0) throw new KaiDivergenceError([...new Set(issues)]);

  const verifiedValues = values as number[][];
  const canonical = JSON.stringify({ n, checksum: actualChecksum, values: verifiedValues });
  const sha256 = createHash('sha256').update(canonical, 'utf8').digest('hex');
  const unsigned: Omit<KaiReceipt, 'hash'> = {
    timestamp: (options.now || (() => new Date().toISOString()))(),
    n,
    checksum: actualChecksum,
    status: 'VERIFIED',
  };
  const secret = options.secret || process.env.KAI_RECEIPT_SECRET || 'dvro-house-local-attestation-secret';
  const receipt: KaiReceipt = { ...unsigned, hash: createHmac('sha256', secret).update(receiptMessage(unsigned), 'utf8').digest('hex') };
  appendReceipt(options.ledgerPath || defaultLedgerPath(), receipt);
  return { status: 'VERIFIED', size: n, values: verifiedValues, checksum: actualChecksum, sha256, receipt };
}
