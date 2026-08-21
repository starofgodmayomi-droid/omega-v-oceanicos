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

  const matrix = Array.from(workflow.matchAll(/(\d+)\.x/g)).map((match) => Number(match[1]));

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
});
