import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The skills README records a sha256 for every installed skill and offers a
 * `sha256sum -c` command to check one. Nothing ran it.
 *
 * That table is the only thing linking an installed artifact to the file it
 * was supplied as — the directory is excluded from Prettier precisely so the
 * bytes stay as received — and a recorded hash nobody verifies is a claim,
 * not a control. It sat unchecked from the day it was written.
 *
 * These assertions are the same comparison the README documents, run for
 * every row, in both directions: no recorded skill may be missing or
 * altered, and no installed skill may go unrecorded.
 */
describe('installed skills match what the README records', () => {
  const root = process.cwd();
  const dir = join(root, '.claude/skills');
  const readme = readFileSync(join(dir, 'README.md'), 'utf8');

  /** Rows of the table: | `name` | `sha256` | date | */
  const recorded = new Map(
    Array.from(readme.matchAll(/^\|\s*`([a-z0-9-]+)`\s*\|\s*`([0-9a-f]{64})`\s*\|/gm)).map(
      (match) => [match[1], match[2]] as const
    )
  );

  const installed = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const digest = (skill: string): string =>
    createHash('sha256')
      .update(readFileSync(join(dir, skill, 'SKILL.md')))
      .digest('hex');

  it('records at least the skills this repository has installed', () => {
    // Guards the degenerate pass: a regex that matched nothing would make
    // every other assertion here vacuously true.
    expect(recorded.size).toBeGreaterThanOrEqual(3);
    expect(installed.length).toBeGreaterThanOrEqual(3);
  });

  it.each(Array.from(recorded.keys()))('has %s installed where it is recorded', (skill) => {
    expect(existsSync(join(dir, skill, 'SKILL.md'))).toBe(true);
  });

  it.each(Array.from(recorded.entries()))('%s still hashes to what was recorded', (skill, hash) => {
    // The README's own instruction, executed. A skill edited in place — by a
    // formatter, a merge, or a hand — fails here rather than passing as the
    // artifact it no longer is.
    expect(digest(skill)).toBe(hash);
  });

  it.each(installed)('%s is recorded in the README', (skill) => {
    // The other direction: an installed skill absent from the table has no
    // link back to the file it was supplied as.
    expect(recorded.has(skill)).toBe(true);
  });

  it('keeps every skill directory shaped the way the loader expects', () => {
    for (const skill of installed) {
      const source = readFileSync(join(dir, skill, 'SKILL.md'), 'utf8');
      // Frontmatter naming the skill, and a name that matches its directory.
      // A mismatch loads under a name nobody wrote down.
      expect(source.startsWith('---\n')).toBe(true);
      expect(source).toMatch(new RegExp(`^name:\\s*${skill}\\s*$`, 'm'));
      expect(source).toMatch(/^description:\s*\S/m);
    }
  });

  it('protects supplied artifacts from being reformatted', () => {
    // The bytes are the artifact. If Prettier may rewrite them, the recorded
    // hash becomes a hash of whatever CI last decided the file should look
    // like.
    const ignore = readFileSync(join(root, '.prettierignore'), 'utf8');
    expect(ignore).toMatch(/^\.claude\/skills\/$/m);
    expect(ignore).toMatch(/^skills\/$/m);
  });
});
