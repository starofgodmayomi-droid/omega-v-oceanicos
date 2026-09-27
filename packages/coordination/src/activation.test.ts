import { activateWorkersAndBuilders } from './activation';

describe('activateWorkersAndBuilders', () => {
  it('requires explicit human approval', async () => {
    await expect(
      activateWorkersAndBuilders({
        authorization: { approved: false, operatorId: 'human-1', reason: 'test' },
        tasks: [{ id: 'w1', role: 'worker', title: 'worker', run: async () => 'ok' }],
      }),
    ).rejects.toThrow('explicit human approval');
  });

  it('activates supplied workers and builders through bounded execution', async () => {
    const result = await activateWorkersAndBuilders({
      authorization: { approved: true, operatorId: 'human-1', reason: 'bounded verification run' },
      executor: { maxConcurrency: 2, maxTasks: 4, runId: 'activation-test' },
      tasks: [
        { id: 'worker-1', role: 'worker', title: 'observe', run: async () => 'observed' },
        { id: 'builder-1', role: 'builder', title: 'build evidence', run: async () => 'built' },
      ],
    });

    expect(result.kind).toBe('worker-builder-activation');
    expect(result.authorized).toBe(true);
    expect(result.operatorId).toBe('human-1');
    expect(result.roles).toEqual(['worker', 'builder']);
    expect(result.execution.state).toBe('succeeded');
    expect(result.execution.succeeded).toBe(2);
    expect(result.limitations).toContain('does not prove distributed coordination or deployment health');
  });

  it('preserves failed-task evidence instead of hiding it', async () => {
    const result = await activateWorkersAndBuilders({
      authorization: { approved: true, operatorId: 'human-1', reason: 'failure-path test' },
      executor: { maxConcurrency: 2, runId: 'activation-failure-test' },
      tasks: [
        { id: 'worker-ok', role: 'worker', title: 'ok', run: async () => 'ok' },
        {
          id: 'builder-fail',
          role: 'builder',
          title: 'fail intentionally',
          run: async () => {
            throw new Error('builder failed');
          },
        },
      ],
    });

    expect(result.execution.state).toBe('failed');
    expect(result.execution.succeeded).toBe(1);
    expect(result.execution.failed).toBe(1);
    expect(result.execution.results['worker-ok']).toBe('ok');
    expect(result.execution.events.find((event) => event.taskId === 'builder-fail')?.message).toBe(
      'builder failed',
    );
  });
});
