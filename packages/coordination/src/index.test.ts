import { ParallelExecutor } from './index';

describe('ParallelExecutor', () => {
  it('runs active workers and builders in bounded parallel slots', async () => {
    let active = 0;
    let peak = 0;
    const task = (id: string, role: 'worker' | 'builder') => ({
      id,
      role,
      title: `${role} ${id}`,
      run: async () => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
        return `${id}-done`;
      },
    });

    const summary = await new ParallelExecutor({ maxConcurrency: 2, runId: 'test-run' }).execute([
      task('worker-1', 'worker'),
      task('worker-2', 'worker'),
      task('builder-1', 'builder'),
    ]);

    expect(peak).toBe(2);
    expect(summary).toMatchObject({
      runId: 'test-run',
      state: 'succeeded',
      maxConcurrency: 2,
      started: 3,
      succeeded: 3,
      failed: 0,
    });
    expect(summary.events.filter((event) => event.state === 'running')).toHaveLength(3);
    expect(summary.results['builder-1']).toBe('builder-1-done');
  });

  it('records a failed task without hiding other task results', async () => {
    const summary = await new ParallelExecutor({ maxConcurrency: 3, runId: 'failure-run' }).execute(
      [
        { id: 'ok', role: 'worker', title: 'Healthy worker', run: async () => 'ok' },
        {
          id: 'bad',
          role: 'builder',
          title: 'Failing builder',
          run: async () => {
            throw new Error('compile failed');
          },
        },
      ]
    );

    expect(summary.state).toBe('failed');
    expect(summary.succeeded).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.results.ok).toBe('ok');
    expect(
      summary.events.find((event) => event.taskId === 'bad' && event.state === 'failed')?.message
    ).toBe('compile failed');
  });

  it('fails closed for duplicate, empty, and over-bound workloads', async () => {
    const executor = new ParallelExecutor({ maxConcurrency: 1, maxTasks: 1 });
    await expect(executor.execute([])).rejects.toThrow('at least one task');
    await expect(
      executor.execute([
        { id: 'same', role: 'worker', title: 'One', run: async () => '1' },
        { id: 'same', role: 'worker', title: 'Two', run: async () => '2' },
      ])
    ).rejects.toThrow('task count exceeds maxTasks=1');
  });
});
