import {
  StepExecutor,
  TaskManager,
  WorkflowEngine,
  WorkflowAuditor,
  WorkflowHub,
  WorkflowDefinition,
  StepDefinition,
} from '../workflows';

describe('Advanced Workflow Orchestration System', () => {
  describe('StepExecutor', () => {
    let executor: StepExecutor;

    beforeEach(() => {
      executor = new StepExecutor();
    });

    afterEach(async () => {
      await executor.clear();
    });

    it('should register handler', () => {
      const handler = async () => ({ success: true });
      executor.registerHandler('test-handler', handler);

      expect(handler).toBeDefined();
    });

    it('should execute delay step', async () => {
      const step: StepDefinition = {
        id: 'step1',
        name: 'delay',
        type: 'delay',
        metadata: { duration: 10 },
      };

      const result = await executor.executeStep(step, {
        workflowId: 'w1',
        executionId: 'e1',
        currentStep: 0,
        status: 'running',
        input: {},
        output: {},
        variables: {},
        startTime: Date.now(),
      });

      expect(result.delayed).toBe(10);
    });

    it('should execute decision step', async () => {
      const step: StepDefinition = {
        id: 'step1',
        name: 'decision',
        type: 'decision',
        metadata: { value: true },
      };

      const result = await executor.executeStep(step, {
        workflowId: 'w1',
        executionId: 'e1',
        currentStep: 0,
        status: 'running',
        input: {},
        output: {},
        variables: {},
        startTime: Date.now(),
      });

      expect(result.decision).toBe(true);
    });

    it('should execute task step with handler', async () => {
      const handler = async () => ({ result: 'success' });
      executor.registerHandler('handler1', handler);

      const step: StepDefinition = {
        id: 'step1',
        name: 'task',
        type: 'task',
        handler: 'handler1',
      };

      const result = await executor.executeStep(step, {
        workflowId: 'w1',
        executionId: 'e1',
        currentStep: 0,
        status: 'running',
        input: {},
        output: {},
        variables: {},
        startTime: Date.now(),
      });

      expect(result.result).toBe('success');
    });

    it('should skip step with failing condition', async () => {
      const step: StepDefinition = {
        id: 'step1',
        name: 'task',
        type: 'task',
        condition: () => false,
      };

      const result = await executor.executeStep(step, {
        workflowId: 'w1',
        executionId: 'e1',
        currentStep: 0,
        status: 'running',
        input: {},
        output: {},
        variables: {},
        startTime: Date.now(),
      });

      expect(result.skipped).toBe(true);
    });

    it('should execute with exponential retry', async () => {
      let attempts = 0;
      const handler = async () => {
        attempts++;
        if (attempts < 3) throw new Error('Retry');
        return { success: true };
      };

      executor.registerHandler('retry-handler', handler);

      const step: StepDefinition = {
        id: 'step1',
        name: 'task',
        type: 'task',
        handler: 'retry-handler',
        retryPolicy: 'exponential',
        maxRetries: 3,
      };

      const { result, retryCount } = await executor.executeWithRetry(step, {
        workflowId: 'w1',
        executionId: 'e1',
        currentStep: 0,
        status: 'running',
        input: {},
        output: {},
        variables: {},
        startTime: Date.now(),
      });

      expect(result.success).toBe(true);
      expect(retryCount).toBe(2);
    });
  });

  describe('TaskManager', () => {
    let taskManager: TaskManager;

    beforeEach(() => {
      taskManager = new TaskManager();
    });

    afterEach(async () => {
      await taskManager.clear();
    });

    it('should create step execution', () => {
      const execution = taskManager.createStepExecution('step1', 'Step 1');

      expect(execution.id).toBeDefined();
      expect(execution.stepId).toBe('step1');
      expect(execution.status).toBe('pending');
    });

    it('should start step execution', () => {
      const execution = taskManager.createStepExecution('step1', 'Step 1');
      const started = taskManager.startStepExecution(execution.id);

      expect(started?.status).toBe('running');
    });

    it('should complete step execution', () => {
      const execution = taskManager.createStepExecution('step1', 'Step 1');
      const completed = taskManager.completeStepExecution(execution.id, { result: 'data' });

      expect(completed?.status).toBe('completed');
      expect(completed?.result).toEqual({ result: 'data' });
      expect(completed?.duration).toBeDefined();
    });

    it('should fail step execution', () => {
      const execution = taskManager.createStepExecution('step1', 'Step 1');
      const failed = taskManager.failStepExecution(execution.id, 'Error message');

      expect(failed?.status).toBe('failed');
      expect(failed?.error).toBe('Error message');
    });

    it('should skip step execution', () => {
      const execution = taskManager.createStepExecution('step1', 'Step 1');
      const skipped = taskManager.skipStepExecution(execution.id);

      expect(skipped?.status).toBe('skipped');
    });

    it('should get step execution', () => {
      const execution = taskManager.createStepExecution('step1', 'Step 1');
      const retrieved = taskManager.getStepExecution(execution.id);

      expect(retrieved?.id).toBe(execution.id);
    });

    it('should add step to workflow', () => {
      const stepExecution = taskManager.createStepExecution('step1', 'Step 1');
      taskManager.addStepToWorkflow('exec1', stepExecution);

      const executions = taskManager.getStepExecutionsByWorkflow('exec1');

      expect(executions.length).toBe(1);
      expect(executions[0].id).toBe(stepExecution.id);
    });
  });

  describe('WorkflowEngine', () => {
    let executor: StepExecutor;
    let taskManager: TaskManager;
    let engine: WorkflowEngine;

    beforeEach(() => {
      executor = new StepExecutor();
      taskManager = new TaskManager();
      engine = new WorkflowEngine(executor, taskManager);
    });

    afterEach(async () => {
      await executor.clear();
      await taskManager.clear();
      await engine.clear();
    });

    it('should register workflow', () => {
      const definition: WorkflowDefinition = {
        id: 'wf1',
        name: 'Test Workflow',
        version: 1,
        description: 'A test workflow',
        steps: [],
        startStepId: 'step1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      engine.registerWorkflow(definition);
      const retrieved = engine.getLatestWorkflowDefinition('wf1');

      expect(retrieved?.id).toBe('wf1');
      expect(retrieved?.version).toBe(1);
    });

    it('should get latest workflow version', () => {
      const def1: WorkflowDefinition = {
        id: 'wf1',
        name: 'Workflow',
        version: 1,
        description: 'v1',
        steps: [],
        startStepId: 'step1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const def2: WorkflowDefinition = {
        id: 'wf1',
        name: 'Workflow',
        version: 2,
        description: 'v2',
        steps: [],
        startStepId: 'step1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      engine.registerWorkflow(def1);
      engine.registerWorkflow(def2);

      const latest = engine.getLatestWorkflowDefinition('wf1');

      expect(latest?.version).toBe(2);
    });

    it('should create execution', () => {
      const definition: WorkflowDefinition = {
        id: 'wf1',
        name: 'Test Workflow',
        version: 1,
        description: 'test',
        steps: [],
        startStepId: 'step1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      engine.registerWorkflow(definition);
      const execution = engine.createExecution('wf1', { input: 'data' });

      expect(execution.id).toBeDefined();
      expect(execution.status).toBe('running');
      expect(execution.context.input).toEqual({ input: 'data' });
    });

    it('should get execution', () => {
      const definition: WorkflowDefinition = {
        id: 'wf1',
        name: 'Test Workflow',
        version: 1,
        description: 'test',
        steps: [],
        startStepId: 'step1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      engine.registerWorkflow(definition);
      const execution = engine.createExecution('wf1', {});

      const retrieved = engine.getExecution(execution.id);

      expect(retrieved?.id).toBe(execution.id);
    });

    it('should pause execution', () => {
      const definition: WorkflowDefinition = {
        id: 'wf1',
        name: 'Test Workflow',
        version: 1,
        description: 'test',
        steps: [],
        startStepId: 'step1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      engine.registerWorkflow(definition);
      const execution = engine.createExecution('wf1', {});

      const result = engine.pauseExecution(execution.id);

      expect(result).toBe(true);
      expect(execution.status).toBe('paused');
    });

    it('should resume execution', () => {
      const definition: WorkflowDefinition = {
        id: 'wf1',
        name: 'Test Workflow',
        version: 1,
        description: 'test',
        steps: [],
        startStepId: 'step1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      engine.registerWorkflow(definition);
      const execution = engine.createExecution('wf1', {});

      engine.pauseExecution(execution.id);
      const result = engine.resumeExecution(execution.id);

      expect(result).toBe(true);
      expect(execution.status).toBe('running');
    });

    it('should execute step', async () => {
      const handler = async () => ({ data: 'result' });
      executor.registerHandler('handler1', handler);

      const step: StepDefinition = {
        id: 'step1',
        name: 'Step 1',
        type: 'task',
        handler: 'handler1',
      };

      const definition: WorkflowDefinition = {
        id: 'wf1',
        name: 'Test Workflow',
        version: 1,
        description: 'test',
        steps: [step],
        startStepId: 'step1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      engine.registerWorkflow(definition);
      const execution = engine.createExecution('wf1', {});

      const stepExecution = await engine.executeStep(execution.id, 'step1');

      expect(stepExecution.status).toBe('completed');
      expect(stepExecution.result).toEqual({ data: 'result' });
    });
  });

  describe('WorkflowAuditor', () => {
    let auditor: WorkflowAuditor;

    beforeEach(() => {
      auditor = new WorkflowAuditor();
    });

    afterEach(async () => {
      await auditor.clear();
    });

    it('should log event', () => {
      const log = auditor.logEvent('exec1', 'started', 'running', { workflowId: 'wf1' });

      expect(log.id).toBeDefined();
      expect(log.event).toBe('started');
      expect(log.status).toBe('running');
    });

    it('should log step event', () => {
      const log = auditor.logStepEvent('exec1', 'step1', 'executed', 'completed');

      expect(log.stepId).toBe('step1');
      expect(log.event).toBe('executed');
    });

    it('should get audit logs', () => {
      auditor.logEvent('exec1', 'started', 'running');
      auditor.logEvent('exec1', 'step1', 'completed');

      const logs = auditor.getAuditLogs('exec1');

      expect(logs.length).toBe(2);
    });

    it('should count events', () => {
      auditor.logEvent('exec1', 'started', 'running');
      auditor.logEvent('exec1', 'started', 'running');
      auditor.logEvent('exec1', 'completed', 'completed');

      const count = auditor.getEventCount('exec1', 'started');

      expect(count).toBe(2);
    });
  });

  describe('WorkflowHub', () => {
    let hub: WorkflowHub;

    beforeEach(() => {
      hub = new WorkflowHub();
    });

    afterEach(async () => {
      await hub.clear();
    });

    it('should provide step executor', () => {
      const executor = hub.getStepExecutor();
      expect(executor).toBeDefined();
    });

    it('should provide task manager', () => {
      const taskManager = hub.getTaskManager();
      expect(taskManager).toBeDefined();
    });

    it('should provide workflow engine', () => {
      const engine = hub.getWorkflowEngine();
      expect(engine).toBeDefined();
    });

    it('should provide auditor', () => {
      const auditor = hub.getAuditor();
      expect(auditor).toBeDefined();
    });

    it('should register workflow', () => {
      const definition: WorkflowDefinition = {
        id: 'wf1',
        name: 'Test Workflow',
        version: 1,
        description: 'test',
        steps: [],
        startStepId: 'step1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      hub.registerWorkflow(definition);
      const retrieved = hub.getWorkflowEngine().getLatestWorkflowDefinition('wf1');

      expect(retrieved?.id).toBe('wf1');
    });

    it('should execute workflow', async () => {
      const executor = hub.getStepExecutor();
      const handler = async () => ({ success: true });
      executor.registerHandler('handler1', handler);

      const step: StepDefinition = {
        id: 'step1',
        name: 'Step 1',
        type: 'task',
        handler: 'handler1',
      };

      const definition: WorkflowDefinition = {
        id: 'wf1',
        name: 'Test Workflow',
        version: 1,
        description: 'test',
        steps: [step],
        startStepId: 'step1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      hub.registerWorkflow(definition);
      const execution = await hub.executeWorkflow('wf1', {});

      expect(execution.status).toBe('completed');
    });

    it('should pause workflow', () => {
      const definition: WorkflowDefinition = {
        id: 'wf1',
        name: 'Test Workflow',
        version: 1,
        description: 'test',
        steps: [],
        startStepId: 'step1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      hub.registerWorkflow(definition);
      const execution = hub.getWorkflowEngine().createExecution('wf1', {});

      const result = hub.pauseWorkflow(execution.id);

      expect(result).toBe(true);
    });

    it('should resume workflow', () => {
      const definition: WorkflowDefinition = {
        id: 'wf1',
        name: 'Test Workflow',
        version: 1,
        description: 'test',
        steps: [],
        startStepId: 'step1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      hub.registerWorkflow(definition);
      const execution = hub.getWorkflowEngine().createExecution('wf1', {});

      hub.pauseWorkflow(execution.id);
      const result = hub.resumeWorkflow(execution.id);

      expect(result).toBe(true);
    });

    it('should get execution', () => {
      const definition: WorkflowDefinition = {
        id: 'wf1',
        name: 'Test Workflow',
        version: 1,
        description: 'test',
        steps: [],
        startStepId: 'step1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      hub.registerWorkflow(definition);
      const execution = hub.getWorkflowEngine().createExecution('wf1', {});

      const retrieved = hub.getExecution(execution.id);

      expect(retrieved?.id).toBe(execution.id);
    });

    it('should integrate all components for complex workflow', async () => {
      const executor = hub.getStepExecutor();
      const handler1 = async () => ({ step1: 'result' });
      const handler2 = async () => ({ step2: 'result' });

      executor.registerHandler('h1', handler1);
      executor.registerHandler('h2', handler2);

      const steps: StepDefinition[] = [
        {
          id: 'step1',
          name: 'Step 1',
          type: 'task',
          handler: 'h1',
          nextStepId: 'step2',
        },
        {
          id: 'step2',
          name: 'Step 2',
          type: 'task',
          handler: 'h2',
        },
      ];

      const definition: WorkflowDefinition = {
        id: 'wf1',
        name: 'Complex Workflow',
        version: 1,
        description: 'two step workflow',
        steps,
        startStepId: 'step1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      hub.registerWorkflow(definition);
      const execution = await hub.executeWorkflow('wf1', { data: 'input' });

      expect(execution.status).toBe('completed');
      expect(execution.stepExecutions.length).toBe(2);
    });
  });
});
