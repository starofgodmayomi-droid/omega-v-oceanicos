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

  it('declares an engine range to check', () => {
    expect(declared).toBeGreaterThan(0);
    expect(matrix.length).toBeGreaterThan(0);
    expect(image).toBeGreaterThan(0);
  });

  it('tests nothing older than it claims to support', () => {
    // Testing a runtime below the declared floor proves compatibility the
    // project does not promise; testing above it leaves the promise
    // unverified. The floor and the lowest tested version must match.
    expect(Math.min(...matrix)).toBe(declared);
  });

  it('ships on a version it tests', () => {
    // The image is the artifact people actually run. A runtime that never
    // appears in the matrix is shipped unverified.
    expect(matrix).toContain(image);
  });

  it('claims no runtime that is past end of life', () => {
    // Node 18 ended support in April 2025. Even-numbered releases below 20
    // are all past end of life, and promising them is a claim nobody can
    // honour.
    expect(declared).toBeGreaterThanOrEqual(20);
    expect(Math.min(...matrix)).toBeGreaterThanOrEqual(20);
  });

  it('tests a version beyond the one it ships', () => {
    // Otherwise the next LTS becomes a surprise on the day it turns
    // default, rather than a red pull request beforehand.
    expect(Math.max(...matrix)).toBeGreaterThan(image);
  });

  it('reads the matrix from the matrix, not from prose about it', () => {
    // Guards the mistake that produced this test's own first red run.
    expect(matrix).not.toContain(18);
    expect(matrix.length).toBeGreaterThanOrEqual(2);
  });

  it('declares a local healthcheck against the unauthenticated health route', () => {
    expect(dockerfile).toMatch(/HEALTHCHECK[\s\S]*127\.0\.0\.1[\s\S]*\/health/);
    expect(dockerfile).toMatch(/response\.ok/);
  });

  it('ships the production image with required authentication enabled', () => {
    expect(dockerfile).toMatch(/ENV OMEGA_AUTH_MODE=required/);
    expect(workflow).toMatch(/OMEGA_READ_TOKEN=ci-smoke-read-token/);
    expect(workflow).toMatch(/OMEGA_ADMIN_TOKEN=ci-smoke-admin-token/);
    expect(workflow).toMatch(/Authorization: Bearer ci-smoke-read-token/);
    expect(workflow).toMatch(/Authorization: Bearer ci-smoke-admin-token/);
  });

  it('runs browser-sensitive release tests in-band', () => {
    expect(manifest.scripts?.test).toContain('--runInBand');
    expect(manifest.scripts?.['test:fast']).toContain('--runInBand');
    expect(manifest.scripts?.['test:coverage']).toContain('--runInBand');
  });

  it('hosts an encrypted local-ledger restart smoke in CI', () => {
    expect(workflow).toMatch(/OMEGA_LOCAL_JOB_LEDGER=on/);
    expect(workflow).toMatch(/OMEGA_LOCAL_JOB_LEDGER_PATH=\/tmp\/omega-ledger\/jobs\.json/);
    expect(workflow).toMatch(/OMEGA_LOCAL_JOB_LEDGER_KEY=ci-smoke-ledger-key/);
    expect(workflow).toMatch(/x-omega-local-job-token: ci-smoke-job-token/);
    expect(workflow).toMatch(/Job creation returned HTTP \$status/);
    expect(workflow).toMatch(/test -s \/tmp\/job\.json/);
    expect(workflow).toMatch(/-v \"\$RUNNER_TEMP\/omega-ledger:\/tmp\/omega-ledger\"/);
    expect(workflow).toMatch(/--network host omega-v-api:ci/);
    expect(workflow).toMatch(/Grant image user access to encrypted local-ledger volume/);
    expect(workflow).toMatch(
      /sudo chown \"\$ledger_uid:\$ledger_gid\" \"\$RUNNER_TEMP\/omega-ledger\"/
    );
    expect(workflow).toMatch(/docker run --rm --user 0:0/);
    expect(workflow).toMatch(/omega-ledger:\/tmp\/omega-ledger:ro/);
    expect(workflow).toMatch(/docker rm -f omega-smoke/);
    expect(workflow).toMatch(/local:\/\/ci-restart/);
    expect(workflow).toMatch(/The encrypted local-ledger volume contains plaintext job payload/);
    expect(workflow).toMatch(/job-after-restart\.json/);
    expect(workflow).toMatch(/check_api\(\) \{/);
    expect(workflow).toMatch(/API prefix \$path returned HTTP \$status/);
    expect(workflow).toMatch(/\"encryption\":\"aes-256-gcm\"/);
  });
});
