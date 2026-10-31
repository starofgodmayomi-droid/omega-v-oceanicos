import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * CONTRIBUTING.md is eleven kilobytes inviting people to contribute, and
 * until now there was no pull request template and no issue template. The
 * review discipline this repository actually runs on existed only in the
 * habits of whoever happened to be reviewing.
 *
 * These assert the templates ask for the things that have repeatedly
 * mattered here — evidence rather than assertion, failure paths, and the
 * limitations a change knows about itself.
 */
describe('contributor templates', () => {
  const root = process.cwd();
  const pr = join(root, '.github/PULL_REQUEST_TEMPLATE.md');
  const issue = join(root, '.github/ISSUE_TEMPLATE/bug_report.md');
  const config = join(root, '.github/ISSUE_TEMPLATE/config.yml');

  it('ships a pull request template', () => {
    assert.equal(existsSync(pr), true);
  });

  it('asks for evidence rather than a claim that tests pass', () => {
    const template = readFileSync(pr, 'utf8');

    // "Tests pass" is an assertion. A run number is evidence. This
    // repository has spent a long time on that distinction and the
    // template should not quietly drop it.
    assert.match(template, /is a claim; a run number is\s*\n?\s*evidence/i);
    assert.ok(template.includes('## Evidence'));
  });

  it('asks what the change does not do', () => {
    const template = readFileSync(pr, 'utf8');

    // The most useful section. A change that names its own edges is
    // easier to review, revert and build on.
    assert.ok(template.includes('## Limitations'));
    assert.match(template, /not an admission of weakness/i);
  });

  it('asks about the envelope when the change touches it', () => {
    const template = readFileSync(pr, 'utf8');

    assert.match(template, /reference verifier/i);
    // Three implementations of one published format: a disagreement is a
    // finding even with no exploit.
    assert.match(template, /finding even without an exploit/i);
  });

  it('requires failure paths, not only success paths', () => {
    const template = readFileSync(pr, 'utf8');
    assert.match(template, /Failure paths are tested/i);
  });

  it('routes security reports away from public issues', () => {
    assert.equal(existsSync(issue), true);
    assert.equal(existsSync(config), true);

    const bug = readFileSync(issue, 'utf8');
    const links = readFileSync(config, 'utf8');

    assert.match(bug, /do not open it here/i);
    assert.ok(bug.includes('SECURITY.md'));
    assert.ok(links.includes('security/advisories/new'));
  });

  it('links only to things that exist', () => {
    const links = readFileSync(config, 'utf8');

    // A first draft of this file invited people to "correct the Naijá
    // wording" — for a lexicon package that was never committed. Pointing
    // contributors at work that does not exist is the same drift this
    // repository guards against everywhere else, so every contact link is
    // checked against the tree.
    const paths = Array.from(links.matchAll(/blob\/main\/(\S+)/g)).map((match) => match[1]);

    assert.ok(paths.length > 0);
    for (const path of paths) {
      assert.equal(existsSync(join(root, path)), true);
    }
  });
});
