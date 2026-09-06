/**
 * Four branches in persistence.ts follow the same shape:
 *
 *   reason: error instanceof Error ? error.message : '<generic fallback>'
 *
 * They exist so that a real failure (disk unavailable, permission denied, a
 * wrong decryption key) surfaces its own specific message instead of a
 * generic one. Under a genuine failure driven directly through Node's
 * built-in fs and crypto modules, that "specific message" side never runs
 * while the suite executes under Jest, even though the exact same failure
 * driven the exact same way through a plain Node process (no Jest) does take
 * it, confirmed directly with a standalone script run via `npx tsx` outside
 * Jest, which reported the crypto module's own message verbatim.
 *
 * The reason is a real, reproducible Jest/Node interaction, not a flaw in
 * persistence.ts: Jest's default 'node' test environment runs each test file
 * inside its own vm context, so the file's own `Error` is a different
 * constructor from the one Node's internal fs/crypto bindings use to build
 * their errors. `new Error('x') instanceof Error` is true inside that
 * context; an Error thrown by `fs.readFileSync` or `decipher.setAuthTag`
 * for a genuine failure, invoked from the very same context, is not. This
 * was confirmed empirically: the constructors are unequal even though both
 * report `.constructor.name === 'Error'` and print with a normal stack.
 * (persistence.ts's own decryptText and the JSON.parse catch it also uses
 * are unaffected, because both throw Errors built locally with `new
 * Error(...)`, in the same realm as the code that later checks
 * `instanceof Error` on them; only errors that cross the fs/crypto binding
 * boundary are affected.)
 *
 * These tests close the four branches this affects (persistence.ts's
 * loadSnapshot read failure, appendEvent append failure, readEventLog read
 * failure, and decryptText's final rethrow) by making the same fs/crypto
 * call throw an Error built locally, with `new Error(...)`, from this test
 * file. That Error is real, and it now shares a realm with the
 * `instanceof Error` check inside persistence.ts (both run inside this
 * file's own Jest vm context), so it exercises exactly the code path a
 * single, non-sandboxed Node process takes on a genuine failure. Every
 * other export of 'node:fs' and 'node:crypto' is left untouched (delegated
 * to the real implementation), so this file's own fixture setup, and every
 * other test file in the suite, is unaffected.
 */
jest.mock('node:fs', () => {
  const actual = jest.requireActual('node:fs');
  return {
    ...actual,
    readFileSync: jest.fn(actual.readFileSync),
    appendFileSync: jest.fn(actual.appendFileSync),
  };
});

jest.mock('node:crypto', () => {
  const actual = jest.requireActual('node:crypto');
  return {
    ...actual,
    createDecipheriv: jest.fn(actual.createDecipheriv),
  };
});

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync, appendFileSync } from 'node:fs';
import { createDecipheriv } from 'node:crypto';
import {
  appendEvent,
  emptySnapshot,
  loadSnapshot,
  readEventLog,
  saveSnapshot,
} from '../persistence';

const actualFs = jest.requireActual('node:fs') as typeof import('node:fs');
const actualCrypto = jest.requireActual('node:crypto') as typeof import('node:crypto');

describe('persistence error messages across the Jest/Node realm boundary', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'omega-persistence-realm-'));
  });

  afterEach(() => {
    (readFileSync as jest.Mock).mockImplementation(actualFs.readFileSync);
    (appendFileSync as jest.Mock).mockImplementation(actualFs.appendFileSync);
    (createDecipheriv as jest.Mock).mockImplementation(actualCrypto.createDecipheriv);
  });

  it('loadSnapshot surfaces the real read-failure message when it is a same-realm Error', () => {
    const storePath = join(dir, 'runtime.json');
    (readFileSync as jest.Mock).mockImplementation((path: unknown, ...rest: unknown[]) => {
      if (path === storePath) {
        throw new Error('mocked read failure: disk unavailable');
      }
      return (actualFs.readFileSync as (...a: unknown[]) => unknown)(path, ...rest);
    });

    const result = loadSnapshot(storePath, true);

    expect(result.source).toBe('missing');
    expect(result.reason).toBe('mocked read failure: disk unavailable');
  });

  it('appendEvent surfaces the real append-failure message when it is a same-realm Error', () => {
    const logPath = join(dir, 'runtime.log.jsonl');
    (appendFileSync as jest.Mock).mockImplementation(() => {
      throw new Error('mocked append failure: disk full');
    });

    const result = appendEvent(logPath, { id: 'evt-1' }, true);

    expect(result).toEqual({ appended: false, reason: 'mocked append failure: disk full' });
  });

  it('readEventLog surfaces the real read-failure message when it is a same-realm Error', () => {
    const logPath = join(dir, 'runtime.log.jsonl');
    (readFileSync as jest.Mock).mockImplementation((path: unknown, ...rest: unknown[]) => {
      if (path === logPath) {
        throw new Error('mocked read failure: permission denied');
      }
      return (actualFs.readFileSync as (...a: unknown[]) => unknown)(path, ...rest);
    });

    const result = readEventLog(logPath, true);

    expect(result.source).toBe('missing');
    expect(result.reason).toBe('mocked read failure: permission denied');
  });

  it('loadSnapshot rethrows the real decryption-failure message when it is a same-realm Error', () => {
    const storePath = join(dir, 'runtime.json');
    saveSnapshot(storePath, emptySnapshot(), true, 'correct-secret');

    (createDecipheriv as jest.Mock).mockImplementation(() => ({
      setAuthTag: () => {
        throw new Error('mocked authentication failure: tag mismatch');
      },
    }));

    const result = loadSnapshot(storePath, true, 'current-secret', 'previous-secret');

    expect(result.source).toBe('corrupt');
    expect(result.reason).toBe('mocked authentication failure: tag mismatch');
  });
});
