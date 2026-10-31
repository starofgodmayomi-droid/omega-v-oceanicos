// Jest/Vitest → node:test compatibility runtime.
//
// Loaded by `node --test --import ./tests/compat/register.mjs` so that the
// stale `.test.ts` files authored for Jest (implicit globals) / `@jest/globals`
// / `vitest` run UNMODIFIED under the Node test runner. The resolve hook in
// resolve-hook.mjs redirects `vitest` and `@jest/globals` to this module.
//
// Covers the matcher/jest surface actually used in this repo:
// toBe, toEqual, toStrictEqual, toContain, toMatch, toThrow, toHaveLength,
// toBeNull, toBeDefined, toBeUndefined, toBeTruthy, toBeFalsy, toBeGreaterThan,
// toBeGreaterThanOrEqual, toBeLessThan, toBeLessThanOrEqual, toBeInstanceOf,
// toBeNaN, toMatchObject, toHaveProperty, it.each, jest.fn (+ mock*), and `.not`.

import { describe as _describe, it as _it, test as _test, before, after, beforeEach as _beforeEach, afterEach as _afterEach } from 'node:test';
import { inspect } from 'node:util';

// --- node:test wrappers with `.each` support -------------------------------

function withEach(original) {
  const fn = (name, testFn, options) => original(name, testFn, options);
  fn.each = (table) => (name, testFn) => {
    const rows = normalizeTable(table);
    for (const row of rows) {
      original(formatEachLabel(name, row), () => testFn(...row));
    }
    return fn;
  };
  fn.only = original.only ? (name, testFn, options) => original.only(name, testFn, options) : fn;
  fn.skip = (name, testFn, options) => original.skip(name, testFn, options);
  fn.todo = (name) => original.todo(name);
  return fn;
}

function normalizeTable(table) {
  if (!Array.isArray(table)) return [[table]];
  if (table.length === 0) return [];
  if (Array.isArray(table[0])) return table;
  return table.map((r) => [r]);
}

function formatEachLabel(name, row) {
  if (row.length === 1 && row[0] && typeof row[0] === 'object' && !Array.isArray(row[0])) {
    return name.replace(/\$([A-Za-z_$][\w$]*)/g, (_, k) => String(row[0][k] ?? ''));
  }
  let i = 0;
  return name.replace(/%[sdifjo%]/g, (m) => {
    if (m === '%%') return '%';
    const v = row[i++];
    if (m === '%j' || m === '%o') {
      try { return JSON.stringify(v); } catch { return inspect(v); }
    }
    return String(v);
  });
}

const describe = withEach(_describe);
const it = withEach(_it);
const test = withEach(_test);
const beforeAll = before;
const afterAll = after;
const beforeEach = _beforeEach;
const afterEach = _afterEach;

// --- equality helpers ------------------------------------------------------

function isPrimitive(v) {
  return v === null || (typeof v !== 'object' && typeof v !== 'function');
}

function deepEqual(a, b, strict) {
  if (Object.is(a, b)) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (a instanceof RegExp && b instanceof RegExp) return a.source === b.source && a.flags === b.flags;
  if (isPrimitive(a) || isPrimitive(b)) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i], strict)) return false;
    return true;
  }
  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false;
    for (const v of a) { let ok = false; for (const w of b) if (deepEqual(v, w, strict)) { ok = true; break; } if (!ok) return false; }
    return true;
  }
  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [k, v] of a) { if (!b.has(k) || !deepEqual(v, b.get(k), strict)) return false; }
    return true;
  }
  const aKeys = Reflect.ownKeys(a).filter((k) => !strict || a[k] !== undefined);
  const bKeys = Reflect.ownKeys(b).filter((k) => !strict || b[k] !== undefined);
  if (strict && aKeys.length !== bKeys.length) return false;
  for (const k of bKeys) {
    if (!(k in a)) return false;
    if (!deepEqual(a[k], b[k], strict)) return false;
  }
  return true;
}

function matchObject(actual, expected) {
  if (expected == null) return Object.is(actual, expected);
  if (isPrimitive(expected)) return Object.is(actual, expected);
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length < expected.length) return false;
    return expected.every((e, i) => matchObject(actual[i], e));
  }
  if (expected instanceof RegExp) return typeof actual === 'string' && expected.test(actual);
  if (expected instanceof Date) return actual instanceof Date && expected.getTime() === actual.getTime();
  if (typeof expected === 'object' && typeof actual !== 'object') return actual == null ? false : false;
  if (actual == null) return false;
  for (const k of Object.keys(expected)) {
    if (!(k in actual)) return false;
    if (!matchObject(actual[k], expected[k])) return false;
  }
  return true;
}

function contains(haystack, needle) {
  if (typeof haystack === 'string') return haystack.includes(String(needle));
  if (Array.isArray(haystack)) {
    if (haystack.length === 0) return false;
    return haystack.some((v) => deepEqual(v, needle, false));
  }
  if (haystack && typeof haystack === 'object' && needle && typeof needle === 'object') {
    return matchObject(haystack, needle);
  }
  if (haystack && typeof haystack === 'object') {
    return Object.values(haystack).some((v) => deepEqual(v, needle, false));
  }
  return false;
}

// --- expect ----------------------------------------------------------------

function fail(msg) { throw new Error(msg); }

function makeExpectation(actual, negate = false) {
  const apply = (ok, message) => {
    const passed = negate ? !ok : ok;
    if (!passed) {
      const [exp, act] = negate ? ['NOT ' + message, ''] : message.split(' || ');
      fail(`expect${negate ? '.not' : ''}(${inspect(actual, { depth: 4 })}) ${message}`);
    }
  };
  const api = {
    toBe(expected) { apply(Object.is(actual, expected), `toBe(${inspect(expected)})`); return api; },
    toEqual(expected) { apply(deepEqual(actual, expected, false), `toEqual(${inspect(expected)})`); return api; },
    toStrictEqual(expected) { apply(deepEqual(actual, expected, true), `toStrictEqual(${inspect(expected)})`); return api; },
    toStrictEqual2(expected) { return api.toStrictEqual(expected); },
    toContain(expected) { apply(contains(actual, expected), `toContain(${inspect(expected)})`); return api; },
    toMatch(expected) {
      if (expected instanceof RegExp) apply(expected.test(String(actual)), `toMatch(${expected})`);
      else apply(String(actual).includes(String(expected)), `toMatch(${inspect(expected)})`);
      return api;
    },
    toHaveLength(expected) { apply(actual != null && actual.length === expected, `toHaveLength(${expected}) (got ${actual == null ? null : actual.length})`); return api; },
    toBeNull() { apply(actual === null, `toBeNull (got ${inspect(actual)})`); return api; },
    toBeDefined() { apply(actual !== undefined, `toBeDefined (got undefined)`); return api; },
    toBeUndefined() { apply(actual === undefined, `toBeUndefined (got ${inspect(actual)})`); return api; },
    toBeTruthy() { apply(!!actual, `toBeTruthy (got ${inspect(actual)})`); return api; },
    toBeFalsy() { apply(!actual, `toBeFalsy (got ${inspect(actual)})`); return api; },
    toBeNaN() { apply(Number.isNaN(actual), `toBeNaN (got ${inspect(actual)})`); return api; },
    toBeGreaterThan(expected) { apply(actual > expected, `toBeGreaterThan(${expected}) (got ${actual})`); return api; },
    toBeGreaterThanOrEqual(expected) { apply(actual >= expected, `toBeGreaterThanOrEqual(${expected}) (got ${actual})`); return api; },
    toBeLessThan(expected) { apply(actual < expected, `toBeLessThan(${expected}) (got ${actual})`); return api; },
    toBeLessThanOrEqual(expected) { apply(actual <= expected, `toBeLessThanOrEqual(${expected}) (got ${actual})`); return api; },
    toBeInstanceOf(cls) { apply(actual instanceof cls, `toBeInstanceOf(${cls?.name})`); return api; },
    toBeFinite() { apply(Number.isFinite(actual), `toBeFinite (got ${actual})`); return api; },
    toMatchObject(expected) { apply(matchObject(actual, expected), `toMatchObject(${inspect(expected)})`); return api; },
    toHaveProperty(path, value) {
      const parts = Array.isArray(path) ? path : String(path).split('.');
      let cur = actual;
      let ok = true;
      for (const p of parts) { if (cur == null || !(p in cur)) { ok = false; break; } cur = cur[p]; }
      if (ok && arguments.length > 1) ok = deepEqual(cur, value, false);
      apply(ok, `toHaveProperty(${inspect(path)})`); return api;
    },
    toThrow(expected) {
      if (typeof actual !== 'function') fail(`toThrow expects a function, got ${inspect(actual)}`);
      let threw = false, err;
      try { actual(); } catch (e) { threw = true; err = e; }
      let ok = threw;
      if (threw && expected !== undefined) {
        if (expected instanceof RegExp) ok = expected.test(String(err?.message ?? err));
        else if (typeof expected === 'string') ok = String(err?.message ?? err).includes(expected);
        else if (typeof expected === 'function') ok = err instanceof expected;
        else ok = deepEqual(err, expected, false);
      }
      apply(ok, `toThrow(${expected === undefined ? '' : inspect(expected)})`); return api;
    },
    toHaveBeenCalled() { apply(actual?.mock?.calls?.length > 0, `toHaveBeenCalled`); return api; },
    toHaveBeenCalledTimes(n) { apply(actual?.mock?.calls?.length === n, `toHaveBeenCalledTimes(${n}) (got ${actual?.mock?.calls?.length})`); return api; },
    toHaveBeenCalledWith(...args) {
      const calls = actual?.mock?.calls ?? [];
      apply(calls.some((c) => deepEqual(c, args, false)), `toHaveBeenCalledWith(${inspect(args)})`); return api;
    },
    toHaveReturned() { apply((actual?.mock?.results ?? []).some((r) => r.type === 'return'), `toHaveReturned`); return api; },
    toHaveReturnedWith(value) { apply((actual?.mock?.results ?? []).some((r) => r.type === 'return' && deepEqual(r.value, value, false)), `toHaveReturnedWith(${inspect(value)})`); return api; },
    resolves: {
      async toBe(expected) { const v = await actual; if (!Object.is(v, expected)) fail(`expect.resolves.toBe(${inspect(expected)}) (got ${inspect(v)})`); },
      async toEqual(expected) { const v = await actual; if (!deepEqual(v, expected, false)) fail(`expect.resolves.toEqual(${inspect(expected)}) (got ${inspect(v)})`); },
      async toMatchObject(expected) { const v = await actual; if (!matchObject(v, expected)) fail(`expect.resolves.toMatchObject`); },
    },
    rejects: {
      async toThrow(expected) {
        let err; try { await actual; } catch (e) { err = e; }
        if (!err) fail(`expect.rejects.toThrow — promise resolved`);
        if (expected instanceof RegExp && !expected.test(String(err?.message ?? err))) fail(`rejects.toThrow regex`);
        else if (typeof expected === 'string' && !String(err?.message ?? err).includes(expected)) fail(`rejects.toThrow ${expected}`);
      },
    },
  };
  Object.defineProperty(api, 'not', { get() { return makeExpectation(actual, !negate ? true : false); } });
  return api;
}

const expectFn = Object.assign(
  function expect(actual) { return makeExpectation(actual, false); },
  {
    objectContaining: (shape) => ({ __partial: true, shape }),
    arrayContaining: (arr) => ({ __partialArr: true, arr }),
    any: (cls) => ({ __any: cls }),
    anything: () => ({ __anything: true }),
    stringContaining: (s) => s,
    stringMatching: (r) => r,
    assert: (n) => { if (!n) fail('expect.assertions'); },
    hasAssertions: () => {},
  }
);

// --- jest ------------------------------------------------------------------

function fn(impl) {
  let current = impl;
  const onceQueue = [];
  const mockFn = function (...args) {
    mockFn.mock.calls.push(args);
    let used;
    if (onceQueue.length) { used = onceQueue.shift(); }
    let result;
    try {
      const eff = used ? used : current;
      result = eff ? eff.apply(this, args) : undefined;
      mockFn.mock.results.push({ type: 'return', value: result });
    } catch (e) {
      mockFn.mock.results.push({ type: 'throw', value: e });
      throw e;
    }
    return result;
  };
  mockFn.mock = { calls: [], results: [], instances: [] };
  mockFn.mockReturnValue = (v) => { current = () => v; return mockFn; };
  mockFn.mockReturnValueOnce = (v) => { onceQueue.push(() => v); return mockFn; };
  mockFn.mockImplementation = (f) => { current = f; return mockFn; };
  mockFn.mockImplementationOnce = (f) => { onceQueue.push(f); return mockFn; };
  mockFn.mockResolvedValue = (v) => { current = async () => v; return mockFn; };
  mockFn.mockResolvedValueOnce = (v) => { onceQueue.push(async () => v); return mockFn; };
  mockFn.mockRejectedValue = (v) => { current = async () => { throw v; }; return mockFn; };
  mockFn.mockRejectedValueOnce = (v) => { onceQueue.push(async () => { throw v; }); return mockFn; };
  mockFn.mockClear = () => { mockFn.mock.calls = []; mockFn.mock.results = []; return mockFn; };
  mockFn.mockReset = () => { current = undefined; onceQueue.length = 0; return mockFn.mockClear(); };
  mockFn.getMockImplementation = () => current;
  mockFn.getMockName = () => 'jest.fn';
  return mockFn;
}

const jest = {
  fn,
  mock: () => {},                 // module mocking is not available under node:test; no-op.
  requireActual: (spec) => { throw new Error(`jest.requireActual('${spec}') is not supported under the node:test compat layer`); },
  resetModules: () => {},
  clearAllMocks: () => {},
  restoreAllMocks: () => {},
  useFakeTimers: () => {},
  useRealTimers: () => {},
  advanceTimersByTime: () => {},
  runAllTicks: () => {},
  setTimeout: () => {},
  Mock: function Mock() {},
};

const vi = {
  fn,
  mock: () => ({}),
  spyOn: (obj, key) => { const orig = obj[key]; const f = fn(orig); obj[key] = f; f.mockRestore = () => { obj[key] = orig; }; return f; },
  stubGlobal: (name, value) => { const orig = globalThis[name]; globalThis[name] = value; return () => { globalThis[name] = orig; }; },
  unstubAllGlobals: () => {},
  useFakeTimers: () => ({ advanceTimersByTime: () => {}, runAllTimers: () => {} }),
};

// --- export + inject globals ----------------------------------------------

const expect = expectFn;

export {
  describe, it, test, before, after, beforeAll, afterAll, beforeEach, afterEach,
  expect, jest, vi,
};

// Inject globals so implicit-Jest-global tests (no import) resolve them.
const globals = { describe, it, test, before, after, beforeAll, afterAll, beforeEach, afterEach, expect, jest, vi };
for (const [k, v] of Object.entries(globals)) {
  if (globalThis[k] === undefined) globalThis[k] = v;
}
