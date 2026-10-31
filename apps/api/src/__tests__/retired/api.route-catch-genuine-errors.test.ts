/**
 * `/act`, `/learn`, `/recompile`, and `/dissensus` each end with:
 *
 *   message: error instanceof Error ? error.message : '<generic fallback>'
 *
 * The existing "Runtime persistence failures reach the route handlers that
 * trigger them" suite in api.test.ts already proves these catch blocks run
 * when persistRuntime() fails -- but it does so by pointing the store path
 * at a plain file instead of a directory, which makes mkdirSync throw a
 * Node-internal fs error. Under Jest's default 'node' test environment,
 * each test file runs inside its own vm context, so that fs error's
 * constructor is not the same `Error` constructor this test file's own
 * `instanceof Error` check would compare against; the same documented
 * quirk that persistence.crossrealm-errors.test.ts closes for persistence.ts
 * directly. As a result, that suite's assertions land on the *fallback*
 * text every time, and the `error.message` branch -- the one that surfaces
 * a real, specific diagnostic to the operator instead of a generic string
 * -- had never run for any of these four routes.
 *
 * This file closes that branch the same way persistence.crossrealm-errors
 * closes its four: by making the underlying fs call throw an Error built
 * locally, with `new Error(...)`, from this test file. That Error shares a
 * realm with the `instanceof Error` check inside index.ts (both execute in
 * this file's own Jest vm context), so it takes the real path a genuine,
 * non-sandboxed failure would take.
 *
 * `/dissensus`'s catch block had NEITHER branch covered at all -- no test
 * anywhere ever drove `reconcile()` into throwing. Alongside the genuine
 * fs-Error case above (closing its `error.message` branch), this file also
 * forces `reconcile` itself to throw a plain, non-Error value once, closing
 * its fallback branch too.
 */
jest.mock('node:fs', () => {
  const actual = jest.requireActual('node:fs');
  return {
    ...actual,
    writeFileSync: jest.fn(actual.writeFileSync),
  };
});

jest.mock('@omega-v/dissensus', () => {
  const actual = jest.requireActual('@omega-v/dissensus');
  return { ...actual, reconcile: jest.fn(actual.reconcile) };
});

import { createServer, Server } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Express } from 'express';

const actualFs = jest.requireActual('node:fs') as typeof import('node:fs');

type ErrorBody = { code: string; message: string };
type Body<T> = { data: T };

describe('index.ts route catch blocks take error.message for a genuine same-realm Error', () => {
  let server: Server;
  let baseUrl: string;
  let dir: string;
  // `jest.resetModules()` below gives '../index' (and everything it
  // requires, including 'node:fs' and '@omega-v/dissensus') a fresh module
  // registry entry. A `node:fs`/`@omega-v/dissensus` import at this file's
  // top level would be bound to the *pre-reset* mock instance, a different
  // jest.fn() from the one index.ts's own `saveSnapshot`/`reconcile` calls
  // actually run through post-reset. These are re-acquired inside
  // `beforeAll`, after the reset, so mocking them here reaches the calls
  // this suite is about.
  let mockedWriteFileSync: jest.Mock;
  let mockedReconcile: jest.Mock;

  const post = async (path: string, body: unknown): Promise<Response> =>
    fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  const opinion = (over: Record<string, unknown> = {}) => ({
    verifierId: 'rules',
    verifierVersion: '1.0.0',
    passed: true,
    confidence: 0.95,
    reason: 'fixture',
    ...over,
  });

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'omega-api-route-catch-'));
    process.env.OMEGA_PERSISTENCE = 'on';
    process.env.OMEGA_RUNTIME_STORE_PATH = join(dir, 'runtime.json');

    jest.resetModules();

    const freshFs = require('node:fs') as typeof import('node:fs');

    const freshDissensus = require('@omega-v/dissensus') as { reconcile: jest.Mock };
    mockedWriteFileSync = freshFs.writeFileSync as unknown as jest.Mock;
    mockedReconcile = freshDissensus.reconcile;

    const isolated = require('../index') as { app: Express };
    server = createServer(isolated.app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server did not start');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
    mockedWriteFileSync.mockImplementation(actualFs.writeFileSync);
    delete process.env.OMEGA_PERSISTENCE;
    delete process.env.OMEGA_RUNTIME_STORE_PATH;
    rmSync(dir, { recursive: true, force: true });
    jest.resetModules();
  });

  it('records a real action and learning before the store stops accepting writes', async () => {
    const loopResponse = await post('/complete-loop', {
      claim: 'route-catch fixture claim',
      category: 'health-check',
      source: { system: 'route-catch-test', version: '0.1.0', environment: 'test' },
      observedBy: 'jest',
      metadata: { statusCode: 200, responseTime: 7 },
      confidence: 0.95,
      confidenceReason: 'fixture',
    });
    expect(loopResponse.status).toBe(201);
    const loop = (await loopResponse.json()) as Body<{ attestation: { id: string } }>;

    const actionResponse = await post('/act', { attestation: loop.data.attestation });
    expect(actionResponse.status).toBe(201);
    const action = (await actionResponse.json()) as Body<{ id: string }>;

    const learningResponse = await post('/learn', {
      actionId: action.data.id,
      outcome: 'success',
    });
    expect(learningResponse.status).toBe(201);
    const learning = (await learningResponse.json()) as Body<{ id: string }>;

    // Every write above succeeded normally. From here on, writeFileSync
    // (the call saveSnapshot makes to persist the runtime store) throws a
    // genuine, same-realm Error, so every route below hits its catch block
    // with `error instanceof Error` true.
    mockedWriteFileSync.mockImplementation(() => {
      throw new Error('mocked snapshot write failure: disk unavailable');
    });

    const failedAction = await post('/act', { attestation: loop.data.attestation });
    const failedActionBody = (await failedAction.json()) as ErrorBody;
    expect(failedAction.status).toBe(400);
    expect(failedActionBody.code).toBe('ACTION_FAILED');
    expect(failedActionBody.message).toBe('mocked snapshot write failure: disk unavailable');

    const failedLearning = await post('/learn', {
      actionId: action.data.id,
      outcome: 'failure',
    });
    const failedLearningBody = (await failedLearning.json()) as ErrorBody;
    expect(failedLearning.status).toBe(400);
    expect(failedLearningBody.code).toBe('LEARNING_FAILED');
    expect(failedLearningBody.message).toBe('mocked snapshot write failure: disk unavailable');

    const failedRecompile = await post('/recompile', { learningId: learning.data.id });
    const failedRecompileBody = (await failedRecompile.json()) as ErrorBody;
    expect(failedRecompile.status).toBe(400);
    expect(failedRecompileBody.code).toBe('RECOMPILE_FAILED');
    expect(failedRecompileBody.message).toBe('mocked snapshot write failure: disk unavailable');

    const failedDissensus = await post('/dissensus', {
      opinions: [opinion(), opinion({ verifierId: 'model', confidence: 0.9 })],
    });
    const failedDissensusBody = (await failedDissensus.json()) as ErrorBody;
    expect(failedDissensus.status).toBe(400);
    expect(failedDissensusBody.code).toBe('DISSENSUS_FAILED');
    expect(failedDissensusBody.message).toBe('mocked snapshot write failure: disk unavailable');

    // Restore the store so the next test starts from a normal, writable one.
    mockedWriteFileSync.mockImplementation(actualFs.writeFileSync);
  });

  it("falls back to the generic message when /dissensus's reconcile throws something that is not an Error", async () => {
    mockedReconcile.mockImplementationOnce(() => {
      throw 'reconciliation exploded, not an Error instance';
    });

    const response = await post('/dissensus', {
      opinions: [opinion(), opinion({ verifierId: 'model', confidence: 0.9 })],
    });
    const body = (await response.json()) as ErrorBody;

    expect(response.status).toBe(400);
    expect(body.code).toBe('DISSENSUS_FAILED');
    expect(body.message).toBe('Reconciliation failed');
  });
});
