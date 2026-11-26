import { createHash } from 'node:crypto';

export type PluralisticFlowStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'BLOCKED'
  | 'REVIEW_REQUIRED';

export type PluralisticFlowTask = {
  id: string;
  organ: string;
  title: string;
  dependsOn?: string[];
  conflictKey?: string;
  requiresApproval?: boolean;
  run: (context: {
    runId: string;
    taskId: string;
    outputs: Readonly<Record<string, unknown>>;
  }) => Promise<unknown> | unknown;
};

export type PluralisticFlowEvent = {
  sequence: number;
  taskId: string;
  organ: string;
  status: Exclude<PluralisticFlowStatus, 'QUEUED'>;
  workerSlot: number | null;
  at: string;
  message: string;
  outputDigest?: string;
};

export type PluralisticFlowOptions = {
  runId?: string;
  maxConcurrency?: number;
  maxTasks?: number;
  now?: () => string;
  approveTask?: (task: PluralisticFlowTask) => boolean;
};

export type PluralisticFlowReceipt = {
  id: string;
  organ: string;
  status: PluralisticFlowStatus;
  outputDigest?: string;
  error?: string;
};

export type PluralisticFlowResult = {
  runId: string;
  state: 'SUCCEEDED' | 'PARTIAL' | 'FAILED' | 'REVIEW_REQUIRED';
  maxConcurrency: number;
  total: number;
  started: number;
  succeeded: number;
  failed: number;
  blocked: number;
  reviewRequired: number;
  tasks: PluralisticFlowReceipt[];
  results: Record<string, { value: unknown; digest: string }>;
  events: PluralisticFlowEvent[];
  limitations: string[];
};

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const terminal = new Set<PluralisticFlowStatus>([
  'SUCCEEDED',
  'FAILED',
  'BLOCKED',
  'REVIEW_REQUIRED',
]);

function boundedInteger(value: number, name: string, maximum: number): number {
  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    throw new Error(`${name} must be an integer between 1 and ${maximum}`);
  }
  return value;
}

function validateGraph(tasks: PluralisticFlowTask[], maxTasks: number): void {
  if (!Array.isArray(tasks) || tasks.length === 0) throw new Error('at least one task is required');
  if (tasks.length > maxTasks) throw new Error(`task count exceeds maxTasks=${maxTasks}`);

  const byId = new Map<string, PluralisticFlowTask>();
  for (const task of tasks) {
    if (!task || !IDENTIFIER.test(task.id) || task.id.length > 96) throw new Error('task id is invalid');
    if (!IDENTIFIER.test(task.organ) || task.organ.length > 48) throw new Error(`task organ is invalid: ${task.id}`);
    if (typeof task.title !== 'string' || task.title.trim().length === 0 || task.title.length > 160) {
      throw new Error(`task title is invalid: ${task.id}`);
    }
    if (typeof task.run !== 'function') throw new Error(`task runner is invalid: ${task.id}`);
    if (task.conflictKey !== undefined && (!IDENTIFIER.test(task.conflictKey) || task.conflictKey.length > 96)) {
      throw new Error(`task conflictKey is invalid: ${task.id}`);
    }
    if (byId.has(task.id)) throw new Error(`duplicate task id: ${task.id}`);
    byId.set(task.id, task);
  }

  const indegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  for (const task of tasks) {
    const dependencies = task.dependsOn ?? [];
    if (!Array.isArray(dependencies) || new Set(dependencies).size !== dependencies.length) {
      throw new Error(`task dependencies are invalid: ${task.id}`);
    }
    indegree.set(task.id, dependencies.length);
    for (const dependency of dependencies) {
      if (!byId.has(dependency) || dependency === task.id) {
        throw new Error(`unknown or self dependency: ${task.id} -> ${dependency}`);
      }
      const list = dependents.get(dependency) ?? [];
      list.push(task.id);
      dependents.set(dependency, list);
    }
  }

  const ready = [...indegree].filter(([, count]) => count === 0).map(([id]) => id);
  let visited = 0;
  while (ready.length) {
    const id = ready.shift()!;
    visited += 1;
    for (const dependent of dependents.get(id) ?? []) {
      const next = (indegree.get(dependent) ?? 0) - 1;
      indegree.set(dependent, next);
      if (next === 0) ready.push(dependent);
    }
  }
  if (visited !== tasks.length) throw new Error('dependency cycle detected');
}

/**
 * Dependency-aware local flow scheduler for the ΔVRØ House.
 * Independent tasks may run concurrently; dependencies and shared conflict
 * keys serialize work. This is a local process scheduler, not a distributed
 * queue or an authorization provider.
 */
export class PluralisticFlowExecutor {
  private readonly maxConcurrency: number;
  private readonly maxTasks: number;
  private readonly runId: string;
  private readonly now: () => string;
  private readonly approveTask?: (task: PluralisticFlowTask) => boolean;

  constructor(options: PluralisticFlowOptions = {}) {
    this.maxConcurrency = boundedInteger(options.maxConcurrency ?? 4, 'maxConcurrency', 16);
    this.maxTasks = boundedInteger(options.maxTasks ?? 64, 'maxTasks', 128);
    this.runId = options.runId ?? `house-${Date.now()}`;
    if (!IDENTIFIER.test(this.runId) || this.runId.length > 96) throw new Error('runId is invalid');
    this.now = options.now ?? (() => new Date().toISOString());
    this.approveTask = options.approveTask;
  }

  async execute(tasks: PluralisticFlowTask[]): Promise<PluralisticFlowResult> {
    validateGraph(tasks, this.maxTasks);

    const states = new Map<string, PluralisticFlowStatus>(tasks.map((task) => [task.id, 'QUEUED']));
    const results: Record<string, { value: unknown; digest: string }> = {};
    const errors: Record<string, string> = {};
    const events: PluralisticFlowEvent[] = [];
    const active = new Map<string, Promise<void>>();
    const locks = new Set<string>();
    let sequence = 0;
    let started = 0;

    const record = (
      task: PluralisticFlowTask,
      status: Exclude<PluralisticFlowStatus, 'QUEUED'>,
      workerSlot: number | null,
      message: string,
      outputDigest?: string,
    ) => {
      states.set(task.id, status);
      events.push({
        sequence: ++sequence,
        taskId: task.id,
        organ: task.organ,
        status,
        workerSlot,
        at: this.now(),
        message: message.slice(0, 240),
        ...(outputDigest ? { outputDigest } : {}),
      });
    };

    const dependenciesSucceeded = (task: PluralisticFlowTask) =>
      (task.dependsOn ?? []).every((id) => states.get(id) === 'SUCCEEDED');

    const start = (task: PluralisticFlowTask): void => {
      const slot = active.size;
      started += 1;
      record(task, 'RUNNING', slot, 'Dispatched by bounded dependency-aware House scheduler');
      if (task.conflictKey) locks.add(task.conflictKey);

      const promise = Promise.resolve()
        .then(() => task.run({
          runId: this.runId,
          taskId: task.id,
          outputs: Object.fromEntries(Object.entries(results).map(([id, item]) => [id, item.value])),
        }))
        .then((value) => {
          const serialized = JSON.stringify(value);
          if (typeof serialized !== 'string') throw new Error('TASK_RESULT_NOT_JSON_SERIALIZABLE');
          const digest = createHash('sha256').update(serialized, 'utf8').digest('hex');
          results[task.id] = { value, digest };
          record(task, 'SUCCEEDED', slot, 'Task output serialized and SHA-256 digested', digest);
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : 'Task failed with an unknown error';
          errors[task.id] = message.slice(0, 240);
          record(task, 'FAILED', slot, message);
        })
        .finally(() => {
          if (task.conflictKey) locks.delete(task.conflictKey);
          active.delete(task.id);
        });

      active.set(task.id, promise);
    };

    while (true) {
      let changed = true;
      while (changed) {
        changed = false;
        for (const task of tasks) {
          if (states.get(task.id) !== 'QUEUED') continue;
          const dependencyStates = (task.dependsOn ?? []).map((id) => states.get(id)!);
          if (dependencyStates.some((state) => terminal.has(state) && state !== 'SUCCEEDED')) {
            record(task, 'BLOCKED', null, 'A dependency did not reach SUCCEEDED');
            changed = true;
            continue;
          }
          if (dependenciesSucceeded(task) && task.requiresApproval && !this.approveTask?.(task)) {
            record(task, 'REVIEW_REQUIRED', null, 'Human approval is required; no action was executed');
            changed = true;
          }
        }
      }

      const ready = tasks.filter((task) =>
        states.get(task.id) === 'QUEUED' &&
        dependenciesSucceeded(task) &&
        (!task.conflictKey || !locks.has(task.conflictKey))
      );
      for (const task of ready) {
        if (active.size >= this.maxConcurrency) break;
        if (task.conflictKey && locks.has(task.conflictKey)) continue;
        start(task);
      }

      if (active.size === 0) {
        if (tasks.every((task) => terminal.has(states.get(task.id)!))) break;
        for (const task of tasks) {
          if (states.get(task.id) === 'QUEUED') {
            record(task, 'BLOCKED', null, 'No runnable dependency path remains');
          }
        }
        break;
      }

      await Promise.race(active.values());
    }

    const receipts = tasks.map((task) => ({
      id: task.id,
      organ: task.organ,
      status: states.get(task.id)!,
      ...(results[task.id] ? { outputDigest: results[task.id].digest } : {}),
      ...(errors[task.id] ? { error: errors[task.id] } : {}),
    }));
    const succeeded = receipts.filter((item) => item.status === 'SUCCEEDED').length;
    const failed = receipts.filter((item) => item.status === 'FAILED').length;
    const blocked = receipts.filter((item) => item.status === 'BLOCKED').length;
    const reviewRequired = receipts.filter((item) => item.status === 'REVIEW_REQUIRED').length;
    const state = failed > 0
      ? (succeeded === 0 ? 'FAILED' : 'PARTIAL')
      : reviewRequired > 0
        ? 'REVIEW_REQUIRED'
        : blocked > 0
          ? 'PARTIAL'
          : 'SUCCEEDED';

    return {
      runId: this.runId,
      state,
      maxConcurrency: this.maxConcurrency,
      total: tasks.length,
      started,
      succeeded,
      failed,
      blocked,
      reviewRequired,
      tasks: receipts,
      results,
      events,
      limitations: [
        'Local in-process scheduling only; no durable or distributed queue is implied.',
        'Task output hashes prove byte integrity, not the truth of external claims.',
        'Tasks marked requiresApproval are not executed without a server-side approval callback.',
        'External browser, connector, deployment, and payment actions require separately configured adapters and authority.',
      ],
    };
  }
}
