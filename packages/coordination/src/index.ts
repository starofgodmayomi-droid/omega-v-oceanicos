export type ExecutionRole = 'worker' | 'builder';
export type ExecutionState = 'queued' | 'running' | 'succeeded' | 'failed' | 'blocked';

export type ExecutionTask = {
  id: string;
  role: ExecutionRole;
  title: string;
  run: () => Promise<string>;
};

export type ExecutionEvent = {
  sequence: number;
  taskId: string;
  role: ExecutionRole;
  state: ExecutionState;
  workerSlot: number | null;
  at: string;
  message: string;
};

export type ExecutionSummary = {
  runId: string;
  state: 'succeeded' | 'failed' | 'blocked';
  maxConcurrency: number;
  started: number;
  succeeded: number;
  failed: number;
  blocked: number;
  results: Record<string, string>;
  events: ExecutionEvent[];
  limitations: string[];
};

export type ParallelExecutorOptions = {
  maxConcurrency?: number;
  maxTasks?: number;
  runId?: string;
  now?: () => string;
};

const DEFAULT_MAX_CONCURRENCY = 4;
const DEFAULT_MAX_TASKS = 32;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

const boundedInteger = (value: number, name: string, maximum: number): number => {
  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    throw new Error(`${name} must be an integer between 1 and ${maximum}`);
  }
  return value;
};

const validateTask = (task: ExecutionTask): void => {
  if (!IDENTIFIER.test(task.id) || task.id.length > 96) throw new Error('task id is invalid');
  if (!IDENTIFIER.test(task.title.replace(/ /g, '-')) || task.title.length > 160) {
    throw new Error('task title is invalid');
  }
  if (typeof task.run !== 'function') throw new Error('task run must be a function');
};

/**
 * A local bounded scheduler. It intentionally does not claim distributed
 * coordination, durability, retries, or autonomous authorization.
 */
export class ParallelExecutor {
  private readonly maxConcurrency: number;
  private readonly maxTasks: number;
  private readonly runId: string;
  private readonly now: () => string;

  constructor(options: ParallelExecutorOptions = {}) {
    this.maxConcurrency = boundedInteger(
      options.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY,
      'maxConcurrency',
      16
    );
    this.maxTasks = boundedInteger(options.maxTasks ?? DEFAULT_MAX_TASKS, 'maxTasks', 128);
    this.runId = options.runId ?? `run-${Date.now()}`;
    if (!IDENTIFIER.test(this.runId)) throw new Error('runId is invalid');
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async execute(tasks: ExecutionTask[]): Promise<ExecutionSummary> {
    if (tasks.length === 0) throw new Error('at least one task is required');
    if (tasks.length > this.maxTasks)
      throw new Error(`task count exceeds maxTasks=${this.maxTasks}`);
    const ids = new Set<string>();
    tasks.forEach((task) => {
      validateTask(task);
      if (ids.has(task.id)) throw new Error(`duplicate task id: ${task.id}`);
      ids.add(task.id);
    });

    const events: ExecutionEvent[] = [];
    const results: Record<string, string> = {};
    const states = new Map<string, ExecutionState>(tasks.map((task) => [task.id, 'queued']));
    let nextIndex = 0;
    let active = 0;
    let sequence = 0;
    let started = 0;
    let succeeded = 0;
    let failed = 0;

    const record = (
      task: ExecutionTask,
      state: ExecutionState,
      workerSlot: number | null,
      message: string
    ) => {
      states.set(task.id, state);
      events.push({
        sequence: ++sequence,
        taskId: task.id,
        role: task.role,
        state,
        workerSlot,
        at: this.now(),
        message,
      });
    };

    await new Promise<void>((resolve) => {
      const launch = (): void => {
        while (active < this.maxConcurrency && nextIndex < tasks.length) {
          const task = tasks[nextIndex++];
          const slot = active;
          active += 1;
          started += 1;
          record(task, 'running', slot, 'Task started by bounded local executor');
          void task
            .run()
            .then(
              (value) => {
                results[task.id] = value;
                succeeded += 1;
                record(task, 'succeeded', slot, 'Task completed');
              },
              (error: unknown) => {
                failed += 1;
                const message =
                  error instanceof Error ? error.message : 'Task failed with an unknown error';
                record(task, 'failed', slot, message.slice(0, 240));
              }
            )
            .finally(() => {
              active -= 1;
              if (nextIndex >= tasks.length && active === 0) resolve();
              else launch();
            });
        }
      };
      launch();
    });

    const state: ExecutionSummary['state'] = failed > 0 ? 'failed' : 'succeeded';
    return {
      runId: this.runId,
      state,
      maxConcurrency: this.maxConcurrency,
      started,
      succeeded,
      failed,
      blocked: [...states.values()].filter((value) => value === 'blocked').length,
      results,
      events,
      limitations: [
        'local process only',
        'no durable queue or distributed coordination',
        'human authorization remains outside this executor',
      ],
    };
  }
}

export const demoExecution = async (): Promise<ExecutionSummary> =>
  new ParallelExecutor({ maxConcurrency: 2, runId: 'demo-parallel-workers' }).execute([
    {
      id: 'observe-1',
      role: 'worker',
      title: 'Observe fixture one',
      run: async () => 'observation-1',
    },
    { id: 'verify-1', role: 'worker', title: 'Verify fixture one', run: async () => 'verified-1' },
    { id: 'build-1', role: 'builder', title: 'Build evidence bundle', run: async () => 'bundle-1' },
  ]);
