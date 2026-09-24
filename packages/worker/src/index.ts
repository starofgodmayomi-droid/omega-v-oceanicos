import crypto from 'crypto';

export type WorkerStatus = 'IDLE' | 'BUSY' | 'DRAINING' | 'OFFLINE';
export type JobStatus = 'QUEUED' | 'LEASED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'RETRYING';
export type BuildCapability =
  'COMPILE' | 'VERIFY' | 'ATTEST' | 'BENCHMARK' | 'CONTAINER_BUILD' | 'ZKP_GEN' | 'REPLAY';

const MAX_IDENTIFIER_LENGTH = 128;
const MAX_WORKER_CONCURRENCY = 64;
const MAX_CPU_CORES = 1024;
const MAX_MEMORY_MB = 1_048_576;
const MAX_RETRIES = 10;
const MAX_LEASE_DURATION_MS = 86_400_000;

const requireText = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > MAX_IDENTIFIER_LENGTH) {
    throw new Error(`${field} must be a non-empty string of at most ${MAX_IDENTIFIER_LENGTH} characters`);
  }
  return value.trim();
};

const requireIntegerRange = (value: unknown, field: string, minimum: number, maximum: number): number => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${field} must be an integer between ${minimum} and ${maximum}`);
  }
  return value;
};

export interface WorkerNode {
  workerId: string;
  name: string;
  capabilities: BuildCapability[];
  authoritySubject: string;
  policyId: string;
  expiresAt: string;
  scope: string[];
  maxConcurrency: number;
  activeJobs: number;
  status: WorkerStatus;
  registeredAt: string;
  lastHeartbeatAt: string;
  resourceMetrics: {
    cpuCores: number;
    memoryMb: number;
    avgExecutionTimeMs: number;
    jobsCompleted: number;
    jobsFailed: number;
  };
}

export interface BuildArtifact {
  name: string;
  path: string;
  contentHash: string; // SHA-256
  sizeBytes: number;
  mimeType: string;
  metadata?: Record<string, unknown>;
}

export interface BuildAttestation {
  attestationId: string;
  jobId: string;
  workerId: string;
  inputFingerprint: string;
  outputMerkleRoot: string;
  artifacts: BuildArtifact[];
  executionTimeMs: number;
  slsaLevel: 'LOCAL_HMAC_OBSERVED' | 'SLSA_BUILD_L1' | 'SLSA_BUILD_L2' | 'SLSA_BUILD_L3';
  realityStatus: 'OBSERVED';
  runtimeClaim: 'NOT_CLAIMED';
  builderSignature: string;
  timestamp: string;
}

export interface BuildJob {
  jobId: string;
  name: string;
  requiredCapability: BuildCapability;
  payload: Record<string, unknown>;
  inputFingerprint: string;
  status: JobStatus;
  priority: number; // 1 (highest) to 10 (lowest)
  assignedWorkerId?: string;
  leaseExpiresAt?: string;
  retries: number;
  maxRetries: number;
  output?: Record<string, unknown>;
  artifacts?: BuildArtifact[];
  attestation?: BuildAttestation;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface WorkerPoolStats {
  totalWorkers: number;
  onlineWorkers: number;
  busyWorkers: number;
  queuedJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  avgDurationMs: number;
  reproducibilityRate: number;
}

export class OceanicosWorkerPool {
  private workers: Map<string, WorkerNode> = new Map();
  private jobs: Map<string, BuildJob> = new Map();
  private attestations: Map<string, BuildAttestation> = new Map();
  private signingKey: string;

  constructor(signingKey: string) {
    if (typeof signingKey !== 'string' || signingKey.trim().length === 0) {
      throw new Error('signingKey must be a non-empty string');
    }
    if (signingKey.trim() === 'omega-v-builder-secret-key') {
      throw new Error('default signing secret is forbidden; provide an explicit signingKey');
    }
    this.signingKey = signingKey.trim();
    this.seedCanonicalWorkers();
  }

  private seedCanonicalWorkers(): void {
    this.registerWorker({
      workerId: 'worker-node-primary-01',
      name: 'Primary Pipeline Worker (High-Compute)',
      capabilities: [
        'COMPILE',
        'VERIFY',
        'ATTEST',
        'BENCHMARK',
        'CONTAINER_BUILD',
        'ZKP_GEN',
        'REPLAY',
      ],
      authoritySubject: 'did:omega:test:seed-primary',
      policyId: 'omega.worker.v1.seed',
      expiresAt: '2099-01-01T00:00:00.000Z',
      scope: ['local-simulate'],
      maxConcurrency: 4,
      cpuCores: 16,
      memoryMb: 32768,
    });

    this.registerWorker({
      workerId: 'worker-node-edge-02',
      name: 'Edge Lightweight Builder',
      capabilities: ['COMPILE', 'VERIFY', 'ATTEST'],
      authoritySubject: 'did:omega:test:seed-edge',
      policyId: 'omega.worker.v1.seed',
      expiresAt: '2099-01-01T00:00:00.000Z',
      scope: ['local-simulate'],
      maxConcurrency: 2,
      cpuCores: 4,
      memoryMb: 8192,
    });
  }

  public registerWorker(config: {
    workerId: string;
    name: string;
    capabilities: BuildCapability[];
    authoritySubject?: string;
    policyId?: string;
    expiresAt?: string;
    scope?: string[];
    maxConcurrency?: number;
    cpuCores?: number;
    memoryMb?: number;
  }): WorkerNode {
    const workerId = requireText(config.workerId, 'workerId');
    const name = requireText(config.name, 'worker name');
    if (!Array.isArray(config.capabilities) || config.capabilities.length === 0) {
      throw new Error('worker capabilities must contain at least one capability');
    }
    const capabilities = [...new Set(config.capabilities)];
    if (capabilities.some((capability) => !['COMPILE', 'VERIFY', 'ATTEST', 'BENCHMARK', 'CONTAINER_BUILD', 'ZKP_GEN', 'REPLAY'].includes(capability))) {
      throw new Error('worker capabilities contain an unsupported capability');
    }
    const maxConcurrency = config.maxConcurrency === undefined
      ? 2
      : requireIntegerRange(config.maxConcurrency, 'maxConcurrency', 1, MAX_WORKER_CONCURRENCY);
    const cpuCores = config.cpuCores === undefined ? 4 : requireIntegerRange(config.cpuCores, 'cpuCores', 1, MAX_CPU_CORES);
    const memoryMb = config.memoryMb === undefined ? 8192 : requireIntegerRange(config.memoryMb, 'memoryMb', 128, MAX_MEMORY_MB);
    const existing = this.workers.get(workerId);
    const authoritySubject = config.authoritySubject === undefined ? '' : requireText(config.authoritySubject, 'authoritySubject');
    const policyId = config.policyId === undefined ? '' : requireText(config.policyId, 'policyId');
    const expiresAt = config.expiresAt === undefined ? '1970-01-01T00:00:00.000Z' : requireText(config.expiresAt, 'expiresAt');
    if (Number.isNaN(Date.parse(expiresAt))) {
      throw new Error('expiresAt must be a valid ISO-8601 timestamp');
    }
    const scope = Array.isArray(config.scope) ? config.scope.map((item) => requireText(item, 'scope item')) : [];

    const worker: WorkerNode = {
      workerId,
      name,
      capabilities,
      authoritySubject,
      policyId,
      expiresAt,
      scope,
      maxConcurrency,
      activeJobs: existing ? existing.activeJobs : 0,
      status: 'IDLE',
      registeredAt: existing ? existing.registeredAt : new Date().toISOString(),
      lastHeartbeatAt: new Date().toISOString(),
      resourceMetrics: existing
        ? existing.resourceMetrics
        : {
            cpuCores,
            memoryMb,
            avgExecutionTimeMs: 0,
            jobsCompleted: 0,
            jobsFailed: 0,
          },
    };

    this.workers.set(worker.workerId, worker);
    return worker;
  }

  public heartbeat(workerId: string): boolean {
    const worker = this.workers.get(workerId);
    if (!worker) return false;
    worker.lastHeartbeatAt = new Date().toISOString();
    if (worker.status === 'OFFLINE') {
      worker.status = worker.activeJobs > 0 ? 'BUSY' : 'IDLE';
    }
    return true;
  }

  public submitJob(spec: {
    name: string;
    requiredCapability: BuildCapability;
    payload: Record<string, unknown>;
    priority?: number;
    maxRetries?: number;
  }): BuildJob {
    const name = requireText(spec.name, 'job name');
    if (!spec.payload || typeof spec.payload !== 'object' || Array.isArray(spec.payload)) {
      throw new Error('job payload must be a record');
    }
    const priority = spec.priority === undefined ? 5 : requireIntegerRange(spec.priority, 'priority', 1, 10);
    const maxRetries = spec.maxRetries === undefined ? 3 : requireIntegerRange(spec.maxRetries, 'maxRetries', 0, MAX_RETRIES);
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const inputFingerprint = crypto
      .createHash('sha256')
      .update(JSON.stringify(spec.payload) + name)
      .digest('hex');

    const job: BuildJob = {
      jobId,
      name,
      requiredCapability: spec.requiredCapability,
      payload: spec.payload,
      inputFingerprint,
      status: 'QUEUED',
      priority,
      retries: 0,
      maxRetries,
      createdAt: new Date().toISOString(),
    };

    this.jobs.set(jobId, job);
    return job;
  }

  public leaseJob(workerId: string, leaseDurationMs = 30000): BuildJob | null {
    requireText(workerId, 'workerId');
    requireIntegerRange(leaseDurationMs, 'leaseDurationMs', 1, MAX_LEASE_DURATION_MS);
    const worker = this.workers.get(workerId);
    if (!worker || worker.status === 'OFFLINE' || worker.status === 'DRAINING') {
      return null;
    }
    if (!worker.authoritySubject || !worker.policyId) {
      return null;
    }
    if (Date.parse(worker.expiresAt) <= Date.now()) {
      return null;
    }

    if (worker.activeJobs >= worker.maxConcurrency) {
      return null;
    }

    // Find highest priority queued job matching worker capabilities
    const eligibleJobs = Array.from(this.jobs.values())
      .filter(
        (j) =>
          (j.status === 'QUEUED' ||
            j.status === 'RETRYING' ||
            (j.status === 'LEASED' &&
              j.leaseExpiresAt &&
              new Date(j.leaseExpiresAt) < new Date())) &&
          worker.capabilities.includes(j.requiredCapability)
      )
      .sort(
        (a, b) =>
          a.priority - b.priority ||
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

    if (eligibleJobs.length === 0) {
      return null;
    }

    const job = eligibleJobs[0];
    if (job.status === 'LEASED' && job.assignedWorkerId && job.assignedWorkerId !== workerId) {
      this.releaseWorkerSlot(job.assignedWorkerId);
    }
    job.status = 'LEASED';
    job.assignedWorkerId = workerId;
    job.startedAt = new Date().toISOString();
    job.leaseExpiresAt = new Date(Date.now() + leaseDurationMs).toISOString();

    worker.activeJobs++;
    worker.status = 'BUSY';
    worker.lastHeartbeatAt = new Date().toISOString();

    return job;
  }

  public completeJob(
    jobId: string,
    workerId: string,
    output: Record<string, unknown>,
    artifacts: BuildArtifact[] = []
  ): { job: BuildJob; attestation: BuildAttestation } {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job '${jobId}' not found`);
    this.requireActiveAssignment(job, workerId);

    const worker = this.workers.get(workerId);
    const completedAt = new Date().toISOString();
    const startTime = job.startedAt ? new Date(job.startedAt).getTime() : Date.now();
    const executionTimeMs = Math.max(1, Date.now() - startTime);

    // Compute Merkle root of generated artifacts
    const outputMerkleRoot = this.computeArtifactsMerkleRoot(artifacts, output);

    // Local HMAC observation receipt. This is not an SLSA level and not runtime health.
    const attestationId = `att-build-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const sigPayload = `${attestationId}:${jobId}:${workerId}:${job.inputFingerprint}:${outputMerkleRoot}:${executionTimeMs}`;
    const builderSignature =
      '0x' + crypto.createHmac('sha256', this.signingKey).update(sigPayload).digest('hex');

    const attestation: BuildAttestation = {
      attestationId,
      jobId,
      workerId,
      inputFingerprint: job.inputFingerprint,
      outputMerkleRoot,
      artifacts,
      executionTimeMs,
      slsaLevel: 'LOCAL_HMAC_OBSERVED',
      realityStatus: 'OBSERVED',
      runtimeClaim: 'NOT_CLAIMED',
      builderSignature,
      timestamp: completedAt,
    };

    job.status = 'COMPLETED';
    job.completedAt = completedAt;
    job.output = output;
    job.artifacts = artifacts;
    job.attestation = attestation;
    job.assignedWorkerId = undefined;
    job.leaseExpiresAt = undefined;

    this.attestations.set(attestationId, attestation);

    if (worker) {
      worker.activeJobs = Math.max(0, worker.activeJobs - 1);
      worker.status = worker.activeJobs > 0 ? 'BUSY' : 'IDLE';
      worker.resourceMetrics.jobsCompleted++;
      const currentAvg = worker.resourceMetrics.avgExecutionTimeMs;
      const count = worker.resourceMetrics.jobsCompleted;
      worker.resourceMetrics.avgExecutionTimeMs = Math.round(
        (currentAvg * (count - 1) + executionTimeMs) / count
      );
    }

    return { job, attestation };
  }

  public failJob(jobId: string, workerId: string, error: string): BuildJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job '${jobId}' not found`);

    this.requireActiveAssignment(job, workerId);
    job.retries++;
    job.error = error;

    if (job.retries < job.maxRetries) {
      job.status = 'RETRYING';
      job.assignedWorkerId = undefined;
      job.leaseExpiresAt = undefined;
    } else {
      job.status = 'FAILED';
      job.completedAt = new Date().toISOString();
      job.assignedWorkerId = undefined;
      job.leaseExpiresAt = undefined;
    }

    const worker = this.releaseWorkerSlot(workerId);
    if (worker) worker.resourceMetrics.jobsFailed++;

    return job;
  }

  private requireActiveAssignment(job: BuildJob, workerId: string): void {
    if (job.status !== 'LEASED' && job.status !== 'RUNNING') {
      throw new Error(`Job '${job.jobId}' is not active`);
    }
    if (job.assignedWorkerId !== workerId) {
      throw new Error(`Worker '${workerId}' is not assigned to job '${job.jobId}'`);
    }
    if (job.leaseExpiresAt && new Date(job.leaseExpiresAt).getTime() <= Date.now()) {
      throw new Error(`Job '${job.jobId}' lease has expired`);
    }
  }

  private releaseWorkerSlot(workerId: string): WorkerNode | undefined {
    const worker = this.workers.get(workerId);
    if (!worker) return undefined;
    worker.activeJobs = Math.max(0, worker.activeJobs - 1);
    worker.status = worker.activeJobs > 0 ? 'BUSY' : 'IDLE';
    return worker;
  }

  public computeArtifactsMerkleRoot(
    artifacts: BuildArtifact[],
    output: Record<string, unknown>
  ): string {
    const leaves = [
      crypto.createHash('sha256').update(JSON.stringify(output)).digest('hex'),
      ...artifacts.map(
        (a) =>
          a.contentHash ||
          crypto
            .createHash('sha256')
            .update(a.name + a.path)
            .digest('hex')
      ),
    ];

    let currentLevel = leaves;
    while (currentLevel.length > 1) {
      if (currentLevel.length % 2 !== 0) {
        currentLevel.push(currentLevel[currentLevel.length - 1]);
      }
      const nextLevel: string[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const combined = currentLevel[i] + currentLevel[i + 1];
        nextLevel.push(crypto.createHash('sha256').update(combined).digest('hex'));
      }
      currentLevel = nextLevel;
    }

    return currentLevel[0] || crypto.createHash('sha256').update('empty').digest('hex');
  }

  public verifyAttestation(attestation: BuildAttestation): boolean {
    const job = this.jobs.get(attestation.jobId);
    if (
      !job ||
      job.status !== 'COMPLETED' ||
      job.attestation?.attestationId !== attestation.attestationId ||
      !this.attestations.has(attestation.attestationId) ||
      job.inputFingerprint !== attestation.inputFingerprint ||
      !job.output ||
      !job.artifacts ||
      this.computeArtifactsMerkleRoot(job.artifacts, job.output) !== attestation.outputMerkleRoot
    ) {
      return false;
    }
    const sigPayload = `${attestation.attestationId}:${attestation.jobId}:${attestation.workerId}:${attestation.inputFingerprint}:${attestation.outputMerkleRoot}:${attestation.executionTimeMs}`;
    const expectedSig =
      '0x' + crypto.createHmac('sha256', this.signingKey).update(sigPayload).digest('hex');
    const actual = Buffer.from(attestation.builderSignature, 'utf8');
    const expected = Buffer.from(expectedSig, 'utf8');
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  }

  public verifyBuildReproducibility(attestations: BuildAttestation[]): {
    reproducible: boolean;
    matchingRoot: string;
    discrepancyCount: number;
  } {
    if (attestations.length < 2) {
      return {
        reproducible: true,
        matchingRoot: attestations[0]?.outputMerkleRoot || '',
        discrepancyCount: 0,
      };
    }

    const baselineRoot = attestations[0].outputMerkleRoot;
    let discrepancies = 0;

    for (let i = 1; i < attestations.length; i++) {
      if (attestations[i].outputMerkleRoot !== baselineRoot) {
        discrepancies++;
      }
    }

    return {
      reproducible: discrepancies === 0,
      matchingRoot: baselineRoot,
      discrepancyCount: discrepancies,
    };
  }

  public getWorkers(): WorkerNode[] {
    return Array.from(this.workers.values());
  }

  public getJobs(): BuildJob[] {
    return Array.from(this.jobs.values());
  }

  public getAttestations(): BuildAttestation[] {
    return Array.from(this.attestations.values());
  }

  public getStats(): WorkerPoolStats {
    const workers = Array.from(this.workers.values());
    const jobs = Array.from(this.jobs.values());
    const completed = jobs.filter((j) => j.status === 'COMPLETED');
    const failed = jobs.filter((j) => j.status === 'FAILED');

    let totalDuration = 0;
    for (const j of completed) {
      if (j.attestation) totalDuration += j.attestation.executionTimeMs;
    }

    return {
      totalWorkers: workers.length,
      onlineWorkers: workers.filter((w) => w.status !== 'OFFLINE').length,
      busyWorkers: workers.filter((w) => w.status === 'BUSY').length,
      queuedJobs: jobs.filter((j) => j.status === 'QUEUED' || j.status === 'RETRYING').length,
      runningJobs: jobs.filter((j) => j.status === 'LEASED' || j.status === 'RUNNING').length,
      completedJobs: completed.length,
      failedJobs: failed.length,
      avgDurationMs: completed.length > 0 ? Math.round(totalDuration / completed.length) : 0,
      reproducibilityRate:
        completed.length < 2
          ? 1.0
          : (() => {
              const roots = completed
                .map((job) => job.attestation?.outputMerkleRoot)
                .filter((root): root is string => Boolean(root));
              return roots.length === completed.length && roots.every((root) => root === roots[0])
                ? 1.0
                : 0.0;
            })(),
    };
  }
}

export default OceanicosWorkerPool;
