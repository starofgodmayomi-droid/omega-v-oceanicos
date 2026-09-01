/** Finite lifecycle for the repository's computer-like control plane. */
export type OperatingSystemState =
  'offline' | 'booting' | 'ready' | 'degraded' | 'stopping' | 'stopped';

/** A bounded task admitted to the OS kernel. Arbitrary shell execution is intentionally excluded. */
export type OperatingSystemTaskKind = 'observe' | 'verify' | 'remember' | 'report';

export type OperatingSystemTask = {
  id: string;
  kind: OperatingSystemTaskKind;
  input: Record<string, unknown>;
  requestedBy: string;
};

export type OperatingSystemEvent = {
  sequence: number;
  type: 'boot' | 'admit' | 'complete' | 'degrade' | 'stop';
  state: OperatingSystemState;
  taskId?: string;
  reason?: string;
};

export type OperatingSystemOptions = {
  /** Maximum number of tasks that may be retained in one bounded runtime. */
  maxTasks?: number;
  /** Maximum number of events retained in the deterministic runtime trace. */
  maxEvents?: number;
};

export type OperatingSystemCapabilities = {
  shellExecution: false;
  remoteMutation: false;
  credentialHandling: false;
  humanAuthorizationRequired: true;
};

export type OperatingSystemSnapshot = {
  snapshotVersion: 'os.snapshot.v1';
  state: OperatingSystemState;
  tasks: OperatingSystemTask[];
  events: OperatingSystemEvent[];
  limits: {
    maxTasks: number;
    maxEvents: number;
  };
  capabilities: OperatingSystemCapabilities;
};

const DEFAULT_MAX_TASKS = 32;
const DEFAULT_MAX_EVENTS = 128;
const MAX_TASK_INPUT_KEYS = 64;
const MAX_TASK_INPUT_NODES = 256;
const MAX_TASK_INPUT_DEPTH = 8;
const MAX_REQUESTER_LENGTH = 128;
const OPERATING_SYSTEM_TASK_KINDS: readonly OperatingSystemTaskKind[] = [
  'observe',
  'verify',
  'remember',
  'report',
];
const OPERATING_SYSTEM_CAPABILITIES: OperatingSystemCapabilities = {
  shellExecution: false,
  remoteMutation: false,
  credentialHandling: false,
  humanAuthorizationRequired: true,
};

/**
 * A finite, deterministic control-plane kernel.
 *
 * This is an OS-like coordination boundary, not a general-purpose shell and
 * not an autonomous agent runtime. It admits only typed, bounded task kinds;
 * callers provide the execution logic at a higher layer.
 */
export class OperatingSystemKernel {
  private readonly maxTasks: number;
  private readonly maxEvents: number;
  private state: OperatingSystemState = 'offline';
  private tasks: OperatingSystemTask[] = [];
  private events: OperatingSystemEvent[] = [];
  private nextTaskSequence = 1;
  private nextEventSequence = 1;

  public constructor(options: OperatingSystemOptions = {}) {
    this.maxTasks = options.maxTasks ?? DEFAULT_MAX_TASKS;
    this.maxEvents = options.maxEvents ?? DEFAULT_MAX_EVENTS;
    if (!Number.isInteger(this.maxTasks) || this.maxTasks < 1) {
      throw new Error('maxTasks must be a positive integer');
    }
    if (!Number.isInteger(this.maxEvents) || this.maxEvents < 1) {
      throw new Error('maxEvents must be a positive integer');
    }
  }

  public boot(): OperatingSystemSnapshot {
    if (this.state !== 'offline' && this.state !== 'stopped') {
      return this.snapshot();
    }
    this.state = 'booting';
    this.record({ type: 'boot', state: 'booting' });
    this.state = 'ready';
    this.record({ type: 'boot', state: 'ready' });
    return this.snapshot();
  }

  public admit(
    kind: OperatingSystemTaskKind,
    input: Record<string, unknown>,
    requestedBy: string
  ): OperatingSystemTask {
    if (this.state !== 'ready') {
      throw new Error(`cannot admit task while operating system is ${this.state}`);
    }
    if (!OPERATING_SYSTEM_TASK_KINDS.includes(kind)) {
      throw new Error(`unsupported operating system task kind: ${String(kind)}`);
    }
    if (!isBoundedTaskInput(input)) {
      throw new Error(
        `operating system task input must contain at most ${MAX_TASK_INPUT_KEYS} keys`
      );
    }
    if (
      typeof requestedBy !== 'string' ||
      requestedBy.trim().length === 0 ||
      requestedBy.length > MAX_REQUESTER_LENGTH
    ) {
      throw new Error(
        `operating system task requester must be 1-${MAX_REQUESTER_LENGTH} characters`
      );
    }
    if (this.tasks.length >= this.maxTasks) {
      this.state = 'degraded';
      this.record({ type: 'degrade', state: 'degraded', reason: 'task limit reached' });
      throw new Error('operating system task limit reached');
    }
    const task: OperatingSystemTask = {
      id: `task-${this.nextTaskSequence++}`,
      kind,
      input: cloneTaskInput(input),
      requestedBy,
    };
    this.tasks.push(task);
    this.record({ type: 'admit', state: this.state, taskId: task.id });
    return { ...task, input: cloneTaskInput(task.input) };
  }

  public complete(taskId: string): OperatingSystemSnapshot {
    const index = this.tasks.findIndex((task) => task.id === taskId);
    if (index < 0) {
      throw new Error(`unknown operating system task: ${taskId}`);
    }
    this.tasks.splice(index, 1);
    if (this.state === 'degraded') {
      this.state = 'ready';
    }
    this.record({ type: 'complete', state: this.state, taskId });
    return this.snapshot();
  }

  public stop(): OperatingSystemSnapshot {
    if (this.state === 'stopped' || this.state === 'offline') {
      this.state = 'stopped';
      return this.snapshot();
    }
    this.state = 'stopping';
    this.record({ type: 'stop', state: 'stopping' });
    this.tasks = [];
    this.state = 'stopped';
    this.record({ type: 'stop', state: 'stopped' });
    return this.snapshot();
  }

  public snapshot(): OperatingSystemSnapshot {
    return {
      snapshotVersion: 'os.snapshot.v1',
      state: this.state,
      tasks: this.tasks.map((task) => ({ ...task, input: cloneTaskInput(task.input) })),
      events: this.events.map((event) => ({ ...event })),
      limits: { maxTasks: this.maxTasks, maxEvents: this.maxEvents },
      capabilities: { ...OPERATING_SYSTEM_CAPABILITIES },
    };
  }

  private record(event: Omit<OperatingSystemEvent, 'sequence'>): void {
    this.events.push({ sequence: this.nextEventSequence++, ...event });
    if (this.events.length > this.maxEvents) {
      this.events.splice(0, this.events.length - this.maxEvents);
    }
  }
}

function isBoundedTaskInput(input: Record<string, unknown>): boolean {
  return (
    typeof input === 'object' &&
    input !== null &&
    !Array.isArray(input) &&
    Object.keys(input).length <= MAX_TASK_INPUT_KEYS
  );
}

function cloneTaskInput(input: Record<string, unknown>): Record<string, unknown> {
  const seen = new WeakSet<object>();
  let nodes = 0;

  const clone = (value: unknown, depth: number): unknown => {
    if (value === null || typeof value !== 'object') return value;
    if (depth > MAX_TASK_INPUT_DEPTH) {
      throw new Error(`operating system task input exceeds depth ${MAX_TASK_INPUT_DEPTH}`);
    }
    if (seen.has(value)) throw new Error('operating system task input must not be cyclic');
    seen.add(value);
    nodes += 1;
    if (nodes > MAX_TASK_INPUT_NODES) {
      throw new Error(`operating system task input exceeds ${MAX_TASK_INPUT_NODES} nodes`);
    }

    if (Array.isArray(value)) return value.map((item) => clone(item, depth + 1));

    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      result[key] = clone(nested, depth + 1);
    }
    return result;
  };

  return clone(input, 0) as Record<string, unknown>;
}

export default OperatingSystemKernel;
