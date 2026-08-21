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
});
