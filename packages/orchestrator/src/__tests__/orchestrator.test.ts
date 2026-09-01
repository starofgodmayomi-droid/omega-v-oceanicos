import { OceanicosOrchestratorEngine } from '../index';

describe('OceanicosOrchestratorEngine — Multi-Agent Swarm Orchestrator', () => {
  let engine: OceanicosOrchestratorEngine;

  beforeEach(() => {
    engine = new OceanicosOrchestratorEngine('test-orchestrator-key');
  });

  describe('1. Task Dispatching & Agent Assignment', () => {
    it('should dispatch isolated tasks to assigned worker agents', () => {
      const task = engine.dispatchTask({
        name: 'Compile ZK Invariant Circuit',
        assignedAgentDid: 'did:omega:agent:zk-builder',
        executionMode: 'PARALLEL',
        payload: { circuitType: 'Groth16', constraints: 4096 },
      });

      expect(task.taskId).toMatch(/^task-/);
      expect(task.status).toBe('QUEUED');
      expect(task.assignedAgentDid).toBe('did:omega:agent:zk-builder');

      const all = engine.getTasks();
      expect(all.length).toBe(1);
    });
  });

  describe('2. Parallel Multi-Worker Batch Dispatching', () => {
    it('should dispatch parallel batches with cryptographic batch receipt attestation', () => {
      const batch = engine.dispatchParallelBatch({
        batchName: 'Continuous Full Stack Monorepo Upgrade',
        tasks: [
          { name: 'Build Mesh Gossip Layer', assignedAgentDid: 'did:omega:worker:mesh-builder' },
          { name: 'Build Sharding Engine', assignedAgentDid: 'did:omega:worker:sharding-builder' },
          { name: 'Build Bridge Relayers', assignedAgentDid: 'did:omega:worker:bridge-builder' },
        ],
      });

      expect(batch.batchId).toMatch(/^batch-/);
      expect(batch.taskCount).toBe(3);
      expect(batch.stateDeltaHash).toMatch(/^0x/);
      expect(batch.batchAttestation).toMatch(/^0x/);

      const batchTasks = engine.getTasks(batch.batchId);
      expect(batchTasks.length).toBe(3);
      expect(batchTasks.every((t) => t.status === 'RUNNING')).toBe(true);
    });
  });

  describe('3. Task Attestation & Speculative Conflict Handling', () => {
    it('should record execution attestations and update batch completion', () => {
      const batch = engine.dispatchParallelBatch({
        batchName: 'Telemetry Sync',
        tasks: [
          { name: 'Collect Metrics', assignedAgentDid: 'did:omega:worker:metrics' },
        ],
      });

      const task = engine.getTasks(batch.batchId)[0];
      const attested = engine.submitTaskAttestation({
        taskId: task.taskId,
        agentDid: 'did:omega:worker:metrics',
        resultWitness: 'PROMETHEUS_METRICS_PARSED_100_PERCENT',
        durationMs: 42,
      });

      expect(attested.status).toBe('ATTESTED');
      expect(attested.executionDurationMs).toBe(42);

      const batches = engine.getBatches();
      expect(batches[0].completedCount).toBe(1);
      expect(batches[0].completedAt).toBeDefined();
    });

    it('should rollback speculative tasks when conflicts occur', () => {
      const task = engine.dispatchTask({
        name: 'Speculative State Modification',
        assignedAgentDid: 'did:omega:worker:speculative',
        executionMode: 'SPECULATIVE',
      });

      const rolledBack = engine.submitTaskAttestation({
        taskId: task.taskId,
        agentDid: 'did:omega:worker:speculative',
        resultWitness: '',
        hasConflict: true,
      });

      expect(rolledBack.status).toBe('ROLLED_BACK');
      expect(engine.getStats().speculativeRollbacks).toBe(1);
    });
  });

  describe('4. Aggregate Orchestrator Statistics', () => {
    it('should calculate aggregate swarm orchestrator metrics', () => {
      const stats = engine.getStats();
      expect(stats.totalDispatchedTasks).toBe(0);
      expect(stats.registeredAgents).toBe(0);
    });
  });
});
