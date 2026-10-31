import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The pipeline checks that the code satisfies its own tests. That is not
 * the same as checking the code is safe, and it says nothing at all about
 * what the code depends on.
 *
 * Section XIX lists dependency integrity, supply chain and injection
 * resistance as things to test continuously. Until now none of the three
 * had anything behind them: secret scanning covers what this repository
 * commits, and nothing watched what it pulls in.
 */
describe('supply chain and static analysis', () => {
  const root = process.cwd();

  it('configures dependency updates', () => {
    const path = join(root, '.github/dependabot.yml');
    assert.equal(existsSync(path), true);

    const config = readFileSync(path, 'utf8');
    assert.ok(config.includes('package-ecosystem: npm'));
    // The workflow is the observer; an unmaintained action inside it is a
    // hole in the thing that checks everything else.
    assert.ok(config.includes('package-ecosystem: github-actions'));
  });

  it('groups updates rather than opening one pull request per package', () => {
    const config = readFileSync(join(root, '.github/dependabot.yml'), 'utf8');

    // Ten pull requests for one toolchain bump is how updates get ignored,
    // and an ignored update is no update with extra noise.
    assert.ok(config.includes('groups:'));
    assert.match(config, /open-pull-requests-limit:\s*\d+/);
  });

  it('runs static security analysis over the source', () => {
    const path = join(root, '.github/workflows/codeql.yml');
    assert.equal(existsSync(path), true);

    const workflow = readFileSync(path, 'utf8');
    assert.ok(workflow.includes('github/codeql-action/init'));
    assert.ok(workflow.includes('javascript-typescript'));
    assert.ok(workflow.includes('security-events: write'));
  });

  it('analyses on a schedule, not only on change', () => {
    const workflow = readFileSync(join(root, '.github/workflows/codeql.yml'), 'utf8');

    // A vulnerability disclosed after a merge does not wait for the next
    // commit to become relevant.
    assert.match(workflow, /schedule:/);
    assert.match(workflow, /cron:/);
  });

  it('grants every workflow an explicit permission block', () => {
    const workflowsDir = join(root, '.github/workflows');
    const workflows = readdirSync(workflowsDir).filter((entry) => entry.endsWith('.yml'));

    assert.ok(workflows.length >= 2);

    for (const name of workflows) {
      const workflow = readFileSync(join(workflowsDir, name), 'utf8');
      // Without a block, a workflow inherits whatever the repository
      // default happens to be, which is not least privilege — it is
      // whatever nobody changed.
      assert.match(workflow, /^permissions:/m);
    }
  });

  it('publishes an inventory of the image, not only its provenance', () => {
    const workflow = readFileSync(join(root, '.github/workflows/verify.yml'), 'utf8');

    // Provenance answers "who built this". It does not answer "what is
    // inside it", and a consumer asking whether the image ships a package
    // with a known CVE had no way to find out without pulling and
    // unpacking it.
    assert.ok(workflow.includes('anchore/sbom-action'));
    assert.ok(workflow.includes('spdx-json'));
  });

  it('signs the inventory rather than shipping it unsigned', () => {
    const workflow = readFileSync(join(root, '.github/workflows/verify.yml'), 'utf8');

    // An unsigned SBOM is a file anyone could have written afterwards.
    // Attested and pushed to the registry, it is evidence bound to the
    // digest it describes.
    assert.ok(workflow.includes('actions/attest-sbom'));
    assert.match(workflow, /attest-sbom[\s\S]{0,400}push-to-registry:\s*true/);
  });

  it('binds both attestations to the digest, not to a mutable tag', () => {
    const workflow = readFileSync(join(root, '.github/workflows/verify.yml'), 'utf8');

    // `latest` moves. A digest does not, and an attestation bound to a tag
    // would describe whatever that tag points at today.
    const digestSubjects = workflow.match(/subject-digest:\s*\$\{\{ steps\.push\.outputs\.digest/g);
    assert.ok(digestSubjects?.length >= 2);
  });

  it('keeps peer-coupled packages in one group', () => {
    const config = readFileSync(join(root, '.github/dependabot.yml'), 'utf8');

    // React and @testing-library/react are peer-coupled. Splitting them
    // produced a pull request that installed react 19 transitively while
    // apps/web still declared ^18.2.0 — two copies of React in one tree,
    // failing on Windows and passing on Linux. Neither half could be green
    // alone, so neither could ever land.
    assert.ok(config.includes('testing-and-react:'));

    const group = config.slice(config.indexOf('testing-and-react:'), config.indexOf('linting:'));
    for (const pkg of ['react', 'react-dom', '@testing-library/*', 'jest']) {
      assert.ok(group.includes(pkg));
    }
  });

  it('does not let the typings group claim React typings first', () => {
    const config = readFileSync(join(root, '.github/dependabot.yml'), 'utf8');

    // Groups match in order, so '@types/*' would take @types/react before
    // the React group saw it, reintroducing the same split one level down.
    assert.ok(config.includes('exclude-patterns:'));
    assert.match(config, /exclude-patterns:[\s\S]{0,120}@types\/react/);
  });

  it('holds a dependency the toolchain cannot accept, with a reason and a way out', () => {
    const config = readFileSync(join(root, '.github/dependabot.yml'), 'utf8');

    // TypeScript 7 is held because @typescript-eslint/parser refuses to
    // load against it — "typescript-eslint does not support TS 7.0" — and
    // linting is a required stage, so no change to this repository can make
    // the bump pass. Proposing it weekly would train us to look past a red
    // pipeline, which is the habit this project can least afford.
    assert.ok(config.includes('ignore:'));
    assert.match(config, /dependency-name:\s*typescript/);
    assert.match(config, /versions:\s*\['>=7\.0\.0'\]/);
  });

  it('records why a hold exists and when to remove it', () => {
    const config = readFileSync(join(root, '.github/dependabot.yml'), 'utf8');
    const hold = config.slice(config.indexOf('ignore:'), config.indexOf('commit-message'));

    // An ignore rule with no reason is indistinguishable from one added to
    // silence an inconvenient failure. This one names the upstream tracking
    // issue and the condition that retires it.
    assert.match(hold, /typescript-eslint/);
    assert.match(hold, /10940/);
    assert.match(hold, /Remove this entry/i);
  });
});
