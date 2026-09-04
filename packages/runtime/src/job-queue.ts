/**
 * Job queue system for async processing and burst traffic handling
 * Enables non-blocking request processing and background job management
 */

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retrying' | 'dead-letter';
export type JobPriority = 'low' | 'normal' | 'high' | 'critical';

export interface Job<T = any> {
  id: string;
  type: string;
  payload: T;
  status: JobStatus;
  priority: JobPriority;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  attempts: number;
  maxRetries: number;
  retryDelay: number;
  error?: string;
  result?: any;
  tags?: string[];
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  retrying: number;
  deadLetter: number;
  totalProcessed: number;
  averageProcessingTime: number;
  successRate: number;
}

export interface JobHandler<T = any> {
  (job: Job<T>): Promise<any>;
}

export interface QueueConfig {
  maxConcurrent?: number;
  maxRetries?: number;
  retryDelay?: number;
  processingTimeout?: number;
  deadLetterSize?: number;
}

/**
 * In-memory job queue with async processing
 */
export class JobQueue {
  private jobs: Map<string, Job> = new Map();
  private handlers: Map<string, JobHandler> = new Map();
  private processing: Set<string> = new Set();
  private deadLetter: Job[] = [];
  private stats = {
    processed: 0,
    processingTimes: [] as number[],
  };

  private config: Required<QueueConfig>;

  constructor(config: QueueConfig = {}) {
    this.config = {
      maxConcurrent: config.maxConcurrent || 5,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      processingTimeout: config.processingTimeout || 30000,
      deadLetterSize: config.deadLetterSize || 1000,
    };
  }

  /**
   * Register a job handler for a job type
   */
  registerHandler(type: string, handler: JobHandler): void {
    this.handlers.set(type, handler);
  }

  /**
   * Enqueue a new job
   */
  async enqueue<T>(
    type: string,
    payload: T,
    options: {
      priority?: JobPriority;
      maxRetries?: number;
      retryDelay?: number;
      tags?: string[];
    } = {},
  ): Promise<string> {
    const jobId = this.generateJobId();
    const job: Job<T> = {
      id: jobId,
      type,
      payload,
      status: 'pending',
      priority: options.priority || 'normal',
      createdAt: Date.now(),
      attempts: 0,
      maxRetries: options.maxRetries ?? this.config.maxRetries,
      retryDelay: options.retryDelay ?? this.config.retryDelay,
      tags: options.tags,
    };

    this.jobs.set(jobId, job);
    this.processJobs();
    return jobId;
  }

  /**
   * Get job status
   */
  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs with optional filtering
   */
  getJobs(status?: JobStatus, type?: string): Job[] {
    const jobs = Array.from(this.jobs.values());

    return jobs.filter((job) => {
      if (status && job.status !== status) return false;
      if (type && job.type !== type) return false;
      return true;
    });
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job || job.status === 'completed' || job.status === 'failed') {
      return false;
    }

    job.status = 'failed';
    job.error = 'Cancelled by user';
    job.completedAt = Date.now();
    this.processing.delete(jobId);

    return true;
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'failed') {
      return false;
    }

    job.status = 'pending';
    job.attempts = 0;
    job.error = undefined;
    job.startedAt = undefined;
    job.completedAt = undefined;

    this.processJobs();
    return true;
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    const pending = this.getJobs('pending').length;
    const processing = this.processing.size;
    const completed = this.getJobs('completed').length;
    const failed = this.getJobs('failed').length;
    const retrying = this.getJobs('retrying').length;
    const deadLetter = this.deadLetter.length;

    const avgProcessingTime =
      this.stats.processingTimes.length > 0
        ? this.stats.processingTimes.reduce((a, b) => a + b, 0) /
          this.stats.processingTimes.length
        : 0;

    const successRate =
      this.stats.processed > 0
        ? completed / this.stats.processed
        : 0;

    return {
      pending,
      processing,
      completed,
      failed,
      retrying,
      deadLetter,
      totalProcessed: this.stats.processed,
      averageProcessingTime: avgProcessingTime,
      successRate,
    };
  }

  /**
   * Clear queue
   */
  async clear(): Promise<void> {
    this.jobs.clear();
    this.processing.clear();
    this.deadLetter = [];
  }

  /**
   * Get dead letter queue
   */
  getDeadLetterQueue(): Job[] {
    return [...this.deadLetter];
  }

  /**
   * Process pending jobs
   */
  private async processJobs(): Promise<void> {
    if (this.processing.size >= this.config.maxConcurrent) return;

    const pending = this.getJobs('pending')
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
        return (
          priorityOrder[a.priority] - priorityOrder[b.priority] ||
          a.createdAt - b.createdAt
        );
      });

    for (const job of pending) {
      if (this.processing.size >= this.config.maxConcurrent) break;

      this.processing.add(job.id);
      this.processJob(job).catch(() => {});
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: Job): Promise<void> {
    try {
      job.status = 'processing';
      job.startedAt = Date.now();
      job.attempts++;

      const handler = this.handlers.get(job.type);
      if (!handler) {
        throw new Error(`No handler registered for job type: ${job.type}`);
      }

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Job processing timeout')),
          this.config.processingTimeout,
        ),
      );

      const result = await Promise.race([handler(job), timeoutPromise]);

      job.status = 'completed';
      job.result = result;
      job.completedAt = Date.now();

      const processingTime = job.completedAt - (job.startedAt || 0);
      this.stats.processingTimes.push(processingTime);
      this.stats.processed++;
    } catch (error) {
      job.error = error instanceof Error ? error.message : 'Unknown error';

      if (job.attempts <= job.maxRetries) {
        job.status = 'retrying';
        setTimeout(() => {
          if (this.jobs.has(job.id)) {
            job.status = 'pending';
            this.processJobs();
          }
        }, job.retryDelay * Math.pow(2, job.attempts - 1));
      } else {
        job.status = 'failed';
        job.completedAt = Date.now();

        if (this.deadLetter.length >= this.config.deadLetterSize) {
          this.deadLetter.shift();
        }
        this.deadLetter.push(job);
      }
    } finally {
      this.processing.delete(job.id);
      this.processJobs();
    }
  }

  /**
   * Private: Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Distributed job queue with persistence support
 */
export class DistributedJobQueue extends JobQueue {
  private persistence: any;

  constructor(config: QueueConfig = {}, persistence?: any) {
    super(config);
    this.persistence = persistence;
  }

  /**
   * Set persistence backend (e.g., Redis)
   */
  setPersistence(persistence: any): void {
    this.persistence = persistence;
  }

  /**
   * Load jobs from persistence
   */
  async loadJobs(): Promise<Job[]> {
    if (!this.persistence) return [];

    try {
      const jobIds = await this.persistence.keys('job:*');
      const jobs: Job[] = [];

      for (const key of jobIds) {
        const jobData = await this.persistence.get(key);
        if (jobData) {
          jobs.push(JSON.parse(jobData));
        }
      }

      return jobs;
    } catch {
      return [];
    }
  }

  /**
   * Save job to persistence
   */
  async saveJob(job: Job): Promise<void> {
    if (!this.persistence) return;

    try {
      await this.persistence.setex(
        `job:${job.id}`,
        86400,
        JSON.stringify(job),
      );
    } catch {
      // Persistence failed, job stays in memory
    }
  }
}

/**
 * Priority queue implementation with fibonacci heap efficiency
 */
export class PriorityJobQueue extends JobQueue {
  /**
   * Enqueue job with priority escalation
   */
  async enqueueWithEscalation<T>(
    type: string,
    payload: T,
    options: {
      initialPriority?: JobPriority;
      maxRetries?: number;
      retryDelay?: number;
      escalateAfter?: number;
      tags?: string[];
    } = {},
  ): Promise<string> {
    const jobId = await this.enqueue(type, payload, options);
    const job = this.getJob(jobId);

    if (job && options.escalateAfter) {
      setTimeout(() => {
        if (job.status === 'pending') {
          job.priority = 'critical';
        }
      }, options.escalateAfter);
    }

    return jobId;
  }

  /**
   * Get jobs sorted by priority and creation time
   */
  getJobsByPriority(status?: JobStatus): Job[] {
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    return this.getJobs(status).sort((a, b) => {
      return (
        priorityOrder[a.priority] - priorityOrder[b.priority] ||
        a.createdAt - b.createdAt
      );
    });
  }
}

/**
 * Batch job processor for bulk operations
 */
export class BatchJobProcessor {
  private queue: JobQueue;
  private batchSize: number;

  constructor(queue: JobQueue, batchSize: number = 100) {
    this.queue = queue;
    this.batchSize = batchSize;
  }

  /**
   * Enqueue batch of jobs
   */
  async enqueueBatch<T>(
    type: string,
    items: T[],
    options?: {
      priority?: JobPriority;
      maxRetries?: number;
      tags?: string[];
    },
  ): Promise<string[]> {
    const jobIds: string[] = [];

    for (const item of items) {
      const jobId = await this.queue.enqueue(type, item, options);
      jobIds.push(jobId);
    }

    return jobIds;
  }

  /**
   * Process batch with rate limiting
   */
  async processBatchWithRateLimit<T>(
    type: string,
    items: T[],
    itemsPerSecond: number,
    options?: {
      priority?: JobPriority;
      maxRetries?: number;
      tags?: string[];
    },
  ): Promise<string[]> {
    const jobIds: string[] = [];
    const delayMs = 1000 / itemsPerSecond;

    for (const item of items) {
      const jobId = await this.queue.enqueue(type, item, options);
      jobIds.push(jobId);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    return jobIds;
  }

  /**
   * Wait for batch completion
   */
  async waitForBatch(jobIds: string[]): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    const maxWaitTime = 300000; // 5 minutes
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      let allCompleted = true;

      for (const jobId of jobIds) {
        const job = this.queue.getJob(jobId);
        if (!job) continue;

        if (job.status === 'completed') {
          results.set(jobId, job.result);
        } else if (job.status === 'failed') {
          results.set(jobId, { error: job.error });
        } else {
          allCompleted = false;
        }
      }

      if (allCompleted) {
        return results;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return results;
  }
}
