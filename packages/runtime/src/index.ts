export type AgentContext = {
  runId: string;
  input: string;
  values: Record<string, unknown>;
};

export type AgentModule = {
  id: string;
  execute: (context: AgentContext) => Promise<unknown> | unknown;
};

export type LoopTrace = {
  moduleId: string;
  state: 'started' | 'succeeded' | 'failed';
  elapsedMs: number;
  message?: string;
};

export type AgentLoopResult = {
  runId: string;
  state: 'succeeded' | 'failed';
  context: AgentContext;
  trace: LoopTrace[];
  elapsedMs: number;
  limitations: string[];
};

const MODULE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/;

/** A synchronous-by-default modular loop: no network, timers, or hidden retries. */
export class AgentLoop {
  constructor(
    private readonly modules: AgentModule[],
    private readonly now = () => performance.now()
  ) {
    if (modules.length < 1 || modules.length > 32)
      throw new Error('modules must contain 1 to 32 entries');
    const ids = new Set<string>();
    for (const module of modules) {
      if (!MODULE_ID.test(module.id) || ids.has(module.id))
        throw new Error('module ids must be unique bounded identifiers');
      if (typeof module.execute !== 'function')
        throw new Error(`module ${module.id} is not executable`);
      ids.add(module.id);
    }
  }

  async run(input: string, runId = `agent-${Date.now()}`): Promise<AgentLoopResult> {
    if (!input.trim() || input.length > 2000 || !MODULE_ID.test(runId))
      throw new Error('input and runId are bounded and required');
    const context: AgentContext = { runId, input, values: {} };
    const trace: LoopTrace[] = [];
    const startedAt = this.now();
    for (const module of this.modules) {
      const moduleStarted = this.now();
      trace.push({ moduleId: module.id, state: 'started', elapsedMs: 0 });
      try {
        context.values[module.id] = await module.execute(context);
        trace.push({
          moduleId: module.id,
          state: 'succeeded',
          elapsedMs: this.now() - moduleStarted,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'module failed';
        trace.push({
          moduleId: module.id,
          state: 'failed',
          elapsedMs: this.now() - moduleStarted,
          message: message.slice(0, 240),
        });
        return {
          runId,
          state: 'failed',
          context,
          trace,
          elapsedMs: this.now() - startedAt,
          limitations: AgentLoop.limitations(),
        };
      }
    }
    return {
      runId,
      state: 'succeeded',
      context,
      trace,
      elapsedMs: this.now() - startedAt,
      limitations: AgentLoop.limitations(),
    };
  }

  static limitations(): string[] {
    return [
      'local process only',
      'sequential module contract',
      'no autonomous side effects or authorization',
      'elapsed time is an observation, not a zero-latency guarantee',
    ];
  }
}

export type MemoryRecord<T = unknown> = {
  id: string;
  runId: string;
  kind: string;
  value: T;
  createdAt: string;
};

/** Bounded append-only memory fabric for hot-path runtime state. */
export class MemoryFabric<T = unknown> {
  private readonly records: MemoryRecord<T>[] = [];
  constructor(
    private readonly maxEntries = 256,
    private readonly now = () => new Date().toISOString()
  ) {
    if (!Number.isInteger(maxEntries) || maxEntries < 1 || maxEntries > 10000)
      throw new Error('maxEntries must be between 1 and 10000');
  }

  remember(record: Omit<MemoryRecord<T>, 'createdAt'> & { createdAt?: string }): MemoryRecord<T> {
    if (!MODULE_ID.test(record.id) || !MODULE_ID.test(record.runId) || !record.kind.trim())
      throw new Error('memory identifiers and kind are required');
    const stored = { ...record, createdAt: record.createdAt ?? this.now() };
    this.records.push(stored);
    if (this.records.length > this.maxEntries)
      this.records.splice(0, this.records.length - this.maxEntries);
    return stored;
  }

  recall(runId?: string): MemoryRecord<T>[] {
    return this.records
      .filter((record) => runId === undefined || record.runId === runId)
      .map((record) => ({ ...record }));
  }

  size(): number {
    return this.records.length;
  }
  clear(): void {
    this.records.length = 0;
  }
}
