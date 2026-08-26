import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The bot that reports the pipeline result has been wrong twice, in the
 * same direction both times.
 *
 * First it posted "Verification pipeline passed" from inside the verify
 * matrix, once per leg, while the other leg and the docker job were still
 * running. Then, after it was moved to a job that depends on everything it
 * speaks for, it still reduced a whole matrix to one word: `needs.verify.result`
 * reads `failure` when 20.x fails and 22.x passes, and the leg that passed
 * leaves no trace in the comment.
 *
 * Both are the same defect as the one this repository keeps finding
 * elsewhere — a summary asserting more, or less, than what was observed.
 * So the report reads the run's jobs back from the API and prints what each
 * one actually did.
 *
 * Stated limitation: these assertions check that the report is wired to
 * observation rather than to declarations. They cannot execute the inline
 * script, so they cannot prove the wording it produces is correct. What
 * they catch is a return to reporting from `needs.*.result`.
 */
describe('the pipeline report says what happened', () => {
  const workflow = readFileSync(join(process.cwd(), '.github/workflows/verify.yml'), 'utf8');
  const report = workflow.slice(workflow.indexOf('  report:'), workflow.indexOf('  publish:'));

  // YAML comments stripped for the negative assertions below, because the
  // job's own comment explains the `needs.*.result` problem by name. Reading
  // the slice whole would find the explanation and fail on it — the same trap
  // the fail-fast assertion in node-support.test.ts documents.
  const config = report
    .split('\n')
    .filter((line) => !/^\s*#/.test(line))
    .join('\n');

  it('runs after every job it speaks for', () => {
    expect(report).toMatch(/needs:\s*\[verify, windows, docker\]/);
  });

  it('runs even when the pipeline fails', () => {
    // A comment that only ever appears on success is not a report.
    expect(report).toMatch(/if:\s*always\(\)/);
  });

  it('reads the outcome from the run rather than from its own dependencies', () => {
    expect(config).toContain('listJobsForWorkflowRun');
    // needs.*.result collapses a matrix to one word. Reporting from it is
    // the regression this test exists to catch.
    expect(config).not.toContain('needs.verify.result');
    expect(config).not.toContain('needs.windows.result');
    expect(config).not.toContain('needs.docker.result');
  });

  it('holds the permission that read requires', () => {
    // Without actions: read the API call fails and the report would have to
    // fall back on something it did not observe.
    expect(report).toMatch(/permissions:[\s\S]*actions: read/);
  });

  it('excludes itself, because it cannot report its own conclusion', () => {
    expect(report).toContain("job.name !== 'Report pipeline result'");
  });

  it('treats an unfinished job as unfinished rather than as absent', () => {
    expect(report).toContain("job.status === 'completed'");
    expect(report).toContain("job.conclusion ?? 'no conclusion'");
  });

  it('counts only success as a pass, among the jobs that were meant to run', () => {
    // Skipped and cancelled are not failures, but neither is evidence that
    // anything was checked. A cancelled matrix leg reading as a pass is
    // exactly how a red pipeline was once reported green here.
    expect(config).toMatch(/required\.every\(\(job\) => stateOf\(job\) === 'success'\)/);
    expect(config).toMatch(/required\.length > 0/);
  });

  it('does not count the publish job, which is skipped on every pull request', () => {
    // The first version of this report counted every observed job, which
    // would have marked every pull request as failed: `Publish attested
    // artifact` is gated on a push to main and skips here by design. It is
    // still listed with its real state — excluded from the verdict, not
    // from the record.
    const publish = workflow.slice(workflow.indexOf('  publish:'));
    expect(publish).toMatch(/if:.*github\.event_name == 'push'/);
    expect(config).toContain("new Set(['Publish attested artifact'])");
    expect(config).toContain('jobs.filter((job) => !NOT_REQUIRED_ON_PULL_REQUESTS.has(job.name))');
  });

  it('names every job it observed, not a fixed list of three', () => {
    expect(report).toMatch(/jobs\.map\(\(job\) => `- \$\{mark\(stateOf\(job\)\)\} \$\{job\.name\}/);
  });
});
