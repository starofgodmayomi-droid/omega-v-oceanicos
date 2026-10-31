import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
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
    assert.match(report, /needs:\s*\[verify, windows, docker, compose\]/);
  });

  it('runs even when the pipeline fails', () => {
    assert.match(report, /if:\s*always\(\)/);
  });

  it('observes run jobs rather than collapsing a matrix to needs results', () => {
    assert.ok(config.includes('listJobsForWorkflowRun'));
    assert.ok(!config.includes('needs.verify.result'));
    assert.ok(!config.includes('needs.windows.result'));
    assert.ok(!config.includes('needs.docker.result'));
  });

  it('has permission to read workflow jobs', () => {
    assert.match(config, /actions:\s*read/);
  });

  it('does not count its own still-running job', () => {
    assert.ok(config.includes("job.name !== 'Report pipeline result'"));
  });

  it('preserves unfinished states as unfinished and only success as a pass', () => {
    assert.ok(config.includes("job.status === 'completed'"));
    assert.ok(config.includes("job.conclusion || 'no conclusion'"));
    assert.ok(config.includes("required.every((job) => stateOf(job) === 'success')"));
  });

  it('excludes pull-request publish because publication is explicitly gated', () => {
    const publish = workflow.slice(publishStart);
    assert.ok(publish.includes("github.event_name == 'workflow_dispatch'"));
    assert.ok(config.includes("new Set(['Publish attested artifact'])"));
  });

  it('reports every observed job dynamically', () => {
    assert.ok(config.includes("jobs.map((job) => '- ' + mark(stateOf(job))"));
  });
});
