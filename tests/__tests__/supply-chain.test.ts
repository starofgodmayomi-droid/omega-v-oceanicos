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
    expect(existsSync(path)).toBe(true);

    const config = readFileSync(path, 'utf8');
    expect(config).toContain('package-ecosystem: npm');
    // The workflow is the observer; an unmaintained action inside it is a
    // hole in the thing that checks everything else.
    expect(config).toContain('package-ecosystem: github-actions');
  });

  it('groups updates rather than opening one pull request per package', () => {
    const config = readFileSync(join(root, '.github/dependabot.yml'), 'utf8');

    // Ten pull requests for one toolchain bump is how updates get ignored,
    // and an ignored update is no update with extra noise.
    expect(config).toContain('groups:');
    expect(config).toMatch(/open-pull-requests-limit:\s*\d+/);
  });

  it('runs static security analysis over the source', () => {
    const path = join(root, '.github/workflows/codeql.yml');
    expect(existsSync(path)).toBe(true);

    const workflow = readFileSync(path, 'utf8');
    expect(workflow).toContain('github/codeql-action/init');
    expect(workflow).toContain('javascript-typescript');
    expect(workflow).toContain('security-events: write');
  });

  it('analyses on a schedule, not only on change', () => {
    const workflow = readFileSync(join(root, '.github/workflows/codeql.yml'), 'utf8');

    // A vulnerability disclosed after a merge does not wait for the next
    // commit to become relevant.
    expect(workflow).toMatch(/schedule:/);
    expect(workflow).toMatch(/cron:/);
  });

  it('grants every workflow an explicit permission block', () => {
    const workflowsDir = join(root, '.github/workflows');
    const workflows = readdirSync(workflowsDir).filter((entry) => entry.endsWith('.yml'));

    expect(workflows.length).toBeGreaterThanOrEqual(2);

    for (const name of workflows) {
      const workflow = readFileSync(join(workflowsDir, name), 'utf8');
      // Without a block, a workflow inherits whatever the repository
      // default happens to be, which is not least privilege — it is
      // whatever nobody changed.
      expect(workflow).toMatch(/^permissions:/m);
    }
  });

  it('publishes an inventory of the image, not only its provenance', () => {
    const workflow = readFileSync(join(root, '.github/workflows/verify.yml'), 'utf8');

    // Provenance answers "who built this". It does not answer "what is
    // inside it", and a consumer asking whether the image ships a package
    // with a known CVE had no way to find out without pulling and
    // unpacking it.
    expect(workflow).toContain('anchore/sbom-action');
    expect(workflow).toContain('spdx-json');
  });

  it('signs the inventory rather than shipping it unsigned', () => {
    const workflow = readFileSync(join(root, '.github/workflows/verify.yml'), 'utf8');

    // An unsigned SBOM is a file anyone could have written afterwards.
    // Attested and pushed to the registry, it is evidence bound to the
    // digest it describes.
    expect(workflow).toContain('actions/attest-sbom');
    expect(workflow).toMatch(/attest-sbom[\s\S]{0,400}push-to-registry:\s*true/);
  });

  it('binds both attestations to the digest, not to a mutable tag', () => {
    const workflow = readFileSync(join(root, '.github/workflows/verify.yml'), 'utf8');

    // `latest` moves. A digest does not, and an attestation bound to a tag
    // would describe whatever that tag points at today.
    const digestSubjects = workflow.match(/subject-digest:\s*\$\{\{ steps\.push\.outputs\.digest/g);
    expect(digestSubjects?.length).toBeGreaterThanOrEqual(2);
  });
});
