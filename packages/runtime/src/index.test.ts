import { AgentLoop, BoundedRuntimeManager, MemoryFabric } from './index';

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

describe('BoundedRuntimeManager', () => {
  it('shuts down registered resources once and never calls process.exit', async () => {
    const events: string[] = [];
    const runtime = new BoundedRuntimeManager({
      resources: [
        {
          id: 'ledger',
          close: () => {
            events.push('ledger-close');
          },
        },
        {
          id: 'commands',
          close: async () => {
            events.push('commands-close');
          },
        },
      ],
      onStopAcceptingWork: () => {
        events.push('stop-accepting');
      },
      haltPulse: () => {
        events.push('halt-pulse');
      },
    });
    const first = await runtime.requestShutdown('manual');
    const second = await runtime.requestShutdown('manual');
    expect(first).toEqual(second);
    expect(events).toEqual(['stop-accepting', 'halt-pulse', 'ledger-close', 'commands-close']);
    expect(runtime.getState()).toBe('stopped');
  });

  it('preserves fatal shutdown as a non-success receipt', async () => {
    const runtime = new BoundedRuntimeManager();
    const receipt = await runtime.requestShutdown('fatal');
    expect(receipt.exitCode).toBe(1);
    expect(receipt.reason).toBe('fatal');
  });

  it('enforces an active-cycle quota without terminating the process', async () => {
    const runtime = new BoundedRuntimeManager({
      maxActiveCycles: 2,
      getActiveCycles: () => 3,
    });
    await runtime.enforceQuotas();
    expect(runtime.getState()).toBe('stopped');
  });

  it('installs and removes signal handlers idempotently', () => {
    const listeners = new Map<string, Set<(...args: any[]) => void>>();
    const fakeProcess = {
      on(event: string, listener: (...args: any[]) => void) {
        const set = listeners.get(event) ?? new Set();
        set.add(listener);
        listeners.set(event, set);
      },
      off(event: string, listener: (...args: any[]) => void) {
        listeners.get(event)?.delete(listener);
      },
    };
    const runtime = new BoundedRuntimeManager();
    runtime.installProcessHandlers(fakeProcess);
    runtime.installProcessHandlers(fakeProcess);
    expect([...listeners.values()].reduce((sum, set) => sum + set.size, 0)).toBe(4);
    runtime.uninstallProcessHandlers(fakeProcess);
    expect([...listeners.values()].reduce((sum, set) => sum + set.size, 0)).toBe(0);
  });
});
