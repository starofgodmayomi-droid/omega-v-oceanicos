import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('the pipeline report says what happened', () => {
  const workflow = readFileSync(join(process.cwd(), '.github/workflows/verify.yml'), 'utf8');
  const reportStart = workflow.indexOf('  report:');
  const publishStart = workflow.indexOf('  publish:');
  const report = workflow.slice(reportStart, publishStart);
  const config = report
    .split('\n')
    .filter((line) => !/^\s*#/.test(line))
    .join('\n');

  it('runs after every job it speaks for', () => {
    expect(report).toMatch(/needs:\s*\[verify, windows, docker, compose\]/);
  });

  it('runs even when the pipeline fails', () => {
    expect(report).toMatch(/if:\s*always\(\)/);
  });

  it('observes run jobs rather than collapsing a matrix to needs results', () => {
    expect(config).toContain('listJobsForWorkflowRun');
    expect(config).not.toContain('needs.verify.result');
    expect(config).not.toContain('needs.windows.result');
    expect(config).not.toContain('needs.docker.result');
  });

  it('has permission to read workflow jobs', () => {
    expect(config).toMatch(/actions:\s*read/);
  });

  it('does not count its own still-running job', () => {
    expect(config).toContain("job.name !== 'Report pipeline result'");
  });

  it('preserves unfinished states as unfinished and only success as a pass', () => {
    expect(config).toContain("job.status === 'completed'");
    expect(config).toContain("job.conclusion || 'no conclusion'");
    expect(config).toContain("required.every((job) => stateOf(job) === 'success')");
  });

  it('excludes pull-request publish because publication is explicitly gated', () => {
    const publish = workflow.slice(publishStart);
    expect(publish).toContain("github.event_name == 'workflow_dispatch'");
    expect(config).toContain("new Set(['Publish attested artifact'])");
  });

  it('reports every observed job dynamically', () => {
    expect(config).toContain("jobs.map((job) => '- ' + mark(stateOf(job))");
  });
});
