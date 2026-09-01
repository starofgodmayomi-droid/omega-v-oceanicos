import { OperatingSystemKernel } from './os.js';

describe('OperatingSystemKernel', () => {
  it('boots idempotently into a ready state with a trace', () => {
    const os = new OperatingSystemKernel();

    expect(os.snapshot().state).toBe('offline');
    expect(os.boot().state).toBe('ready');
    expect(os.boot().state).toBe('ready');
    expect(os.snapshot().events.map((event) => event.state)).toEqual(['booting', 'ready']);
  });

  it('declares finite read-only capabilities', () => {
    expect(new OperatingSystemKernel().snapshot().capabilities).toEqual({
      shellExecution: false,
      remoteMutation: false,
      credentialHandling: false,
      humanAuthorizationRequired: true,
    });
  });

  it('admits typed bounded tasks and completes them', () => {
    const os = new OperatingSystemKernel({ maxTasks: 1 });
    os.boot();

    const task = os.admit('observe', { claim: 'service is healthy' }, 'operator');
    expect(task.kind).toBe('observe');
    expect(task.id).toBe('task-1');
    expect(os.snapshot().tasks).toHaveLength(1);

    expect(os.complete(task.id).state).toBe('ready');
    expect(os.snapshot().tasks).toHaveLength(0);
  });

  it('rejects invalid task boundaries at runtime', () => {
    const os = new OperatingSystemKernel();
    os.boot();

    expect(() => os.admit('execute' as never, {}, 'operator')).toThrow(
      'unsupported operating system task kind'
    );
    expect(() => os.admit('observe', {}, '   ')).toThrow('task requester must be');
    expect(() => os.admit('observe', {}, 'x'.repeat(129))).toThrow('task requester must be');
    expect(() =>
      os.admit(
        'observe',
        Object.fromEntries(Array.from({ length: 65 }, (_, index) => [`key-${index}`, index])),
        'operator'
      )
    ).toThrow('task input must contain at most 64 keys');
  });

  it('fails closed when the task bound is reached', () => {
    const os = new OperatingSystemKernel({ maxTasks: 1 });
    os.boot();
    os.admit('verify', {}, 'operator');

    expect(() => os.admit('report', {}, 'operator')).toThrow('task limit reached');
    expect(os.snapshot().state).toBe('degraded');
  });

  it('retains only the configured finite event trace', () => {
    const os = new OperatingSystemKernel({ maxEvents: 2 });
    os.boot();
    const task = os.admit('remember', {}, 'operator');

    expect(os.snapshot().events).toHaveLength(2);
    expect(os.snapshot().events[0].sequence).toBe(2);
    expect(os.snapshot().events[1].sequence).toBe(3);
    os.complete(task.id);
    expect(os.snapshot().events).toHaveLength(2);
    expect(os.snapshot().events.map((event) => event.sequence)).toEqual([3, 4]);
  });

  it('stops deterministically and clears admitted work', () => {
    const os = new OperatingSystemKernel();
    os.boot();
    os.admit('report', { format: 'json' }, 'operator');

    expect(os.stop().state).toBe('stopped');
    expect(os.snapshot().tasks).toHaveLength(0);
    expect(os.stop().state).toBe('stopped');
  });

  it('rejects task admission while offline or stopped', () => {
    const os = new OperatingSystemKernel();

    expect(() => os.admit('observe', {}, 'operator')).toThrow('operating system is offline');
    os.boot();
    os.stop();
    expect(() => os.admit('observe', {}, 'operator')).toThrow('operating system is stopped');
  });
});
