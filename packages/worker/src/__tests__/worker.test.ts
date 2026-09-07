import { OceanicosWorkerPool } from '../index';

describe('OceanicosWorkerPool (Verifiable Worker & Builder Execution Engine)', () => {
  let pool: OceanicosWorkerPool;

  beforeEach(() => {
    pool = new OceanicosWorkerPool('test-signing-key');
  });

  describe('1. Worker Node Registration & Heartbeat', () => {
    it('should register canonical workers on startup', () => {
      const workers = pool.getWorkers();
      expect(workers.length).toBeGreaterThanOrEqual(2);
      expect(workers.map((w) => w.workerId)).toContain('worker-node-primary-01');
    });

    it('should register a custom builder worker and accept heartbeat', () => {
      const worker = pool.registerWorker({
        workerId: 'worker-custom-01',
        name: 'Custom Container Builder',
        capabilities: ['CONTAINER_BUILD', 'COMPILE'],
        maxConcurrency: 3,
        cpuCores: 8,
        memoryMb: 16384,
      });

      expect(worker.workerId).toBe('worker-custom-01');
      expect(worker.capabilities).toContain('CONTAINER_BUILD');
      expect(worker.status).toBe('IDLE');

      const hb = pool.heartbeat('worker-custom-01');
      expect(hb).toBe(true);
    });
  });

  describe('2. Job Enqueueing & Capability Leasing', () => {
    it('should enqueue build jobs with SHA-256 input fingerprints and priority', () => {
      const job = pool.submitJob({
        name: 'Compile Oceanicum Core Bytecode',
        requiredCapability: 'COMPILE',
        payload: { source: 'packages/ir/src/index.ts', target: 'ES2022' },
        priority: 1,
      });

      expect(job.jobId).toMatch(/^job-/);
      expect(job.status).toBe('QUEUED');
      expect(job.inputFingerprint).toHaveLength(64);
      expect(job.priority).toBe(1);
    });

    it('should lease job to capability-matching worker', () => {
      pool.submitJob({
        name: 'Generate ZK Proof for Observation Block',
        requiredCapability: 'ZKP_GEN',
        payload: { circuit: 'circuit-range', witness: 0.95 },
      });

      // Edge worker cannot lease ZKP_GEN
      const edgeLease = pool.leaseJob('worker-node-edge-02');
      expect(edgeLease).toBeNull();

      // Primary worker can lease ZKP_GEN
      const primaryLease = pool.leaseJob('worker-node-primary-01');
      expect(primaryLease).not.toBeNull();
      expect(primaryLease!.status).toBe('LEASED');
      expect(primaryLease!.assignedWorkerId).toBe('worker-node-primary-01');
    });
  });

  describe('3. Execution Completion & SLSA-L3 Attestation', () => {
    it('should complete job and issue cryptographically signed SLSA build attestation', () => {
      const job = pool.submitJob({
        name: 'Build Container Image',
        requiredCapability: 'CONTAINER_BUILD',
        payload: { dockerfile: 'Dockerfile', tag: 'v1.0.0' },
      });

      const leased = pool.leaseJob('worker-node-primary-01');
      expect(leased).not.toBeNull();

      const artifacts = [
        {
          name: 'omega-v-api.tar.gz',
          path: 'dist/omega-v-api.tar.gz',
          contentHash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
          sizeBytes: 1048576,
          mimeType: 'application/gzip',
        },
      ];

      const { job: completedJob, attestation } = pool.completeJob(
        job.jobId,
        'worker-node-primary-01',
        { buildSuccess: true, exitCode: 0 },
        artifacts
      );

      expect(completedJob.status).toBe('COMPLETED');
      expect(attestation.slsaLevel).toBe('SLSA_BUILD_L3');
      expect(attestation.outputMerkleRoot).toHaveLength(64);
      expect(attestation.builderSignature).toMatch(/^0x/);

      // Verify authenticity of attestation
      expect(pool.verifyAttestation(attestation)).toBe(true);

      // Tampered attestation fails
      const tampered = {
        ...attestation,
        outputMerkleRoot: '0000000000000000000000000000000000000000000000000000000000000000',
      };
      expect(pool.verifyAttestation(tampered)).toBe(false);
    });
  });

  describe('4. Reproducibility Cross-Verification & Failure Retries', () => {
    it('should verify bit-for-bit build reproducibility across multiple independent builders', () => {
      const jobSpec = {
        name: 'Reproducible Kernel Compilation',
        requiredCapability: 'COMPILE' as const,
        payload: { target: 'omega-v-kernel' },
      };

      const jobA = pool.submitJob(jobSpec);
      pool.leaseJob('worker-node-primary-01');
      const resA = pool.completeJob(jobA.jobId, 'worker-node-primary-01', { binarySha: 'xyz' }, [
        {
          name: 'kernel.bin',
          path: 'dist/kernel.bin',
          contentHash: 'hash-kernel-exact-match',
          sizeBytes: 2048,
          mimeType: 'application/octet-stream',
        },
      ]);

      const jobB = pool.submitJob(jobSpec);
      pool.leaseJob('worker-node-edge-02');
      const resB = pool.completeJob(jobB.jobId, 'worker-node-edge-02', { binarySha: 'xyz' }, [
        {
          name: 'kernel.bin',
          path: 'dist/kernel.bin',
          contentHash: 'hash-kernel-exact-match',
          sizeBytes: 2048,
          mimeType: 'application/octet-stream',
        },
      ]);

      const reproCheck = pool.verifyBuildReproducibility([resA.attestation, resB.attestation]);
      expect(reproCheck.reproducible).toBe(true);
      expect(reproCheck.discrepancyCount).toBe(0);
    });

    it('should handle retries on worker failure up to maxRetries', () => {
      const job = pool.submitJob({
        name: 'Flaky Network Fetch Task',
        requiredCapability: 'COMPILE',
        payload: { url: 'https://example.com/data' },
        maxRetries: 2,
      });

      // 1st failure -> RETRYING
      pool.leaseJob('worker-node-primary-01');
      const retryJob = pool.failJob(job.jobId, 'worker-node-primary-01', 'Connection timeout');
      expect(retryJob.status).toBe('RETRYING');
      expect(retryJob.retries).toBe(1);

      // 2nd failure -> FAILED
      pool.leaseJob('worker-node-primary-01');
      const failedJob = pool.failJob(job.jobId, 'worker-node-primary-01', 'Connection timeout 2');
      expect(failedJob.status).toBe('FAILED');
      expect(failedJob.retries).toBe(2);
    });

    it('should compute comprehensive worker pool metrics', () => {
      const stats = pool.getStats();
      expect(stats.totalWorkers).toBeGreaterThanOrEqual(2);
      expect(stats.onlineWorkers).toBeGreaterThanOrEqual(2);
      expect(typeof stats.avgDurationMs).toBe('number');
    });
  });
});
