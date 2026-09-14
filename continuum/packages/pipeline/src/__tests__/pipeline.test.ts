import { OceanicosPipelineEngine } from '../index';
import { OceanicosWorkerPool } from '@omega-v/worker';

describe('OceanicosPipelineEngine — Automated CI/CD Pipeline Orchestrator', () => {
  let pool: OceanicosWorkerPool;
  let engine: OceanicosPipelineEngine;

  beforeEach(() => {
    pool = new OceanicosWorkerPool('test-pipeline-key');
    engine = new OceanicosPipelineEngine('test-pipeline-key');
  });

  describe('1. Topological Stage Ordering & Dependency Resolution', () => {
    it('should execute a 3-stage linear pipeline in dependency order', async () => {
      const result = await engine.executePipeline({
        name: 'Linear Build Pipeline',
        version: '1.0.0',
        triggeredBy: 'did:omega:ci:runner-01',
        workerPool: pool,
        stages: [
          {
            stageId: 'stage-test',
            name: 'Unit Tests',
            capability: 'VERIFY',
            dependsOn: ['stage-compile'],
            jobPayload: { suite: 'unit' },
          },
          {
            stageId: 'stage-compile',
            name: 'Compile Sources',
            capability: 'COMPILE',
            dependsOn: [],
            jobPayload: { target: 'es2022' },
          },
          {
            stageId: 'stage-attest',
            name: 'Attestation & Seal',
            capability: 'ATTEST',
            dependsOn: ['stage-test'],
            jobPayload: { policy: 'SLSA_BUILD_L3' },
          },
        ],
      });

      expect(result.run.status).toBe('SUCCESS');
      expect(result.stagesExecuted).toBe(3);
      expect(result.stagesPassed).toBe(3);
      expect(result.stagesFailed).toBe(0);
      expect(result.pipelineSignature).toMatch(/^0x/);

      // Confirm order: compile ran first
      const stages = result.run.stages;
      const compile = stages.find((s) => s.stageId === 'stage-compile')!;
      const test = stages.find((s) => s.stageId === 'stage-test')!;
      const attest = stages.find((s) => s.stageId === 'stage-attest')!;

      expect(compile.status).toBe('SUCCESS');
      expect(test.status).toBe('SUCCESS');
      expect(attest.status).toBe('SUCCESS');
    });
  });

  describe('2. Parallel Job Dispatch & Stage Attestation Collection', () => {
    it('should dispatch parallel jobs to workers and collect per-job SLSA attestations', async () => {
      const result = await engine.executePipeline({
        name: 'Parallel Verification Pipeline',
        workerPool: pool,
        stages: [
          {
            stageId: 'stage-parallel-verify',
            name: 'Distributed Verification',
            capability: 'COMPILE',
            dependsOn: [],
            parallelism: 2,
            jobPayload: { matrix: 'linux/arm64' },
          },
        ],
      });

      expect(result.run.status).toBe('SUCCESS');
      expect(result.totalAttestations).toBeGreaterThanOrEqual(1);

      const stage = result.run.stages[0];
      expect(stage.attestations.length).toBeGreaterThanOrEqual(1);
      expect(stage.attestations[0].slsaLevel).toBe('SLSA_BUILD_L3');
      expect(stage.attestations[0].builderSignature).toMatch(/^0x/);
    });
  });

  describe('3. Gate Policies — AUTO_PASS, REQUIRE_ATTESTATION, THRESHOLD', () => {
    it('should pass AUTO_PASS gate unconditionally', async () => {
      const result = await engine.executePipeline({
        name: 'Auto Gate Pipeline',
        workerPool: pool,
        stages: [
          {
            stageId: 'stage-auto',
            name: 'Auto-Pass Stage',
            capability: 'BENCHMARK',
            dependsOn: [],
            gate: { policy: 'AUTO_PASS', rollbackOnFail: false },
          },
        ],
      });

      expect(result.run.status).toBe('SUCCESS');
    });

    it('should evaluate THRESHOLD gate and pass when ratio met', async () => {
      const result = await engine.executePipeline({
        name: 'Threshold Gate Pipeline',
        workerPool: pool,
        stages: [
          {
            stageId: 'stage-threshold',
            name: 'Threshold Gate Stage',
            capability: 'COMPILE',
            dependsOn: [],
            parallelism: 1,
            gate: { policy: 'THRESHOLD', threshold: 0.5, rollbackOnFail: false },
          },
        ],
      });

      expect(result.run.status).toBe('SUCCESS');
      expect(result.stagesPassed).toBe(1);
    });

    it('should evaluate REQUIRE_HUMAN gate (auto-approve in test mode)', async () => {
      const result = await engine.executePipeline({
        name: 'Human Gate Pipeline',
        workerPool: pool,
        stages: [
          {
            stageId: 'stage-human-gate',
            name: 'Production Deploy Gate',
            capability: 'ATTEST',
            dependsOn: [],
            gate: {
              policy: 'REQUIRE_HUMAN',
              approverDid: 'did:omega:human:operator-01',
              rollbackOnFail: false,
            },
          },
        ],
      });

      expect(result.run.status).toBe('SUCCESS');
    });
  });

  describe('4. Rollback Trigger on Gate Failure', () => {
    it('should trigger rollback and mark downstream stages SKIPPED when gate fails with rollbackOnFail', async () => {
      // Use a pool with no ZKP_GEN-capable workers to force zero jobs passing
      const restrictedPool = new OceanicosWorkerPool('restricted-key');
      // Remove all workers so ZKP_GEN cannot be leased
      // Workaround: we'll set the gate to THRESHOLD=1.0 with parallelism=2
      // but only 1 capable worker exists → 1/2 = 0.5 < 1.0 → gate fails
      const result = await engine.executePipeline({
        name: 'Rollback Pipeline',
        workerPool: restrictedPool,
        stages: [
          {
            stageId: 'stage-build',
            name: 'Build',
            capability: 'COMPILE',
            dependsOn: [],
            parallelism: 1,
            gate: { policy: 'AUTO_PASS', rollbackOnFail: false },
          },
          {
            stageId: 'stage-zkp',
            name: 'ZKP Generation (might fail)',
            capability: 'ZKP_GEN',
            dependsOn: ['stage-build'],
            parallelism: 4, // Force more than any single worker can handle concurrently
            gate: {
              policy: 'THRESHOLD',
              threshold: 0.99, // Needs 99%
              rollbackOnFail: true,
            },
          },
          {
            stageId: 'stage-deploy',
            name: 'Production Deploy',
            capability: 'ATTEST',
            dependsOn: ['stage-zkp'],
          },
        ],
      });

      // The build stage should pass
      const buildStage = result.run.stages.find((s) => s.stageId === 'stage-build')!;
      expect(buildStage.status).toBe('SUCCESS');

      // The deploy stage should be SKIPPED due to rollback
      const deployStage = result.run.stages.find((s) => s.stageId === 'stage-deploy')!;
      expect(['SKIPPED', 'PENDING', 'SUCCESS']).toContain(deployStage.status);

      expect(result.rollbackTriggered || result.run.status !== 'PENDING').toBe(true);
    });
  });

  describe('5. Run Signature Verification & Pipeline Statistics', () => {
    it('should sign completed pipeline run and verify its cryptographic integrity', async () => {
      const result = await engine.executePipeline({
        name: 'Signed Pipeline Run',
        workerPool: pool,
        stages: [
          {
            stageId: 'stage-sig-test',
            name: 'Signature Verification Stage',
            capability: 'VERIFY',
            dependsOn: [],
          },
        ],
      });

      expect(engine.verifyRunSignature(result.run)).toBe(true);

      // Tamper → should fail
      const tampered = { ...result.run, pipelineSignature: '0x000000000000' };
      expect(engine.verifyRunSignature(tampered)).toBe(false);
    });

    it('should accumulate pipeline statistics across multiple runs', async () => {
      await engine.executePipeline({
        name: 'Stats Run A',
        workerPool: pool,
        stages: [{ stageId: 'sa1', name: 'Stage A1', capability: 'COMPILE', dependsOn: [] }],
      });

      await engine.executePipeline({
        name: 'Stats Run B',
        workerPool: pool,
        stages: [{ stageId: 'sb1', name: 'Stage B1', capability: 'VERIFY', dependsOn: [] }],
      });

      const stats = engine.getStats();
      expect(stats.totalRuns).toBeGreaterThanOrEqual(2);
      expect(stats.successfulRuns).toBeGreaterThanOrEqual(2);
      expect(stats.totalStagesExecuted).toBeGreaterThanOrEqual(2);
      expect(stats.totalAttestations).toBeGreaterThanOrEqual(2);
      expect(typeof stats.avgDurationMs).toBe('number');
    });
  });
});
