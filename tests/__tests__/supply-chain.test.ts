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
});
