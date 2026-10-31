import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Three places state a Node version, and they must agree.
 *
 * package.json declared `>=18.0.0` while the published image had always
 * been node:20-alpine and CI tested a runtime that reached end of life in
 * April 2025. A support claim the project neither ships nor can test is the
 * same defect as a document describing an endpoint that does not exist —
 * and it stayed invisible until a dependency bump failed on Node 18 for a
 * reason that had nothing to do with the dependency.
 */
describe('the supported Node version is one claim, not three', () => {
  const root = process.cwd();
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
    engines?: { node?: string };
    scripts?: Record<string, string>;
  };
  const workflow = readFileSync(join(root, '.github/workflows/verify.yml'), 'utf8');
  const dockerfile = readFileSync(join(root, 'apps/api/Dockerfile'), 'utf8');

  const declared = Number((manifest.engines?.node ?? '').replace(/[^\d.]/g, '').split('.')[0]);

  // Only the node-version line. A first version of this matched every
  // `\d+\.x` in the file and swallowed the comment explaining that 18.x had
  // been removed — reporting a floor of 18 from prose describing its own
  // absence. The test was right about what it read; it was reading the
  // wrong thing.
  const matrixLine = (workflow.match(/node-version:\s*\[([^\]]+)\]/) ?? [])[1] ?? '';
  const matrix = Array.from(matrixLine.matchAll(/(\d+)\.x/g)).map((match) => Number(match[1]));

  const image = Number((dockerfile.match(/FROM node:(\d+)/) ?? [])[1]);

  const workflowConfig = workflow
    .split('\n')
    .filter((line) => !/^\s*#/.test(line))
    .join('\n');
  const failFast = Array.from(workflowConfig.matchAll(/^\s*fail-fast:\s*(\S+)\s*$/gm)).map(
    (match) => match[1]
  );
  const matrixBlocks = Array.from(workflowConfig.matchAll(/^\s*matrix:\s*$/gm));

  it('declares an engine range to check', () => {
    assert.ok(declared > 0);
    assert.ok(matrix.length > 0);
    assert.ok(image > 0);
  });

  it('tests nothing older than it claims to support', () => {
    // Testing a runtime below the declared floor proves compatibility the
    // project does not promise; testing above it leaves the promise
    // unverified. The floor and the lowest tested version must match.
    assert.equal(Math.min(...matrix), declared);
  });

  it('ships on a version it tests', () => {
    // The image is the artifact people actually run. A runtime that never
    // appears in the matrix is shipped unverified.
    assert.ok(matrix.includes(image));
  });

  it('claims no runtime that is past end of life', () => {
    // Node 18 ended support in April 2025. Even-numbered releases below 20
    // are all past end of life, and promising them is a claim nobody can
    // honour.
    assert.ok(declared >= 20);
    assert.ok(Math.min(...matrix) >= 20);
  });

  it('tests a version beyond the one it ships', () => {
    // Otherwise the next LTS becomes a surprise on the day it turns
    // default, rather than a red pull request beforehand.
    assert.ok(Math.max(...matrix) > image);
  });

  it('keeps every matrix leg reporting when one leg fails', () => {
    assert.deepEqual(failFast, matrixBlocks.map(() => 'false'));
  });

  it('reads the matrix from the matrix, not from prose about it', () => {
    // Guards the mistake that produced this test's own first red run.
    assert.ok(!matrix.includes(18));
    assert.ok(matrix.length >= 2);
  });

  it('declares a local healthcheck against the unauthenticated health route', () => {
    assert.match(dockerfile, /HEALTHCHECK[\s\S]*127\.0\.0\.1[\s\S]*\/health/);
    assert.match(dockerfile, /response\.ok/);
  });

  it('ships the production image with required authentication enabled', () => {
    assert.match(dockerfile, /ENV OMEGA_AUTH_MODE=required/);
    assert.match(workflow, /OMEGA_READ_TOKEN=ci-smoke-read-token/);
    assert.match(workflow, /OMEGA_ADMIN_TOKEN=ci-smoke-admin-token/);
    assert.match(workflow, /Authorization: Bearer ci-smoke-read-token/);
    assert.match(workflow, /Authorization: Bearer ci-smoke-admin-token/);
  });

  it('runs browser-sensitive release tests in-band', () => {
    // The suite moved from Jest (--runInBand) to node:test; the equivalent
    // serialization is --test-concurrency=1.
    assert.ok(manifest.scripts?.test.includes('--test-concurrency=1'));
    assert.ok(manifest.scripts?.['test:coverage'].includes('--test-concurrency=1'));
  });

  it('hosts an encrypted local-ledger restart smoke in CI', () => {
    assert.match(workflow, /OMEGA_LOCAL_JOB_LEDGER=on/);
    assert.match(workflow, /OMEGA_LOCAL_JOB_LEDGER_PATH=\/tmp\/omega-ledger\/jobs\.json/);
    assert.match(workflow, /OMEGA_LOCAL_JOB_LEDGER_KEY=ci-smoke-ledger-key/);
    assert.match(workflow, /OMEGA_LOCAL_JOB_LEDGER_TOKEN=ci-smoke-job-token/);
    assert.match(workflow, /Job creation returned HTTP \$status/);
    assert.match(workflow, /test -s \/tmp\/job\.json/);
    assert.match(workflow, /-v \"\$RUNNER_TEMP\/omega-ledger:\/tmp\/omega-ledger\"/);
    assert.match(workflow, /--network host omega-v-api:ci/);
    assert.match(workflow, /Grant image user access to encrypted local-ledger volume/);
    assert.match(
      workflow,
      /sudo chown \"\$ledger_uid:\$ledger_gid\" \"\$RUNNER_TEMP\/omega-ledger\"/,
    );
    assert.match(workflow, /docker run --rm --user 0:0/);
    assert.match(workflow, /omega-ledger:\/tmp\/omega-ledger:ro/);
    assert.match(workflow, /docker rm -f omega-smoke/);
    assert.match(workflow, /local:\/\/ci-restart/);
    assert.match(workflow, /The encrypted local-ledger volume contains plaintext job payload/);
    assert.match(workflow, /job-after-restart\.json/);
    // The job routes carry OMEGA_LOCAL_JOB_LEDGER_TOKEN, not the admin bearer.
    // The smoke proves that separation by using only the job token.
    assert.match(workflow, /job_token=ci-smoke-job-token/);
    assert.match(workflow, /Authorization: Bearer \$job_token/);
    assert.match(workflow, /\"durable\":true/);
    assert.match(workflow, /\"source\":\"file\"/);
    assert.match(workflow, /\"encryption\":\"aes-256-gcm\"/);
    // Required-mode auth still covers the rest of the runtime.
    assert.match(workflow, /Authorization: Bearer ci-smoke-read-token/);
    assert.match(workflow, /\$api\/v1\/block\/tip/);
  });
});
