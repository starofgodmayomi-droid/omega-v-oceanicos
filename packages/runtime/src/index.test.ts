import { AgentLoop, MemoryFabric } from './index';

describe('AgentLoop', () => {
  it('runs modular stages and records low-overhead trace evidence', async () => {
    const loop = new AgentLoop([
      { id: 'observe', execute: ({ input }) => ({ input, observed: true }) },
      { id: 'verify', execute: ({ values }) => Boolean(values.observe) },
      { id: 'build', execute: ({ values }) => ({ verified: values.verify }) },
    ]);
    const result = await loop.run('fixture', 'agent-test');
    expect(result.state).toBe('succeeded');
    expect(result.context.values.build).toEqual({ verified: true });
    expect(result.trace.filter((event) => event.state === 'succeeded')).toHaveLength(3);
    expect(result.limitations).toContain(
      'elapsed time is an observation, not a zero-latency guarantee'
    );
  });

  it('stops at the first failed module and records the failure', async () => {
    const result = await new AgentLoop([
      { id: 'observe', execute: () => 'ok' },
      {
        id: 'verify',
        execute: () => {
          throw new Error('evidence missing');
        },
      },
      { id: 'build', execute: () => 'must not run' },
    ]).run('fixture', 'agent-failure');
    expect(result.state).toBe('failed');
    expect(result.context.values.build).toBeUndefined();
    expect(result.trace.at(-1)).toMatchObject({
      moduleId: 'verify',
      state: 'failed',
      message: 'evidence missing',
    });
  });
});

describe('MemoryFabric', () => {
  it('retains only the configured hot-path window and supports run recall', () => {
    const memory = new MemoryFabric<{ value: number }>(2, () => '2026-08-31T00:00:00.000Z');
    memory.remember({ id: 'm1', runId: 'r1', kind: 'observation', value: { value: 1 } });
    memory.remember({ id: 'm2', runId: 'r1', kind: 'verification', value: { value: 2 } });
    memory.remember({ id: 'm3', runId: 'r2', kind: 'builder', value: { value: 3 } });
    expect(memory.size()).toBe(2);
    expect(memory.recall('r1').map((record) => record.id)).toEqual(['m2']);
  });
});
