import { MiniKernel } from './index.js';
import { MiniCycleResult } from '@omega-v/types';

/** Finite lifecycle for the repository's computer-like control plane. */
export type OperatingSystemState =
  | 'offline'
  | 'booting'
  | 'ready'
  | 'degraded'
  | 'stopping'
  | 'stopped';

export type OSKernelState = 'COLD' | 'BOOTED' | 'PROCESSING' | 'STOPPED';

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
  type: 'boot' | 'admit' | 'complete' | 'degrade' | 'reject' | 'stop';
  state: OperatingSystemState;
  taskId?: string;
  reason?: string;
};

export type OperatingSystemOptions = {
  /** Maximum number of tasks that may be retained in one bounded runtime. */
  maxTasks?: number;
  /** Maximum number of events retained in the deterministic runtime trace. */
  maxEvents?: number;
  /** Optional underlying MiniKernel for cycle admission. */
  kernel?: MiniKernel;
};

export type OperatingSystemCapabilities = {
  shellExecution: false;
  remoteMutation: false;
  credentialHandling: false;
  humanAuthorizationRequired: true;
};

export interface OSKernelSnapshot {
  totalCycles: number;
  passedCycles: number;
  failedCycles: number;
  memorySize: number;
  memoryIntegrity: boolean;
  snapshotAt: string;
}

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
} & OSKernelSnapshot;

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
  private readonly miniKernel?: MiniKernel;
  private state: OperatingSystemState = 'offline';
  private tasks: OperatingSystemTask[] = [];
  private events: OperatingSystemEvent[] = [];
  private nextTaskSequence = 1;
  private nextEventSequence = 1;

  private totalCycles = 0;
  private passedCycles = 0;
  private failedCycles = 0;

  public constructor(optionsOrKernel: OperatingSystemOptions | MiniKernel = {}) {
    if (optionsOrKernel && 'cycle' in optionsOrKernel && typeof (optionsOrKernel as MiniKernel).cycle === 'function') {
      this.miniKernel = optionsOrKernel as MiniKernel;
      this.maxTasks = DEFAULT_MAX_TASKS;
      this.maxEvents = DEFAULT_MAX_EVENTS;
    } else {
      const opts = optionsOrKernel as OperatingSystemOptions;
      this.maxTasks = opts.maxTasks ?? DEFAULT_MAX_TASKS;
      this.maxEvents = opts.maxEvents ?? DEFAULT_MAX_EVENTS;
      this.miniKernel = opts.kernel;
      if (!Number.isInteger(this.maxTasks) || this.maxTasks < 1) {
        throw new Error('maxTasks must be a positive integer');
      }
      if (!Number.isInteger(this.maxEvents) || this.maxEvents < 1) {
        throw new Error('maxEvents must be a positive integer');
      }
    }
  }

  public getState(): OSKernelState {
    if (this.state === 'offline') return 'COLD';
    if (this.state === 'ready' || this.state === 'booting') return 'BOOTED';
    if (this.state === 'stopping' || this.state === 'stopped') return 'STOPPED';
    return 'PROCESSING';
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
  ): OperatingSystemTask;
  public admit(cycleInput: {
    claim: string;
    category?: string;
    source?: { system: string; version: string; environment: string };
    observedBy?: string;
    metadata?: Record<string, unknown>;
  }): MiniCycleResult;
  public admit(
    kindOrCycleInput: OperatingSystemTaskKind | { claim: string; [k: string]: unknown },
    input?: Record<string, unknown>,
    requestedBy?: string
  ): OperatingSystemTask | MiniCycleResult {
    if (typeof kindOrCycleInput === 'object' && kindOrCycleInput !== null) {
      if (this.state !== 'ready') {
        throw new Error(`Cannot admit: kernel is in state '${this.getState()}' (expected 'BOOTED')`);
      }
      if (!this.miniKernel) {
        throw new Error('MiniKernel not configured for OperatingSystemKernel');
      }
      try {
        const result = this.miniKernel.cycle(kindOrCycleInput);
        this.totalCycles++;
        if (result.passed) {
          this.passedCycles++;
        } else {
          this.failedCycles++;
        }
        return result;
      } catch (err) {
        this.totalCycles++;
        this.failedCycles++;
        throw err;
      }
    }

    const kind = kindOrCycleInput as OperatingSystemTaskKind;
    if (this.state !== 'ready') {
      const reason = `cannot admit task while operating system is ${this.state}`;
      this.record({ type: 'reject', state: this.state, reason });
      throw new Error(reason);
    }
    if (!OPERATING_SYSTEM_TASK_KINDS.includes(kind)) {
      const reason = `unsupported operating system task kind: ${String(kind)}`;
      this.record({ type: 'reject', state: this.state, reason });
      throw new Error(reason);
    }
    if (!isBoundedTaskInput(input!)) {
      const reason = `operating system task input must contain at most ${MAX_TASK_INPUT_KEYS} keys`;
      this.record({ type: 'reject', state: this.state, reason });
      throw new Error(reason);
    }
    if (
      typeof requestedBy !== 'string' ||
      requestedBy.trim().length === 0 ||
      requestedBy.length > MAX_REQUESTER_LENGTH
    ) {
      const reason = `operating system task requester must be 1-${MAX_REQUESTER_LENGTH} characters`;
      this.record({ type: 'reject', state: this.state, reason });
      throw new Error(reason);
    }
    if (this.tasks.length >= this.maxTasks) {
      this.state = 'degraded';
      this.record({ type: 'degrade', state: 'degraded', reason: 'task limit reached' });
      const reason = 'operating system task limit reached';
      this.record({ type: 'reject', state: this.state, reason });
      throw new Error(reason);
    }
    const task: OperatingSystemTask = {
      id: `task-${this.nextTaskSequence++}`,
      kind,
      input: cloneTaskInput(input!),
      requestedBy,
    };
    this.tasks.push(task);
    this.record({ type: 'admit', state: this.state, taskId: task.id });
    return { ...task, input: cloneTaskInput(task.input) };
  }

  public complete(taskId: string): OperatingSystemSnapshot;
  public complete(cycleInput: {
    claim: string;
    category?: string;
    source?: { system: string; version: string; environment: string };
    observedBy?: string;
    metadata?: Record<string, unknown>;
  }): MiniCycleResult;
  public complete(
    taskIdOrInput: string | { claim: string; [k: string]: unknown }
  ): OperatingSystemSnapshot | MiniCycleResult {
    if (typeof taskIdOrInput === 'string') {
      const index = this.tasks.findIndex((task) => task.id === taskIdOrInput);
      if (index < 0) {
        throw new Error(`unknown operating system task: ${taskIdOrInput}`);
      }
      this.tasks.splice(index, 1);
      if (this.state === 'degraded') {
        this.state = 'ready';
      }
      this.record({ type: 'complete', state: this.state, taskId: taskIdOrInput });
      return this.snapshot();
    }
    return this.admit(taskIdOrInput);
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

  public getKernel(): MiniKernel | undefined {
    return this.miniKernel;
  }

  public snapshot(): OperatingSystemSnapshot {
    const effectiveState = this.miniKernel
      ? (this.state === 'ready' ? 'BOOTED' : this.state === 'offline' ? 'COLD' : this.state === 'stopped' ? 'STOPPED' : this.state)
      : this.state;
    return {
      snapshotVersion: 'os.snapshot.v1',
      state: effectiveState as OperatingSystemState,
      tasks: this.tasks.map((task) => ({ ...task, input: cloneTaskInput(task.input) })),
      events: this.events.map((event) => ({ ...event })),
      limits: { maxTasks: this.maxTasks, maxEvents: this.maxEvents },
      capabilities: { ...OPERATING_SYSTEM_CAPABILITIES },
      totalCycles: this.totalCycles,
      passedCycles: this.passedCycles,
      failedCycles: this.failedCycles,
      memorySize: this.miniKernel ? this.miniKernel.getMemorySize() : 0,
      memoryIntegrity: this.miniKernel ? this.miniKernel.verifyMemoryIntegrity() : true,
      snapshotAt: new Date().toISOString(),
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
