/**
 * Advanced Workflow Orchestration System
 * Enterprise-grade workflow definition, execution, and orchestration
 */

export type StepType = 'task' | 'decision' | 'parallel' | 'sequential' | 'delay';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type WorkflowStatus = 'draft' | 'running' | 'completed' | 'failed' | 'paused';
export type RetryPolicy = 'exponential' | 'linear' | 'none';

export interface WorkflowInput {
  [key: string]: any;
}

export interface WorkflowContext {
  workflowId: string;
  executionId: string;
  currentStep: number;
  status: WorkflowStatus;
  input: WorkflowInput;
  output: Record<string, any>;
  variables: Record<string, any>;
  startTime: number;
  endTime?: number;
}

export interface StepDefinition {
  id: string;
  name: string;
  type: StepType;
  handler?: string;
  nextStepId?: string;
  condition?: (context: WorkflowContext) => boolean;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  maxRetries?: number;
  metadata?: Record<string, any>;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  version: number;
  description: string;
  steps: StepDefinition[];
  startStepId: string;
  createdAt: number;
  updatedAt: number;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowVersion: number;
  status: WorkflowStatus;
  context: WorkflowContext;
  stepExecutions: StepExecution[];
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export interface StepExecution {
  id: string;
  stepId: string;
  stepName: string;
  status: StepStatus;
  startTime: number;
  endTime?: number;
  duration?: number;
  result?: any;
  error?: string;
  retryCount: number;
}

export interface WorkflowAuditLog {
  id: string;
  executionId: string;
  event: string;
  stepId?: string;
  status: StepStatus | WorkflowStatus;
  details: Record<string, any>;
  timestamp: number;
}

export interface WorkflowDefinitionRegistry {
  [workflowId: string]: WorkflowDefinition[];
}

/**
 * StepExecutor: Execute individual workflow steps
 */
export class StepExecutor {
  private handlers: Map<string, (context: WorkflowContext, input: any) => Promise<any>> = new Map();

  registerHandler(
    name: string,
    handler: (context: WorkflowContext, input: any) => Promise<any>
  ): void {
    this.handlers.set(name, handler);
  }

  async executeStep(step: StepDefinition, context: WorkflowContext): Promise<any> {
    if (step.condition && !step.condition(context)) {
      return { skipped: true };
    }

    if (step.type === 'delay') {
      const delay = step.metadata?.duration || 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return { delayed: delay };
    }

    if (step.type === 'decision') {
      return { decision: step.metadata?.value || true };
    }

    if (step.handler) {
      const handler = this.handlers.get(step.handler);
      if (!handler) {
        throw new Error(`Handler not found: ${step.handler}`);
      }

      return await handler(context, step.metadata?.input);
    }

    return { completed: true };
  }

  async executeWithRetry(
    step: StepDefinition,
    context: WorkflowContext,
    currentRetry: number = 0
  ): Promise<{ result: any; retryCount: number }> {
    try {
      const result = await this.executeStep(step, context);
      return { result, retryCount: currentRetry };
    } catch (error) {
      const maxRetries = step.maxRetries || 0;
      const policy = step.retryPolicy || 'none';

      if (currentRetry < maxRetries && policy !== 'none') {
        const delay = this.calculateDelay(policy, currentRetry);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.executeWithRetry(step, context, currentRetry + 1);
      }

      throw error;
    }
  }

  private calculateDelay(policy: RetryPolicy, retryCount: number): number {
    if (policy === 'exponential') {
      return Math.pow(2, retryCount) * 1000;
    }

    if (policy === 'linear') {
      return (retryCount + 1) * 1000;
    }

    return 0;
  }

  async clear(): Promise<void> {
    this.handlers.clear();
  }
}

/**
 * TaskManager: Manage individual workflow tasks
 */
export class TaskManager {
  private stepExecutions: Map<string, StepExecution> = new Map();
  private executionIndex: Map<string, StepExecution[]> = new Map();

  createStepExecution(stepId: string, stepName: string): StepExecution {
    const execution: StepExecution = {
      id: `step_exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      stepId,
      stepName,
      status: 'pending',
      startTime: Date.now(),
      retryCount: 0,
    };

    this.stepExecutions.set(execution.id, execution);
    return execution;
  }

  startStepExecution(executionId: string): StepExecution | undefined {
    const execution = this.stepExecutions.get(executionId);
    if (execution) {
      execution.status = 'running';
    }
    return execution;
  }

  completeStepExecution(executionId: string, result: any): StepExecution | undefined {
    const execution = this.stepExecutions.get(executionId);
    if (execution) {
      execution.status = 'completed';
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      execution.result = result;
    }
    return execution;
  }

  failStepExecution(executionId: string, error: string): StepExecution | undefined {
    const execution = this.stepExecutions.get(executionId);
    if (execution) {
      execution.status = 'failed';
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      execution.error = error;
    }
    return execution;
  }

  skipStepExecution(executionId: string): StepExecution | undefined {
    const execution = this.stepExecutions.get(executionId);
    if (execution) {
      execution.status = 'skipped';
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
    }
    return execution;
  }

  getStepExecution(executionId: string): StepExecution | undefined {
    return this.stepExecutions.get(executionId);
  }

  getStepExecutionsByWorkflow(workflowExecutionId: string): StepExecution[] {
    return this.executionIndex.get(workflowExecutionId) || [];
  }

  addStepToWorkflow(workflowExecutionId: string, stepExecution: StepExecution): void {
    if (!this.executionIndex.has(workflowExecutionId)) {
      this.executionIndex.set(workflowExecutionId, []);
    }
    this.executionIndex.get(workflowExecutionId)!.push(stepExecution);
  }

  async clear(): Promise<void> {
    this.stepExecutions.clear();
    this.executionIndex.clear();
  }
}

/**
 * WorkflowEngine: Execute workflows step by step
 */
export class WorkflowEngine {
  private definitions: Map<string, WorkflowDefinition[]> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private executionIndex: Map<string, WorkflowExecution[]> = new Map();

  constructor(
    private stepExecutor: StepExecutor,
    private taskManager: TaskManager
  ) {}

  registerWorkflow(definition: WorkflowDefinition): void {
    if (!this.definitions.has(definition.id)) {
      this.definitions.set(definition.id, []);
    }

    const versions = this.definitions.get(definition.id)!;
    const existingIndex = versions.findIndex((d) => d.version === definition.version);

    if (existingIndex >= 0) {
      versions[existingIndex] = definition;
    } else {
      versions.push(definition);
      versions.sort((a, b) => b.version - a.version);
    }
  }

  getLatestWorkflowDefinition(workflowId: string): WorkflowDefinition | undefined {
    const versions = this.definitions.get(workflowId);
    return versions ? versions[0] : undefined;
  }

  createExecution(workflowId: string, input: WorkflowInput): WorkflowExecution {
    const definition = this.getLatestWorkflowDefinition(workflowId);
    if (!definition) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const context: WorkflowContext = {
      workflowId,
      executionId: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      currentStep: 0,
      status: 'running',
      input,
      output: {},
      variables: {},
      startTime: Date.now(),
    };

    const execution: WorkflowExecution = {
      id: context.executionId,
      workflowId,
      workflowVersion: definition.version,
      status: 'running',
      context,
      stepExecutions: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.executions.set(execution.id, execution);

    if (!this.executionIndex.has(workflowId)) {
      this.executionIndex.set(workflowId, []);
    }
    this.executionIndex.get(workflowId)!.push(execution);

    return execution;
  }

  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  getExecutionsByWorkflow(workflowId: string): WorkflowExecution[] {
    return this.executionIndex.get(workflowId) || [];
  }

  async executeStep(executionId: string, stepId: string): Promise<StepExecution> {
    const execution = this.getExecution(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    const definition = this.getLatestWorkflowDefinition(execution.workflowId);
    if (!definition) {
      throw new Error(`Workflow definition not found`);
    }

    const step = definition.steps.find((s) => s.id === stepId);
    if (!step) {
      throw new Error(`Step not found: ${stepId}`);
    }

    const stepExecution = this.taskManager.createStepExecution(step.id, step.name);
    this.taskManager.addStepToWorkflow(executionId, stepExecution);
    execution.stepExecutions.push(stepExecution);

    this.taskManager.startStepExecution(stepExecution.id);

    try {
      const { result, retryCount } = await this.stepExecutor.executeWithRetry(
        step,
        execution.context
      );
      stepExecution.retryCount = retryCount;

      this.taskManager.completeStepExecution(stepExecution.id, result);
      execution.context.output[step.id] = result;
    } catch (error) {
      this.taskManager.failStepExecution(
        stepExecution.id,
        error instanceof Error ? error.message : String(error)
      );
      execution.status = 'failed';
    }

    execution.updatedAt = Date.now();
    return stepExecution;
  }

  async executeWorkflow(executionId: string): Promise<WorkflowExecution> {
    const execution = this.getExecution(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    const definition = this.getLatestWorkflowDefinition(execution.workflowId);
    if (!definition) {
      throw new Error(`Workflow definition not found`);
    }

    let currentStepId: string | undefined = definition.startStepId;
    execution.context.status = 'running';

    while (currentStepId && execution.status !== 'failed') {
      const step = definition.steps.find((s) => s.id === currentStepId);
      if (!step) break;

      await this.executeStep(executionId, currentStepId);

      currentStepId = step.nextStepId;
    }

    if (execution.status !== 'failed') {
      execution.status = 'completed';
      execution.context.status = 'completed';
      execution.completedAt = Date.now();
    }

    execution.updatedAt = Date.now();
    return execution;
  }

  pauseExecution(executionId: string): boolean {
    const execution = this.getExecution(executionId);
    if (execution && execution.status === 'running') {
      execution.status = 'paused';
      execution.context.status = 'paused';
      execution.updatedAt = Date.now();
      return true;
    }
    return false;
  }

  resumeExecution(executionId: string): boolean {
    const execution = this.getExecution(executionId);
    if (execution && execution.status === 'paused') {
      execution.status = 'running';
      execution.context.status = 'running';
      execution.updatedAt = Date.now();
      return true;
    }
    return false;
  }

  async clear(): Promise<void> {
    this.definitions.clear();
    this.executions.clear();
    this.executionIndex.clear();
  }
}

/**
 * WorkflowAuditor: Track workflow execution
 */
export class WorkflowAuditor {
  private logs: Map<string, WorkflowAuditLog[]> = new Map();

  logEvent(
    executionId: string,
    event: string,
    status: StepStatus | WorkflowStatus,
    details?: Record<string, any>
  ): WorkflowAuditLog {
    const log: WorkflowAuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      executionId,
      event,
      status,
      details: details || {},
      timestamp: Date.now(),
    };

    if (!this.logs.has(executionId)) {
      this.logs.set(executionId, []);
    }
    this.logs.get(executionId)!.push(log);

    return log;
  }

  logStepEvent(
    executionId: string,
    stepId: string,
    event: string,
    status: StepStatus,
    details?: Record<string, any>
  ): WorkflowAuditLog {
    const log: WorkflowAuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      executionId,
      stepId,
      event,
      status,
      details: details || {},
      timestamp: Date.now(),
    };

    if (!this.logs.has(executionId)) {
      this.logs.set(executionId, []);
    }
    this.logs.get(executionId)!.push(log);

    return log;
  }

  getAuditLogs(executionId: string, limit: number = 100): WorkflowAuditLog[] {
    const logs = this.logs.get(executionId) || [];
    return logs.slice(-limit);
  }

  getEventCount(executionId: string, event: string): number {
    const logs = this.logs.get(executionId) || [];
    return logs.filter((l) => l.event === event).length;
  }

  async clear(): Promise<void> {
    this.logs.clear();
  }
}

/**
 * WorkflowHub: Unified orchestration
 */
export class WorkflowHub {
  private stepExecutor: StepExecutor;
  private taskManager: TaskManager;
  private workflowEngine: WorkflowEngine;
  private auditor: WorkflowAuditor;

  constructor() {
    this.stepExecutor = new StepExecutor();
    this.taskManager = new TaskManager();
    this.workflowEngine = new WorkflowEngine(this.stepExecutor, this.taskManager);
    this.auditor = new WorkflowAuditor();
  }

  getStepExecutor(): StepExecutor {
    return this.stepExecutor;
  }

  getTaskManager(): TaskManager {
    return this.taskManager;
  }

  getWorkflowEngine(): WorkflowEngine {
    return this.workflowEngine;
  }

  getAuditor(): WorkflowAuditor {
    return this.auditor;
  }

  registerWorkflow(definition: WorkflowDefinition): void {
    this.workflowEngine.registerWorkflow(definition);
    this.auditor.logEvent(`workflow_${definition.id}`, 'registered', 'completed', {
      workflowId: definition.id,
      version: definition.version,
    });
  }

  async executeWorkflow(workflowId: string, input: WorkflowInput): Promise<WorkflowExecution> {
    const execution = this.workflowEngine.createExecution(workflowId, input);
    this.auditor.logEvent(execution.id, 'started', 'running', { workflowId, input });

    try {
      const result = await this.workflowEngine.executeWorkflow(execution.id);
      this.auditor.logEvent(result.id, 'completed', 'completed', { workflowId });
      return result;
    } catch (error) {
      this.auditor.logEvent(execution.id, 'failed', 'failed', {
        workflowId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  pauseWorkflow(executionId: string): boolean {
    const result = this.workflowEngine.pauseExecution(executionId);
    if (result) {
      this.auditor.logEvent(executionId, 'paused', 'paused');
    }
    return result;
  }

  resumeWorkflow(executionId: string): boolean {
    const result = this.workflowEngine.resumeExecution(executionId);
    if (result) {
      this.auditor.logEvent(executionId, 'resumed', 'running');
    }
    return result;
  }

  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.workflowEngine.getExecution(executionId);
  }

  async clear(): Promise<void> {
    await this.stepExecutor.clear();
    await this.taskManager.clear();
    await this.workflowEngine.clear();
    await this.auditor.clear();
  }
}
